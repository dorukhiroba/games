/* ========= DEMİR TAÇ — dövüş ========= */
let FT = null, scene = null;
const now = () => performance.now() / 1000;
const wait = ms => new Promise(r => setTimeout(r, ms));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let CRNG = null;                                   // online maçta tohumlu üreteç
const cr = () => CRNG ? CRNG() : Math.random();    // dövüş sonucunu etkileyen her zar bunu kullanır
const isPvp = () => FT && FT.opts.kind === 'pvp';

const ACTIONS = [
  { id: 'adv',    key: '1', n: 'İlerle',      ico: '»' },
  { id: 'back',   key: '2', n: 'Geri Çekil',  ico: '«' },
  { id: 'quick',  key: '3', n: 'Hızlı Darbe', ico: '↯' },
  { id: 'normal', key: '4', n: 'Saldırı',     ico: '⚔' },
  { id: 'power',  key: '5', n: 'Ağır Darbe',  ico: '✷' },
  { id: 'taunt',  key: '6', n: 'Kışkırt',     ico: '❝' },
  { id: 'rest',   key: '7', n: 'Soluklan',    ico: '☾' },
  { id: 'special', key: '8', n: 'Arena Öfkesi', ico: '♛' },
  { id: 'bag',    key: '9', n: 'Çanta',       ico: '⚗' },
];
const ATK = {
  quick:   { cost: 6,  mult: .7,  hit: 18,  dur: 520,  imp: .36, anim: 'quick' },
  normal:  { cost: 12, mult: 1,   hit: 0,   dur: 700,  imp: .5,  anim: 'attack' },
  power:   { cost: 22, mult: 1.6, hit: -15, dur: 900,  imp: .52, anim: 'power', kb: 1 },
  special: { cost: 0,  mult: 2.3, hit: 999, dur: 1000, imp: .52, anim: 'special', kb: 1.5 },
};
const MOVE_COST = 3;

/* ---------- Kurulum ---------- */
function mkSide(F, x, dir, side) {
  const d = derive(F);
  return { F, d, hp: d.maxHp, st: d.maxSt, x, vx: x, dir, side, anim: 'idle', a0: 0, dur: 1, flash: 0, hype: 0, mv: null };
}
function startFight(enemyTpl, opts) {
  const enemy = JSON.parse(JSON.stringify(enemyTpl));
  FT = { p: mkSide(G.player, 2.5, 1, 'p'), e: mkSide(enemy, 9.5, -1, 'e'), turn: 1, busy: true, over: false, opts, enemy, stats: { crowdGold: 0, taunts: 0, crits: 0, specials: 0, potions: 0 } };
  $('#log').innerHTML = '';
  CRNG = opts.kind === 'pvp' ? mulberry32(opts.seed) : null;
  FT.myTurn = opts.kind === 'pvp' ? !!opts.myFirst : true;
  if (opts.kind !== 'pvp') Progress.applyFightStart(FT, opts);
  else log(FT.myTurn ? 'Oda sahibi sensin: ilk hamle senin.' : 'İlk hamle rakibinde.', 'p');
  show('fight');
  buildActions();
  requestAnimationFrame(() => {
    if (!scene) {
      if (Arena3D.ok()) { try { scene = new Arena3D($('#arena3d'), $('#arena')); $('.stage').classList.add('is3d'); } catch (e) { console.warn('3B açılamadı, 2B arenaya geçiliyor', e); scene = null; } }
      if (!scene) { $('#arena3d').hidden = true; scene = new ArenaScene($('#arena')); }
    } else scene.resize();
    if (scene.is3D) { scene.setup([FT.e, FT.p]); scene.setTime(opts.kind === 'pvp' ? Online.time : G.time); }
    $('#bag-pop').hidden = true;
    scene.parts = []; scene.texts = [];
    updateHUD(); updateActions();
    banner(opts.kind === 'ladder' && opts.rung === 9 ? 'FİNAL!' : 'SAVAŞ!');
    scene.zoom = 1; SFX.horn(); SFX.crowdStart(); SFX.music('fight'); setTimeout(() => SFX.cheer(.6), 500);
    log(`${enemy.name} arenaya çıktı. Kalabalık ayakta!`, 'e');
    setTimeout(() => { FT.busy = !FT.myTurn; updateActions(); if (opts.kind === 'pvp') banner(FT.myTurn ? 'SENİN SIRAN' : 'RAKİBİN SIRASI'); }, 900);
  });
}
function onFightResize() { if (scene && activeScreen === 'fight') scene.resize(); }

