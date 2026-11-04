/* ========= DEMİR TAÇ — Online Düello (2 kişi) =========
   PeerJS ile tarayıcılar arası doğrudan bağlantı (WebRTC). Eşleşme için PeerJS'in ücretsiz genel sunucusu kullanılır.
   İki istemci aynı tohumla (seed) aynı hamle sırasını oynatır; böylece isabet/kritik/blok sonuçları iki ekranda birebir aynıdır.
   Oda kuran (host) hep ilk hamleyi yapar. */
const Online = {
  peer: null, conn: null, role: null, code: null, op: null, ready: {}, queue: [], pumping: false, localRunning: false, acts: 0, active: false, time: 2,

  snap() { const p = G.player; return { name: p.name, level: p.level, stats: { ...p.stats }, equip: { ...p.equip }, look: { ...p.look } }; },
  mkCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; },
  opts() { return { debug: 1, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] } }; },

  /* ---------- lobi arayüzü ---------- */
  open() {
    if (!G) return;
    $('#online').hidden = false;
    if (!this.conn) this.resetUI();
    this.card($('#ol-me'), this.snap(), 'Sen');
    SFX.click();
  },
  resetUI() {
    $('#ol-start').hidden = false; $('#ol-room').hidden = true; $('#ol-go').hidden = true;
    $('#ol-op').innerHTML = '<div class="ol-wait"><span class="spin"></span>Rakip bekleniyor</div>';
    this.status('');
  },
  status(txt, kind = '') { const el = $('#ol-status'); el.textContent = txt; el.className = 'ol-status ' + kind; },
  card(box, f, label) {
    const d = derive(f);
    box.innerHTML = `<div class="sec">${label}</div><canvas width="180" height="220"></canvas><b>${f.name}</b><div class="who-sub">Seviye ${f.level} · Can ${d.maxHp} · Zırh ${d.armor}</div>
      <div class="who-sub">${ITEM[f.equip.weapon] ? ITEM[f.equip.weapon].name : 'Kılıç'}</div>`;
    renderFigure(box.querySelector('canvas'), f, { scale: 1.05, gy: 212, dir: label === 'Sen' ? 1 : -1 });
  },
  showRoom() {
    $('#ol-start').hidden = true; $('#ol-room').hidden = false;
    $('#ol-code-show').textContent = this.code || '—';
    $('#ol-code-row').hidden = this.role !== 'host';
  },

  /* ---------- bağlantı ---------- */
  available() {
    if (typeof Peer === 'undefined') { this.status('Online modül yüklenemedi. lib/peerjs.min.js dosyası eksik olabilir.', 'err'); return false; }
    return true;
  },
  host() {
    if (!this.available()) return;
    this.leave(true); this.role = 'host'; this.code = this.mkCode();
    this.status('Oda açılıyor...');
    this.peer = new Peer('demirtac-' + this.code, this.opts());
    this.peer.on('open', () => { this.showRoom(); this.status('Oda hazır. Kodu arkadaşına gönder, katılınca burada görünecek.'); });
    this.peer.on('connection', c => { if (this.conn) { c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); }); return; } this.bind(c); });
    this.peer.on('error', e => this.err(e));
    this.peer.on('disconnected', () => { if (this.peer && !this.peer.destroyed) this.peer.reconnect(); });
  },
  join(code) {
    if (!this.available()) return;
    code = (code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) { this.status('Oda kodu 6 karakter olmalı.', 'err'); return; }
    this.leave(true); this.role = 'guest'; this.code = code;
    this.status('Sunucuya bağlanılıyor...');
    this.peer = new Peer(undefined, this.opts());
    this.peer.on('open', () => {
      this.status('Odaya bağlanılıyor...');
      this.bind(this.peer.connect('demirtac-' + code, { reliable: true }));
      this.joinTimer = setTimeout(() => { if (!this.op) this.status('Odaya ulaşılamadı. Kodu kontrol et ya da arkadaşının odası hâlâ açık mı sor.', 'err'); }, 12000);
    });
    this.peer.on('error', e => this.err(e));
  },
  bind(c) {
    this.conn = c;
    c.on('open', () => { this.send({ t: 'hello', f: this.snap() }); this.showRoom(); this.status('Bağlandı! Gladyatör bilgileri alınıyor...', 'ok'); SFX.coin(); });
    c.on('data', m => this.onData(m));
    c.on('close', () => this.lost('Rakibin bağlantısı koptu.'));
    c.on('error', () => this.lost('Bağlantı hatası oluştu.'));
  },
  send(m) { try { if (this.conn && this.conn.open) this.conn.send(m); } catch (e) { } },
  err(e) {
    const msg = {
      'unavailable-id': 'Bu oda kodu kullanımda. Yeniden dene.',
      'peer-unavailable': 'Bu kodla açık bir oda bulunamadı. Kodu kontrol et.',
      'network': 'Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.',
      'server-error': 'Eşleşme sunucusuna ulaşılamıyor. Biraz sonra tekrar dene.',
      'socket-error': 'Eşleşme sunucusuna ulaşılamıyor. Biraz sonra tekrar dene.',
      'browser-incompatible': 'Bu tarayıcı online oyunu desteklemiyor. Chrome, Edge ya da Firefox kullan.',
    }[e.type] || ('Bağlantı hatası: ' + (e.type || e.message || 'bilinmiyor'));
    clearTimeout(this.joinTimer);
    if (this.active) this.lost(msg); else { this.status(msg, 'err'); if (e.type === 'peer-unavailable' || e.type === 'unavailable-id') { this.leave(true); this.resetUI(); this.status(msg, 'err'); } }
  },
  leave(silent) {
    if (this.conn && !silent) this.send({ t: 'bye' });
    const p = this.peer; this.conn = null; this.peer = null; this.op = null; this.active = false; this.ready = {}; this.queue = [];
    clearTimeout(this.joinTimer);
    if (p) setTimeout(() => { try { p.destroy(); } catch (e) { } }, 200);
  },
  lost(msg) {
    if (!this.conn && !this.active) return;
    const wasFighting = this.active && FT && !FT.over;
    this.leave(true);
    if (wasFighting) {
      FT.over = true; updateActions();
      modal({ eyebrow: 'Online Düello', title: 'Bağlantı Koptu', body: `<p>${msg} Maç sayılmadı.</p>`, buttons: [{ label: 'Şehre Dön', cls: 'btn-gold', on: () => { FT = null; show('hub'); } }] });
    } else if (!$('#online').hidden) { this.resetUI(); this.status(msg, 'err'); }
    else toast(msg);
  },

  /* ---------- mesajlar ---------- */
  onData(m) {
    if (!m || !m.t) return;
    if (m.t === 'hello') {
      clearTimeout(this.joinTimer);
      this.op = m.f; this.card($('#ol-op'), m.f, 'Rakip');
      if (this.role === 'host') { $('#ol-go').hidden = false; this.status(`${m.f.name} odaya katıldı. Hazır olunca dövüşü başlat.`, 'ok'); }
      else this.status(`Oda sahibi ${m.f.name}. Dövüşü başlatması bekleniyor...`, 'ok');
      SFX.cheer(.5);
    } else if (m.t === 'full') { this.status('Bu oda dolu.', 'err'); this.leave(true); }
    else if (m.t === 'start') this.begin(m);
    else if (m.t === 'act') { this.queue.push(m.id); this.pump(); }
    else if (m.t === 'rematch') {
      this.ready.op = true; if (m.f) this.op = m.f;
      if (this.role === 'host' && this.ready.me) this.startMatch();
      else toast(`${this.op ? this.op.name : 'Rakip'} rövanş istiyor!`);
    } else if (m.t === 'bye') this.lost('Rakip oyundan ayrıldı.');
  },
  startMatch() {
    if (this.role !== 'host' || !this.op) return;
    const m = { t: 'start', seed: (Math.random() * 4294967296) >>> 0, time: G.time, host: this.snap(), guest: this.op };
    this.send(m); this.begin(m);
  },
  begin(m) {
    this.ready = {}; this.queue = []; this.acts = 0; this.active = true; this.localRunning = false; this.time = m.time;
    $('#online').hidden = true; $('#modal').hidden = true;
    const opp = JSON.parse(JSON.stringify(this.role === 'host' ? m.guest : m.host));
    this.op = opp; opp.title = 'Online Rakip'; opp.arch = 'show';
    startFight(opp, { kind: 'pvp', seed: m.seed, myFirst: this.role === 'host' });
  },

  /* ---------- dövüş akışı ---------- */
  async localAct(id) {
    FT.myTurn = false; FT.busy = true; this.localRunning = true; updateActions();
    this.send({ t: 'act', id });
    await this.run(FT.p, FT.e, id);
    this.localRunning = false;
    if (checkEnd()) return;
    this.after();
    this.pump();
  },
  async pump() {
    if (this.pumping || this.localRunning) return;
    this.pumping = true;
    while (this.queue.length && FT && !FT.over) {
      const id = this.queue.shift();
      await wait(150);
      await this.run(FT.e, FT.p, id);
      if (checkEnd()) break;
      this.after();
      FT.myTurn = true; FT.busy = false; updateHUD(); updateActions();
      SFX.click();
    }
    this.pumping = false;
  },
  run(a, d, id) { return id.startsWith('potion:') ? usePotion(a, id.slice(7)).then(updateHUD) : doAction(a, d, id); },
  after() {
    this.acts++;
    if (this.acts % 2 === 0) { for (const f of [FT.p, FT.e]) f.st = Math.min(f.d.maxSt, f.st + 3); FT.turn++; }
    updateHUD(); updateActions();
  },
  finish(won) {
    const gold = won ? 100 : 25, xp = won ? 80 : 25;
    G.gold += gold; const ups = Progress.gainXp(xp);
    G.pvp = G.pvp || { w: 0, l: 0 }; won ? G.pvp.w++ : G.pvp.l++; save();
    const name = this.op ? this.op.name : 'Rakip';
    const body = `<div class="rewards"><div><small>Altın</small><b>+${gold}</b></div><div><small>XP</small><b>+${xp}</b></div><div><small>Online</small><b>${G.pvp.w}G · ${G.pvp.l}M</b></div></div>
      ${ups ? '<p>Seviye atladın!</p>' : ''}<p>${won ? `${name} kumda kaldı. Kalabalık senin adını haykırıyor!` : `${name} bu sefer daha iyiydi. Rövanş iste!`}</p>`;
    modal({ eyebrow: 'Online Düello', title: won ? 'Zafer' : 'Yenilgi', body, buttons: [
      { label: 'Rövanş', cls: 'btn-gold', on: () => this.rematch() },
      { label: 'Ayrıl', on: () => { this.leave(); FT = null; show('hub'); } },
    ] });
    if (ups) SFX.levelup();
  },
  rematch() {
    if (!this.conn) { toast('Rakip artık bağlı değil.'); FT = null; show('hub'); return; }
    this.ready.me = true; this.send({ t: 'rematch', f: this.snap() });
    if (this.role === 'host' && this.ready.op) this.startMatch();
    else modal({ eyebrow: 'Online Düello', title: 'Rövanş', body: `<p><span class="spin"></span> ${this.op ? this.op.name : 'Rakip'} bekleniyor...</p>`, buttons: [{ label: 'Vazgeç', on: () => { this.leave(); FT = null; show('hub'); } }] });
  },
};

/* Kopyala düğmesi: tıklama içinde panoya yaz, olmazsa metni seç */
function copyCode() {
  const code = Online.code || '';
  const sel = () => { const r = document.createRange(); r.selectNodeContents($('#ol-code-show')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
  try { navigator.clipboard.writeText(code).then(() => toast('Oda kodu kopyalandı'), sel); } catch (e) { sel(); }
}
