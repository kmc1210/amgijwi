/* 암기쥐 — 쥐돌이 옷장 (1.1 · 앱 전용)
   한 바퀴 외우면 치즈가 모이고, 그 치즈로 아이템을 사서 쥐돌이에게 입힌다.
   아이템은 쥐돌이 28×40 그림 위에 같은 칸으로 덧그리는 행(rows)이다. y 는 시작 행.
   배경은 넣지 않는다(쥐돌이만 액자에 넣으면 화면과 따로 논다). 화면 분위기는 테마가 맡는다.
   치즈 · 가진 것 · 입은 것은 data.closet 에 두어 레시피와 같이 기기 안에 남고 백업을 따라간다.
   옷장 자체는 통신하지 않는다. "광고 보고 치즈 받기" 버튼만 앱에 광고를 부탁한다(ads.js) */

/* 아이템 색. 쥐돌이 팔레트(MOUSE_PAL)와 글자가 겹치지 않는다 */
const CLOSET_PAL = {"1": "#6B2F2A", "2": "#A8423A", "3": "#C9605A", "P": "#F08AA0", "Q": "#B8455F", "Z": "#3A2C22", "4": "#8A5A3C", "5": "#5E3A24", "6": "#A87452", "7": "#C7BDB1", "O": "#4A423A", "U": "#FCF7F1", "X": "#78543A",
  "A": "#2F6B4F", "a": "#4E9A6E", "K": "#2A2F3A",
  /* 핼러윈(1.2.1): 짙은 보라 · 보라 빛 · 호박 주황 · 짙은 주황 · 번쩍이는 빛 · 망토 주름 */
  "H": "#3B2A4A", "I": "#6A4C86", "J": "#E8822A", "W": "#B85A16", "C": "#FFF4B8", "D": "#454B5C"};
Object.keys(CLOSET_PAL).forEach(k=>{ MOUSE_PAL[k] = CLOSET_PAL[k]; });

