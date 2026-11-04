/* ========= DEMİR TAÇ — oyun durumu ve arayüz ========= */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const SAVE_KEY = 'demirtac-save-v1';

const STAT_ICO = { guc: '⚔', cev: '➶', day: '♥', sav: '⛨', kar: '★' };
let G = null;            // kayıtlı oyun
let draft = null;        // karakter oluşturma taslağı
let activeScreen = 'title';
let titleScene = null;

/* ---------- Kayıt ---------- */
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { } }
function load() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }

/* ---------- Ekranlar ---------- */
function show(id) {
  activeScreen = id;
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'scr-' + id));
  if (id === 'hub') { renderHub(); requestAnimationFrame(() => { if (town) { town.resize(); enterPlace(town.place); } }); }
  if (id !== 'fight') SFX.crowdStop();
  if (id === 'title') { $('#btn-continue').hidden = $('#btn-title-online').hidden = !load(); }
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 1800);
}
function modal({ eyebrow = '', title = '', body = '', buttons = [] }) {
  $('#m-eyebrow').textContent = eyebrow; $('#m-title').textContent = title; $('#m-body').innerHTML = body;
  const box = $('#m-btns'); box.innerHTML = '';
  buttons.forEach(b => {
    const el = document.createElement('button'); el.className = 'btn ' + (b.cls || 'btn-ghost'); el.textContent = b.label;
    el.onclick = () => { $('#modal').hidden = true; b.on && b.on(); }; box.appendChild(el);
  });
  $('#modal').hidden = false;
}

/* ---------- Statlar (oluşturma + gladyatör sekmesi ortak) ---------- */
function renderStats(container, fighter, points, onChange, base) {
  container.innerHTML = '';
  STATS.forEach(st => {
    const v = fighter.stats[st.k];
    const row = document.createElement('div'); row.className = 'stat';
    row.innerHTML = `<div class="stat-name"><span class="stat-ico">${STAT_ICO[st.k]}</span>${st.n}</div>
      <div class="stat-ctrl">${base ? `<button aria-label="${st.n} azalt" ${v <= base[st.k] ? 'disabled' : ''}>−</button>` : ''}<b>${v}</b><button aria-label="${st.n} artır" ${points <= 0 || v >= STAT_MAX ? 'disabled' : ''}>+</button></div>
      <div class="stat-desc">${st.d}</div>
      <div class="statbar"><i style="width:${v / STAT_MAX * 100}%"></i></div>`;
    const btns = row.querySelectorAll('button');
    btns[btns.length - 1].onclick = () => onChange(st.k, +1);
    if (base) btns[0].onclick = () => onChange(st.k, -1);
    container.appendChild(row);
  });
}
function renderDerived(container, f) {
  const d = derive(f);
  container.innerHTML = `
    <div><small>Can</small><b>${d.maxHp}</b></div>
    <div><small>Stamina</small><b>${d.maxSt}</b></div>
    <div><small>Hasar</small><b>${Math.round(d.dmgMin * d.mult)}–${Math.round(d.dmgMax * d.mult)}</b></div>
    <div><small>Zırh</small><b>${d.armor}</b></div>`;
}

