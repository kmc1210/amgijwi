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

/* ---------- 알림 (iOS 앱만) ----------
   앱이 꺼져 있어도 울려야 하므로 iOS 로컬 알림을 쓴다. 웹에는 이 기능이 없다.
   무엇을 언제 보낼지와 문구는 여기서 정하고, 앱(AlarmBridge.swift)은 받은 목록을 예약만 한다.
   서버로 나가는 것은 없다. connect-src 'none' 은 그대로다 */
const ALARM_MAX = 64;             // iOS 가 한 앱에 걸어 두는 로컬 알림 수의 한계
let alarmPerm = "unknown";        // unknown · granted · denied. 앱이 알려준다
let alarmRedraw = null;           // 일정 시트가 열려 있으면 권한 답을 받았을 때 다시 그린다

/* 앱이 심어 두는 통로. 이름은 AlarmBridge.swift 의 name 과 같아야 한다 */
function alarmBridge(){
  const w = window.webkit;
  if(!isNativeApp() || !w || !w.messageHandlers || !w.messageHandlers.amgijwiAlarm) return null;
  return w.messageHandlers.amgijwiAlarm;
}
function alarmPost(msg){
  const b = alarmBridge();
  if(b) b.postMessage(msg);
}
function alarmTime(e){ return /^([01]\d|2[0-3]):[0-5]\d$/.test(e.alarmAt) ? e.alarmAt : "09:00"; }
/* 알림이 가는 때. "며칠 전부터" 날에 한 번, 당일에 한 번 더. 당일이면 한 번뿐이다.
   이미 지난 시각은 뺀다 */
