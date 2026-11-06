# Order Up!

A 3D co-op incremental restaurant game for the browser. Cook, serve guests, buy upgrades, expand the room, hire staff who earn while you're away, and open franchises for permanent income stars. Up to 10 chefs per restaurant.

## Run it

Everything is in this folder and uses relative paths, so any static host works:

- **itch.io** — zip the folder, upload as an HTML game, tick "This file will be played in the browser".
- **GitHub Pages / Netlify / Cloudflare Pages** — upload the folder as-is; `index.html` is the entry point.
- **Your own site** — copy the folder anywhere under your web root, e.g. `yoursite.com/order-up/`.
- **Locally** — double-click `index.html`, or run `python -m http.server` here and open http://localhost:8000.

Invite links (`?join=CODE`) only work when the game is served over http(s); from a local file, share the 5-letter room code instead.

## How multiplayer works

- Whoever clicks **Open my restaurant** is the owner. Their browser runs the simulation and keeps the save in `localStorage`.
- Friends click **Join** with the owner's room code (or open the invite link). They help cook and serve and can buy upgrades with the shared till, but nothing is saved on their side.
- Browsers talk directly over WebRTC (PeerJS). The only outside service is the free public PeerJS broker at `0.peerjs.com`, used once to introduce the browsers — no game data goes through it.
- The room code is saved with the restaurant, so friends can reuse it next time.
- The restaurant is only open while the owner's tab is open. It keeps running in a background tab.
- Some strict networks (corporate, some mobile carriers) block direct connections; without a TURN server those players can't connect. To add one, pass a `config: { iceServers: [...] }` option in `js/net.js` (`PeerOpts`).

## Controls

WASD / arrows to move · **E** or **Space** to use a station or the bin · click/tap anything to walk there · scroll or pinch to zoom · **U** toggles upgrades. Walk up to a guest while holding what they ordered to serve them.

## Files

```
index.html        page + HUD markup
css/style.css     styles
js/config.js      dishes, upgrade costs, room layout, helpers
js/sim.js         host-side simulation (guests, stations, staff, economy, prestige)
js/world.js       Three.js scene and characters
js/net.js         PeerJS host/join
js/main.js        menu, input, loop, saving, HUD
lib/three.min.js  Three.js r149
lib/peerjs.min.js PeerJS 1.5.4
```

Balance lives in `js/config.js` (`DISHES`, `Stats`, `upgradeList`).
