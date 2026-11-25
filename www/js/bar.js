/* 바 연습 (베타) — 레시피의 만드는 순서 문장을 도구 동작으로 읽고, 도구를 꾹 눌러 한 잔을 만들며 외운다.
   학습 탭 → 학습 방식 시트의 세 번째 줄에서 들어온다(study.js 의 openModeSheet).

   - 연습하기: 보며(목표가 보임) · 외워서(순서와 양을 떠올림). 손을 떼도 다음 단계로 안 넘어간다(나눠 붓기).
     "다 넣었츄" 또는 다음 차례 도구를 누를 때 합친 양으로 채점한다.
   - 정답 고치기: 문장을 잘못 읽었거나 매장 방식이 다르면 그 레시피의 정답만 고친다. 레시피 문장은 그대로 둔다.
     고친 정답은 레시피의 plan 칸에 둔다. 파일 · iCloud 백업에는 따라가고(settings.js 의 복원이 cleanBarPlan 으로 거른다),
     레시피 보내기에는 넣지 않는다(recipeshare.js 의 recipePack 이 칸을 골라 담는다).
   - 베타라 채점이 틀릴 수 있어 치즈는 주지 않는다. 통신 없음.

   앱의 다른 파일과 이름이 부딪히지 않게 전부 이 함수 안에 둔다. 밖에서 쓰는 것은 openBar · barLeave · cleanBarPlan ·
   barKeepPlan 과 회귀 테스트용 barTest 뿐이다. 화면의 id 는 bar- 로, 클래스는 bx- 로 시작한다(style.css 의 .row · .chip 등과 안 겹치게) */
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
 syrup:  {n:"시럽",sub:"펌프",base:"펌프",u:{"펌프":1,ml:0.2},count:true,tick:400,col:"#E8B858",ml:5},
 sauce:  {n:"소스",sub:"계량컵",base:"ml",u:LIQ,rate:1.5,col:"#6A3A22"},
 jam:    {n:"청",sub:"계량컵",base:"ml",u:LIQ,rate:1.5,col:"#F08A6A"},
 powder: {n:"파우더",sub:"티스푼",base:"티스푼",u:{"티스푼":1,"테이블스푼":3,g:1/3,"스쿱":3},count:true,tick:450,col:"#8B5A3C",ml:2},
 whip:   {n:"휘핑",sub:"휘핑기",base:"회전",u:{"회전":1},count:true,tick:700},
 drizzle:{n:"드리즐",sub:"소스병",base:"회전",u:{"회전":1},count:true,tick:700},
 stir:   {n:"젓기",sub:"스푼"},
 hand:   {n:"손으로",sub:"가니시 · 메모"}
};
const ORDER = ["ice","water","hot","shot","cold","milk","steam","soda","syrup","sauce","jam","powder","whip","drizzle","stir","hand"];
const COL_MIX = "#B98A62";
const CUPS = {"8oz":237, "12oz":355, "16oz":473, "20oz":591};
const CUPLINE = {"8oz":[.5,.75,.9], "12oz":[.5,.75,.9], "16oz":[.45,.68,.86], "20oz":[.42,.64,.84]};
const FILLS = [["가득",1],["9부",.9],["8부",.8],["7부",.7],["6부",.6],["5부",.5],["1번 선",-1],["2번 선",-2],["3번 선",-3]];

/* ───── 문장 → 동작 ───── */
const KEY = [["ice",/얼음/],["hot",/온수|뜨거운\s*물/],["water",/정수|(?:^|\s)물(?=\s|$|을|\d)/],["shot",/에스프레소|샷/],["cold",/콜드브루/],
 ["steam",/스팀\s*(?:우유|밀크)|스팀밀크/],["milk",/우유/],["soda",/탄산수/],["syrup",/시럽/],["sauce",/소스(?!\s*병)|꿀/],["jam",/청(?=\s|\d|$|을|은|를|이|에|과|와)/],
 ["powder",/파우더|가루/],["whip",/휘핑/],["drizzle",/드리즐/],["stir",/저어|젓|섞|용해|녹인/]];
const UTOK = [[/ml|㎖/i,"ml"],[/oz|온스/i,"oz"],[/테이블스푼|tbsp|큰술/i,"테이블스푼"],[/티스푼|tsp|작은술/i,"티스푼"],[/스쿱/,"스쿱"],[/펌프/,"펌프"],[/회전|바퀴/,"회전"],[/샷/,"샷"],[/g|그램/i,"g"]];   // AMT 처럼 대소문자를 가리지 않는다(200ML · 2 TSP)
const AMT = /(\d+(?:\.\d+)?)\s*(ml|mL|㎖|oz|온스|티스푼|tsp|작은술|테이블스푼|tbsp|큰술|스쿱|펌프|회전|바퀴|샷|g|그램)/i;
/* ───── 내 도구 (data.bar) — 부르는 이름 · 더 알아듣는 말 · 우리 매장 재료. 기기 안에 두고 백업을 따라간다 ─────
   names: {도구: 이름}  words: {도구: [낱말]}  items: [{name, k}] — 재료는 기본 도구 하나(k)처럼 넣고 이름만 따로다.
   정답(plan)에는 {k, name} 으로 들어가서, 이름이 우리 매장 재료면 그 재료 버튼으로만 맞는다 */
const ITEM_BASE = ["water","hot","cold","milk","steam","soda","syrup","sauce","jam","powder","whip","drizzle"];
const BASE_WORDS = {ice:["얼음"], hot:["온수","뜨거운 물"], water:["정수","물"], shot:["에스프레소","샷"], cold:["콜드브루"], steam:["스팀우유","스팀밀크"], milk:["우유"], soda:["탄산수"],
  syrup:["시럽"], sauce:["소스","꿀"], jam:["청"], powder:["파우더","가루"], whip:["휘핑"], drizzle:["드리즐"], stir:["저어","젓기","섞기"]};
