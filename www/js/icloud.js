/* ---------- iCloud 자동 백업 (1.4 · 앱 전용) ----------
   백업 파일(backupJSON)과 같은 내용을 사용자 본인의 iCloud 에 둔다. 앱(ios/Sources/CloudBridge.swift)이 압축해서
   iCloud 키-값 저장소에 넣고, 같은 Apple 계정의 새 기기 · 다시 깐 앱에서 꺼내 준다. 웹 화면은 여전히 통신하지 않는다.
   - 켜져 있으면(처음 값 켜짐) 앱을 내릴 때 바뀐 게 있으면 저장하고, 하루가 지났으면 켤 때도 저장한다.
   - 새로 깐 것처럼 비어 있는데(예시만 있음) iCloud 에 백업이 있으면 한 번 되살릴지 묻는다.
   - 켰는지(data.cloud.on)는 이 기기 것이라 백업을 되살려도 바뀌지 않는다(settings.js 의 applyBackup).

   웹 → 앱: amgijwiCloud.postMessage({op:"status"} | {op:"save", json, drinks, mastered} | {op:"peek"} | {op:"load"})
   앱 → 웹: cloudStatusFromApp({account, at}) · cloudSavedFromApp(ok, why, at) · cloudFoundFromApp(meta|null) · cloudLoadedFromApp(json) */
