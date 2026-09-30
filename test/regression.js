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

    // 달력에 점이 찍히는지. 오늘이 말일에 가까우면 사흘 뒤가 다음 달이라
    // 이번 달 격자에는 그 칸이 없다. 보는 달을 날짜에 맞춰 옮겨 놓고 찾는다
    const cellOn = d => {
      calCursor = {y:Number(d.slice(0,4)), m:Number(d.slice(5,7)) - 1};
      state.calDay = null; renderCal();
      return document.querySelector('#calGrid .calcell[data-day="' + d + '"]');
    };
    // 일정 있는 날에는 그 일정의 막대가 그 날을 덮는다
    const barOn = (id, d) => [...document.querySelectorAll('#calGrid .calbar[data-ev="' + id + '"]')]
      .filter(b => b.dataset.from <= d && d <= b.dataset.to)[0];
    cellOn(day(3));
    const bar1 = barOn("e1", day(3));
    r.dotOnDay = !!bar1 && bar1.textContent.indexOf("신메뉴") >= 0;
    cellOn(day(1));
    const bar3 = barOn("e3", day(1));
    r.doneDotDim = !!bar3 && bar3.classList.contains("done");

    // 그 날을 누르면 아래에 목록이 뜬다
    cellOn(day(3)).click();
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
  ok("일정 있는 날에 이름이 든 막대가 그려진다", cal.dotOnDay === true);
  ok("끝난 일은 막대가 흐리다", cal.doneDotDim === true);
  eq("날짜를 누르면 그 날 일정이 나온다", cal.dayListed, 1);
  ok("고른 날짜를 제목에 보여준다", /\d+월 \d+일 .요일/.test(cal.dayTitleHas), cal.dayTitleHas);
  eq("시트에서 고치면 반영된다", cal.edited, "출시일 변경");
  eq("날짜가 깨진 일정은 걸러진다", cal.droppedBad, 1);

  // ── 6-8b. 달력 막대 ─────────────────────────────────────────────
  // 며칠짜리 일정은 한 줄로 이어지고, 주·달을 넘으면 끝을 잘라 이어짐을 보인다.
  // 2026년 10월은 목요일에 시작한다(첫 주: 1~3일, 둘째 주: 4~10일 …)
  const bars = await page.evaluate(() => {
    const backup = JSON.stringify(data);
    const r = {};
    data.events = [
      { id:"b1", title:"월말 마감",    date:"2026-09-29", end:"2026-10-02", note:"", remind:0, done:false },
      { id:"b2", title:"가을 음료 교육", date:"2026-10-05", end:"2026-10-09", note:"", remind:0, done:false },
      { id:"b3", title:"재고 조사",    date:"2026-10-09", end:"",           note:"", remind:0, done:false },
      { id:"b4", title:"원두 입고",    date:"2026-10-09", end:"",           note:"", remind:0, done:false },
      { id:"b5", title:"할로윈",       date:"2026-10-23", end:"2026-10-27", note:"", remind:0, done:false },
      { id:"b6", title:"위생 점검",    date:"2026-10-15", end:"",           note:"", remind:0, done:true }
    ];
    go("cal");
    calCursor = { y:2026, m:9 }; state.calDay = null; renderCal();
    const seg = id => [...document.querySelectorAll('#calGrid .calbar[data-ev="' + id + '"]')];
    const cls = b => (b.classList.contains("l") ? "l" : "") + (b.classList.contains("r") ? "r" : "");
    r.weeks = document.querySelectorAll("#calGrid .calweek").length;
    r.b1 = seg("b1").map(b => [b.dataset.from, b.dataset.to, cls(b)]);
    r.b2 = seg("b2").map(b => [b.style.gridColumn.replace(/\s/g, ""), b.style.gridRow, b.textContent]);
    r.b5 = seg("b5").map(b => [b.dataset.from, b.dataset.to, cls(b)]);
    r.done = seg("b6").map(b => b.classList.contains("done"));
    r.more = [...document.querySelectorAll("#calGrid .calmore")].map(m => [m.dataset.day, m.textContent]);
    // 막대를 눌러도 그 아래 날짜가 골라진다
    const b2 = seg("b2")[0].getBoundingClientRect();
    const hit = document.elementFromPoint(b2.left + b2.width * 0.7, b2.top + b2.height / 2);
    const cell = hit && hit.closest(".calcell");
    if (cell) cell.click();
    r.clickDay = cell ? cell.dataset.day : null;
    r.picked = state.calDay;
    r.listed = document.querySelectorAll("#calDayList .evrow").length;
    // 고른 날은 숫자에만 표시한다. 칸 전체에 상자를 그리면 기간 막대가 그 상자를 뚫고 지나가 끊겨 보인다
    const selCell = document.querySelector("#calGrid .calcell.sel");
    const cs = selCell && getComputedStyle(selCell), ns = selCell && getComputedStyle(selCell.querySelector(".n"));
    r.selMark = selCell ? [cs.boxShadow, cs.backgroundColor, ns.backgroundColor !== "rgba(0, 0, 0, 0)"] : null;
    // 고른 날 표시와 그 아래 첫 막대 사이에 틈이 있어야 한다(붙으면 표시가 막대에 올라탄 것처럼 보인다)
    const firstBar = selCell && selCell.closest(".calweek").querySelector(".calbar");
    r.selGap = firstBar ? Math.round(firstBar.getBoundingClientRect().top - selCell.querySelector(".n").getBoundingClientRect().bottom) : null;
    // 이름이 긴 하루짜리도 칸 밖으로 넘치지 않는다
    const w = document.querySelector("#calGrid .calweek").getBoundingClientRect().width;
    r.fits = [...document.querySelectorAll("#calGrid .calbar")].every(b => b.getBoundingClientRect().width <= w + 1);
    data = JSON.parse(backup); calCursor = null; state.calDay = null; persist(); go("home");
    return r;
  });
  eq("10월은 다섯 주로 그린다", bars.weeks, 5);
  eq("지난달에서 넘어온 일정은 왼쪽을 잘라 이어 그린다", bars.b1, [["2026-10-01", "2026-10-02", "l"]]);
  eq("닷새짜리 일정은 한 줄 막대 하나다", bars.b2, [["2/7", "2", "가을 음료 교육"]]);
  eq("주를 넘는 일정은 두 조각으로 이어진다", bars.b5, [["2026-10-23", "2026-10-24", "r"], ["2026-10-25", "2026-10-27", "l"]]);
  eq("끝난 일 막대는 흐리다", bars.done, [true]);
  eq("두 줄을 넘는 날은 +n 으로 센다", bars.more, [["2026-10-09", "+1"]]);
  ok("막대 위를 눌러도 그 날짜가 골라진다", bars.clickDay !== null && bars.picked === bars.clickDay, String(bars.clickDay));
  eq("고른 날의 일정이 모두 목록에 나온다", bars.listed, bars.clickDay === "2026-10-09" ? 3 : 1);
  ok("막대가 달력 폭을 넘지 않는다", bars.fits === true);
  eq("고른 날은 칸이 아니라 숫자에만 표시한다", bars.selMark, ["none", "rgba(0, 0, 0, 0)", true]);
  ok("고른 날 표시와 막대 사이에 틈이 있다", bars.selGap !== null && bars.selGap >= 3, String(bars.selGap));

  // ── 6-9. 일정 알림 (iOS 앱) ─────────────────────────────────────
  // 무엇을 언제 보낼지는 웹이 정하고 앱은 예약만 한다. 웹에는 알림 칸이 없다.
  const alm = await page.evaluate(async () => {
    const backup = JSON.stringify(data);
    const r = {};
    const at = d => d.getMonth() + 1 + "/" + d.getDate() + " " + d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
    const now = new Date(2026, 9, 1, 8, 0);   // 10월 1일 오전 8시
    const ev = { id:"a1", title:"신메뉴 출시", date:"2026-10-05", note:"", remind:3, alarm:true, alarmAt:"09:00", done:false };

    // 언제 가나
    r.twoShots = alarmShots(ev, now).map(s => [s.n, at(s.at)]);
    r.sameDay = alarmShots(Object.assign({}, ev, { remind:0 }), now).map(s => s.n);
    r.done = alarmShots(Object.assign({}, ev, { done:true }), now).length;
    r.off = alarmShots(Object.assign({}, ev, { alarm:false }), now).length;
    r.oldData = alarmShots({ id:"o", title:"옛 일정", date:"2026-10-05", remind:3, done:false }, now).length;
    r.pastSkipped = alarmShots(ev, new Date(2026, 9, 2, 10, 0)).map(s => s.n);
    r.badTime = [alarmTime({}), alarmTime({ alarmAt:"25:00" }), alarmTime({ alarmAt:"14:30" })];

    // 쥐돌이 말투
    r.text = [3, 1, 0].map(n => alarmText(ev, n));
    r.noteBody = alarmText(Object.assign({}, ev, { note:"라떼 3종" }), 3).body;
    r.clock = [alarmClock(new Date(2026, 9, 1, 9, 0)), alarmClock(new Date(2026, 9, 1, 14, 5)), alarmClock(new Date(2026, 9, 1, 0, 30))];

    // 앱에 넘기는 목록 — 가까운 것부터, iOS 한도까지만
    data.events = [];
    for (let i = 0; i < 40; i++) {
      data.events.push({ id:"m" + i, title:"일정 " + i, date:ymd(new Date(2026, 9, 10 + i)), note:"", remind:1, alarm:true, alarmAt:"09:00", done:false });
    }
    const plan = alarmPlan(now);
    r.planLen = plan.length;
    r.planSorted = plan.every((p, i) => i === 0 || plan[i - 1].at <= p.at);
    r.planStamp = plan.every(p => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(p.at));
    r.planFirst = plan[0];

    // 웹: 알림 칸도, 앱으로 가는 메시지도 없다
    data.events = [];
    openEventSheet(null);
    r.webField = !!document.querySelector("#evAlarm");
    closeSheet();
    let threw = false;
    try { syncAlarms(); alarmPost({ op:"status" }); } catch (e) { threw = true; }
    r.webQuiet = !threw;

    // 앱: 통로를 흉내 낸다
    const posted = [];
    window.__amgijwiNative = true;
    window.webkit = { messageHandlers: { amgijwiAlarm: { postMessage: m => posted.push(JSON.parse(JSON.stringify(m))) } } };
    alarmPerm = "unknown";
    openEventSheet(null);
    r.appField = !!document.querySelector("#evAlarm");
    r.startsOff = document.querySelector('#evAlarm [data-al="0"]').classList.contains("on");
    r.noTimeWhenOff = !document.querySelector("#evAlAt");
    r.noAskYet = posted.filter(m => m.op === "ask").length;
    document.querySelector('#evAlarm [data-al="1"]').click();
    r.askedOnce = posted.filter(m => m.op === "ask").length;
    r.defaultTime = (document.querySelector("#evAlAt") || {}).value;
    document.querySelector("#evDate").value = ymd(new Date(Date.now() + 10 * 86400000));
    document.querySelector("#evDate").dispatchEvent(new Event("change"));
    r.infoLines = document.querySelectorAll("#evAlInfo .okbox b").length;
    alarmStatusFromApp("denied");
    r.deniedNote = !!document.querySelector("#evAlInfo .alarmnote");
    // 거절했다가 설정 앱에서 허용하고 돌아온 경우. 다시 켜도 또 묻지 않는다
    alarmStatusFromApp("granted");
    r.grantedInfo = !!document.querySelector("#evAlInfo .okbox");
    document.querySelector('#evAlarm [data-al="0"]').click();
    document.querySelector('#evAlarm [data-al="1"]').click();
    r.askedStillOnce = posted.filter(m => m.op === "ask").length;
    document.querySelector("#evTitle").value = "알림 켠 일정";
    const t = document.querySelector("#evAlAt");
    t.value = "07:30"; t.dispatchEvent(new Event("change"));
    document.querySelector("#evSave").click();
    const saved = data.events.filter(e => e.title === "알림 켠 일정")[0] || {};
    r.saved = [saved.alarm, saved.alarmAt];
    const lastSync = posted.filter(m => m.op === "sync").pop() || { items:[] };
    r.syncItems = lastSync.items.map(i => [i.title, i.at.slice(11)]);

    // 끝난 일로 표시하면 예약이 빠진다
    saved.done = true; syncAlarms();
    r.afterDone = (posted.filter(m => m.op === "sync").pop() || { items:[1] }).items.length;

    delete window.webkit;
    delete window.__amgijwiNative;
    alarmPerm = "unknown";
    closeSheet();
    data = JSON.parse(backup);
    persist(); go("home");
    return r;
  });
  eq("며칠 전 날과 당일, 두 번 간다", alm.twoShots, [[3, "10/2 9:00"], [0, "10/5 9:00"]]);
  eq("며칠 전이 당일이면 한 번만 간다", alm.sameDay, [0]);
  eq("끝난 일정에는 알림이 없다", alm.done, 0);
  eq("알림을 안 켠 일정에는 알림이 없다", alm.off, 0);
  eq("옛 일정(값 없음)은 꺼진 것으로 읽는다", alm.oldData, 0);
  eq("이미 지난 시각은 건너뛴다", alm.pastSkipped, [0]);
  eq("시각이 없거나 깨졌으면 오전 9시로 읽는다", alm.badTime, ["09:00", "09:00", "14:30"]);
  eq("알림 제목은 쥐돌이 말투다", alm.text.map(t => t.title),
     ["3일 남았츄 · 신메뉴 출시", "내일이츄 · 신메뉴 출시", "오늘이츄! · 신메뉴 출시"]);
  eq("메모가 없으면 쥐돌이 한마디가 들어간다", alm.text.map(t => t.body),
     ["슬슬 준비해보자츄", "슬슬 준비해보자츄", "잊지 말고 챙기자츄"]);
  eq("메모가 있으면 메모가 들어간다", alm.noteBody, "라떼 3종");
  eq("시각을 오전·오후로 읽어준다", alm.clock, ["오전 9:00", "오후 2:05", "오전 12:30"]);
  eq("iOS 한도(64개)까지만 넘긴다", alm.planLen, 64);
  ok("가까운 것부터 넘긴다", alm.planSorted === true);
  ok("시각은 YYYY-MM-DDTHH:MM 로 넘긴다", alm.planStamp === true);
  eq("가장 가까운 알림이 맨 앞이다", alm.planFirst, { id:"m0-1", at:"2026-10-09T09:00", title:"내일이츄 · 일정 0", body:"슬슬 준비해보자츄" });
  ok("웹에서는 알림 칸이 없다", alm.webField === false);
  ok("웹에서는 앱으로 보내는 것이 조용히 넘어간다", alm.webQuiet === true);
  ok("앱에서는 알림 칸이 생긴다", alm.appField === true);
  ok("새 일정은 알림이 꺼진 채로 시작한다", alm.startsOff === true);
  ok("꺼져 있으면 시각 칸이 없다", alm.noTimeWhenOff === true);
  eq("시트를 열기만 해서는 권한을 묻지 않는다", alm.noAskYet, 0);
  eq("처음 켤 때 권한을 묻는다", alm.askedOnce, 1);
  eq("켜면 오전 9시가 들어가 있다", alm.defaultTime, "09:00");
  eq("알림이 오는 때를 두 줄로 보여준다", alm.infoLines, 2);
  ok("거절하면 설정 앱 안내가 뜬다", alm.deniedNote === true);
  ok("허용으로 바뀌면 안내가 알림 시각으로 돌아온다", alm.grantedInfo === true);
  eq("답을 받은 뒤에는 다시 묻지 않는다", alm.askedStillOnce, 1);
  eq("알림 켜짐과 시각이 저장된다", alm.saved, [true, "07:30"]);
  eq("저장하면 앱에 예약 목록을 보낸다", alm.syncItems,
     [["3일 남았츄 · 알림 켠 일정", "07:30"], ["오늘이츄! · 알림 켠 일정", "07:30"]]);
  eq("끝난 일로 표시하면 예약에서 빠진다", alm.afterDone, 0);

  // 통로 이름·함수 이름·한도가 Swift 와 JS 두 곳에 적힌다. 한쪽만 고치면 알림이 조용히 안 온다
  {
    const src = f => fs.readFileSync(path.resolve(__dirname, "..", f), "utf8");
    const bridge = src("ios/Sources/AlarmBridge.swift");
    const vc = src("ios/Sources/WebAppViewController.swift");
    const calJs = src("www/js/cal.js");
    const pick = re => (re.exec(bridge) || [])[1];
    const hName = pick(/static let name = "([^"]+)"/);
    const fName = pick(/static let reply = "([^"]+)"/);
    const limit = pick(/static let limit = (\d+)/);
    ok("앱의 통로 이름을 웹이 부른다", !!hName && calJs.indexOf("messageHandlers." + hName) >= 0, String(hName));
    ok("앱이 부르는 함수가 웹에 있다", !!fName && calJs.indexOf("function " + fName + "(") >= 0, String(fName));
    ok("알림 한도가 두 곳에서 같다", !!limit && calJs.indexOf("ALARM_MAX = " + limit + ";") >= 0, String(limit));
    ok("웹뷰에 알림 통로를 단다", vc.indexOf("userContentController.add(alarms, name: AlarmBridge.name)") >= 0);
    ok("권한은 앱을 열 때가 아니라 ask 로만 묻는다",
       (bridge.match(/requestAuthorization/g) || []).length === 1 && /case "ask": ask\(\)/.test(bridge));
  }

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

  // ── 6-13. 도트 아이콘 ───────────────────────────────────────────
  // 이모지를 도트 그림으로 바꿨다. 다시 새어 들어오면 여기서 걸린다.
  const dots = await page.evaluate(() => {
    const r = {};
    const pic = /\p{Extended_Pictographic}/u;

    r.count = Object.keys(ICONS).length;
    /* 대부분 16x16 이지만 눈 결정은 가지까지 담느라 더 크다.
       크기는 달라도 되고, 정사각이라야 글줄에서 찌그러지지 않는다 */
    r.square = Object.keys(ICONS).every(k => {
      const h = ICONS[k].length;
      return h >= 16 && ICONS[k].every(x => x.length === h);
    });
    r.sizes = [...new Set(Object.keys(ICONS).map(k => ICONS[k].length))].sort((a,b)=>a-b);
    r.knownColors = Object.keys(ICONS).every(k =>
      ICONS[k].every(row => [...row].every(ch => ch === "." || !!ICON_PAL[ch])));
    /* 두 팔레트는 따로 산다. 같은 글자가 다른 색을 가리켜도 섞어 쓰지 않으니 괜찮다.
       확인할 것은 icon() 이 ICON_PAL 만 본다는 것이다 */
    const all = Object.keys(ICONS).map(k => icon(k)).join("");
    const mine = Object.keys(ICON_PAL).map(k => ICON_PAL[k]);
    r.onlyIconPal = [...new Set((all.match(/fill="#[0-9A-Fa-f]{6}"/g) || [])
      .map(s => s.slice(6, 13)))].every(c => mine.indexOf(c) >= 0);

    const svg = icon("coffee");
    r.isSvg = svg.indexOf("<svg") === 0 && svg.indexOf('class="ico"') > 0;
    r.unknownIsEmpty = icon("없는이름") === "";

    /* 기본 분류는 도트, 직접 넣은 이모지는 그대로 */
    r.dotMark = catMark("@coffee").indexOf("<svg") === 0;
    r.emojiMark = catMark("🥐") === "🥐";
    r.escapes = catMark("<b>") === "&lt;b&gt;";

    /* 정적 마크업의 자리표시자가 채워졌는지 */
    r.placeholders = [...document.querySelectorAll("[data-ico]")].length;
    r.painted = [...document.querySelectorAll("[data-ico]")].every(el => el.querySelector("svg"));

    /* 화면에 이모지가 남아 있는지 — 홈·목록·설정을 훑는다 */
    const sweep = () => {
      const hit = [];
      document.querySelectorAll("#s-home *, #s-list *, #s-set *").forEach(el => {
        if (el.children.length) return;
        const t = (el.textContent || "").trim();
        if (t && pic.test(t)) hit.push(t.slice(0, 24));
      });
      return hit;
    };
    const backup = JSON.stringify(data);
    data.backup = null; renderHome();
    go("list"); state.listTab = "recipe"; renderList();
    go("set"); renderSettings();
    r.onScreen = sweep();
    data = JSON.parse(backup); persist(); go("home");
    return r;
  });
  eq("아이콘이 서른 개다(탭바의 홈·학습 카드·설정 포함)", dots.count, 30);
  ok("모두 정사각이고 16칸 이상이다", dots.square === true, JSON.stringify(dots.sizes));
  ok("팔레트에 없는 색을 쓰지 않는다", dots.knownColors === true);
  ok("아이콘은 제 팔레트 색만 쓴다", dots.onlyIconPal === true);
  ok("icon() 이 인라인 SVG 를 준다", dots.isSvg === true);
  ok("없는 이름에는 빈 값을 준다", dots.unknownIsEmpty === true);
  ok("기본 분류는 도트로 그린다", dots.dotMark === true);
  ok("직접 넣은 이모지는 그대로 둔다", dots.emojiMark === true);
  ok("분류 이름은 여전히 이스케이프한다", dots.escapes === true);
  ok("정적 자리표시자가 채워진다", dots.placeholders > 0 && dots.painted === true, String(dots.placeholders));
  eq("화면에 이모지가 남아 있지 않다", dots.onScreen, []);

  // 소스에도 남지 않았는지 — 걷어내는 정규식 안의 ▪ 하나만 예외다
  const srcEmoji = [];
  jsFiles.concat(["../index.html"]).forEach(f => {
    const p = f.indexOf("..") === 0
      ? path.resolve(__dirname, "..", "www", "index.html")
      : path.resolve(__dirname, "..", "www", "js", f);
    fs.readFileSync(p, "utf8").split(/\r?\n/).forEach((line, i) => {
      if (/\p{Extended_Pictographic}/u.test(line)) srcEmoji.push(f + ":" + (i + 1));
    });
  });
  eq("소스에 남은 이모지는 글머리표 정규식 한 줄뿐이다", srcEmoji, ["editor.js:34"]);

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

  // 개인정보 처리방침. 앱스토어·테스트플라이트에 적는 주소이고, 앱 안에서도 찾을 수 있어야 한다
  {
    const privacy = fs.readFileSync(path.resolve(__dirname, "..", "www", "privacy.html"), "utf8");
    const cspOf = s => (/http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(s) || [])[1];
    ok("처리방침 페이지가 있다", privacy.indexOf("개인정보 처리방침") >= 0);
    ok("처리방침에는 스크립트가 없다", !/<script/i.test(privacy));
    eq("처리방침의 CSP 가 앱과 같다", cspOf(privacy), cspOf(html));
    const link = await page.evaluate(() => {
      go("set");
      const a = document.querySelector("#privacyLink");
      return a ? { href: a.getAttribute("href"), target: a.getAttribute("target"), shown: a.offsetParent !== null } : null;
    });
    await page.evaluate(() => go("home"));
    ok("설정에 처리방침 링크가 보인다", !!link && link.shown === true);
    // 전체 주소여야 앱에서 사파리로 열린다. 상대 주소면 웹뷰 안에서 열려 돌아올 길이 없다
    eq("처리방침 링크는 전체 주소다", link && link.href, "https://amgijwi.com/privacy.html");
    ok("처리방침 링크는 새 창을 열지 않는다(웹뷰가 무시함)", !!link && link.target === null);
  }

  // ── 6-10. 도트 화면 (iOS 앱 전용) ────────────────────────────────
  // 앱에서는 <html> 에 dot 이 붙고 dot.css 가 켜진다. 웹은 지금 모습 그대로여야 한다
  {
    const look = await page.evaluate(async () => {
      const fam = s => getComputedStyle(document.querySelector(s)).fontFamily;
      // SVG 에는 offsetParent 가 없어 늘 "보임"으로 나온다. 그려진 상자가 있는지로 본다
      const seen = el => !!el && el.getClientRects().length > 0;
      const r = {};
      go("home"); renderHome();
      r.webClass = document.documentElement.classList.contains("dot");
      r.webGreet = fam("#greetT");
      r.webRing = seen(document.querySelector("#ringPx"));
      r.webTabPx = [...document.querySelectorAll(".tabpx")].filter(seen).length;
      r.webTabSvg = [...document.querySelectorAll(".tab > svg")].filter(seen).length;

      // 앱처럼 만든다
      window.__amgijwiNative = true;
      document.documentElement.classList.add("dot");
      const backup = JSON.stringify(data);
      data.backup = null;                         // 백업 권유가 뜨는 상태
      renderHome(); renderBackupBanner();
      r.appGreet = fam("#greetT");
      r.ringShown = seen(document.querySelector("#ringPx"));
      r.ringOldHidden = getComputedStyle(document.querySelector(".ring > svg")).display === "none";
      r.ringCells = document.querySelectorAll("#ringPx rect").length;
      r.ringOn0 = document.querySelectorAll("#ringPx .rp-fill, #ringPx .rp-hi, #ringPx .rp-lo").length;
      r.tabPx = [...document.querySelectorAll(".tabpx")].filter(el => seen(el) && el.querySelector("svg")).length;
      r.tabSvg = [...document.querySelectorAll(".tab > svg")].filter(seen).length;
      r.okBanner = [...document.querySelectorAll("#storeBanner .banner.ok")].filter(seen).length;
      const msg = document.querySelector("#backupBanner .bkmsg");
      r.bkmsgHidden = !!msg && !seen(msg);
      r.bkNow = seen(document.querySelector("#bkNow"));

      // 도트 글꼴은 16px 이상에서만. 홈과 탭바의 글자가 있는 모든 요소를 훑는다
      r.small = [];
      document.querySelectorAll("#s-home *, .tabs *").forEach(el => {
        if (!seen(el) || !el.childNodes.length) return;
        const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        if (!hasText) return;
        const cs = getComputedStyle(el);
        if (cs.fontFamily.indexOf("NeoDGM") >= 0 && parseFloat(cs.fontSize) < 16)
          r.small.push((el.id || el.className || el.tagName) + " " + cs.fontSize);
      });

      delete window.__amgijwiNative;
      document.documentElement.classList.remove("dot");
      data = JSON.parse(backup); renderHome(); renderBackupBanner();
      r.backToWeb = fam("#greetT") === r.webGreet;
      return r;
    });
    ok("웹에는 도트 표시가 없다", look.webClass === false);
    ok("웹의 인사말은 원래 글꼴이다", look.webGreet.indexOf("NeoDGM") < 0, look.webGreet);
    ok("웹에는 도트 링이 안 보인다", look.webRing === false);
    eq("웹의 탭은 원래 선 아이콘이다", [look.webTabPx, look.webTabSvg], [0, 5]);
    ok("앱의 인사말은 도트 글꼴이다", look.appGreet.indexOf("NeoDGM") === 0, look.appGreet);
    ok("앱에서는 도트 링이 원래 링을 대신한다", look.ringShown === true && look.ringOldHidden === true);
    ok("도트 링은 고리 칸으로 그린다", look.ringCells > 200, String(look.ringCells));
    ok("0% 에도 시작점은 보인다", look.ringOn0 > 0 && look.ringOn0 < 12, String(look.ringOn0));
    eq("앱의 탭은 도트 아이콘 다섯 개다", [look.tabPx, look.tabSvg], [5, 0]);
    eq("탭 아이콘은 원래 뜻을 따른다(학습은 뒤집기 화살표가 아니라 암기 카드)",
       (html.match(/class="tabpx" data-ico="([a-z]+)"/g) || []).map(t => /data-ico="([a-z]+)"/.exec(t)[1]), ["home", "cards", "note", "calendar", "gear"]);
    eq("앱에서는 저장 안심 문구를 홈에서 뺀다(설정에 같은 말)", look.okBanner, 0);
    ok("백업 권유는 한 줄로 줄이고 버튼은 남긴다", look.bkmsgHidden === true && look.bkNow === true);
    eq("도트 글꼴은 16px 보다 작게 쓰지 않는다", look.small, []);
    ok("도트 표시를 떼면 원래 모습으로 돌아온다", look.backToWeb === true);

    // 파일 규칙: dot.css 의 모든 규칙은 html.dot 아래에 있어야 웹이 안전하다
    const dotCss = fs.readFileSync(path.resolve(__dirname, "..", "www", "dot.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const loose = [];
    // @media (...) { 는 선택자가 아니라 묶음이다. 여는 줄만 걷어내면 안쪽 규칙이 그대로 검사된다
    // @keyframes 안의 from{} · 0%{} 도 선택자가 아니다. 통째로 걷어낸다
    dotCss.replace(/@font-face\s*\{[^}]*\}/g, "").replace(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*[^{}]*\}/g, "").replace(/@media[^{]*\{/g, "").replace(/([^{}]+)\{[^}]*\}/g, (m, sel) => {
      // :is(a, b) 처럼 괄호 안의 쉼표는 선택자 구분이 아니다. 괄호 밖 쉼표에서만 나눈다
      const parts = []; let depth = 0, cur = "";
      for (const ch of sel) {
        if (ch === "(") depth++;
        if (ch === ")") depth--;
        if (ch === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += ch;
      }
      parts.push(cur);
      parts.map(x => x.trim()).filter(Boolean).forEach(x => { if (x.indexOf("html.dot") !== 0) loose.push(x); });
      return "";
    });
    eq("dot.css 의 규칙은 모두 html.dot 아래에 있다", loose, []);
    const fontDir = path.resolve(__dirname, "..", "www", "fonts");
    ok("도트 글꼴 파일이 있다", fs.existsSync(path.join(fontDir, "neodgm.woff2")) && dotCss.indexOf("fonts/neodgm.woff2") >= 0);
    ok("글꼴 라이선스(OFL)를 함께 싣는다", /SIL Open Font License/.test(fs.readFileSync(path.join(fontDir, "neodgm-LICENSE.txt"), "utf8")));
    const cspMeta = (/http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html) || [])[1] || "";
    ok("CSP 가 이 사이트의 글꼴만 허용한다", /font-src 'self';/.test(cspMeta), cspMeta);
    const swiftVc = fs.readFileSync(path.resolve(__dirname, "..", "ios", "Sources", "WebAppViewController.swift"), "utf8");
    ok("앱이 문서가 뜨기 전에 dot 표시를 붙인다", swiftVc.indexOf("classList.add('dot')") >= 0);
  }

  // ── 6-10b. 카페 전표 · 카페 말투 (도트 화면만) ──────────────────────
  // 목록은 종이(전표·영수증·대기표)로, 말은 카페 말로. 웹은 문구까지 그대로다
  {
    const cafe = await page.evaluate(async () => {
      const txt = s => (document.querySelector(s) || {}).textContent || "";
      const seen = el => !!el && el.getClientRects().length > 0;
      const day = n => ymd(new Date(Date.now() + n * 86400000));
      const backup = JSON.stringify(data);
      const live = liveDrinks();
      data.events = [{ id:"k1", title:"신메뉴 출시", date:day(3), end:"", note:"라떼 3종", remind:7, done:false },
                     { id:"k2", title:"위생 점검", date:day(-2), end:"", note:"", remind:0, done:false }];
      // 오늘 폐기는 기한이 날짜(일)인 것만 모인다(tagGroups). 시간·초 단위는 빠진다
      data.shelf = [{ id:"s1", name:"개봉한 우유", place:"냉장", dur:"5일", note:"" },
                    { id:"s2", name:"과일청", place:"냉장", dur:"14일", note:"" },
                    { id:"s3", name:"원두", place:"실온", dur:"7일", note:"" },
                    { id:"s4", name:"휘핑크림", place:"냉장", dur:"8시간", note:"" }];
      data.needReview = live.slice(0, 3).map(d => d.id);
      data.mastered = live.slice(3, 9).map(d => d.id);
      const shot = () => {
        go("home"); renderHome();
        return {
          scope: txt("#scopeTitle"), start: txt("#startBtn"), review: txt("#reviewTitle"), ring: txt("#ringLbl"),
          deck: txt("#deckCount"), chip: txt("#chips .chip"), hero: txt("#heroTitle"), revCount: txt("#reviewCount"),
          tk: document.querySelectorAll("#upcomingList .row.tk").length,
          stubs: [...document.querySelectorAll("#upcomingList .tk .stub b")].map(b => b.textContent),
          lateTk: document.querySelectorAll("#upcomingList .tk.late").length,
          // 떼는 칸이 전표 위아래 끝까지 차야 한다. 가운데 떠 있으면 위아래로 종이가 비친다
          stubGap: [...document.querySelectorAll("#upcomingList .tk")].map(tk => {
            const a = tk.getBoundingClientRect(), b = tk.querySelector(".stub").getBoundingClientRect();
            return Math.round(Math.abs(a.top - b.top) + Math.abs(a.bottom - b.bottom));
          }),
          openDay: txt("#todayList .rline .v"),
          rlineToday: document.querySelectorAll("#todayList .rcpt .rline").length,
          todayFt: txt("#todayList .rcpt .ft"),
          qn: txt("#reviewList .qn .no b"),
          qnHead: txt("#reviewList .qn .tx b"),
          rlineRev: document.querySelectorAll("#reviewList .rcpt .rline").length,
          plainRows: document.querySelectorAll("#reviewList > .row").length,
          cheer: situationCheer(new Date(), 1, {}).msg
        };
      };
      const r = { web: shot() };
      window.__amgijwiNative = true; document.documentElement.classList.add("dot");
      r.app = shot();
      // 영수증 줄을 눌러도 원래처럼 메뉴가 열린다
      const line = document.querySelector("#reviewList .rcpt .rline");
      line.click();
      r.opened = document.querySelector("#sheet").classList.contains("on");
      closeSheet();
      // 전표·영수증에서도 도트 글꼴은 16px 이상
      r.small = [];
      document.querySelectorAll("#s-home *").forEach(el => {
        if (!seen(el)) return;
        if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
        const cs = getComputedStyle(el);
        if (cs.fontFamily.indexOf("NeoDGM") >= 0 && parseFloat(cs.fontSize) < 16) r.small.push((el.className || el.tagName) + " " + cs.fontSize);
      });
      delete window.__amgijwiNative; document.documentElement.classList.remove("dot");
      data = JSON.parse(backup); persist(); renderHome();
      return r;
    });
    const w = cafe.web, a = cafe.app;
    eq("웹의 말은 그대로다", [w.scope, w.start, w.review, w.ring], ["학습 범위", "학습 시작하기", "복습이 필요해요", "마스터"]);
    eq("앱은 카페 말투다", [a.scope, a.start, a.review, a.ring], ["오늘 외울 메뉴", "한 잔씩 외우기", "다시 볼 메뉴", "외운 잔"]);
    ok("웹은 메뉴를 개로 센다", /개 메뉴$/.test(w.deck) && /개$/.test(w.revCount) && /개를 외웠어요$/.test(w.hero), [w.deck, w.revCount, w.hero].join(" / "));
    ok("앱은 메뉴를 잔으로 센다", /^\d+잔$/.test(a.deck) && /잔$/.test(a.chip) && /^\d+잔$/.test(a.revCount) && /잔 외웠어요$/.test(a.hero), [a.deck, a.chip, a.revCount, a.hero].join(" / "));
    ok("쥐돌이도 앱에서는 잔으로 센다", a.cheer.indexOf("개") < 0 || /폐기|버릴/.test(a.cheer), a.cheer);
    eq("웹의 일정은 원래 줄이다", w.tk, 0);
    eq("앱의 다가오는 일정은 주문 전표다(지난 일은 D+ 로 짧게, 빨간 칸)", [a.tk, a.stubs, a.lateTk], [2, ["D+2", "D-3"], 1]);
    eq("전표의 떼는 칸이 위아래 끝까지 찬다", a.stubGap, [0, 0]);
    ok("영수증의 개봉일은 월/일로 짧게 쓴다", /^\d{1,2}\/\d{1,2} 개봉$/.test(a.openDay), a.openDay);
    eq("웹의 폐기는 원래 줄이다", w.rlineToday, 0);
    ok("앱의 오늘 폐기는 영수증 한 장이다(기한별 한 줄, 맨 아래 보관 장소별 개수)",
       a.rlineToday === 3 && /냉장 2/.test(a.todayFt) && /실온 1/.test(a.todayFt), a.rlineToday + " " + a.todayFt);
    eq("앱의 다시 볼 메뉴는 대기표와 영수증 줄이다", [a.qn, a.rlineRev, a.plainRows], ["3잔", 3, 0]);
    ok("대기표는 첫 메뉴와 나머지 잔 수를 말한다", / 외 2잔$/.test(a.qnHead), a.qnHead);
    eq("웹의 다시 볼 메뉴는 원래 줄이다", w.plainRows, 3);
    ok("영수증 줄을 누르면 메뉴가 열린다", cafe.opened === true);
    eq("전표·영수증에서도 도트 글꼴은 16px 이상이다", cafe.small, []);
  }

  // ── 6-10c. 학습 · 결과 화면 (도트 화면만) ─────────────────────────
  {
    const study = await page.evaluate(async () => {
      const seen = el => !!el && el.getClientRects().length > 0;
      const smallNeo = root => {
        const out = [];
        document.querySelectorAll(root + " *").forEach(el => {
          if (!seen(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
          const cs = getComputedStyle(el);
          if (cs.fontFamily.indexOf("NeoDGM") >= 0 && parseFloat(cs.fontSize) < 16) out.push((el.className || el.tagName) + " " + cs.fontSize);
        });
        return out;
      };
      const backup = JSON.stringify(data);
      const run = () => {
        const r = { small: [] };
        data.hints = ["study-flip", "study-blank", "study-result", "flip", "blank"];
        data.mode = "flip";
        const lat = liveDrinks().filter(d => d.ing.length >= 3)[0];
        startSession([lat].concat(liveDrinks().filter(d => d !== lat).slice(0, 2)));
        r.frontFont = getComputedStyle(document.querySelector("#card .front h2")).fontFamily;
        r.small = r.small.concat(smallNeo("#s-study"));
        state.flipped = true; renderCard();
        const ingB = document.querySelector("#card .ing b");
        r.leader = getComputedStyle(ingB, "::after").content !== "none" && getComputedStyle(ingB, "::after").flexGrow === "1";
        r.small = r.small.concat(smallNeo("#s-study"));
        data.mode = "blank"; state.flipped = false; state.revealed = new Set(); renderCard();
        r.blankFont = getComputedStyle(document.querySelector("#card .blank")).fontFamily;
        r.small = r.small.concat(smallNeo("#s-study"));
        data.mode = "flip"; state.stat = { ok:3, again:2, total:5 }; finish();
        r.title = document.querySelector("#resTitle").textContent;
        r.labels = ["#resOkL", "#resAgainL", "#resTotalL"].map(s => document.querySelector(s).textContent);
        r.again = document.querySelector("#againBtn").textContent;
        r.msg = document.querySelector("#resMsg").textContent;
        r.small = r.small.concat(smallNeo("#s-result"));
        go("home");
        return r;
      };
      const r = { web: run() };
      window.__amgijwiNative = true; document.documentElement.classList.add("dot");
      r.app = run();
      delete window.__amgijwiNative; document.documentElement.classList.remove("dot");
      data = JSON.parse(backup); persist(); go("home");
      return r;
    });
    const w = study.web, a = study.app;
    ok("웹의 학습 카드는 원래 글꼴이다", w.frontFont.indexOf("NeoDGM") < 0 && w.blankFont.indexOf("NeoDGM") < 0);
    eq("웹의 결과 화면 말은 그대로다", [w.title, w.labels, w.again], ["세션 완료!", ["한 번에 맞춤", "다시 본 카드", "전체 카드"], "한 번 더 학습"]);
    ok("웹의 까마귀는 개로 센다", /^2개 까먹었다/.test(w.msg), w.msg);
    ok("앱의 카드 이름과 빈칸은 도트 글꼴이다", a.frontFont.indexOf("NeoDGM") === 0 && a.blankFont.indexOf("NeoDGM") === 0);
    ok("앱의 카드 뒷면은 재료 ····· 용량 점선으로 잇는다", a.leader === true);
    eq("앱의 결과 화면은 카페 말투다", [a.title, a.labels, a.again], ["한 바퀴 끝!", ["한 번에 맞춘 잔", "다시 본 잔", "전체 잔"], "한 바퀴 더"]);
    ok("앱의 까마귀는 잔으로 센다", /^2잔 까먹었다 까악/.test(a.msg), a.msg);
    eq("학습·결과 화면에서도 도트 글꼴은 16px 이상이다", a.small, []);
  }

  // ── 6-10d. 레시피 화면 · 공용 시트 (도트 화면만) ─────────────────────
  {
    const lst = await page.evaluate(async () => {
      const seen = el => !!el && el.getClientRects().length > 0;
      const fam = s => getComputedStyle(document.querySelector(s)).fontFamily;
      const smallNeo = root => {
        const out = [];
        document.querySelectorAll(root + " *").forEach(el => {
          if (!seen(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
          const cs = getComputedStyle(el);
          if (cs.fontFamily.indexOf("NeoDGM") >= 0 && parseFloat(cs.fontSize) < 16) out.push(root + " " + (el.className || el.tagName) + " " + cs.fontSize);
        });
        return out;
      };
      const backup = JSON.stringify(data);
      data.shelf = [{ id:"s1", name:"개봉한 우유", place:"냉장", dur:"5일", note:"" }, { id:"s2", name:"휘핑크림", place:"냉장", dur:"8시간", note:"" }];
      data.memos = [{ id:"m1", text:"우유는 개봉일 라벨", at:new Date().toISOString(), pin:true }];
      const run = () => {
        const r = { small: [] };
        for (const tab of ["recipe", "sub", "shelf", "memo"]) {
          state.listTab = tab; go("list");
          if (tab === "shelf") { const g = document.querySelector("#shelfBody .durgrp-h"); if (g) g.click(); }
          r.small = r.small.concat(smallNeo("#s-list"));
        }
        r.segFont = fam("#listSeg button");
        r.rowRadius = (() => { state.listTab = "recipe"; go("list"); return getComputedStyle(document.querySelector("#listBody .row")).borderTopLeftRadius; })();
        openSheet(liveDrinks()[0].id);
        r.sheetTitle = fam("#sheetBody h2");
        r.sheetRadius = getComputedStyle(document.querySelector("#sheet")).borderTopLeftRadius;
        r.small = r.small.concat(smallNeo("#sheet"));
        closeSheet();
        openEventSheet(null);                          // 같은 시트 틀을 쓰는 일정 입력
        r.fldRadius = getComputedStyle(document.querySelector("#sheet .fld input[type=text]")).borderTopLeftRadius;
        r.small = r.small.concat(smallNeo("#sheet"));
        closeSheet(); go("home");
        return r;
      };
      const r = { web: run() };
      window.__amgijwiNative = true; document.documentElement.classList.add("dot");
      // 실제 앱은 처음부터 dot 이 붙어 있다. 테스트는 도중에 붙이므로, 탭 버튼의
      // transition:all(.15s) 이 끝나기 전에 재면 바뀌는 중인 크기가 나온다. 끝날 때까지 기다린다
      go("list"); await new Promise(res => setTimeout(res, 350));
      r.app = run();
      delete window.__amgijwiNative; document.documentElement.classList.remove("dot");
      data = JSON.parse(backup); persist(); go("home");
      return r;
    });
    const w = lst.web, a = lst.app;
    ok("웹의 레시피 화면은 그대로다", w.segFont.indexOf("NeoDGM") < 0 && w.rowRadius !== "0px" && w.sheetRadius !== "0px" && w.fldRadius !== "0px",
       [w.segFont, w.rowRadius, w.sheetRadius, w.fldRadius].join(" / "));
    ok("앱의 레시피 탭과 시트 제목은 도트 글꼴이다", a.segFont.indexOf("NeoDGM") === 0 && a.sheetTitle.indexOf("NeoDGM") === 0);
    eq("앱의 목록 줄 · 시트 · 입력 칸은 네모다", [a.rowRadius, a.sheetRadius, a.fldRadius], ["0px", "0px", "0px"]);
    eq("레시피 화면과 시트에서도 도트 글꼴은 16px 이상이다", a.small, []);
  }

  // ── 6-10e. 일정 화면 (도트 화면만) ─────────────────────────────────
  {
    const calLook = await page.evaluate(async () => {
      const seen = el => !!el && el.getClientRects().length > 0;
      const backup = JSON.stringify(data);
      data.events = [{ id:"g1", title:"가을 시즌 음료 교육", date:"2026-10-05", end:"2026-10-09", note:"", remind:0, done:false },
                     { id:"g2", title:"재고 조사", date:"2026-10-07", end:"", note:"", remind:0, done:false }];
      const run = () => {
        go("cal"); calCursor = { y:2026, m:9 }; state.calDay = "2026-10-07"; renderCal();
        const cs = s => getComputedStyle(document.querySelector(s));
        const small = [];
        document.querySelectorAll("#s-cal *").forEach(el => {
          if (!seen(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
          const c = getComputedStyle(el);
          if (c.fontFamily.indexOf("NeoDGM") >= 0 && parseFloat(c.fontSize) < 16) small.push((el.className || el.tagName) + " " + c.fontSize);
        });
        return { selN: cs("#calGrid .calcell.sel .n").borderTopLeftRadius, selClip: cs("#calGrid .calcell.sel .n").clipPath,
                 bar: cs("#calGrid .calbar").borderTopLeftRadius,
                 title: cs("#calTitle").fontFamily, dd: cs("#calDayList .evrow .dd").fontFamily, small: small };
      };
      const r = { web: run() };
      window.__amgijwiNative = true; document.documentElement.classList.add("dot");
      await new Promise(res => setTimeout(res, 350));
      r.app = run();
      delete window.__amgijwiNative; document.documentElement.classList.remove("dot");
      data = JSON.parse(backup); calCursor = null; state.calDay = null; persist(); go("home");
      return r;
    });
    const w = calLook.web, a = calLook.app;
    ok("웹의 달력은 동그라미 표시와 둥근 막대 그대로다", w.selN !== "0px" && w.bar !== "0px" && w.title.indexOf("NeoDGM") < 0, [w.selN, w.bar].join(" / "));
    ok("앱의 고른 날 표시는 도트로 찍은 동그라미다(매끈한 원이 아님)", a.selN === "0px" && /^polygon\(/.test(a.selClip), a.selN + " " + a.selClip);
    eq("앱의 일정 막대는 네모다", a.bar, "0px");
    ok("앱의 달력 제목과 남은 날은 도트 글꼴이다", a.title.indexOf("NeoDGM") === 0 && a.dd.indexOf("NeoDGM") === 0);
    eq("일정 화면에서도 도트 글꼴은 16px 이상이다", a.small, []);
  }

  // ── 6-10f. 설정 · 편집 화면 · PIN 잠금 · 확인 창 (도트 화면만) ────────
  {
    const setLook = await page.evaluate(async () => {
      const seen = el => !!el && el.getClientRects().length > 0;
      const rad = s => { const el = document.querySelector(s); return el ? getComputedStyle(el).borderTopLeftRadius : "없음"; };
      const smallNeo = root => {
        const out = [];
        document.querySelectorAll(root + " *").forEach(el => {
          if (!seen(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
          const c = getComputedStyle(el);
          if (c.fontFamily.indexOf("NeoDGM") >= 0 && parseFloat(c.fontSize) < 16) out.push(root + " " + (el.className || el.tagName) + " " + c.fontSize);
        });
        return out;
      };
      const backup = JSON.stringify(data);
      const run = () => {
        const r = { small: [] };
        go("set"); r.card = rad("#s-set .setcard"); r.theme = rad("#s-set .theme-b"); r.small = r.small.concat(smallNeo("#s-set"));
        openEditor(liveDrinks()[0].id); r.input = rad("#s-edit .fld input[type=text]"); r.del = rad("#s-edit .del"); r.small = r.small.concat(smallNeo("#s-edit"));
        openSubEditor(null, "edit"); r.small = r.small.concat(smallNeo("#s-sub"));
        openImport(); r.mono = rad("#ocrBox"); r.small = r.small.concat(smallNeo("#s-import"));
        { const bx = document.querySelector("#ocrBox").getBoundingClientRect(), pb = document.querySelector("#pasteBtn").getBoundingClientRect();
          r.ocrGap = Math.round(pb.top - bx.bottom); }
        // 글 칸과 바로 아래 버튼 사이 틈(외곽선끼리 붙으면 한 덩어리로 보인다)
        go("set");
        const box = document.querySelector("#impBox").getBoundingClientRect(), btn = document.querySelector("#impText").getBoundingClientRect();
        r.monoGap = Math.round(btn.top - box.bottom);
        const fileBtn = document.querySelector("#impFile").getBoundingClientRect();
        r.fileGap = Math.round(box.top - fileBtn.bottom);
        go("home"); openLock("set"); r.key = rad("#lockKeys button"); r.small = r.small.concat(smallNeo("#lock"));
        $("#lock").classList.remove("on");
        confirmBox("확인", "지울까요?", "삭제", () => {}); r.dlg = rad("#dlg .box"); r.small = r.small.concat(smallNeo("#dlg"));
        $("#dlg").classList.remove("on");
        go("home");
        return r;
      };
      const r = { web: run() };
      window.__amgijwiNative = true; document.documentElement.classList.add("dot");
      await new Promise(res => setTimeout(res, 350));
      r.app = run();
      delete window.__amgijwiNative; document.documentElement.classList.remove("dot");
      data = JSON.parse(backup); persist(); go("home");
      return r;
    });
    const w = setLook.web, a = setLook.app;
    const keys = ["card", "theme", "input", "del", "mono", "key", "dlg"];
    ok("웹의 설정 · 편집 · 잠금 · 확인 창은 둥근 모서리 그대로다", keys.every(k => w[k] !== "0px" && w[k] !== "없음"), keys.map(k => k + ":" + w[k]).join(" "));
    eq("앱의 설정 · 편집 · 잠금 · 확인 창은 네모다", keys.map(k => a[k]), keys.map(() => "0px"));
    eq("설정 · 편집 · 잠금 · 확인 창에서도 도트 글꼴은 16px 이상이다", a.small, []);
    // 보이는 틈 = 간격 − 글 칸 외곽선 2 − 버튼 외곽선 3
    ok("백업 글 칸과 복원 버튼 사이가 넉넉하다(외곽선을 빼고도 8px 이상)", a.monoGap - 5 >= 8, String(a.monoGap));
    // 버튼의 외곽선(3px)은 그림자(아래로 6px) 안에 들어간다. 보이는 틈 = 간격 − 그림자 6 − 글 칸 외곽선 2
    ok("가져오기 글 칸과 붙여넣기 버튼 사이도 넉넉하다(외곽선을 빼고도 8px 이상)", a.ocrGap - 5 >= 8, String(a.ocrGap));
    ok("파일 선택 버튼과 글 칸 사이도 넉넉하다(그림자 · 외곽선을 빼고도 8px 이상)", a.fileGap - 8 >= 8, String(a.fileGap));
  }

  // ── 6-10g. 태블릿(아이패드) 폭에서 도트 화면도 가운데 모인다 ─────────────
  {
    const before = page.viewportSize();
    await page.setViewportSize({ width: 820, height: 1180 });
    const tab = await page.evaluate(async () => {
      window.__amgijwiNative = true; document.documentElement.classList.add("dot");
      await new Promise(res => setTimeout(res, 350));
      const off = (screen, sel) => {
        go(screen);
        const sc = document.querySelector("#s-" + screen + " .scroll").getBoundingClientRect(), el = document.querySelector(sel).getBoundingClientRect();
        return Math.round(Math.abs((el.left + el.right) / 2 - (sc.left + sc.right) / 2));
      };
      const r = { hero: off("home", "#s-home .hero"), seg: off("list", "#listSeg"), card: off("set", "#s-set .setcard") };
      delete window.__amgijwiNative; document.documentElement.classList.remove("dot");
      go("home");
      return r;
    });
    await page.setViewportSize(before);
    eq("아이패드 폭에서 도트 진도 카드 · 레시피 탭 · 설정 카드가 가운데에 있다(좌우 차이 8px 이하)",
       [tab.hero <= 8, tab.seg <= 8, tab.card <= 8], [true, true, true]);
  }

  // ── 6-10h. 첫 실행 가이드 (도트 화면만) ──────────────────────────────
  {
    const ob = await page.evaluate(async () => {
      const seen = el => !!el && el.getClientRects().length > 0;
      const backup = JSON.stringify(data), visit0 = VISIT;
      const r = {};
      data.hints = (data.hints || []).filter(h => h !== "onboard");
      VISIT = { info:{ kind:"first" }, now:new Date() };
      // 웹: 처음이어도 뜨지 않고, 사용법 보기는 예전 글 시트
      r.webDue = guideDue();
      $("#openGuide").click();
      r.webSheet = $("#sheet").classList.contains("on"); r.webOnboard = !$("#onboard").hidden;
      closeSheet();
      // 앱
      window.__amgijwiNative = true; document.documentElement.classList.add("dot");
      await new Promise(res => setTimeout(res, 350));
      r.appDue = guideDue();
      VISIT = { info:{ kind:"back", gap:1 }, now:new Date() };
      r.backDue = guideDue();
      VISIT = { info:{ kind:"first" }, now:new Date() };
      openGuide();
      r.shown = seen($("#onboard"));
      r.pages = document.querySelectorAll("#onboard .ob-page").length;
      r.dots = document.querySelectorAll("#obDots i").length;
      r.cover = getComputedStyle($("#onboard")).zIndex;
      const small = [];
      document.querySelectorAll("#onboard *").forEach(el => {
        if (!seen(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
        const c = getComputedStyle(el);
        if (c.fontFamily.indexOf("NeoDGM") >= 0 && parseFloat(c.fontSize) < 16) small.push((el.className || el.tagName) + " " + c.fontSize);
      });
      r.small = small;
      // 카드 장면: 뒤집기와 빈칸 열기는 발바닥이 꾹 찍는 순간에만 일어난다
      $("#obNext").click();
      const paw = $("#obPaw"), fc = $("#obFc"), ings = $("#obIngs");
      r.flipAtPress = []; r.openAtPress = [];
      let was = fc.classList.contains("on");
      const mo1 = new MutationObserver(() => { const now = fc.classList.contains("on"); if (now && !was) r.flipAtPress.push(paw.classList.contains("press")); was = now; });
      mo1.observe(fc, { attributes:true, attributeFilter:["class"] });
      let q0 = 3;
      const mo2 = new MutationObserver(() => {
        const q = ings.querySelectorAll(".ob-q").length;
        if (q < q0) r.openAtPress.push(paw.classList.contains("press"));
        q0 = q;
      });
      mo2.observe(ings, { childList:true });
      await new Promise(res => setTimeout(res, 7500));
      mo1.disconnect(); mo2.disconnect();
      for (let i = 0; i < 3; i++) $("#obNext").click();
      r.lastLabel = $("#obNext").textContent;
      $("#obNext").click();
      r.closed = $("#onboard").hidden && !guide;
      r.marked = data.hints.indexOf("onboard") >= 0;
      r.againDue = guideDue();
      // 설정 → 사용법 보기로 다시 열린다
      go("set"); $("#openGuide").click();
      r.reopen = !$("#onboard").hidden;
      $("#obSkip").click();
      r.skipClosed = $("#onboard").hidden;
      delete window.__amgijwiNative; document.documentElement.classList.remove("dot");
      data = JSON.parse(backup); VISIT = visit0; persist(); go("home");
      return r;
    });
    ok("웹은 처음 와도 가이드를 띄우지 않고, 사용법 보기는 글 시트 그대로다", ob.webDue === false && ob.webSheet === true && ob.webOnboard === false);
    ok("앱을 처음 열면 가이드가 뜨고, 이미 쓰던 사람에게는 뜨지 않는다", ob.appDue === true && ob.backDue === false);
    eq("가이드는 다섯 장, 점도 다섯 개다", [ob.shown, ob.pages, ob.dots], [true, 5, 5]);
    ok("가이드는 탭바 위를 덮는다", Number(ob.cover) > 65, ob.cover);
    eq("가이드의 도트 글꼴도 16px 이상이다", ob.small, []);
    ok("카드는 발바닥이 찍는 순간에 뒤집힌다", ob.flipAtPress.length >= 1 && ob.flipAtPress.every(Boolean), JSON.stringify(ob.flipAtPress));
    ok("빈칸은 발바닥이 찍는 순간에 하나씩 열린다", ob.openAtPress.length >= 1 && ob.openAtPress.every(Boolean), JSON.stringify(ob.openAtPress));
    eq("마지막 장 버튼은 시작하기다", ob.lastLabel, "시작하기");
    ok("다 보면 닫히고, 본 표시가 남아 다시 저절로 뜨지 않는다", ob.closed && ob.marked && ob.againDue === false);
    ok("설정의 사용법 보기로 다시 열리고 건너뛰기로 닫힌다", ob.reopen && ob.skipClosed);
  }

  // ── 6-10i. 쥐돌이 움직임: 치즈 먹기 순서 · 비상 달리기 · 비상등 ─────────
  {
    const mv = await page.evaluate(async () => {
      const r = {};
      const cheese = k => (MOUSE[k] || MOUSE.day).join("").replace(/[^Yy]/g, "").length;
      r.eat4b = MOUSE.eat4b.slice(0, 24).join() === MOUSE.eat3.slice(0, 24).join() && MOUSE.eat4b.slice(24).join() === MOUSE.eat4.slice(24).join();
      // 치즈가 도중에 다시 커지는 곳(마지막 빈손 → 새 치즈 한 곳만 빼고)
      r.grow = [];
      for (let i = 1; i < EAT_SEQ.length; i++) if (cheese(EAT_SEQ[i]) > cheese(EAT_SEQ[i - 1])) r.grow.push(EAT_SEQ[i - 1] + "→" + EAT_SEQ[i]);
      r.first = EAT_SEQ[0]; r.last = EAT_SEQ[EAT_SEQ.length - 1];
      r.allDrawn = EAT_SEQ.every(k => !!MOUSE[k]);

      // 비상 달리기를 한 칸씩 돌려 본다
      const step = async (dot) => {
        if (dot) { window.__amgijwiNative = true; document.documentElement.classList.add("dot"); }
        await new Promise(res => setTimeout(res, 350));
        go("home"); stopPanic(); panicDay = null;
        let tick = null; const si = window.setInterval;
        window.setInterval = (fn, ms) => { if (ms === 42) { tick = fn; return 4242; } return si(fn, ms); };
        runPanic(1); window.setInterval = si;
        const hero = $("#s-home .hero").getBoundingClientRect(), base = $("#panicLayer").getBoundingClientRect();
        const heroTop = hero.top - base.top, heroBottom = hero.bottom - base.top;
        const out = { frames:0, onCard:0, standing:0, bell:"" };
        const tmp = document.createElement("div"); tmp.innerHTML = rowsSVG(MOUSE.day, false); const dayHTML = tmp.innerHTML;
        let guard = 0;
        while (panicT && guard++ < 1000) {
          tick();
          if (!panicT) break;
          out.frames++;
          const m = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec($("#panicRun").style.transform);
          const x = +m[1], y = +m[2];
          if (y + 80 > heroTop + 1 && y < heroBottom) out.onCard++;
          if ($("#panicRun").innerHTML === dayHTML) out.standing++;
          out.bell = (/viewBox="([^"]+)"/.exec($("#panicBell").innerHTML) || [])[1];
          out.last = [x, y];
        }
        const mr = $("#mascot").getBoundingClientRect();
        out.home = [Math.round(mr.left - base.left), Math.round(mr.top - base.top)];
        out.back = $("#mascot").style.visibility === "" && !$("#panicLayer").classList.contains("on");
        if (dot) { delete window.__amgijwiNative; document.documentElement.classList.remove("dot"); }
        return out;
      };
      const reduce = window.reduceMotion; window.reduceMotion = () => false;
      r.web = await step(false);
      r.app = await step(true);
      window.reduceMotion = reduce;
      return r;
    });
    ok("작은 치즈 + 오른쪽 볼 그림은 eat3 머리와 eat4 몸을 이은 것이다", mv.eat4b);
    eq("먹는 도중에 치즈가 다시 커지지 않는다(빈손 → 새 치즈만)", mv.grow, []);
    ok("큰 치즈로 시작해 빈손으로 끝난 뒤 새 치즈로 돌아간다", mv.first === "eat1" && mv.last === "day" && mv.allDrawn);
    ok("앱의 비상 달리기는 진도 카드를 밟지 않는다", mv.app.frames > 0 && mv.app.onCard === 0, JSON.stringify(mv.app));
    eq("앱의 비상 달리기는 서 있는 그림으로 미끄러지지 않는다", mv.app.standing, 0);
    eq("앱의 비상 달리기는 제자리에서 끝난다", mv.app.last, mv.app.home);
    ok("달리기가 끝나면 쥐돌이가 제자리에 돌아온다", mv.app.back && mv.web.back);
    eq("앱의 비상등은 15x10 새 그림, 웹은 그대로", [mv.app.bell, mv.web.bell], ["0 0 15 10", "0 0 13 6"]);
    ok("웹의 비상 달리기는 예전 타원 그대로다(정면 · 뒤는 서 있는 그림)", mv.web.frames === 48 && mv.web.standing > 0, JSON.stringify(mv.web));
  }

  // ── 6-10j. 쥐돌이 대사 줄바꿈 (도트 화면만) ─────────────────────────
  {
    const bl = await page.evaluate(async () => {
      const r = {};
      r.split = sentenceLines("오늘 버릴 게 3개 있츄. 개봉관리 먼저 보고 가자츄");
      r.bang = sentenceLines("전부 외웠츄! 가끔 한 바퀴만 돌려주면 안 까먹츄");
      r.dots = sentenceLines("쿨… 자는 중이츄");
      r.again = sentenceLines(r.split) === r.split;
      // 두 문장이 마침표 없이 붙은 대사가 없다(“츄 ” 뒤에 바로 다음 말)
      r.glued = CHEERS.concat(WX_SAY.rain, WX_SAY.snow, SLEEPY).filter(m => /츄 [^.!?…]*츄/.test(m) && !/[.!?,]/.test(m));
      const lines = () => { const el = $("#mbubble"); return Math.round((el.getBoundingClientRect().height - parseFloat(getComputedStyle(el).paddingTop) * 2) / parseFloat(getComputedStyle(el).lineHeight)); };
      go("home");
      sayBubble("첫 한 잔부터 외워보자츄. 15잔이 기다리고 있츄");
      r.webWS = getComputedStyle($("#mbubble")).whiteSpace;
      window.__amgijwiNative = true; document.documentElement.classList.add("dot");
      await new Promise(res => setTimeout(res, 350));
      const c = getComputedStyle($("#mbubble"));
      r.appWS = c.whiteSpace; r.appWB = c.wordBreak;
      r.twoLines = lines();
      // 낱말 가운데서 접히지 않는다: 줄마다 끝 글자 뒤가 빈칸 · 줄바꿈 · 끝이어야 한다
      const range = document.createRange(), tn = [...$("#mbubble").childNodes].filter(n => n.nodeType === 3).pop();
      r.midWord = [];
      let prevTop = null;
      for (let i = 0; i < tn.length; i++) {
        range.setStart(tn, i); range.setEnd(tn, i + 1);
        const rc = range.getClientRects()[0]; if (!rc) continue;
        if (prevTop !== null && rc.top > prevTop + 4 && !/\s/.test(tn.data[i - 1]) && !/\s/.test(tn.data[i])) r.midWord.push(tn.data.slice(i - 3, i + 3));
        prevTop = rc.top;
      }
      delete window.__amgijwiNative; document.documentElement.classList.remove("dot");
      renderHome();
      return r;
    });
    eq("문장이 끝나면(. !) 줄바꿈 문자를 넣는다", [bl.split, bl.bang], ["오늘 버릴 게 3개 있츄.\n개봉관리 먼저 보고 가자츄", "전부 외웠츄!\n가끔 한 바퀴만 돌려주면 안 까먹츄"]);
    ok("말줄임표 뒤는 잇고, 두 번 거쳐도 같다", bl.dots === "쿨… 자는 중이츄" && bl.again);
    eq("두 문장이 마침표 없이 붙은 대사가 없다", bl.glued, []);
    ok("웹 말풍선은 줄바꿈을 빈칸으로 접는다(예전 그대로)", bl.webWS === "normal", bl.webWS);
    ok("앱 말풍선은 문장마다 줄을 나누고 낱말 사이에서만 접는다", bl.appWS === "pre-line" && bl.appWB === "keep-all", bl.appWS + " " + bl.appWB);
    eq("두 문장 대사는 앱에서 두 줄이다", bl.twoLines, 2);
    eq("앱 말풍선은 낱말 가운데서 접히지 않는다", bl.midWord, []);
  }

  // ── 6-10k. 앱다움: 백업은 공유 시트로 · 길게 눌러도 글자 선택 없음 · 런치 화면 색 ─────
  {
    const iosSrc = f => fs.readFileSync(path.resolve(__dirname, "..", "ios", f), "utf8");
    const shareSwift = iosSrc("Sources/ShareBridge.swift"), vcSwift = iosSrc("Sources/WebAppViewController.swift"), yml = iosSrc("project.yml");
    ok("앱 껍데기가 백업 통로(amgijwiShare)를 달고 결과를 shareDoneFromApp 으로 돌려준다",
       /static let name = "amgijwiShare"/.test(shareSwift) && /static let reply = "shareDoneFromApp"/.test(shareSwift)
       && vcSwift.indexOf("add(share, name: ShareBridge.name)") >= 0);
    ok("아이패드에서 공유 시트가 멈추지 않게 기준 자리를 준다", shareSwift.indexOf("popoverPresentationController") >= 0 && shareSwift.indexOf("sourceView") >= 0);
    ok("파일 이름은 마지막 조각만 써서 임시 폴더 밖으로 못 나간다", shareSwift.indexOf("lastPathComponent") >= 0);
    ok("링크를 길게 눌러도 사파리 미리보기가 뜨지 않는다", vcSwift.indexOf("allowsLinkPreview = false") >= 0);
    ok("런치 화면과 창 바탕이 크림색이라 흰 화면이 번쩍이지 않는다",
       /UILaunchScreen:\s*\n\s*UIColorName: LaunchBackground/.test(yml)
       && fs.existsSync(path.resolve(__dirname, "..", "ios", "Assets.xcassets", "LaunchBackground.colorset", "Contents.json"))
       && iosSrc("Sources/SceneDelegate.swift").indexOf('UIColor(named: "LaunchBackground")') >= 0);

    const bk = await page.evaluate(async () => {
      const r = {};
      const before = JSON.stringify(data.backup || null);
      const sent = [];
      const w0 = window.webkit;
      window.webkit = { messageHandlers: { amgijwiShare: { postMessage: m => sent.push(m) } } };
      window.__amgijwiNative = true; document.documentElement.classList.add("dot"); applyEnvText();
      await new Promise(res => setTimeout(res, 350));
      go("set");
      r.label = $("#expFile").innerText.trim();
      $("#expFile").click();
      r.sent = sent.length;
      r.name = sent[0] && sent[0].name;
      try { r.app = JSON.parse(sent[0].text).app; } catch (e) { r.app = null; }
      r.notYet = JSON.stringify(data.backup || null) === before;
      shareDoneFromApp(false);
      r.cancelKept = JSON.stringify(data.backup || null) === before;
      shareDoneFromApp(true);
      r.marked = !!data.backup && data.backup.at === ymd(new Date());
      const cs = s => getComputedStyle(document.querySelector(s));
      r.appBody = cs("body").webkitUserSelect || cs("body").userSelect;
      r.appInput = cs("#impBox").webkitUserSelect || cs("#impBox").userSelect;
      window.webkit = w0;
      delete window.__amgijwiNative; document.documentElement.classList.remove("dot"); applyEnvText();
      await new Promise(res => setTimeout(res, 50));
      r.webLabel = $("#expFile").innerText.trim();
      r.webBody = cs("body").webkitUserSelect || cs("body").userSelect;
      r.webBridge = shareBridge();
      if (before === "null") delete data.backup; else data.backup = JSON.parse(before);
      persist(); go("home");
      return r;
    });
    eq("앱의 백업 버튼은 파일로 내보내기, 웹은 파일로 저장", [bk.label, bk.webLabel], ["파일로 내보내기", "파일로 저장"]);
    ok("앱에서 백업을 누르면 파일 이름과 백업 내용이 앱으로 넘어간다", bk.sent === 1 && /^암기쥐-백업-\d{8}-\d{4}\.json$/.test(bk.name) && bk.app === "brewnote", JSON.stringify(bk));
    ok("공유 시트에서 보내기 전에는 백업한 것으로 치지 않는다", bk.notYet && bk.cancelKept);
    ok("보냈다는 답이 오면 백업한 것으로 적는다", bk.marked);
    ok("앱은 길게 눌러도 글자가 선택되지 않고, 입력칸은 선택된다", bk.appBody === "none" && bk.appInput === "text", bk.appBody + " / " + bk.appInput);
    ok("웹은 글자 선택 그대로이고 백업 통로를 쓰지 않는다", bk.webBody !== "none" && bk.webBridge === null, bk.webBody);
  }

  // ── 6-10l. 진동 · 개봉 택 표시 규칙 · 설정 카테고리 줄 ─────────────────
  {
    const iosSrc = f => fs.readFileSync(path.resolve(__dirname, "..", "ios", f), "utf8");
    ok("앱 껍데기가 진동 통로(amgijwiHaptic)를 단다",
       /static let name = "amgijwiHaptic"/.test(iosSrc("Sources/HapticBridge.swift"))
       && iosSrc("Sources/WebAppViewController.swift").indexOf("add(haptics, name: HapticBridge.name)") >= 0);
    const coreSrc = fs.readFileSync(path.resolve(__dirname, "..", "www", "js", "core.js"), "utf8");
    ok("새로 설치하면 요일만, 이미 쓰던 사람은 번호 색으로 시작한다", /cleanTagRule\(data\.tagRule, freshData \? "day" : "num"\)/.test(coreSrc));

    const hp = await page.evaluate(async () => {
      const r = {};
      const got = [];
      const w0 = window.webkit;
      window.webkit = { messageHandlers: { amgijwiHaptic: { postMessage: k => got.push(k) } } };
      const take = () => got.splice(0).join(",");
      r.webSilent = (haptic("light"), take());
      window.__amgijwiNative = true;
      const backup = JSON.stringify(data);
      startSession(liveDrinks().slice(0, 2));
      take();
      flipCard(); r.flip = take();
      action("ok"); r.ok = take();
      action("again"); r.again = take();       // 두 장이라 여기서 끝난다
      r.done = take() || "";
      r.finish = r.again.split(",").slice(1).join(",");
      r.again = r.again.split(",")[0];
      confirmBox("확인", "지울까요?", "삭제", () => {}); r.confirm = take(); $("#dlg").classList.remove("on");
      openLock("set"); lockBad("번호가 맞지 않아요"); r.pin = take(); $("#lock").classList.remove("on");
      go("home"); take();
      document.querySelector('.tab[data-go="home"]').click(); r.sameTab = take();
      document.querySelector('.tab[data-go="list"]').click(); r.otherTab = take();
      data.haptic = false; flipCard(); r.off = take();
      delete data.haptic;
      window.webkit = w0; delete window.__amgijwiNative;
      data = JSON.parse(backup); persist(); go("home");
      return r;
    });
    eq("웹은 진동을 보내지 않는다", hp.webSilent, "");
    eq("뒤집기 · 외웠어요 · 다시 볼래요 · 끝 · 확인 창 · PIN 틀림",
       [hp.flip, hp.ok, hp.again, hp.finish, hp.confirm, hp.pin], ["light", "light", "soft", "success", "warning", "error"]);
    eq("다른 탭으로 갈 때만 딸깍", [hp.sameTab, hp.otherTab], ["", "selection"]);
    eq("설정에서 끄면 울리지 않는다", hp.off, "");

    const tg = await page.evaluate(async () => {
      const r = {};
      const backup = JSON.stringify(data);
      const now = new Date(2026, 8, 29);            // 화요일
      const cell = (rule) => { const d = document.createElement("div"); d.innerHTML = tagRowsHTML(5, now, rule); const c = d.querySelector(".tagno"); return [c.textContent, c.classList.contains("plain"), c.style.backgroundColor]; };
      r.dflt = cleanTagRule(undefined, "day");
      r.bad = cleanTagRule({ mode:"x", base:"y", day:["#12345Z"], num:"no" }, "num");
      r.num = cell(cleanTagRule({ mode:"num" }, "num"));
      r.day = cell(cleanTagRule({ mode:"day" }, "day"));                    // 첫 줄 = 9/25(금) 개봉 · 9/29(화) 폐기
      r.dayKill = cell(cleanTagRule({ mode:"day", base:"kill" }, "day"));
      const custom = cleanTagRule({ mode:"dayColor" }, "day"); custom.day[5] = "#112233";
      r.dayColor = cell(custom);
      r.head = tagTableHTML(5, now).match(/<h4>([^<]+)<\/h4><span>([^<]+)<\/span>/).slice(1);
      r.dates = /26\.09\.25 \(금\) 개봉/.test(tagRowsHTML(5, now, data.tagRule)) && /26\.09\.29 \(화\) 폐기/.test(tagRowsHTML(5, now, data.tagRule));

      // 시트에서 고르고 색을 바꿔 저장
      data.shelf = [{ id:"t5", name:"개봉한 우유", place:"냉장", dur:"5일", note:"" }];
      data.tagRule = cleanTagRule({ mode:"day" }, "day");
      state.listTab = "shelf"; go("list");
      r.ruleBtn = $("#tagRuleBtn") && $("#tagRuleBtn b").textContent;
      $("#tagRuleBtn").click();
      document.querySelector('#tr-mode [data-v="dayColor"]').click();
      document.querySelector('#tr-base [data-v="kill"]').click();
      const inp = document.querySelector('.trc input[data-i="2"]'); inp.value = "#abcdef"; inp.dispatchEvent(new Event("change"));
      r.preview = document.querySelectorAll("#sheet .trprev .tagrow").length;
      const beforeSave = data.tagRule.mode;
      $("#trSave").click();
      r.saved = [beforeSave, data.tagRule.mode, data.tagRule.base, data.tagRule.day[2]];
      // 예전 백업(규칙 없음)을 되살려도 지금 규칙을 지킨다
      const old = JSON.parse(backupJSON()); delete old.data.tagRule; delete old.data.haptic;
      applyBackup(JSON.stringify(old)); $("#dlgYes").click();
      r.afterOldRestore = data.tagRule.mode;

      // 도트: 택 표시 줄 · 시트 · 카테고리 줄
      window.__amgijwiNative = true; document.documentElement.classList.add("dot"); applyEnvText();
      await new Promise(res => setTimeout(res, 350));
      state.listTab = "shelf"; go("list");
      const seen = el => !!el && el.getClientRects().length > 0;
      const small = root => [...document.querySelectorAll(root + " *")].filter(el => seen(el) && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
        .map(el => getComputedStyle(el)).filter(c => c.fontFamily.indexOf("NeoDGM") >= 0 && parseFloat(c.fontSize) < 16).map(c => c.fontSize);
      r.dotSmall = small("#s-list");
      $("#tagRuleBtn").click();
      r.sheetSmall = small("#sheet");
      r.swRad = getComputedStyle(document.querySelector("#sheet .trc .sw")).borderTopLeftRadius;
      closeSheet();
      go("set");
      r.catRad = getComputedStyle(document.querySelector("#catList .catrow")).borderTopLeftRadius;
      r.miniRad = getComputedStyle(document.querySelector("#catList .minibtn")).borderTopLeftRadius;
      r.hapticCard = seen($("#hapticBtns"));
      delete window.__amgijwiNative; document.documentElement.classList.remove("dot");
      applyEnvText();
      r.hapticCardWeb = seen($("#hapticBtns"));
      data = JSON.parse(backup); persist(); go("home");
      return r;
    });
    ok("규칙이 없거나 틀린 값이면 처음 값으로 다듬는다",
       tg.dflt.mode === "day" && tg.dflt.base === "open" && tg.dflt.day.length === 7 && tg.bad.mode === "num" && tg.bad.base === "open" && tg.bad.day[0] === "#E1832E");
    eq("번호 색: 오늘 버릴 줄이 1번, 번호 색", tg.num, ["1", false, "rgb(225, 131, 46)"]);
    eq("요일만: 색 없이 개봉 요일", tg.day, ["금", true, ""]);
    eq("요일 기준을 버리는 날로 바꾸면 폐기 요일", tg.dayKill[0], "화");
    eq("요일 색: 사용자가 고친 색을 쓴다", tg.dayColor, ["금", false, "rgb(17, 34, 51)"]);
    eq("이름은 N일 기한 · 오늘 기준 N줄", tg.head, ["5일 기한", "오늘 기준 5줄"]);
    ok("날짜 옆에 요일을 적는다", tg.dates);
    eq("개봉관리 맨 위에 지금 규칙이 보인다", tg.ruleBtn, "요일만");
    eq("시트에서 고르고 색을 바꿔 저장해야 바뀐다(미리보기 3줄)", [tg.preview].concat(tg.saved), [3, "day", "dayColor", "kill", "#ABCDEF"]);
    eq("규칙 없는 예전 백업을 되살려도 지금 규칙을 지킨다", tg.afterOldRestore, "dayColor");
    eq("도트: 개봉관리 · 규칙 시트의 도트 글꼴도 16px 이상", tg.dotSmall.concat(tg.sheetSmall), []);
    eq("도트: 색 칸 · 카테고리 줄 · 작은 버튼이 네모다", [tg.swRad, tg.catRad, tg.miniRad], ["0px", "0px", "0px"]);
    ok("진동 설정은 앱에만 보인다", tg.hapticCard === true && tg.hapticCardWeb === false);
  }

  // ── 6-10m. 앱 쪽 사본: 저장할 때마다 앱에 한 벌, 웹뷰 저장소가 비면 되살림 ─────────
  {
    const iosSrc = f => fs.readFileSync(path.resolve(__dirname, "..", "ios", f), "utf8");
    const sb = iosSrc("Sources/StoreBridge.swift"), vc = iosSrc("Sources/WebAppViewController.swift");
    ok("앱 껍데기가 사본 통로(amgijwiStore)를 달고, 켤 때 사본을 문서보다 먼저 넣는다",
       /static let name = "amgijwiStore"/.test(sb) && vc.indexOf("add(store, name: StoreBridge.name)") >= 0
       && vc.indexOf("StoreBridge.startupScript()") >= 0 && /injectionTime: \.atDocumentStart/.test(sb) && sb.indexOf("__amgijwiNativeCopy") >= 0);
    ok("사본은 통째로 새로 쓰고(atomic), 레시피 목록이 있는 JSON 만 받는다",
       sb.indexOf("options: [.atomic]") >= 0 && sb.indexOf('obj["drinks"] is [Any]') >= 0);
    ok("우리 페이지의 본문 프레임이 보낸 것만 받는다", sb.indexOf("frameInfo.isMainFrame") >= 0 && sb.indexOf("BundleSchemeHandler.scheme") >= 0);

    // 저장할 때 앱으로 넘어가는지 (여러 번 저장해도 한 번, 앱을 내리면 바로)
    const sv = await page.evaluate(async () => {
      const r = {}; const sent = [];
      const w0 = window.webkit;
      window.webkit = { messageHandlers: { amgijwiStore: { postMessage: m => sent.push(m) } } };
      window.__amgijwiNative = true;
      persist(); persist(); persist();
      r.before = sent.length;
      await new Promise(res => setTimeout(res, 800));
      r.after = sent.length;
      r.op = sent[0] && sent[0].op;
      try { r.drinks = JSON.parse(sent[0].text).drinks.length === data.drinks.length; } catch (e) { r.drinks = false; }
      persist(); flushNativeCopy(); r.flushNow = sent.length;
      delete window.__amgijwiNative;
      persist(); await new Promise(res => setTimeout(res, 800)); r.web = sent.length;
      window.webkit = w0;
      return r;
    });
    eq("여러 번 저장해도 잠깐 모았다가 한 번 넘긴다", [sv.before, sv.after, sv.op, sv.drinks], [0, 1, "save", true]);
    eq("앱을 내릴 때는 기다리지 않고 바로 넘긴다", sv.flushNow, 2);
    eq("웹은 앱으로 넘기지 않는다", sv.web, 2);

    // 웹뷰 저장소가 빈 채로 켜면 사본으로 되살린다
    const copyData = await page.evaluate(() => {
      const d = JSON.parse(JSON.stringify(data));
      d.drinks = d.drinks.slice(0, 2); d.drinks[0].name = "사본에만 있는 라떼"; d.hints = ["onboard"];
      return JSON.stringify(d);
    });
    const run = async (native, preset) => {
      const ctx = await browser.newContext();
      const pg = await ctx.newPage();
      const errs = []; pg.on("pageerror", e => errs.push(String(e)));
      await pg.addInitScript(([native, copy]) => { if (native) window.__amgijwiNative = true; window.__amgijwiNativeCopy = copy; }, [native, copyData]);
      if (preset) { await pg.goto(APP); await pg.evaluate(() => { data.drinks[0].name = "웹뷰에 있는 라떼"; persist(); }); }
      await pg.goto(APP); await pg.waitForTimeout(1600);
      const r = await pg.evaluate(() => ({ first: data.drinks[0] && data.drinks[0].name, n: data.drinks.length, restored: restoredFromCopy,
        toast: $("#toast").textContent, saved: !!localStorage.getItem("brewnote.v1") }));
      r.errs = errs; await ctx.close(); return r;
    };
    const fresh = await run(true, false), kept = await run(true, true), web = await run(false, false);
    ok("웹뷰 저장소가 비었으면 앱 사본으로 되살리고 알린다",
       fresh.restored === true && fresh.first === "사본에만 있는 라떼" && fresh.n === 2 && /사본으로 레시피를 되살렸어요/.test(fresh.toast) && fresh.saved, JSON.stringify(fresh));
    ok("웹뷰에 데이터가 있으면 사본은 쓰지 않는다(웹뷰가 최신)", kept.restored === false && kept.first === "웹뷰에 있는 라떼", JSON.stringify(kept));
    ok("웹은 사본을 쓰지 않는다", web.restored === false && web.first !== "사본에만 있는 라떼", JSON.stringify(web));
    eq("되살리는 동안 오류가 없다", fresh.errs.concat(kept.errs, web.errs), []);

    // 전체 삭제 뒤에도 택 표시 규칙 · 진동 설정이 남아 개봉관리가 그려진다
    const wp = await page.evaluate(async () => {
      const backup = JSON.stringify(data);
      const errs = []; const h = e => errs.push(String(e.message || e)); window.addEventListener("error", h);
      $("#wipeAll").click(); $("#dlgYes").click();
      const r = { rule: data.tagRule && data.tagRule.mode, hap: "haptic" in data };
      data.shelf = [{ id:"w5", name:"우유", place:"냉장", dur:"5일", note:"" }];
      state.listTab = "shelf"; state.shelfOpen.add(5);
      try { go("list"); r.rows = document.querySelectorAll("#shelfBody .tagrow").length; } catch (e) { r.err = String(e); }
      window.removeEventListener("error", h); r.errs = errs;
      data = JSON.parse(backup); persist(); go("home");
      return r;
    });
    ok("전체 삭제 뒤에도 택 표시 규칙이 남아 개봉관리가 그려진다", !!wp.rule && wp.rows === 5 && !wp.err && wp.errs.length === 0, JSON.stringify(wp));
  }

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
