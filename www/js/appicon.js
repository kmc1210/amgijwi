/* 암기쥐 — 크리스마스 앱 아이콘 (1.5 · 앱 전용)
   홈 화면 아이콘을 "눈 오는 밤 쥐돌이"(산타 모자 · 털실 목도리)로 바꿀 수 있다. 아이콘은 앱 안에 미리 들어 있다(ios/Assets.xcassets/AppIcon-Xmas).
   · 12월 1~25일에 홈을 처음 볼 때 한 번 묻는다(해마다 한 번). 누르면 iOS 가 "아이콘을 변경했습니다" 알림을 띄운다
   · 26일이 지나 앱을 열면 원래 아이콘으로 돌아온다. iOS 는 앱이 앞에 있을 때만 아이콘을 바꿀 수 있어서, 날짜가 되는 순간이 아니라 그 뒤 처음 열 때다
   · 기간 안에는 설정 → 화면과 소리 → 앱 아이콘 에서 언제든 고른다
   아이콘은 기기마다라 물어본 해는 이 기기에만 둔다(백업 파일에 싣지 않는다). 지금 아이콘은 앱이 window.__amgijwiIcon 으로 알린다
   ("default" · "xmas", 바꿀 수 없는 기기면 없음 — ios/Sources/IconBridge.swift) */
const ICON_ASKED_KEY = "amgijwi-icon-asked";
function iconBridge(){
  const w = window.webkit;
  if(!isDot() || !isNativeApp() || !w || !w.messageHandlers || !w.messageHandlers.amgijwiIcon) return null;
  return w.messageHandlers.amgijwiIcon;
}
/* 지금 아이콘. 바꿀 수 없으면 "" */
function iconNow(){ const v = window.__amgijwiIcon; return iconBridge() && (v === "default" || v === "xmas") ? v : ""; }
/* 크리스마스 아이콘을 쓰는 기간: 12월 1~25일 */
function iconSeason(d){ d = d || new Date(); return d.getMonth() === 11 && d.getDate() <= 25; }
function iconSet(kind){
  const b = iconBridge();
  if(!b || !iconNow() || kind === iconNow()) return;
  b.postMessage(kind === "xmas" ? "xmas" : "default");
}
/* 앱이 바꾼 결과를 알린다: "xmas" · "default" 면 바뀐 것, 그 밖(fail)이면 못 바꾼 것 */
function iconFromApp(kind){
  if(kind === "xmas" || kind === "default") window.__amgijwiIcon = kind;
  else toast("아이콘을 바꾸지 못했어요");
  iconCardSync();
}
/* 기간이 지났는데 아직 크리스마스 아이콘이면 되돌린다(켤 때 · 다시 앞으로 꺼낼 때) */
function iconRevert(){ if(iconNow() === "xmas" && !iconSeason()) iconSet("default"); }
/* 기간 안이고 올해 아직 안 물었으면 홈에서 한 번 묻는다. 다른 창 · 썰매 장면이 떠 있으면 다음 기회로 미룬다 */
function iconAsk(){
  if(iconNow() !== "default" || !iconSeason()) return;
  const y = String(new Date().getFullYear());
  let asked = "";
  try{ asked = localStorage.getItem(ICON_ASKED_KEY) || ""; }catch(e){}
  if(asked === y || !canInterrupt(true) || justClosedDlg() || xmasFxBusy()) return;
  try{ localStorage.setItem(ICON_ASKED_KEY, y); }catch(e){}
  confirmBox("크리스마스 아이콘", "쥐돌이가 크리스마스 아이콘을 준비했츄. 홈 화면 아이콘을 바꿔 줄까츄? 12월 26일이 지나 앱을 열면 원래 아이콘으로 돌아와요.",
    "바꾸기", ()=>iconSet("xmas"), {no: "괜찮아", haptic: "light", go: true, pic: appIconSVG("xmas")});
}

/* 아이콘 그림(ios/make-icon.js 도 이걸로 1024px 아이콘을 만든다). 28칸 쥐돌이를 칸 32 · 위 여백 171 로 놓고 아래는 자른다 */
const APP_ICON_BG = {default: ["#382A21", "#7D5839"], xmas: ["#16223F", "#34507F"]};
function appIconSVG(kind){
  const xmas = kind === "xmas", SIZE = 1024, CELL = 32, TOP = 171;
  const rows = xmas ? dressRows(MOUSE.day, "stand", {head: "santahat", body: "scarf"}) : MOUSE.day;
  const w = rows[0].length, x0 = (SIZE - w * CELL) / 2, bg = APP_ICON_BG[xmas ? "xmas" : "default"];
  let out = "";
  if(xmas){
    /* 눈송이: 정해 둔 자리(매번 같은 그림). 큰 것은 가운데 + 옅은 네 칸 */
    let s = 7;
    const rnd = ()=>(s = (s * 9301 + 49297) % 233280) / 233280;
    for(let i = 0; i < 26; i++){
      const x = Math.floor(rnd() * 32) * 32, y = Math.floor(rnd() * 9) * 32 + 16;
      if(x > 190 && x < 800 && y > 140) continue;
      const big = rnd() < 0.3, cell = (cx, cy, o)=>`<rect x="${cx}" y="${cy}" width="32" height="32" fill="#F4F8FB"${o ? ` opacity="${o}"` : ""}/>`;
      out += big ? cell(x, y) + cell(x - 32, y, .45) + cell(x + 32, y, .45) + cell(x, y - 32, .45) + cell(x, y + 32, .45) : cell(x, y, .8);
    }
  }
  for(let y = 0; y < rows.length && TOP + y * CELL < SIZE; y++){
    for(let x = 0; x < w;){
      const ch = rows[y][x];
      if(ch === "."){ x++; continue; }
      let n = 1;
      while(x + n < w && rows[y][x + n] === ch) n++;
      out += `<rect x="${x0 + x * CELL}" y="${TOP + y * CELL}" width="${n * CELL}" height="${Math.min(CELL, SIZE - (TOP + y * CELL))}" fill="${MOUSE_PAL[ch]}"/>`;
      x += n;
    }
  }
  return `<svg class="appicon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="crispEdges" aria-hidden="true">`
    + `<defs><linearGradient id="aig-${xmas ? "x" : "d"}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient></defs>`
    + `<rect width="${SIZE}" height="${SIZE}" fill="url(#aig-${xmas ? "x" : "d"})"/>${out}</svg>`;
}

/* 설정 → 화면과 소리 → 앱 아이콘. 바꿀 수 있는 기기에서, 기간 안이거나 아직 크리스마스 아이콘일 때만 보인다 */
function iconCardSync(){
  const card = $("#iconCard"); if(!card) return;
  const now = iconNow(), show = !!now && (iconSeason() || now === "xmas");
  card.style.display = show ? "" : "none";
  if(!show) return;
  const btns = $("#iconBtns");
  if(!btns.firstChild) btns.innerHTML = [["default", "기본"], ["xmas", "크리스마스"]]
    .map(([k, l])=>`<button type="button" class="icon-b" data-icon="${k}">${appIconSVG(k)}<span>${l}</span></button>`).join("");
  btns.querySelectorAll(".icon-b").forEach(b=>b.classList.toggle("on", b.dataset.icon === now));
}
$("#iconBtns").addEventListener("click", e=>{
  const b = e.target.closest(".icon-b"); if(!b) return;
  haptic("selection"); iconSet(b.dataset.icon);
});
iconCardSync();
iconRevert();
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden){ iconRevert(); iconCardSync(); iconAsk(); } });
