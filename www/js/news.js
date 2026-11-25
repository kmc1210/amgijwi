/* 암기쥐 — 쥐돌이 뉴스 호외 (업데이트 소식)
   업데이트하고 처음 홈을 열면 그 버전에서 바뀐 점을 신문 한 장(시트)으로 한 번 보여준다.
   소식은 아래 NEWS 에 미리 적어 둔다(통신하지 않는다). 새 버전을 낼 때마다 맨 위에 한 줄 더한다 —
   App Store "이 버전에서 업그레이드된 사항"과 같은 내용을 츄 말투로, 제목 한 줄 + 설명 두세 줄.

   누구에게 · 언제
   - 앱에서만. 이미 쓰던 사람만(새로 설치한 사람은 첫 실행 가이드가 대신한다 — closet.js 의 usedBefore 로 가린다)
   - 본 버전을 이 기기(localStorage)에 적는다. 몇 버전을 건너뛰어 올리면 그 사이 소식을 한 장에 차례로 묶는다
   - 기록이 없던 사람(이 기능 전 버전에서 올라옴)에게는 지금 버전 소식만
   - NEWS_FROM 보다 옛 버전 소식은 띄우지 않고 "지난 소식"에만 둔다
   - 앞 두 자리가 바뀌는 업데이트의 고마워 치즈(closet.js)는 따로 말하지 않고 호외 안 한 줄로 합친다
   - 잠금 · 가이드 · 이름 묻기 · 확인창 · 시트 · 썰매 장면에 가려 있으면 미뤘다가 다음에 홈이 보일 때 */
const NEWS = [
  {v: "1.5.5", d: "2026-11-23", t: "바에서 한 잔 만들어 보자츄 (베타)",
   l: ["학습 › 학습 방식에서 \"바 연습\"을 고르면 도구를 꾹 눌러 레시피대로 한 잔 만들어요.", "베타라 채점이 틀릴 수 있어요. 정답이 다르면 \"정답 고치기\"로 바로잡아요.", "업데이트하면 바뀐 점을 이렇게 신문으로 알려 드려요."]},
  {v: "1.5.4", d: "2026-11-12", t: "부재료도 같이 보관하츄",
   l: ["레시피를 보관할 때, 그 메뉴에만 쓰던 부재료도 같이 보관할지 물어봐요.", "보관한 부재료는 보관함에서 다시 꺼낼 수 있어요."]},
  {v: "1.5.3", d: "2026-11-09", t: "옷장에 테마 칸이 생겼츄",
   l: ["치즈로 산 테마를 미리 보고, 홈에서 바로 볼 수 있어요.", "접는 아이폰에서 홈 맨 위 여백을 다듬었어요."]},
  {v: "1.5.1", d: "2026-11-05", t: "산타 옷 입고 달리츄",
   l: ["크리스마스 옷을 입고도 달리고, 산타 옷이 새로 생겼어요.", "홈의 일정은 다가올수록 위로 올라와요.", "12월 4일까지는 광고 없이 하루 한 번 치즈를 선물해요."]},
  {v: "1.5", d: "2026-11-04", t: "크리스마스가 왔츄",
   l: ["크리스마스 옷 · 테마 · 캐롤, 그리고 24 · 25일 선물이 기다려요.", "요일별 할 일과 할 일 위젯이 생겼어요."]}
];
const NEWS_FROM = "1.5.5", NEWS_KEY = "amgijwi-news-seen";
function newsGet(){ try{ return localStorage.getItem(NEWS_KEY) || ""; }catch(e){ return ""; } }
function newsSet(v){ try{ localStorage.setItem(NEWS_KEY, v); }catch(e){} }
const newsAtLeast = (a, b)=>!updateNewer(b, a);       // a >= b
/* 지금 보여줄 소식(새것부터). 없으면 []. 볼 것이 없으면 기록만 지금 버전으로 맞춘다 */
function newsDue(){
  if(!isDot() || !isNativeApp() || typeof updateMine !== "function") return [];
  const cur = updateMine(), seen = newsGet();
  if(!/^\d+(\.\d+)*$/.test(cur) || cur === "0") return [];
  if(seen && !updateNewer(cur, seen)) return [];              // 이미 봤거나, 더 새 버전 기록(옛 앱으로 돌아감)
  const fresh = !seen && !usedBefore();
  const list = fresh ? [] : NEWS.filter(n=>newsAtLeast(n.v, NEWS_FROM) && !updateNewer(n.v, cur)
                                         && (seen ? updateNewer(n.v, seen) : n.v === cur));
  if(!list.length) newsSet(cur);
  return list;
}
function newsDate(d){ const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(d || ""); return m ? m[1] + "년 " + Number(m[2]) + "월 " + Number(m[3]) + "일" : ""; }
function newsItemHTML(n){
  return `<div class="hoe-art"><div class="hoe-ver">버전 ${esc(n.v)} · ${esc(newsDate(n.d))}</div>
    <h3>${esc(n.t)}</h3>${n.l.map(x=>`<p>${esc(x)}</p>`).join("")}</div>`;
}
/* 호외 한 장. cheese 면 고마워 치즈 한 줄을 붙인다 */
function openNews(list, cheese, done){
  if(state.selMode) exitSel();
  $("#sheetBody").innerHTML = `<div class="hoe">
    <div class="hoe-mast"><div class="hoe-kick">호외</div><div class="hoe-title">쥐돌이 뉴스</div></div>
    <div class="hoe-body"><div class="hoe-arts">${list.map(newsItemHTML).join("")}</div><div class="hoe-pic">${mouseSVG("day")}</div></div>
    ${cheese ? `<div class="hoe-cheese">업데이트해 줘서 고맙츄! 치즈 ${VER_CHEESE}개 선물이츄</div>` : ""}
    <div class="hoe-btns"><button class="cta ghost" id="hoeAll">지난 소식</button><button class="cta" id="hoeOk">알겠츄</button></div></div>`;
  $("#mask").classList.add("on"); $("#sheet").classList.add("on");
  haptic("light");
  newsDone = done || null;
  $("#hoeOk").addEventListener("click", ()=>{ closeSheet(); newsAfter(); });
  $("#hoeAll").addEventListener("click", ()=>openNewsAll());
}
/* 지난 소식 전부(설정 › 업데이트 소식 · 호외의 "지난 소식") */
function openNewsAll(){
  $("#sheetBody").innerHTML = `<div class="hoe">
    <div class="hoe-mast"><div class="hoe-kick">지난 호외</div><div class="hoe-title">업데이트 소식</div></div>
    <div class="hoe-arts hoe-list">${NEWS.map(newsItemHTML).join("")}</div>
    <div class="hoe-btns"><button class="cta" id="hoeOk">닫기</button></div></div>`;
  $("#mask").classList.add("on"); $("#sheet").classList.add("on");
  $("#sheetBody").scrollTop = 0;
  $("#hoeOk").addEventListener("click", ()=>{ closeSheet(); newsAfter(); });
}
/* 호외를 닫은 뒤(바탕을 눌러 닫아도) 기다리던 말 · 새 버전 묻기를 잇는다 */
let newsDone = null;
function newsAfter(){ const f = newsDone; newsDone = null; if(f) f(); }
$("#mask").addEventListener("click", ()=>{ if(newsDone) setTimeout(newsAfter, 0); });

