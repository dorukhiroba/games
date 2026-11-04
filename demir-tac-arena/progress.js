/* ========= DEMİR TAÇ — ilerleme sistemleri =========
   Gün döngüsü · Turnuvalar · Han (kontrat, yemek, söylenti) · Başarımlar · Yol haritası */
const Progress = {
  /* ---------- kayıt uyumu ---------- */
  migrate(g) {
    const d = { time: 2, day: 1, trophies: {}, contracts: [], ach: {}, jobsDone: 0, nightWins: 0, buff: null, tour: null, meals: 0, potions: {} };
    for (const k in d) if (g[k] === undefined) g[k] = d[k];
    this.ensureContracts(g);
    return g;
  },
  ensureContracts(g = G) {
    while (g.contracts.length < 3) {
      const used = g.contracts.map(c => c.k);
      const tpl = pick(CONTRACTS.filter(c => !used.includes(c.k)));
      const k = 1 + (g.player.level - 1) * .18;
      g.contracts.push({ k: tpl.k, prog: 0, goal: tpl.goal, gold: Math.round(tpl.gold * k / 5) * 5, xp: Math.round(tpl.xp * k), done: false });
    }
  },
  gainXp(n) {
    const p = G.player; let ups = 0; p.xp += n;
    while (p.xp >= xpNeed(p.level)) { p.xp -= xpNeed(p.level); p.level++; p.points += 4; ups++; }
    return ups;
  },

  /* ---------- gün döngüsü ---------- */
  timeName() { return TIMES[G.time].n; },
  advanceTime() { G.time = (G.time + 1) % 4; if (G.time === 0) G.day++; if (town) town.cacheFor = null; },

  /* ---------- dövüş başlangıcı: yemek gücü + turnuva canı ---------- */
  applyFightStart(FT, opts) {
    const p = FT.p;
    if (opts.hp) p.hp = Math.min(p.d.maxHp, Math.round(opts.hp));
    const b = G.buff && FOOD[G.buff];
    if (b) {
      if (b.hp) { const add = Math.round(p.d.maxHp * b.hp); p.d = { ...p.d, maxHp: p.d.maxHp + add }; p.hp += add; }
      if (b.st) { p.d = { ...p.d, maxSt: p.d.maxSt + b.st }; p.st += b.st; }
      if (b.hype) p.hype = b.hype;
      log(`${b.name} etkisi: ${b.desc.replace('Sonraki dövüşte ', '')}`, 'p');
      G.buff = null; save();
    }
  },

  /* ---------- dövüş sonu: zaman, kontrat, turnuva, başarım ---------- */
  afterFight(won, enemy, opts, F) {
    const out = { lines: [], buttons: [] };
    const st = F.stats, p = F.p;
    if (won && G.time === 3) G.nightWins++;
    // kontratlar
    G.contracts.forEach(c => {
      if (c.done) return;
      const inc = {
        wins: won ? 1 : 0, crits: st.crits, taunts: st.taunts, specials: st.specials,
        fast: won && F.turn < 8 ? 1 : 0, nopot: won && !st.potions ? 1 : 0,
        tough: won && enemy.level > G.player.level ? 1 : 0, flawless: won && p.hp > p.d.maxHp * .75 ? 1 : 0,
        night: won && G.time === 3 ? 1 : 0,
      }[c.k] || 0;
      c.prog = Math.min(c.goal, c.prog + inc);
      if (c.prog >= c.goal) { c.done = true; out.lines.push(`Kontrat tamamlandı: <b>${CONTRACTS.find(x => x.k === c.k).n}</b>. Ödülün Han'da.`); }
    });
    // turnuva
    if (opts.kind === 'tour' && G.tour) {
      const t = TOURNEY[G.tour.id];
      if (won && G.tour.round < 2) {
        G.tour.round++;
        G.tour.hp = Math.min(p.d.maxHp, Math.max(0, p.hp) + p.d.maxHp * .35);
        out.lines.push(`${t.name}: sıradaki tur <b>${ROUND_NAMES[G.tour.round]}</b>. Canın %35 yenilenerek taşınacak.`);
        out.buttons.push({ label: `${ROUND_NAMES[G.tour.round]}'e Çık`, cls: 'btn-gold', on: () => Progress.startTourRound() });
      } else if (won) {
        G.trophies[t.id] = (G.trophies[t.id] || 0) + 1;
        G.gold += t.prize; const ups = this.gainXp(t.xp);
        out.lines.push(`<b>${t.name} senin!</b> Ödül: ${t.prize} altın, ${t.xp} XP.${ups ? ' Seviye atladın!' : ''}`);
        out.trophy = t; G.tour = null;
      } else { out.lines.push(`${t.name} burada bitti. Daha güçlü dönüp yeniden katılabilirsin.`); G.tour = null; }
    }
    this.advanceTime();
    out.lines.push(`Zaman ilerledi: <b>${this.timeName()}</b>${G.time === 3 ? ' (gece maçları +%15 altın)' : ''}.`);
    save();
    return out;
  },

  /* ---------- başarımlar ---------- */
  checkAch() {
    if (!G) return;
    const got = [];
    ACHIEVEMENTS.forEach(a => { if (!G.ach[a.id] && a.test(G)) { G.ach[a.id] = Date.now(); G.gold += a.gold; got.push(a); } });
    if (got.length) {
      save(); SFX.levelup();
      toast(got.length === 1 ? `Başarım: ${got[0].n} · +${got[0].gold} altın` : `${got.length} başarım açıldı · +${got.reduce((n, a) => n + a.gold, 0)} altın`);
    }
  },

  /* ---------- turnuvalar ---------- */
  fee(t) { return Math.round(t.prize * .08 / 5) * 5; },
  startTourney(id) {
    const t = TOURNEY[id], fee = this.fee(t);
    if (G.player.level < t.req || G.gold < fee || G.tour) return;
    G.gold -= fee; G.tour = { id, round: 0, hp: null }; save(); SFX.coin();
    this.startTourRound();
  },
  startTourRound() {
    const t = TOURNEY[G.tour.id], r = G.tour.round;
    const def = r < 2 ? { name: pick(EXHIBITION_NAMES), title: `${t.name} · ${ROUND_NAMES[r]}`, lvl: t.levels[r], arch: pick(Object.keys(ARCH)) }
      : { ...t.boss, title: `${t.name} · Final`, lvl: t.levels[2] };
    const e = makeEnemy(def);
    if (r === 2) e.look.cape = '#e2b25a';
    startFight(e, { kind: 'tour', tid: t.id, round: r, hp: G.tour.hp });
  },
  renderTourneys() {
    const box = $('#tourneys'); if (!box) return; box.innerHTML = '';
    TOURNEYS.forEach(t => {
      const lock = G.player.level < t.req, wins = G.trophies[t.id] || 0, active = G.tour && G.tour.id === t.id;
      const el = document.createElement('div'); el.className = 'tour' + (lock ? ' locked' : '') + (active ? ' active' : '');
      el.style.setProperty('--tc', t.col);
      el.innerHTML = `<canvas width="88" height="88"></canvas>
        <div class="tour-info"><div class="nm">${t.name}</div>
        <div class="meta">${lock ? `Seviye ${t.req} gerekli` : active ? `Devam ediyor · ${ROUND_NAMES[G.tour.round]}` : `3 tur · Ödül ${t.prize} altın`}</div>
        ${wins ? `<div class="meta won">Kazanıldı × ${wins}</div>` : ''}</div>`;
      const b = document.createElement('button');
      if (active) { b.className = 'btn btn-gold'; b.textContent = 'Devam Et'; b.onclick = () => this.startTourRound(); }
      else { b.className = 'btn btn-ghost'; b.textContent = `Katıl · ${this.fee(t)}`; b.disabled = lock || !!G.tour || G.gold < this.fee(t); b.onclick = () => this.startTourney(t.id); }
      el.appendChild(b); box.appendChild(el);
      drawTrophy(el.querySelector('canvas').getContext('2d'), t, 44, 48, 70, lock);
    });
  },

  /* ---------- Han paneli ---------- */
  tavTab: 'jobs',
  renderTavern() {
    if (!$('#pp-tavern') || $('#pp-tavern').hidden) return;
    $('#tav-time').textContent = `Gün ${G.day} · ${this.timeName()}. ${TIMES[G.time].note}`;
    $$('#tav-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tt === this.tavTab));
    const body = $('#tav-body'); body.innerHTML = '';
    if (this.tavTab === 'jobs') {
      G.contracts.forEach((c, i) => {
        const tpl = CONTRACTS.find(x => x.k === c.k);
        const el = document.createElement('div'); el.className = 'job' + (c.done ? ' done' : '');
        el.innerHTML = `<div class="job-top"><b>${tpl.n}</b><span class="pill">+${c.gold} altın · +${c.xp} XP</span></div>
          <div class="who-sub">${tpl.d}</div>
          <div class="jbar"><i style="width:${c.prog / c.goal * 100}%"></i><span>${c.prog} / ${c.goal}</span></div>`;
        if (c.done) {
          const b = document.createElement('button'); b.className = 'btn btn-gold wide'; b.textContent = 'Ödülü Al';
          b.onclick = () => {
            G.gold += c.gold; const ups = this.gainXp(c.xp); G.jobsDone++;
            G.contracts.splice(i, 1); this.ensureContracts(); save();
            SFX.coin(); if (ups) SFX.levelup(); town.say('Sözünü tuttun. İşte paran, gladyatör.');
            toast(`+${c.gold} altın, +${c.xp} XP${ups ? ' · Seviye atladın!' : ''}`); renderHub();
          };
          el.appendChild(b);
        }
        body.appendChild(el);
      });
      const note = document.createElement('p'); note.className = 'who-sub'; note.textContent = `Tamamlanan kontrat: ${G.jobsDone}. Kontratlar her dövüşte kendiliğinden ilerler.`; body.appendChild(note);
    } else if (this.tavTab === 'food') {
      if (G.buff) { const b = FOOD[G.buff]; const el = document.createElement('div'); el.className = 'buff-now'; el.innerHTML = `Midende: <b>${b.name}</b> · ${b.desc}`; body.appendChild(el); }
      FOODS.forEach(f => {
        const lock = f.req && G.player.level < f.req;
        const el = document.createElement('div'); el.className = 'food' + (G.buff === f.id ? ' on' : '');
        el.innerHTML = `<canvas width="112" height="112"></canvas><div><b>${f.name}</b><div class="who-sub">${lock ? `Seviye ${f.req} gerekli` : f.desc}</div></div>`;
        const b = document.createElement('button'); b.className = 'btn btn-gold'; b.textContent = `${f.price}`;
        b.disabled = lock || !!G.buff || G.gold < f.price;
        b.onclick = () => { G.gold -= f.price; G.buff = f.id; G.meals++; save(); SFX.coin(); SFX.potion(); town.say('Afiyet olsun! Arenada gücünü hissedeceksin.'); renderHub(); };
        el.appendChild(b); body.appendChild(el);
        drawFood(el.querySelector('canvas').getContext('2d'), f, 56, 60, 90);
      });
      const note = document.createElement('p'); note.className = 'who-sub'; note.textContent = 'Aynı anda yalnızca bir yemeğin etkisi olur. Etki bir sonraki dövüşte kullanılır.'; body.appendChild(note);
    } else {
      const next = G.tour ? null : G.ladder[Math.min(G.rung, 9)];
      const cards = [];
      if (G.tour) { const t = TOURNEY[G.tour.id]; cards.push({ e: { ...t.boss, level: t.levels[2], look: { skin: '#b97a4e', hair: '#1d1410', cape: '#e2b25a', beard: true, hairStyle: 0 }, equip: gearFor(t.levels[2], t.boss.arch) }, label: `${t.name} finali` }); }
      if (next && !G.champion) cards.push({ e: next, label: 'Merdivendeki sıradaki rakibin' });
      cards.forEach(({ e, label }) => {
        const tip = ARCH_TIPS[e.arch], w = ITEM[e.equip.weapon];
        const el = document.createElement('div'); el.className = 'rumor';
        el.innerHTML = `<canvas width="116" height="116"></canvas><div><div class="sec">${label}</div><b>${e.name}</b>
          <div class="who-sub">Seviye ${e.level} · ${tip.n} · ${w ? w.name : 'Kılıç'}</div><p>“${tip.tip}”</p></div>`;
        body.appendChild(el); renderPortrait(el.querySelector('canvas'), e);
      });
      const gossip = ['Derler ki Avrok hiç kalkan taşımaz, çünkü ihtiyaç duymaz.', 'Demirci Bertan geceleri Güneş Kılıcı\'nı dövüyormuş.', 'Gece maçlarında kalabalık daha cömert olur.', 'Hekim Ilya\'nın Öfke Tozu bir finali tek başına çevirebilir.', 'Ölümsüz Vardos\'un hiç yenilmediği söylenir.'];
      const el = document.createElement('ul'); el.className = 'gossip'; el.innerHTML = gossip.sort(() => Math.random() - .5).slice(0, 3).map(g => `<li>${g}</li>`).join('');
      body.appendChild(el);
    }
  },

  /* ---------- yol haritası ---------- */
  rmTab: 'map', rmSel: null,
  openRoadmap(tab = 'map') { this.rmTab = tab; $('#roadmap').hidden = false; this.renderRoadmap(); SFX.click(); },
  currentMilestone() { const i = MILESTONES.findIndex(m => !m.test(G)); return i < 0 ? MILESTONES.length : i; },
  renderRoadmap() {
    $$('#rm-tabs button').forEach(b => b.classList.toggle('on', b.dataset.rt === this.rmTab));
    ['map', 'ach', 'soon'].forEach(k => $('#rm-' + k).hidden = k !== this.rmTab);
    const cur = this.currentMilestone(), done = MILESTONES.filter(m => m.test(G)).length;
    $('#rm-progress').textContent = `${done} / ${MILESTONES.length} kilometre taşı · ${Object.keys(G.ach).length} / ${ACHIEVEMENTS.length} başarım`;
    if (this.rmTab === 'map') {
      const i = this.rmSel ?? Math.min(cur, MILESTONES.length - 1), m = MILESTONES[i], ok = m.test(G);
      $('#rm-goal').innerHTML = `<div class="sec">${ok ? 'Tamamlandı' : i === cur ? 'Sıradaki hedef' : 'İleride'}</div><h3>${m.n}</h3><p>${m.hint}</p>${m.rec ? `<span class="pill">Önerilen seviye ${m.rec}</span>` : ''}`;
    } else if (this.rmTab === 'ach') {
      $('#rm-ach').innerHTML = ACHIEVEMENTS.map(a => `<div class="ach ${G.ach[a.id] ? 'on' : ''}"><div class="ach-ico">${G.ach[a.id] ? '★' : '☆'}</div><div><b>${a.n}</b><div class="who-sub">${a.d}</div></div><span class="pill">+${a.gold}</span></div>`).join('');
    } else {
      $('#rm-soon').innerHTML = `<p class="who-sub">Demir Taç gelişmeye devam ediyor. Sıradaki güncellemelerde gelmesi planlananlar:</p><ol class="soon">${COMING_SOON.map(s => `<li>${s}</li>`).join('')}</ol>`;
    }
  },
  /* Parşömen harita: kıvrımlı yol üzerinde kilometre taşları */
  mapNodes(W, H) {
    const cols = 4, rows = 3, nodes = [];
    MILESTONES.forEach((m, i) => {
      const r = Math.floor(i / cols), k = i % cols, c = r % 2 ? cols - 1 - k : k;
      nodes.push([W * (.14 + c * .24), H * (.2 + r * .3) + Math.sin(i * 1.7) * 12]);
    });
    return nodes;
  },
  drawMap(t) {
    const cv = $('#rm-canvas'); if (!cv || $('#roadmap').hidden || this.rmTab !== 'map') return;
    const c = cv.getContext('2d'), W = cv.width, H = cv.height;
    if (!this.parch || this.parch.width !== W) {
      this.parch = document.createElement('canvas'); this.parch.width = W; this.parch.height = H;
      const p = this.parch.getContext('2d');
      const g = p.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * .7); g.addColorStop(0, '#f1dfb8'); g.addColorStop(.7, '#dcc08e'); g.addColorStop(1, '#a8834e');
      p.fillStyle = g; p.fillRect(0, 0, W, H);
      for (let i = 0; i < 4000; i++) { p.fillStyle = `rgba(90,60,30,${Math.random() * .08})`; p.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
      // küçük süslemeler: dağlar, ağaçlar, deniz
      p.strokeStyle = 'rgba(90,60,30,.45)'; p.lineWidth = 2;
      for (let i = 0; i < 9; i++) { const x = 60 + i * 120 + (i % 2) * 30, y = H * (i % 2 ? .92 : .08); p.beginPath(); p.moveTo(x - 26, y + 14); p.lineTo(x, y - 18); p.lineTo(x + 26, y + 14); p.stroke(); p.beginPath(); p.moveTo(x - 8, y - 6); p.lineTo(x, y - 18); p.lineTo(x + 6, y - 8); p.stroke(); }
      for (let i = 0; i < 14; i++) { const x = Math.random() * W, y = Math.random() < .5 ? H * .05 + Math.random() * 20 : H * .95 - Math.random() * 20; p.fillStyle = 'rgba(70,90,40,.35)'; p.beginPath(); p.arc(x, y, 6, 0, 6.28); p.fill(); }
      p.strokeStyle = 'rgba(60,90,110,.35)'; for (let i = 0; i < 5; i++) { p.beginPath(); p.moveTo(W - 140, 40 + i * 12); p.quadraticCurveTo(W - 120, 34 + i * 12, W - 100, 40 + i * 12); p.stroke(); }
      p.font = 'italic 700 22px Cinzel, Georgia, serif'; p.fillStyle = 'rgba(90,50,20,.55)'; p.textAlign = 'right'; p.fillText('Demir Taç Diyarı', W - 30, H - 22);
      const v = p.createRadialGradient(W / 2, H / 2, W * .35, W / 2, H / 2, W * .75); v.addColorStop(0, 'rgba(60,30,10,0)'); v.addColorStop(1, 'rgba(60,30,10,.55)'); p.fillStyle = v; p.fillRect(0, 0, W, H);
    }
    c.drawImage(this.parch, 0, 0);
    const nodes = this.mapNodes(W, H), cur = this.currentMilestone();
    // yol
    c.lineCap = 'round';
    const path = (upto, style, wdt, dash) => {
      c.beginPath(); c.moveTo(nodes[0][0], nodes[0][1]);
      for (let i = 1; i <= upto && i < nodes.length; i++) { const [x0, y0] = nodes[i - 1], [x1, y1] = nodes[i]; const sameRow = Math.floor(i / 4) === Math.floor((i - 1) / 4);
        if (sameRow) c.bezierCurveTo(x0 + (x1 - x0) * .4, y0 - 30, x0 + (x1 - x0) * .6, y1 + 30, x1, y1);
        else { const side = x0 > W / 2 ? 1 : -1; c.bezierCurveTo(x0 + side * 110, y0, x1 + side * 110, y1, x1, y1); } }
      c.strokeStyle = style; c.lineWidth = wdt; c.setLineDash(dash); c.stroke(); c.setLineDash([]);
    };
    path(nodes.length - 1, 'rgba(90,60,30,.35)', 6, [10, 10]);
    if (cur > 0) path(Math.min(cur, nodes.length - 1), '#8c1f17', 6, []);
    // düğümler
    this.mapHits = [];
    nodes.forEach(([x, y], i) => {
      const m = MILESTONES[i], ok = m.test(G), isCur = i === cur, sel = this.rmSel === i;
      this.mapHits.push({ x, y, i });
      if (isCur) { const r = 30 + Math.sin(t * 4) * 5; c.strokeStyle = 'rgba(140,31,23,.5)'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, r, 0, 6.28); c.stroke(); }
      c.beginPath(); c.arc(x, y, 22, 0, 6.28);
      c.fillStyle = ok ? '#e2b25a' : isCur ? '#f6eedb' : '#c9b48a'; c.fill();
      c.lineWidth = sel ? 5 : 3; c.strokeStyle = ok ? '#7a4b10' : isCur ? '#8c1f17' : 'rgba(90,60,30,.6)'; c.stroke();
      c.fillStyle = ok ? '#3b2414' : isCur ? '#8c1f17' : 'rgba(90,60,30,.7)'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '900 20px Cinzel, Georgia, serif'; c.fillText(ok ? '✓' : String(i + 1), x, y + 1);
      c.textBaseline = 'alphabetic'; c.font = `${isCur ? 800 : 700} 16px Manrope, sans-serif`; c.fillStyle = ok || isCur ? '#3b2414' : 'rgba(70,45,20,.6)';
      c.fillText(m.n, x, y + 44);
      if (m.rec && !ok) { c.font = '600 13px Manrope, sans-serif'; c.fillStyle = 'rgba(90,60,30,.7)'; c.fillText(`Sv ${m.rec}+`, x, y + 62); }
    });
    // oyuncu işareti (bayrak)
    const [fx, fy] = nodes[Math.min(cur, nodes.length - 1)];
    c.strokeStyle = '#3b2414'; c.lineWidth = 3; c.beginPath(); c.moveTo(fx + 18, fy - 18); c.lineTo(fx + 18, fy - 62); c.stroke();
    c.fillStyle = '#8c1f17'; c.beginPath(); c.moveTo(fx + 18, fy - 62); c.lineTo(fx + 48 + Math.sin(t * 5) * 3, fy - 54); c.lineTo(fx + 18, fy - 44); c.fill();
  },
  mapClick(e) {
    const cv = $('#rm-canvas'), r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * cv.width / r.width, y = (e.clientY - r.top) * cv.height / r.height;
    const h = (this.mapHits || []).find(n => Math.hypot(n.x - x, n.y - y) < 32);
    if (h) { this.rmSel = h.i; SFX.click(); this.renderRoadmap(); }
  },
};

