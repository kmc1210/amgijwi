/* 암기쥐 — 토스트 · 확인 모달 · 화면 전환. 모든 화면이 공통으로 쓴다 */

/* ---------- 토스트 / 확인 모달 ---------- */
let toastT;
function toast(msg){
  const t = $("#toast"); t.textContent = msg; t.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(()=>t.classList.remove("on"), 2200);
}
let onYes = null, onNo = null;
/* opts.no: 취소 버튼 글(새 버전 알림은 "나중에" — update.js) · opts.haptic: 되돌릴 일이 아닌 창은 가볍게
   opts.onNo: 취소 쪽을 눌렀을 때 할 일(iCloud "새로 시작" — icloud.js)
   opts.go: 지우기가 아니라 권하는 일이면 빨간 버튼 대신 주 버튼 색으로 */
function confirmBox(title, msg, yesLabel, cb, opts){
  opts = opts || {};
  $("#dlgT").textContent = title; $("#dlgM").textContent = msg;
  $("#dlgYes").textContent = yesLabel || "확인"; $("#dlgNo").textContent = opts.no || "취소";
  onYes = cb; onNo = opts.onNo || null; $("#dlg").classList.toggle("go", !!opts.go); $("#dlg").classList.add("on");
  haptic(opts.haptic || "warning");     // 지우기 · 덮어쓰기처럼 되돌릴 수 없는 일 앞에서 멈칫
}
/* 지금 사용자에게 끼어들어도 되는가: 앱이 앞에 있고 · (needHome 이면 홈을 보고 있고) · 잠금 · 이름 묻는 창 · 처음 가이드 ·
   시트 · 확인창 · 받은 레시피 파일이 없다. 새 버전 알림(update.js) · iCloud 질문(icloud.js)이 같이 쓴다 */
function canInterrupt(needHome){
  if(document.hidden || (needHome && !$("#s-home").classList.contains("active"))) return false;
  const lockEl = $("#lock"), guide = $("#onboard");
  if((lockEl && lockEl.classList.contains("on")) || nickAskOpen() || (guide && !guide.hidden)) return false;
  return !$("#sheet").classList.contains("on") && !$("#dlg").classList.contains("on") && recipePendingText === null;
}
/* 확인창을 방금 닫았는가 — 묻는 창을 연달아 띄우지 않으려고(iCloud 켤지 묻기는 다음 기회로 미룬다) */
let dlgClosedAt = 0;
function justClosedDlg(){ return Date.now() - dlgClosedAt < 1500; }
/* 확인창 뒤에서 기다리던 받은 레시피 파일 · 새 버전 소식이 있으면 창을 닫은 뒤에 연다 (recipeshare.js · update.js) */
function afterDlg(){ setTimeout(()=>{ cloudAsk(); recipeGo(); updateGo(); }, 0); }
$("#dlgNo").addEventListener("click", ()=>{ $("#dlg").classList.remove("on"); dlgClosedAt = Date.now(); onYes=null; const g=onNo; onNo=null; if(g) g(); afterDlg(); });
$("#dlgYes").addEventListener("click", ()=>{ $("#dlg").classList.remove("on"); dlgClosedAt = Date.now(); onNo=null; if(onYes){ const f=onYes; onYes=null; f(); } afterDlg(); });

/* ---------- 화면 전환 ---------- */
function go(name){
  /* 다른 탭에서 설정으로 오면 묶음 첫 화면부터. 설정에서 연 옷장 · 가져오기에서 돌아올 때는 보던 묶음 그대로 (settings.js) */
  if(name === "set" && !["s-set", "s-closet", "s-import"].some(id=>$("#" + id).classList.contains("active"))) state.setGroup = "";
  if(!$("#s-"+name).classList.contains("active")) adLeave();     // 광고를 불러오는 중에 다른 화면으로 가면 부탁을 거둔다 (ads.js)
  setTimeout(recipeGo, 0);      // 하던 일이 끝나 기다리던 레시피 파일이 있으면 이제 연다 (recipeshare.js)
  setTimeout(cloudAsk, 0);      // iCloud 백업을 되살릴지 묻기를 기다리고 있으면 이제 묻는다 (icloud.js)
  setTimeout(updateGo, 0);      // 홈으로 돌아왔고 새 버전 소식이 기다리고 있으면 이제 묻는다 (update.js)
  setTimeout(themeFxSync, 0);   // 홈이면 테마 움직임을 켜고, 아니면 멈춘다 (themefx.js)
  if(name !== "result"){ stopEat(); stopCaw(); }
  if(name !== "home"){ stopSip(); stopPanic(); }
  if(name !== "list" && state.selMode) exitSel();
  document.querySelectorAll(".screen").forEach(el=>el.classList.remove("active"));
  $("#s-"+name).classList.add("active");
  const showTabs = ["home","list","cal","set"].indexOf(name)>=0;
  $("#tabs").classList.toggle("hide", !showTabs);
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("on", t.dataset.go===name));
  if(name==="home") renderHome();
  if(name==="list") renderList();
  if(name==="arch") renderArch();
  if(name==="cal") renderCal();
  if(name==="set") renderSettings();
  if(name==="closet") renderCloset();
}
document.querySelectorAll(".tab").forEach(t=>{
  t.addEventListener("click", ()=>{
    if(!t.classList.contains("on")) haptic("selection");     // 다른 탭으로 갈 때만 딸깍
    t.dataset.go==="study" ? openModeSheet() : go(t.dataset.go);
  });
});

