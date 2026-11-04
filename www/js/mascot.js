/* 암기쥐 — 쥐돌이 도트 그래픽과 움직임 (그리기 · 깜빡임 · 마시기 · 허둥대기) */

/* =========================================================
   까마귀 — 학습 결과에서 못 외운 게 있을 때만 나온다.
   쥐돌이와 같은 도트 문법(28칸 폭, o 외곽선, ohhho/ohkho 눈)을 쓴다.
   외곽선만 반대다. 쥐돌이는 몸이 밝아 어둡게 두르고, 까마귀는 몸이 어두워
   밝게 둘러야 다크 테마에서 배경에 묻히지 않는다.
   ========================================================= */
const CROW_PAL = {
  o:"#6E6157",
  b:"#221D1A",
  s:"#3E352F",
  e:"#E0A45C",
  E:"#C4823E",
  m:"#7C3A2E",
  h:"#FFFFFF",
  k:"#261F1C"
};
const CROW = {
  idle:["................oo..........","...............obbo.........","..............obbo..........",".............obbo...........",".........o..obbbo...o.......","........obo.obo.obosbo......",".......osssobbbobbssso......","......obssbbbbbbbbbssso.....",".....ossbbbbbbbbbbbbbsso....","....obsssbbsbbbsbbbsssbo....","....ossbbbbbbbbbbbbbbbsso...","...obssbooobbbbbooobbssbo...","...osssohhhobbbohhhobssso...","...obssohkhosbbohkhobssbo...","...ossbohkhobbbohkhobbsso...","...obssohhhobbbohhhosssbo...","...ossbbooobbbbbooobbbsso...","..obssbbsbeeeeesbbbbbssbo...","..osssbbbeeeeeeebbbbbssso...","..obssbbbbEEEEEbbbbbbssbo...",".ossbbbbbbbEEEbbbbbbbbbsso..",".obsssbbbsbbEbbbbbsbbsssbo..","ossbbsbbbbbbbbbbbbbbbbsbsso.","obssbbbbbbbbbbbbbbbbbbbssbo.","ossssbbbbbbbbbbbbbbbbbbssso.","obssbsbbbbbbbbbbbbbbbsbssbo.","ossbbsbbbbbbbbbbbbbbbbbbsso.",".obsssbbbbbbbbbbbbbbbbsssbo.",".ossbbsbbbbbbbbbbbbbbbbbsso.",".obssbbbsbbbbbbbbbsbbsbssbo.","..ossssbbbbbbbbbbbbbbbssso..","..obssbbbbbbbbbbbbbbsbssbo..","...ossbsbbbbbbbbbbbbbbsso...","...obsssbbbbsbbbbbsssssbo...","....ossbsbbbbbbbbbbbbsso....","....obssbbbbbbbbbbsbssbo....",".....ossssbbbbbbbbbssso.....","......oobbbsbbbbbsbbboo.....",".......ooeeeoooooeeeoo......","........ooo.......ooo......."],
  caw:["................oo..........","...............obbo.........","..............obbo..........",".............obbo...........",".........o..obbbo...o.......","........obo.obo.obosbo......",".......osssobbbobbssso......","......obssbbbbbbbbbssso.....",".....ossbbbbbbbbbbbbbsso....","....obsssbbsbbbsbbbsssbo....","....ossbbbbbbbbbbbbbbbsso...","...obssbooobbbbbooobbssbo...","...osssohhhobbbohhhobssso...","...obssohkhosbbohkhobssbo...","...ossbohkhobbbohkhobbsso...","...obssohhhobbbohhhosssbo...","...ossbbooobbbbbooobbbsso...","..obssbbsbeeeeesbbbbbssbo...","..osssbbbeeeeeeebbbbbssso...","..obssbbbbmmmmmbbbbbbssbo...",".ossbbbbbbmmmmmbbbbbbbbsso..",".obsssbbbEEEEEEEbbsbbsssbo..","ossbbsbbbbEEEEEbbbbbbbsbsso.","obssbbbbbbbbbbbbbbbbbbbssbo.","ossssbbbbbbbbbbbbbbbbbbssso.","obssbsbbbbbbbbbbbbbbbsbssbo.","ossbbsbbbbbbbbbbbbbbbbbbsso.",".obsssbbbbbbbbbbbbbbbbsssbo.",".ossbbsbbbbbbbbbbbbbbbbbsso.",".obssbbbsbbbbbbbbbsbbsbssbo.","..ossssbbbbbbbbbbbbbbbssso..","..obssbbbbbbbbbbbbbbsbssbo..","...ossbsbbbbbbbbbbbbbbsso...","...obsssbbbbsbbbbbsssssbo...","....ossbsbbbbbbbbbbbbsso....","....obssbbbbbbbbbbsbssbo....",".....ossssbbbbbbbbbssso.....","......oobbbsbbbbbsbbboo.....",".......ooeeeoooooeeeoo......","........ooo.......ooo......."]
};
/* pose 는 자세 이름. 행을 직접 줘도 된다(고맙다 창의 기쁜 얼굴 — ads.js) */
function crowSVG(pose){
  const rows = Array.isArray(pose) ? pose : (CROW[pose] || CROW.idle);
  const hh = rows.length, ww = rows[0].length;
  let out = "";
  for(let y=0; y<hh; y++){
    let x = 0;
    while(x < ww){
      const ch = rows[y][x];
      if(ch === "."){ x++; continue; }
      let n = 1;
      while(x+n < ww && rows[y][x+n] === ch) n++;
      out += '<rect x="'+x+'" y="'+y+'" width="'+n+'" height="1" fill="'+CROW_PAL[ch]+'"/>';
      x += n;
    }
  }
  return '<svg viewBox="0 0 '+ww+' '+hh+'" shape-rendering="crispEdges" aria-hidden="true">'+out+'</svg>';
}
/* 까악 두 번. 두 번째가 짧아 재촉하는 느낌이 난다 */
let cawT = null;
function stopCaw(){ if(cawT){ clearTimeout(cawT); cawT = null; } }
function startCaw(){
  const el = $("#resCrow"); if(!el) return;
  stopCaw();
  el.innerHTML = crowSVG("caw");
  sfx("caw");
  if(reduceMotion()) return;
  const seq = [["idle",520],["caw",300],["idle",260],["caw",240],["idle",0]];
  let i = 0;
  const step = ()=>{
    const s = seq[i];
    el.innerHTML = crowSVG(s[0]);
    if(s[0] === "caw") sfx("caw");
    i++;
    if(i < seq.length) cawT = setTimeout(step, s[1]);
  };
  cawT = setTimeout(step, 520);
}


