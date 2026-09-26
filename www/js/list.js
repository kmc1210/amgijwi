/* 암기쥐 — 레시피 목록 · 검색 · 부재료 · 개봉관리 · 메모 · 상세 시트 */

/* ---------- 목록 ---------- */
/* 초성 검색 — 질문이 ㅋㅍㅁㅋ 처럼 초성으로만 되어 있으면 초성끼리 비교한다 */
const CHO_LIST = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
function choStr(str){
  let out = "";
  for(const ch of String(str)){
    const c = ch.charCodeAt(0);
    out += (c >= 0xAC00 && c <= 0xD7A3) ? CHO_LIST[Math.floor((c - 0xAC00) / 588)] : ch;
  }
  return out;
}
function textHit(hay, q){
  if(!q) return true;
  const t = String(hay||"").toLowerCase();
  if(t.indexOf(q) >= 0) return true;
  const qq = q.replace(/\s+/g, "");
  if(!/^[ㄱ-ㅎ]+$/.test(qq)) return false;
  return choStr(t).replace(/\s+/g, "").indexOf(qq) >= 0;
}
function visibleDrinks(){
  const q = ($("#q").value||"").trim().toLowerCase();
  return liveDrinks().filter(d=>textHit(d.name+" "+(d.en||"")+" "+ingNames(d), q));
}
/* 기한(일) 별로 묶어서 개봉일→폐기일 조합을 만든다. 개봉일 포함 N일 → 폐기일 = 개봉일 + (N-1) */
function tagGroups(){
  const map = {};
  data.shelf.forEach(s=>{
    const n = durDays(s.dur);
    if(!n || n < 1 || n > 60) return;
    if(!map[n]) map[n] = [];
    map[n].push(s);
  });
  return Object.keys(map).map(Number).sort((a,b)=>a-b).map(n=>({days:n, items:map[n]}));
}
function tagRows(n, today){
  const rows = [];
  for(let i=0;i<n;i++){
    const open = addDays(today, -(n-1) + i);
    const kill = addDays(open, n-1);
    rows.push({no:i+1, open:open, kill:kill, today: i === 0});
  }
  return rows;
}
/* 백업을 권할 때인지 — 앱이 먼저 말을 걸어야 데이터를 안 잃는다 */
function backupDue(){
  const n = liveDrinks().length;
  if(n < 8) return null;                                  // 몇 개 없을 땐 성가시기만 하다
  const today = ymd(new Date());
  const snz = data.backupSnooze;
  if(snz && dayGap(snz, today) < 7) return null;           // "나중에" 를 누른 뒤 일주일은 조용히
  const b = data.backup;
  if(!b) return {kind:"never", n:n};
  const grew = n - (b.count || 0);
  const days = dayGap(b.at, today);
  if(grew >= 5) return {kind:"grew", n:n, grew:grew};
  if(days >= 14) return {kind:"old", n:n, days:days};
  return null;
}
function markBackedUp(){
  data.backup = {at: ymd(new Date()), count: liveDrinks().length};
  delete data.backupSnooze;
  persist();
  renderBackupBanner();
  renderStorageCard();      // 설정의 데이터 상태도 같이 갱신
}
function renderBackupBanner(){
  const box = $("#backupBanner"); if(!box) return;
  const due = backupDue();
  if(!due){ box.innerHTML = ""; return; }
  const msg = due.kind === "never"
    ? `레시피가 ${due.n}개 쌓였어요. 아직 백업 파일이 없습니다.`
    : (due.kind === "grew"
      ? `마지막 백업 뒤로 레시피가 ${due.grew}개 늘었어요.`
      : `마지막 백업이 ${due.days}일 전이에요.`);
  box.innerHTML = `<div class="banner warn"><span>💾</span><div>
      <b>백업 파일을 만들어 두세요.</b><br>${esc(msg)} ${isNativeApp() ? "앱을 지우거나" : "브라우저 데이터를 지우거나"} 기기를 바꾸면 사라집니다.
      <div class="bkbtns">
        <button class="go" id="bkNow">지금 백업</button>
        <button class="later" id="bkLater">나중에</button>
      </div></div></div>`;
  $("#bkNow").addEventListener("click", ()=>{ saveBackupFile(); });
  $("#bkLater").addEventListener("click", ()=>{
    data.backupSnooze = ymd(new Date()); persist(); renderBackupBanner();
    toast("일주일 뒤에 다시 알려드릴게요");
  });
}

function renderToday(){
  const groups = tagGroups();
  const now = new Date();
  if(!groups.length){ $("#todaySect").style.display = "none"; return; }
  $("#todaySect").style.display = "block";
  $("#todayDate").textContent = (now.getMonth()+1) + "월 " + now.getDate() + "일 기준";
  $("#todayList").innerHTML = groups.map(g=>{
    const open = addDays(now, -(g.days-1));
    return `<button class="row" data-days="${g.days}">
      <span class="emo">🗓</span>
      <span class="meta"><b>${g.days}일 · ${fmtDate(open)} 개봉분</b>
        <span>${g.items.map(s=>esc(s.name)).join(" · ")}</span></span>
      <span class="pill">오늘 폐기</span>
    </button>`;
  }).join("");
  $("#todayList").querySelectorAll(".row").forEach(b=>b.addEventListener("click", ()=>{
    state.listTab = "shelf";
    state.shelfOpen.add(Number(b.dataset.days));   // 누른 기한을 펼쳐서 보여준다
    go("list");
  }));
}