const CLOSET_SLOTS = [["head","머리"],["face","얼굴"],["body","몸"],["hand","손"]];
/* 기간 한정 아이템(season). 그 날까지만 옷장에 나오고 살 수 있다. 산 것은 기간이 지나도 그대로 입는다 */
const HALLOWEEN = {name:"핼러윈", until:"2026-11-08"};
/* 망토를 입고 달릴 때 뒤를 따라오는 작은 박쥐(날개 위 · 아래 두 장) */
const RUN_BAT = [["H.....H", "HH.H.HH", ".H2H2H.", "..HHH.."], [".......", ".HH.HH.", "HHH2H2H", "H..H..H"]];
const CLOSET_ITEMS = [
  {id:"beret", slot:"head", name:"베레모", price:20, y:1, rows:[
      ".............11.............",
      "...........122221...........",
      ".........1322222221.........",
      "........132222222221........",
      "........122222222221........",
      ".........1111111111........."]},
  {id:"ribbon", slot:"head", name:"리본", price:10, y:2, rows:[
      "..................QQ.QQ.....",
      "..................QPQPQ.....",
      "..................QPPPQ.....",
      "..................QQ.QQ....."]},
  {id:"bandana", slot:"head", name:"바리스타 두건", price:15, y:5, rows:[
      "......AaaaaaaaaaaaaaaA......",
      "......AaUaaaaUaaaaUaaAAA....",
      "......AAAAAAAAAAAAAAAA.AA..."]},
  {id:"partyhat", slot:"head", name:"생일 고깔모자", price:25, y:0, rows:[
      ".............PP.............",
      ".............RR.............",
      "............RRRR............",
      "............2222............",
      "...........RRRRRR...........",
      "...........222222...........",
      "..........RRRRRRRR..........",
      "..........jjjjjjjj.........."]},
  {id:"crown", slot:"head", name:"금빛 왕관", price:80, y:2, rows:[
      "..........R..RR..R..........",
      "..........RR.RR.RR..........",
      "..........RRRRRRRR..........",
      "..........R2RRBR2R..........",
      "..........qqqqqqqq.........."]},
  {id:"glasses", slot:"face", name:"동그란 안경", price:15, y:8, rows:[
      "........ZZZZZ..ZZZZZ........",
      ".......Z.....ZZ.....Z.......",
      ".......Z.....ZZ.....Z.......",
      ".......Z.....ZZ.....Z.......",
      ".......Z.....ZZ.....Z.......",
      ".......Z.....ZZ.....Z.......",
      "........ZZZZZ..ZZZZZ........"]},
  {id:"sunglasses", slot:"face", name:"선글라스", price:20, y:9, rows:[
      ".......ZZZZZZZZZZZZZZ.......",
      ".......ZKKKKZZZZKKKKZ.......",
      ".......ZKhKKZ..ZKhKKZ.......",
      ".......ZKKKKZ..ZKKKKZ.......",
      "........ZZZZ....ZZZZ........"]},
  {id:"monocle", slot:"face", name:"외알 안경", price:25, y:8, rows:[
      "...............qqqqq........",
      "..............q.....q.......",
      "..............q.....q.......",
      "..............q.....q.......",
      "..............q.....q.......",
      "..............q.....q.......",
      "...............qqqqq........",
      "...................q........",
      "....................q.......",
      "....................q.......",
      "...................q........"]},
  {id:"apron", slot:"body", name:"카페 앞치마", price:30, y:22, rows:[
      "........555555555555........",
      "........566666666665........",
      "........544444444445........",
      "........544444444445........",
      "........544444444445........",
      "......5554444444444555......",
      ".55555555555555555555555555.",
      "......5444444444444445......",
      "......5445555555555445......",
      "......5445666556665445......",
      "......5445666556665445......",
      "......5445555555555445......",
      "......5444444444444445......",
      ".......55555555555555......."]},
  {id:"bowtie", slot:"body", name:"나비넥타이", price:15, y:21, rows:[
      "..........11....11..........",
      "..........22211222..........",
      "..........22211222..........",
      "..........11....11.........."]},
  {id:"mug", slot:"hand", name:"머그컵", price:25, y:22, rows:[
      "...........7..7.............",
      "............7..7............",
      "...........7..7.............",
      "owcwww....OOOOOO......wwwcwo",
      ".ocwww....OXXXXO......wwwco.",
      ".owcww.ppcOUUUUOOOcpp.wwcwo.",
      "ocwwww.ppcOUUUUO.Ocpp.wwwwco",
      ".owcww.ppcOUUUUOOOcpp.wwcwo.",
      ".ocwww.ddcOUUUUO..cdd.wwwco.",
      "..........OOOOOO............"]},
  {id:"croissant", slot:"hand", name:"크루아상", price:20, y:22, rows:[
      "............................",
      "..........tttttttt..........",
      "........ttRRrTrRRrtt........",
      "owcwww.trrTrrrrrrTrrt.wwwcwo",
      ".ocwwwtrrTrrrrrrrrTrrtwwwco.",
      ".owcww.ppcrrTttTrrcpp.wwcwo.",
      "ocwwww.ppctt....ttcpp.wwwwco",
      ".owcww.ppc........cpp.wwcwo.",
      ".ocwww.ddc........cdd.wwwco."]},
  {id:"frappe", slot:"hand", name:"프라푸치노", price:30, y:20, rows:[
      "...............22...........",
      "...........OOOO2OO..........",
      "..........OUUUU2UO..........",
      ".........OUUUUUUUUO.........",
      ".........OOOOOOOOOO.........",
      "owcwww....O666666O....wwwcwo",
      ".ocwww....O656656O....wwwco.",
      ".owcww.ppcO666666Ocpp.wwcwo.",
      "ocwwww.ppcOUUUUUUOcpp.wwwwco",
      ".owcww.ppcO666666Ocpp.wwcwo.",
      ".ocwww.ddcO666666Ocdd.wwwco.",
      "..........OOOOOOOO.........."]},
  /* 귀까지 머리 위를 덮고 끝이 오른쪽으로 꺾인다 */
  {id:"witchhat", slot:"head", name:"마녀 모자", price:60, y:0, season:HALLOWEEN, rows:[
      "..................HHHHH.....",
      "...........HHHHHHHIHH.HH....",
      "........HHHHHHHHHIHH...H....",
      ".......HHHHHHHHHHIHHH.......",
      "......HHHHHHHHHHHIHHHH......",
      "......JJJJJJJJJJJJJJJJ......",
      ".....HHHHHHHHHHHHHHHHHH.....",
      "..HHHHHHHHHHHHHHHHHHHHHHHH..",
      "....IIIIIIIIIIIIIIIIIIII...."]},
  /* 납작한 호박을 머리 위에 얹는다(눈과 겹치지 않게 두 줄 띄운다). 얼굴은 그대로 보이고, 깜빡일 때 새긴 얼굴이 번쩍인다(glow) — 빛나는 아이템이라 더 비싸다 */
  {id:"pumpkinhead", slot:"head", name:"호박 머리", price:80, y:0, season:HALLOWEEN, rows:[
      "........._....aA.._.........",
      ".........WWJJWWJJWW.........",
      ".......WWJJJJWWJJJJWW.......",
      "......WJJKKJJJJJJKKJJW......",
      "......WJJJJJJKKJJJJJJW......",
      "......WJKJKJKJJKJKJKJW......",
      ".......WWWWWWWWWWWWWW......."],
    glow:{K:"C"},
    perk:"깜빡일 때 번쩍이고, 달릴 때도 써요",
    run:{y:0, rows:[
        "........______________......",
        "........___aA_________......",
        "........WWJJWWJJW.._____....",
        "......WJJJJJWJJJJJW_____....",
        ".....WJKKJJJWJJJJJW_____....",
        ".....WJJJJJJWJJJJJW_____....",
        ".....WKJKJKJWJJJJJW_____....",
        "......WWWWWWWWWWWW._____...."]}},
  /* 날개 없이 박쥐 얼굴만, 오른쪽 귀 옆에 비스듬히 꽂은 핀 */
  {id:"batpin", slot:"head", name:"박쥐 머리핀", price:20, y:1, season:HALLOWEEN, rows:[
      "..................H.........",
      "..................HH....H...",
      "..................HHH..HH...",
      "..................H2HHHHHH..",
      "..................HHHHH2HH..",
      "...................HHHHHHH..",
      "....................HhHHhHR.",
      ".....................HHHH.qR",
      "...........................q"]},
  /* 눈은 보이게 뚫린 가면 */
  {id:"mask", slot:"face", name:"가면무도회 가면", price:25, y:9, season:HALLOWEEN, rows:[
      "......IHHHHHHHHHHHHHHI......",
      ".....IHH.....HH.....HHI.....",
      ".....HH......HH......HH.....",
      ".....HH......HH......HH.....",
      "......HH.....HH.....HH......",
      ".......HHHHH....HHHHH......."]},
  /* 몸 바깥까지 퍼지는 코트(wide). 서 있는 깃 · 가슴의 금색 끈 매듭 · 주름 */
  {id:"cape", slot:"body", name:"뱀파이어 망토", price:120, y:17, season:HALLOWEEN, wide:true, rows:[
      "...K2..................2K...",
      "..K222................222K..",
      "..K2222..............2222K..",
      "..KKKKKKKKKKKKKKKKKKKKKKKK..",
      ".KKKKKKKKKKKKKKKKKKKKKKKKKK.",
      "KKKKKKKRRRRRRqqRRRRRRKKKKKKK",
      "KKKKKKKKKKKKR..RKKKKKKKKKKKK",
      "KKKKKKKKKKKKq..qKKKKKKKKKKKK",
      "KKKKKKKKKKK2....2KKKKKKKKKKK",
      "KKKKKDKKKKK2....2KKKKKDKKKKK",
      "KKKKKDKKKKK2....2KKKKKDKKKKK",
      "KKKKKDKKKK2......2KKKKDKKKKK",
      "KKKKKDKKKK2......2KKKKDKKKKK",
      "KKKKKDKKKK2......2KKKKDKKKKK",
      "KKKKKDKKKK2......2KKKKDKKKKK",
      "KKKKKDKKK2........2KKKDKKKKK",
      "KKKKKDKKK2........2KKKDKKKKK",
      "KKKKKDKKK2........2KKKDKKKKK",
      "KKKKKDKK2..........2KKDKKKKK",
      "KKKKKKKK2..........2KKKKKKKK"],
    perk:"달릴 때 망토가 펄럭이고 박쥐가 따라와요",
    run:{y:18, cells:".owc", rows:[
        "....................KK......",
        "...................K22K.....",
        "..................K222K.....",
        "...............qRRKKKKK.....",
        "............qRRq............",
        ".....RR.RRqR................",
        ".....RqRqR..................",
        "......RRR...................",
        "......R.R...................",
        "......q..q.................."],
      tail:[[
          "..KKKK................",
          ".KKKKK........KDK.....",
          "KKKKKK......DKKKKKDKK.",
          "KKKKKK....KKKKKKKKKKKD",
          "KKKKKK...DKKKK2K222222",
          "2KKKKK.KKKKKKK22222222",
          "22KKKKDKKKKKK2.2......",
          ".22KKKKKKKKK22........",
          "..22KKKKKK222.........",
          "...22KKKK222..........",
          "....22KKK2............",
          ".....2KK2.............",
          "......222.............",
          "......22..............",
          "......................",
          "......................",
          "......................",
          "......................"],
        [
          "..KKKK................",
          ".KKKKK................",
          "KKKKKK...DKKD.........",
          "KKKKKK.KKKKKKKKD....KD",
          "KKKKKKDKKKKKKKKKKKDKK2",
          "2KKKKKKKKKKKKKKKKKKK22",
          "22KKKKKKKKKKKK2KK2222.",
          ".22KKKKKK22222222222..",
          "..22KKKKK22222.22.....",
          "...22KKK2.............",
          "....22222.............",
          ".....222..............",
          "......................",
          "......................",
          "......................",
          "......................",
          "......................",
          "......................"],
        [
          "..KKKK................",
          ".KKKKK..............KD",
          "KKKKKK.............KK2",
          "KKKKKKDKK........KDK22",
          "KKKKKKKKKDKK...DKKK22.",
          "2KKKKKKKKKKKDKKKK222..",
          "22KKKKKKKKKKKKKKK22...",
          ".22KKKKKKKKKKKKK2.....",
          "..22KKKKKKKKKK222.....",
          "...22K2K2222K222......",
          "....2222222222........",
          ".....2.2....2.........",
          "......................",
          "......................",
          "......................",
          "......................",
          "......................",
          "......................"]],
      bats:true}},
  /* 두 손으로 드는 호박 바구니. 깜빡일 때 눈 · 입이 번쩍인다(glow) — 빛나는 아이템이라 더 비싸다 */
  {id:"pumpkin", slot:"hand", name:"호박 바구니", price:60, y:22, season:HALLOWEEN, rows:[
      "..........ZZZZZZZZ..........",
      ".........Z........Z.........",
      ".........Z...Aa...Z.........",
      "owcwww..WJJJJJJJJJJW..wwwcwo",
      ".ocwww.WJJKKJJJJKKJJW.wwwco.",
      ".owcwwppcJKKJJJJKKJcppwwcwo.",
      "ocwwwwppcJJJJJJJJJJcppwwwwco",
      ".owcwwppcJKJKJKJKJKcppwwcwo.",
      ".ocwwwddcJJKKKKKKJJcddwwwco.",
      ".........WWWWWWWWWW........."],
    glow:{K:"C"},
    perk:"깜빡일 때 눈 · 입이 번쩍여요"}
];
/* 치즈: 한 바퀴 +1(하루 10개까지), 7일 연속 접속 +5.
   한 바퀴는 5장 이상이어야 친다 — 한 장짜리 바퀴를 열 번 넘겨 몇 초 만에 하루치를 받던 구멍을 막는다.
   5장보다 짧은 바퀴(다시 볼 메뉴 두 장, 메뉴가 셋뿐인 분류)는 버리지 않고 장수를 모아 두었다가 5장이 차면 +1 */