/* ---------- Animasyon yardımcıları ---------- */
function play(f, anim, dur) {
  f.anim = anim; f.a0 = now(); f.dur = dur / 1000;
  return new Promise(res => setTimeout(() => { if (f.anim === anim && anim !== 'dead' && anim !== 'win') f.anim = 'idle'; res(); }, dur));
}
function moveTo(f, nx, dur, anim = 'walk') {
  f.mv = { x0: f.vx, x1: nx, t0: now(), d: dur / 1000 };
  f.x = nx;
  return play(f, anim, dur);
}
function banner(txt) {
  const b = $('#banner'); b.hidden = true; void b.offsetWidth; b.textContent = txt; b.hidden = false;
  clearTimeout(banner.h); banner.h = setTimeout(() => b.hidden = true, 950);
}
function log(txt, side) {
  const box = $('#log'), d = document.createElement('div'); d.className = side; d.textContent = txt; box.appendChild(d);
  while (box.children.length > 4) box.firstChild.remove();
}

/* ---------- Çizim ---------- */
function drawFight(t) {
  if (!scene || !FT) return;
  if (scene.is3D && (!FT.p.rig || !FT.e.rig)) return; // yeni dövüşün 3B modelleri henüz kuruluyor
  const T = now(), list = [FT.e, FT.p];
  const targetHype = Math.max(FT.p.hype, FT.e.hype) / 100;
  scene.hype += (targetHype - scene.hype) * .05;
  SFX.crowdLevel(scene.hype);
  for (const f of list) {
    if (f.mv) {
      const k = Math.min(1, (T - f.mv.t0) / f.mv.d);
      f.vx = f.mv.x0 + (f.mv.x1 - f.mv.x0) * ease(k);
      if (k >= 1) f.mv = null;
    } else f.vx = f.x;
    f.flash *= .86;
  }
  const c = scene.c;
  if (scene.is3D) {
    const tips = scene.render3D(t, list);
    list.forEach((f, i) => f.tip = tips[i]);
  } else {
    c.setTransform(scene.dpr, 0, 0, scene.dpr, 0, 0);
    if (scene.shake > .3) { c.translate(rnd(-1, 1) * scene.shake, rnd(-1, 1) * scene.shake); scene.shake *= .88; } else scene.shake = 0;
    if (scene.zoom > 1.001) {
      const z = scene.zoom, cx = scene.W / 2, cy = scene.H * .65;
      c.translate(cx, cy); c.scale(z, z); c.translate(-cx, -cy); scene.zoom = 1 + (z - 1) * .9;
    }
    scene.drawBg(t);
    for (const f of list) {
      const p = Math.min(1, (T - f.a0) / f.dur);
      f.tip = drawFighter(c, f.F, scene.ux(f.vx), scene.ground, scene.s, f.dir, f.anim, p, t + (f.side === 'e' ? 1.3 : 0), f.flash > .05 ? f.flash : 0);
    }
  }
  for (const f of list) {
    const p = Math.min(1, (T - f.a0) / f.dur);
    f.trail = f.trail || [];
    if (['quick', 'attack', 'power', 'special'].includes(f.anim) && p > .15 && p < .7) { f.trail.push([f.tip.tipX, f.tip.tipY]); if (f.trail.length > 9) f.trail.shift(); }
    else if (f.trail.length) f.trail.shift();
  }
  for (const f of list) scene.trail(f.trail, f.side === 'p' ? 'rgba(255,225,160,1)' : 'rgba(255,140,110,1)');
  scene.drawFx();
  placeRing();
}

