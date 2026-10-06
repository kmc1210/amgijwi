# 배포

amgijwi.com 을 S3 · CloudFront 에 올리는 방법입니다. iOS 앱 빌드와 TestFlight 업로드는 [ios/README.md](../ios/README.md) 에 있습니다.

> 웹 앱은 2026년 10월에 닫았습니다. 사이트에는 아래만 올립니다(`deploy.yml` 의 "올릴 파일 모으기").
> - `site/index.html` · `site/rescue.js` — 안내 첫 화면, 그 브라우저에 남은 예전 레시피를 백업 파일로 꺼내기
> - `www/privacy.html` · `www/support.html` — App Store Connect 에 적은 처리방침 · 지원 URL. **내리면 안 됩니다**
> - `www/apple-touch-icon.png` · `www/fonts/` — 첫 화면 아이콘과 글꼴
>
> `--delete` 로 올리므로 예전 웹 앱 파일은 버킷에서 지워지고, 배포 확인 단계가 남아 있지 않은지 봅니다.

## 올리기

```
GitHub Actions → Deploy → Run workflow
```

위 파일을 `dist/` 에 모아 S3 에 올리고 CloudFront 캐시를 비운 뒤, 배포된 파일이 저장소와 같은지 ·
예전 웹 앱 파일이 지워졌는지 · 보안 헤더를 확인합니다(`.github/workflows/deploy.yml`).
저장소 변수 `AUTO_DEPLOY` 가 `true` 면 `site/` · 처리방침 · 도움말이 바뀌어 main 에 머지될 때 자동으로 배포합니다.

AWS 키는 저장소에 없고 OIDC 로 IAM 역할을 받습니다. 역할은 main 브랜치만 허용합니다.

## IAM 역할 신뢰 정책의 sub

저장소 이름이 아니라 아래 형식입니다.

```
repo:kmc1210@57215151/amgijwi@1313381059:ref:refs/heads/main
```

계정 id 와 저장소 id 가 붙는 형식(immutable subject)이라 **이름만 적으면 인증이 거절됩니다.**
실제 값은 아래로 확인합니다.

```
gh api repos/kmc1210/amgijwi/actions/oidc/customization/sub
```

## 배포 뒤 확인

```
npm run test:headers
```

배포된 사이트의 보안 헤더와, 헤더 CSP 가 meta CSP 와 같은지 확인합니다.
네트워크가 필요하고 **배포가 끝난 뒤에** 돌립니다.
