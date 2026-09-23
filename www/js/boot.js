/* 암기쥐 — 저장 안정성 확인 · 기기별 안내 문구 · 앱 시작
   맨 마지막에 로드한다. 여기서 처음 화면을 그린다 */

/* ---------- 저장 안정성 ----------
   홈 화면에서 실행 중인지, 브라우저가 저장 데이터를 보호해 주는지.
   둘 다 "레시피가 사라지지 않는가"에 직접 영향을 준다. */
function isStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches
      || window.navigator.standalone === true
      /* iOS 앱의 웹뷰에서는 둘 다 잡히지 않는다 */
      || isNativeApp();
}

/* ---------- 기기별 안내 ----------
   홈 화면에 넣는 방법, 사진 글자를 복사하는 방법, 백업 파일을 둘 곳은 기기마다 다르다.
   하나로 뭉뚱그리면 "브라우저 메뉴에서" 같은 말이 되어 정작 버튼을 못 찾는다.
   판별 결과는 안내 문구에만 쓰고 기능을 막거나 바꾸는 데는 쓰지 않는다. */
function deviceOS(){
  const ua = navigator.userAgent || "";
  /* iPadOS 는 기본값이 데스크톱 사이트라 맥으로 자신을 소개한다. 맥에는 터치스크린이 없으니 터치가 되면 아이패드다 */
  if(/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 0)) return "ios";
  if(/Android/.test(ua)) return /SamsungBrowser/.test(ua) ? "samsung" : "android";
  return "desktop";
}
/* why: 탭으로 쓰면 왜 위험한가. 사파리는 한동안 안 열면 지우고,
   크롬 계열은 저장 공간이 모자랄 때 보호받지 못한 사이트부터 지운다. 이유가 달라 따로 적는다. */
const INSTALL = {
  ios: {
    why:   "브라우저 탭으로만 쓰면 한동안 안 열었을 때 레시피가 지워질 수 있어요.",
    how:   "<b>공유</b> 버튼을 누르고 <b>홈 화면에 추가</b>를 고르면 됩니다.",
    short: "공유 버튼 → 홈 화면에 추가 로 넣어두면 데이터가 훨씬 안전해집니다.",
    keep:  "백업 파일은 파일 앱의 iCloud Drive에 두면 기기를 바꿔도 남습니다."
  },
  android: {
    why:   "브라우저 탭으로만 쓰면 저장 공간이 모자랄 때 레시피가 먼저 지워질 수 있어요.",
    how:   "오른쪽 위 <b>⋮</b> 메뉴에서 <b>홈 화면에 추가</b>(또는 <b>앱 설치</b>)를 고르면 됩니다.",
    short: "⋮ 메뉴 → 홈 화면에 추가 로 넣어두면 데이터가 더 안전해집니다.",
    keep:  "백업 파일은 Google Drive 같은 클라우드에 올려두면 기기를 바꿔도 남습니다."
  },
  samsung: {
    why:   "브라우저 탭으로만 쓰면 저장 공간이 모자랄 때 레시피가 먼저 지워질 수 있어요.",
    how:   "<b>☰</b> 메뉴에서 <b>페이지 추가 → 홈 화면</b>을 고르면 됩니다.",
    short: "☰ 메뉴 → 페이지 추가 → 홈 화면 으로 넣어두면 데이터가 더 안전해집니다.",
    keep:  "백업 파일은 Google Drive 같은 클라우드에 올려두면 기기를 바꿔도 남습니다."
  },
  desktop: {
    keep:  "백업 파일은 클라우드 드라이브나 다른 기기에도 복사해 두면 기기를 바꿔도 남습니다."
  }
};
/* 마크업의 data-os="ios" · "android samsung" · "desktop" 는 해당 기기에서만 보인다 */
function applyDeviceText(){
  const os = deviceOS();
  document.querySelectorAll("[data-os]").forEach(el=>{
    el.style.display = el.getAttribute("data-os").split(" ").indexOf(os) >= 0 ? "" : "none";
  });
}
/* 마크업의 data-env="web" · "app" 는 해당 환경에서만 보인다.
   같은 사실을 두 가지 말로 적어두고 맞는 쪽만 남긴다 */
function applyEnvText(){
  const env = isNativeApp() ? "app" : "web";
  document.querySelectorAll("[data-env]").forEach(el=>{
    el.style.display = el.getAttribute("data-env") === env ? "" : "none";
  });
}

let persistState = "unknown";           // unknown · granted · denied · unsupported
function checkPersist(){
  if(!navigator.storage || !navigator.storage.persist){
    persistState = "unsupported";
    return;
  }
  /* 이미 보호 중이면 다시 요청하지 않는다 */
  navigator.storage.persisted().then(already=>{
    if(already){ persistState = "granted"; renderStorageCard(); return; }
    return navigator.storage.persist().then(ok=>{
      persistState = ok ? "granted" : "denied";
      renderStorageCard();
    });
  }).catch(()=>{ persistState = "unknown"; });
}

applyTheme();
applyDeviceText();
applyEnvText();
initVisit();
renderHome();
checkPersist();
/* 옮기는 김에 이름이 겹쳤던 부재료는 나눠 두었다. 조용히 바꾸면 놀라니까 한 번 알려준다 */
if(_lift.split) setTimeout(()=>toast(`배합이 다른 같은 이름 부재료 ${_lift.split}개를 따로 나눴어요`), 900);
if(data.pin) openLock("enter");
