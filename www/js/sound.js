/* 암기쥐 — 소리. 음원 파일 없이 전부 코드로 만든다.
   파일을 쓰면 CSP 에 media-src 를 열어야 하고 저작권도 따라온다. 합성은 그 둘이 없다.

   data.sound 는 "off" | "sfx" | "all". 기본은 off — 카페 근무 중에 갑자기
   소리가 나면 곤란하다. 배경음(all)은 켜 두면 앱 어디서나 흐른다.

   소리는 사용자가 화면을 한 번 건드린 뒤에야 재생할 수 있다(브라우저 규칙).
   그래서 AudioContext 를 미리 만들지 않고 첫 소리 때 만든다. */

let actx = null, master = null, wetBus = null, lowpass = null;

function soundOn(){ return data.sound === "sfx" || data.sound === "all"; }
function bgmAllowed(){ return data.sound === "all"; }
function audioReady(){ return actx !== null; }      // 테스트와 디버깅용

function audio(){
  if(actx) return actx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return null;
  actx = new AC();

  master = actx.createGain();
  master.gain.value = 0.5;

  lowpass = actx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 4200;

  /* 잔향은 임펄스 파일 대신 피드백 딜레이 두 줄로 만든다 */
  wetBus = actx.createGain();
  wetBus.gain.value = 0.2;
  [[0.31, -0.5], [0.47, 0.5]].forEach(d=>{
    const dl = actx.createDelay(1.2); dl.delayTime.value = d[0];
    const fb = actx.createGain(); fb.gain.value = 0.42;
    const damp = actx.createBiquadFilter(); damp.type = "lowpass"; damp.frequency.value = 1900;
    const pan = actx.createStereoPanner ? actx.createStereoPanner() : null;
    if(pan) pan.pan.value = d[1];
    wetBus.connect(dl); dl.connect(damp); damp.connect(fb); fb.connect(dl);
    if(pan){ damp.connect(pan); pan.connect(lowpass); } else { damp.connect(lowpass); }
  });
  wetBus.connect(lowpass);
  lowpass.connect(master);
  master.connect(actx.destination);
  return actx;
}

/* 소리 하나가 지나가는 길. 마른 소리와 잔향 양쪽으로 보낸다 */
function sbus(){
  const g = actx.createGain();
  g.connect(lowpass); g.connect(wetBus);
  return g;
}
function srand(a, b){ return a + Math.random() * (b - a); }
function spick(a){ return a[Math.floor(Math.random() * a.length)]; }
function shz(semi){ return 440 * Math.pow(2, semi / 12); }

function stone(opt){
  const t = actx.currentTime + (opt.at || 0);
  const o = actx.createOscillator();
  o.type = opt.type || "sine";
  o.frequency.setValueAtTime(opt.from, t);
  if(opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t + opt.len);
  const g = sbus();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opt.peak || 0.12, t + (opt.rise || 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t + opt.len);
  if(opt.cut){
    const f = actx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = opt.cut;
    o.connect(f); f.connect(g);
  } else o.connect(g);
  o.start(t); o.stop(t + opt.len + 0.05);
}

