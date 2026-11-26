/* 바 연습 (베타) — 바에서 직접 만들어 정답(음료 카드)을 적고, 그 카드를 기억으로 다시 만들어 시험한다.
   학습 탭 → 학습 방식 시트의 세 번째 줄에서 들어온다(study.js 의 openModeSheet).

   1.5.7 개편: 레시피 문장을 읽어 정답을 짐작하던 방식을 버렸다. 레시피는 옆에 펴 두고 참고만 한다.
   - 만들기: 도구를 꾹 눌러 한 잔을 만들면 누른 순서대로 단계가 쌓인다 → 다듬기(순서 · 양 · 재료 · "순서 상관없음" 묶기) → 음료 카드로 저장.
   - 내 음료: 음료 카드 목록. 연습하기(보며 · 외워서) · 다듬기 · 지우기. 맨 끝에 저장 안 되는 예시 한 잔.
   - 재료: 도구(어떻게 넣나)와 재료(무엇을 · 색)를 나눈다. 기본 재료가 들어 있고 매장 재료를 더한다.
   - 채점: 단계마다 재료 · 양 · 순서를 따로. 묶은 단계끼리는 순서를 따지지 않는다.
   - 음료 카드는 나중에 "쥐돌이 카페"(손님 주문대로 만들어 파는 놀이)의 메뉴가 된다. 그래서 단계는 문장이 아니라 {도구, 재료, 양} 으로 둔다.
   - 베타라 치즈는 주지 않는다. 통신 없음.

   저장: data.bar = {v:2, cards:[…], ings:[…]}. 파일 · iCloud 백업을 따라간다(settings.js 가 cleanBarCfg 로 거른다).
   옛 1.5.5~1.5.6 의 레시피별 정답(plan) · 내 도구(이름 · 알아듣는 말)는 옮기지 않고 새로 시작한다(베타).

   앱의 다른 파일과 이름이 부딪히지 않게 전부 이 함수 안에 둔다. 밖에서 쓰는 것은 openBar · barLeave · cleanBarCfg 와
   회귀 테스트용 barTest 뿐이다. 화면의 id 는 bar- 로, 클래스는 bx- 로 시작한다 */