/* 기한(일수)별로 묶는다. 목록은 고정이 아니라 등록한 만큼 생긴다. */
function shelfGroups(){
  const map = {};
  data.shelf.forEach(s=>{
    const n = durDays(s.dur);
    const key = (n && n >= 1 && n <= 60) ? n : 0;   // 0 = 기한을 못 읽은 것
    (map[key] = map[key] || []).push(s);
  });
  return Object.keys(map).map(Number).sort((a,b)=>a-b).map(n=>({days:n, items:map[n]}));
}
function shelfRowHTML(s){
  return `<button class="shelfrow" data-id="${esc(s.id)}">
    ${s.place?`<span class="pl">${esc(s.place)}</span>`:""}
    <span class="nm">${esc(s.name)}</span>
    <span class="du">${esc(s.dur||"—")}</span>
  </button>`;
}
function tagTableHTML(days, now){
  return `<div class="tagset" style="margin-top:16px">
    <div class="tagset-h"><h4>${days}일택</h4><span>${days}가지 조합</span></div>
    ${tagRows(days, now).map(r=>`
      <div class="tagrow${r.today?" today":""}">
        <span class="tagno" style="background:${TAG_COLORS[(r.no-1) % TAG_COLORS.length]}">${r.no}</span>
        <span class="tagdates"><span class="o">${fmtDate(r.open)} 개봉</span><span class="x">${fmtDate(r.kill)} 폐기</span></span>
        ${r.today?`<span class="tagbadge">오늘 폐기</span>`:""}
      </div>`).join("")}
  </div>`;
}
function renderShelf(){
  const q = ($("#q").value||"").trim().toLowerCase();
  const box = $("#shelfBody");
  const now = new Date();
  const groups = shelfGroups();

  if(!data.shelf.length){
    box.innerHTML = `<div class="empty" style="padding-bottom:18px">${emptyMouse(2)}등록된 개봉 항목이 없어요.<br>오른쪽 위 + 로 추가하면<br>기한별로 여기에 묶여서 보입니다.</div>`;
    return;
  }
  let html = "";
  groups.forEach(g=>{
    const items = g.items.filter(s=>!q ||
      textHit(s.name+" "+(s.place||"")+" "+(s.dur||""), q));
    if(!items.length) return;
    const open = q ? true : state.shelfOpen.has(g.days);      // 검색 중엔 다 펼친다
    const label = g.days ? g.days + "일" : "미정";
    html += `<div class="durgrp${open?" on":""}" data-days="${g.days}">
      <button class="durgrp-h" data-toggle="${g.days}">
        <span class="dd">${esc(label)}</span>
        <span class="nm"><b>${items.length}개</b><span>${items.map(s=>esc(s.name)).join(" · ")}</span></span>
        <span class="ar">▾</span>
      </button>
      <div class="durgrp-b">
        ${items.map(shelfRowHTML).join("")}
        ${g.days ? tagTableHTML(g.days, now) : ""}
      </div>
    </div>`;
  });
  box.innerHTML = html || noResultHTML(q, "항목이");

  box.querySelectorAll("[data-toggle]").forEach(b=>b.addEventListener("click", ()=>{
    const d = Number(b.dataset.toggle);
    if(state.shelfOpen.has(d)) state.shelfOpen.delete(d); else state.shelfOpen.add(d);
    renderShelf();
  }));
  box.querySelectorAll(".shelfrow").forEach(b=>b.addEventListener("click", ()=>
    openShelfSheet(data.shelf.findIndex(x=>x.id===b.dataset.id))));
}

