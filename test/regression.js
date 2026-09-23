// 암기쥐 회귀 테스트
//
// 실제 Chromium 으로 www/index.html 을 띄우고, 앱 안의 함수를 직접 불러
// 데이터가 깨지지 않는지 확인한다. 서버 없이 file:// 로 연다.
//
//   node test/regression.js
//
// 실패하면 종료 코드 1. PR 마다 GitHub Actions(.github/workflows/ci.yml)가 돌리고,
// 통과해야 main 에 머지한다.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const APP = "file://" + path.resolve(__dirname, "..", "www", "index.html");

let pass = 0, fail = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; failures.push(name + (detail ? "  → " + detail : "")); }
}
function eq(name, got, want) {
  ok(name, JSON.stringify(got) === JSON.stringify(want),
     "기대 " + JSON.stringify(want) + " / 실제 " + JSON.stringify(got));
}

// 마이그레이션 검증용 옛 데이터. 부재료가 메뉴 안에 박혀 있던 시절 모양.
const LEGACY = {
  drinks: [
    { id: "d1", name: "자몽 블랙티", cat: "tea",
      ing: ["자몽청 60g", "블랙티 200ml"], steps: ["섞는다"],
      subs: [{ name: "자몽청", ing: ["자몽 1kg", "설탕 1kg"], steps: ["재운다"],
               tip: "", place: "냉장", dur: "10일" }] },
    { id: "d2", name: "자몽 에이드", cat: "ade",
      ing: ["자몽청 60g", "탄산수 200ml"], steps: ["섞는다"],
      subs: [{ name: "자몽청", ing: ["자몽 1kg", "설탕 1kg"], steps: ["재운다"],
               tip: "", place: "냉장", dur: "10일" }] },
    { id: "d3", name: "레몬 에이드", cat: "ade",
      ing: ["레몬청 60g"], steps: ["섞는다"],
      subs: [{ name: "자몽청", ing: ["자몽 2kg", "설탕 1kg"], steps: ["재운다"],
               tip: "", place: "냉장", dur: "10일" }] }
  ],
  known: [], needReview: [], sess: null
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(APP);
  await page.waitForTimeout(400);

  // ── 1. 로드 자체 ────────────────────────────────────────────────
  ok("자바스크립트 오류 없이 뜬다", errors.length === 0, errors.join(" | "));
  ok("스크립트가 실제로 실행됐다", await page.evaluate(() =>
    typeof data === "object" && Array.isArray(data.drinks)));
  ok("style.css 가 실제로 붙었다", await page.evaluate(() =>
    getComputedStyle(document.body).backgroundColor !== "rgba(0, 0, 0, 0)"));

  // ── 2. 부재료 라이브러리 마이그레이션 ───────────────────────────
  const mig = await page.evaluate(legacy => {
    const root = JSON.parse(JSON.stringify(legacy));
    const r = liftSubs(root);
    return {
      report: r,
      subNames: (root.subs || []).map(s => s.name),
      refs: root.drinks.map(d => (d.subRefs || []).length),
      leftover: root.drinks.filter(d => d.subs).length,
      d1sub: (root.subs.find(s => s.id === root.drinks[0].subRefs[0]) || {}).name,
      d3sub: (root.subs.find(s => s.id === root.drinks[2].subRefs[0]) || {}).name,
      shared: root.drinks[0].subRefs[0] === root.drinks[1].subRefs[0],
      dur: (root.subs[0] || {}).dur
    };
  }, LEGACY);

  eq("같은 부재료 3건이 2건으로 합쳐진다", mig.subNames.length, 2);
  ok("이름은 같지만 배합이 다르면 따로 남는다", mig.subNames.indexOf("자몽청 2") >= 0,
     JSON.stringify(mig.subNames));
  ok("배합이 같은 두 메뉴는 같은 부재료를 가리킨다", mig.shared);
  ok("배합이 다른 메뉴는 분리된 쪽을 가리킨다", mig.d3sub === "자몽청 2", mig.d3sub);
  eq("모든 메뉴가 참조를 갖는다", mig.refs, [1, 1, 1]);
  eq("메뉴에 박혀 있던 subs 는 사라진다", mig.leftover, 0);
  eq("보관 기한 같은 값이 유실되지 않는다", mig.dur, "10일");

  // ── 3. 마이그레이션 멱등성 (두 번 돌려도 안 늘어난다) ───────────
  const idem = await page.evaluate(legacy => {
    const root = JSON.parse(JSON.stringify(legacy));
    liftSubs(root);
    const once = root.subs.length;
    liftSubs(root);
    return { once: once, twice: root.subs.length };
  }, LEGACY);
  ok("마이그레이션을 두 번 돌려도 부재료가 늘지 않는다",
     idem.once === idem.twice, idem.once + " → " + idem.twice);

  // ── 4. 보관(아카이브) ───────────────────────────────────────────
  const arch = await page.evaluate(() => {
    const backup = JSON.stringify(data);
    data.drinks = [
      { id: "a1", name: "A", cat: "tea", ing: [], steps: [] },
      { id: "a2", name: "B", cat: "tea", ing: [], steps: [], arch: true },
      { id: "a3", name: "C", cat: "ade", ing: [], steps: [] }
    ];
    data.needReview = ["a1", "a2"];
    const r = {
      live: liveDrinks().map(d => d.id),
      archived: archDrinks().map(d => d.id),
      all: drinksOf("all").map(d => d.id),
      tea: drinksOf("tea").map(d => d.id),
      review: liveDrinks().filter(d => has(data.needReview, d.id)).map(d => d.id)
    };
    data = JSON.parse(backup);
    return r;
  });

  eq("보관한 레시피는 목록에서 빠진다", arch.live, ["a1", "a3"]);
  eq("보관함에는 보관한 것만 나온다", arch.archived, ["a2"]);
  eq("전체 필터에도 보관본이 안 샌다", arch.all, ["a1", "a3"]);
  eq("카테고리 필터에도 안 샌다", arch.tea, ["a1"]);
  eq("다시 볼래요 학습에도 안 샌다", arch.review, ["a1"]);

  // ── 5. 보관 상태가 수정 후에도 살아남는가 (실제로 났던 버그) ────
  const keep = await page.evaluate(() => {
    const backup = JSON.stringify(data);
    data.drinks = [{ id: "k1", name: "보관중", cat: "tea", ing: [], steps: [], arch: true }];
    const before = data.drinks[0].arch;
    // 저장 핸들러가 하는 것과 같은 방식으로 레코드를 새로 만든다
    const editingId = "k1";
    const rebuilt = {
      id: editingId, name: "보관중(수정)", cat: "tea", ing: [], steps: [],
      arch: editingId ? !!(data.drinks.find(x => x.id === editingId) || {}).arch : false
    };
    const r = { before: before, after: rebuilt.arch };
    data = JSON.parse(backup);
    return r;
  });
  ok("보관한 레시피를 수정해도 보관 상태가 유지된다",
     keep.before === true && keep.after === true, JSON.stringify(keep));

  // ── 6. 부재료 참조 무결성 ───────────────────────────────────────
  const ref = await page.evaluate(() => {
    const backup = JSON.stringify(data);
    data.subs = [{ id: "s1", name: "자몽청", ing: [], steps: [] },
                 { id: "s2", name: "레몬청", ing: [], steps: [] }];
    data.drinks = [{ id: "x1", name: "X", cat: "tea", ing: [], steps: [], subRefs: ["s1", "s2"] },
                   { id: "x2", name: "Y", cat: "ade", ing: [], steps: [], subRefs: ["s1"] }];
    const uses = usesOf("s1").map(d => d.id);
    deleteSub("s1");
    const r = {
      uses: uses,
      subsLeft: data.subs.map(s => s.id),
      refsLeft: data.drinks.map(d => d.subRefs),
      dangling: data.drinks.some(d => (d.subRefs || []).some(id => !subById(id)))
    };
    data = JSON.parse(backup);
    return r;
  });

  eq("부재료를 쓰는 메뉴를 역으로 찾는다", ref.uses, ["x1", "x2"]);
  eq("부재료를 지우면 목록에서 빠진다", ref.subsLeft, ["s2"]);
  eq("부재료를 지우면 참조도 같이 정리된다", ref.refsLeft, [["s2"], []]);
  ok("끊어진 참조가 남지 않는다", ref.dangling === false);

  // ── 6-1. ICE / HOT 재료 두 벌 ───────────────────────────────────
  // ICE 와 HOT 은 재료 구성이 다를 수 있어 temp 가 ICE/HOT 일 때만 두 벌을 가진다.
  // 옛 레시피에는 ingHot 이 없다. 없으면 예전처럼 한 벌로 보여야 한다.
  const two = await page.evaluate(() => {
    const backup = JSON.stringify(data);
    const both = { id: "b1", name: "아메리카노", cat: "coffee", temp: "ICE/HOT",
      ing: [["에스프레소", "2샷"], ["정수", "150 ml"], ["얼음", "130 g"]],
      ingHot: [["에스프레소", "2샷"], ["뜨거운 물", "250 ml"]], steps: [] };
    const old = { id: "o1", name: "옛 레시피", cat: "coffee", temp: "ICE",
      ing: [["정수", "200 ml"]], steps: [] };
    // temp 가 한쪽뿐인데 ingHot 이 남아 있으면 무시해야 한다
    const stale = { id: "s1", name: "온도 바꾼 레시피", cat: "coffee", temp: "HOT",
      ing: [["우유", "200 ml"]], ingHot: [["얼음", "130 g"]], steps: [] };
    const r = {
      bothSets: ingSets(both).map(s => [s[0], s[1].length]),
      oldSets: ingSets(old).map(s => [s[0], s[1].length]),
      staleSets: ingSets(stale).map(s => [s[0], s[1].length]),
      keys: ingKeys(both),
      hotAmount: ingAt(both, "1-1")[1],
      names: ingNames(both),
      blanks: (blankHTML(both).match(/data-b="/g) || []).length,
      labels: (backHTML(both).match(/class="ingset"/g) || []).length,
      oldLabels: (backHTML(old).match(/class="ingset"/g) || []).length
    };
    data = JSON.parse(backup);
    return r;
  });
  eq("ICE/HOT 이면 재료가 두 벌이다", two.bothSets, [["ICE", 3], ["HOT", 2]]);
  eq("옛 레시피는 한 벌 그대로다", two.oldSets, [["", 1]]);
  eq("온도가 한쪽뿐이면 남은 ingHot 은 무시한다", two.staleSets, [["", 1]]);
  eq("빈칸 키가 벌-순서로 매겨진다", two.keys, ["0-0", "0-1", "0-2", "1-0", "1-1"]);
  eq("키로 HOT 쪽 용량을 찾는다", two.hotAmount, "250 ml");
  ok("검색이 HOT 재료 이름도 본다", two.names.indexOf("뜨거운 물") >= 0, two.names);
  eq("빈칸 채우기 칸이 두 벌 모두 나온다", two.blanks, 5);
  eq("카드 뒷면에 ICE·HOT 라벨이 붙는다", two.labels, 2);
  eq("한 벌짜리 카드에는 라벨이 없다", two.oldLabels, 0);

  const bothTrip = await page.evaluate(() => {
    const backup = JSON.stringify(data);
    data.drinks = [{ id: "b1", name: "아메리카노", cat: "coffee", temp: "ICE/HOT",
      ing: [["에스프레소", "2샷"]], ingHot: [["뜨거운 물", "250 ml"]], steps: [], subRefs: [] }];
    const json = backupJSON();
    data.drinks = [];
    const parsed = JSON.parse(json);
    const restored = parsed.data.drinks[0];
    data = JSON.parse(backup);
    return { ing: restored.ing, ingHot: restored.ingHot };
  });
  eq("백업 파일에 ICE 재료가 담긴다", bothTrip.ing, [["에스프레소", "2샷"]]);
  eq("백업 파일에 HOT 재료가 담긴다", bothTrip.ingHot, [["뜨거운 물", "250 ml"]]);

  // ── 6-2. 학습할 레시피 고르기 ───────────────────────────────────
  // 카테고리를 골라도 그 안의 전부가 덱에 들어가던 것을, 필요한 것만 고르게 한다.
  const pickFlow = await page.evaluate(async () => {
    const backup = JSON.stringify(data);
    data.drinks = [
      { id: "p1", name: "가", cat: "coffee", temp: "ICE", ing: [["물", "1"]], steps: [] },
      { id: "p2", name: "나", cat: "coffee", temp: "HOT", ing: [["물", "2"]], steps: [] },
      { id: "p3", name: "다", cat: "coffee", temp: "ICE", ing: [["물", "3"]], steps: [] }
    ];
    data.mastered = ["p1"];
    const pool = data.drinks.slice();
    openPickSheet(pool, "커피");
    const rowsAtFirst = document.querySelectorAll("#sheetBody .row").length;
    const onAtFirst = document.querySelectorAll("#sheetBody .row.on").length;
    // 안 외운 것만 → 완료 표시된 p1 은 빠진다
    document.querySelector("#pickNew").click();
    const afterNew = [...document.querySelectorAll("#sheetBody .row.on")].map(r=>r.dataset.id);
    // 모두 해제하면 시작 버튼이 막힌다
    document.querySelector("#pickNone").click();
    const blocked = document.querySelector("#pickGo").disabled;
    // 하나만 골라 학습 시작
    document.querySelector('#sheetBody .row[data-id="p3"]').click();
    const label = document.querySelector("#pickGo").textContent;
    document.querySelector("#pickGo").click();
    const modeScope = document.querySelector("#sheetBody div span").textContent;
    document.querySelector('#sheetBody .row[data-mode="flip"]').click();
    await new Promise(r => setTimeout(r, 400));
    const deck = state.deck.map(d=>d.id);
    data = JSON.parse(backup);
    closeSheet();
    return { rowsAtFirst, onAtFirst, afterNew, blocked, label, modeScope, deck };
  });
  eq("고르기 시트에 범위의 레시피가 모두 나온다", pickFlow.rowsAtFirst, 3);
  eq("처음에는 전부 선택돼 있다", pickFlow.onAtFirst, 3);
  eq("안 외운 것만 고르면 완료한 것은 빠진다", pickFlow.afterNew, ["p2", "p3"]);
  ok("하나도 안 고르면 시작할 수 없다", pickFlow.blocked === true);
  eq("고른 개수가 버튼에 나온다", pickFlow.label, "1개 학습하기");
  ok("방식 시트가 좁힌 범위를 보여준다", pickFlow.modeScope.indexOf("커피 중 1개") >= 0, pickFlow.modeScope);
  eq("고른 레시피만 덱에 들어간다", pickFlow.deck, ["p3"]);

  // ── 6-3. 태블릿 최대 폭 ─────────────────────────────────────────
  // 넓은 화면에서 내용이 화면 끝까지 늘어나지 않고 가운데로 모여야 한다.
  // 폰과 데스크톱 목업(390px)은 영향을 받지 않아야 한다.
  const before = page.viewportSize();
  const measureAt = async (w, h) => {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => go("home"));   // 학습 화면에서는 탭바가 숨는다
    await page.waitForTimeout(150);
    return page.evaluate(() => {
      const box = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect();
        return { w: Math.round(r.width), left: Math.round(r.left), right: Math.round(innerWidth - r.right) }; };
      return { view: innerWidth, appbar: box("#s-home .appbar"), hero: box("#s-home .hero"),
               cardWrap: box("#cardWrap"), tab: box("#tabs .tab"), tabs: box("#tabs") };
    });
  };
  const wTablet = await measureAt(1180, 820);   // 아이패드 가로
  const wPhone = await measureAt(390, 844);     // 아이폰
  const wMockup = await measureAt(1440, 790);   // 데스크톱 목업(폭 390)
  await page.setViewportSize(before);
  await page.waitForTimeout(150);

  eq("태블릿에서 앱바가 최대 폭에서 멈춘다", wTablet.appbar.w, 560);
  eq("태블릿에서 학습 카드 영역도 같은 폭이다", wTablet.cardWrap.w, 560);
  ok("태블릿에서 내용이 가운데 온다",
     wTablet.appbar.left === wTablet.appbar.right && wTablet.appbar.left > 100,
     JSON.stringify(wTablet.appbar));
  // width:100% 가 빠지면 세로 flex 안에서 폭이 내용 크기로 쪼그라든다 (실제로 겪은 실수)
  ok("앱바가 내용 크기로 쪼그라들지 않는다", wTablet.appbar.w > wTablet.hero.w - 1,
     JSON.stringify([wTablet.appbar.w, wTablet.hero.w]));
  ok("탭바 배경은 화면 전체를 쓰고 항목만 모인다",
     wTablet.tabs.w === 1180 && wTablet.tab.w === 140 && wTablet.tab.left > 100,
     JSON.stringify([wTablet.tabs.w, wTablet.tab.w, wTablet.tab.left]));
  eq("폰에서는 폭 제한이 걸리지 않는다", wPhone.appbar.w, 390);
  eq("데스크톱 목업(390px)도 그대로다", wMockup.appbar.w, 390);

  // ── 6-4. 소리 ───────────────────────────────────────────────────
  // 기본은 꺼짐. 꺼져 있으면 오디오를 아예 만들지 않는다(배터리·권한).
  // 배경음은 켜 두면 앱 어디서나 흐른다. 브라우저 규칙상 첫 터치 뒤에 시작된다.
  const sound = await page.evaluate(async () => {
    const backup = JSON.stringify(data);
    const r = { def: data.sound, readyWhenOff: null, readyAfterSfx: null };

    data.sound = "off";
    sfx("chu");
    r.readyWhenOff = audioReady();          // 꺼져 있으면 AudioContext 도 안 만든다
    r.offOn = soundOn(); r.offBgm = bgmAllowed();

    data.sound = "sfx";
    r.sfxOn = soundOn(); r.sfxBgm = bgmAllowed();
    sfx("chu");
    r.readyAfterSfx = audioReady();

    // 효과음만 모드에서는 화면을 눌러도 배경음이 안 나온다
    const tap = ()=>document.dispatchEvent(new Event("pointerdown"));
    data.drinks = [{ id:"q1", name:"소리", cat:"coffee", temp:"ICE", ing:[["물","1"]], steps:[] }];
    tap();
    r.bgmWhenSfxOnly = bgmPlaying();

    // 켜면 학습 화면이 아니어도 첫 터치에 흐르기 시작한다
    data.sound = "all";
    go("home");
    r.bgmBeforeTap = bgmPlaying();          // 터치 전에는 아직 조용하다
    tap();
    r.bgmOnHome = bgmPlaying();

    startSession(null);
    r.bgmInStudy = bgmPlaying();
    go("list");
    r.bgmOnList = bgmPlaying();             // 학습을 벗어나도 이어진다

    bgmStop();
    data = JSON.parse(backup);
    return r;
  });
  eq("소리는 기본으로 꺼져 있다", sound.def, "off");
  ok("꺼져 있으면 오디오를 만들지 않는다", sound.readyWhenOff === false);
  ok("효과음만 모드에서 효과음이 오디오를 연다", sound.readyAfterSfx === true);
  eq("모드별 허용", [sound.offOn, sound.offBgm, sound.sfxOn, sound.sfxBgm], [false, false, true, false]);
  ok("효과음만 모드에서는 배경음이 안 나온다", sound.bgmWhenSfxOnly === false);
  ok("소리를 켜도 첫 터치 전에는 조용하다", sound.bgmBeforeTap === false);
  ok("홈에서도 배경음이 흐른다", sound.bgmOnHome === true);
  ok("학습 화면에서도 이어진다", sound.bgmInStudy === true);
  ok("학습을 벗어나도 배경음이 끊기지 않는다", sound.bgmOnList === true);
  ok("빈칸 효과음이 있다", await page.evaluate(() => typeof SFX.reveal === "function"));

  const soundTrip = await page.evaluate(() => {
    const backup = JSON.stringify(data);
    data.sound = "all";
    const saved = JSON.parse(backupJSON()).data.sound;
    data = JSON.parse(backup);
    return saved;
  });
  eq("백업 파일에 소리 설정이 담긴다", soundTrip, "all");

  // ── 6-5. 까마귀 ─────────────────────────────────────────────────
  // 못 외운 게 있을 때만 결과 화면에 나온다. 다 맞혔으면 쥐돌이만 있다.
  const crow = await page.evaluate(async () => {
    const backup = JSON.stringify(data);
    const box = document.querySelector("#resCrow");
    const r = {};

    state.stat = { ok: 4, again: 3, total: 7 };
    finish();
    /* 까악(900ms) 을 기다리지 않고, 쥐돌이와 같은 순간에 그려져야 한다 */
    r.drawnAtOnce = box.innerHTML.indexOf("<svg") === 0;
    box.innerHTML = "";                       // 지난 판의 그림이 남아 속이지 않도록 비운다
    await new Promise(x => setTimeout(x, 1200));
    r.shown = !box.hidden;
    r.msg = document.querySelector("#resMsg").textContent;
    r.drawn = box.innerHTML.indexOf("<svg") === 0;

    state.stat = { ok: 7, again: 0, total: 7 };
    finish();
    await new Promise(x => setTimeout(x, 200));
    r.hiddenWhenPerfect = box.hidden;
    r.perfectMsg = document.querySelector("#resMsg").textContent;

    stopCaw();
    r.poses = Object.keys(CROW);
    r.sameWidth = CROW.idle.every(x => x.length === CROW.idle[0].length)
               && CROW.caw.every(x => x.length === CROW.idle[0].length);
    r.eyeLikeMouse = CROW.idle.some(x => x.indexOf("ohkho") >= 0);   // 눈은 쥐돌이와 같은 문법
    r.pupilSameColor = CROW_PAL.k === MOUSE_PAL.k;
    data = JSON.parse(backup);
    go("home");
    return r;
  });
  ok("못 외운 게 있으면 까마귀가 나온다", crow.shown === true);
  ok("까마귀가 쥐돌이와 같은 순간에 그려진다", crow.drawnAtOnce === true);
  ok("까마귀가 실제로 그려진다", crow.drawn === true);
  ok("까마귀가 개수를 말한다", crow.msg.indexOf("3개 까먹었다") === 0, crow.msg);
  ok("까악 말투다", crow.msg.indexOf("까악") > 0, crow.msg);
  ok("다 맞히면 까마귀가 안 나온다", crow.hiddenWhenPerfect === true);
  ok("다 맞히면 칭찬만 한다", crow.perfectMsg.indexOf("까악") < 0, crow.perfectMsg);
  eq("자세는 평상시와 까악 두 가지", crow.poses, ["idle", "caw"]);
  ok("모든 줄의 폭이 같다", crow.sameWidth === true);
  ok("눈은 쥐돌이와 같은 도트 문법이다", crow.eyeLikeMouse === true);
  ok("눈동자 색이 쥐돌이와 같다", crow.pupilSameColor === true);

  // ── 7. 저장소 왕복 ──────────────────────────────────────────────
  const trip = await page.evaluate(() => {
    const backup = localStorage.getItem("brewnote.v1");
    const before = JSON.stringify(data);
    persist();
    const raw = localStorage.getItem("brewnote.v1");
    const same = JSON.stringify(JSON.parse(raw)) === before;
    if (backup === null) localStorage.removeItem("brewnote.v1");
    else localStorage.setItem("brewnote.v1", backup);
    return { key: raw !== null, same: same };
  });
  ok("brewnote.v1 키로 저장된다", trip.key);
  ok("저장했다 읽어도 데이터가 그대로다", trip.same);

  // ── 7-1. 저장소 이름과 무관한 내부 식별자 ───────────────────────
  // 저장소 이름은 amgijwi 로 바뀌었지만 아래 값은 brewnote 그대로여야 한다.
  // 저장 키가 바뀌면 기존 레시피가 안 보이고, PIN salt 가 바뀌면 PIN 을 건
  // 사람이 잠금을 못 푼다. 이름을 맞추려고 고치는 사고를 막는다.
  const ids = await page.evaluate(() => ({
    key: KEY,
    pin: pinHash("1234"),
    backupApp: JSON.parse(backupJSON()).app
  }));
  eq("저장 키는 brewnote.v1 그대로다", ids.key, "brewnote.v1");
  eq("PIN 해시가 기존 값과 같다 (salt 유지)", ids.pin, "de496d40");
  eq("백업 파일의 app 표시는 brewnote 그대로다", ids.backupApp, "brewnote");

  // ── 8. 사용자 입력 이스케이프 (XSS) ─────────────────────────────
  const xss = await page.evaluate(() => {
    const s = esc('<img src=x onerror=alert(1)>"&');
    return { out: s, hasTag: s.indexOf("<img") >= 0 };
  });
  ok("사용자 입력의 태그가 이스케이프된다", xss.hasTag === false, xss.out);

  // ── 9. 외부로 나가는 통신이 없다 ────────────────────────────────
  // CSP 는 meta 와 CloudFront 응답 헤더 두 곳에 있다. meta 를 남겨두는 이유는
  // 같은 www/ 가 앞으로 iOS 앱에 실리는데 앱에는 응답 헤더가 없어서다.
  // 두 값이 어긋나지 않는지는 배포 후 test/headers.js 가 비교한다.
  const csp = await page.evaluate(() =>
    (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || "");
  ok("CSP 가 걸려 있다", csp.length > 0);
  ok("connect-src 가 막혀 있다", csp.indexOf("connect-src 'none'") >= 0, csp);
  ok("분리본이므로 script-src 는 'self'", csp.indexOf("script-src 'self'") >= 0, csp);
  ok("frame-ancestors 는 meta 에 넣지 않는다", csp.indexOf("frame-ancestors") < 0, csp);

  // 정책이 막아주는 것과 별개로, 나갈 코드 자체가 없는지 소스에서도 본다.
  // CSP 가 없는 곳에서 열려도 이 약속이 코드 수준에서 지켜지게 하는 두 번째 줄이다.
  // 파일이 늘어도 빠짐없이 보도록 www/js 를 통째로 읽는다
  const jsDir = path.resolve(__dirname, "..", "www", "js");
  const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith(".js")).sort();
  const appSrc = jsFiles.map(f => fs.readFileSync(path.join(jsDir, f), "utf8")).join("\n");
  ok("www/js 에 스크립트가 있다", jsFiles.length > 0, jsFiles.join(", "));
  ["fetch(", "XMLHttpRequest", "sendBeacon", "WebSocket", "EventSource", "import("].forEach(k => {
    ok("앱 코드에 " + k + " 가 없다", appSrc.indexOf(k) < 0);
  });


  // ── 6-6. iOS 앱 껍데기 ──────────────────────────────────────────
  // 앱 안에서는 "홈 화면에 추가" 안내가 뜨면 안 된다. 이미 앱이기 때문이다.
  // 앱은 웹뷰가 뜰 때 window.__amgijwiNative 를 심어 그 사실을 알린다.
  const native = await page.evaluate(() => {
    const before = isStandalone();
    window.__amgijwiNative = true;
    const after = isStandalone();
    delete window.__amgijwiNative;
    return { before: before, after: after, restored: isStandalone() };
  });
  ok("웹에서는 그대로 브라우저로 본다", native.before === false);
  ok("앱 표시가 있으면 설치 안내를 걷는다", native.after === true);
  ok("표시를 지우면 원래대로 돌아온다", native.restored === false);

  // 앱 안에서 "브라우저" 를 말하면 안 된다. 같은 www 를 웹과 앱이 함께 쓰므로
  // 사실은 그대로 두고 말만 바꾼다. 앱에서 보이는 글에 그 낱말이 남았는지 훑는다.
  const copy = await page.evaluate(async () => {
    const seen = {};
    const sweep = () => {
      applyEnvText();
      renderHome();
      renderBackupBanner();
      renderStorageCard();
      const parts = ["#storeBanner", "#backupBanner", "#setStatus", "#pinDesc"];
      let text = parts.map(s => (document.querySelector(s) || {}).textContent || "").join(" ");
      // 숨긴 글은 화면에 없는 것이다. 보이는 것만 모은다
      document.querySelectorAll("[data-env]").forEach(el => {
        if (el.style.display === "none") text = text.split(el.textContent).join(" ");
      });
      return text;
    };
    const backup = JSON.stringify(data);
    data.backup = null;                       // 백업 권유 배너가 뜨는 상태로 만든다
    window.__amgijwiNative = true;
    seen.app = sweep();
    delete window.__amgijwiNative;
    seen.web = sweep();
    data = JSON.parse(backup);
    sweep();
    go("home");
    return seen;
  });
  ok("앱에서는 브라우저 이야기를 하지 않는다", copy.app.indexOf("브라우") < 0,
     (copy.app.match(/[^.!?]*브라우[^.!?]*/) || [""])[0].trim());
  ok("웹에서는 그대로 브라우저라고 말한다", copy.web.indexOf("브라우") >= 0);
  ok("앱에서는 앱을 지우면 사라진다고 말한다", copy.app.indexOf("앱을 지우") >= 0);

  // 표시 이름은 Swift 와 JS 두 곳에 적힌다. 한쪽만 고치면 앱에서 조용히 안내가 다시 뜬다.
  const iosDir = path.resolve(__dirname, "..", "ios");
  const swift = fs.readFileSync(path.join(iosDir, "Sources", "WebAppViewController.swift"), "utf8");
  const allJs = jsFiles.map(f => fs.readFileSync(path.resolve(__dirname, "..", "www", "js", f), "utf8")).join("\n");
  const marker = "window.__";
  const mStart = swift.indexOf(marker);
  const planted = mStart < 0 ? null
    : swift.slice(mStart + 7, swift.indexOf(" =", mStart)).trim();   // "window." 다음부터 " =" 앞까지
  ok("앱이 심는 표시 이름을 찾을 수 있다", planted !== null && planted.indexOf("__") === 0, String(planted));
  ok("앱이 심는 이름과 웹이 보는 이름이 같다",
     planted !== null && allJs.indexOf("window." + planted + " === true") >= 0,
     String(planted));

  // file:// 대신 스킴을 직접 다루는 게 localStorage 가 남는 조건이다.
  const handler = fs.readFileSync(path.join(iosDir, "Sources", "BundleSchemeHandler.swift"), "utf8");
  ok("앱이 file:// 로 페이지를 띄우지 않는다", swift.indexOf("loadFileURL") < 0);
  ok("저장소를 디스크에 남기는 설정을 쓴다", swift.indexOf("websiteDataStore = .default()") >= 0);
  ok("번들 바깥 경로를 막는다", handler.indexOf("hasPrefix(root.path") >= 0);

  // 웹 파일은 project.yml 이 폴더째 넣어준다. 빠지면 앱이 빈 화면이 된다.
  const projectYml = fs.readFileSync(path.join(iosDir, "project.yml"), "utf8");
  ok("www 폴더를 통째로 앱에 넣는다",
     projectYml.indexOf("path: ../www") >= 0 && projectYml.indexOf("type: folder") >= 0);

  // index.html 이 실제로 부르는 파일과 www/js 의 파일이 어긋나면 안 된다.
  // 나눠 두면 하나를 빠뜨리거나 지운 파일을 계속 부르는 사고가 나기 쉽다
  const html = fs.readFileSync(path.resolve(__dirname, "..", "www", "index.html"), "utf8");
  const listed = (html.match(/<script src="js\/([a-z]+)\.js\?v=\d+"><\/script>/g) || [])
    .map(t => /js\/([a-z]+)\.js/.exec(t)[1] + ".js");
  eq("index.html 이 부르는 파일과 www/js 가 일치한다", listed.slice().sort(), jsFiles);
  eq("core 를 먼저, boot 를 마지막에 부른다", [listed[0], listed[listed.length - 1]], ["core.js", "boot.js"]);

  const remote = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll("script[src], link[href], img[src]").forEach(el => {
      const u = el.getAttribute("src") || el.getAttribute("href") || "";
      if (/^(https?:)?\/\//.test(u)) bad.push(u);
    });
    return bad;
  });
  eq("외부에서 불러오는 리소스가 없다", remote, []);

  await browser.close();

  console.log("");
  console.log("통과 " + pass + " / 실패 " + fail);
  if (failures.length) {
    console.log("");
    failures.forEach(f => console.log("  ✗ " + f));
    process.exit(1);
  }
  console.log("이상 없음.");
})().catch(e => { console.error(e); process.exit(1); });
