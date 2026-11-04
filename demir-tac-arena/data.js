/* ========= DEMİR TAÇ — veri ========= */
const STATS = [
  { k: 'guc', n: 'Güç',        d: 'Vuruş hasarı ve kritik şansı.' },
  { k: 'cev', n: 'Çeviklik',   d: 'İsabet, kaçınma ve hareket mesafesi.' },
  { k: 'day', n: 'Dayanıklılık', d: 'Can ve dayanıklılık (stamina).' },
  { k: 'sav', n: 'Savunma',    d: 'Zırh etkisi ve kalkanla bloklama.' },
  { k: 'kar', n: 'Karizma',    d: 'Kışkırtma gücü ve kalabalıktan altın.' },
];
const STAT_MAX = 40;

const SKINS = ['#f2c9a0', '#d9a273', '#b97a4e', '#8a5532', '#5e3a22'];
const HAIRS = ['#1d1410', '#4a2c17', '#8c5a2b', '#c99a4e', '#d9d2c5', '#7a1f14'];
const CAPES = ['#9c2b1f', '#2f5d8a', '#3d6b45', '#6b3b80', '#c08a2e', '#2b2b2b'];

const TIER_COL = ['#7a4b2a', '#b07a3a', '#8f979e', '#b8c3cc', '#e2b25a'];
const TIER_NAME = ['Deri', 'Bronz', 'Demir', 'Çelik', 'Efsane'];

const ITEMS = [
  // --- Silahlar --- dmg [min,max], reach: menzil (arena birimi)
  { id: 'w0', slot: 'weapon', kind: 'sword', name: 'Paslı Kısa Kılıç', tier: 0, price: 0,    req: 1,  dmg: [4, 7],   reach: 1.7 },
  { id: 'w1', slot: 'weapon', kind: 'sword', name: 'Bronz Gladius',    tier: 1, price: 140,  req: 1,  dmg: [6, 10],  reach: 1.7 },
  { id: 'w2', slot: 'weapon', kind: 'spear', name: 'Avcı Mızrağı',     tier: 1, price: 320,  req: 3,  dmg: [6, 11],  reach: 2.7 },
  { id: 'w3', slot: 'weapon', kind: 'axe',   name: 'Savaş Baltası',    tier: 2, price: 420,  req: 3,  dmg: [8, 14],  reach: 1.6 },
  { id: 'w4', slot: 'weapon', kind: 'mace',  name: 'Çivili Gürz',      tier: 2, price: 850,  req: 5,  dmg: [11, 17], reach: 1.6 },
  { id: 'w5', slot: 'weapon', kind: 'trident', name: 'Deniz Zıpkını',  tier: 3, price: 1450, req: 7,  dmg: [12, 18], reach: 2.7 },
  { id: 'w6', slot: 'weapon', kind: 'sword', name: 'Kartal Kılıcı',    tier: 3, price: 1600, req: 7,  dmg: [13, 20], reach: 1.8 },
  { id: 'w7', slot: 'weapon', kind: 'axe',   name: 'Ejder Baltası',    tier: 4, price: 3300, req: 10, dmg: [18, 26], reach: 1.7 },
  { id: 'w8', slot: 'weapon', kind: 'sword', name: 'Güneş Kılıcı',     tier: 4, price: 6200, req: 13, dmg: [22, 31], reach: 1.9 },
  // --- Miğferler ---
  { id: 'h1', slot: 'helm', name: 'Deri Başlık',      tier: 0, price: 60,   req: 1,  armor: 2 },
  { id: 'h2', slot: 'helm', name: 'Bronz Miğfer',     tier: 1, price: 230,  req: 2,  armor: 4 },
  { id: 'h3', slot: 'helm', name: 'Sorguçlu Miğfer',  tier: 2, price: 720,  req: 5,  armor: 7 },
  { id: 'h4', slot: 'helm', name: 'Yüz Siperli Miğfer', tier: 3, price: 1650, req: 8, armor: 10 },
  { id: 'h5', slot: 'helm', name: 'Taçlı Miğfer',     tier: 4, price: 3600, req: 12, armor: 14 },
  // --- Gövde ---
  { id: 'c1', slot: 'chest', name: 'Deri Yelek',      tier: 0, price: 90,   req: 1,  armor: 3 },
  { id: 'c2', slot: 'chest', name: 'Pullu Zırh',      tier: 1, price: 320,  req: 2,  armor: 6 },
  { id: 'c3', slot: 'chest', name: 'Demir Göğüslük',  tier: 2, price: 940,  req: 5,  armor: 10 },
  { id: 'c4', slot: 'chest', name: 'Lamelli Zırh',    tier: 3, price: 2050, req: 8,  armor: 14 },
  { id: 'c5', slot: 'chest', name: 'Altın Zırh',      tier: 4, price: 4600, req: 12, armor: 19 },
  // --- Kalkanlar --- block: bloklama yüzdesi
  { id: 's1', slot: 'shield', kind: 'round', name: 'Ahşap Kalkan',   tier: 0, price: 80,   req: 1,  armor: 1, block: 8 },
  { id: 's2', slot: 'shield', kind: 'round', name: 'Yuvarlak Kalkan', tier: 1, price: 290, req: 2,  armor: 2, block: 12 },
  { id: 's3', slot: 'shield', kind: 'tower', name: 'Kule Kalkanı',   tier: 2, price: 960,  req: 5,  armor: 4, block: 18 },
  { id: 's4', slot: 'shield', kind: 'round', name: 'Bronz Aspis',    tier: 3, price: 2150, req: 8,  armor: 5, block: 23 },
  { id: 's5', slot: 'shield', kind: 'tower', name: 'Aslan Kalkanı',  tier: 4, price: 4300, req: 12, armor: 7, block: 28 },
];
const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));

