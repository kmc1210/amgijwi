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
  "H": "#3B2A4A", "I": "#6A4C86", "J": "#E8822A", "W": "#B85A16", "C": "#FFF4B8", "D": "#454B5C",
  /* 크리스마스(1.5): 산타 빨강 · 짙은 빨강 · 밝은 빨강 · 빛나는 코 · 빛나는 전구 · 눈 털 · 트리 초록 · 짙은 초록 */
  "8": "#D23C3C", "9": "#8E2128", "0": "#F06A5A", "f": "#FFB3A0", "e": "#FFF0B0", "s": "#E9EEF3", "x": "#3E8E52", "z": "#24603A",
  /* 번쩍임의 은은한 칸(glowMid): 호박 눈 · 입의 불씨 · 코 · 코 안쪽 · 전구 · 별. 글자가 다 차서 기호를 쓴다. 호박은 정확한 중간이 칙칙한 회색이라 주황으로 골랐다 */
  "i": "#A8501C", "!": "#E1534B", "^": "#F88F7D", "=": "#E9786E", "~": "#FADA78"};
Object.keys(CLOSET_PAL).forEach(k=>{ MOUSE_PAL[k] = CLOSET_PAL[k]; });

const CLOSET_SLOTS = [["head","머리"],["face","얼굴"],["body","몸"],["hand","손"]];
/* 기간 한정 아이템(season). 그 날까지만 옷장에 나오고 살 수 있다. 산 것은 기간이 지나도 그대로 입는다 */
const HALLOWEEN = {name:"핼러윈", until:"2026-11-08"};
/* from: 그 날부터 판다(핼러윈이 끝난 다음 날 — 한정 아이템이 두 철 섞여 맨 앞을 다 차지하지 않게).
   tag: 옷장 칸의 좁은 한정 표시에 쓰는 짧은 이름, cls: 그 표시의 색(dot.css) */
const XMAS = {name:"크리스마스", tag:"성탄", from:"2026-11-09", until:"2026-12-31", cls:"xm"};
/* 치즈로 사는 테마. 산 것은 설정 > 화면과 소리 > 테마에서 고른다. 기간 한정은 그 날까지만 팔고, 산 것은 계속 쓴다.
   색은 dot.css 의 body[data-theme="…"], 홈의 움직임은 themefx.js, 탭 아이콘은 core.js 의 ICONS["…_hw"] */
const THEME_SHOP = [
  {id:"hwnight", name:"핼러윈 밤", price:100, season:HALLOWEEN, sw:["#1C1424", "#E8822A", "#6A4C86"]},
  {id:"xmnight", name:"크리스마스 밤", price:100, note:"눈이 내리고, 배경음을 켜 두면 캐롤이 흘러요.", season:XMAS, sw:["#0F1E1A", "#D23C3C", "#C9A85A"]}];
/* 옷장 "테마" 칸(1.5.3): 무료 테마도 같이 보이고, 누르면 바로 바뀐다. 치즈 테마는 사기 전에 옷장 · 홈에서 미리 본다.
   카드의 작은 홈 그림 색: 바탕 · 진도 카드 · 탭 줄 · 외곽선 · 강조 (dot.css 의 각 테마 팔레트에서) */
const THEME_FREE = [{id:"auto", name:"자동"}, {id:"cream", name:"기본"}, {id:"dark", name:"다크"}, {id:"green", name:"그린"}];
const THEME_MINI = {
  cream:   ["#F3E9DC", "#5A4132", "#FCF7F1", "#4A423A", "#A65E2E"],
  dark:    ["#141210", "#43301F", "#1B1714", "#8A7A6A", "#C97F4B"],
  green:   ["#E3EDE4", "#1B5B3C", "#F6FAF5", "#23503A", "#1E6B45"],
  hwnight: ["#1C1424", "#3B2A4A", "#221A2B", "#9A7FB5", "#E8822A"],
  xmnight: ["#0F1E1A", "#1E3B33", "#13241F", "#C9A85A", "#D23C3C"]};
