/* 암기쥐 — 쥐돌이 옷장 (1.1 · 앱 전용)
   한 바퀴 외우면 치즈가 모이고, 그 치즈로 아이템을 사서 쥐돌이에게 입힌다.
   아이템은 쥐돌이 28×40 그림 위에 같은 칸으로 덧그리는 행(rows)이다. y 는 시작 행.
   배경은 넣지 않는다(쥐돌이만 액자에 넣으면 화면과 따로 논다). 화면 분위기는 테마가 맡는다.
   치즈 · 가진 것 · 입은 것은 data.closet 에 두어 레시피와 같이 기기 안에 남고 백업을 따라간다. 통신은 없다 */

/* 아이템 색. 쥐돌이 팔레트(MOUSE_PAL)와 글자가 겹치지 않는다 */
const CLOSET_PAL = {"1": "#6B2F2A", "2": "#A8423A", "3": "#C9605A", "P": "#F08AA0", "Q": "#B8455F", "Z": "#3A2C22", "4": "#8A5A3C", "5": "#5E3A24", "6": "#A87452", "7": "#C7BDB1", "O": "#4A423A", "U": "#FCF7F1", "X": "#78543A",
  "A": "#2F6B4F", "a": "#4E9A6E", "K": "#2A2F3A", "8": "#6E6157", "0": "#3B3430", "9": "#E2AF42"};
Object.keys(CLOSET_PAL).forEach(k=>{ MOUSE_PAL[k] = CLOSET_PAL[k]; });