/* Hekim iksirleri: dövüşte bir tur harcayarak kullanılır */
const POTIONS = [
  { id: 'p_heal', name: 'Şifa İksiri',   desc: 'Canının %40\'ını yeniler.',          price: 70,  color: '#d23b2a', icon: 'heal' },
  { id: 'p_st',   name: 'Nefes İksiri',  desc: 'Staminayı tamamen doldurur.',        price: 45,  color: '#4fa3a0', icon: 'stam' },
  { id: 'p_rage', name: 'Öfke Tozu',     desc: 'Kalabalık coşkusunu +50 artırır.',   price: 90,  color: '#e2b25a', icon: 'rage' },
];
const POTION = Object.fromEntries(POTIONS.map(p => [p.id, p]));
const POTION_MAX = 5;

/* ---------- Gün döngüsü: her dövüş zamanı bir adım ilerletir ---------- */
const TIMES = [
  { n: 'Sabah', ico: '☀', note: 'Serin bir sabah. Kalabalık yeni toplanıyor.' },
  { n: 'Öğle',  ico: '☀', note: 'Güneş tepede, kum kızgın.' },
  { n: 'Akşam', ico: '☼', note: 'Gün batımı. Arena en kalabalık hâlinde.' },
  { n: 'Gece',  ico: '☾', note: 'Meşale ışığında dövüş: +%15 altın.' },
];

/* ---------- Turnuvalar: 3 tur, can turlar arasında taşınır ---------- */
const TOURNEYS = [
  { id: 'bronz',  name: 'Bronz Kupa',       req: 3,  levels: [3, 4, 5],    prize: 600,  xp: 260,  col: '#c58e47', boss: { name: 'Demir Yumruk Garr', title: 'Bronz Kupa Finalisti', arch: 'brute' } },
  { id: 'gumus',  name: 'Gümüş Kupa',       req: 7,  levels: [7, 8, 9],    prize: 1500, xp: 600,  col: '#cfd8e0', boss: { name: 'Gölge Dansçısı Mira', title: 'Gümüş Kupa Finalisti', arch: 'agile' } },
  { id: 'altin',  name: 'Altın Kupa',       req: 11, levels: [11, 12, 14], prize: 3500, xp: 1200, col: '#f0c86a', boss: { name: 'Yanardağ Tarkan', title: 'Altın Kupa Finalisti', arch: 'tank' } },
  { id: 'efsane', name: 'Efsaneler Kupası', req: 14, levels: [14, 16, 18], prize: 7000, xp: 2400, col: '#e8475f', boss: { name: 'Ölümsüz Vardos', title: 'Efsaneler Kupası Finalisti', arch: 'show' } },
];
const TOURNEY = Object.fromEntries(TOURNEYS.map(t => [t.id, t]));
const ROUND_NAMES = ['Çeyrek Final', 'Yarı Final', 'Final'];

