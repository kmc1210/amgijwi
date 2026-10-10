/* 암기쥐 — 생일 축하 (1.1 · 앱 전용)
   설정에서 생일(월 · 일)을 알려 주면 그날 쥐돌이가 축하한다.
   · 알림: 고른 시각에 "생일 축하해츄!" (일정 알림과 같은 통로 — cal.js alarmPlan 에 한 줄 얹는다)
   · 홈: 인사말이 바뀌고, 쥐돌이가 하루 동안 고깔모자를 쓰고, 처음 열 때 폭죽이 한 번 터진다
   · 선물: 치즈 +10 (한 해에 한 번)
   연도는 받지 않는다. 나이는 쓸 데가 없고, 덜 받는 쪽이 낫다.
   생일은 data.bday 에 두어 다른 것처럼 기기 안에만 남고 백업을 따라간다. 통신은 없다 */

const BDAY_CHEESE = 10;
const BDAY_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];   // 2월은 29일까지 고를 수 있다

/* m · d 가 없으면 아직 알려 주지 않은 것. gift 는 선물을 받은 해, party 는 폭죽을 본 날 */
function cleanBday(b){
  b = (b && typeof b === "object") ? b : {};
  const m = Math.floor(Number(b.m)) || 0, d = Math.floor(Number(b.d)) || 0;
  const ok = m >= 1 && m <= 12 && d >= 1 && d <= BDAY_DAYS[m - 1];
  return {
    m: ok ? m : 0, d: ok ? d : 0,
    alarm: b.alarm !== false,
    at: /^([01]\d|2[0-3]):[0-5]\d$/.test(b.at) ? b.at : "09:00",
    gift: /^\d{4}$/.test(b.gift) ? b.gift : "",
    party: typeof b.party === "string" ? b.party : ""
  };
}
data.bday = cleanBday(data.bday);

function bdaySet(){ return data.bday.m > 0 && data.bday.d > 0; }
function leapYear(y){ return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
/* 그 해에 축하하는 날. 2월 29일생은 윤년이 아니면 2월 28일에 축하한다 */
function bdayDateIn(y){
  const b = data.bday;
  return new Date(y, b.m - 1, (b.m === 2 && b.d === 29 && !leapYear(y)) ? 28 : b.d);
}
function bdayIsToday(now){
  if(!isDot() || !bdaySet()) return false;
  now = now || new Date();
  const t = bdayDateIn(now.getFullYear());
  return t.getMonth() === now.getMonth() && t.getDate() === now.getDate();
}
/* 생일 하루는 고깔모자. 안 샀어도, 다른 모자를 쓰고 있어도 씌워 준다(closet.js 가 그릴 때 묻는다) */
function bdayHat(){ return bdayIsToday() ? "partyhat" : ""; }

/* ---------- 알림 ---------- */
/* 다음 생일 알림 하나. 앱은 yearly 면 해마다 되풀이해 건다(앱을 한 해 넘게 안 열어도 온다).
   2월 29일생은 해마다 날이 달라 되풀이로 걸 수 없으니 다음 한 번만 건다(앱을 열 때마다 다시 건다) */
function bdayAlarmItem(now){
  if(!isDot() || !bdaySet() || !data.bday.alarm) return null;
  now = now || new Date();
  const h = Number(data.bday.at.slice(0, 2)), mi = Number(data.bday.at.slice(3, 5));
  let y = now.getFullYear(), at = null;
  for(let i = 0; i < 2; i++){
    const day = bdayDateIn(y + i);
    at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, mi);
    if(at > now) break;
  }
  return {id:"bday", at: ymd(at) + "T" + data.bday.at, title:"생일 축하해츄!", body:"쥐돌이가 선물을 준비했츄",
          yearly: !(data.bday.m === 2 && data.bday.d === 29), image:"cake", when: at.getTime()};
}

/* ---------- 홈 ---------- */
/* 인사말과 말풍선(mascot.js renderGreeting 이 묻는다). 생일이 아니면 null */
function bdayGreeting(now){
  if(!bdayIsToday(now)) return null;
  return {title:"생일 축하해요!", msg:"생일 축하해츄! 오늘은 쥐돌이가 고깔모자도 썼츄"};
}
/* 선물은 한 해에 한 번. 생일을 오늘로 바꿔 가며 거듭 받지 못한다 */
function earnBdayCheese(now){
  if(!bdayIsToday(now)) return false;
  const y = String((now || new Date()).getFullYear());
  if(data.bday.gift === y) return false;
  data.bday.gift = y; data.closet.cheese += BDAY_CHEESE;
  persist();
  return true;
}
/* 홈을 그릴 때마다 부른다(home.js). 생일이면 선물을 주고, 그날 처음이면 폭죽을 터트린다.
   잠금 화면이나 가이드에 가려 있으면 미뤘다가 다음에 홈을 그릴 때 터트린다 */
