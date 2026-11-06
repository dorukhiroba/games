/* Order Up! — browser-to-browser networking with PeerJS (WebRTC data channels).
   The host's browser registers a room id on the public PeerJS broker; friends
   look it up once and then talk to the host directly. No game server. */
(function () {
  'use strict';
  const { PEER_PREFIX, MAX_PLAYERS } = window.OU;
  const PeerOpts = { debug: 0 };

  function hasPeer() { return typeof window.Peer === 'function'; }

  class HostNet {
    constructor(handlers) {
      this.h = handlers;          // { onJoin(pid, hello), onData(pid, msg), onLeave(pid), onStatus(text, online) }
      this.conns = new Map();     // pid -> conn
      this.peer = null;
      this.code = null;
      this.online = false;
    }
    // Try to claim the room code; if it is taken (e.g. a stale tab) retry, then pick a new one.
    start(code, onCode) {
      if (!hasPeer()) { this.h.onStatus('Offline — playing solo', false); return; }
      let attempts = 0;
      const tryOpen = (c) => {
        this.code = c;
        const peer = new window.Peer(PEER_PREFIX + c, PeerOpts);
        this.peer = peer;
        this.h.onStatus('Opening your room…', false);
        const timer = setTimeout(() => { if (!this.online) this.h.onStatus('Still connecting… (solo play works meanwhile)', false); }, 8000);
        peer.on('open', () => {
          clearTimeout(timer);
          this.online = true;
          onCode(c);
          this.h.onStatus('Online', true);
        });
        peer.on('connection', conn => this.accept(conn));
        peer.on('disconnected', () => {
          this.online = false;
          this.h.onStatus('Reconnecting…', false);
          setTimeout(() => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) { /* ignore */ } }, 1500);
        });
        peer.on('error', err => {
          clearTimeout(timer);
          if (err.type === 'unavailable-id') {
            peer.destroy();
            attempts++;
            if (attempts < 4) { this.h.onStatus('Reclaiming your room code…', false); setTimeout(() => tryOpen(c), 2500); }
            else tryOpen(window.OU.randomCode());
            return;
          }
          if (['network', 'server-error', 'socket-error', 'socket-closed', 'browser-incompatible', 'ssl-unavailable'].includes(err.type)) {
            this.online = false;
            this.h.onStatus(err.type === 'browser-incompatible' ? 'This browser can’t host — playing solo' : 'Offline — playing solo (retrying)', false);
            if (err.type !== 'browser-incompatible') setTimeout(() => { try { if (peer.disconnected && !peer.destroyed) peer.reconnect(); } catch (e) { /* ignore */ } }, 6000);
          }
        });
      };
      tryOpen(code);
    }
    accept(conn) {
      conn.on('open', () => {
        if (this.conns.size + 1 >= MAX_PLAYERS) {
          try { conn.send({ t: 'full' }); } catch (e) { /* ignore */ }
          setTimeout(() => conn.close(), 400);
          return;
        }
        this.conns.set(conn.peer, conn);
      });
      conn.on('data', msg => {
        if (!msg || typeof msg !== 'object' || !this.conns.has(conn.peer)) return;
        if (msg.t === 'hello') { this.h.onJoin(conn.peer, msg); return; }
        this.h.onData(conn.peer, msg);
      });
      const gone = () => { if (this.conns.delete(conn.peer)) this.h.onLeave(conn.peer); };
      conn.on('close', gone);
      conn.on('error', gone);
    }
    send(pid, msg) { const c = this.conns.get(pid); if (c && c.open) { try { c.send(msg); } catch (e) { /* ignore */ } } }
    broadcast(msg) { for (const c of this.conns.values()) if (c.open) { try { c.send(msg); } catch (e) { /* ignore */ } } }
    count() { return this.conns.size; }
    destroy() { try { this.peer && this.peer.destroy(); } catch (e) { /* ignore */ } }
  }

  class ClientNet {
    constructor(handlers) { this.h = handlers; this.peer = null; this.conn = null; } // { onData(msg), onClose(reason) }
    join(code) {
      return new Promise((resolve, reject) => {
        if (!hasPeer()) { reject(new Error('Multiplayer library failed to load.')); return; }
        const peer = new window.Peer(PeerOpts);
        this.peer = peer;
        let done = false;
        const fail = (m) => { if (done) return; done = true; try { peer.destroy(); } catch (e) { /* ignore */ } reject(new Error(m)); };
        const timer = setTimeout(() => fail('Couldn’t reach that restaurant. Check the code, and make sure the owner has the game open.'), 15000);
        peer.on('open', () => {
          const conn = peer.connect(PEER_PREFIX + code.toUpperCase(), { reliable: true, serialization: 'json' });
          this.conn = conn;
          conn.on('open', () => { if (done) return; done = true; clearTimeout(timer); resolve(); });
          conn.on('data', msg => this.h.onData(msg));
          conn.on('close', () => this.h.onClose('The owner closed the restaurant (or the connection dropped).'));
          conn.on('error', () => this.h.onClose('Connection to the owner was lost.'));
        });
        peer.on('error', err => {
          clearTimeout(timer);
          if (err.type === 'peer-unavailable') fail('No restaurant with that code is open right now.');
          else if (!done) fail('Couldn’t connect (' + err.type + ').');
        });
      });
    }
    send(msg) { if (this.conn && this.conn.open) { try { this.conn.send(msg); } catch (e) { /* ignore */ } } }
    destroy() { try { this.peer && this.peer.destroy(); } catch (e) { /* ignore */ } }
  }

  window.OU.HostNet = HostNet;
  window.OU.ClientNet = ClientNet;
})();