/* ---------- Han: yemek ve içecek (sonraki dövüşe güç) ---------- */
const FOODS = [
  { id: 'f_stew',  name: 'Kuzu Güveç',        desc: 'Sonraki dövüşte +%15 can.',              price: 40,  hp: .15, col: '#a0522d' },
  { id: 'f_honey', name: 'Ballı Şerbet',      desc: 'Sonraki dövüşte +25 stamina.',           price: 30,  st: 25,  col: '#e8a33a' },
  { id: 'f_ale',   name: 'Arena Birası',      desc: 'Dövüşe 30 coşkuyla başla.',              price: 35,  hype: 30, col: '#c99a4e' },
  { id: 'f_feast', name: 'Şampiyon Ziyafeti', desc: '+%15 can, +20 stamina, +20 coşku.',      price: 120, hp: .15, st: 20, hype: 20, req: 8, col: '#8c1f17' },
];
const FOOD = Object.fromEntries(FOODS.map(f => [f.id, f]));

/* ---------- Han: görev panosu kontratları ---------- */
const CONTRACTS = [
  { k: 'wins',     n: 'Üç Zafer',          d: '3 dövüş kazan.',                          goal: 3, gold: 140, xp: 70 },
  { k: 'crits',    n: 'Kanlı Kum',         d: 'Toplam 5 kritik vuruş yap.',               goal: 5, gold: 120, xp: 60 },
  { k: 'taunts',   n: 'Kalabalığın Sesi',  d: 'Toplam 6 başarılı kışkırtma yap.',         goal: 6, gold: 120, xp: 60 },
  { k: 'fast',     n: 'Çabuk İş',          d: '8 turdan kısa sürede bir dövüş kazan.',    goal: 1, gold: 160, xp: 80 },
  { k: 'nopot',    n: 'Saf Güç',           d: 'İksir kullanmadan 2 dövüş kazan.',         goal: 2, gold: 150, xp: 70 },
  { k: 'specials', n: 'Arena Öfkesi',      d: '2 kez Arena Öfkesi kullan.',               goal: 2, gold: 130, xp: 60 },
  { k: 'tough',    n: 'Dev Avcısı',        d: 'Senden yüksek seviyeli bir rakibi yen.',   goal: 1, gold: 200, xp: 100 },
  { k: 'flawless', n: 'Kusursuz',          d: 'Canın %75\'in üstündeyken kazan.',         goal: 1, gold: 180, xp: 90 },
  { k: 'night',    n: 'Meşale Altında',    d: 'Gece bir dövüş kazan.',                    goal: 1, gold: 120, xp: 60 },
];

