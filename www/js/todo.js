/* 암기쥐 — 주간 할 일 (1.5)
   요일마다 할 일을 정해 두면 매주 같은 목록이 돌아오고, 한 일에 체크한다. 일정 탭 위의 "달력 / 할 일" 로 오간다.
   한 주는 월요일부터다. 월요일 0시에 체크만 풀리고 목록은 그대로 남는다(체크는 날짜로 적어 두어 지난주 것은 저절로 안 맞는다).
   그날 할 일을 그날 다 끝내면 치즈 1개(하루 한 번 — data.closet.todoDay).
   홈 화면 위젯에서도 바로 체크한다(iOS 17 부터). 위젯이 체크한 것은 App Group 에 기록으로 쌓이고,
   앱을 열 때 앱(TodoBridge — WidgetBridge.swift)이 todoFromWidget 으로 넘겨 준다. 달력 일정과는 섞지 않는다.

   data.todos     [{id, t, days}]  — days 는 0(월) ~ 6(일)
   data.todoDone  ["YYYY-MM-DD|id"] — 이번 주에 체크한 것만 남긴다 */

const TODO_DOW = ["월","화","수","목","금","토","일"];
const TODO_DAY_MAX = 20, TODO_TITLE = 40, TODO_CHEESE = 1;

/* 0(월) ~ 6(일) */
function todoDowOf(d){ return (d.getDay() + 6) % 7; }
function todoKeyDow(key){ const p = key.split("-").map(Number); return todoDowOf(new Date(p[0], p[1] - 1, p[2])); }
/* 그 날이 든 주의 월요일부터 일요일까지 "YYYY-MM-DD" 일곱 개 */
function todoWeek(now){
  now = now || new Date();
  const mon = addDays(now, -todoDowOf(now));
  return [0,1,2,3,4,5,6].map(i=>ymd(addDays(mon, i)));
}
/* 모양을 다듬는다. 불러올 때 · 백업을 되살릴 때 · 날이 바뀐 뒤 그릴 때 부른다.
   지난주 체크와 지운 할 일의 체크는 버린다 */
function cleanTodos(root, now){
  const seen = {};
  root.todos = (Array.isArray(root.todos) ? root.todos : []).map(x=>{
    if(!x || typeof x !== "object") return null;
    const days = (Array.isArray(x.days) ? x.days : []).map(Number).filter(n=>n >= 0 && n <= 6 && Math.floor(n) === n);
    const t = Array.from(String(x.t || "").replace(/\s+/g, " ").trim()).slice(0, TODO_TITLE).join("");
    let id = String(x.id || "") || uid();
    while(seen[id]) id = uid();
    seen[id] = 1;
    return t && days.length ? {id: id, t: t, days: days.filter((n, i)=>days.indexOf(n) === i).sort()} : null;
  }).filter(Boolean);
  const mon = todoWeek(now)[0];
  root.todoDone = (Array.isArray(root.todoDone) ? root.todoDone : []).filter((k, i, a)=>{
    if(typeof k !== "string" || a.indexOf(k) !== i) return false;
    const m = /^(\d{4}-\d{2}-\d{2})\|(.+)$/.exec(k);
    return !!m && m[1] >= mon && !!seen[m[2]];
  });
}
cleanTodos(data);

function todoById(id){ return data.todos.filter(x=>x.id === id)[0] || null; }
function todosOn(key){ const w = todoKeyDow(key); return data.todos.filter(x=>x.days.indexOf(w) >= 0); }
function todoIsDone(key, id){ return data.todoDone.indexOf(key + "|" + id) >= 0; }
function todoSet(key, id, on){
  const k = key + "|" + id, i = data.todoDone.indexOf(k);
  if(on && i < 0) data.todoDone.push(k);
  if(!on && i >= 0) data.todoDone.splice(i, 1);
}
function todoCount(key){
  const list = todosOn(key);
  return {all: list.length, done: list.filter(x=>todoIsDone(key, x.id)).length};
}
/* "월 · 목 · 토" · 매일 · 평일 · 주말 */
function todoDaysText(days){
  const s = days.join("");
  if(s === "0123456") return "매일";
  if(s === "01234") return "평일";
  if(s === "56") return "주말";
  return days.map(n=>TODO_DOW[n]).join(" · ");
}
/* 오늘 할 일을 오늘 다 끝냈으면 치즈. 하루 한 번. 받았으면 true.
   지난 요일을 나중에 채우거나, 앞날 것을 미리 체크해서는 받지 않는다(앞날은 체크도 안 된다) */