/* ---------- Hesaplar ---------- */
const dist = () => Math.abs(FT.e.x - FT.p.x);
const inReach = a => dist() <= a.d.reach + .1;
function hitChance(a, d, mod) { return mod > 100 ? 100 : Math.round(clamp(74 + (a.F.stats.cev - d.F.stats.cev) * 2.2 + mod, 8, 96)); }
function dmgRange(a, d, mult) {
  const k = a.d.mult * mult * (1 - d.d.dr);
  return [Math.max(1, Math.round(a.d.dmgMin * k)), Math.max(1, Math.round(a.d.dmgMax * k))];
}
function tauntChance(a, d) { return Math.round(clamp(50 + (a.F.stats.kar - d.F.stats.kar) * 4, 15, 92)); }
function backRoom(a) { return a.dir > 0 ? a.x - .4 : 11.6 - a.x; }

/* ---------- Arayüz ---------- */
const RING = {
  quick: { side: 'L', a: 215 }, normal: { side: 'L', a: 180 }, power: { side: 'L', a: 145 }, special: { side: 'L', a: 255 },
  adv: { side: 'R', a: 0 }, back: { side: 'R', a: 325 }, taunt: { side: 'R', a: 285 }, rest: { side: 'R', a: 35 }, bag: { side: 'R', a: 75 },
};
function buildRing() {
  const ring = $('#ring'); ring.innerHTML = '<div class="ring-lbl" id="rl-l" style="color:var(--gold-2)">Saldırı</div><div class="ring-lbl" id="rl-r" style="color:#bfeee8">Savunma</div>';
  ACTIONS.forEach(A => {
    const r = RING[A.id]; if (!r) return;
    const b = document.createElement('button'); b.className = 'rb ' + (r.side === 'L' ? 'atk' : 'def') + (A.id === 'special' ? ' special' : ''); b.dataset.id = A.id;
    b.innerHTML = `<span class="key">${A.key}</span><span class="ico">${A.ico}</span><b>${A.n}</b><small></small>`;
    b.onclick = () => playerAct(A.id);
    b.onmouseenter = b.onfocus = () => $('#action-info').textContent = actionInfo(A.id);
    ring.appendChild(b);
  });
}
function placeRing() {
  const ring = $('#ring'); if (!ring || !FT || !scene) return;
  const off = FT.busy || FT.over; ring.classList.toggle('off', off);
  if (off && ring.dataset.placed) return;
  const s = scene.s, px = scene.ux(FT.p.vx), py = scene.ground - 95 * s, R = 105 * s + 40, H = scene.H, W = scene.W;
  ring.querySelectorAll('.rb').forEach(b => {
    const a = RING[b.dataset.id].a * Math.PI / 180;
    const x = clamp(px + Math.cos(a) * R * (RING[b.dataset.id].side === 'L' ? 1.05 : 1), 40, W - 40), y = clamp(py + Math.sin(a) * R, 40, H - 52);
    b.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
  });
  const lt = clamp(py - R - 40, 8, H - 20);
  $('#rl-l').style.transform = `translate(${clamp(px - R - 50, 8, W - 90)}px,${lt}px)`;
  $('#rl-r').style.transform = `translate(${clamp(px + R - 10, 8, W - 90)}px,${lt}px)`;
  ring.dataset.placed = '1';
}
function buildActions() {
  buildRing();
  const box = $('#actions'); box.innerHTML = '';
  ACTIONS.forEach(A => {
    const b = document.createElement('button'); b.className = 'act' + (A.id === 'special' ? ' special' : ''); b.dataset.id = A.id;
    b.innerHTML = `<span class="key">${A.key}</span><span class="ico">${A.ico}</span><b>${A.n}</b><small></small>`;
    b.onclick = () => playerAct(A.id);
    b.onmouseenter = b.onfocus = () => $('#action-info').textContent = actionInfo(A.id);
    box.appendChild(b);
  });
}
function canDo(a, d, id) {
  if (id === 'adv') return dist() > 1.25 && a.st >= MOVE_COST;
  if (id === 'back') return backRoom(a) > .1 && a.st >= MOVE_COST;
  if (id === 'special') return a.hype >= 100 && inReach(a);
  if (id === 'bag') return a.side === 'p' && POTIONS.some(pt => (G.potions[pt.id] || 0) > 0);
  if (ATK[id]) return inReach(a) && a.st >= ATK[id].cost;
  return true;
}
function actionInfo(id) {
  if (!FT) return '';
  const a = FT.p, d = FT.e;
  if (id === 'adv') return `Rakibe ${a.d.move} adım yaklaş. Stamina ${MOVE_COST}.`;
  if (id === 'back') return `Geri çekil, mesafe aç. Stamina ${MOVE_COST}.`;
  if (id === 'taunt') return `Kalabalığı coştur, rakibin staminasını düşür. Başarı %${tauntChance(a, d)}.`;
  if (id === 'bag') return 'İksir kullan. Bir tur harcar.';
  if (id === 'rest') return `Nefeslen: +${Math.round(a.d.maxSt * .3 + a.F.stats.day)} stamina.`;
  const k = ATK[id], r = dmgRange(a, d, k.mult);
  const range = inReach(a) ? '' : ' · Menzil dışında, önce ilerle';
  return `İsabet %${hitChance(a, d, k.hit)} · Hasar ${r[0]}–${r[1]} · Stamina ${k.cost}${range}`;
}
function updateActions() {
  if (!FT) return;
  const a = FT.p;
  $$('#actions .act, #ring .rb').forEach(b => {
    const id = b.dataset.id;
    b.disabled = FT.busy || FT.over || !canDo(a, FT.e, id);
    const cost = ATK[id] ? ATK[id].cost : (id === 'adv' || id === 'back') ? MOVE_COST : 0;
    b.querySelector('small').textContent = id === 'special' ? 'Hazır!' : id === 'bag' ? `${POTIONS.reduce((n, pt) => n + (G.potions[pt.id] || 0), 0)} iksir` : cost ? `${cost} st` : id === 'rest' ? '+st' : 'coşku';
    if (id === 'special') b.hidden = a.hype < 100;
  });
  $('#actions').classList.toggle('has-special', a.hype >= 100);
  if (isPvp() && !FT.myTurn && !FT.over) $('#action-info').textContent = `${FT.e.F.name} hamlesini düşünüyor...`;
  else if (!FT.busy && !FT.over) $('#action-info').textContent = inReach(a) ? 'Menzildesin. Bir hamle seç.' : 'Rakip menzil dışında. İlerle ya da kalabalığı kışkırt.';
}
function updateHUD() {
  const set = (sel, f) => {
    const el = $(sel);
    el.querySelector('.hud-name').textContent = `${f.F.name} · Sv ${f.F.level}`;
    el.querySelector('.hp div').style.width = Math.max(0, f.hp / f.d.maxHp * 100) + '%';
    el.querySelector('.hp span').textContent = `${Math.max(0, Math.round(f.hp))} / ${f.d.maxHp}`;
    el.querySelector('.st div').style.width = Math.max(0, f.st / f.d.maxSt * 100) + '%';
  };
  set('#hud-p', FT.p); set('#hud-e', FT.e);
  $('#hud-turn').textContent = 'Tur ' + FT.turn + (isPvp() ? (FT.over ? '' : FT.myTurn ? ' · Senin sıran' : ' · Rakip') : '');
  $('#hud-hype').style.width = Math.min(100, FT.p.hype) + '%';
  $('.hype').classList.toggle('full', FT.p.hype >= 100);
}

