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
  idle:["................oo..........","...............obbo.........","..............obbo..........",".............obbo...........",".........o..obbbo...o.......","........obo.obo.obosbo......",".......obbbobbbobbbbbo......","......obsbbbbbbbbbbbbso.....",".....obsbbbbbbbbbbbbbbso....","....obbsbbbbbbbbbbbbbbbo....","....obbbbbbbbbbbbbbbbbbso...","...obsbbooobbbbbooobbbbbo...","...obbbohhhobbbohhhobbbso...","...obsbohkhobbbohkhobbbbo...","...obbbohkhobbbohkhobbbso...","...obsbohhhobbbohhhobbbbo...","...obbbbooobbbbbooobbbbso...","..obsbbbbbeeeeebbbbbbbbbo...","..obbbbbbeeeeeeebbbbbbbso...","..obsbbbbbEEEEEbbbbbbbbbo...",".obbbbbbbbbEEEbbbbbbbbbsbo..",".obsbbbbbbbbEbbbbbbbbbbbbo..","obbbbsbbbbbbbbbbbbbbbbsbbbo.","obsbbbbbbbbbbbbbbbbbbbbbsbo.","obbbsbbbbbbbbbbbbbbbbbbbbbo.","obsbbbbbbbbbbbbbbbbbbbbsbbo.","obbbbsbbbbbbbbbbbbbbbbbbsbo.",".obsbbbbbbbbbbbbbbbbbbsbbbo.",".obbbbsbbbbbbbbbbbbbbbbbsbo.",".obsbbbbbbbbbbbbbbbbbsbbbbo.","..obbbsbbbbbbbbbbbbbbbbsbo..","..obsbbbbbbbbbbbbbbbsbbbbo..","...obbbsbbbbbbbbbbbbbbsbo...","...obsbbbbbbbbbbbbbsbbbbo...","....obbbsbbbbbbbbbbbbsbo....","....obsbbbbbbbbbbbsbbbbo....",".....obbbsbbbbbbbbbbbso.....","......oobbbsbbbbbsbbboo.....",".......ooeeeoooooeeeoo......","........ooo.......ooo......."],
  caw:["................oo..........","...............obbo.........","..............obbo..........",".............obbo...........",".........o..obbbo...o.......","........obo.obo.obosbo......",".......obbbobbbobbbbbo......","......obsbbbbbbbbbbbbso.....",".....obsbbbbbbbbbbbbbbso....","....obbsbbbbbbbbbbbbbbbo....","....obbbbbbbbbbbbbbbbbbso...","...obsbbooobbbbbooobbbbbo...","...obbbohhhobbbohhhobbbso...","...obsbohkhobbbohkhobbbbo...","...obbbohkhobbbohkhobbbso...","...obsbohhhobbbohhhobbbbo...","...obbbbooobbbbbooobbbbso...","..obsbbbbbeeeeebbbbbbbbbo...","..obbbbbbeeeeeeebbbbbbbso...","..obsbbbbbmmmmmbbbbbbbbbo...",".obbbbbbbbmmmmmbbbbbbbbsbo..",".obsbbbbbEEEEEEEbbbbbbbbbo..","obbbbsbbbbEEEEEbbbbbbbsbbbo.","obsbbbbbbbbbbbbbbbbbbbbbsbo.","obbbsbbbbbbbbbbbbbbbbbbbbbo.","obsbbbbbbbbbbbbbbbbbbbbsbbo.","obbbbsbbbbbbbbbbbbbbbbbbsbo.",".obsbbbbbbbbbbbbbbbbbbsbbbo.",".obbbbsbbbbbbbbbbbbbbbbbsbo.",".obsbbbbbbbbbbbbbbbbbsbbbbo.","..obbbsbbbbbbbbbbbbbbbbsbo..","..obsbbbbbbbbbbbbbbbsbbbbo..","...obbbsbbbbbbbbbbbbbbsbo...","...obsbbbbbbbbbbbbbsbbbbo...","....obbbsbbbbbbbbbbbbsbo....","....obsbbbbbbbbbbbsbbbbo....",".....obbbsbbbbbbbbbbbso.....","......oobbbsbbbbbsbbboo.....",".......ooeeeoooooeeeoo......","........ooo.......ooo......."]
};
function crowSVG(pose){
  const rows = CROW[pose] || CROW.idle;
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

let panicT = null, panicDay = null;
function stopPanic(){
  if(panicT){ clearInterval(panicT); panicT = null; }
  const L = $("#panicLayer"); if(L) L.classList.remove("on");
  const m = $("#mascot"); if(m) m.style.visibility = "";
  const b = $("#mbubble"); if(b) b.style.opacity = "";
}
function runPanic(laps){
  if(panicT || reduceMotion()) return;
  if(!$("#s-home").classList.contains("active")) return;
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
      if(done) sayBubble($("#mbubble").textContent);  // 돌아와서 다시 말한다
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
       + mouseSVG(emptyMouseMood(), false) + `</div>`;
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
        const shut = mouseSVG("blink", false), open = mouseSVG(emptyMouseMood(), false);
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
const mascot = {blink:false, puff:false};
let blinkTimer = null;
function currentMood(){ return moodOf(new Date().getHours()); }
function reduceMotion(){
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}
function drawMascot(){
  const el = $("#mascot");
  if(!el) return;
  if(sipping) return;                       // 커피 마시는 중엔 건드리지 않는다
  el.innerHTML = mouseSVG(mascot.blink ? "blink" : currentMood(), mascot.puff);
}

/* 아침에 커피 한 잔 — 한 바퀴만 돌고 원래 모습으로 */
const SIP_SEQ = ["sip1","sip2","sip3","sip4","sip5"];
let sipT = null, sipping = false, sipDoneToday = false;
function stopSip(){
  if(sipT){ clearInterval(sipT); sipT = null; }
  sipping = false;
}
function playSip(){
  const el = $("#mascot");
  if(!el || reduceMotion()) return;
  if(currentMood() !== "morning") return;
  stopSip();
  clearTimeout(blinkTimer);
  sipping = true;
  let i = 0;
  el.innerHTML = mouseSVG(SIP_SEQ[0]);
  sipT = setInterval(()=>{
    i++;
    if(i >= SIP_SEQ.length || !mascotAwake()){
      stopSip(); drawMascot(); scheduleBlink(); return;
    }
    el.innerHTML = mouseSVG(SIP_SEQ[i]);
  }, 420);
}
function mascotAwake(){
  return $("#s-home").classList.contains("active") && !document.hidden;
}
function scheduleBlink(){
  clearTimeout(blinkTimer);
  if(reduceMotion()) return;
  blinkTimer = setTimeout(()=>{
    if(mascotAwake() && currentMood() !== "night"){
      const close = ()=>{ mascot.blink = true; drawMascot(); };
      const open  = ()=>{ mascot.blink = false; drawMascot(); };
      close();
      if(Math.random() < 0.25){        // 가끔 두 번
        setTimeout(open, 120);
        setTimeout(close, 260);
        setTimeout(open, 380);
      } else {
        setTimeout(open, 140);
      }
    }
    scheduleBlink();
  }, 2600 + Math.random()*4200);
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

const CHEERS = [
  "오늘 하루도 화이팅이츄!",
  "한 잔씩 천천히 하면 다 외워지츄",
  "어제보다 한 개만 더! 그거면 충분하츄",
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

  let kill = 0;
  try{ kill = tagGroups().reduce((n,g)=>n+g.items.length, 0); }catch(e){}

  /* ── 급한 말 ── */
  if(total === 0)
    return {ico:"📝", msg:"레시피가 아직 없츄. 한 개만 넣어보면 바로 시작이츄"};
  if(kill > 0 && hour < 14)                       // 오픈·미들 시간대에만
    return {ico:"🗑️", msg:"오늘 버릴 게 " + kill + "개 있츄. 개봉관리 먼저 보고 가자츄"};
  if(rev >= 5)
    return {ico:"🔁", msg:"다시 볼 메뉴가 " + rev + "개나 쌓였츄. 오늘 좀 덜어내자츄"};
  if(done === 0)
    return {ico:"🥤", msg:"첫 한 잔부터 외워보자츄. " + total + "개가 기다리고 있츄"};
  if(done === total)
    return {ico:"🏆", msg:"전부 외웠츄! 가끔 한 바퀴만 돌려주면 안 까먹츄"};

  /* ── 해당되면 후보에 넣고 날짜로 고르는 말 ── */
  const pool = [];
  if(rev >= 1)
    pool.push({ico:"🔁", msg:"다시 볼래요 해둔 게 " + rev + "개 있츄. 이것만 보고 가도 되츄"});
  if(kill > 0)
    pool.push({ico:"🗑️", msg:"오늘 폐기 " + kill + "개, 마감 전에 확인했츄?"});
  if(total >= 5 && done / total >= 0.8)
    pool.push({ico:"🎯", msg:(total - done) + "개만 더 하면 끝이츄. 거의 다 왔츄"});
  if(v && v.kind === "back" && v.gap >= 3)
    pool.push({ico:"👋", msg:v.gap + "일 만이츄! 가볍게 다섯 장만 넘겨보자츄"});
  if(streak >= 7)
    pool.push({ico:"🔥", msg:streak + "일 연속이라니! 이 정도면 습관이 된 거츄"});
  else if(streak >= 3)
    pool.push({ico:"🔥", msg:streak + "일 연속이야, 잘하고 있츄!"});

  const seed = Math.floor((now - new Date(now.getFullYear(),0,0)) / 86400000);
  pool.push({ico:"☕️", msg:CHEERS[seed % CHEERS.length]});   // 늘 하나는 평범한 응원
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

  const dateTxt = (now.getMonth()+1) + "월 " + now.getDate() + "일 " + DOW[now.getDay()] + "요일";
  // 날짜는 윗줄, 앱 소개는 아랫줄로 나눈다 (한 줄에 담으면 어중간하게 접힌다)
  const line1 = dateTxt + (v.streak >= 2 ? " · " + v.streak + "일 연속 접속 중" : "");
  const line2 = (v.kind === "first") ? "암기쥐 · 카페 음료 레시피 외우기"
                                     : "카페 음료 레시피 외우기";

  $("#greetT").textContent = title;
  $("#greetP").innerHTML = esc(line1) + "<br>" + esc(line2);

  const c = cheerOf(now, v.streak, v);
  $("#mbubble").innerHTML = `${c.ico} ${esc(c.msg)}`;
  drawMascot();
  scheduleBlink();

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

