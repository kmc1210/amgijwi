/* 암기쥐 — 설정 · 백업 · PIN 잠금 · 카테고리 · 테마 */

/* ---------- 설정 ---------- */
/* =========================================================
   PIN 잠금 — 저장된 값은 되돌릴 수 없는 형태로만 남긴다
   (암호화는 아니고, 눈으로 못 읽게 하는 정도)
   ========================================================= */
function pinHash(s){
  let a = 0x811c9dc5;
  const salt = "brewnote";
  const t = salt + String(s) + salt;
  for(let i=0;i<t.length;i++){
    a ^= t.charCodeAt(i);
    a = (a * 0x01000193) >>> 0;
  }
  return a.toString(16);
}
const lock = {mode:"enter", buf:"", first:"", onDone:null};

function drawDots(){
  const n = lock.buf.length;
  $("#lockDots").innerHTML = [0,1,2,3].map(i=>`<i class="${i<n?"on":""}"></i>`).join("");
}
function drawKeys(){
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  $("#lockKeys").innerHTML = keys.map(k=>
    k === "" ? `<button class="blank" type="button"></button>`
             : `<button type="button" class="${k==="⌫"?"act":""}" data-k="${k}">${k}</button>`).join("");
  $("#lockKeys").querySelectorAll("[data-k]").forEach(b=>b.addEventListener("click",()=>pressKey(b.dataset.k)));
}
function lockBad(msg){
  haptic("error");
  const d = $("#lockDots");
  d.classList.remove("bad"); void d.offsetWidth; d.classList.add("bad");
  lock.buf = ""; drawDots();
  if(msg) $("#lockSub").textContent = msg;
}
function pressKey(k){
  if(k === "⌫"){ lock.buf = lock.buf.slice(0,-1); drawDots(); return; }
  if(lock.buf.length >= 4) return;
  lock.buf += k; drawDots();
  if(lock.buf.length < 4) return;
  const val = lock.buf;
  setTimeout(()=>{
    if(lock.mode === "enter"){
      if(pinHash(val) === data.pin){ closeLock(); }
      else lockBad("번호가 맞지 않아요");
    } else if(lock.mode === "new"){
      lock.first = val; lock.buf = ""; lock.mode = "confirm";
      $("#lockTitle").textContent = "한 번 더 입력하세요";
      $("#lockSub").textContent = "확인용이에요";
      drawDots();
    } else {
      if(val === lock.first){
        data.pin = pinHash(val); persist();
        closeLock(); renderSettings(); toast("PIN을 설정했어요");
      } else {
        lock.mode = "new"; lock.first = "";
        $("#lockTitle").textContent = "PIN을 정해주세요";
        lockBad("두 번이 달라요. 다시 입력해 주세요");
      }
    }
  }, 90);
}
function openLock(mode){
  lock.mode = mode; lock.buf = ""; lock.first = "";
  $("#lockTitle").textContent = mode === "enter" ? "PIN을 입력하세요" : "PIN을 정해주세요";
  $("#lockSub").textContent   = mode === "enter" ? "이 기기에서만 확인합니다" : "네 자리 숫자를 입력해 주세요";
  $("#lockCancel").style.display = mode === "enter" ? "none" : "block";
  $("#lockMascot").innerHTML = mouseSVGWorn(typeof currentMood === "function" ? currentMood() : "day");
  drawDots(); drawKeys();
  $("#lock").classList.add("on");
}
function closeLock(){
  $("#lock").classList.remove("on"); lock.buf = "";
  bdayHome();                   // 잠금에 가려 미뤄 둔 생일 폭죽이 있으면 지금 터트린다 (birthday.js)
  if(lock.mode === "enter") openNickAsk();      // PIN 을 쓰는 사람에게는 잠금을 푼 뒤에 이름을 한 번 묻는다 (nick.js)
  recipeGo();                   // 받은 레시피 파일이 있으면 잠금을 푼 뒤에 연다 (recipeshare.js)
  widgetGo();                   // 위젯을 눌러 들어왔으면 잠금을 푼 뒤에 그 화면으로 간다 (widget.js)
  updateGo();                   // 새 버전 소식이 있으면 잠금을 푼 뒤에 묻는다 (update.js)
}
$("#lockCancel").addEventListener("click", closeLock);

function renderPinCard(){
  const on = !!data.pin;
  $("#pinToggle").textContent = on ? "PIN 해제하기" : "PIN 설정하기";
  $("#pinToggle").classList.toggle("danger", on);
  $("#pinToggle").classList.toggle("ghost", !on);
}
$("#pinToggle").addEventListener("click", ()=>{
  if(data.pin){
    confirmBox("PIN 해제", "앱을 열 때 더 이상 번호를 묻지 않습니다.", "해제", ()=>{
      data.pin = null; persist(); renderPinCard(); toast("해제했어요");
    });
  } else openLock("new");
});

