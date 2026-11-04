/* ========= DEMİR TAÇ — şehir meydanı ve iç mekânlar (2.5D) ========= */
const VW = 1600, VH = 900, TW = 2400; // iç mekân genişliği, yükseklik, şehir dünyası genişliği

const PLACES = {
  smith:    { name: 'Demirci', sub: 'Silahlar', rect: [40, 360, 380, 420], tag: [230, 330] },
  barracks: { name: 'Kışla', sub: 'Antrenman · Nitelikler', rect: [420, 440, 250, 260], tag: [545, 425] },
  arena:    { name: 'Arena', sub: 'Şampiyonluk Merdiveni', rect: [690, 250, 420, 300], tag: [900, 235] },
  armor:    { name: 'Zırhçı', sub: 'Miğfer · Zırh · Kalkan', rect: [1180, 360, 380, 420], tag: [1370, 330] },
};

const NPCS = {
  smith: { name: 'Usta Bertan', level: 1, stats: {}, look: { skin: '#b97a4e', hair: '#1d1410', cape: '#3b2414', beard: true, hairStyle: 0, apron: '#5a3a20' },
    equip: { weapon: { kind: 'hammer', tier: 2 }, helm: null, chest: null, shield: null },
    lines: ['Ocağım hiç sönmez. Ne arıyorsun?', 'Bu çelik kemiği de keser, kalkanı da.', 'Arenada sağ kalmak istiyorsan iyi bir kılıç şart.', 'Paran yetmiyorsa önce birkaç maç kazan.'],
    buy: ['İyi seçim! Kanla değil, terle dövüldü.', 'Bunu kullanırken beni hatırla.', 'Keskin tut, temiz tut.'] },
  armor: { name: 'Zırhçı Lena', level: 1, stats: {}, look: { skin: '#f2c9a0', hair: '#8c5a2b', cape: '#2f5d8a', beard: false, hairStyle: 1, apron: '#6b3b80' },
    equip: { weapon: { kind: 'none', tier: 0 }, helm: null, chest: null, shield: null },
    lines: ['Hoş geldin! Kafanı korumayı unutma.', 'Kalkan, iyi bir dosttan daha sadıktır.', 'Her darbe zırhına çarparsa, sana çarpmaz.', 'Rafları incele, beğendiğine tıkla.'],
    buy: ['Tam sana göre!', 'Bu zırhla seni yıkmak zor olacak.', 'Güle güle kullan, gladyatör.'] },
  barracks: { name: 'Eğitmen Kassa', level: 6, stats: {}, look: { skin: '#8a5532', hair: '#d9d2c5', cape: '#3d6b45', beard: true, hairStyle: 0 },
    equip: { weapon: 'w3', helm: 'h3', chest: 'c2', shield: null },
    lines: ['Kas, çeviklik, nefes. Hepsini çalış.', 'Puanlarını akıllıca dağıt, evlat.', 'Kalabalığı seven kazanır, kalabalığın sevdiği daha çok kazanır.'] },
  arena: { name: 'Arena Ustası', level: 1, stats: {}, look: { skin: '#d9a273', hair: '#4a2c17', cape: '#9c2b1f', beard: true, hairStyle: 2 },
    equip: { weapon: 'w2', helm: 'h2', chest: 'c1', shield: null },
    lines: ['Kalabalık kan istiyor! Sıradaki rakibin hazır.', 'Merdiveni çık, Demir Taç seni bekliyor.', 'Gösteri maçları altın ve tecrübe getirir.'] },
};