/* ---------- Hamleler ---------- */
async function doAction(a, d, id) {
  const name = a.F.name;
  if (id === 'adv') {
    const step = Math.min(a.d.move, dist() - 1.2);
    a.st -= MOVE_COST;
    scene.dust(scene.ux(a.x), scene.ground);
    steps(step);
    await moveTo(a, a.x + a.dir * step, 260 + step * 140);
    log(`${name} ilerliyor.`, a.side);
  } else if (id === 'back') {
    const step = Math.min(2, backRoom(a));
    a.st -= MOVE_COST;
    scene.dust(scene.ux(a.x), scene.ground);
    steps(step);
    await moveTo(a, a.x - a.dir * step, 260 + step * 140);
    log(`${name} geri çekiliyor.`, a.side);
  } else if (ATK[id]) await attack(a, d, id);
  else if (id === 'taunt') await taunt(a, d);
  else if (id === 'rest') await rest(a);
  a.st = clamp(a.st, 0, a.d.maxSt); a.hype = clamp(a.hype, 0, 100);
  updateHUD();
}

function steps(n) { for (let i = 0; i < Math.ceil(n * 2); i++) setTimeout(() => SFX.step(), i * 130); }
function hurtFlash() { const st = $('.stage'); st.classList.remove('hurt'); void st.offsetWidth; st.classList.add('hurt'); setTimeout(() => st.classList.remove('hurt'), 80); }

