/* ========= DEMİR TAÇ — 3B arena (Three.js) =========
   Dövüş mantığı aynı kalır; bu sınıf ArenaScene ile aynı arayüzü sunar (ux, ground, s, efektler).
   Gladyatör pozları 2B iskelet hesabından (poseFor) alınır ve 3B eklemlere taşınır. */
const S3 = 0.01; // 2B piksel → 3B metre

function rig2D(F, anim, p, t) {
  const eq = F.equip, weapon = (typeof eq.weapon === 'object' ? eq.weapon : ITEM[eq.weapon]) || ITEM.w0;
  const P = poseFor(anim, p, t, weapon.kind);
  const hip = [P.bx, -84 + P.crouch + P.by];
  const sh = [hip[0] + Math.sin(P.lean) * 54, hip[1] - Math.cos(P.lean) * 54];
  const head = [sh[0] + Math.sin(P.lean + P.head) * 22 + 2, sh[1] - Math.cos(P.lean + P.head) * 22];
  let fF, fB;
  if (P.walk !== null) { const w = Math.sin(P.walk); fF = [P.bx + 10 + w * 16, -Math.max(0, Math.cos(P.walk)) * 7]; fB = [P.bx - 10 - w * 16, -Math.max(0, -Math.cos(P.walk)) * 7]; }
  else { fF = [hip[0] * .4 + 16 * P.stride, 0]; fB = [hip[0] * .4 - 16 * P.stride, 0]; }
  const kF = ik(hip[0], hip[1], fF[0], fF[1], 44, 44), kB = ik(hip[0], hip[1], fB[0], fB[1], 44, 44);
  const sElb = [sh[0] + Math.cos(P.sA) * 26, sh[1] + Math.sin(P.sA) * 26];
  const sHand = [sElb[0] + Math.cos(P.sF) * 24, sElb[1] + Math.sin(P.sF) * 24];
  const elb = [sh[0] + Math.cos(P.aA) * 26, sh[1] + Math.sin(P.aA) * 26];
  const hand = [elb[0] + Math.cos(P.fA) * 24, elb[1] + Math.sin(P.fA) * 24];
  return { P, weapon, hip, sh, head, fF, fB, kF, kB, sElb, sHand, elb, hand };
}

function canvasTex(w, h, draw, repeat) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding; tx.anisotropy = 4;
  if (repeat) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(repeat[0], repeat[1]); }
  return tx;
}

