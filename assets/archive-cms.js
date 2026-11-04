/* 하노이 선교교회 자료실: WordPress.com 공개 글 목록을 불러와 검색·분류·페이지로 보여 줍니다.
 * WordPress에 연결할 수 없거나 공개 글이 없으면, 이 저장소에 보관된 주보·자료(LOCAL_FALLBACK)를 대신 보여 줍니다.
 * 언어 전환은 assets/site.js 가 처리하며, 이 파일은 'hmc:langchange' 이벤트를 받아 목록 문구만 다시 그립니다.
 */
(() => {
  'use strict';
  const api = 'https://public-api.wordpress.com/rest/v1.1/sites/hanoimissionchurchv2.wordpress.com/posts/';
  const mediaHost = 'hanoimissionchurchv2.wordpress.com';
  const PAGE_SIZE = 12;
  const categoryNames = { '주보': 'bulletins', '설교PPT': 'sermons', '교회소식': 'notices', '교육자료': 'study', '선교자료': 'mission', '기타자료': 'other', '사진자료': 'photos' };
  const categories = { all: { ko: '전체', vi: 'Tất cả' }, bulletins: { ko: '주보', vi: 'Bản tin' }, sermons: { ko: '설교PPT', vi: 'PowerPoint bài giảng' }, notices: { ko: '교회소식', vi: 'Tin Hội Thánh' }, study: { ko: '교육자료', vi: 'Tài liệu học' }, mission: { ko: '선교자료', vi: 'Tài liệu truyền giáo' }, photos: { ko: '사진자료', vi: 'Ảnh' }, other: { ko: '기타', vi: 'Khác' } };
  const labels = {
    loading: { ko: '자료 목록을 불러오는 중입니다.', vi: 'Đang tải danh sách tài liệu.' },
    fallback: { ko: '자료 서버에 연결하지 못해 홈페이지에 보관된 주보와 자료를 보여 드립니다. 잠시 후 ‘새 자료 확인’을 눌러 주세요.', vi: 'Không thể kết nối máy chủ tài liệu, đang hiển thị bản tin và tài liệu lưu trên website. Vui lòng nhấn “Làm mới” sau ít phút.' },
    fallbackEmpty: { ko: '자료 서버에 아직 공개된 자료가 없어 홈페이지에 보관된 주보와 자료를 보여 드립니다.', vi: 'Máy chủ tài liệu chưa có tài liệu công khai, đang hiển thị bản tin và tài liệu lưu trên website.' },
    empty: { ko: '해당 자료가 없습니다.', vi: 'Không có tài liệu phù hợp.' },
    count: { ko: n => `총 ${n}개 자료`, vi: n => `${n} tài liệu` },
    view: { ko: '열람', vi: 'Xem' },
    download: { ko: '다운로드', vi: 'Tải xuống' },
    prev: { ko: '이전', vi: 'Trước' },
    next: { ko: '다음', vi: 'Tiếp' },
    page: { ko: n => `${n}쪽`, vi: n => `Trang ${n}` },
    undated: { ko: '날짜 미상', vi: 'Không rõ ngày' },
    pdfHint: { ko: 'PDF 뷰어에서 저장할 수 있습니다.', vi: 'Có thể lưu trong trình xem PDF.' }
  };

  /* 저장소에 보관된 자료 (WordPress 연결 실패 시 표시). 새 파일을 assets/ 에 올리면 여기에도 한 줄 추가하세요.
   * 'node scripts/check-site.mjs' 가 목록과 실제 파일이 맞는지 확인합니다. */
  const LOCAL_FALLBACK = [
    { category: 'bulletins', date: '2026-11-01', file: 'assets/bulletins/2026-11-01.pdf' },
    { category: 'bulletins', date: '2026-10-25', file: 'assets/bulletins/2026-10-25.pdf' },
    { category: 'bulletins', date: '2026-10-18', file: 'assets/bulletins/2026-10-18.pdf' },
    { category: 'bulletins', date: '2026-10-11', file: 'assets/bulletins/2026-10-11.pdf' },
    { category: 'bulletins', date: '2026-09-27', file: 'assets/bulletins/2026-09-27.pdf' },
    { category: 'bulletins', date: '2026-08-30', file: 'assets/bulletins/2026-08-30.pdf' },
    { category: 'bulletins', date: '2026-08-23', file: 'assets/bulletins/2026-08-23.pdf' },
    { category: 'bulletins', date: '2026-08-16', file: 'assets/bulletins/2026-08-16.pdf' },
    { category: 'bulletins', date: '2026-08-09', file: 'assets/bulletins/2026-08-09.pdf' },
    { category: 'bulletins', date: '2026-08-02', file: 'assets/bulletins/2026-08-02.pdf' },
    { category: 'bulletins', date: '2026-07-26', file: 'assets/bulletins/2026-07-26.pdf' },
    { category: 'bulletins', date: '2026-07-12', file: 'assets/bulletins/2026-07-12.pdf' },
    { category: 'bulletins', date: '2026-07-05', file: 'assets/bulletins/2026-07-05.pdf' },
    { category: 'bulletins', date: '2026-06-14', file: 'assets/bulletins/2026-06-14.pdf' },
    { category: 'study', date: '', title: '예수와 함께 복음과 함께 6주 과정', file: 'assets/library/study/예수와 함께 복음과 함께 6주 과정.pdf' },
    { category: 'study', date: '', title: '현대인과 우상 강의자료 2026', file: 'assets/library/study/현대인과 우상 강의자료 2026.pptx' }
  ];

  /* 홈페이지에 이미 게시된 사진을 앨범으로 묶어 둔 목록입니다. WordPress에 분류 '사진자료' 글(사진 첨부)을 올리면 이 목록과 함께 표시됩니다. */
  const LOCAL_PHOTOS = [
    { date: '2026-11-01', title: '2026.11.01 주일예배', titleVi: 'Thờ phượng Chúa Nhật 01.11.2026', files: ['assets/optimized/church-2026-11-01/hmc_104753.webp', 'assets/optimized/church-2026-11-01/hmc_113551.webp', 'assets/optimized/church-2026-11-01/hmc_113555.webp'] },
    { date: '2026-10-28', title: '2026.10.28 수요예배', titleVi: 'Thờ phượng thứ Tư 28.10.2026', files: ['assets/optimized/church-2026-10-28/pastor-guitar-720.webp', 'assets/optimized/church-2026-10-28/sermon-720.webp', 'assets/optimized/church-2026-10-28/worship-scene-1200.webp', 'assets/optimized/church-2026-10-28/joint-prayer-1200.webp'] },
    { date: '2026-10-25', title: '2026.10.25 주일예배와 교회 공간', titleVi: 'Thờ phượng Chúa Nhật 25.10.2026 và không gian Hội Thánh', files: ['assets/optimized/church-2026-10/hall-1200.webp', 'assets/optimized/church-2026-10/choir-1200.webp', 'assets/optimized/church-2026-10/sermon-1200.webp', 'assets/optimized/church-2026-10/prayer-1200.webp', 'assets/optimized/church-2026-10/fellowship-1200.webp', 'assets/optimized/church-2026-10/building-1200.webp'] }
  ];
  const state = { lang: document.documentElement.lang === 'vi' ? 'vi' : 'ko', category: 'all', search: '', page: 1, records: [], loaded: false, notice: '' };
  const $ = id => document.getElementById(id);
  const tr = key => labels[key][state.lang];

  function safePostUrl(raw) {
    try { const u = new URL(raw); return u.protocol === 'https:' && u.hostname === mediaHost ? u.href : null; } catch { return null; }
  }
  function mediaLinks(html) {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    return [...doc.querySelectorAll('a[href]')].map(a => {
      try {
        const u = new URL(a.getAttribute('href'));
        const ext = u.pathname.split('.').pop().toLowerCase();
        return u.protocol === 'https:' && u.hostname === mediaHost && u.pathname.startsWith('/wp-content/uploads/') && ['pdf', 'ppt', 'pptx', 'pps', 'ppsx', 'jpg', 'jpeg', 'png', 'webp'].includes(ext) ? { url: u.href, ext } : null;
      } catch { return null; }
    }).filter(Boolean);
  }
  function imageUrls(html) {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    const urls = [];
    [...doc.querySelectorAll('img[src],a[href]')].forEach(el => {
      try {
        const u = new URL(el.getAttribute('src') || el.getAttribute('href'));
        if (u.protocol === 'https:' && /(^|\.)(wordpress|wp)\.com$/.test(u.hostname) && /\.(jpe?g|png|webp)$/i.test(u.pathname)) { u.search = ''; if (!urls.includes(u.href)) urls.push(u.href); }
      } catch { /* 잘못된 주소는 건너뜀 */ }
    });
    return urls.slice(0, 40);
  }
  function parsePost(post) {
    if (post.status !== 'publish') return null;
    const category = Object.keys(post.categories || {}).map(name => categoryNames[name]).find(Boolean);
    if (!category) return null;
    const title = String(post.title || '').replace(/<[^>]*>/g, '').trim();
    const match = title.match(/(20\d{2})[-_.](0?[1-9]|1[0-2])[-_.]([12]\d|3[01]|0?[1-9])/);
    const date = match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : String(post.date || '').slice(0, 10);
    if (category === 'photos') {
      const images = imageUrls(post.content);
      return images.length ? { id: post.ID, title, date, category, url: images[0], ext: 'photo', downloadable: true, images } : null;
    }
    const media = mediaLinks(post.content)[0] || null;
    if (category === 'bulletins' && (!media || media.ext !== 'pdf')) return null;
    const url = media?.url || safePostUrl(post.URL);
    if (!url) return null;
    return { id: post.ID, title, date, category, url, ext: media?.ext || 'post', downloadable: !!media };
  }
  function localRecords() {
    return LOCAL_FALLBACK.map((item, i) => {
      const url = new URL(`../${item.file.split('/').map(encodeURIComponent).join('/')}`, location.href).href;
      const ext = item.file.split('.').pop().toLowerCase();
      return { id: -i - 1, title: item.title || item.file.split('/').pop().replace(/\.[^.]+$/, ''), date: item.date, category: item.category, url, ext, downloadable: true };
    });
  }
  function localPhotoRecords() {
    return LOCAL_PHOTOS.map((a, i) => ({ id: -1000 - i, title: a.title, titleVi: a.titleVi, date: a.date, category: 'photos', ext: 'photo', downloadable: true, local: true,
      images: a.files.map(f => new URL('../' + f, location.href).href), url: new URL('../' + a.files[0], location.href).href }));
  }
  const sortRecords = list => list.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  function renderFilters() {
    const box = $('filters');
    box.replaceChildren();
    Object.entries(categories).forEach(([key, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label[state.lang];
      b.setAttribute('aria-pressed', String(state.category === key));
      b.addEventListener('click', () => { state.category = key; state.page = 1; render(); });
      box.appendChild(b);
    });
  }
  function titleOf(r) {
    if (r.local && state.lang === 'vi' && r.titleVi) return r.titleVi;
    if (r.category === 'bulletins' && r.date) return state.lang === 'ko' ? `주일 주보 · ${r.date.replaceAll('-', '.')}` : `Bản tin Chúa Nhật · ${r.date.split('-').reverse().join('/')}`;
    return r.title;
  }
  function makeLink(text, href, label) {
    const a = document.createElement('a');
    a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = text; a.setAttribute('aria-label', label);
    return a;
  }
  function makePhotoRow(r) {
    const card = document.createElement('article');
    card.className = 'record photo-record';
    const meta = document.createElement('div');
    meta.className = 'record-meta';
    const small = document.createElement('small');
    small.textContent = categories.photos[state.lang] + ' · ' + (r.date ? r.date.replaceAll('-', '.') : tr('undated')) + ' · ' + r.images.length + (state.lang === 'ko' ? '장' : ' ảnh');
    const title = document.createElement('strong');
    title.textContent = titleOf(r);
    meta.append(small, title);
    const grid = document.createElement('div');
    grid.className = 'photo-grid';
    r.images.slice(0, 8).forEach((src, i) => {
      const a = document.createElement('a');
      a.href = src; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', titleOf(r) + ' ' + (i + 1));
      const im = document.createElement('img');
      im.src = r.local ? src : src + '?w=480'; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
      a.appendChild(im);
      if (i === 7 && r.images.length > 8) { const more = document.createElement('span'); more.textContent = '+' + (r.images.length - 8); a.appendChild(more); }
      grid.appendChild(a);
    });
    card.append(meta, grid);
    return card;
  }
  function makeRow(r) {
    if (r.category === 'photos' && r.images) return makePhotoRow(r);
    const card = document.createElement('article');
    card.className = 'record';
    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = r.ext === 'post' ? (state.lang === 'ko' ? '글' : 'Bài') : r.ext.toUpperCase();
    const meta = document.createElement('div');
    meta.className = 'record-meta';
    const small = document.createElement('small');
    small.textContent = `${categories[r.category][state.lang]} · ${r.date ? r.date.replaceAll('-', '.') : tr('undated')} · ${r.ext.toUpperCase()}`;
    const title = document.createElement('strong');
    title.textContent = titleOf(r);
    meta.append(small, title);
    const actions = document.createElement('div');
    actions.className = 'record-actions';
    const isSlides = ['ppt', 'pptx', 'pps', 'ppsx'].includes(r.ext);
    const viewHref = r.category === 'sermons' && isSlides && r.id > 0 ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(r.url)}` : r.url;
    actions.appendChild(makeLink(tr('view'), viewHref, `${titleOf(r)} ${tr('view')}`));
    if (r.downloadable && r.category !== 'sermons') {
      const dl = makeLink(tr('download'), r.url, `${titleOf(r)} ${tr('download')}`);
      if (r.ext === 'pdf') dl.title = tr('pdfHint');
      if (r.id < 0) dl.setAttribute('download', '');
      actions.appendChild(dl);
    }
    card.append(icon, meta, actions);
    return card;
  }
  function render() {
    renderFilters();
    const q = state.search.trim().toLocaleLowerCase();
    const filtered = state.records.filter(r => (state.category === 'all' || r.category === state.category) && (!q || `${r.title} ${r.date} ${r.date.replaceAll('-', '.')} ${titleOf(r)} ${categories[r.category].ko} ${categories[r.category].vi}`.toLocaleLowerCase().includes(q)));
    $('count').textContent = state.loaded ? tr('count')(filtered.length) : '';
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    state.page = Math.min(state.page, pages);
    const items = $('items');
    items.replaceChildren();
    const pageItems = filtered.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
    if (state.loaded && !pageItems.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = tr('empty');
      items.appendChild(empty);
    } else pageItems.forEach(r => items.appendChild(makeRow(r)));
    const nav = $('pagination');
    nav.replaceChildren();
    if (pages > 1) {
      const button = (text, num, { disabled = false, current = false, label = text } = {}) => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = text; b.disabled = disabled; b.setAttribute('aria-label', label);
        if (current) { b.classList.add('active'); b.setAttribute('aria-current', 'page'); }
        b.addEventListener('click', () => { state.page = num; render(); $('filters').scrollIntoView({ block: 'start' }); });
        nav.appendChild(b);
      };
      button(tr('prev'), state.page - 1, { disabled: state.page === 1 });
      for (let n = Math.max(1, state.page - 2); n <= Math.min(pages, state.page + 2); n++) button(String(n), n, { current: n === state.page, label: tr('page')(n) });
      button(tr('next'), state.page + 1, { disabled: state.page === pages });
    }
  }
  async function load() {
    $('status').textContent = tr('loading');
    $('refresh').disabled = true;
    let records = [];
    let failed = false;
    try {
      const posts = [];
      for (let offset = 0; offset < 1000; offset += 100) {
        const res = await fetch(`${api}?number=100&offset=${offset}&_=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw Error(`WordPress API ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data.posts)) throw Error('Invalid WordPress response');
        posts.push(...data.posts);
        if (posts.length >= data.found || data.posts.length < 100) break;
      }
      records = posts.map(parsePost).filter(Boolean);
    } catch (err) {
      failed = true;
      console.warn('Church library unavailable:', err.message);
    }
    const useFallback = failed || !records.length;
    state.records = sortRecords([...(useFallback ? localRecords() : records), ...localPhotoRecords()]);
    state.notice = failed ? 'fallback' : (useFallback ? 'fallbackEmpty' : '');
    state.loaded = true;
    state.page = 1;
    $('status').textContent = state.notice ? tr(state.notice) : '';
    $('refresh').disabled = false;
    render();
  }

  document.addEventListener('hmc:langchange', e => {
    state.lang = e.detail.lang === 'vi' ? 'vi' : 'ko';
    $('status').textContent = !state.loaded ? tr('loading') : (state.notice ? tr(state.notice) : '');
    render();
  });
  $('search').addEventListener('input', e => { state.search = e.target.value; state.page = 1; render(); });
  $('search-button').addEventListener('click', () => { state.search = $('search').value; state.page = 1; render(); });
  $('search').addEventListener('keydown', e => { if (e.key === 'Enter') $('search-button').click(); });
  $('refresh').addEventListener('click', load);
  const adminLink = document.querySelector('a[href="#admin"]');
  if (adminLink) adminLink.addEventListener('click', () => { $('admin').open = true; });
  if (location.hash === '#admin') $('admin').open = true;
  const startCat = new URLSearchParams(location.search).get('cat');
  if (startCat && categories[startCat]) state.category = startCat;
  render();
  load();
})();
