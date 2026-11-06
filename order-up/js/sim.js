/* Order Up! — the host-side simulation. Only the host runs this; friends
   receive compact snapshots and send inputs back. */
(function () {
  'use strict';
  const { DISHES, DISH, Stats, makeLayout, route, collide, clamp, upgradeList, EXPAND_COSTS } = window.OU;

  const SHIRTS = [0xe4572e, 0x2f6f73, 0xf2c14e, 0x6c5b7b, 0x3fa7d6, 0x8cb369, 0xd1495b, 0xedae49, 0x00798c, 0xa05195];
  const SKINS = [0xf6d2b8, 0xe8b894, 0xc68863, 0x9a6440, 0x6b4229];
  const HAIRS = [0x2b2233, 0x5b3a29, 0xb5651d, 0xe0c068, 0x8a8a8a, 0x1d1d1d];

  const ST = { enter: 0, wait: 1, eat: 2, leave: 3 };

  class Game {
    constructor(save) {
      this.s = save;
      this.players = {};
      this.customers = [];
      this.bots = [];
      this.stations = {};
      this.fx = [];
      this.nextId = 1;
      this.spawnT = 1.5;
      this.rate = 0;           // $/s, all sources (EMA)
      this.time = 0;
      DISHES.forEach(d => { this.stations[d.id] = { stock: 0, cooking: false, t: 0, dur: 1 }; });
      this.relayout();
      this.syncBots();
    }

    relayout() {
      this.L = makeLayout(this.s.up.expand);
      this.tableOcc = new Array(this.L.tables.length).fill(null);
      this.customers = [];
      this.bots.forEach(b => { b.task = null; b.path = []; });
    }

    /* ---------------- players ---------------- */
    addPlayer(id, name, color) {
      const L = this.L;
      const p = this.players[id] || { id, carry: [] };
      p.name = String(name || 'Chef').slice(0, 16);
      p.color = typeof color === 'number' ? color : 0xe4572e;
      p.x = (Math.random() - 0.5) * 2; p.z = L.counterZ - 1.0; p.ry = 0;
      p.moving = false;
      this.players[id] = p;
      return p;
    }
    removePlayer(id) { delete this.players[id]; }
    playerCount() { return Object.keys(this.players).length; }

    setPlayerPos(id, x, z, ry, moving) {
      const p = this.players[id];
      if (!p || !isFinite(x) || !isFinite(z)) return;
      const q = { x, z };
      collide(this.L, q, 0.3, this.s.up.tables);
      p.x = q.x; p.z = q.z; p.ry = +ry || 0; p.moving = !!moving;
    }

    /* ---------------- interaction ---------------- */
    nearestInteractable(x, z, maxD = 1.6) {
      let best = null, bd = maxD;
      DISHES.forEach(d => {
        if (!this.s.dishes[d.id].unlocked) return;
        const st = this.L.stations[d.index];
        const dd = Math.hypot(st.fx - x, st.fz - z);
        if (dd < bd) { bd = dd; best = { kind: 'station', id: d.id }; }
      });
      const t = this.L.trash;
      const dt = Math.hypot(t.x - x, t.z - z);
      if (dt < Math.min(bd, 1.4)) best = { kind: 'trash' };
      return best;
    }

    // Returns a short label of what happened (for the actor's own feedback).
    interact(actor, target, isPlayer) {
      if (!actor || !target) return null;
      if (target.kind === 'trash') {
        if (actor.carry.length) { actor.carry = []; return 'trash'; }
        return null;
      }
      if (target.kind !== 'station') return null;
      const id = target.id;
      if (!DISH[id] || !this.s.dishes[id].unlocked) return null;
      const st = this.stations[id];
      const cap = isPlayer ? Stats.trayCap(this.s) : 1;
      if (st.stock > 0 && actor.carry.length < cap) {
        st.stock--; actor.carry.push(id);
        this.kickAuto(id);
        return 'take';
      }
      if (!st.cooking && st.stock < Stats.stockCap(this.s, id)) {
        this.startCook(id);
        return 'cook';
      }
      return null;
    }
    playerAct(pid, target) {
      const p = this.players[pid];
      if (!p || !target) return;
      // lenient distance check (network latency)
      let tx, tz;
      if (target.kind === 'station' && DISH[target.id]) { const st = this.L.stations[DISH[target.id].index]; tx = st.fx; tz = st.fz; }
      else if (target.kind === 'trash') { tx = this.L.trash.x; tz = this.L.trash.z; }
      else return;
      if (Math.hypot(p.x - tx, p.z - tz) > 2.6) return;
      this.interact(p, target, true);
    }
    startCook(id) {
      const st = this.stations[id];
      st.cooking = true; st.t = 0; st.dur = Stats.cookTime(this.s, id);
    }
    kickAuto(id) {
      const st = this.stations[id];
      if (this.s.dishes[id].auto && !st.cooking && st.stock < Stats.stockCap(this.s, id)) this.startCook(id);
    }

    /* ---------------- customers ---------------- */
    freeTable() {
      const n = Math.min(this.s.up.tables, this.L.tables.length);
      const free = [];
      for (let i = 0; i < n; i++) if (this.tableOcc[i] === null) free.push(i);
      return free.length ? free[Math.floor(Math.random() * free.length)] : -1;
    }
    spawnCustomer() {
      const ti = this.freeTable();
      if (ti < 0) return false;
      const unlocked = Stats.unlockedDishes(this.s);
      let items = 1;
      const r = Math.random();
      if (unlocked.length >= 3 && r < 0.3) items = 2;
      if (unlocked.length >= 4 && this.s.up.expand >= 1 && r < 0.12) items = 3;
      const order = [];
      for (let i = 0; i < items; i++) {
        // newer dishes are a bit more popular so upgrades pay off
        const w = unlocked.map((d, k) => 1 + k * 0.6);
        let x = Math.random() * w.reduce((a, b) => a + b, 0), pick = unlocked[0];
        for (let k = 0; k < unlocked.length; k++) { x -= w[k]; if (x <= 0) { pick = unlocked[k]; break; } }
        order.push(pick.id);
      }
      const t = this.L.tables[ti];
      const c = {
        id: this.nextId++, table: ti, x: this.L.door.x, z: this.L.door.z, ry: Math.PI, state: ST.enter,
        order, got: order.map(() => 0), claim: order.map(() => null),
        patience: 0, max: Stats.patience(this.s, items), eatT: 0,
        look: [Math.floor(Math.random() * SHIRTS.length), Math.floor(Math.random() * SKINS.length), Math.floor(Math.random() * HAIRS.length)],
        path: [{ x: t.aisleX, z: this.L.D - 0.9 }, { x: t.aisleX, z: t.seatZ }, { x: t.seatX, z: t.seatZ }],
        speed: 2.3 + Math.random() * 0.4,
      };
      c.patience = c.max;
      this.tableOcc[ti] = c.id;
      this.customers.push(c);
      return true;
    }
    customerLeave(c, happy) {
      c.state = ST.leave;
      const t = this.L.tables[c.table];
      this.tableOcc[c.table] = null;
      c.path = [{ x: t.aisleX, z: t.seatZ }, { x: t.aisleX, z: this.L.D - 0.9 }, { x: this.L.door.x, z: this.L.door.z + 1.5 }];
      c.claim = c.claim.map(() => null);
      if (!happy) this.fx.push({ k: 'angry', x: c.x, z: c.z });
    }
    // Hand over whatever the carrier has that this customer still needs.
    deliver(carrier, c, isBot) {
      if (c.state !== ST.wait || !carrier.carry.length) return 0;
      let n = 0;
      for (let k = carrier.carry.length - 1; k >= 0; k--) {
        const item = carrier.carry[k];
        let idx = -1;
        for (let i = 0; i < c.order.length; i++) {
          if (c.order[i] !== item || c.got[i]) continue;
          if (idx < 0 || c.claim[i] === null || c.claim[i] === carrier.id) idx = i;
          if (c.claim[i] === null || c.claim[i] === carrier.id) break;
        }
        if (idx >= 0) {
          c.got[idx] = 1; c.claim[idx] = null;
          carrier.carry.splice(k, 1); n++;
        }
      }
      if (n) {
        c.patience = Math.min(c.max, c.patience + c.max * 0.25);
        if (c.got.every(Boolean)) this.pay(c, isBot);
      }
      return n;
    }
    pay(c, isBot) {
      const s = this.s;
      const base = c.order.reduce((a, id) => a + Stats.dishPrice(s, id), 0);
      const pf = clamp(c.patience / c.max, 0, 1);
      const amt = base * (1 + Stats.tipBonus(s) * pf) * Stats.starMult(s);
      s.money += amt; s.runEarned += amt; s.lifeEarned += amt; s.served++;
      this._earnTick += amt;
      if (isBot) this._botEarnTick += amt;
      c.state = ST.eat; c.eatT = 2.5;
      this.fx.push({ k: 'money', x: c.x, z: c.z, a: amt });
    }

    /* ---------------- staff bots ---------------- */
    syncBots() {
      while (this.bots.length < this.s.up.staff) {
        const i = this.bots.length;
        this.bots.push({ id: 'b' + (this.nextId++), x: -1 + i * 0.5, z: this.L.counterZ - 1.0, ry: 0, carry: [], task: null, path: [], wait: 0, stuck: 0, moving: false });
      }
      this.bots.length = this.s.up.staff;
    }
    releaseClaims(b) {
      this.customers.forEach(c => { c.claim = c.claim.map(x => (x === b.id ? null : x)); });
    }
    botGo(b, to) { b.path = route(this.L, b, to); }
    botThink(b) {
      const L = this.L;
      // 1) carrying something: find who needs it
      if (b.carry.length) {
        const item = b.carry[0];
        let target = b.carryFor && this.customers.find(c => c.id === b.carryFor && c.state === ST.wait && c.order.some((o, i) => o === item && !c.got[i]));
        if (!target) {
          target = this.customers.find(c => c.state === ST.wait && c.order.some((o, i) => o === item && !c.got[i] && (c.claim[i] === null || c.claim[i] === b.id)));
          if (target) {
            const i = target.order.findIndex((o, j) => o === item && !target.got[j] && target.claim[j] === null);
            if (i >= 0) target.claim[i] = b.id;
          }
        }
        if (target) {
          b.task = { kind: 'deliver', cid: target.id };
          this.botGo(b, { x: L.tables[target.table].aisleX - 0.3, z: target.z });
        } else {
          b.task = { kind: 'trash' };
          this.botGo(b, { x: L.trash.x - 0.9, z: L.trash.z });
        }
        return;
      }
      // 2) find an unclaimed order line
      let best = null;
      for (const c of this.customers) {
        if (c.state !== ST.wait) continue;
        for (let i = 0; i < c.order.length; i++) {
          if (c.got[i] || c.claim[i] !== null) continue;
          if (!best || c.patience < best.c.patience) best = { c, i };
          break;
        }
      }
      if (best) {
        best.c.claim[best.i] = b.id;
        const id = best.c.order[best.i];
        b.task = { kind: 'fetch', cid: best.c.id, dish: id };
        const st = L.stations[DISH[id].index];
        this.botGo(b, { x: st.fx + (Math.random() - 0.5) * 0.6, z: st.fz + 0.1 });
        return;
      }
      // 3) nothing ordered: prep an empty station that nobody is cooking at
      const prep = DISHES.find(d => this.s.dishes[d.id].unlocked && !this.stations[d.id].cooking && this.stations[d.id].stock === 0 &&
        !this.bots.some(o => o !== b && o.task && o.task.kind === 'prep' && o.task.dish === d.id));
      if (prep) {
        b.task = { kind: 'prep', dish: prep.id };
        const st = L.stations[prep.index];
        this.botGo(b, { x: st.fx + (Math.random() - 0.5) * 0.6, z: st.fz + 0.1 });
        return;
      }
      // 4) idle: drift near the pass
      b.task = { kind: 'idle' };
      b.wait = 1 + Math.random();
      this.botGo(b, { x: (Math.random() - 0.5) * 6, z: L.counterZ - 1.0 });
    }
    botArrive(b) {
      const t = b.task;
      if (!t) return;
      if (t.kind === 'fetch') {
        const c = this.customers.find(x => x.id === t.cid);
        if (!c || c.state !== ST.wait) { this.releaseClaims(b); b.task = null; return; }
        const st = this.stations[t.dish];
        if (st.stock > 0) { this.interact(b, { kind: 'station', id: t.dish }, false); b.carryFor = t.cid; b.task = null; return; }
        if (!st.cooking) this.startCook(t.dish);
        b.wait = 0.25; // wait at station, re-check
        b.task = Object.assign({}, t, { waiting: true });
        return;
      }
      if (t.kind === 'deliver') {
        const c = this.customers.find(x => x.id === t.cid);
        if (c) this.deliver(b, c, true);
        b.task = null;
        if (!b.carry.length) { this.releaseClaims(b); b.carryFor = null; }
        return;
      }
      if (t.kind === 'trash') { b.carry = []; this.releaseClaims(b); b.carryFor = null; b.task = null; return; }
      if (t.kind === 'prep') { const st = this.stations[t.dish]; if (!st.cooking && st.stock < Stats.stockCap(this.s, t.dish)) this.startCook(t.dish); b.task = null; return; }
      if (t.kind === 'idle') { b.task = null; }
    }
    tickBot(b, dt) {
      if (b.wait > 0) {
        b.wait -= dt;
        if (b.wait > 0) { b.moving = false; return; }
        if (b.task && b.task.waiting) { this.botArrive(b); return; }
      }
      if (!b.path.length) {
        if (!b.task) this.botThink(b); else this.botArrive(b);
        return;
      }
      const sp = Stats.botSpeed(this.s);
      const wp = b.path[0];
      const dx = wp.x - b.x, dz = wp.z - b.z, d = Math.hypot(dx, dz);
      if (d < 0.15) { b.path.shift(); return; }
      const step = Math.min(d, sp * dt);
      const ox = b.x, oz = b.z;
      b.x += dx / d * step; b.z += dz / d * step;
      b.ry = Math.atan2(dx, dz);
      collide(this.L, b, 0.28, this.s.up.tables);
      b.moving = true;
      const moved = Math.hypot(b.x - ox, b.z - oz);
      if (moved < step * 0.2) { b.stuck += dt; if (b.stuck > 1.2) { b.stuck = 0; b.path = []; b.x += (Math.random() - 0.5) * 0.4; this.releaseClaims(b); b.task = null; } }
      else b.stuck = 0;
      // abandon fetch if its customer left
      if (b.task && b.task.kind === 'fetch' && !this.customers.some(c => c.id === b.task.cid && c.state === ST.wait)) {
        this.releaseClaims(b); b.task = null; b.path = [];
      }
    }

    /* ---------------- main tick ---------------- */
    tick(dt) {
      const s = this.s;
      this.time += dt;
      this._earnTick = 0; this._botEarnTick = 0;

      // stations
      DISHES.forEach(d => {
        if (!s.dishes[d.id].unlocked) return;
        const st = this.stations[d.id];
        if (st.cooking) {
          st.t += dt;
          if (st.t >= st.dur) { st.cooking = false; st.t = 0; st.stock++; this.kickAuto(d.id); }
        } else this.kickAuto(d.id);
      });

      // spawn
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        if (this.spawnCustomer()) this.spawnT = Stats.spawnInterval(s) * (0.7 + Math.random() * 0.6);
        else this.spawnT = 0.5;
      }

      // customers
      for (let i = this.customers.length - 1; i >= 0; i--) {
        const c = this.customers[i];
        if (c.path.length) {
          const wp = c.path[0];
          const dx = wp.x - c.x, dz = wp.z - c.z, d = Math.hypot(dx, dz);
          if (d < 0.08) { c.path.shift(); }
          else {
            const step = Math.min(d, c.speed * dt);
            c.x += dx / d * step; c.z += dz / d * step; c.ry = Math.atan2(dx, dz);
          }
          if (!c.path.length) {
            if (c.state === ST.enter) { c.state = ST.wait; c.ry = -Math.PI / 2; }
            else if (c.state === ST.leave) { this.customers.splice(i, 1); continue; }
          }
          continue;
        }
        if (c.state === ST.wait) {
          c.patience -= dt;
          if (c.patience <= 0) this.customerLeave(c, false);
        } else if (c.state === ST.eat) {
          c.eatT -= dt;
          if (c.eatT <= 0) this.customerLeave(c, true);
        }
      }

      // players auto-serve when standing next to a guest
      Object.values(this.players).forEach(p => {
        if (!p.carry.length) return;
        for (const c of this.customers) {
          if (c.state === ST.wait && Math.hypot(c.x - p.x, c.z - p.z) < 1.7) this.deliver(p, c, false);
          if (!p.carry.length) break;
        }
      });

      // staff
      this.bots.forEach(b => this.tickBot(b, dt));

      // income EMAs (τ = 60s for display, 180s for offline estimate)
      this.rate += (this._earnTick / Math.max(dt, 1e-3) - this.rate) * Math.min(1, dt / 60);
      s.botRate += (this._botEarnTick / Math.max(dt, 1e-3) - s.botRate) * Math.min(1, dt / 180);
    }

    /* ---------------- shop ---------------- */
    buy(key) {
      const item = upgradeList(this.s).find(u => u.key === key);
      if (!item || item.cost === null || this.s.money < item.cost) return null;
      const s = this.s;
      s.money -= item.cost;
      const parts = key.split(':');
      if (parts[0] === 'dish') {
        const ds = s.dishes[parts[1]];
        if (parts[2] === 'unlock') ds.unlocked = true;
        else if (parts[2] === 'auto') { ds.auto = true; this.kickAuto(parts[1]); }
        else ds[parts[2]]++;
      } else if (parts[0] === 'up') {
        s.up[parts[1]]++;
        if (parts[1] === 'expand') { this.relayout(); this.fx.push({ k: 'toast', t: 'Renovation done — the room just got bigger!' }); }
        if (parts[1] === 'staff') this.syncBots();
      }
      return item;
    }
    franchise() {
      const gain = Stats.pendingStars(this.s);
      if (gain < 1) return false;
      const keep = { stars: this.s.stars + gain, lifeEarned: this.s.lifeEarned, franchises: (this.s.franchises || 0) + 1, code: this.s.code };
      const fresh = window.OU.defaultSave();
      Object.assign(fresh, keep, { money: 50 * keep.stars });
      this.s = fresh;
      DISHES.forEach(d => { this.stations[d.id] = { stock: 0, cooking: false, t: 0, dur: 1 }; });
      this.bots = [];
      this.relayout();
      Object.values(this.players).forEach(p => { p.carry = []; p.x = 0; p.z = this.L.counterZ - 1; });
      this.fx.push({ k: 'toast', t: `New franchise opened! ★ ${keep.stars} — income x${Stats.starMult(fresh).toFixed(2)}` });
      return true;
    }

    /* ---------------- network snapshot ---------------- */
    snapshot() {
      const r2 = v => Math.round(v * 100) / 100;
      const st = {};
      DISHES.forEach(d => { const x = this.stations[d.id]; st[d.id] = [x.stock, x.cooking ? r2(x.t / x.dur) : -1]; });
      return {
        t: 'snap',
        s: this.s,
        st,
        c: this.customers.map(c => [c.id, r2(c.x), r2(c.z), r2(c.ry), c.state, c.order, c.got, r2(c.patience / c.max), c.look, c.path.length ? 1 : 0]),
        p: Object.values(this.players).map(p => [p.id, p.name, p.color, r2(p.x), r2(p.z), r2(p.ry), p.carry, p.moving ? 1 : 0]),
        b: this.bots.map(b => [b.id, r2(b.x), r2(b.z), r2(b.ry), b.carry, b.moving ? 1 : 0]),
        rate: this.rate,
        fx: this.fx.splice(0),
      };
    }
  }

  // Turn a snapshot (or the live game, on the host) into the view the renderer reads.
  function viewFromSnap(sn) {
    return {
      s: sn.s,
      stations: Object.fromEntries(Object.entries(sn.st).map(([k, v]) => [k, { stock: v[0], progress: v[1] }])),
      customers: sn.c.map(a => ({ id: a[0], x: a[1], z: a[2], ry: a[3], state: a[4], order: a[5], got: a[6], pf: a[7], look: a[8], walking: !!a[9] })),
      players: sn.p.map(a => ({ id: a[0], name: a[1], color: a[2], x: a[3], z: a[4], ry: a[5], carry: a[6], moving: !!a[7] })),
      bots: sn.b.map(a => ({ id: a[0], x: a[1], z: a[2], ry: a[3], carry: a[4], moving: !!a[5] })),
      rate: sn.rate,
    };
  }

  window.OU.Game = Game;
  window.OU.viewFromSnap = viewFromSnap;
  window.OU.LOOKS = { SHIRTS, SKINS, HAIRS };
  window.OU.CST = ST;
})();
