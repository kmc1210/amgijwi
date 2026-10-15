/* ---------- 새 버전 알림 ----------
   앱(ios/Sources/UpdateBridge.swift)이 하루 한 번 앱스토어에 지금 나와 있는 버전을 물어,
   이 앱보다 새것이면 updateFromApp("1.4") 로 알린다. 웹 화면은 통신하지 않는다(CSP connect-src 'none' 그대로).
   홈에서 하던 일이 없을 때 한 번 묻는다. 어느 쪽을 누르든 그 버전은 다시 묻지 않고, 다음 버전이 나오면 또 묻는다.
   "업데이트"를 누르면 앱이 앱스토어 페이지를 앱 안에 띄운다. 물은 버전은 이 기기에만 적는다(백업 파일에 싣지 않는다) */
const UPDATE_KEY = "amgijwi-update-asked";
let updatePending = null;
function updateBridge(){
  const w = window.webkit;
  if(!isDot() || !isNativeApp() || !w || !w.messageHandlers || !w.messageHandlers.amgijwiUpdate) return null;
  return w.messageHandlers.amgijwiUpdate;
}
function updateAsked(){ try{ return localStorage.getItem(UPDATE_KEY) || ""; }catch(e){ return ""; } }
function updateFromApp(ver){
  ver = String(ver || "");
  if(!updateBridge() || !/^\d{1,3}(\.\d{1,3}){0,3}$/.test(ver) || ver === updateAsked()) return;
  updatePending = ver;
  updateGo();
}
/* 홈을 보고 있고, 잠금 · 이름 묻는 창 · 처음 가이드 · 시트 · 확인창이 없고, 받은 레시피 파일이 먼저 기다리고 있지 않을 때.
   아니면 기다렸다가 그것이 끝난 뒤(closeLock · closeNickAsk · closeGuide · 화면을 옮길 때 shell.js 의 go)에 묻는다 */
function updateGo(){
  const ver = updatePending;
  if(!ver || document.hidden || !$("#s-home").classList.contains("active")) return;
  const lockEl = $("#lock"), guide = $("#onboard");
  if((lockEl && lockEl.classList.contains("on")) || nickAskOpen() || (guide && !guide.hidden)) return;
  if($("#sheet").classList.contains("on") || $("#dlg").classList.contains("on") || recipePendingText !== null) return;
  updatePending = null;
  try{ localStorage.setItem(UPDATE_KEY, ver); }catch(e){}
  confirmBox("새 버전이 나왔어요", `암기쥐 ${ver} 버전이 나왔어요. 앱스토어에서 업데이트하고 새 기능을 만나 보세요.`, "업데이트", ()=>{
    const b = updateBridge();
    if(b) b.postMessage("open");
  }, {no: "나중에", haptic: "light", go: true});
}
/* 앱을 다시 앞으로 꺼냈을 때 홈이면 기다리던 소식을 묻는다 */
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) updateGo(); });
