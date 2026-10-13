/* 암기쥐 — 내 이름 (1.2 · 앱 전용)
   이름(닉네임)을 알려 주면 쥐돌이가 그 이름으로 부른다: 홈 인사말 · 기다렸다는 말 · 생일 축하 · 알림.
   · 처음 등록은 무료. 첫 실행 가이드를 닫은 뒤(이미 쓰던 사람은 앱을 열 때) 한 번 묻고, 설정에서도 할 수 있다
   · 등록한 뒤 한 번은 무료로 고칠 수 있다(오타). 그다음부터는 바꿀 때마다 치즈 30개
   · 8자까지. 말풍선과 알림에 들어가야 한다
   이름은 data.nick 에 두어 다른 것처럼 기기 안에만 남고 백업을 따라간다. 통신은 없다 */

const NICK_MAX = 8, NICK_PRICE = 30, NICK_HINT = "nick";

/* 글자 수는 눈에 보이는 글자로 센다(가족 이모지 · 국기처럼 여러 조각이 붙은 것도 한 글자). 못 세는 환경이면 코드 단위로 */
function nickChars(t){
  if(typeof Intl !== "undefined" && Intl.Segmenter){
    const out = [], it = new Intl.Segmenter("ko", {granularity:"grapheme"}).segment(t)[Symbol.iterator]();
    for(let x = it.next(); !x.done; x = it.next()) out.push(x.value.segment);
    return out;
  }
  return Array.from(t);
}
/* 줄바꿈 · 제어 글자 · 보이지 않는 글자(폭 없는 공백 · 한글 채움 문자)를 걷고 앞뒤 공백을 뗀다. 길이는 자르지 않는다 */
function cleanNickText(raw){
  return String(raw === undefined || raw === null ? "" : raw)
    .replace(/[\u0000-\u001f\u007f\u200b\u2060\ufeff\u3164\u115f\u1160]/g, " ").replace(/\s+/g, " ").trim();
}
/* 저장된 이름을 다듬을 때: 8자로 자른다 */
function cleanNickName(raw){ return nickChars(cleanNickText(raw)).slice(0, NICK_MAX).join("").trim(); }
/* name 이 비면 지금은 이름이 없는 것. free: 무료로 한 번 고칠 수 있는가. had: 이름을 등록한 적이 있는가
   (지웠다가 다시 등록하는 것은 처음 등록이 아니라 바꾸는 것으로 친다) */
function cleanNick(n){
  n = (n && typeof n === "object") ? n : {};
  const name = cleanNickName(n.name);
  return {name: name, free: name ? n.free === true : false, had: !!name || n.had === true};
}
data.nick = cleanNick(data.nick);

/* 부르는 말: "민철님". 이름이 없으면 "" */
function nickCall(){ return data.nick.name ? data.nick.name + "님" : ""; }
/* 부르는 말을 앞에 붙인다: "민철님, 좋은 아침이에요". 이름이 없으면 그대로 */
function nickLead(text){ const c = nickCall(); return c ? c + ", " + text : text; }
/* 지금 이름을 정하거나 바꾸는 데 드는 치즈. 처음 등록과 한 번의 고침은 0 */
function nickCost(){ return (!data.nick.had || data.nick.free) ? 0 : NICK_PRICE; }

/* 이름을 정하거나 바꾼다. 돌려주는 것: {ok:true, cost} 또는 {ok:false, why:"empty" | "long" | "same" | "cheese" | "app"} */
function setNick(raw){
  if(!isDot()) return {ok:false, why:"app"};
  const text = cleanNickText(raw), had = data.nick.had;
  if(!text) return {ok:false, why:"empty"};
  /* 길면 잘라서 저장하지 않는다. 잘린 이름을 고치느라 무료 고침을 쓰게 된다 */
  if(nickChars(text).length > NICK_MAX) return {ok:false, why:"long"};
  if(text === data.nick.name) return {ok:false, why:"same"};
  const cost = nickCost();
  if(data.closet.cheese < cost) return {ok:false, why:"cheese", lack: cost - data.closet.cheese};
  data.closet.cheese -= cost;
  /* 처음 등록하면 무료 고침이 한 번 생기고, 그 고침을 쓰면 사라진다 */
  data.nick = {name: text, free: !had, had: true};
  persist();
  syncAlarms();                 // 알림 문구에 이름이 들어간다 (cal.js)
  return {ok:true, cost: cost};
}
/* 이름을 지운다(무료). 다시 등록할 때는 바꾸는 값이 든다 */
function clearNick(){
  if(!data.nick.name) return;
  data.nick = {name: "", free: false, had: true};
  persist(); syncAlarms();
}
/* 안 된 까닭을 사람 말로 */
function nickWhy(r){
  return r.why === "empty" ? "이름을 적어 주세요."
       : r.why === "long" ? "이름은 " + NICK_MAX + "자까지예요."
       : r.why === "same" ? "지금 이름과 같아요."
       : r.why === "cheese" ? "치즈가 " + r.lack + "개 모자라요. 한 바퀴 더 외우면 모여요."
       : "지금은 이름을 바꿀 수 없어요.";
}