function renderList(){
  document.querySelectorAll("#listSeg button").forEach(b=>b.classList.toggle("on", b.dataset.tab===state.listTab));
  const tab = state.listTab;
  const shelfMode = tab === "shelf";
  const subMode   = tab === "sub";
  const memoMode  = tab === "memo";
  renderListSub();
  $("#listBody").style.display  = (!shelfMode && !subMode && !memoMode) ? "block" : "none";
  $("#subBody").style.display   = subMode   ? "block" : "none";
  $("#shelfBody").style.display = shelfMode ? "block" : "none";
  $("#memoBody").style.display  = memoMode  ? "block" : "none";
  $("#q").placeholder = shelfMode ? "항목 · 기한으로 검색"
    : (subMode ? "부재료 이름 · 쓰이는 메뉴로 검색"
    : (memoMode ? "메모 내용으로 검색" : "메뉴 이름 · 재료로 검색"));
  $("#newBtn").style.display = "flex";
  renderArchBtn();
  if(shelfMode || subMode || memoMode){
    if(shelfMode) renderShelf(); else if(memoMode) renderMemoTab(); else renderSubTab();
    $("#listBar").style.display = "flex";
    $("#selBar").style.display = "none";
    $("#selActions").classList.remove("on");
    $("#selBtn").style.display = "none";
    return;
  }
  const q = ($("#q").value||"").trim();
  const hit = visibleDrinks();
  const sm = state.selMode;
  let html = "";
  if(!liveDrinks().length && !q){                   // 처음 왔을 때는 분류 대신 길을 알려준다
    const nArch = archDrinks().length;
    $("#listBody").innerHTML = nArch
      /* 전부 보관해 둔 상태 — 데이터가 사라진 게 아니라는 걸 분명히 해준다 */
      ? `<div class="empty" style="padding:26px 18px 22px">
          ${emptyMouse(2)}
          <b style="display:block;font-size:15px;color:var(--ink);margin-bottom:8px">보이는 레시피가 없어요</b>
          ${nArch}개를 모두 보관해 두셨어요.<br>지워진 게 아니라 학습에서만 빠져 있습니다.
          <button class="cta ghost" id="emptyArch" style="margin-top:18px">보관함 열기</button>
        </div>`
      : `<div class="empty" style="padding:26px 18px 22px">
          ${emptyMouse(2)}
          <b style="display:block;font-size:15px;color:var(--ink);margin-bottom:8px">아직 레시피가 없어요</b>
          오른쪽 위 <b>+</b> 로 직접 넣거나<br>사진 속 글자를 붙여넣어 등록할 수 있어요.<br>
          어떤 앱인지 먼저 둘러보시려면 아래를 눌러보세요.
          <button class="cta ghost" id="emptySample" style="margin-top:18px">샘플 레시피 15개 넣어보기</button>
        </div>`;
    if($("#emptySample")) $("#emptySample").addEventListener("click", loadSamples);
    if($("#emptyArch")) $("#emptyArch").addEventListener("click", openArch);
    $("#listBar").style.display = "flex";
    $("#selBar").style.display = "none";
    $("#selActions").classList.remove("on");
    $("#selBtn").style.display = "none";
    return;
  }
  data.cats.forEach(c=>{
    const items = hit.filter(d=>d.cat===c.id);
    if(!items.length && q) return;                 // 검색 중일 땐 빈 분류를 숨긴다
    html += `<div class="grp"><span class="ge">${esc(c.emo)}</span>${esc(c.label)}</div>`;
    html += items.length
      ? items.map(d=>rowHTML(d,null,sm)).join("")
      : `<div class="empty" style="padding:16px;margin-bottom:9px;font-size:13px">아직 이 분류에 레시피가 없어요.</div>`;
  });
  const others = hit.filter(d=>!catOf(d.cat));
  if(others.length) html += `<div class="grp">기타</div>` + others.map(d=>rowHTML(d,null,sm)).join("");
  $("#listBody").innerHTML = html || noResultHTML(q, "레시피가");
  bindRows("#listBody", sm);

  $("#listBar").style.display = sm ? "none" : "flex";
  $("#selBar").style.display = sm ? "flex" : "none";
  $("#selActions").classList.toggle("on", sm);
  $("#selBtn").style.display = (liveDrinks().length && !sm) ? "block" : "none";
  if(sm) updateSelBar();
}
function updateSelBar(){
  const hit = visibleDrinks(), n = state.sel.size;
  $("#selCnt").textContent = n ? n + "개 선택" : "레시피 선택";
  const allOn = hit.length > 0 && hit.every(d=>state.sel.has(d.id));
  $("#selAll").textContent = allOn ? "선택 해제" : "모두 선택";
  $("#selDelete").disabled = n === 0;
  $("#selDelete").textContent = n ? n + "개 삭제" : "삭제";
  $("#selArchive").disabled = n === 0;
  $("#selArchive").textContent = n ? n + "개 보관" : "보관";
}
/* 목록 전체를 다시 그리지 않고 해당 줄만 갱신 (탭 반응이 즉각적이도록) */
function toggleSel(id){
  if(state.sel.has(id)) state.sel.delete(id); else state.sel.add(id);
  const el = document.querySelector('#listBody .row[data-id="' + id + '"]');
  if(el) el.classList.toggle("on", state.sel.has(id));
  updateSelBar();
}
function enterSel(){
  state.selMode = true; state.sel.clear();
  $("#tabs").classList.add("hide");
  renderList();
}
function exitSel(){
  if(!state.selMode) return;
  state.selMode = false; state.sel.clear();
  $("#tabs").classList.remove("hide");
  renderList();
}
$("#selBtn").addEventListener("click", enterSel);
$("#selCancel").addEventListener("click", exitSel);
$("#selAll").addEventListener("click", ()=>{
  const hit = visibleDrinks();
  const allOn = hit.length > 0 && hit.every(d=>state.sel.has(d.id));
  if(allOn) hit.forEach(d=>state.sel.delete(d.id));
  else hit.forEach(d=>state.sel.add(d.id));
  document.querySelectorAll("#listBody .row").forEach(r=>r.classList.toggle("on", state.sel.has(r.dataset.id)));
  updateSelBar();
});
$("#selArchive").addEventListener("click", ()=>{
  const ids = Array.from(state.sel);
  if(!ids.length) return;
  const first = data.drinks.find(d=>d.id===ids[0]);
  const label = ids.length === 1 ? `“${first?first.name:""}”를` : `선택한 ${ids.length}개를`;
  confirmBox("레시피 보관",
    `${label} 보관할까요? 내용은 그대로 남고 학습과 목록에서만 빠집니다.`,
    "보관", ()=>{
      setArch(ids, true);
      toast(`${ids.length}개를 보관함으로 옮겼어요`);
      exitSel(); renderHome();
    });
});
$("#selDelete").addEventListener("click", ()=>{
  const ids = Array.from(state.sel);
  if(!ids.length) return;
  const first = data.drinks.find(d=>d.id===ids[0]);
  const label = ids.length === 1 ? `“${first?first.name:""}”를` : `선택한 ${ids.length}개를`;
  confirmBox("레시피 삭제", `${label} 삭제할까요? 되돌릴 수 없어요.`, "삭제", ()=>{
    data.drinks = data.drinks.filter(d=>ids.indexOf(d.id) < 0);
    ids.forEach(id=>{ rm(data.mastered,id); rm(data.needReview,id); });
    persist();
    toast(`${ids.length}개를 삭제했어요`);
    exitSel(); renderHome();
  });
});
$("#q").addEventListener("input", renderList);
document.querySelectorAll("#listSeg button").forEach(b=>{
  b.addEventListener("click", ()=>{
    if(state.selMode) exitSel();
    state.listTab = b.dataset.tab;
    renderList();                 // 검색어는 그대로 둔다 (스와이프와 같게)
  });
});

