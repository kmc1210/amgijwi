/* 암기쥐 — 기다린 쥐돌이 (1.2 · 앱 전용)
   며칠 만에 앱을 열면 쥐돌이가 기다린 얼굴로 맞는다: 3일 삐침 · 5일 시무룩 · 7일 풀이 죽음(얼굴 그림은 closet.js MOUSE_FACES).
   한 바퀴 외우면 풀려서, 홈에 돌아왔을 때 잠깐 기쁜 얼굴로 반긴다.
   설정에서 켜면(기본 꺼짐) 3일째 · 7일째에 한 번씩 "기다렸츄" 알림도 보낸다 — 일정 알림과 같은 통로(cal.js alarmPlan)에 얹는다.
   죄책감을 주려는 게 아니라 반가워하는 쥐돌이다. 말투는 순하게, 알림은 두 번뿐이고 그 뒤로는 보내지 않는다.
   모두 기기 안에서만 돈다. 통신은 없다 */

const AWAY_DAYS = [[7, "down"], [5, "sad"], [3, "sulk"]];     // [며칠 만에, 얼굴]. 큰 날부터 본다
const AWAY_SAY = {
  sulk: n=>`흥… ${n}일 만이츄. 기다렸츄`,
  sad:  n=>`${n}일이나 기다렸츄… 와 줘서 다행이츄`,
  down: n=>`보고 싶었츄… ${n}일 만이츄`
};
const NUDGE_AT = "19:00";         // 기다리는 알림이 오는 시각(저녁 7시)
const NUDGE_DAYS = [[3, "sulk", "3일째 기다렸츄…", "한 잔만 외우고 가라츄"], [7, "down", "보고 싶츄…", "쥐돌이가 일주일째 기다리고 있츄"]];

/* 며칠 만에 왔는지로 얼굴을 고른다. 아니면 "" */
function awayKind(gap){
  for(let i = 0; i < AWAY_DAYS.length; i++) if(gap >= AWAY_DAYS[i][0]) return AWAY_DAYS[i][1];
  return "";
}
/* 앱을 켤 때 한 번(boot.js). 오랜만이면 기다린 얼굴을 건다 */
function initAway(){
  const v = VISIT && VISIT.info;
  mascot.away = (isDot() && v && v.kind === "back") ? awayKind(v.gap) : "";
  mascot.awayGap = mascot.away ? v.gap : 0;
}
/* 인사 말풍선(mascot.js renderGreeting 이 묻는다). 기다린 얼굴이 아니면 null */
function awayGreeting(){
  return mascot.away ? AWAY_SAY[mascot.away](mascot.awayGap) : null;
}
/* 한 바퀴를 끝냈다(study.js finish). 기다린 얼굴이었으면 풀리고, 홈에 돌아가면 반긴다 */
function awayRoundDone(){
  if(!mascot.away) return;
  mascot.away = ""; mascot.awayGap = 0;
  mascot.madeUp = true;
}
/* 홈을 그릴 때마다(home.js). 방금 풀렸으면 잠깐 기쁜 얼굴로 반긴다 */
let awayCheerT = null;
function awayHome(){
  if(!mascot.madeUp) return;
  mascot.madeUp = false;
  sayBubble("이제 풀렸츄! 와 줘서 기쁘츄");
  clearTimeout(awayCheerT);
  if(reduceMotion()) return;
  mascot.happy = true; drawMascot();
  awayCheerT = setTimeout(()=>{ mascot.happy = false; drawMascot(); }, 3000);
}

/* ---------- 기다리는 알림 ---------- */
/* 기본은 꺼짐. 켠 사람에게만 보낸다 */
function nudgeOn(){ return !!(data.nudge && data.nudge.on === true); }
/* 오늘부터 3일째 · 7일째 저녁에 한 번씩. 앱을 열 때마다 다시 걸리므로(syncAlarms) 실제로는 그만큼 안 열었을 때만 온다 */
function nudgeAlarmItems(now){
  if(!isDot() || !nudgeOn()) return [];
  now = now || new Date();
  const h = Number(NUDGE_AT.slice(0, 2)), mi = Number(NUDGE_AT.slice(3, 5));
  return NUDGE_DAYS.map(([n, face, title, body])=>{
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n, h, mi);
    return {id:"nudge-" + n, at: ymd(at) + "T" + NUDGE_AT, title:title, body:body, image:face};
  });
}
function nudgeSettings(){
  const card = $("#nudgeCard"); if(!card) return;
  const on = nudgeOn();
  card.innerHTML = `<h4>쥐돌이가 부르는 알림</h4>
    <p>며칠 안 들어오면 쥐돌이가 불러요. 3일째와 7일째 저녁 7시에 한 번씩만 오고, 그 뒤로는 보내지 않아요.</p>
    <div class="themes" id="nudgeBtns">
      <button type="button" class="theme-b${on ? " on" : ""}" data-on="1">켜기</button>
      <button type="button" class="theme-b${on ? "" : " on"}" data-on="0">끄기</button>
    </div>${on && alarmPerm === "denied"
      ? `<div class="warnbox alarmnote">알림이 꺼져 있어요. iPhone <b>설정 → 암기쥐 → 알림</b>에서 켜면 쥐돌이가 부를 수 있어요.</div>` : ""}`;
  document.querySelectorAll("#nudgeBtns .theme-b").forEach(btn=>btn.addEventListener("click", ()=>{
    data.nudge = {on: btn.dataset.on === "1"};
    if(data.nudge.on && alarmPerm === "unknown") alarmPost({op:"ask"});
    persist(); syncAlarms(); haptic("light"); nudgeSettings();
  }));
}
