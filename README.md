# 하노이 선교교회 홈페이지 초안

- 공개 주소(현재): https://hanoimissionchurch.com/ · 자료실: `archive/`
- 같은 파일을 Cloudflare Workers 정적 배포(`wrangler.jsonc`)로도 올릴 수 있습니다.

## 실행 방법
`index.html`을 Chrome 또는 Edge에서 열면 됩니다. 실제 배포와 같은 조건으로 보려면 저장소 폴더에서 아래 명령을 실행한 뒤 http://localhost:8000 을 엽니다.

```bash
python3 -m http.server 8000
```

## 포함 기능
- 한국어/베트남어 즉시 전환 (주소 끝에 `?lang=vi`를 붙이면 베트남어로 열림, 선택한 언어는 브라우저에 기억)
- 모바일 우선 반응형 구성 (휴대폰 → 태블릿 → PC 순으로 확장)
- 방문자 동선 중심 구성: 예배 안내 → 새가족 안내 → 설교·영상 → 교회 소식 → 교회 소개 → 공동체 → 선교와 나눔 → 오시는 길·문의
- 예배 안내: 주일·주중 예배 4종, 다음세대·성경공부 4종 (2026년 10월 25일 주보 기준)
- 최신 주일설교 영상 (클릭 시 플레이어를 불러오는 경량 방식), 추천 설교 3편, YouTube·Instagram·TikTok 연결, Zalo 준비 중 표시
- 교회 소식: 설교·찬양 숏폼, 주보, 지난 집회 기록
- 오시는 길·문의: 주소, 그랩 검색어, 구글 지도, 전화·이메일·카카오톡 채널(챗봇)
- 별도 자료실 `archive/`: WordPress.com 공개 글을 검색·분류·12건씩 페이지로 표시, 연결 실패 시 저장소 보관 주보·자료를 대신 표시
- 접근성: 본문 바로가기, 키보드 초점 표시, 대비 4.5:1 이상, 이미지 대체텍스트(한·베), 움직임 줄이기 설정 존중
- 검색·공유: 메타 설명, canonical, Open Graph·Twitter 카드, 구조화 데이터(JSON-LD: 교회·단체·웹사이트), `sitemap.xml`, `robots.txt`
- 성능: 원본 사진은 그대로 두고 WebP 축소본(`assets/optimized/`)을 화면 크기에 맞게 제공, 화면 밖 이미지·배경 지연 로딩

## 파일 구성
| 파일 | 역할 |
|---|---|
| `index.html` | 홈페이지 (문구·구성·스타일) |
| `archive/index.html` | 자료실 페이지 |
| `assets/site.js` | 두 페이지 공통 스크립트: 언어 전환, 모바일 메뉴, 등장 효과, 영상 불러오기, 기간 한정 공지 |
| `assets/archive-cms.js` | 자료실 목록 (WordPress 연결 + 저장소 보관 자료 대체 목록) |
| `assets/optimized/` | 웹용 WebP 축소본 (`scripts/optimize-images.py`로 생성) |
| `assets/og-image.jpg` | 카카오톡·SNS 공유 미리보기 이미지 (1200×630) |
| `scripts/check-site.mjs` | 점검 스크립트 |
| `sitemap.xml`, `robots.txt` | 검색엔진용 파일 |
| `hanoi-mission-church-v2.html` 등 `*-v2.*` | 이전 v2 미리보기·CMS 이전 자료 (보관용, 검색 제외 처리) |

## 문구 수정 규칙 (한국어/베트남어)
- 화면에 보이는 한국어 문구는 HTML 본문에 그대로 쓰고, 같은 요소에 `data-vi="베트남어"`를 붙입니다.
  예: `<h2 data-vi="Cùng nhau thờ phượng">함께 예배드려요</h2>`
- 이미지 설명·버튼 라벨은 `alt` + `data-vi-alt`, `aria-label` + `data-vi-aria-label`, `title` + `data-vi-title`을 짝으로 씁니다.
- 예전 방식의 `data-ko`는 더 이상 쓰지 않습니다. 한국어를 두 곳에 쓰면 한쪽만 고쳐지는 문제가 생기기 때문입니다.
- 베트남어 안에 그대로 두어야 하는 한국어 이름은 `<span translate='no'>…</span>`로 감쌉니다.

## 매주 업데이트 방법
1. **최신 주일설교**: `index.html`에서 `data-youtube-id`(영상 ID 11자리), `data-video-title`, 바로 아래 썸네일 주소(`i.ytimg.com/vi/영상ID/…`), `최신 주일설교 · 날짜`, 설교 제목, 성경 본문을 함께 바꿉니다.
2. **교회 소식**: `#news` 섹션 맨 앞에 카드를 하나 추가하고, 가장 오래된 카드는 지웁니다. 날짜는 `<time datetime="YYYY-MM-DD">`로 적습니다.
3. **주보**: WordPress 자료실에 올립니다(아래 자료실 관리 방법). 홈페이지 ‘교회 소식’의 주보 카드도 새 주보로 바꿉니다.
4. **행사 공지 띠**: `index.html`의 `[교회 공지 띠]` 주석 안 예시를 풀어 문구와 종료 시각(`data-notice-until`)을 고칩니다. 종료 시각이 지나면 자동으로 숨겨집니다.
5. 수정 후 점검 스크립트를 실행합니다.