/* ---------- Karakter oluşturma ---------- */
function startCreate() {
  draft = { name: 'Aras', level: 1, stats: { guc: 2, cev: 2, day: 2, sav: 2, kar: 2 }, points: 10,
    equip: { weapon: 'w0', helm: null, chest: null, shield: null },
    look: { skin: SKINS[1], hair: HAIRS[1], cape: CAPES[0], beard: true, hairStyle: 0 } };
  $('#inp-name').value = draft.name;
  const sw = (id, list, key) => {
    const row = $(id); row.innerHTML = '';
    list.forEach(col => {
      const b = document.createElement('button'); b.className = 'sw' + (draft.look[key] === col ? ' on' : '');
      b.style.background = col; b.setAttribute('aria-label', key + ' ' + col);
      b.onclick = () => { draft.look[key] = col; row.querySelectorAll('.sw').forEach(x => x.classList.toggle('on', x === b)); };
      row.appendChild(b);
    });
  };
  sw('#sw-skin', SKINS, 'skin'); sw('#sw-hair', HAIRS, 'hair'); sw('#sw-cape', CAPES, 'cape');
  refreshCreate();
  show('create');
}
function refreshCreate() {
  $('#create-points').textContent = 'Puan: ' + draft.points;
  renderStats($('#create-stats'), draft, draft.points, (k, dv) => {
    if (dv > 0 && draft.points <= 0) return;
    if (dv < 0 && draft.stats[k] <= 2) return;
    draft.stats[k] += dv; draft.points -= dv; refreshCreate();
  }, { guc: 2, cev: 2, day: 2, sav: 2, kar: 2 });
  renderDerived($('#create-derived'), draft);
  $('#btn-create-done').disabled = draft.points > 0;
  $('#btn-create-done').textContent = draft.points > 0 ? `${draft.points} puan kaldı` : 'Arenaya Gir';
}
function finishCreate() {
  const name = $('#inp-name').value.trim() || 'Aras';
  G = { player: { ...draft, name, xp: 0, points: 0 }, gold: 150, owned: ['w0'], potions: { p_heal: 1 }, rung: 0, wins: 0, losses: 0, champion: false,
    ladder: LADDER.map(makeEnemy) };
  Progress.migrate(G);
  save(); show('hub');
  toast('Kayıt açıldı. İlk rakibin seni bekliyor.');
}

/* ---------- Merkez: şehir meydanı ---------- */
let town = null;
function renderHub() {
  Progress.checkAch();
  const p = G.player;
  $('#hub-name').textContent = p.name;
  $('#hub-sub').textContent = `Seviye ${p.level} · ${G.champion ? 'Demir Taç Şampiyonu' : 'Merdiven ' + Math.min(G.rung + 1, 10) + '/10'}`;
  const need = xpNeed(p.level);
  $('#hub-xp').style.width = Math.min(100, p.xp / need * 100) + '%';
  $('#hub-xptext').textContent = `XP ${p.xp} / ${need}` + (p.points ? ` · ${p.points} nitelik puanı Kışla'da bekliyor` : '');
  $('#hub-gold').textContent = G.gold;
  renderPortrait($('#hub-portrait'), p);
  $('#hub-time').innerHTML = `<i>${TIMES[G.time].ico}</i><span>Gün ${G.day} · </span>${TIMES[G.time].n}`;
  renderLadder(); renderChar(); Progress.renderTourneys(); Progress.renderTavern();
  if (!$('#roadmap').hidden) Progress.renderRoadmap();
  if (town && town.sel && !$('#pp-shop').hidden) selectItem(ITEM[town.sel], true);
}

function enterPlace(place) {
  ['#pp-arena', '#pp-barracks', '#pp-shop', '#pp-tavern'].forEach(id => $(id).hidden = true);
  const shopish = place === 'smith' || place === 'armor' || place === 'healer';
  $('#btn-back-town').hidden = place === 'town';
  $('#pan-l').hidden = $('#pan-r').hidden = place !== 'town';
  $('#town-hint').hidden = place !== 'town' && !shopish;
  $('#town-hint').textContent = place === 'town' ? 'Bir binaya tıkla · Şehri sürükleyerek gez' : place === 'healer' ? 'Bir iksire tıkla' : 'Raftaki bir eşyaya tıkla';
  if (place === 'arena') $('#pp-arena').hidden = false;
  if (place === 'barracks') $('#pp-barracks').hidden = false;
  if (place === 'tavern') { $('#pp-tavern').hidden = false; Progress.renderTavern(); }
  SFX.music(place === 'tavern' ? 'tavern' : 'town');
  renderHub();
}
function openSheet() {
  $('#pp-shop').hidden = true; $('#pp-tavern').hidden = true; $('#pp-arena').hidden = true;
  $('#pp-barracks').hidden = false; renderChar(); SFX.click();
}

