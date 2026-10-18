/* 암기쥐 — 소리. 음원 파일 없이 전부 코드로 만든다.
   파일을 쓰면 CSP 에 media-src 를 열어야 하고 저작권도 따라온다. 합성은 그 둘이 없다.

   data.sound 는 "off" | "sfx" | "all". 기본은 off — 카페 근무 중에 갑자기
   소리가 나면 곤란하다. 배경음(all)은 켜 두면 앱 어디서나 흐른다.

   소리는 사용자가 화면을 한 번 건드린 뒤에야 재생할 수 있다(브라우저 규칙).
   그래서 AudioContext 를 미리 만들지 않고 첫 소리 때 만든다. */

let actx = null, master = null, wetBus = null, lowpass = null;

function soundOn(){ return data.sound === "sfx" || data.sound === "all"; }
/* bgmHold: 광고가 뜨는 동안에는 화면을 눌러도 배경음을 다시 켜지 않는다(광고 소리와 겹친다 — ads.js) */
let bgmHold = false;
function bgmAllowed(){ return data.sound === "all" && !bgmHold; }
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
    stone({from:shz(s), len:1.1 + i * 0.2, peak:0.075, at:i * 0.16})),
  /* 까악. 톱니파에 빠른 떨림을 얹고 음을 떨어뜨려 새 울음을 흉내 낸다.
     까- 하고 짧게, 악- 하고 길게 두 마디로 낸다 */
  caw: ()=>{
    [[0, 0.1, 700, 520], [0.16, 0.3, 640, 380]].forEach(p=>{
      const t = actx.currentTime + p[0];
      const o = actx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(p[2], t);
      o.frequency.exponentialRampToValueAtTime(p[3], t + p[1]);
      const lfo = actx.createOscillator(); lfo.frequency.value = 34;
      const lg = actx.createGain(); lg.gain.value = 42;
      lfo.connect(lg); lg.connect(o.frequency);
      const f = actx.createBiquadFilter();
      f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 1.4;
      const g = sbus();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.085, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + p[1]);
      o.connect(f); f.connect(g);
      o.start(t); o.stop(t + p[1] + 0.03);
      lfo.start(t); lfo.stop(t + p[1] + 0.03);
      snoise(t, p[1] * 0.6, 2000, 0.8, 0.03);
    });
  }
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
const bgm = { on:false, timer:null, bar:0, carol:null };

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
  if(carolWanted()){ carolBar(); return; }
  bgm.carol = null;
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

/* ---------- 크리스마스 밤 테마의 캐롤 (1.5) ----------
   크리스마스 밤 테마 + "효과음+배경음"이면 카페 재즈 대신 저작권이 끝난 옛 캐롤 세 곡을 차례로 되풀이한다:
   징글벨(1857) → We Wish You a Merry Christmas(영국 민요) → 고요한 밤(1818).
   종소리가 멜로디를 치고, 카페 배경음과 같은 전자 피아노 · 베이스가 화음을 깐다. 징글벨에는 썰매 방울.
   한 마디씩 이어 그리고(테마를 바꾸면 다음 마디부터 카페 재즈), 마디 시작 시각을 이어 붙여 박자가 밀리지 않게 한다.
   학습 화면에서는 종소리 멜로디를 쉬고 화음만 깐다(외우는 데 방해가 된다 — 눈도 학습 화면에서는 멈춘다).
   앱이 뒤로 갔다 오거나 광고 뒤에도 듣던 자리부터 잇는다(처음부터 하면 징글벨만 듣게 된다) */
