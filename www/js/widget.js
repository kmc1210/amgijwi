/* 암기쥐 — 홈 화면 위젯에 넘길 요약 (1.2 · 앱 전용)
   위젯(ios/Widget)은 앱의 저장소를 읽지 못한다. 그래서 위젯이 그릴 것만 추려 앱에 넘기면,
   앱(WidgetBridge.swift)이 위젯과 같이 쓰는 칸(App Group)에 적어 두고 위젯을 다시 그리게 한다.
   넘기는 것: 레시피 수 · 외운 수 · 연속 접속 · 치즈 · 마지막으로 온 날 · 마지막으로 한 바퀴 돈 날,
             오늘 폐기를 챙길 재료 수 · 끝나지 않은 일정 여섯 개까지(제목과 날짜 — 중간 크기 위젯이 보여준다),
             그리고 지금 입은 옷 그대로의 쥐돌이 그림 다섯 장(평소 · 기쁨 · 삐침 · 시무룩 · 풀이 죽음)과 색.
   며칠째인지 · 어떤 얼굴인지는 위젯이 그리는 날짜로 스스로 정한다(앱을 열지 않아도 날이 지나면 바뀐다).
   큰 위젯은 고른 레시피나 메모를 보여준다. 그래서 레시피(이름 · 재료와 용량 · 제조 순서)와 메모도 넘긴다.
   다만 앱에 PIN 잠금을 건 사람의 것은 넘기지 않는다 — 위젯은 잠금을 풀지 않아도 홈 화면에서 보인다.
   기기 밖으로 나가는 것은 없다 */

function widgetBridge(){
  const w = window.webkit;
  if(!isDot() || !isNativeApp() || !w || !w.messageHandlers || !w.messageHandlers.amgijwiWidget) return null;
  return w.messageHandlers.amgijwiWidget;
}
/* 위젯에 그릴 쥐돌이: 생일 고깔모자 같은 그날 것은 빼고, 옷장에서 고른 옷 그대로.
   저장할 때마다 불리니 옷이 바뀌었을 때만 다시 그린다 */
let widgetFaceKey = "", widgetFaceMemo = null;
function widgetFaces(){
  const wear = Object.assign({}, data.closet.wear), key = JSON.stringify(wear);
  if(key === widgetFaceKey && widgetFaceMemo) return widgetFaceMemo;
  const bare = Object.assign({}, wear);
  delete bare.face;                         // 얼굴이 바뀐 그림은 안경을 벗긴다(faceMouseSVG 와 같다)
  const faces = {normal: dressRows(mouseRows("day"), "stand", wear)};
  Object.keys(MOUSE_FACES).forEach(k=>{
    const rows = mouseRows("day");
    MOUSE_FACES[k].rows.forEach((r, i)=>{ rows[MOUSE_FACES[k].y0 + i] = r; });
    faces[k] = dressRows(rows, "stand", bare);
  });
  const pal = {};
  Object.keys(faces).forEach(k=>faces[k].join("").split("").forEach(ch=>{ if(ch !== "." && MOUSE_PAL[ch]) pal[ch] = MOUSE_PAL[ch]; }));
  widgetFaceKey = key; widgetFaceMemo = {faces: faces, pal: pal};
  return widgetFaceMemo;
}
/* 큰 위젯에 보여줄 레시피와 메모. 위젯 한 칸에 들어갈 만큼만 추린다(재료 12줄 · 순서 6줄 · 메모 8개).
   PIN 잠금을 걸었으면 아무것도 넘기지 않고 locked 만 알린다 */
const WIDGET_RECIPES = 300, WIDGET_MEMOS = 8;
function widgetText(v, n){ return String(v === undefined || v === null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n); }
function widgetBoard(){
  if(data.pin) return {locked: true, recipes: [], memos: []};
  const recipes = liveDrinks().slice(0, WIDGET_RECIPES).map(d=>({
    id: String(d.id),
    n: widgetText(d.name, 40),
    t: widgetText(d.temp, 12),
    c: widgetText((d.cups || []).join(" · "), 30),
    m: has(data.mastered, d.id),      // 외운 메뉴인가(고른 레시피가 없을 때 못 외운 것부터 보여준다)
    sets: ingSets(d).map(s=>({l: s[0], ing: (s[1] || []).filter(p=>p && (p[0] || p[1])).slice(0, 12).map(p=>[widgetText(p[0], 30), widgetText(p[1], 24)])})),
    steps: (d.steps || []).filter(Boolean).slice(0, 6).map(x=>widgetText(x, 60))
  }));
  const memos = data.memos.slice().sort((a, b)=>{
    if(!!a.pin !== !!b.pin) return a.pin ? -1 : 1;                  // 고정 먼저, 그 안에서는 최신순(메모 화면과 같다)
    return String(b.at || "").localeCompare(String(a.at || ""));
  }).slice(0, WIDGET_MEMOS).map(m=>({t: widgetText(m.text, 140), p: !!m.pin}));
  return {locked: false, recipes: recipes, memos: memos};
}
/* 0 이상의 정수로. 위젯 쪽은 수가 아니면 요약을 통째로 못 읽는다 */
function widgetInt(v){ return Math.max(0, Math.floor(Number(v) || 0)); }
function widgetSummary(){
  const live = liveDrinks(), art = widgetFaces(), board = widgetBoard();
  const v = data.visit || {}, today = ymd(new Date());
  /* 끝나지 않은 일정. 앞으로 시작할 것을 가까운 순으로 먼저, 이미 진행 중인 것은 그 뒤에 —
     오래 이어지는 행사가 내일 일정을 가리지 않게. 위젯은 그리는 날짜에 맞춰 다시 고른다 */
  const events = data.events.filter(e=>e && !e.done && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && evEnd(e) >= today)
    .sort((a, b)=>(a.date < today ? 1 : 0) - (b.date < today ? 1 : 0) || (a.date < b.date ? -1 : (a.date > b.date ? 1 : 0)))
    .slice(0, 6).map(e=>({t: String(e.title || "").slice(0, 40), d: e.date, e: evEnd(e)}));
  return {
    v: 1,
    total: live.length,
    done: live.filter(d=>has(data.mastered, d.id)).length,
    streak: widgetInt(v.streak),
    cheese: widgetInt(data.closet.cheese),
    last: typeof v.last === "string" ? v.last : "",
    studied: typeof data.studied === "string" ? data.studied : "",
    kill: widgetInt(discardCount()),  // 개봉관리에 기한을 건 재료 수 = 날마다 폐기일을 챙길 것(홈의 "오늘 버릴 게 N개"와 같은 수)
    events: events,
    locked: board.locked, recipes: board.recipes, memos: board.memos,
    faces: art.faces, pal: art.pal
  };
}
/* 저장할 때마다 불린다(core.js flushNativeCopy). 달라졌을 때만 넘긴다 */
let widgetSent = "";
function widgetSync(){
  const b = widgetBridge();
  if(!b) return;
  const text = JSON.stringify(widgetSummary());
  if(text === widgetSent) return;
  b.postMessage(text);
  widgetSent = text;                // 넘긴 뒤에 적는다. 넘기다 실패했으면 다음에 다시 넘긴다
}
