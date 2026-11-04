/* ========= DEMİR TAÇ — ses motoru (WebAudio sentez, dosya gerektirmez) ========= */
const SFX = (() => {
  let ctx = null, master = null, crowd = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('demirtac-mute') === '1'; } catch (e) { }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : .7;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  const T = () => ctx.currentTime;
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function noise(dur, type, f0, f1, q, peak, a = .005, when = 0) {
    const t = T() + when, src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); env(g, t, a, peak, dur);
    src.connect(fl); fl.connect(g); g.connect(master); src.start(t, Math.random()); src.stop(t + a + dur + .05);
  }
  function tone(freq, dur, type = 'sine', peak = .3, a = .005, when = 0, f1 = null) {
    const t = T() + when, o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); env(g, t, a, peak, dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + a + dur + .05);
  }
  const ok = () => ctx && !muted;

  const api = {
    init,
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('demirtac-mute', muted ? '1' : '0'); } catch (e) { }
      if (ctx) master.gain.setTargetAtTime(muted ? 0 : .7, T(), .05);
      return muted;
    },
    click() { if (!ok()) return; tone(900, .05, 'triangle', .08); },
    hover() { if (!ok()) return; tone(1400, .03, 'sine', .03); },
    swing(power = 1) { if (!ok()) return; noise(.18 + power * .08, 'bandpass', 2600, 500, 1.4, .25 * power + .1, .02); },
    hit(crit = false) {
      if (!ok()) return;
      tone(150, .22, 'sine', .7, .002, 0, 45);
      noise(.12, 'lowpass', 3000, 300, .7, .5);
      tone(90, .3, 'triangle', .35, .002, 0, 40);
      if (crit) { tone(60, .5, 'sine', .7, .002, 0, 30); noise(.35, 'bandpass', 1800, 400, 1, .4, .002, .02); }
    },
    block() {
      if (!ok()) return;
      [520, 1340, 2210, 3170].forEach((f, i) => tone(f * (.97 + Math.random() * .06), .5 - i * .08, 'sine', .22 / (i + 1) + .05, .001));
      noise(.08, 'highpass', 5000, 3000, .7, .3);
    },
    cardDeal() { if (!ok()) return; noise(.07, 'bandpass', 3500, 1800, 1.2, .2, .003); },
    potion() { if (!ok()) return; [0, .08, .16].forEach((w, i) => tone(500 + i * 220, .25, 'sine', .12, .01, w, 900 + i * 300)); noise(.4, 'bandpass', 900, 2400, 3, .1, .05); },
    reveal() { if (!ok()) return; [523, 784, 1047, 1568].forEach((f, i) => { tone(f, .9, 'triangle', .08, .01, i * .09); tone(f * 1.5, .6, 'sine', .03, .01, i * .09); }); noise(1.2, 'highpass', 4000, 9000, .5, .05, .2); },
    miss() { if (!ok()) return; noise(.25, 'bandpass', 1800, 300, 2, .18, .03); },
    step() { if (!ok()) return; noise(.06, 'lowpass', 600, 200, .8, .12); },
    anvil() { if (!ok()) return; [880, 2150, 3400].forEach((f, i) => tone(f, .35 - i * .08, 'sine', .07 / (i + 1), .001)); },
    coin() { if (!ok()) return; tone(1320, .08, 'square', .06); tone(1760, .25, 'square', .06, .002, .07); tone(2640, .2, 'sine', .05, .002, .07); },
    door() { if (!ok()) return; tone(110, .25, 'sawtooth', .06, .02, 0, 80); noise(.2, 'lowpass', 500, 150, 1, .15, .01); },
    cheer(k = 1) {
      if (!ok()) return;
      const t = T(), src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = .6;
      const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.35 * k + .05, t + .25);
      g.gain.exponentialRampToValueAtTime(.0001, t + 1.8);
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 7; lg.gain.value = .12 * k;
      lfo.connect(lg); lg.connect(g.gain);
      src.connect(bp); bp.connect(g); g.connect(master); src.start(t); src.stop(t + 1.9); lfo.start(t); lfo.stop(t + 1.9);
      for (let i = 0; i < 3 + k * 3; i++) { const f = 1500 + Math.random() * 1200; tone(f, .25, 'sine', .03, .02, Math.random() * .8, f * 1.4); }
    },
    boo() {
      if (!ok()) return;
      [110, 131, 147, 165].forEach((f, i) => { tone(f, 1.1, 'sawtooth', .05, .15, i * .05, f * .75); });
      noise(1.1, 'lowpass', 600, 250, .7, .2, .15);
    },
    horn() {
      if (!ok()) return;
      [[196, 0], [262, .28], [330, .56], [392, .84]].forEach(([f, w]) => { tone(f, .5, 'sawtooth', .08, .03, w); tone(f * 2, .4, 'square', .02, .03, w); });
    },
    fall() { if (!ok()) return; tone(80, .5, 'sine', .7, .002, 0, 35); noise(.4, 'lowpass', 800, 100, .7, .4); },
    victory() { if (!ok()) return; [523, 659, 784, 1047].forEach((f, i) => { tone(f, .5, 'triangle', .12, .01, i * .14); tone(f / 2, .5, 'sawtooth', .03, .01, i * .14); }); },
    defeat() { if (!ok()) return; [392, 330, 262, 196].forEach((f, i) => tone(f, .6, 'triangle', .1, .02, i * .22)); },
    levelup() { if (!ok()) return; [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .3, 'square', .05, .005, i * .07)); },
    rest() { if (!ok()) return; noise(.9, 'bandpass', 500, 300, 1, .08, .3); },
    special() { if (!ok()) return; tone(55, 1.2, 'sawtooth', .2, .05, 0, 110); noise(1, 'bandpass', 300, 3000, 1, .3, .3); },
    /* Arena uğultusu: sürekli kalabalık sesi, coşkuya göre yükselir */
    crowdStart() {
      if (!ctx || crowd) return;
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = .5;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(bp); bp.connect(g); g.connect(master); src.start();
      crowd = { src, g, bp };
      api.crowdLevel(0);
    },
    crowdLevel(h) { if (crowd) { crowd.g.gain.setTargetAtTime(.05 + h * .14, T(), .4); crowd.bp.frequency.setTargetAtTime(600 + h * 600, T(), .4); } },
    crowdStop() { if (crowd) { const c = crowd; crowd = null; c.g.gain.setTargetAtTime(0, T(), .3); setTimeout(() => c.src.stop(), 1500); } },
    music(theme) { Music.play(theme); },
  };

  /* ================= Müzik: kod ile üretilen döngüler ================= */
  const Music = (() => {
    let theme = null, want = null, timer = null, next = 0, step = 0, mg = null, drone = [];
    const N = n => 440 * Math.pow(2, (n - 69) / 12);          // MIDI → Hz
    function out() { if (!mg) { mg = ctx.createGain(); mg.gain.value = .32; mg.connect(master); } return mg; }
    function voice(freq, when, dur, type, vol, cutoff = 2400, att = .005) {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = type; o.frequency.value = freq; f.type = 'lowpass'; f.frequency.value = cutoff;
      g.gain.setValueAtTime(.0001, when); g.gain.exponentialRampToValueAtTime(vol, when + att);
      g.gain.exponentialRampToValueAtTime(.0001, when + att + dur);
      o.connect(f); f.connect(g); g.connect(out()); o.start(when); o.stop(when + att + dur + .05);
    }
    const pluck = (n, w, d = .6, v = .12) => { voice(N(n), w, d, 'triangle', v, 2600); voice(N(n + 12), w, d * .5, 'sine', v * .3); };
    const brass = (n, w, d = .5, v = .07) => voice(N(n), w, d, 'sawtooth', v, 1300, .04);
    function drum(kind, w, v = .5) {
      if (kind === 'kick') { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(120, w); o.frequency.exponentialRampToValueAtTime(42, w + .25);
        g.gain.setValueAtTime(v, w); g.gain.exponentialRampToValueAtTime(.0001, w + .3); o.connect(g); g.connect(out()); o.start(w); o.stop(w + .35); }
      else if (kind === 'tom') { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(210, w); o.frequency.exponentialRampToValueAtTime(95, w + .2);
        g.gain.setValueAtTime(v * .7, w); g.gain.exponentialRampToValueAtTime(.0001, w + .25); o.connect(g); g.connect(out()); o.start(w); o.stop(w + .3); }
      else { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 6500;
        g.gain.setValueAtTime(v * .25, w); g.gain.exponentialRampToValueAtTime(.0001, w + .07); s.connect(f); f.connect(g); g.connect(out()); s.start(w, Math.random()); s.stop(w + .1); }
    }
    function startDrone(notes, vol) {
      stopDrone();
      notes.forEach(n => { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = N(n); f.type = 'lowpass'; f.frequency.value = 380; g.gain.value = 0;
        g.gain.setTargetAtTime(vol, T(), 1.5); o.connect(f); f.connect(g); g.connect(out()); o.start(); drone.push({ o, g }); });
    }
    function stopDrone() { drone.forEach(d => { d.g.gain.setTargetAtTime(0, T(), .4); d.o.stop(T() + 2); }); drone = []; }

    const THEMES = {
      town: { bpm: 84, sub: 2, chords: [[50, 53, 57, 62, 65], [48, 52, 55, 60, 64], [50, 53, 57, 62, 69], [45, 52, 57, 60, 64]],
        tick(s, w, b) {
          const ch = this.chords[Math.floor(s / 16) % 4], i = s % 16;
          if (i === 0) pluck(ch[0] - 12, w, 1.6, .14);
          if (i % 2 === 0 || Math.random() < .3) { if (Math.random() < .85) pluck(pick(ch.slice(1)) + (Math.random() < .3 ? 12 : 0), w, .7, .07); }
        } },
      fight: { bpm: 128, sub: 4, bass: [38, 38, 41, 38, 43, 38, 41, 36],
        tick(s, w) {
          const i = s % 16, bar = Math.floor(s / 16);
          if ([0, 6, 8, 11].includes(i)) drum('kick', w, .55);
          if (i === 4 || i === 12) drum('tom', w, .45);
          if (i % 2 === 1) drum('hat', w, .5);
          if (bar % 4 === 3 && i >= 12) drum('tom', w, .5);
          if (i % 2 === 0) voice(N(this.bass[(i / 2) % 8]), w, .16, 'sawtooth', .07, 500);
          if (i === 0 && bar % 2 === 0) [62, 65, 69].forEach(n => brass(n, w, .7, .045));
          if (i === 8 && bar % 4 === 1) [60, 64, 67].forEach(n => brass(n, w, .4, .04));
        } },
      tavern: { bpm: 150, sub: 2, scale: [67, 69, 71, 74, 76, 79, 81],
        tick(s, w) {
          const i = s % 12;
          if (i === 0 || i === 6) pluck(43 + (Math.floor(s / 12) % 2 ? 5 : 0), w, .5, .13);
          if (i === 3 || i === 9) pluck(55 + (Math.floor(s / 12) % 2 ? 5 : 0), w, .3, .07);
          drum('hat', w, i % 3 === 0 ? .6 : .3);
          this.m = clamp((this.m ?? 3) + pick([-1, 1, 1, -1, 0, 2, -2]), 0, this.scale.length - 1);
          if (Math.random() < .8) pluck(this.scale[this.m], w, .25, .08);
        } },
    };
    function sched() {
      const th = THEMES[theme]; if (!th) return;
      const dt = 60 / th.bpm / th.sub;
      while (next < T() + .25) { th.tick(step, next); next += dt; step++; }
    }
    return {
      play(t) {
        want = t;
        if (!ctx) return;
        if (t === theme) return;
        theme = t; step = 0; next = T() + .1;
        clearInterval(timer); stopDrone();
        if (!t) return;
        if (t === 'town') startDrone([38, 45], .025);
        timer = setInterval(sched, 60);
      },
      resume() { if (want && want !== theme) this.play(want); },
    };
  })();
  api.musicResume = () => Music.resume();
  return api;
})();
// İlk dokunuşta ses motorunu aç (tarayıcı kuralı)
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { SFX.init(); SFX.musicResume(); }, { once: false, passive: true }));
