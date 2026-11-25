/* 하노이 선교교회 공통 스크립트 (홈페이지·자료실 공용)
 * - 한국어/베트남어 전환: 본문(HTML)이 한국어 원본이고, data-vi="..." 에 베트남어를 둡니다.
 *   대체텍스트·라벨은 data-vi-alt, data-vi-aria-label, data-vi-title, data-vi-placeholder 를 사용합니다.
 *   주소 끝에 ?lang=vi 를 붙이면 베트남어로 열립니다. 선택한 언어는 브라우저에 기억됩니다.
 * - 모바일 메뉴, 스크롤 등장 효과, 유튜브 영상 지연 로딩, 기간 한정 공지 띠를 처리합니다.
 * 언어가 바뀌면 document 에 'hmc:langchange' 이벤트(detail.lang)를 보냅니다.
 */
(() => {
  'use strict';
  const root = document.documentElement;
  const STORAGE_KEY = 'hmc-lang';
  const ATTRS = ['alt', 'aria-label', 'title', 'placeholder'];
  const store = {
    get() { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } },
    set(v) { try { localStorage.setItem(STORAGE_KEY, v); } catch { /* 저장 불가 환경은 무시 */ } }
  };
  const koHtml = new WeakMap();
  const koAttrs = new WeakMap();

  function applyLang(lang) {
    lang = lang === 'vi' ? 'vi' : 'ko';
    const vi = lang === 'vi';
    root.lang = lang;
    document.body.classList.toggle('vi', vi);
    document.querySelectorAll('[data-vi]').forEach(el => {
      if (!koHtml.has(el)) koHtml.set(el, el.innerHTML);
      el.innerHTML = vi ? el.getAttribute('data-vi') : koHtml.get(el);
    });
    ATTRS.forEach(attr => {
      document.querySelectorAll(`[data-vi-${attr}]`).forEach(el => {
        let saved = koAttrs.get(el);
        if (!saved) { saved = {}; koAttrs.set(el, saved); }
        if (!(attr in saved)) saved[attr] = el.getAttribute(attr) || '';
        el.setAttribute(attr, vi ? el.getAttribute(`data-vi-${attr}`) : saved[attr]);
      });
    });
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    store.set(lang);
    document.dispatchEvent(new CustomEvent('hmc:langchange', { detail: { lang } }));
  }

  function syncUrl(lang) {
    try {
      const url = new URL(location.href);
      if (lang === 'vi') url.searchParams.set('lang', 'vi'); else url.searchParams.delete('lang');
      history.replaceState(history.state, '', url);
    } catch { /* file:// 등에서는 무시 */ }
  }

  const param = new URLSearchParams(location.search).get('lang');
  const initial = param === 'vi' || param === 'ko' ? param : store.get();
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
    applyLang(b.dataset.lang);
    syncUrl(b.dataset.lang);
  }));
  applyLang(initial || 'ko');

  /* 모바일 메뉴 */
  const menuBtn = document.querySelector('.menu-btn');
  const nav = document.getElementById('navlinks');
  if (menuBtn && nav) {
    const setOpen = open => { nav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open)); };
    menuBtn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    nav.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('click', e => { if (nav.classList.contains('open') && !nav.contains(e.target) && !menuBtn.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); menuBtn.focus(); } });
    const wide = matchMedia('(min-width:1081px)');
    if (wide.addEventListener) wide.addEventListener('change', e => { if (e.matches) setOpen(false); });
  }

  /* 스크롤 등장 효과: 움직임 줄이기 설정이나 미지원 브라우저에서는 바로 표시 */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
    }), { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('visible'));
  }

  /* 사진 띠 배경 지연 로딩: 화면 600px 앞에서 배경 이미지를 불러옵니다 */
  const bands = document.querySelectorAll('.photo-band');
  if ('IntersectionObserver' in window) {
    const bandIo = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('bg-ready'); bandIo.unobserve(entry.target); }
    }), { rootMargin: '600px 0px' });
    bands.forEach(el => bandIo.observe(el));
  } else {
    bands.forEach(el => el.classList.add('bg-ready'));
  }

  /* 유튜브: 클릭 전에는 썸네일만 보여 주고, 누르면 플레이어를 불러옵니다 (초기 로딩 경량화) */
  document.querySelectorAll('.video-facade img').forEach(img => {
    const hide = () => { img.style.visibility = 'hidden'; };
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('loading') !== 'lazy') hide();
    img.addEventListener('error', hide);
  });
  document.querySelectorAll('[data-youtube-id]').forEach(link => link.addEventListener('click', e => {
    e.preventDefault();
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(link.dataset.youtubeId)}?autoplay=1&rel=0`;
    iframe.title = link.dataset.videoTitle || 'YouTube';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    link.replaceWith(iframe);
    iframe.focus();
  }));

  /* 바로가기 메뉴 (데스크톱 드롭다운) */
  const quick = document.getElementById('quickMenu');
  if (quick) {
    const qBtn = quick.querySelector('.quick-btn');
    const setQuick = open => { quick.classList.toggle('open', open); qBtn.setAttribute('aria-expanded', String(open)); };
    qBtn.addEventListener('click', () => setQuick(!quick.classList.contains('open')));
    quick.addEventListener('click', e => { if (e.target.closest('a')) setQuick(false); });
    document.addEventListener('click', e => { if (quick.classList.contains('open') && !quick.contains(e.target)) setQuick(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && quick.classList.contains('open')) { setQuick(false); qBtn.focus(); } });
  }

  /* 홈페이지 자동 반영(Google Drive·스프레드시트): 주보 카드, 이번 주 교회 소식, 교회소식 카드, 공지 팝업을 Google 스프레드시트와 Drive 주보 폴더에서 읽어 옵니다.
   * - 스프레드시트 '하노이선교교회_공지·교회소식 (홈페이지)'의 한 줄이 한 항목입니다. 구분: 팝업 / 주간소식 / 소식. 게시 칸에 X를 쓰면 숨깁니다.
   * - 팝업: 날짜(게시일)~종료일 동안 표시, 종료일이 비면 게시 후 14일. 줄바꿈은 ' // '로 씁니다. 링크는 '자세히 보기', 이미지는 팝업 위쪽 사진.
   * - 주간소식: 같은 날짜의 줄들을 한 주 소식 목록으로 표시(가장 최근 날짜). 제목 칸의 '제47호'는 호수 표시.
   * - 소식: 최신 3개를 교회소식 카드로 표시.
   * - 주보 카드: Drive 주보 폴더의 가장 최근 PDF.
   * 연결에 실패하면 HTML에 적어 둔 내용을 그대로 둡니다. */
  (async () => {
    const DKEY = 'AIzaSyCtgFb2LjAAYXJOpIHFHUNfVNqpYyBwdtw';
    const SHEET = '1sS-JNn48CHRFekDk-qMgsFaowEF7Z-zunsSB5yoGlhE';
    const BULLETIN_FOLDER = '10knIugD2GlEy8KoMrYHBautLHuHKnzB_';
    const ref = { cache: 'no-store' };
    const parseCsv = text => {
      const rows = []; let row = [], cell = '', q = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
        else if (c === '"') q = true;
        else if (c === ',') { row.push(cell); cell = ''; }
        else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
        else if (c !== '\r') cell += c;
      }
      if (cell || row.length) { row.push(cell); rows.push(row); }
      return rows;
    };
    const normDate = s => { const m = String(s || '').match(/(20\d{2})\D+(\d{1,2})\D+(\d{1,2})/); return m ? m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0') : ''; };
    let items = [];
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/files/' + SHEET + '/export?mimeType=text%2Fcsv&key=' + DKEY + '&_=' + Date.now(), ref);
      if (res.ok) {
        const t = parseCsv(await res.text());
        const head = t.shift() || [];
        const col = n => head.indexOf(n);
        const c = { kind: col('구분'), date: col('날짜'), title: col('제목'), titleVi: col('제목(VI)'), ko: col('내용'), vi: col('내용(VI)'), end: col('종료일'), link: col('링크'), img: col('이미지'), on: col('게시') };
        items = t.map((r, i) => ({ n: i, kind: (r[c.kind] || '').trim(), date: normDate(r[c.date]), title: (r[c.title] || '').trim(), titleVi: (r[c.titleVi] || '').trim(), ko: (r[c.ko] || '').trim(), vi: (r[c.vi] || '').trim(), end: normDate(r[c.end]), link: (r[c.link] || '').trim(), img: (r[c.img] || '').trim(), on: (r[c.on] || '').trim().toUpperCase() }))
          .filter(x => x.kind && x.on !== 'X' && x.on !== 'N' && x.on !== '아니오');
      }
    } catch { /* 연결 실패 */ }
    let bulletins = [];
    try {
      const q = encodeURIComponent("'" + BULLETIN_FOLDER + "' in parents and trashed=false and mimeType='application/pdf'");
      const res = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=100&fields=files(id,name,modifiedTime)&q=' + q + '&key=' + DKEY, ref);
      if (res.ok) bulletins = ((await res.json()).files || []).map(f => ({ date: normDate(f.name) || String(f.modifiedTime || '').slice(0, 10), issue: (f.name.match(/제\s*(\d+)\s*호/) || [])[1], url: 'https://drive.google.com/file/d/' + f.id + '/view', name: f.name }))
        .sort((a, b) => b.date.localeCompare(a.date) || b.name.localeCompare(a.name));
    } catch { /* 연결 실패 */ }
    const textOf = html => String(html || '').replace(/<[^>]*>/g, '').trim();
    const split = s => s.split(/\s*\/\/\s*/).map(x => x.trim()).filter(Boolean);
    const setBi = (el, koText, viText) => {
      if (!el) return;
      if (viText) el.setAttribute('data-vi', viText); else el.removeAttribute('data-vi');
      koHtml.set(el, koText);
      el.textContent = root.lang === 'vi' && viText ? viText : koText;
    };

    /* 최신 주보 카드 */
    const bcard = document.getElementById('bulletin-card');
    if (bcard && bulletins[0]) {
      const found = bulletins[0];
      const pdfLink = document.getElementById('bulletin-pdf');
      const timeEl = bcard.querySelector('time');
      const titleEl = bcard.querySelector('h3');
      const current = timeEl.getAttribute('datetime') || '';
      if (found.date >= current) {
        const [y, mo, d] = found.date.split('-');
        const ko = Number(mo) + '월 ' + Number(d) + '일 주일 주보' + (found.issue ? ' (제' + found.issue + '호)' : '');
        const vi = 'Bản tin Chúa Nhật ' + d + '/' + mo + '/' + y + (found.issue ? ' (số ' + found.issue + ')' : '');
        timeEl.setAttribute('datetime', found.date);
        timeEl.textContent = y + '.' + mo + '.' + d;
        titleEl.setAttribute('data-vi', vi);
        koHtml.set(titleEl, ko);
        titleEl.textContent = root.lang === 'vi' ? vi : ko;
        if (pdfLink) pdfLink.href = found.url;
      }
    }

    /* 이번 주 교회 소식 */
    const weekly = document.querySelector('.news-weekly');
    const wk = items.filter(x => x.kind === '주간소식' && x.date && x.ko);
    if (weekly && wk.length) {
      const latestDate = wk.map(x => x.date).sort().pop();
      const list = wk.filter(x => x.date === latestDate);
      const timeEl = weekly.querySelector('time');
      if (!(timeEl && latestDate < (timeEl.getAttribute('datetime') || ''))) {
        const ul = weekly.querySelector('.week-list');
        if (ul) ul.replaceChildren(...list.map((x, i) => {
          const li = document.createElement('li');
          const b = document.createElement('b'); b.textContent = (i + 1) + '.';
          const span = document.createElement('span'); li.append(b, span);
          setBi(span, x.ko, x.vi);
          return li;
        }));
        const [y, mo, d] = latestDate.split('-');
        const issue = ((list.map(x => x.title).find(t => /\d+\s*호/.test(t)) || '').match(/(\d+)\s*호/) || [])[1];
        if (timeEl) { timeEl.setAttribute('datetime', latestDate); setBi(timeEl, y + '.' + mo + '.' + d + ' 주보', 'Bản tin ' + d + '.' + mo + '.' + y); }
        setBi(weekly.querySelector('.news-source'), '출처: ' + y + '년 ' + Number(mo) + '월 ' + Number(d) + '일 주일 주보' + (issue ? '(제' + issue + '호)' : ''), 'Nguồn: Bản tin Chúa Nhật ' + d + '/' + mo + '/' + y + (issue ? ' (số ' + issue + ')' : '') + '.');
        const pdf = bulletins.find(b => b.date === latestDate);
        const link = weekly.querySelector('.btn-row a');
        if (pdf && link) link.href = pdf.url;
      }
    }
    if (location.pathname.includes('/archive')) return;

    /* 교회소식 카드 */
    const feed = document.getElementById('news-feed');
    if (feed) {
      items.filter(x => x.kind === '소식' && x.title).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).forEach(x => {
        const card = document.createElement('article');
        card.className = 'news-card feed';
        const meta = document.createElement('p'); meta.className = 'news-meta';
        const tag = document.createElement('span'); tag.className = 'news-tag'; tag.textContent = '교회소식'; tag.setAttribute('data-vi', 'Tin Hội Thánh');
        const time = document.createElement('time'); time.dateTime = x.date; time.textContent = x.date.replaceAll('-', '.');
        meta.append(tag, time);
        const h3 = document.createElement('h3'); h3.textContent = x.title;
        if (x.titleVi) h3.setAttribute('data-vi', x.titleVi);
        card.append(meta, h3);
        const p = document.createElement('p'); p.textContent = split(x.ko).join(' ').slice(0, 320);
        if (x.vi) p.setAttribute('data-vi', split(x.vi).join(' ').slice(0, 320));
        if (p.textContent) card.appendChild(p);
        feed.appendChild(card);
      });
      if (feed.children.length) applyLang(root.lang);
    }

    /* 공지 팝업 */
    const vnToday = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const hash = s => { let h = 0; for (const ch of s) h = (h * 31 + ch.codePointAt(0)) | 0; return (h >>> 0).toString(36); };
    const popupQueue = items.filter(x => x.kind === '팝업' && x.title)
      .sort((a, b) => b.date.localeCompare(a.date) || b.n - a.n)
      .map(x => {
        const postDay = x.date || vnToday;
        const defaultEnd = new Date(new Date(postDay + 'T00:00:00Z').getTime() + 14 * 86400000);
        const lastDay = x.end || (!Number.isNaN(defaultEnd.getTime()) ? defaultEnd.toISOString().slice(0, 10) : '');
        const key = 'hmc-popup-' + hash(x.title + '|' + x.date + '|' + x.end);
        if (!lastDay || vnToday > lastDay || postDay > vnToday) return null;
        try { if (localStorage.getItem(key) === vnToday || sessionStorage.getItem(key)) return null; } catch { /* storage unavailable */ }
        return { pop: { ID: hash(x.title + x.date), title: x.title }, titleVi: x.titleVi, body: { img: x.img || '', link: x.link || '', end: x.end, ko: split(x.ko), vi: split(x.vi) }, key };
      }).filter(Boolean).slice(0, 3);
    if (!popupQueue.length) return;
    const opener = document.activeElement;
    const stack = document.createElement('div'); stack.className = 'hmc-popup-stack';
    const row = document.createElement('div'); row.className = 'hmc-popup-row'; stack.appendChild(row);
    document.body.appendChild(stack);
    function afterDismiss() { if (!row.children.length) { stack.remove(); if (opener && opener.focus) opener.focus(); } }
    function showPopup(next) {
      const { pop, body, key } = next;
    const wrap = document.createElement('div');
    wrap.className = 'hmc-popup-item'; wrap.hidden = true;
    const box = document.createElement('div');
    box.className = 'hmc-popup-box'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'hmc-popup-title-' + pop.ID);
    if (body.img) { const im = document.createElement('img'); im.src = body.img; im.alt = ''; im.loading = 'eager'; box.appendChild(im); }
    const inner = document.createElement('div'); inner.className = 'hmc-popup-body';
    const tag = document.createElement('p'); tag.className = 'hmc-popup-tag';
    const h2 = document.createElement('h2'); h2.id = 'hmc-popup-title-' + pop.ID;
    const text = document.createElement('div');
    inner.append(tag, h2, text);
    const actions = document.createElement('div'); actions.className = 'hmc-popup-actions';
    const more = body.link ? Object.assign(document.createElement('a'), { href: body.link, target: '_blank', rel: 'noopener noreferrer' }) : null;
    const hideToday = document.createElement('button'); hideToday.type = 'button';
    const close = document.createElement('button'); close.type = 'button'; close.className = 'primary';
    if (more) actions.appendChild(more);
    actions.append(hideToday, close);
    box.append(inner, actions); wrap.appendChild(box); row.appendChild(wrap);
    const title = textOf(pop.title);
    const titleVi = next.titleVi;
    const render = () => {
      const vi = root.lang === 'vi' && body.vi.length;
      const lines = vi ? body.vi : body.ko;
      tag.textContent = vi ? 'THÔNG BÁO' : '교회 공지';
      h2.textContent = vi && titleVi ? titleVi : title;
      text.replaceChildren(...lines.map(l => Object.assign(document.createElement('p'), { textContent: l })));
      if (more) more.textContent = root.lang === 'vi' ? 'Xem chi tiết' : '자세히 보기';
      hideToday.textContent = root.lang === 'vi' ? 'Không hiện hôm nay' : '오늘 하루 보지 않기';
      close.textContent = root.lang === 'vi' ? 'Đóng' : '닫기';
    };
    const dismiss = remember => {
      try { if (remember) localStorage.setItem(key, vnToday); else sessionStorage.setItem(key, '1'); } catch { /* 무시 */ }
      if (dismissed) return;
      dismissed = true;
      wrap.remove(); document.removeEventListener('keydown', onKey);
      document.removeEventListener('hmc:langchange', render);
      afterDismiss();
    };
    const onKey = e => { if (e.key === 'Escape') dismiss(false); };
    let dismissed = false;
    hideToday.addEventListener('click', () => dismiss(true));
    close.addEventListener('click', () => dismiss(false));
    wrap.addEventListener('click', e => { if (e.target === wrap) dismiss(false); });
    document.addEventListener('hmc:langchange', render);
    render();
    wrap.hidden = false; document.addEventListener('keydown', onKey); if (row.children.length === 1) close.focus();
    }
    stack.hidden = true; setTimeout(() => { popupQueue.splice(0).forEach(showPopup); stack.hidden = !row.children.length; if (stack.hidden) stack.remove(); }, 700);
  })();

  /* 기간 한정 공지 띠: data-notice-until 시각 전까지만 표시 */
  document.querySelectorAll('[data-notice-until]').forEach(el => {
    const end = new Date(el.dataset.noticeUntil);
    if (!Number.isNaN(end.getTime()) && Date.now() < end.getTime()) el.hidden = false;
  });
})();