/* =========================================================
   레시피 화면 안에서 좌우로 밀어 세그먼트 이동
   (탭과 달리 검색어는 그대로 둔다)
   ========================================================= */
const SEG_ORDER = ["recipe", "sub", "shelf", "memo"];
const segS = { on:false, axis:"", x0:0, y0:0, id:null, w:0, busy:false, dx:0 };

function segBlocked(t){
  if($("#sheet").classList.contains("on")) return true;
  if($("#mask").classList.contains("on")) return true;
  const dlg = $("#dlg"), lock = $("#lock");
  if(dlg && dlg.classList.contains("on")) return true;
  if(lock && lock.classList.contains("on")) return true;
  if(state.selMode) return true;                       // 선택 중엔 넘기지 않는다
  if(!t || !t.closest) return true;
  if(t.closest("input, textarea, select")) return true;
  return false;
}
function segNeighbor(dir){
  const i = SEG_ORDER.indexOf(state.listTab) + dir;
  return (i >= 0 && i < SEG_ORDER.length) ? SEG_ORDER[i] : null;
}
/* 민 방향으로 따라 나가고, 다음 장은 반대편에서 들어온다.
   반대로 두면 왼쪽으로 끌다 손을 뗐을 때 화면이 오른쪽으로 되돌아 건너간다.
   그때 아직 안 투명해서 내용이 제자리를 훑고 지나가 깜빡여 보인다. */
