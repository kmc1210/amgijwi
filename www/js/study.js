/* 암기쥐 — 보관함 · 학습(카드 뒤집기) · 빈칸 채우기
   보관함이 여기 있는 건 학습 덱에서 빼두는 기능이라서다 */

/* ---------- 보관함 ----------
   외울 필요가 없어진 레시피를 지우지 않고 빼두는 곳. 내용은 그대로 남고
   학습 덱·레시피 목록·진도율에서만 빠진다. 언제든 되돌릴 수 있다. */
function setArch(ids, on){
  const list = Array.isArray(ids) ? ids : [ids];
  list.forEach(id=>{
    const d = data.drinks.find(x=>x.id===id);
    if(d) d.arch = !!on;
  });
  persist();
}
function renderArchBtn(){
  const n = archDrinks().length;
  $("#archBtn").style.display = (n && state.listTab === "recipe" && !state.selMode) ? "flex" : "none";
  $("#archCnt").textContent = n;
}
function renderArch(){
  const q = ($("#archQ").value||"").trim().toLowerCase();
  const all = archDrinks();
  const hit = all.filter(d=>textHit(d.name+" "+(d.en||"")+" "+ingNames(d), q));
  $("#archSub").textContent = all.length
    ? all.length + "개 · 학습과 레시피 목록에서 빠져 있어요"
    : "비어 있어요";
  $("#archBody").innerHTML = all.length
    ? (hit.length
        ? hit.map(d=>rowHTML(d, "보관")).join("")
        : noResultHTML(q, "레시피가"))
    : `<div class="empty" style="padding:26px 18px 22px">
        ${emptyMouse(2)}
        <b style="display:block;font-size:15px;color:var(--ink);margin-bottom:8px">보관함이 비어 있어요</b>
        더 이상 외울 필요 없는 메뉴는 삭제하지 말고<br>레시피 상세에서 <b>보관하기</b>를 눌러 여기로 옮겨두세요.<br>
        내용은 그대로 남고 학습에만 안 나옵니다.
      </div>`;
  bindRows("#archBody");
  const clr = $("#archBody").querySelector("[data-clearq]");
  if(clr) clr.addEventListener("click", ()=>{ $("#archQ").value = ""; renderArch(); });
}
function openArch(){ $("#archQ").value = ""; go("arch"); $("#s-arch .scroll").scrollTop = 0; }
$("#archBtn").addEventListener("click", openArch);
$("#archClose").addEventListener("click", ()=>go("list"));
$("#archQ").addEventListener("input", renderArch);

function bindRows(sel, selectable){
  document.querySelectorAll(sel+" .row").forEach(r=>r.addEventListener("click",()=>{
    if(selectable && state.selMode){ toggleSel(r.dataset.id); return; }
    openSheet(r.dataset.id);
  }));
}
/* 마스코트를 누르면 응원 한마디 */
function sayBubble(msg){
  const el = $("#mbubble");
  el.textContent = msg;
  el.classList.remove("pop");
  void el.offsetWidth;          // 애니메이션 재시작
  el.classList.add("pop");
}
const SLEEPY = ["쿨… 자는 중이츄", "내일 보자츄…", "Zzz… 츄…", "조금만 더 잘게츄", "지금은 꿈에서 레시피 외우는 중이츄"];
$("#mascot").addEventListener("click", ()=>{
  const pool = currentMood() === "night" ? SLEEPY : CHEERS;
  sayBubble(pool[Math.floor(Math.random() * pool.length)]);
  sfx(currentMood() === "night" ? "chuSleep" : "chu");   // 자는 중엔 느리고 낮게
  if(currentMood() === "morning"){ playSip(); return; }
  if(currentMood() !== "night"){          // 말할 때 한 번 깜빡
    mascot.blink = true; drawMascot();
    setTimeout(()=>{ mascot.blink = false; drawMascot(); }, 150);
  }
});
/* 학습 방식을 고르는 시트.
   범위를 넘기면(한 메뉴만, 복습만) 그 범위를 유지한 채 방식만 고르게 한다.
   범위가 좁다고 방식을 못 고를 이유는 없다. */
