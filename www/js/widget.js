/* 암기쥐 — 홈 화면 위젯에 넘길 요약 (1.2 · 앱 전용)
   위젯(ios/Widget)은 앱의 저장소를 읽지 못한다. 그래서 위젯이 그릴 것만 추려 앱에 넘기면,
   앱(WidgetBridge.swift)이 위젯과 같이 쓰는 칸(App Group)에 적어 두고 위젯을 다시 그리게 한다.
   넘기는 것: 레시피 수 · 외운 수 · 연속 접속 · 치즈 · 마지막으로 온 날 · 마지막으로 한 바퀴 돈 날,
             오늘 폐기할 개수 · 다가오는 일정 다섯 개까지(제목과 날짜 — 중간 크기 위젯이 보여준다),
             그리고 지금 입은 옷 그대로의 쥐돌이 그림 다섯 장(평소 · 기쁨 · 삐침 · 시무룩 · 풀이 죽음)과 색.
   며칠째인지 · 어떤 얼굴인지는 위젯이 그리는 날짜로 스스로 정한다(앱을 열지 않아도 날이 지나면 바뀐다).
   레시피 내용은 넘기지 않는다. 기기 밖으로 나가는 것도 없다 */

function widgetBridge(){
  const w = window.webkit;
  if(!isDot() || !isNativeApp() || !w || !w.messageHandlers || !w.messageHandlers.amgijwiWidget) return null;
  return w.messageHandlers.amgijwiWidget;
}
/* 위젯에 그릴 쥐돌이: 생일 고깔모자 같은 그날 것은 빼고, 옷장에서 고른 옷 그대로 */
function widgetFaces(){
  const wear = Object.assign({}, data.closet.wear), bare = Object.assign({}, wear);
  delete bare.face;                         // 얼굴이 바뀐 그림은 안경을 벗긴다(faceMouseSVG 와 같다)
  const out = {normal: dressRows(mouseRows("day"), "stand", wear)};
  Object.keys(MOUSE_FACES).forEach(k=>{
    const rows = mouseRows("day");
    MOUSE_FACES[k].rows.forEach((r, i)=>{ rows[MOUSE_FACES[k].y0 + i] = r; });
    out[k] = dressRows(rows, "stand", bare);
  });
  return out;
}
function widgetSummary(){
  const live = liveDrinks(), faces = widgetFaces(), pal = {};
  Object.keys(faces).forEach(k=>faces[k].join("").split("").forEach(ch=>{ if(ch !== "." && MOUSE_PAL[ch]) pal[ch] = MOUSE_PAL[ch]; }));
  const v = data.visit || {}, today = ymd(new Date());
  let kill = 0;
  try{ kill = tagGroups().reduce((n, g)=>n + g.items.length, 0); }catch(e){}
  /* 끝나지 않은 일정을 가까운 것부터. 위젯이 그리는 날짜에 맞춰 지난 것은 스스로 건너뛴다 */
  const events = evSorted().filter(e=>!e.done && evEnd(e) >= today).slice(0, 5)
    .map(e=>({t: String(e.title || "").slice(0, 40), d: e.date, e: evEnd(e)}));
  return {
    v: 1,
    total: live.length,
    done: live.filter(d=>has(data.mastered, d.id)).length,
    streak: v.streak || 0,
    cheese: data.closet.cheese,
    last: typeof v.last === "string" ? v.last : "",
    studied: typeof data.studied === "string" ? data.studied : "",
    kill: kill, killDay: today,       // 폐기 개수는 오늘 것이다. 날이 바뀌면 위젯은 보여주지 않는다
    events: events,
    faces: faces, pal: pal
  };
}
/* 저장할 때마다 불린다(core.js flushNativeCopy). 달라졌을 때만 넘긴다 */
let widgetSent = "";
function widgetSync(){
  const b = widgetBridge();
  if(!b) return;
  const text = JSON.stringify(widgetSummary());
  if(text === widgetSent) return;
  widgetSent = text;
  try{ b.postMessage(text); }catch(e){}
}