function segSlideTo(tab, dir){
  const pane = $("#listPane");
  const still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const off = 42;
  const at = px => `translate3d(${still ? 0 : px}px,0,0)`;   // 레이어를 놓지 않는다
  const out = dir < 0 ? off : -off;                    // 왼쪽으로 밀면(dir 1) 왼쪽으로 나간다
  segS.busy = true;
  pane.classList.remove("drag");
  pane.style.transform = at(out);
  pane.style.opacity = "0";
  setTimeout(()=>{
    state.listTab = tab;
    renderList();                                      // 검색어는 지우지 않는다
    pane.style.transition = "none";
    pane.style.transform = at(-out);                   // 반대편에서 시작
    /* 여기서 한 번 값을 읽어 위 두 줄을 굳힌다. 안 그러면 브라우저가 묶어 처리해
       건너뛰기가 없던 일이 되고, 나갔던 쪽에서 도로 미끄러져 들어온다 */
    void pane.offsetWidth;
    requestAnimationFrame(()=>{
      pane.style.transition = "";
      pane.style.transform = at(0);
      pane.style.opacity = "1";
      setTimeout(()=>{ segS.busy = false; }, 220);
    });
  }, still ? 120 : 190);
}
function segStart(e){
  if(segS.busy || e.touches.length !== 1) return;
  if(!$("#s-list").classList.contains("active")) return;
  if(segBlocked(e.target)) return;
  const t = e.touches[0];
  const r = $("#s-list").getBoundingClientRect();
  if(t.clientX - r.left < 24 || r.right - t.clientX < 24) return;   // 가장자리는 iOS 몫
  segS.on = true; segS.axis = ""; segS.x0 = t.clientX; segS.y0 = t.clientY;
  segS.w = r.width; segS.id = t.identifier; segS.dx = 0;
}
function segMove(e){
  if(!segS.on) return;
  const t = [...e.touches].find(x=>x.identifier===segS.id);
  if(!t) return;
  const dx = t.clientX - segS.x0, dy = t.clientY - segS.y0;
  if(!segS.axis){
    if(Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if(Math.abs(dx) < Math.abs(dy) * 1.4){ segS.on = false; return; }  // 세로 스크롤에 양보
    segS.axis = "x";
    $("#listPane").classList.add("drag");
  }
  e.preventDefault();
  const has = !!segNeighbor(dx < 0 ? 1 : -1);
  const pull = has ? 0.38 : 0.12;                       // 끝 칸에서는 거의 안 밀린다
  // 소수점 이동은 도트 그림을 반 칸씩 다시 그리게 만들어 쥐돌이가 들썩여 보인다.
  segS.dx = Math.round(dx * pull);                      // 민 거리는 여기에 들고 있는다
  $("#listPane").style.transform = `translate3d(${segS.dx}px,0,0)`;
}
function segEnd(){
  if(!segS.on) return;
  const axis = segS.axis;
  segS.on = false; segS.axis = "";
  const pane = $("#listPane");
  if(axis !== "x") return;
  const dx = segS.dx; segS.dx = 0;                     // style 을 되읽지 않는다
  pane.classList.remove("drag");
  const dir = dx < 0 ? 1 : -1;
  const next = segNeighbor(dir);
  if(next && Math.abs(dx) > segS.w * 0.06){            // 충분히 밀었으면 넘어간다
    segSlideTo(next, dir);
  } else {
    pane.style.transform = "translate3d(0px,0,0)";     // 원위치. transform 은 그대로 둔다
  }
}
$("#s-list").addEventListener("click", e=>{
  const b = e.target.closest("[data-clearq]");
  if(!b) return;
  $("#q").value = "";
  renderList();
});

(function bindSegSwipe(){
  const el = $("#s-list"); if(!el) return;
  el.addEventListener("touchstart", segStart, {passive:true});
  el.addEventListener("touchmove",  segMove,  {passive:false});
  el.addEventListener("touchend",   segEnd,   {passive:true});
  el.addEventListener("touchcancel",segEnd,   {passive:true});
})();

/* ---------- 부재료 (한 번 등록해서 여러 메뉴가 나눠 쓴다) ---------- */
function subsSorted(){
  return data.subs.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),"ko"));
}
function subMatch(s, q){
  return textHit([s.name, usesOf(s.id).map(d=>d.name).join(" "),
    (s.ing||[]).map(i=>i[0]+" "+i[1]).join(" ")].join(" "), q);
}
function renderSubTab(){
  const q = ($("#q").value||"").trim().toLowerCase();
  const hit = subsSorted().filter(s=>subMatch(s,q));
  const box = $("#subBody");
  box.innerHTML = hit.length
    ? hit.map(s=>{
        const uses = usesOf(s.id);
        return `<button class="row" data-id="${esc(s.id)}">
          <span class="subb">부재료</span>
          <span class="meta"><b>${esc(s.name)}</b><span>${uses.length
            ? uses.map(d=>esc(d.name) + (d.arch ? " 📦" : "")).join(" · ")
            : "아직 연결된 메뉴가 없어요"}</span></span>
          ${uses.length > 1 ? `<span class="pill done">${uses.length}곳</span>` : ""}
        </button>`;
      }).join("")
    : (q ? noResultHTML(q, "부재료가")
         : `<div class="empty" style="padding-bottom:18px">${emptyMouse(2)}등록된 부재료가 없어요.<br>오른쪽 위 <b>+</b> 로 자몽청처럼 따로 만들어 두는 재료를<br>한 번만 등록해 두고 여러 메뉴에 연결할 수 있어요.</div>`);
  box.querySelectorAll(".row").forEach(b=>
    b.addEventListener("click", ()=>openSubSheet(b.dataset.id)));
}
function subDetailHTML(s){
  const tag = [s.place, s.dur].filter(Boolean).join(" ");
  return `${tag ? `<div class="blk"><div class="lb">보관</div><div class="ing"><b>${esc(tag)}</b><span></span></div></div>` : ""}
    ${(s.ing||[]).length ? `<div class="blk"><div class="lb">재료 / 용량</div>
      ${(s.ing||[]).map(i=>`<div class="ing"><b>${esc(i[0])}</b><span>${esc(i[1])}</span></div>`).join("")}</div>` : ""}
    ${(s.steps||[]).length ? `<div class="blk"><div class="lb">만드는 순서</div>
      <ol class="steps">${s.steps.map(t=>`<li>${esc(t)}</li>`).join("")}</ol></div>` : ""}
    ${s.tip ? `<div class="blk"><div class="lb">기억 포인트</div><div class="tipbox">${esc(s.tip)}</div></div>` : ""}`;
}
function openSubSheet(id){
  const s = subById(id); if(!s) return;
  const uses = usesOf(s.id);
  const body = subDetailHTML(s);
  $("#sheetBody").innerHTML = `
    <h2 style="margin:0 0 2px;font-size:23px;font-weight:800;letter-spacing:-.5px">${esc(s.name)}</h2>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:18px">부재료 · 학습 카드에는 나오지 않아요</div>
    ${body || `<div class="empty" style="margin-bottom:4px">내용이 아직 비어 있어요.</div>`}
    <div class="blk" style="margin-bottom:0"><div class="lb">쓰이는 메뉴</div>
      ${uses.length
        ? `<div class="uses">${uses.map(d=>`<button data-go-id="${esc(d.id)}">${esc(d.name)}</button>`).join("")}</div>`
        : `<p class="cap" style="margin:8px 0 0">아직 연결된 메뉴가 없어요. 아래에서 골라 주세요.</p>`}
    </div>
    <button class="cta ghost" id="subLink" style="margin-top:22px">쓰이는 메뉴 고르기</button>
    <button class="cta" id="subEdit">수정하기</button>
    <button class="cta danger" id="subKill">삭제하기</button>`;
  $("#mask").classList.add("on"); $("#sheet").classList.add("on");
  $("#sheetBody").querySelectorAll("[data-go-id]").forEach(b=>
    b.addEventListener("click", ()=>{ const gid=b.dataset.goId; closeSheet(); setTimeout(()=>openSheet(gid), 220); }));
  $("#subLink").addEventListener("click", ()=>openSubLinkSheet(s.id));
  $("#subEdit").addEventListener("click", ()=>{ closeSheet(); openSubEditor(s.id, "list"); });
  $("#subKill").addEventListener("click", ()=>{
    closeSheet();
    const n = usesOf(s.id).length;
    confirmBox("부재료 삭제",
      `“${s.name}”를 삭제할까요?` + (n ? ` 연결된 메뉴 ${n}곳에서도 함께 빠집니다.` : "") + " 되돌릴 수 없어요.",
      "삭제", ()=>{ deleteSub(s.id); toast("삭제했어요"); renderList(); });
  });
}
function deleteSub(id){
  data.subs = data.subs.filter(x=>x.id!==id);
  data.drinks.forEach(d=>{ d.subRefs = (d.subRefs||[]).filter(x=>x!==id); });
  persist();
}
/* 부재료 쪽에서 메뉴를 고른다 — 같은 부재료를 쓰는 메뉴가 여럿일 때 한 번에 이어 준다 */
function openSubLinkSheet(id){
  const s = subById(id); if(!s) return;
  const picked = new Set(usesOf(s.id).map(d=>d.id));
  const draw = ()=>{
    const q = (($("#linkQ")||{}).value||"").trim();
    const list = q ? data.drinks.filter(d=>textHit([d.name,d.en||""].join(" "), q.toLowerCase())) : data.drinks;
    $("#linkList").innerHTML = list.length
      ? list.map(d=>`<button type="button" class="pick linkrow${picked.has(d.id)?" on":""}" data-id="${esc(d.id)}">
           <span class="box">✓</span>${esc(d.name)}${d.arch?" 📦":""}</button>`).join("")
      : `<p class="cap" style="margin:6px 0 0">“${esc(q)}”에 맞는 메뉴가 없어요.</p>`;
    $("#linkList").querySelectorAll(".linkrow").forEach(b=>b.addEventListener("click", ()=>{
      const did = b.dataset.id;
      if(picked.has(did)) picked.delete(did); else picked.add(did);
      draw();
    }));
    $("#linkCnt").textContent = picked.size ? picked.size + "개 선택" : "선택 안 함";
  };
  $("#sheetBody").innerHTML = `
    <h2 style="margin:0 0 2px;font-size:21px;font-weight:800;letter-spacing:-.4px">쓰이는 메뉴</h2>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:16px">“${esc(s.name)}”를 쓰는 메뉴를 모두 골라 주세요 · <span id="linkCnt"></span></div>
    ${data.drinks.length > 8 ? `<div class="search" style="margin-bottom:14px"><span style="color:var(--muted);font-size:15px">🔍</span>
      <input id="linkQ" type="search" placeholder="메뉴 이름으로 좁히기" autocomplete="off"></div>` : ""}
    <div class="pickers" id="linkList" style="margin-bottom:4px"></div>
    <button class="cta" id="linkSave" style="margin-top:20px">저장하기</button>
    <button class="cta ghost" id="linkBack">취소</button>`;
  $("#mask").classList.add("on"); $("#sheet").classList.add("on");
  draw();
  if($("#linkQ")) $("#linkQ").addEventListener("input", draw);
  $("#linkBack").addEventListener("click", ()=>openSubSheet(s.id));
  $("#linkSave").addEventListener("click", ()=>{
    data.drinks.forEach(d=>{
      const refs = (d.subRefs||[]).filter(x=>x!==s.id);
      if(picked.has(d.id)) refs.push(s.id);
      d.subRefs = refs;
    });
    persist();
    toast(picked.size ? `메뉴 ${picked.size}곳에 연결했어요` : "연결을 모두 해제했어요");
    renderList();
    openSubSheet(s.id);
  });
}

