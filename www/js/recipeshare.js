/* 암기쥐 — 레시피 보내기 · 받기 (1.3 · 앱 전용)
   고른 레시피를 파일(.amgijwi) 하나로 묶어 iOS 공유 시트로 보낸다(ShareBridge.swift). 카톡 · 에어드롭 · 메시지 · 메일 ·
   파일에 저장 중 어디로 보낼지는 사용자가 고른다. 서버는 없다.
   받은 사람이 파일을 누르면 앱(SceneDelegate · WebAppViewController.openRecipeFile)이 내용을 읽어 recipesFromApp 을 부르고,
   여기서 가져올 레시피를 고르게 한다. 설정의 "레시피 가져오기"로 파일을 골라도 된다.
   같이 가는 것: 레시피(이름 · ICE/HOT · 컵 · 재료와 용량 · 제조 순서 · 기억 포인트 · 분류)와 그 레시피가 쓰는 부재료.
   가지 않는 것: 외운 기록 · 학습 기록 · 개봉관리 · 메모 · 일정 · 치즈 · 옷장 */

const SHARE_KIND = "amgijwi.recipes", SHARE_MAX = 300;
const APP_STORE_URL = "https://apps.apple.com/kr/app/id6817266810";

function shareOn(){ return isDot() && !!shareBridge(); }

/* ---------- 보내기 ---------- */
function recipePack(ids){
  const want = new Set(ids.map(String));
  const drinks = data.drinks.filter(d=>want.has(String(d.id))).slice(0, SHARE_MAX);
  return {
    kind: SHARE_KIND, v: 1, n: drinks.length,
    drinks: drinks.map(d=>{
      const cat = data.cats.filter(c=>c.id === d.cat)[0];
      return {
        name: d.name, en: d.en || "", temp: d.temp || "", cups: (d.cups || []).slice(),
        ing: (d.ing || []).map(p=>[String(p[0] || ""), String(p[1] || "")]),
        ingHot: (d.ingHot || []).map(p=>[String(p[0] || ""), String(p[1] || "")]),
        steps: (d.steps || []).map(String), tip: d.tip || "",
        cat: cat ? {label: cat.label, emo: cat.emo} : null,
        /* 부재료는 레시피 안에 담아 보낸다. 받는 쪽은 liftSubs 로 자기 목록에 합친다(같은 이름 · 같은 배합이면 하나로) */
        subs: subsOf(d).map(s=>({name: s.name, ing: s.ing, steps: s.steps, tip: s.tip, place: s.place, dur: s.dur}))
      };
    })
  };
}
function sendRecipes(ids){
  const br = shareBridge();
  if(!br || !ids.length) return;
  const pack = recipePack(ids);
  haptic("light");
  br.postMessage({
    kind: "recipes",
    name: "카페 레시피 " + pack.n + "개.amgijwi",
    text: JSON.stringify(pack),
    /* 파일과 같이 가는 한 줄. 앱이 없는 사람이 바로 받을 수 있게 앱스토어 주소를 붙인다(파일에 저장 · 에어드롭에는 안 붙는다) */
    note: "암기쥐에서 열면 레시피 " + pack.n + "개를 가져올 수 있어요.\n앱이 없으면: " + APP_STORE_URL
  });
}
/* 공유 시트가 닫혔을 때(settings.js 의 shareDoneFromApp 이 넘겨준다) */
function recipeShareDone(ok){
  if(ok){ toast("레시피를 보냈어요"); if(state.selMode) exitSel(); }
}