const MAX_WORDS = 8, MAX_ITEMS = 12;
function cfg(){ return (typeof data !== "undefined" && data && data.bar) || {}; }
function nm(k){ const n = cfg().names; const v = n && own(n, k) ? String(n[k]).trim() : ""; return v || (T[k] ? T[k].n : k); }
function items(){ const it = cfg().items; return Array.isArray(it) ? it : []; }
function isItem(name){ return !!name && items().some(x=>x.name === name); }
function aname(a){ return a.name || nm(a.k); }
const reEsc = w => String(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/* 백업에서 온 값 거르기 — 모르는 도구 · 빈 이름 · 너무 긴 말은 버린다. 남는 게 없으면 undefined */
function cleanCfg(c){
  if(!c || typeof c !== "object") return undefined;
  const o = {}, nmz = {}, wd = {}, it = [];
  const txt = (v, n)=>String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);
  if(c.names && typeof c.names === "object") Object.keys(c.names).forEach(k=>{ if(own(T, k) && k !== "hand"){ const v = txt(c.names[k], 12); if(v && v !== T[k].n) nmz[k] = v; } });
  if(c.words && typeof c.words === "object") Object.keys(c.words).forEach(k=>{ if(own(T, k) && k !== "hand" && Array.isArray(c.words[k])){ const l = [];
    c.words[k].forEach(w=>{ const v = txt(w, 12); if(v && l.indexOf(v) < 0 && l.length < MAX_WORDS) l.push(v); }); if(l.length) wd[k] = l; } });
  if(Array.isArray(c.items)) c.items.forEach(x=>{ if(!x || typeof x !== "object") return; const n = txt(x.name, 20); if(n && ITEM_BASE.indexOf(x.k) >= 0 && !it.some(y=>y.name === n) && it.length < MAX_ITEMS) it.push({name:n, k:x.k}); });
  if(Object.keys(nmz).length) o.names = nmz;
  if(Object.keys(wd).length) o.words = wd;
  if(it.length) o.items = it;
  return Object.keys(o).length ? o : undefined;
}
/* 문장 읽기 표: 우리 매장 재료(긴 이름 먼저) → 기본 표(내 이름 · 더한 말을 붙여서) */
function keys(){
  const c = cfg(), w = c.words || {}, out = [];
  items().slice().sort((a, b)=>b.name.length - a.name.length).forEach(x=>{ out.push([x.k, new RegExp(reEsc(x.name)), x.name]); });
  KEY.forEach(p=>{
    const extra = (w[p[0]] || []).slice();
    if(c.names && c.names[p[0]]) extra.push(c.names[p[0]]);
    out.push(extra.length ? [p[0], new RegExp(p[1].source + "|" + extra.sort((a, b)=>b.length - a.length).map(reEsc).join("|"))] : p);
  });
  return out;
}
function unitOf(tok){ for(let i = 0; i < UTOK.length; i++) if(UTOK[i][0].test(tok)) return UTOK[i][1]; return null; }
function fillOf(seg, cup){
  let m;
  if(/가득|끝까지/.test(seg)) return {f:1, lab:"가득"};
  if((m = /(\d+)\s*번\s*선/.exec(seg))){ const L = CUPLINE[cup] || CUPLINE["16oz"], n = +m[1]; if(L[n - 1]) return {f:L[n - 1], lab:n + "번 선"}; }
  if((m = /(\d+)\s*부(?!재)/.exec(seg))) return {f:+m[1] / 10, lab:m[1] + "부"};
  if((m = /(\d)\s*\/\s*(\d)/.exec(seg)) && +m[2]) return {f:+m[1] / +m[2], lab:m[1] + "/" + m[2]};
  return null;
}
function parseStep(s, cup){
  const acts = [], KS = keys();
  String(s).split(/,|\+|후(?=\s)/).forEach(seg=>{
    const found = [];
    KS.forEach(p=>{ const m = p[1].exec(seg); if(m && m[0] && !found.some(f=>m.index < f.end && f.at < m.index + m[0].length)) found.push({k:p[0], at:m.index, end:m.index + m[0].length, w:m[0], name:p[2]}); });
    found.sort((a, b)=>a.at - b.at);
    const ok = [];
    let used = 0;      // 앞 동작이 이미 가져간 글자 끝. 양은 낱말 뒤에서 먼저 찾고, 없으면 낱말 앞(아직 안 쓴 데)에서 찾는다 — "130g 얼음" · "2샷 추출"
    found.forEach((f, i)=>{
      const d = T[f.k], a = {k:f.k};
      if(f.name) a.name = f.name; else if(f.w === "꿀") a.name = "꿀";
      if(f.k === "stir"){ used = Math.max(used, f.end); if(!ok.some(x=>x.k === "stir")) ok.push(a); return; }
      const rest = seg.slice(f.at, found[i + 1] ? found[i + 1].at : seg.length), fi = d.fill ? fillOf(rest, cup) : null;
      let m = AMT.exec(rest), u = m ? unitOf(m[2]) : null, end = m ? f.at + m.index + m[0].length : f.end;
      if(!(m && u && own(d.u, u)) && !fi){
        const back = seg.slice(used, f.at);
        if(f.w === "샷"){ const n = /(\d+(?:\.\d+)?)\s*$/.exec(back); m = n ? [n[0], n[1], "샷"] : null; }   // "2샷": 샷이 낱말이자 단위
        else{ const re = new RegExp(AMT.source, "gi"); let x, last = null; while((x = re.exec(back))) last = x; m = last; }
        u = m ? unitOf(m[2]) : null; end = f.end;
      }
      used = Math.max(used, end);
      if(m && u && own(d.u, u)){ a.t = +m[1]; a.u = u; }
      else if(fi){ a.f = fi.f; a.lab = fi.lab; }
      else if(d.count && f.k !== "syrup" && f.k !== "powder"){ a.t = 1; a.u = d.base; }   // "초코 드리즐"처럼 양이 없으면 1회전
      else return;                                                                        // 양을 못 찾으면 넘긴다(에스프레소만 있고 샷 수가 없을 때 등)
      if(f.k === "shot" && ok.some(x=>x.k === "shot")) return;
      ok.push(a);
    });
    if(!ok.length){ if(seg.trim()) acts.push({k:"hand", text:seg.trim()}); return; }
    ok.forEach(a=>acts.push(a));
  });
  return acts;
}
function amtTxt(a){
  if(a.f != null) return "컵 " + a.lab;
  return (Math.round(a.t * 10) / 10) + a.u;
}
function chipTxt(a){
  if(a.k === "hand") return "손으로 · " + a.text;
  if(a.k === "stir") return "젓기";
  return aname(a) + " " + amtTxt(a);
}
function baseTarget(a){ return a.t * T[a.k].u[a.u]; }

/* 고친 정답 거르기 — 백업에서 되살릴 때 모르는 도구 · 깨진 숫자를 걸러 낸다. 남는 게 없으면 undefined(칸이 사라진다) */
function cleanPlan(p){
  if(!Array.isArray(p)) return undefined;
  const out = [];
  p.forEach(a=>{
    if(!a || typeof a !== "object" || !own(T, a.k)) return;
    const d = T[a.k];
    if(a.k === "hand"){ const t = String(a.text || "").trim().slice(0, 60); if(t) out.push({k:"hand", text:t}); return; }
    if(a.k === "stir"){ out.push({k:"stir"}); return; }
    const o = {k:a.k};
    if(a.name && String(a.name) !== d.n) o.name = String(a.name).slice(0, 30);
    const f = Number(a.f);
    if(a.f != null && isFinite(f) && f > 0 && f <= 1.2){ o.f = f; o.lab = String(a.lab || Math.round(f * 100) + "%").slice(0, 10); }
    else{ const t = Number(a.t); if(!isFinite(t) || t <= 0) return; o.t = t; o.u = own(d.u, a.u) ? String(a.u) : d.base; }
    out.push(o);
  });
  return out.length ? out : undefined;
}
/* 레시피를 다시 저장할 때(편집 · 받은 레시피로 바꾸기) 고친 정답을 물려줄지 — 순서 문장과 컵이 그대로일 때만.
   문장이 바뀌면 고친 정답이 옛 문장 기준이고, 컵이 바뀌면 "2번 선" 같은 높이가 옛 컵 기준이라 버리고 새로 읽는다 */
function keepPlan(old, rec){
  if(!old || !old.plan || !rec) return undefined;
  const same = JSON.stringify((old.steps || []).map(String)) === JSON.stringify((rec.steps || []).map(String)) && cupOf(old) === cupOf(rec);
  return same ? old.plan : undefined;
}

/* ───── 상태 ───── */
let RECIPES = [], R = null, tab = "prac", mode = "see";
let PLAN = [], cur = 0, miss = 0, wrongRun = 0, log = [];
let layers = [], iceG = 0, whipN = 0, drizN = 0;
let pourK = null, pourV = 0, pourT = null, pourSnap = null, espoT = null, stirT = null, finT = null, busy = false;
let stepV = 0, stepOn = false, prevSay = null, stepSnap = null;
let freeCup = "16oz", rec = [], tidyRows = [];
function planOf(r){ return r && r.d.plan ? r.d.plan : null; }
function planSteps(r){ return planOf(r).map(stepText); }
function cupName(){ return tab === "free" ? freeCup : R.cup; }
function cap(){ return CUPS[cupName()] || 473; }
function resetCup(){ layers = []; iceG = 0; whipN = 0; drizN = 0; }
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
function cupFrac(k){ return (k === "ice" ? iceTop() : liquidTop()) / cap(); }
function addLayer(k, ml, col){ const last = layers[layers.length - 1]; if(last && last.k === k) last.ml += ml; else layers.push({k:k, ml:ml, col:col || T[k].col}); }
function pourInto(k, dBase){
  const d = T[k];
  if(k === "ice") iceG += dBase;
  else if(k === "whip") whipN += dBase;
  else if(k === "drizzle") drizN += dBase;
  else addLayer(k, d.ml ? dBase * d.ml : dBase);
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
  for(let dz = 0; dz < drizN && dz < 4; dz++){ const dy = surf + 1 + dz * 2; for(let x = l + 2; x < r - 1; x += 4) o += '<rect x="' + x + '" y="' + (dy + ((x / 4) % 2)) + '" width="3" height="1" fill="#5A3420"/>'; }
  if(stream && stream !== "ice" && stream !== "whip" && stream !== "drizzle" && T[stream] && T[stream].col) o += '<rect x="' + (stream === "shot" ? 22 : 19) + '" y="0" width="2" height="' + Math.max(0, bot - lh) + '" fill="' + T[stream].col + '"/>';
  if(stream === "ice") o += '<rect x="18" y="0" width="4" height="4" fill="#EAF6FB" stroke="#8FB7CC" stroke-width=".6"/>';
  (CUPLINE[cupName()] || []).forEach((f, i)=>{ const yy = Math.round(bot - f * inner); o += '<rect x="' + (r - 3) + '" y="' + yy + '" width="4" height="1" fill="#8A7A6A"/>';
    for(let d = 0; d <= i; d++) o += '<rect x="' + (r - 5 - 2 * d) + '" y="' + (yy - 2) + '" width="1" height="1" fill="#8A7A6A"/>'; });
  if(target != null){ const ty = Math.round(bot - Math.min(1, target) * inner); for(let x2 = l - 4; x2 <= r + 4; x2 += 3) o += '<rect x="' + x2 + '" y="' + ty + '" width="2" height="1" fill="#C4574A"/>'; }
  o += '<rect x="' + (l - 2) + '" y="' + (top - 2) + '" width="' + (r - l + 5) + '" height="2" fill="#4A423A"/>';
  o += '<rect x="' + (l - 2) + '" y="' + top + '" width="1" height="' + inner + '" fill="#4A423A"/><rect x="' + (r + 2) + '" y="' + top + '" width="1" height="' + inner + '" fill="#4A423A"/>';
  o += '<rect x="' + (l - 1) + '" y="' + bot + '" width="' + (r - l + 3) + '" height="2" fill="#4A423A"/>';
  o += '<rect x="' + (l - 1) + '" y="' + top + '" width="1" height="' + inner + '" fill="#FFFFFF" fill-opacity=".6"/>';
  if(liquidTop() > c + 1 && layers.length) o += '<rect x="' + (l - 3) + '" y="' + (top - 3) + '" width="' + (r - l + 7) + '" height="1" fill="' + layers[layers.length - 1].col + '"/>';
  return o + "</svg>";
}
function renderCup(stream, target){ B("cup").innerHTML = cupSVG(stream, target); }
function curTarget(){ if(tab !== "prac") return null; const a = PLAN[cur]; return a && a.f != null && mode === "see" ? a.f : null; }