function selectItem(it, quiet) {
  if (POTION[it.id]) return selectPotion(it, quiet);
  const p = G.player, cur = p.equip[it.slot] ? ITEM[p.equip[it.slot]] : null;
  const owned = G.owned.includes(it.id), eq = p.equip[it.slot] === it.id, lowLvl = p.level < it.req;
  $('#pp-shop').hidden = false; $('#town-hint').hidden = true;
  renderItemIcon($('#shop-icon'), it);
  $('#shop-tier').textContent = `${TIER_NAME[it.tier]} · ${SLOT_NAME[it.slot]}`;
  $('#shop-tier').style.color = TIER_COL[it.tier];
  $('#shop-name').textContent = it.name;
  $('#shop-compare').innerHTML = compareRows(it, cur, eq);
  $('#shop-req').textContent = lowLvl ? `Bu eşya için seviye ${it.req} gerekli. Şu an seviye ${p.level}.` : (!owned && G.gold < it.price ? `${it.price - G.gold} altın daha lazım.` : '');
  const b = $('#shop-btn');
  b.disabled = false;
  if (eq) {
    b.className = 'btn btn-ghost wide'; b.textContent = it.slot === 'weapon' ? 'Kuşanıldı' : 'Çıkar';
    b.disabled = it.slot === 'weapon';
    b.onclick = () => { p.equip[it.slot] = null; save(); SFX.click(); renderHub(); };
  } else if (owned) {
    b.className = 'btn btn-gold wide'; b.textContent = 'Kuşan';
    b.onclick = () => { p.equip[it.slot] = it.id; save(); SFX.block(); toast(it.name + ' kuşanıldı'); renderHub(); };
  } else {
    b.className = 'btn btn-gold wide'; b.innerHTML = `Satın Al · <span class="coin" style="display:inline-block;width:14px;height:14px;vertical-align:-2px"></span> ${it.price}`;
    b.disabled = lowLvl || G.gold < it.price;
    b.onclick = () => {
      const before = cur;
      G.gold -= it.price; G.owned.push(it.id); p.equip[it.slot] = it.id; save();
      SFX.coin(); const npc = NPCS[town.place]; if (npc && npc.buy) town.say(pick(npc.buy));
      renderHub(); showReveal(it, before);
    };
  }
  if (!quiet) SFX.click();
}
function compareRows(it, cur, eq) {
  const bar = (label, now, then, max, unit = '') => {
    const diff = then - now, cls = diff > 0 ? 'up' : diff < 0 ? 'down' : '';
    return `<div class="cmp"><span>${label}</span><b class="${cls}">${then}${unit}${diff && !eq ? ` (${diff > 0 ? '+' : ''}${diff})` : ''}</b>
      <i class="cbar"><em style="width:${Math.min(100, now / max * 100)}%"></em><u style="width:${Math.min(100, then / max * 100)}%" class="${cls}"></u></i></div>`;
  };
  if (it.slot === 'weapon') {
    const c0 = cur || ITEM.w0;
    return bar('Ortalama hasar', Math.round((c0.dmg[0] + c0.dmg[1]) / 2), Math.round((it.dmg[0] + it.dmg[1]) / 2), 30) +
      bar('En yüksek hasar', c0.dmg[1], it.dmg[1], 32) + `<div class="cmp"><span>Menzil</span><b>${it.reach >= 2.5 ? 'Uzun (mızrak)' : 'Kısa'}</b></div>`;
  }
  let h = bar('Zırh', cur ? cur.armor : 0, it.armor, 20);
  if (it.slot === 'shield') h += bar('Bloklama', cur ? cur.block : 0, it.block, 30, '%');
  return h;
}
function selectPotion(pt, quiet) {
  const have = G.potions[pt.id] || 0;
  $('#pp-shop').hidden = false; $('#town-hint').hidden = true;
  const cv = $('#shop-icon'), c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); drawPotion(c, pt, 70, 74, 110);
  $('#shop-tier').textContent = 'İksir · Dövüşte 1 tur'; $('#shop-tier').style.color = pt.color;
  $('#shop-name').textContent = pt.name;
  $('#shop-compare').innerHTML = `<div class="cmp"><span>Etki</span><b>${pt.desc}</b></div><div class="cmp"><span>Çantada</span><b>${have} / ${POTION_MAX}</b></div>`;
  $('#shop-req').textContent = have >= POTION_MAX ? 'Çantan bu iksirle dolu.' : G.gold < pt.price ? `${pt.price - G.gold} altın daha lazım.` : '';
  const b = $('#shop-btn'); b.className = 'btn btn-gold wide';
  b.innerHTML = `Satın Al · <span class="coin" style="display:inline-block;width:14px;height:14px;vertical-align:-2px"></span> ${pt.price}`;
  b.disabled = have >= POTION_MAX || G.gold < pt.price;
  b.onclick = () => {
    G.gold -= pt.price; G.potions[pt.id] = have + 1; save();
    SFX.coin(); SFX.potion(); town.say(pick(NPCS.healer.buy)); toast(pt.name + ' çantaya eklendi');
    renderHub(); selectPotion(pt, true);
  };
  if (!quiet) SFX.click();
}

