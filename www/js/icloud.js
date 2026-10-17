/* ---------- iCloud 자동 백업 (1.4 · 앱 전용) ----------
   백업 파일(backupJSON)과 같은 내용을 사용자 본인의 iCloud 에 둔다. 앱(ios/Sources/CloudBridge.swift)이 압축해서
   iCloud 키-값 저장소에 하나 넣고, 같은 Apple 계정의 새 기기 · 다시 깐 앱에서 꺼내 준다. 웹 화면은 여전히 통신하지 않는다.
   - 켜져 있으면(처음 값 켜짐) 바뀐 게 있을 때 앱을 내리면 저장한다. 마지막 저장 10분 안이면 미뤘다가 다시 저장한다.
   - 예시만 있는 빈 상태(새로 깐 앱)는 저장하지 않는다 — iCloud 에 있는 진짜 백업을 예시로 덮지 않게.
   - 다른 기기가 올린 더 큰 백업은 저절로 덮지 않는다. "지금 백업하기"로 물어본 뒤에만 바꾼다.
   - 새로 깐 것처럼 비어 있는데 iCloud 에 백업이 있으면 한 번 되살릴지 묻는다.
   - 켰는지(data.cloud.on)는 이 기기 것이라 백업을 되살려도 바뀌지 않는다(settings.js 의 applyBackup).

   웹 → 앱: amgijwiCloud.postMessage({op:"status"} | {op:"save", json, drinks, mastered} | {op:"peek"} | {op:"load"})
   앱 → 웹: cloudStatusFromApp({account, device, meta}) · cloudSavedFromApp(ok, why, at) · cloudFoundFromApp(meta|null) · cloudLoadedFromApp(json) */
const CLOUD_MIN_MS = 10 * 60 * 1000, CLOUD_STALE_DAYS = 14;
const cloud = {account: null, device: "", remote: null, busy: false, asked: false, found: null, retryT: null, manual: false, pending: ""};
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
  c.sig = typeof c.sig === "string" ? c.sig : "";               // 그때 저장한 내용의 지문(바뀐 게 있는지 본다)
  c.err = typeof c.err === "string" ? c.err : "";               // 마지막 저장이 실패한 까닭(toobig · fail · other)
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
/* 아직 아무것도 하지 않은 상태인가: 레시피가 없거나 손대지 않은 예시뿐이고, 일정 · 메모 · 학습 기록 · 치즈가 없다.
   이 상태는 지킬 게 없어서 저장하지 않고, iCloud 백업을 되살려도 잃을 게 없어서 되살릴지 묻는다 */
