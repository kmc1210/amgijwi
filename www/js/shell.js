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
}
$("#dlgNo").addEventListener("click", ()=>{ $("#dlg").classList.remove("on"); onYes=null; });
$("#dlgYes").addEventListener("click", ()=>{ $("#dlg").classList.remove("on"); if(onYes){ const f=onYes; onYes=null; f(); } });

/* ---------- 화면 전환 ---------- */
function go(name){
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
}
document.querySelectorAll(".tab").forEach(t=>{
  t.addEventListener("click", ()=>{ t.dataset.go==="study" ? openModeSheet() : go(t.dataset.go); });
});