/* ---------- küçük çizimler: kupa ve yemek ---------- */
function drawTrophy(c, t, x, y, size, dim) {
  const k = size / 100; c.save(); c.translate(x, y); c.scale(k, k); if (dim) c.globalAlpha = .35;
  const g = c.createLinearGradient(-40, 0, 40, 0); g.addColorStop(0, shade(t.col, -.35)); g.addColorStop(.45, shade(t.col, .4)); g.addColorStop(1, shade(t.col, -.3));
  c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-34, -40); c.lineTo(34, -40); c.quadraticCurveTo(32, 10, 0, 16); c.quadraticCurveTo(-32, 10, -34, -40); c.fill(); c.stroke();
  c.lineWidth = 6; c.strokeStyle = shade(t.col, -.2); c.beginPath(); c.arc(-36, -22, 14, Math.PI * .5, Math.PI * 1.5); c.stroke(); c.beginPath(); c.arc(36, -22, 14, -Math.PI * .5, Math.PI * .5); c.stroke();
  c.fillStyle = g; c.fillRect(-7, 14, 14, 18); c.strokeStyle = OUT; c.lineWidth = 3; c.strokeRect(-7, 14, 14, 18);
  c.beginPath(); c.roundRect(-26, 32, 52, 14, 3); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-14, -22, 5, 14, -.2, 0, 6.28); c.fill();
  c.restore();
}
function drawFood(c, f, x, y, size) {
  const k = size / 100; c.save(); c.translate(x, y); c.scale(k, k); c.strokeStyle = OUT; c.lineWidth = 3;
  if (f.id === 'f_ale') {
    c.fillStyle = '#6b4325'; c.beginPath(); c.roundRect(-28, -30, 50, 66, 6); c.fill(); c.stroke();
    c.fillStyle = '#e8a33a'; c.fillRect(-22, -22, 38, 52); c.fillStyle = '#fff4dc'; c.beginPath(); c.ellipse(-3, -32, 30, 12, 0, 0, 6.28); c.fill(); c.stroke();
    c.lineWidth = 7; c.strokeStyle = '#6b4325'; c.beginPath(); c.arc(26, 2, 14, -1.3, 1.3); c.stroke();
  } else if (f.id === 'f_honey') {
    c.fillStyle = 'rgba(230,240,245,.5)'; c.beginPath(); c.moveTo(-24, -34); c.lineTo(24, -34); c.lineTo(18, 34); c.lineTo(-18, 34); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#e8a33a'; c.beginPath(); c.moveTo(-21, -14); c.lineTo(21, -14); c.lineTo(17, 31); c.lineTo(-17, 31); c.closePath(); c.fill();
    c.fillStyle = '#7aa03a'; c.beginPath(); c.ellipse(14, -38, 10, 5, -.5, 0, 6.28); c.fill();
  } else if (f.id === 'f_feast') {
    c.fillStyle = '#c9b08a'; c.beginPath(); c.ellipse(0, 18, 46, 14, 0, 0, 6.28); c.fill(); c.stroke();
    c.fillStyle = '#a0522d'; c.beginPath(); c.ellipse(-6, 4, 26, 18, -.3, 0, 6.28); c.fill(); c.stroke();
    c.fillStyle = '#f2efe6'; c.fillRect(14, -12, 18, 6); c.beginPath(); c.arc(34, -12, 5, 0, 6.28); c.arc(34, -6, 5, 0, 6.28); c.fill();
    c.fillStyle = '#c9302c'; c.beginPath(); c.arc(-30, 8, 8, 0, 6.28); c.fill(); c.fillStyle = '#7aa03a'; c.beginPath(); c.arc(28, 14, 7, 0, 6.28); c.fill();
  } else {
    c.fillStyle = '#6b4325'; c.beginPath(); c.moveTo(-40, -4); c.quadraticCurveTo(-36, 34, 0, 36); c.quadraticCurveTo(36, 34, 40, -4); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#a0522d'; c.beginPath(); c.ellipse(0, -4, 40, 10, 0, 0, 6.28); c.fill(); c.stroke();
    c.fillStyle = '#e8a33a'; c.beginPath(); c.arc(-10, -6, 5, 0, 6.28); c.arc(12, -4, 4, 0, 6.28); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3; [-12, 4, 18].forEach(sx => { c.beginPath(); c.moveTo(sx, -18); c.quadraticCurveTo(sx - 8, -30, sx, -42); c.stroke(); });
  }
  c.restore();
}
