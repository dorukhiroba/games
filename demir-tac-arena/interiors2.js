/* ========= DEMİR TAÇ — Hekim ve Han iç mekânları ========= */
Object.assign(NPCS, {
  healer: { name: 'Hekim Ilya', level: 1, stats: {}, look: { skin: '#f2c9a0', hair: '#d9d2c5', cape: '#3d6b45', beard: true, hairStyle: 1, apron: '#e8dcc4' },
    equip: { weapon: { kind: 'none', tier: 0 }, helm: null, chest: null, shield: null },
    lines: ['Yaralarını kumda bırakma, bir şişe yanına al.', 'Şifa iksiri dövüşün ortasında hayat kurtarır.', 'Öfke tozu kalabalığı çıldırtır, dikkatli kullan.', 'Her şişe bir tur sürer. Zamanlamayı iyi seç.'],
    buy: ['Akıllıca. Kırmızı olanı en zor anda iç.', 'Bu şişe seni ayakta tutar.', 'Sağlıcakla kullan.'] },
  tavern: { name: 'Hancı Doruk', level: 1, stats: {}, look: { skin: '#d9a273', hair: '#4a2c17', cape: '#7a3b26', beard: true, hairStyle: 2, apron: '#d8c7a3' },
    equip: { weapon: { kind: 'none', tier: 0 }, helm: null, chest: null, shield: null },
    lines: ['Hoş geldin! Panoda yeni işler var.', 'Karnın aç mı? Dövüşten önce iyi bir güveç iyi gelir.', 'Ozanı dinle, rakiplerin hakkında çok şey bilir.', 'Gece maçları daha çok altın getirir, derler.'] },
  bard: { name: 'Ozan Selvi', level: 1, stats: {}, look: { skin: '#f2c9a0', hair: '#c99a4e', cape: '#6b3b80', beard: false, hairStyle: 1 },
    equip: { weapon: { kind: 'none', tier: 0 }, helm: null, chest: null, shield: null }, lines: [] },
});

/* İksir şişesi */
function drawPotion(c, p, x, y, size, t = 0) {
  const k = size / 100;
  c.save(); c.translate(x, y); c.scale(k, k);
  const glow = c.createRadialGradient(0, 10, 4, 0, 10, 70); glow.addColorStop(0, p.color + '66'); glow.addColorStop(1, p.color + '00');
  c.fillStyle = glow; c.fillRect(-70, -60, 140, 140);
  c.lineWidth = 3; c.strokeStyle = OUT;
  if (p.icon === 'heal') { // yuvarlak şişe
    c.beginPath(); c.arc(0, 18, 30, 0, 6.28); c.moveTo(-9, -12); c.lineTo(-9, -32); c.lineTo(9, -32); c.lineTo(9, -12); c.fillStyle = 'rgba(220,235,240,.35)'; c.fill(); c.stroke();
    c.save(); c.beginPath(); c.arc(0, 18, 27, 0, 6.28); c.clip(); c.fillStyle = p.color; c.fillRect(-30, 6 + Math.sin(t * 3) * 2, 60, 50); c.restore();
  } else if (p.icon === 'stam') { // uzun şişe
    c.beginPath(); c.roundRect(-18, -20, 36, 66, 10); c.moveTo(-8, -20); c.lineTo(-8, -38); c.lineTo(8, -38); c.lineTo(8, -20); c.fillStyle = 'rgba(220,235,240,.35)'; c.fill(); c.stroke();
    c.save(); c.beginPath(); c.roundRect(-15, -17, 30, 60, 8); c.clip(); c.fillStyle = p.color; c.fillRect(-16, -2 + Math.sin(t * 3 + 1) * 2, 32, 50); c.restore();
  } else { // kese
    c.beginPath(); c.moveTo(-26, 46); c.quadraticCurveTo(-36, 0, -12, -16); c.lineTo(12, -16); c.quadraticCurveTo(36, 0, 26, 46); c.closePath();
    c.fillStyle = '#8a5a30'; c.fill(); c.stroke();
    c.fillStyle = p.color; c.beginPath(); c.ellipse(0, -18, 16, 7, 0, 0, 6.28); c.fill(); c.stroke();
    c.strokeStyle = '#e2b25a'; c.lineWidth = 4; c.beginPath(); c.moveTo(-14, -8); c.lineTo(14, -8); c.stroke();
    for (let i = 0; i < 5; i++) { c.fillStyle = `rgba(255,220,120,${.5 + Math.sin(t * 5 + i) * .4})`; c.fillRect(-14 + i * 7, -32 - Math.abs(Math.sin(t * 2 + i)) * 12, 3, 3); }
  }
  if (p.icon !== 'rage') { c.fillStyle = '#a0764a'; c.fillRect(-10, p.icon === 'heal' ? -42 : -48, 20, 12); c.strokeStyle = OUT; c.lineWidth = 2; c.strokeRect(-10, p.icon === 'heal' ? -42 : -48, 20, 12);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(p.icon === 'heal' ? -12 : -8, p.icon === 'heal' ? 8 : 0, 4, 10, -.3, 0, 6.28); c.fill(); }
  c.restore();
}