/* ───── 판정 ───── */
function judge(vBase, a){
  const d = T[a.k];
  let g, over;
  /* 컵 높이는 ±5% 까지 딱 맞음, ±10% 까지 아쉬움(1.5.6 — ±4% 는 선 맞추기가 너무 빡빡했다) */
  if(a.f != null){ if(a.k !== "ice" && vBase > 1.01) return ["넘쳤츄!", "bad", false, "넘침"]; const df = Math.abs(vBase - a.f); over = vBase > a.f; g = df <= .05 ? 0 : df <= .1 ? 1 : 2; }
  else if(d.count){ const tb = Math.round(baseTarget(a)), diff = Math.abs(Math.round(vBase) - tb); over = vBase > tb; g = diff === 0 ? 0 : diff === 1 ? 1 : 2; }
  else{ const t = baseTarget(a) || 1, dr = Math.abs(vBase - t) / t; over = vBase > t; g = dr <= .1 ? 0 : dr <= .2 ? 1 : 2; }
  return g === 0 ? ["딱 맞았츄!", "ok", true, "딱 맞음"] : g === 1 ? [(over ? "조금 많츄" : "조금 적츄"), "bad", false, "아쉬움"] : [(over ? "너무 많츄!" : "너무 적츄!"), "bad", false, "다시 연습"];
}
function fmt(v, u){ return (u === "펌프" || u === "회전" || u === "샷" || v >= 20) ? String(Math.round(v)) : String(Math.round(v * 10) / 10); }
function meterPrac(k, vBase, a, done){
  const d = T[k];
  let html;
  if(a.f != null){
    html = '<div class="bx-lbl">' + esc(aname(a)) + ' · 컵 높이</div><div class="bx-big">' + Math.round(vBase * 100) + '<span class="bx-tg">%</span></div><div class="bx-tg">' + (mode === "see" ? "목표 " + esc(a.lab) + " (" + Math.round(a.f * 100) + "%)" : "목표는 기억 속에") + '</div>';
  }else{
    html = '<div class="bx-lbl">' + esc(aname(a)) + '</div><div class="bx-big">' + fmt(vBase / d.u[a.u], a.u) + '<span class="bx-tg">' + esc(a.u) + '</span></div><div class="bx-tg">' + (mode === "see" ? "목표 " + esc(amtTxt(a)) : "목표는 기억 속에") + '</div>';
  }
  if(done){ const j = judge(vBase, a); html += '<div class="bx-verdict ' + j[1] + '">' + j[3] + '</div>'; }
  B("meter").innerHTML = html;
}
function meterFree(k, vBase){
  const d = T[k];
  B("meter").innerHTML = '<div class="bx-lbl">' + esc(nm(k)) + '</div><div class="bx-big">' + fmt(vBase, d.base) + '<span class="bx-tg">' + d.base + '</span></div>' + (d.fill ? '<div class="bx-tg">컵 ' + Math.round(cupFrac(k) * 100) + '%</div>' : "");
}

/* ───── 연습 ───── */
function stopTimers(){
  if(pourT){ clearInterval(pourT); pourT = null; }
  if(espoT){ clearInterval(espoT); espoT = null; }
  if(stirT){ clearTimeout(stirT); stirT = null; }
  if(finT){ clearTimeout(finT); finT = null; }
  pourK = null; busy = false;
  const e = document.querySelector("#s-bar .bx-espo"); if(e) e.remove();
  document.querySelectorAll("#s-bar .bx-tool.press").forEach(t=>t.classList.remove("press"));
}
function start(i){
  stopTimers();
  const was = R;
  R = RECIPES[i] || RECIPES[0];
  if(R !== was) rec = [];       // 직접 만들던 기록은 그 레시피 것이라 다른 레시피로 넘기지 않는다
  const p = planOf(R);
  PLAN = [];
  if(p) p.forEach((a, si)=>{ const b = JSON.parse(JSON.stringify(a)); b.si = si; PLAN.push(b); });
  else R.steps.forEach((s, si)=>{ parseStep(s, R.cup).forEach(a=>{ a.si = si; PLAN.push(a); }); });
  cur = 0; miss = 0; wrongRun = 0; log = []; resetCup(); stepV = 0; stepOn = false; prevSay = null;
  B("name").textContent = R.name;
  B("sub").textContent = [R.ex ? "예시" : "", R.temp, R.cup, p ? "정한 정답" : ""].filter(Boolean).join(" · ");
  B("pickSel").value = String(RECIPES.indexOf(R));
  if(!p){ show("check"); renderCheck(); return; }       // 처음 연습하는 레시피: 읽은 순서를 먼저 보여 주고 정한다(1.5.6)
  show("play");
  say(mode === "see" ? "순서대로 해 보츄!" : "레시피를 떠올려 보츄!");
  B("meter").innerHTML = "";
  renderSteps(); renderHand(); clearHints(); renderCup(null, curTarget());
}
function renderSteps(){
  const el = B("steps"), p = planOf(R), list = p ? planSteps(R) : R.steps;
  if(mode === "mem"){ el.innerHTML = '<div class="bx-hidden">외워서 하는 중 · ' + list.length + '단계</div>'; return; }
  const now = PLAN[cur] ? PLAN[cur].si : 99;
  el.innerHTML = "<ol>" + list.map((s, i)=>'<li class="' + (i < now ? "done" : i === now ? "now" : "") + '">' + esc(s) + "</li>").join("") + "</ol>";
  // 두 칸 화면에선 순서 칸 높이가 묶여 안에서 굴러간다 — 지금 줄이 칸 안에 보이게(화면 스크롤은 건드리지 않는다)
  const li = el.querySelector("li.now");
  if(li && el.scrollHeight > el.clientHeight) el.scrollTop += li.getBoundingClientRect().top - el.getBoundingClientRect().top - 8;
}
function renderHand(){
  const h = B("hand");
  if(tab === "free"){ h.innerHTML = ""; return; }
  const a = PLAN[cur];
  if(a && stepOn){
    const cv = stepVal(a), now = a.f != null ? Math.round(cv * 100) + "%" : fmt(cv / T[a.k].u[a.u], a.u) + a.u;
    h.innerHTML = '<div class="bx-handcard"><p><b>' + esc(aname(a)) + '</b> 지금 ' + esc(now) + '<br><span class="bx-sm">모자라면 다시 꾹 · 다음 도구로 넘어가요</span></p><div class="bx-hbtns"><button class="bx-btn ghost" id="bar-stepRe">이 단계 다시</button><button class="bx-btn" id="bar-stepOk">다 넣었츄</button></div></div>';
    B("stepOk").onclick = commit; B("stepRe").onclick = redoStep; return;
  }
  if(a && a.k === "hand"){
    h.innerHTML = '<div class="bx-handcard"><p><b>손으로</b> · ' + esc(a.text) + '</p><button class="bx-btn" id="bar-handOk">했어요</button></div>';
    B("handOk").onclick = ()=>{ if(busy) return; log.push({a:a, ok:true}); next(); };
  }
  else h.innerHTML = '<div class="bx-handcard idle"><p>' + (a ? '꾹 누르는 동안 붓고, 떼면 멈춰요<br><span class="bx-sm">손을 떼도 다음으로 안 넘어가요</span>' : "") + '</p></div>';
}
function redoStep(){
  if(busy || !stepSnap) return;
  const s = JSON.parse(stepSnap); layers = s[0]; iceG = s[1]; whipN = s[2]; drizN = s[3];
  stepV = 0; stepOn = false; B("meter").innerHTML = ""; renderCup(null, curTarget()); renderHand(); say("다시 부어 보츄");
}
function clearHints(){ document.querySelectorAll("#s-bar .bx-tool").forEach(t=>t.classList.remove("glow")); }
function hint(){ clearHints(); const a = PLAN[cur]; if(a) document.querySelectorAll("#s-bar .bx-tool").forEach(t=>{ if(hit(a, t)) t.classList.add("glow"); }); }
function next(){
  cur++; wrongRun = 0; clearHints(); renderSteps(); renderHand(); renderCup(null, curTarget());
  if(cur >= PLAN.length){ busy = true; finT = setTimeout(()=>{ finT = null; busy = false; finish(); }, 700); return; }
  if(PLAN[cur].k === "hand") say("이건 손으로 하는 거츄");
}
function stepVal(a){ return a.f != null ? cupFrac(a.k) : stepV; }
function commit(){
  if(busy || !stepOn) return;
  const a = PLAN[cur], v = stepVal(a), j = judge(v, a);
  meterPrac(a.k, v, a, true); say(j[0], !j[2]);
  log.push({a:a, v:v, ok:j[2]}); stepV = 0; stepOn = false; next();
}
function wrong(btn){
  miss++; wrongRun++; btn.classList.remove("wrong"); void btn.offsetWidth; btn.classList.add("wrong");
  haptic("error");
  const a = PLAN[cur];
  if(mode === "see") say("지금은 " + (a.k === "hand" ? "손으로 할" : aname(a)) + " 차례츄!", true);
  else{ say("순서가 다르츄", true); if(wrongRun >= 2) hint(); }
}