/* ---------------- 3B gladyatör ---------------- */
class Rig3D {
  constructor(F, scene) {
    this.F = F;
    const L = F.look, eq = F.equip;
    const mat = (col, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: col, roughness: .65, metalness: 0, ...o }); this.mats.push(m); return m; };
    this.mats = [];
    const metal = tier => mat(METAL[tier], { metalness: .85, roughness: .32 });
    const skin = mat(L.skin), skinD = mat(shade(L.skin, -.15)), hair = mat(L.hair, { roughness: .9 });
    const leather = mat('#5a3a20', { roughness: .85 }), wood = mat('#6b4325', { roughness: .8 }), gold = mat('#e2b25a', { metalness: .9, roughness: .3 });
    const chest = ITEM[eq.chest], helm = ITEM[eq.helm], shield = ITEM[eq.shield];
    this.weapon = (typeof eq.weapon === 'object' ? eq.weapon : ITEM[eq.weapon]) || ITEM.w0;
    const CYL = new THREE.CylinderGeometry(1, 1, 1, 12), SPH = new THREE.SphereGeometry(1, 16, 12);
    const mk = (geo, m, parent) => { const ms = new THREE.Mesh(geo, m); ms.castShadow = true; ms.receiveShadow = true; (parent || this.body).add(ms); return ms; };

    this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body); scene.add(this.root);
    // bacaklar
    const legM = chest && chest.tier >= 2 ? metal(chest.tier) : skin;
    this.thighF = mk(CYL, skin); this.shinF = mk(CYL, legM); this.thighB = mk(CYL, skinD); this.shinB = mk(CYL, skinD);
    this.kneeF = mk(SPH, skin); this.kneeB = mk(SPH, skinD);
    const FOOT = new THREE.BoxGeometry(.2, .07, .1);
    this.footF = mk(FOOT, leather); this.footB = mk(FOOT, leather);
    // gövde
    const torsoM = chest ? (chest.tier === 0 ? mat('#7a4b2a', { roughness: .8 }) : metal(chest.tier)) : skin;
    this.torso = mk(new THREE.CylinderGeometry(1, .78, 1, 18), torsoM);
    if (chest && chest.tier >= 1) { this.bands = []; for (let i = 0; i < 3; i++) this.bands.push(mk(new THREE.TorusGeometry(1, .06, 6, 20), metal(Math.max(0, chest.tier - 1)))); }
    this.skirt = mk(new THREE.CylinderGeometry(.8, 1.2, 1, 18, 1, true), mat(chest ? (chest.tier === 0 ? '#5a3a20' : '#8c1f17') : '#d8c7a3', { side: THREE.DoubleSide }));
    this.belt = mk(CYL, leather);
    this.buckle = mk(new THREE.BoxGeometry(.03, .06, .07), gold);
    if (L.apron) this.apron = mk(new THREE.BoxGeometry(.03, .5, .3), mat(L.apron));
    if (chest && chest.tier >= 2) { this.paulF = mk(SPH, metal(chest.tier)); this.paulB = mk(SPH, metal(chest.tier)); }
    // pelerin (dalgalanan)
    this.capeGeo = new THREE.PlaneGeometry(.42, .78, 4, 8);
    this.capeBase = this.capeGeo.attributes.position.array.slice();
    this.cape = mk(this.capeGeo, mat(L.cape, { side: THREE.DoubleSide, roughness: .9 }));
    // baş
    this.neck = mk(CYL, skin);
    this.headG = new THREE.Group(); this.body.add(this.headG);
    mk(new THREE.SphereGeometry(.14, 20, 16), skin, this.headG).scale.set(1, 1.08, .95);
    mk(new THREE.SphereGeometry(.035, 8, 6), skin, this.headG).position.set(.14, -.01, 0); // burun
    if (!helm || helm.tier < 3) {
      [.055, -.055].forEach(z => { const e = mk(new THREE.SphereGeometry(.018, 8, 6), mat('#1a110c'), this.headG); e.position.set(.12, .03, z); });
    }
    if (L.beard && (!helm || helm.tier < 3)) { const b = mk(new THREE.SphereGeometry(.11, 12, 10), hair, this.headG); b.position.set(.06, -.09, 0); b.scale.set(1, .7, 1.05); }
    if (!helm) {
      const h = mk(new THREE.SphereGeometry(.152, 18, 12, 0, Math.PI * 2, 0, Math.PI * .5), hair, this.headG); h.rotation.z = .35; h.position.y = .01;
      if (L.hairStyle === 1) { const tail = mk(new THREE.SphereGeometry(.08, 10, 8), hair, this.headG); tail.position.set(-.14, -.06, 0); tail.scale.set(.8, 1.6, .8); }
    } else this.buildHelm(helm, metal, mat, gold, mk);
    // kollar
    this.uArmF = mk(CYL, skin); this.fArmF = mk(CYL, chest && chest.tier >= 3 ? leather : skin); this.handF = mk(SPH, skin);
    this.uArmB = mk(CYL, skinD); this.fArmB = mk(CYL, skinD); this.handB = mk(SPH, skinD);
    this.elbF = mk(SPH, skin); this.elbB = mk(SPH, skinD);
    // silah
    this.wG = new THREE.Group(); this.body.add(this.wG); this.buildWeapon(this.weapon, metal, wood, gold, mk);
    // kalkan
    if (shield) {
      this.sG = new THREE.Group(); this.body.add(this.sG);
      const face = shield.tier === 0 ? mat('#8a5a2e', { roughness: .8 }) : shield.tier >= 4 ? mat('#8c1f17') : metal(Math.max(1, shield.tier - 1));
      if (shield.kind === 'tower') {
        const h = .82 + shield.tier * .05;
        mk(new THREE.BoxGeometry(.05, h, .42), face, this.sG);
        const rim = mk(new THREE.BoxGeometry(.06, h + .03, .045), metal(shield.tier), this.sG); rim.position.z = .2;
        const rim2 = rim.clone(); rim2.position.z = -.2; this.sG.add(rim2);
        mk(new THREE.SphereGeometry(.06, 12, 8), metal(shield.tier), this.sG).position.x = .04;
      } else {
        const r = .27 + shield.tier * .035;
        const d = mk(new THREE.CylinderGeometry(r, r, .045, 28), face, this.sG); d.rotation.z = Math.PI / 2;
        const rim = mk(new THREE.TorusGeometry(r, .022, 8, 32), metal(shield.tier), this.sG); rim.rotation.y = Math.PI / 2;
        mk(new THREE.SphereGeometry(.07, 12, 8), metal(shield.tier), this.sG).position.x = .03;
      }
    }
    this.flashV = 0;
  }
  buildHelm(helm, metal, mat, gold, mk) {
    const g = this.headG, m = helm.tier === 0 ? mat('#7a4b2a', { roughness: .85 }) : metal(helm.tier);
    const dome = mk(new THREE.SphereGeometry(.165, 20, 12, 0, Math.PI * 2, 0, Math.PI * .52), m, g); dome.position.y = .005;
    if (helm.tier >= 1) {
      const rim = mk(new THREE.TorusGeometry(.165, .018, 6, 24), m, g); rim.rotation.x = Math.PI / 2; rim.position.y = 0;
      [.12, -.12].forEach(z => { const ch = mk(new THREE.BoxGeometry(.1, .14, .02), m, g); ch.position.set(.05, -.07, z); });
    }
    if (helm.tier >= 2) { const crest = mk(new THREE.TorusGeometry(.15, .035, 6, 16, Math.PI), mat(helm.tier >= 4 ? '#f0e2b0' : '#b3261b', { roughness: .95 }), g); crest.position.y = .06; crest.scale.z = .7; }
    if (helm.tier >= 3) { const fg = mk(new THREE.BoxGeometry(.03, .17, .22), m, g); fg.position.set(.15, -.04, 0);
      const slit = mk(new THREE.BoxGeometry(.035, .02, .16), mat('#0a0605'), g); slit.position.set(.16, .02, 0); }
    if (helm.tier >= 4) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, c = mk(new THREE.ConeGeometry(.025, .09, 6), gold, g); c.position.set(Math.cos(a) * .13, .12, Math.sin(a) * .13); }
  }
  buildWeapon(w, metal, wood, gold, mk) {
    const g = this.wG, m = metal(w.tier);
    const rod = (len, r, from, mt) => { const c = mk(new THREE.CylinderGeometry(r, r, len, 10), mt, g); c.rotation.z = Math.PI / 2; c.position.x = from + len / 2; return c; };
    if (w.kind === 'none') return;
    if (w.kind === 'hammer') { rod(.5, .02, -.1, wood); mk(new THREE.BoxGeometry(.1, .18, .1), m, g).position.x = .4; this.tipLen = .45; return; }
    if (w.kind === 'sword') {
      const L = .5 + w.tier * .05;
      rod(.15, .022, -.12, wood);
      mk(new THREE.BoxGeometry(.035, .18, .05), w.tier >= 3 ? gold : m, g).position.x = .03;
      const blade = mk(new THREE.BoxGeometry(L, .062, .014), m, g); blade.position.x = .05 + L / 2;
      const tip = mk(new THREE.ConeGeometry(.044, .1, 4), m, g); tip.rotation.z = -Math.PI / 2; tip.position.x = .05 + L + .05; tip.scale.z = .32;
      mk(new THREE.SphereGeometry(.03, 10, 8), gold, g).position.x = -.13;
      this.tipLen = .05 + L + .1;
    } else if (w.kind === 'axe') {
      rod(.72, .022, -.14, wood);
      const sh = new THREE.Shape(); sh.moveTo(0, -.02); sh.quadraticCurveTo(.06, .22, .24, .26); sh.quadraticCurveTo(.18, .06, .22, -.14); sh.quadraticCurveTo(.08, -.1, 0, .04);
      const head = mk(new THREE.ExtrudeGeometry(sh, { depth: .025, bevelEnabled: false }), m, g); head.position.set(.38, 0, -.012);
      if (w.tier >= 4) { const h2 = head.clone(); h2.scale.x = -.6; h2.position.x = .4; g.add(h2); }
      this.tipLen = .6;
    } else if (w.kind === 'mace') {
      rod(.5, .022, -.12, wood);
      mk(new THREE.IcosahedronGeometry(.1, 1), m, g).position.x = .46;
      for (let i = 0; i < 10; i++) { const s = mk(new THREE.ConeGeometry(.022, .08, 6), metal(Math.max(0, w.tier - 1)), g); const v = new THREE.Vector3().randomDirection(); s.position.set(.46 + v.x * .1, v.y * .1, v.z * .1); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v); }
      this.tipLen = .55;
    } else {
      rod(1.3, .018, -.36, wood);
      if (w.kind === 'spear') { const tip = mk(new THREE.ConeGeometry(.045, .22, 6), m, g); tip.rotation.z = -Math.PI / 2; tip.position.x = 1.05; this.tipLen = 1.15; }
      else { [-.07, 0, .07].forEach(y => { const pr = mk(new THREE.ConeGeometry(.022, .2, 6), m, g); pr.rotation.z = -Math.PI / 2; pr.position.set(1.04, y, 0); });
        mk(new THREE.BoxGeometry(.03, .17, .03), m, g).position.x = .93; this.tipLen = 1.13; }
    }
  }
  limb(mesh, a, b, r, rz = r) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length() || .001;
    mesh.position.copy(a).addScaledVector(d, .5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    mesh.scale.set(r, len, rz);
  }
  update(f, x, t) {
    const R = rig2D(this.F, f.anim, Math.min(1, (now() - f.a0) / f.dur), t + (f.side === 'e' ? 1.3 : 0));
    const v = (p, z = 0) => new THREE.Vector3(p[0] * S3, -p[1] * S3, z);
    this.root.position.set(x, 0, 0); this.root.rotation.y = f.dir > 0 ? 0 : Math.PI;
    this.body.rotation.z = -R.P.rot; this.body.position.x = -.2 * Math.abs(R.P.rot) / 1.5;
    const hip = v(R.hip), sh = v(R.sh);
    // bacaklar
    const zF = .095, zB = -.095;
    const hipF = v(R.hip, zF), hipB = v(R.hip, zB), kF = v(R.kF, zF), kB = v(R.kB, zB), fF = v(R.fF, zF), fB = v(R.fB, zB);
    fF.y += .04; fB.y += .04;
    this.limb(this.thighF, hipF, kF, .078); this.limb(this.shinF, kF, fF, .064);
    this.limb(this.thighB, hipB, kB, .078); this.limb(this.shinB, kB, fB, .064);
    this.kneeF.position.copy(kF); this.kneeF.scale.setScalar(.072); this.kneeB.position.copy(kB); this.kneeB.scale.setScalar(.072);
    this.footF.position.set(fF.x + .05, fF.y - .02, zF); this.footB.position.set(fB.x + .05, fB.y - .02, zB);
    // gövde
    this.limb(this.torso, hip, sh, .16, .23);
    if (this.bands) this.bands.forEach((b, i) => { const k = .2 + i * .25; b.position.lerpVectors(hip, sh, k); b.quaternion.copy(this.torso.quaternion); b.rotateX(Math.PI / 2); const r = .155 + k * .04; b.scale.set(r, r * 1.38, 1); });
    const lean = Math.atan2(sh.x - hip.x, sh.y - hip.y);
    this.skirt.position.set(hip.x, hip.y - .12, 0); this.skirt.rotation.z = -lean * .5; this.skirt.scale.set(.19, .26, .24);
    this.belt.position.set(hip.x, hip.y + .01, 0); this.belt.rotation.z = -lean; this.belt.scale.set(.165, .07, .225);
    this.buckle.position.set(hip.x + .16, hip.y + .01, 0);
    if (this.apron) { this.apron.position.lerpVectors(hip, sh, .3); this.apron.position.x += .14; this.apron.rotation.z = -lean; }
    if (this.paulF) { this.paulF.position.set(sh.x, sh.y - .02, .2); this.paulF.scale.set(.1, .08, .1); this.paulB.position.set(sh.x, sh.y - .02, -.2); this.paulB.scale.set(.1, .08, .1); }
    // pelerin dalgası
    const pos = this.capeGeo.attributes.position, base = this.capeBase;
    for (let i = 0; i < pos.count; i++) { const yy = base[i * 3 + 1], k = (.39 - yy) / .78; pos.array[i * 3 + 2] = Math.sin(t * 3 + k * 3 + base[i * 3] * 4) * .06 * k; }
    pos.needsUpdate = true; this.capeGeo.computeVertexNormals();
    this.cape.position.set(sh.x - .17, sh.y - .38, 0); this.cape.rotation.set(0, Math.PI / 2, -lean * .7 - .12);
    // baş
    const hd = v(R.head);
    this.limb(this.neck, sh, hd, .055);
    this.headG.position.copy(hd); this.headG.rotation.z = -(R.P.lean + R.P.head);
    // kollar
    const zA = .23, zS = -.23;
    const shF = v(R.sh, zA), shB = v(R.sh, zS), eF = v(R.elb, zA + .02), hF = v(R.hand, zA + .03), eB = v(R.sElb, zS), hB = v(R.sHand, zS);
    this.limb(this.uArmF, shF, eF, .062); this.limb(this.fArmF, eF, hF, .054); this.handF.position.copy(hF); this.handF.scale.setScalar(.055);
    this.limb(this.uArmB, shB, eB, .06); this.limb(this.fArmB, eB, hB, .052); this.handB.position.copy(hB); this.handB.scale.setScalar(.052);
    this.elbF.position.copy(eF); this.elbF.scale.setScalar(.06); this.elbB.position.copy(eB); this.elbB.scale.setScalar(.058);
    this.wG.position.copy(hF); this.wG.rotation.set(0, 0, -R.P.wA);
    if (this.sG) { this.sG.position.set(hB.x + .08, hB.y - .03, zS + .05); this.sG.rotation.set(0, 0, -R.P.sA * .25); }
    // vuruş parlaması
    const fl = f.flash > .05 ? f.flash : 0;
    if (fl !== this.flashV) { this.flashV = fl; this.mats.forEach(m => m.emissive.setRGB(fl, fl, fl)); }
    // silah ucu (iz efekti için)
    const tipW = this.wG.localToWorld(new THREE.Vector3(this.tipLen || .5, 0, 0));
    return tipW;
  }
  dispose(scene) { scene.remove(this.root); this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); this.mats.forEach(m => m.dispose()); }
}