/* ---------- 카테고리 관리 ---------- */
function renderCats(){
  const box = $("#catList");
  box.innerHTML = data.cats.map((c,i)=>`
    <div class="catrow">
      <button type="button" class="ce" data-edit="${i}" style="background:none;border:none;padding:0">${catMark(c.emo)}</button>
      <button type="button" class="cl" data-edit="${i}" style="background:none;border:none;padding:0;text-align:left">${esc(c.label)}</button>
      <span class="cn">${data.drinks.filter(d=>d.cat===c.id).length}개</span>
      <button class="minibtn" data-up="${i}"${i===0?" disabled":""}>↑</button>
      <button class="minibtn" data-down="${i}"${i===data.cats.length-1?" disabled":""}>↓</button>
      <button class="minibtn warn" data-del="${i}">✕</button>
    </div>`).join("");
  box.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>openCatSheet(+b.dataset.edit)));
  box.querySelectorAll("[data-up]").forEach(b=>b.addEventListener("click",()=>moveCat(+b.dataset.up,-1)));
  box.querySelectorAll("[data-down]").forEach(b=>b.addEventListener("click",()=>moveCat(+b.dataset.down,1)));
  box.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",()=>delCat(+b.dataset.del)));
}
function moveCat(i, dir){
  const j = i + dir;
  if(j < 0 || j >= data.cats.length) return;
  const t = data.cats[i]; data.cats[i] = data.cats[j]; data.cats[j] = t;
  persist(); renderCats();
}
/* 그림은 도트 아이콘에서 고르거나 이모지를 직접 넣는다.
   직접 만든 분류에 원하는 이모지를 넣던 자유를 없애지 않는다 */
const CAT_MARKS = ["@coffee", "@ade", "@tea", "@cup", "@ice", "@flame"];
function openCatSheet(idx){
  const c = (idx === null) ? {emo:"@cup", label:""} : data.cats[idx];
  let mark = c.emo;
  $("#sheetBody").innerHTML = `
    <h2 style="margin:0 0 4px;font-size:21px;font-weight:800;letter-spacing:-.4px">${idx===null?"카테고리 추가":"카테고리 수정"}</h2>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:18px">그림과 이름을 정해주세요</div>
    <div class="fld"><label>그림</label>
      <div class="pickers" id="c-marks"></div></div>
    <div class="two">
      <div class="fld" style="flex:0 0 108px"><label>직접 넣기</label>
        <input type="text" id="c-emo" maxlength="4" value="${c.emo.charAt(0) === "@" ? "" : esc(c.emo)}"
               placeholder="이모지" style="text-align:center;font-size:20px"></div>
      <div class="fld"><label>이름 *</label>
        <input type="text" id="c-label" value="${esc(c.label)}" placeholder="예: 시그니처" autocomplete="off"></div>
    </div>
    <button class="cta" id="catSave">저장</button>`;

  const drawMarks = ()=>{
    $("#c-marks").innerHTML = CAT_MARKS.map(m=>
      `<button type="button" class="pick${mark === m ? " on" : ""}" data-mark="${m}">${icon(m.slice(1))}</button>`).join("");
    $("#c-marks").querySelectorAll(".pick").forEach(b=>b.addEventListener("click", ()=>{
      mark = b.dataset.mark; $("#c-emo").value = ""; drawMarks();
    }));
  };
  drawMarks();
  /* 이모지를 직접 넣으면 고른 도트는 풀린다. 둘 다 고른 상태가 없어야 헷갈리지 않는다 */
  $("#c-emo").addEventListener("input", ()=>{
    if($("#c-emo").value.trim()){ mark = ""; drawMarks(); }
  });

  $("#mask").classList.add("on"); $("#sheet").classList.add("on");
  $("#catSave").addEventListener("click", ()=>{
    const label = $("#c-label").value.trim();
    const typed = $("#c-emo").value.trim();
    const emo = typed || mark || "@cup";
    if(!label){ toast("이름을 입력해 주세요"); return; }
    if(idx === null) data.cats.push({id:uid(), label:label, emo:emo});
    else { data.cats[idx].label = label; data.cats[idx].emo = emo; }
    persist(); closeSheet(); renderCats(); renderHome();
    toast(idx===null ? "카테고리를 추가했어요" : "수정했어요");
  });
}
function delCat(idx){
  if(data.cats.length <= 1){ toast("카테고리는 하나 이상 있어야 해요"); return; }
  const c = data.cats[idx];
  const used = data.drinks.filter(d=>d.cat===c.id);
  const msg = used.length
    ? `“${c.label}” 안의 레시피 ${used.length}개도 함께 삭제됩니다. 되돌릴 수 없어요.`
    : `“${c.label}”를 삭제할까요?`;
  confirmBox("카테고리 삭제", msg, used.length ? "함께 삭제" : "삭제", ()=>{
    used.forEach(d=>{ rm(data.mastered, d.id); rm(data.needReview, d.id); });
    data.drinks = data.drinks.filter(d=>d.cat !== c.id);
    data.cats.splice(idx,1);
    if(state.filter === c.id) state.filter = "all";
    persist(); renderCats(); renderHome(); renderList();
    toast(used.length ? `카테고리와 레시피 ${used.length}개를 삭제했어요` : "삭제했어요");
  });
}
$("#catAdd").addEventListener("click", ()=>openCatSheet(null));

document.querySelectorAll("#enSeg button").forEach(b=>{
  b.addEventListener("click", ()=>{
    data.enCase = b.dataset.en; persist();
    document.querySelectorAll("#enSeg button").forEach(x=>x.classList.toggle("on", x.dataset.en === data.enCase));
    renderList();
    toast("표기를 바꿨어요");
  });
});