const CLOSET_SLOTS = [["head","머리"],["face","얼굴"],["body","몸"],["hand","손"]];
const CLOSET_ITEMS = [
  {id:"beret", slot:"head", name:"베레모", price:20, y:1, rows:[
      ".............11.............",
      "...........122221...........",
      ".........1322222221.........",
      "........132222222221........",
      "........122222222221........",
      ".........1111111111........."]},
  {id:"ribbon", slot:"head", name:"리본", price:10, y:2, rows:[
      "..................QQ.QQ.....",
      "..................QPQPQ.....",
      "..................QPPPQ.....",
      "..................QQ.QQ....."]},
  {id:"bandana", slot:"head", name:"바리스타 두건", price:15, y:5, rows:[
      "......AaaaaaaaaaaaaaaA......",
      "......AaUaaaaUaaaaUaaAAA....",
      "......AAAAAAAAAAAAAAAA.AA..."]},
  {id:"partyhat", slot:"head", name:"생일 고깔모자", price:25, y:0, rows:[
      ".............PP.............",
      ".............RR.............",
      "............RRRR............",
      "............2222............",
      "...........RRRRRR...........",
      "...........222222...........",
      "..........RRRRRRRR..........",
      "..........jjjjjjjj.........."]},
  {id:"crown", slot:"head", name:"금빛 왕관", price:80, y:2, rows:[
      "..........R..RR..R..........",
      "..........RR.RR.RR..........",
      "..........RRRRRRRR..........",
      "..........R2RRBR2R..........",
      "..........qqqqqqqq.........."]},
  {id:"glasses", slot:"face", name:"동그란 안경", price:15, y:8, rows:[
      "........ZZZZZ..ZZZZZ........",
      ".......Z.....ZZ.....Z.......",
      ".......Z.....ZZ.....Z.......",
      ".......Z.....ZZ.....Z.......",
      ".......Z.....ZZ.....Z.......",
      ".......Z.....ZZ.....Z.......",
      "........ZZZZZ..ZZZZZ........"]},
  {id:"sunglasses", slot:"face", name:"선글라스", price:20, y:9, rows:[
      ".......ZZZZZZZZZZZZZZ.......",
      ".......ZKKKKZZZZKKKKZ.......",
      ".......ZKhKKZ..ZKhKKZ.......",
      ".......ZKKKKZ..ZKKKKZ.......",
      "........ZZZZ....ZZZZ........"]},
  {id:"monocle", slot:"face", name:"외알 안경", price:25, y:8, rows:[
      "...............qqqqq........",
      "..............q.....q.......",
      "..............q.....q.......",
      "..............q.....q.......",
      "..............q.....q.......",
      "..............q.....q.......",
      "...............qqqqq........",
      "...................q........",
      "....................q.......",
      "....................q.......",
      "...................q........"]},
  {id:"apron", slot:"body", name:"카페 앞치마", price:30, y:22, rows:[
      "........555555555555........",
      "........566666666665........",
      "........544444444445........",
      "........544444444445........",
      "........544444444445........",
      "......5554444444444555......",
      ".55555555555555555555555555.",
      "......5444444444444445......",
      "......5445555555555445......",
      "......5445666556665445......",
      "......5445666556665445......",
      "......5445555555555445......",
      "......5444444444444445......",
      ".......55555555555555......."]},
  {id:"bowtie", slot:"body", name:"나비넥타이", price:15, y:21, rows:[
      "..........11....11..........",
      "..........22211222..........",
      "..........22211222..........",
      "..........11....11.........."]},
  {id:"vest", slot:"body", name:"바리스타 조끼", price:40, y:22, rows:[
      ".......0008U....U8000.......",
      ".......00008U..U80000.......",
      "......0000008..8000000......",
      "......0000008..8000000......",
      "......0000009..8000000......",
      "......0000008..8000000......",
      "......0000008..8000000......",
      "......0000009..8000000......",
      "......0888008..8000000......",
      "......0000008..8000000......",
      "......0000009..8000000......",
      "......0000008..8000000......",
      "......0000008..8000000......",
      "..........00088000.........."]},
  {id:"mug", slot:"hand", name:"머그컵", price:25, y:22, rows:[
      "...........7..7.............",
      "............7..7............",
      "...........7..7.............",
      "owcwww....OOOOOO......wwwcwo",
      ".ocwww....OXXXXO......wwwco.",
      ".owcww.ppcOUUUUOOOcpp.wwcwo.",
      "ocwwww.ppcOUUUUO.Ocpp.wwwwco",
      ".owcww.ppcOUUUUOOOcpp.wwcwo.",
      ".ocwww.ddcOUUUUO..cdd.wwwco.",
      "..........OOOOOO............"]},
  {id:"croissant", slot:"hand", name:"크루아상", price:20, y:22, rows:[
      "............................",
      "..........tttttttt..........",
      "........ttRRrTrRRrtt........",
      "owcwww.trrTrrrrrrTrrt.wwwcwo",
      ".ocwwwtrrTrrrrrrrrTrrtwwwco.",
      ".owcww.ppcrrTttTrrcpp.wwcwo.",
      "ocwwww.ppctt....ttcpp.wwwwco",
      ".owcww.ppc........cpp.wwcwo.",
      ".ocwww.ddc........cdd.wwwco."]},
  {id:"frappe", slot:"hand", name:"프라푸치노", price:30, y:20, rows:[
      "...............22...........",
      "...........OOOO2OO..........",
      "..........OUUUU2UO..........",
      ".........OUUUUUUUUO.........",
      ".........OOOOOOOOOO.........",
      "owcwww....O666666O....wwwcwo",
      ".ocwww....O656656O....wwwco.",
      ".owcww.ppcO666666Ocpp.wwcwo.",
      "ocwwww.ppcOUUUUUUOcpp.wwwwco",
      ".owcww.ppcO666666Ocpp.wwcwo.",
      ".ocwww.ddcO666666Ocdd.wwwco.",
      "..........OOOOOOOO.........."]}
];
/* 치즈: 한 바퀴 +1(하루 10개까지 — 한 장짜리 바퀴를 거듭 돌려 쌓지 못하게), 7일 연속 접속 +5 */
const CHEESE_ROUND = 1, CHEESE_ROUND_DAY_MAX = 10, CHEESE_STREAK = 5;

function cleanCloset(c){
  c = (c && typeof c === "object") ? c : {};
  const ids = CLOSET_ITEMS.map(i=>i.id);
  const own = Array.isArray(c.own) ? c.own.filter(id=>ids.indexOf(id) >= 0) : [];
  const wear = {};
  CLOSET_SLOTS.forEach(([slot])=>{
    const id = c.wear && c.wear[slot];
    const it = closetItem(id);
    if(it && it.slot === slot && own.indexOf(id) >= 0) wear[slot] = id;    // 안 가진 것은 입을 수 없다
  });
  return {
    cheese: Math.max(0, Math.floor(Number(c.cheese) || 0)),
    own: own, wear: wear,
    roundDay: typeof c.roundDay === "string" ? c.roundDay : "",
    roundCount: Math.max(0, Math.floor(Number(c.roundCount) || 0)),
    streakDay: typeof c.streakDay === "string" ? c.streakDay : ""
  };
}
function closetItem(id){ return CLOSET_ITEMS.filter(i=>i.id === id)[0] || null; }
data.closet = cleanCloset(data.closet);