function todoCheese(key, now){
  now = now || new Date();
  const today = ymd(now), c = todoCount(key);
  if(!isDot() || key !== today || !c.all || c.done < c.all || data.closet.todoDay === today) return false;
  data.closet.todoDay = today; data.closet.cheese += TODO_CHEESE;
  return true;
}
function todoCheeseSaid(){
  const n = $("#cheeseN"); if(n) n.textContent = data.closet.cheese;
  haptic("success");
  toast("오늘 할 일 끝! 치즈 +" + TODO_CHEESE + " 받았츄");
}

/* ---------- 달력 / 할 일 ---------- */
function calViewSet(v){
  state.calView = v === "todo" ? "todo" : "cal";
  const todo = state.calView === "todo";
  $("#calView").hidden = todo;
  $("#todoView").hidden = !todo;
  $("#calSub").textContent = todo ? "매주 돌아오는 할 일" : "그날까지 준비할 일";
  $("#calAdd").setAttribute("aria-label", todo ? "할 일 넣기" : "일정 넣기");
  $("#calSeg").querySelectorAll("button").forEach(b=>b.classList.toggle("on", b.dataset.cv === state.calView));
  if(todo) renderTodo(); else renderCal();
}
$("#calSeg").querySelectorAll("button").forEach(b=>b.addEventListener("click", ()=>{
  if(b.dataset.cv === (state.calView || "cal")) return;
  haptic("selection");
  calViewSet(b.dataset.cv);
}));

/* 도트 체크 표시(7×7). 칸 하나가 2px 이 되게 14px 로 그린다 */
const TODO_CHECK = '<svg viewBox="0 0 7 7" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M0 3h1v2H0zM1 4h1v2H1zM2 5h1v2H2zM3 4h1v2H3zM4 3h1v2H4zM5 2h1v2H5zM6 1h1v2H6z"/></svg>';

function renderTodo(){
  const now = new Date(), today = ymd(now), week = todoWeek(now);
  if(data.todoDone.some(k=>k.slice(0, 10) < week[0])) cleanTodos(data, now);      // 앱을 켜 둔 채 주가 바뀌었다
  if(week.indexOf(state.todoDay) < 0) state.todoDay = today;
  const key = state.todoDay;

  let all = 0, done = 0;
  $("#todoWeek").innerHTML = week.map((k, i)=>{
    const list = todosOn(k), n = list.filter(x=>todoIsDone(k, x.id)).length;
    all += list.length; done += n;
    /* 점 하나가 할 일 하나. 많으면 여덟 개까지만 그린다(칸이 좁다) */
    const pips = list.slice(0, 8).map((x, j)=>`<i class="${j < n ? "f" : ""}"></i>`).join("");
    const cls = (k === key ? " sel" : "") + (k === today ? " today" : "") + (list.length && n === list.length ? " all" : "");
    return `<button class="tdday${cls}" data-day="${k}" aria-label="${TODO_DOW[i]}요일 ${n}/${list.length}">
      <span class="w">${TODO_DOW[i]}</span><b>${Number(k.slice(8))}</b><span class="pips">${pips}</span></button>`;
  }).join("");
  $("#todoWeek").querySelectorAll(".tdday").forEach(b=>b.addEventListener("click", ()=>{
    if(state.todoDay === b.dataset.day) return;
    haptic("selection");
    state.todoDay = b.dataset.day; renderTodo();
  }));
  $("#todoSum").innerHTML = all
    ? `<span>이번 주 ${done} / ${all} 했어요</span><span class="tdbar"><i style="width:${Math.round(done / all * 100)}%"></i></span>`
    : `<span>요일마다 할 일을 넣어 보세요. 매주 같은 목록이 돌아와요.</span>`;

  const list = todosOn(key), c = todoCount(key), dow = TODO_DOW[todoKeyDow(key)];
  $("#todoDayTitle").innerHTML = `<span>${dow}요일${key === today ? " · 오늘" : ""}</span>${list.length ? `<small>${c.done} / ${c.all}</small>` : ""}`;
  $("#todoList").innerHTML = list.length
    ? list.map(x=>{
        const on = todoIsDone(key, x.id);
        return `<div class="tdrow${on ? " done" : ""}">
          <button class="tdck" data-ck="${esc(x.id)}" role="checkbox" aria-checked="${on}" aria-label="${esc(x.t)}"><span class="tdbox">${on ? TODO_CHECK : ""}</span></button>
          <button class="tdnm" data-ed="${esc(x.id)}"><span class="nm">${esc(x.t)}</span><span class="nt">${esc(todoDaysText(x.days))}</span></button>
        </div>`;
      }).join("")
    : `<p class="calempty">${dow}요일 할 일이 없어요.</p>`;
  $("#todoList").querySelectorAll(".tdck").forEach(b=>b.addEventListener("click", ()=>todoToggle(key, b.dataset.ck)));
  $("#todoList").querySelectorAll(".tdnm").forEach(b=>b.addEventListener("click", ()=>openTodoSheet(b.dataset.ed)));
  $("#todoAdd").textContent = "＋ " + dow + "요일 할 일 넣기";
}
function todoToggle(key, id){
  const now = new Date();
  if(key > ymd(now)){ haptic("warning"); toast("그날이 되면 체크할 수 있어요"); return; }
  const on = !todoIsDone(key, id);
  todoSet(key, id, on);
  const got = on && todoCheese(key, now);
  persist();
  if(got) todoCheeseSaid(); else haptic(on ? "light" : "selection");
  renderTodo();
}