/* ---------- 테마 ---------- */
const THEME_BAR = {cream:"#F7F3EE", dark:"#14110E", green:"#F1F6F1", hwnight:"#1C1424"};
/* 지금 화면에 입힐 테마: 자동이면 아이폰이 다크 모드인지 보고 다크 · 기본 중에 고른다 */
const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
function shownTheme(){
  if(data.theme === "auto") return darkQuery && darkQuery.matches ? "dark" : "cream";
  /* 치즈로 사는 테마는 산 사람만, 그리고 도트 화면(앱)에서만. 아니면 기본 */
  if(themeShopItem(data.theme) && !(isDot() && themeOwned(data.theme))) return "cream";
  return data.theme;
}
function applyTheme(){
  const t = shownTheme();
  document.body.setAttribute("data-theme", t);
  const m = document.querySelector('meta[name="theme-color"]');
  if(m) m.setAttribute("content", THEME_BAR[t] || "#F7F3EE");
  themeTabIcons();
  renderThemeShop();
  themeFxSync();                // 홈의 테마 움직임 (themefx.js)
  document.querySelectorAll("#themeBtns .theme-b").forEach(b=>{
    b.classList.toggle("on", b.dataset.theme === data.theme);
  });
}
document.querySelectorAll("#themeBtns .theme-b").forEach(b=>{
  b.addEventListener("click", ()=>{ data.theme = b.dataset.theme; persist(); applyTheme(); });
});
/* 핼러윈 밤은 탭 아이콘도 핼러윈 모양으로. 앱이 켜질 때 paintIcons 뒤에도 한 번 부른다(boot.js) */
function themeTabIcons(){
  const hw = shownTheme() === "hwnight";
  document.querySelectorAll("#tabs [data-ico]").forEach(el=>{
    const name = el.getAttribute("data-ico");
    el.innerHTML = icon(hw && ICONS[name + "_hw"] ? name + "_hw" : name);
  });
}
/* 치즈로 사는 테마 버튼(앱만). 산 것은 고르기, 안 산 것은 값과 기간 — 누르면 확인창에서 산다. 기간이 지난 안 산 테마는 숨긴다 */
function renderThemeShop(){
  const box = $("#themeShop"); if(!box) return;
  if(!isDot() || !isNativeApp()){ box.innerHTML = ""; return; }
  const list = THEME_SHOP.filter(t=>themeOwned(t.id) || closetOnSale(t));
  box.innerHTML = list.map(t=>{
    const own = themeOwned(t.id), until = t.season ? t.season.until.split("-") : null;
    return `<button type="button" class="theme-b shop${own && data.theme === t.id ? " on" : ""}" data-shop="${t.id}">
      <span class="sw">${t.sw.map(c=>`<i style="background:${c}"></i>`).join("")}</span>${esc(t.name)}
      ${own ? "" : `<small class="pr"><span class="ci">${cheeseSVG()}</span>${t.price}</small>${until ? `<small class="lim">~${Number(until[1])}/${Number(until[2])}</small>` : ""}`}</button>`;
  }).join("");
  box.hidden = !list.length;
}
$("#themeShop").addEventListener("click", e=>{
  const b = e.target.closest("[data-shop]"); if(!b) return;
  const t = themeShopItem(b.dataset.shop); if(!t) return;
  if(themeOwned(t.id)){ data.theme = t.id; persist(); applyTheme(); haptic("selection"); return; }
  if(!closetOnSale(t)){ renderThemeShop(); return; }
  const c = data.closet;
  if(c.cheese < t.price){ haptic("error"); toast("치즈가 " + (t.price - c.cheese) + "개 모자라요"); return; }
  confirmBox(t.name + " 테마", `치즈 ${t.price}개로 살까요? 치즈 ${c.cheese}개 → ${c.cheese - t.price}개`, "사기", ()=>{
    if(themeOwned(t.id) || c.cheese < t.price || !closetOnSale(t)) return;
    c.cheese -= t.price; c.themes.push(t.id); data.theme = t.id;
    persist(); renderSettings();          // renderSettings 가 applyTheme 을 부른다
    sfx("chu"); haptic("success"); toast(t.name + " 테마를 샀어요");
  });
});
/* 자동이면 아이폰 설정이 바뀔 때(밤에 저절로 어두워지는 것 포함) 바로 따라간다 */
if(darkQuery){
  const follow = ()=>{ if(data.theme === "auto") applyTheme(); };
  if(darkQuery.addEventListener) darkQuery.addEventListener("change", follow); else if(darkQuery.addListener) darkQuery.addListener(follow);
}

function applySound(){
  document.querySelectorAll("#soundBtns .theme-b").forEach(b=>{
    b.classList.toggle("on", b.dataset.sound === data.sound);
  });
}
document.querySelectorAll("#soundBtns .theme-b").forEach(b=>{
  b.addEventListener("click", ()=>{
    data.sound = b.dataset.sound; persist(); applySound();
    if(!bgmAllowed()) bgmStop();
    /* 고른 소리를 바로 들려준다. 끄기를 골랐을 때는 당연히 조용하다 */
    sfx("chu");
  });
});

/* 진동은 기본으로 켠다. 끈 사람만 data.haptic = false 로 남긴다(백업을 따라간다) */
function applyHaptic(){
  document.querySelectorAll("#hapticBtns .theme-b").forEach(b=>{
    b.classList.toggle("on", b.dataset.haptic === (data.haptic === false ? "off" : "on"));
  });
}
document.querySelectorAll("#hapticBtns .theme-b").forEach(b=>{
  b.addEventListener("click", ()=>{
    data.haptic = b.dataset.haptic !== "off"; persist(); applyHaptic();
    haptic("light");              // 켠 느낌을 바로 준다. 끄기를 골랐으면 조용하다
  });
});

function applyWx(){
  document.querySelectorAll("#wxBtns .theme-b").forEach(b=>{
    b.classList.toggle("on", b.dataset.wx === data.wx);
  });
}
document.querySelectorAll("#wxBtns .theme-b").forEach(b=>{
  b.addEventListener("click", ()=>{
    data.wx = b.dataset.wx; persist(); applyWx();
    drawMascot();        // 고른 옷을 바로 보여준다
  });
});