/* Satın alma anı: ışık huzmeleri, dönen eşya, kazanılan değerler */
let revealItem = null;
function showReveal(it, before) {
  revealItem = { it, t0: performance.now() };
  $('#rv-eyebrow').textContent = 'Yeni eşya kuşanıldı';
  $('#rv-tier').textContent = `${TIER_NAME[it.tier]} · ${SLOT_NAME[it.slot]}`; $('#rv-tier').style.color = TIER_COL[it.tier];
  $('#rv-name').textContent = it.name;
  const d = (a, b) => b - a > 0 ? ` <span class="up">(+${b - a})</span>` : '';
  let html = '';
  if (it.slot === 'weapon') { const c0 = before || ITEM.w0; html = `<div><small>Hasar</small><b>${it.dmg[0]}–${it.dmg[1]}</b>${d(c0.dmg[1], it.dmg[1])}</div><div><small>Menzil</small><b>${it.reach >= 2.5 ? 'Uzun' : 'Kısa'}</b></div>`; }
  else { html = `<div><small>Zırh</small><b>+${it.armor}</b>${d(before ? before.armor : 0, it.armor)}</div>` + (it.block ? `<div><small>Blok</small><b>%${it.block}</b>${d(before ? before.block : 0, it.block)}</div>` : ''); }
  html += `<div><small>Kalan altın</small><b>${G.gold}</b></div>`;
  $('#rv-stats').innerHTML = html;
  $('#reveal').hidden = false; SFX.reveal();
}
function drawReveal(t) {
  if (!revealItem || $('#reveal').hidden) return;
  const cv = $('#rv-icon'), c = cv.getContext('2d'), W = cv.width, k = (performance.now() - revealItem.t0) / 1000;
  c.clearRect(0, 0, W, W);
  c.save(); c.translate(W / 2, W / 2 + Math.sin(t * 2) * 6);
  c.scale(Math.cos(k * 1.6) * .25 + .9, 1); // yarı 3B dönüş
  drawItemAt(c, revealItem.it, 0, 0, W * .8);
  c.restore();
  // parıltı geçişi
  const sx = ((k * .6) % 1.4) * W * 1.4 - W * .4;
  c.save(); c.globalCompositeOperation = 'source-atop';
  const g = c.createLinearGradient(sx - 40, 0, sx + 40, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, W); c.restore();
}