/* =========================================================
   비상 달리기 — 오늘 폐기가 있으면 홈에서 두 바퀴 돌고 제자리로.
   8방향(옆4포즈·사선·정면·뒤) 스프라이트를 타원 궤도로 돌린다.
   그림자는 바닥에 붙어 있고 몸만 뜬다. 방향 전환은 공중 프레임에서만.
   ========================================================= */
/* 머리 위 경광등 — 스프라이트와 같은 도트 문법, 켜짐엔 빛살 */
const SIREN = {
  on: ["y.....y.....y",
       ".y....y....y.",
       "......R......",
       "....rRCRr....",
       "....rRRRr....",
       ".....ggg....."],
  off:[".............",
       ".............",
       ".............",
       "....ddddd....",
       "....ddddd....",
       ".....ggg....."]
};
const SIREN_PAL = {r:"#CE3C2E", R:"#E85C48", C:"#FFD6C8", d:"#96322A", g:"#786C64", y:"#E85C48"};
function sirenSVG(lit){
  const rows = lit ? SIREN.on : SIREN.off;
  let out = "";
  for(let y=0; y<rows.length; y++){
    for(let x=0; x<rows[y].length; x++){
      const ch = rows[y][x];
      if(ch !== ".") out += '<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+SIREN_PAL[ch]+'"/>';
    }
  }
  return '<svg viewBox="0 0 13 6" shape-rendering="crispEdges" aria-hidden="true">'+out+'</svg>';
}

/* 도트 화면(앱)의 비상등 — 15x10. 둥근 빨간 유리 돔 + 금속 받침 + 짙은 외곽선.
   흰 심지가 왼쪽 → 가운데 → 오른쪽 → 뒤(어두움)로 돌고, 빛살은 빛이 향한 쪽으로 뻗는다.
   13x6 비상등은 머리 위에서 빨간 점 몇 개로만 보여 무엇인지 잘 안 읽혔다 */
const SIREN_DOT = {
  L:["y..............",".y.............","..y..kkkkk.....","yy..kCLRRRk....","...kLCLRRRrk...","y..kLLRRRrrk...","...kRRRRrrrk...","..kGGGGGGGggk..","..kggggggggggk.","...kkkkkkkkkk.."],
  C:["...y...y...y...","....y..y..y....",".....kkkkk.....","....kRLCLRk....","yy.kRRLCLRrk.yy","...kRRLLLRrk...","...kRRRRRrrk...","..kGGGGGGGggk..","..kggggggggggk.","...kkkkkkkkkk.."],
  R:["..............y",".............y.",".....kkkkk..y..","....kRRRLCk..yy","...kRRRRLCLk...","...kRRRRLLrk..y","...kRRRRrrrk...","..kGGGGGGGggk..","..kggggggggggk.","...kkkkkkkkkk.."],
  O:["...............","...............",".....kkkkk.....","....kdddddk....","...kdDddddek...","...kdddddeek...","...kddddeeek...","..kGGGGGGGggk..","..kggggggggggk.","...kkkkkkkkkk.."]
};
const SIREN_DOT_ROT = ["L","C","R","O"];
const SIREN_DOT_PAL = {k:"#5A2620", R:"#E0453A", r:"#B8322A", L:"#FF9A7E", C:"#FFF3E8", y:"#FF6A3D", d:"#9A3A30", e:"#7A2C25", D:"#C4675A", G:"#B9ADA2", g:"#7F736A"};
function sirenDotSVG(k){
  const rows = SIREN_DOT[k];
  let out = "";
  rows.forEach((r, y)=>{ for(let x = 0; x < r.length; x++) if(r[x] !== ".") out += `<rect x="${x}" y="${y}" width="1" height="1" fill="${SIREN_DOT_PAL[r[x]]}"/>`; });
  return `<svg viewBox="0 0 15 10" shape-rendering="crispEdges" aria-hidden="true">${out}</svg>`;
}