/* ---------- 개봉관리 ---------- */
/* ---------- 메모 ---------- */
function fmtMemoAt(at){
  const d = new Date(at);
  if(isNaN(d)) return "";
  const now = new Date();
  const t = String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
  if(ymd(d) === ymd(now)) return "오늘 " + t;
  const day = (d.getMonth()+1) + "월 " + d.getDate() + "일";
  return (d.getFullYear() === now.getFullYear() ? day : d.getFullYear() + "년 " + day) + " " + t;
}
function renderMemoTab(){
  const q = ($("#q").value||"").trim().toLowerCase();
  const box = $("#memoBody");
  const list = data.memos.slice().sort((a,b)=>{
    if(!!a.pin !== !!b.pin) return a.pin ? -1 : 1;          // 고정 먼저
    return String(b.at||"").localeCompare(String(a.at||""));  // 그 안에서는 최신순
  });
  const hit = q ? list.filter(m=>textHit(m.text, q)) : list;
  if(!list.length && !q){
    box.innerHTML = `<div class="empty" style="padding-bottom:18px">${emptyMouse(2)}아직 메모가 없어요.<br>인수인계, 공지, 떠오른 아이디어 —<br>오른쪽 위 <b>+</b> 로 적어두세요.</div>`;
    return;
  }
  box.innerHTML = hit.length
    ? hit.map(m=>`<button class="memorow${m.pin?" pinned":""}" data-id="${esc(m.id)}">
        <span class="mtxt">${esc(m.text)}</span>
        <span class="mat">${m.pin?`<b class="mpin">📌 고정됨</b> · `:""}${esc(fmtMemoAt(m.at))}</span>
      </button>`).join("")
    : noResultHTML(q, "메모가");
  box.querySelectorAll(".memorow").forEach(b=>b.addEventListener("click", ()=>
    openMemoSheet(data.memos.findIndex(x=>x.id===b.dataset.id))));
}
function openMemoSheet(idx){
  const isNew = (idx === null || idx < 0);
  const m = isNew ? {text:"", pin:false} : data.memos[idx];
  $("#sheetBody").innerHTML = `
    <h2 style="margin:0 0 4px;font-size:21px;font-weight:800;letter-spacing:-.4px">${isNew?"새 메모":"메모"}</h2>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:14px">${isNew?"이 기기 안에만 저장됩니다":esc(fmtMemoAt(m.at))}</div>
    <div class="fld"><textarea id="mm-text" rows="7" placeholder="인수인계, 공지, 아이디어…" style="min-height:150px">${esc(m.text)}</textarea></div>
    <div class="fld"><div class="pickers">
      <button type="button" class="pick${m.pin?" on":""}" id="mm-pin"><span class="box">✓</span>📌 맨 위에 고정</button>
    </div></div>
    <button class="cta" id="mmSave">저장</button>
    ${isNew?"":`<button class="cta danger" id="mmDel">삭제</button>`}`;
  let pin = !!m.pin;
  $("#mm-pin").addEventListener("click", ()=>{
    pin = !pin;
    $("#mm-pin").classList.toggle("on", pin);
  });
  $("#mask").classList.add("on"); $("#sheet").classList.add("on");
  if(isNew) setTimeout(()=>$("#mm-text").focus(), 250);
  $("#mmSave").addEventListener("click", ()=>{
    const text = $("#mm-text").value.trim();
    if(!text){ toast("내용을 입력해 주세요"); return; }
    if(isNew) data.memos.push({id:uid(), text:text, at:new Date().toISOString(), pin:pin});
    else { data.memos[idx].text = text; data.memos[idx].pin = pin; }   // 작성 시각은 그대로
    persist(); closeSheet(); renderList();
    toast(isNew ? "메모했어요" : "수정했어요");
  });
  const del = $("#mmDel");
  if(del) del.addEventListener("click", ()=>{
    closeSheet();
    confirmBox("메모 삭제", "이 메모를 삭제할까요?", "삭제", ()=>{
      data.memos.splice(idx,1);
      persist(); renderList(); toast("삭제했어요");
    });
  });
}

