/* Order Up! — shared definitions: dishes, upgrades, layout, helpers.
   Loaded as a classic script so the game also runs straight from file://. */
(function () {
  'use strict';

  const MAX_PLAYERS = 10;
  const SAVE_KEY = 'orderup.save.v1';
  const PROFILE_KEY = 'orderup.profile.v1';
  const PEER_PREFIX = 'orderup-kitchen-v1-';

  const DISHES = [
    { id: 'burger',   name: 'Burger',    emoji: '🍔', price: 5,    cook: 3.0, unlock: 0,       color: 0xc8743a },
    { id: 'soda',     name: 'Soda',      emoji: '🥤', price: 3,    cook: 1.6, unlock: 40,      color: 0x3fa7d6 },
    { id: 'fries',    name: 'Fries',     emoji: '🍟', price: 9,    cook: 4.0, unlock: 300,     color: 0xf2c14e },
    { id: 'pizza',    name: 'Pizza',     emoji: '🍕', price: 32,   cook: 7.0, unlock: 3000,    color: 0xd64933 },
    { id: 'sushi',    name: 'Sushi',     emoji: '🍣', price: 140,  cook: 9.0, unlock: 40000,   color: 0x5aa36b },
    { id: 'icecream', name: 'Ice Cream', emoji: '🍦', price: 600,  cook: 6.0, unlock: 500000,  color: 0xe58fb6 },
  ];
  const DISH = {};
  DISHES.forEach((d, i) => { d.index = i; DISH[d.id] = d; });

  const EXPAND_COSTS = [2500, 75000, 2500000];
  const TRAY_COSTS = [200, 5000, 120000];
  const SIZES = [{ w: 14, d: 9 }, { w: 18, d: 12 }, { w: 22, d: 15 }, { w: 26, d: 18 }];

  function defaultSave() {
    const dishes = {};
    DISHES.forEach(d => { dishes[d.id] = { unlocked: d.unlock === 0, price: 0, speed: 0, cap: 0, auto: false }; });
    return {
      v: 1,
      money: 0,
      runEarned: 0,
      lifeEarned: 0,
      stars: 0,
      franchises: 0,
      served: 0,
      dishes,
      up: { tables: 2, expand: 0, marketing: 0, decor: 0, tray: 0, shoes: 0, staff: 0, staffSpeed: 0 },
      botRate: 0,
      lastSeen: Date.now(),
      code: null,
    };
  }

  // Fill in any fields a save from an older version is missing.
  function migrate(s) {
    const d = defaultSave();
    if (!s || typeof s !== 'object') return d;
    const out = Object.assign({}, d, s);
    out.up = Object.assign({}, d.up, s.up || {});
    out.dishes = {};
    DISHES.forEach(x => { out.dishes[x.id] = Object.assign({}, d.dishes[x.id], (s.dishes || {})[x.id] || {}); });
    out.dishes.burger.unlocked = true;
    ['money', 'runEarned', 'lifeEarned', 'stars', 'served', 'botRate'].forEach(k => {
      if (typeof out[k] !== 'number' || !isFinite(out[k])) out[k] = 0;
    });
    return out;
  }

  /* ---------- derived stats ---------- */
  const Stats = {
    starMult: s => 1 + 0.15 * s.stars,
    dishPrice: (s, id) => DISH[id].price * Math.pow(1.2, s.dishes[id].price),
    cookTime: (s, id) => Math.max(0.35, DISH[id].cook * Math.pow(0.88, s.dishes[id].speed)),
    stockCap: (s, id) => 1 + s.dishes[id].cap,
    spawnInterval: s => Math.max(0.7, 7 * Math.pow(0.9, s.up.marketing)),
    patience: (s, items) => (26 + 9 * items) * (1 + 0.08 * s.up.decor),
    tipBonus: s => 0.5 * (1 + 0.1 * s.up.decor),
    trayCap: s => 1 + s.up.tray,
    playerSpeed: s => 4.6 * Math.pow(1.07, s.up.shoes),
    botSpeed: s => 3.2 * Math.pow(1.1, s.up.staffSpeed),
    maxTables: s => makeLayout(s.up.expand).tables.length,
    pendingStars: s => Math.floor(Math.sqrt(s.runEarned / 100000)),
    unlockedDishes: s => DISHES.filter(d => s.dishes[d.id].unlocked),
  };

  /* ---------- upgrade catalogue ----------
     Each entry: { key, tab, title, desc, level, cost (null = maxed), icon } */
  function upgradeList(s) {
    const out = [];
    let prevUnlocked = true;
    DISHES.forEach(d => {
      const ds = s.dishes[d.id];
      if (!ds.unlocked) {
        if (prevUnlocked) {
          out.push({ key: `dish:${d.id}:unlock`, tab: 'menu', icon: d.emoji, title: `Add ${d.name} to the menu`,
            desc: `New station · sells for $${fmt(d.price)}`, level: null, cost: d.unlock * 1 });
        }
        prevUnlocked = false;
        return;
      }
      prevUnlocked = true;
      out.push({ key: `dish:${d.id}:price`, tab: 'menu', icon: d.emoji, title: `${d.name} recipe`,
        desc: `Sells for $${fmt(Stats.dishPrice(s, d.id))} → $${fmt(DISH[d.id].price * Math.pow(1.2, ds.price + 1))}`,
        level: ds.price, cost: ds.price >= 60 ? null : Math.ceil(d.price * 6 * Math.pow(1.34, ds.price)) });
      out.push({ key: `dish:${d.id}:speed`, tab: 'menu', icon: d.emoji, title: `${d.name} station speed`,
        desc: `Cooks in ${Stats.cookTime(s, d.id).toFixed(1)}s`,
        level: ds.speed, cost: ds.speed >= 18 ? null : Math.ceil(d.price * 10 * Math.pow(1.55, ds.speed)) });
      out.push({ key: `dish:${d.id}:cap`, tab: 'menu', icon: d.emoji, title: `${d.name} warming tray`,
        desc: `Holds ${Stats.stockCap(s, d.id)} ready`,
        level: ds.cap, cost: ds.cap >= 5 ? null : Math.ceil(d.price * 25 * Math.pow(2.4, ds.cap)) });
      out.push({ key: `dish:${d.id}:auto`, tab: 'menu', icon: d.emoji, title: `${d.name} auto-cook`,
        desc: ds.auto ? 'Station keeps cooking on its own' : 'Station refills itself until the tray is full',
        level: ds.auto ? 'ON' : null, cost: ds.auto ? null : Math.ceil(d.price * 60 + 100) });
    });

    const u = s.up;
    const maxT = Stats.maxTables(s);
    out.push({ key: 'up:tables', tab: 'place', icon: '🪑', title: 'Add a table',
      desc: u.tables >= maxT ? (u.expand < 3 ? 'Room is full — expand to fit more' : 'Every seat is in use') : `${u.tables} / ${maxT} tables`,
      level: u.tables, cost: u.tables >= maxT ? null : Math.ceil(30 * Math.pow(1.62, u.tables - 2)) });
    out.push({ key: 'up:expand', tab: 'place', icon: '🏗️', title: 'Expand the restaurant',
      desc: u.expand >= 3 ? 'Biggest building on the street' : `Bigger room · up to ${makeLayout(u.expand + 1).tables.length} tables`,
      level: u.expand, cost: u.expand >= 3 ? null : EXPAND_COSTS[u.expand] });
    out.push({ key: 'up:marketing', tab: 'place', icon: '📣', title: 'Marketing',
      desc: `A guest every ~${Stats.spawnInterval(s).toFixed(1)}s`,
      level: u.marketing, cost: u.marketing >= 25 ? null : Math.ceil(60 * Math.pow(1.55, u.marketing)) });
    out.push({ key: 'up:decor', tab: 'place', icon: '🪴', title: 'Decor',
      desc: `Guests wait longer and tip more (+${u.decor * 8}% patience)`,
      level: u.decor, cost: u.decor >= 20 ? null : Math.ceil(150 * Math.pow(1.75, u.decor)) });

    out.push({ key: 'up:tray', tab: 'staff', icon: '🍽️', title: 'Bigger serving tray',
      desc: `Every chef carries ${Stats.trayCap(s)} dish${Stats.trayCap(s) > 1 ? 'es' : ''}`,
      level: u.tray, cost: u.tray >= 3 ? null : TRAY_COSTS[u.tray] });
    out.push({ key: 'up:shoes', tab: 'staff', icon: '👟', title: 'Kitchen sneakers',
      desc: 'Every chef walks faster', level: u.shoes, cost: u.shoes >= 12 ? null : Math.ceil(100 * Math.pow(1.8, u.shoes)) });
    out.push({ key: 'up:staff', tab: 'staff', icon: '🧑‍🍳', title: 'Hire a cook',
      desc: 'Cooks and serves on their own — earns while you are away', level: u.staff,
      cost: u.staff >= 8 ? null : Math.ceil(250 * Math.pow(3, u.staff)) });
    out.push({ key: 'up:staffSpeed', tab: 'staff', icon: '⚡', title: 'Staff training',
      desc: 'Hired cooks move faster', level: u.staffSpeed,
      cost: u.staffSpeed >= 15 ? null : Math.ceil(900 * Math.pow(1.9, u.staffSpeed)) });
    return out;
  }

  /* ---------- layout ---------- */
  function makeLayout(level) {
    const sz = SIZES[Math.max(0, Math.min(3, level | 0))];
    const W = sz.w, D = sz.d;
    const L = { level, W, D, backZ: -6, counterZ: -2.6, gap: 1.7, corridorZ: -1.1 };
    L.stations = DISHES.map((d, i) => {
      const x = (i - (DISHES.length - 1) / 2) * 2.15;
      return { id: d.id, x, z: -5.1, fx: x, fz: -4.05 };
    });
    L.trash = { x: W / 2 - 0.9, z: -3.6 };
    const cols = Math.floor((W - 4) / 3.4) + 1;
    const rows = Math.floor((D - 3.5) / 3.0) + 1;
    L.tables = [];
    // fill front-to-back by rows nearest the kitchen first, centre columns first
    const colOrder = [];
    for (let c = 0; c < cols; c++) colOrder.push(c);
    colOrder.sort((a, b) => Math.abs(a - (cols - 1) / 2) - Math.abs(b - (cols - 1) / 2) || a - b);
    for (let r = 0; r < rows; r++) {
      colOrder.forEach(c => {
        const x = (c - (cols - 1) / 2) * 3.4 - 0.85;
        const z = 1.0 + r * 3.0;
        L.tables.push({ x, z, seatX: x + 0.95, seatZ: z, aisleX: x + 1.7 });
      });
    }
    const firstX = (0 - (cols - 1) / 2) * 3.4 - 0.85;
    L.aisles = [firstX - 1.7];
    for (let c = 0; c < cols; c++) L.aisles.push(firstX + c * 3.4 + 1.7);
    L.door = { x: 0, z: D + 0.6 };
    L.spawn = { x: 0, z: D - 1.2 };
    // static box obstacles
    L.boxes = [
      { x0: -W / 2, x1: -L.gap, z0: L.counterZ - 0.35, z1: L.counterZ + 0.35 },
      { x0: L.gap, x1: W / 2, z0: L.counterZ - 0.35, z1: L.counterZ + 0.35 },
      { x0: -W / 2, x1: W / 2, z0: -6.2, z1: -4.6 }, // station row
      { x0: L.trash.x - 0.35, x1: L.trash.x + 0.35, z0: L.trash.z - 0.35, z1: L.trash.z + 0.35 },
    ];
    return L;
  }

  function nearestAisle(L, x) {
    let best = L.aisles[0], bd = Infinity;
    for (const a of L.aisles) { const d = Math.abs(a - x); if (d < bd) { bd = d; best = a; } }
    return best;
  }

  // Waypoints from a to b: tables are passed along aisles, the counter through its gap.
  function route(L, a, b) {
    const pts = [];
    const inTables = p => p.z > 0.0;
    const aK = a.z < L.counterZ, bK = b.z < L.counterZ;
    const kz = L.counterZ - 0.85, dz = L.counterZ + 0.85;
    if (inTables(a) && !(inTables(b) && Math.abs(nearestAisle(L, a.x) - nearestAisle(L, b.x)) < 0.1)) {
      const ax = nearestAisle(L, a.x);
      pts.push({ x: ax, z: a.z }, { x: ax, z: L.corridorZ });
    }
    if (aK !== bK) {
      const gx = clamp(aK ? a.x : b.x, -L.gap + 0.55, L.gap - 0.55);
      if (aK) pts.push({ x: gx, z: kz }, { x: gx, z: dz });
      else pts.push({ x: gx, z: dz }, { x: gx, z: kz });
    }
    if (inTables(b)) {
      const bx = nearestAisle(L, b.x);
      if (!(inTables(a) && Math.abs(nearestAisle(L, a.x) - bx) < 0.1)) pts.push({ x: bx, z: L.corridorZ });
      pts.push({ x: bx, z: b.z });
    }
    pts.push({ x: b.x, z: b.z });
    return pts;
  }

  // Push a circle (pos, r) out of walls and obstacles.
  function collide(L, p, r, tableCount) {
    p.x = clamp(p.x, -L.W / 2 + r, L.W / 2 - r);
    p.z = clamp(p.z, L.backZ + r, L.D - r);
    for (const b of L.boxes) {
      const cx = clamp(p.x, b.x0, b.x1), cz = clamp(p.z, b.z0, b.z1);
      let dx = p.x - cx, dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 < 1e-6) { // centre inside box: push out the nearest side
          const opts = [[b.x0 - r - p.x, 0], [b.x1 + r - p.x, 0], [0, b.z0 - r - p.z], [0, b.z1 + r - p.z]];
          opts.sort((m, n) => Math.abs(m[0] + m[1]) - Math.abs(n[0] + n[1]));
          p.x += opts[0][0]; p.z += opts[0][1];
        } else {
          const d = Math.sqrt(d2);
          p.x = cx + dx / d * r; p.z = cz + dz / d * r;
        }
      }
    }
    const n = Math.min(tableCount, L.tables.length);
    for (let i = 0; i < n; i++) {
      const t = L.tables[i];
      const rr = 0.82 + r;
      let dx = p.x - t.x, dz = p.z - t.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr) {
        let d = Math.sqrt(d2);
        if (d < 1e-4) { dx = 1; dz = 0.01; d = 1; }
        p.x = t.x + dx / d * rr; p.z = t.z + dz / d * rr;
      }
    }
  }

  /* ---------- helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'];
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    const neg = n < 0; n = Math.abs(n);
    let out;
    if (n < 10) out = (Math.round(n * 10) / 10).toString().replace(/\.0$/, '');
    else if (n < 10000) out = Math.floor(n).toLocaleString('en-US');
    else {
      let i = 0;
      while (n >= 1000 && i < SUFFIX.length - 1) { n /= 1000; i++; }
      out = (n >= 100 ? n.toFixed(0) : n.toFixed(1)) + SUFFIX[i];
    }
    return (neg ? '-' : '') + out;
  }
  function fmtTime(sec) {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m`;
    return `${sec}s`;
  }
  function randomCode() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 5; i++) c += A[Math.floor(Math.random() * A.length)];
    return c;
  }

  window.OU = {
    MAX_PLAYERS, SAVE_KEY, PROFILE_KEY, PEER_PREFIX, DISHES, DISH, EXPAND_COSTS,
    defaultSave, migrate, Stats, upgradeList, makeLayout, route, collide, clamp, fmt, fmtTime, randomCode,
  };
})();