/* ---------- Başarımlar ---------- */
const ACHIEVEMENTS = [
  { id: 'first',   n: 'İlk Kan',            d: 'İlk dövüşünü kazan.',                 gold: 50,   test: g => g.wins >= 1 },
  { id: 'w10',     n: 'Kum Savaşçısı',      d: '10 dövüş kazan.',                     gold: 200,  test: g => g.wins >= 10 },
  { id: 'w30',     n: 'Arena Kurdu',        d: '30 dövüş kazan.',                     gold: 600,  test: g => g.wins >= 30 },
  { id: 'lv5',     n: 'Yükselen Yıldız',    d: 'Seviye 5\'e ulaş.',                   gold: 150,  test: g => g.player.level >= 5 },
  { id: 'lv10',    n: 'Usta',               d: 'Seviye 10\'a ulaş.',                  gold: 400,  test: g => g.player.level >= 10 },
  { id: 'lv15',    n: 'Yaşayan Efsane',     d: 'Seviye 15\'e ulaş.',                  gold: 1000, test: g => g.player.level >= 15 },
  { id: 'half',    n: 'Yarı Yol',           d: 'Merdivenin 5. basamağını geç.',       gold: 250,  test: g => g.rung >= 5 },
  { id: 'champ',   n: 'Demir Taç',          d: 'Arena şampiyonu ol.',                 gold: 1000, test: g => g.champion },
  { id: 't_bronz', n: 'Bronz Kupa',         d: 'Bronz Kupa\'yı kazan.',               gold: 150,  test: g => (g.trophies?.bronz || 0) > 0 },
  { id: 't_gumus', n: 'Gümüş Kupa',         d: 'Gümüş Kupa\'yı kazan.',               gold: 300,  test: g => (g.trophies?.gumus || 0) > 0 },
  { id: 't_altin', n: 'Altın Kupa',         d: 'Altın Kupa\'yı kazan.',               gold: 600,  test: g => (g.trophies?.altin || 0) > 0 },
  { id: 't_efs',   n: 'Efsaneler Arasında', d: 'Efsaneler Kupası\'nı kazan.',         gold: 1500, test: g => (g.trophies?.efsane || 0) > 0 },
  { id: 'legend',  n: 'Efsanevi Çelik',     d: 'Efsane kademede bir silah edin.',     gold: 300,  test: g => g.owned.some(id => ITEM[id] && ITEM[id].slot === 'weapon' && ITEM[id].tier >= 4) },
  { id: 'full',    n: 'Tepeden Tırnağa',    d: 'Dört ekipman yuvasını da doldur.',    gold: 100,  test: g => ['weapon', 'helm', 'chest', 'shield'].every(s => g.player.equip[s]) },
  { id: 'jobs',    n: 'Güvenilir Kılıç',    d: '5 kontrat tamamla.',                  gold: 250,  test: g => (g.jobsDone || 0) >= 5 },
  { id: 'night',   n: 'Gece Kuşu',          d: 'Gece bir dövüş kazan.',               gold: 100,  test: g => (g.nightWins || 0) >= 1 },
];

/* ---------- Yol haritası: oyuncunun görebileceği ilerleme yolu ---------- */
const MILESTONES = [
  { n: 'Gladyatör Doğdu',      hint: 'Arenaya ilk adımını attın.',                                          test: g => true },
  { n: 'İlk Zafer',            hint: 'Arena\'ya gir, merdivenin ilk rakibini yen.',                          test: g => g.wins >= 1 },
  { n: 'Demircinin Müşterisi', hint: 'Demirci\'den ilk silahını satın al.',                                  test: g => g.owned.some(id => id !== 'w0' && ITEM[id]?.slot === 'weapon') },
  { n: 'Seviye 3',             hint: 'Dövüşerek tecrübe kazan. Gösteri maçları da XP verir.',                test: g => g.player.level >= 3 },
  { n: 'Bronz Kupa',           hint: 'Arena\'daki turnuvalardan Bronz Kupa\'ya katıl ve kazan.',            test: g => (g.trophies?.bronz || 0) > 0, rec: 3 },
  { n: 'Merdivenin Yarısı',    hint: 'Şampiyonluk merdiveninde 5 rakibi yen.',                               test: g => g.rung >= 5, rec: 6 },
  { n: 'Seviye 7',             hint: 'Han\'daki kontratlar ekstra XP ve altın verir.',                       test: g => g.player.level >= 7 },
  { n: 'Gümüş Kupa',           hint: 'Gümüş Kupa için iyi bir zırh ve birkaç Şifa İksiri al.',               test: g => (g.trophies?.gumus || 0) > 0, rec: 7 },
  { n: 'Demir Taç Şampiyonu',  hint: 'Merdivenin tepesindeki Avrok\'u yen.',                                 test: g => g.champion, rec: 13 },
  { n: 'Altın Kupa',           hint: 'Yanardağ Tarkan\'ın zırhı kalın. Kışkırtıp staminasını sömür.',        test: g => (g.trophies?.altin || 0) > 0, rec: 11 },
  { n: 'Efsane Silah',         hint: 'Ejder Baltası ya da Güneş Kılıcı edin.',                               test: g => g.owned.some(id => ITEM[id]?.slot === 'weapon' && ITEM[id].tier >= 4), rec: 10 },
  { n: 'Efsaneler Kupası',     hint: 'Son sınav: Ölümsüz Vardos.',                                          test: g => (g.trophies?.efsane || 0) > 0, rec: 15 },
];
const COMING_SOON = [
  'Takım dövüşleri: 2’ye 2 arena maçları',
  'Hayvan dövüşleri: aslan ve ayılarla gösteri',
  'Kalıcı yaralanmalar ve Hekim\'de tedavi',
  'Mevsimlik etkinlikler ve özel kupalar',
  'Gladyatör okulu: öğrenci yetiştir',
];

