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

/* 구도(28칸 × 칸 32 = 896 → 폭의 87%, 위 여백 171 · 아래는 잘림)와 배경색은 앱의 appIconSVG(www/js/appicon.js)에 있다.
   설정 화면의 미리 보기와 홈 화면 아이콘이 같은 그림이 되게 두 벌 다 거기서 그린다 */
const SIZE = 1024;

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

/* 크리스마스 아이콘(AppIcon-Xmas). 산타 모자 · 털실 목도리 도트는 옷장(closet.js)에 있어 앱을 띄워 입힌다 */
const XMAS_OUT = path.join(__dirname, "Assets.xcassets", "AppIcon-Xmas.appiconset", "icon-1024.png");

async function raster(page){
  return page.evaluate(async (size)=>{
    const s = new XMLSerializer().serializeToString(document.querySelector("svg"));
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(s))); });
    const c = document.createElement("canvas"); c.width = c.height = size;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0, size, size);
    return Array.from(g.getImageData(0, 0, size, size).data);
  }, SIZE);
}
function save(file, rgba){
  fs.mkdirSync(path.dirname(file), { recursive: true });
  writePNG(file, rgba, SIZE, SIZE);
  console.log(`아이콘 작성: ${path.relative(ROOT, file)}  ${SIZE}x${SIZE}, 알파 없음, ${fs.statSync(file).size}바이트`);
}

(async ()=>{
  const browser = await chromium.launch();
  const app = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await app.addInitScript(() => { window.__amgijwiNative = true; });
  await app.goto("file://" + path.join(ROOT, "www", "index.html"));
  const page = await (await browser.newContext({ viewport: { width: SIZE, height: SIZE } })).newPage();
  for(const [kind, file] of [["default", OUT], ["xmas", XMAS_OUT]]){
    const svg = await app.evaluate(k => appIconSVG(k), kind);
    await page.setContent(`<body style="margin:0">${svg}</body>`);
    save(file, await raster(page));
  }
  await browser.close();
})();