/* ───── 도구 누름 (연습 · 직접 만들기 공통) ───── */
/* 이 버튼이 이 동작의 도구인가. 우리 매장 재료(이름)로 적힌 동작은 그 재료 버튼으로만, 아니면 기본 도구 버튼으로만 맞는다 */
function hit(a, btn){ return !!a && a.k === btn.dataset.k && (isItem(a.name) ? a.name : "") === (btn.dataset.n || ""); }
let pourBtn = null;
function down(btn, e){
  if(busy || pourK) return;
  e.preventDefault();
  const k = btn.dataset.k, d = T[k];
  let a = null;
  if(tab === "prac"){
    if(cur >= PLAN.length) return;
    a = PLAN[cur];
    /* 붓던 단계가 열려 있는데 다음 차례 도구를 누르면, 붓던 단계를 먼저 채점하고 넘어간다 */
    if(!hit(a, btn) && stepOn && hit(PLAN[cur + 1], btn)){
      const pa = a; commit();
      const last = log[log.length - 1];
      prevSay = [aname(pa) + " · " + judge(last.v, pa)[0], !last.ok];
      if(cur >= PLAN.length || busy) return;
      a = PLAN[cur];
    }
    if(!hit(a, btn)){ wrong(btn); return; }
    if(k === "hand"){ log.push({a:a, ok:true}); say("했츄!"); next(); return; }
  }else if(k === "hand"){ freeHand(); return; }
  if(tab === "free" && document.getElementById("bar-hTxt")) B("hand").innerHTML = "";   // 손으로 적던 칸은 다른 도구를 누르면 닫는다
  haptic("selection");
  if(k === "stir" || k === "shot") prevSay = null;
  if(k === "stir"){
    busy = true; say("휘휘 젓는 중…"); btn.classList.add("press");
    stirT = setTimeout(()=>{ stirT = null; btn.classList.remove("press"); busy = false;
      if(layers.length) layers = [{k:"mix", ml:liquidMl(), col:COL_MIX}];
      if(tab === "prac"){ log.push({a:a, ok:true}); say("잘 녹았츄"); next(); }
      else{ recAdd({k:"stir"}); say("잘 저었츄"); renderCup(); } }, 900);
    return;
  }
  if(k === "shot"){ espresso(a); return; }
  pourK = k; pourBtn = btn; pourV = 0; pourSnap = JSON.stringify([layers, iceG, whipN, drizN]); btn.classList.add("press");
  say(k === "syrup" ? "칙, 칙…" : k === "ice" ? "달그락…" : k === "whip" ? "뱅글뱅글…" : k === "powder" ? "톡, 톡…" : k === "drizzle" ? "주르륵…" : "쪼르르…");
  if(btn.setPointerCapture && e.pointerId != null){ try{ btn.setPointerCapture(e.pointerId); }catch(_){} }
  const step = ()=>{
    /* 얼음이 든 컵은 붓는 물이 얼음 틈부터 채워 눈금이 빨리 오른다. 틈을 채우는 동안은 덜 부어 눈금이 얼음 없을 때와 같은 빠르기로 오르게 한다(1.5.6) */
    let dv = d.count ? 1 : d.rate;
    if(d.fill && k !== "ice" && iceG > 0){ const gap = iceTop() - iceG * ICE_SOLID; if(gap > 0 && liquidMl() < gap) dv = dv * gap / iceTop(); }
    pourInto(k, dv); pourV += dv;
    if(tab === "prac") meterPrac(k, a.f != null ? cupFrac(k) : stepV + pourV, a, false); else meterFree(k, pourV);
    renderCup(k, curTarget());
  };
  step(); pourT = setInterval(step, d.count ? d.tick : 60);
}
function up(btn){
  if(!pourK || btn !== pourBtn) return;
  clearInterval(pourT); pourT = null; btn.classList.remove("press");
  const k = pourK, d = T[k];
  pourK = null;
  if(tab === "prac"){
    const a = PLAN[cur];
    if(!stepOn) stepSnap = pourSnap;
    stepV += pourV; stepOn = true;
    renderCup(null, curTarget()); meterPrac(k, stepVal(a), a, false);
    if(prevSay){ say(prevSay[0], prevSay[1]); prevSay = null; } else say(mode === "see" ? "더 넣거나 다음으로 가츄" : "이만큼이면 될까츄?");
    renderHand();
  }else{
    recAdd({k:k, n:btn.dataset.n || undefined, base:pourV, frac:d.fill ? cupFrac(k) : null}); pourBtn = null; meterFree(k, pourV); say("기록했츄"); renderCup();
  }
}

/* ───── 에스프레소: (직접 만들기: 샷 고르기) → 도징 → 탬핑 → 추출. 시간은 4배 빠르게 흐른다 ───── */
function espresso(a){
  busy = true;
  const d = document.createElement("div"); d.className = "bx-espo"; B("stage").appendChild(d);
  let phase = tab === "free" ? -1 : 0, shots = a ? a.t : 2, t0 = 0, sec = 0;
  const paint = ()=>{
    if(phase === -1){
      d.innerHTML = '<div class="bx-lab">몇 샷 뽑을까츄?</div><div class="bx-opts"><button class="bx-btn ghost" data-n="1">1샷</button><button class="bx-btn" data-n="2">2샷</button><button class="bx-btn ghost" data-n="3">3샷</button></div>';
      d.querySelectorAll("button").forEach(b=>{ b.onclick = ()=>{ shots = +b.dataset.n; phase = 0; paint(); }; });
      return;
    }
    if(phase === 0) d.innerHTML = '<div class="bx-lab">원두 ' + (shots > 1 ? 18 : 9) + 'g 도징</div><button class="bx-btn">도징</button>';
    if(phase === 1) d.innerHTML = '<div class="bx-lab">수평 탬핑</div><button class="bx-btn">꾹 탬핑</button>';
    if(phase === 2) d.innerHTML = '<div class="bx-lab">그룹헤드 체결 · 추출</div><button class="bx-btn">추출 시작</button>';
    if(phase === 3) d.innerHTML = '<div class="bx-lab">' + shots + '샷 추출 중</div><div class="bx-clock" id="bar-eClk">0초</div><div class="bx-ebar"><b></b><i id="bar-eBar"></i></div><button class="bx-btn">멈추기</button><div class="bx-sm">' + (mode === "see" || tab === "free" ? "25~30초에 멈추츄" : "몇 초였는지 기억나츄?") + '</div>';
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
    addLayer("shot", 18 * shots); renderCup(null, null);
    B("meter").innerHTML = '<div class="bx-lbl">추출 시간</div><div class="bx-big">' + s + '<span class="bx-tg">초</span></div><div class="bx-verdict ' + (ok ? "ok" : "bad") + '">' + (ok ? "딱 좋음" : "25~30초") + '</div>';
    say(ok ? "크레마가 살아 있츄!" : s < 25 ? "너무 빨랐츄, 묽겠츄" : "너무 오래 뽑았츄, 쓰겠츄", !ok);
    if(tab === "prac"){ log.push({a:a, v:s, ok:ok, sec:true}); next(); }
    else{ recAdd({k:"shot", base:shots}); renderCup(); }
  };
  paint();
}

/* ───── 결과 (베타라 치즈는 없다) ───── */
function finish(){
  const good = log.filter(l=>l.ok).length, perfect = good === log.length && miss === 0;
  const rows = log.map(l=>{
    const a = l.a;
    let txt, res;
    if(a.k === "hand"){ txt = "손으로 · " + a.text; res = "했어요"; }
    else if(a.k === "stir"){ txt = "젓기"; res = "했어요"; }
    else if(l.sec){ txt = aname(a) + " " + a.t + "샷 추출"; res = l.v + "초 / 25~30초"; }
    else if(a.f != null){ txt = aname(a) + " 컵 " + a.lab; res = Math.round(l.v * 100) + "% / " + Math.round(a.f * 100) + "%"; }
    else{ txt = aname(a); res = fmt(l.v / T[a.k].u[a.u], a.u) + " / " + amtTxt(a); }
    return '<tr><td>' + esc(txt) + '</td><td class="' + (l.ok ? "ok" : "bad") + '">' + esc(res) + (l.ok ? " ✓" : " ✗") + '</td></tr>';
  }).join("");
  show("result");
  if(perfect) haptic("success");
  B("result").innerHTML = '<h2>' + (perfect ? "완벽한 한 잔이츄!" : "한 잔 완성!") + '</h2>' +
    '<div class="bx-rtop"><div class="bx-rcup">' + cupSVG(null, null) + '</div><div class="bx-neo">순서 실수 ' + miss + '번<br>맞은 동작 ' + good + ' / ' + log.length + '</div></div>' +
    '<table>' + rows + '</table>' +
    '<p class="bx-note">베타라 채점이 틀릴 수 있어요. 정답이 이상하면 "정답 고치기"에서 바로잡아요.</p>' +
    '<div class="bx-rbtns"><button class="bx-btn ghost" id="bar-rMode">' + (mode === "see" ? "외워서 해 보기" : "보며 하기") + '</button><button class="bx-btn" id="bar-rAgain">다시 하기</button></div>';
  const idx = RECIPES.indexOf(R);
  B("rAgain").onclick = ()=>start(idx);
  B("rMode").onclick = ()=>{ setMode(mode === "see" ? "mem" : "see"); start(idx); };
}