class TownView {
  constructor(canvas, cb) {
    this.cv = canvas; this.c = canvas.getContext('2d'); this.cb = cb;
    this.place = 'town'; this.hover = null; this.sel = null; this.hits = [];
    this.cache = document.createElement('canvas'); this.cacheFor = null;
    this.trans = null; this.speech = null; this.sparks = [];
    this.initWorld();
    canvas.addEventListener('pointerdown', e => { if (this.place === 'town') this.drag = { x: e.clientX, cam: this.camT, moved: false }; });
    window.addEventListener('pointerup', () => setTimeout(() => { this.drag = null; }, 0));
    canvas.addEventListener('pointermove', e => {
      if (this.drag && e.buttons) {
        const dx = e.clientX - this.drag.x;
        if (Math.abs(dx) > 6) this.drag.moved = true;
        if (this.drag.moved) { this.camT = this.drag.cam - dx / this.k; this.camX = this.camT; }
      }
      this.onMove(e);
    });
    canvas.addEventListener('click', e => { if (this.drag && this.drag.moved) return; this.onClick(e); });
    canvas.addEventListener('wheel', e => { if (this.place !== 'town') return; e.preventDefault(); this.camT += (e.deltaY + e.deltaX) / this.k * .6; }, { passive: false });
    canvas.addEventListener('pointerleave', () => { this.hover = null; this.cv.style.cursor = ''; });
    this.resize();
  }
  newWalker(x) {
    const y = rnd(640, 870);
    return { x: x ?? rnd(0, VW), y, v: rnd(.4, .9) * (Math.random() < .5 ? -1 : 1), look: randomLook(), ph: rnd(0, 6) };
  }
  resize() {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(300, r.width); this.H = Math.max(200, r.height); this.dpr = dpr;
    this.cv.width = this.W * dpr; this.cv.height = this.H * dpr;
    this.layout(); this.cacheFor = null;
  }
  layout() {
    if (this.place === 'town') {
      this.k = Math.max(this.H / VH, this.W / TW);
      this.viewW = this.W / this.k;
      if (this.camX == null) this.camX = this.camT = 1300 - this.viewW / 2;
      const max = TW - this.viewW;
      this.camT = clamp(this.camT, 0, max); this.camX = clamp(this.camX, 0, max);
      this.ox = -this.camX * this.k; this.oy = (this.H - VH * this.k) / 2;
      this.vx0 = 0; this.vx1 = TW;
    } else {
      this.k = Math.min(this.W / VW, this.H / VH);
      this.ox = (this.W - VW * this.k) / 2; this.oy = (this.H - VH * this.k) / 2;
      this.vx0 = -this.ox / this.k; this.vx1 = VW + this.ox / this.k;
    }
    this.vy0 = -this.oy / this.k; this.vy1 = (this.H - this.oy) / this.k;
  }
  pan(dir) { this.camT += dir * this.viewW * .45; }
  toV(e) { const r = this.cv.getBoundingClientRect(); return [(e.clientX - r.left - this.ox) / this.k, (e.clientY - r.top - this.oy) / this.k]; }
  hitAt(x, y) { for (let i = this.hits.length - 1; i >= 0; i--) { const h = this.hits[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h; } return null; }
  onMove(e) {
    const [x, y] = this.toV(e), h = this.hitAt(x, y);
    const id = h ? h.id : null;
    if (id !== this.hover && id) SFX.hover();
    this.hover = id; this.cv.style.cursor = h ? 'pointer' : '';
  }
  onClick(e) {
    const [x, y] = this.toV(e), h = this.hitAt(x, y);
    if (!h || this.trans) return;
    SFX.click();
    if (h.place) this.go(h.place);
    else if (h.item) { this.sel = h.item.id; this.cb.select(h.item); }
    else if (h.action && this.cb.action) this.cb.action(h.action);
  }
  go(place) {
    SFX.door();
    this.trans = { t0: performance.now(), to: place };
    setTimeout(() => {
      this.place = place; this.sel = null; this.hover = null; this.cacheFor = null; this.layout();
      const npc = NPCS[place];
      if (npc) this.say(pick(npc.lines));
      this.cb.enter(place);
    }, 260);
  }
  say(text) { this.speech = { text, t0: performance.now() }; }

  /* ---------- Çizim döngüsü ---------- */
  draw(t) {
    const c = this.c;
    const town = this.place === 'town';
    if (town) { this.camX += (this.camT - this.camX) * .15; this.layout(); }
    if (this.cacheFor !== this.place) this.buildCache();
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (town) { c.fillStyle = '#120c09'; c.fillRect(0, 0, this.cv.width, this.cv.height); c.drawImage(this.cache, Math.round(this.ox * this.dpr), 0); }
    else c.drawImage(this.cache, 0, 0);
    c.setTransform(this.dpr * this.k, 0, 0, this.dpr * this.k, this.dpr * this.ox, this.dpr * this.oy);
    this.hits = [];
    if (this.place === 'town') this.drawTownLive(t);
    else this.drawInteriorLive(t);
    // geçiş karartması
    if (this.trans) {
      const k = (performance.now() - this.trans.t0) / 520;
      if (k >= 1) this.trans = null;
      else { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = `rgba(10,6,4,${Math.sin(k * Math.PI)})`; c.fillRect(0, 0, this.cv.width, this.cv.height); }
    }
  }
  buildCache() {
    const town = this.place === 'town';
    this.cache.width = town ? Math.ceil(TW * this.k * this.dpr) : this.cv.width; this.cache.height = this.cv.height;
    const c = this.cache.getContext('2d');
    c.setTransform(this.dpr * this.k, 0, 0, this.dpr * this.k, town ? 0 : this.dpr * this.ox, this.dpr * this.oy);
    if (this['static_' + this.place]) this['static_' + this.place](c);
    else if (town) this.drawTownStatic(c);
    else if (this.place === 'smith') this.drawSmithStatic(c);
    else if (this.place === 'armor') this.drawArmorStatic(c);
    else if (this.place === 'barracks') this.drawYardStatic(c);
    else if (this.place === 'arena') this.drawGateStatic(c);
    this.cacheFor = this.place;
  }

  /* ================= İÇ MEKÂNLAR ================= */
  room(c, wallA, wallB, floorA, floorB, floorY = 640) {
    const X0 = this.vx0, X1 = this.vx1, Y0 = this.vy0, Y1 = this.vy1;
    let g = c.createLinearGradient(0, Y0, 0, floorY); g.addColorStop(0, wallA); g.addColorStop(1, wallB);
    c.fillStyle = g; c.fillRect(X0, Y0, X1 - X0, floorY - Y0);
    g = c.createLinearGradient(0, floorY, 0, Y1); g.addColorStop(0, floorA); g.addColorStop(1, floorB);
    c.fillStyle = g; c.fillRect(X0, floorY, X1 - X0, Y1 - floorY);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(X0, floorY, X1 - X0, 8);
    // zemin tahtaları (perspektif)
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 2;
    for (let i = -20; i <= 20; i++) { c.beginPath(); c.moveTo(800 + i * 60, floorY); c.lineTo(800 + i * 170, Y1); c.stroke(); }
    for (let i = 1; i < 8; i++) { const y = floorY + (Y1 - floorY) * Math.pow(i / 8, 1.6); c.beginPath(); c.moveTo(X0, y); c.lineTo(X1, y); c.stroke(); }
  }
  vignette(c) {
    const g = c.createRadialGradient(800, 450, 300, 800, 450, 1000);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)');
    c.fillStyle = g; c.fillRect(this.vx0, this.vy0, this.vx1 - this.vx0, this.vy1 - this.vy0);
  }
  drawSmithStatic(c) {
    this.room(c, '#2a201c', '#3e2f27', '#3a2a20', '#1d140f');
    // taş duvar
    c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 2;
    for (let r = 0; r < 24; r++) { const y = this.vy0 + r * 40; if (y > 640) break; c.beginPath(); c.moveTo(this.vx0, y); c.lineTo(this.vx1, y); c.stroke();
      for (let x = this.vx0 + (r % 2) * 45; x < this.vx1; x += 90) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 40); c.stroke(); } }
    // ocak
    c.fillStyle = '#4a3328'; c.fillRect(60, 360, 380, 330);
    c.fillStyle = '#2e1f17'; c.beginPath(); c.moveTo(40, 360); c.lineTo(460, 360); c.lineTo(380, 120); c.lineTo(140, 120); c.closePath(); c.fill();
    c.fillStyle = '#3a2a20'; c.fillRect(170, -100, 180, 222);
    c.fillStyle = '#120806'; c.beginPath(); c.roundRect(110, 470, 280, 170, 30); c.fill();
    // silah rafı (pano)
    const g = c.createLinearGradient(0, 160, 0, 640); g.addColorStop(0, '#6b4325'); g.addColorStop(1, '#4a2e1a');
    c.fillStyle = g; c.beginPath(); c.roundRect(800, 150, 760, 480, 12); c.fill();
    c.strokeStyle = '#2a1a10'; c.lineWidth = 6; c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2; for (let y = 190; y < 630; y += 40) { c.beginPath(); c.moveTo(806, y); c.lineTo(1554, y); c.stroke(); }
    // örs
    c.fillStyle = '#26262b';
    c.beginPath(); c.moveTo(560, 640); c.lineTo(720, 640); c.lineTo(760, 625); c.lineTo(700, 670); c.lineTo(600, 670); c.closePath(); c.fill();
    c.fillRect(620, 670, 50, 60); c.fillRect(590, 730, 110, 22);
    c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(565, 640, 150, 4);
    // su kovası ve aletler
    c.fillStyle = '#5a3a20'; c.fillRect(470, 700, 70, 60); c.fillStyle = '#2f5d6b'; c.fillRect(476, 700, 58, 10);
    this.vignette(c);
  }
  drawArmorStatic(c) {
    this.room(c, '#5a3d28', '#6e4b30', '#4a3020', '#24170f');
    // ahşap duvar tahtaları
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 3;
    for (let x = Math.floor(this.vx0 / 70) * 70; x < this.vx1; x += 70) { c.beginPath(); c.moveTo(x, this.vy0); c.lineTo(x, 640); c.stroke(); }
    // pencere + ışık huzmesi
    c.fillStyle = '#f2d39a'; c.fillRect(140, 150, 180, 150); c.strokeStyle = '#3b2414'; c.lineWidth = 10; c.strokeRect(140, 150, 180, 150);
    c.beginPath(); c.moveTo(230, 150); c.lineTo(230, 300); c.moveTo(140, 225); c.lineTo(320, 225); c.stroke();
    c.save(); c.globalCompositeOperation = 'lighter';
    const lg = c.createLinearGradient(140, 300, 400, 800); lg.addColorStop(0, 'rgba(255,220,150,.25)'); lg.addColorStop(1, 'rgba(255,220,150,0)');
    c.fillStyle = lg; c.beginPath(); c.moveTo(140, 300); c.lineTo(320, 300); c.lineTo(600, 860); c.lineTo(300, 860); c.closePath(); c.fill(); c.restore();
    // raflar
    [[300], [520]].forEach(([y]) => { c.fillStyle = '#3b2414'; c.fillRect(600, y, 960, 18); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(600, y + 18, 960, 8); });
    // tezgâh
    const g = c.createLinearGradient(0, 600, 0, 760); g.addColorStop(0, '#7a4b2a'); g.addColorStop(1, '#4a2e1a');
    c.fillStyle = g; c.fillRect(100, 640, 420, 130); c.fillStyle = '#9a6a40'; c.fillRect(90, 628, 440, 18);
    this.vignette(c);
  }
  drawYardStatic(c) {
    const X0 = this.vx0, X1 = this.vx1;
    let g = c.createLinearGradient(0, this.vy0, 0, 520); g.addColorStop(0, '#3b4a6b'); g.addColorStop(1, '#e8a868');
    c.fillStyle = g; c.fillRect(X0, this.vy0, X1 - X0, 520 - this.vy0);
    c.fillStyle = '#6e5038'; c.fillRect(X0, 380, X1 - X0, 140);
    c.strokeStyle = '#4a2e1a'; c.lineWidth = 12; for (let x = Math.floor(X0 / 46) * 46; x < X1; x += 46) { c.beginPath(); c.moveTo(x, 520); c.lineTo(x, 350 + (x % 3) * 6); c.stroke(); }
    g = c.createLinearGradient(0, 520, 0, this.vy1); g.addColorStop(0, '#c49562'); g.addColorStop(1, '#8a6440');
    c.fillStyle = g; c.fillRect(X0, 520, X1 - X0, this.vy1 - 520);
    for (let i = 0; i < 400; i++) { c.fillStyle = Math.random() < .5 ? 'rgba(90,55,25,.18)' : 'rgba(255,240,210,.15)'; c.fillRect(rnd(X0, X1), rnd(525, this.vy1), 3, 2); }
    this.dummy(c, 1300, 760, 1.5); this.dummy(c, 1480, 700, 1.1);
    // silah askısı
    c.strokeStyle = '#4a2e1a'; c.lineWidth = 10; c.beginPath(); c.moveTo(120, 700); c.lineTo(120, 520); c.moveTo(340, 700); c.lineTo(340, 520); c.moveTo(110, 560); c.lineTo(350, 560); c.stroke();
    drawWeapon(c, ITEM.w2, 160, 680, -1.4); drawWeapon(c, ITEM.w3, 220, 640, -1.5); drawWeapon(c, ITEM.w1, 290, 620, -1.5);
    this.vignette(c);
  }
  drawGateStatic(c) {
    const X0 = this.vx0, X1 = this.vx1, Y0 = this.vy0, Y1 = this.vy1;
    // tünel içi
    c.fillStyle = '#1c120d'; c.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    // açıklıktan görünen parlak arena
    c.save(); c.beginPath(); c.moveTo(380, 760); c.lineTo(380, 300); c.arc(800, 300, 420, Math.PI, 0); c.lineTo(1220, 760); c.closePath(); c.clip();
    let g = c.createLinearGradient(0, -120, 0, 760); g.addColorStop(0, '#f2b062'); g.addColorStop(.5, '#e8c89a'); g.addColorStop(1, '#d4ab76');
    c.fillStyle = g; c.fillRect(380, -120, 840, 880);
    c.fillStyle = '#8a6448'; c.fillRect(380, 280, 840, 200);
    for (let r = 0; r < 5; r++) for (let x = 380; x < 1220; x += 10) { c.fillStyle = pick(['#9c2b1f', '#2f5d8a', '#c08a2e', '#e8dcc4', '#3d6b45']); c.fillRect(x + rnd(-2, 2), 300 + r * 34, 6, 10); c.fillStyle = pick(SKINS); c.fillRect(x + rnd(-2, 2) + 1, 292 + r * 34, 4, 5); }
    c.fillStyle = '#5c4232'; c.fillRect(380, 470, 840, 50);
    g = c.createLinearGradient(0, 520, 0, 760); g.addColorStop(0, '#d4ab76'); g.addColorStop(1, '#f0d4a4');
    c.fillStyle = g; c.fillRect(380, 520, 840, 240);
    c.restore();
    // kemer taşları
    c.strokeStyle = '#4a3424'; c.lineWidth = 40; c.beginPath(); c.moveTo(380, 780); c.lineTo(380, 300); c.arc(800, 300, 420, Math.PI, 0); c.lineTo(1220, 780); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 3;
    for (let i = 0; i <= 12; i++) { const a = Math.PI + i / 12 * Math.PI; c.beginPath(); c.moveTo(800 + Math.cos(a) * 400, 300 + Math.sin(a) * 400); c.lineTo(800 + Math.cos(a) * 440, 300 + Math.sin(a) * 440); c.stroke(); }
    // parmaklık (kalkık)
    c.strokeStyle = '#2b2b30'; c.lineWidth = 8; for (let x = 420; x < 1200; x += 50) { c.beginPath(); c.moveTo(x, -100); c.lineTo(x, 60); c.stroke(); }
    // zemin
    g = c.createLinearGradient(0, 760, 0, Y1); g.addColorStop(0, '#5a4030'); g.addColorStop(1, '#21150e');
    c.fillStyle = g; c.fillRect(X0, 760, X1 - X0, Y1 - 760);
    // ışık dökülmesi
    c.save(); c.globalCompositeOperation = 'lighter';
    g = c.createLinearGradient(0, 760, 0, Y1); g.addColorStop(0, 'rgba(255,210,150,.35)'); g.addColorStop(1, 'rgba(255,210,150,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(380, 760); c.lineTo(1220, 760); c.lineTo(1500, Y1); c.lineTo(100, Y1); c.closePath(); c.fill(); c.restore();
    this.vignette(c);
  }

  /* Raf yuvası: eşya + durum etiketi + seçim/hover */
  itemSlot(c, it, x, y, size, t) {
    const p = G.player, owned = G.owned.includes(it.id), eq = p.equip[it.slot] === it.id, locked = p.level < it.req;
    const hov = this.hover === it.id, sel = this.sel === it.id;
    this.hits.push({ id: it.id, item: it, x: x - size / 2, y: y - size / 2, w: size, h: size + 30 });
    const lift = hov ? -6 : 0;
    if (hov || sel) {
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(x, y, 4, x, y, size * .7); g.addColorStop(0, sel ? 'rgba(255,210,120,.45)' : 'rgba(255,210,120,.25)'); g.addColorStop(1, 'rgba(255,210,120,0)');
      c.fillStyle = g; c.fillRect(x - size, y - size, size * 2, size * 2); c.restore();
    }
    c.save(); if (locked) c.globalAlpha = .4;
    drawItemAt(c, it, x, y + lift, size * .9);
    c.restore();
    if (sel) { c.strokeStyle = '#f6d58f'; c.lineWidth = 3; c.setLineDash([8, 6]); c.lineDashOffset = -t * 20; c.beginPath(); c.roundRect(x - size / 2, y - size / 2, size, size, 14); c.stroke(); c.setLineDash([]); }
    // etiket
    const label = eq ? 'Kuşanıldı' : owned ? 'Sende' : locked ? `Seviye ${it.req}` : `${it.price} altın`;
    const col = eq ? '#f6d58f' : owned ? '#8fd0c7' : locked ? '#e59a8c' : '#f1e6d6';
    c.font = '700 17px Manrope, sans-serif'; const w = c.measureText(label).width + 22;
    c.fillStyle = 'rgba(20,12,8,.85)'; c.beginPath(); c.roundRect(x - w / 2, y + size / 2 - 4, w, 28, 8); c.fill();
    c.strokeStyle = eq ? '#f6d58f' : 'rgba(226,178,90,.35)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = col; c.textAlign = 'center'; c.fillText(label, x, y + size / 2 + 15);
  }

  drawNPC(c, place, x, y, s, anim, p, t, dir = 1) {
    const npc = NPCS[place];
    const tip = drawFighter(c, npc, x, y, s, dir, anim, p, t);
    // konuşma balonu
    if (this.speech) {
      const age = (performance.now() - this.speech.t0) / 1000;
      if (age > 5) this.speech = null;
      else {
        c.save(); c.globalAlpha = Math.min(1, age * 4, (5 - age) * 2);
        c.font = '600 20px Manrope, sans-serif';
        const words = this.speech.text.split(' '), lines = []; let cur = '';
        for (const w of words) { if (c.measureText(cur + ' ' + w).width > 300 && cur) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
        lines.push(cur);
        const bw = 340, bh = lines.length * 26 + 50, bx = x - 40, by = y - 220 * s - bh;
        c.fillStyle = 'rgba(250,240,220,.96)'; c.beginPath(); c.roundRect(bx, by, bw, bh, 16); c.fill();
        c.beginPath(); c.moveTo(bx + 50, by + bh); c.lineTo(bx + 40, by + bh + 22); c.lineTo(bx + 80, by + bh); c.fill();
        c.fillStyle = '#8a5a22'; c.font = '800 15px Manrope, sans-serif'; c.textAlign = 'left'; c.fillText(npc.name.toUpperCase(), bx + 18, by + 26);
        c.fillStyle = '#2a1a10'; c.font = '600 20px Manrope, sans-serif';
        lines.forEach((l, i) => c.fillText(l, bx + 18, by + 54 + i * 26));
        c.restore();
      }
    }
    return tip;
  }

  drawInteriorLive(t) {
    const c = this.c;
    if (this['live_' + this.place]) return this['live_' + this.place](t);
    if (this.place === 'smith') {
      // ocak ateşi
      const fl = .8 + Math.sin(t * 12) * .1 + Math.sin(t * 5.3) * .08;
      c.save(); c.globalCompositeOperation = 'lighter';
      let g = c.createRadialGradient(250, 580, 20, 250, 580, 520); g.addColorStop(0, `rgba(255,150,50,${.55 * fl})`); g.addColorStop(1, 'rgba(255,90,20,0)');
      c.fillStyle = g; c.fillRect(-300, 50, 1200, 900);
      for (let i = 0; i < 9; i++) {
        const fx = 140 + i * 28, h = 60 + Math.sin(t * 9 + i * 1.7) * 25 + Math.sin(t * 15 + i) * 10;
        c.fillStyle = i % 2 ? 'rgba(255,190,80,.8)' : 'rgba(255,110,40,.7)';
        c.beginPath(); c.moveTo(fx - 18, 630); c.quadraticCurveTo(fx + Math.sin(t * 8 + i) * 8, 630 - h * 2, fx + 18, 630); c.fill();
      }
      c.restore();
      // çekiç döngüsü + kıvılcım
      const cyc = (t % 1.4) / 1.4, p = Math.min(1, cyc / .7);
      if (cyc > .3 && !this.struck) { this.struck = true; SFX.anvil(); for (let i = 0; i < 14; i++) this.sparks.push({ x: 600, y: 636, vx: rnd(-6, 6), vy: rnd(-9, -2), life: 0 }); }
      if (cyc < .3) this.struck = false;
      this.drawNPC(c, 'smith', 440, 770, 1.55, 'attack', p, t);
      this.updateSparks(c);
      ITEMS.filter(i => i.slot === 'weapon' && i.price > 0).forEach((it, i) => this.itemSlot(c, it, 900 + (i % 4) * 185, 260 + Math.floor(i / 4) * 230, 150, t));
    } else if (this.place === 'armor') {
      this.drawNPC(c, 'armor', 310, 800, 1.45, 'idle', 0, t);
      // tezgâh önü (NPC'nin önünde)
      c.fillStyle = '#5a3a20'; c.fillRect(100, 646, 420, 124); c.fillStyle = '#9a6a40'; c.fillRect(90, 628, 440, 18);
      c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 3; for (let x = 150; x < 520; x += 70) { c.beginPath(); c.moveTo(x, 650); c.lineTo(x, 770); c.stroke(); }
      const row = (slot, y, size) => ITEMS.filter(i => i.slot === slot).forEach((it, i) => {
        if (slot === 'chest') { c.fillStyle = '#3b2414'; c.fillRect(680 + i * 190 - 5, y + 40, 10, 120); c.fillRect(680 + i * 190 - 40, y + 156, 80, 10); }
        this.itemSlot(c, it, 680 + i * 190, y, size, t);
      });
      row('helm', 230, 120); row('shield', 440, 130); row('chest', 660, 130);
    } else if (this.place === 'barracks') {
      this.drawNPC(c, 'barracks', 560, 790, 1.7, 'idle', 0, t);
    } else if (this.place === 'arena') {
      // tozlu ışık zerreleri
      for (let i = 0; i < 30; i++) { const k = (t * .05 + i / 30) % 1; c.fillStyle = `rgba(255,230,180,${.4 * Math.sin(k * Math.PI)})`; c.fillRect(420 + (i * 97) % 760 + Math.sin(t + i) * 10, 760 - k * 500, 3, 3); }
      this.drawNPC(c, 'arena', 300, 840, 1.7, 'idle', 0, t);
    }
  }
  updateSparks(c) {
    this.sparks = this.sparks.filter(s => s.life < 40);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const s of this.sparks) { s.life++; s.x += s.vx; s.y += s.vy; s.vy += .45; c.fillStyle = `rgba(255,${200 - s.life * 3},80,${1 - s.life / 40})`; c.fillRect(s.x, s.y, 4, 4); }
    c.restore();
  }
}
