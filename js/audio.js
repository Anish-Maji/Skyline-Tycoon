"use strict";
/* ================= AUDIO: original procedural lounge loop + effects ================= */
const audio = {ctx:null, music:false, sfx:true, timer:null, step:0, next:0};
function ensureAudio(){
  try{
    if (!audio.ctx){ const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      audio.ctx = new AC(); audio.master = audio.ctx.createGain(); audio.master.gain.value = .55; audio.master.connect(audio.ctx.destination);
      audio.bus = audio.ctx.createGain(); audio.bus.gain.value = .0001; audio.bus.connect(audio.master);
      audio.fx = audio.ctx.createGain(); audio.fx.gain.value = .8; audio.fx.connect(audio.master);
      const len = audio.ctx.sampleRate * .2, buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random()*2 - 1; audio.noise = buf; }
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    return true;
  }catch(e){ return false; }
}
const mtof = m => 440 * Math.pow(2, (m - 69)/12);
function tone(freq, t, dur, type, gain, dest, cutoff){
  const c = audio.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + Math.min(.04, dur/4)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  let node = o; if (cutoff){ const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cutoff; o.connect(f); node = f; }
  node.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .05);
}
function hiss(t, dur, gain, dest, hp){
  const c = audio.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = audio.noise; f.type = "highpass"; f.frequency.value = hp || 6000; g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(dest); src.start(t); src.stop(t + dur + .02);
}
const PROG = [[48,55,59,64],[45,52,55,60],[50,53,57,60],[43,50,53,59]];
const ARP = [0,2,1,3,2,1,3,2];
function scheduleMusic(){
  const c = audio.ctx, eighth = 60/92/2;
  while (audio.next < c.currentTime + .25){
    const t = audio.next, st = audio.step, bar = Math.floor(st/8) % PROG.length, ch = PROG[bar];
    if (st % 8 === 0) ch.forEach(m => tone(mtof(m), t, eighth*8, "triangle", .028, audio.bus, 900));
    if (st % 4 === 0) tone(mtof(ch[0]-12), t, eighth*3, "sine", .09, audio.bus);
    const m = ch[ARP[st % 8]] + 12 + (st % 16 > 11 ? 12 : 0);
    if (!(st % 8 === 7 && bar === 3)) tone(mtof(m), t + (st % 2 ? eighth*.12 : 0), eighth*1.6, "sine", .04, audio.bus, 2600);
    if (st % 2 === 1) hiss(t, .05, .018, audio.bus, 7000);
    audio.step++; audio.next += eighth;
  }
}
function setMusic(on){
  audio.music = on; if (on && !ensureAudio()){ audio.music = false; return; }
  if (on){ audio.next = audio.ctx.currentTime + .05; clearInterval(audio.timer); audio.timer = setInterval(scheduleMusic, 60);
    audio.bus.gain.cancelScheduledValues(audio.ctx.currentTime); audio.bus.gain.setTargetAtTime(1, audio.ctx.currentTime, .4); }
  else if (audio.ctx){ audio.bus.gain.setTargetAtTime(.0001, audio.ctx.currentTime, .2); setTimeout(() => { if (!audio.music) clearInterval(audio.timer); }, 800); }
}
/* Sound files from LANDING_SOUNDS. Each file is loaded once and restarted if it plays again. */
const clips = {};
function playLanding(tile){
  const L = LANDING_SOUNDS[tile]; if (!L || !audio.sfx) return;
  try{
    let a = clips[tile]; if (!a){ a = clips[tile] = new Audio(L.src); a.preload = "auto"; a.onerror = () => console.warn("Sound not found:", L.src); }
    a.volume = L.volume ?? 1; a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {});
  }catch(e){}
}
function sfx(kind){
  if (!audio.sfx || !audio.ctx) return; const t = audio.ctx.currentTime, d = audio.fx;
  if (kind === "dice"){ for (let i = 0; i < 5; i++) hiss(t + i*.055, .04, .25, d, 2500); tone(180, t + .3, .08, "square", .05, d, 900); }
  else if (kind === "hop") tone(520 + Math.random()*80, t, .07, "sine", .06, d);
  else if (kind === "buy"){ [72,76,79,84].forEach((m, i) => tone(mtof(m), t + i*.07, .25, "triangle", .09, d)); }
  else if (kind === "card"){ tone(mtof(79), t, .2, "sine", .08, d); tone(mtof(86), t + .1, .35, "sine", .07, d); }
  else if (kind === "crash"){ [64,60,55].forEach((m, i) => tone(mtof(m), t + i*.14, .3, "sawtooth", .05, d, 1400)); }
  else if (kind === "festival"){ [67,72,76,79,84].forEach((m, i) => tone(mtof(m), t + i*.08, .3, "triangle", .08, d)); for (let i = 0; i < 6; i++) hiss(t + .2 + i*.09, .06, .12, d, 4000); }
  else if (kind === "win"){ [60,64,67,72,76,79,84].forEach((m, i) => tone(mtof(m), t + i*.09, .5, "triangle", .1, d)); }
}