function renderLadder() {
  const box = $('#ladder'); box.innerHTML = '';
  G.ladder.forEach((e, i) => {
    const state = i < G.rung ? 'done' : i === G.rung ? 'next' : 'locked';
    const hidden = state === 'locked' && i > G.rung + 1;
    const el = document.createElement('div');
    el.className = 'lrow ' + state;
    el.innerHTML = `<canvas width="116" height="116"></canvas>
      <div><div class="meta">${i === 9 ? 'Final' : 'Basamak ' + (i + 1)} · ${e.title}</div>
      <div class="nm">${hidden ? '???' : e.name}</div>
      <div class="meta">Seviye ${e.level}</div></div>`;
    if (state === 'next') {
      const b = document.createElement('button'); b.className = 'btn btn-gold'; b.textContent = i === 9 ? 'Meydan Oku' : 'Dövüş';
      b.onclick = () => { SFX.click(); startFight(e, { kind: 'ladder', rung: i }); }; el.appendChild(b);
    } else { const st = document.createElement('span'); st.className = 'st'; st.textContent = state === 'done' ? 'Yenildi' : 'Kilitli'; el.appendChild(st); }
    box.appendChild(el);
    if (!hidden) renderPortrait(el.querySelector('canvas'), e);
  });
  if (G.rung < 10) {
    const next = $('#ladder .lrow.next');
    if (next && !$('#pp-arena').hidden) next.scrollIntoView({ block: 'nearest' });
  }
}