let panicT = null, panicDay = null;
function stopPanic(){
  if(panicT){ clearInterval(panicT); panicT = null; }
  const L = $("#panicLayer"); if(L) L.classList.remove("on");
  const m = $("#mascot"); if(m) m.style.visibility = "";
  const fx = $("#panicFx"); if(fx) fx.innerHTML = "";
  const b = $("#mbubble"); if(b) b.style.opacity = "";
}
function runPanic(laps){
  if(panicT || reduceMotion()) return;
  if(!$("#s-home").classList.contains("active")) return;
  haptic("warning");                        // 하루 한 번. 오늘 폐기가 있다는 신호
  if(isDot()){ runLane(laps); return; }
  const L = $("#panicLayer"), R = $("#panicRun"), S = $("#panicSh"), B = $("#panicBell");
  let panicLit = null;
  const W = $("#s-home").clientWidth || 390;
  const cx = W/2, cy = 168;
  const rx = Math.min(105, cx - 66), ry = 56;   // 몸(56x80)이 겹치지 않는 최소선 위
  const FR = 48, total = FR * (laps || 2);
  let i = 0, prevK = null;
  stopSip();
  $("#mascot").style.visibility = "hidden";
  $("#mbubble").style.opacity = "0";        // 주인 없는 말풍선만 떠 있지 않게
  L.classList.add("on");
  panicT = setInterval(()=>{
    if(i >= total || !$("#s-home").classList.contains("active")){
      const done = $("#s-home").classList.contains("active");
      stopPanic(); drawMascot();
      if(done) popBubble();                           // 돌아와서 다시 말한다
      return;
    }
    const t = 2*Math.PI*(i % FR)/FR;             // 꼭대기에서 시계 방향
    const a = t - Math.PI/2;
    const mx = cx + rx*Math.cos(a), my = cy + ry*Math.sin(a);
    let k = Math.floor((t + Math.PI/8)/(Math.PI/4)) % 8;
    const ph = i % 6;                            // 6포즈: 내딛기→밀기→공중→교차→밀기→공중
    const air = ph === 2 || ph === 5;
    if(prevK !== null && !air && k !== prevK) k = prevK;  // 공중에서만 몸을 튼다
    prevK = k;
    const run = RUN_SPR["s"+ph];
    const spec = [
      [run, true],        [RUN_SPR.qf, true],  [MOUSE.day, false], [RUN_SPR.qf, false],
      [run, false],       [RUN_SPR.qb, false], [RUN_SPR.bk, false],[RUN_SPR.qb, true]
    ][k];
    const hop = [0,2,6,0,2,6][ph];               // 밀기에서 반쯤, 공중에서 다 뜨는 포물선
    R.innerHTML = rowsSVG(spec[0], spec[1]);
    const ry2 = Math.round(my-58)-hop;
    R.style.transform = "translate3d("+Math.round(mx-28)+"px,"+ry2+"px,0)";
    const lit = (Math.floor(i/3) % 2) === 0;
    if(lit !== panicLit){ panicLit = lit; B.innerHTML = sirenSVG(lit); }
    B.style.transform = "translate3d("+Math.round(mx-13)+"px,"+(ry2-8)+"px,0)";
    const fy = Math.round(my + 22);
    S.style.transform = "translate3d("+Math.round(mx-17)+"px,"+fy+"px,0) scale("+(1 - hop*0.035).toFixed(2)+")";
    S.style.opacity = String(0.8 - hop*0.05);
    i++;
  }, 42);                                    // 한 바퀴 약 2초 — 다급하게
}

/* 도트 화면(앱)은 타원 대신 인사말과 진도 카드 사이 빈 줄을 좌우로 왕복한다.
   타원은 칸마다 외곽선이 또렷한 도트 홈에서 글자 · 카드를 밟아 그림이 겹쳐 나온 것처럼 보였고,
   위아래로 갈 때는 서 있는 그림이 미끄러졌다. 좌우만 달리면 옆모습 6포즈로 계속 다리가 움직인다.
   줄은 그때 잰다: 바닥은 진도 카드 윗면(말풍선이 두 줄이면 카드가 내려가고 줄도 따라간다) */
/* 달리기의 몸놀림 (홈 runLane · 옷장 closetRun). 그림은 그대로 두고 자리 · 박자 · 눌림만 정한다.
   [가로, 세로, 뜬 높이] 배율. 눌릴 때 가로로 퍼지고 세로로 줄어든다(발을 기준으로 — #panicRun 의 transform-origin) */
const RUN_HOP = [0, 5, 3, 0, 5, 3];       // 밀어 올렸다 내려앉는다. 맨 위에서 한 장 만에 바닥으로 떨어지지 않게
const RUN_CROUCH = [[1.05, .95], [1.1, .88], [1.1, .88]];   // 뛰기 전에 웅크린다
const RUN_LAND = [[1.14, .84], [1.07, .93], [.98, 1.03]];   // 내려앉을 때 납작해졌다 돌아온다
const RUN_TURN = [[1.08, .92, 0], [1, 1, 3], [.96, 1.05, 5], [1, 1, 3], [1.08, .92, 0], [1, 1, 0]];   // 멈추며 눌렸다가 작게 뛰고 돌아선다
/* from 에서 to 까지 한 장마다의 x. acc 대로 빨라져 top 으로 달리고, 벽 앞에서는 거꾸로 줄어 멈춘다 */
function runXs(from, to, top, acc){
  const dec = acc.slice().reverse(), dir = to < from ? -1 : 1, out = [];
  const tail = i=>dec.slice(i).reduce((a, b)=>a + b, 0);
  let x = from, rem = Math.abs(to - from), n = 0;
  while(rem > 0){
    let st = n < acc.length ? acc[n] : top;
    if(rem <= tail(0)){ const i = dec.findIndex((v, k)=>tail(k) <= rem); st = i < 0 ? dec[dec.length - 1] : dec[i]; }
    st = Math.min(st, rem);
    x += dir*st; rem -= st; n++;
    out.push(x);
  }
  return out;
}
function lanePlan(laps){
  const base = $("#panicLayer").getBoundingClientRect();
  const m = $("#mascot").getBoundingClientRect(), hero = $("#s-home .hero").getBoundingClientRect();
  const W = $("#s-home").clientWidth || 390;
  const floor = Math.round(hero.top - base.top) - 3, top = floor - 80;   // 발이 카드 윗면에 닿는다
  const home = { x:Math.round(m.left - base.left), y:Math.round(m.top - base.top) };
  const xR = W - 20 - 56, xL = 20, land = xR - 20;      // 비스듬히 뛰어내리도록 줄 끝에서 조금 안쪽에 내려앉는다
  const out = [];
  /* 그림자는 바닥에 가까울수록 크고 진하다 */
  const shadow = (x, y)=>{ const g = Math.max(0, Math.min(1, 1 - (top - y)/((top - home.y) || 1))); return { x:x + 11, y:floor - 5, s:0.5 + 0.5*g, o:0.8*g }; };
  const front = (x, y, sx, sy, flip, burst)=>out.push({ rows:RUN_SPR.qf, flip:!!flip, x:x, y:y, sx:sx, sy:sy, burst:!!burst, sh:shadow(x, y) });
  /* 포물선 폴짝. 시작점 · 끝점 중 높은 쪽보다 peak 만큼 더 올라간다. 올라갈 때 느려지고 떨어질 때 빨라지며, 빠를수록 세로로 늘어난다 */
  const leap = (x0, y0, x1, y1, peak, n)=>{
    const d = y1 - y0, up = Math.max(0, -d) + peak, b = -2*up - 2*Math.sqrt(up*(up + d)), a = d - b;
    for(let k = 1; k <= n; k++){
      const t = k/n, e = Math.min(1, Math.abs(2*a*t + b)/320)*0.1;
      front(Math.round(x0 + (x1 - x0)*t), Math.round(y0 + a*t*t + b*t), 1 - e*0.7, 1 + e);
    }
  };
  RUN_CROUCH.forEach(c=>front(home.x, home.y, c[0], c[1]));
  /* 머리 위 비상등(18pt)이 화면 위로 잘리지 않는 만큼만 뛰어오른다. 위 여백이 없는 기기에서는 그대로 떨어진다 */
  const room = Math.max(0, home.y - 18);
  leap(home.x, home.y, land, top, Math.min(12, room), 10);
  RUN_LAND.forEach((c, k)=>front(land, top, c[0], c[1], false, k === 0));
  const passes = (laps || 2)*2;
  let x = land, ph = 0;
  for(let p = 0; p < passes; p++){
    const left = p % 2 === 0, last = p === passes - 1, to = last ? land : (left ? xL : xR);
    runXs(x, to, 10, [3, 5, 7, 9]).forEach(nx=>{
      const hop = RUN_HOP[ph % 6];
      out.push({ rows:RUN_SPR["s" + (ph % 6)], flip:!left, x:nx, y:top - hop, sx:1, sy:1, sh:shadow(nx, top - hop) });
      ph++;
    });
    x = to;
    if(!last) RUN_TURN.forEach(c=>front(x, top - c[2], c[0], c[1], left));   // 끝에서 정면을 한 번 보고 돌아선다
  }
  RUN_CROUCH.forEach(c=>front(land, top, c[0], c[1]));
  leap(land, top, home.x, home.y, Math.min(10, room), 11);
  front(home.x, home.y, 1.1, .9); front(home.x, home.y, 1.04, .96);
  return out;
}
/* 달릴 때 얼굴: 놀라서 눈이 휘둥그레(눈동자를 한 칸으로), 털 명암으로 둥근 눈썹(목 줄과 같은 색 c), 이마 뒤 땀 한 방울.
   입은 그대로(명암만). 옆모습(s0~s5)과 돌아설 때 정면(qf) 둘 다. 달리기 그림(RUN_SPR)은 그대로 두고 그릴 때 바꾼다 */