function alarmShots(e, now){
  if(!e || !e.alarm || e.done || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return [];
  const p = e.date.split("-").map(Number), t = alarmTime(e);
  const h = Number(t.slice(0, 2)), m = Number(t.slice(3, 5));
  const rem = Math.max(0, Number(e.remind) || 0);
  return (rem > 0 ? [rem, 0] : [0])
    .map(n=>({n:n, at:new Date(p[0], p[1]-1, p[2]-n, h, m)}))
    .filter(s=>s.at > (now || new Date()));
}
/* 쥐돌이 말투. 제목은 남은 날, 둘째 줄은 메모(없으면 쥐돌이 한마디) */
function alarmText(e, n){
  const head = n === 0 ? "오늘이츄!" : (n === 1 ? "내일이츄" : n + "일 남았츄");
  const body = e.note ? e.note : (n === 0 ? "잊지 말고 챙기자츄" : "슬슬 준비해보자츄");
  return {title: head + " · " + e.title, body: body};
}
/* 오전 9:00 · 오후 2:30 */
function alarmClock(d){
  const h = d.getHours();
  return (h < 12 ? "오전 " : "오후 ") + (h % 12 === 0 ? 12 : h % 12) + ":" + String(d.getMinutes()).padStart(2, "0");
}
/* 앱에 넘길 목록. 가까운 것부터 ALARM_MAX 개까지. 시각은 기기 시간대의 "YYYY-MM-DDTHH:MM" */
function alarmPlan(now){
  const list = [];
  data.events.forEach(e=>alarmShots(e, now).forEach(s=>{
    const t = alarmText(e, s.n);
    const at = ymd(s.at) + "T" + String(s.at.getHours()).padStart(2, "0") + ":" + String(s.at.getMinutes()).padStart(2, "0");
    list.push({id: e.id + "-" + s.n, at: at, title: t.title, body: t.body, when: s.at.getTime()});
  }));
  list.sort((a, b)=>a.when - b.when);
  const out = list.slice(0, ALARM_MAX).map(x=>({id:x.id, at:x.at, title:x.title, body:x.body}));
  /* 생일 알림은 일정에 밀리지 않게 맨 앞에 둔다. 해마다 되풀이하고 케이크 그림을 붙인다 (birthday.js) */
  const bd = bdayAlarmItem(now);
  if(bd) out.unshift(bd);
  return out.slice(0, ALARM_MAX);
}
/* 일정이 바뀔 때마다 부른다. 앱은 걸어 둔 것을 모두 지우고 이 목록으로 다시 건다 */
function syncAlarms(){
  if(!alarmBridge()) return;
  alarmPost({op:"sync", items: alarmPlan(new Date())});
}
/* 앱이 권한 상태를 알려줄 때 부른다. 앱을 열 때마다 오므로, 설정 앱에서 허용하고 돌아와도 다시 건다.
   이 이름은 AlarmBridge.swift 에도 적혀 있다 */
function alarmStatusFromApp(s){
  alarmPerm = (s === "granted" || s === "denied") ? s : "unknown";
  if(alarmPerm === "granted") syncAlarms();
  if(alarmRedraw && $("#evAlarm")) alarmRedraw();
  if($("#s-set").classList.contains("active")) bdaySettings();     // 설정의 생일 알림 칸도 권한을 따라 다시 그린다
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
    /* 도트 화면은 주문 전표: 왼쪽 떼는 칸에 날짜와 남은 날, 점선 절취선, 구멍 두 개 */
    if(isDot()){
      const p = e.date.split("-");
      /* 떼는 칸은 좁고 도트 글꼴은 16px 아래로 못 줄인다. 지난 일은 "2일 지남" 대신 D+2 로 짧게(빨간 칸이라 지난 건 보인다) */
      const tag = st.kind === "late" ? "D+" + Math.abs(dayGap(ymd(new Date()), evEnd(e))) : st.text;
      return `<button class="row tk${st.kind === "late" ? " late" : ""}" data-ev="${esc(e.id)}">
        <span class="stub"><small>${Number(p[1])}/${Number(p[2])}</small><b>${esc(tag)}</b></span>
        <i class="perf"></i><i class="hole t"></i><i class="hole b"></i>
        <span class="meta"><b>${esc(e.title)}</b><span>${esc(evRangeText(e))}${e.note ? " · " + esc(e.note) : ""}</span></span>
      </button>`;
    }
    return `<button class="row" data-ev="${esc(e.id)}">
      <span class="emo">${st.kind === "late" ? icon("warn") : icon("calendar")}</span>
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
/* 한 주의 막대 배치. 먼저 시작한 것, 같은 날 시작하면 긴 것부터 비어 있는 가장 위 줄에 넣는다.
   그래서 한 주 안에서는 막대 줄이 흔들리지 않는다. 주·달을 넘는 쪽 끝은 l · r 로 표시해 화살표로 자른다.
   CAL_LANES 줄을 넘는 일정은 막대 대신 그 날 칸에 "+n" 으로 센다 */
const CAL_LANES = 2;
function calLayWeek(keys){
  const more = [0,0,0,0,0,0,0];
  const real = keys.filter(Boolean);
  if(!real.length) return {bars:[], more:more};
  const lo = real[0], hi = real[real.length-1];
  const list = data.events.filter(e=>e.date <= hi && evEnd(e) >= lo).sort((a, b)=>
    a.date !== b.date ? (a.date < b.date ? -1 : 1) : (evEnd(a) === evEnd(b) ? 0 : (evEnd(a) > evEnd(b) ? -1 : 1)));
  const lanes = [], bars = [];
  list.forEach(e=>{
    const s = keys.indexOf(e.date < lo ? lo : e.date), t = keys.indexOf(evEnd(e) > hi ? hi : evEnd(e));
    let lane = 0;
    while(lanes[lane] !== undefined && lanes[lane] >= s) lane++;
    lanes[lane] = t;
    if(lane < CAL_LANES) bars.push({e:e, s:s, t:t, lane:lane, l:e.date < lo, r:evEnd(e) > hi});
    else for(let i=s; i<=t; i++) more[i]++;
  });
  return {bars:bars, more:more};
}

function renderCal(){
  const now = new Date();
  if(!calCursor) calCursor = {y: now.getFullYear(), m: now.getMonth()};
  const {y, m} = calCursor;

  $("#calTitle").textContent = y + "년 " + (m+1) + "월";
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m+1, 0).getDate();
  const todayKey = ymd(now);

  /* 한 주를 한 줄로 그린다. 빈 앞뒷자리는 null */
  const slots = [];
  for(let i=0;i<first;i++) slots.push(null);
  for(let d=1; d<=days; d++) slots.push(calKey(y, m, d));
  while(slots.length % 7) slots.push(null);

  let html = "";
  for(let w=0; w<slots.length; w+=7){
    const keys = slots.slice(w, w+7), lay = calLayWeek(keys);
    html += `<div class="calweek">`;
    keys.forEach((key, i)=>{
      /* 빈 자리. 클래스 이름을 empty 로 두면 안 된다 —
         목록 빈 상태용 .empty 가 이미 있어서 그 여백이 딸려오고, 칸 폭이 밀려 달력이 넘친다 */
      if(!key){ html += `<span class="calcell calpad" style="grid-column:${i+1}"></span>`; return; }
      html += `<button class="calcell${key === todayKey ? " today" : ""}" data-day="${key}" style="grid-column:${i+1}"><span class="n">${Number(key.slice(8))}</span></button>`;
    });
    /* 막대는 칸 위에 겹친다. 누르면 아래 칸이 눌리도록 막대는 클릭을 받지 않는다(style.css) */
    lay.bars.forEach(b=>{
      html += `<span class="calbar${b.e.done ? " done" : ""}${b.l ? " l" : ""}${b.r ? " r" : ""}" data-ev="${esc(b.e.id)}" data-from="${keys[b.s]}" data-to="${keys[b.t]}" style="grid-column:${b.s+1} / ${b.t+2};grid-row:${b.lane+2}">${esc(b.e.title)}</span>`;
    });
    lay.more.forEach((n, i)=>{ if(n) html += `<span class="calmore" data-day="${keys[i]}" style="grid-column:${i+1}">+${n}</span>`; });
    html += `</div>`;
  }
  $("#calGrid").innerHTML = html;
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
  /* 알림은 꺼진 채로 시작한다. 켜는 순간 오전 9시가 들어가 있다 */
  let alarm = ev ? !!ev.alarm : false;
  let alarmAt = ev ? alarmTime(ev) : "09:00";

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
    ${alarmBridge() ? `<div class="fld" id="evAlarm"></div>` : ""}
    ${ev ? `<button class="cta ghost" id="evDone">${ev.done ? "아직 안 끝났어요" : "끝난 일로 표시"}</button>` : ""}
    <button class="cta" id="evSave">${ev ? "저장" : "넣기"}</button>
    ${ev ? `<button class="cta danger" id="evDel">삭제</button>` : ""}`;

  const drawRem = ()=>{
    $("#evRem").innerHTML = [0,1,3,7,14].map(n=>
      `<button type="button" class="pick${remind === n ? " on" : ""}" data-rem="${n}"><span class="box">✓</span>${n === 0 ? "당일" : n + "일 전"}</button>`).join("");
    $("#evRem").querySelectorAll(".pick").forEach(b=>b.addEventListener("click", ()=>{
      remind = Number(b.dataset.rem); drawRem(); drawAlarmInfo();
    }));
  };

  /* 알림 칸. 앱에서만 있다. 날짜·며칠 전·시각이 바뀌면 "알림이 오는 때" 도 따라 바뀐다 */
  const drawAlarmInfo = ()=>{
    const info = $("#evAlInfo");
    if(!info) return;
    if(alarmPerm === "denied"){
      info.innerHTML = `<div class="warnbox alarmnote">알림이 꺼져 있어요. iPhone <b>설정 → 암기쥐 → 알림</b>에서 켜면 이 일정 알림이 옵니다.</div>`;
      return;
    }
    const shots = alarmShots({alarm:true, done:false, date:$("#evDate").value, remind:remind, alarmAt:alarmAt});
    info.innerHTML = shots.length
      ? `<div class="okbox">알림이 오는 때<br>${shots.map(s=>
          `<b>${evDateText(ymd(s.at))}(${DOW_S[s.at.getDay()]}) ${alarmClock(s.at)}</b> · ${s.n ? s.n + "일 전" : "당일"}`).join("<br>")}</div>`
      : `<div class="warnbox alarmnote">이미 지난 시각이라 알림이 가지 않아요.</div>`;
  };
  const drawAlarm = ()=>{
    const box = $("#evAlarm");
    if(!box) return;
    box.innerHTML = `<label>알림</label>
      <div class="seg"><button type="button" data-al="0" class="${alarm ? "" : "on"}">받지 않기</button><button type="button" data-al="1" class="${alarm ? "on" : ""}">받기</button></div>
      ${alarm ? `<div class="alarmat"><label for="evAlAt">몇 시에 받을까요</label><input type="time" id="evAlAt" value="${esc(alarmAt)}"></div><div id="evAlInfo"></div>` : ""}`;
    box.querySelectorAll("[data-al]").forEach(b=>b.addEventListener("click", ()=>{
      alarm = b.dataset.al === "1";
      /* 권한은 처음 켤 때만 묻는다. 앱을 열자마자 물으면 이유를 몰라 거절하기 쉽다 */
      if(alarm && alarmPerm === "unknown") alarmPost({op:"ask"});
      drawAlarm();
    }));
    const t = $("#evAlAt");
    if(t) t.addEventListener("change", ()=>{
      if(/^([01]\d|2[0-3]):[0-5]\d/.test(t.value)){ alarmAt = t.value.slice(0, 5); drawAlarmInfo(); }
    });
    drawAlarmInfo();
  };
  alarmRedraw = drawAlarmInfo;

  drawRem();
  drawAlarm();
  $("#evDate").addEventListener("change", drawAlarmInfo);

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
    if(ev){ ev.title = title; ev.date = d; ev.end = end; ev.note = $("#evNote").value.trim(); ev.remind = remind; ev.alarm = alarm; ev.alarmAt = alarmAt; }
    else data.events.push({id:uid(), title:title, date:d, end:end, note:$("#evNote").value.trim(), remind:remind, alarm:alarm, alarmAt:alarmAt, done:false});
    persist(); syncAlarms(); closeSheet();
    state.calDay = d;
    calCursor = {y:Number(d.slice(0,4)), m:Number(d.slice(5,7)) - 1};
    renderCal(); renderHome();
    toast(ev ? "고쳤어요" : "넣었어요");
  });

  const doneBtn = $("#evDone");
  if(doneBtn) doneBtn.addEventListener("click", ()=>{
    ev.done = !ev.done; persist(); syncAlarms(); closeSheet(); renderCal(); renderHome();
    toast(ev.done ? "끝난 일로 표시했어요" : "다시 진행 중으로 두었어요");
  });

  const delBtn = $("#evDel");
  if(delBtn) delBtn.addEventListener("click", ()=>{
    closeSheet();
    confirmBox("일정 삭제", `"${ev.title}" 을(를) 지웁니다.`, "삭제", ()=>{
      data.events = data.events.filter(x=>x.id !== ev.id);
      persist(); syncAlarms(); renderCal(); renderHome(); toast("지웠어요");
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