function openShelfSheet(idx){
  const s = (idx === null || idx < 0) ? {name:"", place:"냉장", dur:"", note:""} : data.shelf[idx];
  const isNew = (idx === null || idx < 0);
  $("#sheetBody").innerHTML = `
    <h2 style="margin:0 0 4px;font-size:21px;font-weight:800;letter-spacing:-.4px">${isNew?"개봉 항목 추가":"개봉 항목 수정"}</h2>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:18px">개봉하거나 만든 뒤 언제까지 쓸 수 있는지</div>
    <div class="fld"><label>항목 이름 *</label>
      <input type="text" id="sh-name" value="${esc(s.name)}" placeholder="예: 개봉한 우유" autocomplete="off"></div>
    <div class="fld"><label>보관 장소</label>
      <div class="pickers" id="sh-place"></div></div>
    <div class="fld"><label>기한 *</label>
      <input type="text" id="sh-dur" value="${esc(s.dur||"")}" placeholder="예: 5일 · 8시간 · 당일" autocomplete="off"></div>
    <div class="fld"><label>메모</label>
      <textarea id="sh-note" placeholder="라벨 표기, 예외 상황 등">${esc(s.note||"")}</textarea></div>
    <button class="cta" id="shSave">저장</button>
    ${isNew?"":`<button class="cta danger" id="shDel">삭제</button>`}`;
  let place = s.place || "";
  const drawPlaces = ()=>{
    $("#sh-place").innerHTML = PLACES.map(pn=>
      `<button type="button" class="pick${place===pn?" on":""}" data-p="${pn}"><span class="box">✓</span>${pn}</button>`).join("");
    $("#sh-place").querySelectorAll(".pick").forEach(b=>b.addEventListener("click",()=>{
      place = (place === b.dataset.p) ? "" : b.dataset.p; drawPlaces();
    }));
  };
  drawPlaces();
  $("#mask").classList.add("on"); $("#sheet").classList.add("on");
  $("#shSave").addEventListener("click", ()=>{
    const name = $("#sh-name").value.trim();
    const dur  = $("#sh-dur").value.trim();
    if(!name){ toast("항목 이름을 입력해 주세요"); return; }
    if(!dur){ toast("기한을 입력해 주세요"); return; }
    const rec = {id: isNew ? uid() : s.id, name:name, place:place, dur:dur, note:$("#sh-note").value.trim()};
    if(isNew) data.shelf.push(rec); else data.shelf[idx] = rec;
    persist(); closeSheet(); renderList(); renderHome();
    toast(isNew ? "추가했어요" : "수정했어요");
  });
  const del = $("#shDel");
  if(del) del.addEventListener("click", ()=>{
    closeSheet();
    confirmBox("개봉 항목 삭제", `“${s.name}”를 삭제할까요?`, "삭제", ()=>{
      const cid = "shelf:"+s.id;
      data.shelf.splice(idx,1);
      rm(data.mastered,cid); rm(data.needReview,cid);
      persist(); renderList(); renderHome(); toast("삭제했어요");
    });
  });
}