/* ───── 직접 만들어서 정하기 (정답 고치기 안) ───── */
function recAdd(x){
  const last = rec[rec.length - 1];
  if(last && last.k === x.k && (last.n || "") === (x.n || "") && x.k !== "shot" && x.k !== "stir" && x.k !== "hand"){ last.base += x.base; last.frac = x.frac; }
  else rec.push(x);
  renderLog();
}
function recLine(x){
  const d = T[x.k];
  if(x.k === "hand") return "손으로 · " + x.text;
  if(x.k === "stir") return "젓기";
  return (x.n || nm(x.k)) + " " + fmt(x.base, d.base) + d.base + (x.frac != null ? " (컵 " + Math.round(x.frac * 100) + "%)" : "");
}
function renderLog(){
  const el = B("freeLog");
  el.innerHTML = '<div class="bx-lab2">' + esc(R.name) + ' 정답 만드는 중</div>' +
    (rec.length ? "<ol>" + rec.map(x=>"<li>" + esc(recLine(x)) + "</li>").join("") + "</ol>" : '<p class="bx-empty">평소 만드는 대로 도구를 눌러 보츄. 누른 순서대로 적히고, 다 만들면 이 레시피의 새 정답이 돼요.</p>') +
    '<div class="bx-rbtns"><span class="bx-row"><button class="bx-btn ghost" id="bar-fUndo"' + (rec.length ? "" : " disabled") + '>되돌리기</button><button class="bx-btn ghost" id="bar-fReset">처음부터</button><button class="bx-btn ghost" id="bar-fQuit">그만두기</button></span><button class="bx-btn" id="bar-fDone"' + (rec.length ? "" : " disabled") + '>다 만들었츄</button></div>';
  B("fUndo").onclick = ()=>{ if(busy) return; rec.pop(); replayFree(); renderLog(); say("하나 되돌렸츄"); };
  B("fReset").onclick = ()=>{ if(busy) return; rec = []; replayFree(); renderLog(); B("meter").innerHTML = ""; say("새 컵이츄"); };
  B("fDone").onclick = ()=>{ if(busy) return; openTidy(); };
  B("fQuit").onclick = ()=>{ stopTimers(); rec = []; openEdit(); };
}
function replayFree(){
  resetCup();
  rec.forEach(x=>{ if(x.k === "stir"){ if(layers.length) layers = [{k:"mix", ml:liquidMl(), col:COL_MIX}]; } else if(x.k === "shot") addLayer("shot", 18 * x.base); else if(x.k !== "hand") pourInto(x.k, x.base); });
  renderCup();
}
function freeHand(){
  const h = B("hand");
  h.innerHTML = '<div class="bx-handcard"><input class="bx-inp" id="bar-hTxt" placeholder="예: 자몽 슬라이스 올리기" maxlength="30"><button class="bx-btn" id="bar-hAdd">적기</button></div>';
  const i = B("hTxt"); i.focus();
  const add = ()=>{ const v = i.value.trim(); if(!v){ say("뭘 했는지 적어 주츄", true); return; } recAdd({k:"hand", text:v}); h.innerHTML = ""; say("적어 뒀츄"); };
  B("hAdd").onclick = add; i.onkeydown = e=>{ if(e.key === "Enter") add(); };
}
/* 직접 만든 양은 깔끔한 숫자로 다듬어 제안한다 */
function nice(v, u){
  if(u === "g" || u === "ml") return v >= 50 ? Math.round(v / 10) * 10 : Math.max(1, Math.round(v / 5) * 5);
  if(u === "oz" || u === "티스푼" || u === "테이블스푼" || u === "스쿱") return Math.max(.5, Math.round(v * 2) / 2);
  return Math.max(1, Math.round(v));
}