function themeShopItem(id){ return THEME_SHOP.filter(t=>t.id === id)[0] || null; }
function themeOwned(id){ return data.closet.themes.indexOf(id) >= 0; }

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
  /* 귀까지 머리 위를 덮고 끝이 오른쪽으로 꺾인다. 꼭대기를 넓혀 두 귀를 다 덮고, 그래도 남는 왼쪽 귀 끝은 지운다(_) — 귀가 모자 안에 들어간 모양.
     오른쪽 옆(3~6행)은 예전 폭 그대로 — 아침 쥐돌이 머리 옆 반짝이(22~26열)를 덮지 않게 */
  {id:"witchhat", slot:"head", name:"마녀 모자", price:60, y:0, season:HALLOWEEN, rows:[
      "........._........HHHHHH....",
      "........__HHHHHHHHHIHH.HH...",
      "......._HHHHHHHHHHIHHH..H...",
      ".......HHHHHHHHHHIHHH.......",
      "......HHHHHHHHHHHIHHHH......",
      "......JJJJJJJJJJJJJJJJ......",
      ".....HHHHHHHHHHHHHHHHHH.....",
      ".HHHHHHHHHHHHHHHHHHHHHHHHHH.",
      "...IIIIIIIIIIIIIIIIIIIIIII.."]},
  /* 납작한 호박을 머리 위에 얹는다(눈과 겹치지 않게 두 줄 띄운다). 얼굴은 그대로 보이고, 가끔 새긴 얼굴이 번쩍인다(glow — 눈 깜빡임과 따로) — 빛나는 아이템이라 더 비싸다 */
  {id:"pumpkinhead", slot:"head", name:"호박 머리", price:80, y:0, season:HALLOWEEN, rows:[
      "........._....aA.._.........",
      ".........WWJJWWJJWW.........",
      ".......WWJJJJWWJJJJWW.......",
      "......WJJKKJJJJJJKKJJW......",
      "......WJJJJJJKKJJJJJJW......",
      "......WJKJKJKJJKJKJKJW......",
      ".......WWWWWWWWWWWWWW......."],
    glow:{K:"C"}, glowMid:{K:"i"},
    perk:"가끔 번쩍이고, 달릴 때도 써요",
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
  /* 몸 바깥까지 퍼지는 코트(wide). 서 있는 깃 · 가슴의 금색 끈 매듭 · 주름. 입 · 볼을 가리지 않게 턱 털 아래(19행)부터 */
  {id:"cape", slot:"body", name:"뱀파이어 망토", price:120, y:19, season:HALLOWEEN, wide:true, rows:[
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
      "KKKKKDKKK2........2KKKDKKKKK"],
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
  /* 두 손으로 드는 호박 바구니. 가끔 눈 · 입이 번쩍인다(glow — 눈 깜빡임과 따로) — 빛나는 아이템이라 더 비싸다 */
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
    glow:{K:"C"}, glowMid:{K:"i"},
    perk:"가끔 눈 · 입이 번쩍여요"},

  /* 귀까지 머리 위를 덮고(모자 밖으로 남는 귀는 지운다 "_"), 끝이 오른쪽으로 꺾여 방울이 귀 옆에 달린다. 흰 털 띠는 눈 위(6~7행) */
  {id:"santahat", slot:"head", name:"산타 모자", price:50, y:0, season:XMAS, rows:[
      "......______9888_______.....",
      "......____98888880_____.....",
      "......___988888888800__.....",
      "......__98888888888880_.....",
      "......__988888888888880.ss..",
      "......_9888888888888889shhs.",
      "......shhhhshhhhshhhhsh.shs.",
      "......sshhhhsshhhhsshhhs...."],
    /* 달리기: 방울까지 머리 폭 안으로. qf 는 돌아설 때(그 그림은 머리가 왼쪽으로 치우쳐 있다). 맨 윗줄은 비운다 — 뛰어오를 때 몸이 한 줄 늘어난다 */
    run:{y:0, rows:[
        "........_______________.....",
        "........____988880_____.....",
        "........__98888888880__.....",
        "........_9888888888sss_.....",
        "........98888888889shs_.....",
        ".......988888888888sss_.....",
        "......988888888888889__.....",
        "......shhhhshhhhshhhhs_.....",
        ".....sshhhhsshhhhsshhs_....."], qf:[
        "....___________________.....",
        "...._______988880______.....",
        "...._____98888888880___.....",
        "....____9888888888sss__.....",
        "....___98888888889shs__.....",
        "....__988888888888sss__.....",
        "...._988888888888889___.....",
        ".....shhhhshhhhshhhhs__.....",
        "....sshhhhsshhhhsshhs__....."]}},
  /* 귀 바깥쪽에서 뻗은 뿔 */
  {id:"antler", slot:"head", name:"루돌프 뿔", price:35, y:0, season:XMAS, rows:[
      ".T..T..................T..T.",
      ".tT.Tt................tT.Tt.",
      "..tTt..T............T..tTt..",
      "...ttTTt............tTTtt...",
      "....ttt..............ttt....",
      ".....tt..............tt....."]},
  /* 원래 코를 덮는 동그란 빨간 코. 가끔 빛난다(glow — 눈 깜빡임과 따로) — 빛나는 아이템이라 더 비싸다 */
  {id:"rednose", slot:"face", name:"루돌프 코", price:55, y:14, season:XMAS, rows:[
      ".............88.............",
      "............8f08............",
      "............9889............"],
    glow:{"8":"0", "0":"f"}, glowMid:{"8":"!", "0":"^"},
    perk:"가끔 코가 반짝여요"},
  /* 턱 털 아래(20행)부터 목을 감고, 한쪽 끝이 앞으로 늘어진다 */
  {id:"scarf", slot:"body", name:"털실 목도리", price:40, y:20, season:XMAS, rows:[
      "....98888888888888888889....",
      "...98hh88hh88hh88hh88hh89...",
      "....99999999999988889999....",
      "...............98hh89.......",
      "...............988889.......",
      "...............98hh89.......",
      "...............988889.......",
      "...............h.h.h........"],
    /* 손에 뭔가 들면 늘어진 끝이 옆으로 삐져나오니 목만 감는다 */
    hold:[
      "....98888888888888888889....",
      "...98hh88hh88hh88hh88hh89...",
      "....99999999999999999999...."],
    run:{y:20, cells:"wc", rows:[
        "..98888888888888888888889...",
        "..98hh88hh88hh88hh88hh889...",
        "..9999999999999999999999...."], tail:[
      ["....................", "....................", "....................", "......98888hh8889...", "......99988hh8h8h...", "..........99999....."],
      ["....................", "....................", "..............88hh..", "......9888hh88889.h.", "......999988999.....", "...................."],
      ["....................", "....................", "....................", "......98888hh889....", "......9999988hh889..", "...........9998h8h.."]]}},
  /* 몸에 맞춰 칠하는 옷(suit). 그림 행 대신 suitFront · suitSide 가 입은 모습을 만든다. 부츠도 신는다 */
  {id:"santasuit", slot:"body", name:"산타 옷", price:120, y:22, season:XMAS, suit:true, rows:[],
    perk:"달리면 눈송이가 따라와요",
    run:{y:0, rows:[], snow:true}},
  /* 두 손으로 드는 선물 상자 */
  {id:"gift", slot:"hand", name:"선물 상자", price:30, y:22, season:XMAS, rows:[
      "...........RR..RR...........",
      "............qRRq............",
      ".........9999RR9999.........",
      "owcwww...9808RR8889...wwwcwo",
      ".ocwww....999RR999....wwwco.",
      ".owcww.ppcRRRRRRRRcpp.wwcwo.",
      "ocwwww.ppc988RR889cpp.wwwwco",
      ".owcww.ppc988RR889cpp.wwcwo.",
      ".ocwww.ddc988RR889cdd.wwwco.",
      "..........99999999.........."]},
  /* 두 손으로 드는 꼬마 트리. 가끔 전구 · 별이 반짝인다(glow) — 빛나는 아이템이라 더 비싸다 */
  {id:"tree", slot:"hand", name:"꼬마 트리", price:70, y:22, season:XMAS, rows:[
      ".............RR.............",
      "............RRRR............",
      ".............zz.............",
      "owcwww......zxxz......wwwcwo",
      ".ocwww.....zx8xxz.....wwwco.",
      ".owcww....zxxxxRxz....wwcwo.",
      "ocwwww.....zxxxxz.....wwwwco",
      ".owcww.ppczxRxx8xzcpp.wwcwo.",
      ".ocwww.ppczxxxxxxzcpp.wwwco.",
      ".owcww.ppcz8xxRxxzcpp.wwcwo.",
      ".......ddczzzzzzzzcdd.......",
      ".............TT............."],
    glow:{"8":"f", "R":"e"}, glowMid:{"8":"=", "R":"~"},
    perk:"가끔 전구가 반짝여요"}
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
    pool: Math.min(CHEESE_ROUND_MIN - 1, Math.max(0, Math.floor(Number(c.pool) || 0))),
    /* 치즈로 산 테마(THEME_SHOP 의 id) */
    themes: Array.isArray(c.themes) ? c.themes.filter(id=>!!themeShopItem(id)) : [],
    /* 크리스마스 선물을 받은 해 */
    xmasGift: /^\d{4}$/.test(String(c.xmasGift)) ? String(c.xmasGift) : "",
    /* 업데이트 치즈를 받은(본) 버전의 앞 두 자리 */
    verSeen: /^\d+\.\d+$/.test(String(c.verSeen)) ? String(c.verSeen) : "",
    /* 주간 할 일을 다 끝내 치즈를 받은 날(하루 한 번 — todo.js) */
    todoDay: typeof c.todoDay === "string" ? c.todoDay : ""
  };
}
function closetItem(id){ return CLOSET_ITEMS.filter(i=>i.id === id)[0] || null; }
/* 지금 옷장에서 팔고 있는가(기간 한정이면 그 날까지). today 는 테스트가 준다.
   기기 시계를 믿는다 — 시계를 되돌리면 다시 살 수 있지만, 통신 없이 기기 안에서만 쓰는 꾸미기라 막지 않는다 */
function closetOnSale(it, today){
  if(!it) return false;
  if(!it.season) return true;
  const d = today || ymd(new Date());
  return d <= it.season.until && (!it.season.from || d >= it.season.from);
}
data.closet = cleanCloset(data.closet);

