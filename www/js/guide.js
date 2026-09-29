/* 암기쥐 — 첫 실행 가이드 (iOS 앱 · 도트 화면 전용)
   처음 설치한 사람에게 한 번, 다섯 장짜리 움직이는 도트 가이드를 보여준다.
   캡처 이미지 대신 앱 부품(쥐돌이 · 카드 · 전표 · 영수증)으로 그려 화면이 바뀌어도 어긋나지 않는다.
   설정 → 사용법 보기를 누르면 다시 열린다. 웹은 예전 글 시트(openGuideSheet) 그대로다.
   클래스 이름은 전부 ob- 로 시작한다. .card · .face · .tag 같은 이름은 앱에 이미 있어 부딪힌다 */

const GUIDE_HINT = "onboard";     // data.hints 에 남기는 표시. 한 번 본 사람에게는 다시 저절로 뜨지 않는다
let guide = null;                 // 열려 있을 때 {i, timers}

/* 처음 설치해서 처음 연 날에만. 이미 쓰던 사람은 VISIT 가 first 가 아니라 억지로 띄우지 않는다 */
function guideDue(){
  return isDot() && !!VISIT && VISIT.info && VISIT.info.kind === "first" && !hintSeen(GUIDE_HINT);
}

/* 쥐돌이 발바닥 도장(누르기 표시)과 도트 고리. 손 모양은 오해를 사서 발바닥으로 그렸다 */
const GUIDE_PAW = ["................","....QQ....QQ....","...QppQ..QppQ...","...QppQ..QppQ...",".QQ.QQ....QQ.QQ.","QppQ........QppQ","QppQ........QppQ",".QQ..........QQ.",".....QQQQQQ.....","...QQppppppQQ...","..QphhpppppppQ..","..QppppppppppQ..","..QppppppppppQ..","...QQppppppQQ...",".....QQQQQQ.....","................"];
function guidePawSVG(){
  const pal = {Q:"#D4796F", p:"#F5BEAC", h:"#FFFFFF"};
  let out = "";
  GUIDE_PAW.forEach((r, y)=>{ for(let x = 0; x < 16; x++) if(r[x] !== ".") out += `<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[r[x]]}"/>`; });
  return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges">${out}</svg>`;
}
function guideRingSVG(){
  let out = "";
  for(let y = 0; y < 10; y++) for(let x = 0; x < 10; x++){
    const d = Math.sqrt(Math.pow(x - 4.5, 2) + Math.pow(y - 4.5, 2));
    if(d >= 3.4 && d <= 4.6) out += `<rect x="${x}" y="${y}" width="1" height="1" fill="currentColor"/>`;
  }
  return `<svg viewBox="0 0 10 10" shape-rendering="crispEdges">${out}</svg>`;
}

/* 카드 장면의 카페라떼. 사용자 레시피와 상관없이 늘 같은 그림을 보여준다(카드 폭 220px 에 맞춘 짧은 값) */
const GUIDE_LATTE = [["에스프레소","2샷"],["스팀밀크","220 ml"],["우유 온도","60~65℃"]];

