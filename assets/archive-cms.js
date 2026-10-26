/* Hanoi Mission Church library: public WordPress.com posts, no GitHub upload. */
(() => {
  'use strict';
  const api = 'https://public-api.wordpress.com/rest/v1.1/sites/hanoimissionchurchv2.wordpress.com/posts/';
  const mediaHost = 'hanoimissionchurchv2.wordpress.com';
  const categoryNames = { '주보':'bulletins', '교회소식':'notices', '교육자료':'study', '선교자료':'mission', '기타자료':'other' };
  const categories = {all:{ko:'전체',vi:'Tất cả'},bulletins:{ko:'주보',vi:'Bản tin'},notices:{ko:'교회소식',vi:'Tin Hội Thánh'},study:{ko:'교육자료',vi:'Tài liệu học'},mission:{ko:'선교자료',vi:'Tài liệu truyền giáo'},other:{ko:'기타',vi:'Khác'}};
  const labels = {loading:{ko:'자료 목록을 불러오는 중입니다.',vi:'Đang tải danh sách tài liệu.'},error:{ko:'자료 서버에 연결하지 못했습니다. 잠시 후 ‘새 자료 확인’을 눌러주세요.',vi:'Không thể kết nối máy chủ tài liệu. Vui lòng thử “Làm mới” sau.'},empty:{ko:'해당 자료가 없습니다.',vi:'Không có tài liệu phù hợp.'},count:{ko:n=>`총 ${n}개 자료`,vi:n=>`${n} tài liệu`},view:{ko:'열람',vi:'Xem'},download:{ko:'다운로드',vi:'Tải xuống'},prev:{ko:'이전',vi:'Trước'},next:{ko:'다음',vi:'Tiếp'},undated:{ko:'날짜 미상',vi:'Không rõ ngày'}};
  const state = {lang:localStorage.getItem('hmc-lang')==='vi'?'vi':'ko',category:'all',search:'',page:1,records:[]};
  const $ = id => document.getElementById(id);
  const tr = key => labels[key][state.lang];
  function safePostUrl(raw) {
    try { const u=new URL(raw); return u.protocol==='https:' && u.hostname===mediaHost ? u.href : null; } catch { return null; }
  }
  function mediaLinks(html) {
    const doc=new DOMParser().parseFromString(html||'','text/html');
    return [...doc.querySelectorAll('a[href]')].map(a=>{
      try {const u=new URL(a.getAttribute('href'));const ext=u.pathname.split('.').pop().toLowerCase();return u.protocol==='https:'&&u.hostname===mediaHost&&u.pathname.startsWith('/wp-content/uploads/')&&['pdf','jpg','jpeg','png','webp'].includes(ext)?{url:u.href,ext}:null;}catch{return null;}
    }).filter(Boolean);
  }
  function parsePost(post) {
    if(post.status!=='publish') return null;
    const category=Object.keys(post.categories||{}).map(name=>categoryNames[name]).find(Boolean);
    if(!category) return null;
    const title=String(post.title||'').replace(/<[^>]*>/g,'').trim();
    const match=title.match(/(20\d{2})[-_.](0?[1-9]|1[0-2])[-_.]([12]\d|3[01]|0?[1-9])/);
    const date=match?`${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`:String(post.date||'').slice(0,10);
    const media=mediaLinks(post.content)[0]||null;
    if(category==='bulletins' && (!media || media.ext!=='pdf')) return null;
    const url=media?.url||safePostUrl(post.URL);
    if(!url) return null;
    return {id:post.ID,title,date,category,url,ext:media?.ext||'post',downloadable:!!media};
  }
  function setLang(lang) {
    state.lang=lang;document.documentElement.lang=lang;document.body.classList.toggle('vi',lang==='vi');
    document.querySelectorAll('[data-ko]').forEach(el=>{el.textContent=el.dataset[lang]});
    document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang));
    $('search').placeholder=$('search').dataset['placeholder'+(lang==='ko'?'Ko':'Vi')];$('search').setAttribute('aria-label',$('search').placeholder);
    localStorage.setItem('hmc-lang',lang);render();
  }
  function renderFilters() {
    const box=$('filters');box.replaceChildren();Object.entries(categories).forEach(([key,label])=>{
      const b=document.createElement('button');b.type='button';b.textContent=label[state.lang];b.classList.toggle('active',state.category===key);b.setAttribute('aria-pressed',state.category===key?'true':'false');
      b.addEventListener('click',()=>{state.category=key;state.page=1;render()});box.appendChild(b);
    });
  }
  function titleOf(r) {return r.category==='bulletins'&&r.date?(state.lang==='ko'?`주일 주보 · ${r.date.replaceAll('-','.')}`:`Bản tin Chúa Nhật · ${r.date.split('-').reverse().join('/')}`):r.title;}
  function makeRow(r) {
    const card=document.createElement('article');card.className='record';
    const icon=document.createElement('span');icon.className='file-icon';icon.textContent=r.ext==='post'?'글':r.ext.toUpperCase();
    const meta=document.createElement('div');meta.className='record-meta';const small=document.createElement('small');small.textContent=`${categories[r.category][state.lang]} · ${r.date?r.date.replaceAll('-','.'):tr('undated')} · ${r.ext.toUpperCase()}`;
    const title=document.createElement('strong');title.textContent=titleOf(r);meta.append(small,title);
    const actions=document.createElement('div');actions.className='record-actions';const view=document.createElement('a');view.href=r.url;view.target='_blank';view.rel='noopener noreferrer';view.textContent=tr('view');view.setAttribute('aria-label',`${titleOf(r)} ${tr('view')}`);actions.appendChild(view);
    if(r.downloadable){const dl=document.createElement('a');dl.href=r.url;dl.target='_blank';dl.rel='noopener noreferrer';dl.textContent=tr('download');dl.setAttribute('aria-label',`${titleOf(r)} ${tr('download')}`);dl.title=state.lang==='ko'?'PDF 뷰어에서 저장할 수 있습니다.':'Có thể lưu trong trình xem PDF.';actions.appendChild(dl)}
    card.append(icon,meta,actions);return card;
  }
  function render() {
    renderFilters();const q=state.search.trim().toLocaleLowerCase();const filtered=state.records.filter(r=>(state.category==='all'||r.category===state.category)&&(!q||`${r.title} ${r.date} ${r.date.replaceAll('-','.')} ${titleOf(r)} ${categories[r.category].ko} ${categories[r.category].vi}`.toLocaleLowerCase().includes(q)));
    $('count').textContent=tr('count')(filtered.length);const pages=Math.max(1,Math.ceil(filtered.length/12));state.page=Math.min(state.page,pages);
    const items=$('items');items.replaceChildren();const pageItems=filtered.slice((state.page-1)*12,state.page*12);if(!pageItems.length){const empty=document.createElement('div');empty.className='empty';empty.textContent=tr('empty');items.appendChild(empty)}else pageItems.forEach(r=>items.appendChild(makeRow(r)));
    const nav=$('pagination');nav.replaceChildren();if(pages>1){const button=(text,num,disabled=false)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.disabled=disabled;b.classList.toggle('active',num===state.page&&/^\d+$/.test(text));b.addEventListener('click',()=>{state.page=num;render();$('filters').scrollIntoView({block:'start'})});nav.appendChild(b)};button(tr('prev'),state.page-1,state.page===1);for(let n=Math.max(1,state.page-2);n<=Math.min(pages,state.page+2);n++)button(String(n),n);button(tr('next'),state.page+1,state.page===pages)}
  }
  async function load() {
    $('status').textContent=tr('loading');$('refresh').disabled=true;
    try {
      const posts=[];for(let offset=0;offset<1000;offset+=100){const res=await fetch(`${api}?number=100&offset=${offset}&_=${Date.now()}`,{cache:'no-store'});if(!res.ok)throw Error(`WordPress API ${res.status}`);const data=await res.json();if(!Array.isArray(data.posts))throw Error('Invalid WordPress response');posts.push(...data.posts);if(posts.length>=data.found||data.posts.length<100)break;}
      state.records=posts.map(parsePost).filter(Boolean).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);state.page=1;$('status').textContent='';render();
    } catch(err) {state.records=[];$('status').textContent=tr('error');render();console.warn('Church library unavailable:',err.message)}
    finally {$('refresh').disabled=false}
  }
  document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLang(b.dataset.lang)));
  $('search').addEventListener('input',e=>{state.search=e.target.value;state.page=1;render()});$('refresh').addEventListener('click',load);
  document.querySelector('a[href="#admin"]').addEventListener('click',()=>$('admin').open=true);if(location.hash==='#admin')$('admin').open=true;
  setLang(state.lang);load();
})();
