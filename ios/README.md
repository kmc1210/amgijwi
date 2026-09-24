# 암기쥐 iOS 껍데기

`www/` 를 그대로 담아 웹뷰로 띄우는 앱이다. 웹 코드는 고치지 않는다.

## 왜 이렇게 만들었나

### file:// 이 아니라 직접 만든 스킴으로 띄운다

`amgijwi://app/index.html` 로 연다. `file://` 로 열면 오리진이 제대로 잡히지 않아
`localStorage` 가 예외를 뱉거나 앱을 껐다 켜면 레시피가 사라지는 일이 있다.
스킴을 직접 다루면 고정된 오리진이 생겨 저장이 안정적으로 남는다.
`BundleSchemeHandler.swift` 가 번들 안 `www/` 를 읽어 내려준다.

`index.html` 의 `<meta>` CSP 에 있는 `script-src 'self'` 도 이 오리진을 가리키므로
웹에서와 똑같이 동작한다. 앱에서의 CSP 는 meta 하나로 유지한다.
스킴 처리기가 CSP 헤더를 따로 내려보내지 않는 이유다. 두 벌이 되면 어긋날 수 있다.

### 저장소는 디스크에 남긴다

`websiteDataStore = .default()` 를 쓴다. `.nonPersistent()` 는 앱을 끄면 다 지워진다.

### 소리는 ambient 로 연다

무음 스위치를 따르고, 사용자가 듣고 있던 음악을 끊지 않는다.
공부하면서 켜두는 앱이라 남의 소리를 뺏지 않는 편이 맞다.

### 앱이라는 사실을 웹에 알린다

웹뷰에서는 `display-mode: standalone` 도 `navigator.standalone` 도 잡히지 않는다.
그대로 두면 앱 안에서 "홈 화면에 추가하세요" 안내가 뜬다.
그래서 문서가 뜨기 전에 `window.__amgijwiNative = true` 를 심고,
`www/js/boot.js` 의 `isStandalone()` 이 이것도 본다.

이름이 두 곳에 적히므로 한쪽만 고치면 조용히 안내가 다시 뜬다.
`test/regression.js` 6-6 이 두 이름이 같은지 확인한다.

## 빌드

`.xcodeproj` 는 저장소에 없다. `project.yml` 에서 만들어 쓴다.
맥 없이 이 파일만 고쳐도 프로젝트를 바꿀 수 있고, 병합 충돌이 사람이 읽을 수 있는 모양으로 난다.

```sh
brew install xcodegen
cd ios
xcodegen generate
open Amgijwi.xcodeproj
```

맥이 없으면 손댈 필요 없다. `.github/workflows/ios.yml` 이 macOS 러너에서
빌드하고 시뮬레이터에 올려 실행한 뒤 **화면을 찍어 올려둔다.**
Actions 실행 결과의 `ios-screenshot` 를 받아 보면 된다.

## 앱 아이콘

`Assets.xcassets/AppIcon.appiconset/icon-1024.png`. 고치려면 원본을 직접 손대지 말고

```sh
node ios/make-icon.js
```

`www/js/core.js` 의 쥐돌이 도트에서 다시 그린다. 구도는 스크립트 위쪽의
`CELL`(칸 크기) · `TOP`(위 여백) · 배경색 두 개로 정한다.

`www/apple-touch-icon.png`(180px)를 늘려 쓰지 않는다. 1024 와 비율이 맞지 않아
칸이 들쭉날쭉해지고, 그 파일 자체가 한 번 줄이면서 뭉개져 색이 108가지나 된다.

**알파 채널이 있으면 앱스토어가 거부한다.** 그래서 투명도 없이(PNG 색 타입 2) 쓴다.
`test/regression.js` 6-6 이 크기와 알파를 확인한다.

## 아직 안 한 것
- **네이티브 쪽 복사본.** iOS 가 오래 안 쓴 앱의 웹 저장소를 정리할 가능성이 있다.
  레시피를 앱의 저장 공간에도 같이 복사해 두면 그런 경우에도 복구된다.
  웹뷰와 앱 사이에 다리를 놓아야 하므로 `www/` 코드도 조금 손댄다.
- **데이터 이사 안내.** 사파리의 `amgijwi.com` 저장소와 앱 웹뷰의 저장소는 전혀 다른 공간이다.
  앱을 깔아도 기존 레시피가 따라오지 않는다. 백업 파일로 옮기는 안내가 첫 실행에 필요하다.
- **서명과 배포.** 애플 개발자 프로그램, 인증서, 테스트플라이트 업로드.
  인증서를 저장소 시크릿에 넣게 되므로 지금의 "시크릿 0개" 상태가 달라진다.
- **햅틱.** 카드를 넘길 때 짧은 진동.
