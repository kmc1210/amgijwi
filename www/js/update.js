/* ---------- 새 버전 알림 ----------
   앱(ios/Sources/UpdateBridge.swift)이 하루 한 번 앱스토어에 지금 나와 있는 버전을 물어,
   이 앱보다 새것이면 updateFromApp("1.4") 로 알린다. 웹 화면은 통신하지 않는다(CSP connect-src 'none' 그대로).
   홈에서 하던 일이 없을 때 한 번 묻는다. 어느 쪽을 누르든 그 버전은 다시 묻지 않고, 다음 버전이 나오면 또 묻는다.
   "업데이트"를 누르면 앱이 앱스토어 페이지를 앱 안에 띄운다. 기록은 이 기기에만 둔다(백업 파일에 싣지 않는다).
   묻기 전에 앱을 껐거나 iOS 가 화면을 내려도 잃지 않게, 기다리는 버전도 적어 두었다가 다음에 켤 때 묻는다 */
const UPDATE_KEY = "amgijwi-update-asked", UPDATE_WAIT_KEY = "amgijwi-update-waiting";
let updatePending = null;
function updateBridge(){
  const w = window.webkit;
  if(!isDot() || !isNativeApp() || !w || !w.messageHandlers || !w.messageHandlers.amgijwiUpdate) return null;
  return w.messageHandlers.amgijwiUpdate;
}
function updateGet(k){ try{ return localStorage.getItem(k) || ""; }catch(e){ return ""; } }
function updateSet(k, v){ try{ if(v) localStorage.setItem(k, v); else localStorage.removeItem(k); }catch(e){} }
function updateAsked(){ return updateGet(UPDATE_KEY); }
/* 앱 버전(__amgijwiInfo.app = "1.3 (19)")보다 새것인가. "1.10" 은 "1.9" 보다 새것이고, 자리가 모자라면 0 으로 본다(Swift 의 newer 와 같다) */
function updateNewer(a, b){
  const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number);
  for(let i = 0; i < Math.max(x.length, y.length); i++){
    const p = x[i] || 0, q = y[i] || 0;
    if(p !== q) return p > q;
  }
  return false;
}
function updateMine(){ return String((window.__amgijwiInfo || {}).app || "0").split(" ")[0]; }
/* 받을 만한 버전인가: 숫자와 점으로만 된 16자 이하(Swift 와 같은 기준) · 아직 묻지 않았고 · 이 앱보다 새것 */
function updateWanted(ver){
  return /^\d+(\.\d+)*$/.test(ver) && ver.length <= 16 && ver !== updateAsked() && updateNewer(ver, updateMine());
}
function updateFromApp(ver){
  ver = String(ver || "");
  if(!updateBridge() || !updateWanted(ver)) return;
  updatePending = ver; updateSet(UPDATE_WAIT_KEY, ver);
  updateGo();
}
/* 홈을 보고 있고, 잠금 · 이름 묻는 창 · 처음 가이드 · 시트 · 확인창이 없고, 받은 레시피 파일이 먼저 기다리고 있지 않을 때.
   아니면 기다렸다가 그것이 끝난 뒤(closeLock · closeNickAsk · closeGuide · 확인창을 닫을 때 · 화면을 옮길 때 shell.js 의 go)에 묻는다 */
function updateGo(){
  const ver = updatePending;
  if(!ver || document.hidden || !$("#s-home").classList.contains("active")) return;
  const lockEl = $("#lock"), guide = $("#onboard");
  if((lockEl && lockEl.classList.contains("on")) || nickAskOpen() || (guide && !guide.hidden)) return;
  if($("#sheet").classList.contains("on") || $("#dlg").classList.contains("on") || recipePendingText !== null) return;
  updatePending = null;
  updateSet(UPDATE_KEY, ver); updateSet(UPDATE_WAIT_KEY, "");
  confirmBox("새 버전이 나왔어요", `암기쥐 ${ver} 버전이 나왔어요. 앱스토어에서 업데이트하고 새 기능을 만나 보세요.`, "업데이트", ()=>{
    const b = updateBridge();
    if(b) b.postMessage("open");
  }, {no: "나중에", haptic: "light", go: true});
}
/* 지난번에 묻지 못한 버전이 있으면 이번에 켤 때 묻는다(그사이 업데이트했으면 버린다) */
(function(){
  const w = updateGet(UPDATE_WAIT_KEY);
  if(!w) return;
  if(updateBridge() && updateWanted(w)){ updatePending = w; setTimeout(updateGo, 0); }
  else if(updateBridge()) updateSet(UPDATE_WAIT_KEY, "");
})();
/* 앱을 다시 앞으로 꺼냈을 때 홈이면 기다리던 소식을 묻는다 */
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) updateGo(); });
