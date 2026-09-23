/* 암기쥐 — 사진 글자 분석 · 가져오기 화면 · 레시피 편집기 · 부재료 편집기 */

/* =========================================================
   사진 텍스트 → 레시피 구조 변환 (전부 기기 안에서 처리)
   ========================================================= */
const UNIT = "(?:ml|mL|ML|cc|CC|리터|L|g|G|kg|oz|OZ|온스|샷|shot|펌프|pump|스푼|티스푼|테이블스푼|tsp|tbsp|스쿱|scoop|큐브|알|개|장|조각|줄기|컵|봉|팩|방울|%|℃|도|초|분)";
const NUM = "\\d+(?:[.,]\\d+)?";
const QTY_RE = new RegExp("(" + NUM + "\\s*(?:[~\\-–]\\s*" + NUM + ")?\\s*" + UNIT + "(?:\\s*\\([^)]{0,20}\\))?)", "i");
const QTY_TAIL_RE = new RegExp("(" + NUM + "\\s*(?:[~\\-–]\\s*" + NUM + ")?\\s*" + UNIT + "(?:\\s*\\([^)]{0,20}\\))?)\\s*$", "i");
const LOOSE_QTY = /(적당량|약간|기호껏|기호에\s*맞게|취향껏|취향에\s*맞게|한\s*스푼)/i;
const CIRCLED = "[\\u2460-\\u2473\\u2776-\\u277F\\u278A-\\u2793]";
const STEP_NO = new RegExp("^\\s*(?:\\d{1,2}\\s*[.)\\]]|" + CIRCLED + "|step\\s*\\d|\\d{1,2}\\s+(?=[^\\s].{7,}$))", "i");

const HEAD = [
  {re:/^(재\s*료|부\s*재\s*료|재료\s*구성|ingredients?)\s*[:：]?\s*$/i, mode:"ing"},
  {re:/^(만드는\s*법|제조\s*순서|제조\s*방법|만드는\s*방법|순\s*서|과\s*정|조리법|레시피\s*순서|steps?|method)\s*[:：]?\s*$/i, mode:"step"},
  {re:/^(팁|포인트|주의|주의사항|메모|note|tip)s?\s*[:：]?\s*$/i, mode:"tip"}
];
const CAT_HINT = [
  {cat:"coffee", re:/(에스프레소|espresso|아메리카노|americano|카페\s?라\s?떼|카푸치노|cappuccino|모카|mocha|콜드\s?브루|cold\s?brew|드립|핸드드립|커피|coffee|아인슈페너|einspanner|플랫\s?화이트|마키아또|비엔나|바닐라\s?라\s?떼|연유\s?라\s?떼|샷)/i},
  {cat:"tea",    re:/(아이스티|밀크티|말차|녹차|홍차|보리차|캐모마일|얼그레이|페퍼민트|루이보스|우롱|자스민|tea|스무디|smoothie|프라페|초코|쇼콜라|코코아|딸기|바나나|요거트|미숫가루|차\s?라\s?떼)/i},
  {cat:"ade",    re:/(에이드|ade|스파클링|탄산|소다|레몬|자몽|청귤|한라봉|자두|유자|매실|복분자|주스|juice|모히또|모히토|청\b)/i},
  {cat:"coffee", re:/(라\s?떼|latte)/i}
];
const ICE_RE = /(아이스|ice|iced|콜드|cold|찬)/i;
const HOT_RE = /(핫|따뜻|온음료|hot|웜)/i;
const CUP_RE = /((?:\d{1,2}\s?(?:oz|온스))|(?:\d{2,4}\s?(?:ml|cc))\s*(?:잔|컵)|(?:레귤러|라지|스몰)\s*(?:사이즈)?|데미타세)/i;
const TEMP_TOKEN = /(^|\s)(HOT|ICE[D]?|COLD|핫|아이스)(\s|$)/i;
const STEP_END = /(다|요|것|기|해|줘|세요|하기|주기|넣기|붓기|섞기)\s*[.!]?$/;
const STEP_VERB = /(붓|넣|섞|저어|젓|추출|스팀|올리|채우|담|풀|녹이|흔들|셰이크|가니시|마무리|올린|뿌리|뿌려|짜|거르|우려|우린|블렌|갈아|얹|따라|따른|데우|데운|휘핑|체에|내려|완성|쌓)/;
const NOISE = /^(레시피|recipe|menu|메뉴|사진|photo|no\.?\s*\d+|page\s*\d+|\d+\s*\/\s*\d+)$/i;