function guidePages(){
  return [
    `<div class="ob-page ob-hello"><div class="ob-stage"><div class="ob-m" id="obM1">${mouseSVG("day")}</div><div class="ob-box ob-bub">반가워츄!</div></div>
      <h2>반가워요, 암기쥐예요</h2><p>카페 음료 레시피를 카드로 외우는 앱이에요. 쥐돌이가 옆에서 같이 외워줄게츄.</p></div>`,
    `<div class="ob-page"><div class="ob-stage"><div class="ob-flip" id="obWrap"><span class="ob-mode" id="obMode">카드 뒤집기</span>
        <div class="ob-fc" id="obFc"><div class="ob-face ob-front"><small>커피</small><b>카페라떼</b><small>Cafe Latte</small><span class="ob-tag">HOT</span></div>
        <div class="ob-face ob-back ob-box"><b class="ob-nm">카페라떼</b><div class="ob-lb">재료 / 용량</div><div id="obIngs"></div></div></div>
        <div class="ob-acts"><span class="ob-box">다시 볼래요</span><span class="ob-box ob-ok" id="obOk">외웠어요</span></div>
        <i class="ob-rip" id="obR1"></i><i class="ob-rip ob-two" id="obR2"></i><i class="ob-paw" id="obPaw"></i></div></div>
      <h2>카드로 외워요</h2><p>메뉴 이름을 보고 재료와 용량을 떠올린 뒤 뒤집어 확인해요. 빈칸 채우기로 용량만 가려 볼 수도 있어요.</p></div>`,
    `<div class="ob-page"><div class="ob-stage"><div class="ob-imp">
        <div class="ob-paper ob-box" id="obPaper"><span class="ob-copy">복사</span><span class="ob-hl">아이스 바닐라 라떼 16oz<br>에스프레소 2샷 · 바닐라 시럽 2펌프<br>우유 200ml · 얼음 가득</span></div>
        <div class="ob-arrow">▼ 붙여넣기</div><div class="ob-txt" id="obTxt"></div>
        <div class="ob-made ob-box" id="obMade"><span class="ob-t">ICE</span><div><b>바닐라 라떼</b><small>에스프레소 · 바닐라 시럽 · 우유</small></div></div></div></div>
      <h2>우리 매장 레시피 넣기</h2><p>종이 레시피는 사진 앱에서 글자를 복사해 붙여넣으면 레시피로 정리돼요. 이 앱은 사진도 글자도 어디로도 보내지 않아요.</p></div>`,
    `<div class="ob-page"><div class="ob-stage"><div class="ob-alarm ob-box">
        <div class="ob-lockbg"><div class="ob-date">10월 2일 금요일</div><div class="ob-clock">9:00</div></div>
        <div class="ob-ban" id="obBan"><span class="ob-ai"><img src="apple-touch-icon.png" alt=""></span><div class="ob-bt"><div class="ob-r1"><b>암기쥐</b><span>지금</span></div>
          <div class="ob-tt">오늘이츄! · 신메뉴 출시</div><div class="ob-bd">라떼 3종 레시피 외우기</div></div></div>
        <div class="ob-tk"><div class="ob-stub"><small>10/2</small><b>D-3</b></div><div class="ob-mt"><b>신메뉴 출시</b><small>라떼 3종 레시피 외우기</small></div></div></div></div>
      <h2>일정과 알림</h2><p>신메뉴 출시 같은 날을 걸어 두면 홈에 전표로 뜨고, 알림을 켜면 그날 쥐돌이가 알려줘요.</p></div>`,
    `<div class="ob-page"><div class="ob-stage"><div class="ob-bk"><div class="ob-m ob-small" id="obM5">${mouseSVG("eat1")}</div>
        <div class="ob-rc"><div class="ob-row">레시피<i class="ob-ld"></i><span class="ob-v">이 기기 안</span></div><div class="ob-row">서버 · 계정<i class="ob-ld"></i><span class="ob-v">없음</span></div>
        <div class="ob-row">앱을 지우면<i class="ob-ld"></i><span class="ob-v ob-warn">사라짐</span></div></div></div></div>
      <h2>백업은 꼭 해 두세요</h2><p>레시피는 이 기기 안에만 있어요. 설정 → 백업 내보내기로 파일을 하나 만들어 두면 기기를 바꿔도 되살릴 수 있어요.</p></div>`
  ];
}

function openGuide(){
  if(!isDot()){ openGuideSheet(); return; }       // 웹은 예전 글 시트
  const pages = guidePages();
  const box = $("#onboard");
  box.innerHTML = `<div class="ob-top"><button type="button" class="ob-skip" id="obSkip">건너뛰기</button></div>
    <div class="ob-rail" id="obRail">${pages.join("")}</div>
    <div class="ob-foot"><div class="ob-dots" id="obDots">${pages.map(()=>"<i></i>").join("")}</div>
      <button type="button" class="ob-next" id="obNext">다음</button></div>`;
  box.hidden = false;
  guide = {i:0, timers:[], n:pages.length};
  $("#obNext").addEventListener("click", ()=>guideGo(guide.i + 1));
  $("#obSkip").addEventListener("click", closeGuide);
  let x0 = null;
  const rail = $("#obRail");
  rail.addEventListener("pointerdown", e=>{ x0 = e.clientX; });
  rail.addEventListener("pointerup", e=>{
    if(x0 === null) return;
    const dx = e.clientX - x0; x0 = null;
    if(dx < -40) guideGo(guide.i + 1); else if(dx > 40) guideGo(guide.i - 1);
  });
  guideGo(0);
}
function guideClear(){ if(guide){ guide.timers.forEach(clearTimeout); guide.timers = []; } }
function guideLater(fn, ms){ if(guide) guide.timers.push(setTimeout(fn, ms)); }
function closeGuide(){
  guideClear();
  guide = null;
  const box = $("#onboard");
  box.hidden = true; box.innerHTML = "";
  markHint(GUIDE_HINT);
  go("home");
}
function guideGo(i){
  if(!guide) return;
  if(i >= guide.n){ closeGuide(); return; }
  if(i < 0) i = 0;
  guide.i = i;
  guideClear();
  $("#obRail").style.transform = `translateX(${-100 * i}%)`;
  document.querySelectorAll("#obDots i").forEach((d, k)=>d.classList.toggle("on", k === i));
  $("#obNext").textContent = i === guide.n - 1 ? "시작하기" : "다음";
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  [guidePlayHello, guidePlayCard, guidePlayImport, guidePlayAlarm, guidePlayBackup][i](reduce);
}

