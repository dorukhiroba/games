/* ========= DEMİR TAÇ — çizim ========= */
const OUT = '#1a110c';
const METAL = ['#8b6a4f', '#c58e47', '#9aa3aa', '#cfd8e0', '#f0c86a'];
let FLASH = 0; // vuruşta beyaz parlama

function hexRgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
function mix(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function shade(h, amt) { return amt < 0 ? mix(h, '#000000', -amt) : mix(h, '#ffffff', amt); }
function C(h) { return FLASH > 0 ? mix(h, '#ffffff', FLASH) : h; }

/* Hacimli uzuv: kontur + ana renk + gölge şeridi + ışık şeridi (silindir hissi) */
function seg(c, x1, y1, x2, y2, w, col) {
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
  c.strokeStyle = OUT; c.lineWidth = w + 4; c.stroke();
  c.strokeStyle = C(col); c.lineWidth = w; c.stroke();
  if (w < 4) return;
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  let nx = -dy / L, ny = dx / L; if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; }
  const o = w * .24;
  c.beginPath(); c.moveTo(x1 - nx * o, y1 - ny * o); c.lineTo(x2 - nx * o, y2 - ny * o);
  c.strokeStyle = C(shade(col, -.22)); c.globalAlpha = .55; c.lineWidth = w * .45; c.stroke();
  c.beginPath(); c.moveTo(x1 + nx * o, y1 + ny * o); c.lineTo(x2 + nx * o, y2 + ny * o);
  c.strokeStyle = C(shade(col, .3)); c.globalAlpha = .5; c.lineWidth = w * .28; c.stroke();
  c.globalAlpha = 1;
}
function blob(c, x, y, r, col, out = true) {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
  const g = c.createRadialGradient(x - r * .4, y - r * .45, r * .1, x, y, r * 1.05);
  g.addColorStop(0, C(shade(col, .35))); g.addColorStop(.55, C(col)); g.addColorStop(1, C(shade(col, -.3)));
  c.fillStyle = g; c.fill();
  if (out) { c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); }
}
/* Metal yüzey için parlak geçiş */
function metalGrad(c, col, x0, y0, x1, y1) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, C(shade(col, -.25))); g.addColorStop(.45, C(shade(col, .45))); g.addColorStop(.6, C(col)); g.addColorStop(1, C(shade(col, -.35)));
  return g;
}
function ik(ax, ay, bx, by, l1, l2) {
  const dx = bx - ax, dy = by - ay;
  let d = Math.hypot(dx, dy); d = Math.min(d, l1 + l2 - .01);
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const base = Math.atan2(dy, dx) - a;
  return [ax + Math.cos(base) * l1, ay + Math.sin(base) * l1];
}
const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
const lerp = (a, b, t) => a + (b - a) * t;
const seg01 = (p, a, b) => Math.max(0, Math.min(1, (p - a) / (b - a)));

