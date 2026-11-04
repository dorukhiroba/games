/*
 * KNet: free peer-to-peer online play for the games on GitHub Pages.
 *
 * It mirrors the small "room" API the games already use on claude.ai
 * (join / peers / presence / onPeers / onConnection / connected / leave),
 * but runs on Trystero (WebRTC, discovered through public Nostr relays),
 * so no account, login or server is needed.
 *
 * Usage inside a game:  const room = await KNet.use('room')
 */
(function () {
  'use strict';

  const TRYSTERO_URL = 'https://cdn.jsdelivr.net/npm/trystero@0.26.0/+esm';
  const APP_ID = 'dorukhiroba-games-v1';
  const SEND_INTERVAL_MS = 33; // max ~30 presence updates per second per room

  let libPromise = null;
  const loadLib = () => libPromise || (libPromise = import(TRYSTERO_URL));

  const fail = (code, message) => Object.assign(new Error(message), { code });
  const call = (fn, ...args) => { try { fn(...args); } catch (e) { console.warn('[KNet]', e); } };

  const openRooms = new Map(); // room name -> room API

  async function openRoom(name) {
    if (openRooms.has(name)) return openRooms.get(name);

    let lib;
    try { lib = await loadLib(); }
    catch (e) { throw fail('unavailable', 'Could not load the online play library'); }
    const { joinRoom, selfId } = lib;

    const tr = joinRoom({ appId: APP_ID }, name);
    const presAction = tr.makeAction('pres');

    const me = { peer: selfId, kind: 'viewer', sameTab: true, presence: {} };
    const peers = new Map([[selfId, me]]);
    const peerSubs = new Set();
    const connSubs = new Set();
    let list = null;     // cached peers() array, rebuilt after any change
    let closed = false;
    let lastSent = 0;
    let timer = null;

    const changed = (ch) => {
      list = null;
      const full = { joined: [], left: [], updated: [], ...ch };
      for (const sub of peerSubs) call(sub.cb, full);
    };

    const flush = () => {
      timer = null;
      if (closed) return;
      lastSent = performance.now();
      presAction.send(me.presence).catch(() => {});
    };

    tr.onPeerJoin = (id) => {
      if (closed) return;
      // Tell the newcomer about us right away, then list them.
      presAction.send(me.presence, { target: id }).catch(() => {});
      let p = peers.get(id);
      if (!p) { p = { peer: id, kind: 'viewer', sameTab: false, presence: {} }; peers.set(id, p); }
      changed({ joined: [p] });
    };

    tr.onPeerLeave = (id) => {
      const p = peers.get(id);
      if (!p || closed) return;
      peers.delete(id);
      changed({ left: [p] });
    };

    presAction.onMessage = (data, { peerId }) => {
      if (closed || peerId === selfId) return;
      let p = peers.get(peerId);
      const isNew = !p;
      if (isNew) { p = { peer: peerId, kind: 'viewer', sameTab: false, presence: {} }; peers.set(peerId, p); }
      p.presence = data && typeof data === 'object' ? data : {};
      changed(isNew ? { joined: [p] } : { updated: [p] });
    };

    const api = {
      name,

      connected: () => !closed,

      peers: () => list || (list = [...peers.values()]),

      // Merges the patch into our presence; a null value removes that key.
      presence(patch) {
        if (closed) return Promise.reject(fail('closed', 'This room was left'));
        if (!patch || typeof patch !== 'object') return Promise.reject(fail('invalid_argument', 'presence must be an object'));
        const next = { ...me.presence };
        for (const k in patch) { if (patch[k] === null) delete next[k]; else next[k] = patch[k]; }
        me.presence = next;
        list = null;
        const wait = SEND_INTERVAL_MS - (performance.now() - lastSent);
        if (!timer) { if (wait <= 0) flush(); else timer = setTimeout(flush, wait); }
        return Promise.resolve();
      },

      onPeers(cb, onError) {
        const sub = { cb, onError };
        peerSubs.add(sub);
        return () => peerSubs.delete(sub);
      },

      onConnection(cb, onError) {
        const sub = { cb, onError };
        connSubs.add(sub);
        setTimeout(() => { if (connSubs.has(sub)) call(cb, !closed); }, 0);
        return () => connSubs.delete(sub);
      },

      join: (sub) => {
        if (typeof sub !== 'string' || !sub) return Promise.reject(fail('invalid_argument', 'room name must be a string'));
        return openRoom(sub);
      },

      leave() {
        if (closed) return Promise.resolve();
        closed = true;
        clearTimeout(timer);
        openRooms.delete(name);
        for (const sub of connSubs) call(sub.cb, false);
        peerSubs.clear();
        connSubs.clear();
        try { tr.leave(); } catch (e) {}
        return Promise.resolve();
      },
    };

    openRooms.set(name, api);
    // The real room API announces our own peer as "joined" too.
    setTimeout(() => { if (!closed) changed({ joined: [me] }); }, 0);
    return api;
  }

  window.KNet = {
    async use(capability) {
      if (capability === 'room') {
        // One shared lobby per game page; games then join named sub-rooms.
        const page = location.pathname.replace(/index\.html$/, '').replace(/\/+$/, '') || '/';
        return openRoom('lobby:' + page);
      }
      throw fail('not_granted', 'KNet only provides the room capability');
    },
  };

  addEventListener('pagehide', () => { for (const r of [...openRooms.values()]) r.leave(); });
})();
