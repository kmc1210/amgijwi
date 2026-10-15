/* 암기쥐 — 테마의 홈 움직임 (1.3 · 앱 전용)
   치즈로 사는 테마는 홈에 그 테마만의 움직임이 더해진다. 지금은 핼러윈 밤: 달 · 박쥐 떼 · 유령 · 별.
   홈에서만 움직인다(학습 · 편집에는 없다). 글자 위로는 지나가지 않게 맨 위 가장자리와 "다시 볼 메뉴" 빈칸 옆만 쓴다.
   "동작 줄이기"를 켠 기기에서는 달 · 별만 가만히 그린다. 화면을 떠나거나 앱이 뒤로 가면 멈춘다.
   한 칸 = 2px(쥐돌이 도트와 같다) */

const FX_PAL = {k:"#2A1F35", m:"#FFF1C4", M:"#F2D88A", s:"#E9DCC0", b:"#8A6CA8", r:"#FF9A7E", g:"#EDE6F5", G:"#B9A8CF", e:"#2A1F35"};
const FX_MOON = ["..mmmm..", ".mmmmmm.", "mmMmmmmm", "mmmmmMmm", "mmmmmmmm", "mMmmmmmm", ".mmmmmm.", "..mmmm.."];
const FX_BAT = [["b.......b", "bb.b.b.bb", "bbbbbbbbb", ".bbrbrbb.", "...b.b..."],
                [".........", "..bb.bb..", ".bbbbbbb.", "bbbrbrbbb", "b..b.b..b"]];
const FX_GHOST = ["...gggg...", "..gggggg..", ".gggggggg.", ".ggeggegg.", ".ggeggegg.", "gggggggggg", "gggggggggg", "gggggggggg", "ggGgggGggg", "gG.gGg.gGg"];
const FX_GLOW = [[2,-1],[3,-1],[4,-1],[5,-1],[-1,2],[-1,3],[-1,4],[-1,5],[8,2],[8,3],[8,4],[8,5],[2,8],[3,8],[4,8],[5,8],[0,0],[7,0],[0,7],[7,7]];

