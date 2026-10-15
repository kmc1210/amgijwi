/* 암기쥐 — 토스트 · 확인 모달 · 화면 전환. 모든 화면이 공통으로 쓴다 */

/* ---------- 토스트 / 확인 모달 ---------- */
let toastT;
function toast(msg){
  const t = $("#toast"); t.textContent = msg; t.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(()=>t.classList.remove("on"), 2200);
}
let onYes = null;
function confirmBox(title, msg, yesLabel, cb){
  $("#dlgT").textContent = title; $("#dlgM").textContent = msg;
  $("#dlgYes").textContent = yesLabel || "확인"; onYes = cb; $("#dlg").classList.add("on");
  haptic("warning");            // 지우기 · 덮어쓰기처럼 되돌릴 수 없는 일 앞에서 멈칫
}
$("#dlgNo").addEventListener("click", ()=>{ $("#dlg").classList.remove("on"); onYes=null; });
$("#dlgYes").addEventListener("click", ()=>{ $("#dlg").classList.remove("on"); if(onYes){ const f=onYes; onYes=null; f(); } });

/* ---------- 화면 전환 ---------- */
function go(name){
  /* 다른 탭에서 설정으로 오면 묶음 첫 화면부터. 설정에서 연 옷장 · 가져오기에서 돌아올 때는 보던 묶음 그대로 (settings.js) */
  if(name === "set" && !["s-set", "s-closet", "s-import"].some(id=>$("#" + id).classList.contains("active"))) state.setGroup = "";
  if(!$("#s-"+name).classList.contains("active")) adLeave();     // 광고를 불러오는 중에 다른 화면으로 가면 부탁을 거둔다 (ads.js)
  setTimeout(recipeGo, 0);      // 하던 일이 끝나 기다리던 레시피 파일이 있으면 이제 연다 (recipeshare.js)
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

