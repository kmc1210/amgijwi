/* 암기쥐 — 저장소 · 샘플 데이터 · 상태 · 부재료 공용 목록
   나머지 파일이 여기서 만든 data / state / 헬퍼를 그대로 쓴다. 가장 먼저 로드한다. */

"use strict";
/* =========================================================
   암기쥐 — 전부 기기 안에서만 동작합니다.
   네트워크 요청 없음 / 외부 스크립트 없음 / 서버 없음
   ========================================================= */

const DEFAULT_CATS = [
  {id:"coffee", label:"커피",        emo:"☕️"},
  {id:"ade",    label:"에이드·주스", emo:"🍋"},
  {id:"tea",    label:"티·기타",     emo:"🍵"}
];
/* 영문 이름 표기: 저장된 글자는 그대로 두고 보이는 모양만 바꾼다 */
function enText(s){
  if(!s) return "";
  if(data.enCase === "upper") return s.toUpperCase();
  if(data.enCase === "lower") return s.toLowerCase();
  return s;
}
const PLACES = ["냉장","냉동","실온"];
/* 기한 문자열에서 '일' 수를 뽑는다. 시간·초 단위면 null */
function durDays(s){
  const m = String(s||"").match(/(\d+)\s*일/);
  return m ? parseInt(m[1],10) : null;
}
function addDays(d, n){ const x=new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate()+n); return x; }
function fmtDate(d){
  const p=x=>String(x).padStart(2,"0");
  return String(d.getFullYear()).slice(2)+"."+p(d.getMonth()+1)+"."+p(d.getDate());
}
const TAG_COLORS = ["#E1832E","#E0A82E","#3E9E6B","#4A9BD1","#3C5A94","#7A4E9E","#C4483E"];
function cupList(d){ return Array.isArray(d.cups) ? d.cups.filter(Boolean) : (d.cup ? [d.cup] : []); }
function cupText(d){ return cupList(d).join(" · "); }
function catOf(id){ for(let i=0;i<data.cats.length;i++){ if(data.cats[i].id===id) return data.cats[i]; } return null; }
function catLabel(id){ const c=catOf(id); return c ? c.label : ""; }
function catEmo(id){ const c=catOf(id); return c ? c.emo : "🥤"; }
function firstCatId(){ return data.cats.length ? data.cats[0].id : "etc"; }
const KEY = "brewnote.v1";

/* ---------- 실행 환경 ----------
   같은 www 를 웹과 iOS 앱이 함께 쓴다. 기능은 같지만 설명하는 말이 다르다.
   웹에서는 "브라우저 데이터를 지우면" 이 맞고, 앱에서는 "앱을 지우면" 이 맞다.
   앱이 문서가 뜨기 전에 표시를 심는다 (ios/Sources/WebAppViewController.swift). */
function isNativeApp(){ return window.__amgijwiNative === true; }

/* ---------- 저장소 (localStorage, 실패 시 메모리) ---------- */
const Store = (()=>{
  let ok = false, mem = null;
  try{ localStorage.setItem("__bn_t","1"); localStorage.removeItem("__bn_t"); ok = true; }catch(e){ ok = false; }
  return {
    get available(){ return ok; },
    load(){
      if(ok){ try{ const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null; }catch(e){ return null; } }
      return mem;
    },
    save(d){
      mem = d;
      if(ok){ try{ localStorage.setItem(KEY, JSON.stringify(d)); return true; }catch(e){ ok = false; return false; } }
      return false;
    },
    clear(){ mem = null; if(ok){ try{ localStorage.removeItem(KEY); }catch(e){} } }
  };
})();

/* ---------- 샘플 데이터 (설정에서 지울 수 있음) ---------- */
function seed(){
  const S = (cat,name,en,temp,cup,ing,steps,tip)=>
    ({id:uid(), cat, name, en, temp, cups: cup?[cup]:[], ing, steps, tip, subRefs:[]});
  return [
    S("coffee","에스프레소","Espresso","HOT","데미타세 60ml",
      [["원두 도징","18 g"],["추출량","36 g"],["추출 시간","25~30초"]],
      ["포터필터를 마른 행주로 닦고 원두 18g 도징","레벨링 후 수평 탬핑","즉시 그룹헤드 체결, 3초 내 추출 시작","36g이 25~30초에 떨어지는지 확인"],
      "추출이 20초 미만이면 분쇄도를 가늘게, 35초를 넘으면 굵게 조정."),
    S("coffee","아메리카노","Iced Americano","ICE","16oz",
      [["에스프레소","2샷 (36g)"],["정수","200 ml"],["얼음","130 g"]],
      ["컵에 얼음 130g을 채운다","정수 200ml를 붓는다","에스프레소 2샷을 얼음 위로 천천히 붓는다"],
      "에스프레소를 마지막에 부어야 크레마 층이 살아 있고 향이 오래 남는다."),
    S("coffee","카페라떼","Cafe Latte","HOT","12oz",
      [["에스프레소","2샷 (36g)"],["스팀밀크","220 ml"],["우유 온도","60~65℃"],["폼 두께","0.5 cm"]],
      ["우유 220ml를 피처에 붓고 스팀 시작","공기 주입은 2~3초만, 이후 롤링","65℃에서 종료 후 피처를 굴려 폼 정리","에스프레소 위로 낮게 붓다가 마무리에 들어올린다"],
      "공기 주입이 길면 폼이 두꺼워져 카푸치노가 된다. 라떼는 벨벳 질감이 핵심."),
    S("coffee","카푸치노","Cappuccino","HOT","8oz",
      [["에스프레소","2샷 (36g)"],["스팀밀크","150 ml"],["폼 두께","1.5 cm"]],
      ["우유 150ml 스팀, 공기 주입 5~6초로 폼을 넉넉히","에스프레소 2샷 추출","우유를 부어 폼이 1.5cm 올라오게 마무리"],
      "잔이 라떼보다 작다. 8oz 잔인지 먼저 확인."),
    S("coffee","바닐라라떼","Vanilla Latte","ICE","16oz",
      [["바닐라 시럽","25 ml (5펌프)"],["에스프레소","2샷 (36g)"],["우유","200 ml"],["얼음","120 g"]],
      ["컵 바닥에 바닐라 시럽 25ml","에스프레소 2샷을 넣고 저어 녹인다","얼음 120g, 우유 200ml"],
      "시럽을 에스프레소와 먼저 섞어야 바닥에 가라앉지 않는다."),
    S("coffee","카페모카","Cafe Mocha","ICE","16oz",
      [["초코 소스","30 ml"],["에스프레소","2샷 (36g)"],["우유","190 ml"],["얼음","120 g"],["휘핑크림","1회전"]],
      ["초코 소스 30ml + 에스프레소 2샷을 완전히 용해","얼음 120g, 우유 190ml","휘핑크림 1회전 후 초코 드리즐"],
      "소스가 덜 녹으면 마지막 한 모금만 달아진다. 완전히 저을 것."),
    S("coffee","아인슈페너","Einspanner","ICE","12oz",
      [["에스프레소","2샷 (36g)"],["정수","120 ml"],["크림폼","60 ml"],["얼음","100 g"]],
      ["생크림+설탕을 6부 휘핑","컵에 얼음 100g, 물 120ml, 에스프레소 2샷","크림폼 60ml를 스푼에 받쳐 층지게 올린다"],
      "크림이 가라앉으면 휘핑 부족. 스푼에서 천천히 흐르는 정도가 기준."),
    S("coffee","콜드브루 라떼","Cold Brew Latte","ICE","16oz",
      [["콜드브루 원액","90 ml"],["우유","180 ml"],["얼음","130 g"]],
      ["컵에 얼음 130g","우유 180ml","콜드브루 원액 90ml를 위로 부어 층을 만든다"],
      "원액 농도는 매장마다 다름. 기본은 원액:우유 = 1:2."),
    S("ade","자몽에이드","Grapefruit Ade","ICE","16oz",
      [["자몽청","60 ml"],["탄산수","200 ml"],["얼음","130 g"],["자몽 슬라이스","1 조각"]],
      ["컵에 자몽청 60ml","얼음 130g","탄산수 200ml를 벽면을 타고 천천히","자몽 슬라이스 가니시"],
      "탄산수를 세게 부으면 탄산이 날아간다. 얼음 벽을 타고 흘려 넣을 것."),
    S("ade","청귤에이드","Green Tangerine Ade","ICE","16oz",
      [["청귤청","55 ml"],["탄산수","200 ml"],["얼음","130 g"],["애플민트","1 장"]],
      ["청귤청 55ml","얼음 130g","탄산수 200ml, 애플민트 가니시"],
      "청귤은 산미가 강해 자몽보다 5ml 적게 쓴다."),
    S("ade","레몬에이드","Lemonade","ICE","16oz",
      [["레몬청","60 ml"],["탄산수","200 ml"],["얼음","130 g"],["레몬 슬라이스","1 조각"]],
      ["레몬청 60ml, 얼음 130g, 탄산수 200ml","가볍게 1회만 저어 층을 살린다"],
      "많이 저으면 탄산이 죽는다. 1회전이면 충분."),
    S("tea","복숭아 아이스티","Peach Iced Tea","ICE","16oz",
      [["아이스티 파우더","30 g"],["정수","250 ml"],["얼음","130 g"]],
      ["셰이커에 파우더 30g + 정수 50ml를 먼저 녹인다","남은 물 200ml와 얼음을 넣고 10회 셰이크","컵에 얼음과 함께 붓는다"],
      "파우더는 소량의 물에 먼저 풀어야 덩어리가 지지 않는다."),
    S("tea","밀크티","Milk Tea","ICE","16oz",
      [["홍차 원액","90 ml"],["우유","180 ml"],["설탕 시럽","15 ml"],["얼음","120 g"]],
      ["홍차 원액 90ml에 시럽 15ml","얼음 120g, 우유 180ml","가볍게 저어 마무리"],
      "원액은 찻잎 12g / 물 300ml, 5분 우림 기준으로 미리 만들어 둔다."),
    S("tea","딸기라떼","Strawberry Latte","ICE","16oz",
      [["딸기청","70 ml"],["우유","200 ml"],["얼음","120 g"]],
      ["컵 바닥에 딸기청 70ml","얼음 120g","우유 200ml를 스푼에 받쳐 천천히 부어 층 분리"],
      "층이 섞이면 안 된다. 우유는 얼음 위 스푼에 받쳐 흘려 넣을 것."),
    S("tea","말차라떼","Matcha Latte","HOT","12oz",
      [["말차 파우더","12 g"],["뜨거운 물","20 ml"],["스팀밀크","210 ml"]],
      ["말차 12g을 체에 내려 덩어리 제거","70~80℃ 물 20ml로 차선을 W자로 저어 페이스트","스팀밀크 210ml를 부어 마무리"],
      "끓는 물을 쓰면 쓴맛이 강해진다. 70~80℃가 적정.")
  ];
}

