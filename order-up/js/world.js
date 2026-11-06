/* Order Up! — Three.js renderer. Reads a "view" (from the live game or a
   network snapshot) every frame and keeps meshes in step with it. */
(function () {
  'use strict';
  const { DISHES, DISH, makeLayout, Stats, fmt, LOOKS } = window.OU;

  const PAL = {
    sky: 0x2b2233, grass: 0x6f8f5a, walk: 0xd9cbb2, wall: 0xf3e6d0, wallTrim: 0x2f6f73,
    wood: 0xb8774a, woodDark: 0x8a5a3b, steel: 0xc3cad0, steelDark: 0x7d868e, marble: 0xf7f2ea,
    counter: 0x2f6f73, chef: 0xf9f6f0, ink: 0x2b2233, staff: 0x8fb8de, staffApron: 0x3d6a92,
  };

  let renderer, scene, camera, hemi, sun;
  let staticGroup = null, builtKey = '';
  const stationMeshes = {}, tableMeshes = [];
  const actors = { customers: new Map(), players: new Map(), bots: new Map() };
  const popups = [];
  let pickables = [], floorMesh = null;
  let L = makeLayout(0);
  const cam = { x: 0, z: 0, zoom: 1, ready: false };
  const matCache = new Map();
  const raycaster = new THREE.Raycaster();

  function mat(color, opts) {
    const key = color + JSON.stringify(opts || {});
    if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.75, metalness: 0.0 }, opts || {})));
    return matCache.get(key);
  }
  function mesh(geo, material, x, y, z, cast = true, receive = true) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = cast; m.receiveShadow = receive;
    return m;
  }

  /* ---------- canvas textures ---------- */
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';
  const emojiCache = new Map();
  function emojiTex(e) {
    if (!emojiCache.has(e)) {
      emojiCache.set(e, canvasTex(128, 128, (g) => {
        g.font = `96px ${EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(e, 64, 72);
      }));
    }
    return emojiCache.get(e);
  }
  function emojiSprite(e, size) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(e), depthWrite: false }));
    sp.scale.set(size, size, 1);
    return sp;
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  // A sprite backed by its own canvas, redrawn only when its key changes.
  function liveSprite(w, h, scale) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, transparent: true }));
    sp.scale.set(scale * w / h, scale, 1);
    sp.userData.canvas = c; sp.userData.key = '';
    sp.redraw = (key, fn) => {
      if (sp.userData.key === key) return;
      sp.userData.key = key;
      const g = c.getContext('2d'); g.clearRect(0, 0, w, h); fn(g, w, h); t.needsUpdate = true;
    };
    return sp;
  }
  const hex = n => '#' + (n >>> 0).toString(16).padStart(6, '0');

  /* ---------- init ---------- */
  function init(container) {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(PAL.sky);
    scene.fog = new THREE.Fog(PAL.sky, 38, 70);

    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    hemi = new THREE.HemisphereLight(0xfff1dc, 0x5a4a44, 0.55);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff0dc, 1.15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight(0x9fc4ff, 0.25);
    fill.position.set(-10, 8, 12);
    scene.add(fill);

    // outside ground
    const ground = mesh(new THREE.PlaneGeometry(200, 200), mat(PAL.grass, { roughness: 1 }), 0, -0.03, 0, false, true);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    resize();
    window.addEventListener('resize', resize);
  }
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ---------- static room ---------- */
  function buildRoom(s) {
    const unlockedMask = DISHES.map(d => (s.dishes[d.id].unlocked ? 1 : 0)).join('');
    const key = [s.up.expand, s.up.tables, Math.min(s.up.decor, 12), unlockedMask].join('|');
    if (key === builtKey) return;
    builtKey = key;
    L = makeLayout(s.up.expand);
    if (staticGroup) {
      scene.remove(staticGroup);
      staticGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    staticGroup = new THREE.Group();
    scene.add(staticGroup);
    pickables = [];
    const W = L.W, D = L.D, B = L.backZ;

    // floors
    const kitchenTex = canvasTex(256, 256, (g, w, h) => {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        g.fillStyle = (i + j) % 2 ? '#e9e2d6' : '#f6f1e8'; g.fillRect(i * 64, j * 64, 64, 64);
      }
      g.strokeStyle = 'rgba(0,0,0,.06)'; g.lineWidth = 2;
      for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); }
    }, [W / 2, (L.counterZ - B) / 2]);
    const kf = mesh(new THREE.PlaneGeometry(W, L.counterZ - B), new THREE.MeshStandardMaterial({ map: kitchenTex, roughness: 0.6 }), 0, 0, (B + L.counterZ) / 2, false, true);
    kf.rotation.x = -Math.PI / 2; staticGroup.add(kf);
    const woodTex = canvasTex(256, 256, (g) => {
      const tones = ['#c48a5a', '#b97d4f', '#cf9667', '#bd8456', '#c99060'];
      for (let r = 0; r < 8; r++) {
        let x = (r % 2) * -64;
        while (x < 256) {
          const len = 96 + ((r * 37 + x) % 80);
          g.fillStyle = tones[(r * 3 + Math.abs(x)) % tones.length];
          g.fillRect(x, r * 32, len, 32);
          g.fillStyle = 'rgba(60,30,10,.18)'; g.fillRect(x + len - 2, r * 32, 2, 32);
          x += len;
        }
        g.fillStyle = 'rgba(60,30,10,.22)'; g.fillRect(0, r * 32 + 30, 256, 2);
      }
    }, [W / 4, (D - L.counterZ) / 4]);
    const df = mesh(new THREE.PlaneGeometry(W, D - L.counterZ), new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 }), 0, 0.001, (L.counterZ + D) / 2, false, true);
    df.rotation.x = -Math.PI / 2; staticGroup.add(df);
    floorMesh = mesh(new THREE.PlaneGeometry(W + 40, D - B + 40), new THREE.MeshBasicMaterial({ visible: false }), 0, 0, (B + D) / 2, false, false);
    floorMesh.rotation.x = -Math.PI / 2; floorMesh.userData.kind = 'floor';
    staticGroup.add(floorMesh);

    // sidewalk
    const walk = mesh(new THREE.BoxGeometry(W + 10, 0.06, 3), mat(PAL.walk, { roughness: 0.95 }), 0, 0, D + 1.8, false, true);
    staticGroup.add(walk);

    // street trees
    for (let z = B + 1; z < D + 3; z += 4.2) {
      [-1, 1].forEach(sx => {
        const tr = new THREE.Group();
        tr.add(mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 8), mat(PAL.woodDark), 0, 0.6, 0));
        const leaf = mat([0x4f7a45, 0x5d8a4c, 0x456c3d][Math.abs(Math.round(z)) % 3], { roughness: 0.95 });
        tr.add(mesh(new THREE.SphereGeometry(0.85, 12, 10), leaf, 0, 1.6, 0));
        tr.add(mesh(new THREE.SphereGeometry(0.6, 12, 10), leaf, 0.3 * sx, 2.15, 0.1));
        tr.position.set(sx * (W / 2 + 2.2 + (Math.abs(Math.round(z * 7)) % 3) * 0.4), 0, z);
        staticGroup.add(tr);
      });
    }

    // walls
    const wallM = mat(PAL.wall), trimM = mat(PAL.wallTrim);
    staticGroup.add(mesh(new THREE.BoxGeometry(W + 0.6, 3.2, 0.3), wallM, 0, 1.6, B - 0.15));
    staticGroup.add(mesh(new THREE.BoxGeometry(W + 0.6, 0.9, 0.34), trimM, 0, 0.45, B - 0.15));
    [-1, 1].forEach(sx => {
      staticGroup.add(mesh(new THREE.BoxGeometry(0.3, 3.2, D - B + 0.3), wallM, sx * (W / 2 + 0.15), 1.6, (B + D) / 2));
      staticGroup.add(mesh(new THREE.BoxGeometry(0.34, 0.9, D - B + 0.3), trimM, sx * (W / 2 + 0.15), 0.45, (B + D) / 2));
      // low front wall with door gap
      const segW = W / 2 - 1.3;
      staticGroup.add(mesh(new THREE.BoxGeometry(segW + 0.3, 0.8, 0.3), trimM, sx * (1.3 + segW / 2 + 0.15), 0.4, D + 0.15));
      staticGroup.add(mesh(new THREE.BoxGeometry(segW + 0.3, 0.1, 0.42), mat(PAL.marble), sx * (1.3 + segW / 2 + 0.15), 0.85, D + 0.15));
      staticGroup.add(mesh(new THREE.BoxGeometry(0.22, 2.6, 0.32), mat(PAL.woodDark), sx * 1.3, 1.3, D + 0.15));
    });
    staticGroup.add(mesh(new THREE.BoxGeometry(2.84, 0.3, 0.34), mat(PAL.woodDark), 0, 2.6, D + 0.15));
    const openSign = canvasTex(256, 96, (g, w, h) => {
      g.fillStyle = '#e4572e'; roundRect(g, 4, 4, w - 8, h - 8, 20); g.fill();
      g.fillStyle = '#fff8ec'; g.font = 'bold 54px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('OPEN', w / 2, h / 2 + 3);
    });
    const os = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.52), new THREE.MeshBasicMaterial({ map: openSign, transparent: true }));
    os.position.set(0, 3.05, D + 0.33); staticGroup.add(os);

    // back-wall sign
    const sign = canvasTex(1024, 256, (g, w, h) => {
      g.fillStyle = '#2b2233'; roundRect(g, 8, 8, w - 16, h - 16, 40); g.fill();
      g.strokeStyle = '#f2c14e'; g.lineWidth = 10; roundRect(g, 24, 24, w - 48, h - 48, 30); g.stroke();
      g.fillStyle = '#fff8ec'; g.font = '900 130px "Trebuchet MS", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('ORDER UP!', w / 2, h / 2 + 8);
    });
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshBasicMaterial({ map: sign }));
    sm.position.set(0, 2.45, B + 0.02); staticGroup.add(sm);

    // counter (the pass), in two halves around the gap
    [-1, 1].forEach(sx => {
      const len = W / 2 - L.gap;
      const cx = sx * (L.gap + len / 2);
      staticGroup.add(mesh(new THREE.BoxGeometry(len, 0.95, 0.66), mat(PAL.counter), cx, 0.475, L.counterZ));
      staticGroup.add(mesh(new THREE.BoxGeometry(len + 0.1, 0.08, 0.8), mat(PAL.marble, { roughness: 0.3 }), cx, 0.99, L.counterZ));
    });

    // stations
    DISHES.forEach((d, i) => {
      const st = L.stations[i];
      const unlocked = s.dishes[d.id].unlocked;
      const g = buildStation(d, unlocked);
      g.position.set(st.x, 0, st.z);
      g.userData = { kind: 'station', id: d.id };
      staticGroup.add(g);
      pickables.push(g);
      const label = liveSprite(256, 128, 0.85);
      label.position.set(st.x, 2.35, st.z + 0.2);
      staticGroup.add(label);
      stationMeshes[d.id] = { group: g, label, unlocked };
    });

    // trash
    const tg = new THREE.Group();
    tg.add(mesh(new THREE.CylinderGeometry(0.32, 0.27, 0.75, 16), mat(0x5e6b73), 0, 0.375, 0));
    tg.add(mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16), mat(0x47525a), 0, 0.78, 0));
    tg.position.set(L.trash.x, 0, L.trash.z);
    tg.userData = { kind: 'trash' };
    const ti = emojiSprite('🗑️', 0.45); ti.position.set(0, 1.15, 0); tg.add(ti);
    staticGroup.add(tg); pickables.push(tg);

    // tables
    tableMeshes.length = 0;
    const n = Math.min(s.up.tables, L.tables.length);
    for (let i = 0; i < n; i++) {
      const t = L.tables[i];
      const g = buildTable();
      g.position.set(t.x, 0, t.z);
      g.userData = { kind: 'table', index: i };
      staticGroup.add(g); pickables.push(g); tableMeshes.push(g);
    }

    // decor: plants along the walls + lamps
    const decor = Math.min(s.up.decor, 12);
    const spots = [];
    for (let z = 0.5; z < D - 1; z += 2.6) { spots.push([-W / 2 + 0.55, z], [W / 2 - 0.55, z]); }
    spots.push([-W / 2 + 0.55, D - 0.6], [W / 2 - 0.55, D - 0.6]);
    for (let i = 0; i < Math.min(decor, spots.length); i++) {
      const p = buildPlant(i);
      p.position.set(spots[i][0], 0, spots[i][1]);
      staticGroup.add(p);
    }
    if (decor >= 3) {
      const cloth = canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#fff8ec'; g.fillRect(0, 0, w, h);
        g.fillStyle = decor >= 9 ? 'rgba(47,111,115,.55)' : 'rgba(228,87,46,.5)';
        for (let i = 0; i < 8; i++) { g.fillRect(i * 16, 0, 8, h); g.fillRect(0, i * 16, w, 8); }
      }, [2, 2]);
      const clothM = new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.9 });
      for (let i = 0; i < n; i++) {
        const t = L.tables[i];
        staticGroup.add(mesh(new THREE.CylinderGeometry(0.86, 0.9, 0.12, 28), clothM, t.x, 0.78, t.z));
      }
    }
    if (decor >= 6) {
      for (let i = 0; i < 2; i++) {
        [-1, 1].forEach(sx => {
          const art = buildFrame(i + (sx > 0 ? 2 : 0));
          art.position.set(sx * (W / 2 - 0.02), 1.9, 1.5 + i * 4);
          art.rotation.y = -sx * Math.PI / 2;
          staticGroup.add(art);
        });
      }
    }

    // shadow camera covers the room
    const sc = sun.shadow.camera;
    const half = Math.max(W, D - B) / 2 + 4;
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = 1; sc.far = 80;
    sc.updateProjectionMatrix();
    sun.position.set(9, 22, (B + D) / 2 + 9);
    sun.target.position.set(0, 0, (B + D) / 2);
  }

  function buildStation(d, unlocked) {
    const g = new THREE.Group();
    const steel = unlocked ? mat(PAL.steel, { metalness: 0.35, roughness: 0.35 }) : mat(0x9a9aa3, { transparent: true, opacity: 0.55 });
    const accent = unlocked ? mat(d.color) : mat(0x8a8a92, { transparent: true, opacity: 0.55 });
    g.add(mesh(new THREE.BoxGeometry(1.8, 0.92, 1.0), steel, 0, 0.46, 0));
    g.add(mesh(new THREE.BoxGeometry(1.5, 0.5, 0.04), accent, 0, 0.48, 0.52));
    g.add(mesh(new THREE.BoxGeometry(1.86, 0.06, 1.06), unlocked ? mat(PAL.steelDark, { metalness: 0.4, roughness: 0.3 }) : steel, 0, 0.95, 0));
    if (!unlocked) return g;
    const dark = mat(0x2d2d33, { roughness: 0.5 });
    switch (d.id) {
      case 'burger':
        g.add(mesh(new THREE.BoxGeometry(1.4, 0.05, 0.8), dark, 0, 1.0, 0));
        for (let i = -2; i <= 2; i++) g.add(mesh(new THREE.BoxGeometry(0.04, 0.02, 0.74), mat(0x55555e), i * 0.25, 1.035, 0));
        break;
      case 'soda':
        g.add(mesh(new THREE.BoxGeometry(1.0, 1.1, 0.6), accent, 0, 1.53, -0.15));
        g.add(mesh(new THREE.BoxGeometry(0.9, 0.35, 0.05), mat(0xe8f6ff, { emissive: 0x3fa7d6, emissiveIntensity: 0.25 }), 0, 1.8, 0.16));
        [-0.25, 0, 0.25].forEach(x => g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 8), dark, x, 1.15, 0.18)));
        break;
      case 'fries':
        g.add(mesh(new THREE.BoxGeometry(1.2, 0.3, 0.7), steel, 0, 1.12, 0));
        g.add(mesh(new THREE.BoxGeometry(1.0, 0.04, 0.5), mat(0xd9a440, { roughness: 0.2 }), 0, 1.28, 0));
        g.add(mesh(new THREE.BoxGeometry(0.4, 0.2, 0.3), mat(0x777780, { wireframe: true }), -0.25, 1.36, 0));
        break;
      case 'pizza': {
        const dome = mesh(new THREE.SphereGeometry(0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xb5532f, { roughness: 0.9 }), 0, 0.98, -0.05);
        g.add(dome);
        g.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 20, 1, false, 0, Math.PI), mat(0x1c1414), 0, 1.13, 0.45));
        g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 10), mat(0x8d3e22), 0.3, 1.75, -0.2));
        break;
      }
      case 'sushi':
        g.add(mesh(new THREE.BoxGeometry(1.4, 0.06, 0.7), mat(0x6a8f4e), 0, 1.0, 0));
        for (let i = 0; i < 4; i++) g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 14), mat(0x1f2a1f), -0.45 + i * 0.3, 1.08, 0));
        g.add(mesh(new THREE.BoxGeometry(1.6, 0.06, 0.06), mat(0xb8312f), 0, 1.75, -0.35));
        break;
      case 'icecream':
        g.add(mesh(new THREE.BoxGeometry(0.9, 0.9, 0.6), mat(0xfff1f6), 0, 1.43, -0.15));
        g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.25, 14), accent, 0, 2.0, -0.15));
        g.add(mesh(new THREE.ConeGeometry(0.08, 0.16, 10), mat(0xd9d0d6, { metalness: 0.4 }), 0, 1.05, 0.15)).rotation.x = Math.PI;
        break;
    }
    return g;
  }
  function buildTable() {
    const g = new THREE.Group();
    const wood = mat(PAL.wood, { roughness: 0.6 }), dark = mat(PAL.woodDark);
    g.add(mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.07, 28), wood, 0, 0.78, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.75, 10), dark, 0, 0.39, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.05, 20), dark, 0, 0.025, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.16, 10), mat(0xf7f2ea), 0, 0.89, 0));
    g.add(mesh(new THREE.SphereGeometry(0.08, 10, 8), mat(0xe4572e), 0, 1.0, 0));
    [-1, 1].forEach(sx => {
      const c = new THREE.Group();
      c.add(mesh(new THREE.BoxGeometry(0.46, 0.07, 0.46), mat(0x2f6f73), 0, 0.46, 0));
      c.add(mesh(new THREE.BoxGeometry(0.07, 0.55, 0.46), mat(0x2f6f73), sx * 0.22, 0.75, 0));
      c.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.44, 6), dark, 0, 0.22, 0));
      c.position.set(sx * 1.0, 0, 0);
      g.add(c);
    });
    return g;
  }
  function buildPlant(i) {
    const g = new THREE.Group();
    const pots = [0xd96c3f, 0xf3e6d0, 0x2f6f73, 0x6c5b7b];
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.45, 14), mat(pots[i % pots.length]), 0, 0.225, 0));
    const leaf = mat([0x5a8f4e, 0x6ea35b, 0x4d7f45][i % 3], { roughness: 0.9 });
    g.add(mesh(new THREE.SphereGeometry(0.38, 12, 10), leaf, 0, 0.8, 0));
    g.add(mesh(new THREE.SphereGeometry(0.28, 12, 10), leaf, 0.15, 1.12, 0.05));
    g.add(mesh(new THREE.SphereGeometry(0.22, 12, 10), leaf, -0.15, 1.05, -0.1));
    return g;
  }
  function buildFrame(i) {
    const g = new THREE.Group();
    const cols = [['#e4572e', '#f2c14e'], ['#2f6f73', '#f3e6d0'], ['#6c5b7b', '#f4a6c6'], ['#3fa7d6', '#f2c14e']][i % 4];
    const tex = canvasTex(128, 160, (c, w, h) => {
      c.fillStyle = cols[1]; c.fillRect(0, 0, w, h);
      c.fillStyle = cols[0]; c.beginPath(); c.arc(w / 2, h / 2 + 10, 40, 0, Math.PI * 2); c.fill();
      c.fillRect(20, 20, w - 40, 18);
    });
    g.add(mesh(new THREE.BoxGeometry(0.9, 1.1, 0.06), mat(PAL.woodDark), 0, 0, 0));
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.96), new THREE.MeshStandardMaterial({ map: tex }));
    p.position.z = 0.035; g.add(p);
    return g;
  }

  /* ---------- characters ---------- */
  function buildChef(color, isBot) {
    const g = new THREE.Group();
    const body = new THREE.Group(); g.add(body);
    const coat = mat(isBot ? PAL.staff : PAL.chef, { roughness: 0.85 });
    const skin = mat(LOOKS.SKINS[isBot ? 1 : 0]);
    const legL = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.4, 8), mat(PAL.ink), -0.13, 0.2, 0);
    const legR = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.4, 8), mat(PAL.ink), 0.13, 0.2, 0);
    body.add(legL, legR);
    body.add(mesh(new THREE.CylinderGeometry(0.29, 0.35, 0.62, 16), coat, 0, 0.7, 0));
    body.add(mesh(new THREE.BoxGeometry(0.44, 0.48, 0.05), mat(isBot ? PAL.staffApron : color), 0, 0.64, 0.31));
    body.add(mesh(new THREE.SphereGeometry(0.26, 18, 14), skin, 0, 1.22, 0));
    [-0.09, 0.09].forEach(x => body.add(mesh(new THREE.SphereGeometry(0.035, 8, 6), mat(PAL.ink), x, 1.25, 0.23, false)));
    body.add(mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.24, 14), coat, 0, 1.5, 0));
    body.add(mesh(new THREE.SphereGeometry(0.28, 14, 10), coat, 0, 1.66, 0)).scale.set(1, 0.65, 1);
    if (!isBot) body.add(mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.06, 14), mat(color), 0, 1.43, 0));
    const armL = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8), coat, -0.36, 0.82, 0);
    const armR = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8), coat, 0.36, 0.82, 0);
    body.add(armL, armR);
    const carry = new THREE.Group(); carry.position.set(0, 1.02, 0.5); body.add(carry);
    g.userData = { body, legL, legR, armL, armR, carry, carryKey: '', phase: Math.random() * 6 };
    return g;
  }
  function buildCustomer(look) {
    const g = new THREE.Group();
    const body = new THREE.Group(); g.add(body);
    const shirt = mat(LOOKS.SHIRTS[look[0] % LOOKS.SHIRTS.length]);
    const skin = mat(LOOKS.SKINS[look[1] % LOOKS.SKINS.length]);
    const hair = mat(LOOKS.HAIRS[look[2] % LOOKS.HAIRS.length], { roughness: 0.9 });
    const legL = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.42, 8), mat(0x3b3f5c), -0.12, 0.21, 0);
    const legR = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.42, 8), mat(0x3b3f5c), 0.12, 0.21, 0);
    body.add(legL, legR);
    body.add(mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.58, 14), shirt, 0, 0.71, 0));
    body.add(mesh(new THREE.SphereGeometry(0.24, 16, 12), skin, 0, 1.2, 0));
    body.add(mesh(new THREE.SphereGeometry(0.255, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 1.22, -0.02));
    [-0.08, 0.08].forEach(x => body.add(mesh(new THREE.SphereGeometry(0.032, 8, 6), mat(PAL.ink), x, 1.22, 0.21, false)));
    const bubble = liveSprite(256, 150, 0.95);
    bubble.position.set(0, 2.05, 0);
    g.add(bubble);
    g.userData = { body, legL, legR, bubble, phase: Math.random() * 6 };
    return g;
  }
  function nameTag(name, color) {
    const sp = liveSprite(256, 64, 0.32);
    sp.redraw(name + color, (g, w, h) => {
      g.font = 'bold 34px system-ui, sans-serif';
      const tw = Math.min(w - 8, g.measureText(name).width + 28);
      g.fillStyle = hex(color); roundRect(g, (w - tw) / 2, 6, tw, h - 12, 24); g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, w / 2, h / 2 + 1);
    });
    return sp;
  }

  function setCarry(actor, carry) {
    const ud = actor.userData;
    const key = carry.join(',');
    if (ud.carryKey === key) return;
    ud.carryKey = key;
    while (ud.carry.children.length) ud.carry.remove(ud.carry.children[0]);
    carry.forEach((id, i) => {
      const sp = emojiSprite(DISH[id] ? DISH[id].emoji : '❓', 0.5);
      sp.position.set((i - (carry.length - 1) / 2) * 0.32, i % 2 ? 0.08 : 0, 0);
      ud.carry.add(sp);
    });
  }
  function animateWalk(actor, moving, t, dt) {
    const ud = actor.userData;
    ud.phase += dt * (moving ? 11 : 2);
    const sw = moving ? Math.sin(ud.phase) * 0.5 : 0;
    ud.legL.rotation.x = sw; ud.legR.rotation.x = -sw;
    if (ud.armL) {
      const carrying = ud.carry && ud.carry.children.length;
      ud.armL.rotation.x = carrying ? -1.2 : -sw * 0.8;
      ud.armR.rotation.x = carrying ? -1.2 : sw * 0.8;
    }
    ud.body.position.y = moving ? Math.abs(Math.sin(ud.phase)) * 0.06 : Math.sin(ud.phase) * 0.01;
  }
  const lerpK = (dt, k) => 1 - Math.exp(-dt * k);
  function lerpAngle(a, b, f) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * f;
  }

  /* ---------- per-frame sync ---------- */
  function sync(view, myId, myPos, dt) {
    if (!view) return;
    buildRoom(view.s);
    const t = performance.now() / 1000;

    // station labels
    DISHES.forEach(d => {
      const sm = stationMeshes[d.id];
      if (!sm) return;
      const st = view.stations[d.id] || { stock: 0, progress: -1 };
      if (!sm.unlocked) {
        sm.label.redraw('lock' + d.id, (g, w, h) => {
          g.fillStyle = 'rgba(43,34,51,.78)'; roundRect(g, 30, 22, w - 60, h - 44, 22); g.fill();
          g.font = `46px ${EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText('🔒', 74, h / 2 + 2);
          g.fillStyle = '#fff8ec'; g.font = 'bold 30px system-ui, sans-serif'; g.textAlign = 'left';
          g.fillText('$' + fmt(d.unlock), 108, h / 2 + 2);
        });
        return;
      }
      const cap = Stats.stockCap(view.s, d.id);
      const prog = st.progress;
      const key = `${st.stock}/${cap}/${prog < 0 ? -1 : Math.round(prog * 40)}`;
      sm.label.redraw(key, (g, w, h) => {
        g.fillStyle = 'rgba(255,248,236,.94)'; roundRect(g, 14, 10, w - 28, h - 20, 22); g.fill();
        g.font = `40px ${EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        const n = Math.max(cap, 1), slot = Math.min(44, (w - 60) / n);
        for (let i = 0; i < n; i++) {
          g.globalAlpha = i < st.stock ? 1 : 0.18;
          g.fillText(d.emoji, w / 2 + (i - (n - 1) / 2) * slot, 52);
        }
        g.globalAlpha = 1;
        g.fillStyle = 'rgba(43,34,51,.15)'; roundRect(g, 34, 86, w - 68, 18, 9); g.fill();
        if (prog >= 0) { g.fillStyle = '#e4572e'; roundRect(g, 34, 86, Math.max(18, (w - 68) * prog), 18, 9); g.fill(); }
        else if (st.stock >= cap) { g.fillStyle = '#5aa36b'; roundRect(g, 34, 86, w - 68, 18, 9); g.fill(); }
      });
    });

    // customers
    syncSet(actors.customers, view.customers, c => buildCustomer(c.look), (m, c) => {
      const f = lerpK(dt, 14);
      m.position.x += (c.x - m.position.x) * f;
      m.position.z += (c.z - m.position.z) * f;
      m.rotation.y = lerpAngle(m.rotation.y, c.ry, lerpK(dt, 12));
      const seated = !c.walking && (c.state === 1 || c.state === 2);
      m.userData.body.position.y = seated ? 0.12 : m.userData.body.position.y;
      animateWalk(m, c.walking, t, dt);
      if (seated) { m.userData.legL.rotation.x = m.userData.legR.rotation.x = -1.3; m.userData.body.position.y = 0.05; }
      const bub = m.userData.bubble;
      bub.visible = c.state === 1 || c.state === 0 || c.state === 2;
      const pf = Math.max(0, Math.min(1, c.pf));
      const key = `${c.state}|${c.order.join(',')}|${c.got.join('')}|${Math.round(pf * 24)}`;
      bub.redraw(key, (g, w, h) => drawBubble(g, w, h, c, pf));
    });

    // players
    syncSet(actors.players, view.players, p => {
      const m = buildChef(p.color, false);
      const tag = nameTag(p.name, p.color); tag.position.y = 2.2; m.add(tag); m.userData.tag = tag;
      if (p.id === myId) {
        const ring = mesh(new THREE.RingGeometry(0.42, 0.52, 32), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.85 }), 0, 0.02, 0, false, false);
        ring.rotation.x = -Math.PI / 2; m.add(ring);
      }
      return m;
    }, (m, p) => {
      if (p.id === myId && myPos) {
        m.position.x = myPos.x; m.position.z = myPos.z;
        m.rotation.y = lerpAngle(m.rotation.y, myPos.ry, lerpK(dt, 16));
        animateWalk(m, myPos.moving, t, dt);
      } else {
        const f = lerpK(dt, 12);
        m.position.x += (p.x - m.position.x) * f; m.position.z += (p.z - m.position.z) * f;
        m.rotation.y = lerpAngle(m.rotation.y, p.ry, lerpK(dt, 12));
        animateWalk(m, p.moving, t, dt);
      }
      m.userData.tag.redraw(p.name + p.color, () => {});
      setCarry(m, p.carry);
    }, p => p.id + '|' + p.color + '|' + p.name);

    // bots
    syncSet(actors.bots, view.bots, () => {
      const m = buildChef(0, true);
      const tag = nameTag('Staff', 0x3d6a92); tag.position.y = 2.15; m.add(tag);
      return m;
    }, (m, b) => {
      const f = lerpK(dt, 12);
      m.position.x += (b.x - m.position.x) * f; m.position.z += (b.z - m.position.z) * f;
      m.rotation.y = lerpAngle(m.rotation.y, b.ry, lerpK(dt, 12));
      animateWalk(m, b.moving, t, dt);
      setCarry(m, b.carry);
    });

    // popups
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.life -= dt;
      p.sprite.position.y += dt * 0.9;
      p.sprite.material.opacity = Math.min(1, p.life / 0.5);
      if (p.life <= 0) { scene.remove(p.sprite); if (!p.shared) p.sprite.material.map.dispose(); p.sprite.material.dispose(); popups.splice(i, 1); }
    }

    // camera follows the local chef, clamped to the room
    const fx = myPos ? myPos.x : 0, fz = myPos ? myPos.z : (L.backZ + L.D) / 2;
    const tx = Math.max(-L.W / 2 + 3, Math.min(L.W / 2 - 3, fx));
    const portrait = window.innerHeight > window.innerWidth;
    const tz = Math.max(L.backZ + (portrait ? 4.2 : 3), Math.min(L.D - 2, fz));
    if (!cam.ready) { cam.x = tx; cam.z = tz; cam.ready = true; }
    const cf = lerpK(dt, 4);
    cam.x += (tx - cam.x) * cf; cam.z += (tz - cam.z) * cf;
    const aspect = window.innerWidth / window.innerHeight;
    const z = cam.zoom * (portrait ? Math.min(1.8, Math.max(1.15, 0.72 / aspect)) : 1) * (1 + L.level * 0.08);
    camera.position.set(cam.x, 13.5 * z, cam.z + 10.5 * z);
    camera.lookAt(cam.x, 0, cam.z - 0.6);

    renderer.render(scene, camera);
  }

  function drawBubble(g, w, h, c, pf) {
    g.fillStyle = 'rgba(255,255,255,.96)';
    roundRect(g, 8, 8, w - 16, h - 40, 26); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 14, h - 33); g.lineTo(w / 2, h - 12); g.lineTo(w / 2 + 14, h - 33); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (c.state === 2) {
      g.font = `56px ${EMOJI_FONT}`; g.fillText('😋', w / 2, 62);
      return;
    }
    const n = c.order.length;
    const slot = Math.min(70, (w - 40) / n);
    g.font = `52px ${EMOJI_FONT}`;
    c.order.forEach((id, i) => {
      const x = w / 2 + (i - (n - 1) / 2) * slot;
      g.globalAlpha = c.got[i] ? 0.25 : 1;
      g.fillText(DISH[id] ? DISH[id].emoji : '❓', x, 54);
      g.globalAlpha = 1;
      if (c.got[i]) { g.fillStyle = '#5aa36b'; g.font = 'bold 40px system-ui'; g.fillText('✓', x + 18, 66); g.font = `52px ${EMOJI_FONT}`; }
    });
    if (c.state === 1) {
      const col = pf > 0.5 ? '#5aa36b' : pf > 0.25 ? '#f2c14e' : '#e4572e';
      g.fillStyle = 'rgba(43,34,51,.12)'; roundRect(g, 30, 90, w - 60, 14, 7); g.fill();
      g.fillStyle = col; roundRect(g, 30, 90, Math.max(14, (w - 60) * pf), 14, 7); g.fill();
    }
  }

  function syncSet(map, list, make, update, keyOf) {
    const seen = new Set();
    for (const item of list) {
      const k = keyOf ? keyOf(item) : item.id;
      seen.add(k);
      let m = map.get(k);
      if (!m) {
        m = make(item);
        m.position.set(item.x, 0, item.z);
        m.rotation.y = item.ry || 0;
        m.traverse(o => { if (o.isMesh) o.castShadow = true; });
        scene.add(m);
        map.set(k, m);
      }
      m.userData.item = item;
      update(m, item);
    }
    for (const [k, m] of map) {
      if (!seen.has(k)) { scene.remove(m); map.delete(k); }
    }
  }

  /* ---------- effects ---------- */
  function popup(text, x, z, color, size) {
    const w = 320, h = 96;
    const tex = canvasTex(w, h, (g) => {
      g.font = `900 ${size || 60}px "Trebuchet MS", system-ui, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 10; g.strokeStyle = 'rgba(43,34,51,.85)'; g.strokeText(text, w / 2, h / 2);
      g.fillStyle = color || '#f2c14e'; g.fillText(text, w / 2, h / 2);
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
    sp.scale.set(1.6, 0.48, 1);
    sp.position.set(x, 2.6, z);
    sp.renderOrder = 10;
    scene.add(sp);
    popups.push({ sprite: sp, life: 1.4 });
  }
  function emojiPop(e, x, z) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(e), transparent: true, depthWrite: false, depthTest: false }));
    sp.scale.set(0.75, 0.75, 1);
    sp.position.set(x, 2.4, z);
    sp.renderOrder = 10;
    scene.add(sp);
    popups.push({ sprite: sp, life: 1.2, shared: true });
  }

  /* ---------- picking ---------- */
  function pick(clientX, clientY) {
    const v = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(v, camera);
    const custMeshes = [...actors.customers.values()];
    const hits = raycaster.intersectObjects([...pickables, ...custMeshes], true);
    for (const h of hits) {
      let o = h.object;
      while (o && !(o.userData && (o.userData.kind || o.userData.item))) o = o.parent;
      if (!o) continue;
      if (o.userData.kind === 'station' || o.userData.kind === 'trash') return { kind: o.userData.kind, id: o.userData.id };
      if (o.userData.kind === 'table') return { kind: 'table', index: o.userData.index };
      if (o.userData.item && actors.customers.get(o.userData.item.id) === o) return { kind: 'customer', id: o.userData.item.id };
    }
    if (floorMesh) {
      const fh = raycaster.intersectObject(floorMesh);
      if (fh.length) return { kind: 'floor', x: fh[0].point.x, z: fh[0].point.z };
    }
    return null;
  }

  function zoomBy(f) { cam.zoom = Math.max(0.6, Math.min(1.8, cam.zoom * f)); }
  function layout() { return L; }

  window.OU.World = { init, sync, pick, popup, emojiPop, zoomBy, layout, resetCamera: () => { cam.ready = false; } };
})();