(function(){
"use strict";
const B = id => document.getElementById("bar-" + id);
const own = (o, k)=>Object.prototype.hasOwnProperty.call(o, k);   // 백업에서 온 "constructor" 같은 이름이 도구로 통하지 않게

/* ───── 도구 도트 (12x12) ───── */
const IP = {o:"#4A423A",b:"#CFE6F2",B:"#9CC7DE",w:"#FFFFFF",s:"#A8B3BA",S:"#6E7A82",k:"#3A2418",c:"#7A4A2A",y:"#E2AF42",Y:"#F7CE66",m:"#F4F1EA",M:"#C9D7E6",r:"#D9534A",g:"#7FB86B",G:"#B8E0A8",t:"#C69132",p:"#F5BEAC",P:"#DF9B88",e:"#E9DCC8",E:"#B79E7E",R:"#F08A6A"};
const ICON = {
 ice:["............","..oooo......",".obbbbo.....",".obwBbooooo.",".obBbobbbbo.",".obbbobwBbo.","..oooobBbbo.","..oooobbbbo.",".obbbbooooo.",".obwBbo.....",".obbbbo.....","..oooo......"],
 water:["............","oooooooo....","osssssso....","oSSSSSSo....",".....oso....",".....oSo....",".....ooo....","......B.....",".....oBo....","....obbBo...","....obwbo...",".....ooo...."],
 hot:["....w.w.....",".....w.w....","....oooo....","...oSSSSo...","..oooooooo..",".osssssssoo.","oswssssssoso","osssssssso.o","osSSSSSSSoo.",".osssssso...","..oooooo....","............"],
 shot:["............","..oooooooo..","..ossssssooo","..oSSSSSSo..","...okkkko...","....okko....","............","...o.k..o...","...o.k..o...","...owkkko...","...okkkko...","....oooo...."],
 cold:["....ooo.....","....oso.....","....ooo.....","...okkko....","..okcckko...","..okwkkko...","..okkkkko...","..oeeeeeo...","..oeEEEeo...","..oeeeeeo...","..okkkkko...","...ooooo...."],
 milk:["....oooo....","...omMMmo...","..ommmmmmo..","..oooooooo..","..ommmmmmo..","..omMMMMmo..","..omMwwMmo..","..omMMMMmo..","..ommmmmmo..","..ommmmmmo..","..ommmmmmo..","..oooooooo.."],
 steam:["..w..w......","...w..w.....","..oooooooo..","..osssssso..","..oswsssso..","..osmmmmsooo",".osmmmmmmsoo",".osmmmmmmso.",".osmmmmmmso.",".osssssssso.","..oooooooo..","............"],
 soda:["....ooo.....","....ogo.....","...oGGGo....","..oGgggGo...","..oGwbbGo...","..oGbbbGo...","..oGbwbGo...","..oGbbbGo...","..oGbbwGo...","..oGbbbGo...","..oGGGGGo...","...ooooo...."],
 syrup:["....ooo.....","...ooso.....","....os......","....os......","...oooo.....","..oYYYYo....","..oYwYYo....","..oyyyyo....","..oYYYYo....","..oYYYYo....","..oyyyyo....","...oooo....."],
 sauce:["....oo......","....oo......","...oooo.....","..okkkko....","..okwkko....","..okkkko....","..okcckko...","..okcckko...","..okkkko....","..okkkko....","..okkkko....","...oooo....."],
 jam:["............","...oooooo...","...otttto...","..oooooooo..","..oRRRRRRo..","..oRwRRRRo..","..oRRRRRRo..","..oRRppRRo..","..oRppppRo..","..oRRRRRRo..","..oPPPPPPo..","...oooooo..."],
 powder:["............","..oooooooo..","..oEEEEEEo..","..oooooooo..","..oeeeeeeo..","..oeccccco..","..oecwccco..","..oeccccco..","..oeeeeeeo..","..oeeeeeeo..","..oeeeeeeo..","..oooooooo.."],
 whip:["....oo......","....oso.....","....oso.....","...oooo.....","..osssso....","..oswsso....","..ossssso...","..orrrrro...","..osssssso..","..osssssso..","..osssssso..","...ooooooo.."],
 drizzle:["......oo....","......oo....",".....oooo...","....okkkko..","....okwkko..","....okkkko..","....okkkko..","....okkkko..",".....oooo...","..c.c.c.c...",".c.c.c.c....","............"],
 stir:["............","........ooo.",".......osso.","......osswo.","......oSso..",".....oSoo...","....oSo.....","...oSo......","..oSo.......",".oSo........",".oo.........","............"],
 lid:["............",".....oo.....","....oMMo....","..oooooooo..",".oMMwMMMMMo.",".oooooooooo.","..o......o..","..o......o..","...o....o...","...o....o...","...oooooo...","............"],
 hand:["............","....o.o.o...","...opopopo..","...opopopo.o","...opopopoop","...opppppopo","..oppppppppo","..oppppppppo","..opppppppo.","...oppppppo.","....ooooo...","............"]
};
function draw(rows, pal){
  const w = rows[0].length, h = rows.length;
  let o = '<svg class="bx-sp" viewBox="0 0 ' + w + ' ' + h + '" shape-rendering="crispEdges" aria-hidden="true">';
  rows.forEach((r, y)=>{ let x = 0; while(x < w){ const c = r[x]; if(c === "." || !pal[c]){ x++; continue; } let n = 1; while(x + n < w && r[x + n] === c) n++; o += '<rect x="' + x + '" y="' + y + '" width="' + n + '" height="1" fill="' + pal[c] + '"/>'; x += n; } });
  return o + '</svg>';
}

/* ───── 도구: base = 기록 단위, u = 쓸 수 있는 단위(1 단위 = base 몇) ───── */
const LIQ = {ml:1, oz:29.57, "티스푼":5, "테이블스푼":15};
const T = {
 ice:    {n:"얼음",sub:"제빙기",base:"g",u:{g:1,"스쿱":100},fill:true,rate:4},
 water:  {n:"정수",sub:"정수기",base:"ml",u:LIQ,fill:true,rate:5,col:"#CFE3EC"},
 hot:    {n:"온수",sub:"온수기",base:"ml",u:LIQ,fill:true,rate:5,col:"#E4ECEF"},
 shot:   {n:"에스프레소",sub:"머신",base:"샷",u:{"샷":1},col:"#5A3420"},
 cold:   {n:"콜드브루",sub:"원액",base:"ml",u:LIQ,fill:true,rate:3,col:"#3A2416"},
 milk:   {n:"우유",sub:"냉장고",base:"ml",u:LIQ,fill:true,rate:5,col:"#F7F3EA"},
 steam:  {n:"스팀우유",sub:"스팀 노즐",base:"ml",u:LIQ,fill:true,rate:5,col:"#FBF7EE"},
 soda:   {n:"탄산수",sub:"병",base:"ml",u:LIQ,fill:true,rate:5,col:"#DCEFF5"},
 syrup:  {n:"펌프",sub:"시럽",base:"펌프",u:{"펌프":1,ml:0.2},count:true,tick:400,col:"#E8B858",ml:5},
 sauce:  {n:"소스",sub:"계량컵",base:"ml",u:LIQ,rate:1.5,col:"#6A3A22"},
 jam:    {n:"청",sub:"계량컵",base:"ml",u:LIQ,rate:1.5,col:"#F08A6A"},
 powder: {n:"파우더",sub:"스쿱",base:"티스푼",u:{"티스푼":1,"테이블스푼":3,g:1/3,"스쿱":3},count:true,tick:450,col:"#8B5A3C",ml:2},
 whip:   {n:"휘핑",sub:"휘핑기",base:"회전",u:{"회전":1},count:true,tick:700},
 drizzle:{n:"드리즐",sub:"소스병",base:"회전",u:{"회전":1},count:true,tick:700,col:"#5A3420"},
 stir:   {n:"젓기",sub:"스푼"},
 lid:    {n:"뚜껑",sub:"마무리"},
 hand:   {n:"손으로",sub:"가니시 · 메모"}
};
const ORDER = ["ice","water","hot","shot","cold","milk","steam","soda","syrup","sauce","jam","powder","whip","drizzle","stir","lid","hand"];
const NOAMT = {stir:1, lid:1, hand:1};          // 양이 없는 도구
const COL_MIX = "#B98A62";
const CUPS = {"8oz":237, "12oz":355, "16oz":473, "20oz":591};
const CUPLINE = {"8oz":[.5,.75,.9], "12oz":[.5,.75,.9], "16oz":[.45,.68,.86], "20oz":[.42,.64,.84]};
const FILLS = [["가득",1],["9부",.9],["8부",.8],["7부",.7],["6부",.6],["5부",.5],["1번 선",-1],["2번 선",-2],["3번 선",-3]];

/* ───── 재료: 도구(어떻게) 아래 재료(무엇을 · 색). 기본 재료는 여기, 매장 재료는 data.bar.ings ─────
   재료가 하나뿐인 도구(얼음 · 정수 …)는 도구 자체가 재료라 고르지 않는다. 매장 재료를 더하면 고르게 된다 */
const ING_BASE = {
 shot:  [["shot.esp","에스프레소","#5A3420"],["shot.decaf","디카페인","#4A2C1C"],["shot.blonde","블론드","#8A5A30"]],
 milk:  [["milk.milk","우유","#F7F3EA"],["milk.low","저지방 우유","#FAF8F3"],["milk.oat","오트","#E6D9C2"],["milk.soy","두유","#EFE7D2"]],
 steam: [["steam.milk","스팀우유","#FBF7EE"],["steam.oat","스팀 오트","#EADFC9"],["steam.soy","스팀 두유","#F1EAD8"]],
 syrup: [["syrup.vanilla","바닐라 시럽","#E9C98A"],["syrup.hazel","헤이즐넛 시럽","#B07A45"],["syrup.caramel","카라멜 시럽","#C9873A"],["syrup.classic","클래식 시럽","#F1E6CC"]],
 sauce: [["sauce.mocha","모카 소스","#5A3420"],["sauce.white","화이트모카 소스","#E8E2D4"],["sauce.caramel","카라멜 소스","#A8652A"]],
 jam:   [["jam.grape","자몽청","#F08A6A"],["jam.lemon","레몬청","#F2D35E"],["jam.yuzu","유자청","#F2B84B"]],
 powder:[["powder.choco","초코 파우더","#5A3420"],["powder.matcha","녹차 파우더","#7DA06A"],["powder.vanilla","바닐라 파우더","#EDE3C8"]],
 drizzle:[["drizzle.caramel","카라멜 드리즐","#A8652A"],["drizzle.choco","초코 드리즐","#4A2C1C"]]
};
const ING_OK = ["shot","water","hot","cold","milk","steam","soda","syrup","sauce","jam","powder","whip","drizzle"];   // 매장 재료를 더할 수 있는 도구
const PAL = ["#F7F3EA","#E9C98A","#C9873A","#B07A45","#7A4A2A","#5A3420","#E07A8A","#F08A6A","#F2D35E","#7DA06A","#9CC7DE","#B9A3D6"];
const MAX_INGS = 40, MAX_CARDS = 200, MAX_STEPS = 40;
function store(){ return (typeof data !== "undefined" && data && data.bar && data.bar.v === 2) ? data.bar : {v:2, cards:[], ings:[]}; }
function cards(){ return store().cards; }
function userIngs(){ return store().ings; }
function nm(k){ return T[k] ? T[k].n : k; }
/* 이 도구의 재료들(기본 + 매장). 기본 재료가 없는 도구는 도구 자체 하나 */
function ingList(k){
  const base = (ING_BASE[k] || []).map(x=>({id:x[0], n:x[1], c:x[2], k:k}));
  const mine = userIngs().filter(x=>x.k === k).map(x=>({id:x.id, n:x.n, c:x.c, k:k, mine:true}));
  if(!base.length) base.push({id:k, n:T[k].n, c:T[k].col || "#FFFFFF", k:k});
  return base.concat(mine);
}
function ingOf(id, k){ if(!id) return ingList(k)[0]; const l = ingList(k); return l.filter(x=>x.id === id)[0] || null; }
function ingName(a){ const x = ingOf(a.i, a.k); return x ? x.n : nm(a.k); }
function ingCol(a){ const x = ingOf(a.i, a.k); return x ? x.c : (T[a.k].col || "#FFFFFF"); }
/* 재료가 같은가 — 비어 있으면 그 도구의 첫 재료로 본다 */
function ingKey(a){ return a.i && ingOf(a.i, a.k) ? a.i : ingList(a.k)[0].id; }
function sameIng(a, b){ return a.k === b.k && ingKey(a) === ingKey(b); }
function shotTxt(a){ const n = ingName(a); return (/샷$/.test(n) ? "" : n + " ") + a.t + "샷"; }
const txt = (v, n)=>String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);

/* ───── 걸러 내기 (백업 · 저장) ───── */
function cleanSteps(p){
  if(!Array.isArray(p)) return [];
  const out = [];
  let kept = false;                         // 바로 앞(원래 순서) 단계가 남았나 — 빠진 단계 뒤의 묶음 표시가 엉뚱한 단계에 붙지 않게
  p.forEach(a=>{
    const was = kept; kept = false;
    if(!a || typeof a !== "object" || !own(T, a.k)) return;
    const d = T[a.k], o = {k:a.k};
    if(a.k === "hand"){ const t = txt(a.text, 60); o.text = t || "손으로"; }
    else if(!NOAMT[a.k]){
      if(a.i != null && txt(a.i, 40)) o.i = txt(a.i, 40);
      const f = Number(a.f);
      if(a.f != null && isFinite(f) && f > 0 && f <= 1.2 && d.fill){ o.f = f; o.lab = txt(a.lab, 10) || Math.round(f * 100) + "%"; }
      else{ const t = Number(a.t); if(!isFinite(t) || t <= 0 || t > 5000) return; o.t = t; o.u = own(d.u, a.u) ? String(a.u) : d.base; }
    }
    if(a.w && was && out.length) o.w = 1;   // 바로 위 단계와 순서 상관없음
    out.push(o); kept = true;
  });
  return out.slice(0, MAX_STEPS);
}
function cleanCard(c){
  if(!c || typeof c !== "object") return null;
  const steps = cleanSteps(c.steps);
  if(!steps.length) return null;
  const o = {id:txt(c.id, 40) || uid(), name:txt(c.name, 30) || "이름 없는 음료", temp:c.temp === "HOT" || c.temp === "ICE" ? c.temp : "", cup:own(CUPS, c.cup) ? c.cup : "16oz", steps:steps};
  if(c.rid) o.rid = txt(c.rid, 40);
  const best = Number(c.best); if(isFinite(best) && best >= 0 && best <= 100) o.best = Math.round(best);
  const n = Number(c.n); if(isFinite(n) && n > 0) o.n = Math.min(99999, Math.floor(n));
  return o;
}
/* 백업에서 온 값 — v:2 가 아니면(옛 내 도구) undefined */
function cleanBar(b){
  if(!b || typeof b !== "object" || b.v !== 2) return undefined;
  const ings = [], cs = [];
  (Array.isArray(b.ings) ? b.ings : []).forEach(x=>{
    if(!x || typeof x !== "object" || ING_OK.indexOf(x.k) < 0) return;
    const id = txt(x.id, 40), n = txt(x.n, 20), c = /^#[0-9a-f]{6}$/i.test(x.c) ? x.c : PAL[0];
    if(!/^u[\w-]+$/.test(id) || !n || ings.some(y=>y.id === id || (y.k === x.k && y.n === n)) || ings.length >= MAX_INGS) return;
    ings.push({id:id, n:n, k:x.k, c:c});
  });
  const ids = {};
  (Array.isArray(b.cards) ? b.cards : []).forEach(c=>{ const v = cleanCard(c); if(v && !ids[v.id] && cs.length < MAX_CARDS){ ids[v.id] = 1; cs.push(v); } });
  /* 지운 매장 재료를 가리키던 단계는 그 도구의 첫 재료로(고를 수 없는 재료가 정답으로 남지 않게) */
  cs.forEach(c=>c.steps.forEach(a=>{ if(a.i && /^u/.test(a.i) && !ings.some(x=>x.id === a.i && x.k === a.k)) delete a.i; }));
  /* 비어도 {v:2} 로 둔다 — 다 지운 기기의 백업을 되살리면 다른 기기의 카드도 비워져야 해서(옛 백업과 구별) */
  return {v:2, cards:cs, ings:ings};
}
function saveStore(s){ data.bar = cleanBar(s); persist(); }
function storeCopy(){ const s = store(); return {v:2, cards:JSON.parse(JSON.stringify(s.cards)), ings:JSON.parse(JSON.stringify(s.ings))}; }

/* ───── 상태 ───── */
let RECIPES = [], view = "list", mode = "see";
let CARD = null, CUP = "16oz", makeRid = "", makeFor = null;    // 연습 · 만들기 중인 카드, 컵, 참고 레시피, 다시 만드는 카드
let rec = [], armed = {}, picking = null;                       // 누른 기록, 도구별로 고른 재료, 재료 고르는 중인 도구
let layers = [], iceG = 0, whipN = 0, drizN = 0, lidOn = false;
let pourK = null, pourI = null, pourV = 0, pourT = null, espoT = null, stirT = null, busy = false, pourBtn = null;
let tidyRows = [], tidyMeta = null, selId = null, delArm = null;
function cap(){ return CUPS[CUP] || 473; }
function resetCup(){ layers = []; iceG = 0; whipN = 0; drizN = 0; lidOn = false; }
function say(t, bad){ const b = B("bubble"); b.textContent = t; b.classList.toggle("bad", !!bad); }
/* 레시피의 컵 칸("16oz", "Tall 355ml" …)에서 가장 가까운 컵을 고른다. 못 찾으면 16oz */
function cupOf(d){
  const t = (d.cups || []).join(" ");
  let m = /(\d+(?:\.\d+)?)\s*oz/i.exec(t), want = 0;
  if(m) want = +m[1] * 29.57;
  else if((m = /(\d{3})\s*ml/i.exec(t))) want = +m[1];
  if(!want) return "16oz";
  let best = "16oz", bd = 1e9;
  Object.keys(CUPS).forEach(c=>{ const dd = Math.abs(CUPS[c] - want); if(dd < bd){ bd = dd; best = c; } });
  return best;
}

/* ───── 높이 계산 ───── */
const ICE_BULK = 240 / 130, ICE_SOLID = 1 / 0.92;   // 얼음 130g 은 틈 때문에 컵에서 약 240ml 높이
function liquidMl(){ let s = 0; layers.forEach(L=>{ s += L.ml; }); return s; }
function iceTop(){ return iceG * ICE_BULK; }
function liquidTop(){ const Lq = liquidMl(), bulk = iceTop(), gap = bulk - iceG * ICE_SOLID; if(Lq <= gap) return gap > 0 ? Lq * bulk / gap : 0; return bulk + (Lq - gap); }
/* liquidTop 을 거꾸로: 컵 높이 h(ml) 까지 차려면 액체가 몇 ml 있어야 하나 */
function liquidFor(h){ const bulk = iceTop(), gap = bulk - iceG * ICE_SOLID; if(h <= bulk) return bulk > 0 ? h * gap / bulk : h; return gap + (h - bulk); }
function cupFrac(k){ return (k === "ice" ? iceTop() : liquidTop()) / cap(); }
function addLayer(k, ml, col){ const last = layers[layers.length - 1]; if(last && last.k === k && last.col === col) last.ml += ml; else layers.push({k:k, ml:ml, col:col}); }
function pourInto(k, dBase, col){
  const d = T[k];
  if(k === "ice") iceG += dBase;
  else if(k === "whip") whipN += dBase;
  else if(k === "drizzle") drizN += dBase;
  else addLayer(k, d.ml ? dBase * d.ml : dBase, col || d.col);
}

/* ───── 컵 그리기 (40x56 도트) ───── */
function cupSVG(stream, target){
  const top = 8, bot = 52, l = 6, r = 33, inner = bot - top;
  let o = '<svg class="bx-sp" viewBox="0 0 40 56" shape-rendering="crispEdges" aria-hidden="true">';
  o += '<rect x="' + (l - 1) + '" y="' + top + '" width="' + (r - l + 3) + '" height="' + (inner + 1) + '" fill="#FFFFFF" fill-opacity=".55"/>';
  const c = cap(), Lq = liquidMl(), lh = Math.min(inner, Math.round(liquidTop() / c * inner));
  let y = bot;
  layers.forEach(L=>{
    const h = Lq ? Math.max(1, Math.round(L.ml / Lq * lh)) : 0, y0 = Math.max(bot - lh, y - h);
    if(y - y0 <= 0) return;
    o += '<rect x="' + l + '" y="' + y0 + '" width="' + (r - l + 1) + '" height="' + (y - y0) + '" fill="' + L.col + '"/>';
    if(L.k === "soda") for(let i = 0; i < 5; i++) o += '<rect x="' + (l + 3 + i * 5) + '" y="' + (y0 + 1 + (i * 3) % Math.max(1, y - y0 - 1)) + '" width="1" height="1" fill="#FFFFFF"/>';
    if(L.k === "shot") o += '<rect x="' + l + '" y="' + y0 + '" width="' + (r - l + 1) + '" height="1" fill="#C98A4A"/>';
    if(L.k === "steam") o += '<rect x="' + l + '" y="' + y0 + '" width="' + (r - l + 1) + '" height="' + Math.min(2, y - y0) + '" fill="#FFFFFF"/>';
    y = y0;
  });
  const ih = Math.min(inner, Math.round(iceTop() / c * inner)), rows = Math.floor(ih / 6.5), cols = [[l + 1, l + 9, l + 17], [l + 5, l + 13, l + 21]];
  for(let rr = 0; rr < rows; rr++){ const cs = cols[rr % 2]; for(let q = 0; q < cs.length; q++){ const cx = cs[q], cy = bot - 6 - rr * 6.5;
    o += '<rect x="' + cx + '" y="' + cy + '" width="6" height="6" fill="#EAF6FB" fill-opacity=".75" stroke="#8FB7CC" stroke-width=".6"/><rect x="' + (cx + 1) + '" y="' + (cy + 1) + '" width="2" height="1" fill="#FFFFFF"/>'; } }
  let surf = Math.min(bot - lh, bot - ih);       // 휘핑 · 드리즐은 맨 위에
  if(whipN > 0){ const wh = Math.min(12, 3 + whipN * 3), wy = Math.max(1, surf - wh);
    o += '<rect x="' + (l + 1) + '" y="' + (wy + 2) + '" width="' + (r - l - 1) + '" height="' + (wh - 2) + '" fill="#FFFDF7" stroke="#D8CDBD" stroke-width=".5"/><rect x="' + (l + 4) + '" y="' + wy + '" width="' + (r - l - 7) + '" height="2" fill="#FFFDF7"/><rect x="' + (l + 9) + '" y="' + (wy - 1) + '" width="' + (r - l - 17) + '" height="1" fill="#FFFDF7"/>';
    surf = wy; }
  for(let dz = 0; dz < drizN && dz < 4; dz++){ const dy = surf + 1 + dz * 2; for(let x = l + 2; x < r - 1; x += 4) o += '<rect x="' + x + '" y="' + (dy + ((x / 4) % 2)) + '" width="3" height="1" fill="' + (drizCol || "#5A3420") + '"/>'; }
  if(stream && stream.k !== "ice" && stream.k !== "whip" && stream.k !== "drizzle" && stream.c) o += '<rect x="' + (stream.k === "shot" ? 22 : 19) + '" y="0" width="2" height="' + Math.max(0, bot - lh) + '" fill="' + stream.c + '"/>';
  if(stream && stream.k === "ice") o += '<rect x="18" y="0" width="4" height="4" fill="#EAF6FB" stroke="#8FB7CC" stroke-width=".6"/>';
  (CUPLINE[CUP] || []).forEach((f, i)=>{ const yy = Math.round(bot - f * inner); o += '<rect x="' + (r - 3) + '" y="' + yy + '" width="4" height="1" fill="#8A7A6A"/>';
    for(let d = 0; d <= i; d++) o += '<rect x="' + (r - 5 - 2 * d) + '" y="' + (yy - 2) + '" width="1" height="1" fill="#8A7A6A"/>'; });
  if(target != null){ const ty = Math.round(bot - Math.min(1, target) * inner); for(let x2 = l - 4; x2 <= r + 4; x2 += 3) o += '<rect x="' + x2 + '" y="' + ty + '" width="2" height="1" fill="#C4574A"/>'; }
  o += '<rect x="' + (l - 2) + '" y="' + (top - 2) + '" width="' + (r - l + 5) + '" height="2" fill="#4A423A"/>';
  o += '<rect x="' + (l - 2) + '" y="' + top + '" width="1" height="' + inner + '" fill="#4A423A"/><rect x="' + (r + 2) + '" y="' + top + '" width="1" height="' + inner + '" fill="#4A423A"/>';
  o += '<rect x="' + (l - 1) + '" y="' + bot + '" width="' + (r - l + 3) + '" height="2" fill="#4A423A"/>';
  o += '<rect x="' + (l - 1) + '" y="' + top + '" width="1" height="' + inner + '" fill="#FFFFFF" fill-opacity=".6"/>';
  if(liquidTop() > c + 1 && layers.length) o += '<rect x="' + (l - 3) + '" y="' + (top - 3) + '" width="' + (r - l + 7) + '" height="1" fill="' + layers[layers.length - 1].col + '"/>';
  if(lidOn){ o += '<rect x="' + (l - 4) + '" y="' + (top - 4) + '" width="' + (r - l + 9) + '" height="2" fill="#4A423A"/><rect x="' + (l - 1) + '" y="' + (top - 6) + '" width="' + (r - l + 3) + '" height="2" fill="#F4F1EA" stroke="#4A423A" stroke-width=".6"/><rect x="' + (r - 8) + '" y="' + (top - 8) + '" width="3" height="2" fill="#4A423A"/>'; }
  return o + "</svg>";
}
let drizCol = null;
function renderCup(stream, target){ B("cup").innerHTML = cupSVG(stream, target); }

/* 음료 카드의 단계를 그대로 부어 본 컵 그림(목록 · 결과). 지금 컵 상태는 건드리지 않는다 */
function cardCup(card){
  const keep = [layers, iceG, whipN, drizN, lidOn, CUP, drizCol];
  resetCup(); CUP = card.cup; drizCol = null;
  card.steps.forEach(a=>pourStep(a));
  const svg = cupSVG(null, null);
  layers = keep[0]; iceG = keep[1]; whipN = keep[2]; drizN = keep[3]; lidOn = keep[4]; CUP = keep[5]; drizCol = keep[6];
  return svg;
}
function pourStep(a){
  const d = T[a.k], col = NOAMT[a.k] ? null : ingCol(a);
  if(a.k === "stir"){ if(layers.length) layers = [{k:"mix", ml:liquidMl(), col:COL_MIX}]; return; }
  if(a.k === "lid"){ lidOn = true; return; }
  if(a.k === "hand") return;
  if(a.k === "shot"){ addLayer("shot", 18 * a.t, col); return; }
  if(a.k === "drizzle") drizCol = col;
  if(a.f != null){
    if(a.k === "ice"){ iceG = Math.max(iceG, a.f * cap() / ICE_BULK); return; }
    const need = liquidFor(a.f * cap()) - liquidMl(); if(need > 0) addLayer(a.k, need, col); return;
  }
  pourInto(a.k, a.t * d.u[a.u], col);
}

/* ───── 판정 ───── */
/* g: 0 딱 맞음 · 1 아쉬움 · 2 다시. 컵 높이는 ±5% 까지 딱 맞음, ±10% 까지 아쉬움 */
function judge(v, a){
  const d = T[a.k];
  let g, over;
  if(a.f != null){ if(a.k !== "ice" && v > 1.01) return ["넘쳤츄!", "bad", false, "넘침", 2]; const df = Math.abs(v - a.f); over = v > a.f; g = df <= .05 ? 0 : df <= .1 ? 1 : 2; }
  else if(d.count){ const tb = Math.round(a.t * d.u[a.u]), diff = Math.abs(Math.round(v) - tb); over = v > tb; g = diff === 0 ? 0 : diff === 1 ? 1 : 2; }
  else{ const t = a.t * d.u[a.u] || 1, dr = Math.abs(v - t) / t; over = v > t; g = dr <= .1 ? 0 : dr <= .2 ? 1 : 2; }
  return g === 0 ? ["딱 맞았츄!", "ok", true, "딱 맞음", 0] : g === 1 ? [(over ? "조금 많츄" : "조금 적츄"), "bad", false, "아쉬움", 1] : [(over ? "너무 많츄!" : "너무 적츄!"), "bad", false, "다시 연습", 2];
}
function fmt(v, u){ return (u === "펌프" || u === "회전" || u === "샷" || v >= 20) ? String(Math.round(v)) : String(Math.round(v * 10) / 10); }
function amtTxt(a){ if(a.f != null) return a.lab; return (Math.round(a.t * 10) / 10) + a.u; }
/* 기록 한 줄이 그 단계의 양으로 얼마였나(컵 높이 단계면 높이, 아니면 기록 단위) */
function recVal(a, x){ return a.f != null ? (x.frac != null ? x.frac : 0) : x.base; }

/* 단계(정답)와 누른 기록 맞추기. 재료 · 양 · 순서를 따로 본다.
   - 단계마다 아직 안 쓴 같은 도구 기록 중 재료가 같은 것 → 없으면 같은 도구 아무거나(앞에서부터)
   - 순서: 묶음(w) 안은 기록 순으로 줄 세운 뒤, 가장 긴 오름차순(LIS)에 든 단계만 순서 ○
   돌려주는 것: rows[{a, x, ing, amt, ord}] (0 ○ · 1 △ · 2 ×), extra[기록], score */
function grade(steps, recs){
  const used = recs.map(()=>false), m = steps.map(()=>-1);
  /* 재료까지 같은 짝을 모든 단계에 먼저 맺고, 남은 단계만 같은 도구 아무거나로(뒤 단계 몫을 앞 단계가 가져가지 않게) */
  [true, false].forEach(strict=>steps.forEach((a, si)=>{
    if(m[si] >= 0) return;
    for(let j = 0; j < recs.length; j++) if(!used[j] && recs[j].k === a.k && (!strict || NOAMT[a.k] || sameIng(a, recs[j]))){ used[j] = true; m[si] = j; return; }
  }));
  /* 묶음 번호 → 묶음 안을 기록 순으로 */
  const blocks = []; steps.forEach((a, si)=>{ if(a.w && blocks.length) blocks[blocks.length - 1].push(si); else blocks.push([si]); });
  const seq = [];
  blocks.forEach(bl=>{ bl.filter(si=>m[si] >= 0).sort((p, q)=>m[p] - m[q]).forEach(si=>seq.push(si)); });
  /* LIS (같은 묶음 안 순서는 이미 맞춰 두었다) */
  const L = seq.map(()=>1), prev = seq.map(()=>-1);
  for(let i = 0; i < seq.length; i++) for(let j = 0; j < i; j++) if(m[seq[j]] < m[seq[i]] && L[j] + 1 > L[i]){ L[i] = L[j] + 1; prev[i] = j; }
  const inLis = {};
  let bi = -1; L.forEach((v, i)=>{ if(bi < 0 || v > L[bi]) bi = i; });
  while(bi >= 0){ inLis[seq[bi]] = 1; bi = prev[bi]; }
  const rows = steps.map((a, si)=>{
    const x = m[si] >= 0 ? recs[m[si]] : null;
    if(!x) return {a:a, x:null, ing:2, amt:2, ord:2};
    const ing = NOAMT[a.k] || sameIng(a, x) ? 0 : 2;
    let amt = 0;
    if(a.k === "shot") amt = x.t === a.t ? (x.sec == null || (x.sec >= 25 && x.sec <= 30) ? 0 : 1) : 2;
    else if(!NOAMT[a.k]) amt = judge(recVal(a, x), a)[4];
    return {a:a, x:x, ing:ing, amt:amt, ord:inLis[si] ? 0 : 2};
  });
  const extra = recs.filter((x, j)=>!used[j]);
  let pts = 0; rows.forEach(r=>{ [r.ing, r.amt, r.ord].forEach(g=>{ pts += g === 0 ? 1 : g === 1 ? .5 : 0; }); });
  const score = rows.length ? Math.max(0, Math.min(100, Math.round(pts / (rows.length * 3) * 100) - extra.length * 5)) : 0;
  return {rows:rows, extra:extra, score:score};
}

/* ───── 단계 글 ───── */
function stepText(a){
  if(a.k === "hand") return a.text || "손으로";
  if(a.k === "stir") return "잘 저어 섞기";
  if(a.k === "lid") return "뚜껑 덮기";
  const n = ingName(a), amt = a.f != null ? (a.lab === "가득" ? "가득" : a.lab + "까지") : amtTxt(a);
  switch(a.k){
    case "ice": return n + " " + amt + " 담기";
    case "shot": return shotTxt(a) + " 추출해 붓기";
    case "syrup": case "powder": return n + " " + amt + " 넣기";
    case "whip": return n + " " + amt + " 올리기";
    case "drizzle": return n + " " + amt + " 뿌리기";
    default: return n + " " + amt + " 붓기";
  }
}
function recLine(x){
  if(x.k === "hand") return x.text ? "손으로 · " + x.text : "손으로";
  if(x.k === "stir") return "젓기";
  if(x.k === "lid") return "뚜껑";
  if(x.k === "shot") return shotTxt(x) + (x.sec != null ? " · " + x.sec + "초" : "");
  const d = T[x.k];
  return ingName(x) + " " + fmt(x.base, d.base) + d.base + (x.frac != null ? " (컵 " + Math.round(x.frac * 100) + "%)" : "");
}

/* ───── 예시 한 잔(저장 안 됨) ───── */
const EX = {id:"ex", ex:true, name:"바닐라 라떼", temp:"ICE", cup:"16oz", steps:[{k:"ice", f:1, lab:"가득"}, {k:"syrup", i:"syrup.vanilla", t:3, u:"펌프"}, {k:"milk", i:"milk.milk", f:.45, lab:"1번 선"}, {k:"shot", i:"shot.esp", t:2, u:"샷"}, {k:"lid"}]};
function allCards(){ return cards().concat([EX]); }
function cardById(id){ return allCards().filter(c=>c.id === id)[0] || null; }
function recipeOf(rid){ return rid ? RECIPES.filter(r=>r.id === rid)[0] || null : null; }

/* ───── 연습 · 만들기 공통: 누른 것을 적는다 ───── */
function stopTimers(){
  if(pourT){ clearInterval(pourT); pourT = null; }
  if(espoT){ clearInterval(espoT); espoT = null; }
  if(stirT){ clearTimeout(stirT); stirT = null; }
  pourK = null; busy = false;
  const e = document.querySelector("#s-bar .bx-espo"); if(e) e.remove();
  document.querySelectorAll("#s-bar .bx-tool.press").forEach(t=>t.classList.remove("press"));
}
function recAdd(x){
  const last = rec[rec.length - 1];
  if(rec.length >= MAX_STEPS && !(last && last.k === x.k && (last.i || "") === (x.i || "") && !NOAMT[x.k] && x.k !== "shot")){ say("단계는 " + MAX_STEPS + "개까지츄", true); return; }
  if(last && last.k === x.k && (last.i || "") === (x.i || "") && !NOAMT[x.k] && x.k !== "shot"){ last.base += x.base; last.frac = x.frac; }
  else rec.push(x);
  renderLog(); renderSteps(); hint();
}
function replay(){
  resetCup(); drizCol = null;
  rec.forEach(x=>{
    if(x.k === "stir"){ if(layers.length) layers = [{k:"mix", ml:liquidMl(), col:COL_MIX}]; }
    else if(x.k === "lid") lidOn = true;
    else if(x.k === "shot") addLayer("shot", 18 * x.t, ingCol(x));
    else if(x.k !== "hand"){ if(x.k === "drizzle") drizCol = ingCol(x); pourInto(x.k, x.base, ingCol(x)); }
  });
  renderCup(null, curTarget());
}
/* 보며 연습: 지금 할 수 있는 단계들 — 아직 안 맞춘 첫 묶음 안의 단계(묶음이면 여럿) */
function nextSteps(){
  if(!CARD) return [];
  const g = grade(CARD.steps, rec), left = [];
  let started = false, stop = false;
  CARD.steps.forEach((a, si)=>{
    if(stop) return;
    if(!a.w && started){ stop = true; return; }
    if(!g.rows[si].x){ left.push(a); started = true; }
    else if(started && a.w) return;
  });
  return left;
}
/* 바로 앞에 부은 것을 이어 붓는 중인가(같은 도구 · 재료) */
function contOf(k, i){ const last = rec[rec.length - 1]; return !!last && last.k === k && (last.i || "") === (i || "") && !NOAMT[k] && k !== "shot"; }
function expectFor(k){ return nextSteps().filter(a=>a.k === k)[0] || null; }
function curTarget(){
  if(view !== "prac" || mode !== "see") return null;
  const last = rec[rec.length - 1];
  const a = pourK ? (contOf(pourK, pourI) ? lastStepFor(last) : expectFor(pourK)) : nextSteps()[0];
  return a && a.f != null ? a.f : null;
}
function lastStepFor(x){ if(!x || !CARD) return null; const g = grade(CARD.steps, rec); const r = g.rows.filter(r=>r.x === x)[0]; return r ? r.a : null; }
function clearHints(){ document.querySelectorAll("#s-bar .bx-tool").forEach(t=>t.classList.remove("glow")); }
function hint(){
  clearHints();
  if(view !== "prac" || mode !== "see") return;
  const ks = nextSteps().map(a=>a.k);
  document.querySelectorAll("#s-bar .bx-tool").forEach(t=>{ if(ks.indexOf(t.dataset.k) >= 0) t.classList.add("glow"); });
}

/* ───── 도구 누름 ───── */
function down(btn, e){
  if(busy || pourK) return;
  e.preventDefault();
  const k = btn.dataset.k, d = T[k];
  if(view !== "make" && view !== "prac") return;
  if(e.target && e.target.closest && e.target.closest(".bx-ich")){ openPicker(k); return; }
  const multi = !NOAMT[k] && ingList(k).length > 1, iNow = NOAMT[k] ? undefined : (armed[k] || (multi ? undefined : ingList(k)[0].id));
  /* 보며 연습: 차례가 아닌 도구는 막는다(이어 붓기는 된다) */
  if(view === "prac" && mode === "see" && !(iNow && contOf(k, iNow)) && !expectFor(k)){
    const nx = nextSteps()[0];
    btn.classList.remove("wrong"); void btn.offsetWidth; btn.classList.add("wrong"); haptic("error");
    say(nx ? "지금은 " + (NOAMT[nx.k] ? nm(nx.k) : ingName(nx)) + " 차례츄!" : "다 넣었츄! 다 만들었츄를 눌러 주츄", true);
    return;
  }
  if(multi && !armed[k]){ openPicker(k); return; }
  closePicker();
  const i = iNow;
  if(view === "prac" && mode === "see" && !NOAMT[k] && !contOf(k, i)){
    const ex = expectFor(k);
    if(ex && !sameIng(ex, {k:k, i:i})){ haptic("error"); say(ingName(ex) + "이츄! 재료를 바꿔 주츄", true); openPicker(k); return; }
  }
  haptic("selection");
  if(k === "hand"){ if(view === "make") freeHand(); else{ recAdd({k:"hand"}); say("했츄!"); } return; }
  if(k === "lid"){ lidOn = true; recAdd({k:"lid"}); renderCup(null, curTarget()); say("뚜껑 딱!"); return; }
  if(k === "stir"){
    busy = true; say("휘휘 젓는 중…"); btn.classList.add("press");
    stirT = setTimeout(()=>{ stirT = null; btn.classList.remove("press"); busy = false;
      if(layers.length) layers = [{k:"mix", ml:liquidMl(), col:COL_MIX}];
      recAdd({k:"stir"}); say("잘 저었츄"); renderCup(null, curTarget()); }, 900);
    return;
  }
  if(k === "shot"){ espresso(i); return; }
  if(k === "drizzle") drizCol = ingCol({k:k, i:i});
  const col = ingCol({k:k, i:i});
  pourK = k; pourI = i; pourBtn = btn; pourV = 0; btn.classList.add("press");
  say(k === "syrup" ? "칙, 칙…" : k === "ice" ? "달그락…" : k === "whip" ? "뱅글뱅글…" : k === "powder" ? "톡, 톡…" : k === "drizzle" ? "주르륵…" : "쪼르르…");
  if(btn.setPointerCapture && e.pointerId != null){ try{ btn.setPointerCapture(e.pointerId); }catch(_){} }
  const prevBase = contOf(k, i) ? rec[rec.length - 1].base : 0;
  const step = ()=>{
    /* 얼음이 든 컵은 붓는 물이 얼음 틈부터 채워 눈금이 빨리 오른다. 틈을 채우는 동안은 덜 부어 눈금이 얼음 없을 때와 같은 빠르기로 오르게 한다 */
    let dv = d.count ? 1 : d.rate;
    if(d.fill && k !== "ice" && iceG > 0){ const gap = iceTop() - iceG * ICE_SOLID; if(gap > 0 && liquidMl() < gap) dv = dv * gap / iceTop(); }
    pourInto(k, dv, col); pourV += dv;
    meter(k, i, prevBase + pourV);
    renderCup({k:k, c:col}, curTarget());
  };
  step(); pourT = setInterval(step, d.count ? d.tick : 60);
}
function up(btn){
  if(!pourK || btn !== pourBtn) return;
  clearInterval(pourT); pourT = null; btn.classList.remove("press");
  const k = pourK, i = pourI, d = T[k];
  pourK = null; pourBtn = null;
  recAdd({k:k, i:i, base:pourV, frac:d.fill ? cupFrac(k) : null});
  renderCup(null, curTarget());
  say(view === "make" ? "적었츄" : mode === "see" ? "더 넣거나 다음으로 가츄" : "이만큼이면 될까츄?");
}
/* 계량: 붓는 양 · (보며 연습이면) 목표 */
function meter(k, i, v){
  const d = T[k], x = {k:k, i:i}, a = view === "prac" && mode === "see" ? (contOf(k, i) ? lastStepFor(rec[rec.length - 1]) : expectFor(k)) : null;
  let html;
  if(d.fill && (a ? a.f != null : true)){
    html = '<div class="bx-lbl">' + esc(ingName(x)) + ' · 컵 높이</div><div class="bx-big">' + Math.round(cupFrac(k) * 100) + '<span class="bx-tg">%</span></div>' + (a && a.f != null ? '<div class="bx-tg">목표 ' + esc(a.lab) + '</div>' : "");
  }else{
    html = '<div class="bx-lbl">' + esc(ingName(x)) + '</div><div class="bx-big">' + fmt(v, d.base) + '<span class="bx-tg">' + esc(d.base) + '</span></div>' + (a ? '<div class="bx-tg">목표 ' + esc(amtTxt(a)) + '</div>' : "");
  }
  B("meter").innerHTML = html;
}

/* ───── 재료 고르기 (붓기 카드 자리에 뜬다) ───── */
function openPicker(k){
  picking = k;
  const ex = view === "prac" && mode === "see" ? expectFor(k) : null;
  const h = B("hand");
  h.innerHTML = '<div class="bx-pickr"><div class="bx-pkh">' + draw(ICON[k], IP) + '<b>' + esc(nm(k)) + ' — 무엇을 넣을까요?</b><button class="bx-mini" id="bar-pkX" aria-label="닫기">✕</button></div><div class="bx-ings">' +
    ingList(k).map(x=>'<button class="bx-ingb' + (armed[k] === x.id ? " on" : "") + (ex && sameIng(ex, {k:k, i:x.id}) ? " glow" : "") + (x.mine ? " mine" : "") + '" data-id="' + esc(x.id) + '"><i class="bx-sw" style="background:' + x.c + '"></i>' + esc(x.n) + '</button>').join("") + '</div></div>';
  h.querySelectorAll(".bx-ingb").forEach(b=>{ b.onclick = ()=>{ armed[k] = b.dataset.id; haptic("selection"); closePicker(); renderTools(); say(ingOf(armed[k], k).n + "! 꾹 눌러 넣어 주츄"); }; });
  B("pkX").onclick = closePicker;
}
function closePicker(){ if(picking == null) return; picking = null; renderHand(); }
function renderHand(){
  const h = B("hand");
  if(picking != null) return;
  h.innerHTML = '<div class="bx-handcard idle"><p>꾹 누르는 동안 붓고, 떼면 멈춰요<br><span class="bx-sm">▾ 를 누르면 재료를 바꿔요</span></p></div>';
}

/* ───── 에스프레소: 샷 고르기 → 도징 → 탬핑 → 추출. 시간은 4배 빠르게 흐른다 ───── */
function espresso(i){
  busy = true;
  const d = document.createElement("div"); d.className = "bx-espo"; B("stage").appendChild(d);
  const ex = view === "prac" && mode === "see" ? expectFor("shot") : null;
  let phase = -1, shots = 2, t0 = 0, sec = 0;
  const paint = ()=>{
    if(phase === -1){
      d.innerHTML = '<div class="bx-lab">몇 샷 뽑을까츄?</div><div class="bx-opts">' + [1, 2, 3, 4].map(n=>'<button class="bx-btn' + (ex && ex.t === n ? "" : " ghost") + '" data-n="' + n + '">' + n + '샷</button>').join("") + '</div>';
      d.querySelectorAll("button").forEach(b=>{ b.onclick = ()=>{ shots = +b.dataset.n; phase = 0; paint(); }; });
      return;
    }
    if(phase === 0) d.innerHTML = '<div class="bx-lab">원두 ' + (shots > 1 ? 18 : 9) + 'g 도징</div><button class="bx-btn">도징</button>';
    if(phase === 1) d.innerHTML = '<div class="bx-lab">수평 탬핑</div><button class="bx-btn">꾹 탬핑</button>';
    if(phase === 2) d.innerHTML = '<div class="bx-lab">그룹헤드 체결 · 추출</div><button class="bx-btn">추출 시작</button>';
    if(phase === 3) d.innerHTML = '<div class="bx-lab">' + shots + '샷 추출 중</div><div class="bx-clock" id="bar-eClk">0초</div><div class="bx-ebar"><b></b><i id="bar-eBar"></i></div><button class="bx-btn">멈추기</button><div class="bx-sm">' + (mode === "see" || view === "make" ? "25~30초에 멈추츄" : "몇 초였는지 기억나츄?") + '</div>';
    d.querySelector("button").onclick = adv;
  };
  const adv = ()=>{
    if(phase < 2){ phase++; haptic("soft"); say(phase === 1 ? "평평하게 꾹!" : "체결 완료츄"); paint(); return; }
    if(phase === 2){
      phase = 3; paint(); say("쪼르르…"); t0 = Date.now();
      espoT = setInterval(()=>{ sec = (Date.now() - t0) / 1000 * 4; const c = B("eClk"); if(!c) return; c.textContent = Math.floor(sec) + "초"; B("eBar").style.width = Math.min(100, sec / 40 * 100) + "%"; if(sec >= 40) adv(); }, 50);
      return;
    }
    clearInterval(espoT); espoT = null; d.remove(); busy = false;
    const s = Math.floor(sec), ok = s >= 25 && s <= 30;
    B("meter").innerHTML = '<div class="bx-lbl">추출 시간</div><div class="bx-big">' + s + '<span class="bx-tg">초</span></div><div class="bx-verdict ' + (ok ? "ok" : "bad") + '">' + (ok ? "딱 좋음" : "25~30초") + '</div>';
    say(ok ? "크레마가 살아 있츄!" : s < 25 ? "너무 빨랐츄, 묽겠츄" : "너무 오래 뽑았츄, 쓰겠츄", !ok);
    recAdd({k:"shot", i:i, t:shots, u:"샷", sec:s});
    replay();
  };
  paint();
}
function freeHand(){
  const h = B("hand");
  picking = "hand";
  h.innerHTML = '<div class="bx-handcard"><input class="bx-inp" id="bar-hTxt" placeholder="예: 자몽 슬라이스 올리기" maxlength="30"><button class="bx-btn" id="bar-hAdd">적기</button></div>';
  const inp = B("hTxt"); inp.focus();
  const add = ()=>{ const v = inp.value.trim(); if(!v){ say("뭘 했는지 적어 주츄", true); return; } picking = null; recAdd({k:"hand", text:v}); renderHand(); say("적어 뒀츄"); };
  B("hAdd").onclick = add; inp.onkeydown = e=>{ if(e.key === "Enter") add(); };
}

/* ───── 만들기 · 연습 화면 ───── */
function renderTools(){
  B("tools").innerHTML = ORDER.map(k=>{
    const multi = !NOAMT[k] && ingList(k).length > 1, cur = multi && armed[k] ? ingOf(armed[k], k) : null;
    return '<button class="bx-tool" data-k="' + k + '">' + draw(ICON[k], IP) + '<span>' + esc(nm(k)) + '</span><small>' + esc(cur ? cur.n : multi ? "고르기" : T[k].sub) + '</small>' + (multi ? '<i class="bx-ich" aria-label="재료 바꾸기">▾</i>' : "") + '</button>';
  }).join("");
  B("tools").querySelectorAll(".bx-tool").forEach(b=>{
    b.addEventListener("pointerdown", e=>down(b, e));
    ["pointerup", "pointercancel", "pointerleave"].forEach(ev=>b.addEventListener(ev, ()=>up(b)));
    b.addEventListener("contextmenu", e=>e.preventDefault());
  });
  hint();
}
/* 위 칸: 만들기는 참고 레시피 · 컵, 연습은 레시피 보기(열면 보며로) */
function renderTop(){
  const r = view === "make" ? recipeOf(makeRid) : recipeOf(CARD && CARD.rid);
  const opts = '<option value="">레시피 없이</option>' + RECIPES.map(x=>'<option value="' + esc(x.id) + '"' + (x.id === makeRid ? " selected" : "") + '>' + esc(x.name) + (x.temp ? " · " + esc(x.temp) : "") + '</option>').join("");
  B("top").innerHTML = (view === "make" ? '<div class="bx-pick"><span class="bx-lb">참고</span><span class="bx-selwrap"><select id="bar-refSel" class="bx-inp" aria-label="참고할 레시피">' + opts + '</select></span>' +
      '<span class="bx-selwrap bx-cupsel"><select id="bar-cupSel" class="bx-inp" aria-label="컵"' + (rec.length ? " disabled" : "") + '>' + Object.keys(CUPS).map(c=>'<option' + (c === CUP ? " selected" : "") + '>' + c + '</option>').join("") + '</select></span></div>' : "") +
    (r ? '<details class="bx-rs bx-ref"' + (view === "make" ? " open" : "") + ' id="bar-ref"><summary>' + (view === "make" ? "레시피 참고 · " + esc(r.name) : "레시피 보기" + (mode === "mem" ? " (열면 보며로 바뀌어요)" : "")) + '</summary><ol>' + r.steps.map(s=>"<li>" + esc(s) + "</li>").join("") + '</ol></details>' : "");
  if(B("refSel")) B("refSel").onchange = function(){ makeRid = this.value; const rr = recipeOf(makeRid); if(rr && !rec.length){ CUP = rr.cup; replay(); } renderTop(); };
  if(B("cupSel")) B("cupSel").onchange = function(){ CUP = this.value; replay(); };
  const det = B("ref");
  if(det && view === "prac") det.addEventListener("toggle", ()=>{ if(det.open && mode === "mem"){ setMode("see"); renderSteps(); hint(); renderCup(null, curTarget()); say("보며 연습으로 바꿨츄"); } });
}
function renderSteps(){
  const el = B("steps");
  if(view === "make"){ el.hidden = true; return; }
  el.hidden = false;
  if(mode === "mem"){ el.innerHTML = '<div class="bx-hidden">외워서 하는 중 · ' + CARD.steps.length + '단계</div>'; return; }
  const g = grade(CARD.steps, rec), nx = nextSteps();
  el.innerHTML = "<ol>" + CARD.steps.map((a, si)=>'<li class="' + (g.rows[si].x ? "done" : nx.indexOf(a) >= 0 ? "now" : "") + (a.w ? " w" : "") + '">' + esc(stepText(a)) + "</li>").join("") + "</ol>";
  const li = el.querySelector("li.now");
  if(li && el.scrollHeight > el.clientHeight) el.scrollTop += li.getBoundingClientRect().top - el.getBoundingClientRect().top - 8;
}
function renderLog(){
  const el = B("freeLog"), mk = view === "make";
  if(B("cupSel")) B("cupSel").disabled = !!rec.length;     // 붓기 시작하면 컵을 못 바꾼다(적힌 높이가 그 컵 기준)
  el.innerHTML = '<div class="bx-lab2">' + (mk ? "만든 순서" : "넣은 것") + '</div>' +
    (rec.length ? '<ol>' + rec.map(x=>"<li>" + esc(recLine(x)) + "</li>").join("") + '</ol>' : '<p class="bx-empty">' + (mk ? "레시피를 보면서 도구를 눌러 만들어 보자츄. 누른 순서대로 적혀요." : "도구를 눌러 만들어 보자츄.") + '</p>') +
    '<div class="bx-rbtns"><span class="bx-row"><button class="bx-btn ghost" id="bar-fUndo"' + (rec.length ? "" : " disabled") + '>되돌리기</button><button class="bx-btn ghost" id="bar-fReset">처음부터</button></span><button class="bx-btn" id="bar-fDone"' + (rec.length ? "" : " disabled") + '>다 만들었츄</button></div>';
  B("fUndo").onclick = ()=>{ if(busy) return; rec.pop(); replay(); renderLog(); renderSteps(); hint(); say("하나 되돌렸츄"); };
  B("fReset").onclick = ()=>{ if(busy) return; rec = []; replay(); renderLog(); renderSteps(); hint(); B("meter").innerHTML = ""; say("새 컵이츄"); };
  B("fDone").onclick = ()=>{ if(busy || !rec.length) return; if(mk) openTidyFromRec(); else finish(); };
}
function enterPlay(){
  stopTimers(); armed = {}; picking = null; rec = []; resetCup(); drizCol = null;
  show("play"); renderTop(); renderSteps(); renderLog(); renderHand(); renderTools();
  B("meter").innerHTML = ""; renderCup(null, curTarget());
  B("modeBox").hidden = view !== "prac"; B("re").hidden = false;
}
function startMake(card){
  makeFor = card ? card.id : null;
  if(card){ makeRid = card.rid || ""; CUP = card.cup; }
  view = "make"; setTabs("make");
  B("name").textContent = card ? card.name + " 다시 만들기" : "새 음료 만들기"; B("sub").textContent = "만든 순서대로 정답이 돼요";
  enterPlay();
  say(makeRid ? "레시피를 보며 만들어 보자츄!" : "평소 만드는 대로 눌러 보자츄!");
}
function startPrac(card){
  CARD = card; CUP = card.cup;
  view = "prac"; setTabs("list");
  B("name").textContent = card.name;
  B("sub").textContent = [card.ex ? "예시" : "", card.temp, card.cup].filter(Boolean).join(" · ");
  enterPlay();
  say(mode === "see" ? "순서대로 해 보자츄!" : "레시피를 떠올려 보자츄!");
}

/* ───── 결과 (베타라 치즈는 없다) ───── */
function finish(){
  const g = grade(CARD.steps, rec), mk = v=>v === 0 ? '<td class="k ok">○</td>' : v === 1 ? '<td class="k mid">△</td>' : '<td class="k bad">×</td>';
  const sum = f=>g.rows.filter(r=>r[f] === 0).length;
  const rows = g.rows.map((r, i)=>{
    const a = r.a, x = r.x;
    let sub = "";
    if(!x) sub = "빠졌어요";
    else if(r.ing) sub = "넣은 것: " + recLine(x);
    else if(a.k === "shot") sub = "추출 " + x.sec + "초" + (x.t !== a.t ? " · " + x.t + "샷" : "");
    else if(r.amt && a.f != null) sub = "컵 " + Math.round(recVal(a, x) * 100) + "% / " + Math.round(a.f * 100) + "%";
    else if(r.amt) sub = fmt(x.base / T[a.k].u[a.u], a.u) + a.u + " / " + amtTxt(a);
    return '<tr><td class="bx-n">' + (i + 1) + '</td><td>' + esc(stepText(a)) + (a.w ? ' <i class="bx-wtag">묶음</i>' : "") + (sub ? '<small>' + esc(sub) + '</small>' : "") + '</td>' + mk(r.ing) + mk(r.amt) + mk(r.ord) + '</tr>';
  }).join("");
  const perfect = g.score === 100;
  if(!CARD.ex){
    const s = storeCopy(), c = s.cards.filter(x=>x.id === CARD.id)[0];
    if(c){ c.n = (c.n || 0) + 1; if(c.best == null || g.score > c.best) c.best = g.score; saveStore(s); CARD = cardById(CARD.id) || CARD; }
  }
  view = "result"; show("result"); B("modeBox").hidden = B("re").hidden = true;
  if(perfect) haptic("success");
  B("result").innerHTML = '<h2>' + (perfect ? "완벽한 한 잔이츄!" : "한 잔 완성!") + '</h2>' +
    '<div class="bx-rtop"><div class="bx-rcup">' + cupSVG(null, null) + '</div><div class="bx-score"><div><b>' + g.score + '</b><small>점</small></div><div><b>' + sum("ing") + '/' + g.rows.length + '</b><small>재료</small></div><div><b>' + sum("amt") + '/' + g.rows.length + '</b><small>양</small></div><div><b>' + sum("ord") + '/' + g.rows.length + '</b><small>순서</small></div></div></div>' +
    '<table><tr class="bx-hd"><td></td><td>단계</td><td>재료</td><td>양</td><td>순서</td></tr>' + rows + '</table>' +
    (g.extra.length ? '<p class="bx-extra">더 넣은 것: ' + esc(g.extra.map(recLine).join(", ")) + ' (하나에 -5점)</p>' : "") +
    '<p class="bx-note">베타라 채점이 틀릴 수 있어요. 정답이 이상하면 "단계 다듬기"에서 바로잡아요.</p>' +
    '<div class="bx-rbtns"><button class="bx-btn ghost" id="bar-rFix">단계 다듬기</button><button class="bx-btn ghost" id="bar-rMode">' + (mode === "see" ? "외워서 해 보기" : "보며 하기") + '</button><button class="bx-btn" id="bar-rAgain">다시 하기</button></div>';
  B("rAgain").onclick = ()=>startPrac(CARD);
  B("rMode").onclick = ()=>{ setMode(mode === "see" ? "mem" : "see"); startPrac(CARD); };
  B("rFix").onclick = ()=>openTidyFromCard(CARD);
  B("scroll").scrollTop = 0;
}

/* ───── 다듬기: 단계를 줄마다 고치고 음료 카드로 저장 ───── */
function defT(k){ const d = T[k]; return k === "shot" ? 2 : d.count ? 1 : (d.base === "g" || d.base === "ml") ? 100 : 1; }
function nice(v, u){
  if(u === "g" || u === "ml") return v >= 50 ? Math.round(v / 10) * 10 : Math.max(1, Math.round(v / 5) * 5);
  if(u === "oz" || u === "티스푼" || u === "테이블스푼" || u === "스쿱") return Math.max(.5, Math.round(v * 2) / 2);
  return Math.max(1, Math.round(v));
}
function fillVal(lab, cup){ const f = FILLS.filter(x=>x[0] === lab)[0]; if(!f) return null; return f[1] < 0 ? (CUPLINE[cup] || CUPLINE["16oz"])[-f[1] - 1] : f[1]; }
/* 만든 높이와 가까운 이름(가득 · n번 선 · n부)이 있으면 그걸로 */
function snapFill(fr, cup){
  let best = null, bd = .04;
  FILLS.forEach(f=>{ const v = fillVal(f[0], cup); const dd = Math.abs(v - fr); if(dd <= bd){ bd = dd; best = f[0]; } });
  return best;
}
function rowOf(a){ return {k:a.k, i:a.i, t:a.t != null ? a.t : (NOAMT[a.k] ? null : defT(a.k)), u:a.u || (T[a.k].u ? T[a.k].base : null), fill:a.f != null ? a.lab : null, f:a.f, text:a.text || "", w:!!a.w, base:null, frac:null}; }
function openTidyFromRec(){
  const r0 = recipeOf(makeRid), old = makeFor ? cardById(makeFor) : null;
  tidyRows = rec.map(x=>{
    const d = T[x.k], o = {k:x.k, i:x.i, text:x.text || "", w:false, base:x.base == null ? null : x.base, frac:x.frac == null ? null : x.frac, fill:null, f:null, t:null, u:d.u ? d.base : null};
    if(x.k === "shot"){ o.t = x.t; o.u = "샷"; }
    else if(!NOAMT[x.k]){ const sn = d.fill && x.frac != null ? snapFill(x.frac, CUP) : null; if(sn){ o.fill = sn; o.f = fillVal(sn, CUP); } else o.t = nice(x.base, d.base); }
    return o;
  });
  tidyMeta = {id:old && !old.ex ? old.id : null, name:old ? old.name : r0 ? r0.name : "", temp:old ? old.temp : r0 ? r0.temp : "ICE", cup:CUP, rid:makeRid};
  enterTidy();
}
function openTidyFromCard(card){
  tidyRows = card.steps.map(rowOf);
  tidyMeta = {id:card.ex ? null : card.id, name:card.name, temp:card.temp, cup:card.cup, rid:card.rid || ""};
  enterTidy();
}
function enterTidy(){
  stopTimers(); view = "tidy"; setTabs(tidyMeta.id ? "list" : "make");
  B("modeBox").hidden = B("re").hidden = true;
  B("name").textContent = "단계 다듬기"; B("sub").textContent = tidyMeta.name || "새 음료";
  show("tidy"); renderTidy(); B("scroll").scrollTop = 0;
}
function rowStep(o){
  if(o.k === "hand"){ const s = {k:"hand", text:String(o.text || "").trim() || "손으로"}; if(o.w) s.w = 1; return s; }
  const a = {k:o.k};
  if(!NOAMT[o.k]){
    if(o.i && ingList(o.k).length > 1) a.i = o.i; else if(o.i && ingOf(o.i, o.k)) a.i = o.i;
    if(o.fill){ const fv = fillVal(o.fill, tidyMeta.cup); a.f = fv != null ? fv : o.f; a.lab = o.fill; } else { a.t = +o.t || 0; a.u = o.u; }
  }
  if(o.w) a.w = 1;
  return a;
}
function renderTidy(){
  const el = B("tidy"), M = tidyMeta;
  const rows = tidyRows.map((o, i)=>{
    const d = T[o.k], multi = !NOAMT[o.k] && ingList(o.k).length > 1;
    const top = '<div class="bx-ttop">' + draw(ICON[o.k], IP) + '<span class="bx-selwrap"><select class="bx-inp" data-i="' + i + '" data-f="k" aria-label="도구">' + ORDER.map(k=>'<option value="' + k + '"' + (k === o.k ? " selected" : "") + '>' + esc(nm(k)) + '</option>').join("") + '</select></span>' +
      '<button class="bx-mini" data-i="' + i + '" data-m="-1"' + (i ? "" : " disabled") + ' aria-label="위로">▲</button><button class="bx-mini" data-i="' + i + '" data-m="1"' + (i < tidyRows.length - 1 ? "" : " disabled") + ' aria-label="아래로">▼</button><button class="bx-mini del" data-i="' + i + '" data-m="x" aria-label="지우기">✕</button></div>';
    let inner = "";
    if(o.k === "hand") inner = '<div class="bx-f one"><input class="bx-inp" data-i="' + i + '" data-f="text" value="' + esc(o.text) + '" placeholder="예: 자몽 슬라이스 올리기" maxlength="60"></div>';
    else if(!NOAMT[o.k]){
      const ingSel = multi ? '<span class="bx-selwrap"><select class="bx-inp" data-i="' + i + '" data-f="i" aria-label="재료">' + ingList(o.k).map(x=>'<option value="' + esc(x.id) + '"' + ((o.i || ingList(o.k)[0].id) === x.id ? " selected" : "") + '>' + esc(x.n) + '</option>').join("") + '</select></span>' : '<span class="bx-fixed">' + esc(ingName(o)) + '</span>';
      let opts = Object.keys(d.u).map(u=>'<option value="u:' + u + '"' + (!o.fill && o.u === u ? " selected" : "") + '>' + u + '</option>').join("");
      if(d.fill) opts += '<optgroup label="컵 높이">' + FILLS.map(f=>'<option value="f:' + f[0] + '"' + (o.fill === f[0] ? " selected" : "") + '>' + f[0] + '</option>').join("") + '</optgroup>';
      const numIn = o.k === "shot"
        ? '<span class="bx-selwrap"><select class="bx-inp" data-i="' + i + '" data-f="t" aria-label="샷 수">' + [1, 2, 3, 4].map(n=>'<option' + (+o.t === n ? " selected" : "") + '>' + n + '</option>').join("") + '</select></span>'
        : '<input class="bx-inp" type="number" min="0" step="any" inputmode="decimal" data-i="' + i + '" data-f="t" aria-label="양" value="' + (o.fill ? "" : esc(o.t)) + '"' + (o.fill ? " disabled" : "") + '>';
      inner = '<div class="bx-f">' + ingSel + numIn + '<span class="bx-selwrap"><select class="bx-inp" data-i="' + i + '" data-f="u" aria-label="단위">' + opts + '</select></span></div>';
      if(o.base != null && o.k !== "shot") inner += '<div class="bx-thint">만든 양 ' + fmt(o.base, d.base) + d.base + (o.frac != null ? " · 컵 " + Math.round(o.frac * 100) + "%" : "") + '</div>';
    }
    const wbtn = i ? '<button class="bx-wbtn' + (o.w ? " on" : "") + '" data-i="' + i + '" data-m="w">' + (o.w ? "⊂ 위와 순서 상관없음 ✓" : "⊂ 위와 순서 상관없음") + '</button>' : "";
    return '<div class="bx-trow' + (o.w ? " w" : "") + '"><div class="bx-no">' + (i + 1) + '</div><div class="bx-tcol">' + top + inner + wbtn + '</div></div>';
  }).join("");
  el.innerHTML = '<div class="bx-recard"><div class="bx-rl">음료 카드</div><input class="bx-inp bx-nm" id="bar-mName" value="' + esc(M.name) + '" placeholder="음료 이름 (예: 바닐라 라떼)" maxlength="30">' +
    '<div class="bx-row"><span class="bx-selwrap"><select class="bx-inp" id="bar-mTemp" aria-label="온도"><option value="ICE"' + (M.temp === "ICE" ? " selected" : "") + '>ICE</option><option value="HOT"' + (M.temp === "HOT" ? " selected" : "") + '>HOT</option><option value=""' + (!M.temp ? " selected" : "") + '>온도 없음</option></select></span>' +
    '<span class="bx-selwrap"><select class="bx-inp" id="bar-mCup" aria-label="컵">' + Object.keys(CUPS).map(c=>'<option' + (c === M.cup ? " selected" : "") + '>' + c + '</option>').join("") + '</select></span></div>' +
    (recipeOf(M.rid) ? '<details class="bx-rs"><summary>참고 레시피 · ' + esc(recipeOf(M.rid).name) + '</summary><ol>' + recipeOf(M.rid).steps.map(t=>"<li>" + esc(t) + "</li>").join("") + '</ol></details>' : "") + '</div>' +
    '<p class="bx-tsub">순서는 ▲▼, 양은 칸에서 고쳐요. "위와 순서 상관없음"으로 묶은 단계끼리는 어느 쪽을 먼저 넣어도 맞아요.</p>' +
    '<div>' + rows + '</div><button class="bx-btn ghost bx-addrow" id="bar-tAdd">+ 단계 넣기</button>' +
    '<div class="bx-preview"><div class="bx-lab">연습 때 보이는 순서</div><ol>' + previewHTML() + '</ol></div>' +
    '<div class="bx-rbtns"><button class="bx-btn ghost" id="bar-tBack">그만두기</button><button class="bx-btn ghost" id="bar-tRec">바에서 다시 만들기</button><button class="bx-btn" id="bar-tSave"' + (tidyRows.length ? "" : " disabled") + '>음료 카드로 저장</button></div>';
  el.querySelectorAll("[data-f]").forEach(inp=>{
    inp.addEventListener(inp.tagName === "SELECT" ? "change" : "input", ()=>{
      const o = tidyRows[+inp.dataset.i], f = inp.dataset.f, d = T[o.k];
      if(f === "k"){ const k = inp.value, nd = T[k]; o.k = k; o.i = undefined; o.base = null; o.frac = null; o.fill = null; o.f = null; o.text = ""; o.u = nd.u ? nd.base : null; o.t = NOAMT[k] ? null : defT(k); renderTidy(); return; }
      if(f === "i"){ o.i = inp.value; refreshPreview(); return; }
      if(f === "u"){
        const v = inp.value;
        if(v.indexOf("f:") === 0) o.fill = v.slice(2);
        else{ const u = v.slice(2), b = !o.fill && o.u && +o.t > 0 ? +o.t * d.u[o.u] : o.base != null ? o.base : defT(o.k) * d.u[d.base]; o.fill = null; o.u = u; o.t = nice(b / d.u[u], u); }
        renderTidy(); return;
      }
      o[f] = inp.value; refreshPreview();
    });
  });
  el.querySelectorAll("[data-m]").forEach(b=>{ b.onclick = ()=>{
    const i = +b.dataset.i, m = b.dataset.m;
    if(m === "x") tidyRows.splice(i, 1);
    else if(m === "w") tidyRows[i].w = !tidyRows[i].w;
    else{ const j = i + (+m), t = tidyRows[i]; tidyRows[i] = tidyRows[j]; tidyRows[j] = t; }
    if(tidyRows[0]) tidyRows[0].w = false;
    haptic("selection"); renderTidy(); }; });
  B("mName").oninput = function(){ M.name = this.value; };
  B("mTemp").onchange = function(){ M.temp = this.value; };
  B("mCup").onchange = function(){ M.cup = this.value; refreshPreview(); };
  B("tAdd").onclick = ()=>{ tidyRows.push({k:"hand", text:"", w:false, base:null, frac:null}); renderTidy(); const ins = el.querySelectorAll('[data-f="text"]'); if(ins.length) ins[ins.length - 1].focus(); };
  B("tBack").onclick = ()=>{ makeFor = null; openList(); };
  B("tRec").onclick = ()=>{ makeRid = M.rid || ""; CUP = M.cup; startMake(M.id ? cardById(M.id) : null); };
  B("tSave").onclick = saveTidy;
}
function previewHTML(){ return tidyRows.map(rowStep).map(a=>'<li' + (a.w ? ' class="w"' : "") + '>' + esc(stepText(a)) + "</li>").join(""); }
function refreshPreview(){ const ol = B("tidy").querySelector(".bx-preview ol"); if(ol) ol.innerHTML = previewHTML(); }
function saveTidy(){
  const M = tidyMeta, el = B("tidy");
  if(tidyRows.length > MAX_STEPS){ haptic("error"); toast("단계는 " + MAX_STEPS + "개까지예요"); return; }
  const bad = tidyRows.findIndex(o=>!NOAMT[o.k] && !o.fill && !(+o.t > 0 && +o.t <= 5000));
  if(bad >= 0){ haptic("error"); toast((bad + 1) + "번 단계의 양을 0보다 크고 5000 이하로 적어 주세요"); const f = el.querySelectorAll(".bx-trow")[bad].querySelector('[data-f="t"]'); if(f) f.focus(); return; }
  const name = String(M.name || "").trim();
  if(!name){ haptic("error"); toast("음료 이름을 적어 주세요"); B("mName").focus(); return; }
  const s = storeCopy(), steps = tidyRows.map(rowStep);
  let c = M.id ? s.cards.filter(x=>x.id === M.id)[0] : null;
  if(!c){ if(s.cards.length >= MAX_CARDS){ toast("음료 카드는 " + MAX_CARDS + "개까지예요"); return; } c = {id:uid()}; s.cards.push(c); }
  const changed = JSON.stringify(c.steps || []) !== JSON.stringify(cleanSteps(steps)) || c.cup !== M.cup;
  c.name = name; c.temp = M.temp; c.cup = M.cup; c.steps = steps; if(M.rid) c.rid = M.rid; else delete c.rid;
  if(changed) delete c.best;            // 정답이 바뀌면 최고 점수는 새로
  saveStore(s); haptic("success");
  makeFor = null; selId = c.id;
  toast('"' + name + '" 음료 카드를 저장했어요');
  openList();
}

/* ───── 내 음료 ───── */
function openList(){
  stopTimers(); view = "list"; setTabs("list");
  B("modeBox").hidden = false; B("re").hidden = true;
  B("name").textContent = "내 음료"; B("sub").textContent = "음료 카드 " + cards().length + "개";
  show("list"); renderList(); B("scroll").scrollTop = 0;
}
function renderList(){
  const list = allCards();
  if(!selId || !cardById(selId)) selId = list[0].id;
  const sel = cardById(selId);
  const r = recipeOf(sel.rid);
  B("list").innerHTML = '<div class="bx-sel"><div class="bx-scup">' + cardCup(sel) + '</div><div class="bx-sinfo"><div class="bx-rn">' + esc(sel.name) + '</div>' +
      '<div class="bx-rt">' + (sel.ex ? '<span class="bx-chip fix">예시</span>' : '') + (sel.temp ? '<span class="bx-chip">' + esc(sel.temp) + '</span>' : '') + '<span class="bx-chip">' + esc(sel.cup) + '</span><span class="bx-chip">단계 ' + sel.steps.length + '</span></div>' +
      '<div class="bx-sm">' + (r ? "참고 레시피 · " + esc(r.name) + "<br>" : "") + (sel.ex ? "저장되지 않는 예시예요. 다듬어 저장하면 내 음료가 돼요." : sel.best != null ? "최고 " + sel.best + "점 · 연습 " + (sel.n || 0) + "번" : "아직 연습 안 했어요") + '</div></div></div>' +
    '<ol class="bx-psteps">' + sel.steps.map(a=>'<li' + (a.w ? ' class="w"' : "") + '>' + esc(stepText(a)) + '</li>').join("") + '</ol>' +
    '<div class="bx-cbtns"><button class="bx-btn" id="bar-lPrac">연습하기 (' + (mode === "see" ? "보며" : "외워서") + ')</button><div class="bx-row bx-two"><button class="bx-btn ghost" id="bar-lFix">단계 다듬기</button>' + (sel.ex ? "" : '<button class="bx-btn ghost bx-del" id="bar-lDel">' + (delArm === sel.id ? "한 번 더 누르면 지워요" : "지우기") + '</button>') + '</div></div>' +
    '<div class="bx-lab2">음료 카드</div><ul class="bx-cards">' + list.map(c=>'<li><button class="bx-card' + (c.id === selId ? " on" : "") + '" data-id="' + esc(c.id) + '"><span class="bx-mcup">' + cardCup(c) + '</span><span class="bx-cw"><b>' + esc(c.name) + '</b><small>' + esc([c.ex ? "예시" : "", c.temp, c.cup, "단계 " + c.steps.length].filter(Boolean).join(" · ")) + '</small></span><span class="bx-tag' + (c.best == null ? "" : " ok") + '">' + (c.ex ? "예시" : c.best == null ? "아직" : c.best + "점") + '</span></button></li>').join("") + '</ul>' +
    (cards().length ? "" : '<p class="bx-empty">아직 내 음료가 없어요. 아래 "새 음료 만들기"로 바에서 직접 만들어 정답을 적어요.</p>') +
    '<button class="bx-btn ghost bx-addrow bx-new" id="bar-lNew">+ 새 음료 만들기</button>';
  B("list").querySelectorAll(".bx-card").forEach(b=>{ b.onclick = ()=>{ selId = b.dataset.id; delArm = null; haptic("selection"); renderList(); }; });
  B("lPrac").onclick = ()=>startPrac(sel);
  B("lFix").onclick = ()=>openTidyFromCard(sel);
  B("lNew").onclick = ()=>{ makeRid = ""; CUP = "16oz"; startMake(null); };
  if(B("lDel")) B("lDel").onclick = ()=>{
    if(delArm !== sel.id){ delArm = sel.id; renderList(); return; }
    const s = storeCopy(); s.cards = s.cards.filter(x=>x.id !== sel.id); saveStore(s); delArm = null; selId = null; toast('"' + sel.name + '"을 지웠어요'); openList();
  };
}

/* ───── 재료 ───── */
let ingNew = {k:"syrup", c:PAL[1]};
function openIng(){
  stopTimers(); view = "ing"; setTabs("ing");
  B("modeBox").hidden = B("re").hidden = true;
  B("name").textContent = "재료"; B("sub").textContent = "도구마다 넣는 재료";
  show("ing"); renderIng();
}
function renderIng(){
  const el = B("ing");
  el.innerHTML = '<p class="bx-tsub">도구(어떻게 넣나) 아래 재료(무엇을)가 있어요. 재료가 둘 이상인 도구는 누를 때 재료부터 골라요. 점선은 내가 더한 매장 재료예요.</p>' +
    '<div class="bx-gcard">' + ING_OK.map(k=>'<div class="bx-grow"><div class="bx-gtop">' + draw(ICON[k], IP) + '<span class="bx-gname">' + esc(nm(k)) + '</span></div><div class="bx-chips">' +
      ingList(k).map(x=>x.mine ? '<button class="bx-chip mine" data-del="' + esc(x.id) + '" aria-label="' + esc(x.n) + ' 지우기"><i class="bx-sw" style="background:' + x.c + '"></i>' + esc(x.n) + ' ✕</button>' : '<span class="bx-chip"><i class="bx-sw" style="background:' + x.c + '"></i>' + esc(x.n) + '</span>').join("") + '</div></div>').join("") + '</div>' +
    (userIngs().length < MAX_INGS ? '<div class="bx-lab2">매장 재료 더하기</div><div class="bx-gcard bx-gnew"><input class="bx-inp" id="bar-iName" placeholder="재료 이름 (예: 시즌 말차 시럽)" maxlength="20">' +
      '<div class="bx-row"><span class="bx-sm">넣는 도구</span><span class="bx-selwrap"><select class="bx-inp" id="bar-iK" aria-label="넣는 도구">' + ING_OK.map(k=>'<option value="' + k + '"' + (k === ingNew.k ? " selected" : "") + '>' + esc(nm(k)) + ' (' + esc(T[k].sub) + ')</option>').join("") + '</select></span></div>' +
      '<div class="bx-chips bx-pal">' + PAL.map(c=>'<button class="bx-swb' + (c === ingNew.c ? " on" : "") + '" data-c="' + c + '" style="background:' + c + '" aria-label="색 ' + c + '"></button>').join("") + '</div>' +
      '<button class="bx-btn" id="bar-iAdd">만들기</button></div>' : "") +
    '<div class="bx-rbtns"><button class="bx-btn ghost" id="bar-gGuide">안내 다시 보기</button></div>';
  el.querySelectorAll("[data-del]").forEach(b=>{ b.onclick = ()=>{ const s = storeCopy(), x = s.ings.filter(y=>y.id === b.dataset.del)[0]; s.ings = s.ings.filter(y=>y.id !== b.dataset.del); saveStore(s); if(x){ delete armed[x.k]; toast('"' + x.n + '"을 지웠어요. 쓰던 음료에서는 ' + ingList(x.k)[0].n + '(으)로 바뀌어요'); } renderTools(); renderIng(); }; });
  el.querySelectorAll("[data-c]").forEach(b=>{ b.onclick = ()=>{ ingNew.c = b.dataset.c; ingNew.k = B("iK").value; const v = B("iName").value; renderIng(); B("iName").value = v; }; });
  if(B("iK")) B("iK").onchange = function(){ ingNew.k = this.value; };
  if(B("iAdd")) B("iAdd").onclick = ()=>{
    const n = txt(B("iName").value, 20), k = B("iK").value;
    if(!n){ B("iName").focus(); return; }
    if(ingList(k).some(x=>x.n === n)){ toast("이미 있는 재료예요"); return; }
    const s = storeCopy(); s.ings.push({id:"u" + uid(), n:n, k:k, c:ingNew.c}); saveStore(s);
    haptic("success"); toast('"' + n + '" 재료가 생겼어요'); ingNew.k = k; renderTools(); renderIng();
  };
  B("gGuide").onclick = openGuide;
}

/* ───── 처음 안내 세 장 (재료 탭의 "안내 다시 보기"로 또 본다) ───── */
const GUIDE_KEY = "barGuide2";
let guideI = 0;
const GUIDE = [
  ()=>'<h3>바에서 직접 만들어요</h3><div class="bx-gpic">' + draw(ICON.milk, IP) + draw(ICON.syrup, IP) + draw(ICON.shot, IP) + '</div><p>레시피를 옆에 펴 두고 도구를 꾹 눌러 한 잔을 만들면, 누른 순서대로 정답이 적혀요. 다듬어서 음료 카드로 저장해요.</p>',
  ()=>'<h3>재료 · 양 · 순서를 봐요</h3><ol class="bx-clist"><li><span class="bx-cn">1</span>' + draw(ICON.ice, IP) + '<span class="bx-cw"><b>얼음 가득</b></span><span class="bx-ca">○○○</span></li><li><span class="bx-cn">2</span>' + draw(ICON.syrup, IP) + '<span class="bx-cw"><b>바닐라 시럽 3펌프</b></span><span class="bx-ca">×○○</span></li><li><span class="bx-cn">3</span>' + draw(ICON.milk, IP) + '<span class="bx-cw"><b>우유 1번 선</b></span><span class="bx-ca">○△○</span></li></ol><p>음료 카드로 연습하면 단계마다 재료 · 양 · 순서를 따로 채점해요. "순서 상관없음"으로 묶은 단계는 순서를 안 따져요.</p>',
  ()=>'<h3>매장 재료를 더해요</h3><p>재료 탭에서 우리 매장 재료를 이름 · 넣는 도구 · 색만 골라 더해요.</p><p class="bx-sm">내 음료 맨 끝의 예시 바닐라 라떼로 먼저 해 볼 수 있어요.</p>'];
function openGuide(){ guideI = 0; paintGuide(); B("guide").hidden = false; }
/* 끝까지 넘기거나 건너뛰면 본 것으로 기억한다. 안내가 떠 있지 않았으면(화면을 그냥 떠날 때) 아무것도 남기지 않는다 */
function closeGuide(){ const g = B("guide"); if(!g || g.hidden) return; g.hidden = true; if(data.hints.indexOf(GUIDE_KEY) < 0){ data.hints.push(GUIDE_KEY); persist(); } }
function paintGuide(){
  const g = B("guide");
  g.innerHTML = '<div class="bx-gbox"><div class="bx-dots">' + GUIDE.map((_, i)=>'<i class="' + (i === guideI ? "on" : "") + '"></i>').join("") + '</div>' + GUIDE[guideI]() +
    '<button class="bx-btn" id="bar-gNext">' + (guideI < GUIDE.length - 1 ? "다음" : "해 볼게츄") + '</button>' + (guideI < GUIDE.length - 1 ? '<button class="bx-skip" id="bar-gSkip">건너뛰기</button>' : '') + '</div>';
  B("gNext").onclick = ()=>{ if(guideI < GUIDE.length - 1){ guideI++; paintGuide(); } else closeGuide(); };
  if(B("gSkip")) B("gSkip").onclick = closeGuide;
}

/* ───── 화면 전환 ───── */
function show(w){ ["play","list","tidy","result","ing"].forEach(x=>{ B(x).hidden = w !== x; }); }
function setTabs(t){ B("tMake").classList.toggle("on", t === "make"); B("tList").classList.toggle("on", t === "list"); B("tIng").classList.toggle("on", t === "ing"); }
function setMode(m){ mode = m; B("see").classList.toggle("on", m === "see"); B("mem").classList.toggle("on", m === "mem"); }

let built = false;
function build(){
  if(built) return;
  built = true;
  B("re").onclick = ()=>{ if(busy) return; if(view === "prac") startPrac(CARD); else if(view === "make"){ rec = []; replay(); renderLog(); say("새 컵이츄"); } };
  B("see").onclick = ()=>{ if(busy || mode === "see") return; setMode("see"); if(view === "prac") startPrac(CARD); else if(view === "list") renderList(); };
  B("mem").onclick = ()=>{ if(busy || mode === "mem") return; setMode("mem"); if(view === "prac") startPrac(CARD); else if(view === "list") renderList(); };
  B("tMake").onclick = ()=>{ if(busy || view === "make") return; makeRid = ""; CUP = "16oz"; startMake(null); };
  B("tList").onclick = ()=>{ if(busy || view === "list") return; openList(); };
  B("tIng").onclick = ()=>{ if(busy || view === "ing") return; openIng(); };
  B("quit").onclick = ()=>{ barLeave(); go("home"); };
}

/* 학습 방식 시트에서 부른다. pool(학습 범위)은 1.5.7 부터 쓰지 않는다 — 참고 레시피는 전체에서 고른다 */
function openBar(pool){
  build();
  /* 1.5.5~1.5.6 의 레시피별 정답 · 옛 내 도구는 새로 시작한다(베타) */
  let old = false;
  (data.drinks || []).forEach(d=>{ if(d && d.plan !== undefined){ delete d.plan; old = true; } });
  if(data.bar && data.bar.v !== 2){ delete data.bar; old = true; }
  if(old) persist();
  /* 참고 레시피는 학습 범위와 상관없이 전체 레시피에서(범위를 좁혀 들어와도 카드의 참고 레시피가 사라지지 않게) */
  RECIPES = (data.drinks || []).filter(d=>d && !d.arch && (d.steps || []).some(s=>String(s).trim()))
    .map(d=>({id:d.id, name:d.name, temp:d.temp || "", cup:cupOf(d), steps:(d.steps || []).map(String).filter(s=>s.trim())}));
  B("mouse").innerHTML = mouseSVGWorn("day");
  setMode(mode); armed = {}; makeFor = null; selId = null; delArm = null;
  go("bar");
  openList();
  if((data.hints || []).indexOf(GUIDE_KEY) < 0) openGuide();
  return true;
}
/* 다른 화면으로 갈 때 붓던 것 · 추출 시계를 멈춘다 */
function barLeave(){ stopTimers(); const g = B("guide"); if(g) g.hidden = true; }

window.openBar = openBar;
window.barLeave = barLeave;
window.cleanBarCfg = cleanBar;
window.barTest = {judge:judge, cupOf:cupOf, stepText:stepText, grade:grade, cleanBar:cleanBar, cleanSteps:cleanSteps, snapFill:snapFill, ingList:ingList,
  state:()=>({view:view, mode:mode, rec:rec, card:CARD ? CARD.name : null, busy:busy, armed:armed, cup:CUP}),
  startPrac:id=>startPrac(cardById(id)), startMake:()=>startMake(null), tidyRows:()=>tidyRows, openIng:openIng, openList:openList, EX:EX};
})();