/* ───── 정답 고치기: 지금 정답(문장에서 읽은 것 또는 고친 것)을 줄마다 고친다 ───── */
function rowFromPlan(a){
  const d = T[a.k], o = {k:a.k, name:a.k === "hand" || a.k === "stir" ? "" : aname(a), text:a.text || "", base:null, frac:null};
  if(d.u){ o.u = a.u || d.base; o.t = a.t != null ? a.t : 1; o.fill = a.f != null ? a.lab : null; o.f = a.f; }
  return o;
}
function openEdit(){
  if(busy) return;
  freeCup = R.cup;
  let src = planOf(R);
  if(!src){ src = []; R.steps.forEach(st=>{ parseStep(st, R.cup).forEach(a=>src.push(a)); }); }
  tidyRows = src.map(rowFromPlan);
  enterEdit();
}
function openTidy(){   // 직접 만든 기록 → 고치기 줄
  tidyRows = rec.map(x=>{
    const d = T[x.k], o = {k:x.k, name:x.k === "hand" || x.k === "stir" ? "" : (x.n || nm(x.k)), text:x.text || "", base:x.base == null ? null : x.base, frac:x.frac == null ? null : x.frac};
    if(d.u){ o.u = d.base; o.t = nice(x.base, d.base); o.fill = null; }
    return o;
  });
  enterEdit();
}
function enterEdit(){
  tab = "edit"; B("tPrac").classList.remove("on"); B("tCfg").classList.remove("on"); B("tEdit").classList.add("on");
  B("modeBox").hidden = B("re").hidden = true;
  B("name").textContent = R.name; B("sub").textContent = "정답 고치기 · " + R.cup;
  show("tidy"); renderTidy();
  B("scroll").scrollTop = 0;
}
function fillVal(lab){ const f = FILLS.filter(x=>x[0] === lab)[0]; if(!f) return null; return f[1] < 0 ? (CUPLINE[freeCup] || CUPLINE["16oz"])[-f[1] - 1] : f[1]; }
function rowPlan(o){
  if(o.k === "hand") return {k:"hand", text:String(o.text || "").trim() || "손으로"};
  if(o.k === "stir") return {k:"stir"};
  const a = {k:o.k};
  if(o.name && o.name.trim() && o.name.trim() !== T[o.k].n && o.name.trim() !== nm(o.k)) a.name = o.name.trim();
  if(o.fill){ const fv = fillVal(o.fill); a.f = fv != null ? fv : o.f; a.lab = o.fill; } else { a.t = +o.t || 0; a.u = o.u; }
  return a;
}
function stepText(a, i){
  const n = aname(a), amt = a.f != null ? (a.lab === "가득" ? "가득" : a.lab + "까지") : amtTxt(a);
  switch(a.k){
    case "hand": return a.text;
    case "stir": return "잘 저어 섞기";
    case "ice": return (i === 0 ? "컵에 " : "") + n + " " + amt + " 담기";
    case "shot": return n + " " + a.t + "샷 추출해 붓기";
    case "syrup": case "powder": return n + " " + amt + " 넣기";
    case "whip": return n + " " + amt + " 올리기";
    case "drizzle": return n + " " + amt + " 뿌리기";
    default: return (i === 0 ? "컵에 " : "") + n + " " + amt + " 붓기";
  }
}
function defT(k){ const d = T[k]; return k === "shot" ? 2 : d.count ? 1 : (d.base === "g" || d.base === "ml") ? 100 : 1; }
function previewHTML(){ return tidyRows.map(rowPlan).map((a, i)=>"<li>" + esc(stepText(a, i)) + "</li>").join(""); }
function renderTidy(){
  const el = B("tidy"), p = planOf(R);
  const rows = tidyRows.map((o, i)=>{
    const d = T[o.k];
    let inner;
    const top = '<div class="bx-ttop"><select class="bx-inp" data-i="' + i + '" data-f="k" aria-label="도구">' + ORDER.map(k=>'<option value="' + k + '"' + (k === o.k && !isItem(o.name) ? " selected" : "") + '>' + esc(nm(k)) + '</option>').join("") +
      (items().length ? '<optgroup label="우리 매장 재료">' + items().map((x, j)=>'<option value="i:' + j + '"' + (x.k === o.k && x.name === o.name ? " selected" : "") + '>' + esc(x.name) + '</option>').join("") + '</optgroup>' : '') + '</select>' +
      '<button class="bx-mini" data-i="' + i + '" data-m="-1"' + (i ? "" : " disabled") + ' aria-label="위로">▲</button><button class="bx-mini" data-i="' + i + '" data-m="1"' + (i < tidyRows.length - 1 ? "" : " disabled") + ' aria-label="아래로">▼</button><button class="bx-mini del" data-i="' + i + '" data-m="x" aria-label="지우기">✕</button></div>';
    if(o.k === "hand") inner = '<div class="bx-f one"><input class="bx-inp" data-i="' + i + '" data-f="text" value="' + esc(o.text) + '" placeholder="예: 자몽 슬라이스 올리기" maxlength="60"></div>';
    else if(o.k === "stir") inner = '';
    else{
      let opts = Object.keys(d.u).map(u=>'<option value="u:' + u + '"' + (!o.fill && o.u === u ? " selected" : "") + '>' + u + '</option>').join("");
      if(d.fill) opts += '<optgroup label="컵 높이">' + FILLS.map(f=>'<option value="f:' + f[0] + '"' + (o.fill === f[0] ? " selected" : "") + '>' + f[0] + '</option>').join("") + '</optgroup>';
      const numIn = o.k === "shot"
        ? '<select class="bx-inp" data-i="' + i + '" data-f="t" aria-label="샷 수">' + [1, 2, 3, 4].map(n=>'<option' + (+o.t === n ? " selected" : "") + '>' + n + '</option>').join("") + '</select>'
        : '<input class="bx-inp" type="number" min="0" step="any" inputmode="decimal" data-i="' + i + '" data-f="t" aria-label="양" value="' + (o.fill ? "" : esc(o.t)) + '"' + (o.fill ? " disabled" : "") + '>';
      inner = '<div class="bx-f"><input class="bx-inp" data-i="' + i + '" data-f="name" aria-label="재료 이름" value="' + esc(o.name) + '" maxlength="30">' + numIn + '<select class="bx-inp" data-i="' + i + '" data-f="u" aria-label="단위">' + opts + '</select></div>';
      if(o.base != null) inner += '<div class="bx-thint">직접 만든 양 ' + fmt(o.base, d.base) + d.base + (o.frac != null ? " · 컵 " + Math.round(o.frac * 100) + "%" : "") + '</div>';
    }
    return '<div class="bx-trow"><div class="bx-no">' + (i + 1) + '</div><div class="bx-tcol">' + top + inner + '</div></div>';
  }).join("");
  el.innerHTML = '<div class="bx-recard"><div class="bx-rl">고치는 레시피</div><div class="bx-rn">' + esc(R.name) + '</div>' +
    '<div class="bx-rt">' + (R.temp ? '<span class="bx-chip">' + esc(R.temp) + '</span>' : '') + '<span class="bx-chip">' + esc(R.cup) + '</span><span class="bx-chip' + (p ? ' fix' : '') + '">' + (p ? '고친 정답' : '앱이 읽은 정답') + '</span></div>' +
    '<details class="bx-rs"><summary>레시피 문장 보기 (' + R.steps.length + '줄)</summary><ol>' + R.steps.map(t=>"<li>" + esc(t) + "</li>").join("") + '</ol></details></div>' +
    '<p class="bx-tsub">아래가 <b>' + esc(R.name) + '</b> 연습 때 쓰는 정답이에요. 위 문장과 다르게 읽혔거나 우리 매장 방식이 다르면 고쳐요.</p>' +
    '<div class="bx-row"><button class="bx-btn ghost" id="bar-tRec">직접 만들어서 정하기</button>' + (p ? '<button class="bx-btn ghost" id="bar-tOrig">레시피 문장대로 되돌리기</button>' : '') + '</div>' +
    '<div class="bx-lab2">' + esc(R.name) + ' 정답</div><div>' + rows + '</div><button class="bx-btn ghost bx-addrow" id="bar-tAdd">+ 동작 더하기</button>' +
    '<div class="bx-preview"><div class="bx-lab">연습 때 보이는 순서</div><ol>' + previewHTML() + '</ol></div>' +
    '<div class="bx-rbtns"><button class="bx-btn ghost" id="bar-tBack">그만두기</button><button class="bx-btn" id="bar-tSave"' + (tidyRows.length ? "" : " disabled") + '>저장하고 연습하기</button></div>';
  el.querySelectorAll("[data-f]").forEach(inp=>{
    inp.addEventListener(inp.tagName === "SELECT" ? "change" : "input", ()=>{
      const o = tidyRows[+inp.dataset.i], f = inp.dataset.f, d = T[o.k];
      if(f === "k" && inp.value.indexOf("i:") === 0){ const x = items()[+inp.value.slice(2)]; if(x){ const nd = T[x.k]; o.k = x.k; o.name = x.name; o.base = null; o.frac = null; o.fill = null; o.f = null; o.u = nd.base; o.t = defT(x.k); } renderTidy(); return; }
      if(f === "k"){ const k = inp.value, nd = T[k]; o.k = k; o.name = k === "hand" || k === "stir" ? "" : nm(k); o.base = null; o.frac = null; o.fill = null; o.f = null; if(nd.u){ o.u = nd.base; o.t = defT(k); } renderTidy(); return; }
      if(f === "u"){
        const v = inp.value;
        if(v.indexOf("f:") === 0) o.fill = v.slice(2);
        else{ const u = v.slice(2), b = o.base != null ? o.base : (!o.fill && o.u ? (+o.t || 0) * d.u[o.u] : defT(o.k) * d.u[d.base]); o.fill = null; o.u = u; o.t = nice(b / d.u[u], u); }
        renderTidy(); return;
      }
      o[f] = inp.value;
      el.querySelector(".bx-preview ol").innerHTML = previewHTML();
    });
  });
  el.querySelectorAll("[data-m]").forEach(b=>{ b.onclick = ()=>{
    const i = +b.dataset.i, m = b.dataset.m;
    if(m === "x") tidyRows.splice(i, 1); else{ const j = i + (+m), t = tidyRows[i]; tidyRows[i] = tidyRows[j]; tidyRows[j] = t; }
    haptic("selection"); renderTidy(); }; });
  B("tAdd").onclick = ()=>{ tidyRows.push({k:"hand", name:"", text:"", base:null, frac:null}); renderTidy(); const ins = el.querySelectorAll('[data-f="text"]'); if(ins.length) ins[ins.length - 1].focus(); };
  B("tRec").onclick = ()=>setTab("free");
  if(p) B("tOrig").onclick = ()=>{ delete R.d.plan; delete R.d.sample; persist(); renderPick(); setTab("prac", true); start(RECIPES.indexOf(R)); say("레시피 문장대로 돌아갔츄"); };
  B("tBack").onclick = ()=>{ rec = []; setTab("prac"); };
  B("tSave").onclick = ()=>{
    /* 양이 비었거나 0 이면 연습 때 그 단계를 맞힐 수 없다. 저장 전에 고르게 한다 */
    const bad = tidyRows.findIndex(o=>T[o.k].u && !o.fill && !(+o.t > 0));
    if(bad >= 0){ haptic("error"); toast((bad + 1) + "번 줄의 양을 적어 주세요"); const f = el.querySelectorAll(".bx-trow")[bad].querySelector('[data-f="t"]'); if(f) f.focus(); return; }
    const plan = cleanPlan(tidyRows.map(rowPlan));
    if(plan) R.d.plan = plan; else delete R.d.plan;
    delete R.d.sample;            // 정답을 고친 예시는 사용자 것 — "예시 지우기"에 안 지워지고 iCloud 에도 올라간다 (list.js · icloud.js)
    persist(); haptic("success");
    renderPick(); rec = [];
    setTab("prac", true); start(RECIPES.indexOf(R));
    say("정답을 고쳤츄! 연습해 보츄");
  };
}

/* ───── 1.5.6: 예시 한 잔 · 도구 버튼 · 확인 카드 · 내 도구 · 처음 안내 ───── */
const EX_D = {name:"바닐라 라떼", temp:"ICE", cups:["16oz"], steps:["컵에 얼음 가득", "바닐라 시럽 3펌프", "우유 1번 선까지", "에스프레소 2샷 올리기", "뚜껑 덮어 내기"]};

/* 도구 버튼: 기본 15개 + 우리 매장 재료 + 손으로. 이름을 바꾸거나 재료를 더하면 다시 그린다 */
function renderTools(){
  const list = ORDER.filter(k=>k !== "hand").map(k=>({k:k, label:nm(k), sub:T[k].sub}))
    .concat(items().map(x=>({k:x.k, n:x.name, label:x.name, sub:"우리 매장"})))
    .concat([{k:"hand", label:nm("hand"), sub:T.hand.sub}]);
  B("tools").innerHTML = list.map(t=>'<button class="bx-tool' + (t.n ? " mine" : "") + '" data-k="' + t.k + '"' + (t.n ? ' data-n="' + esc(t.n) + '"' : "") + '>' + draw(ICON[t.k], IP) + '<span>' + esc(t.label) + '</span><small>' + esc(t.sub) + '</small></button>').join("");
  B("tools").querySelectorAll(".bx-tool").forEach(b=>{
    b.addEventListener("pointerdown", e=>down(b, e));
    ["pointerup", "pointercancel", "pointerleave"].forEach(ev=>b.addEventListener(ev, ()=>up(b)));
    b.addEventListener("contextmenu", e=>e.preventDefault());
  });
}