function pClean(l){
  return l.replace(/^[\s·•▪◦○●\-–—*]+/,"").replace(/\s+$/,"").replace(/\s{2,}/g," ").trim();
}
function splitQty(line){
  const labeled = line.match(/^(.+?)\s*[:：]\s*(.+)$/);
  if(labeled && QTY_RE.test(labeled[2])) return [labeled[1].trim(), labeled[2].trim()];
  const dotted = line.match(/^(.+?)[.\s]{3,}(.+)$/);
  if(dotted && QTY_RE.test(dotted[2])) return [dotted[1].trim(), dotted[2].trim()];
  const tail = line.match(QTY_TAIL_RE);
  if(tail){
    const nm = line.slice(0, tail.index).replace(/[\s\-–—:：]+$/,"").trim();
    if(nm) return [nm, tail[1].trim()];
  }
  const head = line.match(QTY_RE);
  if(head && head.index === 0){
    const rest = line.slice(head[0].length).replace(/^[\s\-–—:：]+/,"").trim();
    if(rest) return [rest, head[1].trim()];
  }
  if(line.length <= 30){
    const loose = line.match(LOOSE_QTY);
    if(loose){
      const nm = line.replace(loose[0],"")
        .replace(/\(\s*\)/g," ").replace(/[\s\-–—:：]+$/,"").replace(/^[\s\-–—:：]+/,"")
        .replace(/\s{2,}/g," ").trim();
      if(nm) return [nm, loose[0].trim()];
    }
  }
  return null;
}
/* "말차가루 7g, 우유 250ml, (기호에 맞게) 연유" 처럼 한 줄에 콤마로 이어진 재료 */
function splitCommaIng(line){
  const parts = line.split(/\s*[,、]\s*/).map(s=>s.trim()).filter(Boolean);
  if(parts.length < 2) return null;
  if(parts.some(p=>p.length > 30)) return null;
  const withQty = parts.filter(p=>QTY_RE.test(p) || LOOSE_QTY.test(p)).length;
  if(withQty < Math.ceil(parts.length/2)) return null;
  return parts.map(p=>splitQty(p) || [p,""]);
}
function looksLikeStep(line){
  if(STEP_NO.test(line)) return true;
  if(/^(step|스텝)\s*\d/i.test(line)) return true;
  if(line.length >= 12 && STEP_VERB.test(line) && STEP_END.test(line)) return true;
  if(line.length >= 20 && STEP_VERB.test(line)) return true;
  return false;
}
function stripStepNum(l){
  return l.replace(new RegExp("^\\s*(?:\\d{1,2}\\s*[.)\\]]|" + CIRCLED + "|step\\s*\\d+\\s*[:.)]?)\\s*","i"),"")
          .replace(/^\s*\d{1,2}\s+(?=[^\s].{7,}$)/,"")
          .trim();
}
function titleLine(line){
  if(looksLikeStep(line)) return null;
  let rest = line, cup = "", temp = "";
  const c = rest.match(CUP_RE);
  if(c){ cup = c[1].replace(/\s+/g,""); rest = rest.replace(c[1]," "); }
  let t;
  while((t = rest.match(TEMP_TOKEN))){
    if(!temp) temp = /hot|핫/i.test(t[2]) ? "HOT" : "ICE";
    rest = rest.replace(t[2]," ");
  }
  rest = rest.replace(/[\s\-–—:：]+$/,"").replace(/^[\s\-–—:：]+/,"").replace(/\s{2,}/g," ").trim();
  if(!rest || rest.length > 26) return null;
  if(QTY_RE.test(rest)) return null;
  if(!/[가-힣A-Za-z]/.test(rest)) return null;
  return {name:rest, cup:cup, temp:temp};
}
function isCupOnly(line){
  const m = line.match(CUP_RE);
  return !!m && m[1].replace(/\s+/g,"").length >= line.replace(/\s+/g,"").length - 1;
}
function guessCat(text){
  for(let i=0;i<CAT_HINT.length;i++){ if(CAT_HINT[i].re.test(text)) return CAT_HINT[i].cat; }
  return "coffee";
}
function preSplit(raw){
  const text = String(raw||"");
  const rows = text.split(/\r?\n/).filter(l=>l.trim());
  const qtyCount = (text.match(new RegExp(NUM + "\\s*" + UNIT, "gi")) || []).length;
  if(rows.length >= 3 || qtyCount < 2) return text;
  return text.replace(new RegExp("(" + NUM + "\\s*(?:[~\\-–]\\s*" + NUM + ")?\\s*" + UNIT + ")","gi"), "$1\n");
}
function parseRecipeText(raw){
  const warn = [];
  const src = preSplit(raw);
  if(src !== String(raw||"")) warn.push("줄이 뭉쳐 있어 나눠봤어요. 재료가 맞는지 확인해 주세요.");
  let lines = src.split(/\r?\n/).map(pClean).filter(l=>l && !NOISE.test(l));
  if(!lines.length) return null;

  let mode = "auto", name = "", en = "", cup = "", temp = "", nameTaken = false;
  const ing = [], steps = [], tips = [];

  /* 해시태그 제목(#말차라떼)이 있으면 그게 메뉴명 — 그 앞의 로고/문구 줄은 버린다 */
  const hi = lines.findIndex(l=>/^#\s*\S/.test(l));
  if(hi >= 0){
    name = lines[hi].replace(/^#\s*/,"").trim();
    nameTaken = true;
    lines = lines.slice(hi + 1);
  }

  for(let i=0;i<lines.length;i++){
    let line = lines[i];
    const head = HEAD.find(h=>h.re.test(line));
    if(head){ mode = head.mode; continue; }

    const inlineHead = line.match(/^(재\s*료|만드는\s*법|제조\s*순서|순\s*서|팁|포인트|주의)\s*[:：]\s*(.+)$/);
    if(inlineHead){
      mode = /재\s*료/.test(inlineHead[1]) ? "ing" : (/팁|포인트|주의/.test(inlineHead[1]) ? "tip" : "step");
      line = inlineHead[2].trim();
    }
    const labelName = line.match(/^(메뉴\s*명?|음료\s*명?|이름|name)\s*[:：]\s*(.+)$/i);
    if(labelName && !nameTaken){ name = labelName[2].trim(); nameTaken = true; continue; }
    const labelCup = line.match(/^(컵|사이즈|잔|용량|size|cup)\s*[:：]\s*(.+)$/i);
    if(labelCup){ cup = labelCup[2].trim(); continue; }
    if(isCupOnly(line)){ if(!cup) cup = line.replace(/\s+/g,""); continue; }

    if(!nameTaken && mode === "auto"){
      const t = titleLine(line);
      if(t){
        name = t.name; nameTaken = true;
        if(t.cup && !cup) cup = t.cup;
        if(t.temp && !temp) temp = t.temp;
        const m = name.match(/^(.*?)[\s(\[]+([A-Za-z][A-Za-z'&.\s-]{2,})[)\]]?$/);
        if(m && /[가-힣]/.test(m[1])){ name = m[1].trim(); en = m[2].trim(); }
        continue;
      }
    }
    if(mode === "tip"){ tips.push(stripStepNum(line)); continue; }

    const numbered = STEP_NO.test(line);
    if(!numbered && mode !== "step"){
      const multi = splitCommaIng(line);
      if(multi){ multi.forEach(pp=>ing.push(pp)); mode = "ing"; continue; }
    }
    const q = numbered ? null : splitQty(line);
    if(q && mode !== "step"){ ing.push(q); continue; }
    if(mode === "step" || numbered || looksLikeStep(line)){
      const s = stripStepNum(line); if(s) steps.push(s); continue;
    }
    if(q){ ing.push(q); continue; }
    if(mode === "ing" && line.length < 30){ ing.push([line,""]); continue; }
    if(line.length >= 10){ steps.push(line); continue; }
    if(line.length >= 4) tips.push(line);
  }

  const all = lines.join(" ");
  if(!temp){
    if(ICE_RE.test(all) && HOT_RE.test(all)) temp = "ICE/HOT";
    else if(HOT_RE.test(all)) temp = "HOT";
    else temp = "ICE";
  }
  if(!cup){ const c = all.match(CUP_RE); if(c) cup = c[1].replace(/\s+/g,""); }
  if(!name) warn.push("메뉴 이름을 찾지 못했어요. 직접 입력해 주세요.");
  if(!ing.length) warn.push("재료를 찾지 못했어요.");
  if(!steps.length) warn.push("제조 순서를 찾지 못했어요.");

  return {name:name, en:en, cat:guessCat(all), temp:temp, cup:cup, ing:ing, steps:steps, tip:tips.join("\n"), warn:warn};
}

/* ---------- 가져오기 화면 ---------- */
function openImport(){
  $("#ocrBox").value = ""; $("#prevWrap").innerHTML = ""; go("import"); $("#s-import .scroll").scrollTop = 0;
}
$("#impClose").addEventListener("click", ()=>go("list"));
$("#pasteBtn").addEventListener("click", async ()=>{
  try{
    if(navigator.clipboard && navigator.clipboard.readText){
      const t = await navigator.clipboard.readText();
      if(t && t.trim()){ $("#ocrBox").value = t; toast("붙여넣었어요"); return; }
      toast("클립보드가 비어 있어요");
    } else toast("칸을 길게 눌러 붙여넣기 해주세요");
  }catch(e){ toast("칸을 길게 눌러 붙여넣기 해주세요"); }
});
$("#parseBtn").addEventListener("click", ()=>{
  const text = $("#ocrBox").value;
  if(!text.trim()){ toast("먼저 텍스트를 붙여넣어 주세요"); return; }
  const r = parseRecipeText(text);
  if(!r){ toast("읽을 내용이 없어요"); return; }
  const parsedCat = catLabel(r.cat);
  $("#prevWrap").innerHTML = `
    ${r.warn.length?`<div class="warnbox">${r.warn.map(esc).join("<br>")}</div>`:""}
    <div class="prevcard">
      <h4>${r.name?esc(r.name):"(이름 없음)"}</h4>
      <div class="sub">${[r.temp,r.cup,parsedCat].filter(Boolean).map(esc).join(" · ")}</div>
      ${r.ing.length?`<div class="blk"><div class="lb">재료 ${r.ing.length}개</div>
        ${r.ing.map(i=>`<div class="ing"><b>${esc(i[0])}</b><span>${esc(i[1])}</span></div>`).join("")}</div>`:""}
      ${r.steps.length?`<div class="blk"><div class="lb">순서 ${r.steps.length}단계</div>
        <ol class="steps">${r.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol></div>`:""}
      ${r.tip?`<div class="blk" style="margin-bottom:0"><div class="lb">기억 포인트</div><div class="tipbox">${esc(r.tip)}</div></div>`:""}
    </div>
    <button class="cta" id="toEditor">확인하고 편집하기</button>`;
  $("#toEditor").addEventListener("click", ()=>openEditor(null, r));
  const sc = $("#s-import .scroll");
  sc.scrollTo({top: $("#prevWrap").offsetTop - 12, behavior:"smooth"});
});

/* 레시피에 딸린 부재료를 펼쳐 보여준다 (학습 카드에는 안 나온다) */
function subsHTML(d){
  const subs = subsOf(d);
  if(!subs.length) return "";
  return `<div class="blk subsect" style="margin-bottom:0">
    <div class="lb">부재료 레시피</div>
    <p class="cap">따로 만들어 두는 재료예요. 학습 카드에는 나오지 않습니다.</p>
    ${subs.map(s=>`<div class="subblk">
      <h5>${esc(s.name)}${(s.place||s.dur)?`<span style="margin-left:auto;font-size:11.5px;font-weight:800;padding:4px 9px;border-radius:8px;background:var(--accent-soft);color:var(--accent-ink)">${esc([s.place,s.dur].filter(Boolean).join(" "))}</span>`:""}</h5>
      ${(s.ing||[]).length ? (s.ing||[]).map(i=>`<div class="ing"><b>${esc(i[0])}</b><span>${esc(i[1])}</span></div>`).join("") : ""}
      ${(s.steps||[]).length ? `<ol class="steps" style="margin-top:10px">${s.steps.map(t=>`<li>${esc(t)}</li>`).join("")}</ol>` : ""}
      ${s.tip ? `<div class="tipbox" style="margin-top:10px">${esc(s.tip)}</div>` : ""}
    </div>`).join("")}</div>`;
}

/* ---------- 편집기 ---------- */
function ingRow(name,amt){
  const w = document.createElement("div"); w.className = "dyn-row";
  w.innerHTML = `<input type="text" class="nm" placeholder="재료" autocomplete="off">
    <input type="text" class="amt" placeholder="용량" autocomplete="off">
    ${ORD_HTML}
    <button class="del" type="button">−</button>`;
  w.querySelector(".nm").value = name||""; w.querySelector(".amt").value = amt||"";
  bindOrd(w);
  w.querySelector(".del").addEventListener("click", ()=>{ const b=w.parentNode; w.remove(); if(b) refreshOrd(b); });
  return w;
}
function stepRow(text){
  const w = document.createElement("div"); w.className = "dyn-row";
  w.innerHTML = `<span class="stepnum"></span><input type="text" class="st" placeholder="예: 얼음 130g을 채운다" autocomplete="off">
    ${ORD_HTML}
    <button class="del" type="button">−</button>`;
  w.querySelector(".st").value = text||"";
  bindOrd(w, renumber);
  w.querySelector(".del").addEventListener("click", ()=>{ const b=w.parentNode; w.remove(); renumber(); if(b) refreshOrd(b); });
  return w;
}
/* 줄을 위아래로 옮긴다 (지우고 다시 쓰지 않아도 되게) */
const ORD_HTML = `<span class="ord">
    <button type="button" class="up" aria-label="위로">▲</button>
    <button type="button" class="dn" aria-label="아래로">▼</button>
  </span>`;
function refreshOrd(box, after){
  const rows = Array.from(box.querySelectorAll(":scope > .dyn-row"));
  rows.forEach((r,i)=>{
    const u = r.querySelector(".up"), d = r.querySelector(".dn");
    if(u) u.disabled = (i === 0);
    if(d) d.disabled = (i === rows.length - 1);
  });
  if(after) after();
}
function bindOrd(w, after){
  const move = dir => {
    const box = w.parentNode; if(!box) return;
    if(dir < 0){
      const prev = w.previousElementSibling;
      if(prev && prev.classList.contains("dyn-row")) box.insertBefore(w, prev);
    } else {
      const next = w.nextElementSibling;
      if(next && next.classList.contains("dyn-row")) box.insertBefore(next, w);
    }
    refreshOrd(box, after);
  };
  w.querySelector(".up").addEventListener("click", ()=>move(-1));
  w.querySelector(".dn").addEventListener("click", ()=>move(1));
}
function renumber(){
  document.querySelectorAll("#e-steps .stepnum").forEach((el,i)=>el.textContent = (i+1)+".");
}
const CUP_PRESETS = ["8oz","12oz","16oz","20oz"];

/* 컵 사이즈는 여러 개 고를 수 있다 (프리셋 + 직접 입력) */
function renderCupPicks(){
  const box = $("#e-cups");
  const items = CUP_PRESETS.map(name=>({key:name, label:name}))
                 .concat([{key:"__custom", label:"직접 입력"}]);
  box.innerHTML = items.map(it=>{
    const on = (it.key === "__custom") ? state.cupCustom : state.cupSel.indexOf(it.key) >= 0;
    return `<button type="button" class="pick${on?" on":""}" data-k="${it.key}">
      <span class="box">✓</span>${esc(it.label)}</button>`;
  }).join("");
  box.querySelectorAll(".pick").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const k = btn.dataset.k;
      if(k === "__custom"){
        state.cupCustom = !state.cupCustom;
        if(!state.cupCustom) $("#e-cup").value = "";
      } else {
        const i = state.cupSel.indexOf(k);
        if(i >= 0) state.cupSel.splice(i,1); else state.cupSel.push(k);
      }
      renderCupPicks();
      $("#e-cup").style.display = state.cupCustom ? "block" : "none";
      if(k === "__custom" && state.cupCustom) $("#e-cup").focus();
    });
  });
  $("#e-cup").style.display = state.cupCustom ? "block" : "none";
}
function setCupField(list){
  const arr = Array.isArray(list) ? list.slice() : (list ? [String(list)] : []);
  state.cupSel = [];
  state.cupCustom = false;
  let custom = "";
  arr.forEach(v=>{
    const val = String(v||"").trim();
    if(!val) return;
    let hit = "";
    for(let i=0;i<CUP_PRESETS.length;i++){
      if(CUP_PRESETS[i].toLowerCase() === val.toLowerCase()) hit = CUP_PRESETS[i];
    }
    if(hit){ if(state.cupSel.indexOf(hit) < 0) state.cupSel.push(hit); }
    else custom = custom ? (custom + ", " + val) : val;
  });
  if(custom){ state.cupCustom = true; $("#e-cup").value = custom; }
  else $("#e-cup").value = "";
  renderCupPicks();
}
function readCupField(){
  const out = CUP_PRESETS.filter(n=>state.cupSel.indexOf(n) >= 0);
  if(state.cupCustom){
    $("#e-cup").value.split(",").map(s=>s.trim()).filter(Boolean).forEach(v=>out.push(v));
  }
  return out;
}

/* 재료 입력칸 한 벌을 읽고 쓰는 helper. ICE 칸과 HOT 칸이 같은 모양이라 함께 쓴다 */
function readIngRows(sel){
  return Array.from(document.querySelectorAll(sel + " .dyn-row"))
    .map(r=>[r.querySelector(".nm").value.trim(), r.querySelector(".amt").value.trim()])
    .filter(p=>p[0] || p[1]);
}
function fillIngBox(sel, rows){
  const b = $(sel); b.innerHTML = "";
  (rows.length ? rows : [["",""],["",""]]).forEach(p=>b.appendChild(ingRow(p[0], p[1])));
  refreshOrd(b);
}
/* 온도 선택에 따라 HOT 재료 칸을 보여주거나 숨긴다. 숨겨도 입력값은 남겨둔다 —
   ICE 로 잘못 바꿨다가 되돌릴 때 적어둔 HOT 재료가 사라지면 곤란하다 */
function syncTempFields(){
  const both = isBothTemp({temp: $("#e-temp").value});
  $("#e-ing-head").style.display = both ? "block" : "none";
  $("#e-hot-wrap").style.display = both ? "block" : "none";
}

function openEditor(id, draft){
  state.editingId = id;
  const d = draft || (id ? data.drinks.find(x=>x.id===id) : null);
  $("#editTitle").textContent = id ? "레시피 수정" : (draft ? "사진에서 가져온 레시피" : "레시피 추가");
  $("#e-cat").innerHTML = data.cats.map(c=>`<option value="${esc(c.id)}">${esc(c.label)}</option>`).join("");
  $("#e-name").value = d?d.name:"";
  $("#e-en").value = d?(d.en||""):"";
  $("#e-cat").value = (d && catOf(d.cat)) ? d.cat : firstCatId();
  $("#e-temp").value = d?(d.temp||"ICE"):"ICE";
  setCupField(d ? (d.cups || (d.cup ? [d.cup] : [])) : []);
  $("#e-tip").value = d?(d.tip||""):"";
  fillIngBox("#e-ing", d && d.ing.length ? d.ing : [["",""],["",""]]);
  fillIngBox("#e-ing-hot", (d && Array.isArray(d.ingHot) && d.ingHot.length) ? d.ingHot : []);
  syncTempFields();
  const sb = $("#e-steps"); sb.innerHTML = "";
  const sts = d && d.steps.length ? d.steps : ["",""];
  sts.forEach(s=>sb.appendChild(stepRow(s)));
  renumber(); refreshOrd(sb);
  state.editSubRefs = (d && Array.isArray(d.subRefs)) ? d.subRefs.filter(subById) : [];
  renderSubs();
  $("#delBtn").style.display = id ? "block" : "none";
  go("edit");
  $("#s-edit .scroll").scrollTop = 0;
}

/* 편집 중인 본문을 잠깐 담아뒀다가 부재료 화면에서 돌아올 때 복원한다 */
function readEditorForm(){
  return {
    name:$("#e-name").value, en:$("#e-en").value, cat:$("#e-cat").value,
    temp:$("#e-temp").value, cups:readCupField(), tip:$("#e-tip").value,
    ing:Array.from(document.querySelectorAll("#e-ing .dyn-row"))
        .map(r=>[r.querySelector(".nm").value, r.querySelector(".amt").value]),
    ingHot:Array.from(document.querySelectorAll("#e-ing-hot .dyn-row"))
        .map(r=>[r.querySelector(".nm").value, r.querySelector(".amt").value]),
    steps:Array.from(document.querySelectorAll("#e-steps .st")).map(i=>i.value)
  };
}
function writeEditorForm(f){
  $("#e-name").value=f.name; $("#e-en").value=f.en;
  $("#e-cat").value=f.cat; $("#e-temp").value=f.temp;
  setCupField(f.cups); $("#e-tip").value=f.tip;
  fillIngBox("#e-ing", f.ing);
  fillIngBox("#e-ing-hot", f.ingHot || []);
  syncTempFields();
  const sb=$("#e-steps"); sb.innerHTML="";
  (f.steps.length?f.steps:[""]).forEach(s=>sb.appendChild(stepRow(s)));
  renumber(); refreshOrd($("#e-ing")); refreshOrd(sb);
}
function renderSubs(){
  const box = $("#e-subs");
  const subs = state.editSubRefs.map(subById).filter(Boolean);
  box.innerHTML = subs.length
    ? subs.map(s=>{
        const others = usesOf(s.id).filter(d=>d.id !== state.editingId).length;
        return `<button type="button" class="subrow" data-id="${esc(s.id)}">
         <b>${esc(s.name || "(이름 없음)")}</b>
         <span>${others ? "다른 메뉴 "+others+"곳과 공유"
           : ((s.place||s.dur) ? esc([s.place,s.dur].filter(Boolean).join(" ")) : "재료 "+(s.ing||[]).filter(p=>p[0]||p[1]).length+"개")}</span>
         <span style="color:var(--accent)">수정</span>
       </button>`;
      }).join("")
    : `<div style="font-size:13px;color:var(--muted);padding:2px 0 8px">등록된 부재료가 없어요.</div>`;
  box.querySelectorAll(".subrow").forEach(btn=>{
    btn.addEventListener("click", ()=>openSubEditor(btn.dataset.id, "edit"));
  });
}
/* 부재료 추가 — 이미 만들어 둔 것이 있으면 새로 만들지 말고 고르게 한다 */
function openSubPickSheet(){
  const avail = subsSorted().filter(s=>state.editSubRefs.indexOf(s.id) < 0);
  if(!avail.length){ openSubEditor(null, "edit"); return; }
  $("#sheetBody").innerHTML = `
    <h2 style="margin:0 0 4px;font-size:21px;font-weight:800;letter-spacing:-.4px">부재료 추가</h2>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:20px">이미 등록해 둔 부재료를 고르면 다시 입력하지 않아도 돼요</div>
    <button class="row" id="subNew">
      <span class="emo">✏️</span>
      <span class="meta"><b>새로 만들기</b><span>재료와 순서를 새로 입력합니다</span></span>
    </button>
    <div class="lb" style="margin:20px 0 10px">등록된 부재료</div>
    ${avail.map(s=>{
      const n = usesOf(s.id).length;
      return `<button class="row" data-pick="${esc(s.id)}">
        <span class="subb">부재료</span>
        <span class="meta"><b>${esc(s.name)}</b><span>${n ? n+"개 메뉴에서 사용 중" : "아직 연결된 메뉴 없음"}</span></span>
      </button>`;
    }).join("")}`;
  $("#mask").classList.add("on"); $("#sheet").classList.add("on");
  $("#subNew").addEventListener("click", ()=>{ closeSheet(); openSubEditor(null, "edit"); });
  $("#sheetBody").querySelectorAll("[data-pick]").forEach(b=>b.addEventListener("click", ()=>{
    const id = b.dataset.pick;
    if(state.editSubRefs.indexOf(id) < 0) state.editSubRefs.push(id);
    closeSheet(); renderSubs();
    toast("담았어요. 레시피를 저장하면 연결됩니다");
  }));
}

/* ---------- 부재료 편집 화면 ---------- */
function openSubEditor(subId, from){
  state.subFrom = (from === "list") ? "list" : "edit";
  state.parentForm = (state.subFrom === "edit") ? readEditorForm() : null;
  state.subEditId = subId || null;
  const s = subId ? subById(subId) : null;
  $("#subTitle").textContent = s ? "부재료 수정" : "부재료 추가";
  if(state.subFrom === "edit"){
    const others = s ? usesOf(s.id).filter(d=>d.id !== state.editingId).map(d=>d.name) : [];
    $("#subParent").textContent = others.length
      ? "여기서 고치면 " + others.join(" · ") + " 에도 함께 반영돼요"
      : ($("#e-name").value.trim() || "레시피") + " 에 넣을 재료";
  } else {
    const uses = s ? usesOf(s.id).map(d=>d.name) : [];
    $("#subParent").textContent = s
      ? (uses.length ? uses.join(" · ") + " 에 사용 중" : "아직 연결된 메뉴가 없어요")
      : "저장한 뒤 쓰이는 메뉴를 연결할 수 있어요";
  }
  $("#s-name").value = s ? s.name : "";
  $("#s-tip").value  = s ? (s.tip||"") : "";
  $("#s-dur").value  = s ? (s.dur||"") : "";
  state.subPlace = s ? (s.place||"") : "";
  drawSubPlaces();
  const ib=$("#s-ing"); ib.innerHTML="";
  const ings = (s && s.ing.length) ? s.ing : [["",""],["",""]];
  ings.forEach(p=>ib.appendChild(ingRow(p[0],p[1])));
  const sb=$("#s-steps"); sb.innerHTML="";
  const sts = (s && s.steps.length) ? s.steps : [""];
  sts.forEach(t=>sb.appendChild(subStepRow(t)));
  renumberSub(); refreshOrd(ib); refreshOrd(sb);
  /* 레시피 안에서 열었을 땐 "빼기"(연결만 끊기), 부재료 탭에서 열었을 땐 진짜 삭제 */
  $("#subDel").style.display = s ? "block" : "none";
  $("#subDel").textContent = (state.subFrom === "edit") ? "이 레시피에서 빼기" : "이 부재료 삭제";
  $("#subDel").classList.toggle("ghost", state.subFrom === "edit");
  $("#subDel").classList.toggle("danger", state.subFrom !== "edit");
  go("sub");
  $("#s-sub .scroll").scrollTop = 0;
}
function drawSubPlaces(){
  const box = $("#s-place");
  box.innerHTML = PLACES.map(pn=>
    `<button type="button" class="pick${state.subPlace===pn?" on":""}" data-p="${pn}"><span class="box">✓</span>${pn}</button>`).join("");
  box.querySelectorAll(".pick").forEach(b=>b.addEventListener("click",()=>{
    state.subPlace = (state.subPlace === b.dataset.p) ? "" : b.dataset.p;
    drawSubPlaces();
  }));
}
function subStepRow(text){
  const w=document.createElement("div"); w.className="dyn-row";
  w.innerHTML=`<span class="stepnum"></span><input type="text" class="st" placeholder="예: 설탕과 1:1로 재운다" autocomplete="off">
    ${ORD_HTML}
    <button class="del" type="button">−</button>`;
  w.querySelector(".st").value = text||"";
  bindOrd(w, renumberSub);
  w.querySelector(".del").addEventListener("click", ()=>{ const b=w.parentNode; w.remove(); renumberSub(); if(b) refreshOrd(b); });
  return w;
}
function renumberSub(){
  document.querySelectorAll("#s-steps .stepnum").forEach((el,i)=>el.textContent=(i+1)+".");
}
function leaveSubEditor(){
  if(state.subFrom === "edit"){
    go("edit");
    if(state.parentForm){ writeEditorForm(state.parentForm); state.parentForm = null; }
    renderSubs();
  } else {
    state.listTab = "sub";
    go("list");
  }
}
$("#addSub").addEventListener("click", openSubPickSheet);
$("#addSubIng").addEventListener("click", ()=>{ const b=$("#s-ing"); b.appendChild(ingRow()); refreshOrd(b); });
$("#addSubStep").addEventListener("click", ()=>{ const b=$("#s-steps"); b.appendChild(subStepRow()); renumberSub(); refreshOrd(b); });
$("#subClose").addEventListener("click", leaveSubEditor);
$("#subSave").addEventListener("click", ()=>{
  const name = $("#s-name").value.trim();
  if(!name){ toast("부재료 이름을 입력해 주세요"); $("#s-name").focus(); return; }
  const dup = data.subs.find(x=>x.id !== state.subEditId
    && String(x.name||"").trim().toLowerCase() === name.toLowerCase());
  if(dup){
    confirmBox("같은 이름이 있어요",
      `“${dup.name}”가 이미 등록돼 있어요. 배합이 다른 별개의 재료라면 그대로 저장하고, 같은 것이라면 취소한 뒤 기존 것을 연결해 주세요.`,
      "그대로 저장", ()=>commitSub(name));
    return;
  }
  commitSub(name);
});
function commitSub(name){
  const rec = {
    id: state.subEditId || uid(),
    name: name,
    ing: Array.from(document.querySelectorAll("#s-ing .dyn-row"))
          .map(r=>[r.querySelector(".nm").value.trim(), r.querySelector(".amt").value.trim()])
          .filter(p=>p[0]||p[1]),
    steps: Array.from(document.querySelectorAll("#s-steps .st")).map(i=>i.value.trim()).filter(Boolean),
    tip: $("#s-tip").value.trim(),
    place: state.subPlace,
    dur: $("#s-dur").value.trim()
  };
  const i = data.subs.findIndex(x=>x.id===rec.id);
  if(i >= 0) data.subs[i] = rec; else data.subs.push(rec);
  persist();
  if(state.subFrom === "edit"){
    if(state.editSubRefs.indexOf(rec.id) < 0) state.editSubRefs.push(rec.id);
    const others = usesOf(rec.id).filter(d=>d.id !== state.editingId).length;
    toast(others ? `저장했어요. 다른 메뉴 ${others}곳에도 반영됩니다`
                 : "부재료를 담았어요. 레시피를 저장하면 연결됩니다");
  } else {
    toast(Store.available ? "저장했어요" : "저장했지만 기기에 남지 않아요");
  }
  state.subEditId = rec.id;
  leaveSubEditor();
}
$("#subDel").addEventListener("click", ()=>{
  const s = state.subEditId ? subById(state.subEditId) : null;
  if(!s) return;
  if(state.subFrom === "edit"){
    confirmBox("부재료 빼기",
      `“${s.name}”를 이 레시피에서만 뺄까요? 부재료 자체는 목록에 남고 다른 메뉴의 연결도 그대로예요.`,
      "빼기", ()=>{
        state.editSubRefs = state.editSubRefs.filter(x=>x!==s.id);
        leaveSubEditor();
      });
    return;
  }
  const n = usesOf(s.id).length;
  confirmBox("부재료 삭제",
    `“${s.name}”를 삭제할까요?` + (n ? ` 연결된 메뉴 ${n}곳에서도 함께 빠집니다.` : "") + " 되돌릴 수 없어요.",
    "삭제", ()=>{ deleteSub(s.id); toast("삭제했어요"); leaveSubEditor(); });
});
$("#addIng").addEventListener("click", ()=>{ const b=$("#e-ing"); b.appendChild(ingRow()); refreshOrd(b); });
$("#addIngHot").addEventListener("click", ()=>{ const b=$("#e-ing-hot"); b.appendChild(ingRow()); refreshOrd(b); });
$("#e-temp").addEventListener("change", ()=>syncTempFields());
$("#copyIceIng").addEventListener("click", ()=>{
  const rows = readIngRows("#e-ing");
  if(!rows.length){ toast("ICE 재료를 먼저 입력해 주세요"); return; }
  fillIngBox("#e-ing-hot", rows);
  toast("ICE 재료를 가져왔어요. 용량만 고치면 됩니다");
});
$("#addStep").addEventListener("click", ()=>{ const b=$("#e-steps"); b.appendChild(stepRow()); renumber(); refreshOrd(b); });
$("#editClose").addEventListener("click", ()=>go("list"));

$("#saveBtn").addEventListener("click", ()=>{
  const name = $("#e-name").value.trim();
  if(!name){ toast("메뉴 이름을 입력해 주세요"); $("#e-name").focus(); return; }
  const both = isBothTemp({temp: $("#e-temp").value});
  const ing = readIngRows("#e-ing");
  const ingHot = both ? readIngRows("#e-ing-hot") : [];
  if(!ing.length){ toast(both ? "ICE 재료를 하나 이상 입력해 주세요" : "재료를 하나 이상 입력해 주세요"); return; }
  const steps = Array.from(document.querySelectorAll("#e-steps .st")).map(i=>i.value.trim()).filter(Boolean);
  const rec = {
    id: state.editingId || uid(),
    cat: $("#e-cat").value, name: name, en: $("#e-en").value.trim(),
    temp: $("#e-temp").value, cups: readCupField(),
    ing: ing, ingHot: ingHot, steps: steps, tip: $("#e-tip").value.trim(),
    /* 저장할 때 레코드를 새로 만들기 때문에 보관 상태를 명시적으로 물려받아야 한다.
       안 그러면 보관해 둔 레시피를 고치는 순간 학습에 다시 튀어나온다 */
    arch: state.editingId ? !!(data.drinks.find(x=>x.id===state.editingId)||{}).arch : false,
    subRefs: state.editSubRefs.filter(subById)
  };
  if(state.editingId){
    const i = data.drinks.findIndex(x=>x.id===state.editingId);
    if(i>=0) data.drinks[i] = rec; else data.drinks.push(rec);
  } else data.drinks.push(rec);
  persist();
  toast(Store.available ? "저장했어요" : "저장했지만 기기에 남지 않아요");
  go("list");
});

$("#delBtn").addEventListener("click", ()=>{
  const id = state.editingId; if(!id) return;
  const d = data.drinks.find(x=>x.id===id);
  confirmBox("레시피 삭제", `“${d?d.name:""}”를 삭제할까요? 되돌릴 수 없어요.`, "삭제", ()=>{
    data.drinks = data.drinks.filter(x=>x.id!==id);
    rm(data.mastered,id); rm(data.needReview,id);
    persist(); toast("삭제했어요"); go("list");
  });
});

