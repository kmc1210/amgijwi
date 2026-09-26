/* 암기쥐 — 일정 달력
   신메뉴 출시일처럼 그날까지 준비할 일을 걸어두고, 다가오면 알려준다.
   되풀이되는 일정은 아직 없다. 날짜 하나짜리만 다룬다. */

const DOW_S = ["일","월","화","수","목","금","토"];
let calCursor = null;        // 보고 있는 달. 첫 진입에 이번 달로 잡는다

/* ---------- 조회 ---------- */
function evSorted(list){
  return (list || data.events).slice().sort((a,b)=> a.date < b.date ? -1 : (a.date > b.date ? 1 : -0));
}
/* 기간이 있으면 끝나는 날까지 모두 그 일정의 날이다 */
function evEnd(e){ return e.end || e.date; }
function evOn(key){ return data.events.filter(e=>key >= e.date && key <= evEnd(e)); }
/* 오늘부터 며칠 남았나. 지난 일정은 음수 */
function evDDay(e){ return dayGap(ymd(new Date()), e.date); }
/* 시작 전 · 진행 중 · 지남 중 어디인가 */
function evStatus(e){
  const today = ymd(new Date());
  const start = dayGap(today, e.date);
  const left = dayGap(today, evEnd(e));
  if(start > 0) return { kind:"soon", text: evDDayText(start) };
  if(left >= 0) return { kind:"now", text: e.end ? "진행 중" : "오늘" };
  return { kind:"late", text: Math.abs(left) + "일 지남" };
}
/* "2026-09-24" → "9월 24일". 앞의 0 은 떼야 읽기 편하다 */
function evDateText(key){
  const p = key.split("-");
  return Number(p[1]) + "월 " + Number(p[2]) + "일";
}
/* 기간이면 "9월 15일 ~ 18일". 달이 같으면 뒤쪽 달은 뺀다 */
function evRangeText(e){
  if(!e.end) return evDateText(e.date);
  const a = e.date.split("-"), b = e.end.split("-");
  const tail = a[1] === b[1] ? Number(b[2]) + "일" : evDateText(e.end);
  return evDateText(e.date) + " ~ " + tail;
}
function evDDayText(n){
  if(n === 0) return "오늘";
  if(n === 1) return "내일";
  if(n > 0) return "D-" + n;
  return Math.abs(n) + "일 지남";
}
/* 홈에 띄울 것 — 아직 안 끝났고, 미리 알림 기간에 들어왔거나 이미 지난 것.
   기간 일정은 끝나는 날을 기준으로 지났는지 본다. 한창 진행 중인데 사라지면 안 된다 */
function evUpcoming(){
  const today = ymd(new Date());
  return evSorted().filter(e=>{
    if(e.done) return false;
    const left = dayGap(today, evEnd(e));
    if(left < 0) return left >= -7;       // 끝난 것도 이레까지는 보여준다. 놓친 걸 알아야 한다
    return evDDay(e) <= (e.remind || 0);  // 시작이 코앞이거나 이미 진행 중
  });
}

/* ---------- 홈 카드 ---------- */
function renderUpcoming(){
  const sect = $("#upcomingSect");
  if(!sect) return;
  const list = evUpcoming();
  if(!list.length){ sect.style.display = "none"; return; }
  sect.style.display = "block";
  $("#upcomingList").innerHTML = list.map(e=>{
    const st = evStatus(e);
    return `<button class="row" data-ev="${esc(e.id)}">
      <span class="emo">${st.kind === "late" ? "⚠️" : "📅"}</span>
      <span class="meta"><b>${esc(e.title)}</b>
        <span>${esc(evRangeText(e))}${e.note ? " · " + esc(e.note) : ""}</span></span>
      <span class="pill${st.kind === "late" ? "" : " done"}">${esc(st.text)}</span>
    </button>`;
  }).join("");
  $("#upcomingList").querySelectorAll(".row").forEach(b=>
    b.addEventListener("click", ()=>{ go("cal"); openEventSheet(b.dataset.ev); }));
}

