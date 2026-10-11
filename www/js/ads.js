/* 암기쥐 — 광고 보고 치즈 받기 (1.1 · 앱 전용)
   옷장에서 버튼을 누르면 보상형 광고를 하나 보고, 끝까지 보면 치즈 +5 를 받는다. 하루 3번까지.
   광고는 앱(AdBridge.swift)이 띄운다. 웹은 "보여 달라"고 부탁하고 결과만 받는다 — 웹뷰는 여전히
   바깥과 통신하지 않는다(CSP connect-src 'none' 그대로).
   광고가 꺼진 빌드(window.__amgijwiAds 가 true 가 아님)나 웹에서는 버튼이 아예 나오지 않는다.
   누르지 않으면 광고 SDK 는 깨어나지 않는다. 광고는 화면에 저절로 뜨지 않는다 */

const AD_CHEESE = 5, AD_DAY_MAX = 3;
/* 광고를 불러오는 데 이만큼 기다려도 뜨지 않으면 그만둔다(통신이 느릴 때 버튼이 묶이지 않게).
   광고가 뜬 뒤에는 재지 않는다 — 광고는 30초가 넘기도 하고, 광고를 눌러 App Store 에 다녀오기도 한다 */
const AD_WAIT_MS = 25000;

/* 앱이 심어 두는 통로. 이름은 AdBridge.swift 의 name 과 같아야 한다 */
function adBridge(){
  const w = window.webkit;
  if(!isNativeApp() || window.__amgijwiAds !== true || !w || !w.messageHandlers || !w.messageHandlers.amgijwiAd) return null;
  return w.messageHandlers.amgijwiAd;
}
function adsOn(){ return isDot() && !!adBridge(); }
/* 오늘 더 볼 수 있는 횟수 */
function adLeft(){
  const c = data.closet;
  return Math.max(0, AD_DAY_MAX - (c.adDay === ymd(new Date()) ? c.adCount : 0));
}

let adBusy = false, adWaitT = null;
/* 옷장의 광고 버튼. renderCloset 이 그릴 때마다 부른다 */
function adButton(){
  const box = $("#cAd"); if(!box) return;
  if(!adsOn()){ box.innerHTML = ""; return; }
  const left = adLeft();
  box.innerHTML = `<button type="button" class="adbtn" id="adBtn"${left < 1 || adBusy ? " disabled" : ""}>
      <span class="ci">${cheeseSVG()}</span><span>${adBusy ? "광고를 불러오는 중…" : "광고 보고 치즈 +" + AD_CHEESE}</span>
      <span class="left">${left < 1 ? "내일 또 받아요" : "오늘 " + left + "번"}</span></button>`;
  $("#adBtn").addEventListener("click", watchAd);
}
function watchAd(){
  const b = adBridge();
  if(!b || adBusy || adLeft() < 1) return;
  adBusy = true;
  /* 광고 소리와 겹치지 않게 배경음을 잠깐 끈다. 끝나면 다시 켠다 */
  bgmHold = true; bgmStop();
  haptic("light");
  $("#cMsg").textContent = "";
  adButton();
  clearTimeout(adWaitT);
  /* 기다리다 그만두면 앱에도 알린다. 알리지 않으면 뒤늦게 불러온 광고가 느닷없이 뜬다 */
  adWaitT = setTimeout(()=>{ b.postMessage({op:"cancel"}); adResultFromApp("failed"); }, AD_WAIT_MS);
  b.postMessage({op:"show"});
}
/* 앱이 알려줄 때 부른다. 이 이름은 AdBridge.swift 에도 적혀 있다.
   showing 광고가 떴다(아직 끝난 게 아니다) · rewarded 끝까지 봤다 · closed 중간에 닫았다 · failed 광고가 없거나 불러오지 못했다 */
function adResultFromApp(result){
  if(!adBusy) return;               // 부탁한 적이 없거나 이미 끝난 일이다(두 번 받지 않는다)
  if(result === "showing"){ clearTimeout(adWaitT); return; }
  adBusy = false;
  clearTimeout(adWaitT);
  bgmHold = false; armBgm();
  const msg = $("#cMsg");
  /* 끝까지 봤으면 준다. 하루 몫은 누를 때 이미 확인했다 */
  if(result === "rewarded"){
    const c = data.closet, today = ymd(new Date());
    if(c.adDay !== today){ c.adDay = today; c.adCount = 0; }
    c.adCount += 1; c.cheese += AD_CHEESE;
    persist();
    if($("#s-closet").classList.contains("active")) renderCloset(); else adButton();
    closetHome();
    showThanks();
    return;
  }
  if(msg) msg.textContent = result === "closed" ? "광고를 끝까지 봐야 치즈를 받아요."
                                                : "지금은 볼 수 있는 광고가 없어요. 잠시 뒤에 다시 해 보세요.";
  if(result !== "closed") haptic("error");
  adButton();
}