/* ---------- 입히기 ----------
   그리는 차례: 손 → 몸 → 얼굴 → 머리.
   머그(손)는 팔을 가운데로 모으는 칸까지 갖고 있어 먼저 그린다.
   앞치마(몸)는 쥐돌이 몸 색 칸(w · c)에만 칠한다. 그래서 발 · 머그 · 치즈 · 커피잔은 앞치마 앞에 그대로 남고,
   허리띠는 발 뒤로 지나간다(머그를 들면 옆구리를 돌아 보인다).
   mode: stand 서 있기 · eat 치즈 먹기 · sip 커피 마시기 · wx 날씨 옷. wear 를 주지 않으면 지금 입은 옷 */
const CLOSET_BODY_CELLS = "wc";
function dressRows(rows, mode, wear){
  const w = wear || data.closet.wear;
  const g = rows.map(r=>r.split(""));
  ["hand","body","face","head"].forEach(slot=>{
    const it = closetItem(w[slot]);
    if(!it) return;
    if(mode === "wx" && slot !== "face") return;                         // 우비 · 털모자 위에는 안경만
    if((mode === "eat" || mode === "sip") && slot === "hand") return;    // 치즈 · 커피를 드는 동안 머그는 내려놓는다
    it.rows.forEach((r, k)=>{
      const y = it.y + k;
      for(let x = 0; x < r.length; x++){
        const ch = r[x];
        if(ch === ".") continue;
        if(slot === "body" && CLOSET_BODY_CELLS.indexOf(g[y][x]) < 0) continue;
        g[y][x] = ch;
      }
    });
  });
  return g.map(r=>r.join(""));
}
/* 입은 모습. 웹이나 자는 밤(이불)은 그대로.
   먹기 · 마시기 · 깜빡임은 0.4초마다 같은 그림을 다시 부르니 표정 · 배 · 입은 옷이 같으면 지난 그림을 쓴다 */
const wornCache = {};
let wornCacheN = 0;
function mouseSVGWorn(mood, puff){
  if(!isDot() || mood === "night") return mouseSVG(mood, puff);
  const key = mood + (puff ? "+" : "-") + JSON.stringify(data.closet.wear);
  if(wornCache[key]) return wornCache[key];
  const mode = mood.indexOf("eat") === 0 ? "eat" : (mood.indexOf("sip") === 0 ? "sip" : "stand");
  if(++wornCacheN > 80){ Object.keys(wornCache).forEach(k=>delete wornCache[k]); wornCacheN = 1; }
  return (wornCache[key] = rowsSVG(dressRows(mouseRows(mood, puff), mode), false));
}
function weatherSVGWorn(wx){
  return rowsSVG(isDot() ? dressRows(WEATHER[wx], "wx") : WEATHER[wx], false);
}
/* 아이템 하나만 입힌 미리보기(옷장 칸 그림) */
function itemPreviewSVG(id){
  const it = closetItem(id), wear = {};
  if(it) wear[it.slot] = id;
  return rowsSVG(dressRows(mouseRows("day"), "stand", wear), false);
}

