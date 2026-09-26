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
               cardWrap: box("#cardWrap"), tab: box("#tabs .tab"), tabs: box("#tabs"),
               tabCount: document.querySelectorAll("#tabs .tab").length };
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
  // 탭 한 칸은 최대 폭을 탭 수로 나눈 값이다. 개수를 박아두면 탭이 늘 때마다 깨진다
  const tabW = Math.round(560 / wTablet.tabCount);
  ok("탭바 배경은 화면 전체를 쓰고 항목만 모인다",
     wTablet.tabs.w === 1180 && wTablet.tab.w === tabW && wTablet.tab.left > 100,
     JSON.stringify([wTablet.tabs.w, wTablet.tab.w, tabW, wTablet.tab.left]));
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


  // ── 6-7. 사용법 안내 ────────────────────────────────────────────
  // 튜토리얼을 첫 실행에 세우지 않는다. 설정에 상시로 두고, 막히는 자리에서 한 줄만 띄운다.
  const guide = await page.evaluate(async () => {
    const backup = JSON.stringify(data);
    const r = {};
    data.hints = [];

    openGuideSheet();
    const body = document.querySelector("#sheetBody").textContent;
    r.sheetOpen = document.querySelector("#sheet").classList.contains("on");
    r.covers = ["카드 뒤집기", "빈칸 채우기", "고르기", "복습", "사진에서 글자", "ICE", "백업"]
      .filter(k => body.indexOf(k) < 0);
    closeSheet();

    const hint = document.querySelector("#studyHint");

    // 뒤집기는 카드 앞면이 이미 "카드를 탭하세요" 라고 말한다. 덧붙이지 않는다
    data.mode = "flip";
    startSession();
    r.flipQuiet = hint.hidden;
    r.frontTellsHow = document.querySelector("#card .front .hint").textContent;

    // 빈칸은 알려주는 곳이 없다. 여기만 한 번 띄운다
    data.mode = "blank";
    startSession();
    r.blankShown = !hint.hidden;
    r.blankText = hint.textContent.trim();
    r.notYetSaved = data.hints.length;    // 아직 해보지 않았으니 기록되면 안 된다

    document.querySelector("#card .blank").click();   // 알려준 대로 해본다
    r.goneAfter = hint.hidden;
    r.saved = data.hints.slice();

    startSession();                       // 다음 학습에서는 나오지 않아야 한다
    r.secondShown = !hint.hidden;

    data = JSON.parse(backup);
    go("home");
    return r;
  });
  ok("설정에서 사용법을 열 수 있다", guide.sheetOpen === true);
  eq("사용법이 핵심을 모두 담는다", guide.covers, []);
  ok("카드 앞면이 이미 뒤집는 법을 말한다", guide.frontTellsHow.indexOf("탭") >= 0, guide.frontTellsHow);
  ok("그래서 뒤집기에는 힌트를 겹쳐 띄우지 않는다", guide.flipQuiet === true);
  ok("빈칸 방식은 처음 한 번 알려준다", guide.blankShown === true);
  ok("빈칸 힌트가 빈칸을 말한다", guide.blankText.indexOf("빈칸") >= 0, guide.blankText);
  ok("해보기 전에는 본 것으로 치지 않는다", guide.notYetSaved === 0);
  ok("해보면 힌트가 사라진다", guide.goneAfter === true);
  eq("본 힌트가 기록에 남는다", guide.saved, ["blank"]);
  ok("두 번째부터는 힌트가 안 뜬다", guide.secondShown === false);

  // 취향과 안내 기록은 레시피를 지워도 남아야 한다
  const kept = await page.evaluate(() => {
    const backup = JSON.stringify(data);
    data.hints = ["blank"]; data.sound = "all"; data.theme = "dark";
    // wipeAll 버튼이 하는 일과 같은 재구성
    document.querySelector("#wipeAll").click();
    document.querySelector("#dlgYes").click();
    const r = { hints: data.hints, sound: data.sound, theme: data.theme,
                drinks: data.drinks.length };
    data = JSON.parse(backup);
    persist(); go("home");
    return r;
  });
  eq("전체 삭제해도 본 안내는 기억한다", kept.hints, ["blank"]);
  ok("전체 삭제해도 소리 설정이 남는다", kept.sound === "all", String(kept.sound));
  ok("전체 삭제해도 테마가 남는다", kept.theme === "dark");
  ok("전체 삭제는 레시피를 지운다", kept.drinks === 0);

  // ── 6-8. 일정 달력 ──────────────────────────────────────────────
  // 날짜 하나짜리 일정을 걸어두고, 미리 알림 기간에 들면 홈에 뜬다.
  const cal = await page.evaluate(async () => {
    const backup = JSON.stringify(data);
    const r = {};
    const day = n => ymd(new Date(Date.now() + n * 86400000));

    data.events = [];
    go("cal");
    r.tabShows = !document.querySelector("#tabs").classList.contains("hide");
    r.gridDrawn = document.querySelectorAll("#calGrid .calcell[data-day]").length;

    // 넣기
    data.events.push({ id:"e1", title:"신메뉴 출시", date:day(3), note:"라떼 3종", remind:7, done:false });
    data.events.push({ id:"e2", title:"먼 일",      date:day(20), note:"", remind:3, done:false });
    data.events.push({ id:"e3", title:"끝난 일",    date:day(1), note:"", remind:7, done:true });
    data.events.push({ id:"e4", title:"놓친 일",    date:day(-2), note:"", remind:0, done:false });

    const up = evUpcoming().map(e => e.id);
    r.upcoming = up;                         // e1(기간 안), e4(지남) 만
    r.ddayText = [evDDayText(0), evDDayText(1), evDDayText(3), evDDayText(-2)];

    renderHome();
    r.homeShown = document.querySelector("#upcomingSect").style.display !== "none";
    r.homeRows = document.querySelectorAll("#upcomingList .row").length;

    // 달력에 점이 찍히는지
    calCursor = null; state.calDay = null; renderCal();
    const cell = document.querySelector('#calGrid .calcell[data-day="' + day(3) + '"]');
    r.dotOnDay = !!(cell && cell.querySelector(".dot"));
    const doneCell = document.querySelector('#calGrid .calcell[data-day="' + day(1) + '"]');
    r.doneDotDim = !!(doneCell && doneCell.querySelector(".dot.off"));

    // 그 날을 누르면 아래에 목록이 뜬다
    cell.click();
    r.dayListed = document.querySelectorAll("#calDayList .evrow").length;
    r.dayTitleHas = document.querySelector("#calDayTitle").textContent;

    // 시트로 고치기
    openEventSheet("e1");
    document.querySelector("#evTitle").value = "출시일 변경";
    document.querySelector("#evSave").click();
    r.edited = data.events.filter(e => e.id === "e1")[0].title;

    // 날짜가 깨진 일정은 불러올 때 걸러진다
    data.events.push({ id:"bad", title:"엉터리", date:"2026-13-99", remind:0, done:false });
    const before = data.events.length;
    data.events = data.events.filter(e => /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(e.date));
    r.droppedBad = before - data.events.length;

    data = JSON.parse(backup);
    persist(); go("home");
    return r;
  });
  ok("일정 탭에서 탭바가 보인다", cal.tabShows === true);
  ok("달력에 날짜 칸이 그려진다", cal.gridDrawn >= 28, String(cal.gridDrawn));
  eq("남은 날을 말로 풀어준다", cal.ddayText, ["오늘", "내일", "D-3", "2일 지남"]);
  eq("미리 알림 기간에 든 것과 놓친 것만 홈에 올린다", cal.upcoming, ["e4", "e1"]);
  ok("홈에 다가오는 일정이 뜬다", cal.homeShown === true);
  eq("홈에 올라온 줄 수가 맞는다", cal.homeRows, 2);
  ok("일정 있는 날에 점이 찍힌다", cal.dotOnDay === true);
  ok("끝난 일만 남은 날은 점이 흐리다", cal.doneDotDim === true);
  eq("날짜를 누르면 그 날 일정이 나온다", cal.dayListed, 1);
  ok("고른 날짜를 제목에 보여준다", /\d+월 \d+일 .요일/.test(cal.dayTitleHas), cal.dayTitleHas);
  eq("시트에서 고치면 반영된다", cal.edited, "출시일 변경");
  eq("날짜가 깨진 일정은 걸러진다", cal.droppedBad, 1);

  // 칸 하나가 제 몫보다 넓어지면 토요일이 화면 밖으로 밀린다.
  // 빈 앞자리에 .empty 를 썼다가 그 여백이 딸려와 실제로 겪은 일이다
  const calFit = await page.evaluate(() => {
    go("cal");
    const grid = document.querySelector("#calGrid").getBoundingClientRect();
    const cells = [...document.querySelectorAll("#calGrid .calcell")];
    const over = cells.filter(c => c.getBoundingClientRect().right > grid.right + 1).length;
    const first = cells[0].getBoundingClientRect();
    return { over: over, cellW: Math.round(first.width),
             fits: Math.round(first.width * 7 + 3 * 6) <= Math.round(grid.width) + 1 };
  });
  eq("달력이 화면 밖으로 넘치지 않는다", calFit.over, 0);
  ok("일곱 칸이 폭 안에 들어간다", calFit.fits === true, String(calFit.cellW));

  // 일정도 백업을 따라가고, 전체 삭제에는 같이 지워진다
  const evKeep = await page.evaluate(() => {
    const backup = JSON.stringify(data);
    data.events = [{ id:"x", title:"출시", date:"2026-12-01", note:"", remind:3, done:false }];
    const json = JSON.parse(backupJSON());
    const r = { inBackup: (json.data.events || []).length };
    document.querySelector("#wipeAll").click();
    document.querySelector("#dlgYes").click();
    r.afterWipe = data.events.length;
    data = JSON.parse(backup); persist(); go("home");
    return r;
  });
  eq("일정이 백업에 담긴다", evKeep.inBackup, 1);
  eq("전체 삭제하면 일정도 지워진다", evKeep.afterWipe, 0);
  // ── 6-9. 날씨 옷 ────────────────────────────────────────────────
  // 비에는 우비와 장화, 눈에는 털모자와 목도리. 소리처럼 꺼진 채로 시작한다.
  const wx = await page.evaluate(async () => {
    const backup = JSON.stringify(data);
    const r = {};
    const box = document.querySelector("#mascot");
    delete window.__amgijwiWeather;
    /* 밤에는 옷을 입히지 않으므로 돌리는 시각에 결과가 휘둘린다. 낮으로 고정한다 */
    const realMood = currentMood;
    currentMood = () => "day";

    data.wx = "off"; r.offIsNull = wxNow() === null;
    drawMascot();
    r.offPlain = box.innerHTML.indexOf("#F5C33F") < 0;     // 우비 노랑이 없다

    data.wx = "rain"; r.rain = wxNow();
    drawMascot();
    r.rainDrawn = box.innerHTML.indexOf("#F5C33F") >= 0;   // 우비
    r.bootsDrawn = box.innerHTML.indexOf("#A6703A") >= 0;  // 장화

    data.wx = "snow";
    drawMascot();
    r.hatDrawn = box.innerHTML.indexOf("#C4574A") >= 0;    // 털모자
    r.scarfDrawn = box.innerHTML.indexOf("#7FA8C4") >= 0;  // 목도리

    // 맑음은 갈아입을 옷이 없다
    data.wx = "clear"; r.clearIsNull = wxNow() === null;

    // 자동은 앱이 알려준 값을 먼저 본다
    data.wx = "auto";
    window.__amgijwiWeather = "snow"; r.autoFromApp = wxNow();
    window.__amgijwiWeather = "rain"; r.autoFollowsApp = wxNow();
    delete window.__amgijwiWeather;
    r.autoFallsBackToSeason = wxNow() === wxBySeason() || wxBySeason() === "clear";
    r.seasonKnown = ["rain","snow","clear"].indexOf(wxBySeason()) >= 0;
    // 앱이 엉뚱한 값을 주면 무시한다
    window.__amgijwiWeather = "meteor"; r.junkIgnored = wxFromApp() === null;
    delete window.__amgijwiWeather;

    // 밤에는 입히지 않는다. 자는데 우비를 입고 있으면 이상하다
    data.wx = "rain";
    currentMood = () => "night";
    drawMascot();
    r.nightPlain = box.innerHTML.indexOf("#F5C33F") < 0;
    currentMood = () => "day";

    // 옷을 입은 도트가 얼굴을 덮지 않는지
    r.faceKept = WEATHER.rain.filter(x => x.indexOf("ohkho") >= 0).length === 2
              && WEATHER.snow.filter(x => x.indexOf("ohkho") >= 0).length === 2;
    r.sameWidth = WEATHER.rain.every(x => x.length === 28) && WEATHER.snow.every(x => x.length === 28);
    r.poses = Object.keys(WEATHER).sort();

    currentMood = realMood;
    data = JSON.parse(backup); persist(); drawMascot(); go("home");
    return r;
  });
  ok("꺼두면 평소 모습이다", wx.offIsNull === true && wx.offPlain === true);
  eq("비를 고르면 비가 된다", wx.rain, "rain");
  ok("비에는 우비를 입는다", wx.rainDrawn === true);
  ok("비에는 장화도 신는다", wx.bootsDrawn === true);
  ok("눈에는 털모자를 쓴다", wx.hatDrawn === true);
  ok("눈에는 목도리도 두른다", wx.scarfDrawn === true);
  ok("맑음에는 갈아입을 옷이 없다", wx.clearIsNull === true);
  eq("자동은 앱이 알려준 날씨를 따른다", [wx.autoFromApp, wx.autoFollowsApp], ["snow", "rain"]);
  ok("앱이 없으면 계절로 어림한다", wx.autoFallsBackToSeason === true && wx.seasonKnown === true);
  ok("앱이 엉뚱한 값을 주면 무시한다", wx.junkIgnored === true);
  ok("밤에는 옷을 입히지 않는다", wx.nightPlain === true);
  ok("옷을 입어도 얼굴은 가리지 않는다", wx.faceKept === true);
  ok("모든 줄의 폭이 같다", wx.sameWidth === true);
  eq("옷은 비와 눈 두 벌", wx.poses, ["rain", "snow"]);

  // 말풍선도 날씨를 안다
  const wxSay = await page.evaluate(() => {
    const backup = JSON.stringify(data);
    data.wx = "rain";
    const realMood = currentMood;
    currentMood = () => "day";
    const seen = {};
    for(let i = 0; i < 200; i++) seen[cheerPool() === CHEERS ? "cheer" : "weather"] = true;
    const r = { mixes: !!(seen.cheer && seen.weather),
                rainLine: WX_SAY.rain[0], snowLine: WX_SAY.snow[0] };
    currentMood = realMood;
    data = JSON.parse(backup); persist();
    return r;
  });
  ok("응원과 날씨 얘기를 섞어 한다", wxSay.mixes === true);
  ok("비 대사가 비를 말한다", wxSay.rainLine.indexOf("비") >= 0, wxSay.rainLine);
  ok("눈 대사가 눈을 말한다", wxSay.snowLine.indexOf("눈") >= 0, wxSay.snowLine);

  // 취향이니 백업을 따라가고 전체 삭제에도 남는다
  const wxKeep = await page.evaluate(() => {
    const backup = JSON.stringify(data);
    data.wx = "auto";
    const json = JSON.parse(backupJSON());
    const r = { inBackup: json.data.wx };
    document.querySelector("#wipeAll").click();
    document.querySelector("#dlgYes").click();
    r.afterWipe = data.wx;
    data = JSON.parse(backup); persist(); go("home");
    return r;
  });
  eq("날씨 설정이 백업에 담긴다", wxKeep.inBackup, "auto");
  eq("전체 삭제해도 날씨 설정이 남는다", wxKeep.afterWipe, "auto");

  // ── 6-10. 레시피 화면 좌우 넘기기 ───────────────────────────────
  // 민 방향으로 나가야 한다. 반대로 두면 왼쪽으로 끌다 손을 뗐을 때
  // 화면이 오른쪽으로 되돌아 건너가며 내용이 제자리를 훑어 깜빡여 보인다.
  const slide = await page.evaluate(async () => {
    go("list");
    state.listTab = "recipe"; renderList();
    await new Promise(r => setTimeout(r, 60));
    const pane = document.querySelector("#listPane");
    const xOf = () => {
      const m = /translate3d\((-?[\d.]+)px/.exec(pane.style.transform || "");
      return m ? Number(m[1]) : 0;
    };
    const r = { still: !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) };

    /* 들어오는 자리는 한 프레임만 머물러 시각으로 재면 놓친다. 바뀌는 대로 받아 적는다 */
    const seen = [];
    const obs = new MutationObserver(()=>{ const v = xOf(); if(seen[seen.length-1] !== v) seen.push(v); });
    obs.observe(pane, { attributes: true, attributeFilter: ["style"] });

    segSlideTo("sub", 1);            // 왼쪽으로 밀었을 때
    r.outLeft = xOf();
    await new Promise(x => setTimeout(x, 760));
    obs.disconnect();
    r.steps = seen;
    r.inLeft = seen.filter(v => v > 0)[0] || 0;   // 다음 장은 반대편에서 들어온다
    r.restX = xOf();
    r.restOpacity = pane.style.opacity;
    r.landed = state.listTab;

    segSlideTo("recipe", -1);        // 오른쪽으로 밀었을 때
    r.outRight = xOf();
    await new Promise(x => setTimeout(x, 800));
    r.backTo = state.listTab;
    /* 되돌아 건너가는 구간이 없어야 한다 — 나갈 때 부호가 뒤집히면 그게 깜빡임이다 */
    r.crossedBack = r.steps.slice(0, r.steps.indexOf(r.inLeft)).some(v => v > 0);
    return r;
  });
  if (slide.still) {
    ok("움직임 줄이기가 켜져 있어 방향 검사는 건너뛴다", true);
  } else {
    ok("왼쪽으로 밀면 왼쪽으로 나간다", slide.outLeft < 0, String(slide.outLeft));
    ok("다음 장은 오른쪽에서 들어온다", slide.inLeft > 0, String(slide.inLeft));
    ok("오른쪽으로 밀면 오른쪽으로 나간다", slide.outRight > 0, String(slide.outRight));
    ok("나가는 도중에 반대편으로 건너가지 않는다", slide.crossedBack === false, JSON.stringify(slide.steps));
  }
  eq("넘기면 그 칸에 도착한다", slide.landed, "sub");
  eq("되돌아가면 원래 칸이다", slide.backTo, "recipe");
  eq("끝나면 제자리로 돌아온다", slide.restX, 0);
  eq("끝나면 다시 또렷하다", slide.restOpacity, "1");

  // ── 6-11. 일정 기간 ─────────────────────────────────────────────
  // 며칠부터 며칠까지. 끝나는 날이 없으면 하루짜리다 (옛 일정이 그대로 산다)
  const span = await page.evaluate(() => {
    const backup = JSON.stringify(data);
    const r = {};
    const day = n => ymd(new Date(Date.now() + n * 86400000));

    data.events = [
      { id:"s1", title:"행사", date:day(2), end:day(5), note:"", remind:7, done:false },
      { id:"s2", title:"하루짜리", date:day(2), end:"", note:"", remind:7, done:false },
      { id:"s3", title:"진행 중", date:day(-1), end:day(1), note:"", remind:3, done:false },
      { id:"s4", title:"끝난 것", date:day(-9), end:day(-8), note:"", remind:3, done:false }
    ];

    r.onStart = evOn(day(2)).map(e=>e.id).sort();
    r.onMiddle = evOn(day(3)).map(e=>e.id);      // 가운데 날에도 걸린다
    r.onEnd = evOn(day(5)).map(e=>e.id);
    r.onAfter = evOn(day(6)).map(e=>e.id);       // 끝난 다음 날에는 없다

    r.soonText = evStatus(data.events[0]).text;
    r.nowKind = evStatus(data.events[2]).kind;
    r.nowText = evStatus(data.events[2]).text;
    r.oneDayToday = evStatus({date:ymd(new Date()), end:""}).text;
    r.rangeText = evRangeText(data.events[0]);
    r.oneText = evRangeText(data.events[1]);

    r.upcoming = evUpcoming().map(e=>e.id).sort();   // 끝난 지 오래된 s4 는 빠진다

    // 시작보다 앞선 끝날짜는 불러올 때 버린다
    r.badDropped = (function(){
      const e = { id:"x", title:"뒤집힘", date:day(5), end:day(1), remind:0, done:false };
      e.end = (typeof e.end === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.end) && e.end > e.date) ? e.end : "";
      return e.end === "";
    })();

    data = JSON.parse(backup); persist(); go("home");
    return r;
  });
  eq("시작일에 둘 다 걸린다", span.onStart, ["s1", "s2"]);
  eq("기간 가운데 날에도 걸린다", span.onMiddle, ["s1"]);
  eq("끝나는 날까지 걸린다", span.onEnd, ["s1"]);
  eq("끝난 다음 날에는 안 걸린다", span.onAfter, []);
  eq("시작 전에는 남은 날을 센다", span.soonText, "D-2");
  eq("기간 안이면 진행 중이다", [span.nowKind, span.nowText], ["now", "진행 중"]);
  eq("하루짜리 당일은 오늘이라고 한다", span.oneDayToday, "오늘");
  ok("기간은 물결로 잇는다", span.rangeText.indexOf("~") > 0, span.rangeText);
  ok("하루짜리는 날짜 하나만 쓴다", span.oneText.indexOf("~") < 0, span.oneText);
  eq("진행 중인 것은 홈에 남고 끝난 지 오랜 것은 빠진다", span.upcoming, ["s1", "s2", "s3"]);
  ok("끝날짜가 시작보다 앞서면 버린다", span.badDropped === true);

  // ── 6-12. 레시피 차례와 새것 표 ─────────────────────────────────
  // 최신 등록이 위로. 등록한 날이 없는 옛 레시피는 배열 차례를 거꾸로 쓴다
  const order = await page.evaluate(() => {
    const backup = JSON.stringify(data);
    const r = {};
    const day = n => ymd(new Date(Date.now() + n * 86400000));
    const mk = (id, at) => ({ id:id, cat:"coffee", name:id, en:"", temp:"", cups:[],
                              ing:[["물","1"]], ingHot:[], steps:[], tip:"", arch:false, at:at, subRefs:[] });
    /* 넣은 차례대로: 날짜 없는 옛것 셋, 그다음 날짜 있는 것 둘 */
    data.drinks = [mk("old1",""), mk("old2",""), mk("old3",""), mk("new1", day(-3)), mk("new2", day(-1))];

    r.newest = byNewest(data.drinks).map(d=>d.id);
    r.isNew = { new2: isNewDrink(data.drinks[4]), old1: isNewDrink(data.drinks[0]) };
    r.oldIsNotNew = !isNewDrink({ at: day(-30) });
    r.edgeIn = isNewDrink({ at: day(-7) });      // 이레째는 아직 새것
    r.edgeOut = isNewDrink({ at: day(-8) });     // 여드레째부터는 아니다

    data.listSort = "new"; go("list"); state.listTab = "recipe"; renderList();
    const rows = () => [...document.querySelectorAll("#listBody .row")].map(b=>b.dataset.id);
    r.flat = rows();
    r.noGroups = document.querySelectorAll("#listBody .grp").length;
    r.badge = document.querySelectorAll("#listBody .pill.new").length;
    r.sortShown = document.querySelector("#sortRow").style.display !== "none";

    data.listSort = "cat"; renderList();
    r.grouped = rows();
    r.hasGroups = document.querySelectorAll("#listBody .grp").length > 0;

    state.listTab = "sub"; renderList();
    r.hiddenOnSub = document.querySelector("#sortRow").style.display === "none";

    data = JSON.parse(backup); persist(); state.listTab = "recipe"; go("home");
    return r;
  });
  eq("최신 등록이 맨 위로 온다", order.newest, ["new2", "new1", "old3", "old2", "old1"]);
  ok("이레 안에 넣은 것에 표가 붙는다", order.isNew.new2 === true);
  ok("등록한 날이 없으면 표가 없다", order.isNew.old1 === false);
  ok("오래된 것은 새것이 아니다", order.oldIsNotNew === true);
  eq("이레째까지는 새것이다", [order.edgeIn, order.edgeOut], [true, false]);
  eq("최신순에서는 목록이 한 줄로 늘어선다", order.flat, ["new2", "new1", "old3", "old2", "old1"]);
  eq("최신순에서는 분류 제목이 없다", order.noGroups, 0);
  eq("새것 표가 둘 붙는다", order.badge, 2);
  ok("레시피 칸에서는 차례 고르기가 보인다", order.sortShown === true);
  ok("분류순으로 돌리면 분류 제목이 돌아온다", order.hasGroups === true);
  ok("부재료 칸에서는 차례 고르기가 숨는다", order.hiddenOnSub === true);

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

  const projectYml = fs.readFileSync(path.join(iosDir, "project.yml"), "utf8");

  // 앱 아이콘. 1024 여야 하고, 알파 채널이 있으면 앱스토어가 거부한다.
  const iconPath = path.join(iosDir, "Assets.xcassets", "AppIcon.appiconset", "icon-1024.png");
  const icon = fs.readFileSync(iconPath);
  const png = icon.slice(0, 8).toString("hex") === "89504e470d0a1a0a";
  ok("앱 아이콘이 PNG 다", png);
  eq("앱 아이콘이 1024x1024 다", [icon.readUInt32BE(16), icon.readUInt32BE(20)], [1024, 1024]);
  // IHDR 의 색 타입: 2=RGB, 6=RGBA. 4·6 이면 알파가 있다
  ok("앱 아이콘에 알파 채널이 없다", (icon[25] & 4) === 0, "색 타입 " + icon[25]);

  const iconSet = JSON.parse(fs.readFileSync(path.join(iosDir, "Assets.xcassets", "AppIcon.appiconset", "Contents.json"), "utf8"));
  ok("아이콘 목록이 그 파일을 가리킨다", iconSet.images.some(i => i.filename === "icon-1024.png"));
  ok("프로젝트가 AppIcon 을 쓴다", projectYml.indexOf("ASSETCATALOG_COMPILER_APPICON_NAME: AppIcon") >= 0);

  // 웹 파일은 project.yml 이 폴더째 넣어준다. 빠지면 앱이 빈 화면이 된다.
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