/* 눈동자 아래 칸을 흰자로(한 칸 눈동자) · 눈썹 · 땀. 테두리(o) · 귀(p)는 덮지 않는다 — 윤곽이 끊기지 않게 */
const PANIC_SIDE = [[13,6,"h"], [8,6,"c"],[8,7,"c"],[9,5,"c"],[9,8,"c"],
                    [9,17,"B"],[10,16,"S"],[10,17,"B"],[11,16,"S"],[11,17,"S"]];
const PANIC_FRONT = [[13,5,"h"],[13,14,"h"], [8,5,"c"],[8,6,"c"],[9,7,"c"],
                     [8,13,"c"],[8,14,"c"],[8,15,"c"],[9,12,"c"],[9,16,"c"], [7,17,"B"],[8,17,"S"],[8,18,"S"]];
const panicFaceMemo = new Map();
function panicFace(rows){
  if(!panicFaceMemo.has(rows)){
    const g = rows.map(r=>r.split(""));
    (rows === RUN_SPR.qf ? PANIC_FRONT : PANIC_SIDE).forEach(([y, x, ch])=>{ if(g[y] && g[y][x] !== undefined && ".op".indexOf(g[y][x]) < 0) g[y][x] = ch; });
    panicFaceMemo.set(rows, g.map(r=>r.join("")));
  }
  return panicFaceMemo.get(rows);
}
/* 뒤로 튀는 땀방울 · 발이 닿을 때 이는 먼지. 달리기 층 그림에 들어갈 조각 */
function panicBits(sweat, dust){
  let out = "";
  sweat.forEach(s=>{ out += `<rect x="${Math.round(s.x)}" y="${Math.round(s.y)}" width="2" height="4" fill="${MOUSE_PAL.S}"/><rect x="${Math.round(s.x)}" y="${Math.round(s.y)}" width="2" height="2" fill="${MOUSE_PAL.B}"/>`; });
  dust.forEach(d=>{ const z = d.a > 4 ? 6 : 4;
    out += `<rect x="${d.x}" y="${d.y}" width="${z}" height="${z}" fill="${d.a > 4 ? MOUSE_PAL.g : MOUSE_PAL.L}"/><rect x="${d.x + d.vx*3}" y="${d.y - 4}" width="${z - 2}" height="${z - 2}" fill="${MOUSE_PAL.L}"/>`; });
  return out;
}
function runLane(laps){
  const L = $("#panicLayer"), R = $("#panicRun"), S = $("#panicSh"), B = $("#panicBell");
  stopSip();
  L.classList.add("on");                    // 켠 뒤에 재야 자리가 나온다
  const plan = lanePlan(laps);
  /* 달리기용 그림이 있는 옷(망토 · 호박 머리)은 입고 달린다. 망토면 자락이 펄럭이고 박쥐 셋이 따라온다 (closet.js) */
  const wear = runWear(), cape = wear.filter(it=>it.run.tail)[0];
  const fx = $("#panicFx"), bats = cape && cape.run.bats ? [0, 1, 2].map(()=>({x:null, y:null})) : [];
  const front = {}; wear.forEach(it=>{ front[it.slot] = it.id; });      // 정면(폴짝 · 돌아서기)에서는 옷장 그림 그대로
  const fxW = L.clientWidth, fxH = L.clientHeight;
  runDressMemo.clear();
  $("#mascot").style.visibility = "hidden";
  $("#mbubble").style.opacity = "0";        // 뛰는 줄이 말풍선 자리다. 끝나면 다시 말한다
  let i = 0, rot = null;
  const sweat = [], dust = [];
  let fxLast = "";
  panicT = setInterval(()=>{
    if(i >= plan.length || !$("#s-home").classList.contains("active")){
      const done = $("#s-home").classList.contains("active");
      stopPanic(); drawMascot();
      if(done) popBubble();                     // 아이콘까지 그대로 다시 말한다
      return;
    }
    const f = plan[i];
    /* 옆모습엔 달리기용 덧그림, 정면(폴짝 · 돌아서기 RUN_SPR.qf)엔 옷장 그림을 입힌다. 망토 자락은 옆모습일 때만 */
    const lit = Math.floor(i/8) % 3 === 0, side = f.rows !== RUN_SPR.qf;
    const face = panicFace(f.rows);
    const rows = !wear.length ? face : side ? runDressed(face, wear, lit) : dressRows(face, "stand", front, lit);
    R.innerHTML = rowsSVG(rows, f.flip);
    /* 땀은 몇 걸음마다 이마 뒤에서 뒤로 튀고, 먼지는 발이 닿을 때(s0 · s3) 발 뒤에서 인다. 뒤 = 보는 쪽의 반대 */
    if(fx){
      /* 방향은 생길 때 정한다 — 돌아서도 이미 튄 땀 · 먼지는 원래 쪽으로 간다 */
      const back = f.flip ? -1 : 1;
      if(side && i % 9 === 0) sweat.push({x:f.x + (f.flip ? 20 : 34), y:f.y + 20, vx:3*back, vy:-3, a:10});
      if(f.rows === RUN_SPR.s0 || f.rows === RUN_SPR.s3) dust.push({x:f.x + (f.flip ? 8 : 42), y:f.sh.y - 2, vx:2*back, a:7});
      if(f.burst) [[-20, -3, 7], [20, 3, 7], [-30, -2, 6], [30, 2, 6]].forEach(d=>dust.push({x:f.x + 28 + d[0], y:f.sh.y - 2, vx:d[1], a:d[2]}));   // 내려앉으면 양쪽으로 인다
      sweat.forEach(s=>{ s.x += s.vx; s.y += s.vy; s.vy += 0.8; s.a--; });
      dust.forEach(d=>{ d.x += d.vx; d.y -= 1; d.a--; });
      for(let k = sweat.length - 1; k >= 0; k--) if(sweat[k].a <= 0) sweat.splice(k, 1);
      for(let k = dust.length - 1; k >= 0; k--) if(dust[k].a <= 0) dust.splice(k, 1);
      const bits = (cape ? runFxSVG(cape, f, i, bats, side) : "") + panicBits(sweat, dust);
      const html = bits ? `<svg width="${fxW}" height="${fxH}" viewBox="0 0 ${fxW} ${fxH}" shape-rendering="crispEdges" aria-hidden="true">${bits}</svg>` : "";
      if(html !== fxLast){ fx.innerHTML = html; fxLast = html; }      // 그릴 게 없거나 같으면 건드리지 않는다
    }
    R.style.transform = "translate3d(" + f.x + "px," + f.y + "px,0) scale(" + f.sx.toFixed(2) + "," + f.sy.toFixed(2) + ")";
    const k = SIREN_DOT_ROT[Math.floor(i/3) % 4];
    if(k !== rot){ rot = k; B.innerHTML = sirenDotSVG(k); }
    B.style.transform = "translate3d(" + (f.x + 13) + "px," + Math.round(f.y - 18 + 80*(1 - f.sy)) + "px,0)";   // 눌리면 머리 위 비상등도 같이 내려간다
    S.style.transform = "translate3d(" + f.sh.x + "px," + f.sh.y + "px,0) scale(" + f.sh.s.toFixed(2) + ")";
    S.style.opacity = String(f.sh.o);
    i++;
  }, 42);
}