/* ---------- 입히기 ----------
   그리는 차례: 손 → 몸 → 얼굴 → 머리.
   머그(손)는 팔을 가운데로 모으는 칸까지 갖고 있어 먼저 그린다.
   앞치마(몸)는 쥐돌이 몸 색 칸(w · c)에만 칠한다. 그래서 발 · 머그 · 치즈 · 커피잔은 앞치마 앞에 그대로 남고,
   허리띠는 발 뒤로 지나간다(머그를 들면 옆구리를 돌아 보인다).
   넓은 옷(wide — 뱀파이어 망토)은 몸 바깥의 빈칸 · 테두리(. o)까지 칠해 몸 라인보다 퍼진다. 팔은 망토 안으로 들어가고,
   발 · 앞발 · 손에 든 것(머그 · 호박 바구니)은 망토 앞에 남는다.
   lit 이면 빛나는 아이템(glow — 바꿀 색 표)의 색을 바꿔 그린다. lit 이 "mid" 면 켜지고 꺼지는 사이의 은은한 색(glowMid). 번쩍임은 눈 깜빡임과 따로 논다(mascot.js 의 scheduleGlow).
   mode: stand 서 있기 · eat 치즈 먹기 · sip 커피 마시기 · wx 날씨 옷. wear 를 주지 않으면 지금 입은 옷 */
const CLOSET_BODY_CELLS = "wc", CLOSET_WIDE_CELLS = ".owc";
function glowMap(it, lit){ return !lit || !it.glow ? null : lit === "mid" ? it.glowMid : it.glow; }
/* 산타 옷(suit): 행을 덧그리지 않고 몸 그림에 맞춰 칠한다. 깃 · 앞섶 · 벨트 · 밑단 · 소매 · 부츠.
   서 있을 때는 몸 아래를 닫고 발을 몸 밑으로 내린다(한 줄을 빼서 전체 높이는 40줄 그대로). 돌아서는 그림(qf)은 칠만 한다 */