function bdayHome(){
  const now = new Date();
  if(!bdayIsToday(now)) return;
  if(earnBdayCheese(now)){
    const n = $("#cheeseN"); if(n) n.textContent = data.closet.cheese;
    sayBubble("생일 축하해츄! 선물로 치즈 " + BDAY_CHEESE + "개 가져왔츄");
  }
  const today = ymd(now);
  if(data.bday.party === today || bdayHidden()) return;
  data.bday.party = today; persist();
  playBdayParty();
}
function bdayHidden(){
  const home = $("#s-home"), lock = $("#lock"), guide = $("#onboard");
  return !home || !home.classList.contains("active")
      || (lock && lock.classList.contains("on")) || (guide && !guide.hidden);
}

/* ---------- 폭죽 ---------- */
/* 화면 위에 잠깐 얹는 도트 폭죽과 색종이. 누르는 것을 막지 않고(pointer-events:none) 다 끝나면 스스로 치운다.
   동작 줄이기를 켠 기기에서는 터트리지 않는다(모자 · 인사말 · 선물은 그대로) */
const BDAY_COLORS = ["#F7CE66", "#F08AA0", "#C9605A", "#7FA8C4", "#4E9A6E", "#FCF7F1", "#E2AF42"];
let bdayRaf = 0;
function stopBdayParty(){
  cancelAnimationFrame(bdayRaf); bdayRaf = 0;
  const old = $("#bdayFx"); if(old) old.remove();
}
function playBdayParty(){
  stopBdayParty();
  if(reduceMotion()) return false;
  const cv = document.createElement("canvas");
  cv.id = "bdayFx"; cv.setAttribute("aria-hidden", "true");
  /* 도트가 굵게 보이도록 화면의 절반 크기로 그리고 두 배로 늘린다 */
  const W = Math.round(window.innerWidth / 2), H = Math.round(window.innerHeight / 2);
  cv.width = W; cv.height = H;
  document.body.appendChild(cv);
  const c = cv.getContext("2d");
  let parts = [], f = 0;
  const burst = (x, y, col)=>{
    for(let i = 0; i < 22; i++){
      const a = i / 22 * Math.PI * 2, s = 1.1 + Math.random() * 1.5;
      parts.push({x:x, y:y, vx:Math.cos(a) * s, vy:Math.sin(a) * s, g:.035, life:46 + Math.random() * 16,
                  c:Math.random() < .7 ? col : "#FCF7F1", s:2, w:0});
    }
  };
  const confetti = ()=>{
    for(let i = 0; i < 46; i++){
      parts.push({x:Math.random() * W, y:-Math.random() * 90, vx:(Math.random() - .5) * .5, vy:.7 + Math.random() * .9, g:0, life:260,
                  c:BDAY_COLORS[i % BDAY_COLORS.length], s:i % 3 ? 2 : 3, w:1 + Math.random() * 6});
    }
  };
  /* [몇 번째 그림에, 가로 · 세로 어디에(화면 비율), 무슨 색] */
  const plan = [[6, .3, .2, "#F7CE66"], [26, .72, .14, "#F08AA0"], [46, .5, .32, "#7FA8C4"], [70, .2, .4, "#4E9A6E"], [90, .8, .36, "#F7CE66"]];
  const frame = ()=>{
    f++;
    c.clearRect(0, 0, W, H);
    plan.forEach(p=>{ if(p[0] === f) burst(W * p[1], H * p[2], p[3]); });
    if(f === 6){ sfx("chu"); haptic("success"); }
    if(f === 30) confetti();
    parts = parts.filter(p=>p.life > 0 && p.y < H + 4);
    parts.forEach(p=>{
      p.vy += p.g;
      p.x += p.vx + (p.w ? Math.sin((f + p.w * 9) / 9) * .35 : 0);
      p.y += p.vy;
      if(!p.w){ p.vx *= .975; p.vy *= .975; }
      p.life--;
      if(!p.w && p.life < 12 && f % 2) return;          // 꺼지기 직전엔 깜빡인다
      c.fillStyle = p.c;
      c.fillRect(Math.round(p.x / 2) * 2, Math.round(p.y / 2) * 2, p.s, p.s);
    });
    if(f < 330 && (f < 100 || parts.length)) bdayRaf = requestAnimationFrame(frame);
    else stopBdayParty();
  };
  bdayRaf = requestAnimationFrame(frame);
  return true;
}