## 점검 스크립트
Node.js 18 이상이 필요합니다. 추가 설치는 없습니다.

```bash
node scripts/check-site.mjs
```

내부 링크·페이지 안 이동, 이미지 대체텍스트·크기, 한국어 문구의 베트남어 누락, 베트남어 표기 일관성(Hội Thánh, Chúa Nhật, Giê-su, 구분 기호), SEO 필수 태그, 구조화 데이터 문법, sitemap, 자료실 대체 목록과 실제 파일 일치 여부를 확인합니다. 외부 링크(YouTube·SNS·지도)까지 확인하려면 인터넷이 되는 PC에서 아래처럼 실행합니다. SNS는 자동 점검을 막는 경우가 있어 경고가 나오면 직접 열어 확인합니다.

```bash
node scripts/check-site.mjs --external
```

GitHub에 Pull Request를 올리면 같은 점검이 자동으로 실행됩니다(`.github/workflows/site-check.yml`).

## 사진 추가·교체 방법
1. 원본은 방향만 바로잡아 `assets/` 아래 적절한 폴더에 둡니다. 인물 사진은 공개 사용 승인을 먼저 확인합니다(`PHOTO-CREDITS.md`).
2. `scripts/optimize-images.py`의 `IMAGES` 목록에 경로를 추가하고 실행합니다(`pip install pillow` 필요). 크기 축소와 WebP 재압축만 하며 원본은 수정하지 않습니다.

```bash
python3 scripts/optimize-images.py
```

3. `index.html`에서 기존 사진과 같은 `<picture>` 형식으로 넣고 `width`·`height`·`alt`·`data-vi-alt`를 채웁니다.

## 자료실 관리 방법
- 자료실은 WordPress.com(`hanoimissionchurchv2.wordpress.com`)의 **공개 글**을 불러옵니다. 관리자는 자료실 페이지의 **관리자 자료 올리기** 안내에 따라 초대받은 WordPress 계정으로 글과 파일을 올립니다. 사이트에 암호나 토큰을 입력하지 않습니다.
- 분류: 주보 · 설교PPT · 교회소식 · 교육자료 · 선교자료 · 기타자료. 제목에 `YYYY-MM-DD` 날짜를 넣으면 날짜순으로 정렬됩니다.
- WordPress에 연결할 수 없거나 공개 글이 없으면, 이 저장소의 `assets/bulletins/`(주보 PDF)와 `assets/library/`(교육자료 등)를 대신 보여 줍니다. 저장소에 파일을 추가했다면 `assets/archive-cms.js`의 `LOCAL_FALLBACK` 목록에도 한 줄 추가합니다(점검 스크립트가 누락을 알려 줍니다).
- 이 저장소와 WordPress 미디어는 모두 공개됩니다. 개인정보, 개인 연락처, 계좌 등은 공개 적합성을 검토한 뒤 올립니다. 기존 10월 18일 PNG 이미지는 예전 링크 호환을 위해 남겨 두었습니다.

## 적용한 확인 자료
- 하노이 선교교회 주보 PDF (2026년 6월 14일~10월 25일). 예배 시간·장소는 10월 25일 주보(제43호) 기준
- 2026년 10월 11일·8월 23일 주일예배 PPT의 컬러 로고 이미지
- 하노이선교교회 NotebookLM 자료, YouTube 채널, Google Maps 교회 정보
- 사진 출처와 공개 승인 기록: `PHOTO-CREDITS.md`, `VERSION-v3.md`

## 게시 전 확인 권장사항
1. 베트남어 문구를 베트남 성도 또는 전문 번역자가 최종 감수 (특히 `Giê-su`/`Giê-xu` 표기, 목양실 `Phòng mục vụ`, 예배 시간 표기)
2. 최종 도메인이 정해지면 `index.html`·`archive/index.html`의 canonical·og 주소, `sitemap.xml`, `robots.txt`, `scripts/check-site.mjs`의 `SITE_URL`을 함께 변경
3. 교회 명의로 최종 검토 후 공개하고, 공개 시 푸터의 ‘홈페이지 초안’ 문구 정리
4. 엠블럼 고해상도 원본을 받으면 교체 (현재 76×81px, 파비콘 겸용)
5. Zalo 공식 계정 개설 후 주소 연결

자세한 SNS 관리 방법은 `SNS-운영안내.md`를 참고하세요.