/* ---------- 설정 묶음 ----------
   칸이 많아 다섯 묶음으로 나눈다. 첫 화면엔 묶음 줄만 보이고, 누르면 그 묶음(data-group)의 칸만 보인다.
   묶음 줄 오른쪽에는 지금 상태 한 줄(치즈 · 테마 · 레시피 수 · 마지막 백업). 백업이 없거나 14일 넘게 지났으면 경고색 */
/* items: 묶음 줄에 적는 칸 이름과 그 칸. 이 기기에서 안 보이는 칸(웹에 없는 것 · 진동 없는 아이패드)은 줄에서도 뺀다 */
const SET_GROUPS = [
  {id:"mouse", name:"쥐돌이", ico:"mouse", items:[["옷장", "#closetCard"], ["내 이름", "#nickCard"], ["생일", "#bdayCard"], ["부르는 알림", "#nudgeCard"], ["날씨 옷", "#wxBtns"]]},
  {id:"screen", name:"화면과 소리", ico:"palette", items:[["테마", "#themeBtns"], ["소리", "#soundBtns"], ["진동", "#hapticCard"], ["영문 이름 표기", "#enSeg"]]},
  {id:"recipe", name:"레시피", ico:"note", items:[["카테고리", "#catList"], ["레시피 가져오기", "#rsFile"]]},
  {id:"data", name:"백업과 보안", ico:"box", items:[["백업", "#expFile"], ["불러오기", "#impFile"], ["PIN 잠금", "#pinToggle"], ["데이터 관리", "#wipeAll"]]},
  {id:"help", name:"도움말", ico:"bulb", items:[["사용법", "#openGuide"], ["건의하기", "#feedbackBtn"], ["처리방침", "#privacyLink"]]}];
function setItemShown(sel){
  const el = $(sel); if(!el) return false;
  const card = el.closest(".setcard") || el;
  if(card.style.display === "none") return false;                                    // 이 기기에 없는 칸(applyEnvText)
  return !(card.id === "hapticCard" && document.documentElement.classList.contains("nohaptic"));
}
/* 마지막 백업이 며칠 전인가. 없거나 날짜가 없으면 null, 시계가 앞서 있던 날짜면 0 */
function backupDaysAgo(){
  const b = data.backup;
  if(!b || typeof b.at !== "string" || !b.at) return null;
  return Math.max(0, dayGap(b.at, ymd(new Date())));
}
function setGroupNote(id){
  if(id === "mouse") return isDot() && isNativeApp() ? {t: "치즈 " + data.closet.cheese + "개"} : null;
  if(id === "screen"){
    const b = document.querySelector('#themeBtns [data-theme="' + data.theme + '"]'), shop = themeShopItem(data.theme);
    return {t: (shop && themeOwned(shop.id) ? shop.name : b ? b.textContent.trim() : "기본") + " 테마"};
  }
  if(id === "recipe") return {t: "레시피 " + liveDrinks().length + "개"};
  if(id === "data"){
    const days = backupDaysAgo();
    if(days === null) return {t: "백업 아직 없음", warn: true};
    return days >= 14 ? {t: "마지막 백업 " + days + "일 전", warn: true} : {t: days === 0 ? "오늘 백업했어요" : "마지막 백업 " + days + "일 전"};
  }
  return null;
}
function renderSetGroups(){
  const box = $("#setGroups"); if(!box) return;
  /* 회귀 검사는 칸 하나하나를 다루므로 묶지 않고 다 펼친다(test/regression.js 가 켠다. 앱에서는 켜지 않는다) */
  if(window.__amgijwiSetAll){ box.hidden = true; $("#setBack").hidden = true; document.querySelectorAll("#s-set .grpoff").forEach(el=>el.classList.remove("grpoff")); return; }
  const g = SET_GROUPS.filter(x=>x.id === state.setGroup)[0];
  box.hidden = !!g;
  $("#setBack").hidden = !g;
  document.querySelectorAll("#s-set [data-group]").forEach(el=>el.classList.toggle("grpoff", !g || el.dataset.group !== g.id));
  if(g){ $("#setBackT").textContent = g.name; return; }
  box.innerHTML = SET_GROUPS.map(x=>{
    const n = setGroupNote(x.id);
    const ico = x.ico === "mouse" ? mouseSVGWorn("day", false) : icon(x.ico);
    return `<button type="button" class="setgrp" data-g="${x.id}"><span class="gi">${ico}</span>
      <span class="gt"><b>${esc(x.name)}</b><span>${esc(x.items.filter(it=>setItemShown(it[1])).map(it=>it[0]).join(" · "))}</span></span>
      ${n ? `<span class="gn${n.warn ? " warn" : ""}">${n.warn ? icon("warn") : ""}${esc(n.t)}</span>` : ""}<span class="ga">›</span></button>`;
  }).join("");
}
$("#setGroups").addEventListener("click", e=>{
  const b = e.target.closest(".setgrp"); if(!b) return;
  haptic("selection"); openSetGroup(b.dataset.g);
});
function openSetGroup(id){
  state.setGroup = id || "";
  renderSetGroups();
  const sc = $("#s-set .scroll"); if(sc) sc.scrollTop = 0;
}
$("#setBack").addEventListener("click", ()=>{ haptic("light"); openSetGroup(""); });