const CHEESE_ROUND = 1, CHEESE_ROUND_DAY_MAX = 10, CHEESE_STREAK = 5, CHEESE_ROUND_MIN = 5;

function cleanCloset(c){
  c = (c && typeof c === "object") ? c : {};
  const ids = CLOSET_ITEMS.map(i=>i.id);
  const own = Array.isArray(c.own) ? c.own.filter(id=>ids.indexOf(id) >= 0) : [];
  const wear = {};
  CLOSET_SLOTS.forEach(([slot])=>{
    const id = c.wear && c.wear[slot];
    const it = closetItem(id);
    if(it && it.slot === slot && own.indexOf(id) >= 0) wear[slot] = id;    // 안 가진 것은 입을 수 없다
  });
  return {
    cheese: Math.max(0, Math.floor(Number(c.cheese) || 0)),
    own: own, wear: wear,
    roundDay: typeof c.roundDay === "string" ? c.roundDay : "",
    roundCount: Math.max(0, Math.floor(Number(c.roundCount) || 0)),
    streakDay: typeof c.streakDay === "string" ? c.streakDay : "",
    /* 광고를 본 날과 그날 본 횟수(하루 3번까지 — ads.js) */
    adDay: typeof c.adDay === "string" ? c.adDay : "",
    adCount: Math.max(0, Math.floor(Number(c.adCount) || 0)),
    /* 짧은 바퀴에서 모아 둔 장수(0~4) */
    pool: Math.min(CHEESE_ROUND_MIN - 1, Math.max(0, Math.floor(Number(c.pool) || 0)))
  };
}
function closetItem(id){ return CLOSET_ITEMS.filter(i=>i.id === id)[0] || null; }
/* 지금 옷장에서 팔고 있는가(기간 한정이면 그 날까지). today 는 테스트가 준다.
   기기 시계를 믿는다 — 시계를 되돌리면 다시 살 수 있지만, 통신 없이 기기 안에서만 쓰는 꾸미기라 막지 않는다 */