/* 빈 화면용 쥐돌이 — 글자만 있던 자리를 채운다.
   밤이라도 자는 모습 대신 깨어 있는 얼굴을 쓴다(안내하는 자리라서). */
/* k 는 도트 한 칸을 몇 px 로 그릴지. 정수만 받는다 —
   28x40 격자를 소수 배율로 늘리면 칸 경계가 반 px 에 걸려 그림이 지저분해진다. */
function emptyMouseMood(){
  const m = moodOf(new Date().getHours());
  return m === "night" ? "day" : m;
}
function emptyMouse(k){
  const s = k || 2;
  return `<div class="mz" style="width:${28*s}px;height:${40*s}px">`
       + mouseSVGWorn(emptyMouseMood(), false) + `</div>`;
}

/* 빈 화면 쥐돌이도 눈을 깜빡인다. 눈만 바뀌므로 몸은 그대로다.
   다만 화면이 움직이는 중이거나 검색창에 타이핑 중일 때는 쉰다 —
   그때 다시 그리면 도트가 튀어 보이고, 글 쓰는 옆에서 깜빡이면 거슬린다. */
let emptyBlinkTimer = null;
function emptyMice(){
  return [...document.querySelectorAll("#listPane .mz")]
    .filter(el => el.getBoundingClientRect().width > 0);   // 숨은 탭은 건너뛴다
}
function emptyBlinkOk(){
  if(reduceMotion() || document.hidden) return false;
  if(!$("#s-list").classList.contains("active")) return false;
  if(segS.busy || segS.on) return false;              // 미는 중에는 손대지 않는다
  if(document.activeElement === $("#q")) return false; // 검색창에 커서가 있을 때도
  return true;
}
function scheduleEmptyBlink(){
  clearTimeout(emptyBlinkTimer);
  emptyBlinkTimer = setTimeout(()=>{
    if(emptyBlinkOk()){
      const els = emptyMice();
      if(els.length){
        const shut = mouseSVGWorn("blink", false), open = mouseSVGWorn(emptyMouseMood(), false);
        els.forEach(el => el.innerHTML = shut);
        setTimeout(()=>{ emptyMice().forEach(el => el.innerHTML = open); }, 140);
      }
    }
    scheduleEmptyBlink();
  }, 3600 + Math.random()*4600);                       // 홈보다 느긋하게
}
scheduleEmptyBlink();
/* 마스코트: 눈 깜빡임만. 몸은 움직이지 않는다.
   배를 부풀리는 숨쉬기도 넣어봤지만, 도트 그림이라 한 칸만 움직여도
   덩어리가 들썩이는 것처럼 보여서 뺐다. */