const SUIT_FEET = ["....ooccwwwwwwwwwwwwccoo....", "......oocwwwwwwwwwwcoo......", "..oopppppoooooooooopppppoo..", ".oddpppppo........opppppddo.", "..ooooooo..........ooooooo.."];
const suitFur = x=>x % 3 === 0 ? "s" : "h";
function suitFront(rows, mode, holding){
  const base = mode === "qf" ? rows : rows.slice(0, 32).concat(rows.slice(33, 36), SUIT_FEET);
  let top = -1;
  for(let y = 24; y < 34 && top < 0; y++) if(base[y].indexOf("p") >= 0) top = y;
  return base.map((l, y)=>{
    if(y < 22) return l;
    if(y >= 36) return l.replace(/p/g, "K").replace(/d/g, "D");
    const g = l.split(""), belt = y === 30 || y === 31;
    for(let x = 0; x < 28; x++){
      const ch = g[x];
      if(ch === "p" || ch === "d"){
        if(holding && (x < 6 || x > 21)) g[x] = belt ? "K" : "8";       // 두 손으로 들면 옆으로 내린 팔은 없다
        else if(ch === "p" && y === top) g[x] = "0";
        else if(ch === "p" && y === top + 1) g[x] = "h";
      }
      else if(ch === "o") g[x] = "9";
      else if(ch === "w" || ch === "c") g[x] = y < 24 || y >= 34 ? suitFur(x) : belt ? "K" : "8";
    }
    if(y > 23 && y < 34 && !belt) [13, 14].forEach(x=>{ if(g[x] === "8") g[x] = y % 2 ? "s" : "h"; });
    if(belt) [12, 13, 14, 15].forEach((x, i)=>{ if(g[x] === "K") g[x] = i === 0 || i === 3 || y === 30 ? "R" : "q"; });
    /* 털 그림의 삐죽한 끝은 옷을 입으면 눌린다 */
    if(g[0] !== "."){ g[0] = "."; g[1] = "9"; }
    if(g[27] !== "."){ g[27] = "."; g[26] = "9"; }
    return g.join("");
  });
}
/* 달리는 옆모습은 등이 불룩하고 배가 납작해서, 옷 입은 몸통은 앞뒤로 둥글게 새로 그린다. 앞발은 그 위에 얹는다 */
const SUIT_SIDE = {23:[4,23], 24:[4,24], 25:[3,25], 26:[3,25], 27:[2,25], 28:[2,25], 29:[2,25], 30:[2,25], 31:[2,25], 32:[3,24], 33:[4,24], 34:[5,23]};
function suitSide(rows){
  return rows.map((l, y)=>{
    if(y < 21) return l;
    if(y >= 36) return l.replace(/p/g, "K").replace(/d/g, "D");
    const span = SUIT_SIDE[y];
    if(!span) return l.split("").map((ch, x)=>ch === "o" ? "9" : ch === "w" || ch === "c" ? suitFur(x) : ch).join("");
    const L = span[0], R = span[1], g = new Array(28).fill("."), belt = y === 30 || y === 31;
    for(let x = L + 1; x < R; x++) g[x] = y === 34 ? suitFur(x) : belt ? "K" : "8";
    g[L] = g[R] = "9";
    if(belt) [2, 3, 4, 5].forEach((k, i)=>{ g[L + k] = i === 0 || i === 3 || y === 30 ? "R" : "q"; });
    if(y < 34){
      const arm = [];
      l.split("").forEach((ch, x)=>{ if(x < 14 && (ch === "p" || ch === "d")) arm.push([x, ch]); });
      if(arm.length){
        const d = Math.max(0, L + 1 - arm[0][0]);
        arm.forEach(a=>{ g[a[0] + d] = a[1] === "p" && y === 26 ? "0" : a[1] === "p" && y === 27 ? "h" : a[1]; });
      }
    }
    return g.join("");
  });
}
function dressRows(rows, mode, wear, lit){
  const w = wear || wornNow();
  const body = closetItem(w.body), hand = closetItem(w.hand);
  const holds = !!hand && mode !== "eat" && mode !== "sip" && mode !== "wx";
  const suit = !!body && !!body.suit && mode !== "wx";
  const g = (suit ? suitFront(rows, mode, holds) : rows).map(r=>r.split(""));
  ["hand","body","face","head"].forEach(slot=>{
    const it = closetItem(w[slot]);
    if(!it) return;
    if(mode === "wx" && slot !== "face") return;                         // 우비 · 털모자 위에는 안경만
    if((mode === "eat" || mode === "sip") && slot === "hand") return;    // 치즈 · 커피를 드는 동안 머그는 내려놓는다
    if(it.suit) return;                                                  // 이미 칠했다
    const cells = it.wide ? CLOSET_WIDE_CELLS : CLOSET_BODY_CELLS;
    const glow = glowMap(it, lit);
    /* 돌아서는 그림(qf)은 머리가 치우쳐 있어 전용 그림이 있으면 그걸 쓰고, 손에 뭔가 들면 목도리는 목만 감는다 */
    const src = slot === "body" && it.hold && holds ? it.hold : mode === "qf" && it.run && it.run.qf ? it.run.qf : it.rows;
    src.forEach((r, k)=>{
      const y = it.y + k;
      for(let x = 0; x < r.length; x++){
        const ch = glow && glow[r[x]] ? glow[r[x]] : r[x];
        if(ch === ".") continue;
        if(suit && slot === "hand" && "owc".indexOf(ch) >= 0) continue;  // 손 아이템의 몸 칸이 옷을 덮지 않게
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
/* lit: 빛나는 옷이 번쩍이는 그림 */
function mouseSVGWorn(mood, puff, wear, lit){
  if(!isDot() || mood === "night") return mouseSVG(mood, puff);
  wear = wear || wornNow();
  const key = mood + (puff ? "+" : "-") + (lit === "mid" ? "~" : lit ? "*" : "") + JSON.stringify(wear);
  if(wornCache[key]) return wornCache[key];
  const mode = mood.indexOf("eat") === 0 ? "eat" : (mood.indexOf("sip") === 0 ? "sip" : (mood.indexOf("blink") === 0 ? "blink" : "stand"));
  if(++wornCacheN > 80){ Object.keys(wornCache).forEach(k=>delete wornCache[k]); wornCacheN = 1; }
  return (wornCache[key] = rowsSVG(dressRows(mouseRows(mood, puff), mode, wear, lit), false));
}
/* 기간 한정 옷을 입고 있는가(입었으면 날씨 옷으로 덮지 않는다 — mascot.js 의 drawMascot) */
function wearsSeasonal(){
  const w = wornNow();
  return Object.keys(w).some(s=>{ const it = closetItem(w[s]); return !!(it && it.season); });
}
/* 빛나는 옷을 입고 있는가(번쩍임 타이머를 돌릴지) */
function wearGlows(wear){
  const w = wear || wornNow();
  return Object.keys(w).some(s=>{ const it = closetItem(w[s]); return !!(it && it.glow); });
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
  const fi = closetItem(wear.face);
  if(fi && fi.y < 14) delete wear.face;          // 눈 둘레를 덮는 안경 · 가면은 벗긴다(바뀐 눈과 겹친다). 루돌프 코는 그대로
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
  if(now.todoDay === today) c.todoDay = today;
  if(now.adDay === today && (c.adDay !== today || c.adCount < now.adCount)){ c.adDay = today; c.adCount = now.adCount; }
  if(now.xmasGift > c.xmasGift) c.xmasGift = now.xmasGift;      // 올해 선물을 받았으면 예전 백업을 되살려도 다시 받지 않는다
  return c;
}

/* ---------- 크리스마스 선물 (1.5) ----------
   12월 24 · 25일에 홈을 열면 치즈 100개. 한 해에 한 번(받은 해를 data.closet.xmasGift 에 적어 백업을 따라간다).
   생일과 같은 날이면 생일 선물과 한 말풍선으로 말한다(birthday.js bdayHome 이 말하지 않고 남겨 둔다) */
const XMAS_CHEESE = 100;
function xmasGiftDay(now){ now = now || new Date(); return now.getMonth() === 11 && (now.getDate() === 24 || now.getDate() === 25); }
function xmasGiftDue(now){ now = now || new Date(); return isDot() && xmasGiftDay(now) && data.closet.xmasGift !== String(now.getFullYear()); }
function earnXmasCheese(now){
  now = now || new Date();
  if(!xmasGiftDue(now)) return false;
  data.closet.xmasGift = String(now.getFullYear()); data.closet.cheese += XMAS_CHEESE;
  persist();
  return true;
}
/* 선물 말풍선. 이 치즈가 처음 생긴 치즈면 옷장 안내에 붙여서 말한다(따로 말하면 한 번뿐인 안내를 덮는다) */
function giftSay(said){ if(hintSeen("closet")) sayBubble(said); else closetHome(said); }
/* 선물을 받으면 썰매 장면(xmasfx.js)을 띄우고, 닫은 뒤에 말풍선으로 한 번 더 말한다. 치즈는 장면 전에 이미 받는다.
   앱을 켤 때는 홈을 그린 바로 뒤에 잠금 · 가이드 · 이름 묻기 · iCloud 확인창이 덮으므로, 생일 폭죽처럼 잠깐 쉬고 본다.
   가려 있으면 미뤄 두었다가 잠금을 풀거나 창을 닫고 홈이 다시 그려질 때 띄운다. 말풍선도 홈이 보일 때 */
let xmasFxWait = null, xmasFxT = null;
function xmasFxBusy(){ return !!xmasFxWait || (typeof xmasFxState === "function" && xmasFxState().running); }
function xmasHome(now){
  const both = bdayHeld; bdayHeld = false;
  if(earnXmasCheese(now)){
    const gain = XMAS_CHEESE + (both ? BDAY_CHEESE : 0);
    xmasFxWait = {gain: gain, said: both ? "생일 축하하고 메리 크리스마스츄! 치즈 " + gain + "개 선물이츄" : "메리 크리스마스츄! 치즈 " + XMAS_CHEESE + "개 선물이츄"};
  }
  if(xmasFxWait && typeof xmasFxPlay !== "function"){ homeSay(xmasFxWait.said); xmasFxWait = null; }
  clearTimeout(xmasFxT);
  xmasFxT = setTimeout(xmasFxTry, 400);
}
function xmasFxTry(){
  const covered = ()=>{ const w = xmasFxWait; xmasFxWait = null; const h = bdayHidden(); xmasFxWait = w; return h; };     // 기다리는 장면 자신은 가림으로 치지 않는다
  if(typeof xmasFxState === "function" && xmasFxState().running) return;
  if(covered()) return;
  homeSayFlush();
  if(!xmasFxWait) return;
  const w = xmasFxWait; xmasFxWait = null;
  /* 치즈 칸은 지금 가진 치즈까지(미루는 사이 치즈가 바뀌어도 맞게) */
  xmasFxPlay({from: data.closet.cheese - w.gain, to: data.closet.cheese, done: ()=>{
    homeSay(w.said); xmasFxTry();      // 닫은 뒤 홈이 보이면 말하고, 아니면 다음에 홈이 보일 때
    bdayPartySoon();                          // 장면에 가려 미룬 생일 폭죽이 있으면 이제
  }});
}

/* ---------- 홈 말풍선 차례 ----------
   선물 말(크리스마스 · 업데이트)은 홈이 보일 때(잠금 · 가이드 · 확인창 · 썰매 장면에 가려 있지 않을 때) 하나씩 말한다.
   방금 다른 말(생일 · 기다렸다는 말 · 연속 접속 선물 · 옷장 안내)을 했으면 그 말이 3.5초는 보이게 기다린다 */
let homeSayList = [], homeSayT = null;
function homeSay(said){ if(said) homeSayList.push(said); }
function homeSayFlush(){
  clearTimeout(homeSayT);
  if(!homeSayList.length || bdayHidden()) return;
  const since = Date.now() - bubbleSaidAt;
  if(since < 3500){ homeSayT = setTimeout(homeSayFlush, 3550 - since); return; }
  giftSay(homeSayList.shift());
  if(homeSayList.length) homeSayT = setTimeout(homeSayFlush, 3500);
}

/* ---------- 업데이트 고마워 치즈 (1.5) ----------
   새 기능이 든 업데이트(앞 두 자리 — 1.5 · 1.6 · 2.0 — 가 바뀔 때)를 받고 처음 열면 치즈 5개. 버그 수정(1.5.1)에는 없다.
   본 버전(앞 두 자리)을 data.closet.verSeen 에 적어 백업을 따라간다(되살리면 백업의 기록을 따른다 — 치즈도 백업 때로 돌아가니 다시 받아도 늘지 않고,
   새 기기에 깔고 옛 백업을 되살린 사람도 받는다). 새로 설치한 사람은 업데이트가 아니라서 주지 않는다.
   그전 버전에는 이 기록이 없어서, 처음 한 번은 이미 쓰던 흔적(안내를 본 적 · 치즈 · 한 바퀴 · 내 레시피)으로 가린다 */
const VER_CHEESE = 5;
function verMinor(v){ const m = /^(\d+)\.(\d+)/.exec(String(v || "")); return m ? m[1] + "." + m[2] : ""; }
function usedBefore(){
  const c = data.closet;
  return (data.hints || []).length > 0 || c.cheese > 0 || c.roundCount > 0 || !!c.streakDay || !!c.roundDay || c.own.length > 0 || c.themes.length > 0
      || data.drinks.some(d=>!d.sample) || (data.events || []).length > 0 || !!(data.nick && data.nick.had) || !!(data.bday && data.bday.m);
}
function earnVerCheese(){
  if(!isDot() || !isNativeApp() || typeof updateMine !== "function") return false;
  const cur = verMinor(updateMine()), prev = data.closet.verSeen;
  if(!cur || cur === prev) return false;
  if(prev && !updateNewer(cur, prev)) return false;      // 기록이 더 새 버전이면(새 버전 백업을 옛 앱에 되살림) 그대로 둔다
  const give = prev ? true : usedBefore();
  data.closet.verSeen = cur;
  if(give) data.closet.cheese += VER_CHEESE;
  persist();
  return give;
}
let verT = null;
function verHome(){
  if(earnVerCheese()){
    const said = "업데이트해 줘서 고맙츄! 치즈 " + VER_CHEESE + "개 선물이츄";
    /* 처음 생긴 치즈면 한 번뿐인 옷장 안내에 붙여 바로 말한다(따로 말하면 안내를 덮는다) */
    if(!hintSeen("closet") && !bdayHidden()) giftSay(said); else homeSay(said);
  }
  /* 앱을 켤 때 잠금 · 가이드 · 이름 묻기 · iCloud 확인창이 뜰 틈(iCloud 는 1.5초까지 기다린다)을 두고 본다 */
  clearTimeout(verT); verT = setTimeout(homeSayFlush, 1800);
}

/* ---------- 입구 ---------- */
let closetFrom = "home";
function openCloset(from, slot){
  closetFrom = from || "home"; closetTry = ""; closetSay("어때츄?");
  if(slot) closetSlot = slot;
  themeTryStop(); go("closet");
}
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
let resLast = null;            // 결과 화면을 다시 그릴 때(광고로 치즈가 늘었을 때) 쓴다
function closetResultAgain(){ if(resLast) closetResult(resLast.gain, resLast.stat, true); }
function closetResult(gain, stat, again){
  if(!again) resLast = {gain: gain, stat: stat};
  const line = $("#resCheese"), btn = $("#closetBtn");
  if(!line || !btn) return;
  const on = isDot();
  /* 못 받았으면 까닭을 말한다: 하루 몫을 다 받았거나, 짧은 바퀴라 아직 모으는 중이거나. 빈 바퀴면 줄을 숨긴다 */
  const capped = data.closet.roundDay === ymd(new Date()) && data.closet.roundCount >= CHEESE_ROUND_DAY_MAX;
  const short = !!stat && stat.total >= 1 && !roundCounts(stat);
  const said = gain ? "치즈 +" + gain
             : capped ? "오늘 치즈는 다 받았어요"
             : short ? `${CHEESE_ROUND_MIN}장 모이면 치즈 +1 (${data.closet.pool}/${CHEESE_ROUND_MIN})` : "";
  line.style.display = on && said ? "" : "none"; btn.style.display = on ? "" : "none";
  if(!again) $("#resAdMsg").textContent = "";
  adButton();                   // 광고 보고 치즈 받기 (ads.js). 앱이 아니거나 오늘 몫을 다 봤으면 비운다
  if(!on) return;
  /* 치즈 그림은 글 첫머리에 붙여 둔다. 좁으면 "지금 N개"만 통째로 다음 줄로 내려간다(글자 사이가 쪼개지지 않게) */
  line.innerHTML = `<span class="cg"><span class="ci">${cheeseSVG()}</span>${said}</span><small>지금 ${data.closet.cheese}개</small>`;
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
/* 옷장이 두 칸(왼쪽 무대 · 오른쪽 아이템)으로 놓였는가. 조건은 dot.css 한 곳에만 두고 여기서는 그 결과(grid)를 본다 */
function closetWide(){ const sc = document.querySelector("#s-closet .scroll"); return !!sc && getComputedStyle(sc).display === "grid"; }
function renderCloset(){
  stopClosetRun();                // 미리 보던 달리기는 끊는다(입어 보는 옷이 바뀌었을 수 있다)
  const c = data.closet;
  if(closetTry && c.own.indexOf(closetTry) >= 0) closetTry = "";      // 이미 가진 것은 입어 볼 게 없다
  if(closetTry && !closetOnSale(closetItem(closetTry))){              // 입어 보는 사이에 판매가 끝났다
    $("#cMsg").textContent = closetItem(closetTry).season.name + " 판매가 끝났어요"; closetTry = "";
  }
  $("#closetSub").textContent = "치즈 " + c.cheese + "개";
  $("#cCheese").innerHTML = `<span class="ci">${cheeseSVG()}</span><span>${c.cheese}</span>`;
  $("#cMouse").innerHTML = mouseSVGWorn("day", false, closetStageWear());
  $("#cTabs").innerHTML = CLOSET_SLOTS.concat([["theme", "테마"]]).map(([s, name])=>`<button type="button" data-s="${s}" class="${s === closetSlot ? "on" : ""}">${name}</button>`).join("");
  /* 기간 한정은 파는 동안 맨 앞에. 기간이 지나면 가진 것만 남는다 */
  const shown = closetSlot === "theme" ? [] : CLOSET_ITEMS.filter(i=>i.slot === closetSlot && (c.own.indexOf(i.id) >= 0 || closetOnSale(i)));
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
      ${i.season && !own ? `<span class="lim${i.season.cls ? " " + i.season.cls : ""}">${esc(i.season.tag || i.season.name)} ~${Number(until[1])}/${Number(until[2])}</span>` : ""}</button>`;
  }).join("") + (closetSlot === "theme" ? themeCards() : "");
  $("#cGrid").classList.toggle("themes", closetSlot === "theme");
  document.querySelectorAll("#cTabs button").forEach(b=>b.addEventListener("click", ()=>{
    if(closetLocked()) return;
    if(closetSlot !== b.dataset.s) haptic("selection");
    closetSlot = b.dataset.s; renderCloset();
  }));
  document.querySelectorAll("#cGrid .citem[data-i]").forEach(b=>b.addEventListener("click", ()=>{ if(!closetLocked()) tapClosetItem(b.dataset.i); }));
  document.querySelectorAll("#cGrid .citem[data-t]").forEach(b=>b.addEventListener("click", ()=>{ if(!closetLocked()) tapTheme(b.dataset.t); }));
  closetBuyBar();
  adButton();                   // 광고 보고 치즈 받기 (ads.js)
  scheduleClosetBlink();
  scheduleClosetGlow();         // 빛나는 옷의 번쩍임은 깜빡임과 따로 돈다
}
/* ---------- 달릴 때 입는 옷 (mascot.js 의 runLane) ----------
   달리기는 옆모습 그림이라 정면 옷을 얹을 수 없다. 달리기용 덧그림(run)이 있는 옷만 입고 달리고, 나머지는 달리는 동안 벗는다.
   run.rows 는 옆모습 28×40 위의 덧그림(y 행부터). "_" 는 지우는 칸(호박 머리가 귀를 덮는다), cells 가 있으면 그 칸에만 칠한다(망토).
   lit 이면 빛나는 옷(glow)은 빛나는 색으로 — 호박 머리가 달리며 번쩍인다 */
function runWear(wear){
  const w = wear || wornNow();
  return ["body", "hand", "face", "head"].map(s=>closetItem(w[s])).filter(it=>it && it.run);
}
function runDress(rows, items, lit){
  const g = (items.some(it=>it.suit) ? suitSide(rows) : rows).map(r=>r.split(""));
  items.forEach(it=>{
    const glow = glowMap(it, lit);
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
  const key = rows.join("") + "|" + lit;
  if(!runDressMemo.has(key)) runDressMemo.set(key, runDress(rows, items, lit));
  return runDressMemo.get(key);
}
/* 착지 칸은 몸이 한 줄 눌리고, 뛰어오르는 칸은 한 줄 늘어난다(발은 그대로). 옷을 입힌 뒤에 해서 옷도 같이 움직인다.
   src 는 달리기 원본(RUN_SPR.s0 ...). 뛰어오르는 칸은 귀 · 머리 옷이 맨 윗줄을 쓰지 않는다 */
const RUN_DY = new Map([[RUN_SPR.s0, 1], [RUN_SPR.s1, -1], [RUN_SPR.s3, 1], [RUN_SPR.s4, -1]]);
const runSquashMemo = new WeakMap();
function runSquash(rows, src){
  const dy = RUN_DY.get(src);
  if(!dy) return rows;
  if(!runSquashMemo.has(rows)){
    let o;
    if(dy > 0){ o = rows.slice(); o.splice(33, 1); o.unshift(".".repeat(rows[0].length)); }
    else { o = rows.slice(1); o.splice(32, 0, o[32]); }
    runSquashMemo.set(rows, o);
  }
  return runSquashMemo.get(rows);
}
const RUN_SNOW = [["..S..", ".ShS.", "ShhhS", ".ShS.", "..S.."], [".S.", "ShS", ".S."]];
/* 망토 자락 · 목도리 끝 · 따라오는 박쥐 · 떨어지는 눈송이. 달리기 층(#panicLayer) 전체 그림(mascot.js 의 runLane 이 감싼다)에 들어갈 조각. 한 칸 = 2px(쥐돌이 56×80 과 같다).
   bats 는 박쥐 자리(부드럽게 따라오도록 그릴 때마다 조금씩 다가간다) */
function runFxSVG(it, f, i, bats, side){
  let out = "";
  /* 도트 그림(rowsSVG — 같은 색은 한 줄로 묶는다)을 그 자리 · 크기로 끼워 넣는다 */
  const px = (rows, ox, oy, flip)=>{ out += rowsSVG(rows, flip).replace("<svg ", `<svg x="${ox}" y="${oy}" width="${rows[0].length*2}" height="${rows.length*2}" `); };
  /* 자락: 목 뒤(옆모습 18열 · 18행)에서 뒤로. 오른쪽을 보고 달리면(flip) 거울로 */
  if(it.run.tail){
    const t = it.run.tail[Math.floor(i / 2) % it.run.tail.length];
    if(side !== false) px(t, f.flip ? f.x + (28 - 18 - t[0].length)*2 : f.x + 18*2, f.y + (18 + (RUN_DY.get(f.rows) || 0))*2, f.flip);
  }
  /* 눈송이: 달리는 동안 등 뒤에서 생겨 흔들리며 떨어진다. bats 자리에 눈송이 목록을 둔다 */
  if(it.run.snow){
    if(side !== false && i % 4 === 0) bats.push({x: f.flip ? f.x - 6 : f.x + 52, y: f.y + 20 + (i*7) % 40, a: 0, big: i % 8 === 0});
    for(let k = bats.length - 1; k >= 0; k--){
      const s = bats[k];
      s.a++; s.y += 1.5; s.x += Math.sin(s.a / 3);
      if(s.a >= 30) bats.splice(k, 1);
      else px(RUN_SNOW[s.big ? 0 : 1], Math.round(s.x), Math.round(s.y), false);
    }
    return out;
  }
  const back = f.flip ? -1 : 1;
  bats.forEach((b, k)=>{
    const tx = f.x + 20 + back*(40 + k*24), ty = f.y - 4 + k*16;
    if(b.x === null){ b.x = tx; b.y = ty; }
    b.x += (tx - b.x)*(0.18 - k*0.03); b.y += (ty - b.y)*0.2;
    px(RUN_BAT[Math.floor((i + k*2) / 2) % 2], Math.round(b.x), Math.round(b.y + Math.sin((i + k*4) / 3)*5), false);
  });
  return out;
}

/* 입어 보는 중일 때 무대 아래에 뜨는 줄: 이름 · 값 · 사기 · 그만 보기. 치즈가 모자라면 몇 개 모자란지 알려주고 사기는 잠근다 */
function closetBuyBar(){
  const bar = $("#cBuy"); if(!bar) return;
  const it = closetItem(closetTry), th = themeShopItem(themeTry);
  if(th){
    const short = th.price - data.closet.cheese;
    bar.innerHTML = `<div class="cbuy">
      <div class="who"><b>${esc(th.name)}</b><span>${short > 0 ? "치즈가 " + short + "개 모자라요" : "미리 보는 중 · 옷장을 닫으면 원래대로"}</span>
        <button type="button" class="fxb" id="cThemeHome">홈에서 보기</button></div>
      <button type="button" class="buy" id="cBuyBtn"${short > 0 ? " disabled" : ""}><span class="ci">${cheeseSVG()}</span>${th.price} 사기</button>
      <button type="button" class="no" id="cBuyNo">그만 보기</button></div>`;
    $("#cBuyBtn").addEventListener("click", ()=>buyTheme(th.id));
    $("#cThemeHome").addEventListener("click", themePeekHome);
    $("#cBuyNo").addEventListener("click", ()=>{ themeTryStop(); closetLock(); closetSay("어때츄?"); haptic("light"); renderCloset(); });
    return;
  }
  if(!it){ bar.innerHTML = ""; return; }
  const lack = it.price - data.closet.cheese;
  bar.innerHTML = `<div class="cbuy">
      <div class="who"><b>${esc(it.name)}</b><span>${lack > 0 ? "치즈가 " + lack + "개 모자라요" : "입어 보는 중이에요"}</span>
        ${it.perk ? `<em class="perk">${esc(it.perk)}</em>${closetCanPreview(it) ? `<button type="button" class="fxb" id="cFxBtn">효과 보기</button>` : ""}` : ""}</div>
      <button type="button" class="buy" id="cBuyBtn"${lack > 0 ? " disabled" : ""}><span class="ci">${cheeseSVG()}</span>${it.price} 사기</button>
      <button type="button" class="no" id="cBuyNo">그만 보기</button></div>`;
  $("#cBuyBtn").addEventListener("click", buyClosetItem);
  if($("#cFxBtn")) $("#cFxBtn").addEventListener("click", closetEffect);
  $("#cBuyNo").addEventListener("click", ()=>{ closetTry = ""; closetLock(); closetSay("어때츄?"); haptic("light"); renderCloset(); });
}
/* ---------- 효과 미리 보기 (입어 보는 중) ----------
   달릴 때 효과가 있는 옷(망토 · 호박 머리)은 무대에서 한 바퀴 뛰어 보이고(망토 자락 · 박쥐 · 번쩍임 그대로 — runFxSVG),
   빛나는 옷(호박 바구니)은 그 자리에서 두 번 번쩍인다. 움직임 줄이기를 켰으면 잠깐 빛나는 모습만 보인다 */
let closetRunT = null;
/* 미리 볼 게 있는가: 움직임 줄이기면 빛나는 옷만(달리기는 보여 주지 않는다) */
function closetCanPreview(it){ return !!it && (reduceMotion() ? !!it.glow : !!(it.run || it.glow)); }
/* 입어 보는 중의 말풍선(치즈가 모자라면 그렇게 말한다 — tapClosetItem 과 같다) */
function closetTrySay(){ const it = closetItem(closetTry); closetSay(it ? (data.closet.cheese < it.price ? "치즈가 모자라츄…" : "어울리츄?") : "어때츄?"); }
function closetEffect(){
  const it = closetItem(closetTry);
  if(!closetCanPreview(it) || closetRunT) return;
  haptic("light");
  const draw = ()=>{ if($("#s-closet").classList.contains("active")) drawClosetStage(); };
  clearTimeout(closetGlowT); glowStop(closetStage);
  if(reduceMotion()){
    closetStage.lit = true; draw();
    closetStage.glowT.push(setTimeout(()=>{ closetStage.lit = false; draw(); }, 1200));
    return;
  }
  if(it.run){ closetRun(); return; }
  closetSay("번쩍!");
  glowRun(closetStage, draw, ()=>glowRun(closetStage, draw, ()=>{ closetTrySay(); scheduleClosetGlow(); }));
}
function stopClosetRun(){
  if(closetRunT){ clearInterval(closetRunT); closetRunT = null; }
  const layer = $("#cRun"); if(layer) layer.remove();
  const m = $("#cMouse"); if(m) m.style.visibility = "";
}
function closetRun(){
  const stage = document.querySelector("#s-closet .cstage"), m = $("#cMouse");
  if(!stage || !m) return;
  const sr = stage.getBoundingClientRect(), mr = m.getBoundingClientRect();
  const k = mr.width / 56;                                           // 무대 쥐돌이(140px) ÷ 달리기 그림(56px)
  const W = Math.round(sr.width / k), H = Math.round(sr.height / k);
  const home = {x: Math.round((mr.left - sr.left) / k), y: Math.round((mr.top - sr.top) / k)};
  const wear = runWear(closetStageWear()), cape = wear.filter(it=>it.run.tail || it.run.snow)[0];
  const front = {}; wear.forEach(it=>{ front[it.slot] = it.id; });  // 돌아설 때도 달리기용 그림이 있는 옷만(홈의 runLane 과 같다)
  const bats = cape && cape.run.bats ? [0, 1, 2].map(()=>({x: null, y: null})) : [];
  /* 제자리에서 오른쪽 끝과 왼쪽 끝을 두 번 오가고(끝에서 정면을 보고 돌아선다) 제자리로. 무대가 좁아 잔걸음으로 두 바퀴. 몸놀림은 홈(lanePlan)과 같다 */
  const plan = [], xL = 4, xR = W - 56 - 4;
  let x = home.x, ph = 0, wentLeft = false;
  const face = (c, h)=>plan.push({rows: RUN_SPR.qf, flip: wentLeft, x: x, y: home.y - (h || 0), sx: c[0], sy: c[1]});
  const runTo = to=>{
    const right = to > x; wentLeft = !right;
    runXs(x, to, 4, [1, 2, 3]).forEach(nx=>{ plan.push({rows: RUN_SPR["s" + (ph % 6)], flip: right, x: nx, y: home.y - RUN_HOP[ph % 6], sx: 1, sy: 1}); ph++; });
    x = to;
  };
  const turn = ()=>RUN_TURN.forEach(c=>face(c, c[2]));          // 돌아서는 모습은 홈(lanePlan)과 같은 쪽
  /* 서 있는 그림과 옆모습 사이를 정면 그림으로 잇는다(뚝 바뀌지 않게) */
  RUN_CROUCH.slice(0, 2).forEach(c=>face(c));
  runTo(xR); turn(); runTo(xL); turn(); runTo(xR); turn(); runTo(xL); turn(); runTo(home.x);
  RUN_LAND.forEach(c=>face(c));
  runDressMemo.clear();
  const layer = document.createElement("div");
  layer.id = "cRun"; layer.className = "crun";
  layer.innerHTML = `<div class="cw" style="width:${W}px;height:${H}px;transform:scale(${k})"><div class="fx"></div><div class="r"></div></div>`;
  stage.appendChild(layer);
  const R = layer.querySelector(".r"), FX = layer.querySelector(".fx");
  m.style.visibility = "hidden";
  closetSay("슝!");
  let i = 0, rLast = "", fxLast = "";
  closetRunT = setInterval(()=>{
    if(i >= plan.length || !$("#s-closet").classList.contains("active")){ stopClosetRun(); closetTrySay(); return; }
    const f = plan[i], side = f.rows !== RUN_SPR.qf, lit = runGlow(i);
    const rows = side ? runSquash(runDressed(f.rows, wear, lit), f.rows) : dressRows(f.rows, "qf", front, lit);
    const svg = rowsSVG(rows, f.flip);
    if(svg !== rLast){ R.innerHTML = svg; rLast = svg; }                    // 같은 그림이면 건드리지 않는다
    R.style.transform = `translate(${f.x}px,${f.y}px) scale(${f.sx},${f.sy})`;
    const bits = cape ? runFxSVG(cape, f, i, bats, side) : "";
    const html = bits ? `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" aria-hidden="true">${bits}</svg>` : "";
    if(html !== fxLast){ FX.innerHTML = html; fxLast = html; }
    i++;
  }, 42);
}
/* 아이템을 눌렀다. 가진 것이면 입거나 벗고, 아직 없는 것이면 입어 보기만 한다(사는 것은 buyClosetItem) */
function tapClosetItem(id){
  const c = data.closet, it = closetItem(id), msg = $("#cMsg");
  if(!it || (c.own.indexOf(id) < 0 && !closetOnSale(it))) return;      // 기간이 지난 한정 아이템은 입어 볼 수도 없다
  if(c.own.indexOf(id) < 0){
    themeTryStop();
    closetTry = closetTry === id ? "" : id;
    msg.textContent = "";
    closetSay(closetTry ? (c.cheese < it.price ? "치즈가 모자라츄…" : "어울리츄?") : "어때츄?");
    haptic("selection");
    closetLock();
    renderCloset();
    /* 아래쪽 칸을 눌렀어도 입혀 본 쥐돌이와 사기 버튼이 같이 보이게 무대 위쪽으로 올린다.
       두 칸 화면에서는 무대가 옆에 붙어 있으니 고르던 자리 그대로 둔다 */
    if(closetTry && !closetWide()){ const sc = document.querySelector("#s-closet .scroll"); if(sc) sc.scrollTop = 0; }
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
    if(closetStage.lit){ scheduleClosetBlink(); return; }           // 번쩍이는 중이면 이번 깜빡임은 건너뛴다
    const ms = runBlink(closetStage, ()=>{ if($("#s-closet").classList.contains("active")) drawClosetStage(); });
    setTimeout(scheduleClosetBlink, ms);
  }, 2400 + Math.random()*3600);
}
/* 옷장 무대의 쥐돌이: 눈 깜빡임과 빛나는 옷의 번쩍임은 따로 돈다(같이 하면 둘이 한 몸처럼 보인다) */
const closetStage = {blink: false, lit: false, glowT: []};
let closetGlowT = null;
function drawClosetStage(){
  const m = $("#cMouse"); if(!m || closetRunT) return;           // 미리 보기로 뛰는 동안엔 숨겨 둔 무대를 다시 그리지 않는다
  m.innerHTML = mouseSVGWorn(closetStage.blink ? blinkFrame(closetStage.blink) : "day", false, closetStageWear(), closetStage.lit);
}
function scheduleClosetGlow(){
  clearTimeout(closetGlowT);
  glowStop(closetStage);
  closetStage.lit = false;
  if(reduceMotion() || !wearGlows(closetStageWear())) return;
  closetGlowT = setTimeout(()=>{
    if(!$("#s-closet").classList.contains("active")) return;
    glowRun(closetStage, ()=>{ if($("#s-closet").classList.contains("active")) drawClosetStage(); }, scheduleClosetGlow);       // 홈과 같은 번쩍임(mascot.js)
  }, 3200 + Math.random()*3800);
}
/* ---------- 옷장 "테마" 칸 (1.5.3) ----------
   무료 테마(자동 · 기본 · 다크 · 그린)와 가진 치즈 테마는 누르면 바로 바뀐다. 아직 안 산 치즈 테마(파는 동안만 보인다)는
   누르면 미리 보기: 저장은 하지 않고 화면만 그 테마로 그린다(settings.js 의 shownTheme 이 themeTry 를 먼저 본다).
   "홈에서 보기"를 누르면 홈도 그 테마로 열린다(맨 위 줄에서 사기 · 옷장으로). 옷장 · 미리 보는 홈 밖으로 가거나
   앱이 뒤로 가면 원래 테마로 돌아온다 */
let themeTry = "", themePeek = false;
function themeTryStop(){
  if(!themeTry && !themePeek) return;
  themeTry = ""; themePeek = false;
  applyTheme(); themePeekBar();
}
/* 화면을 옮길 때(shell.js 의 go): 옷장 안, 또는 "홈에서 보기"로 연 홈이면 미리 보기를 이어 간다 */
function themeTryGo(name){
  if(!themeTry) return;
  if(name === "closet"){ themePeek = false; themePeekBar(); return; }
  if(name === "home" && themePeek) return;
  themeTryStop();
}
function themeMini(id){
  const c = id === "auto" ? null : THEME_MINI[id];
  const bg = c ? c[0] : "linear-gradient(135deg, #F3E9DC 50%, #141210 50%)";
  const p = c || THEME_MINI.cream;
  return `<span class="tmini" style="background:${bg};box-shadow:0 0 0 2px ${p[3]}">
    <i class="tl" style="background:${id === "xmnight" ? "repeating-linear-gradient(90deg,#E8504A 0 4px,#F2C766 4px 8px,#5FB86A 8px 12px,#5AA0E0 12px 16px)" : p[4]}"></i>
    <i class="tc" style="background:${p[1]};box-shadow:0 0 0 2px ${p[3]}"></i><i class="tt" style="background:${p[2]};box-shadow:0 -2px 0 0 ${p[3]}"></i></span>`;
}
function themeCards(){
  const shop = THEME_SHOP.filter(t=>themeOwned(t.id) || closetOnSale(t));
  const lim = t=>!!t.season && !themeOwned(t.id);
  const list = shop.filter(lim).concat(THEME_FREE, shop.filter(t=>!lim(t)));      // 파는 중인 한정 테마는 맨 앞에
  return list.map(t=>{
    const paid = !!themeShopItem(t.id), own = !paid || themeOwned(t.id), on = data.theme === t.id, trying = themeTry === t.id;
    const tag = on ? "사용 중" : (own ? (paid ? "보유중" : "무료") : `<span class="ci">${cheeseSVG()}</span>${t.price}`);
    const until = t.season ? t.season.until.split("-") : [];
    return `<button type="button" class="citem${own ? " own" : ""}${on ? " wear" : ""}${trying ? " try" : ""}" data-t="${t.id}">
      <span class="th">${themeMini(t.id)}</span><span class="nm">${esc(t.name)}</span><span class="pr">${tag}</span>
      ${lim(t) ? `<span class="lim${t.season.cls ? " " + t.season.cls : ""}">${esc(t.season.tag || t.season.name)} ~${Number(until[1])}/${Number(until[2])}</span>` : ""}</button>`;
  }).join("");
}
function tapTheme(id){
  const t = themeShopItem(id), msg = $("#cMsg");
  if(t && !themeOwned(id)){
    if(!closetOnSale(t)) return;
    closetTry = "";
    themeTry = themeTry === id ? "" : id;
    msg.textContent = "";
    closetSay(themeTry ? (data.closet.cheese < t.price ? "치즈가 모자라츄…" : "어떤 것 같츄?") : "어때츄?");
    haptic("selection"); closetLock();
    applyTheme(); renderCloset();
    if(themeTry && !closetWide()){ const sc = document.querySelector("#s-closet .scroll"); if(sc) sc.scrollTop = 0; }
    return;
  }
  if(!t && !THEME_FREE.some(f=>f.id === id)) return;
  themeTry = ""; closetTry = "";
  if(data.theme !== id){ data.theme = id; persist(); haptic("selection"); }
  applyTheme();
  msg.textContent = (t ? t.name : THEME_FREE.filter(f=>f.id === id)[0].name) + " 테마로 바꿨어요";
  closetSay("이걸로 바꿨츄!");
  renderCloset();
}
function buyTheme(id){
  const t = themeShopItem(id), c = data.closet;
  if(!t || themeOwned(id)) return;
  if(!closetOnSale(t)){ haptic("error"); themeTryStop(); if($("#s-closet").classList.contains("active")) renderCloset(); return; }
  if(c.cheese < t.price){ haptic("error"); toast("치즈가 " + (t.price - c.cheese) + "개 모자라요"); return; }
  c.cheese -= t.price; c.themes.push(id); data.theme = id;
  themeTry = ""; themePeek = false;
  persist(); applyTheme(); themePeekBar(); closetHome();
  sfx("chu"); haptic("success"); toast(t.name + " 테마를 샀어요");
  if($("#s-closet").classList.contains("active")){ closetLock(); $("#cMsg").textContent = t.name + " 테마를 샀어요"; closetSay("고맙츄!"); renderCloset(); }
}
/* "홈에서 보기": 미리 보는 테마 그대로 홈을 연다. 맨 위 줄(#tPeek)에서 사거나 옷장으로 돌아간다 */
function themePeekHome(){
  if(!themeShopItem(themeTry)) return;
  themePeek = true; haptic("light");
  go("home"); themePeekBar();
}
function themePeekBar(){
  const bar = $("#tPeek"); if(!bar) return;
  const t = themePeek ? themeShopItem(themeTry) : null;
  bar.hidden = !t;
  if(!t){ bar.innerHTML = ""; return; }
  const short = t.price - data.closet.cheese;
  bar.innerHTML = `<span class="t"><b>${esc(t.name)}</b> ${short > 0 ? "치즈가 " + short + "개 모자라요" : "미리 보는 중이츄"}</span>
    <button type="button" id="tPeekBack">옷장으로</button>
    <button type="button" class="buy" id="tPeekBuy"${short > 0 ? " disabled" : ""}><span class="ci">${cheeseSVG()}</span>${t.price}</button>`;
  $("#tPeekBack").addEventListener("click", ()=>{ haptic("light"); go("closet"); });
  $("#tPeekBuy").addEventListener("click", ()=>buyTheme(t.id));
}
/* 앱이 뒤로 가면 미리 보기는 끝(다시 켰을 때 산 줄 알지 않게) */
document.addEventListener("visibilitychange", ()=>{ if(document.hidden) themeTryStop(); });
$("#closetClose").addEventListener("click", ()=>go(closetFrom === "result" ? "home" : closetFrom));
$("#cheeseChip").addEventListener("click", ()=>{ haptic("light"); openCloset("home"); });
$("#closetBtn").addEventListener("click", ()=>openCloset("result"));
$("#cheeseChip").querySelector(".ci").innerHTML = cheeseSVG();