/* ---- Pozlar: anim + ilerleme(p 0..1) + zaman(t) ---- */
function poseFor(anim, p, t, kind) {
  const P = { bx: 0, by: Math.sin(t * 2.2) * 1.5, lean: .06, aA: 1.05, fA: -.35, wA: -1.0, sA: 1.0, sF: -.2,
    stride: 1, walk: null, crouch: 3, head: 0, rot: 0, armsUp: 0 };
  const thrust = kind === 'spear' || kind === 'trident';
  if (anim === 'walk') {
    P.walk = t * 11; P.by = Math.abs(Math.sin(t * 11)) * -3;
  } else if (anim === 'attack' || anim === 'power' || anim === 'quick' || anim === 'special') {
    const big = anim === 'power' || anim === 'special';
    const w1 = anim === 'quick' ? .22 : .38, s1 = w1 + (anim === 'quick' ? .14 : .18);
    const wind = ease(seg01(p, 0, w1)), strike = ease(seg01(p, w1, s1)), back = ease(seg01(p, .62, 1));
    const lunge = (big ? 46 : 30);
    if (thrust) {
      P.bx = -12 * wind + (lunge + 12) * strike - lunge * back;
      P.aA = lerp(lerp(1.05, .9, wind), .1, strike); P.aA = lerp(P.aA, 1.05, back);
      P.fA = lerp(lerp(-.35, .1, wind), -.05, strike); P.fA = lerp(P.fA, -.35, back);
      P.wA = lerp(lerp(-1, -.15, wind), -.05, strike); P.wA = lerp(P.wA, -1, back);
      P.lean = .06 + .25 * strike * (1 - back);
    } else {
      P.bx = -6 * wind + (lunge + 6) * strike - lunge * back;
      P.aA = lerp(lerp(1.05, -2.3, wind), .45, strike); P.aA = lerp(P.aA, 1.05, back);
      P.fA = lerp(lerp(-.35, -2.6, wind), .55, strike); P.fA = lerp(P.fA, -.35, back);
      P.wA = lerp(lerp(-1.0, -2.9, wind), .9, strike); P.wA = lerp(P.wA, -1.0, back);
      P.lean = .06 - .12 * wind + .35 * strike * (1 - back);
    }
    P.crouch = 3 + 10 * strike * (1 - back);
    P.stride = 1 + .6 * strike * (1 - back);
  } else if (anim === 'hit') {
    const k = Math.sin(Math.min(1, p * 1.4) * Math.PI);
    P.bx = -18 * k; P.lean = .06 - .35 * k; P.head = -.4 * k; P.aA = 1.05 + .5 * k; P.sA = 1.0 + .6 * k;
  } else if (anim === 'block') {
    const k = Math.sin(Math.min(1, p * 1.3) * Math.PI);
    P.bx = -8 * k; P.sA = lerp(1.0, .1, k); P.sF = lerp(-.2, -1.2, k); P.crouch = 3 + 6 * k;
  } else if (anim === 'taunt') {
    const k = Math.sin(Math.min(1, p) * Math.PI);
    P.armsUp = k; P.by += -Math.abs(Math.sin(p * Math.PI * 4)) * 8 * k;
    P.aA = lerp(1.05, -1.9, k); P.fA = lerp(-.35, -1.7, k); P.wA = lerp(-1, -1.5, k);
    P.sA = lerp(1.0, -1.9, k); P.sF = lerp(-.2, -1.6, k); P.lean = .06 - .15 * k; P.head = -.2 * k;
  } else if (anim === 'rest') {
    const k = Math.sin(Math.min(1, p) * Math.PI);
    P.crouch = 3 + 18 * k; P.lean = .06 + .35 * k; P.by += Math.sin(t * 5) * 2 * k; P.aA = 1.05 + .3 * k; P.wA = lerp(-1, .9, k);
  } else if (anim === 'dead') {
    const k = ease(Math.min(1, p));
    P.rot = -1.5 * k; P.bx = -10 * k; P.head = -.3 * k; P.aA = lerp(1.05, -1.2, k); P.wA = lerp(-1, -.2, k); P.stride = 1 + .4 * k;
  } else if (anim === 'win') {
    P.aA = -1.6; P.fA = -1.9; P.wA = -1.55; P.by += Math.sin(t * 4) * 2; P.head = -.15;
  }
  return P;
}

/* ---- Silah ---- */
function drawWeapon(c, item, x, y, a) {
  c.save(); c.translate(x, y); c.rotate(a);
  const m = METAL[item.tier];
  const wood = '#6b4325';
  const tri = (pts, col) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fillStyle = C(col); c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); };
  if (item.kind === 'none') { c.restore(); return; }
  if (item.kind === 'hammer') { // demirci çekici (NPC)
    seg(c, -10, 0, 34, 0, 5, wood);
    c.beginPath(); c.roundRect(30, -11, 14, 22, 3); c.fillStyle = metalGrad(c, '#8f979e', 30, -11, 44, 11); c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
    c.restore(); return;
  }
  if (item.kind === 'sword') {
    const L = 46 + item.tier * 5;
    c.beginPath(); [4, -4, 8 + L, -4, 18 + L, 0, 8 + L, 4, 4, 4].forEach((v, i, a) => { if (i % 2 === 0) (i ? c.lineTo(v, a[i + 1]) : c.moveTo(v, a[i + 1])); });
    c.closePath(); c.fillStyle = metalGrad(c, m, 0, -4, 0, 4); c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = C(shade(m, .35)); c.fillRect(8, -1, L, 1.5);
    seg(c, -10, 0, 2, 0, 5, wood);
    seg(c, 3, -10, 3, 10, 5, item.tier >= 3 ? '#e2b25a' : shade(m, -.2));
    blob(c, -12, 0, 3.5, '#e2b25a');
  } else if (item.kind === 'axe') {
    seg(c, -14, 0, 56, 0, 5, wood);
    c.beginPath(); c.moveTo(40, -2); c.quadraticCurveTo(46, -22, 64, -26); c.quadraticCurveTo(58, -6, 62, 14);
    c.quadraticCurveTo(48, 10, 40, 4); c.closePath(); c.fillStyle = C(m); c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
    if (item.tier >= 4) { c.beginPath(); c.moveTo(40, -2); c.lineTo(28, -12); c.lineTo(40, 3); c.fillStyle = C(m); c.fill(); c.stroke(); }
  } else if (item.kind === 'mace') {
    seg(c, -12, 0, 40, 0, 5, wood);
    for (let i = 0; i < 8; i++) { const a2 = i * Math.PI / 4; tri([46 + Math.cos(a2) * 8, Math.sin(a2) * 8 - 2, 46 + Math.cos(a2) * 17, Math.sin(a2) * 17, 46 + Math.cos(a2) * 8, Math.sin(a2) * 8 + 2], shade(m, -.15)); }
    blob(c, 46, 0, 11, m);
  } else { // spear / trident
    seg(c, -34, 0, 88, 0, 4.5, wood);
    if (item.kind === 'spear') tri([84, -6, 108, 0, 84, 6], m);
    else { tri([84, -3, 106, 0, 84, 3], m); seg(c, 84, -10, 84, 10, 3.5, m); seg(c, 84, -10, 100, -10, 3, m); seg(c, 84, 10, 100, 10, 3, m); }
  }
  c.restore();
}