/* ---------------- 3B arena sahnesi ---------------- */
class Arena3D {
  static ok() {
    if (typeof THREE === 'undefined') return false;
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  }
  constructor(glCanvas, overlay) {
    this.is3D = true; this.gl = glCanvas; this.cv = overlay; this.c = overlay.getContext('2d');
    this.parts = []; this.texts = []; this.rings = []; this.shake = 0; this.zoom = 1; this.hype = 0; this.rigs = [];
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, powerPreference: 'high-performance' });
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, .1, 200);
    this.camPos = new THREE.Vector3(0, 2.4, 9); this.camLook = new THREE.Vector3(0, 1.05, 0);
    this.build(); this.resize();
  }
  wx(u) { return (u - 6) * .95; }
  build() {
    const sc = this.scene;
    sc.background = canvasTex(4, 512, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1d1428'); g.addColorStop(.45, '#5b2b2f'); g.addColorStop(.75, '#c0653a'); g.addColorStop(1, '#f2b062'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    sc.fog = new THREE.Fog(0x3a2218, 26, 70);
    // ışıklar
    this.hemi = new THREE.HemisphereLight(0xffd9a8, 0x3a2418, .55); sc.add(this.hemi); this.torchK = 1;
    const sun = this.sun = new THREE.DirectionalLight(0xffc48a, 1.7);
    sun.position.set(-9, 15, 9); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 50 }); sun.shadow.bias = -.0008;
    sc.add(sun); sc.add(sun.target);
    // kum
    const sand = canvasTex(512, 512, (c, w, h) => {
      c.fillStyle = '#cfa572'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { c.fillStyle = Math.random() < .5 ? 'rgba(110,70,35,.16)' : 'rgba(255,240,210,.16)'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      c.strokeStyle = 'rgba(120,80,40,.12)'; c.lineWidth = 2; for (let y = 0; y < h; y += 22) { c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(w * .3, y + 6, w * .7, y - 6, w, y); c.stroke(); }
    }, [7, 7]);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 72), new THREE.MeshStandardMaterial({ map: sand, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
    // arena duvarı (kemerler + sancaklar dokuda)
    const wall = canvasTex(1024, 256, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9c7a5a'); g.addColorStop(1, '#4a3424'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2; for (let y = 0; y < h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); for (let x = (y / 32 % 2) * 32; x < w; x += 64) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 32); c.stroke(); } }
      for (let i = 0; i < 4; i++) { const ax = 64 + i * 256; c.fillStyle = '#1a0f0a'; c.beginPath(); c.moveTo(ax - 44, h); c.lineTo(ax - 44, 110); c.arc(ax, 110, 44, Math.PI, 0); c.lineTo(ax + 44, h); c.fill();
        c.fillStyle = '#8c1f17'; c.fillRect(ax + 110, 20, 36, 120); c.fillStyle = '#e2b25a'; c.beginPath(); c.arc(ax + 128, 60, 10, 0, 6.28); c.fill(); }
      c.fillStyle = '#b8936a'; c.fillRect(0, 0, w, 12);
    }, [12, 1]);
    const wallM = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 2.8, 96, 1, true), new THREE.MeshStandardMaterial({ map: wall, side: THREE.BackSide, roughness: .9 }));
    wallM.position.y = 1.4; wallM.receiveShadow = true; sc.add(wallM);
    // tribün basamakları
    const stoneM = new THREE.MeshStandardMaterial({ color: 0x6e5240, roughness: .95 }), stoneM2 = new THREE.MeshStandardMaterial({ color: 0x584032, roughness: .95 });
    const riserM = new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: .95, side: THREE.BackSide });
    this.rows = [];
    for (let i = 0; i < 8; i++) {
      const r0 = 16 + i * 1.15, y = 2.8 + i * .8;
      const step = new THREE.Mesh(new THREE.RingGeometry(r0, r0 + 1.15, 96, 1), i % 2 ? stoneM : stoneM2); step.rotation.x = -Math.PI / 2; step.position.y = y; sc.add(step);
      const riser = new THREE.Mesh(new THREE.CylinderGeometry(r0 + 1.15, r0 + 1.15, .8, 96, 1, true), riserM); riser.position.y = y + .4; sc.add(riser);
      this.rows.push({ r: r0 + .55, y });
    }
    // seyirciler (instanced)
    const pos = [];
    this.rows.forEach((row, ri) => {
      const n = Math.floor(row.r * Math.PI * 2 / .48);
      for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; const x = Math.cos(a) * row.r, z = Math.sin(a) * row.r; if (z > 6) continue; if (Math.random() < .07) continue;
        pos.push({ x: x + (Math.random() - .5) * .1, z, y: row.y, ph: Math.random() * 6.28, sp: 5 + Math.random() * 4, ri }); }
    });
    this.crowd = pos;
    const cloth = ['#9c2b1f', '#2f5d8a', '#c08a2e', '#e8dcc4', '#3d6b45', '#6b3b80', '#a0522d', '#d9d2c5'].map(c => new THREE.Color(c));
    const skins = SKINS.map(c => new THREE.Color(c));
    this.bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.15, .32, 3, 6), new THREE.MeshLambertMaterial(), pos.length);
    this.heads = new THREE.InstancedMesh(new THREE.SphereGeometry(.12, 8, 6), new THREE.MeshLambertMaterial(), pos.length);
    pos.forEach((p, i) => { this.bodies.setColorAt(i, pick(cloth)); this.heads.setColorAt(i, pick(skins)); });
    sc.add(this.bodies); sc.add(this.heads);
    this.dummy = new THREE.Object3D();
    // tente (velarium)
    const vel = canvasTex(512, 64, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#d8c29a' : '#8c2a1c'; c.fillRect(i * 32, 0, 32, h); } }, [6, 1]);
    const velM = new THREE.Mesh(new THREE.CylinderGeometry(25.5, 21, 2.2, 64, 1, true, Math.PI * .95, Math.PI * 1.1), new THREE.MeshStandardMaterial({ map: vel, side: THREE.DoubleSide, roughness: 1 }));
    velM.position.y = 10.6; sc.add(velM);
    // meşaleler
    const flameTex = canvasTex(64, 64, (c, w) => { const g = c.createRadialGradient(32, 36, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,245,200,1)'); g.addColorStop(.35, 'rgba(255,170,60,.9)'); g.addColorStop(1, 'rgba(255,80,20,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); });
    this.torches = [];
    [-.42, -.2, .0, .2, .42].forEach((k, i) => {
      const a = -Math.PI / 2 + k * Math.PI, x = Math.cos(a) * 15.6, z = Math.sin(a) * 15.6;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, .5, 8), new THREE.MeshStandardMaterial({ color: 0x2a1a10 })); pole.position.set(x, 2.1, z); sc.add(pole);
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false })); fl.position.set(x, 2.55, z); fl.scale.set(.7, 1, 1); sc.add(fl);
      const L = new THREE.PointLight(0xff9a4a, 1.4, 14, 2); L.position.set(x * .94, 2.6, z * .94); sc.add(L);
      this.torches.push({ fl, L, ph: i * 1.7 });
    });
    // havada süzülen toz zerreleri
    const g = new THREE.BufferGeometry(), N = 220, arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { arr[i * 3] = (Math.random() - .5) * 22; arr[i * 3 + 1] = Math.random() * 6; arr[i * 3 + 2] = (Math.random() - .5) * 14; }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.motes = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffe0b0, size: .05, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }));
    sc.add(this.motes);
  }
  /* Gün saatine göre ışık: 0 sabah, 1 öğle, 2 akşam, 3 gece */
  setTime(i) {
    const SK = [['#6f9fd8', '#b9d4ee', '#f6d8b0'], ['#3f7fcf', '#8fc0f0', '#d8ecff'], ['#1d1428', '#c0653a', '#f2b062'], ['#04050c', '#121a3a', '#2a2a50']][i];
    this.bgs = this.bgs || [];
    if (!this.bgs[i]) this.bgs[i] = canvasTex(4, 512, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, SK[0]); g.addColorStop(.6, SK[1]); g.addColorStop(1, SK[2]); c.fillStyle = g; c.fillRect(0, 0, w, h);
      if (i === 3) for (let k = 0; k < 60; k++) { c.fillStyle = 'rgba(255,255,255,.8)'; c.fillRect(Math.random() * w, Math.random() * h * .6, 1, 1); } });
    this.scene.background = this.bgs[i];
    const L = [[0xfff0d8, 1.5, .65, 0x9db6c9, .45], [0xffffff, 1.9, .75, 0xa8c4e0, .3], [0xffc48a, 1.7, .55, 0x3a2218, 1], [0x7080d0, .18, .1, 0x05060e, 2.4]][i];
    this.sun.color.setHex(L[0]); this.sun.intensity = L[1]; this.hemi.intensity = L[2];
    this.scene.fog.color.setHex(L[3]); this.torchK = L[4];
    this.renderer.toneMappingExposure = [1.05, 1.0, 1.15, .95][i];
  }
  setup(fighters) {
    this.rigs.forEach(r => r.dispose(this.scene));
    this.rigs = fighters.map(f => { const r = new Rig3D(f.F, this.scene); f.rig = r; return r; });
    this.camPos.set(0, 2.4, 9);
  }
  resize() {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(300, r.width); this.H = Math.max(200, r.height); this.dpr = dpr;
    this.cv.width = this.W * dpr; this.cv.height = this.H * dpr;
    this.renderer.setPixelRatio(dpr); this.renderer.setSize(this.W, this.H, false);
    this.camera.aspect = this.W / this.H; this.camera.updateProjectionMatrix();
    this.ground = this.H * .85; this.s = .01;
  }
  project(v) { const p = v.clone().project(this.camera); return [(p.x + 1) / 2 * this.W, (1 - p.y) / 2 * this.H]; }
  ux(u) { return this.project(new THREE.Vector3(this.wx(u), 0, 0))[0]; }

  render3D(t, fighters) {
    // kamera: iki dövüşçüyü kadrajda tut
    const xs = fighters.map(f => this.wx(f.vx)), mid = (xs[0] + xs[1]) / 2, sep = Math.abs(xs[0] - xs[1]);
    const dist = 4.9 + sep * .6;
    this.camPos.lerp(new THREE.Vector3(mid + Math.sin(t * .15) * .4, 1.55 + sep * .07, dist), .06);
    this.camLook.lerp(new THREE.Vector3(mid, .95, 0), .08);
    const cam = this.camera, sh = this.shake > .3 ? this.shake * .012 : 0;
    cam.position.copy(this.camPos).add(new THREE.Vector3(rnd(-sh, sh), rnd(-sh, sh), 0));
    cam.lookAt(this.camLook);
    const fov = 36 / this.zoom; if (Math.abs(cam.fov - fov) > .01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    this.zoom = 1 + (this.zoom - 1) * .9; this.shake *= .88;
    this.sun.target.position.set(mid, 0, 0); this.sun.position.set(mid - 9, 15, 9);
    // meşale titremesi
    this.torches.forEach(tc => { const k = 1 + Math.sin(t * 13 + tc.ph) * .12 + Math.sin(t * 7 + tc.ph) * .08; tc.L.intensity = 1.4 * k * this.torchK; tc.fl.scale.set(.7 * k, 1.05 * k, 1); });
    // kalabalık zıplaması (coşkuya göre)
    const amp = .04 + this.hype * .28, spd = .5 + this.hype * .8;
    this.crowd.forEach((p, i) => {
      const b = Math.max(0, Math.sin(t * p.sp * spd + p.ph)) * amp;
      this.dummy.position.set(p.x, p.y + .32 + b, p.z); this.dummy.updateMatrix(); this.bodies.setMatrixAt(i, this.dummy.matrix);
      this.dummy.position.y = p.y + .7 + b; this.dummy.updateMatrix(); this.heads.setMatrixAt(i, this.dummy.matrix);
    });
    this.bodies.instanceMatrix.needsUpdate = true; this.heads.instanceMatrix.needsUpdate = true;
    this.motes.rotation.y = t * .02; this.motes.position.y = Math.sin(t * .3) * .2;
    // dövüşçüler
    const tips = fighters.map(f => f.rig.update(f, this.wx(f.vx), t));
    this.renderer.render(this.scene, cam);
    // 2B katman için ölçek: zemin çizgisi ve piksel/birim
    const p0 = this.project(new THREE.Vector3(mid, 0, 0)), p1 = this.project(new THREE.Vector3(mid, 1, 0));
    this.ground = p0[1]; this.s = (p0[1] - p1[1]) * S3;
    // efekt katmanını temizle
    const c = this.c; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.cv.width, this.cv.height); c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    return tips.map(v => { const [x, y] = this.project(v); return { tipX: x, tipY: y }; });
  }
}
['burst', 'dust', 'float', 'ring', 'petals', 'trail', 'drawFx'].forEach(k => { Arena3D.prototype[k] = ArenaScene.prototype[k]; });