function guidePlayHello(reduce){
  const m = $("#obM1");
  if(reduce) return;
  const blink = ()=>guideLater(()=>{ m.innerHTML = mouseSVG("blink"); guideLater(()=>{ m.innerHTML = mouseSVG("day"); blink(); }, 180); }, 2200);
  blink();
}
function guidePlayCard(reduce){
  const fc = $("#obFc"), ings = $("#obIngs"), mode = $("#obMode"), wrap = $("#obWrap");
  const paw = $("#obPaw"), r1 = $("#obR1"), r2 = $("#obR2");
    paw.innerHTML = guidePawSVG(); r1.innerHTML = guideRingSVG(); r2.innerHTML = guideRingSVG();
  const lines = (blank, open)=>{ ings.innerHTML = GUIDE_LATTE.map((p, k)=>`<div class="ob-ing">${esc(p[0])}<i class="ob-ld"></i>${
    blank && k >= open ? `<span class="ob-q">? ? ?</span>` : `<span class="ob-v">${esc(p[1])}</span>`}</div>`).join(""); };
  if(reduce){ fc.classList.add("on"); lines(false, 0); return; }
  /* 화면 변화(뒤집기 · 빈칸 열기)는 발바닥이 꾹 찍는 바로 그 순간에 일어난다(onPress).
     먼저 바뀌면 누르기 전에 열린 것처럼 보인다 */
  const PRESS = 340;
  const tapAt = (x, y, onPress)=>{
    paw.classList.add("on");
    paw.style.left = (x - 22) + "px"; paw.style.top = (y - 33) + "px";   // 발바닥 가운데(7.5칸 · 11칸째 줄), 한 칸 3px
    guideLater(()=>{
      paw.classList.add("press");
      [r1, r2].forEach(r=>{ r.style.left = x + "px"; r.style.top = y + "px"; r.classList.remove("go"); void r.offsetWidth; r.classList.add("go"); });
      if(onPress) onPress();
    }, PRESS);
    guideLater(()=>paw.classList.remove("press"), PRESS + 180);
  };
  /* 누를 대상의 한가운데를 잰다. 숫자로 어림하면 칸을 비껴 누른다 */
  const tapEl = (el, onPress)=>{
    const a = wrap.getBoundingClientRect(), b = el.getBoundingClientRect();
    tapAt(Math.round(b.left - a.left + b.width / 2), Math.round(b.top - a.top + b.height / 2), onPress);
  };
  paw.style.left = "88px"; paw.style.top = "200px";
  let round = 0;
  const cycle = ()=>{
    const blank = round % 2 === 1; round++;
    mode.textContent = blank ? "빈칸 채우기" : "카드 뒤집기";
    if(!blank){
      fc.classList.remove("on"); lines(false, 0);
      guideLater(()=>tapAt(Math.round(wrap.clientWidth / 2), 140, ()=>fc.classList.add("on")), 900);
      guideLater(()=>tapEl($("#obOk")), 2900);
      guideLater(cycle, 3900);
    } else {
      fc.classList.add("on"); lines(true, 0);
      [0, 1, 2].forEach(k=>guideLater(()=>{
        const q = ings.querySelector(".ob-q");
        if(q) tapEl(q, ()=>lines(true, k + 1));
      }, 900 + k * 900));
      guideLater(()=>tapEl($("#obOk")), 3800);
      guideLater(cycle, 4800);
    }
  };
  cycle();
}
function guidePlayImport(reduce){
  const pp = $("#obPaper"), txt = $("#obTxt"), made = $("#obMade");
  const full = "아이스 바닐라 라떼 16oz\n에스프레소 2샷 · 바닐라 시럽 2펌프\n우유 200ml · 얼음 가득";
  if(reduce){ pp.classList.add("on"); txt.textContent = full; made.classList.add("on"); return; }
  const cycle = ()=>{
    pp.classList.remove("on"); txt.textContent = ""; made.classList.remove("on");
    guideLater(()=>pp.classList.add("on"), 700);
    guideLater(()=>{ txt.textContent = full; }, 1700);
    guideLater(()=>made.classList.add("on"), 2600);
    guideLater(cycle, 5200);
  };
  cycle();
}
function guidePlayAlarm(reduce){
  const ban = $("#obBan");
  if(reduce){ ban.classList.add("on"); return; }
  const cycle = ()=>{
    ban.classList.remove("on");
    guideLater(()=>ban.classList.add("on"), 900);
    guideLater(cycle, 4200);
  };
  cycle();
}
function guidePlayBackup(reduce){
  const m = $("#obM5");
  if(reduce){ m.innerHTML = mouseSVG("eat3"); return; }
  let i = 0;
  const eat = ()=>{ m.innerHTML = mouseSVG(EAT_SEQ[i % EAT_SEQ.length]); i++; guideLater(eat, 380); };
  eat();
}
