// 배포된 사이트의 보안 헤더 검사
//
// CSP 는 두 곳에 있다. CloudFront 응답 헤더(amgijwi-security-headers)와
// www/index.html 의 meta. meta 를 남겨두는 건 GitHub Pages 가 같은 www/ 를
// 헤더 없이 서빙하고 있고, 거기서는 meta 가 유일한 보호라서다.
//
// 두 벌이 걸리면 브라우저는 교집합만 허용한다. 값이 같을 때는 무해하지만
// 한쪽만 고치면 조용히 막히기 시작한다. 그래서 이 스크립트가 배포된 HTML 의
// meta 와 응답 헤더를 직접 비교해, 어긋나면 실패한다.
// 회귀 테스트(file://)는 헤더를 볼 수 없어서 이 검사는 여기서만 할 수 있다.
//
//   node test/headers.js                    기본 https://amgijwi.com
//   node test/headers.js https://다른주소    주소 지정
//
// 배포 파이프라인에서 무효화까지 끝난 뒤에 돌린다. 실패하면 종료 코드 1.

const https = require("https");
const http = require("http");

const SITE = process.argv[2] || "https://amgijwi.com";

let pass = 0, fail = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; failures.push(name + (detail ? "  → " + detail : "")); }
}

function get(target) {
  return new Promise(function (resolve, reject) {
    const u = new URL(target);
    const mod = u.protocol === "http:" ? http : https;
    const req = mod.request(u, {
      method: "GET",
      headers: { "Accept-Encoding": "identity", "User-Agent": "amgijwi-header-check" }
    }, function (res) {
      const chunks = [];
      res.on("data", function (c) { chunks.push(c); });
      res.on("end", function () {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          rawHeaders: res.rawHeaders,
          location: res.headers.location,
          body: Buffer.concat(chunks).toString("utf8")
        });
      });
    });
    req.setTimeout(20000, function () { req.destroy(new Error("시간 초과")); });
    req.on("error", reject);
    req.end();
  });
}

// "a b; c d" → { a: "b", c: "d" }. 출처 순서와 공백 차이는 같은 정책으로 본다
function parseCsp(s) {
  const map = {};
  String(s || "").split(";").forEach(function (part) {
    const t = part.trim().split(/\s+/).filter(Boolean);
    if (!t.length) return;
    map[t[0].toLowerCase()] = t.slice(1).sort().join(" ");
  });
  return map;
}

// indexOf("connect-src 'none'") 로는 "connect-src 'none' https://x" 도 통과한다.
// 출처가 섞이면 브라우저는 'none' 을 무시하고 x 를 허용하므로 값 전체가 같아야 한다.
function exact(map, directive, value) {
  return map[directive] === value;
}

function metaCsp(html) {
  const tag = /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/i.exec(html);
  if (!tag) return null;
  // 값 안에 'none' 같은 작은따옴표가 들어 있으니 여는 따옴표와 같은 종류로 닫는다
  const content = /content=(?:"([^"]*)"|'([^']*)')/i.exec(tag[0]);
  return content ? (content[1] !== undefined ? content[1] : content[2]) : "";
}

(async function () {
  console.log("검사 대상: " + SITE + "\n");

  const r = await get(SITE);
  ok("200 으로 응답한다", r.status === 200, "상태 " + r.status);

  const h = r.headers;
  const cspRaw = h["content-security-policy"] || "";
  const csp = parseCsp(cspRaw);

  ok("CSP 헤더가 있다", cspRaw.length > 0);
  ok("connect-src 가 'none' 뿐이다", exact(csp, "connect-src", "'none'"), csp["connect-src"]);
  ok("default-src 가 'none' 뿐이다", exact(csp, "default-src", "'none'"), csp["default-src"]);
  ok("script-src 가 'self' 뿐이다", exact(csp, "script-src", "'self'"), csp["script-src"]);
  ok("frame-ancestors 가 'none' 이다", exact(csp, "frame-ancestors", "'none'"), csp["frame-ancestors"]);

  // Node 는 같은 이름의 헤더가 여러 줄 오면 쉼표로 이어 붙여 문자열 하나로 준다.
  // headers 객체로는 개수를 셀 수 없어서 rawHeaders 를 센다
  const cspLines = r.rawHeaders.filter(function (v, i) {
    return i % 2 === 0 && v.toLowerCase() === "content-security-policy";
  }).length;
  ok("CSP 헤더가 한 줄만 온다", cspLines === 1, cspLines + "줄");

  const hsts = h["strict-transport-security"] || "";
  const age = /max-age=(\d+)/.exec(hsts);
  ok("HSTS 가 1년 이상이다", !!age && Number(age[1]) >= 31536000, hsts);
  ok("HSTS 가 하위 도메인을 포함한다", hsts.indexOf("includeSubDomains") >= 0, hsts);

  ok("nosniff 가 걸려 있다", (h["x-content-type-options"] || "") === "nosniff", h["x-content-type-options"]);
  ok("X-Frame-Options 가 DENY 다", (h["x-frame-options"] || "").toUpperCase() === "DENY", h["x-frame-options"]);
  ok("Referrer-Policy 가 no-referrer 다", (h["referrer-policy"] || "") === "no-referrer", h["referrer-policy"]);

  const pp = h["permissions-policy"] || "";
  ["camera", "microphone", "geolocation"].forEach(function (k) {
    ok(k + " 가 차단돼 있다", pp.indexOf(k + "=()") >= 0, pp);
  });

  // meta 와 헤더가 같은 정책인지. frame-ancestors 는 meta 에서 무시되므로 헤더에만 있다
  const metaRaw = metaCsp(r.body);
  ok("배포된 HTML 에 meta CSP 가 있다 (GitHub Pages 사본 보호)", metaRaw !== null);
  if (metaRaw !== null) {
    const meta = parseCsp(metaRaw);
    const fromHeader = Object.assign({}, csp);
    delete fromHeader["frame-ancestors"];
    const keys = Object.keys(Object.assign({}, meta, fromHeader)).sort();
    const diff = keys.filter(function (k) { return meta[k] !== fromHeader[k]; })
      .map(function (k) { return k + " (meta: " + (meta[k] === undefined ? "없음" : meta[k]) + " / 헤더: " + (fromHeader[k] === undefined ? "없음" : fromHeader[k]) + ")"; });
    ok("meta 와 헤더 CSP 가 같다 (frame-ancestors 제외)", diff.length === 0, diff.join(", "));
  }

  // HTTP 로 와도 HTTPS 로 넘어가야 한다
  const plain = await get(SITE.replace(/^https:/, "http:"));
  ok("HTTP 는 HTTPS 로 넘긴다",
     plain.status >= 300 && plain.status < 400 &&
     String(plain.location || "").indexOf("https://") === 0,
     plain.status + " → " + plain.location);

  console.log("통과 " + pass + " / 실패 " + fail);
  if (fail) {
    console.log("");
    failures.forEach(function (f) { console.log("  ✗ " + f); });
    process.exit(1);
  }
  console.log("이상 없음.");
})().catch(function (e) {
  console.error("검사 실패: " + e.message);
  process.exit(1);
});