const CLOUD_GAP_MS = 24 * 60 * 60 * 1000, CLOUD_MIN_MS = 10 * 60 * 1000;
const cloud = {account: null, at: "", busy: false, sig: "", asked: false, saveT: null};
function cloudBridge(){
  const w = window.webkit;
  if(!isDot() || !isNativeApp() || !w || !w.messageHandlers || !w.messageHandlers.amgijwiCloud) return null;
  return w.messageHandlers.amgijwiCloud;
}
function cloudState(){
  if(!data.cloud || typeof data.cloud !== "object") data.cloud = {};
  const c = data.cloud;
  c.on = c.on !== false;                                        // 처음 값은 켜짐
  c.at = typeof c.at === "string" ? c.at : "";                  // 마지막으로 iCloud 에 저장한 때(ISO)
  c.skip = typeof c.skip === "string" ? c.skip : "";            // "새로 시작"을 고른 백업(그 백업은 다시 묻지 않는다)
  return c;
}
/* 바뀐 게 있는지 보는 지문. 백업 시각 같은 기록은 빼고 본다(저장할 때마다 바뀌어 끝없이 저장하지 않게) */
function cloudSig(){
  const copy = {};
  Object.keys(data).forEach(k=>{ if(["pin", "cloud", "backup", "backupSnooze", "studied", "review"].indexOf(k) < 0) copy[k] = data[k]; });
  const s = JSON.stringify(copy);
  let h = 0;
  for(let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return s.length + ":" + h;
}
/* 저장. force 면(지금 백업하기) 바뀐 게 없어도, 마지막 저장 직후여도 저장한다 */
function cloudSave(force){
  const b = cloudBridge(), c = cloudState();
  if(!b || !c.on || cloud.busy || cloud.account === false) return false;
  const sig = cloudSig(), last = c.at ? Date.parse(c.at) : 0, now = Date.now();
  if(!force && sig === cloud.sig) return false;
  if(!force && last && now - last < CLOUD_MIN_MS) return false;
  cloud.busy = true; cloud.pending = sig;
  b.postMessage({op: "save", json: backupJSON(), drinks: liveDrinks().length, mastered: data.mastered.length});
  renderCloud();
  return true;
}
function cloudSavedFromApp(ok, why, at){
  cloud.busy = false;
  const c = cloudState();
  if(ok){
    c.at = String(at || new Date().toISOString());
    cloud.sig = cloud.pending || cloudSig();
    data.backup = {at: ymd(new Date()), count: liveDrinks().length};      // 파일 백업처럼 "백업해 두었다"로 친다(백업 권유 · 오래된 백업 알림)
    persist();
    if(cloud.manual) toast("iCloud에 백업했어요");
  } else if(cloud.manual){
    toast(why === "noaccount" ? "iCloud에 로그인되어 있지 않아요" : why === "toobig" ? "데이터가 너무 커서 iCloud에 담지 못했어요. 파일로 내보내 주세요" : "iCloud에 백업하지 못했어요");
  }
  if(why === "noaccount") cloud.account = false;
  cloud.manual = false;
  renderCloud(); renderStorageCard(); renderBackupBanner(); renderSetGroups();
}
function cloudStatusFromApp(s){
  s = s || {};
  cloud.account = !!s.account;
  if(typeof s.at === "string" && s.at && (!cloudState().at || s.at > cloudState().at)) cloudState().at = s.at;
  renderCloud();
  /* 하루가 지났으면 켤 때도 저장한다(앱을 내리지 않고 오래 켜 두는 사람) */
  const c = cloudState();
  if(c.on && cloud.account && (!c.at || Date.now() - Date.parse(c.at) > CLOUD_GAP_MS)) cloudSave(false);
}
/* 새로 깐 것처럼 보이는가: 레시피가 없거나 손대지 않은 예시뿐이고, 일정 · 메모도 없다 */
function cloudLooksFresh(){
  return (freshData || data.drinks.every(d=>d.sample)) && !data.events.length && !data.memos.length;
}
/* iCloud 에 백업이 있다는 소식(켤 때 물어본 답이거나, 늦게 내려받아진 것) */
function cloudFoundFromApp(meta){
  if(!meta || !meta.at || cloud.asked) return;
  const c = cloudState();
  if(c.skip === meta.at || !cloudLooksFresh() || Number(meta.drinks) < 1) return;
  cloud.found = meta;
  cloudAsk();
}
/* 잠금 · 처음 가이드 · 이름 묻는 창 · 다른 창이 없을 때 묻는다(그것이 끝나면 다시 불린다 — shell.js 의 go · afterDlg) */
function cloudAsk(){
  const meta = cloud.found;
  if(!meta || cloud.asked) return;
  const lockEl = $("#lock"), guide = $("#onboard");
  if((lockEl && lockEl.classList.contains("on")) || nickAskOpen() || (guide && !guide.hidden)) return;
  if($("#sheet").classList.contains("on") || $("#dlg").classList.contains("on")) return;
  cloud.asked = true;
  const d = new Date(meta.at);
  const when = isNaN(d) ? "" : `${d.getMonth() + 1}월 ${d.getDate()}일 ${alarmClock(d)} 백업 · `;
  confirmBox("iCloud에 백업이 있어요", `${when}레시피 ${meta.drinks}개 · 외운 것 ${Number(meta.mastered) || 0}개. 되살리면 지금 있는 예시 레시피는 바뀌어요.`, "되살리기", ()=>{
    const b = cloudBridge(); if(b) b.postMessage({op: "load"});
  }, {no: "새로 시작", haptic: "light", go: true});
  /* "새로 시작"이면 이 백업은 다시 묻지 않는다 */
  $("#dlgNo").addEventListener("click", ()=>{ cloudState().skip = meta.at; persist(); }, {once: true});
}
function cloudLoadedFromApp(json){
  if(!json){ toast("iCloud 백업을 불러오지 못했어요"); return; }
  applyBackup(String(json), true);
  cloud.sig = cloudSig();
}
/* 지금 iCloud 에 백업되고 있으면 "오늘 오후 3:12" 같은 마지막 백업 때, 아니면 null (settings.js 의 데이터 상태) */
function cloudActive(){
  const c = cloudState();
  if(!cloudBridge() || !c.on || cloud.account === false || !c.at) return null;
  const d = new Date(c.at), gap = dayGap(ymd(d), ymd(new Date()));
  return (gap === 0 ? "오늘" : gap === 1 ? "어제" : gap + "일 전") + " " + alarmClock(d);
}
/* 설정 카드 */
function renderCloud(){
  const card = $("#cloudCard");
  if(!card) return;
  card.style.display = cloudBridge() ? "" : "none";
  const c = cloudState();
  document.querySelectorAll("#cloudBtns .theme-b").forEach(b=>b.classList.toggle("on", (b.dataset.cloud === "on") === c.on));
  const st = $("#cloudState"), now = $("#cloudNow");
  let msg;
  if(cloud.account === false) msg = "iPhone 설정에서 iCloud에 로그인하면 쓸 수 있어요.";
  else if(!c.on) msg = "꺼져 있어요. 백업은 파일로 직접 내보내 주세요.";
  else if(cloud.busy) msg = "iCloud에 저장하는 중…";
  else if(c.at) msg = "마지막 백업: " + cloudActive();
  else msg = "아직 iCloud에 백업한 적이 없어요.";
  if(st) st.textContent = msg;
  if(now) now.disabled = !c.on || cloud.busy || cloud.account === false;
}
document.querySelectorAll("#cloudBtns .theme-b").forEach(b=>b.addEventListener("click", ()=>{
  const c = cloudState(), on = b.dataset.cloud === "on";
  if(c.on === on) return;
  c.on = on; persist(); haptic("selection");
  if(on) cloudSave(true);
  renderCloud();
}));
if($("#cloudNow")) $("#cloudNow").addEventListener("click", ()=>{ cloud.manual = true; if(!cloudSave(true)) cloud.manual = false; });
/* 앱을 내릴 때 바뀐 게 있으면 저장한다 */
document.addEventListener("visibilitychange", ()=>{ if(document.hidden) cloudSave(false); });
/* 켤 때: 상태를 묻고, 새로 깐 것 같으면 iCloud 에 백업이 있는지 본다 */
(function(){
  const b = cloudBridge();
  if(!b) return;
  cloudState();
  cloud.sig = cloudState().at ? cloudSig() : "";              // 이미 저장한 적 있으면 지금 모양을 기준으로(켜자마자 또 저장하지 않게)
  b.postMessage({op: "status"});
  if(cloudLooksFresh()) b.postMessage({op: "peek"});
})();