function cloudLooksFresh(){
  return data.drinks.every(d=>d.sample) && !data.events.length && !data.memos.length
      && !data.mastered.length && !data.needReview.length && !(data.closet && data.closet.cheese > 0);
}
/* 다른 기기가 올린, 이 기기보다 레시피가 많은 백업이 iCloud 에 있는가(저절로 덮지 않는다) */
function cloudBiggerElsewhere(){
  const m = cloud.remote;
  return !!m && !!m.device && !!cloud.device && m.device !== cloud.device && Number(m.drinks) > liveDrinks().length;
}
/* 저장. force 면(지금 백업하기) 바뀐 게 없어도, 마지막 저장 직후여도 저장한다 */
function cloudSave(force){
  const b = cloudBridge(), c = cloudState();
  if(!b || !c.on || cloud.busy || cloud.account === false) return false;
  clearTimeout(cloud.retryT);
  const sig = cloudSig(), last = c.at ? Date.parse(c.at) : 0, now = Date.now();
  if(!force){
    if(sig === c.sig || cloudLooksFresh()) return false;
    if(cloudBiggerElsewhere()){ c.err = "other"; renderCloud(); return false; }
    if(last && now - last < CLOUD_MIN_MS){                        // 방금 저장했으면 미뤘다가 다시(앱이 앞에 있는 동안)
      cloud.retryT = setTimeout(()=>cloudSave(false), CLOUD_MIN_MS - (now - last) + 1000);
      return false;
    }
  }
  cloud.busy = true; cloud.pending = sig;
  b.postMessage({op: "save", json: backupJSON(), drinks: liveDrinks().length, mastered: data.mastered.length});
  renderCloud();
  return true;
}
/* "지금 백업하기": iCloud 의 백업을 이 기기의 빈 데이터나 더 작은 데이터로 바꾸게 되면 먼저 묻는다 */
function cloudSaveNow(){
  const m = cloud.remote;
  const risky = !!m && Number(m.drinks) > 0 && (cloudLooksFresh() || cloudBiggerElsewhere());
  const run = ()=>{ cloud.manual = true; if(!cloudSave(true)) cloud.manual = false; };
  if(!risky){ run(); return; }
  confirmBox("iCloud 백업 바꾸기", `iCloud에 레시피 ${m.drinks}개짜리 백업이 있어요. 이 기기의 레시피 ${liveDrinks().length}개로 바꿀까요? 바꾸면 그 백업은 되살릴 수 없어요.`, "바꾸기", run);
}
function cloudSavedFromApp(ok, why, at){
  cloud.busy = false;
  const c = cloudState();
  if(ok){
    c.at = String(at || new Date().toISOString());
    c.sig = cloud.pending || cloudSig();
    c.err = "";
    cloud.remote = {at: c.at, drinks: liveDrinks().length, mastered: data.mastered.length, device: cloud.device};
    data.backup = {at: ymd(new Date()), count: liveDrinks().length};      // 파일 백업처럼 "백업해 두었다"로 친다(백업 권유 · 오래된 백업 알림)
    persist();
    if(cloud.manual) toast("iCloud에 백업했어요");
  } else {
    if(why === "noaccount") cloud.account = false;
    else c.err = why === "toobig" ? "toobig" : "fail";
    persist();
    if(cloud.manual) toast(why === "noaccount" ? "iCloud에 로그인되어 있지 않아요" : why === "toobig" ? "데이터가 너무 커서 iCloud에 담지 못했어요. 파일로 내보내 주세요" : "iCloud에 백업하지 못했어요");
  }
  cloud.manual = false;
  renderCloud(); renderStorageCard(); renderBackupBanner(); renderSetGroups();
}
/* 켤 때 · 앞으로 꺼낼 때 · iCloud 로그인이 바뀔 때 앱이 알려 준다 */
function cloudStatusFromApp(s){
  s = s || {};
  cloud.account = !!s.account;
  cloud.device = typeof s.device === "string" ? s.device : cloud.device;
  cloud.remote = s.meta && s.meta.at ? s.meta : null;
  renderCloud();
  if(cloud.account) cloudSave(false);                              // 그사이 바뀐 게 있으면(못 하고 꺼졌던 저장 포함) 지금 저장
}
/* iCloud 에 백업이 있다는 소식(켤 때 물어본 답이거나, 늦게 내려받아진 것) */
function cloudFoundFromApp(meta){
  if(meta && meta.at) cloud.remote = meta;
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
  if(!cloudLooksFresh()) return;                                    // 기다리는 사이에 뭔가 넣었으면 묻지 않는다
  cloud.asked = true;
  const d = new Date(meta.at);
  const when = isNaN(d) ? "" : `${d.getMonth() + 1}월 ${d.getDate()}일 ${alarmClock(d)} 백업 · `;
  confirmBox("iCloud에 백업이 있어요", `${when}레시피 ${meta.drinks}개 · 외운 것 ${Number(meta.mastered) || 0}개. 되살리면 지금 있는 예시 레시피 대신 백업한 내용으로 바뀌어요.`, "되살리기", ()=>{
    const b = cloudBridge(); if(b) b.postMessage({op: "load"});
  }, {no: "새로 시작", haptic: "light", go: true, onNo: ()=>{ cloudState().skip = meta.at; persist(); }});
}
function cloudLoadedFromApp(json){
  if(!json){ toast("iCloud 백업을 불러오지 못했어요"); return; }
  applyBackup(String(json), true);
  cloudState().sig = cloudSig();                                    // 방금 받은 것과 같으니 바로 다시 올리지 않는다
  persist();
}
/* "오늘 오후 3:12" · "3일 전 오전 9:00" */
function cloudWhen(iso){
  const d = new Date(iso), gap = dayGap(ymd(d), ymd(new Date()));
  return (gap === 0 ? "오늘" : gap === 1 ? "어제" : gap + "일 전") + " " + alarmClock(d);
}
/* 지금 iCloud 에 제대로 백업되고 있으면 마지막 백업 때, 아니면 null.
   실패가 이어지거나 마지막 백업이 오래됐으면 null 이라 데이터 상태가 원래의 백업 알림을 보인다 (settings.js) */
function cloudActive(){
  const c = cloudState();
  if(!cloudBridge() || !c.on || cloud.account === false || !c.at || c.err) return null;
  if(dayGap(ymd(new Date(c.at)), ymd(new Date())) >= CLOUD_STALE_DAYS) return null;
  return cloudWhen(c.at);
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
  else if(c.err === "toobig") msg = "데이터가 너무 커서 iCloud에 담지 못했어요. 파일로 내보내 주세요.";
  else if(c.err === "other" && cloud.remote) msg = `다른 기기의 백업(레시피 ${cloud.remote.drinks}개)이 있어서 덮지 않았어요. 이 기기로 바꾸려면 지금 백업하기를 눌러 주세요.`;
  else if(c.err) msg = "마지막 백업이 실패했어요" + (c.at ? " · 성공한 백업: " + cloudWhen(c.at) : "") + ".";
  else if(c.at) msg = "마지막 백업: " + cloudWhen(c.at);
  else if(cloudLooksFresh()) msg = "레시피를 넣거나 학습하면 iCloud에 백업해요.";
  else msg = "아직 iCloud에 백업한 적이 없어요.";
  if(st) st.textContent = msg;
  if(now) now.disabled = !c.on || cloud.busy || cloud.account === false;
}
document.querySelectorAll("#cloudBtns .theme-b").forEach(b=>b.addEventListener("click", ()=>{
  const c = cloudState(), on = b.dataset.cloud === "on";
  if(c.on === on) return;
  c.on = on; persist(); haptic("selection");
  if(on) cloudSave(false);
  renderCloud();
}));
if($("#cloudNow")) $("#cloudNow").addEventListener("click", cloudSaveNow);
/* 앱을 내릴 때 바뀐 게 있으면 저장하고, 다시 꺼내면 상태를 묻는다(그사이 iCloud 로그인이 바뀌었을 수 있다) */
document.addEventListener("visibilitychange", ()=>{
  const b = cloudBridge();
  if(document.hidden) cloudSave(false);
  else if(b) b.postMessage({op: "status"});
});
/* 켤 때: 상태를 묻고, 아무것도 안 한 상태면 iCloud 에 백업이 있는지 본다 */
(function(){
  const b = cloudBridge();
  if(!b) return;
  cloudState();
  b.postMessage({op: "status"});
  if(cloudLooksFresh()) b.postMessage({op: "peek"});
})();