/* ---------- 할 일 넣기 · 고치기 ---------- */
function openTodoSheet(id){
  const td = id ? todoById(id) : null;
  let days = td ? td.days.slice() : [todoKeyDow(state.todoDay || ymd(new Date()))];

  $("#sheetBody").innerHTML = `
    <h2 style="margin:0 0 4px;font-size:21px;font-weight:800;letter-spacing:-.4px">${td ? "할 일 고치기" : "할 일 넣기"}</h2>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:18px">매주 돌아오는 할 일을 걸어둡니다</div>
    <div class="fld"><label>무엇을 할까요 *</label>
      <input type="text" id="tdTitle" maxlength="${TODO_TITLE}" value="${td ? esc(td.t) : ""}" placeholder="예: 우유 발주 넣기" autocomplete="off"></div>
    <div class="fld"><label>어느 요일에 할까요 *</label>
      <div class="tddays" id="tdDays"></div>
      <div class="pickers tdquick" id="tdQuick"></div></div>
    <button class="cta" id="tdSave">${td ? "저장" : "넣기"}</button>
    ${td ? `<button class="cta danger" id="tdDel">삭제</button>` : ""}`;

  const QUICK = [["매일", [0,1,2,3,4,5,6]], ["평일", [0,1,2,3,4]], ["주말", [5,6]]];
  const draw = ()=>{
    $("#tdDays").innerHTML = TODO_DOW.map((w, i)=>
      `<button type="button" class="pick${days.indexOf(i) >= 0 ? " on" : ""}" data-dw="${i}" aria-pressed="${days.indexOf(i) >= 0}">${w}</button>`).join("");
    $("#tdQuick").innerHTML = QUICK.map(q=>
      `<button type="button" class="pick${q[1].join("") === days.join("") ? " on" : ""}" data-q="${q[0]}">${q[0]}</button>`).join("");
    $("#tdDays").querySelectorAll(".pick").forEach(b=>b.addEventListener("click", ()=>{
      const n = Number(b.dataset.dw), i = days.indexOf(n);
      if(i >= 0) days.splice(i, 1); else days.push(n);
      days.sort(); draw();
    }));
    $("#tdQuick").querySelectorAll(".pick").forEach(b=>b.addEventListener("click", ()=>{
      days = QUICK.filter(q=>q[0] === b.dataset.q)[0][1].slice(); draw();
    }));
  };
  draw();

  $("#mask").classList.add("on"); $("#sheet").classList.add("on");

  $("#tdSave").addEventListener("click", ()=>{
    const t = Array.from($("#tdTitle").value.replace(/\s+/g, " ").trim()).slice(0, TODO_TITLE).join("");
    if(!t){ toast("무엇을 할지 적어주세요"); return; }
    if(!days.length){ toast("요일을 하나 이상 골라주세요"); return; }
    /* 한 요일에 스무 개까지. 위젯과 화면이 감당할 만큼만 */
    const full = days.filter(n=>data.todos.filter(x=>x !== td && x.days.indexOf(n) >= 0).length >= TODO_DAY_MAX);
    if(full.length){ toast(TODO_DOW[full[0]] + "요일 할 일은 " + TODO_DAY_MAX + "개까지예요"); return; }
    if(td){
      td.t = t;
      /* 뺀 요일에 이번 주 해 둔 체크는 지운다(그 요일 할 일이 아니게 됐다) */
      todoWeek().forEach(k=>{ if(days.indexOf(todoKeyDow(k)) < 0) todoSet(k, td.id, false); });
      td.days = days.slice();
    } else data.todos.push({id: uid(), t: t, days: days.slice()});
    /* 빼거나 고치는 바람에 오늘 할 일이 다 끝난 상태가 되어도 치즈는 주지 않는다 — 체크를 해서 끝낸 날에만 준다 */
    persist(); closeSheet(); renderTodo();
    toast(td ? "고쳤어요" : "넣었어요");
  });

  const delBtn = $("#tdDel");
  if(delBtn) delBtn.addEventListener("click", ()=>{
    closeSheet();
    confirmBox("할 일 삭제", `"${td.t}" 을(를) 모든 요일에서 지웁니다.`, "삭제", ()=>{
      data.todos = data.todos.filter(x=>x.id !== td.id);
      data.todoDone = data.todoDone.filter(k=>k.slice(11) !== td.id);
      persist(); renderTodo(); toast("지웠어요");
    });
  });
}
$("#todoAdd").addEventListener("click", ()=>openTodoSheet(null));

