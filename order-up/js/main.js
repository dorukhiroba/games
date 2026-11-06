/* Order Up! — boot, input, game loop, HUD. */
(function () {
  'use strict';
  const OU = window.OU;
  const { DISHES, DISH, Stats, upgradeList, makeLayout, route, collide, fmt, fmtTime, World, Game, viewFromSnap, SAVE_KEY, PROFILE_KEY, MAX_PLAYERS } = OU;

  const COLORS = [0xe4572e, 0x2f6f73, 0xf2c14e, 0x6c5b7b, 0x3fa7d6, 0x5aa36b, 0xd1495b, 0xe58fb6, 0x8a5a3b, 0x1b998b];
  const $ = id => document.getElementById(id);
  const hex = n => '#' + (n >>> 0).toString(16).padStart(6, '0');

  const S = {
    mode: null, game: null, view: null, myId: null, net: null,
    me: { x: 0, z: -3.6, ry: 0, moving: false },
    path: [], pendingAct: null, keys: new Set(),
    profile: { name: '', color: COLORS[0] },
    tab: 'menu', panelOpen: window.innerWidth > 720,
    netFx: [], lastSentPos: '', online: false,
  };

  /* ---------- storage (wrapped: private windows can throw) ---------- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  function loadSave() {
    let raw = null;
    try { raw = JSON.parse(store.get(SAVE_KEY) || 'null'); } catch (e) { raw = null; }
    return OU.migrate(raw);
  }
  function writeSave() {
    if (S.mode !== 'host' || !S.game) return;
    S.game.s.lastSeen = Date.now();
    store.set(SAVE_KEY, JSON.stringify(S.game.s));
  }

  /* ---------- menu ---------- */
  function initMenu() {
    try { Object.assign(S.profile, JSON.parse(store.get(PROFILE_KEY) || '{}')); } catch (e) { /* ignore */ }
    if (!S.profile.name) S.profile.name = 'Chef ' + ['Ada', 'Bo', 'Cem', 'Duru', 'Eli', 'Fen', 'Gus', 'Ida'][Math.floor(Math.random() * 8)];
    $('nameInput').value = S.profile.name;
    const sw = $('swatches');
    COLORS.forEach(c => {
      const b = document.createElement('button');
      b.style.background = hex(c); b.setAttribute('aria-label', 'Colour ' + hex(c));
      if (c === S.profile.color) b.classList.add('on');
      b.onclick = () => { S.profile.color = c; [...sw.children].forEach(x => x.classList.remove('on')); b.classList.add('on'); };
      sw.appendChild(b);
    });
    const sv = loadSave();
    if (sv.served > 0 || sv.lifeEarned > 0) {
      $('saveSummary').textContent = `Your restaurant: $${fmt(sv.money)} in the till · ${sv.served} guests served${sv.stars ? ` · ★ ${sv.stars}` : ''}`;
    } else $('saveSummary').textContent = 'Starts with a grill and two tables. Progress saves in this browser.';
    const qp = new URLSearchParams(location.search).get('join');
    if (qp && $('codeInput')) { $('codeInput').value = qp.toUpperCase().slice(0, 5); $('joinBtn').classList.add('primary'); }
    $('hostBtn').onclick = () => { saveProfile(); startHost(); };
    if ($('joinBtn')) {
      $('joinBtn').onclick = () => { saveProfile(); startClient($('codeInput').value.trim().toUpperCase()); };
      $('codeInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('joinBtn').click(); });
    }
    $('resetBtn').onclick = () => {
      modal('<div class="em">🧹</div><h2>Reset your restaurant?</h2><p>This wipes your money, upgrades and stars in this browser. It can’t be undone.</p>', [
        ['Cancel', null],
        ['Reset', () => { store.del(SAVE_KEY); location.reload(); }, 'primary'],
      ]);
    };
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touch');
    if (window.KQuit) $('quitSlot').append(KQuit.button('link small'));
  }
  function saveProfile() {
    S.profile.name = ($('nameInput').value || 'Chef').trim().slice(0, 16) || 'Chef';
    store.set(PROFILE_KEY, JSON.stringify(S.profile));
  }

  /* ---------- host ---------- */
  function startHost() {
    const save = loadSave();
    if (!save.code) save.code = OU.randomCode();
    // offline earnings from hired staff
    const away = (Date.now() - (save.lastSeen || Date.now())) / 1000;
    let offline = 0;
    if (away > 60 && save.botRate > 0 && save.up.staff > 0) {
      offline = Math.min(away, 4 * 3600) * save.botRate * 0.5;
      save.money += offline; save.runEarned += offline; save.lifeEarned += offline;
    }
    S.mode = 'host';
    S.game = new Game(save);
    S.myId = 'host';
    S.game.addPlayer('host', S.profile.name, S.profile.color);
    const hp = S.game.players.host; S.me.x = hp.x; S.me.z = hp.z;
    enterGame();
    $('roomCode').textContent = save.code;
    writeSave();
    if (offline > 0) {
      modal(`<div class="em">🌙</div><h2>Welcome back!</h2><p>Your staff kept the kitchen running for <b>${fmtTime(Math.min(away, 4 * 3600))}</b>.</p><p style="font-size:28px;font-weight:900;color:var(--leaf)">+$${fmt(offline)}</p>`, [['Nice!', null, 'primary']]);
    }

    S.net = new OU.HostNet({
      onJoin: (pid, hello) => {
        const p = S.game.addPlayer(pid, hello.name, hello.color);
        S.net.send(pid, { t: 'welcome', id: pid, code: S.game.s.code });
        toast(`👋 ${p.name} joined the kitchen`);
        S.game.fx.push({ k: 'toast', t: `👋 ${p.name} joined the kitchen`, skipHost: true });
      },
      onLeave: pid => {
        const p = S.game.players[pid];
        if (p) { toast(`${p.name} left`); S.game.fx.push({ k: 'toast', t: `${p.name} left`, skipHost: true }); }
        S.game.removePlayer(pid);
      },
      onData: (pid, m) => {
        if (m.t === 'pos') S.game.setPlayerPos(pid, m.x, m.z, m.ry, m.mv);
        else if (m.t === 'act') S.game.playerAct(pid, m.target);
        else if (m.t === 'buy') {
          const item = S.game.buy(String(m.key));
          if (item) {
            const p = S.game.players[pid];
            S.game.fx.push({ k: 'buy', who: p ? p.name : 'A friend', t: item.title, icon: item.icon });
            if (item.key === 'up:expand') World.resetCamera();
          }
        }
      },
      onStatus: (text, online) => { S.online = online; $('netText').textContent = text === 'Online' ? '' : text; $('netDot').classList.toggle('on', online); },
    });
    if (!window.OU_PREVIEW) S.net.start(save.code, code => { S.game.s.code = code; $('roomCode').textContent = code; writeSave(); });

    // simulation at 20 Hz, independent of rendering (keeps running at reduced rate in background tabs)
    let last = performance.now(), netTick = 0, saveT = 0;
    ticker(() => {
      const now = performance.now();
      let dt = Math.min(5, (now - last) / 1000); last = now;
      S.game.setPlayerPos('host', S.me.x, S.me.z, S.me.ry, S.me.moving);
      while (dt > 0) { const step = Math.min(dt, 0.05); S.game.tick(step); dt -= step; }
      const snap = S.game.snapshot();
      S.netFx.push(...snap.fx.filter(f => !f.local));
      handleFx(snap.fx.filter(f => !f.skipHost));
      S.view = viewFromSnap(snap);
      if (++netTick % 2 === 0 && S.net.count()) {
        snap.fx = S.netFx.splice(0).filter(f => !f.hostOnly);
        S.net.broadcast(snap);
      } else if (netTick % 2 === 0) S.netFx.length = 0;
      saveT += 0.05;
      if (saveT > 5) { saveT = 0; writeSave(); }
    }, 50);
    window.addEventListener('beforeunload', writeSave);
    document.addEventListener('visibilitychange', () => { if (document.hidden) writeSave(); });
  }

  // A timer that keeps firing when the tab is in the background (worker timers
  // aren't throttled like the page's), so the host keeps serving friends.
  function ticker(fn, ms) {
    let fallback = null;
    const useInterval = () => { if (!fallback) fallback = setInterval(fn, ms); };
    try {
      const src = URL.createObjectURL(new Blob([`setInterval(function(){postMessage(0)},${ms});`], { type: 'text/javascript' }));
      const w = new Worker(src);
      w.onmessage = fn;
      w.onerror = () => { w.terminate(); useInterval(); };
    } catch (e) { useInterval(); }
  }

  /* ---------- client ---------- */
  async function startClient(code) {
    if (!/^[A-Z0-9]{5}$/.test(code)) { $('menuStatus').textContent = 'Room codes are 5 letters/numbers.'; return; }
    $('menuStatus').textContent = 'Knocking on the kitchen door…';
    $('joinBtn').disabled = $('hostBtn').disabled = true;
    S.mode = 'client';
    let welcomed = false;
    S.net = new OU.ClientNet({
      onData: m => {
        if (m.t === 'welcome') { S.myId = m.id; welcomed = true; $('roomCode').textContent = m.code; }
        else if (m.t === 'full') { leaveWith(`<div class="em">🚪</div><h2>Kitchen’s full</h2><p>That restaurant already has ${MAX_PLAYERS} chefs.</p>`); }
        else if (m.t === 'snap') {
          S.lastSnapAt = performance.now();
          const first = !S.view;
          S.view = viewFromSnap(m);
          handleFx(m.fx || []);
          if (first || !S.placed) {
            const p = S.view.players.find(x => x.id === S.myId);
            if (p) { S.me.x = p.x; S.me.z = p.z; S.placed = true; }
          }
          if (first) enterGame();
        }
      },
      onClose: reason => { if (S.mode === 'client') leaveWith(`<div class="em">🌙</div><h2>Disconnected</h2><p>${reason}</p>`); },
    });
    try {
      await S.net.join(code);
      S.net.send({ t: 'hello', name: S.profile.name, color: S.profile.color });
      $('menuStatus').textContent = 'Connected — getting your apron…';
      setTimeout(() => { if (!welcomed) { $('menuStatus').textContent = 'The owner didn’t answer. Try again?'; $('joinBtn').disabled = $('hostBtn').disabled = false; } }, 8000);
      $('netDot').classList.add('on'); S.online = true;
      setInterval(() => {
        if (S.mode === 'client' && S.lastSnapAt && performance.now() - S.lastSnapAt > 10000)
          leaveWith('<div class="em">🌙</div><h2>Lost the kitchen</h2><p>The owner stopped responding — their tab may have closed or gone to sleep.</p>');
      }, 1000);
      setInterval(() => {
        if (!S.myId) return;
        const k = `${S.me.x.toFixed(2)},${S.me.z.toFixed(2)},${S.me.ry.toFixed(1)},${S.me.moving}`;
        if (k !== S.lastSentPos) { S.lastSentPos = k; S.net.send({ t: 'pos', x: +S.me.x.toFixed(2), z: +S.me.z.toFixed(2), ry: +S.me.ry.toFixed(2), mv: S.me.moving ? 1 : 0 }); }
      }, 66);
    } catch (e) {
      S.mode = null;
      $('menuStatus').textContent = e.message;
      $('joinBtn').disabled = $('hostBtn').disabled = false;
    }
  }
  function leaveWith(html) {
    S.mode = 'gone';
    try { S.net && S.net.destroy(); } catch (e) { /* ignore */ }
    modal(html, [['Back to menu', () => { location.href = location.pathname; }, 'primary']], true);
  }

  /* ---------- shared game screen ---------- */
  let entered = false;
  function enterGame() {
    if (entered) return;
    entered = true;
    $('menu').classList.add('hidden');
    $('hud').classList.remove('hidden');
    // Esc menu with "Quit to games" (arcade site only). The kitchen keeps running behind it.
    if (window.KQuit && KQuit.onSite) { KQuit.menu(); document.body.classList.add('has-kquit'); }
    World.init($('game'));
    bindInput();
    bindPanel();
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (S.view) {
        moveLocal(dt);
        World.sync(S.view, S.myId, S.me, dt);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    setInterval(updateHud, 250);
    updateHud();
  }

  /* ---------- effects from the simulation ---------- */
  function handleFx(list) {
    for (const f of list) {
      if (f.k === 'money') World.popup('+$' + fmt(f.a), f.x, f.z, '#f2c14e');
      else if (f.k === 'angry') World.emojiPop('😠', f.x, f.z);
      else if (f.k === 'toast') toast(f.t);
      else if (f.k === 'buy') toast(`${f.icon || '✨'} ${f.who} bought: ${f.t}`);
    }
  }

  /* ---------- local movement ---------- */
  function moveLocal(dt) {
    const s = S.view.s, L = makeLayout(s.up.expand);
    let dx = 0, dz = 0;
    const k = S.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) dz -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) dz += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) dx -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) dx += 1;
    if (dx || dz) { S.path = []; S.pendingAct = null; }
    else if (S.path.length) {
      const wp = S.path[0];
      const ex = wp.x - S.me.x, ez = wp.z - S.me.z, d = Math.hypot(ex, ez);
      const arrive = S.path.length === 1 ? (wp.r || 0.12) : 0.25;
      if (d < arrive) {
        S.path.shift();
        if (!S.path.length && S.pendingAct) { doAct(S.pendingAct); S.pendingAct = null; }
      } else { dx = ex / d; dz = ez / d; }
    }
    const len = Math.hypot(dx, dz);
    S.me.moving = len > 0;
    if (len > 0) {
      dx /= len; dz /= len;
      const sp = Stats.playerSpeed(s);
      const before = { x: S.me.x, z: S.me.z };
      S.me.x += dx * sp * dt; S.me.z += dz * sp * dt;
      S.me.ry = Math.atan2(dx, dz);
      collide(L, S.me, 0.3, s.up.tables);
      // drop a click-path that has stopped making progress
      if (S.path.length && Math.hypot(S.me.x - before.x, S.me.z - before.z) < sp * dt * 0.15) {
        S.stuckT = (S.stuckT || 0) + dt;
        if (S.stuckT > 0.6) { S.path.shift(); S.stuckT = 0; }
      } else S.stuckT = 0;
    }
  }

  function nearest(L, s, x, z) {
    let best = null, bd = 1.6;
    DISHES.forEach(d => {
      if (!s.dishes[d.id].unlocked) return;
      const st = L.stations[d.index];
      const dd = Math.hypot(st.fx - x, st.fz - z);
      if (dd < bd) { bd = dd; best = { kind: 'station', id: d.id }; }
    });
    const dt = Math.hypot(L.trash.x - x, L.trash.z - z);
    if (dt < Math.min(bd, 1.4)) best = { kind: 'trash' };
    return best;
  }

  function doAct(target) {
    if (!target) return;
    if (S.mode === 'host') S.game.interact(S.game.players.host, target, true);
    else if (S.mode === 'client') S.net.send({ t: 'act', target });
  }
  function useNearest() {
    if (!S.view) return;
    const L = makeLayout(S.view.s.up.expand);
    const t = nearest(L, S.view.s, S.me.x, S.me.z);
    if (t) doAct(t);
  }

  function myCarry() {
    const p = S.view && S.view.players.find(x => x.id === S.myId);
    return p ? p.carry : [];
  }

  /* ---------- input ---------- */
  function bindInput() {
    window.addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'INPUT')) return;
      if (['KeyE', 'Space', 'Enter'].includes(e.code)) { e.preventDefault(); if (!e.repeat) useNearest(); return; }
      if (e.code === 'KeyU') { togglePanel(); return; }
      if (e.code.startsWith('Arrow') || ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) { e.preventDefault(); S.keys.add(e.code); }
    });
    window.addEventListener('keyup', e => S.keys.delete(e.code));
    window.addEventListener('blur', () => S.keys.clear());
    const canvas = document.querySelector('#game canvas');
    let down = null;
    const touches = new Map();
    let pinchD = 0;
    canvas.addEventListener('pointerdown', e => {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      down = touches.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
      if (touches.size === 2) { const [a, b] = [...touches.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); }
    });
    canvas.addEventListener('pointermove', e => {
      if (!touches.has(e.pointerId)) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchD > 0 && d > 0) World.zoomBy(pinchD / d);
        pinchD = d;
      }
    });
    const lift = e => { touches.delete(e.pointerId); if (touches.size < 2) pinchD = 0; };
    canvas.addEventListener('pointercancel', lift);
    canvas.addEventListener('pointerup', e => {
      lift(e);
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 12) return;
      onClickWorld(World.pick(e.clientX, e.clientY));
    });
    canvas.addEventListener('wheel', e => { e.preventDefault(); World.zoomBy(e.deltaY > 0 ? 1.08 : 1 / 1.08); }, { passive: false });
    $('actBtn').addEventListener('click', useNearest);
  }
  function onClickWorld(hit) {
    if (!hit || !S.view) return;
    const s = S.view.s, L = makeLayout(s.up.expand);
    const go = (to, r) => { S.path = route(L, S.me, to); S.path[S.path.length - 1].r = r || 0.12; };
    S.pendingAct = null;
    if (hit.kind === 'station') {
      if (!s.dishes[hit.id].unlocked) { openPanel('menu'); toast(`🔒 ${DISH[hit.id].name} unlocks in the Menu tab`); return; }
      const st = L.stations[DISH[hit.id].index];
      const target = { kind: 'station', id: hit.id };
      if (Math.hypot(st.fx - S.me.x, st.fz - S.me.z) < 1.5) { doAct(target); S.path = []; return; }
      go({ x: st.fx, z: st.fz }, 0.35); S.pendingAct = target;
    } else if (hit.kind === 'trash') {
      go({ x: L.trash.x - 0.85, z: L.trash.z }, 0.3); S.pendingAct = { kind: 'trash' };
      if (Math.hypot(L.trash.x - S.me.x, L.trash.z - S.me.z) < 1.3) { doAct({ kind: 'trash' }); S.path = []; S.pendingAct = null; }
    } else if (hit.kind === 'customer') {
      const c = S.view.customers.find(x => x.id === hit.id);
      if (c) go({ x: c.x + 0.6, z: c.z }, 0.6);
    } else if (hit.kind === 'table') {
      const t = L.tables[hit.index];
      go({ x: t.aisleX - 0.15, z: t.z }, 0.4);
    } else if (hit.kind === 'floor') {
      go({ x: hit.x, z: hit.z }, 0.15);
    }
  }

  /* ---------- upgrades panel ---------- */
  function bindPanel() {
    document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => openPanel(b.dataset.tab));
    $('panelToggle').onclick = togglePanel;
    $('panelClose').onclick = togglePanel;
    setPanel(S.panelOpen);
  }
  function setPanel(open) {
    S.panelOpen = open;
    $('panel').classList.toggle('hidden', !open);
    $('panelToggle').classList.toggle('hidden', open);
    if (open) renderPanel(true);
  }
  function togglePanel() { setPanel(!S.panelOpen); }
  function openPanel(tab) {
    S.tab = tab;
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    setPanel(true);
    renderPanel(true);
  }
  let panelKey = '';
  function renderPanel(force) {
    if (!S.panelOpen || !S.view) return;
    const s = S.view.s;
    const box = $('upgrades');
    if (S.tab === 'franchise') { renderFranchise(box, s, force); return; }
    const items = upgradeList(s).filter(u => u.tab === S.tab);
    const key = S.tab + '|' + items.map(u => u.key + u.level + u.cost + u.desc).join('|');
    if (key !== panelKey || force) {
      panelKey = key;
      box.innerHTML = '';
      let lastIcon = null;
      items.forEach(u => {
        if (S.tab === 'menu' && u.icon !== lastIcon) {
          const h = document.createElement('div'); h.className = 'section-title';
          const d = DISHES.find(x => x.emoji === u.icon);
          h.textContent = d ? `${u.icon} ${d.name}` : u.icon;
          box.appendChild(h); lastIcon = u.icon;
        }
        const row = document.createElement('div');
        row.className = 'up'; row.dataset.key = u.key; row.dataset.cost = u.cost === null ? '' : u.cost;
        const lvl = u.level === null || u.level === undefined ? '' : `<em>${typeof u.level === 'number' ? 'Lv ' + u.level : u.level}</em>`;
        row.innerHTML = `<div class="ic"></div><div><div class="tt"></div><div class="ds"></div></div>`;
        row.querySelector('.ic').textContent = u.icon;
        row.querySelector('.tt').textContent = u.title; row.querySelector('.tt').insertAdjacentHTML('beforeend', lvl);
        row.querySelector('.ds').textContent = u.desc;
        if (u.cost === null) {
          const m = document.createElement('span'); m.className = 'maxed'; m.textContent = u.level === 'ON' ? 'Active' : 'Maxed'; row.appendChild(m);
        } else {
          const b = document.createElement('button'); b.className = 'btn'; b.textContent = '$' + fmt(u.cost);
          b.onclick = () => buy(u.key);
          row.appendChild(b);
        }
        box.appendChild(row);
      });
    }
    // affordability refresh without rebuilding
    box.querySelectorAll('.up').forEach(row => {
      const c = row.dataset.cost; const b = row.querySelector('.btn');
      if (!b || c === '') return;
      const can = s.money >= +c;
      b.disabled = !can; b.classList.toggle('go', can); row.classList.toggle('can', can);
    });
  }
  function renderFranchise(box, s, force) {
    const pend = Stats.pendingStars(s);
    const key = `fr|${s.stars}|${pend}|${Math.floor(s.runEarned)}|${s.served}|${S.mode}`;
    if (key === panelKey && !force) return;
    panelKey = key;
    const nextAt = Math.pow(pend + 1, 2) * 100000;
    box.innerHTML = `
      <div class="fr">
        <div class="big-stars">★ ${s.stars}</div>
        <p>Each franchise star adds <b>+15%</b> to everything you earn. Current bonus: <b>x${Stats.starMult(s).toFixed(2)}</b></p>
        <p>Opening a new franchise resets money, menu, room and staff — and gives you <b>★ ${pend}</b> ${pend === 1 ? 'star' : 'stars'} to keep forever.</p>
        <p class="muted small">Next star at $${fmt(nextAt)} earned this run.</p>
        ${S.mode === 'host'
          ? `<button id="frBtn" class="btn ${pend ? 'primary' : ''}" ${pend ? '' : 'disabled'}>Open a new franchise (+★ ${pend})</button>`
          : `<p class="muted small">Only the restaurant’s owner can open a franchise.</p>`}
      </div>
      <div class="fr stats">
        <span>Earned this run</span><b>$${fmt(s.runEarned)}</b>
        <span>Earned all time</span><b>$${fmt(s.lifeEarned)}</b>
        <span>Guests served</span><b>${s.served.toLocaleString('en-US')}</b>
        <span>Franchises opened</span><b>${s.franchises || 0}</b>
      </div>`;
    const b = $('frBtn');
    if (b) b.onclick = () => modal(`<div class="em">⭐</div><h2>Open a new franchise?</h2><p>You’ll start over with <b>★ ${s.stars + pend}</b> and <b>x${(1 + 0.15 * (s.stars + pend)).toFixed(2)}</b> income.</p>`, [
      ['Not yet', null],
      ['Open it', () => { if (S.game.franchise()) { writeSave(); World.resetCamera(); panelKey = ''; } }, 'primary'],
    ]);
  }
  function buy(key) {
    if (S.mode === 'host') {
      const item = S.game.buy(key);
      if (item) {
        S.game.fx.push({ k: 'buy', who: S.profile.name, t: item.title, icon: item.icon, skipHost: true });
        if (key === 'up:expand') World.resetCamera();
        writeSave();
        // refresh view immediately so the panel updates without waiting a tick
        const snap = S.game.snapshot(); S.netFx.push(...snap.fx); handleFx(snap.fx.filter(f => !f.skipHost)); S.view = viewFromSnap(snap);
        renderPanel(true);
      }
    } else S.net.send({ t: 'buy', key });
  }

  /* ---------- HUD ---------- */
  function updateHud() {
    if (!S.view) return;
    const s = S.view.s;
    $('money').textContent = '$' + fmt(s.money);
    $('rate').textContent = '$' + fmt((S.view.rate || 0) * 60) + '/min';
    $('stars').textContent = '★ ' + s.stars;
    const pl = $('playerList');
    const pk = S.view.players.map(p => p.id + p.name + p.color).join('|') + S.online;
    if (pl.dataset.k !== pk) {
      pl.dataset.k = pk; pl.innerHTML = '';
      S.view.players.forEach(p => {
        const sp = document.createElement('span');
        const i = document.createElement('i'); i.style.background = hex(p.color);
        sp.appendChild(i); sp.appendChild(document.createTextNode(p.name + (p.id === S.myId ? ' (you)' : '')));
        pl.appendChild(sp);
      });
      const c = document.createElement('span'); c.textContent = `${S.view.players.length}/${MAX_PLAYERS}`; c.style.paddingLeft = '9px';
      pl.appendChild(c);
    }
    renderPanel(false);
    updateHint();
  }
  function updateHint() {
    const s = S.view.s, L = makeLayout(s.up.expand);
    const t = nearest(L, s, S.me.x, S.me.z);
    const carry = myCarry();
    const cap = Stats.trayCap(s);
    let txt = '';
    if (t && t.kind === 'station') {
      const d = DISH[t.id], st = S.view.stations[t.id];
      if (st.stock > 0 && carry.length < cap) txt = `E · Pick up ${d.emoji} ${d.name}`;
      else if (st.progress >= 0) txt = `Cooking ${d.emoji}… ${Math.round(st.progress * 100)}%`;
      else if (st.stock < Stats.stockCap(s, t.id)) txt = `E · Start cooking ${d.emoji} ${d.name}`;
      else txt = carry.length >= cap ? 'Hands full — serve a guest first' : `${d.emoji} tray is full`;
    } else if (t && t.kind === 'trash') txt = carry.length ? 'E · Throw away what you’re holding' : 'Bin';
    else if (carry.length) {
      const wanted = S.view.customers.some(c => c.state === 1 && c.order.some((o, i) => !c.got[i] && carry.includes(o)));
      txt = wanted ? `Walk up to a guest who ordered ${carry.map(c => DISH[c].emoji).join('')}` : 'Nobody wants that right now — the bin is by the pass';
    } else if (S.view.customers.some(c => c.state === 1)) {
      const c = S.view.customers.find(x => x.state === 1);
      const need = c.order.find((o, i) => !c.got[i]);
      txt = need ? `A guest wants ${DISH[need].emoji} — head to the ${DISH[need].name.toLowerCase()} station` : '';
    } else txt = 'Waiting for guests… upgrade Marketing to bring more in';
    if ($('hint').textContent !== txt) $('hint').textContent = txt;
    const ab = $('actBtn');
    const lbl = t ? (t.kind === 'trash' ? '🗑️' : DISH[t.id].emoji) : 'E';
    if (ab.textContent !== lbl) ab.textContent = lbl;
  }

  /* ---------- toasts & modal ---------- */
  function toast(text) {
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = text;
    const box = $('toasts');
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => el.remove(), 3200);
  }
  function modal(html, actions, sticky) {
    $('modalBody').innerHTML = html;
    const a = $('modalActions'); a.innerHTML = '';
    actions.forEach(([label, fn, cls]) => {
      const b = document.createElement('button');
      b.className = 'btn ' + (cls || ''); b.textContent = label;
      b.onclick = () => { if (!sticky) $('modal').classList.add('hidden'); if (fn) fn(); };
      a.appendChild(b);
    });
    $('modal').classList.remove('hidden');
  }

  $('inviteBtn') && ($('inviteBtn').onclick = async () => {
    const code = $('roomCode').textContent;
    const isWeb = location.protocol.startsWith('http');
    const text = isWeb ? `${location.origin}${location.pathname}?join=${code}` : code;
    try { await navigator.clipboard.writeText(text); toast(isWeb ? '📋 Invite link copied' : `📋 Room code ${code} copied`); }
    catch (e) { modal(`<h2>Invite friends</h2><p>Share this ${isWeb ? 'link' : 'code'}:</p><p style="user-select:all;font-weight:800;word-break:break-all">${text}</p>`, [['Done', null, 'primary']]); }
  });

  initMenu();
  window.__OU_STATE = S; // handy for debugging in the console
})();