async function attack(a, d, id) {
  const k = ATK[id];
  a.st -= k.cost;
  if (id === 'special' && a.side === 'p') FT.stats.specials++;
  if (id === 'special') { a.hype = 0; banner('ARENA ÖFKESİ!'); scene.shake = 10; SFX.special(); SFX.cheer(1.2); }
  play(a, k.anim, k.dur);
  setTimeout(() => SFX.swing(id === 'quick' ? .6 : id === 'normal' ? 1 : 1.4), k.dur * k.imp * .55);
  await wait(k.dur * k.imp);
  const fx = scene.ux(d.x), fy = scene.ground - 110 * scene.s;
  const roll = cr() * 100;
  if (roll >= hitChance(a, d, k.hit)) {
    scene.float(fx, fy, 'ISKA', '#d9d2c5', 22); SFX.miss();
    play(d, 'block', 380);
    a.hype -= 3; d.hype += 3;
    log(`${a.F.name} ıskaladı!`, a.side);
  } else {
    let dmg = (a.d.dmgMin + cr() * (a.d.dmgMax - a.d.dmgMin)) * a.d.mult * k.mult;
    const crit = cr() * 100 < a.d.crit || id === 'special';
    if (crit) dmg *= 1.5;
    dmg *= (1 - d.d.dr);
    const blocked = id !== 'special' && d.d.block > 0 && cr() * 100 < d.d.block;
    if (blocked) dmg *= .3;
    dmg = Math.max(1, Math.round(dmg));
    d.hp -= dmg;
    if (blocked) {
      scene.burst(fx + d.dir * 10, fy, 18, ['#ffe08a', '#fff6d0', '#e2b25a'], 5, .2, 3);
      scene.float(fx, fy, `BLOK ${dmg}`, '#bfe4df', 22);
      play(d, 'block', 420); scene.shake = 4; d.hype += 6;
      SFX.block(); scene.ring(fx + d.dir * 10, fy, 'rgba(255,230,150,.9)', 50);
      log(`${d.F.name} darbeyi kalkanla karşıladı (${dmg}).`, d.side);
    } else {
      d.flash = 1;
      scene.burst(fx, fy, crit ? 26 : 14, ['#a8231a', '#d23b2a', '#7d1a12'], crit ? 5 : 3.5, .3, 3.5);
      scene.dust(fx, scene.ground);
      scene.float(fx, fy - (crit ? 10 : 0), crit ? `${dmg}!` : `${dmg}`, crit ? '#f6d58f' : '#ffffff', crit ? 38 : 28);
      scene.shake = crit ? 12 : id === 'power' ? 8 : 4;
      play(d, 'hit', 420);
      SFX.hit(crit); scene.ring(fx, fy, crit ? 'rgba(255,215,120,.95)' : 'rgba(255,120,90,.8)', crit ? 110 : 60);
      if (crit) { scene.zoom = 1.08; setTimeout(() => SFX.cheer(.8), 150); }
      if (d.side === 'p') hurtFlash();
      a.hype += 6 + dmg * .5 + (crit ? 12 : 0) + (id === 'power' ? 6 : 0);
      if (crit && a.side === 'p') { FT.stats.crowdGold += Math.round(3 + a.F.stats.kar * .5); FT.stats.crits++; }
      log(`${a.F.name} ${crit ? 'KRİTİK vurdu' : 'vurdu'}: ${dmg} hasar.`, a.side);
      if (k.kb && d.hp > 0) {
        const nx = clamp(d.x + a.dir * k.kb, .4, 11.6);
        if (Math.abs(nx - d.x) > .05) moveTo(d, nx, 300, 'hit');
      }
    }
  }
  updateHUD();
  await wait(k.dur * (1 - k.imp));
}

