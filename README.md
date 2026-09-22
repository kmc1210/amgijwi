카페 음료 레시피 외우기용 앱. Claude로 만들었습니다.

https://amgijwi.com (테스트 페이지)

GitHub Pages 로 서빙하던 시절의 주소(kmc1210.github.io/brewnote/, /amgijwi/)는
2026-09-22 자로 내렸습니다. 테스터 데이터 이전도 끝나서 앱은 위 주소 한 곳에서만 열립니다.

쓰는 법

브라우저에서 위 주소를 열고 홈 화면에 추가를 하면 앱처럼 실행됩니다.
(아이폰은 사파리에서 공유 → 홈 화면에 추가, 안드로이드는 메뉴 → 홈 화면에 추가)

학습 — 카드 뒤집기 / 빈칸 채우기 두 가지 방식
레시피 — 직접 입력하거나, 사진 속 글자를 복사해 붙여넣으면 자동 정리
부재료 — 한 번 등록해 여러 메뉴에서 같이 씁니다
보관 — 안 쓰는 레시피는 지우지 말고 보관함으로 넘겨 학습에서 빼둡니다
개봉관리 — 개봉한 재료의 기한을 등록하면 홈에서 오늘 폐기할 것을 알려줌
백업 — 설정 탭에서 JSON 파일로 내보내기 / 불러오기

알아둘 점

레시피와 학습 기록은 기기 안에만 저장됩니다. 서버로 나가는 통신이 없습니다.
CSP 의 connect-src 'none' 으로 브라우저가 이걸 강제합니다.
그래서 브라우저 데이터를 지우거나 기기를 바꾸면 사라집니다. 백업 파일을 만들어 두세요.
주소가 바뀌면 브라우저가 다른 사이트로 인식해 기존 데이터가 보이지 않습니다. 옮기기 전에 백업 필수.
PIN 잠금은 훔쳐보기 방지용이지 암호화가 아닙니다.

구성

www/                 배포되는 앱. 이 폴더 통째로 S3 에 올라갑니다.
  index.html         마크업
  style.css          스타일
  app.js             앱 전체 로직 (도트 그래픽 포함)
  apple-touch-icon.png
test/regression.js   실제 브라우저로 돌리는 회귀 테스트
index.html           옛 단일 파일. 지금은 어디에도 서빙되지 않습니다. 옛 주소(kmc1210.github.io)의
                     브라우저 저장소에 남은 데이터를 꺼내야 할 때 Pages 를 잠깐 켜서 쓸 통로라 남겨둡니다.

코드 안의 brewnote 는 저장소 이름이 아니라 앱 내부 식별자라 바꾸지 않습니다.
저장 키 brewnote.v1, PIN 해시 salt, 백업 파일의 app 표시가 그렇습니다.
바꾸면 기존 레시피가 안 보이거나 PIN 잠금을 못 풉니다. 회귀 테스트가 이 값을 고정합니다.

테스트

  npm ci
  npx playwright install chromium
  npm test

Chromium 을 띄워 www/index.html 을 열고, 부재료 마이그레이션 · 보관 필터 ·
참조 무결성 · 저장소 왕복 · 이스케이프 · CSP 를 확인합니다.
PR 을 올리면 GitHub Actions(.github/workflows/ci.yml)가 같은 테스트를 돌리고,
통과해야 main 에 머지합니다.

  npm run test:headers

배포된 사이트( https://amgijwi.com )의 보안 헤더와, 헤더 CSP 가 meta CSP 와
같은지 확인합니다. 네트워크가 필요하고 배포가 끝난 뒤에 돌립니다.

배포

  GitHub Actions → Deploy → Run workflow

www/ 를 S3 에 올리고 CloudFront 캐시를 비운 뒤, 배포된 파일이 저장소와
같은지와 보안 헤더를 확인합니다(.github/workflows/deploy.yml).
AWS 키는 저장소에 없고 OIDC 로 IAM 역할을 받습니다. 역할은 main 브랜치만 허용합니다.
저장소 변수 AUTO_DEPLOY 를 true 로 두면 www/ 변경이 main 에 머지될 때 자동으로 배포합니다.

IAM 역할 신뢰 정책의 sub 는 저장소 이름이 아니라 아래 형식입니다.

  repo:kmc1210@57215151/amgijwi@1313381059:ref:refs/heads/main

계정 id 와 저장소 id 가 붙는 형식(immutable subject)이라 이름만 적으면 인증이 거절됩니다.
실제 값은 gh api repos/kmc1210/amgijwi/actions/oidc/customization/sub 로 확인합니다.