function snoise(t, len, cut, q, peak){
  const buf = actx.createBuffer(1, Math.ceil(actx.sampleRate * len), actx.sampleRate);
  const d = buf.getChannelData(0);
  for(let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = actx.createBufferSource(); src.buffer = buf;
  const f = actx.createBiquadFilter();
  f.type = "bandpass"; f.frequency.value = cut; f.Q.value = q || 1;
  const g = sbus();
  g.gain.setValueAtTime(peak || 0.08, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f); f.connect(g);
  src.start(t); src.stop(t + len);
}

/* 쥐돌이 "츄".
   ㅊ 은 짧은 바람 소리, ㅠ 는 밴드패스로 목소리처럼 좁힌 음.
   음높이가 올라갔다 내려와야 귀엽다. 평평하면 기계음이 된다.
   누를 때마다 조금씩 달라야 연타해도 같은 소리로 들리지 않는다. */
function chuSound(sleepy){
  const t = actx.currentTime;
  const k = srand(0.94, 1.06);
  const lo  = (sleepy ? 430 : 760) * k;
  const top = (sleepy ? 650 : 1240) * k;
  const end = (sleepy ? 360 : 940) * k;
  const dur = sleepy ? 0.5 : 0.22;

  snoise(t, sleepy ? 0.05 : 0.035, sleepy ? 2600 : 4200, 0.9, sleepy ? 0.02 : 0.035);

  const g = sbus();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(sleepy ? 0.075 : 0.105, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const f = actx.createBiquadFilter();          // 입 모양 흉내
  f.type = "bandpass";
  f.frequency.value = sleepy ? 900 : 1500;
  f.Q.value = 3.5;
  f.connect(g);

  const lfo = actx.createOscillator(); lfo.frequency.value = sleepy ? 5 : 18;
  const lg = actx.createGain(); lg.gain.value = sleepy ? 12 : 26;
  lfo.connect(lg);

  [[1, 1], [2, 0.3]].forEach(h=>{
    const o = actx.createOscillator();
    o.type = h[0] === 1 ? "triangle" : "sine";
    o.frequency.setValueAtTime(lo * h[0], t);
    o.frequency.linearRampToValueAtTime(top * h[0], t + dur * 0.35);
    o.frequency.linearRampToValueAtTime(end * h[0], t + dur);
    lg.connect(o.frequency);
    const hg = actx.createGain(); hg.gain.value = h[1];
    o.connect(hg); hg.connect(f);
    o.start(t); o.stop(t + dur + 0.05);
  });
  lfo.start(t); lfo.stop(t + dur + 0.05);
}

const SFX = {
  chu:      ()=>chuSound(false),
  chuSleep: ()=>chuSound(true),
  /* 종이 한 장 넘기는 소리 */
  flip: ()=>{
    snoise(actx.currentTime, 0.13, 1500, 0.9, 0.075);
    stone({from:520, to:360, len:0.14, peak:0.05});
  },
  /* 올라가는 두 음. 칭찬하되 요란하지 않게 */
  ok: ()=>{
    stone({from:shz(2), len:0.5, peak:0.1});
    stone({from:shz(9), len:0.9, peak:0.085, at:0.11});
  },
  /* 낮고 짧게. 틀렸다고 혼내는 소리가 되면 안 된다 */
  again: ()=>stone({from:shz(-9), to:shz(-12), len:0.55, peak:0.1, cut:900}),
  /* 빈칸이 열릴 때. 한 카드에서 서너 번 연달아 나므로 아주 짧고 가볍게.
     카드 뒤집기(종이 소리)와 헷갈리지 않게 맑은 한 점으로 낸다 */
  reveal: ()=>{
    const k = srand(0.97, 1.05);                  // 연달아 눌러도 같은 소리가 아니게
    stone({from:shz(12) * k, len:0.16, peak:0.07});
    stone({from:shz(19) * k, len:0.22, peak:0.035, at:0.015});
  },
  /* 네 음이 차례로. 세션이 끝난 자리 */
  done: ()=>[2, 4, 9, 14].forEach((s, i)=>
    stone({from:shz(s), len:1.1 + i * 0.2, peak:0.075, at:i * 0.16}))
};

function sfx(name){
  if(!soundOn() || !SFX[name]) return;
  if(!audio()) return;
  if(actx.state === "suspended") actx.resume();
  try{ SFX[name](); }catch(e){ /* 소리 하나 때문에 앱이 멈추면 안 된다 */ }
}

/* ---------- 배경음 ----------
   켜 두면 앱 어디서나 흐른다. 레시피를 적거나 목록을 볼 때도 이어진다.
   카페에서 흐르는 느린 재즈. 84 BPM, Dm9 → G9 → Cmaj9 → Am9.
   마디마다 세기와 타이밍이 달라져 같은 구간이 반복되지 않는다. */
const BPM = 84, BEAT = 60 / BPM, BAR = BEAT * 4;
const CHORDS = [
  { root:-29, voice:[-7, -4, 0, 7] },
  { root:-26, voice:[-2, 2, 8, 12] },
  { root:-33, voice:[-9, -5, -2, 2] },
  { root:-24, voice:[-12, -9, -5, 2] }
];
const MELODY = [3, 5, 7, 10, 12, 14, 15, 17];
const bgm = { on:false, timer:null, bar:0 };

/* 전자 피아노: 사인파로 다른 사인파의 음높이를 흔들고, 흔들림을 빠르게 줄인다 */
function rhodes(freq, t, dur, vel, panv){
  const car = actx.createOscillator(); car.type = "sine"; car.frequency.value = freq;
  const mod = actx.createOscillator(); mod.type = "sine"; mod.frequency.value = freq * 2;
  const mg = actx.createGain();
  mg.gain.setValueAtTime(freq * 2.2 * vel, t);
  mg.gain.exponentialRampToValueAtTime(freq * 0.05, t + 0.3);
  mod.connect(mg); mg.connect(car.frequency);

  const g = sbus();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.085 * vel, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
  car.connect(lp);
  if(actx.createStereoPanner){
    const p = actx.createStereoPanner(); p.pan.value = panv || 0;
    lp.connect(p); p.connect(g);
  } else lp.connect(g);
  car.start(t); car.stop(t + dur + 0.05);
  mod.start(t); mod.stop(t + dur + 0.05);
}
function bassNote(freq, t, dur){
  const o = actx.createOscillator(); o.type = "triangle"; o.frequency.value = freq;
  const g = sbus();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.13, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420;
  o.connect(lp); lp.connect(g);
  o.start(t); o.stop(t + dur + 0.05);
}
function brush(t){
  const len = 0.34;
  const buf = actx.createBuffer(1, Math.ceil(actx.sampleRate * len), actx.sampleRate);
  const d = buf.getChannelData(0);
  for(let i = 0; i < d.length; i++){
    const k = i / d.length;
    d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * k) * 0.8;   // 쓸어내는 모양
  }
  const src = actx.createBufferSource(); src.buffer = buf;
  const f = actx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2800; f.Q.value = 0.7;
  const g = sbus(); g.gain.value = 0.05;
  src.connect(f); f.connect(g);
  src.start(t); src.stop(t + len);
}
function kick(t){
  const o = actx.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(115, t);
  o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
  const g = sbus();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.14, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  o.connect(g); o.start(t); o.stop(t + 0.3);
}

function bgmBar(){
  if(!bgm.on) return;
  const t0 = actx.currentTime + 0.06;
  const c = CHORDS[bgm.bar % CHORDS.length];
  bgm.bar++;

  bassNote(shz(c.root), t0, BEAT * 1.6);
  bassNote(shz(c.root + 7), t0 + BEAT * 2, BEAT * 1.2);

  /* 사람이 치듯 세기와 타이밍을 조금씩 어긋나게 */
  c.voice.forEach((s, i)=>rhodes(shz(s), t0 + srand(0, 0.02), BEAT * 2.4, srand(0.75, 1), (i - 1.5) * 0.18));
  if(Math.random() < 0.55)
    c.voice.slice(1).forEach((s, i)=>rhodes(shz(s), t0 + BEAT * 2.62 + srand(0, 0.02), BEAT * 1.4, srand(0.45, 0.7), (i - 1) * 0.2));

  kick(t0);
  if(Math.random() < 0.6) kick(t0 + BEAT * 2.5);
  brush(t0 + BEAT * 2);
  for(let b = 0; b < 4; b++){
    snoise(t0 + BEAT * b, 0.028, 7600, 2.4, 0.03 * srand(0.7, 1));
    if(Math.random() < 0.8) snoise(t0 + BEAT * (b + 0.62), 0.028, 7600, 2.4, 0.03 * srand(0.35, 0.6));  // 스윙
  }

  /* 멜로디는 아껴서. 매 마디 울리면 외우는 데 방해가 된다 */
  if(Math.random() < 0.45){
    rhodes(shz(spick(MELODY)), t0 + BEAT * spick([1, 2, 3]), BEAT * 1.6, srand(0.5, 0.8), srand(-0.3, 0.3));
    if(Math.random() < 0.5) rhodes(shz(spick(MELODY)), t0 + BEAT * 3.6, BEAT, srand(0.4, 0.6), 0);
  }

  bgm.timer = setTimeout(bgmBar, BAR * 1000);
}

function bgmStart(){
  if(bgm.on || !bgmAllowed()) return;
  if(!audio()) return;
  if(actx.state === "suspended") actx.resume();
  bgm.on = true; bgm.bar = 0;
  bgmBar();
}
function bgmStop(){
  bgm.on = false;
  if(bgm.timer){ clearTimeout(bgm.timer); bgm.timer = null; }
}
function bgmPlaying(){ return bgm.on; }

/* 브라우저는 사용자가 화면을 한 번 건드린 뒤에야 소리를 내준다.
   그래서 앱을 열자마자 틀 수 없고, 첫 터치를 기다렸다 시작한다.
   이미 흐르고 있거나 꺼져 있으면 아무 일도 하지 않으므로 계속 달아둬도 된다. */
function armBgm(){ if(bgmAllowed() && !bgm.on) bgmStart(); }
["pointerdown", "keydown"].forEach(ev=>document.addEventListener(ev, armBgm));

/* 화면이 가려지면 멈추고(주머니 속에서 울리면 곤란하다) 돌아오면 다시 잇는다 */
document.addEventListener("visibilitychange", ()=>{
  if(document.hidden) bgmStop(); else armBgm();
});
