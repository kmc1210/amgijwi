/* 암기쥐 — 테마의 홈 움직임 (1.3 · 앱 전용)
   치즈로 사는 테마는 홈에 그 테마만의 움직임이 더해진다. 핼러윈 밤: 달 · 박쥐 떼 · 유령 · 별.
   크리스마스 밤(1.5): 홈 맨 위 꼬마전구 줄(전구마다 다른 박자) · "다시 볼 메뉴" 옆 작은 트리 · 인사말 옆 별, 그리고 눈(아래 snow — 학습 화면만 빼고 모든 화면 뒤에서).
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
  const t = shownTheme();
  return isDot() && (t === "hwnight" || t === "xmnight") && $("#s-home").classList.contains("active") && !document.hidden;
}
/* 테마 · 화면 · 앱 상태가 바뀔 때마다 부른다(applyTheme · go · visibilitychange). 켤 때만 그리고, 아니면 지운다 */
function themeFxSync(){
  snowSync();                     // 크리스마스 밤의 눈은 홈 밖에서도 내린다
  const cv = $("#themeFx"); if(!cv) return;
  if(!themeFxWanted()){ clearInterval(fxT); fxT = null; cv.hidden = true; return; }
  cv.hidden = false;
  const home = $("#s-home"), w = Math.ceil(home.clientWidth / 2), h = Math.ceil(home.clientHeight / 2);
  if(cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
  fxSpots = null;                 // 자리를 다시 잰다
  if(reduceMotion()){ clearInterval(fxT); fxT = null; themeFxDraw(false); return; }
  if(snowT){ clearInterval(fxT); fxT = null; themeFxDraw(true); return; }      // 눈이 내리는 중이면 눈의 시계에 맞춰 같이 그린다(시계 하나)
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
  if(shownTheme() === "xmnight"){ xmasDraw(ctx, W, H, sp, moving); if(moving) fxTick += 2; return; }
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

/* ---------- 크리스마스 밤: 꼬마전구 · 트리 · 별 (홈) ---------- */
const XFX_PAL = {w:"#3E5A50", Y:"#F2C766", y:"#FFF3C4", G:"#3E8E52", g:"#2F6B4F", T:"#7C4E22", r:"#E8504A", b:"#5AA0E0", o:"#F5F0E6", d:"#A8873E"};
const XFX_BULB = ["#E8504A", "#F2C766", "#5FB86A", "#5AA0E0"];
const XFX_TREE = ["....Y....", "...YYY...", "....G....", "...GGG...", "..GGrGG..", "..GGGGG..", ".GGbGGGG.", ".GGGGoGG.", "GGrGGGGbG", "GGGGGGGGG", "....T....", "....T...."];
/* 전구마다 다른 박자: 번호로 정해 두는 어림 난수(켤 때마다 같다) */
function xfxRand(k){ const v = Math.sin(k * 12.9898 + 4.1) * 43758.5453; return v - Math.floor(v); }
function xfxOn(k, moving){ if(!moving) return true; const period = 18 + Math.floor(xfxRand(k) * 26), ph = Math.floor(xfxRand(k + 99) * period); return (fxTick / 2 + ph) % period < period * 0.62; }
function xmasDraw(ctx, W, H, sp, moving){
  const top = sp.top;
  /* 꼬마전구 줄: 맨 위 가장자리를 따라 처진 전선. 9칸마다 전구, 전구마다 따로 깜빡인다 */
  for(let x = 0; x < W; x++){
    const y = top + Math.round(3 * Math.pow(Math.sin(x / W * Math.PI * 6), 2));
    ctx.fillStyle = XFX_PAL.w; ctx.fillRect(x, y, 1, 1);
    if(x % 9 === 4){
      const k = Math.floor(x / 9), c = XFX_BULB[k % 4], on = xfxOn(k, moving);
      ctx.globalAlpha = on ? 1 : 0.35; ctx.fillStyle = c; ctx.fillRect(x, y + 1, 2, 2);
      if(on){ ctx.globalAlpha = 0.28; ctx.fillRect(x - 1, y, 4, 4); }
      ctx.globalAlpha = 1;
    }
  }
  /* 별: 인사말과 쥐돌이 사이에 자리가 있을 때만(글자 위에 그리지 않는다). 가끔 반짝 */
  const m = sp.mouse, g = sp.greet;
  if(m && (!g || m.x - 10 >= g.r + 2)){
    const sx = Math.round(m.x - 8), sy = Math.max(top + 8, Math.round(m.y + 4)), lit = !moving || xfxOn(777, moving);
    ctx.fillStyle = XFX_PAL.Y; [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([a, c])=>ctx.fillRect(sx + a, sy + c, 1, 1));
    if(lit){ ctx.fillStyle = XFX_PAL.y; ctx.fillRect(sx - 2, sy, 1, 1); ctx.fillRect(sx + 2, sy, 1, 1); ctx.fillRect(sx, sy - 2, 1, 1); ctx.fillRect(sx, sy + 2, 1, 1); }
  }
  /* 작은 트리: "다시 볼 메뉴" 칸 오른쪽 위. 전구 · 꼭대기 별이 따로 깜빡인다 */
  const e = sp.empty;
  if(e && e.y > 16 && e.y < H - 10){
    const tx = Math.round(e.x + e.w - 14), ty = Math.round(e.y - 13);
    XFX_TREE.forEach((row, yy)=>{ for(let xx = 0; xx < row.length; xx++){
      const ch = row[xx]; if(ch === ".") continue;
      const light = "rbo".indexOf(ch) >= 0, star = ch === "Y";
      if(light && !xfxOn(200 + yy * 9 + xx, moving)){ ctx.fillStyle = XFX_PAL.G; }
      else ctx.fillStyle = star && !xfxOn(555, moving) ? XFX_PAL.d : XFX_PAL[ch];      // 꼭대기 별은 꺼지면 어두운 금색
      ctx.fillRect(tx + xx, ty + yy, 1, 1);
    } });
  }
}

/* ---------- 크리스마스 밤: 눈 ----------
   앱 전체 뒤(.app 의 첫 칸 #snowFx)에 그린다. 이 테마에서는 화면 바탕을 비워(dot.css 의 body.snowing) 카드 사이 · 가장자리 빈 곳에만 눈이 보이고
   글자 위로는 지나가지 않는다. 학습 화면(외우는 데 집중)에서는 멈춘다. 초당 12장, 동작 줄이기면 가만히 한 장. 한 칸 = 2px */
let snowT = null, snowFlakes = null;
function snowWanted(){
  return isDot() && shownTheme() === "xmnight" && !document.hidden && !$("#s-study").classList.contains("active");
}
function snowFlake(W, H, anywhere){
  const big = Math.random() < 0.3;
  return {x: Math.random() * W, y: anywhere ? Math.random() * H : -2, v: (big ? 0.55 : 0.35) + Math.random() * 0.3, big: big, ph: Math.random() * 6.28};
}
function snowSync(){
  const cv = $("#snowFx"); if(!cv) return;
  const on = snowWanted();
  document.body.classList.toggle("snowing", isDot() && shownTheme() === "xmnight");     // 바탕은 학습 화면이어도 같은 색(깜빡이지 않게)
  if(!on){ clearInterval(snowT); snowT = null; cv.hidden = true; return; }
  cv.hidden = false;
  const app = document.querySelector(".app"), W = Math.ceil(app.clientWidth / 2), H = Math.ceil(app.clientHeight / 2);
  if(cv.width !== W || cv.height !== H){ cv.width = W; cv.height = H; snowFlakes = null; }
  if(!snowFlakes) snowFlakes = Array.from({length: Math.max(20, Math.round(70 * W * H / (195 * 422)))}, ()=>snowFlake(W, H, true));
  if(reduceMotion()){ clearInterval(snowT); snowT = null; snowDraw(false); return; }
  if(!snowT) snowT = setInterval(()=>{ if(!snowWanted()){ themeFxSync(); return; } snowDraw(true); if(themeFxWanted()) themeFxDraw(true); }, FX_MS);
}
function snowDraw(moving){
  const cv = $("#snowFx"), ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  snowFlakes.forEach((f, k)=>{
    if(moving){ f.y += f.v; f.ph += 0.08; if(f.y > H + 2) f = snowFlakes[k] = snowFlake(W, H, false); }
    const x = Math.round(f.x + Math.sin(f.ph) * 1.2), y = Math.round(f.y);
    ctx.globalAlpha = f.big ? 0.9 : 0.6; ctx.fillStyle = "#FFFFFF"; ctx.fillRect(x, y, 1, 1);
    if(f.big){ ctx.globalAlpha = 0.5; ctx.fillStyle = "#C9D8E6"; ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1); }
  });
  ctx.globalAlpha = 1;
}