function uid(){
  const a = new Uint8Array(8);
  (self.crypto||{}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_,i)=>a[i]=Math.floor(Math.random()*256));
  return Array.from(a).map(b=>b.toString(16).padStart(2,"0")).join("");
}

/* ---------- 상태 ---------- */
let data = Store.load();
if(!data || !Array.isArray(data.drinks)){
  data = {v:1, drinks:seed(), mastered:[], needReview:[]};
  Store.save(data);
}
data.mastered = data.mastered || [];
data.needReview = data.needReview || [];
if(data.mode !== "blank") data.mode = "flip";
if(["cream","dark","green"].indexOf(data.theme) < 0) data.theme = "cream";
if(["as-is","upper","lower"].indexOf(data.enCase) < 0) data.enCase = "as-is";
/* 소리는 꺼진 채로 시작한다. 카페 근무 중에 갑자기 울리면 곤란하다 */
if(["off","sfx","all"].indexOf(data.sound) < 0) data.sound = "off";
/* 처음 한 번만 보여주는 안내를 본 기록. 한 번 본 것은 다시 나오지 않는다 */
if(!Array.isArray(data.hints)) data.hints = [];
/* 일정 — 날짜 하나짜리. 되풀이는 아직 없다.
   remind 는 며칠 전부터 홈에 띄울지다. 0 이면 당일에만 뜬다 */
if(!Array.isArray(data.events)) data.events = [];
data.events = data.events.filter(e => e && typeof e.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.date));
data.events.forEach(e=>{
  if(!e.id) e.id = uid();
  e.title = String(e.title || "").slice(0, 60) || "일정";
  e.note = String(e.note || "").slice(0, 300);
  e.remind = Math.min(30, Math.max(0, Number(e.remind) || 0));
  e.done = !!e.done;
});
/* 날씨 옷 — off(기본) · auto · clear · rain · snow.
   소리처럼 꺼진 채로 시작한다. 묻지도 않고 옷을 갈아입히면 놀란다 */
if(["off","auto","clear","rain","snow"].indexOf(data.wx) < 0) data.wx = "off";
if(!Array.isArray(data.cats) || !data.cats.length){
  data.cats = DEFAULT_CATS.map(c=>({id:c.id, label:c.label, emo:c.emo}));
}
if(!Array.isArray(data.shelf)) data.shelf = [];
data.shelf.forEach(s=>{ if(!s.id) s.id = uid(); });
if(!Array.isArray(data.memos)) data.memos = [];     // 예전 백업에는 없는 항목 — 빈 목록으로 시작
data.memos.forEach(m=>{ if(!m.id) m.id = uid(); if(typeof m.text !== "string") m.text = ""; m.pin = !!m.pin; });
data.drinks.forEach(d=>{
  if(!Array.isArray(d.cups)) d.cups = d.cup ? [String(d.cup)] : [];
  d.arch = !!d.arch;               // 보관한 레시피 — 학습과 목록에서 빠진다
});

/* ---------- 부재료 공용 목록 ----------
   예전에는 부재료를 레시피 안에 하나씩 박아 넣었다. 같은 자몽청을 쓰는 메뉴가 다섯 개면
   다섯 번 입력해야 했다. 이제는 부재료를 한 곳(data.subs)에 두고 레시피가 그것을
   가리킨다(d.subRefs). 예전 데이터는 앱을 처음 열 때 한 번 옮겨진다. */
function subSig(s){
  return JSON.stringify([(s.ing||[]), (s.steps||[]), s.tip||"", s.place||"", s.dur||""]);
}
function uniqueSubName(list, nm){
  const taken = new Set(list.map(x=>String(x.name||"").trim().toLowerCase()));
  if(!taken.has(nm.toLowerCase())) return nm;
  let n = 2;
  while(taken.has((nm+" "+n).toLowerCase())) n++;
  return nm+" "+n;
}
/* 이름과 내용이 같으면 하나로 합치고, 이름은 같은데 배합이 다르면 "자몽청 2"처럼 따로 남긴다 */
function liftSubs(root){
  if(!Array.isArray(root.subs)) root.subs = [];
  const byKey = new Map();
  root.subs.forEach(s=>byKey.set(String(s.name||"").trim().toLowerCase()+"|"+subSig(s), s.id));
  let moved = 0, split = 0;
  (root.drinks||[]).forEach(d=>{
    const refs = Array.isArray(d.subRefs) ? d.subRefs.slice() : [];
    const embedded = Array.isArray(d.subs) ? d.subs : [];
    embedded.forEach(s=>{
      const nm = String(s.name||"").trim();
      if(!nm) return;
      const key = nm.toLowerCase()+"|"+subSig(s);
      let id = byKey.get(key);
      if(!id){
        const finalName = uniqueSubName(root.subs, nm);
        if(finalName !== nm) split++;
        id = (s.id && !root.subs.some(x=>x.id===s.id)) ? s.id : uid();
        root.subs.push({id:id, name:finalName,
          ing:(s.ing||[]).map(p=>[String(p[0]||""),String(p[1]||"")]),
          steps:(s.steps||[]).map(String), tip:String(s.tip||""),
          place:String(s.place||""), dur:String(s.dur||"")});
        byKey.set(key, id);
      }
      if(refs.indexOf(id) < 0) refs.push(id);
    });
    if(embedded.length) moved += embedded.length;
    d.subRefs = refs;
    delete d.subs;
  });
  return {moved:moved, split:split};
}
const _lift = liftSubs(data);
data.subs.forEach(s=>{
  if(!s.id) s.id = uid();
  if(typeof s.name !== "string") s.name = String(s.name||"");
  if(!Array.isArray(s.ing)) s.ing = [];
  if(!Array.isArray(s.steps)) s.steps = [];
  if(typeof s.tip !== "string") s.tip = "";
  if(typeof s.place !== "string") s.place = "";
  if(typeof s.dur !== "string") s.dur = "";
});
const subById = id => data.subs.find(x=>x.id===id) || null;
const subsOf  = d => (d.subRefs||[]).map(subById).filter(Boolean);
const usesOf  = id => data.drinks.filter(d=>(d.subRefs||[]).indexOf(id)>=0);

const state = {filter:"all", deck:[], idx:0, flipped:false, stat:{ok:0,again:0,total:0},
               editingId:null, selMode:false, sel:new Set(), revealed:new Set(), discOpen:false,
               editSubRefs:[], subEditId:null, subFrom:"edit", parentForm:null, cupSel:[], cupCustom:false,
               listTab:"recipe", subPlace:"", shelfOpen:new Set(), calDay:null};

const $ = s => document.querySelector(s);
const esc = s => String(s==null?"":s).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const persist = ()=>{ Store.save(data); };

/* ---------- 한 번만 보여주는 안내 ----------
   튜토리얼을 앞에 세우는 대신, 막히는 그 자리에서 한 줄만 알려준다.
   본 기록은 data.hints 에 남아 백업을 따라다닌다. 기기를 바꿔도 다시 나오지 않는다. */
function hintSeen(id){ return (data.hints || []).indexOf(id) >= 0; }
function markHint(id){
  if(!Array.isArray(data.hints)) data.hints = [];
  if(data.hints.indexOf(id) < 0){ data.hints.push(id); persist(); }
}
function showHint(id, text){
  const el = $("#studyHint");
  if(!el) return;
  if(hintSeen(id)){ el.hidden = true; return; }
  el.dataset.hint = id;
  el.innerHTML = '<span aria-hidden="true">💡</span> ' + text;
  el.hidden = false;
}
/* 알려줄 게 없는 화면에서는 남은 안내만 걷는다. 본 것으로 치지는 않는다 */
function clearHintQuietly(){
  const el = $("#studyHint");
  if(el){ el.hidden = true; el.dataset.hint = ""; }
}
/* 알려준 대로 해봤으면 역할이 끝났다. 지우고 본 것으로 기록한다 */
function clearHint(){
  const el = $("#studyHint");
  if(!el || el.hidden) return;
  el.hidden = true;
  if(el.dataset.hint) markHint(el.dataset.hint);
}
if(_lift.moved) persist();          // 부재료를 공용 목록으로 옮긴 결과를 바로 굳힌다
/* 보관한 레시피는 학습·목록·진도율 어디에도 끼지 않는다. 지운 게 아니라 잠시 빼둔 것 */
const liveDrinks = () => data.drinks.filter(d=>!d.arch);
const archDrinks = () => data.drinks.filter(d=>d.arch);
const drinksOf = c => c==="all" ? liveDrinks() : liveDrinks().filter(d=>d.cat===c);
const has = (arr,id) => arr.indexOf(id)>=0;
const add = (arr,id) => { if(!has(arr,id)) arr.push(id); };
const rm  = (arr,id) => { const i=arr.indexOf(id); if(i>=0) arr.splice(i,1); };