/* ---------- 받기 ---------- */
let recipeIncoming = null, recipePendingText = null;
/* 받은 파일 → 레시피 목록. 형식이 아니면 null */
function readRecipePack(text){
  let p;
  try{ p = JSON.parse(text); }catch(e){ return null; }
  if(!p || p.kind !== SHARE_KIND || !Array.isArray(p.drinks)) return null;
  const s = v=>String(v === undefined || v === null ? "" : v);
  const pairs = a=>Array.isArray(a) ? a.filter(x=>Array.isArray(x)).map(x=>[s(x[0]), s(x[1])]).filter(x=>x[0] || x[1]) : [];
  const drinks = p.drinks.slice(0, SHARE_MAX).map(d=>d && typeof d === "object" ? {
    name: s(d.name).trim().slice(0, 80), en: s(d.en).slice(0, 80), temp: s(d.temp).slice(0, 12),
    cups: Array.isArray(d.cups) ? d.cups.map(s).slice(0, 8) : [],
    ing: pairs(d.ing), ingHot: pairs(d.ingHot),
    steps: Array.isArray(d.steps) ? d.steps.map(s).filter(Boolean) : [], tip: s(d.tip),
    cat: d.cat && typeof d.cat === "object" ? {label: s(d.cat.label).slice(0, 20), emo: safeEmo(s(d.cat.emo))} : null,
    subs: Array.isArray(d.subs) ? d.subs.filter(x=>x && typeof x === "object").map(x=>({
      name: s(x.name).trim(), ing: pairs(x.ing), steps: Array.isArray(x.steps) ? x.steps.map(s) : [], tip: s(x.tip), place: s(x.place), dur: s(x.dur)
    })).filter(x=>x.name) : []
  } : null).filter(d=>d && d.name && d.ing.length);
  return drinks.length ? drinks : null;
}
/* 분류 아이콘: "@이름"은 앱에 있는 그림만(없으면 컵), 그 밖은 글자 그대로(catMark 가 이스케이프한다) */
function safeEmo(v){
  if(v.charAt(0) !== "@") return v.slice(0, 8);
  return Object.prototype.hasOwnProperty.call(ICONS, v.slice(1)) ? v : "@cup";
}
/* 같은 레시피인가: 이름과 ICE/HOT 이 같으면. 아메리카노 ICE · HOT 을 따로 둔 매장도 있다 */
const recipeKey = (n, t)=>String(n || "").trim().toLowerCase() + "|" + String(t || "").trim().toUpperCase();
function recipeOwned(d){ return data.drinks.filter(x=>recipeKey(x.name, x.temp) === recipeKey(d.name, d.temp))[0] || null; }

/* 앱이 받은 파일 내용을 넘긴다(WebAppViewController.openRecipeFile). 이 이름은 그쪽에도 적혀 있다.
   잠금 화면 · 이름 묻는 창 · 처음 가이드에 가려 있으면 닫힌 뒤에 연다 */
function recipesFromApp(text){
  if(!isDot()) return;
  recipePendingText = String(text || "");
  recipeGo();
}
/* 잠금 · 이름 묻는 창 · 처음 가이드에 가려 있거나, 하던 일(학습 · 편집 · 가져오기 화면, 열린 시트 · 확인창)이 있으면
   기다렸다가 그것이 끝난 뒤(closeLock · closeNickAsk · closeGuide · 화면을 옮길 때 shell.js 의 go)에 연다 */
function recipeGo(){
  const text = recipePendingText;
  if(text === null) return;
  const lockEl = $("#lock"), guide = $("#onboard");
  if((lockEl && lockEl.classList.contains("on")) || nickAskOpen() || (guide && !guide.hidden)) return;
  if(WIDGET_BUSY.some(n=>$("#s-" + n).classList.contains("active")) || $("#sheet").classList.contains("on") || $("#dlg").classList.contains("on")) return;
  recipePendingText = null;
  openRecipeImport(text);
}
function openRecipeImport(text){
  const drinks = readRecipePack(text);
  if(!drinks){ haptic("error"); toast("암기쥐 레시피 파일이 아니에요"); return; }
  if(state.selMode) exitSel();
  recipeIncoming = drinks.map(d=>{ const have = !!recipeOwned(d); return {d: d, have: have, on: !have}; });
  renderRecipeImport();
  $("#mask").classList.add("on"); $("#sheet").classList.add("on");
}
function renderRecipeImport(){
  const list = recipeIncoming || [], n = list.filter(x=>x.on).length;
  $("#sheetBody").innerHTML = `
    <h2 style="margin:0 0 4px;font-size:21px;font-weight:800;letter-spacing:-.4px">레시피 ${list.length}개를 받았어요</h2>
    <div class="rsnote">가져올 것을 고르세요. 외운 기록 · 학습 기록은 따라오지 않아요.</div>
    <div class="rslist">${list.map((x, i)=>`<label class="rsrow"><input type="checkbox" data-i="${i}"${x.on ? " checked" : ""}>
      <span class="nm">${esc(x.d.name)}${x.d.temp ? ` <small>${esc(x.d.temp)}</small>` : ""}</span><span class="tg${x.have ? " have" : ""}">${x.have ? "이미 있어요" : "새로"}</span></label>`).join("")}</div>
    ${list.some(x=>x.have) ? `<div class="rsnote">이미 있는 레시피는 고르면 받은 것으로 바꿔요(외운 기록은 그대로)</div>` : ""}
    <button class="cta" id="rsGo"${n ? "" : " disabled"}>${n ? n + "개 가져오기" : "고른 레시피가 없어요"}</button>
    <button class="cta ghost" id="rsNo">닫기</button>`;
  /* 고를 때는 버튼만 고친다(수백 줄을 다시 그리면 느리고 스크롤이 튄다) */
  const goBtn = ()=>{ const k = recipeIncoming.filter(x=>x.on).length; $("#rsGo").disabled = !k; $("#rsGo").textContent = k ? k + "개 가져오기" : "고른 레시피가 없어요"; };
  document.querySelectorAll("#sheetBody .rsrow input").forEach(c=>c.addEventListener("change", ()=>{
    recipeIncoming[Number(c.dataset.i)].on = c.checked; haptic("selection"); goBtn();
  }));
  $("#rsGo").addEventListener("click", ()=>{
    const r = importRecipes((recipeIncoming || []).filter(x=>x.on).map(x=>x.d));
    recipeIncoming = null; closeSheet();
    haptic("success");
    toast(r.added && r.replaced ? `레시피 ${r.added}개를 가져오고 ${r.replaced}개를 바꿨어요`
        : r.replaced ? `레시피 ${r.replaced}개를 바꿨어요` : `레시피 ${r.added}개를 가져왔어요`);
    state.listTab = "recipe"; go("list");
  });
  $("#rsNo").addEventListener("click", ()=>{ recipeIncoming = null; closeSheet(); });
}
/* 고른 레시피를 들인다. 같은 레시피(이름 · ICE/HOT)가 있으면 받은 내용으로 바꾸되 id · 외운 기록 · 보관 · 등록한 날 ·
   원래 이어 둔 부재료는 그대로 둔다. 한 파일에 같은 레시피가 두 번 있으면 뒤의 것이 이긴다 */
