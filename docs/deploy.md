# 배포

웹(`www/`)을 S3 · CloudFront 에 올리는 방법입니다. iOS 앱 빌드와 TestFlight 업로드는 [ios/README.md](../ios/README.md) 에 있습니다.

> 웹(amgijwi.com)은 앱이 자리를 잡으면 내릴 예정입니다. 그때도 **`privacy.html` 은 남겨야 합니다**
> (App Store Connect 에 적은 개인정보 처리방침 주소). 웹을 내릴 때 이 문서를 "처리방침만 올리는 배포" 로 고칩니다.

## 올리기

```
GitHub Actions → Deploy → Run workflow
```

`www/` 를 S3 에 올리고 CloudFront 캐시를 비운 뒤, 배포된 파일이 저장소와 같은지와
보안 헤더를 확인합니다(`.github/workflows/deploy.yml`).
저장소 변수 `AUTO_DEPLOY` 가 `true` 면 `www/` 변경이 main 에 머지될 때 자동으로 배포합니다.

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