/* Söylentiler: rakip tipine göre taktik */
const ARCH_TIPS = {
  brute: { n: 'Kaba Kuvvet', tip: 'Ağır vurur ama yavaştır. Mesafe koru, staminası bitince yaklaş ve saldır.' },
  agile: { n: 'Çevik',       tip: 'Iskalatması zordur. Ağır darbe yerine hızlı darbelerle yıprat.' },
  tank:  { n: 'Kale',        tip: 'Zırhı kalın, kalkanı sağlamdır. Kışkırtıp staminasını sömür, Arena Öfkesi\'ni ona sakla.' },
  show:  { n: 'Şovmen',      tip: 'Kalabalığı çabuk coşturur. Sen de kışkırt, coşkuyu ona bırakma.' },
};

const SLOT_NAME = { weapon: 'Silah', helm: 'Miğfer', chest: 'Zırh', shield: 'Kalkan' };

/* Şampiyonluk merdiveni: özgün rakipler */
const LADDER = [
  { name: 'Kum Faresi Tibor',   title: 'Acemi',          lvl: 1,  arch: 'agile' },
  { name: 'Ağır El Bors',       title: 'Kasaba Kavgacısı', lvl: 2, arch: 'brute' },
  { name: 'Çevik Lysa',         title: 'Hançer Dansçısı', lvl: 3, arch: 'agile' },
  { name: 'Yaban Domuzu Ugo',   title: 'Kasap',           lvl: 4, arch: 'brute' },
  { name: 'Gösterişçi Marek',   title: 'Kalabalığın Sevgilisi', lvl: 6, arch: 'show' },
  { name: 'Taş Göğüs Hagan',    title: 'Yürüyen Kale',    lvl: 7, arch: 'tank' },
  { name: 'Kızıl Pençe Vera',   title: 'Kum Kaplanı',     lvl: 9, arch: 'agile' },
  { name: 'Kara Nefes Durak',   title: 'Sessiz Cellat',   lvl: 10, arch: 'brute' },
  { name: 'Fırtına Kızı Selin', title: 'Mızrak Ustası',   lvl: 12, arch: 'show' },
  { name: 'Avrok',              title: 'Demir Taç Şampiyonu', lvl: 14, arch: 'tank' },
];
const ARCH = {
  brute: { guc: 5, cev: 2, day: 3, sav: 2, kar: 1, pref: ['axe', 'mace', 'sword'] },
  agile: { guc: 2, cev: 5, day: 2, sav: 1, kar: 2, pref: ['sword', 'spear'] },
  tank:  { guc: 3, cev: 1, day: 4, sav: 5, kar: 1, pref: ['mace', 'sword', 'axe'] },
  show:  { guc: 3, cev: 3, day: 2, sav: 1, kar: 4, pref: ['spear', 'trident', 'sword'] },
};
const EXHIBITION_NAMES = ['Demirci Oğlu Kaan', 'Liman İşçisi Doran', 'Kervan Muhafızı Ilse', 'Dağlı Torvik', 'Kör Nişancı Petra',
  'Yaralı Garon', 'Tuz Tüccarı Emre', 'Kuzeyli Hald', 'Çöl Tilkisi Nisa', 'Kemik Kıran Orm', 'Kurt Dişi Rana', 'Kuyu Bekçisi Taro'];

