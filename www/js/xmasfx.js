/* 암기쥐 — 크리스마스 선물 장면 (1.5 · 앱 전용)
   12월 24 · 25일 처음 홈을 열면 한 번: 루돌프가 끄는 썰매를 타고 쥐돌이가 달려와 선물을 주고, 열면 치즈가 치즈 칸으로 들어간다.
   · 치즈는 장면을 띄우기 전에 이미 받는다(closet.js xmasHome). 건너뛰거나 앱을 닫아도 잃지 않는다
   · 동작 줄이기를 켠 기기에서는 선물 앞에서 바로 시작한다. 소리를 켠 사람에게만 썰매 방울 · "츄"
   · 그림은 모두 코드로: 루돌프 · 썰매 · 나무는 작은 3D(카메라 하나로 비춘다), 쥐돌이는 앱 그림을 그대로 쓰고 얼굴만 살짝 돌린다.
     장면은 큰 캔버스에 그린 뒤 가로 156칸 도트 격자로 옮겨, 멀든 가깝든 도트 한 칸 크기가 같다
   처음 쓸 때 한 번만 만든다(앱을 열 때마다 그림을 준비하지 않게) */

let xmasFx = null;
function xmasFxCreate(){
  "use strict";
  /* 쥐돌이 그림(산타 모자 · 털실 목도리) — closet.js 의 옷 입히기를 그대로 쓴다 */
  function xfSprites(){
    const wear = {head: "santahat", body: "scarf"}, base = mouseRows("day", false), blink = mouseRows("blink", false);
    const happy = base.slice(); MOUSE_HAPPY.rows.forEach((row, i)=>{ happy[MOUSE_HAPPY.y0 + i] = row; });
    return {pal: Object.assign({}, MOUSE_PAL, CLOSET_PAL), stand: dressRows(base, "stand", wear), blink: dressRows(blink, "blink", wear),
            happyGift: dressRows(happy, "stand", Object.assign({hand: "gift"}, wear)), cheese: CHEESE_ROWS};
  }
  const SP = xfSprites();
  /* 쥐돌이는 앱의 팔레트 그대로, 루돌프 · 썰매 · 나무는 따로 */
  const MP = SP.pal;
  const DP = {T:"#A6703A", t:"#7C4E22", H:"#C48A50", "5":"#4A2E1A", G:"#F1E8DA", g:"#D6C8B4", u:"#3A2414", p:"#E8A898",
              k:"#261F1C", h:"#FFFFFF", "8":"#D23C3C", "9":"#8E2128", "0":"#FF7A66", R:"#F5C33F", q:"#C99A2E", j:"#8E6A1E",
              A:"#E2BE78", a:"#B8924A", "1":"#4A1418", "2":"#6B2028", f:"#E85A4E",
              e:"#2F6B4F", E:"#3E8E52", z:"#F4F8FB", Z:"#C9D8E5", w:"#5E3A24"};
  const Z0 = 6, W0 = 130, H0 = 230, Z = Z0, W = W0, H = H0;
  /* 도트 격자 하나: 장면은 큰 캔버스에 그린 뒤 가로 156칸짜리 작은 캔버스로 한 칸씩 집어 옮기고, 그걸 그대로 키워 보여 준다.
     그래서 루돌프 · 썰매 · 나무 · 눈이 멀든 가깝든 도트 한 칸 크기가 모두 같다 */
  const LOW_W = 156, LOW_H = 276;
  let lowC = null;      // 보여 주는 작은 캔버스(xfBuild 에서 만든다)
  const hi = document.createElement("canvas"); hi.width = W0 * Z0; hi.height = H0 * Z0;
  const c = hi.getContext("2d");
  /* 작은 캔버스의 한 칸(xl, yl)을 정확히 채운다(눈송이 · 별처럼 한 칸짜리) */
  const PXW = W0 / LOW_W, PXH = H0 / LOW_H;
  function lowPx(xl, yl, col){ c.fillStyle = col; c.fillRect(xl * PXW, yl * PXH, PXW, PXH); }
  const L = ()=>c.setTransform(Z, 0, 0, Z, 0, 0);

  /* ---------- 도트 그리기 도구: 칸 배열에 타원 · 막대 · 다각형을 채우고 명암 · 테두리를 붙인다 ---------- */
  const G = (w, h)=>[...Array(h)].map(()=>Array(w).fill("."));
  function put(g, x, y, ch){ x = Math.floor(x); y = Math.floor(y); if(y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = ch; }
  function ell(g, cx, cy, rx, ry, ch){ for(let y = Math.floor(cy - ry) - 1; y <= cy + ry + 1; y++) for(let x = Math.floor(cx - rx) - 1; x <= cx + rx + 1; x++){ const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; if(dx * dx + dy * dy <= 1) put(g, x, y, ch); } }
  function cap(g, x0, y0, x1, y1, r0, r1, ch){ const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1; for(let i = 0; i <= n; i++){ const t = i / n; const r = r0 + (r1 - r0) * t; ell(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, ch); } }
  function ln(g, pts, ch){ for(let j = 0; j < pts.length - 1; j++){ const [x0, y0] = pts[j], [x1, y1] = pts[j + 1]; const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) * 2 + 1; for(let i = 0; i <= n; i++){ const t = i / n; put(g, x0 + (x1 - x0) * t + .5, y0 + (y1 - y0) * t + .5, ch); } } }
  function poly(g, pts, ch){ const ys = pts.map(p=>p[1]); for(let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for(let x = 0; x < g[0].length; x++){ const px = x + .5, py = y + .5; let ins = false; for(let i = 0, j = pts.length - 1; i < pts.length; j = i++){ const [xi, yi] = pts[i], [xj, yj] = pts[j]; if((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins; } if(ins) put(g, x, y, ch); } }
  function filledAt(g, x, y){ return y >= 0 && y < g.length && x >= 0 && x < g[0].length && g[y][x] !== "."; }
  /* 빛은 왼쪽 위(달)에서: 오른쪽 아래 가장자리는 어둡게, 왼쪽 위 가장자리는 밝게 */
  function shade(g, main, dark, light){ const s = g.map(r=>r.slice()); for(let y = 0; y < g.length; y++) for(let x = 0; x < g[0].length; x++){ if(s[y][x] !== main) continue; if(!filledAt(s, x + 1, y + 1) || !filledAt(s, x, y + 2)) g[y][x] = dark; else if(!filledAt(s, x - 1, y - 1)) g[y][x] = light; } }
  function outline(g, set, out){ const s = g.map(r=>r.slice()); for(let y = 0; y < g.length; y++) for(let x = 0; x < g[0].length; x++){ if(s[y][x] !== ".") continue; if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy])=>{ const yy = y + dy, xx = x + dx; return yy >= 0 && yy < s.length && xx >= 0 && xx < s[0].length && set.indexOf(s[yy][xx]) >= 0; })) g[y][x] = out; } }
  function sheet(rows, pal){
    const h = rows.length, w = Math.max(...rows.map(r=>r.length)), o = document.createElement("canvas"); o.width = w; o.height = h;
    const x2 = o.getContext("2d"); rows.forEach((r, y)=>{ for(let x = 0; x < r.length; x++){ const col = pal[r[x]]; if(r[x] !== "." && col){ x2.fillStyle = col; x2.fillRect(x, y, 1, 1); } } }); return o;
  }
  const toRows = g=>g.map(r=>r.join(""));
  /* 늘릴 때는 한 칸이 늘 같은 크기(기기 픽셀 정수배)가 되게 — 칸마다 크기가 달라 눈이 커졌다 작아졌다 하지 않는다. 실제로 쓴 배율을 돌려준다 */
  function blit(img, x, y, k, alpha){
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; if(alpha !== undefined) c.globalAlpha = alpha;
    c.drawImage(img, Math.round(x * Z), Math.round(y * Z), Math.max(1, Math.round(img.width * k * Z)), Math.max(1, Math.round(img.height * k * Z))); c.restore();
    return k;
  }
  const lerp = (a, b, t)=>a + (b - a) * t;
  const ease = t=>t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
  /* 떨어져 툭 튕기는 움직임 */
  const easeBounce = t=>{ t = Math.max(0, Math.min(1, t)); const n = 7.5625, d = 2.75; if(t < 1 / d) return n * t * t; if(t < 2 / d){ t -= 1.5 / d; return n * t * t + .75; } if(t < 2.5 / d){ t -= 2.25 / d; return n * t * t + .9375; } t -= 2.625 / d; return n * t * t + .984375; };

  /* ---------- 3D: 카메라 하나로 땅 · 썰매 자국 · 썰매 · 루돌프 · 고삐 · 나무를 함께 비춘다 ----------
     그래서 썰매 자국 방향 = 달려오는 방향 = 썰매 · 루돌프가 보는 방향이 늘 맞고, 크기도 거리에 따라 자연스럽게 커진다.
     단위는 m. 카메라는 원점, 높이 HC 에서 앞(+Z)을 본다 */
  const HC = 1.9, CAM0 = {f: 120, cx: 10, hz: 112}, CAM = Object.assign({}, CAM0);
  const proj = (X, Y, Z)=>({x: CAM.cx + CAM.f * X / Z, y: CAM.hz + CAM.f * (HC - Y) / Z, s: CAM.f / Z});
  /* 다가가기(클로즈업): 기본 카메라에서 p0 에 보이던 점을 화면 (tx, ty) 에 두고 m 배로 */
  function camZoom(p0, m, tx, ty){ CAM.f = CAM0.f * m; CAM.cx = tx - m * (p0.x - CAM0.cx); CAM.hz = ty - m * (p0.y - CAM0.hz); }
  function camReset(){ Object.assign(CAM, CAM0); }
  const STOP = {x: 1.55, z: 3.2};                                   // 썰매가 서는 자리
  const RECEDE = (()=>{ const l = Math.hypot(1.2, 1); return {x: 1.2 / l, z: 1 / l}; })();   // 멀어지는 쪽(썰매 자국이 뻗는 쪽)
  const HEAD = {x: -RECEDE.x, z: -RECEDE.z};                         // 달려오는 쪽
  const SIDE = {x: HEAD.z, z: -HEAD.x};                              // 썰매의 옆(+ 가 먼 쪽)
  const SPPM = 21.4;                                                  // 도트 한 칸 = 1/21.4 m (멈춘 썰매에서 쥐돌이 한 칸과 같다)
  const cellOf = s=>s / SPPM;      // 한 칸의 크기(연속으로 — 마지막에 도트 격자로 옮기므로 계단처럼 튀지 않는다)
  /* 물체 하나의 자리: 땅 위 점 o 에서 f(앞) · s(옆) · y(위) */
  const frameAt = o=>({w: (f, s, y)=>({X: o.x + f * HEAD.x + s * SIDE.x, Y: y, Z: o.z + f * HEAD.z + s * SIDE.z})});
  /* 화면 → 칸 배열로 그리는 판. 기준점(ax, ay)이 칸 (ox, oy) */
  function board(cs, ax, ay, gw, gh, ox, oy){ return {g: G(gw, gh), cs: cs, ax: ax, ay: ay, ox: ox, oy: oy}; }
  /* 물체가 화면에 차지하는 만큼만(화면 밖은 잘라) 판을 만든다. 칸 격자는 화면 원점에 맞춘다 */
  function bboxBoard(fr, cs, fs, ss, ys){
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    fs.forEach(f=>ss.forEach(s=>ys.forEach(y=>{ const p = P(fr, f, s, y); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); })));
    x0 = Math.max(-2, x0); y0 = Math.max(-2, y0); x1 = Math.min(W + 2, x1); y1 = Math.min(H + 2, y1);
    const ax = Math.floor(x0 / cs) * cs, ay = Math.floor(y0 / cs) * cs;
    const gw = Math.max(1, Math.ceil((x1 - ax) / cs) + 2), gh = Math.max(1, Math.ceil((y1 - ay) / cs) + 2);
    return board(cs, ax, ay, Math.min(gw, 400), Math.min(gh, 500), 0, 0);
  }
  function toCell(B, p){ return [(p.x - B.ax) / B.cs + B.ox, (p.y - B.ay) / B.cs + B.oy]; }
  function P(fr, f, s, y){ const w = fr.w(f, s, y); return proj(w.X, w.Y, w.Z); }
  function sph(B, fr, f, s, y, r, ch, ry){ const p = P(fr, f, s, y), c = toCell(B, p), rr = r * p.s / B.cs; ell(B.g, c[0], c[1], Math.max(.6, rr), Math.max(.6, (ry || r) * p.s / B.cs), ch); }
  function rod(B, fr, a, b, r0, r1, ch){ const n = 14; for(let i = 0; i <= n; i++){ const t = i / n; sph(B, fr, lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(r0, r1, t), ch); } }
  function quad3(B, fr, pts, ch){ poly(B.g, pts.map(q=>toCell(B, P(fr, q[0], q[1], q[2]))), ch); }
  function line3(B, fr, pts, ch){ ln(B.g, pts.map(q=>{ const c = toCell(B, P(fr, q[0], q[1], q[2])); return [c[0] - .5, c[1] - .5]; }), ch); }
  function boardImg(B, pal){ return sheet(toRows(B.g), pal || DP); }
  function boardBlit(B, img){ blit(img, B.ax - B.ox * B.cs, B.ay - B.oy * B.cs, B.cs); }

  /* 사슴의 달리기(갤럽): 뒷다리 먼 쪽 → 가까운 쪽 → 앞다리 먼 쪽 → 가까운 쪽 순서로 디딘다.
     디딜 때(38%)는 다리를 곧게 펴고 앞에서 뒤로 밀고, 들 때는 무릎을 접어 앞으로 가져온다. 가슴 · 엉덩이는 번갈아 오르내린다 */
  const GAIT_OFF = {hindFar: 0, hindNear: .1, frontFar: .32, frontNear: .42};
  function gait(p, off, front){
    const q = ((p - off) % 1 + 1) % 1, ST = .38;
    if(q < ST){ const s = q / ST; return [lerp(24, -26, s), front ? 0 : -14]; }
    const s = (q - ST) / (1 - ST), e = ease(s);
    return [lerp(-26, 24, e), front ? -110 * Math.sin(Math.PI * Math.min(1, s * 1.1)) : -14 - 70 * Math.sin(Math.PI * s)];
  }
  /* ---------- 눈가루: 발굽이 땅을 디딜 때마다 튀고, 달리는 동안 다리 주변에 눈 먼지가 인다 ----------
     땅 위 자리(m)로 두고 카메라로 비춰 그린다. 도트 한두 칸짜리 */
  let DUST = [];
  const LEG_DOWN = {};
  function dustPuff(w, n, spread){
    for(let i = 0; i < n; i++){ const a = Math.random() * Math.PI * 2, sp = (.3 + Math.random() * .7) * spread;
      DUST.push({X: w.X + (Math.random() - .5) * .15, Y: .02, Z: w.Z + (Math.random() - .5) * .15,
        vx: Math.cos(a) * sp * .6 - HEAD.x * .9, vy: 1.1 + Math.random() * 1.6, vz: Math.sin(a) * sp * .6 - HEAD.z * .9, life: 0, max: .45 + Math.random() * .35}); }
  }
  /* 발이 땅에 닿는 순간(디딤이 시작될 때) 한 번 크게, 딛고 있는 동안은 가끔 조금 */
  function hoofDust(fr, ft, key, down){
    const w = fr.w(ft[0], ft[1], 0);
    if(down && !LEG_DOWN[key]){ dustPuff(w, 10, 1.2); addPrint(w); }
    else if(down && Math.random() < .45) dustPuff(w, 2, .7);
    LEG_DOWN[key] = down;
  }
  function drawDust(){
    const h = Math.min(.033, FRAME_DT / 1000);
    DUST.forEach(d=>{ d.life += h; d.X += d.vx * h; d.Z += d.vz * h; d.Y = Math.max(0, d.Y + d.vy * h); d.vy -= 5 * h; d.vx *= .96; d.vz *= .96; });
    DUST = DUST.filter(d=>d.life < d.max && d.Z > .3);
    /* 흰 눈밭 위에서도 보이게: 흰 알갱이 아래 · 오른쪽에 푸른 그늘 점. 가까울수록 크게 */
    DUST.forEach(d=>{ const p = proj(d.X, d.Y, d.Z); const xl = Math.round(p.x / PXW), yl = Math.round(p.y / PXH), t = d.life / d.max;
      const big = p.s > 22 && t < .55 ? (p.s > 50 ? 2 : 1) : 0, hi = t < .6 ? "#FFFFFF" : "#EEF3F7";
      for(let a = 0; a <= big; a++) for(let b = 0; b <= big; b++) lowPx(xl + a, yl + b, hi);
      lowPx(xl + big + 1, yl + big, "#9DB4C9"); lowPx(xl + big, yl + big + 1, "#9DB4C9"); });
  }
  /* 다리 모양: 막대 대신 사슴 다리. 위는 굵고(어깨 · 허벅지) 아래로 가늘어지고, 관절은 볼록, 발굽 위에 밝은 털 띠, 갈라진 발굽 */
  const rad = d=>d * Math.PI / 180;
  const step3 = (a, ang, L)=>[a[0] + Math.sin(rad(ang)) * L, a[1], a[2] - Math.cos(rad(ang)) * L];
  function hoof(B, fr, ft, col){
    sph(B, fr, ft[0] + .01, ft[1], ft[2] + .07, .05, "G", .035);          // 발굽 위 밝은 털 띠
    sph(B, fr, ft[0] + .02, ft[1], ft[2] + .025, .055, "u", .03);        // 발굽
    const c0 = toCell(B, P(fr, ft[0] + .07, ft[1], ft[2] + .02)); put(B.g, c0[0], c0[1], "5");     // 갈라진 틈
  }
  function frontLeg(B, fr, hip, a1, a2, col){
    const knee = step3(hip, a1, .38), ank = step3(knee, a1 + a2, .36), ft = step3(ank, a1 + a2 + (a2 < -30 ? -40 : 18), .1);
    sph(B, fr, hip[0], hip[1], hip[2] + .04, .13, col, .15);              // 어깨 근육
    rod(B, fr, hip, knee, .1, .06, col);
    sph(B, fr, knee[0], knee[1], knee[2], .062, col);                    // 무릎
    rod(B, fr, knee, ank, .048, .04, col);
    rod(B, fr, ank, ft, .042, .04, col);
    hoof(B, fr, ft, col);
    return ft;
  }
  function hindLeg(B, fr, hip, a1, a2, col){
    /* 허벅지(앞으로) → 정강이(뒤로 꺾임) → 뒤꿈치 관절 → 곧은 발등 */
    const stifle = step3(hip, a1 + 18, .34), hock = step3(stifle, a1 + a2 - 30, .34), ft = step3(hock, (a1 + a2) * .4 + 4, .3);
    sph(B, fr, hip[0] - .04, hip[1], hip[2] - .02, .17, col, .19);         // 엉덩이 허벅지 근육
    rod(B, fr, hip, stifle, .14, .08, col);
    rod(B, fr, stifle, hock, .075, .05, col);
    sph(B, fr, hock[0], hock[1], hock[2], .058, col);                     // 뒤꿈치 관절
    rod(B, fr, hock, ft, .045, .04, col);
    hoof(B, fr, ft, col);
    return ft;
  }
  function drawDeer(o, p, moving, bob){
    const fr = frameAt(o), base = P(fr, 0, 0, 0), cs = cellOf(base.s);
    const B = bboxBoard(fr, cs, [-1, 1.25], [-.45, .45], [-.05, 2.35]);
    const TAU = Math.PI * 2;
    const cy = moving ? .045 * Math.cos(TAU * (p - .6)) : 0, ry = moving ? .045 * Math.cos(TAU * (p - .2)) : 0;      // 가슴 · 엉덩이 높이
    const by = cy, hy = cy + (moving ? -.035 * Math.sin(TAU * (p - .45)) : 0);      // 머리는 가슴보다 반 박자 늦게 끄덕
    const legs = far=>{
      const sd = far ? .17 : -.17, col = far ? "t" : "T";
      const Fa = moving ? gait(p, far ? GAIT_OFF.frontFar : GAIT_OFF.frontNear, true) : [far ? 4 : -3, 0];
      const Ha = moving ? gait(p, far ? GAIT_OFF.hindFar : GAIT_OFF.hindNear, false) : [far ? -3 : 5, -2];
      const ff = frontLeg(B, fr, [.42, sd, .92 + cy], Fa[0], Fa[1], col);
      const hf = hindLeg(B, fr, [-.42, sd, .98 + ry], Ha[0], Ha[1], col);
      if(moving){ hoofDust(fr, ff, "f" + far, Fa[0] > 0 && Fa[1] > -5); hoofDust(fr, hf, "h" + far, Ha[0] > 0 && Ha[1] > -20); }
    };
    legs(true);
    rod(B, fr, [-.45, 0, 1.02 + ry], [.42, 0, 1.0 + cy], .27, .33, "T");
    sph(B, fr, -.72, 0, 1.12 + ry + (moving ? .03 * Math.sin(TAU * p) : 0), .07, "G");      // 꼬리도 살짝 흔들
    sph(B, fr, .66, -.02, .92 + cy, .16, "G");
    legs(false);
    rod(B, fr, [.5, 0, 1.12 + cy], [.74, 0, 1.52 + hy], .16, .12, "T");
    sph(B, fr, .8, 0, 1.6 + hy, .18, "T", .16);
    sph(B, fr, .98, 0, 1.53 + hy, .11, "G", .09);
    sph(B, fr, .74, .19, 1.72 + hy, .065, "T", .035); sph(B, fr, .74, -.19, 1.72 + hy, .065, "T", .035);
    shade(B.g, "T", "t", "H"); shade(B.g, "G", "g", "G");
    outline(B.g, "TtHGgu", "5");
    sph(B, fr, 1.08, 0, 1.54 + hy, .05, "8"); { const c = toCell(B, P(fr, 1.1, -.02, 1.57 + hy)); put(B.g, c[0], c[1], "0"); }
    [[-.085, true], [.085, false]].forEach(([s, near])=>{ const c = toCell(B, P(fr, .93, s, 1.67 + hy)); const n = Math.max(1, Math.round(.045 * P(fr, .93, s, 1.67).s / cs));
      for(let i = 0; i < n; i++) for(let j = 0; j < n + (near ? 1 : 0); j++) put(B.g, c[0] + i, c[1] + j, "k"); if(n > 1) put(B.g, c[0], c[1], "h"); });
    [[-1, "A"], [1, "a"]].forEach(([sg, ch])=>{ const s = sg * .07;
      line3(B, fr, [[.78, s, 1.76 + hy], [.74, s + sg * .12, 1.98 + hy], [.66, s + sg * .22, 2.18 + hy]], ch);
      line3(B, fr, [[.75, s + sg * .08, 1.9 + hy], [.86, s + sg * .1, 2.04 + hy]], ch);
      line3(B, fr, [[.7, s + sg * .17, 2.06 + hy], [.66, s + sg * .32, 2.1 + hy]], ch); });
    line3(B, fr, [[.6, -.3, 1.18 + by], [.6, .3, 1.18 + by]], "9");
    sph(B, fr, .78, -.05, 1.0 + by, .04, "R");
    return {B: B, harness: [P(fr, .62, -.24, 1.16 + by), P(fr, .62, .24, 1.16 + by)], nose: P(fr, 1.1, 0, 1.55 + hy)};
  }
  /* ---------- 썰매(쥐돌이가 앉는 안쪽을 사이에 두고 뒤 · 앞 두 판) ---------- */
  const topY = f=>lerp(.82, .62, (f + 1.15) / 2.3);
  function runner(B, fr, s, col){
    line3(B, fr, [[-1.3, s, 0], [1.25, s, 0], [1.42, s, .12], [1.48, s, .34], [1.38, s, .44]], col);
    [-.8, 0, .8].forEach(f=>line3(B, fr, [[f, s, 0], [f, s, .22]], col));
  }
  function drawSleigh(o){
    const fr = frameAt(o), base = P(fr, 0, 0, 0), cs = cellOf(base.s);
    const back = bboxBoard(fr, cs, [-1.35, 1.6], [-.7, .7], [-.05, 1.4]), front = bboxBoard(fr, cs, [-1.35, 1.6], [-.7, .7], [-.05, 1.4]);
    runner(back, fr, .6, "j");
    quad3(back, fr, [[-1.15, -.62, .22], [-1.15, .62, .22], [-1.15, .62, 1.3], [-1.15, -.62, 1.3]], "8");      // 뒤판(바닥부터 등받이까지 막는다)
    line3(back, fr, [[-1.15, -.62, .82], [-1.15, .62, .82]], "9");
    line3(back, fr, [[-1.15, -.62, 1.3], [-1.15, .62, 1.3]], "R");
    quad3(back, fr, [[-1.15, .62, .22], [1.15, .62, .22], [1.15, .62, topY(1.15)], [-1.15, .62, topY(-1.15)]], "2");
    quad3(back, fr, [[-1.1, -.6, .34], [1.1, -.6, .34], [1.1, .6, .34], [-1.1, .6, .34]], "1");
    line3(back, fr, [[-1.15, .62, topY(-1.15)], [1.15, .62, topY(1.15)]], "R");
    /* 쥐돌이가 앉는 자리 그림자(바닥에 닿아 보이게) */
    floorDisk(back, fr, -.12, 0, .35, .55, .42, "X");
    /* 쥐돌이 뒤에 쌓인 선물들(먼 것부터) */
    GIFT_PILE.forEach(b=>drawBox3D(back, fr, b));
    outline(back.g, "8RebBvxEyY0m", "K");
    quad3(front, fr, [[-1.15, -.62, .22], [1.15, -.62, .22], [1.15, -.62, topY(1.15)], [-1.15, -.62, topY(-1.15)]], "8");
    line3(front, fr, [[-1.15, -.62, .62], [1.15, -.62, .5]], "f");
    quad3(front, fr, [[1.15, -.62, .22], [1.15, .62, .22], [1.15, .62, topY(1.15)], [1.15, -.62, topY(1.15)]], "9");
    line3(front, fr, [[-1.15, -.62, topY(-1.15)], [1.15, -.62, topY(1.15)], [1.15, .62, topY(1.15)]], "R");
    line3(front, fr, [[-1.15, -.62, .22], [1.15, -.62, .22]], "9");
    [-.5, .45].forEach(f=>{ const c = toCell(front, P(fr, f, -.62, .42)); [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b])=>put(front.g, c[0] + a, c[1] + b, "R")); });
    const curl = [[1.15, 0, topY(1.15)], [1.3, 0, .92], [1.46, 0, 1.0], [1.52, 0, .86], [1.42, 0, .78]];
    for(let i = 0; i < curl.length - 1; i++) rod(front, fr, curl[i], curl[i + 1], .09, .09, "9");
    for(let i = 0; i < curl.length - 1; i++) rod(front, fr, curl[i], curl[i + 1], .05, .05, "8");
    outline(front.g, "89fR0", "K");
    runner(front, fr, -.6, "q");
    /* 고삐 고리: 앞판 양쪽 위 */
    [-.42, .42].forEach(s=>{ const c0 = toCell(front, P(fr, 1.16, s, topY(1.15) + .04)); ell(front.g, c0[0], c0[1], 1.2, 1.2, "R"); put(front.g, c0[0], c0[1], "j"); });
    /* 쥐돌이를 가리는 선: 가까운 옆판 · 앞판 윗변. 이 선 아래로는 쥐돌이를 그리지 않는다(판자 뒤에 앉아 있다) */
    const rim = [P(fr, -1.15, -.62, topY(-1.15)), P(fr, 1.15, -.62, topY(1.15)), P(fr, 1.15, .62, topY(1.15))];
    return {back: back, front: front, seat: P(fr, -.15, 0, .34), rein: [P(fr, 1.17, -.42, topY(1.15) + .04), P(fr, 1.17, .42, topY(1.15) + .04)], rim: rim, cs: cs};
  }

  Object.assign(DP, {w:"#FCF7F1", c:"#E6D6C2", m:"#FFFFFF", O:"#B49A80", n:"#78543A", P:"#F5BEAC", s:"#F4F8FB"});
  Object.assign(DP, {K:"#2A1C14", X:"#2E0A0E", b:"#5AA0E0", B:"#3E78B0", v:"#8CC0EC", x:"#5FB86A", e:"#2F6B4F", E:"#3E8E52", y:"#F7D77A", Y:"#C99A2E"});
  function floorDisk(B, fr, f, s, y, rf, rs, ch){ const pts = []; for(let i = 0; i < 18; i++){ const a = i / 18 * Math.PI * 2; pts.push([f + Math.cos(a) * rf, s + Math.sin(a) * rs, y]); } quad3(B, fr, pts, ch); }
  /* 상자 하나: 바닥 가운데 (f, s, y), 크기 (lf, ls, lh), 색 [앞 · 옆 · 위 · 끈] */
  function drawBox3D(B, fr, b){
    const [f, s, y] = b.at, [lf, ls, lh] = b.size, [cf, cside, ctop, rib] = b.col;
    const f0 = f - lf / 2, f1 = f + lf / 2, s0 = s - ls / 2, s1 = s + ls / 2, y1 = y + lh, w = .035;
    quad3(B, fr, [[f1, s0, y], [f1, s1, y], [f1, s1, y1], [f1, s0, y1]], cf);
    quad3(B, fr, [[f0, s0, y], [f1, s0, y], [f1, s0, y1], [f0, s0, y1]], cside);
    quad3(B, fr, [[f0, s0, y1], [f1, s0, y1], [f1, s1, y1], [f0, s1, y1]], ctop);
    quad3(B, fr, [[f1, s - w, y], [f1, s + w, y], [f1, s + w, y1], [f1, s - w, y1]], rib);
    quad3(B, fr, [[f - w, s0, y], [f + w, s0, y], [f + w, s0, y1], [f - w, s0, y1]], rib);
    quad3(B, fr, [[f0, s - w, y1], [f1, s - w, y1], [f1, s + w, y1], [f0, s + w, y1]], rib);
    quad3(B, fr, [[f - w, s0, y1], [f + w, s0, y1], [f + w, s1, y1], [f - w, s1, y1]], rib);
    sph(B, fr, f, s, y1 + .04, .05, rib, .035);
  }
  /* 쌓인 선물: 먼 것(뒤 · 먼 옆)부터 그린다 */
  const GIFT_PILE = [
    {at: [-.88, -.36, .34], size: [.42, .44, .44], col: ["E", "e", "x", "8"]},
    {at: [-.9, -.36, .78], size: [.34, .36, .32], col: ["b", "B", "v", "R"]},
    {at: [-.92, -.34, 1.1], size: [.24, .26, .22], col: ["R", "Y", "y", "8"]},
    {at: [-.55, -.48, .34], size: [.3, .26, .34], col: ["8", "9", "0", "m"]},
    {at: [-.9, .36, .34], size: [.38, .4, .4], col: ["8", "9", "0", "R"]},
    {at: [-.92, .34, .74], size: [.28, .3, .26], col: ["E", "e", "x", "m"]},
    {at: [-.55, .48, .34], size: [.26, .24, .28], col: ["b", "B", "v", "y"]}
  ].sort((a, b)=>(a.at[0] - b.at[0]) || (b.at[1] - a.at[1]));
  /* 선물 상자: 가로 · 세로 · 높이 0.42 m, 빨간 상자에 금색 끈과 리본. lid 이면 뚜껑만 */
  function drawGift3D(B, fr, g, part){
    const h = .21 * (g[3] || 1), [cf, cs0, cy] = g, f0 = cf - h, f1 = cf + h, s0 = cs0 - h, s1 = cs0 + h, yb = cy - h, yt = cy + h, yl = yt - .08;
    const box = (ya, yb2, front, side, top)=>{
      quad3(B, fr, [[f1, s0, ya], [f1, s1, ya], [f1, s1, yb2], [f1, s0, yb2]], front);
      quad3(B, fr, [[f0, s0, ya], [f1, s0, ya], [f1, s0, yb2], [f0, s0, yb2]], side);
      if(top) quad3(B, fr, [[f0, s0, yb2], [f1, s0, yb2], [f1, s1, yb2], [f0, s1, yb2]], top);
    };
    if(part !== "lid"){
      box(yb, yl, "8", "9", part === "open" ? "1" : null);
      if(part === "open"){ quad3(B, fr, [[f0 + .03, s0 + .03, yl], [f1 - .03, s0 + .03, yl], [f1 - .03, s1 - .03, yl], [f0 + .03, s1 - .03, yl]], "2");
        /* 안에 소복이 담긴 치즈 */
        sph(B, fr, cf, cs0, yl - .01, h * .8, "Y", h * .32); sph(B, fr, cf - .02, cs0 + .02, yl + .01, h * .65, "y", h * .25);
        [[.05, -.06], [-.07, .05], [.02, .08], [-.04, -.09]].forEach(([a, b])=>{ const c0 = toCell(B, P(fr, cf + a, cs0 + b, yl + .02)); put(B.g, c0[0], c0[1], "q"); }); }
      quad3(B, fr, [[f1, cs0 - .035, yb], [f1, cs0 + .035, yb], [f1, cs0 + .035, yl], [f1, cs0 - .035, yl]], "R");
      quad3(B, fr, [[cf - .035, s0, yb], [cf + .035, s0, yb], [cf + .035, s0, yl], [cf - .035, s0, yl]], "q");
    }
    if(part !== "open"){
      const o = .025;
      const lb = yl, lt = yt;
      quad3(B, fr, [[f1 + o, s0 - o, lb], [f1 + o, s1 + o, lb], [f1 + o, s1 + o, lt], [f1 + o, s0 - o, lt]], "0");
      quad3(B, fr, [[f0 - o, s0 - o, lb], [f1 + o, s0 - o, lb], [f1 + o, s0 - o, lt], [f0 - o, s0 - o, lt]], "8");
      quad3(B, fr, [[f0 - o, s0 - o, lt], [f1 + o, s0 - o, lt], [f1 + o, s1 + o, lt], [f0 - o, s1 + o, lt]], "f");
      quad3(B, fr, [[f0 - o, cs0 - .035, lt], [f1 + o, cs0 - .035, lt], [f1 + o, cs0 + .035, lt], [f0 - o, cs0 + .035, lt]], "R");
      quad3(B, fr, [[cf - .035, s0 - o, lt], [cf + .035, s0 - o, lt], [cf + .035, s1 + o, lt], [cf - .035, s1 + o, lt]], "R");
      quad3(B, fr, [[f1 + o, cs0 - .035, lb], [f1 + o, cs0 + .035, lb], [f1 + o, cs0 + .035, lt], [f1 + o, cs0 - .035, lt]], "R");
      sph(B, fr, cf + .02, cs0 - .08, lt + .06, .07, "R", .05); sph(B, fr, cf - .02, cs0 + .08, lt + .06, .07, "R", .05);
      sph(B, fr, cf + .01, cs0 - .08, lt + .06, .03, "q", .025); sph(B, fr, cf - .03, cs0 + .08, lt + .06, .03, "q", .025);
      sph(B, fr, cf, cs0, lt + .04, .035, "q");
    }
  }

  /* ---------- 쥐돌이: 앱 그림 그대로, 얼굴만 왼쪽 아래(루돌프가 보는 쪽)로 살짝 돌린다 ----------
     두 눈 · 코를 왼쪽으로 옮기고, 먼 쪽(오른쪽) 눈은 한 칸 좁게. 목도리 매듭도 같이 옮긴다. 입은 원래대로 명암만 */
  const MOUSE_HAPPY_ROWS = SP.happyGift;
  function turnMouse(rows, face){
    const g = rows.map(r=>r.split("")), stamp = (y, x, str)=>{ for(let i = 0; i < str.length; i++) g[y][x + i] = str[i]; };
    for(let y = 9; y <= 16; y++) for(let x = 6; x <= 21; x++) if(g[y][x] !== "." && x >= 6 && x <= 19) g[y][x] = (x === 6 || x === 7) && "oc".indexOf(rows[y][x]) >= 0 ? rows[y][x] : "w";
    /* 얼굴(눈 · 코)은 모양 · 간격을 그대로 두고 통째로 2칸 왼쪽으로(눈을 좁히거나 눈동자를 옮기면 사시처럼 보인다) */
    const src0 = face === "happy" ? MOUSE_HAPPY_ROWS : rows;
    for(let y = 9; y <= 16; y++) for(let x = 8; x <= 19; x++){ const ch = src0[y][x]; if("ohkndp".indexOf(ch) >= 0 && !(ch === "o" && (x < 8 || x > 19))) g[y][x - 2] = ch; }
    if(face === "happy"){ g[13][4] = "p"; g[13][5] = "p"; g[14][5] = "d"; g[13][19] = "p"; g[13][20] = "p"; g[14][19] = "d"; }
    /* 목도리 매듭 · 늘어진 끝을 3칸 왼쪽으로 */
    /* 목도리도 얼굴처럼 왼쪽으로 돌린다: 줄무늬 · 매듭을 앞(왼쪽)으로, 먼 쪽(오른쪽)으로 감기는 부분은 그늘(진한 빨강) */
    for(let y = 23; y <= 27; y++) for(let x = 9; x <= 21; x++) if("89h".indexOf(g[y][x]) >= 0 && "89h".indexOf(rows[y][x]) >= 0) g[y][x] = "w";
    stamp(20, 4, "98888888888888889999");
    stamp(21, 4, "8hh88hh88hh88hh89999");
    stamp(22, 4, "999999" + "9888" + "8999999999");
    stamp(23, 9, "98hh89"); stamp(24, 9, "988889"); stamp(25, 8, "98hh89"); stamp(26, 8, "988889");
    stamp(27, 8, "h.h.h".replace(/\./g, "w"));
    /* 옆구리 앞발은 지운다(이 장면에서는 팔을 따로 그려 고삐 · 선물을 잡는다) */
    for(let y = 26; y <= 31; y++) for(let x = 0; x < 28; x++) if((x < 7 || x > 20) && "pd".indexOf(g[y][x]) >= 0) g[y][x] = "w";
    for(let y = 36; y < g.length; y++) for(let x = 0; x < 28; x++) if("pd".indexOf(g[y][x]) >= 0) g[y][x] = "c";      // 발은 썰매 안이라 안 보인다
    /* 돌아선 만큼 오른쪽(먼 쪽)은 그늘: 흰 털 가장자리 한 칸, 바깥 테두리만 살짝 진하게(눈 둘레는 그대로) */
    const src = g.map(r=>r.slice());
    for(let y = 0; y < g.length; y++) for(let x = 0; x < g[0].length; x++){
      if(src[y][x] === "o" && [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy])=>{ const r = src[y + dy]; return !r || r[x + dx] === undefined || r[x + dx] === "."; })) g[y][x] = "O";
    }
    return g.map(r=>r.join(""));
  }
  /* 다가갈수록 도트를 잘게: 도트 그림을 두 배로 늘리는 Scale2x(모서리는 둥글게, 색은 그대로) */
  function scale2x(rows){
    const h = rows.length, w = rows[0].length, at = (x, y)=>(y < 0 || y >= h || x < 0 || x >= w) ? "." : rows[y][x], out = [];
    for(let y = 0; y < h; y++){ let a = "", b = "";
      for(let x = 0; x < w; x++){ const E = at(x, y), B = at(x, y - 1), D = at(x - 1, y), F = at(x + 1, y), H = at(x, y + 1);
        const ok = B !== H && D !== F;
        a += (ok && D === B ? D : E) + (ok && B === F ? F : E); b += (ok && D === H ? D : E) + (ok && H === F ? F : E); }
      out.push(a, b); }
    return out;
  }
  MP.O = "#B09780";
  /* 쥐돌이 앞발: 앱 그림 옆구리 앞발과 같은 모양(분홍 2칸 × 3 + 아래 진한 1칸, 둘레는 쥐돌이 테두리 색) */
  const PAW_ROWS = [".oo.", "oppo", "oppo", "oppo", "oddo", ".oo."];
  const PAWS = {};
  function pawSprite(n){ if(PAWS[n]) return PAWS[n]; let r = PAW_ROWS; for(let i = 0; i < n; i++) r = scale2x(r); return (PAWS[n] = sheet(r, MP)); }
  const MOUSE_FACES = {};
  function mouseSprite(face, n){
    const key = face + n; if(MOUSE_FACES[key]) return MOUSE_FACES[key];
    let rows = turnMouse(face === "blink" ? SP.blink : SP.stand, face);
    for(let i = 0; i < n; i++) rows = scale2x(rows);
    return (MOUSE_FACES[key] = sheet(rows, MP));
  }

  const pathAt = d=>({x: STOP.x + RECEDE.x * d, z: STOP.z + RECEDE.z * d});
  /* 나무는 썰매 길 양옆에(길 위에는 없다). [길 따라 거리, 옆 거리, 키] */
  /* ---------- 나무 여러 가지: 키 큰 전나무 · 통통한 전나무 · 눈 덮인 전나무 · 동그란 소나무 · 덤불 · 잎 없는 겨울나무 ----------
     모양마다 칸 배열을 따로 만들고, 색 · 눈 양도 조금씩 다르게. 빛은 왼쪽 위(달)라 오른쪽이 어둡다 */
  const TREE_PALS = [
    {a:"#1F4A38", b:"#2F6B4F", c:"#3E8E52", s:"#F4F8FB", S:"#C9D8E5", t:"#5E3A24", T:"#3E2416"},
    {a:"#24503A", b:"#356F4A", c:"#4E9A5C", s:"#F4F8FB", S:"#C9D8E5", t:"#6A4428", T:"#46291A"},
    {a:"#1B4034", b:"#285E4A", c:"#357A5C", s:"#EEF4F8", S:"#BFD0DF", t:"#5A3822", T:"#3A2214"}
  ];
  function shadeHalf(g, cx){ for(let y = 0; y < g.length; y++) for(let x = 0; x < g[0].length; x++){ if(g[y][x] === "b" && x > cx + .5) g[y][x] = "a"; else if(g[y][x] === "b" && x < cx - 1.5 && (x + y) % 3 === 0) g[y][x] = "c"; } }
  function snowCaps(g, amount){      // 각 층 윗면에 눈(원래 모양을 보고 정한다 — 칠한 눈이 아래로 번지지 않게)
    const src = g.map(r=>r.slice()), leaf = (x, y)=>y >= 0 && y < src.length && "abc".indexOf(src[y][x]) >= 0;
    for(let y = 0; y < src.length; y++) for(let x = 0; x < src[0].length; x++){
      if(!leaf(x, y) || leaf(x, y - 1)) continue;
      g[y][x] = "s";
      if(amount > 1 && leaf(x, y + 1) && (x % 2 === 0 || amount > 2)) g[y + 1][x] = x > src[0].length / 2 ? "S" : "s";
    }
  }
  function fir(w, layers, half0, grow, snow){
    const H = layers * 4 + 6, g = G(w, H), cx = (w - 1) / 2;
    for(let i = 0; i < layers; i++){ const top = 1 + i * 3.6, base = top + 5.2, half = half0 + i * grow; poly(g, [[cx + .5, top], [cx + half + 1, base], [cx - half, base]], "b"); }
    shadeHalf(g, cx); snowCaps(g, snow);
    poly(g, [[cx - .5, H - 4], [cx + 1.5, H - 4], [cx + 1.5, H], [cx - .5, H]], "t"); put(g, cx + 1, H - 2, "T");
    return g;
  }
  function roundPine(w, h, snow){
    const g = G(w, h), cx = (w - 1) / 2;
    /* 둥근 뭉치 셋을 위로 갈수록 작게 쌓는다 */
    ell(g, cx + .5, h * .6, w * .46, h * .17, "b"); ell(g, cx + .5, h * .42, w * .36, h * .15, "b"); ell(g, cx + .5, h * .25, w * .24, h * .12, "b"); ell(g, cx + .5, h * .12, w * .12, h * .08, "b");
    shadeHalf(g, cx); snowCaps(g, snow);
    poly(g, [[cx - .5, h * .66], [cx + 1.5, h * .66], [cx + 1.5, h], [cx - .5, h]], "t");
    return g;
  }
  function bush(w, h){ const g = G(w, h), cx = (w - 1) / 2; ell(g, cx + .5, h * .62, w * .48, h * .42, "b"); ell(g, cx - w * .18, h * .7, w * .3, h * .3, "b"); shadeHalf(g, cx); snowCaps(g, 3); return g; }
  function bareTree(w, h){
    const g = G(w, h), cx = Math.floor(w / 2);
    ln(g, [[cx, h - 1], [cx, h * .2]], "t"); ln(g, [[cx + 1, h - 1], [cx + 1, h * .35]], "T");
    [[.35, -1, .25], [.5, 1, .3], [.62, -1, .38], [.25, 1, .18], [.75, 1, .45]].forEach(([y, dir, len])=>{ const y0 = h * y, x1 = cx + dir * w * len, y1 = y0 - h * .14;
      ln(g, [[cx, y0], [x1, y1]], "t"); ln(g, [[x1, y1], [x1 + dir * 2, y1 - 3]], "t"); put(g, x1, y1 - 1, "s"); put(g, x1 - dir, y1 - 1, "s"); });
    put(g, cx, h * .2 - 1, "s"); return g;
  }
  const TREE_KINDS = [
    {g: fir(13, 5, 1.6, 1.15, 1), h: 25}, {g: fir(17, 4, 2.2, 1.8, 2), h: 22}, {g: fir(11, 6, 1.2, .8, 1), h: 30},
    {g: fir(15, 4, 1.8, 1.5, 3), h: 21}, {g: roundPine(17, 20, 2), h: 20}, {g: roundPine(13, 18, 1), h: 18},
    {g: bush(13, 8), h: 8}, {g: bush(9, 6), h: 6}, {g: bareTree(15, 22), h: 22}
  ];
  const TREE_IMGS = TREE_KINDS.map((t, i)=>TREE_PALS.map(pal=>sheet(toRows(t.g), pal)));
  /* 자리: 늘 같은 배치(씨앗이 있는 난수). 썰매 길 양옆 2.6 m 안에는 두지 않는다 */
  function seeded(a){ return ()=>{ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const TREES = (()=>{ const r = seeded(1225), out = [];
    for(let i = 0; i < 34; i++){ const d = 1.5 + r() * 30, side = (r() < .5 ? -1 : 1) * (2.8 + Math.pow(r(), 1.4) * 11);
      /* 전나무가 많고, 소나무 · 덤불 · 겨울나무는 가끔 */
      const kind = [0, 0, 1, 2, 2, 3, 3, 4, 5, 6, 7, 8, 1, 0][Math.floor(r() * 14)], meters = TREE_KINDS[kind].h > 12 ? 2.2 + r() * 2.2 : .8 + r() * .6;
      out.push({d: d, side: side, kind: kind, pal: Math.floor(r() * 3), m: meters}); }
    /* 지평선 숲: 멀리 촘촘한 전나무 줄 */
    for(let i = 0; i < 26; i++) out.push({d: 34 + r() * 8, side: -26 + i * 2 + r() * 1.5, kind: [0, 2, 1, 4][i % 4], pal: i % 3, m: 3 + r() * 2.5});
    return out; })();
  function treeList(){ return TREES.map(t=>{ const p = pathAt(t.d); return {X: p.x + SIDE.x * t.side, Z: p.z + SIDE.z * t.side, t: t}; }).filter(o=>o.Z > 1); }
  function drawTree(o){ const img = TREE_IMGS[o.t.kind][o.t.pal], b = proj(o.X, 0, o.Z), k = b.s * o.t.m / img.height;
    if(b.x + img.width * k / 2 < -5 || b.x - img.width * k / 2 > W + 5) return;
    blit(img, b.x - img.width / 2 * k, b.y - img.height * k, k); }
  /* ---------- 눈밭: 도트 한 칸마다 땅 위 자리(X, Z)를 거꾸로 구해 원근대로 칠한다 ----------
     멀수록 푸른 회색, 가까울수록 흰색(색이 바뀌는 곳은 4×4 점 섞기), 바람에 쌓인 눈 둔덕(밝은 면 · 오른쪽 아래 그늘), 반짝이는 눈 결정 */
  const SNOW_PAL = [[0x9F, 0xB2, 0xC2], [0xB6, 0xC7, 0xD6], [0xC9, 0xD8, 0xE5], [0xDC, 0xE6, 0xEE], [0xEC, 0xF2, 0xF7]];
  const SNOW_SHADE = [0xA8, 0xBC, 0xCF], SNOW_SPARK = [0xFF, 0xFF, 0xFF];
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const hash2 = (i, j)=>{ const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };
  function vnoise(x, y){ const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(hash2(i, j), hash2(i + 1, j), ux), lerp(hash2(i, j + 1), hash2(i + 1, j + 1), ux), uy); }
  const fieldC = document.createElement("canvas"); fieldC.width = LOW_W; fieldC.height = LOW_H;
  const fieldX = fieldC.getContext("2d"), fieldImg = fieldX.createImageData(LOW_W, LOW_H);
  let fieldKey = "";
  function drawSnowField(T){
    const key = [CAM.f, CAM.cx, CAM.hz, Math.floor(T / 220)].map(v=>Math.round(v * 100)).join(",");
    if(key !== fieldKey){
      fieldKey = key; const d = fieldImg.data; d.fill(0);
      const tw = Math.floor(T / 220);
      for(let yl = 0; yl < LOW_H; yl++){
        const yv = (yl + .5) * PXH; if(yv <= CAM.hz + .5) continue;
        const Zz = CAM.f * HC / (yv - CAM.hz);
        for(let xl = 0; xl < LOW_W; xl++){
          const X = ((xl + .5) * PXW - CAM.cx) * Zz / CAM.f, o = (yl * LOW_W + xl) * 4;
          const far = Math.min(1, Math.max(0, (Zz - 2) / 26));
          let lv = (1 - far) * 3.2 + BAYER[(yl & 3) * 4 + (xl & 3)] / 16 - .5;
          const n = vnoise(X * .9, Zz * .9);
          let col;
          if(n > .6){ lv += 1; if(n - vnoise(X * .9 + .35, Zz * .9 - .35) > .06 && Zz < 18) col = SNOW_SHADE; }      // 둔덕: 밝게, 오른쪽 아래 비탈은 그늘
          if(!col) col = SNOW_PAL[Math.max(0, Math.min(4, Math.floor(lv)))];
          const h = hash2(Math.floor(X * 5), Math.floor(Zz * 5));
          if(h > .985 && Zz < 14 && (Math.floor(h * 1000) + tw) % 6 === 0) col = SNOW_SPARK;      // 반짝
          d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
        }
      }
      fieldX.putImageData(fieldImg, 0, 0);
    }
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.drawImage(fieldC, 0, 0, W * Z, H * Z); c.restore();
  }
  /* ---------- 하늘: 둥근 달 + 두 겹 달무리(점 섞기) + 가끔 지나가는 별똥별. 모두 도트 한 칸 단위 ---------- */
  const MOON = {x: 30, y: 30, r: 7};
  /* 하늘도 같은 카메라로: 기본 카메라에서 보이던 자리를 지금 카메라(쥐돌이 · 선물로 다가가는 줌)로 옮긴다.
     그래서 다가갈수록 달 · 별 · 산등성이도 함께 커지며 화면 밖으로 밀려난다. 낮은 격자 칸 단위 */
  const skyM = ()=>1 + (CAM.f / CAM0.f - 1) * .4;      // 먼 하늘은 땅보다 덜 커진다(땅이 두 배일 때 하늘은 1.4배)
  const skyFade = ()=>Math.min(1, Math.max(0, (CAM.f / CAM0.f - 1) / 1.1));      // 다가갈수록 밤하늘 색으로 옅어진다
  function skyMix(hex, f){ const a = parseInt(hex.slice(1), 16), b = 0x13261F, ch = s=>Math.round(((a >> s) & 255) * (1 - f) + ((b >> s) & 255) * f); return "#" + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0"); }
  function skyAt(xl, yl){ const m = skyM(), x = (xl + .5) * PXW, y = (yl + .5) * PXH; return [Math.round((CAM.cx + m * (x - CAM0.cx)) / PXW - .5), Math.round((CAM.hz + m * (y - CAM0.hz)) / PXH - .5)]; }
  function skyFx(T){
    const m = skyM(), [mx, my] = skyAt(MOON.x, MOON.y), r = MOON.r * m, R = Math.ceil(r + 9 * m), fd = skyFade();
    const col = h=>fd ? skyMix(h, fd) : h, halo = h=>fd ? skyMix(h, Math.min(1, fd * 1.8)) : h;
    if(fd < 1 && mx + R >= 0 && my + R >= 0 && mx - R < LOW_W && my - R < LOW_H){
      for(let y = -R; y <= R; y++) for(let x = -R; x <= R; x++){
        const d = Math.hypot(x, y);
        if(d > r + 1.5 * m && d <= r + 4.5 * m && (x + y) % 2 === 0) lowPx(mx + x, my + y, halo("#2C4A40"));          // 안쪽 달무리
        else if(d > r + 4.5 * m && d <= r + 8.5 * m && (x + 2 * y) % 4 === 0) lowPx(mx + x, my + y, halo("#22392F"));  // 바깥 달무리
      }
      const rr = Math.ceil(r);
      for(let y = -rr; y <= rr; y++) for(let x = -rr; x <= rr; x++){
        const d = Math.hypot(x + .5, y + .5); if(d > r) continue;
        const lit = Math.hypot(x + 2.5 * m, y + 2.5 * m) < r * .75;
        lowPx(mx + x, my + y, col(d > r - m ? "#E9D8A6" : lit ? "#FFF6D6" : "#F6E6B4"));
      }
      [[2, -2, 2], [-3, 2, 1], [1, 3, 1]].forEach(([x, y, n])=>{ for(let k = 0; k < Math.round(n * m); k++) lowPx(mx + Math.round(x * m) + k, my + Math.round(y * m), col("#E2CF98")); });   // 달 무늬
    }
    /* 별똥별: 3.6초마다 한 번, 오른쪽 위에서 왼쪽 아래로 0.6초. 머리는 밝고 꼬리는 점점 어둡게 */
    const per = 3600, ph = (T % per) / 600, n = Math.floor(T / per);
    if(ph < 1){ const sx = 110 + (n * 37) % 40, sy = 8 + (n * 23) % 30, hx = sx - ph * 46, hy = sy + ph * 22;
      ["#FFFFFF", "#FFFFFF", "#FFF3C4", "#E3ECF3", "#C9D8E6", "#AFC3D5", "#8FA9BF", "#7590A6", "#5E7D93", "#4A6A6A", "#3E5A50", "#2C4A40"].forEach((col, k)=>{ if(ph * 46 - k * 2 < 0) return;
        const [x0, y0] = skyAt(hx + k * 2, hy - k); lowPx(x0, y0, col); lowPx(x0 + 1, y0, col); });
      const [hx0, hy0] = skyAt(hx, hy); lowPx(hx0, hy0 + 1, "#C9D8E6"); lowPx(hx0 - 1, hy0, "#C9D8E6"); }
  }

  function world(T, distNow){
    L(); c.fillStyle = "#0B1714"; c.fillRect(0, 0, W, H);
    c.fillStyle = "#13261F"; c.fillRect(0, 0, W, CAM.hz);
    skyFx(T);
    [[62,12],[84,28],[114,10],[132,40],[48,52],[100,60],[36,72],[144,20],[20,30],[76,84]].forEach(([x, y], k)=>{ if((Math.floor(T / 400) + k) % 4){ const q = skyAt(x, y); lowPx(q[0], q[1], skyMix("#E9DCC0", skyFade() * .8)); } });
    /* 먼 산등성이도 카메라를 따라 커진다 */
    c.fillStyle = "#1E3B33"; { const m = skyM(); for(let x = 0; x < W; x++){ const xb = CAM0.cx + (x - CAM.cx) / m, h = (4 + Math.round(3 * Math.sin(xb / 13) + 2 * Math.sin(xb / 5.3))) * m; c.fillRect(x, CAM.hz - h, 1, h); } }
    drawSnowField(T);
    /* 썰매 자국: 썰매가 지나온 길(지금 자리 → 멀리)에 날 두 줄 */
    c.fillStyle = "#98AFC4";
    for(let d = distNow + 1.2; d < 40; d += 0.04){ const o = pathAt(d); [.6, -.6].forEach(s=>{ const p = proj(o.x + SIDE.x * s, 0, o.z + SIDE.z * s); if(p.y > CAM.hz) c.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, Math.round(p.s * .1)), Math.max(1, Math.round(p.s * .03))); }); }
    drawPrints();
  }
  /* ---------- 루돌프 발자국: 발굽이 디딘 자리마다 남는다(두 쪽으로 갈라진 순록 발굽). 처음부터 멀리서 달려온 자국도 깔아 둔다 ---------- */
  let PRINTS = [];
  function seedPrints(){
    PRINTS = []; const r = seeded(77);
    for(let d = D0 + DEER_AHEAD * 0 + .6; d < 40; d += .62){ const o = pathAt(d - DEER_AHEAD);
      [-.17, .17].forEach((s1, i)=>{ const j = (r() - .5) * .08, f = (i ? .18 : 0) + (r() - .5) * .1; PRINTS.push({X: o.x + SIDE.x * (s1 + j) - HEAD.x * f, Z: o.z + SIDE.z * (s1 + j) - HEAD.z * f}); }); }
  }
  function addPrint(w){ PRINTS.push({X: w.X, Z: w.Z}); if(PRINTS.length > 400) PRINTS.shift(); }
  function drawPrints(){
    PRINTS.forEach(pr=>{ const p = proj(pr.X, 0, pr.Z); if(p.y <= CAM.hz + 1 || p.x < -4 || p.x > W + 4) return;
      const xl = Math.round(p.x / PXW), yl = Math.round(p.y / PXH);
      if(p.s < 12){ lowPx(xl, yl, "#93AAC0"); return; }
      if(p.s < 26){ lowPx(xl, yl, "#7D96AD"); lowPx(xl + 1, yl, "#93AAC0"); lowPx(xl, yl - 1, "#F4F8FB"); return; }
      const big = p.s > 70 ? 1 : 0;
      for(let a = 0; a <= big; a++){ lowPx(xl - 1 - big + a, yl, "#7D96AD"); lowPx(xl + 1 + a, yl, "#7D96AD"); if(big){ lowPx(xl - 1 - big + a, yl + 1, "#9DB4C9"); lowPx(xl + 1 + a, yl + 1, "#9DB4C9"); } }
      lowPx(xl, yl - 1, "#F4F8FB");      // 자국 가장자리에 밀려 올라온 눈
    });
  }
  function groundShadow(o, rf, rs){ L(); c.fillStyle = "rgba(60,80,100,.14)"; const pts = []; for(let i = 0; i < 20; i++){ const a = i / 20 * Math.PI * 2, f = Math.cos(a) * rf, s = Math.sin(a) * rs; const p = proj(o.x + f * HEAD.x + s * SIDE.x, 0, o.z + f * HEAD.z + s * SIDE.z); pts.push(p); } c.beginPath(); pts.forEach((p, i)=>i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath(); c.fill(); }
  /* 달려오기: 일정한 빠르기로 오다가(먼 데서는 천천히 커지고 가까울수록 빨리 커진다) 마지막에 미끄러져 선다 */
  const D0 = 10.5, D1 = 2.4, T1 = 3800, T2 = 2100, DEER_AHEAD = 3.0;      // 루돌프가 처음부터 꽤 가까이에서 달려온다
  function distAt(t){ if(t < T1) return lerp(D0, D1, t / T1); const p = Math.min(1, (t - T1) / T2); return D1 * Math.pow(1 - p, 2); }
  const APPROACH = [0, 2000, 3800, T1 + T2];
  function rimClip(sl, sb){
    c.setTransform(1, 0, 0, 1, 0, 0); c.beginPath();
    /* 판자 윗변을 왼쪽 → 오른쪽 순서로 잇고 그 위만 남긴다 */
    const rim = sl.rim.map(p=>({x: p.x * Z, y: (p.y + sb) * Z})).sort((p, q)=>p.x - q.x), lft = rim[0], rgt = rim[rim.length - 1];
    c.moveTo(-10, lft.y); rim.forEach(p=>c.lineTo(p.x, p.y)); c.lineTo(W * Z + 10, rgt.y); c.lineTo(W * Z + 10, -10); c.lineTo(-10, -10); c.closePath(); c.clip();
  }
  function drawGroup(dist, legP, moving, T, st){
    st = st || {};
    const so = pathAt(dist), dO = pathAt(dist - DEER_AHEAD);
    const bob = moving ? Math.sin(legP * 2 * Math.PI) * .04 : 0;
    const things = [];
    if(!st.only) treeList().forEach(t=>things.push({z: t.Z, draw: ()=>drawTree(t)}));
    things.push({z: so.z, draw: ()=>{
      groundShadow(so, 1.3, .7);
      const sl = drawSleigh(so), sb = moving && Math.floor(T / 160) % 2 ? -sl.cs : 0;
      sl.back.ay += sb; sl.front.ay += sb;
      boardBlit(sl.back, boardImg(sl.back));
      const fr = frameAt(so), mk = ()=>{ const b = bboxBoard(fr, sl.cs, [-1.2, 1.2], [-.95, .95], [-.05, 3.4]); b.ay += sb; return b; };
      /* 쥐돌이 · (꺼내는 중인) 선물은 판자 윗변 위만 보인다 */
      c.save(); rimClip(sl, sb);
      /* 쥐돌이(도트 그림): 허리(30행)를 자리 높이에. 선물을 보여 줄 때는 살짝 일어선다(stand). 다가간 만큼 Scale2x 로 잘게 */
      const n = 0, up = 1, seatY = SEAT0 + (st.stand || 0) * STAND_UP - (st.dip || 0) + (st.hop || 0);
      const seat = P(fr, -.12, 0, seatY), k = seat.s / SPPM;
      const mx = seat.x - 14 * up * k, my = seat.y + sb - 30 * up * k;
      blit(mouseSprite(st.happy ? "happy" : st.blink ? "blink" : "open", n), mx, my, k);
      /* 앞발(팔은 없다): 달릴 때는 목도리 앞에서 고삐를, 선물을 들면 상자 양옆을 잡는다 */
      const paw = (x, y)=>blit(pawSprite(n), x - 2 * up * k, y - 3 * up * k, k);
      /* 고리 → 앞발 고삐. 쥐고 있을 때는 팽팽하게 곧고, 놓으면 끝이 떨어져 앞판 안쪽에 툭 걸리며(살짝 튕김) 끈이 처진다 */
      const drawSlackReins = (hs, rl)=>{
        const base = P(fr, 0, 0, 0), bx = base.x, by = base.y + sb, u = base.s;      // 화면 좌표와 썰매 단위(1 m)를 오간다
        const toU = p=>({x: (p.x - bx) / u, y: (p.y - by) / u});
        const rings = sl.rein.slice().sort((p, q)=>p.x - q.x).map(toU);
        const rim = sl.rim.map(p=>({x: p.x, y: p.y + sb})).map(toU).sort((p, q)=>p.x - q.x);
        /* 바닥: 판자 윗변 안쪽으로 조금 내려간 곳(썰매 바닥), 썰매 밖은 땅 */
        const floorAt = x=>{ if(x < rim[0].x || x > rim[rim.length - 1].x) return 0;
          for(let j = 0; j < rim.length - 1; j++) if(x >= rim[j].x && x <= rim[j + 1].x){ const t = (x - rim[j].x) / ((rim[j + 1].x - rim[j].x) || 1); return lerp(rim[j].y, rim[j + 1].y, t) + .3; }
          return 0; };
        const paws = hs ? hs.map(toU) : rings;
        L();
        rings.forEach((rg, i)=>{
          const pts = ropeUpdate(i, rg, paws[i], hs && rl <= 0, floorAt), w = Math.max(2, Math.round(u * .03));
          for(let j = 0; j < pts.length - 1; j++){ const a = pts[j], b = pts[j + 1], n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * u * 2));
            for(let q = 0; q <= n; q++){ const t = q / n, x = Math.round(bx + lerp(a.x, b.x, t) * u - w / 2), y = Math.round(by + lerp(a.y, b.y, t) * u - w / 2);
              c.fillStyle = "#5A1016"; c.fillRect(x, y + w, w, 1); c.fillStyle = "#B8302E"; c.fillRect(x, y, w, w); } }
        });
      };
      if(!st.gift){
        /* 앞발은 원래 자리(배 양옆)에서 고삐를 쥔다. 고리 → 앞발 줄은 판자 안쪽으로 내려온다 */
        const rl = st.release || 0, hs = [[4, 27], [22, 27]].map(([px, py])=>({x: mx + px * up * k, y: my + py * up * k, s: seat.s}));      // 앞발은 제자리, 고삐만 놓는다
        drawSlackReins(hs, rl);
        /* 놓는 순간 앞발이 살짝 움찔(펴졌다 제자리) */
        const flick = rl > 0 && rl < .35 ? -Math.sin(rl / .35 * Math.PI) * 1.5 * up * k : 0;
        hs.forEach(h=>paw(h.x, h.y + flick)); sl.hands = null;
      } else {
        const g = st.gift, side = sg=>{ const p = P(fr, g[0], sg * .25 * (g[3] || 1), g[2] - .02); return {x: p.x, y: p.y + sb}; };
        drawSlackReins(null, 1);      // 내려놓은 고삐는 앞판에 걸쳐 있다
        const far = side(1), near = side(-1);
        paw(far.x, far.y);
        const gb = mk(); drawGift3D(gb, fr, g, st.giftPart); boardBlit(gb, boardImg(gb));
        paw(near.x, near.y);
        sl.hands = null;
      }
      c.restore();
      boardBlit(sl.front, boardImg(sl.front));
      /* 앞발: 선물을 들고 있으면 상자 양옆, 아니면 판자 위에 */
      if(st.lid){ const lb = mk(); drawGift3D(lb, fr, [st.gift[0] + st.lid.df, st.gift[1] + (st.lid.ds || 0), st.gift[2] + st.lid.dy], "lid"); blit(boardImg(lb), lb.ax - lb.ox * lb.cs, lb.ay - lb.oy * lb.cs, lb.cs, st.lid.a); }
      if(moving){ L(); c.fillStyle = "rgba(255,255,255,.85)"; for(let i = 0; i < 6; i++){ const back = proj(so.x - 1.4 * HEAD.x + (i % 2 ? .6 : -.6) * SIDE.x, ((T / 6 + i * 23) % 60) / 100, so.z - 1.4 * HEAD.z + (i % 2 ? .6 : -.6) * SIDE.z); c.fillRect(Math.round(back.x + (i - 3)), Math.round(back.y), 1, 1); } }
      sledInfo = sl; }});
    if(dO.z > 0.6 && !st.only) things.push({z: dO.z, draw: ()=>{
      groundShadow(dO, .7, .3);
      const d = drawDeer(dO, legP, moving, bob);
      /* 고삐: 가슴띠 양쪽 → 썰매 앞 양쪽. 조금 처진다 */
      /* 고삐 두 줄: 먼 쪽은 루돌프 뒤로, 가까운 쪽은 루돌프 몸 위로 지나간다(양쪽 다 보이게) */
      /* 고삐 끝: 앞발(쥐고 있을 때) → 썰매 앞 고리(내려놓을 때). 화면에서 왼쪽 줄은 왼쪽으로 이어 꼬이지 않게 */
      /* 루돌프 → 썰매 앞판 양쪽 고리. 고리에서 쥐돌이 앞발까지는 썰매를 그릴 때 잇는다(앞 장식 위로 지나가지 않게) */
      const ends = !sledInfo ? null : sledInfo.rein.slice();
      const cross = (p1, p2, p3, p4)=>{ const d = (a, b, c0)=>(b.x - a.x) * (c0.y - a.y) - (b.y - a.y) * (c0.x - a.x); return d(p1, p2, p3) * d(p1, p2, p4) < 0 && d(p3, p4, p1) * d(p3, p4, p2) < 0; };
      if(ends && cross(d.harness[0], ends[0], d.harness[1], ends[1])) ends.reverse();      // 두 줄이 엇갈리면 이어 붙일 끝을 바꾼다
      const rein = i=>{ if(!sledInfo) return; L(); const a = d.harness[i], b = ends[i], n = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.y - a.y) * 2)), w = Math.max(2, Math.round(lerp(a.s, b.s, .5) * .03));
        for(let j = 0; j <= n; j++){ const t = j / n, x = Math.round(lerp(a.x, b.x, t) - w / 2), y = Math.round(lerp(a.y, b.y, t) + Math.sin(t * Math.PI) * lerp(a.s, b.s, t) * .08 - w / 2);
          c.fillStyle = "#5A1016"; c.fillRect(x, y + w, w, 1); c.fillStyle = "#B8302E"; c.fillRect(x, y, w, w); } };
      rein(1);
      boardBlit(d.B, boardImg(d.B));
      drawDust();
      rein(0);
      if(Math.floor(T / 300) % 2 === 0){ L(); const xl = Math.round(d.nose.x / PXW), yl = Math.round(d.nose.y / PXH); [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([a, b])=>lowPx(xl + a * 3, yl + b * 3, "#FF9A86")); }      // 코 둘레 네 점이 반짝
    }});
    sledInfo = null;
    things.sort((a, b)=>b.z - a.z).forEach(t=>t.draw());
  }
  let sledInfo = null;
  const SEAT0 = .42, STAND_UP = .18;
  /* 고삐(고리 → 앞발) 끈 물리: 마디 10개짜리 끈. 쥐고 있을 때는 팽팽, 놓으면 중력으로 떨어져 흔들리다 판자 · 바닥에 걸려 멈춘다.
     썰매 기준점의 화면 좌표를 그 자리 1 m 크기로 나눈 단위로 계산한다(카메라가 다가가도 그대로 이어진다) */
  let ropes = null, FRAME_DT = 16;
  function ropeUpdate(i, ring, paw, attached, floorAt){
    const N = 10;
    if(!ropes) ropes = [null, null];
    let r = ropes[i];
    if(!r || attached){
      const len = Math.hypot(paw.x - ring.x, paw.y - ring.y);
      r = ropes[i] = {seg: len * 1.12 / N, pts: [...Array(N + 1)].map((_, j)=>{ const t = j / N; const x = lerp(ring.x, paw.x, t), y = lerp(ring.y, paw.y, t); return {x: x, y: y, px: x, py: y}; })};
      return r.pts;
    }
    const h = Math.min(.033, FRAME_DT / 1000), g = 6;      // 실제보다 살짝 느리게(끈이 떨어지는 게 보이게)
    r.pts.forEach((p, j)=>{ if(j === 0) return; const vx = (p.x - p.px) * .985, vy = (p.y - p.py) * .985; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + g * h * h; });
    for(let it = 0; it < 12; it++){
      r.pts[0].x = ring.x; r.pts[0].y = ring.y;
      for(let j = 0; j < N; j++){ const a = r.pts[j], b = r.pts[j + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6, k = (d - r.seg) / d;
        if(j === 0){ b.x -= dx * k; b.y -= dy * k; } else { a.x += dx * k * .5; a.y += dy * k * .5; b.x -= dx * k * .5; b.y -= dy * k * .5; } }
      r.pts.forEach((p, j)=>{ if(j === 0) return; const fy = floorAt(p.x); if(p.y > fy){ p.y = fy; p.px = p.x - (p.x - p.px) * .5; } });
    }
    return r.pts;
  }                 // 앉은 높이 · 선물을 보여 줄 때 일어서는 만큼
  /* 선물(멈춘 썰매에서 쥐돌이가 드는 자리)을 기준으로 다가간다 */
  const GIFT_P0 = (()=>{ camReset(); return P(frameAt(pathAt(0)), .42, 0, .82); })();
  function zoomTo(m, ty, tx){ camZoom(GIFT_P0, m, tx === undefined ? 65 : tx, ty); }      // tx: 선물이 올 가로 자리(얼굴까지 같이 보이게 왼쪽으로)
  function giftScreen(){ return P(frameAt(pathAt(0)), .42, 0, .82); }
  /* 눈 */
  const flakes = [...Array(60)].map(()=>({x: Math.random() * LOW_W, y: Math.random() * LOW_H, v: .36 + Math.random() * .6, big: Math.random() < .25}));
  function snow(wind, front){
    L();
    flakes.forEach((f, k)=>{ if((k % 3 === 0) !== front) return; f.y += f.v; f.x -= wind * (front ? 1.6 : .8); if(f.y > LOW_H){ f.y = -1; f.x = Math.random() * LOW_W; } if(f.x < -1) f.x = LOW_W;
      const x = Math.round(f.x), y = Math.round(f.y);
      lowPx(x, y, f.big ? "#FFFFFF" : "#C9D8E6");
      if(f.big && front){ lowPx(x - 1, y, "#9FB4C8"); lowPx(x + 1, y, "#9FB4C8"); lowPx(x, y - 1, "#9FB4C8"); lowPx(x, y + 1, "#9FB4C8"); } });
  }


  const CHEESE = sheet(SP.cheese, MP);

  /* ---------- 장면 진행 ---------- */
  let scene = 0, opened = 0, cheeseParts = [], sceneStart = 0, cheeseN = 0, appT0 = 0, lastT = 0, legP = 0, running = false, raf = 0;
  let from = 0, to = 0, done = null;
  /* 화면: 앱 위에 덮는 창. 장면은 세로 130 : 230 비율로, 남는 곳은 밤하늘 색 */
  const root = document.createElement("div");
  root.id = "xmasFx"; root.hidden = true; root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "크리스마스 선물");
  root.innerHTML = `<div class="xf-stage"><canvas width="${LOW_W}" height="${LOW_H}" aria-hidden="true"></canvas>
    <div class="xf-bub" hidden></div><div class="xf-cnt" hidden><canvas width="8" height="8" aria-hidden="true"></canvas><span></span></div>
    <div class="xf-cap"></div><button type="button" class="xf-skip">건너뛰기</button></div>`;
  document.body.appendChild(root);
  const stage = root.querySelector(".xf-stage"), bub = root.querySelector(".xf-bub"), capEl = root.querySelector(".xf-cap");
  const cntEl = root.querySelector(".xf-cnt"), cntNum = cntEl.querySelector("span"), skipEl = root.querySelector(".xf-skip");
  lowC = stage.querySelector("canvas").getContext("2d");
  cntEl.querySelector("canvas").getContext("2d").drawImage(CHEESE, 0, 1);
  function fit(){ const w = Math.min(window.innerWidth, window.innerHeight * W0 / H0); stage.style.width = w + "px"; stage.style.height = (w * H0 / W0) + "px"; }
  function setScene(k){
    scene = k; sceneStart = performance.now();
    if(k <= 2) appT0 = performance.now() - APPROACH[k];
    bub.hidden = true; cntEl.hidden = true;
    capEl.textContent = k === 4 ? (opened ? "" : "선물을 눌러서 열어봐츄!") : "";
    skipEl.hidden = k === 4;
  }
  function frame(now){
    if(!running) return;
    const dt = Math.min(50, now - (lastT || now)); lastT = now; FRAME_DT = dt;
    const t = now - sceneStart, T = now, calm = reduceMotion();
    if(scene <= 2){
      const at = now - appT0, dist = distAt(at), moving = at < APPROACH[3] - 150;
      const stepNow = at < APPROACH[1] ? 0 : at < APPROACH[2] ? 1 : 2;
      if(stepNow !== scene) scene = stepNow;
      /* 다리 박자는 실제로 나아간 거리에 맞춘다(발이 미끄러지지 않게). 한 번 뛰면 2.2 m */
      const dPrev = distAt(Math.max(0, at - dt)); legP += Math.max(0, dPrev - dist) / 2.2;
      camReset(); world(T, dist); snow(0.3, false);
      const blink = !moving && Math.floor(T / 2600) % 3 === 2 && T % 2600 < 160;
      drawGroup(dist, legP, moving, T, {blink: blink});
      snow(0.3, true);
      if(at > APPROACH[3] + 650) setScene(3);
    } else if(scene === 3){
      /* 4. 카메라가 쥐돌이에게 다가가는 동안 고삐를 내려놓고(0.15~0.7초) 일어서면, 0.95초에 선물이 "짠" 하고 앞발 사이에 나타난다.
         웃으며 "선물을 준비했다츄" 하고, 2.15초부터 카메라가 선물로 다가간다 */
      const zA = ease(t / 900), zB = ease((t - 2150) / 1000);
      const release = t < 150 ? 0 : Math.min(1, (t - 150) / 550), rise = ease((t - 650) / 300);
      const pop = t < 950 ? 0 : t < 1100 ? lerp(.3, 1.15, (t - 950) / 150) : t < 1250 ? lerp(1.15, 1, (t - 1100) / 150) : 1;
      const happy = t >= 1000, hop = happy && t < 1200 ? .05 * Math.sin((t - 1000) / 200 * Math.PI) : 0;
      const seatY = SEAT0 + rise * STAND_UP + hop, gift = [.42, 0, seatY + .22, pop];
      /* 멈춘 화면 그대로에서 출발해 선물을 서서히 가운데로(첫 순간 카메라가 옆으로 툭 옮겨 가지 않게) */
      zoomTo(lerp(1, 1.9, zA) * lerp(1, 1.12, zB), lerp(lerp(GIFT_P0.y, 118, zA), 140, zB), lerp(lerp(GIFT_P0.x, 57, zA), 52, zB));
      world(T, 0); snow(.2, false);
      drawGroup(0, legP, false, T, {stand: rise, hop: hop, release: release, happy: happy, blink: !happy && t > 300 && t < 430, gift: t >= 950 ? gift : null, giftPart: "closed", giftHeld: rise >= 1});
      if(t >= 950 && t < 1400){ L(); const gp = giftScreen(), r0 = (t - 950) / 450; c.fillStyle = "rgba(255,243,196," + (1 - r0).toFixed(2) + ")"; for(let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2, rr = 8 + r0 * 26; const x = Math.round(gp.x + Math.cos(a) * rr), y = Math.round(gp.y - 4 + Math.sin(a) * rr * .8); c.fillRect(x, y - 1, 1, 3); c.fillRect(x - 1, y, 3, 1); } }
      if(happy && t < 2150){ L(); const gp = giftScreen(); c.fillStyle = "#FFF3C4"; [[-16, -12], [16, -14], [-19, 4], [19, 2]].forEach(([ax, ay], i)=>{ if((Math.floor(t / 140) + i) % 3){ const x = Math.round(gp.x + ax), y = Math.round(gp.y + ay); c.fillRect(x, y - 1, 1, 3); c.fillRect(x - 1, y, 3, 1); } }); }
      bub.hidden = !(t >= 1050 && t < 2150); if(!bub.hidden) bub.textContent = "선물을 준비했다츄";
      snow(.2, true);
      if(t > 3250) setScene(4);
    } else {
      /* 5. 선물 가까이. 들썩이다가 누르면 뚜껑이 날아가고, 치즈가 솟아올라 위쪽 치즈 칸으로 날아 들어간다 */
      zoomTo(1.9 * 1.12, 140, 52);
      world(T, 0); snow(.2, false);
      const ot = opened ? now - opened : 0, sec = ot / 1000;
      const hop = !opened && !calm && Math.floor(T / 900) % 2 === 0 && (T % 900) < 220 ? .03 : 0;
      const joy = opened && !calm && ot < 360 ? .06 * Math.sin(ot / 360 * Math.PI) : 0;      // 열면 쥐돌이가 기뻐서 한 번 통
      const wob = !opened && !calm && Math.floor(T / 180) % 6 < 2 ? (Math.floor(T / 180) % 6 ? .015 : -.015) : 0;
      /* 뚜껑: 위로 튀어 올랐다가 옆으로 떨어지며 사라진다 */
      drawGroup(0, legP, false, T, {stand: 1, hop: joy, happy: true, gift: [.42, wob, .82 + hop + joy], giftPart: opened ? "open" : "closed", giftHeld: true,
        lid: opened ? {df: .2 * sec, ds: -1.1 * sec, dy: 2.6 * sec - 4.2 * sec * sec, a: sec < .8 ? 1 : Math.max(0, 1 - (sec - .8) / .3)} : null});
      if(opened){
        /* 상자 안에서 반짝이가 피어오른다(도트 한 칸짜리) */
        if(ot < 1400){ const top = P(frameAt(pathAt(0)), .42, 0, .82 + .2); for(let i = 0; i < 9; i++){ const life = ((ot / 700 + i / 9) % 1), xl = Math.round((top.x + Math.sin(i * 2.3) * 9) / PXW), yl = Math.round((top.y - life * 40) / PXH);
          if(life < .9) lowPx(xl, yl, i % 3 ? "#FFF3C4" : "#FFFFFF"); } }
        /* 치즈: 상자에서 퐁 솟아올라 빙글 돌다가, 위쪽 치즈 칸으로 하나씩 날아 들어간다. 들어갈 때마다 숫자가 오르고 칸이 통 */
        const tgt = {x: 50, y: 18};
        let got = 0;
        cheeseParts.forEach(p=>{ const age = ot - p.at; if(age < 0) return;
          if(age < 520){ p.x += p.vx; p.y += p.vy; p.vy += .13; p.vx *= .97; }
          else { if(!p.h0) p.h0 = {x: p.x, y: p.y}; const u = ease((age - 520) / 420); if(u >= 1){ got++; return; }
            p.x = lerp(p.h0.x, tgt.x, u); p.y = lerp(p.h0.y, tgt.y, u) - Math.sin(u * Math.PI) * 10; }
          const sq = Math.max(.25, Math.abs(Math.cos(age / 90)));      // 빙글: 가로로 납작해졌다 펴졌다
          c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; const sz = 8 * 1.3 * Z;
          c.drawImage(CHEESE, Math.round((p.x + 4 * 1.3) * Z - sz * sq / 2), Math.round(p.y * Z), Math.round(sz * sq), Math.round(sz)); c.restore(); });
        const prev = cheeseN; cheeseN = from + Math.round((to - from) * got / cheeseParts.length);
        if(cheeseN !== prev){ cntEl.classList.remove("pop"); void cntEl.offsetWidth; cntEl.classList.add("pop"); }
        cntEl.hidden = false; cntNum.textContent = String(cheeseN);
        if(ot > 1500 && capEl.textContent === "") capEl.textContent = "치즈 " + (to - from) + "개 선물이츄!";
        if(ot > 6000){ close(); return; }      // 안 눌러도 잠시 뒤 스스로 닫힌다
      }
      snow(.2, true);
    }
    lowC.imageSmoothingEnabled = false; lowC.clearRect(0, 0, LOW_W, LOW_H); lowC.drawImage(hi, 0, 0, LOW_W, LOW_H);
    raf = requestAnimationFrame(frame);
  }
  function openGift(){
    if(opened) return; opened = performance.now(); capEl.textContent = "";
    const gp0 = giftScreen(); for(let i = 0; i < 14; i++){ const side = i % 2 ? 1 : -1; cheeseParts.push({at: i * 36, x: gp0.x - 5, y: gp0.y - 14, vx: side * (.6 + Math.random() * 1.4), vy: -2.6 - Math.random() * 1.2}); }
    sfx("chu"); haptic("success");
  }
  /* 화면을 누르면: 다음 장면으로 → 선물 앞에서는 열기 → 다 받은 뒤에는 닫기 */
  stage.addEventListener("click", e=>{
    if(e.target === skipEl) return;
    if(scene < 4) setScene(scene + 1);
    else if(!opened) openGift();
    else if(performance.now() - opened > 1500) close();
  });
  skipEl.addEventListener("click", ()=>{ setScene(4); haptic("light"); });
  const onResize = ()=>{ if(running) fit(); };
  window.addEventListener("resize", onResize);
  /* 앱이 뒤로 갔다 오면 멈춰 있던 만큼 시간을 미뤄, 장면이 건너뛰거나 바로 닫히지 않게 */
  let hiddenAt = 0;
  const onVis = ()=>{
    if(!running) return;
    if(document.hidden){ hiddenAt = performance.now(); return; }
    if(!hiddenAt) return;
    const gap = performance.now() - hiddenAt; hiddenAt = 0;
    sceneStart += gap; appT0 += gap; if(opened) opened += gap; lastT = 0;
  };
  document.addEventListener("visibilitychange", onVis);
  /* 썰매 방울(소리를 켠 사람만). 앱을 켜자마자 뜨면 아직 화면을 누르기 전이라 소리가 안 날 수 있다(브라우저 규칙) — 그때는 열 때의 "츄"만 */
  function jingle(){
    if(!soundOn() || !audio()) return;
    if(actx.state === "suspended") actx.resume();
    for(let k = 0; k < 14; k++) sleighBell(actx.currentTime + .05 + k * .2 + (k % 2) * .05);
  }
  function play(opts){
    if(running) return;
    from = opts.from; to = opts.to; done = opts.done || null;
    ropes = null; DUST = []; seedPrints(); opened = 0; cheeseParts = []; cheeseN = from; legP = 0; lastT = 0;
    for(const k in LEG_DOWN) delete LEG_DOWN[k];
    root.hidden = false; fit(); running = true;
    /* 동작 줄이기를 켠 기기에서는 달려오는 장면 없이 선물 앞에서 시작한다 */
    if(reduceMotion()) setScene(4); else { setScene(0); jingle(); }
    raf = requestAnimationFrame(frame);
  }
  /* 닫으면 그림 · 캔버스 · 창을 모두 놓아준다(한 해에 한 번 쓰는 장면이라 다음에 다시 만든다) */
  function close(){
    if(!running) return;
    running = false; cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize); document.removeEventListener("visibilitychange", onVis);
    root.remove(); xmasFx = null;
    const d = done; done = null; if(d) d();
  }

  return {play: play, close: close, skip: ()=>setScene(4), open: openGift, state: ()=>({running: running, scene: scene, opened: !!opened, shown: cheeseN})};

}
/* 장면 띄우기: {from, to, done} — from → to 는 치즈 칸에 보여 줄 수(이미 받은 뒤의 값이 to). done 은 닫은 뒤에 */
function xmasFxPlay(opts){ if(!isDot()) return; if(!xmasFx) xmasFx = xmasFxCreate(); xmasFx.play(opts); }
function xmasFxClose(){ if(xmasFx) xmasFx.close(); }
function xmasFxState(){ return xmasFx ? xmasFx.state() : {running: false}; }
