/* ========= DEMİR TAÇ — yaşayan şehir dünyası (2400 birim genişlik, kaydırılabilir) ========= */
Object.assign(PLACES, {
  healer:   { name: 'Hekim',   sub: 'İksirler · Şifa',          rect: [60, 420, 320, 360],   tag: [210, 395],  door: [205, 770] },
  smith:    { name: 'Demirci', sub: 'Silahlar',                 rect: [460, 360, 380, 420],  tag: [635, 330],  door: [635, 780] },
  barracks: { name: 'Kışla',   sub: 'Antrenman · Nitelikler',   rect: [860, 440, 250, 260],  tag: [985, 425],  door: [985, 640] },
  arena:    { name: 'Arena',   sub: 'Şampiyonluk Merdiveni',    rect: [1085, 200, 430, 350], tag: [1300, 175], door: [1300, 545] },
  tavern:   { name: 'Han',     sub: 'Yirmi Bir · Bahis',         rect: [1500, 340, 420, 440], tag: [1730, 310], door: [1730, 780] },
  armor:    { name: 'Zırhçı',  sub: 'Miğfer · Zırh · Kalkan',   rect: [1980, 360, 380, 420], tag: [2155, 330], door: [2230, 780] },
});
const ROAD_Y = 832;

Object.assign(TownView.prototype, {
  initWorld() {
    this.walkers = Array.from({ length: 14 }, () => this.newWalker());
    this.clouds = Array.from({ length: 9 }, (_, i) => ({ x: i * 290 + rnd(0, 200), y: rnd(50, 230), s: rnd(.6, 1.4), v: rnd(.05, .16) }));
    this.birds = Array.from({ length: 6 }, (_, i) => ({ x: rnd(0, TW), y: rnd(90, 260), v: rnd(.8, 1.4), ph: rnd(0, 6) }));
    this.cart = { x: -300, dir: 1, wait: 300 };
  },
  newWalker() {
    const r = Math.random(), look = randomLook();
    if (r < .45) { // ana yolda yürüyen
      const dir = Math.random() < .5 ? 1 : -1;
      return { mode: 'road', x: rnd(0, TW), y: rnd(846, 892), v: rnd(.5, 1) * dir, look, ph: rnd(0, 6) };
    }
    if (r < .75) { // bir kapıya gidip içeri giren
      const pl = PLACES[pick(Object.keys(PLACES))];
      return { mode: 'visit', x: rnd(0, TW), y: rnd(846, 880), tx: pl.door[0] + rnd(-12, 12), ty: pl.door[1], v: rnd(.6, 1), look, ph: rnd(0, 6), a: 1 };
    }
    return { mode: 'plaza', x: rnd(1080, 1480), y: rnd(700, 822), v: rnd(.3, .6) * (Math.random() < .5 ? 1 : -1), look, ph: rnd(0, 6) };
  },
  depth(y) { return .2 + (y - 540) / 360 * .3; },

  /* ================= STATİK KATMAN ================= */
  drawTownStatic(c) {
    const HZ = 540, Y0 = this.vy0, Y1 = this.vy1;
    let g = c.createLinearGradient(0, Y0, 0, HZ);
    g.addColorStop(0, '#241a35'); g.addColorStop(.45, '#6e3443'); g.addColorStop(.8, '#d0703f'); g.addColorStop(1, '#f2b062');
    c.fillStyle = g; c.fillRect(0, Y0, TW, HZ - Y0);
    g = c.createRadialGradient(1700, 470, 10, 1700, 470, 520);
    g.addColorStop(0, 'rgba(255,230,160,.95)'); g.addColorStop(.07, 'rgba(255,200,120,.7)'); g.addColorStop(1, 'rgba(255,140,60,0)');
    c.fillStyle = g; c.fillRect(0, Y0, TW, HZ - Y0);
    [[465, '#7a4148', 46, .0035], [500, '#62363d', 34, .006], [522, '#4f2d33', 18, .011]].forEach(([base, col, amp, f]) => {
      c.beginPath(); c.moveTo(0, HZ);
      for (let x = 0; x <= TW; x += 16) c.lineTo(x, base - Math.sin(x * f) * amp - Math.sin(x * f * 2.7 + 1) * amp * .4);
      c.lineTo(TW, HZ); c.closePath(); c.fillStyle = col; c.fill();
    });
    // uzak köy siluetleri
    c.fillStyle = '#4a2a30';
    for (let i = 0; i < 18; i++) { const x = 60 + i * 135 + Math.sin(i * 7) * 30, w = 40 + (i % 3) * 14, h = 20 + (i % 4) * 8; c.fillRect(x, 528 - h, w, h + 12); c.beginPath(); c.moveTo(x - 6, 528 - h); c.lineTo(x + w / 2, 515 - h - 12); c.lineTo(x + w + 6, 528 - h); c.fill(); }
    [[1020, 524], [1060, 532], [1560, 526], [1600, 532], [430, 528], [2380, 525], [20, 520]].forEach(([x, y]) => {
      c.fillStyle = '#2d2a1f'; c.beginPath(); c.ellipse(x, y - 50, 12, 55, 0, 0, 6.28); c.fill();
    });
    // meydan zemini
    g = c.createLinearGradient(0, HZ, 0, Y1);
    g.addColorStop(0, '#7e6046'); g.addColorStop(.4, '#a17d58'); g.addColorStop(1, '#6e5038');
    c.fillStyle = g; c.fillRect(0, HZ, TW, Math.max(10, Y1 - HZ));
    c.strokeStyle = 'rgba(40,25,15,.2)'; c.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) { const y = HZ + (Y1 - HZ) * Math.pow(i / 18, 1.7); c.beginPath(); c.moveTo(0, y); c.lineTo(TW, y); c.stroke(); }
    for (let i = -40; i <= 40; i++) { const bx = 1300 + i * 110; c.beginPath(); c.moveTo(1300 + (bx - 1300) * .12, HZ); c.lineTo(bx, Y1 + 200); c.stroke(); }
    // çimen tutamları
    for (let i = 0; i < 160; i++) { const x = rnd(0, TW), y = rnd(HZ + 8, Y1); c.strokeStyle = `rgba(80,100,40,${rnd(.25, .5)})`; c.lineWidth = 2; c.beginPath(); for (let k = -1; k <= 1; k++) { c.moveTo(x, y); c.lineTo(x + k * 4, y - rnd(5, 10)); } c.stroke(); }
    this.drawRoads(c);
    g = c.createRadialGradient(1300, 720, 40, 1300, 720, 700); g.addColorStop(0, 'rgba(255,210,150,.2)'); g.addColorStop(1, 'rgba(255,210,150,0)');
    c.fillStyle = g; c.fillRect(0, HZ, TW, Y1 - HZ);

    this.drawColosseum(c, 1300, 545, 430, 270);
    this.bBarracks(c);
    this.bHealer(c);
    this.bSmith(c);
    this.bTavern(c);
    this.bArmor(c);
    this.drawStall(c, 1000, 805);
    this.drawFountain(c, 1300, 800);
  },

  /* Yollar: ana cadde + her kapıya açılan taş yol */
  drawRoads(c) {
    const road = (pts) => {
      c.save(); c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath();
      c.fillStyle = '#b39470'; c.fill(); c.clip();
      for (let y = 530; y < 920; y += 13) {
        const sz = 6 + (y - 530) / 30;
        for (let x = (y / 13 % 2) * sz; x < TW; x += sz * 1.6) {
          c.fillStyle = `rgba(${Math.random() < .5 ? '80,55,35' : '230,210,180'},${rnd(.12, .3)})`;
          c.beginPath(); c.roundRect(x, y, sz * 1.3, 9, 3); c.fill();
        }
      }
      c.restore();
      c.strokeStyle = 'rgba(60,40,25,.45)'; c.lineWidth = 3;
      c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.stroke();
    };
    road([[-20, ROAD_Y], [TW + 20, ROAD_Y], [TW + 20, 910], [-20, 910]]);
    this.lamps = [];
    for (let x = 160; x < TW; x += 330) { if (Math.abs(x - 1300) < 200) continue; c.strokeStyle = '#2a1a10'; c.lineWidth = 6; c.beginPath(); c.moveTo(x, ROAD_Y + 4); c.lineTo(x, ROAD_Y - 110); c.lineTo(x + 18, ROAD_Y - 110); c.stroke();
      c.fillStyle = '#3b2414'; c.fillRect(x + 10, ROAD_Y - 112, 18, 6); c.fillStyle = '#ffcf7a'; c.fillRect(x + 12, ROAD_Y - 106, 14, 18); c.strokeStyle = '#2a1a10'; c.lineWidth = 2; c.strokeRect(x + 12, ROAD_Y - 106, 14, 18); this.lamps.push([x + 19, ROAD_Y - 97]); }
    for (const [id, P] of Object.entries(PLACES)) {
      const [dx, dy] = P.door, top = id === 'arena' ? 40 : 34, bot = id === 'arena' ? 230 : 90;
      road([[dx - top, dy], [dx + top, dy], [dx + bot, ROAD_Y + 2], [dx - bot, ROAD_Y + 2]]);
    }
  },

  /* Kutu bina: ön yüz + yan yüz + üçgen çatı */
  house(c, x, by, w, h, sideDir, depth, wall, roof) {
    const sx = sideDir > 0 ? x + w : x, dx = depth * sideDir, dy = -depth * .35;
    c.fillStyle = 'rgba(30,15,10,.35)';
    c.beginPath(); c.moveTo(x - 10, by); c.lineTo(x + w + 10, by); c.lineTo(x + w + 10 + 60 * -sideDir, by + 30); c.lineTo(x - 10 + 60 * -sideDir, by + 30); c.fill();
    c.fillStyle = shade(wall, -.38);
    c.beginPath(); c.moveTo(sx, by); c.lineTo(sx + dx, by + dy); c.lineTo(sx + dx, by - h + dy); c.lineTo(sx, by - h); c.closePath(); c.fill();
    const g = c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, shade(wall, sideDir > 0 ? .08 : -.15)); g.addColorStop(1, shade(wall, sideDir > 0 ? -.15 : .08));
    c.fillStyle = g; c.fillRect(x, by - h, w, h);
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; c.strokeRect(x, by - h, w, h);
    const rh = h * .45, top = by - h;
    c.fillStyle = shade(roof, -.3);
    c.beginPath(); c.moveTo(x + w / 2, top - rh); c.lineTo(x + w / 2 + dx, top - rh + dy); c.lineTo(sx + dx + 14 * sideDir, top + dy + 4); c.lineTo(sx + 14 * sideDir, top + 4); c.closePath(); c.fill();
    const rg = c.createLinearGradient(0, top - rh, 0, top);
    rg.addColorStop(0, shade(roof, .15)); rg.addColorStop(1, shade(roof, -.1));
    c.fillStyle = rg;
    c.beginPath(); c.moveTo(x - 14, top + 4); c.lineTo(x + w / 2, top - rh); c.lineTo(x + w + 14, top + 4); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 1.5;
    for (let i = 1; i < 8; i++) { const yy = top - rh + rh * i / 8, hw = (w / 2 + 14) * i / 8; c.beginPath(); c.moveTo(x + w / 2 - hw, yy + 4 * i / 8); c.lineTo(x + w / 2 + hw, yy + 4 * i / 8); c.stroke(); }
    c.strokeStyle = shade(roof, -.45); c.lineWidth = 4;
    c.beginPath(); c.moveTo(x - 14, top + 4); c.lineTo(x + w / 2, top - rh); c.lineTo(x + w + 14, top + 4); c.stroke();
  },
  signBoard(c, x, y, text) {
    c.font = '700 26px Cinzel, Georgia, serif'; const w = c.measureText(text).width + 36;
    c.fillStyle = '#3b2414'; c.beginPath(); c.roundRect(x - w / 2, y - 22, w, 40, 6); c.fill();
    c.strokeStyle = '#e2b25a'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#f6d58f'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, y); c.textBaseline = 'alphabetic';
  },
  window(c, x, y, w, h) {
    c.fillStyle = '#2a1a12'; c.fillRect(x - 4, y - 4, w + 8, h + 8);
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#ffd98a'); g.addColorStop(1, '#e89a48');
    c.fillStyle = g; c.fillRect(x, y, w, h);
    c.strokeStyle = '#3b2414'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2); c.stroke();
  },
  archDoor(c, x, by, w, h, col = '#1a0d08', frame = '#4a3a2e') {
    c.fillStyle = col; c.beginPath(); c.moveTo(x, by); c.lineTo(x, by - h + w / 2); c.arc(x + w / 2, by - h + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w, by); c.closePath(); c.fill();
    c.strokeStyle = frame; c.lineWidth = 7; c.stroke();
  },

  bHealer(c) {
    const x = 70, by = 770, w = 280, h = 230;
    this.house(c, x, by, w, h, 1, 60, '#d9ccb2', '#3d6b45');
    this.archDoor(c, x + 100, by, 70, 120, '#1f2a1c');
    c.fillStyle = '#3d6b45'; c.fillRect(x + 104, by - 118, 62, 30);
    this.window(c, x + 26, by - 150, 50, 50); this.window(c, x + 204, by - 150, 50, 50);
    // kurutulmuş otlar
    for (let i = 0; i < 6; i++) { c.strokeStyle = '#4a2e1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 30 + i * 40, by - h + 8); c.lineTo(x + 30 + i * 40, by - h + 30); c.stroke();
      c.fillStyle = i % 2 ? '#6b8a3a' : '#8a7a3a'; c.beginPath(); c.ellipse(x + 30 + i * 40, by - h + 40, 9, 14, 0, 0, 6.28); c.fill(); }
    // saksılar
    [[x + 20, by], [x + 240, by], [x + 285, by + 4]].forEach(([px, py]) => {
      c.fillStyle = '#a0522d'; c.beginPath(); c.moveTo(px - 16, py - 26); c.lineTo(px + 16, py - 26); c.lineTo(px + 11, py); c.lineTo(px - 11, py); c.fill();
      c.fillStyle = '#4f7a3a'; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(px - 12 + k * 6, py - 34 - (k % 2) * 8, 10, 0, 6.28); c.fill(); }
    });
    // tabela: kâse ve yılan
    c.strokeStyle = '#2a1a10'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + w + 6, by - h + 40); c.lineTo(x + w + 56, by - h + 32); c.stroke();
    c.fillStyle = '#e8dcc4'; c.beginPath(); c.arc(x + w + 40, by - h + 74, 26, 0, 6.28); c.fill(); c.strokeStyle = '#3b2414'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#3d6b45'; c.beginPath(); c.arc(x + w + 40, by - h + 78, 13, 0, Math.PI); c.fill();
    c.strokeStyle = '#3d6b45'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(x + w + 40, by - h + 96); c.bezierCurveTo(x + w + 26, by - h + 70, x + w + 54, by - h + 66, x + w + 38, by - h + 52); c.stroke();
    this.signBoard(c, x + w / 2, by - h - 34, 'HEKİM');
  },
  bSmith(c) {
    const x = 470, by = 780, w = 330, h = 280;
    this.house(c, x, by, w, h, 1, 70, '#8b7a6a', '#7a3b26');
    c.strokeStyle = 'rgba(40,25,15,.35)'; c.lineWidth = 1.5;
    for (let r = 0; r < 10; r++) { const y = by - h + r * 28; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.stroke();
      for (let i = 0; i < 7; i++) { const bx = x + i * 50 + (r % 2) * 25; c.beginPath(); c.moveTo(bx, y); c.lineTo(bx, y + 28); c.stroke(); } }
    c.fillStyle = '#5e4a3c'; c.fillRect(x + 250, by - h - 150, 44, 120); c.fillStyle = '#3e3028'; c.fillRect(x + 244, by - h - 158, 56, 14);
    this.archDoor(c, x + 110, by, 110, 195);
    c.fillStyle = '#2b2b30'; c.beginPath(); c.moveTo(x + 245, by - 40); c.lineTo(x + 315, by - 40); c.lineTo(x + 300, by - 26); c.lineTo(x + 262, by - 26); c.closePath(); c.fill();
    c.fillRect(x + 272, by - 26, 20, 26);
    c.fillStyle = '#6b4325'; c.fillRect(x + 22, by - 60, 46, 60); c.strokeStyle = '#2a1a10'; c.lineWidth = 4; [by - 50, by - 12].forEach(y => { c.beginPath(); c.moveTo(x + 22, y); c.lineTo(x + 68, y); c.stroke(); });
    c.strokeStyle = '#2a1a10'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + w + 10, by - h + 40); c.lineTo(x + w + 60, by - h + 30); c.stroke();
    this.signBoard(c, x + w / 2, by - h - 40, 'DEMİRCİ');
    drawWeapon(c, ITEM.w6, x + w + 34, by - h + 60, -1.57);
  },
  bArmor(c) {
    const x = 1990, by = 780, w = 330, h = 280;
    this.house(c, x, by, w, h, -1, 70, '#d9c7a5', '#3d5a6b');
    c.strokeStyle = '#4a2e1a'; c.lineWidth = 9;
    [[x, by - h + 6, x + w, by - h + 6], [x, by - 150, x + w, by - 150], [x + 6, by - h, x + 6, by], [x + w - 6, by - h, x + w - 6, by], [x + 165, by - h, x + 165, by - 150]].forEach(l => { c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]); c.stroke(); });
    c.lineWidth = 6; c.beginPath(); c.moveTo(x + 6, by - h); c.lineTo(x + 165, by - 150); c.moveTo(x + 165, by - h); c.lineTo(x + w - 6, by - 150); c.stroke();
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#e8dcc4' : '#9c2b1f';
      c.beginPath(); c.moveTo(x + 10 + i * 39, by - 150); c.lineTo(x + 49 + i * 39, by - 150); c.lineTo(x + 54 + i * 39, by - 112); c.quadraticCurveTo(x + 32 + i * 39, by - 100, x + 10 + i * 39, by - 112); c.closePath(); c.fill();
    }
    c.fillStyle = '#2a1a12'; c.fillRect(x + 40, by - 100, 110, 80); c.fillRect(x + 200, by - 110, 80, 110);
    drawItemAt(c, ITEM.h3, x + 70, by - 62, 60); drawItemAt(c, ITEM.c3, x + 122, by - 56, 70);
    drawShield(c, ITEM.s4, x + 60, by - 205, 0); drawShield(c, ITEM.s2, x + 270, by - 205, 0);
    drawItemAt(c, ITEM.h5, x + 165, by - 215, 70);
    this.signBoard(c, x + w / 2, by - h - 40, 'ZIRHÇI');
  },
  bBarracks(c) {
    const x = 880, by = 640, w = 210, h = 150;
    this.house(c, x, by, w, h, 1, 40, '#a8876a', '#5a4030');
    c.fillStyle = '#1a0d08'; c.fillRect(x + 80, by - 90, 50, 90);
    c.strokeStyle = '#5a3a20'; c.lineWidth = 5;
    for (let i = 0; i < 9; i++) { const fx = x - 50 + i * 32; if (Math.abs(fx - 985) < 40) continue; c.beginPath(); c.moveTo(fx, by + 50); c.lineTo(fx, by + 18); c.stroke(); }
    c.beginPath(); c.moveTo(x - 54, by + 26); c.lineTo(x + 60, by + 26); c.moveTo(x + 150, by + 26); c.lineTo(x + 210, by + 26); c.stroke();
    this.dummy(c, x + 240, by + 40, .8);
    this.signBoard(c, x + w / 2, by - h - 26, 'KIŞLA');
  },
  bTavern(c) {
    const x = 1560, by = 780, w = 340, h = 300;
    this.house(c, x, by, w, h, -1, 70, '#e0cfae', '#7a3b26');
    // taş zemin kat
    c.fillStyle = '#8b7a6a'; c.fillRect(x, by - 130, w, 130);
    c.strokeStyle = 'rgba(40,25,15,.35)'; c.lineWidth = 1.5;
    for (let r = 0; r < 5; r++) { const y = by - 130 + r * 26; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.stroke(); }
    // ahşap kirişler (üst kat)
    c.strokeStyle = '#4a2e1a'; c.lineWidth = 8;
    [[x, by - h + 5], [x, by - 134]].forEach(([a, y]) => { c.beginPath(); c.moveTo(a, y); c.lineTo(a + w, y); c.stroke(); });
    for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(x + 4 + i * (w - 8) / 4, by - h); c.lineTo(x + 4 + i * (w - 8) / 4, by - 134); c.stroke(); }
    this.window(c, x + 30, by - 250, 50, 60); this.window(c, x + 145, by - 250, 50, 60); this.window(c, x + 260, by - 250, 50, 60);
    // balkon
    c.fillStyle = '#5a3a20'; c.fillRect(x - 10, by - 150, w + 20, 14);
    c.strokeStyle = '#5a3a20'; c.lineWidth = 4; for (let i = 0; i < 18; i++) { c.beginPath(); c.moveTo(x - 6 + i * 20, by - 150); c.lineTo(x - 6 + i * 20, by - 182); c.stroke(); }
    c.beginPath(); c.moveTo(x - 10, by - 182); c.lineTo(x + w + 10, by - 182); c.stroke();
    // kapı ve pencereler
    this.archDoor(c, x + 140, by, 80, 115, '#2a160c', '#5a3a20');
    this.window(c, x + 34, by - 95, 64, 50); this.window(c, x + 250, by - 95, 64, 50);
    // baca
    c.fillStyle = '#6e5a4a'; c.fillRect(x + 50, by - h - 120, 40, 90); c.fillStyle = '#4e3e32'; c.fillRect(x + 44, by - h - 128, 52, 12);
    // asma tabela: bira kupası
    c.strokeStyle = '#2a1a10'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 6, by - 210); c.lineTo(x - 60, by - 218); c.stroke();
    c.fillStyle = '#6b4325'; c.beginPath(); c.roundRect(x - 78, by - 210, 56, 60, 6); c.fill(); c.strokeStyle = '#2a1a10'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#e2b25a'; c.fillRect(x - 64, by - 196, 24, 34); c.fillStyle = '#fff4dc'; c.beginPath(); c.ellipse(x - 52, by - 197, 14, 6, 0, 0, 6.28); c.fill();
    c.strokeStyle = '#e2b25a'; c.lineWidth = 4; c.beginPath(); c.arc(x - 38, by - 180, 8, -1.4, 1.4); c.stroke();
    // dış masa
    c.fillStyle = '#6b4325'; c.fillRect(x - 120, by + 8, 110, 12); c.fillRect(x - 112, by + 20, 8, 30); c.fillRect(x - 24, by + 20, 8, 30);
    c.fillStyle = '#5a3a20'; c.fillRect(x - 140, by + 34, 150, 8);
    [[x - 95, by + 2], [x - 50, by + 2]].forEach(([mx, my]) => { c.fillStyle = '#c99a4e'; c.fillRect(mx, my - 14, 14, 16); c.fillStyle = '#fff4dc'; c.fillRect(mx - 1, my - 17, 16, 4); });
    c.fillStyle = '#6b4325'; c.fillRect(x + w + 10, by - 56, 44, 56);
    this.signBoard(c, x + w / 2, by - h - 40, 'HAN');
  },
  dummy(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.strokeStyle = '#4a2e1a'; c.lineWidth = 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -150); c.moveTo(-40, -100); c.lineTo(40, -100); c.stroke();
    c.fillStyle = '#c9a75e'; c.beginPath(); c.ellipse(0, -95, 26, 40, 0, 0, 6.28); c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#d9b97a'; c.beginPath(); c.arc(0, -150, 18, 0, 6.28); c.fill(); c.stroke();
    c.strokeStyle = '#8c1f17'; c.lineWidth = 4; c.beginPath(); c.arc(0, -95, 12, 0, 6.28); c.stroke();
    c.restore();
  },
  drawStall(c, x, y) {
    c.fillStyle = 'rgba(30,15,10,.3)'; c.beginPath(); c.ellipse(x, y + 6, 100, 16, 0, 0, 6.28); c.fill();
    c.strokeStyle = '#4a2e1a'; c.lineWidth = 7; c.beginPath(); c.moveTo(x - 80, y); c.lineTo(x - 80, y - 120); c.moveTo(x + 80, y); c.lineTo(x + 80, y - 120); c.stroke();
    for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#e8dcc4' : '#2f5d8a'; c.beginPath(); c.moveTo(x - 92 + i * 31, y - 150); c.lineTo(x - 61 + i * 31, y - 150); c.lineTo(x - 58 + i * 31, y - 112); c.quadraticCurveTo(x - 76 + i * 31, y - 102, x - 95 + i * 31, y - 112); c.fill(); }
    c.fillStyle = '#6b4325'; c.fillRect(x - 85, y - 50, 170, 50); c.fillStyle = '#8a5a30'; c.fillRect(x - 90, y - 56, 180, 10);
    const fruit = ['#c9302c', '#e8a33a', '#7aa03a', '#8c3a6b'];
    for (let i = 0; i < 22; i++) { c.fillStyle = fruit[i % 4]; c.beginPath(); c.arc(x - 76 + (i % 11) * 15, y - 62 - Math.floor(i / 11) * 9, 7, 0, 6.28); c.fill(); }
  },
  drawFountain(c, x, y) {
    c.fillStyle = 'rgba(30,15,10,.3)'; c.beginPath(); c.ellipse(x - 20, y + 20, 170, 34, 0, 0, 6.28); c.fill();
    const g = c.createLinearGradient(x - 160, 0, x + 160, 0); g.addColorStop(0, '#9a8064'); g.addColorStop(.35, '#e0c8a2'); g.addColorStop(1, '#6e5642');
    c.fillStyle = g; c.beginPath(); c.ellipse(x, y, 160, 40, 0, 0, Math.PI); c.lineTo(x - 160, y - 30); c.ellipse(x, y - 30, 160, 40, 0, Math.PI, 0, true); c.closePath(); c.fill();
    c.fillStyle = '#2f5d6b'; c.beginPath(); c.ellipse(x, y - 30, 145, 32, 0, 0, 6.28); c.fill();
    c.fillStyle = '#c9b08a'; c.fillRect(x - 14, y - 150, 28, 120);
    c.beginPath(); c.ellipse(x, y - 150, 50, 12, 0, 0, 6.28); c.fill();
    c.fillStyle = '#b89e7c'; c.beginPath(); c.ellipse(x, y - 200, 16, 40, 0, 0, 6.28); c.fill(); c.beginPath(); c.arc(x, y - 250, 13, 0, 6.28); c.fill();
    c.strokeStyle = '#b89e7c'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + 10, y - 225); c.lineTo(x + 34, y - 262); c.stroke();
    c.strokeStyle = '#d8c4a4'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 34, y - 262); c.lineTo(x + 44, y - 316); c.stroke();
  },
  drawColosseum(c, cx, by, w, h) {
    const R = w / 2, tiers = 3, th = h / tiers;
    c.fillStyle = 'rgba(30,15,10,.35)'; c.beginPath(); c.ellipse(cx - 30, by + 6, R + 40, 22, 0, 0, 6.28); c.fill();
    for (let t = 0; t < tiers; t++) {
      const y1 = by - t * th, y0 = y1 - th, r = R * (1 - t * .04);
      const g = c.createLinearGradient(cx - r, 0, cx + r, 0);
      g.addColorStop(0, '#8a6448'); g.addColorStop(.25, '#e3c08f'); g.addColorStop(.55, '#c9a273'); g.addColorStop(1, '#5e4030');
      c.fillStyle = g; c.fillRect(cx - r, y0, r * 2, th);
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(cx - r, y1 - 6, r * 2, 6);
      c.fillStyle = 'rgba(255,240,210,.35)'; c.fillRect(cx - r, y0, r * 2, 3);
      for (let i = 0; i < 16; i++) {
        const a = -Math.PI / 2 + (i + .5) / 16 * Math.PI, ax = cx + Math.sin(a) * r, aw = 14 * Math.cos(a) * (1 - t * .1) + 1, ah = th * .62;
        if (aw < 2) continue;
        c.fillStyle = t === 0 ? '#2a170f' : '#3a2418';
        c.beginPath(); c.moveTo(ax - aw, y1 - 8); c.lineTo(ax - aw, y1 - 8 - ah + aw); c.quadraticCurveTo(ax, y1 - 8 - ah - aw * .3, ax + aw, y1 - 8 - ah + aw); c.lineTo(ax + aw, y1 - 8); c.closePath(); c.fill();
      }
    }
    const top = by - h;
    c.fillStyle = '#b8936a'; c.fillRect(cx - R * .9, top - 14, R * 1.8, 14);
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i + .5) / 9 * Math.PI, x = cx + Math.sin(a) * R * .88; c.strokeStyle = '#3b2414'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, top - 14); c.lineTo(x, top - 54); c.stroke(); }
    c.fillStyle = '#1a0d08'; c.beginPath(); c.moveTo(cx - 40, by); c.lineTo(cx - 40, by - 70); c.arc(cx, by - 70, 40, Math.PI, 0); c.lineTo(cx + 40, by); c.closePath(); c.fill();
    c.strokeStyle = '#e3c08f'; c.lineWidth = 5; c.stroke();
    this.signBoard(c, cx, top - 74, 'ARENA');
  },

  /* ================= CANLI KATMAN ================= */
  drawTownLive(t) {
    const c = this.c;
    for (const cl of this.clouds) {
      cl.x += cl.v; if (cl.x > TW + 200) cl.x = -300;
      c.fillStyle = 'rgba(255,200,170,.18)';
      for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(cl.x + i * 50 * cl.s, cl.y + Math.sin(i) * 8, 70 * cl.s, 22 * cl.s, 0, 0, 6.28); c.fill(); }
    }
    // kuşlar
    c.strokeStyle = 'rgba(40,20,25,.8)'; c.lineWidth = 2.5;
    for (const b of this.birds) {
      b.x += b.v; if (b.x > TW + 50) { b.x = -50; b.y = rnd(90, 260); }
      const f = Math.sin(t * 9 + b.ph) * 7, yy = b.y + Math.sin(t + b.ph) * 10;
      c.beginPath(); c.moveTo(b.x - 12, yy - f); c.quadraticCurveTo(b.x - 5, yy - 3, b.x, yy); c.quadraticCurveTo(b.x + 5, yy - 3, b.x + 12, yy - f); c.stroke();
    }
    // arena bayrakları
    const top = 545 - 270;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i + .5) / 9 * Math.PI, x = 1300 + Math.sin(a) * 215 * .88, w1 = Math.sin(t * 4 + i) * 5;
      c.fillStyle = i % 2 ? '#e2b25a' : '#9c2b1f';
      c.beginPath(); c.moveTo(x, top - 54); c.quadraticCurveTo(x + 14, top - 52 + w1, x + 30, top - 46 + w1 * 1.4); c.quadraticCurveTo(x + 14, top - 40 + w1, x, top - 36); c.fill();
    }
    // bacalardan duman
    [[742, 342], [1630, 352]].forEach(([sx, sy], j) => {
      for (let i = 0; i < 8; i++) {
        const k = ((t * .22 + i / 8 + j * .3) % 1);
        c.fillStyle = `rgba(120,110,105,${.32 * (1 - k)})`;
        c.beginPath(); c.arc(sx + Math.sin(k * 5 + i) * 18 + k * 60, sy - k * 220, 14 + k * 38, 0, 6.28); c.fill();
      }
    });
    // ışıklar (gündüz sönük)
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = [.15, .08, 1, 1][G ? G.time : 2];
    const fl = .75 + Math.sin(t * 13) * .1 + Math.sin(t * 7.3) * .08;
    let g = c.createRadialGradient(635, 720, 10, 635, 720, 170);
    g.addColorStop(0, `rgba(255,170,70,${.8 * fl})`); g.addColorStop(1, 'rgba(255,110,30,0)');
    c.fillStyle = g; c.fillRect(465, 550, 340, 330);
    [[1620, 550], [1735, 550], [1850, 550], [1626, 710], [1842, 710], [2290, 725], [2140, 725], [975, 600], [125, 645], [305, 645]].forEach(([x, y], i) => {
      g = c.createRadialGradient(x, y, 4, x, y, 80); g.addColorStop(0, `rgba(255,190,100,${.32 + Math.sin(t * 5 + i) * .05})`); g.addColorStop(1, 'rgba(255,150,60,0)');
      c.fillStyle = g; c.fillRect(x - 80, y - 80, 160, 160);
    });
    // çeşme fıskiyesi
    for (let i = 0; i < 14; i++) { const a = t * .7 + i * .45; c.fillStyle = `rgba(200,240,255,${.25 + Math.sin(t * 4 + i) * .2})`; c.fillRect(1300 + Math.cos(a) * 120, 770 + Math.sin(a) * 24, 4, 2); }
    for (let j = -1; j <= 1; j += 2) for (let i = 0; i < 10; i++) {
      const k = ((t * 1.2 + i / 10) % 1), px = 1300 + j * k * 60, py = 650 - Math.sin(k * Math.PI) * 30 + k * 120;
      c.fillStyle = `rgba(200,240,255,${.6 * (1 - k)})`; c.fillRect(px, py, 3, 3);
    }
    c.restore();
    // pazar satıcısı
    drawFighter(c, { look: { skin: '#d9a273', hair: '#4a2c17', cape: '#2f5d8a', beard: true, hairStyle: 2, apron: '#8a6a3a' }, equip: { weapon: { kind: 'none', tier: 0 }, helm: null, chest: null, shield: null } }, 1040, 770, .32, -1, 'idle', 0, t);
    // yürüyen halk + at arabası (derinliğe göre sıralı)
    this.updateWalkers();
    const actors = [...this.walkers.map(w => ({ y: w.y, w })), { y: 872, cart: true }].sort((a, b) => a.y - b.y);
    for (const a of actors) {
      if (a.cart) { this.drawCart(c, t); continue; }
      const w = a.w, s = this.depth(w.y), dir = (w.mode === 'visit' && w.phase === 2) ? (w.tx > w.x ? 1 : -1) : (w.v > 0 ? 1 : -1);
      const fake = { look: w.look, equip: { weapon: { kind: 'none', tier: 0 }, helm: null, chest: 'c1', shield: null } };
      c.save(); c.globalAlpha = w.a ?? 1;
      drawFighter(c, fake, w.x, w.y, s, dir, 'walk', 0, t * .6 + w.ph);
      c.restore();
    }
    this.timeOverlay(c, t);
    // binalar: vurgu + etiket
    for (const [id, P] of Object.entries(PLACES)) {
      const [x, y, w, h] = P.rect, hov = this.hover === id;
      this.hits.push({ id, place: id, x, y, w, h });
      if (hov) {
        c.save(); c.globalCompositeOperation = 'lighter';
        const hg = c.createRadialGradient(x + w / 2, y + h / 2, 10, x + w / 2, y + h / 2, Math.max(w, h) * .7);
        hg.addColorStop(0, 'rgba(255,210,120,.22)'); hg.addColorStop(1, 'rgba(255,210,120,0)');
        c.fillStyle = hg; c.fillRect(x - 40, y - 40, w + 80, h + 80); c.restore();
        this.tag(c, P.tag[0], P.tag[1] + Math.sin(t * 2.5) * 4 - 8, P.name, P.sub, true);
      }
    }
  },
  updateWalkers() {
    for (const w of this.walkers) {
      if (w.mode === 'visit') {
        if (!w.phase) { // yolda kapı hizasına yürü
          w.v = Math.abs(w.v) * (w.tx > w.x ? 1 : -1); w.x += w.v;
          if (Math.abs(w.x - w.tx) < 2) { w.phase = 2; w.y0 = w.y; }
        } else { // yoldan kapıya
          w.y -= .7; w.x += (w.tx - w.x) * .02;
          const k = (w.y0 - w.y) / Math.max(1, w.y0 - w.ty);
          w.a = k > .8 ? Math.max(0, 1 - (k - .8) * 5) : 1;
          if (w.y <= w.ty + 4) Object.assign(w, this.newWalker(), { phase: 0, a: 1 });
        }
      } else {
        w.x += w.v;
        if (w.mode === 'plaza' && (w.x < 1060 || w.x > 1500)) w.v *= -1;
        if (w.x < -60 || w.x > TW + 60) Object.assign(w, this.newWalker(), { phase: 0, a: 1 });
      }
    }
  },
  drawCart(c, t) {
    const ct = this.cart;
    if (ct.wait > 0) { ct.wait--; return; }
    ct.x += ct.dir * 1.6;
    if (ct.x > TW + 300 || ct.x < -300) { ct.dir *= -1; ct.wait = 900; return; }
    const y = 876, s = .62;
    c.save(); c.translate(ct.x, y); c.scale(ct.dir * s, s);
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(-40, 4, 170, 14, 0, 0, 6.28); c.fill();
    // at
    const leg = Math.sin(t * 10);
    c.strokeStyle = '#4a2a18'; c.lineWidth = 9; c.lineCap = 'round';
    [[60, leg], [80, -leg], [130, -leg], [150, leg]].forEach(([lx, ph]) => { c.beginPath(); c.moveTo(lx, -60); c.lineTo(lx + ph * 10, 0); c.stroke(); });
    c.fillStyle = '#6b3a20'; c.beginPath(); c.ellipse(105, -72, 55, 24, 0, 0, 6.28); c.fill();
    c.beginPath(); c.moveTo(145, -85); c.lineTo(175, -125); c.lineTo(192, -118); c.lineTo(165, -72); c.fill();
    c.beginPath(); c.ellipse(190, -116, 20, 11, .4, 0, 6.28); c.fill();
    c.fillStyle = '#2a170d'; c.beginPath(); c.moveTo(150, -95); c.lineTo(172, -128); c.lineTo(160, -88); c.fill();
    c.strokeStyle = '#2a170d'; c.lineWidth = 4; c.beginPath(); c.moveTo(52, -78); c.quadraticCurveTo(38, -60 + leg * 4, 44, -40); c.stroke();
    // araba
    c.strokeStyle = '#3b2414'; c.lineWidth = 5; c.beginPath(); c.moveTo(30, -60); c.lineTo(70, -66); c.stroke();
    c.fillStyle = '#7a4b2a'; c.fillRect(-170, -100, 200, 55); c.strokeStyle = '#3b2414'; c.lineWidth = 3; c.strokeRect(-170, -100, 200, 55);
    [['#6b4325', -150], ['#8a5a30', -110], ['#6b4325', -70]].forEach(([col, bx]) => { c.fillStyle = col; c.fillRect(bx, -140, 36, 42); c.strokeStyle = '#2a1a10'; c.lineWidth = 3; c.strokeRect(bx, -140, 36, 42); });
    c.fillStyle = '#d8c29a'; c.beginPath(); c.ellipse(-20, -112, 26, 16, 0, 0, 6.28); c.fill();
    [-130, -10].forEach(wx => {
      c.fillStyle = '#4a2e1a'; c.beginPath(); c.arc(wx, -28, 28, 0, 6.28); c.fill();
      c.strokeStyle = '#2a170d'; c.lineWidth = 4; c.stroke();
      c.strokeStyle = '#8a5a30'; c.lineWidth = 3;
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + ct.x / 28 * ct.dir; c.beginPath(); c.moveTo(wx, -28); c.lineTo(wx + Math.cos(a) * 24, -28 + Math.sin(a) * 24); c.stroke(); }
    });
    c.restore();
    // sürücü
    drawFighter(c, { look: { skin: '#b97a4e', hair: '#d9d2c5', cape: '#3d6b45', beard: true, hairStyle: 0 }, equip: { weapon: { kind: 'none', tier: 0 }, helm: null, chest: 'c1', shield: null } },
      ct.x + ct.dir * 10 * s, y - 70 * s, .3, ct.dir, 'rest', .5, t);
  },
  tag(c, x, y, name, sub, hot) {
    c.save();
    c.font = `800 ${hot ? 30 : 24}px Cinzel, Georgia, serif`;
    const w = Math.max(c.measureText(name).width, sub ? 220 : 0) + 40, h = sub ? 70 : 46;
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 20; c.shadowOffsetY = 6;
    c.fillStyle = 'rgba(46,30,20,.95)';
    c.beginPath(); c.roundRect(x - w / 2, y - h, w, h, 14); c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = '#f6d58f'; c.lineWidth = 3; c.stroke();
    c.beginPath(); c.moveTo(x - 10, y); c.lineTo(x, y + 12); c.lineTo(x + 10, y); c.fillStyle = '#f6d58f'; c.fill();
    c.textAlign = 'center'; c.fillStyle = '#f6d58f'; c.fillText(name, x, y - (sub ? 34 : 14));
    if (sub) { c.font = '600 17px Manrope, sans-serif'; c.fillStyle = '#d9c7a5'; c.fillText(sub, x, y - 12); }
    c.restore();
  },
  /* Gün döngüsü katmanı: sabah/öğle aydınlık gökyüzü, gece karanlık + ay + yıldız + ışıklar */
  timeOverlay(c, t) {
    const tm = G ? G.time : 2, Y0 = this.vy0;
    if (tm === 0 || tm === 1) {
      const g = c.createLinearGradient(0, Y0, 0, 540);
      if (tm === 0) { g.addColorStop(0, 'rgba(120,170,230,.55)'); g.addColorStop(1, 'rgba(255,225,190,.25)'); }
      else { g.addColorStop(0, 'rgba(70,140,230,.75)'); g.addColorStop(1, 'rgba(190,225,255,.45)'); }
      c.fillStyle = g; c.fillRect(0, Y0, TW, 540 - Y0);
      c.fillStyle = tm === 1 ? 'rgba(255,250,235,.10)' : 'rgba(255,235,210,.06)'; c.fillRect(0, 540, TW, this.vy1 - 540);
      return;
    }
    if (tm !== 3) { if (this.lamps) { c.save(); c.globalCompositeOperation = 'lighter'; this.lamps.forEach(([x, y]) => { const g = c.createRadialGradient(x, y, 2, x, y, 60); g.addColorStop(0, 'rgba(255,190,100,.35)'); g.addColorStop(1, 'rgba(255,150,60,0)'); c.fillStyle = g; c.fillRect(x - 60, y - 60, 120, 120); }); c.restore(); } return; }
    // gece
    c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = 'rgb(70,80,140)'; c.fillRect(0, Y0, TW, this.vy1 - Y0); c.restore();
    c.fillStyle = 'rgba(4,6,20,.45)'; c.fillRect(0, Y0, TW, 520 - Y0);
    if (!this.stars) this.stars = Array.from({ length: 160 }, () => [Math.random() * TW, Y0 + Math.random() * (440 - Y0), Math.random() * 6]);
    this.stars.forEach(([x, y, ph]) => { c.fillStyle = 'rgba(255,255,240,' + (.4 + Math.sin(t * 2 + ph) * .35).toFixed(2) + ')'; c.fillRect(x, y, 2, 2); });
    const mg = c.createRadialGradient(760, 150, 10, 760, 150, 140); mg.addColorStop(0, 'rgba(220,230,255,.35)'); mg.addColorStop(1, 'rgba(220,230,255,0)');
    c.fillStyle = mg; c.fillRect(620, 10, 280, 280);
    c.fillStyle = '#f2efe0'; c.beginPath(); c.arc(760, 150, 34, 0, 6.28); c.fill();
    c.fillStyle = 'rgba(180,180,170,.5)'; c.beginPath(); c.arc(750, 140, 7, 0, 6.28); c.arc(772, 162, 5, 0, 6.28); c.fill();
    c.save(); c.globalCompositeOperation = 'lighter';
    const fl = .85 + Math.sin(t * 9) * .1;
    const glow = (x, y, r, a) => { const g = c.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, 'rgba(255,185,95,' + (a * fl).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,140,50,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };
    [[635, 690, 200, .8], [1620, 550, 90, .6], [1735, 550, 90, .6], [1850, 550, 90, .6], [1626, 710, 90, .6], [1842, 710, 90, .6], [1730, 720, 100, .5], [2290, 725, 90, .5], [2140, 725, 90, .5], [975, 600, 80, .5], [125, 645, 80, .55], [305, 645, 80, .55], [205, 700, 80, .4], [1300, 520, 140, .35]].forEach(([x, y, r, a]) => glow(x, y, r, a));
    (this.lamps || []).forEach(([x, y]) => glow(x, y, 110, .75));
    c.restore();
  },
});