function closetOnSale(it, today){ return !!it && (!it.season || (today || ymd(new Date())) <= it.season.until); }
data.closet = cleanCloset(data.closet);

/* ---------- 입히기 ----------
   그리는 차례: 손 → 몸 → 얼굴 → 머리.
   머그(손)는 팔을 가운데로 모으는 칸까지 갖고 있어 먼저 그린다.
   앞치마(몸)는 쥐돌이 몸 색 칸(w · c)에만 칠한다. 그래서 발 · 머그 · 치즈 · 커피잔은 앞치마 앞에 그대로 남고,
   허리띠는 발 뒤로 지나간다(머그를 들면 옆구리를 돌아 보인다).
   넓은 옷(wide — 뱀파이어 망토)은 몸 바깥의 빈칸 · 테두리(. o)까지 칠해 몸 라인보다 퍼진다. 팔은 망토 안으로 들어가고,
   발 · 앞발 · 손에 든 것(머그 · 호박 바구니)은 망토 앞에 남는다.
   깜빡이는 그림(mode blink)에서는 빛나는 아이템(glow — 바꿀 색 표)의 색을 바꿔 그린다 — 호박이 깜빡일 때마다 번쩍인다.
   mode: stand 서 있기 · eat 치즈 먹기 · sip 커피 마시기 · wx 날씨 옷. wear 를 주지 않으면 지금 입은 옷 */
const CLOSET_BODY_CELLS = "wc", CLOSET_WIDE_CELLS = ".owc";
function dressRows(rows, mode, wear){
  const w = wear || wornNow();
  const g = rows.map(r=>r.split(""));
  ["hand","body","face","head"].forEach(slot=>{
    const it = closetItem(w[slot]);
    if(!it) return;
    if(mode === "wx" && slot !== "face") return;                         // 우비 · 털모자 위에는 안경만
    if((mode === "eat" || mode === "sip") && slot === "hand") return;    // 치즈 · 커피를 드는 동안 머그는 내려놓는다
    const cells = it.wide ? CLOSET_WIDE_CELLS : CLOSET_BODY_CELLS;
    const glow = mode === "blink" && it.glow ? it.glow : null;
    it.rows.forEach((r, k)=>{
      const y = it.y + k;
      for(let x = 0; x < r.length; x++){
        const ch = glow && glow[r[x]] ? glow[r[x]] : r[x];
        if(ch === ".") continue;
        if(ch === "_"){ if(slot !== "body") g[y][x] = "."; continue; }      // 지우는 칸(호박 머리가 귀 끝을 덮는다)
        if(slot === "body" && cells.indexOf(g[y][x]) < 0) continue;
        g[y][x] = ch;
      }
    });
  });
  return g.map(r=>r.join(""));
}
/* 지금 보여줄 옷. 생일 하루는 머리에 고깔모자를 씌운다(가진 것 · 입은 것은 그대로 둔다 — birthday.js) */
function wornNow(){
  const hat = bdayHat();
  return hat ? Object.assign({}, data.closet.wear, {head:hat}) : data.closet.wear;
}
/* 입은 모습. 웹이나 자는 밤(이불)은 그대로. wear 를 주면 그 옷으로(옷장 화면은 생일에도 고른 옷을 보여준다).
   먹기 · 마시기 · 깜빡임은 0.4초마다 같은 그림을 다시 부르니 표정 · 배 · 입은 옷이 같으면 지난 그림을 쓴다 */
const wornCache = {};
let wornCacheN = 0;
function mouseSVGWorn(mood, puff, wear){
  if(!isDot() || mood === "night") return mouseSVG(mood, puff);
  wear = wear || wornNow();
  const key = mood + (puff ? "+" : "-") + JSON.stringify(wear);
  if(wornCache[key]) return wornCache[key];
  const mode = mood.indexOf("eat") === 0 ? "eat" : (mood.indexOf("sip") === 0 ? "sip" : (mood === "blink" ? "blink" : "stand"));
  if(++wornCacheN > 80){ Object.keys(wornCache).forEach(k=>delete wornCache[k]); wornCacheN = 1; }
  return (wornCache[key] = rowsSVG(dressRows(mouseRows(mood, puff), mode, wear), false));
}
/* 기쁜 얼굴: 웃으며 감은 눈(∩ ∩)과 발그레한 볼. 입은 원래대로 명암만 둔다. 서 있는 그림의 8~15행을 바꾼다.
   광고 고맙다 창(ads.js), 생일 폭죽이 터지는 동안의 홈(birthday.js), 전부 외운 한 바퀴의 끝(study.js)에 쓴다 */
const MOUSE_HAPPY = {y0:8, rows:[
  "......ocwwwwwwwwwwwwco......",
  "....oowcwwwwwwwwwwwwcwoo....",
  "...ocwwwwkkkwwwwkkkwwwwco...",
  "....owcwkwwwkwwkwwwkwcwo....",
  "...ocwwwwwwwwwwwwwwwwwwco...",
  "..owcppwwwwwwwwwwwwwwppcwo..",
  "...ocwdwwwwwwwwwwwwwwdwco...",
  "...owcwwwwwwwnnwwwwwwwcwo..."]};