Object.assign(TownView.prototype, {
  /* ---------------- HEKİM ---------------- */
  static_healer(c) {
    this.room(c, '#3a4434', '#4e5a44', '#4a3a2a', '#221a12');
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 2;
    for (let r = 0; r < 20; r++) { const y = this.vy0 + r * 44; if (y > 640) break; c.beginPath(); c.moveTo(this.vx0, y); c.lineTo(this.vx1, y); c.stroke(); }
    // pencere
    c.fillStyle = '#cfe0b8'; c.beginPath(); c.moveTo(1180, 300); c.lineTo(1180, 170); c.arc(1260, 170, 80, Math.PI, 0); c.lineTo(1340, 300); c.fill();
    c.strokeStyle = '#2a1a10'; c.lineWidth = 9; c.stroke(); c.beginPath(); c.moveTo(1260, 90); c.lineTo(1260, 300); c.stroke();
    // kavanoz rafları
    [180, 330].forEach(y => { c.fillStyle = '#4a2e1a'; c.fillRect(60, y, 520, 14);
      for (let i = 0; i < 9; i++) { const jx = 90 + i * 55, col = ['#6b8a3a', '#a0522d', '#c9b08a', '#7a1f4a', '#4f7a7a'][i % 5];
        c.fillStyle = 'rgba(220,235,240,.3)'; c.fillRect(jx - 16, y - 46, 32, 46); c.fillStyle = col; c.fillRect(jx - 14, y - 30, 28, 30); c.fillStyle = '#6b4325'; c.fillRect(jx - 17, y - 52, 34, 8); } });
    // kurutulmuş otlar
    for (let i = 0; i < 10; i++) { const hx = 680 + i * 80; c.strokeStyle = '#4a2e1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(hx, this.vy0); c.lineTo(hx, 60 + (i % 3) * 20); c.stroke();
      c.fillStyle = i % 2 ? '#6b8a3a' : '#8a7a3a'; for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(hx + (k - 1.5) * 7, 80 + (i % 3) * 20 + k * 6, 6, 18, (k - 1.5) * .3, 0, 6.28); c.fill(); } }
    // tezgâh (iksir rafı)
    const g = c.createLinearGradient(0, 520, 0, 640); g.addColorStop(0, '#7a4b2a'); g.addColorStop(1, '#4a2e1a');
    c.fillStyle = g; c.fillRect(800, 540, 720, 110); c.fillStyle = '#9a6a40'; c.fillRect(790, 528, 740, 18);
    // kazan
    c.fillStyle = '#2b2b30'; c.beginPath(); c.ellipse(300, 700, 110, 80, 0, 0, Math.PI); c.lineTo(190, 640); c.ellipse(300, 640, 110, 28, 0, Math.PI, 0, true); c.fill();
    c.strokeStyle = '#4a4a50'; c.lineWidth = 6; c.beginPath(); c.ellipse(300, 640, 110, 28, 0, 0, 6.28); c.stroke();
    c.fillStyle = '#5a3a20'; [[230, 760], [370, 760]].forEach(([lx, ly]) => c.fillRect(lx - 8, ly, 16, 30));
    c.fillStyle = '#8a3a10'; c.fillRect(220, 785, 160, 14);
    this.vignette(c);
  },
  live_healer(t) {
    const c = this.c;
    // kazan sıvısı + kabarcık + buhar
    c.fillStyle = '#5fa04a'; c.beginPath(); c.ellipse(300, 642, 100, 22, 0, 0, 6.28); c.fill();
    for (let i = 0; i < 6; i++) { const k = (t * .8 + i / 6) % 1; c.fillStyle = `rgba(180,240,140,${1 - k})`; c.beginPath(); c.arc(240 + i * 24, 640 - k * 6, 4 + k * 6, 0, 6.28); c.fill(); }
    for (let i = 0; i < 8; i++) { const k = (t * .3 + i / 8) % 1; c.fillStyle = `rgba(200,230,190,${.25 * (1 - k)})`; c.beginPath(); c.arc(300 + Math.sin(k * 6 + i) * 30, 620 - k * 300, 20 + k * 40, 0, 6.28); c.fill(); }
    c.save(); c.globalCompositeOperation = 'lighter';
    const fl = .8 + Math.sin(t * 11) * .15;
    let g = c.createRadialGradient(300, 790, 5, 300, 790, 200); g.addColorStop(0, `rgba(255,140,40,${.5 * fl})`); g.addColorStop(1, 'rgba(255,100,20,0)');
    c.fillStyle = g; c.fillRect(100, 590, 400, 400);
    g = c.createRadialGradient(1260, 250, 10, 1260, 250, 420); g.addColorStop(0, 'rgba(220,255,200,.18)'); g.addColorStop(1, 'rgba(220,255,200,0)');
    c.fillStyle = g; c.fillRect(840, -170, 840, 840);
    c.restore();
    this.drawNPC(c, 'healer', 560, 770, 1.5, 'idle', 0, t);
    POTIONS.forEach((p, i) => this.potionSlot(c, p, 930 + i * 230, 440, 170, t));
  },
  potionSlot(c, p, x, y, size, t) {
    const have = (G.potions || {})[p.id] || 0, hov = this.hover === p.id, sel = this.sel === p.id;
    this.hits.push({ id: p.id, item: p, x: x - size / 2, y: y - size / 2, w: size, h: size + 40 });
    if (hov || sel) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, 4, x, y, size * .8); g.addColorStop(0, sel ? 'rgba(255,210,120,.4)' : 'rgba(255,210,120,.2)'); g.addColorStop(1, 'rgba(255,210,120,0)'); c.fillStyle = g; c.fillRect(x - size, y - size, size * 2, size * 2); c.restore(); }
    drawPotion(c, p, x, y + (hov ? -6 : 0) + Math.sin(t * 2 + x) * 3, size * .9, t);
    if (sel) { c.strokeStyle = '#f6d58f'; c.lineWidth = 3; c.setLineDash([8, 6]); c.lineDashOffset = -t * 20; c.beginPath(); c.roundRect(x - size / 2, y - size / 2 - 10, size, size + 10, 14); c.stroke(); c.setLineDash([]); }
    const label = `${p.price} altın · ${have}/${POTION_MAX}`;
    c.font = '700 17px Manrope, sans-serif'; const w = c.measureText(label).width + 22;
    c.fillStyle = 'rgba(20,12,8,.85)'; c.beginPath(); c.roundRect(x - w / 2, y + size / 2 + 6, w, 28, 8); c.fill();
    c.strokeStyle = 'rgba(226,178,90,.35)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = have >= POTION_MAX ? '#8fd0c7' : '#f1e6d6'; c.textAlign = 'center'; c.fillText(label, x, y + size / 2 + 25);
    c.font = '800 18px Cinzel, Georgia, serif'; c.fillStyle = '#f6d58f'; c.fillText(p.name, x, y - size / 2 - 14);
  },

  /* ---------------- HAN ---------------- */
  static_tavern(c) {
    this.room(c, '#3e2a1c', '#5a3d28', '#4a3020', '#1d130c', 600);
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 3;
    for (let x = Math.floor(this.vx0 / 70) * 70; x < this.vx1; x += 70) { c.beginPath(); c.moveTo(x, this.vy0); c.lineTo(x, 600); c.stroke(); }
    c.fillStyle = '#2a1a10'; c.fillRect(this.vx0, this.vy0, this.vx1 - this.vx0, 40 - this.vy0); for (let x = 100; x < 1600; x += 300) c.fillRect(x, 0, 30, 90);
    // şömine + kupa rafı
    c.fillStyle = '#6e5a4a'; c.fillRect(40, 250, 300, 350); c.fillStyle = '#4e3e32'; c.fillRect(20, 236, 340, 26);
    c.fillStyle = '#120806'; c.beginPath(); c.moveTo(80, 600); c.lineTo(80, 400); c.arc(190, 400, 110, Math.PI, 0); c.lineTo(300, 600); c.fill();
    // bar arkası raflar
    c.fillStyle = '#4a2e1a'; c.fillRect(400, 230, 330, 12); c.fillRect(400, 330, 330, 12);
    for (let i = 0; i < 12; i++) { const bx = 418 + (i % 6) * 52, byy = i < 6 ? 230 : 330; c.fillStyle = ['#3d6b45', '#7a1f17', '#c08a2e', '#2f5d8a'][i % 4];
      c.beginPath(); c.roundRect(bx, byy - 44, 20, 44, 5); c.fill(); c.fillRect(bx + 6, byy - 56, 8, 14); }
    // görev panosu
    c.fillStyle = '#5a3a20'; c.fillRect(770, 130, 250, 250); c.strokeStyle = '#2a1a10'; c.lineWidth = 8; c.strokeRect(770, 130, 250, 250);
    c.fillStyle = '#7a5232'; c.fillRect(778, 138, 234, 234);
    c.font = '700 22px Cinzel, Georgia, serif'; c.fillStyle = '#f6d58f'; c.textAlign = 'center'; c.fillText('GÖREVLER', 895, 120);
    // fıçılar
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3 - i; j++) {
      const bx = 1330 + j * 90 + i * 45, byy = 590 - i * 80;
      c.fillStyle = '#6b4325'; c.beginPath(); c.ellipse(bx, byy - 40, 42, 40, 0, 0, 6.28); c.fill(); c.strokeStyle = '#2a1a10'; c.lineWidth = 4; c.stroke();
      c.fillStyle = '#c99a4e'; c.beginPath(); c.ellipse(bx, byy - 40, 14, 14, 0, 0, 6.28); c.fill();
    }
    this.vignette(c);
  },
  live_tavern(t) {
    const c = this.c;
    // şömine ateşi + fenerler
    c.save(); c.globalCompositeOperation = 'lighter';
    const fl = .8 + Math.sin(t * 12) * .1 + Math.sin(t * 5) * .08;
    let g = c.createRadialGradient(190, 540, 10, 190, 540, 520); g.addColorStop(0, `rgba(255,150,50,${.5 * fl})`); g.addColorStop(1, 'rgba(255,90,20,0)');
    c.fillStyle = g; c.fillRect(-330, 20, 1040, 1040);
    for (let i = 0; i < 7; i++) { const fx = 110 + i * 27, h = 50 + Math.sin(t * 9 + i * 1.7) * 20; c.fillStyle = i % 2 ? 'rgba(255,190,80,.8)' : 'rgba(255,110,40,.7)';
      c.beginPath(); c.moveTo(fx - 16, 598); c.quadraticCurveTo(fx + Math.sin(t * 8 + i) * 8, 598 - h * 2, fx + 16, 598); c.fill(); }
    [560, 1150].forEach((lx, i) => { const lg = c.createRadialGradient(lx, 150, 4, lx, 150, 180); lg.addColorStop(0, `rgba(255,200,110,${.4 + Math.sin(t * 6 + i) * .05})`); lg.addColorStop(1, 'rgba(255,160,60,0)'); c.fillStyle = lg; c.fillRect(lx - 180, -30, 360, 360); });
    c.restore();
    [560, 1150].forEach(lx => { c.strokeStyle = '#2a1a10'; c.lineWidth = 2; c.beginPath(); c.moveTo(lx, 40); c.lineTo(lx, 130); c.stroke(); c.fillStyle = '#ffcf7a'; c.fillRect(lx - 10, 130, 20, 28); c.strokeStyle = '#3b2414'; c.lineWidth = 3; c.strokeRect(lx - 10, 130, 20, 28); });
    // kupa rafı: kazanılan turnuvalar
    TOURNEYS.forEach((tr, i) => { const won = (G.trophies[tr.id] || 0) > 0; drawTrophy(c, tr, 75 + i * 76, 207, 58, !won); });
    // görev panosu kâğıtları
    G.contracts.forEach((ct, i) => {
      const x = 800 + (i % 2) * 112, y = 160 + Math.floor(i / 2) * 104 + (i === 2 ? 0 : 0), rot = (i - 1) * .06;
      c.save(); c.translate(x + 45, y + 45); c.rotate(rot);
      c.fillStyle = ct.done ? '#fff4d6' : '#ecdcb6'; c.fillRect(-45, -45, 90, 92);
      c.fillStyle = '#8c1f17'; c.beginPath(); c.arc(0, -40, 5, 0, 6.28); c.fill();
      c.strokeStyle = 'rgba(60,40,20,.5)'; c.lineWidth = 2; for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(-34, -22 + k * 12); c.lineTo(28 - (k % 2) * 16, -22 + k * 12); c.stroke(); }
      if (ct.done) { c.fillStyle = '#e2b25a'; c.beginPath(); c.arc(22, 30, 13, 0, 6.28); c.fill(); c.fillStyle = '#7a4b10'; c.font = '900 14px Cinzel, Georgia, serif'; c.textAlign = 'center'; c.fillText('✓', 22, 35); }
      c.restore();
    });
    this.hits.push({ id: 'board', action: 'jobs', x: 770, y: 100, w: 250, h: 280 });
    if (this.hover === 'board') { c.strokeStyle = '#f6d58f'; c.lineWidth = 4; c.strokeRect(764, 124, 262, 262); }
    // bar ve hancı
    this.drawNPC(c, 'tavern', 560, 680, 1.35, 'idle', 0, t);
    const bg = c.createLinearGradient(0, 520, 0, 700); bg.addColorStop(0, '#7a4b2a'); bg.addColorStop(1, '#4a2e1a');
    c.fillStyle = bg; c.fillRect(390, 540, 350, 160); c.fillStyle = '#9a6a40'; c.fillRect(380, 526, 370, 18);
    c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 3; for (let x = 440; x < 740; x += 60) { c.beginPath(); c.moveTo(x, 545); c.lineTo(x, 700); c.stroke(); }
    [[440, 524], [700, 524]].forEach(([mx, my]) => { c.fillStyle = '#c99a4e'; c.fillRect(mx, my - 26, 20, 26); c.fillStyle = '#fff4dc'; c.fillRect(mx - 2, my - 30, 24, 6); });
    this.hits.push({ id: 'bar', action: 'food', x: 380, y: 420, w: 370, h: 280 });
    if (this.hover === 'bar') { c.strokeStyle = '#f6d58f'; c.lineWidth = 4; c.strokeRect(380, 526, 370, 174); }
    // masalar ve müşteriler
    const table = (x, y, guests) => {
      guests.forEach(([gx, dir, look], k) => drawFighter(c, { look, equip: { weapon: { kind: 'none', tier: 0 }, helm: null, chest: 'c1', shield: null } }, x + gx, y + 10, .9, dir, 'rest', .5 + Math.sin(t * .8 + k + x) * .1, t + k));
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, y + 80, 120, 18, 0, 0, 6.28); c.fill();
      c.fillStyle = '#5a3a20'; c.fillRect(x - 10, y - 10, 20, 90);
      c.fillStyle = '#7a4b2a'; c.beginPath(); c.ellipse(x, y - 14, 110, 26, 0, 0, 6.28); c.fill(); c.strokeStyle = '#3b2414'; c.lineWidth = 3; c.stroke();
      [[-40, -20], [30, -18]].forEach(([mx, my], k) => { const lift = Math.max(0, Math.sin(t * .9 + k * 2 + x)) * 10; c.fillStyle = '#c99a4e'; c.fillRect(x + mx, y + my - 22 - lift, 16, 22); c.fillStyle = '#fff4dc'; c.fillRect(x + mx - 1, y + my - 25 - lift, 18, 5); });
    };
    if (!this.patrons) this.patrons = [randomLook(), randomLook(), randomLook(), randomLook()];
    table(330, 780, [[-90, 1, this.patrons[0]], [90, -1, this.patrons[1]]]);
    table(1080, 760, [[-90, 1, this.patrons[2]], [90, -1, this.patrons[3]]]);
    // ozan: ut çalıyor, notalar uçuşuyor
    const bx = 790, by = 830;
    drawFighter(c, NPCS.bard, bx, by, 1.25, -1, 'idle', 0, t);
    c.save(); c.translate(bx - 30, by - 120); c.rotate(-.5 + Math.sin(t * 6) * .04);
    c.fillStyle = '#a0662f'; c.beginPath(); c.ellipse(0, 0, 30, 22, 0, 0, 6.28); c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#2a1a10'; c.beginPath(); c.arc(4, 0, 6, 0, 6.28); c.fill();
    c.fillStyle = '#6b4325'; c.fillRect(-80, -4, 56, 8); c.strokeRect(-80, -4, 56, 8);
    c.restore();
    for (let i = 0; i < 4; i++) { const k = (t * .35 + i / 4) % 1; c.fillStyle = `rgba(246,213,143,${1 - k})`; c.font = '900 26px Georgia, serif'; c.textAlign = 'center'; c.fillText(i % 2 ? '♪' : '♫', bx - 40 + Math.sin(k * 6 + i) * 30, by - 180 - k * 160); }
    this.hits.push({ id: 'bard', action: 'rumor', x: bx - 110, y: by - 260, w: 180, h: 260 });
    if (this.hover === 'bard') { c.strokeStyle = 'rgba(246,213,143,.8)'; c.lineWidth = 3; c.setLineDash([8, 6]); c.strokeRect(bx - 110, by - 260, 180, 260); c.setLineDash([]); }
  },
});
