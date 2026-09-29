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

같은 때에 `<html class="dot">` 도 붙인다. `www/dot.css` 의 도트 화면이 이 표시로 켜진다.
문서가 그려지기 전이라 웹 모습이 잠깐 비치지 않는다.

### 웹이 앱에 부탁하는 통로

무엇을 할지는 웹이 정하고 앱은 iOS 기능으로 처리만 한다. 이름은 웹 쪽과 같아야 한다.

| 통로 | 파일 | 하는 일 |
|---|---|---|
| `amgijwiAlarm` | `AlarmBridge.swift` | 일정 알림 권한 묻기 · 로컬 알림 예약(최대 64개) |
| `amgijwiShare` | `ShareBridge.swift` | 백업 JSON 을 임시 파일로 만들어 공유 시트 띄우기. 웹뷰는 `<a download>` 를 받지 못한다 |
| `amgijwiHaptic` | `HapticBridge.swift` | 진동. 웹이 `light` · `soft` · `selection` · `success` · `warning` · `error` 중 하나를 넘긴다 |

### 웹 페이지처럼 보이는 순간을 막는다

확대 · 출렁임 · 뒤로 쓸기 · 링크 미리보기(`allowsLinkPreview`)를 끄고,
도트 화면에서는 길게 눌러도 글자 선택 · "복사" 메뉴가 뜨지 않게 한다(입력칸은 예외).
런치 화면과 창 바탕은 크림색(`LaunchBackground`)이라 첫 화면 전 흰 화면이 번쩍이지 않는다.

## 빌드

`.xcodeproj` 는 저장소에 없다. `project.yml` 에서 만들어 쓴다.
맥 없이 이 파일만 고쳐도 프로젝트를 바꿀 수 있고, 병합 충돌이 사람이 읽을 수 있는 모양으로 난다.

Xcode 는 App Store 에서 받는다. `xcodebuild` 가 안 잡히면 한 번만 가리켜 준다.

```sh
sudo xcode-select -s /Applications/Xcode.app
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

## 서명과 테스트플라이트

맥에서 Xcode 로 직접 서명해 올린다.

1. 애플 개발자 프로그램 등록 (연 $99). 승인에 며칠 걸리기도 한다
2. Xcode 에 애플 계정을 넣어 팀을 만든다
3. `project.yml` 의 `settings.base` 에 `DEVELOPMENT_TEAM` 을 넣는다 (넣어 두었다: 개인 팀 `KC5GYLLW34`)
   - 새 계정은 "Your team has no devices …" 가 뜬다. 자동 서명이 개발용 프로파일도 만들려는데
     등록된 아이폰이 없어서다. 아이폰을 케이블로 한 번 연결해 실행 기기로 고르면 등록된다
4. `xcodegen generate && open Amgijwi.xcodeproj`
5. Xcode 에서 Archive → Distribute App → App Store Connect
6. App Store Connect 에서 테스트플라이트 테스터를 부른다

Xcode 를 열지 않고 터미널로 올릴 수도 있다. 지금은 이렇게 올린다.

```sh
cd ios
xcodegen generate
xcodebuild archive -project Amgijwi.xcodeproj -scheme Amgijwi -configuration Release \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates \
  -archivePath ~/Library/Developer/Xcode/Archives/$(date +%Y-%m-%d)/Amgijwi-1.0-<빌드번호>.xcarchive
xcodebuild -exportArchive -allowProvisioningUpdates -exportOptionsPlist ExportOptions.plist \
  -archivePath ~/Library/Developer/Xcode/Archives/$(date +%Y-%m-%d)/Amgijwi-1.0-<빌드번호>.xcarchive \
  -exportPath /tmp/amgijwi-export
```

`ExportOptions.plist` 는 "App Store Connect 로 바로 올린다" 는 설정이다. 비밀 값은 없다.
`Upload succeeded` 가 나오면 애플 처리에 10~30분 걸린 뒤 App Store Connect 에 빌드가 보인다.
외부 테스터는 첫 빌드만 심사를 받고, 같은 버전(1.0)에 빌드 번호만 올린 다음 빌드들은 대개 바로 나간다.

폰에 바로 깔아 볼 때는 케이블이나 같은 와이파이로 연결한 뒤

```sh
xcrun devicectl list devices                      # 기기 id 확인
xcodebuild build -project Amgijwi.xcodeproj -scheme Amgijwi -destination id=<기기 id> \
  -derivedDataPath /tmp/amgijwi-dd -allowProvisioningUpdates
xcrun devicectl device install app --device <기기 id> /tmp/amgijwi-dd/Build/Products/Debug-iphoneos/Amgijwi.app
```

올릴 때마다 `project.yml` 의 `CURRENT_PROJECT_VERSION` 을 올려야 한다.
같은 빌드 번호는 App Store Connect 가 두 번 받지 않는다.

**인증서를 저장소 시크릿에 넣지 않는다.** 지금 이 저장소는 시크릿이 0개고(AWS 도 OIDC 로 받는다)
그 상태를 깨지 않는 편이 낫다. CI 에서 서명까지 하고 싶어지면 그때 다시 생각한다.
`.github/workflows/ios.yml` 은 `CODE_SIGNING_ALLOWED=NO` 로 빌드만 확인하므로 그대로 둔다.

## 아직 안 한 것
- **네이티브 쪽 복사본.** iOS 가 오래 안 쓴 앱의 웹 저장소를 정리할 가능성이 있다.
  레시피를 앱의 저장 공간에도 같이 복사해 두면 그런 경우에도 복구된다.
  웹뷰와 앱 사이에 다리를 놓아야 하므로 `www/` 코드도 조금 손댄다.
- **데이터 이사 안내.** 사파리의 `amgijwi.com` 저장소와 앱 웹뷰의 저장소는 전혀 다른 공간이다.
  앱을 깔아도 기존 레시피가 따라오지 않는다. 지금은 사용자가 적어 앱에 안내 화면을 만들지 않고
  말로 전한다. 옮기는 건 이미 있는 백업 내보내기·복원으로 된다. 사용자가 늘면 그때 다시 본다.
- **WeatherKit 연결.** 웹 쪽 `window.__amgijwiWeather` 자리는 이미 만들어져 있다.
  값을 넣어 주는 네이티브 코드만 붙이면 된다. 위치 권한 · 애플 날씨 표기가 따라온다.

서명 · 테스트플라이트 배포, 일정 알림, 햅틱은 끝났다.