/* 확인 카드: 앱이 문장에서 읽은 순서를 먼저 보여 준다. 이대로 · 고치기 · 직접 만들기 중 하나로 이 레시피의 정답을 정한다 */
function renderCheck(){
  const el = B("check"), unread = PLAN.filter(a=>a.k === "hand").length;
  const rows = PLAN.map((a, i)=>{
    const q = a.k === "hand", src = R.steps[a.si] || "";
    return '<li class="' + (q ? "q" : "") + '"><span class="bx-cn">' + (i + 1) + '</span>' + draw(ICON[a.k], IP) +
      '<span class="bx-cw"><b>' + esc(q ? "손으로" : aname(a)) + '</b><small>"' + esc(src) + '"' + (q ? " · 손으로 할 일로 읽었어요" : "") + '</small></span>' +
      '<span class="bx-ca">' + esc(q ? "?" : a.k === "stir" ? "" : a.f != null ? a.lab : amtTxt(a)) + '</span></li>';
  }).join("");
  /* 연습 화면의 레시피 고르기는 확인 카드 동안 숨어 있어 여기에도 둔다 */
  el.innerHTML = '<div class="bx-pick"><span class="bx-lb">레시피</span><span class="bx-selwrap"><select id="bar-cPick" class="bx-inp" aria-label="연습할 레시피">' + B("pickSel").innerHTML + '</select></span></div>' +
    '<div class="bx-ban">이 순서대로 채점해요<small>순서 · 양</small></div>' +
    '<div class="bx-ccard"><div class="bx-sm">' + (R.ex ? "예시 레시피" : esc(R.name)) + '의 만드는 순서에서 읽었어요</div><ol class="bx-clist">' + rows + '</ol></div>' +
    '<p class="bx-tsub">' + (unread ? '? 는 도구로 못 읽은 줄이에요. 손으로 하는 일이 맞으면 그대로 두고, 아니면 고쳐 주세요.' : '우리 매장 방식과 다르면 고쳐 주세요. 정한 순서는 레시피 문장과 따로 저장돼요.') + '</p>' +
    '<div class="bx-cbtns"><button class="bx-btn" id="bar-cOk">이대로 연습</button><button class="bx-btn ghost" id="bar-cFix">고치기</button><button class="bx-btn ghost" id="bar-cRec">처음부터 직접 만들기</button></div>';
  say(unread ? "? 는 내가 못 읽은 거츄" : "이렇게 읽었츄!", false);
  B("cOk").onclick = ()=>{
    const plan = cleanPlan(PLAN.map(a=>{ const b = Object.assign({}, a); delete b.si; return b; }));
    if(plan){ R.d.plan = plan; if(!R.ex) persist(); }
    haptic("success"); renderPick(); start(RECIPES.indexOf(R)); if(plan) say("좋츄! 이 순서로 해 보츄");
  };
  B("cPick").value = String(RECIPES.indexOf(R));
  B("cPick").onchange = function(){ start(+this.value); };
  B("cFix").onclick = ()=>openEdit();
  B("cRec").onclick = ()=>{ rec = []; setTab("free"); };
}

/* 내 도구: 부르는 이름 · 더 알아듣는 말 · 우리 매장 재료. 바꾸면 바로 저장하고 도구 버튼을 다시 그린다 */
let cfgOpen = null;
function saveCfg(c){ const v = cleanCfg(c); if(v) data.bar = v; else delete data.bar; persist(); renderTools(); }
function cfgCopy(){ const c = cfg(); return {names:Object.assign({}, c.names), words:JSON.parse(JSON.stringify(c.words || {})), items:items().map(x=>({name:x.name, k:x.k}))}; }
function renderCfg(){
  const el = B("cfg"), c = cfg(), w = c.words || {};
  const rows = ORDER.filter(k=>k !== "hand").map(k=>{
    const mine = w[k] || [], open = cfgOpen === k;
    return '<div class="bx-grow"><div class="bx-gtop">' + draw(ICON[k], IP) + '<span class="bx-gdef">기본<br>' + esc(T[k].n) + '</span>' +
      '<input class="bx-inp" data-nk="' + k + '" value="' + esc(c.names && c.names[k] || "") + '" placeholder="' + esc(T[k].n) + '" maxlength="12" aria-label="' + esc(T[k].n) + ' 이름">' +
      '<button class="bx-mini" data-wk="' + k + '" aria-label="알아듣는 말">' + (open ? "▴" : "▾") + '</button></div>' +
      (open ? '<div class="bx-gw"><div class="bx-sm">문장에 이 말이 나오면 ' + esc(nm(k)) + '(으)로 읽어요</div><div class="bx-chips">' +
        BASE_WORDS[k].map(x=>'<span class="bx-chip">' + esc(x) + '</span>').join("") +
        (c.names && c.names[k] && BASE_WORDS[k].indexOf(c.names[k]) < 0 ? '<span class="bx-chip">' + esc(c.names[k]) + '</span>' : "") +
        mine.map((x, i)=>'<button class="bx-chip fix" data-rk="' + k + '" data-ri="' + i + '" aria-label="' + esc(x) + ' 빼기">' + esc(x) + ' ✕</button>').join("") + '</div>' +
        (mine.length < MAX_WORDS ? '<div class="bx-row"><input class="bx-inp" id="bar-wIn" placeholder="예: 리스트레토" maxlength="12" style="flex:1"><button class="bx-btn ghost" data-ak="' + k + '">더하기</button></div>' : "") + '</div>' : "") + '</div>';
  }).join("");
  const its = items().map((x, i)=>'<div class="bx-grow"><div class="bx-gtop">' + draw(ICON[x.k], IP) + '<span class="bx-gname">' + esc(x.name) + '</span><span class="bx-gdef">' + esc(nm(x.k)) + '처럼</span><button class="bx-mini del" data-di="' + i + '" aria-label="' + esc(x.name) + ' 지우기">✕</button></div></div>').join("");
  el.innerHTML = '<p class="bx-tsub">우리 매장에서 부르는 이름으로 바꾸면 도구 버튼 · 확인 카드 · 결과에 그 이름이 나오고, 레시피 문장에서도 그 말을 알아들어요. ▾ 를 누르면 알아듣는 말을 더할 수 있어요.</p>' +
    '<div class="bx-lab2">부르는 이름</div><div class="bx-gcard">' + rows + '</div>' +
    '<div class="bx-lab2">우리 매장 재료</div><div class="bx-gcard">' + (its || '<p class="bx-empty">바닐라빈 파우더처럼 우리 매장에만 있는 재료를 도구로 만들어요.</p>') +
      (items().length < MAX_ITEMS ? '<div class="bx-gnew"><input class="bx-inp" id="bar-iName" placeholder="재료 이름 (예: 바닐라빈 파우더)" maxlength="20"><div class="bx-row"><span class="bx-sm">어떻게 넣나요</span><span class="bx-selwrap"><select class="bx-inp" id="bar-iK" aria-label="넣는 도구">' +
        ITEM_BASE.map(k=>'<option value="' + k + '"' + (k === "powder" ? " selected" : "") + '>' + esc(nm(k)) + ' (' + esc(T[k].sub) + ')</option>').join("") + '</select></span><button class="bx-btn" id="bar-iAdd">만들기</button></div></div>' : "") + '</div>' +
    '<div class="bx-rbtns"><button class="bx-btn ghost" id="bar-gGuide">안내 다시 보기</button><button class="bx-btn ghost" id="bar-gReset"' + (c.names || c.words ? "" : " disabled") + '>기본 이름으로 되돌리기</button></div>';
  el.querySelectorAll("[data-nk]").forEach(inp=>{ inp.addEventListener("change", ()=>{ const v = cfgCopy(); v.names[inp.dataset.nk] = inp.value; saveCfg(v); renderCfg(); }); });
  el.querySelectorAll("[data-wk]").forEach(b=>{ b.onclick = ()=>{ cfgOpen = cfgOpen === b.dataset.wk ? null : b.dataset.wk; renderCfg(); }; });
  el.querySelectorAll("[data-rk]").forEach(b=>{ b.onclick = ()=>{ const v = cfgCopy(); v.words[b.dataset.rk].splice(+b.dataset.ri, 1); saveCfg(v); renderCfg(); }; });
  el.querySelectorAll("[data-ak]").forEach(b=>{ b.onclick = ()=>{ const k = b.dataset.ak, x = B("wIn").value.trim(); if(!x){ B("wIn").focus(); return; }
    const v = cfgCopy(); (v.words[k] = v.words[k] || []).push(x); saveCfg(v); haptic("selection"); toast('"' + x + '"도 ' + nm(k) + '(으)로 읽어요'); renderCfg(); }; });
  el.querySelectorAll("[data-di]").forEach(b=>{ b.onclick = ()=>{ const v = cfgCopy(); v.items.splice(+b.dataset.di, 1); saveCfg(v); renderCfg(); }; });
  if(B("iAdd")) B("iAdd").onclick = ()=>{ const n = B("iName").value.replace(/\s+/g, " ").trim(); if(!n){ B("iName").focus(); return; }
    if(items().some(x=>x.name === n)){ toast("이미 있는 재료예요"); return; }
    const v = cfgCopy(); v.items.push({name:n, k:B("iK").value}); saveCfg(v); haptic("success"); toast('"' + n + '" 도구가 생겼어요'); renderCfg(); };
  B("gGuide").onclick = openGuide;
  B("gReset").onclick = ()=>{ const v = cfgCopy(); v.names = {}; v.words = {}; saveCfg(v); renderCfg(); };
}