/* ---------- 설정 칸 ---------- */
function nickSettings(){
  const card = $("#nickCard"); if(!card) return;
  const n = data.nick, cost = nickCost();
  const note = !n.name ? (n.had ? "다시 등록하려면 치즈 " + NICK_PRICE + "개가 들어요. 지금 " + data.closet.cheese + "개 있어요." : "처음 등록은 무료예요.")
             : (n.free ? "한 번은 무료로 고칠 수 있어요. 그다음부터는 치즈 " + NICK_PRICE + "개가 들어요."
                       : "이름을 바꾸려면 치즈 " + NICK_PRICE + "개가 들어요. 지금 " + data.closet.cheese + "개 있어요.");
  card.innerHTML = `<h4>내 이름</h4>
    <p>${n.name ? "쥐돌이가 <b>" + esc(nickCall()) + "</b>이라고 불러요. " : "이름을 알려 주면 쥐돌이가 그 이름으로 불러요. "}${note}</p>
    <div class="fld nickrow"><input type="text" id="nickIn" maxlength="${NICK_MAX * 2}" placeholder="${NICK_MAX}자까지" value="${esc(n.name)}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="내 이름">
      <button type="button" class="cta ghost" id="nickSave">${n.name ? (cost ? "치즈 " + cost + " · 바꾸기" : "무료로 고치기") : (cost ? "치즈 " + cost + " · 등록" : "등록")}</button></div>
    <div class="nickmsg" id="nickMsg"></div>${n.name ? `<button type="button" class="bdclear" id="nickClear">이름 지우기</button>` : ""}`;
  const clear = $("#nickClear");
  if(clear) clear.addEventListener("click", ()=>{
    confirmBox("이름 지우기", "쥐돌이가 더는 이름으로 부르지 않아요. 다시 등록할 때는 치즈 " + NICK_PRICE + "개가 들어요.", "지우기", ()=>{
      clearNick(); renderSettings(); renderGreeting(); toast("이름을 지웠어요");
    });
  });
  $("#nickSave").addEventListener("click", ()=>{
    const r = setNick($("#nickIn").value);
    if(r.ok){
      haptic("success"); toast(r.cost ? "이름을 바꿨어요 · 치즈 -" + r.cost : "이름을 저장했어요");
      renderSettings(); renderGreeting();
      return;
    }
    haptic("error");
    $("#nickMsg").textContent = nickWhy(r);
  });
}

/* ---------- 처음 한 번 묻기 ---------- */
/* 가이드를 닫은 뒤(guide.js closeGuide), 이미 쓰던 사람은 앱을 열 때(boot.js) 한 번만 묻는다.
   "나중에"를 눌러도 다시 묻지 않는다 — 설정 → 내 이름에서 언제든 할 수 있다 */
function nickAskDue(){ return isDot() && !data.nick.name && !hintSeen(NICK_HINT); }
function closeNickAsk(){ const box = $("#nickAsk"); if(box) box.hidden = true; }
function nickAskOpen(){ const box = $("#nickAsk"); return !!box && !box.hidden; }
function openNickAsk(){
  const box = $("#nickAsk");
  const g = $("#onboard");
  if(!box || !nickAskDue() || (g && !g.hidden)) return false;      // 가이드를 보는 중이면 가이드가 끝난 뒤에 묻는다
  markHint(NICK_HINT);
  $("#nickAskIn").value = ""; $("#nickAskMsg").textContent = "";
  $("#nickAskMouse").innerHTML = mouseSVGWorn("day");
  box.hidden = false;
  return true;
}
$("#nickAskSave").addEventListener("click", ()=>{
  const r = setNick($("#nickAskIn").value);
  if(!r.ok){ $("#nickAskMsg").textContent = nickWhy(r); haptic("error"); return; }
  closeNickAsk(); haptic("success");
  renderHome();                 // 인사말에 이름이 들어가고, 창에 가려 미뤄 둔 것(생일 폭죽)이 있으면 지금 한다
  /* 생일 축하 · 기다렸다는 말 · 폐기 비상이 말하는 중이면 끼어들지 않는다 */
  if(!bdayIsToday() && !mascot.away && !/비상이츄|꾸밀 수 있츄/.test($("#mbubble").textContent)) sayBubble(nickCall() + "! 반갑츄. 잘 부탁하츄");
});
$("#nickAskLater").addEventListener("click", ()=>{ closeNickAsk(); haptic("light"); renderHome(); });
/* 백업을 되살릴 때. 백업에 이름이 있으면 그 이름을 따르고, 없으면 지금 것을 둔다.
   무료 고침은 백업으로 되살아나지 않는다(등록 → 백업 → 고침 → 되살리기를 되풀이해 값을 피하지 못하게) */
function restoreNick(bk){
  const n = cleanNick(bk);
  if(!n.name) return data.nick;
  return {name: n.name, free: n.free && data.nick.free, had: true};
}