function openModeSheet(customPool, scopeLabel){
  const custom = Array.isArray(customPool) ? customPool.slice() : null;   // 이벤트 객체가 넘어와도 무시
  const pool = custom || drinksOf(state.filter);
  if(!pool.length){ toast("학습할 레시피가 없어요"); go("list"); return; }
  const scope = scopeLabel || (state.filter === "all" ? "전체" : (catLabel(state.filter) || "전체"));
  const opt = (m, emo, title, desc) => `
    <button class="row" data-mode="${m}">
      <span class="emo">${emo}</span>
      <span class="meta"><b>${title}</b><span>${desc}</span></span>
      ${data.mode === m ? `<span class="pill done">지난번</span>` : ""}
    </button>`;
  $("#sheetBody").innerHTML = `
    <h2 style="margin:0 0 4px;font-size:21px;font-weight:800;letter-spacing:-.4px">학습 방식</h2>
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:20px">
      <span style="font-size:12.5px;color:var(--muted)">${esc(scope)} · ${pool.length}개 메뉴</span>
      ${pool.length > 1 ? `<button class="linkbtn" id="pickBtn" style="padding:0;min-height:0">고르기</button>` : ""}
    </div>
    ${opt("flip","🔄","카드 뒤집기","이름 보고 재료를 통째로 떠올리기")}
    ${opt("blank","✏️","빈칸 채우기","용량만 가리고 하나씩 확인하기")}`;
  $("#mask").classList.add("on"); $("#sheet").classList.add("on");
  const pick = $("#pickBtn");
  if(pick) pick.addEventListener("click", ()=>openPickSheet(pool, scope));
  $("#sheetBody").querySelectorAll(".row").forEach(b=>{
    b.addEventListener("click", ()=>{
      data.mode = b.dataset.mode; persist();
      closeSheet();
      setTimeout(()=>startSession(custom), 180);
    });
  });
}

/* 범위 안에서 학습할 레시피만 고르는 시트.
   카테고리를 골라도 그 안의 전부가 덱에 들어가서, 오늘 외울 몇 개만 돌릴 수가 없었다.
   고른 결과는 방식 시트로 넘기고, 방식 시트가 그대로 그 범위로 학습을 시작한다. */
function openPickSheet(pool, scope){
  const chosen = new Set(pool.map(d=>d.id));
  const draw = ()=>{
    const n = chosen.size;
    $("#sheetBody").innerHTML = `
      <h2 style="margin:0 0 4px;font-size:21px;font-weight:800;letter-spacing:-.4px">학습할 레시피 고르기</h2>
      <div style="font-size:12.5px;color:var(--muted);margin-bottom:14px">${esc(scope)} · ${n}개 선택 / ${pool.length}개</div>
      <div style="display:flex;gap:14px;margin-bottom:12px">
        <button class="linkbtn" id="pickAll" style="padding:0;min-height:0">모두 선택</button>
        <button class="linkbtn" id="pickNew" style="padding:0;min-height:0">안 외운 것만</button>
        <button class="linkbtn mute" id="pickNone" style="padding:0;min-height:0">모두 해제</button>
      </div>
      ${pool.map(d=>`<button class="row${chosen.has(d.id)?" on":""}" data-id="${esc(d.id)}" style="margin-bottom:8px">
        <span class="checkc">✓</span>
        <span class="meta"><b>${esc(d.name)}</b><span>${
          [esc(d.temp||""), ingSets(d)[0][1].slice(0,3).map(i=>esc(i[0])).join(" · ")].filter(Boolean).join(" · ")
        }</span></span>
        ${has(data.mastered,d.id)?`<span class="pill done">완료</span>`:""}
      </button>`).join("")}
      <button class="cta" id="pickGo"${n?"":" disabled"} style="margin-top:6px">${
        n ? n + "개 학습하기" : "레시피를 골라주세요"}</button>`;
    $("#sheetBody").querySelectorAll(".row").forEach(b=>{
      b.addEventListener("click", ()=>{
        const id = b.dataset.id;
        if(chosen.has(id)) chosen.delete(id); else chosen.add(id);
        draw();
      });
    });
    $("#pickAll").addEventListener("click", ()=>{ pool.forEach(d=>chosen.add(d.id)); draw(); });
    $("#pickNone").addEventListener("click", ()=>{ chosen.clear(); draw(); });
    $("#pickNew").addEventListener("click", ()=>{
      chosen.clear();
      pool.forEach(d=>{ if(!has(data.mastered, d.id)) chosen.add(d.id); });
      if(!chosen.size) toast("이 범위는 전부 외운 상태예요");
      draw();
    });
    $("#pickGo").addEventListener("click", ()=>{
      const picked = pool.filter(d=>chosen.has(d.id));
      if(!picked.length) return;
      /* 전부 고른 것과 범위 전체는 같은 말이라 라벨을 굳이 바꾸지 않는다 */
      openModeSheet(picked, picked.length === pool.length ? scope : scope + " 중 " + picked.length + "개");
    });
  };
  draw();
  $("#sheetBody").scrollTop = 0;
}
$("#startBtn").addEventListener("click", ()=>openModeSheet());
$("#revStudy").addEventListener("click", ()=>{        // 다시 볼래요 목록만 돌린다
  const rev = liveDrinks().filter(d=>has(data.needReview, d.id));
  if(rev.length) openModeSheet(rev, "다시 볼래요");
});