/* 처음 들어오면 한 번 보는 안내 세 장. 내 도구 탭의 "안내 다시 보기"로 또 본다 */
let guideI = 0;
const GUIDE = [
  ()=>'<h3>도구를 꾹 눌러요</h3><div class="bx-gpic">' + draw(ICON.milk, IP) + draw(ICON.syrup, IP) + '</div><p>누르고 있는 동안 컵에 부어지고, 손을 떼면 멈춰요. 모자라면 다시 꾹 눌러 더 부어요.</p>',
  ()=>'<h3>순서대로 채점해요</h3><ol class="bx-clist"><li><span class="bx-cn">1</span>' + draw(ICON.ice, IP) + '<span class="bx-cw"><b>' + esc(nm("ice")) + '</b></span><span class="bx-ca">✓</span></li><li><span class="bx-cn">2</span>' + draw(ICON.shot, IP) + '<span class="bx-cw"><b>' + esc(nm("shot")) + '</b></span><span class="bx-ca">✓</span></li><li class="now"><span class="bx-cn">3</span>' + draw(ICON.milk, IP) + '<span class="bx-cw"><b>' + esc(nm("milk")) + '</b></span><span class="bx-ca">지금</span></li></ol><p>재료가 맞아도 차례가 다르면 순서 실수로 세요. 양은 단계마다 따로 봐요.</p>',
  ()=>'<h3>매장마다 다르면 고쳐요</h3><p>처음 연습하는 레시피는 앱이 읽은 순서를 먼저 보여 줘요. 다르면 거기서 고치고, 부르는 이름은 "내 도구"에서 바꿔요.</p><p class="bx-sm">맨 끝의 예시 바닐라 라떼로 먼저 해 볼 수 있어요.</p>'];
function openGuide(){ guideI = 0; paintGuide(); B("guide").hidden = false; }
/* 끝까지 넘기거나 건너뛰면 본 것으로 기억한다. 안내가 떠 있지 않았으면(화면을 그냥 떠날 때) 아무것도 남기지 않는다 */
function closeGuide(){ const g = B("guide"); if(!g || g.hidden) return; g.hidden = true; if(data.hints.indexOf("barGuide") < 0){ data.hints.push("barGuide"); persist(); } }
function paintGuide(){
  const g = B("guide");
  g.innerHTML = '<div class="bx-gbox"><div class="bx-dots">' + GUIDE.map((_, i)=>'<i class="' + (i === guideI ? "on" : "") + '"></i>').join("") + '</div>' + GUIDE[guideI]() +
    '<button class="bx-btn" id="bar-gNext">' + (guideI < GUIDE.length - 1 ? "다음" : "해 볼게츄") + '</button>' + (guideI < GUIDE.length - 1 ? '<button class="bx-skip" id="bar-gSkip">건너뛰기</button>' : '') + '</div>';
  B("gNext").onclick = ()=>{ if(guideI < GUIDE.length - 1){ guideI++; paintGuide(); } else closeGuide(); };
  if(B("gSkip")) B("gSkip").onclick = closeGuide;
}

/* ───── 화면 전환 ───── */
function show(w){ ["play","tidy","result","check","cfg"].forEach(x=>{ B(x).hidden = w !== x; }); }
function setMode(m){ mode = m; B("see").classList.toggle("on", m === "see"); B("mem").classList.toggle("on", m === "mem"); }
function setTab(t, noStart){
  if(busy) return;
  tab = t;
  B("tPrac").classList.toggle("on", t === "prac"); B("tEdit").classList.toggle("on", t === "edit" || t === "free"); B("tCfg").classList.toggle("on", t === "cfg");
  B("pracTop").hidden = t !== "prac"; B("freeLog").hidden = t !== "free";
  B("modeBox").hidden = B("re").hidden = t !== "prac";
  clearHints(); B("hand").innerHTML = ""; B("meter").innerHTML = "";
  if(t === "free"){
    freeCup = R.cup; show("play");
    B("name").textContent = R.name; B("sub").textContent = "직접 만들어 정하기 · " + freeCup;
    replayFree(); renderLog(); say(rec.length ? "이어서 만들어 보츄" : "우리 매장 방식대로 만들어 보츄!");
  }
  else if(t === "cfg"){ show("cfg"); B("name").textContent = "내 도구"; B("sub").textContent = "부르는 이름 · 우리 매장 재료"; renderCfg(); }
  else if(!noStart) start(Math.max(0, RECIPES.indexOf(R)));
}
function renderPick(){
  B("pickSel").innerHTML = RECIPES.map((r, i)=>'<option value="' + i + '">' + (r.ex ? "예시 · " : "") + esc(r.name) + (r.temp ? " · " + esc(r.temp) : "") + " " + r.cup + (planOf(r) ? " · 정한 정답" : "") + "</option>").join("");
  if(R) B("pickSel").value = String(RECIPES.indexOf(R));
}

/* ───── 처음 한 번 그려 두기 ───── */
let built = false;
function build(){
  if(built) return;
  built = true;
  renderTools();
  B("pickSel").addEventListener("change", function(){ start(+this.value); });
  B("re").onclick = ()=>{ if(busy) return; start(RECIPES.indexOf(R)); say("새 컵으로 다시츄!"); };
  B("see").onclick = ()=>{ if(busy || mode === "see") return; setMode("see"); start(RECIPES.indexOf(R)); };
  B("mem").onclick = ()=>{ if(busy || mode === "mem") return; setMode("mem"); start(RECIPES.indexOf(R)); };
  B("tEdit").onclick = ()=>{ if(tab === "prac" || tab === "cfg"){ stopTimers(); if(R) openEdit(); } };
  B("tCfg").onclick = ()=>{ if(tab !== "cfg" && !busy){ stopTimers(); rec = []; setTab("cfg"); } };
  B("tPrac").onclick = ()=>{ if(tab !== "prac"){ stopTimers(); rec = []; setTab("prac"); } };
  B("quit").onclick = ()=>{ barLeave(); go("home"); };
}

/* 학습 방식 시트에서 부른다. pool = 학습 범위의 레시피(고르기로 좁힌 것 포함). 만드는 순서가 없는 레시피는 뺀다 */
function openBar(pool){
  const list = (pool || []).filter(d=>d && (d.steps || []).some(s=>String(s).trim()));
  build(); renderTools();          // 다른 화면에서 백업을 되살렸으면 내 도구가 바뀌었을 수 있다
  RECIPES = list.map(d=>({d:d, name:d.name, temp:d.temp || "", cup:cupOf(d), steps:(d.steps || []).map(String).filter(s=>s.trim())}));
  /* 예시 한 잔은 늘 맨 끝에. 레시피가 아니라 저장도 안 되고(정한 정답은 이 화면을 닫으면 사라진다) 순서가 적힌 레시피가 없어도 해 볼 수 있다 */
  RECIPES.push({d:EX_D, ex:true, name:EX_D.name, temp:EX_D.temp, cup:cupOf(EX_D), steps:EX_D.steps.slice()});
  R = null; tab = "prac"; rec = [];
  B("mouse").innerHTML = mouseSVGWorn("day");
  setMode(mode);
  renderPick();
  go("bar");
  setTab("prac", true);
  start(0);
  B("scroll").scrollTop = 0;
  if((data.hints || []).indexOf("barGuide") < 0) openGuide();
  return true;
}
/* 다른 화면으로 갈 때 붓던 것 · 추출 시계를 멈춘다 */
function barLeave(){ stopTimers(); EX_D.plan = undefined; const g = B("guide"); if(g) g.hidden = true; }

window.openBar = openBar;
window.barLeave = barLeave;
window.cleanBarPlan = cleanPlan;
window.barKeepPlan = keepPlan;
window.cleanBarCfg = cleanCfg;
window.barTest = {parseStep:parseStep, judge:judge, cupOf:cupOf, stepText:stepText, cleanPlan:cleanPlan, keepPlan:keepPlan,
  state:()=>({tab:tab, mode:mode, cur:cur, plan:PLAN, recipe:R ? R.name : null, busy:busy}),
  commit:commit, setTab:setTab, openEdit:openEdit, tidyRows:()=>tidyRows, cleanCfg:cleanCfg, keys:keys};
})();