/* happy: 기쁜 얼굴(생일 폭죽이 터지는 동안 — birthday.js, 기다리다 풀렸을 때 — waiting.js)
   cheer: 기다리다 풀려서 잠깐 기쁜 얼굴(waiting.js). happy 와 따로 둔다 — 서로의 끝이 상대를 꺼 버리지 않게
   away: 며칠 만에 열어 기다린 얼굴("sulk" · "sad" · "down", 아니면 "" — waiting.js) */
const mascot = {blink:false, lit:false, glowT:[], puff:false, happy:false, cheer:false, away:"", awayGap:0, madeUp:false};
let blinkTimer = null;
function currentMood(){ return moodOf(new Date().getHours()); }
function reduceMotion(){
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}
function drawMascot(force){
  const el = $("#mascot");
  if(!el) return;
  if(sipping && !force) return;             // 커피 마시는 중엔 건드리지 않는다(force: 다 마시고 폴짝할 때 평소 모습을 그린다)
  /* 날씨 옷은 밤에는 입히지 않는다. 자고 있는데 우비를 입고 있으면 이상하다.
     날씨 옷을 입은 동안은 깜빡이지 않는다(깜빡임 그림에는 날씨 옷이 없다).
     옷장 옷은 깜빡임 그림에도 입힌다. 빛나는 옷(호박 — closet.js 의 glow)의 번쩍임은 깜빡임과 따로 돈다(scheduleGlow) */
  const mood = currentMood(), night = mood === "night";
  const wx = night || wearsSeasonal() ? null : wxNow();     // 한정 옷(핼러윈 · 크리스마스)을 입었으면 날씨 옷 대신 그 옷을 보인다
  if(wx) el.innerHTML = weatherSVGWorn(wx);                       // 날씨 옷 위에는 안경만(closet.js)
  else if((mascot.happy || mascot.cheer) && !night) el.innerHTML = happyMouseSVG(mood);   // 생일 폭죽이 터지는 동안 · 기다리다 풀렸을 때
  /* 기다린 얼굴인 동안은 깜빡이지 않는다. 깜빡임 그림에는 그 얼굴이 없어 평소 얼굴 · 벗겨 둔 안경이 잠깐 비친다 */
  else if(mascot.away && !night) el.innerHTML = faceMouseSVG(mascot.away, mood);   // 며칠 만에 열었을 때
  else el.innerHTML = mouseSVGWorn(mascot.blink ? blinkFrame(mascot.blink) : mood, mascot.puff, undefined, mascot.lit);
}

/* 깜빡임: 뜬 눈 → 반 눈 → 감은 눈 → 반 눈 → 뜬 눈. 감은 눈 한 장만 끼우면 뚝 끊겨 보인다.
   blink 상태는 false(뜸) · "half"(반) · true(감음). [상태, 시작 ms]. 두 번이면 반 눈을 거쳐 한 번 더 감는다 */
const BLINK_ONE = [["half", 0], [true, 50], ["half", 140], [false, 200]];
const BLINK_TWICE = [["half", 0], [true, 40], ["half", 110], [true, 150], ["half", 220], [false, 270]];
function blinkFrame(b){ return b === "half" ? "blinkh" : "blink"; }
/* st 의 blink 를 차례로 바꾸며 draw(). 다 뜨는 데 걸리는 ms 를 돌려준다.
   하던 깜빡임은 끊고 새로 시작한다(자동 깜빡임 중에 쥐돌이를 눌러도 두 줄이 섞이지 않게) */
function runBlink(st, draw, twice){
  const steps = twice ? BLINK_TWICE : BLINK_ONE;
  blinkStop(st);
  st.blinkT = steps.map(s=>setTimeout(()=>{ st.blink = s[0]; draw(); }, s[1]));
  return steps[steps.length - 1][1];
}
function blinkStop(st){ (st.blinkT || []).forEach(clearTimeout); st.blinkT = []; st.blink = false; }

/* 아침에 커피 한 잔 — 한 번만 마시고 원래 모습으로. [그림, ms]
   드는 · 내리는 건 빠르게, 홀짝과 다 마신 "하아"는 길게. 끝에 컵이 사라질 때 한 칸 폴짝(기운 났다) */
const SIP_SEQ = [["sip1", 380], ["sip2", 150], ["sip2b", 130], ["sip3", 820], ["sip3b", 130], ["sip4", 170], ["sip5", 650]];
const SIP_HOP_MS = 130;
let sipT = null, sipping = false, sipDoneToday = false;
function stopSip(){
  if(sipT){ clearTimeout(sipT); sipT = null; }
  sipping = false;
  const el = $("#mascot"); if(el) el.style.translate = "";
}
function playSip(){
  const el = $("#mascot");
  if(!el || reduceMotion()) return;
  if(currentMood() !== "morning") return;
  if(mascot.happy) return;                  // 생일 폭죽이 터지는 동안에는 마시지 않는다(기쁜 얼굴을 덮어 버린다)
  stopSip();
  clearTimeout(blinkTimer); blinkStop(mascot);
  sipping = true;
  let i = 0;
  const step = ()=>{
    if(!mascotAwake()){ stopSip(); drawMascot(); scheduleBlink(); return; }
    if(i >= SIP_SEQ.length){
      /* 평소 모습으로 돌아오며 한 칸(그림 높이의 1/40) 떴다가 내려앉는다. 폴짝하는 동안도 마시는 중으로 친다(번쩍임 · 깜빡임이 끼지 않게).
         transform 이 아니라 translate 를 써서 누를 때의 .mascot:active 줄어듦과 겹치지 않는다 */
      drawMascot(true);
      el.style.translate = "0 -" + (el.clientHeight / 40) + "px";
      sipT = setTimeout(()=>{ stopSip(); scheduleBlink(); }, SIP_HOP_MS);
      return;
    }
    el.innerHTML = mouseSVGWorn(SIP_SEQ[i][0]);
    sipT = setTimeout(step, SIP_SEQ[i][1]);
    i++;
  };
  step();
}
function mascotAwake(){
  return $("#s-home").classList.contains("active") && !document.hidden;
}
function scheduleBlink(){
  clearTimeout(blinkTimer);
  if(reduceMotion()) return;
  blinkTimer = setTimeout(()=>{
    if(mascot.lit){ scheduleBlink(); return; }       // 번쩍이는 중이면 이번 깜빡임은 건너뛴다(둘이 겹치지 않게)
    if(mascotAwake() && currentMood() !== "night") runBlink(mascot, drawMascot, Math.random() < 0.25);    // 가끔 두 번
    scheduleBlink();
  }, 2600 + Math.random()*4200);
}