/* ---- Kalkan ---- */
function drawShield(c, item, x, y, a) {
  c.save(); c.translate(x, y); c.rotate(a * .25);
  const m = METAL[item.tier], face = item.tier === 0 ? '#8a5a2e' : item.tier >= 4 ? '#8c1f17' : shade(m, -.25);
  if (item.kind === 'tower') {
    const w = 18, h = 38 + item.tier * 3;
    c.beginPath(); c.roundRect(-w / 2, -h, w, h * 2, 6);
    c.fillStyle = metalGrad(c, face, -w / 2, 0, w / 2, 0); c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    c.lineWidth = 3; c.strokeStyle = C(m); c.strokeRect(-w / 2 + 3, -h + 3, w - 6, h * 2 - 6);
    blob(c, 0, 0, 5, m);
  } else {
    const r = 22 + item.tier * 3;
    c.save(); c.scale(.42, 1);
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fillStyle = metalGrad(c, face, -r, -r, r, r); c.fill();
    c.lineWidth = 6; c.strokeStyle = OUT; c.stroke();
    c.lineWidth = 4; c.strokeStyle = C(m); c.beginPath(); c.arc(0, 0, r - 3, 0, Math.PI * 2); c.stroke();
    c.restore();
    blob(c, 2, 0, 5, m);
  }
  c.restore();
}

/* ---- Miğfer ---- */
function drawHelm(c, item, hx, hy) {
  const m = METAL[item.tier];
  if (item.tier === 0) {
    c.beginPath(); c.arc(hx, hy - 1, 15, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(hx + 15, hy + 1); c.lineTo(hx - 15, hy + 1); c.closePath();
    c.fillStyle = C('#7a4b2a'); c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke(); return;
  }
  if (item.tier >= 2) { // sorguç
    c.beginPath(); c.moveTo(hx - 14, hy - 12); c.quadraticCurveTo(hx - 2, hy - 38, hx + 14, hy - 16);
    c.quadraticCurveTo(hx - 2, hy - 26, hx - 14, hy - 12);
    c.fillStyle = C(item.tier >= 4 ? '#f0e2b0' : '#b3261b'); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
  }
  c.beginPath(); c.arc(hx, hy - 1, 16, Math.PI, 0); c.lineTo(hx + 18, hy + 2); c.lineTo(hx - 18, hy + 2); c.closePath();
  c.fillStyle = metalGrad(c, m, hx - 16, hy - 17, hx + 16, hy + 2); c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
  // yanak koruması / yüz siperi
  c.beginPath();
  if (item.tier >= 3) { c.moveTo(hx - 6, hy + 2); c.lineTo(hx + 16, hy + 2); c.lineTo(hx + 14, hy + 15); c.lineTo(hx - 4, hy + 17); }
  else { c.moveTo(hx - 2, hy + 2); c.lineTo(hx + 8, hy + 2); c.lineTo(hx + 6, hy + 13); c.lineTo(hx, hy + 13); }
  c.closePath(); c.fillStyle = C(shade(m, -.12)); c.fill(); c.stroke();
  if (item.tier >= 3) { c.fillStyle = OUT; c.fillRect(hx + 6, hy + 5, 9, 2.5); }
  if (item.tier >= 4) { for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(hx + i * 6 - 3, hy - 14); c.lineTo(hx + i * 6, hy - 23 + Math.abs(i) * 2); c.lineTo(hx + i * 6 + 3, hy - 14); c.fillStyle = C('#f6d58f'); c.fill(); c.lineWidth = 1.5; c.stroke(); } }
}