function renderChar() {
  const p = G.player, d = derive(p);
  $('#sheet-name').textContent = p.name;
  $('#sheet-rank').textContent = G.champion ? 'Demir Taç Şampiyonu' : ['Acemi', 'Acemi', 'Kum Savaşçısı', 'Kum Savaşçısı', 'Arena Kurdu', 'Arena Kurdu', 'Kalabalığın Sevgilisi', 'Usta Gladyatör', 'Usta Gladyatör', 'Efsane'][Math.min(9, G.rung)];
  $('#sheet-lvl').textContent = `Seviye ${p.level} · XP ${p.xp}/${xpNeed(p.level)}`;
  $('#char-points').textContent = p.points ? `${p.points} puan dağıt` : 'Puan yok';
  $('#char-points').style.background = p.points ? 'var(--gold)' : ''; $('#char-points').style.color = p.points ? '#2a1a08' : '';
  renderStats($('#char-stats'), p, p.points, (k) => {
    if (p.points <= 0) return; p.stats[k]++; p.points--; save(); SFX.levelup(); renderHub();
    const row = [...$$('#char-stats .stat')][STATS.findIndex(x => x.k === k)]; if (row) row.classList.add('flash');
  });
  drawRadar($('#sheet-radar'), p.stats);
  const gauge = (label, val, frac, col) => `<div class="gauge"><small>${label}</small><b>${val}</b><div class="gbar"><i style="width:${Math.min(100, frac * 100)}%;background:${col}"></i></div></div>`;
  $('#sheet-gauges').innerHTML =
    gauge('Can', d.maxHp, d.maxHp / 600, 'linear-gradient(90deg,#ef6a50,#c9432d)') +
    gauge('Stamina', d.maxSt, d.maxSt / 260, 'linear-gradient(90deg,#7fd2cc,#4fa3a0)') +
    gauge('Hasar', `${Math.round(d.dmgMin * d.mult)}–${Math.round(d.dmgMax * d.mult)}`, d.dmgMax * d.mult / 90, 'linear-gradient(90deg,#f6d58f,#e2b25a)') +
    gauge('Zırh', `%${Math.round(d.dr * 100)}`, d.dr / .6, 'linear-gradient(90deg,#b8c3cc,#8f979e)') +
    gauge('Blok', `%${d.block}`, d.block / 55, 'linear-gradient(90deg,#8fd0c7,#4f7d79)') +
    gauge('Kritik', `%${Math.round(d.crit)}`, d.crit / 40, 'linear-gradient(90deg,#f6a07a,#c9432d)');
  const eqBox = $('#char-equip'); eqBox.innerHTML = '';
  ['weapon', 'helm', 'chest', 'shield'].forEach(sl => {
    const it = p.equip[sl] ? ITEM[p.equip[sl]] : null;
    const el = document.createElement('div'); el.className = 'eslot' + (it ? '' : ' empty');
    el.innerHTML = `<canvas width="104" height="104"></canvas><small>${SLOT_NAME[sl]}</small><span>${it ? it.name : 'Boş'}</span>`;
    eqBox.appendChild(el);
    renderItemIcon(el.querySelector('canvas'), it || ITEMS.find(x => x.slot === sl && x.tier === 0));
    if (it) el.style.borderColor = TIER_COL[it.tier];
  });
  const bag = $('#char-bag'); bag.innerHTML = '';
  POTIONS.forEach(pt => {
    const el = document.createElement('div'); el.className = 'bag-item';
    el.innerHTML = `<canvas width="60" height="60"></canvas>${G.potions[pt.id] || 0} × ${pt.name}`;
    bag.appendChild(el);
    drawPotion(el.querySelector('canvas').getContext('2d'), pt, 30, 32, 44);
  });
  $('#char-record').innerHTML = `<span class="pill">Galibiyet ${G.wins}</span><span class="pill">Mağlubiyet ${G.losses}</span><span class="pill">Merdiven ${Math.min(G.rung, 10)}/10</span>`;
}
function drawRadar(cv, st) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W / 2, cy = H / 2 + 6, R = Math.min(W, H) / 2 - 42;
  c.clearRect(0, 0, W, H);
  const max = Math.max(10, Math.ceil(Math.max(...STATS.map(x => st[x.k])) / 5) * 5);
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  for (let ring = 1; ring <= 4; ring++) {
    c.beginPath(); for (let i = 0; i < 5; i++) { const [x, y] = pt(i, R * ring / 4); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath();
    c.strokeStyle = 'rgba(226,178,90,.18)'; c.lineWidth = 1; c.stroke();
  }
  for (let i = 0; i < 5; i++) { const [x, y] = pt(i, R); c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke(); }
  c.beginPath(); STATS.forEach((s2, i) => { const [x, y] = pt(i, R * st[s2.k] / max); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath();
  const g = c.createRadialGradient(cx, cy, 4, cx, cy, R); g.addColorStop(0, 'rgba(246,213,143,.55)'); g.addColorStop(1, 'rgba(226,178,90,.25)');
  c.fillStyle = g; c.fill(); c.strokeStyle = '#f6d58f'; c.lineWidth = 2; c.stroke();
  STATS.forEach((s2, i) => { const [x, y] = pt(i, R * st[s2.k] / max); c.fillStyle = '#f6d58f'; c.beginPath(); c.arc(x, y, 3.5, 0, 6.28); c.fill(); });
  c.font = '700 11px Manrope, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  STATS.forEach((s2, i) => { const [x, y] = pt(i, R + 20); c.fillStyle = '#a8968a'; c.fillText(s2.n, x, y - 6); c.fillStyle = '#f6d58f'; c.font = '800 13px Manrope, sans-serif'; c.fillText(st[s2.k], x, y + 8); c.font = '700 11px Manrope, sans-serif'; });
  c.textBaseline = 'alphabetic';
}

/* ---------- Dövüş sonrası ---------- */
function grantRewards(won, enemy, opts, fightStats) {
  const p = G.player;
  let gold, xp;
  if (won) {
    gold = 35 + enemy.level * 22 + fightStats.crowdGold + (opts.kind === 'ladder' ? 70 + opts.rung * 45 : 0);
    xp = Math.round((30 + enemy.level * 18) * (opts.kind === 'ladder' ? 1.4 : 1));
    G.wins++;
  } else {
    gold = 10 + enemy.level * 4 + Math.round(fightStats.crowdGold / 2);
    xp = Math.round((30 + enemy.level * 18) * .3);
    G.losses++;
  }
  if (G.time === 3) gold = Math.round(gold * 1.15);
  G.gold += gold; p.xp += xp;
  let ups = 0;
  while (p.xp >= xpNeed(p.level)) { p.xp -= xpNeed(p.level); p.level++; p.points += 4; ups++; }
  let champ = false;
  if (won && opts.kind === 'ladder' && opts.rung === G.rung) {
    G.rung++;
    if (G.rung >= 10 && !G.champion) { G.champion = true; champ = true; }
  }
  save();
  return { gold, xp, ups, champ };
}

/* ---------- Başlık sahnesi ---------- */
const titleDuo = [
  { name: 'A', level: 5, stats: {}, equip: { weapon: 'w6', helm: 'h3', chest: 'c3', shield: 's2' }, look: { skin: SKINS[1], hair: HAIRS[0], cape: CAPES[0], beard: true, hairStyle: 0 } },
  { name: 'B', level: 5, stats: {}, equip: { weapon: 'w5', helm: 'h4', chest: 'c4', shield: null }, look: { skin: SKINS[3], hair: HAIRS[2], cape: CAPES[1], beard: false, hairStyle: 1 } },
];
const embers = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: rnd(.0006, .002), s: rnd(1, 3), ph: rnd(0, 6) }));
function drawTitle(t) {
  if (!titleScene) titleScene = new ArenaScene($('#title-bg'));
  const sc = titleScene, c = sc.c;
  c.setTransform(sc.dpr, 0, 0, sc.dpr, 0, 0);
  sc.hype = .5 + Math.sin(t * .5) * .3;
  sc.drawBg(t);
  drawFighter(c, titleDuo[0], sc.W * .3, sc.ground, sc.s * 1.1, 1, 'idle', 0, t);
  drawFighter(c, titleDuo[1], sc.W * .7, sc.ground, sc.s * 1.1, -1, 'idle', 0, t + 1);
  const g = c.createLinearGradient(0, 0, 0, sc.H);
  g.addColorStop(0, 'rgba(19,14,12,.55)'); g.addColorStop(.5, 'rgba(19,14,12,.78)'); g.addColorStop(1, 'rgba(19,14,12,.6)');
  c.fillStyle = g; c.fillRect(0, 0, sc.W, sc.H);
  for (const e of embers) {
    e.y -= e.v; if (e.y < -.05) { e.y = 1.05; e.x = Math.random(); }
    c.globalAlpha = .5 + Math.sin(t * 3 + e.ph) * .4; c.fillStyle = '#ffb347';
    c.fillRect(e.x * sc.W + Math.sin(t + e.ph) * 12, e.y * sc.H, e.s, e.s);
  }
  c.globalAlpha = 1;
}