/* ---------- 치즈 ---------- */
const CHEESE_ROWS = ["....YYYY","..YYYyYY",".YYjYYYY","YYYYYYjY","YyYYYYYY","YYYYyYYY","jjjjjjjj"];
function cheeseSVG(){
  let o = "";
  CHEESE_ROWS.forEach((r, y)=>{ for(let x = 0; x < r.length; x++) if(r[x] !== ".") o += `<rect x="${x}" y="${y + 1}" width="1" height="1" fill="${MOUSE_PAL[r[x]]}"/>`; });
  return `<svg viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">${o}</svg>`;
}
/* 한 바퀴를 끝내면 +1. 하루 10개까지. 받은 개수(0 · 1)를 돌려준다 */
function earnRoundCheese(stat){
  if(!isDot() || !stat || stat.total < 1) return 0;
  const c = data.closet, today = ymd(new Date());
  if(c.roundDay !== today){ c.roundDay = today; c.roundCount = 0; }
  if(c.roundCount >= CHEESE_ROUND_DAY_MAX) return 0;
  c.roundCount += 1; c.cheese += CHEESE_ROUND;
  persist();
  return CHEESE_ROUND;
}
/* 7일 · 14일 · 21일 … 연속 접속한 날 첫 방문에 +5. 받았으면 true */
function earnStreakCheese(){
  if(!isDot() || !VISIT || !VISIT.info) return false;
  const s = VISIT.info.streak || 0, today = ymd(new Date());
  if(s < 7 || s % 7 !== 0 || data.closet.streakDay === today) return false;
  data.closet.streakDay = today; data.closet.cheese += CHEESE_STREAK;
  persist();
  return true;
}
/* 백업을 되살릴 때의 옷장. 치즈 · 옷은 백업을 따르되, 오늘 이미 받은 몫(한 바퀴 개수 · 연속 보너스)은
   지금 기록을 남겨 예전 백업을 되살려 같은 날 또 받는 일이 없게 한다.
   백업 파일을 손으로 고쳐 치즈를 늘리는 건 막지 않는다(통신 없이 이 기기 안에서만 쓰는 꾸미기라서) */
function restoreCloset(bk){
  if(!bk) return data.closet;
  const c = cleanCloset(bk), now = data.closet, today = ymd(new Date());
  if(now.roundDay === today && (c.roundDay !== today || c.roundCount < now.roundCount)){ c.roundDay = today; c.roundCount = now.roundCount; }
  if(now.streakDay === today) c.streakDay = today;
  return c;
}

/* ---------- 입구 ---------- */
let closetFrom = "home";
function openCloset(from){ closetFrom = from || "home"; go("closet"); }
/* 홈: 쥐돌이 아래 치즈 칩. 처음 치즈가 생긴 뒤 한 번만 말풍선으로 알려준다.
   lead 는 그 말풍선 앞에 붙일 말(연속 접속 보너스로 처음 치즈가 생긴 날) */
function closetHome(lead){
  const n = $("#cheeseN"); if(n) n.textContent = data.closet.cheese;
  if(!isDot()) return;
  if(data.closet.cheese > 0 && !hintSeen("closet")){
    markHint("closet");
    sayBubble((lead ? lead + " " : "") + "치즈를 모아 쥐돌이를 꾸밀 수 있츄! 치즈를 눌러 보츄");
  }
}
/* 결과 화면: 받은 치즈와 옷장 버튼(앱만) */
function closetResult(gain){
  const line = $("#resCheese"), btn = $("#closetBtn");
  if(!line || !btn) return;
  const on = isDot();
  /* 못 받은 까닭이 하루 몫을 다 받아서일 때만 그렇게 말한다(빈 바퀴면 줄을 숨긴다) */
  const capped = data.closet.roundDay === ymd(new Date()) && data.closet.roundCount >= CHEESE_ROUND_DAY_MAX;
  line.style.display = on && (gain || capped) ? "" : "none"; btn.style.display = on ? "" : "none";
  if(!on) return;
  line.innerHTML = `<span class="ci">${cheeseSVG()}</span><span>${gain ? "치즈 +" + gain : "오늘 치즈는 다 받았어요"}</span><small>지금 ${data.closet.cheese}개</small>`;
}
/* 설정: 맨 위 옷장 줄 */
function closetSettings(){
  const card = $("#closetCard"); if(!card) return;
  card.innerHTML = `<button type="button" class="closetrow" id="closetRowBtn"><span class="cm">${mouseSVGWorn("day")}</span>
    <span class="tx"><b>쥐돌이 옷장</b><span>치즈로 쥐돌이를 꾸며요 · 치즈 ${data.closet.cheese}개</span></span><span class="ar">›</span></button>`;
  $("#closetRowBtn").addEventListener("click", ()=>openCloset("set"));
}

