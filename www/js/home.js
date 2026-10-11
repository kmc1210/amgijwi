/* 암기쥐 — 홈 화면, 그리고 ICE/HOT 재료 두 벌을 다루는 헬퍼
   (ingSets / ingKeys 는 학습 카드와 목록·편집기에서도 쓴다) */

/* ---------- 홈 ---------- */
function renderHome(){
  renderGreeting();
  bdayHome();                   // 생일이면 선물과 폭죽 (birthday.js)
  closetHome();                 // 쥐돌이 아래 치즈 칩 (closet.js)
  /* 칩 이름은 그림 + 글자다. 그림이 SVG 라 통째로 esc 하면 안 되고, 글자만 esc 한다 */
  const items = [["all","전체"]].concat(data.cats.map(c=>[c.id, catMark(c.emo) + " " + esc(c.label)]));
  $("#chips").innerHTML = items.map(([k,l])=>{
    const n = drinksOf(k).length;
    /* l 은 그림(SVG)과 이름이 합쳐진 것이라 통째로 esc 하면 안 된다. 이름은 만들 때 이미 esc 했다 */
    return `<button class="chip ${state.filter===k?"on":""}" data-cat="${k}">${l} ${cafeSay(n, cupN(n))}</button>`;
  }).join("");
  document.querySelectorAll("#chips .chip").forEach(c=>c.addEventListener("click",()=>{ state.filter=c.dataset.cat; renderHome(); }));

  const pool = drinksOf(state.filter);
  $("#deckCount").textContent = cafeSay(pool.length + "개 메뉴", cupN(pool.length));
  /* 정적 마크업의 말도 카페 말투로. 웹은 index.html 에 적힌 그대로다 */
  $("#scopeTitle").textContent = cafeSay("학습 범위", "오늘 외울 메뉴");
  $("#startBtn").textContent = cafeSay("학습 시작하기", "한 잔씩 외우기");
  $("#reviewTitle").textContent = cafeSay("복습이 필요해요", "다시 볼 메뉴");
  $("#ringLbl").textContent = cafeSay("마스터", "외운 잔");
  $("#startBtn").disabled = pool.length===0;

  const live = liveDrinks();
  const total = live.length, done = live.filter(d=>has(data.mastered,d.id)).length;
  const pct = total ? Math.round(done/total*100) : 0;
  const C = 2*Math.PI*37;
  $("#ringFill").style.strokeDashoffset = C - C*pct/100;
  $("#ringPct").textContent = pct + "%";
  /* 앱(도트 화면)에서는 링도 도트로. 웹에서는 그리지 않는다 */
  if(document.documentElement.classList.contains("dot")) $("#ringPx").innerHTML = ringPixelSVG(pct);
  const nArch = data.drinks.length - total;
  $("#heroTitle").textContent = total===0 ? (nArch ? "모두 보관해 두셨어요" : "레시피를 추가해 주세요")
    : (done===0 ? cafeSay("아직 외운 메뉴가 없어요", "아직 외운 잔이 없어요")
                : cafeSay(`${total}개 중 ${done}개를 외웠어요`, `${total}잔 중 ${done}잔 외웠어요`));
  $("#heroSub").textContent = total===0 ? (nArch
      ? "레시피 탭의 보관함에서 되돌리면 다시 학습할 수 있어요."
      : "레시피 탭의 + 버튼으로 우리 매장 레시피를 넣어보세요.")
    : (done===0 ? "앞면엔 메뉴 이름, 뒷면엔 재료와 용량이 있어요."
    : (done===total ? "전체 메뉴를 마스터했어요. 가끔 복습해서 감을 유지하세요." : "남은 메뉴도 이어서 학습해볼까요?"));

  /* 안심 문구는 초반 5회까지만. 저장이 막힌 경고는 항상 띄운다 */
  const visits = (data.visit && data.visit.count) || 1;
  $("#storeBanner").innerHTML = !Store.available
    ? `<div class="banner warn"><span>${icon("warn")}</span><div><b>지금은 저장이 안 되는 상태예요.</b><br>앱을 닫으면 기록이 사라집니다. 설정 탭의 안내를 확인해 주세요.</div></div>`
    : (!isStandalone() && deviceOS() !== "desktop"
      /* 브라우저 탭으로 쓰면 저장 데이터가 지워질 위험이 훨씬 크다.
         차이를 모르는 사람이 대부분이라 홈 화면에 넣을 때까지 계속 알린다.
         PC 에는 홈 화면이 없으니 띄우지 않는다 */
      ? `<div class="banner warn"><span>${icon("install")}</span><div><b>홈 화면에 추가해서 써주세요.</b><br>
           ${INSTALL[deviceOS()].why}
           ${INSTALL[deviceOS()].how}</div></div>`
      : (visits <= 5
        ? `<div class="banner ok"><span>${icon("lock")}</span><div><b>이 기기 안에만 저장됩니다.</b><br>서버로 전송되는 정보가 없어요.</div></div>`
        : ""));

  renderToday();
  renderUpcoming();
  renderBackupBanner();

  const rev = liveDrinks().filter(d=>has(data.needReview,d.id));
  $("#reviewCount").textContent = rev.length ? cupN(rev.length) : "";
  $("#revStudy").style.display = rev.length ? "inline" : "none";
  $("#reviewList").innerHTML = rev.length ? (isDot() ? reviewTicketHTML(rev) : rev.map(d=>rowHTML(d,"다시")).join(""))
    : `<div class="empty">학습 중 <b>“다시 볼래요”</b>를 누른 메뉴가<br>여기에 모입니다.</div>`;
  bindRows("#reviewList");
}