/* ---------- Ana döngü ---------- */
function frame(ms) {
  const t = ms / 1000;
  if (activeScreen === 'title') drawTitle(t);
  else if (activeScreen === 'create') renderFigure($('#create-preview'), draft, { t, scale: 1.35, gy: 285 });
  else if (activeScreen === 'hub' && town) {
    town.draw(t);
    if (!$('#pp-barracks').hidden) renderFigure($('#sheet-fig'), G.player, { t, scale: 1.25, gy: 262 });
  }
  else if (activeScreen === 'fight') drawFight(t);
  drawReveal(t);
  Progress.drawMap(t);
  requestAnimationFrame(frame);
}

/* ---------- Olaylar ---------- */
function boot() {
  $('#btn-new').onclick = () => {
    if (load()) modal({ eyebrow: 'Yeni oyun', title: 'Kayıt silinsin mi?', body: '<p>Mevcut gladyatörün ve ilerlemen silinecek.</p>',
      buttons: [{ label: 'Vazgeç' }, { label: 'Yeni Başla', cls: 'btn-gold', on: startCreate }] });
    else startCreate();
  };
  $('#btn-continue').onclick = () => { G = load(); if (G) { Progress.migrate(G); show('hub'); } };
  $('#btn-create-back').onclick = () => show('title');
  $('#btn-create-done').onclick = finishCreate;
  $('#inp-name').oninput = e => draft.name = e.target.value;
  town = new TownView($('#town'), { enter: enterPlace, select: it => selectItem(it), action: a => { Progress.tavTab = a; Progress.renderTavern(); SFX.click(); } });
  $('#btn-back-town').onclick = () => town.go('town');
  $('#pan-l').onclick = () => town.pan(-1); $('#pan-r').onclick = () => town.pan(1);
  $('#hub-who').onclick = openSheet; $('#hub-who').onkeydown = e => { if (e.key === 'Enter') openSheet(); };
  $('#sheet-close').onclick = () => { if (town.place === 'barracks') town.go('town'); else { $('#pp-barracks').hidden = true; enterPlace(town.place); } };
  $('#rv-ok').onclick = () => { $('#reveal').hidden = true; revealItem = null; };
  $$('#tav-tabs button').forEach(b => b.onclick = () => { Progress.tavTab = b.dataset.tt; Progress.renderTavern(); SFX.click(); });
  $('#tav-wait').onclick = () => { Progress.advanceTime(); save(); SFX.potion(); town.say(`Zaman akıp gidiyor... Artık ${Progress.timeName().toLowerCase()}.`); renderHub(); };
  $('#btn-roadmap').onclick = () => Progress.openRoadmap();
  $('#btn-online').onclick = () => Online.open();
  $('#btn-title-online').onclick = () => { G = load(); if (!G) return; Progress.migrate(G); show('hub'); Online.open(); };
  $('#ol-host').onclick = () => Online.host();
  $('#ol-join').onclick = () => Online.join($('#ol-code').value);
  $('#ol-code').onkeydown = e => { if (e.key === 'Enter') Online.join($('#ol-code').value); };
  $('#ol-copy').onclick = copyCode;
  $('#ol-go').onclick = () => Online.startMatch();
  $('#ol-close').onclick = () => { if (!Online.active) Online.leave(); $('#online').hidden = true; };
  $('#rm-close').onclick = () => { $('#roadmap').hidden = true; Progress.rmSel = null; };
  $$('#rm-tabs button').forEach(b => b.onclick = () => { Progress.rmTab = b.dataset.rt; Progress.renderRoadmap(); SFX.click(); });
  $('#rm-canvas').onclick = e => Progress.mapClick(e);
  document.addEventListener('keydown', e => {
    if (activeScreen !== 'hub' || town.place !== 'town') return;
    if (e.key === 'ArrowLeft') town.pan(-.5); if (e.key === 'ArrowRight') town.pan(.5);
  });
  $('#pp-shop-close').onclick = () => { $('#pp-shop').hidden = true; town.sel = null; $('#town-hint').hidden = false; };
  const syncMute = () => $$('.mute-btn').forEach(b => b.classList.toggle('off', SFX.muted));
  $$('.mute-btn').forEach(b => b.onclick = () => { SFX.init(); SFX.toggle(); syncMute(); SFX.click(); });
  syncMute();
  $$('.btn').forEach(b => b.addEventListener('click', () => SFX.click()));
  $('#btn-exhibition').onclick = () => startFight(makeExhibitionEnemy(G.player.level), { kind: 'exh' });
  $('#btn-reset').onclick = () => modal({ eyebrow: 'Dikkat', title: 'Kaydı sil', body: '<p>Gladyatörün, altının ve eşyaların kalıcı olarak silinecek.</p>',
    buttons: [{ label: 'Vazgeç' }, { label: 'Sil', cls: 'btn-danger-ghost', on: () => { wipe(); G = null; show('title'); } }] });
  window.addEventListener('resize', () => { if (titleScene) titleScene.resize(); if (town && activeScreen === 'hub') town.resize(); if (typeof onFightResize === 'function') onFightResize(); });
  show('title');
  requestAnimationFrame(frame);
}
window.addEventListener('load', boot);