/* ---------- 학습 ---------- */
function startSession(customPool){
  const custom = Array.isArray(customPool) ? customPool.slice() : null;   // 이벤트 객체가 넘어와도 무시
  state.deckIds = custom ? custom.map(d=>d.id) : null;
  const pool = custom || drinksOf(state.filter).slice();
  if(!pool.length){ toast("학습할 레시피가 없어요"); go("list"); return; }
  for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=pool[i]; pool[i]=pool[j]; pool[j]=t; }
  state.deck = pool; state.idx = 0; state.flipped = false;
  state.revealed.clear(); state.discOpen = false;
  state.stat = {ok:0, again:0, total:pool.length};
  go("study"); renderCard();
}
function bindActions(){
  document.querySelectorAll("#actions .act").forEach(b=>b.addEventListener("click",()=>action(b.dataset.a)));
}
function renderCard(){
  const d = state.deck[state.idx];
  if(!d){ finish(); return; }
  $("#progBar").style.width = (state.idx/state.deck.length*100) + "%";
  $("#progTxt").textContent = (state.idx+1)+"/"+state.deck.length;

  if(data.mode === "blank"){
    $("#card").classList.remove("full");
    $("#card").innerHTML = blankHTML(d);
    bindBlanks(d);
    renderBlankActions(d);
    return;
  }
  $("#card").classList.toggle("full", !state.flipped);
  $("#card").innerHTML = state.flipped ? backHTML(d) : frontHTML(d);
  $("#actions").innerHTML = state.flipped
    ? `<button class="act again" data-a="again">다시 볼래요</button><button class="act ok" data-a="ok">외웠어요</button>`
    : `<button class="act flip" data-a="flip">레시피 확인하기</button>`;
  bindActions();
}