async function taunt(a, d) {
  play(a, 'taunt', 900);
  await wait(450);
  const x = scene.ux(a.x), y = scene.ground - 200 * scene.s;
  if (cr() * 100 < tauntChance(a, d)) {
    const kar = a.F.stats.kar;
    a.hype += 18 + kar * 1.5;
    const drain = Math.round(6 + kar * .8);
    d.st -= drain; d.st = Math.max(0, d.st);
    a.st += 5;
    scene.float(x, y, 'KALABALIK COŞTU!', '#f6d58f', 24);
    SFX.cheer(1); scene.petals(26);
    scene.burst(x, y + 20, 16, ['#f6d58f', '#e2b25a', '#ffffff'], 4, .12, 3);
    if (a.side === 'p') { FT.stats.crowdGold += Math.round(4 + kar * .8); FT.stats.taunts++; }
    log(`${a.F.name} kalabalığı coşturdu. ${d.F.name} ${drain} stamina kaybetti.`, a.side);
  } else {
    a.hype -= 3;
    scene.float(x, y, 'Yuhalandı', '#a8968a', 22); SFX.boo();
    log(`${a.F.name} kışkırtmayı denedi, kalabalık yuhaladı.`, a.side);
  }
  await wait(450);
}

async function rest(a) {
  play(a, 'rest', 800); SFX.rest();
  await wait(400);
  const g = Math.round(a.d.maxSt * .3 + a.F.stats.day);
  a.st += g; a.hype -= 4;
  const h = Math.round(a.d.maxHp * .03); a.hp = Math.min(a.d.maxHp, a.hp + h);
  scene.float(scene.ux(a.x), scene.ground - 190 * scene.s, `+${g} st`, '#8fd0c7', 22);
  log(`${a.F.name} soluklandı.`, a.side);
  await wait(400);
}

/* ---------- Rakip yapay zekası ---------- */
function aiChoose(a, d) {
  const can = inReach(a), arch = a.F.arch || 'brute', st = a.st;
  if (a.hype >= 100 && can) return 'special';
  if (!can) {
    if (st < MOVE_COST) return 'rest';
    if (arch === 'show' && Math.random() < .3) return 'taunt';
    if (st < a.d.maxSt * .25 && Math.random() < .5) return 'rest';
    return 'adv';
  }
  const W = {
    quick: st >= 6 ? 3 : 0,
    normal: st >= 12 ? 4 : 0,
    power: st >= 22 ? (arch === 'brute' ? 4 : 2) : 0,
    taunt: arch === 'show' ? 1.8 : .5,
    rest: st < a.d.maxSt * .3 ? 3 : .2,
    back: a.hp < a.d.maxHp * .25 && backRoom(a) > .5 && st >= MOVE_COST ? .5 : 0,
  };
  const tot = Object.values(W).reduce((x, y) => x + y, 0);
  let r = Math.random() * tot;
  for (const k in W) { r -= W[k]; if (r <= 0) return k; }
  return 'rest';
}