function renderSettings(){
  renderSetGroups();            // 먼저 묶어 둔다(아래 칸 중 하나가 실패해도 칸이 한꺼번에 펼쳐지지 않게). 끝에서 상태 줄을 다시 그린다
  closetSettings();             // 맨 위 쥐돌이 옷장 줄 (closet.js)
  nickSettings();               // 내 이름 (nick.js)
  bdaySettings();               // 내 생일 (birthday.js)
  nudgeSettings();              // 쥐돌이가 부르는 알림 (waiting.js)
  applyTheme();
  applyWx();
  applySound(); applyHaptic();
  renderPinCard();
  renderCats();
  document.querySelectorAll("#enSeg button").forEach(b=>b.classList.toggle("on", b.dataset.en === data.enCase));
  $("#cntDrinks").textContent = liveDrinks().length;
  $("#cntShelf").textContent = data.shelf.length;
  $("#cntMastered").textContent = data.mastered.length;
  renderStorageCard();
  $("#expBox").style.display = "none";
  renderSetGroups();
}

/* 데이터가 얼마나 안전한 상태인지 한자리에서 보여준다.
   저장 가능 여부 · 어디서 실행 중인지 · 저장 보호 여부 · 마지막 백업.
   앱에서는 브라우저 이야기가 맞지 않으므로 같은 사실을 다른 말로 적는다. */
function renderStorageCard(){
  const box = $("#setStatus"); if(!box) return;
  const app = isNativeApp();

  if(!Store.available){
    box.innerHTML = `<div class="setcard statuscard warn">
      <h4>저장이 막혀 있어요</h4>
      <p>${app
        ? "앱이 저장 공간을 쓰지 못하고 있습니다. 지금 입력한 내용은 앱을 닫으면 사라져요. 아래에서 백업 파일을 만들어 두고, 앱을 다시 시작해 주세요."
        : "파일을 직접 열었거나 비공개(시크릿) 브라우징 상태면 저장소가 잠깁니다. 지금 입력한 내용은 앱을 닫으면 사라져요. 아래에서 백업 파일을 만들어 두고, 저장이 되는 방식으로 열어 주세요."}</p></div>`;
    return;
  }

  const os = deviceOS();
  const rows = [];
  /* PC 는 홈 화면 앱이라는 선택지가 없으니 이 줄을 빼고 저장 보호와 백업만 보여준다 */
  if(app)
    rows.push(["ok", "앱으로 실행 중", "레시피가 앱 안에 남습니다. 저장할 때마다 앱 저장 공간에 사본도 한 벌 둬서, 앱을 지우지 않는 한 사라지지 않아요."]);
  else if(isStandalone())
    rows.push(["ok", "홈 화면 앱으로 실행 중", "저장 데이터가 지워질 위험이 가장 낮은 상태예요."]);
  else if(os !== "desktop")
    rows.push(["warn", "브라우저 탭에서 실행 중", INSTALL[os].short]);

  /* 저장 공간이 모자랄 때 누가 먼저 지워지는가. 앱에는 해당하지 않는 개념이라 건너뛴다 */
  if(!app){
    if(persistState === "granted")
      rows.push(["ok", "브라우저가 저장 데이터를 보호 중", "저장 공간이 부족해도 이 앱 데이터를 먼저 지우지 않습니다."]);
    else if(persistState === "denied")
      rows.push(["warn", "브라우저 보호는 못 받는 중", "그래서 백업 파일이 더 중요합니다."]);
  }

  const b = data.backup;
  const days = b && b.at ? dayGap(b.at, ymd(new Date())) : null;
  rows.push(days === null
    ? ["warn", "아직 백업한 적이 없어요", `기기를 바꾸거나 ${app ? "앱을 지우면" : "브라우저 데이터를 지우면"} 되돌릴 방법이 없습니다.`]
    : (days >= 14
      ? ["warn", `마지막 백업 ${days}일 전`, "그 뒤로 바뀐 내용은 지금 백업이 없으면 사라집니다."]
      : ["ok", days === 0 ? "오늘 백업했어요" : `마지막 백업 ${days}일 전`, INSTALL[os].keep]));

  const worst = rows.some(r => r[0] === "warn") ? "warn" : "ok";
  box.innerHTML = `<div class="setcard statuscard ${worst}">
    <h4>데이터 상태</h4>
    ${rows.map(([k, t, d])=>`<p style="margin:0 0 8px"><b>${k === "ok" ? "✓" : "!"} ${esc(t)}</b><br>${esc(d)}</p>`).join("")}
    <p style="margin:0">${adsOn() ? "레시피는 이 기기 안에만 저장되고 어디로도 보내지 않습니다. 광고 버튼을 눌러 광고를 볼 때만 광고 회사와 통신합니다."
                                    : "레시피는 이 기기 안에만 저장되고, 서버로 나가는 통신은 없습니다."}</p>
  </div>`;
}

function backupJSON(){
  const copy = {};
  Object.keys(data).forEach(k=>{ if(k !== "pin") copy[k] = data[k]; });
  return JSON.stringify({app:"brewnote", v:1, exportedAt:new Date().toISOString(), data:copy}, null, 2);
}
function stamp(){
  const n = new Date(), p = x=>String(x).padStart(2,"0");
  return n.getFullYear()+p(n.getMonth()+1)+p(n.getDate())+"-"+p(n.getHours())+p(n.getMinutes());
}
/* 앱의 웹뷰는 <a download> 를 받지 못한다(아무것도 안 저장되는데 저장했다고 뜬다).
   앱에서는 내용을 넘겨 iOS 공유 시트로 내보내고, 결과는 shareDoneFromApp 으로 받는다 (ShareBridge.swift) */