/* 기다린 얼굴 세 가지(1.2). 며칠 만에 열었느냐에 따라 홈 쥐돌이가 이 얼굴로 맞는다. 입은 그대로 두고 눈 · 눈썹 · 볼만 바꾼다.
   sulk 삐침(3일~): 무거운 눈꺼풀에 옆을 흘겨보고 볼이 부푼다
   sad  시무룩(5일~): 눈꼬리가 처지고 아래를 본다
   down 풀이 죽음(7일~): 눈썹이 처지고 눈을 내리감았다. 눈꼬리에 눈물 한 방울(V) */
const MOUSE_FACES = {
  happy: MOUSE_HAPPY,
  sulk: {y0:8, rows:[
  "......ocwwwwwwwwwwwwco......",
  "....oowcwwwwwwwwwwwwcwoo....",
  "...ocwwwwwwwwwwwwwwwwwwco...",
  "....owcwooooowwooooowcwo....",
  "...ocwwwokhhowwokhhowwwco...",
  "..owcppwokhhowwokhhowppcwo..",
  "...ocwdwwooowwwwooowwdwco...",
  "...owcwwwwwwwnnwwwwwwwcwo..."]},
  sad: {y0:8, rows:[
  "......ocwwwwwwwwwwwwco......",
  "....oowcwwoowwwwoowwcwoo....",
  "...ocwwwwohhowwohhowwwwco...",
  "....owcwohhhowwohhhowcwo....",
  "...ocwwwohkhowwohkhowwwco...",
  "..owcwwwohkhowwohkhowwwcwo..",
  "...ocwwwwooowwwwooowwwwco...",
  "...owcwwwwwwwnnwwwwwwwcwo..."]},
  down: {y0:8, rows:[
  "......ocwnnwwwwwwnnwco......",
  "....oowcnwwwwwwwwwwncwoo....",
  "...ocwwwwwwwwwwwwwwwwwwco...",
  "....owcwwwwwwwwwwwwwwcwo....",
  "...ocwwwkwwwkwwkwwwkwwwco...",
  "..owcwwwwkkkwwwwkkkwwwwcwo..",
  "...ocwwwVwwwwwwwwwwwwwwco...",
  "...owcwwVwwwwnnwwwwwwwcwo..."]}
};
/* 얼굴을 바꾼 쥐돌이. kind: happy · sulk · sad · down.
   base: 바탕이 되는 서 있는 그림(홈은 지금 시간대 — 아침의 귀 옆 반짝이가 그대로 남는다). 없으면 낮.
   얼굴 아이템(안경 · 선글라스)은 벗긴다. 쓰고 있으면 눈이 가려 평소 얼굴과 구분이 안 된다.
   치즈 먹기 끝이나 깜빡임 때 거듭 부르니 mouseSVGWorn 처럼 지난 그림을 다시 쓴다 */
const faceCache = {};
function faceMouseSVG(kind, base){
  const face = MOUSE_FACES[kind] || MOUSE_FACES.happy;
  base = (base === "morning" || base === "evening") ? base : "day";
  const wear = Object.assign({}, isDot() ? wornNow() : {});
  delete wear.face;
  const key = kind + base + JSON.stringify(wear);
  if(faceCache[key]) return faceCache[key];
  const rows = mouseRows(base);
  face.rows.forEach((r, i)=>{ rows[face.y0 + i] = r; });
  return (faceCache[key] = rowsSVG(isDot() ? dressRows(rows, "stand", wear) : rows, false));
}
function happyMouseSVG(base){ return faceMouseSVG("happy", base); }
function weatherSVGWorn(wx){
  return rowsSVG(isDot() ? dressRows(WEATHER[wx], "wx") : WEATHER[wx], false);
}
/* 아이템 하나만 입힌 미리보기(옷장 칸 그림) */
function itemPreviewSVG(id){
  const it = closetItem(id), wear = {};
  if(it) wear[it.slot] = id;
  return rowsSVG(dressRows(mouseRows("day"), "stand", wear), false);
}

/* ---------- 치즈 ---------- */
const CHEESE_ROWS = ["....YYYY","..YYYyYY",".YYjYYYY","YYYYYYjY","YyYYYYYY","YYYYyYYY","jjjjjjjj"];
function cheeseSVG(){
  let o = "";
  CHEESE_ROWS.forEach((r, y)=>{ for(let x = 0; x < r.length; x++) if(r[x] !== ".") o += `<rect x="${x}" y="${y + 1}" width="1" height="1" fill="${MOUSE_PAL[r[x]]}"/>`; });
  return `<svg viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">${o}</svg>`;
}
/* 한 바퀴로 치는가: 5장 이상(별점 요청의 바퀴 수도 같은 기준을 쓴다 — study.js) */
function roundCounts(stat){ return !!stat && stat.total >= CHEESE_ROUND_MIN; }
/* 한 바퀴를 끝내면 +1. 하루 10개까지. 받은 개수(0 · 1)를 돌려준다.
   5장보다 짧은 바퀴는 장수를 모아(pool) 5장이 차면 +1 */