/* ---------- 위젯에서 체크한 것 (앱만) ----------
   위젯(ios/Widget/TodoWidget.swift)은 누른 것을 기록으로 쌓는다: [{id, d, on, at}] — d 는 그 할 일의 날, at 은 누른 때(ms).
   앱이 켜지거나 앞으로 나올 때 그 기록을 차례대로 넘겨 준다. 적용하고 저장한 뒤(위젯 요약도 바로 새로 쓴다),
   여기까지 받았다고(upTo) 알리면 앱이 그 기록을 지운다. 이 이름은 WebAppViewController.swift 에도 적혀 있다 */
function todoBridge(){
  const w = window.webkit;
  if(!isNativeApp() || !w || !w.messageHandlers || !w.messageHandlers.amgijwiTodo) return null;
  return w.messageHandlers.amgijwiTodo;
}
function todoFromWidget(log){
  if(!Array.isArray(log) || !log.length) return;
  const now = new Date(), week = todoWeek(now);
  let upTo = 0, got = false;
  log.forEach(e=>{
    if(!e || typeof e !== "object") return;
    const at = Number(e.at) || 0;
    if(at > upTo) upTo = at;
    const d = String(e.d || ""), id = String(e.id || "");
    if(week.indexOf(d) < 0 || d > ymd(now) || !todoById(id) || todosOn(d).indexOf(todoById(id)) < 0) return;
    todoSet(d, id, !!e.on);
    /* 그날 위젯에서 체크해 오늘 할 일을 끝냈으면 치즈(앱에서 체크한 것과 같다) */
    if(e.on && at && ymd(new Date(at)) === d && todoCheese(d, now)) got = true;
  });
  persist();
  flushNativeCopy();                 // 위젯 요약을 먼저 새로 쓴 뒤에 기록을 지운다(사이에 위젯이 옛 상태로 그려지지 않게)
  const b = todoBridge();
  if(b && upTo) b.postMessage({op: "take", upTo: upTo});
  if($("#s-cal").classList.contains("active") && state.calView === "todo") renderTodo();
  if(got){
    todoCheeseSaid();
    if($("#s-home").classList.contains("active")) renderHome();
  }
}
