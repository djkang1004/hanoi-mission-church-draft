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

  /* 최신 주보 자동 반영: 교회소식의 주보 카드를 WordPress 자료실의 가장 최근 주보로 바꿉니다.
   * WordPress에 연결하지 못하거나 더 새로운 주보가 없으면 HTML에 적어 둔 카드를 그대로 둡니다.
   * 주보 글 제목에 '제45호'처럼 적으면 카드 제목에도 호수가 표시됩니다. */
  (async () => {
    const card = document.getElementById('bulletin-card');
    if (!card) return;
    const pdfLink = document.getElementById('bulletin-pdf');
    const timeEl = card.querySelector('time');
    const titleEl = card.querySelector('h3');
    const host = 'hanoimissionchurchv2.wordpress.com';
    const api = 'https://public-api.wordpress.com/rest/v1.1/sites/' + host + '/posts/';
    try {
      const res = await fetch(api + '?number=20&order_by=date&order=DESC&_=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const found = (data.posts || []).map(post => {
        if (post.status !== 'publish' || !Object.keys(post.categories || {}).includes('주보')) return null;
        const title = String(post.title || '').replace(/<[^>]*>/g, '').trim();
        const m = title.match(/(20\d{2})[-_.](0?[1-9]|1[0-2])[-_.]([12]\d|3[01]|0?[1-9])/);
        const date = m ? m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0') : String(post.date || '').slice(0, 10);
        const doc = new DOMParser().parseFromString(post.content || '', 'text/html');
        const pdf = [...doc.querySelectorAll('a[href]')].map(a => { try { return new URL(a.getAttribute('href')); } catch { return null; } })
          .find(u => u && u.protocol === 'https:' && u.hostname === host && u.pathname.startsWith('/wp-content/uploads/') && u.pathname.toLowerCase().endsWith('.pdf'));
        const issue = (title.match(/제\s*(\d+)\s*호/) || [])[1];
        return pdf && /^\d{4}-\d{2}-\d{2}$/.test(date) ? { date, url: pdf.href, issue, id: post.ID } : null;
      }).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)[0];
      const current = timeEl.getAttribute('datetime') || '';
      if (!found || found.date < current) return;
      if (!found.issue && found.date === current) found.issue = (titleEl.textContent.match(/제\s*(\d+)\s*호/) || [])[1];
      const [y, mo, d] = found.date.split('-');
      const ko = Number(mo) + '월 ' + Number(d) + '일 주일 주보' + (found.issue ? ' (제' + found.issue + '호)' : '');
      const vi = 'Bản tin Chúa Nhật ' + d + '/' + mo + '/' + y + (found.issue ? ' (số ' + found.issue + ')' : '');
      timeEl.setAttribute('datetime', found.date);
      timeEl.textContent = y + '.' + mo + '.' + d;
      titleEl.setAttribute('data-vi', vi);
      koHtml.set(titleEl, ko);
      titleEl.textContent = root.lang === 'vi' ? vi : ko;
      if (pdfLink) pdfLink.href = found.url;
    } catch { /* 연결 실패 시 기본 카드를 유지합니다 */ }
  })();

  /* 기간 한정 공지 띠: data-notice-until 시각 전까지만 표시 */
  document.querySelectorAll('[data-notice-until]').forEach(el => {
    const end = new Date(el.dataset.noticeUntil);
    if (!Number.isNaN(end.getTime()) && Date.now() < end.getTime()) el.hidden = false;
  });
})();