const CAROL_CH = {C:[48,[60,64,67]], F:[53,[60,65,69]], G7:[43,[59,62,65]], D7:[50,[60,62,66]], Am:[45,[60,64,69]], E7:[52,[59,62,68]]};
const CAROLS = [
  {id:"jingle", bpm:112, beats:4, jingle:true,
    mel:[[64,1],[64,1],[64,2],[64,1],[64,1],[64,2],[64,1],[67,1],[60,1.5],[62,.5],[64,4],
         [65,1],[65,1],[65,1.5],[65,.5],[65,1],[64,1],[64,1],[64,.5],[64,.5],[64,1],[62,1],[62,1],[64,1],[62,2],[67,2],
         [64,1],[64,1],[64,2],[64,1],[64,1],[64,2],[64,1],[67,1],[60,1.5],[62,.5],[64,4],
         [65,1],[65,1],[65,1.5],[65,.5],[65,1],[64,1],[64,1],[64,.5],[64,.5],[67,1],[67,1],[65,1],[62,1],[60,4]],
    ch:["C","C","C","C","F","C","D7","G7","C","C","C","C","F","C","G7","C"]},
  {id:"wish", bpm:104, beats:3, pickup:[[67,1]],
    mel:[[72,1],[72,.5],[74,.5],[72,.5],[71,.5],[69,1],[69,1],[69,1],[74,1],[74,.5],[76,.5],[74,.5],[72,.5],[71,1],[67,1],[67,1],
         [76,1],[76,.5],[77,.5],[76,.5],[74,.5],[72,1],[69,1],[67,.5],[67,.5],[69,1],[74,1],[71,1],[72,3]],
    ch:["C","F","D7","G7","E7","Am","G7","C"]},
  {id:"silent", bpm:66, beats:3,
    mel:[[67,1.5],[69,.5],[67,1],[64,3],[67,1.5],[69,.5],[67,1],[64,3],[74,2],[74,1],[71,3],[72,2],[72,1],[67,3],
         [69,2],[69,1],[72,1.5],[71,.5],[69,1],[67,1.5],[69,.5],[67,1],[64,3],[69,2],[69,1],[72,1.5],[71,.5],[69,1],[67,1.5],[69,.5],[67,1],[64,3],
         [74,2],[74,1],[77,1.5],[74,.5],[71,1],[72,3],[76,3],[72,1],[67,1],[64,1],[67,1.5],[65,.5],[62,1],[60,6]],
    ch:["C","C","C","C","G7","G7","C","C","F","F","C","C","F","F","C","C","G7","G7","C","C","C","G7","C","C"]}
];
function carolWanted(){ return isDot() && shownTheme() === "xmnight"; }
function mhz(m){ return shz(m - 69); }
/* 곡을 마디로 나눈다: [{len(박), chord, notes:[[음, 마디 안 시작 박, 길이]]}]. 못갖춘마디가 있으면 맨 앞 한 마디, 곡 끝에는 쉬는 두 박 */
function carolBars(song){
  const pick = (song.pickup || []).reduce((a, n)=>a + n[1], 0), bars = [];
  if(pick) bars.push({len: pick, chord: null, notes: []});
  song.ch.forEach(c=>bars.push({len: song.beats, chord: c, notes: []}));
  let at = 0;
  (song.pickup || []).concat(song.mel).forEach(n=>{
    let b = 0, start = 0;
    while(b < bars.length - 1 && at >= start + bars[b].len - 1e-6){ start += bars[b].len; b++; }
    if(n[0]) bars[b].notes.push([n[0], at - start, n[1]]);
    at += n[1];
  });
  bars.push({len: 2, chord: null, notes: []});
  return bars;
}
const CAROL_BARS = CAROLS.map(carolBars);
/* 종소리: 사인파와 배음 둘, 짧게 사라진다 */
function bell(m, t, dur){
  [[1, 0.1], [2.01, 0.032], [3.02, 0.014]].forEach(h=>{
    const o = actx.createOscillator(); o.type = "sine"; o.frequency.value = mhz(m) * h[0];
    const g = sbus(), end = t + Math.min(2.5, Math.max(0.35, dur * 1.4));      // 긴 음도 2.5초면 사라진다(멈춘 뒤 오래 울리지 않게)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(h[1], t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, end);
    o.connect(g); o.start(t); o.stop(end + 0.05);
  });
}
/* 썰매 방울: 잡음 한 조각을 한 번만 만들어 두고 되쓴다 */
let sleighBuf = null;
function sleighBell(t){
  if(!sleighBuf){
    sleighBuf = actx.createBuffer(1, Math.ceil(actx.sampleRate * 0.12), actx.sampleRate);
    const d = sleighBuf.getChannelData(0);
    for(let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  }
  const src = actx.createBufferSource(); src.buffer = sleighBuf;
  const f = actx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 6500;
  const g = sbus(); g.gain.value = 0.035;
  src.connect(f); f.connect(g); src.start(t);
}
function carolBar(){
  if(!bgm.carol) bgm.carol = {song: 0, bar: 0, t: actx.currentTime + 0.06};
  const st = bgm.carol, song = CAROLS[st.song], bars = CAROL_BARS[st.song], bar = bars[st.bar], B = 60 / song.bpm;
  const t0 = Math.max(st.t, actx.currentTime + 0.03);
  if(!$("#s-study").classList.contains("active")) bar.notes.forEach(n=>bell(n[0], t0 + n[1] * B, n[2] * B));
  if(bar.chord){
    const c = CAROL_CH[bar.chord];
    bassNote(mhz(c[0]), t0, B * Math.min(2, song.beats) * 0.95);
    if(song.beats === 4) bassNote(mhz(c[0] + 7), t0 + 2 * B, B * 1.6);
    c[1].forEach((m, i)=>rhodes(mhz(m), t0 + srand(0, 0.015), B * song.beats * 0.9, 0.7, (i - 1) * 0.2));
    if(song.beats === 3) [1, 2].forEach(k=>c[1].forEach(m=>rhodes(mhz(m), t0 + k * B, B * 0.8, 0.4, 0)));
    if(song.jingle) for(let k = 0; k < song.beats * 2; k++) sleighBell(t0 + k * B / 2);
  }
  st.t = t0 + bar.len * B;
  if(++st.bar >= bars.length){ st.bar = 0; st.song = (st.song + 1) % CAROLS.length; }
  bgm.timer = setTimeout(bgmBar, Math.max(0, (st.t - actx.currentTime - 0.35) * 1000));      // 다음 마디는 0.35초 앞서 미리 걸어 둔다(화면을 그리느라 늦어도 박자가 밀리지 않게)
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