/* ========= Yardımcılar ========= */
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function xpNeed(level) { return Math.round(90 * Math.pow(level, 1.4)); }

/* Türetilmiş değerler — oyuncu ve rakip için ortak */
function derive(f) {
  const s = f.stats, eq = f.equip;
  const w = ITEM[eq.weapon] || ITEM.w0;
  let armor = s.sav * 1.0, block = 0;
  for (const slot of ['helm', 'chest', 'shield']) {
    const it = ITEM[eq[slot]];
    if (it) { armor += it.armor; if (it.block) block += it.block; }
  }
  if (block) block += s.sav * 0.7;
  return {
    maxHp: 60 + s.day * 12 + (f.level - 1) * 6,
    maxSt: 40 + s.day * 4 + s.cev * 2,
    dmgMin: w.dmg[0], dmgMax: w.dmg[1],
    mult: 1 + s.guc * 0.085,
    reach: w.reach,
    armor: Math.round(armor),
    dr: armor / (armor + 45),               // hasar azaltma oranı
    block: Math.min(55, Math.round(block)),
    crit: Math.min(40, 4 + s.guc * 0.6),
    move: s.cev >= 14 ? 3 : 2,
  };
}

/* Puanları arketipe göre dağıt */
function spreadStats(points, weights) {
  const st = { guc: 1, cev: 1, day: 1, sav: 1, kar: 1 };
  const keys = Object.keys(weights);
  const total = keys.reduce((a, k) => a + weights[k], 0);
  for (let i = 0; i < points; i++) {
    let r = Math.random() * total;
    for (const k of keys) { r -= weights[k]; if (r <= 0) { if (st[k] < STAT_MAX) st[k]++; break; } }
  }
  return st;
}

/* Seviyeye göre ekipman seç */
function gearFor(level, arch, richness = 1) {
  const pref = ARCH[arch].pref;
  const ok = slot => ITEMS.filter(i => i.slot === slot && i.req <= level + 1);
  const best = (list) => {
    if (!list.length) return null;
    list.sort((a, b) => b.tier - a.tier || b.price - a.price);
    const idx = Math.random() < 0.3 * richness ? 0 : Math.min(list.length - 1, rint(0, 1));
    return list[idx].id;
  };
  let weapons = ok('weapon').filter(w => pref.includes(w.kind));
  if (!weapons.length) weapons = ok('weapon');
  const eq = { weapon: best(weapons) || 'w0', helm: null, chest: null, shield: null };
  if (level >= 2 || Math.random() < .5) eq.chest = best(ok('chest'));
  if (level >= 3 || Math.random() < .4) eq.helm = best(ok('helm'));
  if (arch === 'tank' || (arch !== 'agile' && Math.random() < .6) || level >= 8) eq.shield = best(ok('shield'));
  return eq;
}

function randomLook() {
  return { skin: pick(SKINS), hair: pick(HAIRS), cape: pick(CAPES), beard: Math.random() < .5, hairStyle: rint(0, 2) };
}

function makeEnemy(def) {
  const level = def.lvl;
  const stats = spreadStats(8 + (level - 1) * 4, ARCH[def.arch]);
  return { name: def.name, title: def.title, level, stats, equip: gearFor(level, def.arch), look: randomLook(), arch: def.arch };
}

function makeExhibitionEnemy(level) {
  const lvl = clamp(level + rint(-1, 1), 1, 20);
  const arch = pick(Object.keys(ARCH));
  return makeEnemy({ name: pick(EXHIBITION_NAMES), title: 'Gösteri Rakibi', lvl, arch });
}

/* Ek gösteri rakipleri */
EXHIBITION_NAMES.push('Tunç Bilek Aras', 'Kızıl Sakal Bodo', 'Sessiz Okçu Yena', 'Taş Kıran Hamo', 'Kum Fırtınası Leyla', 'Yaşlı Kurt Ferro', 'Altın Diş Mako', 'Zincirli Brann');