/* ---------- 달력 ---------- */
function calKey(y, m, d){
  return y + "-" + String(m+1).padStart(2,"0") + "-" + String(d).padStart(2,"0");
}
function renderCal(){
  const now = new Date();
  if(!calCursor) calCursor = {y: now.getFullYear(), m: now.getMonth()};
  const {y, m} = calCursor;

  $("#calTitle").textContent = y + "년 " + (m+1) + "월";
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m+1, 0).getDate();
  const todayKey = ymd(now);

  let cells = "";
  /* 첫 주의 빈 앞자리. 클래스 이름을 empty 로 두면 안 된다 —
     목록 빈 상태용 .empty 가 이미 있어서 그 여백이 딸려오고, 칸 폭이 밀려 달력이 넘친다 */
  for(let i=0;i<first;i++) cells += `<div class="calcell calpad"></div>`;
  for(let d=1; d<=days; d++){
    const key = calKey(y, m, d);
    const on = evOn(key);
    const undone = on.filter(e=>!e.done).length;
    cells += `<button class="calcell${key === todayKey ? " today" : ""}${on.length ? " has" : ""}" data-day="${key}">
      <span class="n">${d}</span>
      ${on.length ? `<span class="dot${undone ? "" : " off"}"></span>` : ""}
    </button>`;
  }
  $("#calGrid").innerHTML = cells;
  $("#calGrid").querySelectorAll(".calcell[data-day]").forEach(b=>
    b.addEventListener("click", ()=>{ state.calDay = b.dataset.day; renderCalDay(); }));

  if(!state.calDay || state.calDay.slice(0,7) !== calKey(y, m, 1).slice(0,7)) {
    state.calDay = (todayKey.slice(0,7) === calKey(y, m, 1).slice(0,7)) ? todayKey : calKey(y, m, 1);
  }
  renderCalDay();
}
function renderCalDay(){
  const key = state.calDay;
  const list = evOn(key);
  const [yy, mm, dd] = key.split("-").map(Number);
  const dow = DOW_S[new Date(yy, mm-1, dd).getDay()];
  $("#calDayTitle").textContent = mm + "월 " + dd + "일 " + dow + "요일";

  $("#calDayList").innerHTML = list.length
    ? list.map(e=>`<button class="evrow${e.done ? " done" : ""}" data-ev="${esc(e.id)}">
        <span class="nm">${esc(e.title)}</span>
        <span class="nt">${esc(evRangeText(e))}${e.note ? " · " + esc(e.note) : ""}</span>
        <span class="dd">${e.done ? "끝남" : esc(evStatus(e).text)}</span>
      </button>`).join("")
    : `<p class="calempty">이 날은 비어 있어요.</p>`;
  $("#calDayList").querySelectorAll(".evrow").forEach(b=>
    b.addEventListener("click", ()=>openEventSheet(b.dataset.ev)));
  $("#calGrid").querySelectorAll(".calcell").forEach(c=>
    c.classList.toggle("sel", c.dataset.day === key));
}
function calMove(n){
  const {y, m} = calCursor;
  const d = new Date(y, m + n, 1);
  calCursor = {y: d.getFullYear(), m: d.getMonth()};
  state.calDay = null;
  renderCal();
}