let fxT = null, fxTick = 0, fxBats = [], fxNextBat = 30, fxSpots = null, fxSpotAge = 0;
const FX_MS = 84;                 // 초당 12장이면 도트 움직임에 충분하다(전지를 아낀다). 시간은 fxTick 을 두 칸씩 센다
function themeFxWanted(){
  return isDot() && shownTheme() === "hwnight" && $("#s-home").classList.contains("active") && !document.hidden;
}
/* 테마 · 화면 · 앱 상태가 바뀔 때마다 부른다(applyTheme · go · visibilitychange). 켤 때만 그리고, 아니면 지운다 */
function themeFxSync(){
  const cv = $("#themeFx"); if(!cv) return;
  if(!themeFxWanted()){ clearInterval(fxT); fxT = null; cv.hidden = true; return; }
  cv.hidden = false;
  const home = $("#s-home"), w = Math.ceil(home.clientWidth / 2), h = Math.ceil(home.clientHeight / 2);
  if(cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
  fxSpots = null;                 // 자리를 다시 잰다
  if(reduceMotion()){ clearInterval(fxT); fxT = null; themeFxDraw(false); return; }
  if(!fxT) fxT = setInterval(()=>{ if(themeFxWanted()) themeFxDraw(true); else themeFxSync(); }, FX_MS);
}
/* 자리(위쪽 안전 영역 · 쥐돌이 · 인사말 · "다시 볼" 빈칸)는 8장마다 한 번만 잰다. 스크롤 · 화면 크기가 바뀌면 바로 다시 */
function themeFxSpots(){
  if(fxSpots && fxSpotAge++ < 8) return fxSpots;
  fxSpotAge = 0;
  const home = $("#s-home").getBoundingClientRect();
  const at = el=>{ const r = el && el.getBoundingClientRect(); return r && r.width ? {x:(r.left - home.left) / 2, y:(r.top - home.top) / 2, w:r.width / 2, h:r.height / 2, r:(r.right - home.left) / 2} : null; };
  const bar = at($("#s-home .appbar"));
  return (fxSpots = {top: bar ? Math.max(0, bar.y - 6) : 0, mouse: at($("#mascot")), greet: at($("#greetT")), empty: at(document.querySelector("#reviewList .empty"))});
}
function fxSpr(ctx, rows, x, y, a){
  ctx.globalAlpha = a === undefined ? 1 : a;
  rows.forEach((r, j)=>{ for(let i = 0; i < r.length; i++){ const c = FX_PAL[r[i]]; if(!c) continue; ctx.fillStyle = c; ctx.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1); } });
  ctx.globalAlpha = 1;
}
function themeFxDraw(moving){
  const cv = $("#themeFx"), ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  const sp = themeFxSpots(), top = sp.top;          // 위쪽 안전 영역(시계 · 다이내믹 아일랜드) 아래부터 쓴다
  /* 별: 맨 위 가장자리에 몇 점, 차례로 반짝 */
  [[0.08, 6], [0.2, 3], [0.33, 9], [0.47, 2], [0.6, 7]].forEach(([fx, y], k)=>{
    if(moving && (Math.floor(fxTick / 12) + k) % 4 === 0) return;
    ctx.fillStyle = FX_PAL.s; ctx.globalAlpha = .7; ctx.fillRect(Math.round(W * fx), top + y - 6, 1, 1); ctx.globalAlpha = 1;
  });
  /* 달: 쥐돌이 왼쪽 위. 인사말과 쥐돌이 사이에 자리가 있을 때만(글자 위에 그리지 않는다) */
  const m = sp.mouse, g = sp.greet;
  if(m && (!g || m.x - 14 >= g.r + 2)){
    const mx = Math.round(m.x - 14), my = Math.max(2, Math.round(m.y - 2));
    ctx.fillStyle = "rgba(255,241,196," + (moving ? .25 + .2 * Math.sin(fxTick / 30) : .3).toFixed(2) + ")";
    FX_GLOW.forEach(([x, y])=>ctx.fillRect(mx + x, my + y, 1, 1));
    fxSpr(ctx, FX_MOON, mx, my);
  }
  if(moving){
    /* 박쥐 떼: 7~10초마다 두세 마리가 맨 위를 오른쪽에서 왼쪽으로 */
    if(--fxNextBat <= 0){
      const y0 = top - 4 + Math.random() * 4;
      fxBats = [0, 1, 2].slice(0, Math.random() < .5 ? 3 : 2).map(k=>({x: W + 8 + k * 14, y: y0 + k * 3, ph: k * 2}));
      fxNextBat = 85 + Math.floor(Math.random() * 35);      // 7~10초(한 장 84ms)
    }
    fxBats.forEach(b=>{ b.x -= 3.2; fxSpr(ctx, FX_BAT[Math.floor((fxTick + b.ph) / 4) % 2], b.x, b.y + Math.sin((fxTick + b.ph * 5) / 6) * 1.5); });
    fxBats = fxBats.filter(b=>b.x > -12);
    /* 유령: "다시 볼 메뉴"가 비어 있을 때 그 빈칸 오른쪽 위에서 둥실 떠올랐다 사라진다 */
    const e = sp.empty;
    if(e && e.y > 10 && e.y < H - 10){
      const p = (fxTick % 240) / 240, a = p < .15 ? p / .15 : p > .85 ? (1 - p) / .15 : 1;
      fxSpr(ctx, FX_GHOST, e.x + e.w - 16, e.y - 12 - p * 10 + Math.sin(fxTick / 10) * 1.5, .75 * a);
    }
    fxTick += 2;
  }
}
document.addEventListener("visibilitychange", themeFxSync);
window.addEventListener("resize", themeFxSync);              // 아이패드 회전 · 화면 나누기
/* 홈을 스크롤하면 자리를 다시 잰다(동작 줄이기면 그 자리에 다시 그린다) */
document.addEventListener("scroll", e=>{
  if(!$("#s-home").contains(e.target) || !themeFxWanted()) return;
  fxSpots = null;
  if(reduceMotion()) themeFxDraw(false);
}, true);