const MOUSE = {
  morning:[".........o........o.........","........opo......opo........",".......opppo....opppo.......",".......oppppo..oppppo...o...","......opppppoooopppppo.oho..","......oppppwcwwcwppppoohoho.","......oppcwwwwwwwwcppo.oho..","......owcwwwwwwwwwwcwo..o...","......ocwwwwwwwwwwwwco......","....oowcwooowwwwooowcwoo....","...ocwwwohkhowwohkhowwwco...","....owcwohkhowwohkhowcwo....","...ocwwwohhhowwohhhowwwco...","..owcwwwohhhowwohhhowwwcwo..","...ocwwwwooowwwwooowwwwco...","...owcwwwwwwwnnwwwwwwwcwo...","..occwwwwwwwwnnwwwwwwwwcco..","..owcwwwwwwwwwwwwwwwwwwcwo..","..ocwwwwwwwwwwwwwwwwwwwwco..","..owccwwwwwwwwwwwwwwwwccwo..","...occccwwwwccccwwwwcccco...","...owccccccccccccccccccwo...","..ocwwwwccccwwwwccccwwwwco..","..owcwwwwwwwwwwwwwwwwwwcwo..",".oocwwwwwwwwwwwwwwwwwwwwcoo.","owcwwwwwwwwwwwwwwwwwwwwwwcwo",".ocwwwwwwwwwwwwwwwwwwwwwwco.",".owppcwwwwwwwwwwwwwwwwcppwo.","ocwppcwwwwwwwwwwwwwwwwcppwco",".owppcwwwwwwwwwwwwwwwwcppwo.",".ocddcwwwwwwwwwwwwwwwwcddco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","..ocwwwwwwwwwwwwwwwwwwwwco..","...occwwwwwwwwwwwwwwwwcco...","..occcwwwwwwwwwwwwwwwwccco..","...ooccwwwwwwwwwwwwwwccoo...","....ooccwwwwwwwwwwwwccoo....","..oopppppcwwwwwwwwcpppppoo..",".oddpppppccccccccccpppppddo.","..ooooooooooccccoooooooooo.."],
  day:[".........o........o.........","........opo......opo........",".......opppo....opppo.......",".......oppppo..oppppo.......","......opppppoooopppppo......","......oppppwcwwcwppppo......","......oppcwwwwwwwwcppo......","......owcwwwwwwwwwwcwo......","......ocwwwwwwwwwwwwco......","....oowcwooowwwwooowcwoo....","...ocwwwohhhowwohhhowwwco...","....owcwohkhowwohkhowcwo....","...ocwwwohkhowwohkhowwwco...","..owcwwwohhhowwohhhowwwcwo..","...ocwwwwooowwwwooowwwwco...","...owcwwwwwwwnnwwwwwwwcwo...","..occwwwwwwwwnnwwwwwwwwcco..","..owcwwwwwwwwwwwwwwwwwwcwo..","..ocwwwwwwwwwwwwwwwwwwwwco..","..owccwwwwwwwwwwwwwwwwccwo..","...occccwwwwccccwwwwcccco...","...owccccccccccccccccccwo...","..ocwwwwccccwwwwccccwwwwco..","..owcwwwwwwwwwwwwwwwwwwcwo..",".oocwwwwwwwwwwwwwwwwwwwwcoo.","owcwwwwwwwwwwwwwwwwwwwwwwcwo",".ocwwwwwwwwwwwwwwwwwwwwwwco.",".owppcwwwwwwwwwwwwwwwwcppwo.","ocwppcwwwwwwwwwwwwwwwwcppwco",".owppcwwwwwwwwwwwwwwwwcppwo.",".ocddcwwwwwwwwwwwwwwwwcddco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","..ocwwwwwwwwwwwwwwwwwwwwco..","...occwwwwwwwwwwwwwwwwcco...","..occcwwwwwwwwwwwwwwwwccco..","...ooccwwwwwwwwwwwwwwccoo...","....ooccwwwwwwwwwwwwccoo....","..oopppppcwwwwwwwwcpppppoo..",".oddpppppccccccccccpppppddo.","..ooooooooooccccoooooooooo.."],
  evening:[".........o........o.........","........opo......opo........",".......opppo....opppo.......",".......oppppo..oppppo.......","......opppppoooopppppo......","......oppppwcwwcwppppo......","......oppcwwwwwwwwcppo......","......owcwwwwwwwwwwcwo......","......ocwwwwwwwwwwwwco......","....oowcwwwwwwwwwwwwcwoo....","...ocwwwwwwwwwwwwwwwwwwco...","....owcwwooowwwwooowwcwo....","...ocwwwohhhowwohhhowwwco...","..owcwwwohkhowwohkhowwwcwo..","...ocwwwwooowwwwooowwwwco...","...owcwwwwwwwnnwwwwwwwcwo...","..occwwwwwwwwnnwwwwwwwwcco..","..owcwwwwwwwwwwwwwwwwwwcwo..","..ocwwwwwwwwwwwwwwwwwwwwco..","..owccwwwwwwwwwwwwwwwwccwo..","...occccwwwwccccwwwwcccco...","...owccccccccccccccccccwo...","..ocwwwwccccwwwwccccwwwwco..","..owcwwwwwwwwwwwwwwwwwwcwo..",".oocwwwwwwwwwwwwwwwwwwwwcoo.","owcwwwwwwwwwwwwwwwwwwwwwwcwo",".ocwwwwwwwwwwwwwwwwwwwwwwco.",".owppcwwwwwwwwwwwwwwwwcppwo.","ocwppcwwwwwwwwwwwwwwwwcppwco",".owppcwwwwwwwwwwwwwwwwcppwo.",".ocddcwwwwwwwwwwwwwwwwcddco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","..ocwwwwwwwwwwwwwwwwwwwwco..","...occwwwwwwwwwwwwwwwwcco...","..occcwwwwwwwwwwwwwwwwccco..","...ooccwwwwwwwwwwwwwwccoo...","....ooccwwwwwwwwwwwwccoo....","..oopppppcwwwwwwwwcpppppoo..",".oddpppppccccccccccpppppddo.","..ooooooooooccccoooooooooo.."],
  night:[".........o........o.........","........opo......opo........",".......opppo....opppo...kkkk",".......oppppo..oppppo.....k.","......opppppoooopppppo...k..","......oppppwwwwwwppppo..kkkk","......oppcwwwwwwwwcppo......",".......owwwwwwwwwwwwo.......","......ocwwwwwwwwwwwwcokkkk..",".....owwwwwwwwwwwwwwwwo.k...","....ocwwwwwwwwwwwwwwwwck....","....owwwkwwwkwwkwwwkwwkkkk..","...ocwwwwkkkwwwwkkkwwwwco...","...owwwwwwwwwwwwwwwwwwwwo...","...ocwwwwwwwwwwwwwwwwwwco...","..oLwwwwwwwwwnnwwwwwwwwwLo..",".oLLcwwwwwwwwnnwwwwwwwwcLLo.",".oLwcwwwwwwwwwwwwwwwwwwcwLo.","oLLcwwwwwwwwwwwwwwwwwwwwcLLo",".oLlwcwwwwwwwwwwwwwwwwcwlLo.",".oLLccccwwwwccccwwwwccccLLo.","..oLLwccccccccccccccccwLLo..","...oLLcwccccwwwwccccwcLLo...","....ooLLppBBBBBBBBppLLoo....","...oBBBBppBBBBBBBBppBBBBo...",".ooBBBBBBBBBBBBBBBBBBBBBBoo.","oSSSSSSSSSSSSSSSSSSSSSSSSSSo","oSbbbbbbbbbbbbbbbbbbbbbbbbSo","oSbbbbbbbbbbbbbbbbbbbbbbbbSo","oSbbbbbbbbbbbbbbbbbbbbbbbbSo","oSbbbbbbbbbbbbbbbbbbbbbbbbSo","oSbbbbbbbbbbbbbbbbbbbbbbbbSo","oSbbbbbbbbbbbbbbbbbbbbbbbbSo","oSbbbbbbbbbbbbbbbbbbbbbbbbSo","oSbbbbbbbbbbbbbbbbbbbbbbbbSo",".oSSSSSSSSSSSSSSSSSSSSSSSSo.","oooSbbbbbbbbbbbbbbbbbbbbSooo","llllllllllllllllllllllllllll","LLLLLLLLLLLLLLLLLLLLLLLLLLLL","oooooooooooooooooooooooooooo"],
  blink:[".........o........o.........","........opo......opo........",".......opppo....opppo.......",".......oppppo..oppppo.......","......opppppoooopppppo......","......oppppwcwwcwppppo......","......oppcwwwwwwwwcppo......","......owcwwwwwwwwwwcwo......","......ocwwwwwwwwwwwwco......","....oowcwwwwwwwwwwwwcwoo....","...ocwwwwwwwwwwwwwwwwwwco...","....owcwkwwwkwwkwwwkwcwo....","...ocwwwwkkkwwwwkkkwwwwco...","..owcwwwwwwwwwwwwwwwwwwcwo..","...ocwwwwwwwwwwwwwwwwwwco...","...owcwwwwwwwnnwwwwwwwcwo...","..occwwwwwwwwnnwwwwwwwwcco..","..owcwwwwwwwwwwwwwwwwwwcwo..","..ocwwwwwwwwwwwwwwwwwwwwco..","..owccwwwwwwwwwwwwwwwwccwo..","...occccwwwwccccwwwwcccco...","...owccccccccccccccccccwo...","..ocwwwwccccwwwwccccwwwwco..","..owcwwwwwwwwwwwwwwwwwwcwo..",".oocwwwwwwwwwwwwwwwwwwwwcoo.","owcwwwwwwwwwwwwwwwwwwwwwwcwo",".ocwwwwwwwwwwwwwwwwwwwwwwco.",".owppcwwwwwwwwwwwwwwwwcppwo.","ocwppcwwwwwwwwwwwwwwwwcppwco",".owppcwwwwwwwwwwwwwwwwcppwo.",".ocddcwwwwwwwwwwwwwwwwcddco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","..ocwwwwwwwwwwwwwwwwwwwwco..","...occwwwwwwwwwwwwwwwwcco...","..occcwwwwwwwwwwwwwwwwccco..","...ooccwwwwwwwwwwwwwwccoo...","....ooccwwwwwwwwwwwwccoo....","..oopppppcwwwwwwwwcpppppoo..",".oddpppppccccccccccpppppddo.","..ooooooooooccccoooooooooo.."],
  eat1:[".........o........o.........","........opo......opo........",".......opppo....opppo.......",".......oppppo..oppppo.......","......opppppoooopppppo......","......oppppwcwwcwppppo......","......oppcwwwwwwwwcppo......","......owcwwwwwwwwwwcwo......","......ocwwwwwwwwwwwwco......","....oowcwooowwwwooowcwoo....","...ocwwwohhhowwohhhowwwco...","....owcwohkhowwohkhowcwo....","...ocwwwohkhowwohkhowwwco...","..owcwwwohhhowwohhhowwwcwo..","...ocwwwwooowwwwooowwwwco...","...owcwwwwwwwnnwwwwwwwcwo...","..occwwwwwwwwnnwwwwwwwwcco..","..owcwwwwwwwwwwwwwwwwwwcwo..","..ocwwwwwwwwwwwwwwwwwwwwco..","..owccwwwwwwwwwwwwwwwwccwo..","...occccwwwwccccwwwwcccco...","...owccccccccccccccccccwo...","..ocwwwwccccwwwwccccwwwwco..","..owcwwwwwwYYYYwwwwwwwwcwo..",".oocwwwwwwYYYYYYwwwwwwwwcoo.","owcwwwwwwYYYjYYYYwwwwwwwwcwo",".ocwwwwwYYYYYYYYyYwwwwwwwco.",".owcwwwpYYYjYYYYyycppwwwcwo.","ocwwwwwpyYYYYYYYyycppwwwwwco",".owcwwwppyyyyyyyywcppwwwcwo.",".ocwwwwddcwwwwwwwwcddwwwwco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","..ocwwwwwwwwwwwwwwwwwwwwco..","...occwwwwwwwwwwwwwwwwcco...","..occcwwwwwwwwwwwwwwwwccco..","...ooccwwwwwwwwwwwwwwccoo...","....ooccwwwwwwwwwwwwccoo....","..oopppppcwwwwwwwwcpppppoo..",".oddpppppccccccccccpppppddo.","..ooooooooooccccoooooooooo.."],
  eat2:[".........o........o.........","........opo......opo........",".......opppo....opppo.......",".......oppppo..oppppo.......","......opppppoooopppppo......","......oppppwcwwcwppppo......","......oppcwwwwwwwwcppo......","......owcwwwwwwwwwwcwo......","......ocwwwwwwwwwwwwco......","....oowcwwwwwwwwwwwwcwoo....","...ocwwwwwwwwwwwwwwwwwwco...","....owcwwooowwwwooowwcwo....","...ocwwwohhhowwohhhowwwco...","..owcwwwohkhowwohkhowwwcwo..","..oocwwwwooowwwwooowwwwco...",".owwwcwwwwwwwnnwwwwwwwcwo...","owwccwwwwwwwwnnwwwwwwwwcco..","owwwcwwwwwwwwwwwwwwwwwwcwo..","owwcwwwwwwwwwwwwwwwwwwwwco..","owwwccwwwwwwwwwwwwwwwwccwo..",".oooccccwwwwccccwwwwcccco...","...owccccccccccccccccccwo...","..ocwwwwccccwwwwccccwwwwco..","..owcwwwwwwwwwwwwwwwwwwcwo..",".oocwwwwwwwwwwwwwwwwwwwwcoo.","owcwwwwwwwwwYYYYwwwwwwwwwcwo",".ocwwwwwwwwYYYjYYwwwwwwwwco.",".owcwwwppcYYYYYYyYcppwwwcwo.","ocwwwwwppcYYjYYYyycppwwwwwco",".owcwwwppcwyyyyyywcppwwwcwo.",".ocwwwwddcwwwwwwwwcddwwwwco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","..ocwwwwwwwwwwwwwwwwwwwwco..","...occwwwwwwwwwwwwwwwwcco...","..occcwwwwwwwwwwwwwwwwccco..","...ooccwwwwwwwwwwwwwwccoo...","....ooccwwwwwwwwwwwwccoo....","..oopppppcwwwwwwwwcpppppoo..",".oddpppppccccccccccpppppddo.","..ooooooooooccccoooooooooo.."],
  eat3:[".........o........o.........","........opo......opo........",".......opppo....opppo.......",".......oppppo..oppppo.......","......opppppoooopppppo......","......oppppwcwwcwppppo......","......oppcwwwwwwwwcppo......","......owcwwwwwwwwwwcwo......","......ocwwwwwwwwwwwwco......","....oowcwooowwwwooowcwoo....","...ocwwwohhhowwohhhowwwco...","....owcwohkhowwohkhowcwo....","...ocwwwohkhowwohkhowwwco...","..owcwwwohhhowwohhhowwwcwo..","...ocwwwwooowwwwooowwwwcoo..","...owcwwwwwwwnnwwwwwwwcwwwo.","..occwwwwwwwwnnwwwwwwwwccwwo","..owcwwwwwwwwwwwwwwwwwwcwwwo","..ocwwwwwwwwwwwwwwwwwwwwcwwo","..owccwwwwwwwwwwwwwwwwccwwwo","...occccwwwwccccwwwwccccooo.","...owccccccccccccccccccwo...","..ocwwwwccccwwwwccccwwwwco..","..owcwwwwwwwwwwwwwwwwwwcwo..",".oocwwwwwwwwwwwwwwwwwwwwcoo.","owcwwwwwwwwwYYYYwwwwwwwwwcwo",".ocwwwwwwwwYYYjYYwwwwwwwwco.",".owcwwwppcYYYYYYyYcppwwwcwo.","ocwwwwwppcYYjYYYyycppwwwwwco",".owcwwwppcwyyyyyywcppwwwcwo.",".ocwwwwddcwwwwwwwwcddwwwwco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","..ocwwwwwwwwwwwwwwwwwwwwco..","...occwwwwwwwwwwwwwwwwcco...","..occcwwwwwwwwwwwwwwwwccco..","...ooccwwwwwwwwwwwwwwccoo...","....ooccwwwwwwwwwwwwccoo....","..oopppppcwwwwwwwwcpppppoo..",".oddpppppccccccccccpppppddo.","..ooooooooooccccoooooooooo.."],
  eat4:[".........o........o.........","........opo......opo........",".......opppo....opppo.......",".......oppppo..oppppo.......","......opppppoooopppppo......","......oppppwcwwcwppppo......","......oppcwwwwwwwwcppo......","......owcwwwwwwwwwwcwo......","......ocwwwwwwwwwwwwco......","....oowcwwwwwwwwwwwwcwoo....","...ocwwwwwwwwwwwwwwwwwwco...","....owcwwooowwwwooowwcwo....","...ocwwwohhhowwohhhowwwco...","..owcwwwohkhowwohkhowwwcwo..","..oocwwwwooowwwwooowwwwco...",".owwwcwwwwwwwnnwwwwwwwcwo...","owwccwwwwwwwwnnwwwwwwwwcco..","owwwcwwwwwwwwwwwwwwwwwwcwo..","owwcwwwwwwwwwwwwwwwwwwwwco..","owwwccwwwwwwwwwwwwwwwwccwo..",".oooccccwwwwccccwwwwcccco...","...owccccccccccccccccccwo...","..ocwwwwccccwwwwccccwwwwco..","..owcwwwwwwwwwwwwwwwwwwcwo..",".oocwwwwwwwwwwwwwwwwwwwwcoo.","owcwwwwwwwwwwwwwwwwwwwwwwcwo",".ocwwwwwwwwwYYwwwwwwwwwwwco.",".owcwwwppcwYYjYwwwcppwwwcwo.","ocwwwwwppcYYYYyywwcppwwwwwco",".owcwwwppcwyyyywwwcppwwwcwo.",".ocwwwwddcwwwwwwwwcddwwwwco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","..ocwwwwwwwwwwwwwwwwwwwwco..","...occwwwwwwwwwwwwwwwwcco...","..occcwwwwwwwwwwwwwwwwccco..","...ooccwwwwwwwwwwwwwwccoo...","....ooccwwwwwwwwwwwwccoo....","..oopppppcwwwwwwwwcpppppoo..",".oddpppppccccccccccpppppddo.","..ooooooooooccccoooooooooo.."],
  eat5:[".........o........o.........","........opo......opo........",".......opppo....opppo.......",".......oppppo..oppppo.......","......opppppoooopppppo......","......oppppwcwwcwppppo......","......oppcwwwwwwwwcppo......","......owcwwwwwwwwwwcwo......","......ocwwwwwwwwwwwwco......","....oowcwwwwwwwwwwwwcwoo....","...ocwwwwwwwwwwwwwwwwwwco...","....owcwkwwwkwwkwwwkwcwo....","...ocwwwwkkkwwwwkkkwwwwco...","..owcwwwwwwwwwwwwwwwwwwcwo..","...ocwwwwwwwwwwwwwwwwwwcoo..","...owcwwwwwwwnnwwwwwwwcwwwo.","..occwwwwwwwwnnwwwwwwwwccwwo","..owcwwwwwwwwwwwwwwwwwwcwwwo","..ocwwwwwwwwwwwwwwwwwwwwcwwo","..owccwwwwwwwwwwwwwwwwccwwwo","...occccwwwwccccwwwwccccooo.","...owccccccccccccccccccwo...","..ocwwwwccccwwwwccccwwwwco..","..owcwwwwwwwwwwwwwwwwwwcwo..",".oocwwwwwwwYwwwwwwwwwwwwcoo.","owcwwwwwwwywwwwwwwwwwwwwwcwo",".ocwwwwwwwwwwwwwwywwwwwwwco.",".owcwwwppcwwwwwwwwcppwwwcwo.","ocwwwwwppcwwwwwwwwcppwwwwwco",".owcwwwppcwwwwwwwwcppwwwcwo.",".ocwwwwddcwwwwwwwwcddwwwwco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","..ocwwwwwwwwwwwwwwwwwwwwco..","...occwwwwwwwwwwwwwwwwcco...","..occcwwwwwwwwwwwwwwwwccco..","...ooccwwwwwwwwwwwwwwccoo...","....ooccwwwwwwwwwwwwccoo....","..oopppppcwwwwwwwwcpppppoo..",".oddpppppccccccccccpppppddo.","..ooooooooooccccoooooooooo.."],
  sip1:[".........o........o.........","........opo......opo........",".......opppo....opppo.......",".......oppppo..oppppo.......","......opppppoooopppppo......","......oppppwcwwcwppppo......","......oppcwwwwwwwwcppo......","......owcwwwwwwwwwwcwo......","......ocwwwwwwwwwwwwco......","....oowcwooowwwwooowcwoo....","...ocwwwohhhowwohhhowwwco...","....owcwohkhowwohkhowcwo....","...ocwwwohkhowwohkhowwwco...","..owcwwwohhhowwohhhowwwcwo..","...ocwwwwooowwwwooowwwwco...","...owcwwwwwwwnnwwwwwwwcwo...","..occwwwwwwwwnnwwwwwwwwcco..","..owcwwwwwwwwwwwwwwwwwwcwo..","..ocwwwwwwwwwwwwwwwwwwwwco..","..owccwwwwwwwwwwwwwwwwccwo..","...occccwwwwccccwwwwcccco...","...owccccccccccccccccccwo...","..ocwwwwcogggggggoccwwwwco..","..owcwwwwgnnnnnnngwwwwwcwo..",".oocwwwppgnnnnnnnggpwwwwcoo.","owcwwwwppgnnnnnnngggwwwwwcwo",".ocwwwwppgnnnnnnngggwwwwwco.",".owcwwwddgnnnnnnnggdwwwwcwo.","ocwwwwwwwgnnnnnnngwwwwwwwwco",".owcwwwwwgggggggggwwwwwwcwo.",".ocwwwwwwwwwwwwwwwwwwwwwwco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","..ocwwwwwwwwwwwwwwwwwwwwco..","...occwwwwwwwwwwwwwwwwcco...","..occcwwwwwwwwwwwwwwwwccco..","...ooccwwwwwwwwwwwwwwccoo...","....ooccwwwwwwwwwwwwccoo....","..oopppppcwwwwwwwwcpppppoo..",".oddpppppccccccccccpppppddo.","..ooooooooooccccoooooooooo.."],
  sip2:[".........o........o.........","........opo......opo........",".......opppo....opppo.......",".......oppppo..oppppo.......","......opppppoooopppppo......","......oppppwcwwcwppppo......","......oppcwwwwwwwwcppo......","......owcwwwwwwwwwwcwo......","......ocwwwwwwwwwwwwco......","....oowcwwwwwwwwwwwwcwoo....","...ocwwwwwwwwwwwwwwwwwwco...","....owcwwooowwwwooowwcwo....","...ocwwwohhhowwohhhowwwco...","..owcwwwohkhowwohkhowwwcwo..","...ocwwwwooowwwwooowwwwco...","...owcwwwwwwwnnwwwwwwwcwo...","..occwwwwwwwwnnwwwwwwwwcco..","..owcwwwwwwwwwwwwwwwwwwcwo..","..ocwwwwwwwwwwwwwwwwwwwwco..","..owccwwwogggggggowwwwccwo..","...occccwgGGGGGGGgwwcccco...","...owccppgnnnnnnnggpcccwo...","..ocwwwppgnnnnnnngggwwwwco..","..owcwwppgnnnnnnngggwwwcwo..",".oocwwwddgnnnnnnnggdwwwwcoo.","owcwwwwwwgnnnnnnngwwwwwwwcwo",".ocwwwwwwgggggggggwwwwwwwco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","ocwwwwwwwwwwwwwwwwwwwwwwwwco",".owcwwwwwwwwwwwwwwwwwwwwcwo.",".ocwwwwwwwwwwwwwwwwwwwwwwco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","..ocwwwwwwwwwwwwwwwwwwwwco..","...occwwwwwwwwwwwwwwwwcco...","..occcwwwwwwwwwwwwwwwwccco..","...ooccwwwwwwwwwwwwwwccoo...","....ooccwwwwwwwwwwwwccoo....","..oopppppcwwwwwwwwcpppppoo..",".oddpppppccccccccccpppppddo.","..ooooooooooccccoooooooooo.."],
  sip3:[".........o........o.........","........opo......opo........",".......opppo....opppo.......",".......oppppo..oppppo.......","......opppppoooopppppo......","......oppppwcwwcwppppo......","......oppcwwwwwwwwcppo......","......owcwwwwwwwwwwcwo......","......ocwwwwwwwwwwwwco......","....oowcwwwwwwwwwwwwcwoo....","...ocwwwwwwwwwwwwwwwwwwco...","....owcwkwwwkwwkwwwkwcwo....","...ocwwwwkkkwwwwkkkwwwwco...","..owcwwwwwwwwwwwwwwwwwwcwo..","...ocwwwwwwwwwwwwwwwwwwco...","...owcwwwogggggggowwwwcwo...","..occwwwwgGGGGGGngwwwwwcco..","..owcwwppgGGGGGnnggpwwwcwo..","..ocwwwppgGGGnnnngggwwwwco..","..owccwppgGnnnnnngggwwccwo..","...occcddgnnnnnnnggdcccco...","...owccccgnnnnnnngcccccwo...","..ocwwwwcgggggggggccwwwwco..","..owcwwwwwwwwwwwwwwwwwwcwo..",".oocwwwwwwwwwwwwwwwwwwwwcoo.","owcwwwwwwwwwwwwwwwwwwwwwwcwo",".ocwwwwwwwwwwwwwwwwwwwwwwco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","ocwwwwwwwwwwwwwwwwwwwwwwwwco",".owcwwwwwwwwwwwwwwwwwwwwcwo.",".ocwwwwwwwwwwwwwwwwwwwwwwco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","..ocwwwwwwwwwwwwwwwwwwwwco..","...occwwwwwwwwwwwwwwwwcco...","..occcwwwwwwwwwwwwwwwwccco..","...ooccwwwwwwwwwwwwwwccoo...","....ooccwwwwwwwwwwwwccoo....","..oopppppcwwwwwwwwcpppppoo..",".oddpppppccccccccccpppppddo.","..ooooooooooccccoooooooooo.."],
  sip4:[".........o........o.........","........opo......opo........",".......opppo....opppo.......",".......oppppo..oppppo.......","......opppppoooopppppo......","......oppppwcwwcwppppo......","......oppcwwwwwwwwcppo......","......owcwwwwwwwwwwcwo......","......ocwwwwwwwwwwwwco......","....oowcwwwwwwwwwwwwcwoo....","...ocwwwwwwwwwwwwwwwwwwco...","....owcwwooowwwwooowwcwo....","...ocwwwohhhowwohhhowwwco...","..owcwwwohkhowwohkhowwwcwo..","...ocwwwwooowwwwooowwwwco...","...owcwwwwwwwnnwwwwwwwcwo...","..occwwwwwwwwnnwwwwwwwwcco..","..owcwwwwwwwwwwwwwwwwwwcwo..","..ocwwwwwwwwwwwwwwwwwwwwco..","..owccwwwwwwwwwwwwwwwwccwo..","...occccwwwwccccwwwwcccco...","...owccccogggggggocccccwo...","..ocwwwwcgGGGGGGGgccwwwwco..","..owcwwppgGGGGGGGggpwwwcwo..",".oocwwwppgGGGGGGGgggwwwwcoo.","owcwwwwppgGGGGGGGgggwwwwwcwo",".ocwwwwddgnnnnnnnggdwwwwwco.",".owcwwwwwgnnnnnnngwwwwwwcwo.","ocwwwwwwwgggggggggwwwwwwwwco",".owcwwwwwwwwwwwwwwwwwwwwcwo.",".ocwwwwwwwwwwwwwwwwwwwwwwco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","..ocwwwwwwwwwwwwwwwwwwwwco..","...occwwwwwwwwwwwwwwwwcco...","..occcwwwwwwwwwwwwwwwwccco..","...ooccwwwwwwwwwwwwwwccoo...","....ooccwwwwwwwwwwwwccoo....","..oopppppcwwwwwwwwcpppppoo..",".oddpppppccccccccccpppppddo.","..ooooooooooccccoooooooooo.."],
  sip5:[".........o........o.........","........opo......opo........",".......opppo....opppo.......",".......oppppo..oppppo.......","......opppppoooopppppo......","......oppppwcwwcwppppo......","......oppcwwwwwwwwcppo......","......owcwwwwwwwwwwcwo......","......ocwwwwwwwwwwwwco......","....oowcwwwwwwwwwwwwcwoo....","...ocwwwwwwwwwwwwwwwwwwco...","....owcwkwwwkwwkwwwkwcwo....","...ocwwwwkkkwwwwkkkwwwwco...","..owcwwwwwwwwwwwwwwwwwwcwo..","...ocwwwwwwwwwwwwwwwwwwco...","...owcwwwwwwwnnwwwwwwwcwo...","..occwwwwwwwwnnwwwwwwwwcco..","..owcwwwwwwwwwwwwwwwwwwcwo..","..ocwwwwwwwwwwwwwwwwwwwwco..","..owccwwwwwwwwwwwwwwwwccwo..","...occccwwwwccccwwwwcccco...","...owccccccccccccccccccwo...","..ocwwwwcogggggggoccwwwwco..","..owcwwwwgGGGGGGGgwwwwwcwo..",".oocwwwppgGGGGGGGggpwwwwcoo.","owcwwwwppgGGGGGGGgggwwwwwcwo",".ocwwwwppgGGGGGGGgggwwwwwco.",".owcwwwddgGGGGGGGggdwwwwcwo.","ocwwwwwwwgGGGGGGGgwwwwwwwwco",".owcwwwwwgggggggggwwwwwwcwo.",".ocwwwwwwwwwwwwwwwwwwwwwwco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","..ocwwwwwwwwwwwwwwwwwwwwco..","...occwwwwwwwwwwwwwwwwcco...","..occcwwwwwwwwwwwwwwwwccco..","...ooccwwwwwwwwwwwwwwccoo...","....ooccwwwwwwwwwwwwccoo....","..oopppppcwwwwwwwwcpppppoo..",".oddpppppccccccccccpppppddo.","..ooooooooooccccoooooooooo.."]
};
const BELLY = {y0:29,
  normal:[".owppcwwwwwwwwwwwwwwwwcppwo.",".ocddcwwwwwwwwwwwwwwwwcddco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","..ocwwwwwwwwwwwwwwwwwwwwco..","...occwwwwwwwwwwwwwwwwcco...","..occcwwwwwwwwwwwwwwwwccco..","...ooccwwwwwwwwwwwwwwccoo..."],
  puff:[".owppcwwwwwwwwwwwwwwwwcppwo.",".ocddcwwwwwwwwwwwwwwwwcddco.","owcwwwwwwwwwwwwwwwwwwwwwwcwo",".oocwwwwwwwwwwwwwwwwwwwwcoo.","..occwwwwwwwwwwwwwwwwwwcco..","..occwwwwwwwwwwwwwwwwwwcco..","...occwwwwwwwwwwwwwwwwcco..."]
};
const MOUSE_PAL = {o:"#C4AE98", w:"#FCF7F1", c:"#EBDDCD", p:"#F5BEAC", d:"#DF9B88", n:"#78543A", k:"#261F1C", h:"#FFFFFF",
                   Y:"#F7CE66", y:"#E2AF42", j:"#C69132",
                   G:"#EEE7DC", g:"#C6B7A3",
                   l:"#E2DBD0", L:"#CBC2B5", b:"#C5D4E9", B:"#DFE8F4", S:"#AABDD7",
                   /* 날씨 옷 — 우비 · 장화 · 털모자 · 목도리 */
                   E:"#7A5608", F:"#5E4535", M:"#C4574A", N:"#FFFFFF", R:"#F5C33F", T:"#A6703A", V:"#7FA8C4", m:"#9C4036", q:"#A87C1C", r:"#D9A32E", t:"#7C4E22", u:"#4F3113", v:"#5B84A2"};