/* ---------- 고맙다 창 ----------
   광고를 끝까지 보면 쥐돌이와 까룩이가 기쁜 얼굴로 엇갈려 폴짝 뛰며 고맙다고 한다.
   3.6초 뒤 저절로 닫히고, 눌러도 닫힌다 */

/* 기쁜 얼굴: 웃으며 감은 눈(∩ ∩)과 발그레한 볼. 입은 원래대로 명암만 둔다.
   쥐돌이는 서 있는 그림의 8~15행을, 까룩이는 11~16행을 바꾼다 */
const MOUSE_HAPPY = {y0:8, rows:[
  "......ocwwwwwwwwwwwwco......",
  "....oowcwwwwwwwwwwwwcwoo....",
  "...ocwwwwkkkwwwwkkkwwwwco...",
  "....owcwkwwwkwwkwwwkwcwo....",
  "...ocwwwwwwwwwwwwwwwwwwco...",
  "..owcppwwwwwwwwwwwwwwppcwo..",
  "...ocwdwwwwwwwwwwwwwwdwco...",
  "...owcwwwwwwwnnwwwwwwwcwo..."]};
const CROW_HAPPY = {y0:11, rows:[
  "...obssbbbbbbbbbbbbbbssbo...",
  "...osssbhhhbbbbbhhhbbssso...",
  "...obsshbbbhsbbhbbbhbssbo...",
  "...ossbbbbbbbbbbbbbbbbsso...",
  "...obssbbbbbbbbbbbbbsssbo...",
  "...ossrrbbbbbbbbbbbrrbsso..."]};
CROW_PAL.r = "#C9605A";           // 까룩이 볼
function happyCrowSVG(pose){
  const rows = CROW[pose].slice();
  CROW_HAPPY.rows.forEach((r, i)=>{ rows[CROW_HAPPY.y0 + i] = r; });
  return crowSVG(rows);
}
function happyMouseSVG(){
  const rows = mouseRows("day");
  MOUSE_HAPPY.rows.forEach((r, i)=>{ rows[MOUSE_HAPPY.y0 + i] = r; });
  return rowsSVG(dressRows(rows, "stand"), false);
}

let thxT = null, thxCrowT = null, thxOutT = null;
function closeThanks(){
  const t = $("#thx");
  if(!t || t.hidden) return;
  clearTimeout(thxT); clearInterval(thxCrowT); clearTimeout(thxOutT);
  t.classList.add("out");
  thxOutT = setTimeout(()=>{ t.hidden = true; t.classList.remove("out"); }, 360);
}
function showThanks(){
  const t = $("#thx"); if(!t) return;
  clearTimeout(thxT); clearInterval(thxCrowT); clearTimeout(thxOutT);
  $("#thxMouse").innerHTML = happyMouseSVG();
  /* 치즈 조각 8개: 자리 · 출발 · 높이를 조금씩 다르게 */
  let bits = "";
  for(let i = 0; i < 8; i++){
    bits += `<i style="left:${8 + (i * 53) % 84}%;--d:${700 + (i % 4) * 120 + Math.floor(i / 4) * 260}ms;--rise:${70 + (i % 4) * 16}px">${cheeseSVG()}</i>`;
  }
  $("#thxBits").innerHTML = bits;
  $("#thxGain").textContent = "치즈 +" + AD_CHEESE;
  const crowEl = $("#thxCrow");
  let caw = false;
  crowEl.innerHTML = happyCrowSVG("idle");
  if(!reduceMotion()) thxCrowT = setInterval(()=>{ caw = !caw; crowEl.innerHTML = happyCrowSVG(caw ? "caw" : "idle"); }, 300);
  closetSay("고맙츄!");
  sfx("chu"); haptic("success");
  t.classList.remove("out");
  t.hidden = false;
  thxT = setTimeout(closeThanks, 3600);
}
$("#thx").addEventListener("click", closeThanks);