/* ---- Gladyatör ---- */
function drawFighter(c, F, x, gy, s, dir, anim, p, t, flash = 0) {
  FLASH = flash;
  const look = F.look, eq = F.equip;
  const weapon = (typeof eq.weapon === 'object' ? eq.weapon : ITEM[eq.weapon]) || ITEM.w0, helm = ITEM[eq.helm], chest = ITEM[eq.chest], shield = ITEM[eq.shield];
  const P = poseFor(anim, p, t, weapon.kind);
  c.save(); c.translate(x, gy); c.scale(dir * s, s);
  // gölge
  c.save(); c.scale(1, .22); c.beginPath(); c.ellipse(P.bx * .6, 0, 46, 30, 0, 0, Math.PI * 2); c.fillStyle = 'rgba(0,0,0,.35)'; c.fill(); c.restore();
  if (P.rot) { c.translate(-20 * Math.abs(P.rot) / 1.5, 0); c.rotate(P.rot); }

  const skin = look.skin, skinD = shade(skin, -.18);
  const hip = [P.bx, -84 + P.crouch + P.by];
  const sh = [hip[0] + Math.sin(P.lean) * 54, hip[1] - Math.cos(P.lean) * 54];
  const head = [sh[0] + Math.sin(P.lean + P.head) * 22 + 2, sh[1] - Math.cos(P.lean + P.head) * 22];
  // ayaklar
  let fF, fB;
  if (P.walk !== null) {
    const w = Math.sin(P.walk);
    fF = [P.bx + 10 + w * 16, -Math.max(0, Math.cos(P.walk)) * 7];
    fB = [P.bx - 10 - w * 16, -Math.max(0, -Math.cos(P.walk)) * 7];
  } else { fF = [hip[0] * .4 + 16 * P.stride, 0]; fB = [hip[0] * .4 - 16 * P.stride, 0]; }
  const kF = ik(hip[0], hip[1], fF[0], fF[1], 44, 44), kB = ik(hip[0], hip[1], fB[0], fB[1], 44, 44);

  // pelerin
  const wave = Math.sin(t * 3) * 4;
  c.beginPath(); c.moveTo(sh[0] - 6, sh[1] + 2);
  c.quadraticCurveTo(sh[0] - 24 + wave, (sh[1] + hip[1]) / 2, hip[0] - 22 + wave * 1.5, hip[1] + 26);
  c.lineTo(hip[0] - 4, hip[1] + 20); c.lineTo(sh[0] + 4, sh[1] + 4); c.closePath();
  c.fillStyle = C(shade(look.cape, -.15)); c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();

  // arka bacak
  const legCol = shade(skinD, -.05);
  seg(c, hip[0], hip[1], kB[0], kB[1], 13, legCol); seg(c, kB[0], kB[1], fB[0], fB[1] - 3, 11, legCol);
  seg(c, fB[0] - 2, fB[1] - 2, fB[0] + 9, fB[1] - 2, 6, '#3b2414');
  // arka (kalkan) kol
  const sElb = [sh[0] + Math.cos(P.sA) * 26, sh[1] + Math.sin(P.sA) * 26];
  const sHand = [sElb[0] + Math.cos(P.sF) * 24, sElb[1] + Math.sin(P.sF) * 24];
  seg(c, sh[0], sh[1], sElb[0], sElb[1], 10, skinD); seg(c, sElb[0], sElb[1], sHand[0], sHand[1], 9, skinD);

  // ön bacak
  seg(c, hip[0], hip[1], kF[0], kF[1], 14, skin); seg(c, kF[0], kF[1], fF[0], fF[1] - 3, 12, skin);
  if (chest && chest.tier >= 2) seg(c, kF[0] + 1, kF[1] + 4, (kF[0] + fF[0]) / 2 + 1, (kF[1] + fF[1]) / 2, 9, METAL[chest.tier]);
  seg(c, fF[0] - 2, fF[1] - 2, fF[0] + 10, fF[1] - 2, 6, '#3b2414');

  // gövde
  c.save(); c.translate(hip[0], hip[1]); c.rotate(P.lean);
  // etek (pteruges)
  const skirt = chest ? (chest.tier === 0 ? '#5a3a20' : '#8c1f17') : '#d8c7a3';
  c.beginPath(); c.moveTo(-17, -4); c.lineTo(17, -4); c.lineTo(20, 20); c.lineTo(-19, 20); c.closePath();
  c.fillStyle = C(skirt); c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5; for (let i = -12; i <= 12; i += 8) { c.beginPath(); c.moveTo(i, 2); c.lineTo(i * 1.1, 19); c.stroke(); }
  // gövde şekli
  c.beginPath(); c.moveTo(-15, 0); c.quadraticCurveTo(-21, -30, -18, -56); c.quadraticCurveTo(0, -64, 20, -56);
  c.quadraticCurveTo(22, -28, 15, 0); c.closePath();
  const torso = chest ? (chest.tier === 0 ? '#7a4b2a' : METAL[chest.tier]) : skin;
  c.fillStyle = C(torso); c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
  c.save(); c.clip();
  if (chest && chest.tier >= 1) { c.strokeStyle = C(shade(torso, -.3)); c.lineWidth = 2; for (let y = -8; y > -54; y -= 9) { c.beginPath(); c.moveTo(-22, y); c.lineTo(24, y - 2); c.stroke(); } }
  else if (chest) { c.strokeStyle = C('#3b2414'); c.lineWidth = 4; c.beginPath(); c.moveTo(-14, -54); c.lineTo(16, -6); c.stroke(); }
  else { c.strokeStyle = C(shade(skin, -.25)); c.lineWidth = 1.8; c.beginPath(); c.moveTo(-2, -48); c.quadraticCurveTo(8, -38, 18, -44); c.moveTo(4, -28); c.lineTo(4, -10); c.stroke(); }
  const tg = c.createLinearGradient(-22, 0, 24, 0);
  tg.addColorStop(0, 'rgba(0,0,0,.32)'); tg.addColorStop(.45, 'rgba(0,0,0,0)'); tg.addColorStop(.7, 'rgba(255,255,255,.2)'); tg.addColorStop(1, 'rgba(0,0,0,.18)');
  c.fillStyle = tg; c.fillRect(-24, -66, 50, 70);
  if (look.apron) { // demirci önlüğü
    c.fillStyle = C(look.apron); c.fillRect(-14, -44, 30, 46);
    c.strokeStyle = OUT; c.lineWidth = 2; c.strokeRect(-14, -44, 30, 46);
    c.strokeStyle = C('#3b2414'); c.lineWidth = 3; c.beginPath(); c.moveTo(-12, -44); c.lineTo(-4, -60); c.moveTo(14, -44); c.lineTo(8, -60); c.stroke();
  }
  c.restore();
  // kemer
  c.fillStyle = C('#3b2414'); c.fillRect(-17, -6, 34, 7); c.fillStyle = C('#e2b25a'); c.fillRect(6, -5, 6, 5);
  c.restore();
  if (chest && chest.tier >= 2) blob(c, sh[0] - 2, sh[1] + 4, 11, METAL[chest.tier]);

  // baş
  const hx = head[0], hy = head[1];
  seg(c, sh[0], sh[1], hx - 1, hy + 8, 9, skin);
  blob(c, hx, hy, 15, skin);
  if (!helm || helm.tier < 3) {
    c.fillStyle = OUT; c.fillRect(hx + 6, hy - 3, 3, 3.5); // göz
    c.strokeStyle = C(shade(skin, -.4)); c.lineWidth = 1.5; c.beginPath(); c.moveTo(hx + 5, hy + 7); c.lineTo(hx + 10, hy + 7); c.stroke();
  }
  if (look.beard && (!helm || helm.tier < 3)) {
    c.beginPath(); c.moveTo(hx - 8, hy + 3); c.quadraticCurveTo(hx + 2, hy + 22, hx + 13, hy + 6); c.lineTo(hx + 11, hy + 10);
    c.quadraticCurveTo(hx + 3, hy + 13, hx - 4, hy + 5); c.closePath(); c.fillStyle = C(look.hair); c.fill();
  }
  if (!helm) {
    c.beginPath(); c.arc(hx - 1, hy - 2, 15.5, Math.PI * .95, Math.PI * 1.9); c.quadraticCurveTo(hx + 4, hy - 8, hx - 4, hy - 4);
    if (look.hairStyle === 1) c.lineTo(hx - 18, hy + 12);
    if (look.hairStyle === 2) { c.lineTo(hx - 16, hy + 2); }
    c.closePath(); c.fillStyle = C(look.hair); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
  } else drawHelm(c, helm, hx, hy);

  // kalkan
  if (shield) drawShield(c, shield, sHand[0] + 4, sHand[1] - 4, P.sA);
  else blob(c, sHand[0], sHand[1], 5.5, skinD);

  // silah kolu
  const elb = [sh[0] + Math.cos(P.aA) * 26, sh[1] + Math.sin(P.aA) * 26];
  const hand = [elb[0] + Math.cos(P.fA) * 24, elb[1] + Math.sin(P.fA) * 24];
  seg(c, sh[0] + 2, sh[1] + 2, elb[0], elb[1], 11, skin);
  if (chest && chest.tier >= 3) seg(c, elb[0], elb[1], (elb[0] + hand[0]) / 2, (elb[1] + hand[1]) / 2, 10, '#5a3a20');
  seg(c, elb[0], elb[1], hand[0], hand[1], 10, skin);
  drawWeapon(c, weapon, hand[0], hand[1], P.wA);
  blob(c, hand[0], hand[1], 6, skin);

  c.restore();
  FLASH = 0;
  // silah ucu (efekt için dünya koordinatı)
  const wl = weapon.kind === 'spear' || weapon.kind === 'trident' ? 100 : weapon.kind === 'sword' ? 50 + weapon.tier * 5 : 52;
  return { tipX: x + dir * s * (hand[0] + Math.cos(P.wA) * wl), tipY: gy + s * (hand[1] + Math.sin(P.wA) * wl), headY: gy + s * (hy - 30) };
}