function importRecipes(drinks){
  let added = 0, replaced = 0;
  const today = ymd(new Date()), byKey = {};
  const fresh = drinks.map(d=>{
    let cat = d.cat ? data.cats.filter(c=>c.label === d.cat.label)[0] : null;
    if(d.cat && !cat && d.cat.label){ cat = {id: uid(), label: d.cat.label, emo: safeEmo(d.cat.emo || "@cup")}; data.cats.push(cat); }
    const key = recipeKey(d.name, d.temp), old = recipeOwned(d);
    const id = old ? old.id : (byKey[key] || uid());
    byKey[key] = id;
    return {
      id: id, cat: cat ? cat.id : (old ? old.cat : (data.cats[0] || {}).id),
      name: d.name, en: d.en, temp: d.temp, cups: d.cups, ing: d.ing, ingHot: d.ingHot, steps: d.steps, tip: d.tip,
      arch: old ? !!old.arch : false, at: old ? (old.at || "") : today,
      subRefs: old ? (old.subRefs || []).slice() : [],
      subs: d.subs          // liftSubs 가 data.subs 로 옮기고 subRefs 에 더한다
    };
  });
  liftSubs({subs: data.subs, drinks: fresh});
  const had = new Set(data.drinks.map(x=>x.id));
  fresh.forEach(r=>{
    const i = data.drinks.findIndex(x=>x.id === r.id);
    if(i >= 0) data.drinks[i] = r; else data.drinks.push(r);
  });
  new Set(fresh.map(r=>r.id)).forEach(id=>{ if(had.has(id)) replaced++; else added++; });
  persist();
  return {added: added, replaced: replaced};
}

/* ---------- 버튼 ---------- */
/* 레시피 탭 "선택" 아래 · 레시피 하나를 열었을 때(list.js 가 부른다) */
$("#selShare").addEventListener("click", ()=>{
  if(!state.sel.size) return;
  sendRecipes(Array.from(state.sel));
});
$("#rsFile").addEventListener("click", ()=>$("#rsInput").click());
$("#rsInput").addEventListener("change", e=>{
  const f = e.target.files && e.target.files[0]; if(!f) return;
  if(f.size > 2000000){ e.target.value = ""; haptic("error"); toast("암기쥐 레시피 파일이 아니에요"); return; }      // 앱으로 열 때와 같은 한도
  const rd = new FileReader();
  rd.onload = ()=>{ e.target.value = ""; openRecipeImport(String(rd.result)); };
  rd.onerror = ()=>toast("파일을 읽지 못했어요");
  rd.readAsText(f);
});