/* 빛나는 옷의 번쩍임. 눈 깜빡임과 다른 박자(더 드물고, 촛불처럼 두세 번 일렁인다)라 둘이 같이 움직여 보이지 않는다.
   st 는 blink · lit · glowT 를 가진 상태(홈의 mascot, 옷장의 closetStage). 눈을 감고 있으면 뜬 뒤에 시작하고, 다 끝나면 done().
   새로 시작하면 하던 일렁임은 끊는다(glowStop) */
function glowRun(st, draw, done){
  glowStop(st);
  const go = ()=>{
    if(st.blink){ st.glowT.push(setTimeout(go, 250)); return; }
    const steps = Math.random() < 0.5 ? [[true, 0], [false, 220], [true, 380], [false, 640]] : [[true, 0], [false, 300]];
    steps.forEach(([on, t])=>st.glowT.push(setTimeout(()=>{ st.lit = on; draw(); }, t)));
    st.glowT.push(setTimeout(done, steps[steps.length - 1][1] + 50));
  };
  go();
}
function glowStop(st){ (st.glowT || []).forEach(clearTimeout); st.glowT = []; }
/* 홈 쥐돌이가 옷 입은 평소 그림인가(날씨 옷 · 기쁜 얼굴 · 기다린 얼굴 · 밤에는 번쩍임이 보이지 않는다) */
function mascotPlain(){
  return currentMood() !== "night" && !wxNow() && !mascot.happy && !mascot.cheer && !mascot.away;
}
let glowTimer = null;
function scheduleGlow(){
  clearTimeout(glowTimer);
  glowStop(mascot);
  if(mascot.lit){ mascot.lit = false; drawMascot(); }
  if(reduceMotion() || !wearGlows()) return;
  glowTimer = setTimeout(()=>{
    if(!mascotAwake() || sipping || !mascotPlain()){ scheduleGlow(); return; }
    glowRun(mascot, drawMascot, scheduleGlow);
  }, 4200 + Math.random()*5200);
}

function moodOf(hour){
  if(hour < 5) return "night";
  if(hour < 11) return "morning";
  if(hour < 18) return "day";
  if(hour < 22) return "evening";
  return "night";
}

/* =========================================================
   접속 시각 · 인사 · 응원 (전부 기기 시계 기준, 서버 없음)
   ========================================================= */
function ymd(dt){
  return dt.getFullYear() + "-" + String(dt.getMonth()+1).padStart(2,"0") + "-" + String(dt.getDate()).padStart(2,"0");
}
function dayGap(a, b){  // "YYYY-MM-DD" 사이의 날짜 차이
  const pa = a.split("-").map(Number), pb = b.split("-").map(Number);
  const da = new Date(pa[0], pa[1]-1, pa[2]), db = new Date(pb[0], pb[1]-1, pb[2]);
  return Math.round((db - da) / 86400000);
}
const DOW = ["일","월","화","수","목","금","토"];

/* 오늘 처음 열었는지 판단하고 연속 접속일을 갱신한다 */
function touchVisit(now){
  const today = ymd(now);
  const v = data.visit || {};
  let kind = "same", gap = 0;
  if(!v.last){
    kind = "first"; v.streak = 1; v.count = 1; v.first = today;
  } else if(v.last === today){
    kind = "same";
  } else {
    gap = dayGap(v.last, today);
    v.count = (v.count || 0) + 1;
    if(gap === 1){ v.streak = (v.streak || 0) + 1; kind = "next"; }
    else { v.streak = 1; kind = "back"; }
  }
  v.last = today;
  data.visit = v;
  persist();
  return {kind:kind, gap:gap, streak:v.streak || 1, count:v.count || 1};
}

function timeGreet(h){
  if(h < 5)  return "밤이 깊었어요";
  if(h < 11) return "좋은 아침이에요";
  if(h < 14) return "점심때가 됐네요";
  if(h < 18) return "오후도 힘내요";
  if(h < 22) return "오늘도 수고했어요";
  return "하루 마무리 중이네요";
}

/* 쥐돌이 대사는 문장이 끝나면 줄을 바꾼다. 마침표 · 느낌표 · 물음표 뒤 빈칸을 줄바꿈 문자로 바꿔 두면
   앱(도트)은 white-space:pre-line 으로 줄을 나누고, 웹은 줄바꿈을 빈칸 하나로 접어 예전 그대로 보인다.
   말줄임표(…)는 문장 끝이 아니라 쉼이라 그대로 이어 둔다 */
function sentenceLines(msg){ return String(msg).replace(/([.!?])[ \t]+(?=\S)/g, "$1\n"); }
const CHEERS = [
  "오늘 하루도 화이팅이츄!",
  "한 잔씩 천천히 하면 다 외워지츄",
  "어제보다 한 잔만 더! 그거면 충분하츄",
  "손이 기억할 때까지 조금씩 해보자츄",
  "레시피는 반복이 답이츄",
  "틀린 건 실력이 느는 중이라는 뜻이츄",
  "5분만 보고 가도 괜찮아츄",
  "바쁜데 열어본 것만으로 잘하고 있는 거츄",
  "천천히 가도 멈추지만 않으면 되츄",
  "오늘의 한 잔도 잘 부탁해츄",
  "컨디션 챙겨가면서 하자츄",
  "완벽하지 않아도 돼, 익숙해지면 되는 거츄"
];
/* 쥐돌이가 지금 상황을 보고 말한다.
   앱이 이미 들고 있는 값만 쓴다 — 오늘 폐기 개수·복습 목록·외운 비율·연속 일수·마지막 방문.

   두 갈래로 나눈다.
   · 급한 말(hard) — 지금 당장 해야 할 일. 있으면 무조건 이걸 말한다.
   · 그 외(soft)   — 해당되는 것들을 모아 날짜로 하나 고른다.
   폐기 같은 건 등록해두면 매일 걸리기 때문에, 전부 우선순위로 두면
   말풍선이 1년 내내 같은 문장만 반복하게 된다. 오전에만 급한 말로 올린다. */