/* ---------- 옷장 화면 ---------- */
let closetSlot = "head", closetBlinkT = null, closetBought = {id:"", t:0};
function closetSay(t){ const el = $("#cSay"); if(el) el.textContent = t; }
function renderCloset(){
  const c = data.closet;
  $("#closetSub").textContent = "치즈 " + c.cheese + "개 · 한 바퀴 외우면 +1";
  $("#cCheese").innerHTML = `<span class="ci">${cheeseSVG()}</span><span>${c.cheese}</span>`;
  $("#cMouse").innerHTML = mouseSVGWorn("day");
  $("#cTabs").innerHTML = CLOSET_SLOTS.map(([s, name])=>`<button type="button" data-s="${s}" class="${s === closetSlot ? "on" : ""}">${name}</button>`).join("");
  $("#cGrid").innerHTML = CLOSET_ITEMS.filter(i=>i.slot === closetSlot).map(i=>{
    const own = c.own.indexOf(i.id) >= 0, wear = c.wear[i.slot] === i.id;
    const off = (i.slot === "body" || i.slot === "hand") ? -40 : (i.slot === "face" ? -10 : 0);   // 아이템이 있는 자리를 보여준다
    const tag = wear ? "착용중" : (own ? "보유중" : `<span class="ci">${cheeseSVG()}</span>${i.price}`);
    return `<button type="button" class="citem${own ? " own" : ""}${wear ? " wear" : ""}" data-i="${i.id}">
      <span class="th"><span style="margin-top:${off}px">${itemPreviewSVG(i.id)}</span></span>
      <span class="nm">${esc(i.name)}</span><span class="pr">${tag}</span></button>`;
  }).join("");
  document.querySelectorAll("#cTabs button").forEach(b=>b.addEventListener("click", ()=>{
    if(closetSlot !== b.dataset.s) haptic("selection");
    closetSlot = b.dataset.s; renderCloset();
  }));
  document.querySelectorAll("#cGrid .citem").forEach(b=>b.addEventListener("click", ()=>tapClosetItem(b.dataset.i)));
  scheduleClosetBlink();
}
function tapClosetItem(id){
  const c = data.closet, it = closetItem(id), msg = $("#cMsg");
  if(!it) return;
  if(c.own.indexOf(id) < 0){
    if(c.cheese < it.price){
      msg.textContent = `치즈가 ${it.price - c.cheese}개 모자라요. 한 바퀴 더 외워 보자츄!`;
      closetSay("치즈가 모자라츄…"); haptic("error");
      return;
    }
    c.cheese -= it.price; c.own.push(id); c.wear[it.slot] = id;
    closetBought = {id:id, t:Date.now()};
    msg.textContent = `${it.name}을(를) 샀어요`;
    closetSay("고맙츄!"); sfx("chu"); haptic("success");
  } else if(c.wear[it.slot] === id){
    if(closetBought.id === id && Date.now() - closetBought.t < 800) return;   // 사자마자 두 번 눌려 바로 벗겨지지 않게
    delete c.wear[it.slot];
    msg.textContent = `${it.name} 벗었어요`; closetSay("시원하츄"); haptic("light");
  } else {
    c.wear[it.slot] = id;
    msg.textContent = `${it.name} 착용했어요`; closetSay("어때츄?"); haptic("light");
  }
  persist();
  renderCloset();
  drawMascot();
}
/* 옷장 쥐돌이도 홈처럼 몇 초마다 깜빡인다. 옷장을 떠나면 멈춘다 */
function scheduleClosetBlink(){
  clearTimeout(closetBlinkT);
  if(reduceMotion()) return;
  closetBlinkT = setTimeout(()=>{
    const m = $("#cMouse");
    if(!m || !$("#s-closet").classList.contains("active")) return;
    m.innerHTML = mouseSVGWorn("blink");
    setTimeout(()=>{ if($("#s-closet").classList.contains("active")) m.innerHTML = mouseSVGWorn("day"); scheduleClosetBlink(); }, 160);
  }, 2400 + Math.random() * 1800);
}
$("#closetClose").addEventListener("click", ()=>go(closetFrom === "result" ? "home" : closetFrom));
$("#cheeseChip").addEventListener("click", ()=>{ haptic("light"); openCloset("home"); });
$("#closetBtn").addEventListener("click", ()=>openCloset("result"));
$("#cheeseChip").querySelector(".ci").innerHTML = cheeseSVG();