/* ---- Önizleme / portre / eşya ikonları ---- */
function renderFigure(canvas, F, opt = {}) {
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  const s = opt.scale || canvas.height / 220;
  drawFighter(c, F, canvas.width / 2 + (opt.dx || 0), opt.gy || canvas.height - 14, s, opt.dir || 1, opt.anim || 'idle', opt.p || 0, opt.t || 0);
}
function renderPortrait(canvas, F) {
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  const s = canvas.width / 52;
  drawFighter(c, F, canvas.width * .42, canvas.height + 128 * s * .62, s * .62, 1, 'idle', 0, 0);
}
function renderItemIcon(canvas, it) {
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  drawItemAt(c, it, canvas.width / 2, canvas.height / 2, canvas.width);
}
function drawItemAt(c, it, cx, cy, size) {
  const W = size, H = size;
  c.save(); c.translate(cx - W / 2, cy - H / 2);
  if (it.slot === 'weapon') {
    const long = it.kind === 'spear' || it.kind === 'trident';
    const k = W / (long ? 150 : 95);
    c.translate(W * .18, H * .82); c.scale(k, k); drawWeapon(c, it, 0, 0, -.78);
  } else if (it.slot === 'shield') {
    c.translate(W / 2, H / 2); const k = W / 80; c.scale(k * (it.kind === 'tower' ? 1.4 : 2.2), k); drawShield(c, it, 0, 0, 0);
  } else if (it.slot === 'helm') {
    c.translate(W / 2 - 2, H / 2 + 6); c.scale(W / 52, W / 52); blob(c, 0, 0, 15, '#d9a273'); drawHelm(c, it, 0, 0);
  } else {
    c.translate(W / 2, H * .9); c.scale(W / 80, W / 80);
    c.beginPath(); c.moveTo(-15, 0); c.quadraticCurveTo(-21, -30, -18, -56); c.quadraticCurveTo(0, -64, 20, -56); c.quadraticCurveTo(22, -28, 15, 0); c.closePath();
    const col = it.tier === 0 ? '#7a4b2a' : METAL[it.tier]; c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    c.save(); c.clip(); c.strokeStyle = shade(col, -.3); c.lineWidth = 2; for (let y = -8; y > -54; y -= 9) { c.beginPath(); c.moveTo(-22, y); c.lineTo(24, y - 2); c.stroke(); } c.restore();
  }
  c.restore();
}

