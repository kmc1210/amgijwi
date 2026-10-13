/* 암기쥐 — 내 이름 (1.2 · 앱 전용)
   이름(닉네임)을 알려 주면 쥐돌이가 그 이름으로 부른다: 홈 인사말 · 기다렸다는 말 · 생일 축하 · 알림.
   · 처음 등록은 무료. 첫 실행 가이드를 닫은 뒤(이미 쓰던 사람은 앱을 열 때) 한 번 묻고, 설정에서도 할 수 있다
   · 등록한 뒤 한 번은 무료로 고칠 수 있다(오타). 그다음부터는 바꿀 때마다 치즈 30개
   · 8자까지. 말풍선과 알림에 들어가야 한다
   이름은 data.nick 에 두어 다른 것처럼 기기 안에만 남고 백업을 따라간다. 통신은 없다 */

const NICK_MAX = 8, NICK_PRICE = 30, NICK_HINT = "nick";

/* 줄바꿈 · 제어 글자를 걷고 앞뒤 공백을 떼고 8자로 자른다(이모지도 한 글자로 센다) */
function cleanNickName(raw){
  const t = String(raw === undefined || raw === null ? "" : raw).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return Array.from(t).slice(0, NICK_MAX).join("").trim();
}
/* name 이 비면 아직 알려 주지 않은 것. free: 무료로 한 번 고칠 수 있는가 */
function cleanNick(n){
  n = (n && typeof n === "object") ? n : {};
  const name = cleanNickName(n.name);
  return {name: name, free: name ? n.free === true : false};
}
data.nick = cleanNick(data.nick);

function nickName(){ return data.nick.name; }
/* 부르는 말: "민철님". 이름이 없으면 "" */
function nickCall(){ return data.nick.name ? data.nick.name + "님" : ""; }
/* 부르는 말을 앞에 붙인다: "민철님, 좋은 아침이에요". 이름이 없으면 그대로 */
function nickLead(text){ const c = nickCall(); return c ? c + ", " + text : text; }
/* 지금 이름을 정하거나 바꾸는 데 드는 치즈. 처음 등록과 한 번의 고침은 0 */
function nickCost(){ return (!data.nick.name || data.nick.free) ? 0 : NICK_PRICE; }

/* 이름을 정하거나 바꾼다. 돌려주는 것: {ok:true, cost} 또는 {ok:false, why:"empty" | "same" | "cheese"} */
function setNick(raw){
  if(!isDot()) return {ok:false, why:"app"};
  const name = cleanNickName(raw), had = !!data.nick.name;
  if(!name) return {ok:false, why:"empty"};
  if(name === data.nick.name) return {ok:false, why:"same"};
  const cost = nickCost();
  if(data.closet.cheese < cost) return {ok:false, why:"cheese", lack: cost - data.closet.cheese};
  data.closet.cheese -= cost;
  /* 처음 등록하면 무료 고침이 한 번 생기고, 그 고침을 쓰면 사라진다 */
  data.nick = {name: name, free: !had};
  persist();
  syncAlarms();                 // 알림 문구에 이름이 들어간다 (cal.js)
  return {ok:true, cost: cost};
}

/* ---------- 설정 칸 ---------- */
function nickSettings(){
  const card = $("#nickCard"); if(!card) return;
  const n = data.nick, cost = nickCost();
  const note = !n.name ? "처음 등록은 무료예요."
             : (n.free ? "한 번은 무료로 고칠 수 있어요. 그다음부터는 치즈 " + NICK_PRICE + "개가 들어요."
                       : "이름을 바꾸려면 치즈 " + NICK_PRICE + "개가 들어요. 지금 " + data.closet.cheese + "개 있어요.");
  card.innerHTML = `<h4>내 이름</h4>
    <p>${n.name ? "쥐돌이가 <b>" + esc(nickCall()) + "</b>이라고 불러요. " : "이름을 알려 주면 쥐돌이가 그 이름으로 불러요. "}${note}</p>
    <div class="fld nickrow"><input type="text" id="nickIn" maxlength="${NICK_MAX * 2}" placeholder="${NICK_MAX}자까지" value="${esc(n.name)}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="내 이름">
      <button type="button" class="cta ghost" id="nickSave">${n.name ? (cost ? "치즈 " + cost + " · 바꾸기" : "무료로 고치기") : "등록"}</button></div>
    <div class="nickmsg" id="nickMsg"></div>`;
  $("#nickSave").addEventListener("click", ()=>{
    const r = setNick($("#nickIn").value);
    if(r.ok){
      haptic("success"); toast(r.cost ? "이름을 바꿨어요 · 치즈 -" + r.cost : "이름을 저장했어요");
      renderSettings(); renderGreeting();
      return;
    }
    haptic("error");
    $("#nickMsg").textContent = r.why === "empty" ? "이름을 적어 주세요."
      : (r.why === "same" ? "지금 이름과 같아요."
      : "치즈가 " + r.lack + "개 모자라요. 한 바퀴 더 외우면 모여요.");
  });
}

/* ---------- 처음 한 번 묻기 ---------- */
/* 가이드를 닫은 뒤(guide.js closeGuide), 이미 쓰던 사람은 앱을 열 때(boot.js) 한 번만 묻는다.
   "나중에"를 눌러도 다시 묻지 않는다 — 설정 → 내 이름에서 언제든 할 수 있다 */
function nickAskDue(){ return isDot() && !data.nick.name && !hintSeen(NICK_HINT); }
function closeNickAsk(){ const box = $("#nickAsk"); if(box) box.hidden = true; }
function openNickAsk(){
  const box = $("#nickAsk");
  if(!box || !nickAskDue()) return false;
  markHint(NICK_HINT);
  $("#nickAskIn").value = ""; $("#nickAskMsg").textContent = "";
  $("#nickAskMouse").innerHTML = mouseSVGWorn("day");
  box.hidden = false;
  return true;
}
$("#nickAskSave").addEventListener("click", ()=>{
  const r = setNick($("#nickAskIn").value);
  if(!r.ok){ $("#nickAskMsg").textContent = "이름을 적어 주세요."; haptic("error"); return; }
  closeNickAsk(); haptic("success");
  renderHome();
  sayBubble(nickCall() + "! 반갑츄. 잘 부탁하츄");
});
$("#nickAskLater").addEventListener("click", ()=>{ closeNickAsk(); haptic("light"); });
/* 백업을 되살릴 때. 백업에 이름이 있으면 그 이름을 따르고, 없으면 지금 것을 둔다 */
function restoreNick(bk){ const n = cleanNick(bk); return n.name ? n : data.nick; }