function situationCheer(now, streak, v){
  const live  = liveDrinks();
  const total = live.length;
  const done  = live.filter(d=>has(data.mastered,d.id)).length;
  const rev   = live.filter(d=>has(data.needReview, d.id)).length;
  const hour  = now.getHours();

  const kill = discardCount();

  /* ── 급한 말 ── */
  if(total === 0)
    return {ico:icon("note"), msg:"레시피가 아직 없츄. 하나만 넣어보면 바로 시작이츄"};
  if(kill > 0 && hour < 14)                       // 오픈·미들 시간대에만
    return {ico:icon("trash"), msg:"오늘 버릴 게 " + kill + "개 있츄. 개봉관리 먼저 보고 가자츄"};
  if(rev >= 5)
    return {ico:icon("repeat"), msg:"다시 볼 메뉴가 " + cupN(rev) + cafeSay("나", "이나") + " 쌓였츄. 오늘 좀 덜어내자츄"};
  if(done === 0)
    return {ico:icon("cup"), msg:"첫 한 잔부터 외워보자츄. " + total + cafeSay("개가", "잔이") + " 기다리고 있츄"};
  if(done === total)
    return {ico:icon("trophy"), msg:"전부 외웠츄! 가끔 한 바퀴만 돌려주면 안 까먹츄"};

  /* ── 해당되면 후보에 넣고 날짜로 고르는 말 ── */
  const pool = [];
  if(rev >= 1)
    pool.push({ico:icon("repeat"), msg:"다시 볼래요 해둔 게 " + cupN(rev) + " 있츄. 이것만 보고 가도 되츄"});
  if(kill > 0)
    pool.push({ico:icon("trash"), msg:"오늘 폐기 " + kill + "개, 마감 전에 확인했츄?"});
  if(total >= 5 && done / total >= 0.8)
    pool.push({ico:icon("target"), msg:cupN(total - done) + "만 더 하면 끝이츄. 거의 다 왔츄"});
  if(v && v.kind === "back" && v.gap >= 3)
    pool.push({ico:icon("wave"), msg:v.gap + "일 만이츄! 가볍게 다섯 장만 넘겨보자츄"});
  if(streak >= 7)
    pool.push({ico:icon("flame"), msg:streak + "일 연속이라니! 이 정도면 습관이 된 거츄"});
  else if(streak >= 3)
    pool.push({ico:icon("flame"), msg:streak + "일 연속이야, 잘하고 있츄!"});

  const seed = Math.floor((now - new Date(now.getFullYear(),0,0)) / 86400000);
  pool.push({ico:icon("coffee"), msg:CHEERS[seed % CHEERS.length]});   // 늘 하나는 평범한 응원
  return pool[seed % pool.length];
}
function cheerOf(now, streak, v){
  return situationCheer(now, streak, v);
}

let VISIT = null;   // 앱을 연 순간 한 번만 계산
function initVisit(){
  const now = new Date();
  const v = touchVisit(now);
  VISIT = {info:v, now:now};
}
function renderGreeting(){
  if(!VISIT) return;
  const now = new Date();
  const v = VISIT.info;
  const base = timeGreet(now.getHours());
  let title = base;
  if(v.kind === "first") title = "처음 오셨네요!";
  else if(v.kind === "back" && v.gap >= 2) title = v.gap + "일 만이에요!";
  const bd = bdayGreeting(now);             // 생일이면 인사말과 말풍선이 축하로 바뀐다 (birthday.js)
  if(bd) title = bd.title;
  /* 이름을 알려 줬으면 부르고 줄을 내린다: "바리스타님," / "하루 마무리 중이네요" (nick.js · #greetT 는 pre-line) */
  const call = nickCall();
  if(call) title = call + ",\n" + title;

  const dateTxt = (now.getMonth()+1) + "월 " + now.getDate() + "일 " + DOW[now.getDay()] + "요일";
  // 날짜는 윗줄, 앱 소개는 아랫줄로 나눈다 (한 줄에 담으면 어중간하게 접힌다)
  const line1 = dateTxt + (v.streak >= 2 ? " · " + v.streak + "일 연속 접속 중" : "");
  const line2 = (v.kind === "first") ? "암기쥐 · 카페 음료 레시피 외우기"
                                     : "카페 음료 레시피 외우기";

  $("#greetT").textContent = title;
  $("#greetP").innerHTML = esc(line1) + "<br>" + esc(line2);

  const c = cheerOf(now, v.streak, v);
  const away = awayGreeting();              // 며칠 만이면 기다렸다는 말 (waiting.js)
  if(bd) $("#mbubble").textContent = sentenceLines(bd.msg);
  else if(away) $("#mbubble").textContent = sentenceLines(away);
  else $("#mbubble").innerHTML = `${c.ico} ${esc(sentenceLines(c.msg))}`;
  drawMascot();
  scheduleBlink();
  scheduleGlow();                           // 빛나는 옷은 깜빡임과 따로 번쩍인다

  /* 오늘 폐기가 있으면 하루 한 번 비상 달리기. 이게 커피보다 급하다 */
  let kill = 0;
  try{ kill = tagGroups().reduce((n2,g)=>n2+g.items.length, 0); }catch(e){}
  const todayKey = ymd(now);
  if(kill > 0 && panicDay !== todayKey && !reduceMotion()){
    panicDay = todayKey;
    sayBubble("오늘 버릴 게 " + kill + "개 있츄! 비상이츄!");
    setTimeout(()=>runPanic(2), 700);
    return;                                 // 이 방문의 커피 모션은 건너뛴다
  }
  if(!sipDoneToday && currentMood() === "morning"){
    sipDoneToday = true;
    setTimeout(playSip, 600);              // 화면이 자리잡은 뒤에
  }
}