function earnRoundCheese(stat){
  if(!isDot() || !stat || stat.total < 1) return 0;
  const c = data.closet, today = ymd(new Date());
  if(c.roundDay !== today){ c.roundDay = today; c.roundCount = 0; }
  if(c.roundCount >= CHEESE_ROUND_DAY_MAX) return 0;
  if(!roundCounts(stat)){
    c.pool += stat.total;
    if(c.pool < CHEESE_ROUND_MIN){ persist(); return 0; }
    c.pool -= CHEESE_ROUND_MIN;
  }
  c.roundCount += 1; c.cheese += CHEESE_ROUND;
  persist();
  return CHEESE_ROUND;
}
/* 7일 · 14일 · 21일 … 연속 접속한 날 첫 방문에 +5. 받았으면 true */
function earnStreakCheese(){
  if(!isDot() || !VISIT || !VISIT.info) return false;
  const s = VISIT.info.streak || 0, today = ymd(new Date());
  if(s < 7 || s % 7 !== 0 || data.closet.streakDay === today) return false;
  data.closet.streakDay = today; data.closet.cheese += CHEESE_STREAK;
  persist();
  return true;
}
/* 백업을 되살릴 때의 옷장. 치즈 · 옷은 백업을 따르되, 오늘 이미 받은 몫(한 바퀴 개수 · 연속 보너스)은
   지금 기록을 남겨 예전 백업을 되살려 같은 날 또 받는 일이 없게 한다.
   백업 파일을 손으로 고쳐 치즈를 늘리는 건 막지 않는다(통신 없이 이 기기 안에서만 쓰는 꾸미기라서) */
function restoreCloset(bk){
  if(!bk) return data.closet;
  const c = cleanCloset(bk), now = data.closet, today = ymd(new Date());
  if(now.roundDay === today && (c.roundDay !== today || c.roundCount < now.roundCount)){ c.roundDay = today; c.roundCount = now.roundCount; }
  if(now.streakDay === today) c.streakDay = today;
  if(now.adDay === today && (c.adDay !== today || c.adCount < now.adCount)){ c.adDay = today; c.adCount = now.adCount; }
  return c;
}

/* ---------- 입구 ---------- */
let closetFrom = "home";
function openCloset(from){ closetFrom = from || "home"; closetTry = ""; closetSay("어때츄?"); go("closet"); }
/* 홈: 쥐돌이 아래 치즈 칩. 처음 치즈가 생긴 뒤 한 번만 말풍선으로 알려준다.
   lead 는 그 말풍선 앞에 붙일 말(연속 접속 보너스로 처음 치즈가 생긴 날) */
function closetHome(lead){
  const n = $("#cheeseN"); if(n) n.textContent = data.closet.cheese;
  if(!isDot()) return;
  if(data.closet.cheese > 0 && !hintSeen("closet")){
    markHint("closet");
    sayBubble((lead ? lead + " " : "") + "치즈를 모아 쥐돌이를 꾸밀 수 있츄! 치즈를 눌러 보츄");
  }
}
/* 결과 화면: 받은 치즈와 옷장 버튼(앱만) */
function closetResult(gain, stat){
  const line = $("#resCheese"), btn = $("#closetBtn");
  if(!line || !btn) return;
  const on = isDot();
  /* 못 받았으면 까닭을 말한다: 하루 몫을 다 받았거나, 짧은 바퀴라 아직 모으는 중이거나. 빈 바퀴면 줄을 숨긴다 */
  const capped = data.closet.roundDay === ymd(new Date()) && data.closet.roundCount >= CHEESE_ROUND_DAY_MAX;
  const short = !!stat && stat.total >= 1 && !roundCounts(stat);
  const said = gain ? "치즈 +" + gain
             : capped ? "오늘 치즈는 다 받았어요"
             : short ? `짧은 바퀴는 ${CHEESE_ROUND_MIN}장이 모이면 치즈 +1 (${data.closet.pool}/${CHEESE_ROUND_MIN})` : "";
  line.style.display = on && said ? "" : "none"; btn.style.display = on ? "" : "none";
  if(!on) return;
  line.innerHTML = `<span class="ci">${cheeseSVG()}</span><span>${said}</span><small>지금 ${data.closet.cheese}개</small>`;
}
/* 설정: 맨 위 옷장 줄 */
function closetSettings(){
  const card = $("#closetCard"); if(!card) return;
  card.innerHTML = `<button type="button" class="closetrow" id="closetRowBtn"><span class="cm">${mouseSVGWorn("day", false, data.closet.wear)}</span>
    <span class="tx"><b>쥐돌이 옷장</b><span>치즈로 쥐돌이를 꾸며요 · 치즈 ${data.closet.cheese}개</span></span><span class="ar">›</span></button>`;
  $("#closetRowBtn").addEventListener("click", ()=>openCloset("set"));
}

/* ---------- 옷장 화면 ---------- */
/* closetTry: 아직 사지 않은 아이템을 입어 보는 중이면 그 id. 눌렀다고 바로 사지 않는다 —
   먼저 쥐돌이에게 입혀 보여주고, 아래 "사기" 버튼을 눌러야 치즈가 나간다 */
let closetSlot = "head", closetBlinkT = null, closetTry = "";
/* 입어 보기를 켜고 끄거나 사면 무대 아래 줄이 생겼다 사라지며 아래 칸들이 밀린다.
   그 직후의 두 번째 누름이 엉뚱한 것(다른 아이템 · 광고 버튼)에 닿지 않게 잠깐 누름을 받지 않는다 */