/* ---------- ICE / HOT 재료 두 벌 ----------
   ICE 와 HOT 을 같이 파는 메뉴는 재료 구성 자체가 다른 경우가 있다(얼음 대 스팀밀크).
   그래서 temp 가 ICE/HOT 인 메뉴만 재료를 두 벌 가진다. d.ing 이 ICE, d.ingHot 이 HOT 이다.
   ingHot 이 없으면 예전처럼 한 벌짜리 메뉴다. 옛 레시피와 옛 백업이 그대로 열린다. */
function isBothTemp(d){
  const t = (d.temp || "").toUpperCase();
  return t.indexOf("ICE") >= 0 && t.indexOf("HOT") >= 0;
}
function hotIng(d){
  return (isBothTemp(d) && Array.isArray(d.ingHot)) ? d.ingHot.filter(p=>p[0] || p[1]) : [];
}
/* [[라벨, 재료목록], ...]. 한 벌이면 라벨이 빈 문자열이라 화면이 예전과 같다 */
function ingSets(d){
  const ice = d.ing || [];
  const hot = hotIng(d);
  return hot.length ? [["ICE", ice], ["HOT", hot]] : [["", ice]];
}
/* 빈칸 채우기에서 "몇 번째 벌의 몇 번째 재료" 를 가리키는 키 */
function ingKeys(d){
  const keys = [];
  ingSets(d).forEach((s, si)=>s[1].forEach((_, ri)=>keys.push(si + "-" + ri)));
  return keys;
}
function ingAt(d, key){
  const p = String(key).split("-");
  const set = ingSets(d)[+p[0]];
  return (set && set[1][+p[1]]) || ["", ""];
}
function ingNames(d){
  return ingSets(d).map(s=>s[1].map(i=>i[0]).join(" ")).join(" ");
}

/* 목록에서 HOT / ICE 를 한눈에 구분하게 하는 배지 */
function tempBadge(d){
  const t = (d.temp || "").toUpperCase();
  if(t === "HOT") return `<span class="tempb hot">HOT</span>`;
  if(t === "ICE") return `<span class="tempb ice">ICE</span>`;
  if(t.includes("HOT") && t.includes("ICE")) return `<span class="tempb both"><i>ICE</i><i>HOT</i></span>`;
  return `<span class="tempb none">${catMark(catEmo(d.cat))}</span>`;
}
/* 앱바 부제: 안내문 대신 현재 상태를 보여준다 */
/* 검색 결과가 없을 때: 무엇을 찾고 있었는지 보여주고 빠져나갈 길을 준다 */
function noResultHTML(q, what){
  return `<div class="empty" style="padding-bottom:18px">
    ${emptyMouse(2)}
    “${esc(q)}”에 맞는 ${what} 없어요.
    <button class="cta ghost" data-clearq="1" style="margin-top:16px">검색 지우기</button>
  </div>`;
}
function renderListSub(){
  const el = $("#listSub"); if(!el) return;
  if(state.listTab === "shelf"){
    const today = tagGroups().reduce((n,g)=>n+g.items.length, 0);
    el.textContent = "개봉 항목 " + data.shelf.length + "개"
      + (today ? " · 오늘 폐기 " + today + "개" : "");
    return;
  }
  if(state.listTab === "sub"){
    const used = data.drinks.filter(d=>(d.subRefs||[]).length).length;
    el.textContent = "부재료 " + data.subs.length + "개"
      + (used ? " · 메뉴 " + used + "곳에 사용" : "");
    return;
  }
  if(state.listTab === "memo"){
    el.textContent = "메모 " + data.memos.length + "개";
    return;
  }
  const live = liveDrinks();
  const done = live.filter(d=>has(data.mastered,d.id)).length;
  /* 보관 개수는 앱바 오른쪽 보관함 버튼이 이미 말해준다. 여기서 또 쓰면 줄이 넘어간다 */
  el.textContent = "레시피 " + live.length + "개 · 외운 것 " + done + "개";
}
/* 이레 안에 넣은 레시피에 표를 단다. 등록한 날이 없는 것(이 기능 전에 넣은 것)은 달지 않는다.
   오늘 기능이 생겼다고 반년 전 레시피가 새것이 될 수는 없다 */
