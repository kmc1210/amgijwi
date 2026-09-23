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
  $("#lockMascot").innerHTML = mouseSVG(typeof currentMood === "function" ? currentMood() : "day");
  drawDots(); drawKeys();
  $("#lock").classList.add("on");
}
function closeLock(){ $("#lock").classList.remove("on"); lock.buf = ""; }
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
      <button type="button" class="ce" data-edit="${i}" style="background:none;border:none;padding:0">${esc(c.emo)}</button>
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
function openCatSheet(idx){
  const c = (idx === null) ? {emo:"🥤", label:""} : data.cats[idx];
  $("#sheetBody").innerHTML = `
    <h2 style="margin:0 0 4px;font-size:21px;font-weight:800;letter-spacing:-.4px">${idx===null?"카테고리 추가":"카테고리 수정"}</h2>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:18px">이모지와 이름을 정해주세요</div>
    <div class="two">
      <div class="fld" style="flex:0 0 88px"><label>이모지</label>
        <input type="text" id="c-emo" maxlength="4" value="${esc(c.emo)}" style="text-align:center;font-size:20px"></div>
      <div class="fld"><label>이름 *</label>
        <input type="text" id="c-label" value="${esc(c.label)}" placeholder="예: 시그니처" autocomplete="off"></div>
    </div>
    <button class="cta" id="catSave">저장</button>`;
  $("#mask").classList.add("on"); $("#sheet").classList.add("on");
  $("#catSave").addEventListener("click", ()=>{
    const label = $("#c-label").value.trim();
    const emo = $("#c-emo").value.trim() || "🥤";
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
const THEME_BAR = {cream:"#F7F3EE", dark:"#14110E", green:"#F1F6F1"};
function applyTheme(){
  document.body.setAttribute("data-theme", data.theme);
  const m = document.querySelector('meta[name="theme-color"]');
  if(m) m.setAttribute("content", THEME_BAR[data.theme] || "#F7F3EE");
  document.querySelectorAll("#themeBtns .theme-b").forEach(b=>{
    b.classList.toggle("on", b.dataset.theme === data.theme);
  });
}
document.querySelectorAll("#themeBtns .theme-b").forEach(b=>{
  b.addEventListener("click", ()=>{ data.theme = b.dataset.theme; persist(); applyTheme(); });
});

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

function renderSettings(){
  applyTheme();
  applySound();
  renderPinCard();
  renderCats();
  document.querySelectorAll("#enSeg button").forEach(b=>b.classList.toggle("on", b.dataset.en === data.enCase));
  $("#cntDrinks").textContent = liveDrinks().length;
  $("#cntShelf").textContent = data.shelf.length;
  $("#cntMastered").textContent = data.mastered.length;
  renderStorageCard();
  $("#expBox").style.display = "none";
}

/* 데이터가 얼마나 안전한 상태인지 한자리에서 보여준다.
   저장 가능 여부 · 홈 화면 실행 여부 · 브라우저 보호 여부 · 마지막 백업. */
function renderStorageCard(){
  const box = $("#setStatus"); if(!box) return;

  if(!Store.available){
    box.innerHTML = `<div class="setcard statuscard warn">
      <h4>저장이 막혀 있어요</h4>
      <p>파일을 직접 열었거나 비공개(시크릿) 브라우징 상태면 저장소가 잠깁니다. 지금 입력한 내용은 앱을 닫으면 사라져요. 아래에서 백업 파일을 만들어 두고, 저장이 되는 방식으로 열어 주세요.</p></div>`;
    return;
  }

  const os = deviceOS();
  const rows = [];
  /* PC 는 홈 화면 앱이라는 선택지가 없으니 이 줄을 빼고 브라우저 보호와 백업만 보여준다 */
  if(isStandalone())
    rows.push(["ok", "홈 화면 앱으로 실행 중", "저장 데이터가 지워질 위험이 가장 낮은 상태예요."]);
  else if(os !== "desktop")
    rows.push(["warn", "브라우저 탭에서 실행 중", INSTALL[os].short]);

  if(persistState === "granted")
    rows.push(["ok", "브라우저가 저장 데이터를 보호 중", "저장 공간이 부족해도 이 앱 데이터를 먼저 지우지 않습니다."]);
  else if(persistState === "denied")
    rows.push(["warn", "브라우저 보호는 못 받는 중", "그래서 백업 파일이 더 중요합니다."]);

  const b = data.backup;
  const days = b && b.at ? dayGap(b.at, ymd(new Date())) : null;
  rows.push(days === null
    ? ["warn", "아직 백업한 적이 없어요", "기기를 바꾸거나 브라우저 데이터를 지우면 되돌릴 방법이 없습니다."]
    : (days >= 14
      ? ["warn", `마지막 백업 ${days}일 전`, "그 뒤로 바뀐 내용은 지금 백업이 없으면 사라집니다."]
      : ["ok", days === 0 ? "오늘 백업했어요" : `마지막 백업 ${days}일 전`, INSTALL[os].keep]));

  const worst = rows.some(r => r[0] === "warn") ? "warn" : "ok";
  box.innerHTML = `<div class="setcard statuscard ${worst}">
    <h4>데이터 상태</h4>
    ${rows.map(([k, t, d])=>`<p style="margin:0 0 8px"><b>${k === "ok" ? "✓" : "!"} ${esc(t)}</b><br>${esc(d)}</p>`).join("")}
    <p style="margin:0">레시피는 이 기기 안에만 저장되고, 서버로 나가는 통신은 없습니다.</p>
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
function saveBackupFile(){
  try{
    const blob = new Blob([backupJSON()], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "암기쥐-백업-"+stamp()+".json";
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
    const keepTheme = ["cream","dark","green"].indexOf(d.theme) >= 0 ? d.theme : data.theme;
    const keepSound = ["off","sfx","all"].indexOf(d.sound) >= 0 ? d.sound : data.sound;
    const keepCats = (Array.isArray(d.cats) && d.cats.length)
      ? d.cats.map(c=>({id:String(c.id||uid()), label:String(c.label||"분류"), emo:String(c.emo||"🥤")}))
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
    data = {v:1, mode:keepMode, theme:keepTheme, sound:keepSound, enCase:keepEn, pin:data.pin, visit:(d.visit || data.visit), cats:keepCats, shelf:keepShelf, memos:keepMemos,
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
        subRefs:Array.isArray(x.subRefs)?x.subRefs.map(String):[],
        subs:Array.isArray(x.subs)?x.subs.map(cleanSub):[]
      })), mastered:Array.isArray(d.mastered)?d.mastered:[], needReview:Array.isArray(d.needReview)?d.needReview:[]};
    liftSubs(data);
    data.drinks.forEach(x=>{ x.subRefs = (x.subRefs||[]).filter(id=>data.subs.some(s=>s.id===id)); });
    persist(); applyTheme(); applySound(); $("#impBox").value=""; toast("복원했어요"); go("home");
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
  confirmBox("전체 데이터 삭제", "레시피와 학습 기록을 모두 지웁니다. 백업 파일이 없으면 복구할 수 없어요.", "전부 삭제", ()=>{
    data = {v:1, mode:data.mode, theme:data.theme, enCase:data.enCase, pin:data.pin, visit:data.visit, cats:data.cats, shelf:[], memos:[], subs:[], drinks:[], mastered:[], needReview:[]};
    Store.clear(); persist(); renderSettings(); toast("모두 삭제했어요"); go("home");
  });
});