/* ========= Arena sahnesi ========= */
class ArenaScene {
  constructor(canvas) {
    this.cv = canvas; this.c = canvas.getContext('2d');
    this.bg = document.createElement('canvas');
    this.parts = []; this.texts = []; this.shake = 0; this.hype = 0;
    this.resize();
  }
  resize() {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(300, r.width); this.H = Math.max(200, r.height); this.dpr = dpr;
    this.cv.width = this.W * dpr; this.cv.height = this.H * dpr;
    this.ground = this.H * .9;
    this.s = Math.min(this.H * .5 / 180, this.W / 900);
    this.buildBg();
  }
  ux(u) { const m = this.W * .07; return m + (u / 12) * (this.W - 2 * m); }

  buildBg() {
    const W = this.W, H = this.H, dpr = this.dpr;
    this.bg.width = W * dpr; this.bg.height = H * dpr;
    const c = this.bg.getContext('2d'); c.scale(dpr, dpr);
    const wallTop = H * .40, floorTop = H * .62;
    // gökyüzü
    let g = c.createLinearGradient(0, 0, 0, wallTop);
    g.addColorStop(0, '#1d1428'); g.addColorStop(.6, '#5b2b2f'); g.addColorStop(1, '#c0653a');
    c.fillStyle = g; c.fillRect(0, 0, W, wallTop);
    // tribün
    const standTop = H * .07;
    g = c.createLinearGradient(0, standTop, 0, wallTop); g.addColorStop(0, '#3a2a22'); g.addColorStop(1, '#5c4232');
    c.fillStyle = g; c.fillRect(0, standTop, W, wallTop - standTop);
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2;
    this.rows = [];
    const rowH = (wallTop - standTop) / 6;
    for (let i = 0; i < 6; i++) { const y = standTop + rowH * (i + 1); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); this.rows.push(y); }
    // seyirciler
    this.crowd = [];
    const cloth = ['#9c2b1f', '#2f5d8a', '#c08a2e', '#e8dcc4', '#3d6b45', '#6b3b80', '#a0522d', '#d9d2c5'];
    this.rows.forEach((y, ri) => {
      const sp = 9 + ri * 1.1;
      for (let x = rnd(0, sp); x < W; x += sp * rnd(.85, 1.25)) {
        if (Math.random() < .08) continue;
        this.crowd.push({ x, y: y - 1, r: 2.6 + ri * .35, col: pick(cloth), sk: pick(SKINS), ph: rnd(0, 6.28), sp: rnd(5, 9) });
      }
    });
    // tente
    c.fillStyle = '#2a1712'; c.fillRect(0, 0, W, standTop);
    const n = Math.ceil(W / 60);
    for (let i = 0; i < n; i++) {
      c.beginPath(); c.moveTo(i * 60, 0); c.lineTo(i * 60 + 60, 0); c.lineTo(i * 60 + 60, standTop); c.quadraticCurveTo(i * 60 + 30, standTop + 14, i * 60, standTop); c.closePath();
      c.fillStyle = i % 2 ? '#8c2a1c' : '#d8c29a'; c.fill();
    }
    // podyum duvarı
    g = c.createLinearGradient(0, wallTop, 0, floorTop); g.addColorStop(0, '#7a5a42'); g.addColorStop(1, '#4a3424');
    c.fillStyle = g; c.fillRect(0, wallTop, W, floorTop - wallTop);
    c.fillStyle = '#9c7a5a'; c.fillRect(0, wallTop, W, 6);
    const archW = Math.max(70, W / 10);
    this.torches = [];
    for (let x = archW * .5; x < W; x += archW) {
      const aw = archW * .42, top = wallTop + (floorTop - wallTop) * .3;
      c.beginPath(); c.moveTo(x - aw / 2, floorTop); c.lineTo(x - aw / 2, top + aw / 2); c.arc(x, top + aw / 2, aw / 2, Math.PI, 0); c.lineTo(x + aw / 2, floorTop); c.closePath();
      c.fillStyle = '#1a0f0a'; c.fill();
      // sancak
      const bx = x + archW / 2;
      if (bx < W - 10) {
        c.fillStyle = '#8c1f17'; c.beginPath(); c.moveTo(bx - 9, wallTop + 6); c.lineTo(bx + 9, wallTop + 6); c.lineTo(bx + 9, wallTop + 46); c.lineTo(bx, wallTop + 38); c.lineTo(bx - 9, wallTop + 46); c.closePath(); c.fill();
        c.fillStyle = '#e2b25a'; c.beginPath(); c.arc(bx, wallTop + 20, 4, 0, 6.3); c.fill();
        this.torches.push({ x: bx, y: wallTop + (floorTop - wallTop) * .62 });
      }
    }
    this.torches.forEach(t => { c.fillStyle = '#2a1a10'; c.fillRect(t.x - 3, t.y, 6, 16); c.fillStyle = '#6b4a30'; c.fillRect(t.x - 6, t.y - 3, 12, 5); });
    // zemin (kum)
    g = c.createLinearGradient(0, floorTop, 0, H); g.addColorStop(0, '#b98d5c'); g.addColorStop(.4, '#d4ab76'); g.addColorStop(1, '#c49562');
    c.fillStyle = g; c.fillRect(0, floorTop, W, H - floorTop);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, floorTop, W, 5);
    for (let i = 0; i < W * 1.2; i++) {
      const y = rnd(floorTop + 4, H), sz = 1 + (y - floorTop) / (H - floorTop) * 1.6;
      c.fillStyle = Math.random() < .5 ? 'rgba(90,55,25,.18)' : 'rgba(255,240,210,.18)'; c.fillRect(rnd(0, W), y, sz, sz * .6);
    }
    c.strokeStyle = 'rgba(120,80,40,.15)'; c.lineWidth = 1;
    for (let i = 0; i < 9; i++) { const y = floorTop + (H - floorTop) * (i / 9) ** 1.4 + 8; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(W * .3, y + 4, W * .7, y - 4, W, y); c.stroke(); }
    // ışık huzmeleri
    c.save(); c.globalCompositeOperation = 'lighter';
    [[.22, .1], [.55, .14], [.8, .08]].forEach(([fx, w]) => {
      const lg = c.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, 'rgba(255,200,130,.10)'); lg.addColorStop(1, 'rgba(255,200,130,0)');
      c.fillStyle = lg; c.beginPath(); c.moveTo(W * fx, 0); c.lineTo(W * (fx + w * .4), 0); c.lineTo(W * (fx + w * 1.6), H); c.lineTo(W * (fx + w * .6), H); c.closePath(); c.fill();
    });
    c.restore();
    // vinyet
    g = c.createRadialGradient(W / 2, H * .7, H * .2, W / 2, H * .6, Math.max(W, H) * .8);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }

  drawBg(t) {
    const c = this.c;
    c.drawImage(this.bg, 0, 0, this.W, this.H);
    const amp = 1 + this.hype * 5;
    for (const p of this.crowd) {
      const b = Math.max(0, Math.sin(t * p.sp * (.4 + this.hype * .7) + p.ph)) * amp;
      c.fillStyle = p.col; c.fillRect(p.x - p.r, p.y - p.r * 2.2 - b, p.r * 2, p.r * 2.4);
      c.fillStyle = p.sk; c.beginPath(); c.arc(p.x, p.y - p.r * 3 - b, p.r * .9, 0, 6.28); c.fill();
      if (this.hype > .6 && p.ph < 1) { c.strokeStyle = p.sk; c.lineWidth = 1.5; c.beginPath(); c.moveTo(p.x - p.r, p.y - p.r * 2 - b); c.lineTo(p.x - p.r * 1.8, p.y - p.r * 4.5 - b * 1.4); c.stroke(); }
    }
    for (const tc of this.torches) {
      const f = Math.sin(t * 17 + tc.x) * 2 + Math.sin(t * 9) * 1.5;
      const g = c.createRadialGradient(tc.x, tc.y - 8, 1, tc.x, tc.y - 8, 46);
      g.addColorStop(0, 'rgba(255,190,90,.45)'); g.addColorStop(1, 'rgba(255,120,40,0)');
      c.fillStyle = g; c.fillRect(tc.x - 46, tc.y - 54, 92, 92);
      c.fillStyle = '#ffb347'; c.beginPath(); c.moveTo(tc.x - 6, tc.y - 3); c.quadraticCurveTo(tc.x - 2 + f, tc.y - 26 - f, tc.x + 6, tc.y - 3); c.fill();
      c.fillStyle = '#fff1c4'; c.beginPath(); c.moveTo(tc.x - 3, tc.y - 3); c.quadraticCurveTo(tc.x + f * .5, tc.y - 14, tc.x + 3, tc.y - 3); c.fill();
    }
  }

  burst(x, y, n, colors, spd = 4, g = .25, size = 3) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), v = rnd(.3, 1) * spd;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * .4, life: 0, max: rnd(30, 60), col: pick(colors), sz: rnd(.5, 1) * size, g });
    }
  }
  ring(x, y, col, r = 60) { (this.rings = this.rings || []).push({ x, y, col, r, life: 0 }); }
  petals(n) {
    for (let i = 0; i < n; i++) this.parts.push({ x: rnd(0, this.W), y: rnd(-60, this.H * .3), vx: rnd(-.6, .6), vy: rnd(.8, 1.8), life: 0, max: rnd(140, 220),
      col: pick(['#c9302c', '#e8475f', '#f2efe6', '#f6d58f']), sz: rnd(4, 7), g: .005, petal: true, ph: rnd(0, 6) });
  }
  trail(pts, col) {
    const c = this.c; if (pts.length < 2) return;
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      const k = i / pts.length;
      c.strokeStyle = col; c.globalAlpha = k * .55; c.lineWidth = 2 + k * 10 * this.s;
      c.beginPath(); c.moveTo(pts[i - 1][0], pts[i - 1][1]); c.lineTo(pts[i][0], pts[i][1]); c.stroke();
    }
    c.restore();
  }
  dust(x, y) { this.burst(x, y, 10, ['rgba(220,190,140,.7)', 'rgba(200,160,110,.6)'], 1.8, -.01, 5); }
  float(x, y, txt, col, size = 26) { this.texts.push({ x, y, txt, col, size, life: 0 }); }

  drawFx() {
    const c = this.c;
    this.parts = this.parts.filter(p => p.life < p.max);
    for (const p of this.parts) {
      p.life++; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= .97;
      if (p.y > this.ground + 4 && p.g > 0) { p.y = this.ground + 4; p.vy *= -.3; p.vx *= .6; }
      c.globalAlpha = 1 - p.life / p.max; c.fillStyle = p.col;
      if (p.petal) { p.x += Math.sin(p.life * .08 + p.ph) * .9; c.save(); c.translate(p.x, p.y); c.rotate(p.life * .05 + p.ph); c.beginPath(); c.ellipse(0, 0, p.sz, p.sz * .5, 0, 0, 6.28); c.fill(); c.restore(); }
      else c.fillRect(p.x, p.y, p.sz, p.sz);
    }
    c.globalAlpha = 1;
    this.rings = (this.rings || []).filter(r => r.life < 18);
    for (const r of this.rings) {
      r.life++; const k = r.life / 18;
      c.globalAlpha = 1 - k; c.strokeStyle = r.col; c.lineWidth = 6 * (1 - k) + 1;
      c.beginPath(); c.ellipse(r.x, r.y, r.r * k * this.s * 1.2 + 4, r.r * k * this.s + 4, 0, 0, 6.28); c.stroke();
    }
    c.globalAlpha = 1;
    this.texts = this.texts.filter(t => t.life < 70);
    for (const t of this.texts) {
      t.life++;
      const k = t.life / 70, pop = t.life < 8 ? 1 + (8 - t.life) * .08 : 1;
      c.globalAlpha = 1 - Math.max(0, k - .6) / .4;
      c.font = `900 ${t.size * pop}px Cinzel, Georgia, serif`; c.textAlign = 'center';
      c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,.8)'; c.strokeText(t.txt, t.x, t.y - k * 50);
      c.fillStyle = t.col; c.fillText(t.txt, t.x, t.y - k * 50);
    }
    c.globalAlpha = 1;
  }
}