const NEW_DAYS = 7;
function isNewDrink(d){
  if(!d.at) return false;
  const n = dayGap(d.at, ymd(new Date()));
  return n >= 0 && n <= NEW_DAYS;
}
/* 최신 등록순. 등록한 날이 있는 것이 위로, 그다음은 배열 차례를 거꾸로.
   배열은 넣은 차례라서 뒤에 있을수록 나중에 넣은 것이다 */
function byNewest(list){
  return list.map((d, i)=>({d:d, i:i}))
    .sort((a, b)=>{
      const x = a.d.at || "", y = b.d.at || "";
      if(x !== y) return x < y ? 1 : -1;
      return b.i - a.i;
    })
    .map(p=>p.d);
}
function rowHTML(d, pill, selectable){
  const on = selectable && state.sel.has(d.id);
  const badge = selectable ? ""
    : (pill ? `<span class="pill">${esc(pill)}</span>`
      : (isNewDrink(d) ? `<span class="pill new">새로 넣음</span>`
        : (has(data.mastered,d.id) ? `<span class="pill done">완료</span>` : "")));
  return `<button class="row${on?" on":""}" data-id="${esc(d.id)}">
    ${selectable ? `<span class="checkc">✓</span>` : tempBadge(d)}
    <span class="meta"><b>${esc(d.name)}</b><span>${d.ing.slice(0,3).map(i=>esc(i[0])).join(" · ")}</span></span>
    ${badge}
  </button>`;
}

/* 도트 진도 링. 88px 링을 3px 칸 30×30 으로 쪼갠다.
   칸 중심까지의 거리로 고리를 골라 두께가 고르고, 12시에서 시계 방향 각도로 진도만큼 채운다.
   바깥 한 겹은 빛, 안쪽 한 겹은 그늘. 0% 여도 원래 링처럼 시작점 한 점은 보인다.
   색은 dot.css 의 --d-ring-* 가 테마마다 정한다 */
function ringPixelSVG(pct){
  const N = 30, c = 14.5;
  let out = "";
  for(let y = 0; y < N; y++) for(let x = 0; x < N; x++){
    const dx = x - c, dy = y - c, d = Math.sqrt(dx*dx + dy*dy);
    if(d < 10.9 || d > 14.4) continue;
    const a = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
    const on = a < pct * 3.6 || ((a < 7 || a > 353) && d > 11.9 && d < 13.6 && y < c);
    const k = !on ? "track" : (d > 13.4 ? "hi" : (d < 11.9 ? "lo" : "fill"));
    out += '<rect x="' + x + '" y="' + y + '" width="1" height="1" class="rp-' + k + '"/>';
  }
  return '<svg viewBox="0 0 30 30" shape-rendering="crispEdges">' + out + '</svg>';
}

/* 도트 화면의 "다시 볼 메뉴" — 카페 주문 대기표 한 장과, 메뉴마다 영수증 한 줄.
   줄은 .row 라 누르면 원래처럼 메뉴가 열린다(bindRows) */
function reviewTicketHTML(rev){
  const head = rev.length > 1 ? `${esc(rev[0].name)} 외 ${rev.length - 1}잔` : esc(rev[0].name);
  return `<div class="qn"><div class="no"><small>대기</small><b>${rev.length}<span class="u">잔</span></b></div>
      <div class="tx"><b>${head}</b><span>차례대로 한 번 더 보자츄</span></div></div>
    <div class="rcpt">${rev.map(d=>`<button class="row rline" data-id="${esc(d.id)}">
      <span class="nm">${esc(d.name)}</span><i class="ld"></i><span class="v">${esc(d.temp || "다시")}</span></button>`).join("")}</div>`;
}