/* 오늘 어떤 옷을 입힐까. 못 정하면 null 이고 평소 모습 그대로다.
   auto 는 앱이 알려준 날씨를 먼저 보고, 없으면 달로 어림한다.
   iOS 앱이 WeatherKit 으로 받아 window.__amgijwiWeather 에 넣어줄 자리다.
   웹에는 그 값이 없으니 계절 어림으로만 돈다. 웹이 직접 날씨를 받아오면
   connect-src 'none' 과 "서버로 전송되는 정보가 없어요" 를 깨야 한다 */
function wxFromApp(){
  const v = window.__amgijwiWeather;
  return (v === "rain" || v === "snow" || v === "clear") ? v : null;
}
function wxBySeason(){
  const m = new Date().getMonth() + 1;
  if(m === 12 || m <= 2) return "snow";        // 겨울
  if(m === 6 || m === 7) return "rain";        // 장마
  return "clear";
}
function wxNow(){
  const set = data.wx || "off";
  if(set === "off") return null;
  const w = (set === "auto") ? (wxFromApp() || wxBySeason()) : set;
  return WEATHER[w] ? w : null;                // clear 는 갈아입을 옷이 없다
}

/* ---------- 날씨 옷 ----------
   비에는 후드 쓴 우비에 장화, 눈에는 털모자에 목도리.
   day 자세에서 만들었고 옷은 몸 윤곽과 따로 그렸다. 몸에 색만 입히면 털이 비쳐 옷으로 안 보인다. */