let closetLockUntil = 0;
function closetLocked(){ return Date.now() < closetLockUntil; }
function closetLock(){ closetLockUntil = Date.now() + 350; }
function closetSay(t){ const el = $("#cSay"); if(el) el.textContent = t; }
/* 옷장 무대의 쥐돌이가 입을 옷: 고른 옷에, 입어 보는 아이템을 그 칸에 얹는다 */
function closetStageWear(){
  const it = closetItem(closetTry), wear = Object.assign({}, data.closet.wear);
  if(it) wear[it.slot] = it.id;
  return wear;
}
function renderCloset(){
  const c = data.closet;
  if(closetTry && c.own.indexOf(closetTry) >= 0) closetTry = "";      // 이미 가진 것은 입어 볼 게 없다
  if(closetTry && !closetOnSale(closetItem(closetTry))){              // 입어 보는 사이에 판매가 끝났다
    $("#cMsg").textContent = closetItem(closetTry).season.name + " 판매가 끝났어요"; closetTry = "";
  }
  $("#closetSub").textContent = "치즈 " + c.cheese + "개";
  $("#cCheese").innerHTML = `<span class="ci">${cheeseSVG()}</span><span>${c.cheese}</span>`;
  $("#cMouse").innerHTML = mouseSVGWorn("day", false, closetStageWear());
  $("#cTabs").innerHTML = CLOSET_SLOTS.map(([s, name])=>`<button type="button" data-s="${s}" class="${s === closetSlot ? "on" : ""}">${name}</button>`).join("");
  /* 기간 한정은 파는 동안 맨 앞에. 기간이 지나면 가진 것만 남는다 */
  const shown = CLOSET_ITEMS.filter(i=>i.slot === closetSlot && (c.own.indexOf(i.id) >= 0 || closetOnSale(i)));
  const lim = i=>!!i.season && c.own.indexOf(i.id) < 0;
  $("#cGrid").innerHTML = shown.filter(lim).concat(shown.filter(i=>!lim(i))).map(i=>{
    const own = c.own.indexOf(i.id) >= 0, wear = c.wear[i.slot] === i.id, trying = closetTry === i.id;
    const off = (i.slot === "body" || i.slot === "hand") ? -40 : (i.slot === "face" ? -10 : 0);   // 아이템이 있는 자리를 보여준다
    const tag = wear ? "착용중" : (own ? "보유중" : `<span class="ci">${cheeseSVG()}</span>${i.price}`);
    const until = i.season ? i.season.until.split("-") : [];
    return `<button type="button" class="citem${own ? " own" : ""}${wear ? " wear" : ""}${trying ? " try" : ""}" data-i="${i.id}">
      <span class="th"><span style="margin-top:${off}px">${itemPreviewSVG(i.id)}</span></span>
      <span class="nm">${esc(i.name)}</span><span class="pr">${tag}</span>
      ${i.perk && !own ? `<span class="fx">효과</span>` : ""}
      ${i.season && !own ? `<span class="lim">${esc(i.season.name)} · ~${Number(until[1])}/${Number(until[2])}</span>` : ""}</button>`;
  }).join("");
  document.querySelectorAll("#cTabs button").forEach(b=>b.addEventListener("click", ()=>{
    if(closetLocked()) return;
    if(closetSlot !== b.dataset.s) haptic("selection");
    closetSlot = b.dataset.s; renderCloset();
  }));
  document.querySelectorAll("#cGrid .citem").forEach(b=>b.addEventListener("click", ()=>{ if(!closetLocked()) tapClosetItem(b.dataset.i); }));
  closetBuyBar();
  adButton();                   // 광고 보고 치즈 받기 (ads.js)
  scheduleClosetBlink();
}
/* ---------- 달릴 때 입는 옷 (mascot.js 의 runLane) ----------
   달리기는 옆모습 그림이라 정면 옷을 얹을 수 없다. 달리기용 덧그림(run)이 있는 옷만 입고 달리고, 나머지는 달리는 동안 벗는다.
   run.rows 는 옆모습 28×40 위의 덧그림(y 행부터). "_" 는 지우는 칸(호박 머리가 귀를 덮는다), cells 가 있으면 그 칸에만 칠한다(망토).
   lit 이면 빛나는 옷(glow)은 빛나는 색으로 — 호박 머리가 달리며 번쩍인다 */
function runWear(){
  const w = wornNow();
  return ["body", "hand", "face", "head"].map(s=>closetItem(w[s])).filter(it=>it && it.run);
}
function runDress(rows, items, lit){
  const g = rows.map(r=>r.split(""));
  items.forEach(it=>{
    const glow = lit && it.glow ? it.glow : null;
    it.run.rows.forEach((r, k)=>{
      const row = g[it.run.y + k]; if(!row) return;
      for(let x = 0; x < r.length; x++){
        let ch = r[x];
        if(ch === ".") continue;
        if(ch === "_"){ row[x] = "."; continue; }
        if(it.run.cells && it.run.cells.indexOf(row[x]) < 0) continue;
        row[x] = glow && glow[ch] ? glow[ch] : ch;
      }
    });
  });
  return g.map(r=>r.join(""));
}
/* 달리는 동안 같은 그림을 다시 만들지 않게 기억해 둔다(달릴 때마다 비운다 — 입은 옷이 바뀌었을 수 있다) */
const runDressMemo = new Map();
function runDressed(rows, items, lit){
  const key = rows.join("") + (lit ? "+" : "-");
  if(!runDressMemo.has(key)) runDressMemo.set(key, runDress(rows, items, lit));
  return runDressMemo.get(key);
}
/* 망토 자락 · 따라오는 박쥐. 달리기 층(#panicLayer) 전체에 그리는 그림 한 장. 한 칸 = 2px(쥐돌이 56×80 과 같다).
   bats 는 박쥐 자리(부드럽게 따라오도록 그릴 때마다 조금씩 다가간다) */
function runFxSVG(it, f, i, bats, W, H, side){
  let out = "";
  /* 도트 그림(rowsSVG — 같은 색은 한 줄로 묶는다)을 그 자리 · 크기로 끼워 넣는다 */
  const px = (rows, ox, oy, flip)=>{ out += rowsSVG(rows, flip).replace("<svg ", `<svg x="${ox}" y="${oy}" width="${rows[0].length*2}" height="${rows.length*2}" `); };
  /* 자락: 목 뒤(옆모습 18열 · 18행)에서 뒤로. 오른쪽을 보고 달리면(flip) 거울로 */
  const t = it.run.tail[Math.floor(i / 2) % it.run.tail.length];
  if(side !== false) px(t, f.flip ? f.x + (28 - 18 - t[0].length)*2 : f.x + 18*2, f.y + 18*2, f.flip);
  const back = f.flip ? -1 : 1;
  bats.forEach((b, k)=>{
    const tx = f.x + 20 + back*(40 + k*24), ty = f.y - 4 + k*16;
    if(b.x === null){ b.x = tx; b.y = ty; }
    b.x += (tx - b.x)*(0.18 - k*0.03); b.y += (ty - b.y)*0.2;
    px(RUN_BAT[Math.floor((i + k*2) / 2) % 2], Math.round(b.x), Math.round(b.y + Math.sin((i + k*4) / 3)*5), false);
  });
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" aria-hidden="true">${out}</svg>`;
}