/* + 를 누르면 입력 방식을 고르는 시트 */
$("#newBtn").addEventListener("click", ()=>{
  if(state.listTab === "shelf"){ openShelfSheet(null); return; }
  if(state.listTab === "memo"){ openMemoSheet(null); return; }
  if(state.listTab === "sub"){ openSubEditor(null, "list"); return; }
  $("#sheetBody").innerHTML = `
    <h2 style="margin:0 0 4px;font-size:21px;font-weight:800;letter-spacing:-.4px">레시피 추가</h2>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:20px">어떻게 넣을까요?</div>
    <button class="row" id="addManual">
      <span class="emo">✏️</span>
      <span class="meta"><b>직접 입력하기</b><span>재료와 순서를 하나씩 입력합니다</span></span>
    </button>
    <button class="row" id="addPhoto" style="margin-bottom:4px">
      <span class="emo">📷</span>
      <span class="meta"><b>사진에서 가져오기</b><span>사진 속 글자를 복사해 붙여넣으면 자동 정리</span></span>
    </button>`;
  $("#mask").classList.add("on"); $("#sheet").classList.add("on");
  $("#addManual").addEventListener("click", ()=>{ closeSheet(); openEditor(null); });
  $("#addPhoto").addEventListener("click", ()=>{ closeSheet(); openImport(); });
});

/* ---------- 상세 시트 ---------- */
function openSheet(id){
  if(String(id).indexOf("shelf:") === 0){
    const sid = String(id).slice(6);
    const i = data.shelf.findIndex(x=>x.id===sid);
    if(i >= 0) openShelfSheet(i);
    return;
  }
  const d = data.drinks.find(x=>x.id===id); if(!d) return;
  $("#sheetBody").innerHTML = `
    <h2 style="margin:0 0 2px;font-size:23px;font-weight:800;letter-spacing:-.5px">${esc(d.name)}</h2>
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:18px">${[enText(d.en),d.temp,cupText(d)].filter(Boolean).map(esc).join(" · ")}</div>
    ${d.arch ? `<div class="banner ok" style="margin:0 0 18px"><span>📦</span><div><b>보관 중인 레시피예요.</b><br>학습과 레시피 목록에는 나오지 않습니다.</div></div>` : ""}
    ${detailHTML(d)}
    <button class="cta" id="sheetEdit" style="margin-top:22px">수정하기</button>
    ${d.arch ? "" : `<button class="cta ghost" id="sheetStudy">이 메뉴만 학습</button>`}
    <button class="cta ghost" id="sheetArch">${d.arch ? "보관 해제하기" : "보관하기"}</button>
    <button class="cta danger" id="sheetDel">삭제하기</button>`;
  $("#mask").classList.add("on"); $("#sheet").classList.add("on");
  $("#sheetEdit").addEventListener("click", ()=>{ closeSheet(); openEditor(d.id); });
  if($("#sheetStudy")) $("#sheetStudy").addEventListener("click", ()=>{
    closeSheet();
    setTimeout(()=>openModeSheet([d], d.name), 220);   // 시트를 닫았다가 방식 시트로 갈아끼운다
  });
  $("#sheetArch").addEventListener("click", ()=>{
    closeSheet();
    if(d.arch){
      setArch(d.id, false);
      toast("보관을 해제했어요");
      renderArch(); renderList(); renderHome();
      return;
    }
    confirmBox("레시피 보관",
      `“${d.name}”를 보관할까요? 내용은 그대로 남고 학습과 목록에서만 빠집니다. 보관함에서 언제든 되돌릴 수 있어요.`,
      "보관", ()=>{
        setArch(d.id, true);
        toast("보관함으로 옮겼어요");
        renderList(); renderHome();
      });
  });
  $("#sheetDel").addEventListener("click", ()=>{
    closeSheet();
    confirmBox("레시피 삭제", `“${d.name}”를 삭제할까요? 되돌릴 수 없어요.`, "삭제", ()=>{
      data.drinks = data.drinks.filter(x=>x.id!==d.id);
      rm(data.mastered,d.id); rm(data.needReview,d.id);
      persist(); toast("삭제했어요");
      if($("#s-arch").classList.contains("active")) renderArch();
      renderList(); renderHome();
    });
  });
}
function closeSheet(){ $("#mask").classList.remove("on"); $("#sheet").classList.remove("on"); }
$("#mask").addEventListener("click", closeSheet);