const WEATHER = {
  rain:["..........qrRRRRrq..........","........qrRRRRRRRRrq........",".......qrRRRRRRRRRRrq.......","......qrRRRRRRRRRRRRrq......",".....qrRRRRRRRRRRRRRRrq.....","....qrRRRRRRRRRRRRRRRRrq....","....qrRRRRRRRRRRRRRRRRrq....","...qrRRRRRRRRRRRRRRRRRRrq...","...qrRRRRRRRRRRRRRRRRRRrq...","..qrRRrcwooowwwwooowcrRRrq..","..qrRrwwohhhowwohhhowwrRrq..","..qrRrcwohkhowwohkhowcrRrq..","..qrRrwwohkhowwohkhowwrRrq..","..qrRrwwohhhowwohhhowwrRrq..","...qrrwwwooowwwwooowwwrrq...","....qrRrwwwwwnnwwwwwrRrq....","....qrRRrwwwwnnwwwwrRRrq....","....qrRRRRRRRRRRRRRRRRrq....","....qrRRRRRRRrrRRRRRRRrq....","...qrRRRRRRRRrrRRRRRRRRrq...","...qrRRRRRRRRrrRRRRRRRRrq...","..qrRRRRRRRRREERRRRRRRRRrq..","..qrRRRRRRRRREERRRRRRRRRrq..","..qrRRRRRRRRRrrRRRRRRRRRrq..",".qrRRRRRRRRRRrrRRRRRRRRRRrq.",".qrRRRRRRRRRRrrRRRRRRRRRRrq.",".qppRRRRRRRRREERRRRRRRRRppq.",".qppRRRRRRRRREERRRRRRRRRppq.","qrppRRRRRRRRRrrRRRRRRRRRpprq","qrddRRRRRRRRRrrRRRRRRRRRddrq","qrRRRRRRRRRRRrrRRRRRRRRRRRrq","qrRRRRRRRRRRREERRRRRRRRRRRrq","qrRRRRRRRRRRREERRRRRRRRRRRrq","qrRRRRRRRRRRRrrRRRRRRRRRRRrq","qrRRRRRRRRRRRrrRRRRRRRRRRRrq","qrRRRRRRRRRRRrrRRRRRRRRRRRrq","qrrrrrrrrrrrrrrrrrrrrrrrrrrq","....uTTTTTTu....uTTTTTTu....","....uTttttTu....uTttttTu....","...uuuuuuuuuu..uuuuuuuuuu..."],
  snow:["............NN..............","...........NNNN.............",".........MMMMMMMMMM.........","........MMmmmmmmmmMM........",".......MMmmmmmmmmmmMM.......","......MMmmmmmmmmmmmmMM......",".....FFFFFFFFFFFFFFFFFF.....",".....FFFFFFFFFFFFFFFFFF.....","......ocwwwwwwwwwwwwco......","....oowcwooowwwwooowcwoo....","...ocwwwohhhowwohhhowwwco...","....owcwohkhowwohkhowcwo....","...ocwwwohkhowwohkhowwwco...","..owcwwwohhhowwohhhowwwcwo..","...ocwwwwooowwwwooowwwwco...","...owcwwwwwwwnnwwwwwwwcwo...","..occwwwwwwwwnnwwwwwwwwcco..","..owcwwwwwwwwwwwwwwwwwwcwo..","..oVVVVVVVVVVVVVVVVVVVVVVo..","..oVVVVVVVVVVVVVVVVVVVVVVo..","...ovvvvvvvvvvvvvvvvvvvvo...","...oVVVVVVVVVVVVVVVVVVVVo...","..oVVVVVVVVVVVVVVVVVVVVVVo..","..oVVVVVVVVVVVVVVVVVVVVVVo..",".ooVVVvwwwwwwwwwwwwwwwwwcoo.","owcVVVvwwwwwwwwwwwwwwwwwwcwo",".ocVVVvwwwwwwwwwwwwwwwwwwco.",".owppcwwwwwwwwwwwwwwwwcppwo.","ocwppcwwwwwwwwwwwwwwwwcppwco",".owppcwwwwwwwwwwwwwwwwcppwo.",".ocddcwwwwwwwwwwwwwwwwcddco.",".owcwwwwwwwwwwwwwwwwwwwwcwo.","..ocwwwwwwwwwwwwwwwwwwwwco..","...occwwwwwwwwwwwwwwwwcco...","..occcwwwwwwwwwwwwwwwwccco..","...ooccwwwwwwwwwwwwwwccoo...","....ooccwwwwwwwwwwwwccoo....","..oopppppcwwwwwwwwcpppppoo..",".oddpppppccccccccccpppppddo.","..ooooooooooccccoooooooooo.."]
};