/* 입어 보는 중일 때 무대 아래에 뜨는 줄: 이름 · 값 · 사기 · 그만 보기. 치즈가 모자라면 몇 개 모자란지 알려주고 사기는 잠근다 */
function closetBuyBar(){
  const bar = $("#cBuy"); if(!bar) return;
  const it = closetItem(closetTry);
  if(!it){ bar.innerHTML = ""; return; }
  const lack = it.price - data.closet.cheese;
  bar.innerHTML = `<div class="cbuy">
      <div class="who"><b>${esc(it.name)}</b><span>${lack > 0 ? "치즈가 " + lack + "개 모자라요" : "입어 보는 중이에요"}</span>
        ${it.perk ? `<em class="perk">${esc(it.perk)}</em>` : ""}</div>
      <button type="button" class="buy" id="cBuyBtn"${lack > 0 ? " disabled" : ""}><span class="ci">${cheeseSVG()}</span>${it.price} 사기</button>
      <button type="button" class="no" id="cBuyNo">그만 보기</button></div>`;
  $("#cBuyBtn").addEventListener("click", buyClosetItem);
  $("#cBuyNo").addEventListener("click", ()=>{ closetTry = ""; closetLock(); closetSay("어때츄?"); haptic("light"); renderCloset(); });
}
/* 아이템을 눌렀다. 가진 것이면 입거나 벗고, 아직 없는 것이면 입어 보기만 한다(사는 것은 buyClosetItem) */
function tapClosetItem(id){
  const c = data.closet, it = closetItem(id), msg = $("#cMsg");
  if(!it || (c.own.indexOf(id) < 0 && !closetOnSale(it))) return;      // 기간이 지난 한정 아이템은 입어 볼 수도 없다
  if(c.own.indexOf(id) < 0){
    closetTry = closetTry === id ? "" : id;
    msg.textContent = "";
    closetSay(closetTry ? (c.cheese < it.price ? "치즈가 모자라츄…" : "어울리츄?") : "어때츄?");
    haptic("selection");
    closetLock();
    renderCloset();
    /* 아래쪽 칸을 눌렀어도 입혀 본 쥐돌이와 사기 버튼이 같이 보이게 무대 위쪽으로 올린다 */
    if(closetTry){ const sc = document.querySelector("#s-closet .scroll"); if(sc) sc.scrollTop = 0; }
    return;
  }
  /* 가진 아이템을 눌렀다. 같은 칸의 것을 입어 보던 중이면 입어 보기만 끝낸다
     (입고 있던 것을 눌러 "원래대로"를 하려던 것인데 벗겨 버리면 안 된다). 다른 칸이면 입어 보기는 그대로 둔다 */
  const trying = closetItem(closetTry);
  if(trying && trying.slot === it.slot){
    closetTry = ""; closetLock();
    if(c.wear[it.slot] === id){ closetSay("어때츄?"); haptic("light"); renderCloset(); return; }
  }
  if(c.wear[it.slot] === id){
    delete c.wear[it.slot];
    msg.textContent = `${it.name} 벗었어요`; closetSay("시원하츄"); haptic("light");
  } else {
    c.wear[it.slot] = id;
    msg.textContent = `${it.name} 착용했어요`; closetSay("어때츄?"); haptic("light");
  }
  persist();
  renderCloset();
  drawMascot();
}
/* "사기"를 눌렀다. 입어 보던 아이템을 치즈로 사고 그대로 입는다 */
function buyClosetItem(){
  const c = data.closet, it = closetItem(closetTry);
  if(!it || c.own.indexOf(it.id) >= 0) return;
  if(!closetOnSale(it)){ haptic("error"); renderCloset(); return; }      // 입어 보는 사이에 판매가 끝났다(renderCloset 이 내리고 알린다)
  if(c.cheese < it.price){ haptic("error"); return; }
  c.cheese -= it.price; c.own.push(it.id); c.wear[it.slot] = it.id;
  closetTry = ""; closetLock();
  $("#cMsg").textContent = `${it.name}을(를) 샀어요`;
  closetSay("고맙츄!"); sfx("chu"); haptic("success");
  persist();
  renderCloset();
  drawMascot();
}
/* 옷장 쥐돌이도 홈처럼 몇 초마다 깜빡인다. 옷장을 떠나면 멈춘다 */
function scheduleClosetBlink(){
  clearTimeout(closetBlinkT);
  if(reduceMotion()) return;
  closetBlinkT = setTimeout(()=>{
    const m = $("#cMouse");
    if(!m || !$("#s-closet").classList.contains("active")) return;
    m.innerHTML = mouseSVGWorn("blink", false, closetStageWear());
    setTimeout(()=>{ if($("#s-closet").classList.contains("active")) m.innerHTML = mouseSVGWorn("day", false, closetStageWear()); scheduleClosetBlink(); }, 160);
  }, 2400 + Math.random() * 1800);
}
$("#closetClose").addEventListener("click", ()=>go(closetFrom === "result" ? "home" : closetFrom));
$("#cheeseChip").addEventListener("click", ()=>{ haptic("light"); openCloset("home"); });
$("#closetBtn").addEventListener("click", ()=>openCloset("result"));
$("#cheeseChip").querySelector(".ci").innerHTML = cheeseSVG();