function shareBridge(){
  const w = window.webkit;
  if(!isNativeApp() || !w || !w.messageHandlers || !w.messageHandlers.amgijwiShare) return null;
  return w.messageHandlers.amgijwiShare;
}
/* kind: "recipes" 면 레시피 보내기(recipeshare.js), 없으면 백업 */
function shareDoneFromApp(ok, kind){
  if(kind === "recipes"){ recipeShareDone(ok); return; }
  if(ok){ markBackedUp(); toast("백업 파일을 내보냈어요"); }
  else toast("백업을 내보내지 않았어요");      // 시트를 닫았으면 백업한 것으로 치지 않는다
}
function saveBackupFile(){
  const name = "암기쥐-백업-"+stamp()+".json";
  const br = shareBridge();
  if(br){ br.postMessage({name:name, text:backupJSON()}); return; }
  try{
    const blob = new Blob([backupJSON()], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1500);
    markBackedUp();
    toast("백업 파일을 저장했어요");
  }catch(e){ toast("저장이 안 돼요. 텍스트로 복사해 주세요"); }
}
$("#expFile").addEventListener("click", saveBackupFile);
$("#expText").addEventListener("click", ()=>{
  const box = $("#expBox");
  box.value = backupJSON(); box.style.display = "block";
  box.select();
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(box.value).then(()=>{ markBackedUp(); toast("복사했어요"); },
                                                 ()=>toast("길게 눌러 복사해 주세요"));
  } else toast("길게 눌러 복사해 주세요");
});
$("#impFile").addEventListener("click", ()=>$("#fileInput").click());
$("#fileInput").addEventListener("change", (e)=>{
  const f = e.target.files && e.target.files[0]; if(!f) return;
  const rd = new FileReader();
  rd.onload = ()=>{ applyBackup(String(rd.result)); e.target.value=""; };
  rd.onerror = ()=>toast("파일을 읽지 못했어요");
  rd.readAsText(f);
});
$("#impText").addEventListener("click", ()=>{
  const t = $("#impBox").value.trim();
  if(!t){ toast("붙여넣은 내용이 없어요"); return; }
  applyBackup(t);
});
function applyBackup(text){
  let parsed;
  try{ parsed = JSON.parse(text); }catch(e){ toast("백업 형식이 아니에요"); return; }
  const d = parsed && parsed.data ? parsed.data : parsed;
  if(!d || !Array.isArray(d.drinks)){ toast("레시피 데이터를 찾지 못했어요"); return; }
  confirmBox("백업 복원", `레시피 ${d.drinks.length}개를 불러오고 현재 데이터를 덮어쓸까요?`, "복원", ()=>{
    const keepMode = (d.mode === "blank" || d.mode === "flip") ? d.mode : data.mode;
    const keepTheme = THEMES.indexOf(d.theme) >= 0 ? d.theme : data.theme;
    const keepSound = ["off","sfx","all"].indexOf(d.sound) >= 0 ? d.sound : data.sound;
    const keepCats = (Array.isArray(d.cats) && d.cats.length)
      ? d.cats.map(c=>({id:String(c.id||uid()), label:String(c.label||"분류"), emo:String(c.emo||"@cup")}))
      : data.cats;
    const cleanSub = s => ({
      id:String(s.id||uid()), name:String(s.name||""),
      ing:Array.isArray(s.ing)?s.ing.map(p=>[String(p[0]||""),String(p[1]||"")]):[],
      steps:Array.isArray(s.steps)?s.steps.map(String):[], tip:String(s.tip||""),
      place:String(s.place||""), dur:String(s.dur||"")
    });
    const keepEn = ["as-is","upper","lower"].indexOf(d.enCase) >= 0 ? d.enCase : data.enCase;
    const keepShelf = Array.isArray(d.shelf) ? d.shelf.map(s=>({
      id:String(s.id||uid()), name:String(s.name||""), place:String(s.place||""),
      dur:String(s.dur||""), note:String(s.note||"")
    })) : [];
    const keepMemos = Array.isArray(d.memos) ? d.memos.map(m=>({
      id:String(m.id||uid()), text:String(m.text||""), at:String(m.at||""), pin:!!m.pin
    })).filter(m=>m.text) : [];
    data = {v:1, mode:keepMode, theme:keepTheme, sound:keepSound, enCase:keepEn, pin:data.pin, visit:(d.visit || data.visit),
      /* 안내를 이미 본 사람이다. 기기를 바꿨다고 다시 띄우면 성가시다 */
      hints:(Array.isArray(d.hints) ? d.hints : data.hints) || [],
      /* 일정은 백업을 따라온다. 모양은 core.js 가 불러올 때 다시 다듬는다 */
      events:Array.isArray(d.events) ? d.events : [],
      wx:d.wx || data.wx,                 /* 날씨 옷도 취향이라 백업을 따라간다 */
      haptic:typeof d.haptic === "boolean" ? d.haptic : data.haptic,
      /* 치즈 · 옷은 백업을 따라간다. 예전 백업(옷장 없음)이면 지금 것을 둔다 */
      closet:d.closet ? restoreCloset(d.closet) : data.closet,
      bday:restoreBday(d.bday),           /* 생일도 백업을 따라간다 */
      nick:restoreNick(d.nick),           /* 이름도 백업을 따라간다 */
      review:data.review,                 /* 별점을 청한 기록은 이 기기 것을 둔다 */
      studied:data.studied,               /* 오늘 한 바퀴 돌았는지도 이 기기 것을 둔다(위젯) */
      nudge:(d.nudge && typeof d.nudge.on === "boolean") ? {on:d.nudge.on} : data.nudge,   /* 부르는 알림을 켰는지도 백업을 따라간다 */
      /* 택 색은 매장 규칙이라 백업을 따라간다. 예전 백업(규칙 없음)이면 지금 것을 둔다 */
      tagRule:d.tagRule ? cleanTagRule(d.tagRule, "num") : data.tagRule,
      listSort:d.listSort || data.listSort,
      cats:keepCats, shelf:keepShelf, memos:keepMemos,
      /* 새 백업은 공용 부재료 목록을 갖고 있고, 예전 백업은 레시피 안에 부재료가 박혀 있다.
         둘 다 받아서 아래 liftSubs로 하나의 모양으로 맞춘다 */
      subs:Array.isArray(d.subs)?d.subs.map(cleanSub):[],
      drinks:d.drinks.map(x=>({
        id:x.id||uid(), cat:x.cat, name:String(x.name||""), en:String(x.en||""),
        temp:String(x.temp||""), cups:Array.isArray(x.cups)?x.cups.map(String):(x.cup?[String(x.cup)]:[]),
        ing:Array.isArray(x.ing)?x.ing.map(p=>[String(p[0]||""),String(p[1]||"")]):[],
      /* ICE/HOT 재료 두 벌. 옛 백업에는 없는 값이라 없으면 빈 배열로 둔다 */
      ingHot:Array.isArray(x.ingHot)?x.ingHot.map(p=>[String(p[0]||""),String(p[1]||"")]):[],
        steps:Array.isArray(x.steps)?x.steps.map(String):[], tip:String(x.tip||""),
        arch:!!x.arch,
        at:String(x.at||""),                 /* 등록한 날. 옛 백업에는 없어서 빈 값이 된다 */
        subRefs:Array.isArray(x.subRefs)?x.subRefs.map(String):[],
        subs:Array.isArray(x.subs)?x.subs.map(cleanSub):[]
      })), mastered:Array.isArray(d.mastered)?d.mastered:[], needReview:Array.isArray(d.needReview)?d.needReview:[]};
    liftSubs(data);
    data.drinks.forEach(x=>{ x.subRefs = (x.subRefs||[]).filter(id=>data.subs.some(s=>s.id===id)); });
    persist(); syncAlarms(); applyTheme(); applySound(); applyHaptic(); applyWx(); $("#impBox").value=""; toast("복원했어요"); go("home");
  });
}
const SHELF_SAMPLES = [
  {name:"개봉한 우유",    place:"냉장", dur:"5일",  note:"개봉일 라벨 부착"},
  {name:"휘핑크림",       place:"냉장", dur:"8시간", note:""},
  {name:"콜드브루 원액",  place:"냉장", dur:"7일",  note:""},
  {name:"에스프레소 샷",  place:"실온", dur:"10초", note:"뽑은 즉시 사용"},
  {name:"과일청",         place:"냉장", dur:"14일", note:""}
];