/* ---------- 일정 넣기 · 고치기 ---------- */
function openEventSheet(id){
  const ev = id ? data.events.filter(e=>e.id === id)[0] : null;
  const date = ev ? ev.date : (state.calDay || ymd(new Date()));
  let remind = ev ? ev.remind : 3;

  /* 폼 모양은 개봉 항목 시트와 같은 틀을 쓴다 (.fld · .pickers · .pick) */
  $("#sheetBody").innerHTML = `
    <h2 style="margin:0 0 4px;font-size:21px;font-weight:800;letter-spacing:-.4px">${ev ? "일정 고치기" : "일정 넣기"}</h2>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:18px">그날까지 준비할 일을 걸어둡니다</div>
    <div class="fld"><label>무슨 일인가요 *</label>
      <input type="text" id="evTitle" maxlength="60" value="${ev ? esc(ev.title) : ""}" placeholder="예: 신메뉴 출시" autocomplete="off"></div>
    <div class="fld"><label>언제 *</label>
      <input type="date" id="evDate" value="${esc(date)}"></div>
    <div class="fld"><label>언제까지 (하루짜리면 비워두세요)</label>
      <input type="date" id="evEnd" value="${ev && ev.end ? esc(ev.end) : ""}"></div>
    <div class="fld"><label>메모</label>
      <textarea id="evNote" placeholder="예: 라떼 3종 레시피 외우기">${ev ? esc(ev.note) : ""}</textarea></div>
    <div class="fld"><label>며칠 전부터 홈에 띄울까요</label>
      <div class="pickers" id="evRem"></div></div>
    ${ev ? `<button class="cta ghost" id="evDone">${ev.done ? "아직 안 끝났어요" : "끝난 일로 표시"}</button>` : ""}
    <button class="cta" id="evSave">${ev ? "저장" : "넣기"}</button>
    ${ev ? `<button class="cta danger" id="evDel">삭제</button>` : ""}`;

  const drawRem = ()=>{
    $("#evRem").innerHTML = [0,1,3,7,14].map(n=>
      `<button type="button" class="pick${remind === n ? " on" : ""}" data-rem="${n}"><span class="box">✓</span>${n === 0 ? "당일" : n + "일 전"}</button>`).join("");
    $("#evRem").querySelectorAll(".pick").forEach(b=>b.addEventListener("click", ()=>{
      remind = Number(b.dataset.rem); drawRem();
    }));
  };
  drawRem();

  $("#mask").classList.add("on"); $("#sheet").classList.add("on");

  $("#evSave").addEventListener("click", ()=>{
    const title = $("#evTitle").value.trim();
    const d = $("#evDate").value;
    let end = $("#evEnd").value;
    if(!title){ toast("무슨 일인지 적어주세요"); return; }
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d)){ toast("날짜를 골라주세요"); return; }
    if(end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) end = "";
    if(end && end < d){ toast("끝나는 날이 시작보다 앞서요"); return; }
    if(end === d) end = "";                    // 같은 날이면 하루짜리다
    if(ev){ ev.title = title; ev.date = d; ev.end = end; ev.note = $("#evNote").value.trim(); ev.remind = remind; }
    else data.events.push({id:uid(), title:title, date:d, end:end, note:$("#evNote").value.trim(), remind:remind, done:false});
    persist(); closeSheet();
    state.calDay = d;
    calCursor = {y:Number(d.slice(0,4)), m:Number(d.slice(5,7)) - 1};
    renderCal(); renderHome();
    toast(ev ? "고쳤어요" : "넣었어요");
  });

  const doneBtn = $("#evDone");
  if(doneBtn) doneBtn.addEventListener("click", ()=>{
    ev.done = !ev.done; persist(); closeSheet(); renderCal(); renderHome();
    toast(ev.done ? "끝난 일로 표시했어요" : "다시 진행 중으로 두었어요");
  });

  const delBtn = $("#evDel");
  if(delBtn) delBtn.addEventListener("click", ()=>{
    closeSheet();
    confirmBox("일정 삭제", `"${ev.title}" 을(를) 지웁니다.`, "삭제", ()=>{
      data.events = data.events.filter(x=>x.id !== ev.id);
      persist(); renderCal(); renderHome(); toast("지웠어요");
    });
  });
}

$("#calPrev").addEventListener("click", ()=>calMove(-1));
$("#calNext").addEventListener("click", ()=>calMove(1));
$("#calToday").addEventListener("click", ()=>{
  const n = new Date();
  calCursor = {y:n.getFullYear(), m:n.getMonth()};
  state.calDay = ymd(n);
  renderCal();
});
$("#calAdd").addEventListener("click", ()=>openEventSheet(null));