/* 도트 맵을 가로로 이어붙여 SVG rect 로 (같은 색은 한 덩어리로 묶어 가볍게) */
function mouseSVG(mood, puff){
  let rows = MOUSE[mood] || MOUSE.day;
  if(mood !== "night" && mood.indexOf("eat") !== 0 && mood.indexOf("sip") !== 0){
    rows = rows.slice();
    const belly = puff ? BELLY.puff : BELLY.normal; // 서 있을 땐 배만 한 겹 부푼다
    for(let i=0;i<belly.length;i++) rows[BELLY.y0+i] = belly[i];
  }
  return rowsSVG(rows, false);
}
/* 도트 행 배열 → SVG. flip 이면 좌우 반전(달리는 방향 바꿀 때) */
function rowsSVG(rows, flip){
  const hh = rows.length, ww = rows[0].length;
  let out = "";
  for(let y=0; y<hh; y++){
    const r = rows[y];
    let x = 0;
    while(x < ww){
      const ch = r[x];
      if(ch === "."){ x++; continue; }
      let n = 1;
      while(x+n < ww && r[x+n] === ch) n++;
      const px = flip ? ww - x - n : x;
      out += '<rect x="'+px+'" y="'+y+'" width="'+n+'" height="1" fill="'+MOUSE_PAL[ch]+'"/>';
      x += n;
    }
  }
  return '<svg viewBox="0 0 '+ww+' '+hh+'" shape-rendering="crispEdges" aria-hidden="true">'+out+'</svg>';
}
const RUN_SPR = {
  s0:["...........oo...............","..........oppo..............",".........opdppo.ooo.........","........opdddpoopppo........","........opdddpooppppo.......","........opdddpopppppo.......","........opdddwwcppppo.......","......oowcdddwwwcwppo.......",".....ocwwwwdwwwwwwwco.......","....owcwwwwcwwwcwwwcwo......",".....ooowwwwwcwwwcwwco......","....ohhhowwwwwwwwwwwcwo.....","...oohkhowwwwwwwwwwwwco.....","..owohkhowwwwwwwwwwwwcwo....",".oocohhhowwwwwwwwwwwwwco....","onncwooowwwwwwwwwwwwwcwo....","onnwwwwwwwwwwwwwwwwwwwco....",".owcwwwwwwwwwwwwwwwwwcwo....",".ocwwwwwwwwwwwwwwwwwwwwco...",".owcwwwwwwwwwwwwwwwwwwcwo...","..occwwwwwwwwwwwwwwwwwwco...","...occwwwwwwwcwwcwwwwcwo....","...occccccccccwwwwwwwcco....","....oowcwcwcwwwwwwwwwwcwo...",".....ocwwcwwwwwwwwcwwwwco...","....owcwwwwwwwwwwwwwwwwcwo..","....oppppwwwwwwwwwwwwwwwco..","...owppppcwwwwwwwwwwwwwwcwo.","...ocppppcwwwwwwwwwwwwcwwco.","...owddddwwwwwwwwwwwwwwwcwo.","...ocwwwwwwwwwwwwwwwwwwwwco.","...owcwwwwwwwwwwwwwwwwwwcwo.","....ocwwwwwwwwwwwwwwwwwwco..","....owcwwwwwwwwcwwwwcwwcwo..",".....ocwwwwwwwwccwwwwwcco...",".....owcwwwwwwwwwccccccwo...","....oooocwwwwwwwwwppppoo....","...oppppowcwwwwwwwddddo.....","...oddddooocwwwwwwcooo......","....oooo...oooooooo........."],
  s1:["............................","...........ooo..............","..........opppo..oo.........",".........opddppooppo........",".........opdddpoppppo.......",".........opdddpopppppo......","........oocdddwcpppppo......","......oowcwdddwwcwpppo......",".....ocwwwwddwwwwwwcpo......","....owcwwwwcwwwcwwwcwo......",".....ooowwwwwcwwwcwwco......","....ohhhowwwwwwwwwwwcwo.....","...oohkhowwwwwwwwwwwwco.....","..owohkhowwwwwwwwwwwwcwo....",".oocohhhowwwwwwwwwwwwwco....","onncwooowwwwwwwwwwwwwcwo....","onnwwwwwwwwwwwwwwwwwwwco....",".owcwwwwwwwwwwwwwwwwwcwo....",".ocwwwwwwwwwwwwwwwwwwwwco...",".owcwwwwwwwwwwwwwwwwwwcwo...","..occwwwwwwwwwwwwwwwwwwco...","...occwwwwwwwcwwcwwwwcwo....","...occccccccccwwwwwwwcco....","....oowcwcwcwwwwwwwwwwcwo...",".....ocwwcwwwwwwwwcwwwwco...","....owcwwwwwwwwwwwwwwwwcwo..","....oppppwwwwwwwwwwwwwwwco..","...owppppcwwwwwwwwwwwwwwcwo.","...ocppppcwwwwwwwwwwwwcwwco.","...owddddwwwwwwwwwwwwwwwcwo.","...ocwwwwwwwwwwwwwwwwwwwwco.","...owcwwwwwwwwwwwwwwwwwwcwo.","....ocwwwwwwwwwwwwwwwwwwco..","....owcwwwwwwwwcwwwwcwwcwo..",".....ocwwwwwwwwccwwwwwcco...",".....owcwwwwwwwwwccccccwo...","......oocwwwwwwwwwwwwcoo....",".....oppppcwwwwwwppppo......",".....oddddocwwwwwddddo......","......oooo.oooooooooo......."],
  s2:["............................","............................","...........oooo.............","..........opddpo..oo........","..........opddpo.oppo.......",".........opddddpoppppo......","........oocddddcopppppo.....","......oowcwwdddwcwppppo.....",".....ocwwwwwddwwwwwcppo.....","....owcwwwwcwwwcwwwcwo......",".....ooowwwwwcwwwcwwco......","....ohhhowwwwwwwwwwwcwo.....","...oohkhowwwwwwwwwwwwco.....","..owohkhowwwwwwwwwwwwcwo....",".oocohhhowwwwwwwwwwwwwco....","onncwooowwwwwwwwwwwwwcwo....","onnwwwwwwwwwwwwwwwwwwwco....",".owcwwwwwwwwwwwwwwwwwcwo....",".ocwwwwwwwwwwwwwwwwwwwwco...",".owcwwwwwwwwwwwwwwwwwwcwo...","..occwwwwwwwwwwwwwwwwwwco...","...occwwwwwwwcwwcwwwwcwo....","...occccccccccwwwwwwwcco....","....oowcwcwcwwwwwwwwwwcwo...",".....ocwwcwwwwwwwwcwwwwco...","....owcwwwwwwwwwwwwwwwwcwo..","...oppppwwwwwwwwwwwwwwwwco..","...oppppcwwwwwwwwwwwwwwwcwo.","...oppppcwwwwwwwwwwwwwcwwco.","...oddddwwwwwwwwwwwwwwwwcwo.","...ocwwwwwwwwwwwwwwwwwwwwco.","...owcwwwwwwwwwwwwwwwwwwcwo.","....ocwwwwwwwwwwwwwwwwwwco..","....owcwwwwwwwwcwwwwcwwcwo..",".....ocwwwwwwwwccwwwwwcco...",".....owcwwwwwwwwwccccccwo...","......oocwwwwwwppppwwcoo....",".......oppppwwwddddcwo......",".......oddddwwwwwwcoo.......","........ooooooooooo........."],
  s3:["...........oo...............","..........oppo..............",".........opdppo.ooo.........","........opdddpoopppo........","........opdddpooppppo.......","........opdddpopppppo.......","........opdddwwcppppo.......","......oowcdddwwwcwppo.......",".....ocwwwwdwwwwwwwco.......","....owcwwwwcwwwcwwwcwo......",".....ooowwwwwcwwwcwwco......","....ohhhowwwwwwwwwwwcwo.....","...oohkhowwwwwwwwwwwwco.....","..owohkhowwwwwwwwwwwwcwo....",".oocohhhowwwwwwwwwwwwwco....","onncwooowwwwwwwwwwwwwcwo....","onnwwwwwwwwwwwwwwwwwwwco....",".owcwwwwwwwwwwwwwwwwwcwo....",".ocwwwwwwwwwwwwwwwwwwwwco...",".owcwwwwwwwwwwwwwwwwwwcwo...","..occwwwwwwwwwwwwwwwwwwco...","...occwwwwwwwcwwcwwwwcwo....","...occccccccccwwwwwwwcco....","....oowcwcwcwwwwwwwwwwcwo...",".....ocwwcwwwwwwwwcwwwwco...","...oowcwwwwwwwwwwwwwwwwcwo..","..oppppwwwwwwwwwwwwwwwwwco..","..oppppcwwwwwwwwwwwwwwwwcwo.","..oppppcwwwwwwwwwwwwwwcwwco.","..oddddwwwwwwwwwwwwwwwwwcwo.","...ocwwwwwwwwwwwwwwwwwwwwco.","...owcwwwwwwwwwwwwwwwwwwcwo.","....ocwwwwwwwwwwwwwwwwwwco..","....owcwwwwwwwwcwwwwcwwcwo..",".....ocwwwwwwwwccwwwwwcco...",".....owcwwwwwwwwwccccccwo...","......oocwwwwwwwwwwwwcoo....","........owppppppppwcwo......",".........oddddddddcoo.......","..........ooooooooo........."],
  s4:["............................","...........ooo..............","..........opppo..oo.........",".........opddppooppo........",".........opdddpoppppo.......",".........opdddpopppppo......","........oocdddwcpppppo......","......oowcwdddwwcwpppo......",".....ocwwwwddwwwwwwcpo......","....owcwwwwcwwwcwwwcwo......",".....ooowwwwwcwwwcwwco......","....ohhhowwwwwwwwwwwcwo.....","...oohkhowwwwwwwwwwwwco.....","..owohkhowwwwwwwwwwwwcwo....",".oocohhhowwwwwwwwwwwwwco....","onncwooowwwwwwwwwwwwwcwo....","onnwwwwwwwwwwwwwwwwwwwco....",".owcwwwwwwwwwwwwwwwwwcwo....",".ocwwwwwwwwwwwwwwwwwwwwco...",".owcwwwwwwwwwwwwwwwwwwcwo...","..occwwwwwwwwwwwwwwwwwwco...","...occwwwwwwwcwwcwwwwcwo....","...occccccccccwwwwwwwcco....","....oowcwcwcwwwwwwwwwwcwo...",".....ocwwcwwwwwwwwcwwwwco...","...oowcwwwwwwwwwwwwwwwwcwo..","..oppppwwwwwwwwwwwwwwwwwco..","..oppppcwwwwwwwwwwwwwwwwcwo.","..oppppcwwwwwwwwwwwwwwcwwco.","..oddddwwwwwwwwwwwwwwwwwcwo.","...ocwwwwwwwwwwwwwwwwwwwwco.","...owcwwwwwwwwwwwwwwwwwwcwo.","....ocwwwwwwwwwwwwwwwwwwco..","....owcwwwwwwwwcwwwwcwwcwo..",".....ocwwwwwwwwccwwwwwcco...",".....owcwwwwwwwwwccccccwo...","......ooppppwwwwwwwwwcoo....",".......oddddwwwwppppwo......","........ooocwwwwddddo.......","...........ooooooooo........"],
  s5:["............................","............................","...........oooo.............","..........opddpo..oo........","..........opddpo.oppo.......",".........opddddpoppppo......","........oocddddcopppppo.....","......oowcwwdddwcwppppo.....",".....ocwwwwwddwwwwwcppo.....","....owcwwwwcwwwcwwwcwo......",".....ooowwwwwcwwwcwwco......","....ohhhowwwwwwwwwwwcwo.....","...oohkhowwwwwwwwwwwwco.....","..owohkhowwwwwwwwwwwwcwo....",".oocohhhowwwwwwwwwwwwwco....","onncwooowwwwwwwwwwwwwcwo....","onnwwwwwwwwwwwwwwwwwwwco....",".owcwwwwwwwwwwwwwwwwwcwo....",".ocwwwwwwwwwwwwwwwwwwwwco...",".owcwwwwwwwwwwwwwwwwwwcwo...","..occwwwwwwwwwwwwwwwwwwco...","...occwwwwwwwcwwcwwwwcwo....","...occccccccccwwwwwwwcco....","....oowcwcwcwwwwwwwwwwcwo...",".....ocwwcwwwwwwwwcwwwwco...","....owcwwwwwwwwwwwwwwwwcwo..","...oppppwwwwwwwwwwwwwwwwco..","...oppppcwwwwwwwwwwwwwwwcwo.","...oppppcwwwwwwwwwwwwwcwwco.","...oddddwwwwwwwwwwwwwwwwcwo.","...ocwwwwwwwwwwwwwwwwwwwwco.","...owcwwwwwwwwwwwwwwwwwwcwo.","....ocwwwwwwwwwwwwwwwwwwco..","....owcwwwwwwwwcwwwwcwwcwo..",".....ocwwwwwwwwccwwwwwcco...",".....owcwwwwwwwwwccccccwo...","......oocwwwwwwwwwppppoo....",".....oppppcwwwwwwwddddo.....",".....oddddocwwwwwwcooo......","......oooo.oooooooo........."],
  qf:[".......o.........o..........","......opo.......opo.........",".....opppo.....opppo........",".....oppppo...oppppo........","....opppppoo.oopppppo.......","....oppppwcwowcwppppo.......","....oppcwwwwwwwwwcppo.......","....owcwwwwwwwwwwwcwo.......","....ocwwwwwwwwwwwwwco.......","....owcwwwwwwwwwwwwcwo......","...ocoowwwwwwooowwwwwco.....","...oohhowwwwohhhowwwwcwo....","..ocokhowwwwohkhowwwwwco....","..owokhowwwwohkhowwwwcwo....","..ocohhowwwwohhhowwwwwco....","..owcoowwwwwwooowwwwwcwo....","..ocwwwwnnwwwwwwwwwwwwco....","..owcwwwnwwwwwwwwwwwwwcwo...","..ocwwwwwwwwwwwwwwwwwwwco...","..owcwwwwwwwwwwwwwwwwwcwo...","..occwwwwwwwwwwwcwwwwwco....","...owcccwwwwwcccwwwwwcwo....","....ocwwcccccwwwwwwwwco.....",".....owcwwwwwwwwwwwwwcwo....","....ocwcwcwwwwwcwcwcwwwco...","...oowcwwwwcwcwwwwwwwwwcwo..","..oppppwwwwwcwwwwwwwwwpppo..","..oppppcwwwwwwwwwwwwwcpppo..","..oppppcwwcwwwwwwwwwwwpppco.","..oddddwwwwwwwwwwwwwwwdddwo.","...ocwwwwwwwwwcwwwwwwwwwwco.","...owcwwwwwwwwwwwwwwwwwcwo..","...ocwwwwcwwwwwwwwwwwwwwco..","....owcwwwwwwwwwcwwwwwwcwo..","....ocwwwwwwwwwwwwwwwwwco...",".....owcwwwwwwwwwwwwwcwo....","......ocwwwwwwwwppppwco.....",".....oppppcwwwwwddddwo......",".....oddddocwwwwwcooo.......","......oooo.ooooooo.........."],
  qb:["..........o.......o.........",".........opo.....opo........","........opppo...opppo.......","........oppppo.oppppo.......",".......opppppooopppppo......",".......oppppwcwcwppppo......",".......oppcwwwwwwwcppo......",".......owcwwwwwwwwwcwo......","......oocwwwwwwwwwwwco......",".....owcwwwwwwwwwwwwcwo.....","....ocwwwwwwwwwwwwwwwwco....","...owcwwwcwwwwcwwwwcwcwo....","...ocwwwcwwwwcwwwwcwwwwco...","...owcwwwwwwcwwwwcwwwwcwo...","...ocwwwwwwcwwwwcwwwwwwco...","...owcwwwwcwwwwcwwwwwwcwo...","...ocwwwwwwwwwwwwwwwwwwco...","..occwwwwwwwwwwwwwwwwwcwo...","..ocwwwwwwwwwwwcwwwwwwwco...","..owcwwwwwwwcwwwwwwwwwcwo...","...ocwwcwwwwwwwwwwwwwwwco...","...owcwwwwwwcwwwwwwwwcwo....","....ocwwwwwwwwwwcwwwwco.....",".....owcwwwwcwwwwwwwwcwo....","....ocwwwwcwwwwwwwwwwwwco...","...owcwwwwwwcwwwwwwwwwcwoo..","...ocwwwwwwwwwwwwwwwcwwpppo.","...owccwwwwwcwwwwwwwwwcpppo.","..ocwwwwwwwwwwwwwwwwwwwpppo.","..owcwwwwwwwcwwwwwwwwwwdddo.","..ocwwwwwwwwwwwwwwwwwwwwco..","...owcwwwwwwcwwwwwwwwwwcwo..","...ocwwwwwwwwwwwwwwwwwwwco..","...owcwwwwwwcwwcwwwwwwcwo...","....occcwwccwwwccwwwwccco...",".....owcccwwwwwwwcccccwo....","......ocwwwwwwwwwppppco.....","......oppppwwwwwwddddo......","......oddddcwwwwwcooo.......",".......ooooooooooo.........."],
  bk:[".........o........o.........","........opo......opo........",".......opppo....opppo.......",".......oppppo..oppppo.......","......opppppoooopppppo......","......oppppwcwwcwppppo......","......oppcwwwwwwwwcppo......","......owcwwwwwwwwwwcwo......","......ocwwwwwwwwwwwwco......","....oowcwwwwwwwwwwwwcwoo....","...ocwwwwwwwwwwwwwwwwwwco...","....owcwwcwwwwcwwwwwwcwo....","...ocwwwwwwwwcwwwwcwwwwco...","..owcwwwwwwwcwwwwcwwwwwcwo..","...ocwwwwwwcwwwwcwwwwwwco...","...owcwwwwcwwwwcwwwwwwcwo...","..occwwwwwwwwwwwwwwwwwwcco..","..owcwwwwwwwwcwwwwwwwwwcwo..","..ocwwwwwwwwwwcwwwwwwwwwco..","..owccwwwwwwwcwwwwwwwwccwo..","...occccwwwwccccwwwwcccco...","...owccccccccccccccccccwo...","..ocwwwwccccwwcwccccwwwwco..","..owcwwwwwwwwcwwwwwwwwwcwo..",".oocwwwwwwwwwwcwwwwwwwwwcoo.","owcwwwwwwwwwwcwwwwwwwwwwwcwo",".ocwwwwwwwwwwwcwwwwwwwwwwco.",".owwwcwwwwwwwcwwwwwwwwcwwwo.","ocwwwcwwwwwwwwcwwwwwwwcwwwco",".owwwcwwwwwwwcwwwwwwwwcwwwo.",".ocwwcwwwwwwwwcwwwwwwwcwwco.",".owcwwwwwwwwwcwwwwwwwwwwcwo.","..ocwwwwwwwwwwcwwwwwwwwwco..","...occwwwwwwwwwwwwwwwwcco...","..occcwwwwwwwwwwwwwwwwccco..","...ooccwwwwwwwwwwwwwwccoo...","....ooccwwwwwwwwwwwwccoo....","..oopppppcwwwwwwwwcpppppoo..",".oddpppppccccccccccpppppddo.","..ooooooooooccccoooooooooo.."]
};