/* 샘플 다시 넣기 — 이미 같은 이름이 있으면 건너뜀 */
function loadSamples(){
  const have = {};
  data.drinks.forEach(d=>{ have[d.name] = true; });
  const fresh = seed().filter(s=>!have[s.name]);
  const haveShelf = {};
  data.shelf.forEach(s=>{ haveShelf[s.name] = true; });
  const freshShelf = SHELF_SAMPLES.filter(s=>!haveShelf[s.name])
    .map(s=>({id:uid(), name:s.name, place:s.place, dur:s.dur, note:s.note}));
  if(!fresh.length && !freshShelf.length){ toast("샘플이 이미 다 들어 있어요"); return; }
  data.drinks = data.drinks.concat(fresh);
  data.shelf = data.shelf.concat(freshShelf);
  persist();
  const parts = [];
  if(fresh.length) parts.push("레시피 " + fresh.length + "개");
  if(freshShelf.length) parts.push("개봉 항목 " + freshShelf.length + "개");
  toast(parts.join(" · ") + " 불러왔어요");
  renderList(); renderHome(); renderSettings();
}
$("#loadSamples").addEventListener("click", loadSamples);

$("#resetProg").addEventListener("click", ()=>{
  confirmBox("학습 기록 초기화", "외운 표시와 복습 목록을 모두 지웁니다. 레시피는 그대로 남아요.", "초기화", ()=>{
    data.mastered = []; data.needReview = []; persist(); renderSettings(); toast("초기화했어요");
  });
});
$("#wipeAll").addEventListener("click", ()=>{
  confirmBox("전체 데이터 삭제", "레시피와 학습 기록, 일정까지 모두 지웁니다. 백업 파일이 없으면 복구할 수 없어요.", "전부 삭제", ()=>{
    /* 지우는 건 레시피와 학습 기록이다. 테마·소리 같은 취향과 안내를 본 기록은 그대로 둔다.
       sound 가 빠져 있어 전체 삭제 때마다 소리가 조용히 꺼지던 것도 여기서 바로잡는다 */
    data = {v:1, mode:data.mode, theme:data.theme, sound:data.sound, wx:data.wx, listSort:data.listSort, enCase:data.enCase, pin:data.pin,
      haptic:data.haptic, tagRule:data.tagRule,      /* 빠지면 개봉관리가 규칙 없이 그려지다 멈춘다 */
      closet:data.closet, bday:data.bday,            /* 치즈 · 옷 · 생일은 레시피가 아니라 남긴다 */
      review:data.review,                            /* 별점을 청한 날을 잊으면 넉 달 간격이 깨진다 */
      nudge:data.nudge,                              /* 알림을 켜고 끈 것은 취향이라 남긴다 */
      nick:data.nick,                                /* 이름도 남긴다 */
      studied:data.studied,                          /* 오늘 한 바퀴 돌았는지(위젯) */
      visit:data.visit, hints:data.hints || [], cats:data.cats,
      shelf:[], memos:[], subs:[], drinks:[], mastered:[], needReview:[], events:[]};
    Store.clear(); persist(); syncAlarms(); renderSettings(); toast("모두 삭제했어요"); go("home");   // 지운 일정의 알림도 걷는다
  });
});