/* ---------- 설정 ---------- */
function bdaySave(){
  data.bday = cleanBday(data.bday);
  persist();
  syncAlarms();                 // 생일 · 시각 · 켜고 끔이 바뀌면 알림을 다시 건다 (cal.js)
  drawMascot();                 // 오늘이 생일이 됐거나 아니게 됐으면 모자가 바뀐다
}
function bdaySettings(){
  const card = $("#bdayCard"); if(!card) return;
  const b = data.bday, set = bdaySet();
  const opt = (v, label, cur)=>`<option value="${v}"${v === cur ? " selected" : ""}>${label}</option>`;
  const months = opt(0, "월", b.m) + BDAY_DAYS.map((_, i)=>opt(i + 1, (i + 1) + "월", b.m)).join("");
  const dayMax = b.m ? BDAY_DAYS[b.m - 1] : 31;
  let days = opt(0, "일", b.d);
  for(let i = 1; i <= dayMax; i++) days += opt(i, i + "일", b.d);
  let alarm = "";
  if(set){
    alarm = `<p class="bdlabel">생일 알림</p>
      <div class="themes" id="bdAlarmBtns">
        <button type="button" class="theme-b${b.alarm ? " on" : ""}" data-on="1">켜기</button>
        <button type="button" class="theme-b${b.alarm ? "" : " on"}" data-on="0">끄기</button>
      </div>`;
    if(b.alarm){
      alarm += alarmPerm === "denied"
        ? `<div class="warnbox alarmnote">알림이 꺼져 있어요. iPhone <b>설정 → 암기쥐 → 알림</b>에서 켜면 생일 알림이 옵니다.</div>`
        : `<div class="fld bdtime"><label for="bdAt">몇 시에 받을까요</label><input type="time" id="bdAt" value="${esc(b.at)}"></div>`;
    }
    alarm += `<button type="button" class="bdclear" id="bdClear">생일 지우기</button>`;
  }
  card.innerHTML = `<h4>내 생일</h4>
    <p>알려 주면 생일날 쥐돌이가 축하해 줘요. 월 · 일만 받고, 이 기기 안에만 저장돼요.</p>
    <div class="bdrow fld">
      <select id="bdM" aria-label="생일 월">${months}</select>
      <select id="bdD" aria-label="생일 일">${days}</select>
    </div>${alarm}`;

  const pick = ()=>{
    const m = Number($("#bdM").value), max = m ? BDAY_DAYS[m - 1] : 31;
    const d = Math.min(Number($("#bdD").value), max);
    const had = bdaySet();
    data.bday.m = m; data.bday.d = d;
    if(m && d){
      /* 처음 알려 줄 때 알림 권한을 묻는다(일정 알림을 처음 켤 때와 같다) */
      if(!had && data.bday.alarm && alarmPerm === "unknown") alarmPost({op:"ask"});
      bdaySave(); haptic("selection");
      if(bdayIsToday()) renderHome();          // 오늘이 생일이면 홈으로 갔을 때 바로 축하한다
    } else if(had){
      /* 월이나 일을 비우면 생일을 지운 것. 받은 선물 · 폭죽 기록은 남긴다 */
      bdaySave();
    }
    bdaySettings();
  };
  $("#bdM").addEventListener("change", pick);
  $("#bdD").addEventListener("change", pick);
  document.querySelectorAll("#bdAlarmBtns .theme-b").forEach(btn=>btn.addEventListener("click", ()=>{
    data.bday.alarm = btn.dataset.on === "1";
    if(data.bday.alarm && alarmPerm === "unknown") alarmPost({op:"ask"});
    bdaySave(); haptic("light"); bdaySettings();
  }));
  const at = $("#bdAt");
  if(at) at.addEventListener("change", ()=>{ data.bday.at = at.value; bdaySave(); bdaySettings(); });
  const clear = $("#bdClear");
  if(clear) clear.addEventListener("click", ()=>{
    data.bday.m = 0; data.bday.d = 0;
    bdaySave(); bdaySettings(); toast("생일을 지웠어요");
  });
}
/* 백업을 되살릴 때. 생일은 백업을 따르되, 올해 선물을 이미 받았으면 그 기록은 남긴다 */
function restoreBday(bk){
  if(!bk) return data.bday;
  const b = cleanBday(bk), now = data.bday;
  if(now.gift > b.gift) b.gift = now.gift;
  if(now.party > b.party) b.party = now.party;
  return b;
}