/* 홈이 그려질 때 closet.js 의 verHome 이 newsDue() 결과와 고마워 치즈를 받았는지를 넘긴다.
   보여줄(기다리는) 호외가 있으면 true — 그때 고마워 치즈 말풍선은 호외가 대신한다 */
let newsWait = null;
/* 고마워 치즈는 받는 순간 저장되지만 호외는 가려 있으면 미뤄진다. 그사이 앱을 꺼도 다음에 뜨는 호외가 그 한 줄을 잃지 않게 적어 둔다 */
const NEWS_CHEESE_KEY = "amgijwi-news-cheese";
function newsCheeseHeld(){ try{ return localStorage.getItem(NEWS_CHEESE_KEY) === "1"; }catch(e){ return false; } }
function newsCheeseHold(on){ try{ if(on) localStorage.setItem(NEWS_CHEESE_KEY, "1"); else localStorage.removeItem(NEWS_CHEESE_KEY); }catch(e){} }
function newsHome(cheese, list){
  if(cheese) newsCheeseHold(true);
  if(list && list.length) newsWait = {list: list};
  return !!newsWait;
}
/* 가려 있지 않으면 띄운다. 띄웠으면 true */
function newsTry(){
  if(!newsWait || bdayHidden() || !canInterrupt(true)) return false;
  const w = newsWait; newsWait = null;
  w.cheese = newsCheeseHeld(); newsCheeseHold(false);
  newsSet(updateMine());
  openNews(w.list, w.cheese, ()=>{
    /* 처음 생긴 치즈면 한 번뿐인 옷장 안내를 놓치지 않게 짧게 한 번 더 */
    if(w.cheese && !hintSeen("closet")) giftSay("치즈 " + VER_CHEESE + "개 선물이츄");
    homeSayFlush(); updateGo();
  });
  return true;
}
$("#openNews").addEventListener("click", ()=>openNewsAll());
