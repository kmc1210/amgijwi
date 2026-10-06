/* amgijwi.com 첫 화면 — 예전 웹 앱에서 쓰던 레시피 꺼내기.
   웹 앱을 닫으면 이 브라우저 저장소(localStorage "brewnote.v1")에 남은 레시피를 꺼낼 화면이 없어진다.
   남아 있으면 앱(www/js/settings.js backupJSON)과 같은 모양의 백업 파일로 내보내, 앱의 백업 불러오기로 옮기게 한다.
   통신은 없다(CSP connect-src 'none'). 저장소를 읽기만 하고 고치거나 지우지 않는다. */
(function(){
  const KEY = "brewnote.v1";        // 앱 내부 식별자. 바꾸면 남은 레시피를 못 찾는다

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return null;
      const d = JSON.parse(raw);
      return (d && Array.isArray(d.drinks)) ? d : null;
    }catch(e){ return null; }
  }
  /* 앱의 backupJSON 과 같은 모양. PIN 은 빼서, 앱에 불러오면 잠금 없이 열린다 */
  function backupText(d){
    const copy = {};
    Object.keys(d).forEach(function(k){ if(k !== "pin") copy[k] = d[k]; });
    return JSON.stringify({app:"brewnote", v:1, exportedAt:new Date().toISOString(), data:copy}, null, 2);
  }
  function stamp(){
    const n = new Date(), p = x => String(x).padStart(2, "0");
    return n.getFullYear() + p(n.getMonth() + 1) + p(n.getDate()) + "-" + p(n.getHours()) + p(n.getMinutes());
  }

  const d = load();
  if(!d) return;
  const box = document.getElementById("rescue");
  const n = d.drinks.length, shelf = Array.isArray(d.shelf) ? d.shelf.length : 0, memos = Array.isArray(d.memos) ? d.memos.length : 0;
  document.getElementById("rescueMsg").textContent =
    "레시피 " + n + "개" + (shelf ? " · 개봉 항목 " + shelf + "개" : "") + (memos ? " · 메모 " + memos + "개" : "") + "가 남아 있어요.";
  box.hidden = false;

  document.getElementById("rescueFile").addEventListener("click", function(){
    const blob = new Blob([backupText(d)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "암기쥐-백업-" + stamp() + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
  });
  document.getElementById("rescueText").addEventListener("click", function(){
    const t = document.getElementById("rescueBox");
    t.value = backupText(d); t.hidden = false; t.select();
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).catch(function(){});
  });
})();
