# 맥에서 이어 하기

윈도우(IntelliJ)에서 맥(VS Code)으로 옮길 때 한 번 읽는 문서다.
다 옮기고 나면 지워도 된다.

## 뭐가 따라오고 뭐가 안 따라오나

| | 어떻게 |
|---|---|
| 앱 코드 · 테스트 · 워크플로 · README · 이 문서 | `git clone` 하면 끝이다 |
| 열려 있는 PR, 액션 기록, 저장소 변수(`AUTO_DEPLOY`), OIDC 설정 | GitHub 에 있다 |
| 시안 아티팩트 (도트 아이콘 · 소리 · 날씨 옷) | claude.ai 계정에 있다 |
| **Claude Code 메모리** | **안 따라온다.** 손으로 옮긴다 |
| **node · gh 로그인 · playwright 브라우저 · Xcode** | **안 따라온다.** 새로 깐다 |

`node_modules/` 와 `ios/*.xcodeproj` 는 `.gitignore` 에 있다.
만들어 쓰는 것들이라 옮기는 게 아니라 맥에서 다시 만든다.

## 맥 첫날

Xcode 는 App Store 에서 받는다. 용량이 커서 제일 먼저 걸어두는 게 좋다.
다 깔리면 명령줄 도구도 같이 온다. `xcodebuild` 가 안 잡히면 한 번만 가리켜 준다.

```sh
sudo xcode-select -s /Applications/Xcode.app
```

나머지는 Homebrew 로 받는다.

```sh
brew install node gh xcodegen

gh auth login
git clone https://github.com/kmc1210/amgijwi.git
cd amgijwi
npm ci
npx playwright install chromium
npm test          # 다 통과하면 환경이 제대로 선 것이다
```

VS Code 는 확장에서 **Claude Code** 를 깔면 된다.
이 저장소는 번들러도 트랜스파일러도 없어서 에디터 쪽에 따로 차릴 게 없다.
앱을 눈으로 보려면 `www/` 를 아무 정적 서버로 열면 되고,
회귀 테스트는 자기 서버를 직접 띄우므로 아무것도 켜 둘 필요가 없다.

### 줄바꿈은 건드리지 않는다

저장소는 LF 로 저장돼 있고 맥도 LF 다. `core.autocrlf` 를 손대지 않으면 그대로 맞는다.
윈도우에서는 작업 트리가 CRLF 라 파일을 고치는 스크립트마다 줄바꿈을 보존해야 했는데,
맥에서는 그 신경을 안 써도 된다.

## Claude Code 메모리 옮기기

지금까지의 결정 사항(작업 규칙 · 배포 현황 · 아이콘 결정 · iOS 상태 등)이 md 아홉 개로 쌓여 있다.
저장소가 아니라 홈 디렉터리에 있어서 git 으로 따라오지 않는다.

윈도우 쪽 원본은 여기다.

```
%USERPROFILE%\.claude\projects\C--\memory\
```

폴더 이름(`C--`)은 Claude Code 를 띄운 작업 폴더에서 나온 것이라 맥에서는 다른 이름이 된다.
그래서 **맥에서 저장소 폴더에 들어가 Claude Code 를 한 번 띄운 뒤**,
`~/.claude/projects/` 에 새로 생긴 폴더를 확인하고 그 안 `memory/` 로 위 파일들을 통째로 넣는다.
`MEMORY.md` 가 색인이라 같이 넣어야 나머지가 읽힌다.

## 맥이 생겨서 이제 되는 것

`ios/README.md` 의 "아직 안 한 것" 중 **서명과 테스트플라이트**가 맥이 없어서 막혀 있었다.

1. 애플 개발자 프로그램 등록 (연 $99). 승인에 며칠 걸리기도 한다
2. Xcode 에 애플 계정을 넣어 팀을 만든다
3. `ios/project.yml` 의 `settings.base` 에 `DEVELOPMENT_TEAM` 을 넣는다
4. `cd ios && xcodegen generate && open Amgijwi.xcodeproj`
5. Xcode 에서 Archive → Distribute App → App Store Connect
6. App Store Connect 에서 테스트플라이트 테스터를 부른다

올릴 때마다 `project.yml` 의 `CURRENT_PROJECT_VERSION` 을 올려야 한다.
같은 빌드 번호는 App Store Connect 가 두 번 받지 않는다.

**인증서를 저장소 시크릿에 넣을 필요는 없다.** 맥에서 직접 올리면 되기 때문이다.
지금 이 저장소는 시크릿이 0개고(AWS 도 OIDC 로 받는다) 그 상태를 깨지 않는 편이 낫다.
CI 에서 서명까지 하고 싶어지면 그때 다시 생각한다.
`.github/workflows/ios.yml` 은 `CODE_SIGNING_ALLOWED=NO` 로 빌드만 확인하므로 그대로 둔다.

시뮬레이터를 직접 띄울 수 있으니, 화면을 보려고 액션의 `ios-screenshot` 아티팩트를
받아 보던 것도 이제 안 해도 된다.

## 남은 일

- **일정 알림** — 로컬 알림은 푸시와 달리 별도 권한이나 서버가 필요 없고 시뮬레이터에서도 뜬다.
  만들어 보는 데는 개발자 프로그램 등록이 필요 없다. 등록이 필요한 건 남에게 줄 때다
- **WeatherKit 연결** — 웹 쪽 `window.__amgijwiWeather` 자리는 이미 만들어져 있다.
  값을 넣어 주는 네이티브 코드만 붙이면 된다. WeatherKit 은 개발자 프로그램 등록이 필요하다
- **네이티브 쪽 저장소 복사본 · 햅틱** — `ios/README.md` 참고