/* ---------- Tur akışı ---------- */
function toggleBag() {
  const pop = $('#bag-pop');
  if (!pop.hidden) { pop.hidden = true; return; }
  pop.innerHTML = '';
  POTIONS.forEach(pt => {
    const n = G.potions[pt.id] || 0, b = document.createElement('button');
    b.disabled = n <= 0;
    b.innerHTML = `<canvas width="80" height="80"></canvas><div><b>${pt.name} × ${n}</b><small>${pt.desc}</small></div>`;
    b.onclick = () => { pop.hidden = true; playerAct('potion:' + pt.id); };
    pop.appendChild(b);
    drawPotion(b.querySelector('canvas').getContext('2d'), pt, 40, 42, 60);
  });
  pop.hidden = false; SFX.click();
}
async function usePotion(a, pid) {
  const pt = POTION[pid]; if (!pt) return;
  if (a.side === 'p') { if (!(G.potions[pid] > 0)) return; G.potions[pid]--; FT.stats.potions++; save(); }
  play(a, 'rest', 700); SFX.potion();
  await wait(350);
  const x = scene.ux(a.x), y = scene.ground - 150 * scene.s;
  if (pid === 'p_heal') { const h = Math.round(a.d.maxHp * .4); a.hp = Math.min(a.d.maxHp, a.hp + h); scene.float(x, y, `+${h} can`, '#8fd0a0', 28); scene.burst(x, y + 30, 22, ['#8fd0a0', '#d0ffd8', '#ffffff'], 3, -.05, 4); }
  if (pid === 'p_st') { a.st = a.d.maxSt; scene.float(x, y, 'Stamina dolu', '#8fd0c7', 26); scene.burst(x, y + 30, 22, ['#8fd0c7', '#e0fffb'], 3, -.05, 4); }
  if (pid === 'p_rage') { a.hype = Math.min(100, a.hype + 50); scene.float(x, y, 'KALABALIK ÇILDIRDI!', '#f6d58f', 26); scene.petals(30); SFX.cheer(1.2); }
  scene.ring(x, y + 40, pt.color, 70);
  log(`${a.F.name} ${pt.name} kullandı.`, a.side);
  await wait(350);
}

async function playerAct(id) {
  if (id === 'bag') { if (FT && !FT.busy && !FT.over && canDo(FT.p, FT.e, 'bag')) toggleBag(); return; }
  $('#bag-pop').hidden = true;
  if (isPvp()) {
    if (!FT.myTurn || FT.busy || FT.over) return;
    if (id.startsWith('potion:') ? (G.potions[id.slice(7)] || 0) > 0 : canDo(FT.p, FT.e, id)) Online.localAct(id);
    return;
  }
  if (id.startsWith('potion:')) {
    if (!FT || FT.busy || FT.over) return;
    FT.busy = true; updateActions();
    await usePotion(FT.p, id.slice(7)); updateHUD();
    await wait(260);
    await doAction(FT.e, FT.p, aiChoose(FT.e, FT.p));
    if (checkEnd()) return;
    for (const f of [FT.p, FT.e]) f.st = Math.min(f.d.maxSt, f.st + 3);
    FT.turn++; FT.busy = false; updateHUD(); updateActions();
    return;
  }
  if (!FT || FT.busy || FT.over || !canDo(FT.p, FT.e, id)) return;
  FT.busy = true; updateActions();
  await doAction(FT.p, FT.e, id);
  if (checkEnd()) return;
  await wait(260);
  await doAction(FT.e, FT.p, aiChoose(FT.e, FT.p));
  if (checkEnd()) return;
  for (const f of [FT.p, FT.e]) f.st = Math.min(f.d.maxSt, f.st + 3);
  FT.turn++;
  FT.busy = false;
  updateHUD(); updateActions();
}

