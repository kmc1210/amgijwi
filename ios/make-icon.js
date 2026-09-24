/* 앱 아이콘을 쥐돌이 도트 원본에서 다시 그린다.
 *
 *   node ios/make-icon.js
 *
 * www/apple-touch-icon.png(180px)을 늘려 쓰지 않는 이유는 두 가지다.
 * 1024 와 비율이 맞지 않아 칸이 들쭉날쭉해지고, 그 파일 자체가 이미
 * 한 번 줄이면서 뭉개져 색이 108가지나 된다. 원본 도트에서 그리면 또렷하다.
 *
 * 앱 아이콘에 알파 채널이 있으면 앱스토어가 거부하므로 투명도 없이(색 타입 2) 쓴다.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "Assets.xcassets", "AppIcon.appiconset", "icon-1024.png");

const SIZE = 1024;
const CELL = 32;    // 28칸 × 32 = 896 → 아이콘 폭의 87%. 웹 아이콘과 같은 비율
const TOP = 171;    // 위 여백 17%. 아래는 잘린다. 작게 줄여도 얼굴이 크게 보이는 구도다
const BG_FROM = "#382A21", BG_TO = "#7D5839";

/* ---------- 도트 원본 읽기 ---------- */
function sprite(){
  const core = fs.readFileSync(path.join(ROOT, "www", "js", "core.js"), "utf8");
  const palStart = core.indexOf("const MOUSE_PAL");
  const pal = {};
  core.slice(palStart, core.indexOf("};", palStart))
      .replace(/([A-Za-z])\s*:\s*"(#[0-9A-Fa-f]{6})"/g, (_, k, v) => { pal[k] = v; return ""; });
  const rows = /day\s*:\s*\[(.*?)\]/s.exec(core.slice(core.indexOf("const MOUSE = {")))[1]
    .match(/"[^"]*"/g).map(s => s.slice(1, -1));
  return { pal, rows };
}

function svg(){
  const { pal, rows } = sprite();
  const w = rows[0].length;
  const x0 = (SIZE - w * CELL) / 2;
  let out = "";
  for(let y = 0; y < rows.length; y++){
    if(TOP + y * CELL >= SIZE) break;
    let x = 0;
    while(x < w){
      const ch = rows[y][x];
      if(ch === "."){ x++; continue; }
      let n = 1;
      while(x + n < w && rows[y][x + n] === ch) n++;
      const h = Math.min(CELL, SIZE - (TOP + y * CELL));
      out += `<rect x="${x0 + x * CELL}" y="${TOP + y * CELL}" width="${n * CELL}" height="${h}" fill="${pal[ch]}"/>`;
      x += n;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" shape-rendering="crispEdges">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`
    + `<stop offset="0" stop-color="${BG_FROM}"/><stop offset="1" stop-color="${BG_TO}"/></linearGradient></defs>`
    + `<rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>${out}</svg>`;
}

/* ---------- 투명도 없는 PNG 로 쓰기 ---------- */
const CRC = (()=>{ const t = new Int32Array(256);
  for(let n = 0; n < 256; n++){ let c = n;
    for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c; }
  return t; })();
function crc32(buf){
  let c = -1;
  for(let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function writePNG(file, rgba, w, h){
  /* 줄마다 필터 바이트 0 을 앞에 두고, 알파를 뺀 RGB 만 담는다 */
  const raw = Buffer.alloc(h * (1 + w * 3));
  let o = 0;
  for(let y = 0; y < h; y++){
    raw[o++] = 0;
    for(let x = 0; x < w; x++){
      const i = (y * w + x) * 4;
      raw[o++] = rgba[i]; raw[o++] = rgba[i + 1]; raw[o++] = rgba[i + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;    // 비트 깊이
  ihdr[9] = 2;    // 색 타입 2 = RGB, 알파 없음
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]));
}

(async ()=>{
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: SIZE, height: SIZE } })).newPage();
  await page.setContent(`<body style="margin:0">${svg()}</body>`);
  const rgba = await page.evaluate(async (size)=>{
    const s = new XMLSerializer().serializeToString(document.querySelector("svg"));
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(s))); });
    const c = document.createElement("canvas"); c.width = c.height = size;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    return Array.from(g.getImageData(0, 0, size, size).data);
  }, SIZE);
  await browser.close();

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  writePNG(OUT, rgba, SIZE, SIZE);
  console.log(`아이콘 작성: ${path.relative(ROOT, OUT)}  ${SIZE}x${SIZE}, 알파 없음, ${fs.statSync(OUT).size}바이트`);
})();
