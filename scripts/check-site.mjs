#!/usr/bin/env node
/**
 * 하노이 선교교회 홈페이지 점검 스크립트 (Node.js 18 이상, 추가 설치 불필요)
 *
 *   node scripts/check-site.mjs              내부 링크·이미지·한/베 문구·SEO·표기 일관성 점검
 *   node scripts/check-site.mjs --external   외부 링크(YouTube, SNS, 지도 등) 응답까지 확인 (인터넷 필요)
 *
 * 오류(✖)가 있으면 종료 코드 1, 경고(⚠)만 있으면 0으로 끝납니다.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://hanoimissionchurch.com/';
const PAGES = ['index.html', 'archive/index.html'];
const IMAGE_BUDGET_KB = 500;
const EXTERNAL = process.argv.includes('--external');

const errors = [];
const warnings = [];
const error = (where, msg) => errors.push(`${where}  ${msg}`);
const warn = (where, msg) => warnings.push(`${where}  ${msg}`);

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');

function parseAttrs(src) {
  const attrs = {};
  const re = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(src))) attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  return attrs;
}

/** 아주 단순한 HTML 토크나이저: 따옴표 안의 '>' 와 script/style 본문을 올바르게 건너뜁니다. */
function tokenize(html) {
  const tokens = [];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let m;
  let last = 0;
  while ((m = re.exec(html))) {
    if (m.index > last) tokens.push({ type: 'text', value: html.slice(last, m.index), pos: last });
    if (!m[0].startsWith('<!--')) {
      const name = m[2].toLowerCase();
      if (m[1]) tokens.push({ type: 'close', name, pos: m.index });
      else {
        tokens.push({ type: 'open', name, attrs: parseAttrs(m[3]), pos: m.index, void: VOID.has(name) || /\/\s*$/.test(m[3]) });
        if (name === 'script' || name === 'style') {
          const end = html.toLowerCase().indexOf(`</${name}`, re.lastIndex);
          tokens.push({ type: 'raw', name, value: html.slice(re.lastIndex, end), pos: re.lastIndex });
          re.lastIndex = end;
        }
      }
    }
    last = re.lastIndex;
  }
  if (last < html.length) tokens.push({ type: 'text', value: html.slice(last), pos: last });
  return tokens;
}