/* ---------- 사용법 ----------
   첫 실행에 튜토리얼을 세우지 않는다. 그 순간엔 앱이 뭔지도 몰라 볼지 말지 고를 수 없고,
   대부분 "나중에" 를 누른 뒤 다시 찾지 않는다. 대신 언제든 찾아올 수 있게 설정에 둔다.
   막히는 자리의 한 줄 안내는 showHint 가 따로 맡는다. */
function openGuideSheet(){
  const part = (emo, title, lines) => `
    <div style="display:flex;gap:12px;margin-bottom:20px">
      <span style="font-size:20px;line-height:1.2">${emo}</span>
      <div>
        <b style="display:block;font-size:14.5px;margin-bottom:5px">${title}</b>
        <div style="font-size:13px;line-height:1.65;color:var(--ink-2)">${lines.join("<br>")}</div>
      </div>
    </div>`;

  $("#sheetBody").innerHTML = `
    <h2 style="margin:0 0 4px;font-size:21px;font-weight:800;letter-spacing:-.4px">사용법</h2>
    <p style="margin:0 0 20px;font-size:12.5px;color:var(--muted)">처음이라면 이만큼만 알면 됩니다</p>

    ${part(icon("flip"), "카드로 외우기", [
      "홈에서 <b>학습 시작하기</b>를 누르면 방식을 고를 수 있어요.",
      "<b>카드 뒤집기</b>는 이름을 보고 재료를 통째로 떠올려요.",
      "<b>빈칸 채우기</b>는 용량만 가려서 하나씩 확인해요.",
      "다 보고 나면 <b>외웠어요</b> 또는 <b>다시 볼래요</b>를 누르세요."
    ])}

    ${part(icon("target"), "오늘 볼 것만 고르기", [
      "방식 고르는 화면에서 <b>고르기</b>를 누르면 됩니다.",
      "카테고리를 골라도 전부 다 돌 필요는 없어요."
    ])}

    ${part(icon("back"), "틀린 것 다시 보기", [
      "<b>다시 볼래요</b>를 누른 레시피는 복습 목록에 담겨요.",
      "홈의 <b>복습이 필요해요</b>에서 그것만 모아 볼 수 있어요."
    ])}

    ${part(icon("plus"), "우리 매장 레시피 넣기", [
      "<b>레시피</b> 탭 오른쪽 아래 <b>+</b> 버튼이에요.",
      "종이에 적힌 레시피는 <b>사진에서 글자 가져오기</b>로 옮길 수 있어요.",
      "기기 안에서만 읽어요. 사진이 어디로도 올라가지 않아요."
    ])}

    ${part(icon("ice"), "ICE 와 HOT 이 다를 때", [
      "레시피를 만들 때 온도를 <b>ICE/HOT</b> 으로 두면 재료를 두 벌 적을 수 있어요.",
      "학습 카드에는 두 벌이 나란히 나옵니다."
    ])}

    ${part(icon("save"), "백업 — 이것만은 꼭", [
      "레시피는 <b>이 기기 안에만</b> 있어요. 서버에 사본이 없습니다.",
      "설정 탭의 <b>백업 내보내기</b>로 파일을 하나 만들어 두세요.",
      "기기를 바꾸거나 앱을 다시 깔면 그 파일로 되살립니다."
    ])}

    <button class="cta ghost" id="guideClose" style="width:100%;margin-top:4px">닫기</button>`;

  $("#mask").classList.add("on");
  $("#sheet").classList.add("on");
  $("#guideClose").addEventListener("click", closeSheet);
}
/* 앱은 움직이는 도트 가이드(guide.js), 웹은 이 글 시트 */
$("#openGuide").addEventListener("click", ()=>openGuide());

/* 쥐돌이에게 건의하기 — 받는 사람 · 제목 · 앱 정보를 채운 메일 주소. 메일은 사용자가 직접 보낸다(앱은 보내지 않는다) */
const FEEDBACK_TO = "skmnzn110719@gmail.com";
function feedbackHref(){
  const i = window.__amgijwiInfo || {};
  const tail = [i.app ? "암기쥐 " + i.app : "", i.device || "", i.os || ""].filter(Boolean).join(" · ");
  const body = "쥐돌이에게 하고 싶은 말을 적어 주세요.\n\n\n\n" + (tail ? "---\n" + tail : "");
  return "mailto:" + FEEDBACK_TO + "?subject=" + encodeURIComponent("[암기쥐] 건의") + "&body=" + encodeURIComponent(body);
}
/* 누르는 순간 주소를 만든다. 앱 정보가 늦게 들어와도 빠지지 않는다 */
$("#feedbackBtn").addEventListener("click", ()=>{ $("#feedbackBtn").setAttribute("href", feedbackHref()); });
/* 메일 앱을 열 수 없을 때(메일 앱 · 계정 없음) 앱이 부른다. 주소를 보여 주고 복사해 둔다 */
function mailFailedFromApp(){
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(FEEDBACK_TO).catch(()=>{});
  toast("메일 앱을 열 수 없어요. " + FEEDBACK_TO + " 로 보내 주세요(주소를 복사했어요)");
}