/* ---------- 빈칸 채우기 ---------- */
function discHTML(d){
  return `${d.steps.length?`<div class="lb">제조 순서</div>
      <ol class="steps">${d.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>`:""}
    ${d.tip?`<div class="lb" style="margin-top:16px">기억 포인트</div>
      <div class="tipbox">${esc(d.tip)}</div>`:""}
    ${subsHTML(d)}`;
}
function blankHTML(d){
  const sub = [enText(d.en), d.temp, cupText(d), catLabel(d.cat)].filter(Boolean).map(esc).join(" · ");
  return `<div class="face"><div class="back">
    <h2>${esc(d.name)}</h2>
    <div class="sub">${sub}</div>
    <div class="blk"><div class="lb">${d._shelf?"품질 유지기한":"재료 / 용량"}</div>
      ${d.ing.length ? ingSets(d).map((s,si)=>`${s[0]?`<div class="ingset">${esc(s[0])}</div>`:""}
        ${s[1].map((it,ri)=>`<div class="ing q"><b>${esc(it[0])}</b>${
          state.revealed.has(si+"-"+ri)
            ? `<span class="amt-on">${esc(it[1]) || "—"}</span>`
            : `<button class="blank" data-b="${si}-${ri}">? ? ?</button>`
        }</div>`).join("")}`).join("")
      : `<div style="font-size:13.5px;color:var(--muted)">등록된 재료가 없어요.</div>`}
    </div>
    ${(d.steps.length || d.tip) ? `<div class="blk" id="discWrap" style="margin-bottom:0">
        ${state.discOpen ? discHTML(d) : `<button class="disc" id="discBtn">제조 순서 · 기억 포인트 보기</button>`}
      </div>` : ""}
  </div></div>`;
}
function bindBlanks(d){
  document.querySelectorAll("#card .blank").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      e.stopPropagation();
      const i = btn.dataset.b;
      state.revealed.add(i);
      sfx("reveal");
      const span = document.createElement("span");
      span.className = "amt-on";
      span.textContent = ingAt(d, i)[1] || "—";
      btn.replaceWith(span);
      renderBlankActions(d);
    });
  });
  const disc = $("#discBtn");
  if(disc) disc.addEventListener("click", (e)=>{
    e.stopPropagation();
    state.discOpen = true;
    $("#discWrap").innerHTML = discHTML(d);
  });
}
function renderBlankActions(d){
  const allOpen = ingKeys(d).every(k=>state.revealed.has(k));
  $("#actions").innerHTML = allOpen
    ? `<button class="act again" data-a="again">다시 볼래요</button><button class="act ok" data-a="ok">외웠어요</button>`
    : `<button class="act flip" data-a="revealAll">정답 모두 보기</button>`;
  bindActions();
}
function frontHTML(d){
  return `<div class="face"><div class="front">
    <div class="cat">${esc(catEmo(d.cat))} ${esc(catLabel(d.cat) || "기타")}</div>
    <h2>${esc(d.name)}</h2>
    ${d.en?`<div class="en">${esc(enText(d.en))}</div>`:""}
    <div class="tags">${d.temp?`<span class="tag">${esc(d.temp)}</span>`:""}${cupList(d).map(c=>`<span class="tag">${esc(c)}</span>`).join("")}</div>
    <div class="hint">재료와 용량을 떠올린 뒤 카드를 탭하세요</div></div></div>`;
}
function detailHTML(d){
  return `${d.ing.length?`<div class="blk"><div class="lb">${d._shelf?"품질 유지기한":"재료 / 용량"}</div>
      ${ingSets(d).length > 1
        ? `<div class="ingcols">${ingSets(d).map(s=>`<div><div class="ingset">${esc(s[0])}</div>
            ${s[1].map(i=>`<div class="ing"><b>${esc(i[0])}</b><span>${esc(i[1])}</span></div>`).join("")}</div>`).join("")}</div>`
        : d.ing.map(i=>`<div class="ing"><b>${esc(i[0])}</b><span>${esc(i[1])}</span></div>`).join("")}</div>`:""}
    ${d.steps.length?`<div class="blk"><div class="lb">제조 순서</div>
      <ol class="steps">${d.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol></div>`:""}
    ${d.tip?`<div class="blk"><div class="lb">기억 포인트</div>
      <div class="tipbox">${esc(d.tip)}</div></div>`:""}
    ${subsHTML(d)}`;
}
function backHTML(d){
  return `<div class="face"><div class="back">
    <h2>${esc(d.name)}</h2>
    <div class="sub">${[enText(d.en),d.temp,cupText(d),catLabel(d.cat)].filter(Boolean).map(esc).join(" · ")}</div>
    ${detailHTML(d)}</div></div>`;
}
function flipCard(){
  sfx("flip");
  const card = $("#card"); card.classList.add("flipping");
  setTimeout(()=>{ state.flipped = !state.flipped; renderCard(); card.classList.remove("flipping"); }, 180);
}
function action(a){
  const d = state.deck[state.idx];
  if(a==="flip"){ flipCard(); return; }
  if(a==="revealAll"){
    sfx("reveal");
    ingKeys(d).forEach(k=>state.revealed.add(k));
    state.discOpen = true;
    renderCard();
    return;
  }
  if(a==="ok"){ state.stat.ok++; add(data.mastered,d.id); rm(data.needReview,d.id); sfx("ok"); }
  else { state.stat.again++; add(data.needReview,d.id); rm(data.mastered,d.id); sfx("again"); }
  persist();
  state.idx++; state.flipped = false;
  state.revealed.clear(); state.discOpen = false;
  if(state.idx >= state.deck.length){ finish(); return; }
  renderCard();
}
$("#cardWrap").addEventListener("click",(e)=>{
  if(data.mode === "blank") return;
  if(e.target.closest(".act")) return;
  if(!state.flipped) flipCard();
});
$("#quitBtn").addEventListener("click", ()=>go("home"));
function finish(){
  const s = state.stat;
  $("#resOk").textContent = s.ok; $("#resAgain").textContent = s.again; $("#resTotal").textContent = s.total;
  $("#resMsg").textContent = s.again===0 ? "전부 한 번에 맞혔어요. 완벽합니다!" : `${s.again}개는 복습 목록에 담아뒀어요.`;
  const rate = s.total ? s.ok / s.total : 1;
  $("#resCheer").textContent = rate === 1 ? "이 기세로 내일도 한 번 더!"
    : (rate >= 0.7 ? "잘하고 있어요. 조금만 더 하면 돼요!" : "오늘 본 것만으로도 남아요. 내일 또 봐요!");
  go("result");
  startEat();
  sfx("done");
}
/* 학습을 마치면 쥐돌이가 치즈를 먹는다 */
const EAT_SEQ = ["eat1","eat2","eat3","eat4","eat5","eat4","eat3","eat2"];
let eatT = null;
function startEat(){
  const el = $("#resMascot"); if(!el) return;
  stopEat();
  const still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(still){ el.innerHTML = mouseSVG("eat1"); return; }
  let i = 0;
  el.innerHTML = mouseSVG(EAT_SEQ[0]);
  eatT = setInterval(()=>{ i = (i+1) % EAT_SEQ.length; el.innerHTML = mouseSVG(EAT_SEQ[i]); }, 380);
}
function stopEat(){ if(eatT){ clearInterval(eatT); eatT = null; } }

$("#againBtn").addEventListener("click", ()=>{      // 직전과 같은 범위로 다시
  if(state.deckIds){
    const pool = liveDrinks().filter(d=>state.deckIds.indexOf(d.id) >= 0);
    if(pool.length){ startSession(pool); return; }
  }
  startSession();
});
$("#homeBtn").addEventListener("click", ()=>go("home"));