const lineOf = (html, pos) => html.slice(0, pos).split('\n').length;
const isExternal = url => /^https?:\/\//i.test(url) || url.startsWith('//');
const skipUrl = url => !url || /^(mailto:|tel:|data:|javascript:|#)/i.test(url);

function localTarget(pageFile, url) {
  let clean = url.split('#')[0].split('?')[0];
  if (clean.startsWith(SITE_URL)) clean = '/' + clean.slice(SITE_URL.length);
  else if (isExternal(clean)) return null;
  try { clean = decodeURIComponent(clean); } catch { /* 그대로 사용 */ }
  const base = clean.startsWith('/') ? ROOT : dirname(join(ROOT, pageFile));
  let target = join(base, clean.replace(/^\//, ''));
  if (clean === '' ) target = join(ROOT, pageFile);
  if (clean.endsWith('/') || (existsSync(target) && statSync(target).isDirectory())) target = join(target, 'index.html');
  return target;
}

const externalUrls = new Map();
const referencedImages = new Set();

function checkUrl(page, line, url, kind) {
  if (skipUrl(url)) return;
  if (isExternal(url) && !url.startsWith(SITE_URL)) {
    if (!externalUrls.has(url)) externalUrls.set(url, `${page}:${line}`);
    return;
  }
  const target = localTarget(page, url);
  if (!target) return;
  if (!existsSync(target)) error(`${page}:${line}`, `${kind} 대상 파일 없음 → ${url}`);
  else if (/\.(jpe?g|png|webp|gif|avif)$/i.test(target)) referencedImages.add(target);
}

function checkCssUrls(page, css, baseLine) {
  const re = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
  let m;
  while ((m = re.exec(css))) checkUrl(page, baseLine + css.slice(0, m.index).split('\n').length - 1, m[2], 'CSS 이미지');
}

function checkPage(page) {
  const html = readFileSync(join(ROOT, page), 'utf8');
  const tokens = tokenize(html);
  const ids = new Map();
  const hrefs = [];
  const stack = [];
  let h1Count = 0;
  let lastHeading = 0;
  const meta = {};
  let title = '';
  let canonical = '';

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const line = lineOf(html, t.pos);
    const where = `${page}:${line}`;

    if (t.type === 'open') {
      const a = t.attrs;
      if (a.id) {
        if (ids.has(a.id)) error(where, `중복 id "${a.id}" (처음: ${ids.get(a.id)}행)`);
        else ids.set(a.id, line);
      }
      if (a.href !== undefined) { hrefs.push({ href: a.href, line }); checkUrl(page, line, a.href, '링크'); }
      if (a.src !== undefined && t.name !== 'script') checkUrl(page, line, a.src, `<${t.name} src>`);
      if (t.name === 'script' && a.src) checkUrl(page, line, a.src, '스크립트');
      if (a.srcset) a.srcset.split(',').map(s => s.trim().split(/\s+/)[0]).forEach(u => checkUrl(page, line, u, 'srcset'));
      if (a.style) checkCssUrls(page, a.style, line);
      if (a.target === '_blank' && !/noopener/.test(a.rel || '')) error(where, `새 창 링크에 rel="noopener" 누락 → ${a.href}`);
      if (t.name === 'img') {
        if (a.alt === undefined) error(where, `이미지 alt 누락 → ${a.src}`);
        if (!a.width || !a.height) warn(where, `이미지 width/height 누락(화면 밀림 원인) → ${a.src}`);
        if (a.alt && HANGUL.test(a.alt) && a['data-vi-alt'] === undefined) warn(where, `alt 문구의 베트남어(data-vi-alt) 누락 → "${a.alt}"`);
      }
      for (const attr of ['aria-label', 'title', 'placeholder']) {
        if (a.lang) continue; // 언어 버튼처럼 자국어로 표기하는 요소
        if (a[attr] && HANGUL.test(a[attr]) && a[`data-vi-${attr}`] === undefined && !/[가-힣].*·.*[A-Za-zÀ-ỹ]/.test(a[attr])) warn(where, `${attr} 의 베트남어(data-vi-${attr}) 누락 → "${a[attr]}"`);
      }
      if ('data-ko' in a) warn(where, 'data-ko 는 더 이상 쓰지 않습니다. 본문을 한국어 원본으로 두고 data-vi 만 쓰세요.');
      if ('data-vi' in a) {
        if (!a['data-vi'].trim()) error(where, 'data-vi 가 비어 있습니다.');
        if (stack.some(s => 'data-vi' in s.attrs)) error(where, 'data-vi 요소 안에 또 data-vi 요소가 있습니다(언어 전환 시 덮어써짐).');
        const viText = a['data-vi'].replace(/<span translate=['"]no['"]>[\s\S]*?<\/span>/g, '');
        if (HANGUL.test(viText)) warn(where, `베트남어 문구에 한글이 남아 있음 → "${a['data-vi'].slice(0, 60)}"`);
        checkVietnamese(where, a['data-vi']);
      }
      if (/^h[1-6]$/.test(t.name)) {
        const level = Number(t.name[1]);
        if (level === 1) h1Count++;
        if (lastHeading && level > lastHeading + 1) warn(where, `제목 단계 건너뜀 h${lastHeading} → h${level}`);
        lastHeading = level;
      }
      if (t.name === 'meta') {
        const key = a.name || a.property;
        if (key) meta[key] = a.content || '';
      }
      if (t.name === 'link' && a.rel === 'canonical') canonical = a.href;
      if (t.name === 'title') title = tokens[i + 1]?.type === 'text' ? tokens[i + 1].value.trim() : '';
      if (!t.void) stack.push(t);
    } else if (t.type === 'close') {
      const idx = stack.map(s => s.name).lastIndexOf(t.name);
      if (idx >= 0) stack.length = idx;
    } else if (t.type === 'raw') {
      if (t.name === 'style') checkCssUrls(page, t.value, line);
      const openTag = tokens[i - 1];
      if (t.name === 'script' && openTag?.attrs?.type === 'application/ld+json') {
        try { JSON.parse(t.value); } catch (e) { error(where, `구조화 데이터(JSON-LD) 문법 오류: ${e.message}`); }
      }
    } else if (t.type === 'text') {
      const text = decode(t.value).trim();
      if (text && HANGUL.test(text)) {
        const covered = stack.some(s => 'data-vi' in s.attrs || s.attrs.translate === 'no' || s.name === 'title' || s.name === 'address');
        if (!covered) warn(where, `베트남어 번역(data-vi)이 없는 한국어 문구 → "${text.slice(0, 40)}"`);
        checkKorean(where, text);
      }
    }
  }

  hrefs.filter(h => h.href.startsWith('#') && h.href.length > 1).forEach(h => {
    if (!ids.has(decodeURIComponent(h.href.slice(1)))) error(`${page}:${h.line}`, `페이지 안 이동 대상 없음 → ${h.href}`);
  });

  if (h1Count !== 1) warn(page, `h1 제목이 ${h1Count}개입니다(1개 권장).`);
  if (!/<html[^>]+lang=/.test(html)) error(page, '<html lang> 누락');
  if (!meta.viewport) error(page, 'viewport 메타태그 누락');
  if (!title) error(page, '<title> 누락');
  if (!meta.description) error(page, 'meta description 누락');
  else if (meta.description.length < 50 || meta.description.length > 170) warn(page, `meta description 길이 ${meta.description.length}자 (50~170자 권장)`);
  if (!canonical) error(page, 'canonical 링크 누락');
  else if (!canonical.startsWith(SITE_URL)) warn(page, `canonical 주소가 사이트 주소(${SITE_URL})와 다릅니다 → ${canonical}`);
  for (const key of ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:card']) if (!meta[key]) error(page, `${key} 누락`);
  if (meta['og:image']) checkUrl(page, 1, meta['og:image'], 'og:image');
}

/** 베트남어 표기 일관성 */
function checkVietnamese(where, text) {
  if (/\s\.\s/.test(text)) warn(where, `베트남어 구분 기호 " . " → " · " 로 통일 권장: "${text.slice(0, 50)}"`);
  if (/Hội thánh/.test(text)) warn(where, '"Hội thánh" → "Hội Thánh" 대문자 표기 통일');
  if (/Chủ Nhật/.test(text)) warn(where, '"Chủ Nhật" → 교회 표기 "Chúa Nhật" 로 통일');
  if (/Giê-xu/.test(text)) warn(where, '"Giê-xu" / "Giê-su" 혼용 → 사이트 표기 "Giê-su" 로 통일');
  if (/ {2,}/.test(text)) warn(where, `베트남어 문구에 연속 공백: "${text.slice(0, 50)}"`);
}

/** 한국어 표기 일관성 */
function checkKorean(where, text) {
  if (/(^|[^·])(유초등부|중고등부)/.test(text)) warn(where, `부서명 표기 통일(유·초등부, 중·고등부) → "${text.slice(0, 40)}"`);
  if (/ {2,}/.test(text.replace(/\s*\n\s*/g, ' '))) warn(where, `한국어 문구에 연속 공백: "${text.slice(0, 40)}"`);
}

function checkSitemapAndRobots() {
  const sitemap = join(ROOT, 'sitemap.xml');
  if (!existsSync(sitemap)) return error('sitemap.xml', '파일 없음');
  const xml = readFileSync(sitemap, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  if (!locs.length) error('sitemap.xml', '<loc> 항목이 없습니다.');
  locs.forEach(loc => {
    if (!loc.startsWith(SITE_URL)) error('sitemap.xml', `사이트 주소와 다른 URL → ${loc}`);
    else if (!existsSync(localTarget('index.html', loc))) error('sitemap.xml', `페이지 파일 없음 → ${loc}`);
  });
  const robots = join(ROOT, 'robots.txt');
  if (!existsSync(robots)) warn('robots.txt', '파일 없음');
  else if (!readFileSync(robots, 'utf8').includes(`${SITE_URL}sitemap.xml`)) warn('robots.txt', 'Sitemap 주소가 없거나 사이트 주소와 다릅니다.');
}

function listFiles(dir) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true }).flatMap(d => d.isDirectory() ? listFiles(posix.join(dir, d.name)) : [posix.join(dir, d.name)]);
}

function checkArchiveFallback() {
  const js = readFileSync(join(ROOT, 'assets/archive-cms.js'), 'utf8');
  const listed = new Set([...js.matchAll(/file:\s*'([^']+)'/g)].map(m => m[1]));
  listed.forEach(f => { if (!existsSync(join(ROOT, f))) error('assets/archive-cms.js', `자료실 대체 목록의 파일 없음 → ${f}`); });
  const local = [...listFiles('assets/bulletins').filter(f => f.endsWith('.pdf')), ...listFiles('assets/library').filter(f => !f.endsWith('.gitkeep'))];
  local.forEach(f => { if (!listed.has(f)) warn('assets/archive-cms.js', `저장소 자료가 자료실 대체 목록(LOCAL_FALLBACK)에 없음 → ${f}`); });
}

function checkImageWeight() {
  referencedImages.forEach(file => {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const optimized = join(ROOT, 'assets/optimized', rel.replace(/^assets\//, '').replace(/\.[^.]+$/, ''));
    if (!rel.startsWith('assets/optimized/') && listFiles(posix.dirname(relative(ROOT, optimized).replace(/\\/g, '/'))).some(f => f.startsWith(relative(ROOT, optimized).replace(/\\/g, '/') + '-'))) return; // WebP 파생본이 있으면 원본은 대체용
    const kb = Math.round(statSync(file).size / 1024);
    if (kb > IMAGE_BUDGET_KB) warn(relative(ROOT, file), `이미지 용량 ${kb}KB (권장 ${IMAGE_BUDGET_KB}KB 이하, scripts/optimize-images.py 참고)`);
  });
}

async function checkExternal() {
  const urls = [...externalUrls.keys()].filter(u => !/fonts\.(googleapis|gstatic)\.com\/?$/.test(u));
  console.log(`\n외부 링크 ${urls.length}개 확인 중...`);
  const ua = 'Mozilla/5.0 (compatible; HMC-site-check/1.0)';
  await Promise.all(urls.map(async url => {
    const where = externalUrls.get(url);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': ua } });
      if (res.status >= 400) res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': ua } });
      if (res.status === 404 || res.status === 410) error(where, `외부 링크 없음(${res.status}) → ${url}`);
      else if (res.status >= 400) warn(where, `외부 링크 응답 ${res.status} (SNS는 자동 점검을 막는 경우가 있어 직접 확인 필요) → ${url}`);
    } catch (e) {
      warn(where, `외부 링크 연결 실패(${e.name === 'AbortError' ? '시간 초과' : e.message}) → ${url}`);
    } finally { clearTimeout(timer); }
  }));
}

PAGES.forEach(checkPage);
checkSitemapAndRobots();
checkArchiveFallback();
checkImageWeight();
if (EXTERNAL) await checkExternal();
else console.log(`외부 링크 ${externalUrls.size}개는 건너뜀 (확인하려면 --external)`);

warnings.forEach(w => console.log(`⚠ ${w}`));
errors.forEach(e => console.log(`✖ ${e}`));
console.log(`\n점검 완료: 페이지 ${PAGES.length}개 · 오류 ${errors.length}건 · 경고 ${warnings.length}건`);
process.exit(errors.length ? 1 : 0);