function checkEnd() {
  const pDead = FT.p.hp <= 0, eDead = FT.e.hp <= 0;
  if (!pDead && !eDead) return false;
  FT.over = true; updateActions();
  const won = eDead;
  const loser = won ? FT.e : FT.p, winner = won ? FT.p : FT.e;
  play(loser, 'dead', 900);
  setTimeout(() => SFX.fall(), 500);
  setTimeout(() => { won ? SFX.victory() : SFX.defeat(); SFX.cheer(won ? 1.3 : .6); if (won) scene.petals(40); }, 900);
  scene.zoom = 1.06;
  scene.dust(scene.ux(loser.x) - loser.dir * 60 * scene.s, scene.ground);
  setTimeout(() => { play(winner, 'win', 99999); winner.hype = 100; }, 700);
  banner(won ? 'ZAFER!' : 'YENİLGİ');
  setTimeout(() => finishFight(won), 1900);
  return true;
}

function finishFight(won) {
  if (isPvp()) { CRNG = null; return Online.finish(won); }
  const { opts, enemy } = FT;
  const r = grantRewards(won, enemy, opts, FT.stats);
  const extra = Progress.afterFight(won, enemy, opts, FT);
  const rewards = `<div class="rewards"><div><small>Altın</small><b>+${r.gold}</b></div><div><small>XP</small><b>+${r.xp}</b></div>
    ${r.ups ? `<div><small>Seviye</small><b>${G.player.level}</b></div>` : ''}</div>`;
  let body = rewards;
  if (r.ups) setTimeout(() => SFX.levelup(), 300);
  if (r.gold) SFX.coin();
  if (r.ups) body += `<p>Seviye atladın! ${r.ups * 4} nitelik puanını Gladyatör sekmesinde dağıt.</p>`;
  if (!won) body += `<p>Kalabalık seni sedyeyle çıkardı. Demirciye uğra, niteliklerini güçlendir ve tekrar dene.</p>`;
  if (extra.trophy) body = `<canvas id="m-trophy" width="200" height="200" style="width:110px;height:110px"></canvas>` + body;
  body += extra.lines.map(l => `<p class="m-line">${l}</p>`).join('');
  const toHub = () => { FT = null; SFX.crowdStop(); show('hub'); };
  const buttons = [...extra.buttons, { label: 'Şehre Dön', cls: extra.buttons.length ? 'btn-ghost' : 'btn-gold', on: toHub }];
  if (opts.kind === 'exh') buttons.push({ label: 'Bir Maç Daha', on: () => startFight(makeExhibitionEnemy(G.player.level), { kind: 'exh' }) });
  if (r.champ) {
    modal({ eyebrow: 'Efsane doğdu', title: 'Demir Taç Senin!', body: body + `<p>${enemy.name} yenildi. Artık arenanın şampiyonusun. Gösteri maçlarıyla efsaneni büyütmeye devam et.</p>`, buttons });
  } else {
    modal({ eyebrow: won ? `${enemy.name} yenildi` : `${enemy.name} kazandı`, title: extra.trophy ? extra.trophy.name : won ? 'Zafer' : 'Yenilgi', body, buttons });
  }
  if (extra.trophy) { drawTrophy($('#m-trophy').getContext('2d'), extra.trophy, 100, 104, 160); SFX.victory(); }
  Progress.checkAch();
}

/* ---------- Klavye ---------- */
document.addEventListener('keydown', e => {
  if (activeScreen !== 'fight' || !$('#modal').hidden) return;
  const A = ACTIONS.find(x => x.key === e.key);
  if (A) playerAct(A.id);
});
