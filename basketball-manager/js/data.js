/* BasketballManager — league structure, 2010-11 rules, attributes, name pools.
   The league mirrors the 2010 NBA layout (30 cities, 2 conferences, 6 divisions, balance from 2009-10
   win %), but every club and player name is fictional. Real data can be loaded from the Veri screen. */
(function(){
'use strict';
const BM = window.BM = window.BM || {};

BM.RULES = {
  firstSeason:2010,
  cap:58044000, tax:70307000, minPayroll:43533000, taxRate:1.0,
  maxPct:[0.25,0.30,0.35],                 // share of cap by experience: 0-6, 7-9, 10+ seasons
  minScale:[473604,762195,854389,884293,915852,992680,1069509,1146337,1223166,1229255,1352181], // exp 0..10+
  mle:5765000, bae:2080000,
  rosterMin:13, rosterMax:15, offseasonMax:20, glMax:4,       // G-League style affiliate slots
  maxYears:5, maxYearsBird:6, raise:0.08, raiseBird:0.105,
  tradeMatch:1.25, tradeBuffer:100000,
  rookieScale:[4286900,3835300,3444200,3101000,2808600,2549400,2321000,2120800,1939200,1842300,1750100,1662900,1580000,1500900,1425600,1354700,1287000,1222500,1161700,1118300,1073300,1030500,989800,950900,914700,885300,876000,866400,855900,848400],
  capGrowth:0.03,
  lotteryOdds:[250,199,156,119,88,63,43,28,17,11,8,7,6,5],   // per 1000, worst record first (pre-2019 system)
  games:82, playoffTeams:8, seriesWins:4,
  dates:{faStart:[7,1],camp:[10,1],seasonStart:[10,26],deadline:[2,24],seasonEnd:[4,13],playoffs:[4,16],draft:[6,24],rollover:[6,30]}
};

// conf, division, city, nickname, abbr, market (1-5), primary, secondary, 2009-10 win %
BM.TEAMS0 = [
  ['E','Atlantik','Boston','Harbormen','BOS',4,'#1f6f43','#e8e2d0',0.61],
  ['E','Atlantik','New Jersey','Pines','NJP',3,'#24477a','#c9d6e8',0.15],
  ['E','Atlantik','New York','Skylines','NYS',5,'#e2672a','#1d3d7a',0.35],
  ['E','Atlantik','Philadelphia','Founders','PHF',4,'#a32234','#21407a',0.33],
  ['E','Atlantik','Toronto','Moose','TOM',4,'#7a1f2b','#c0c6cf',0.49],
  ['E','Merkez','Chicago','Windrunners','CHW',5,'#c4202f','#20262e',0.50],
  ['E','Merkez','Cleveland','Ironmen','CLI',2,'#6e2639','#d9a43a',0.74],
  ['E','Merkez','Detroit','Motors','DEM',3,'#1c4fa0','#d22f3a',0.33],
  ['E','Merkez','Indiana','Crossroads','INC',2,'#123a6b','#f0b323',0.39],
  ['E','Merkez','Milwaukee','Frost','MIF',1,'#25543a','#e9e1c6',0.56],
  ['E','Güneydoğu','Atlanta','Peaches','ATP',3,'#d2493a','#f4b860',0.65],
  ['E','Güneydoğu','Charlotte','Pilots','CHP',2,'#1c8a9a','#2c2e4a',0.54],
  ['E','Güneydoğu','Miami','Flamingos','MIA',4,'#e0457b','#1b1b24',0.57],
  ['E','Güneydoğu','Orlando','Comets','ORC',3,'#2667c2','#b9c2cc',0.72],
  ['E','Güneydoğu','Washington','Statesmen','WAS',3,'#20356b','#c8202f',0.32],
  ['W','Kuzeybatı','Denver','Peaks','DEN',3,'#2d74b8','#f2c14e',0.65],
  ['W','Kuzeybatı','Minnesota','Loons','MNL',3,'#1e3d5c','#7fb069',0.18],
  ['W','Kuzeybatı','Oklahoma City','Storm','OKS',1,'#2f86c9','#f26b3a',0.61],
  ['W','Kuzeybatı','Portland','Rainmakers','POR',2,'#1d1d22','#d23b3b',0.61],
  ['W','Kuzeybatı','Utah','Canyons','UTC',1,'#b8541e','#1f3a5f',0.65],
  ['W','Pasifik','Golden State','Fog','GSF',4,'#2b5fa8','#f6c344',0.32],
  ['W','Pasifik','Los Angeles','Palms','LAP',5,'#178a7a','#f3d9a4',0.35],
  ['W','Pasifik','Los Angeles','Waves','LAW',5,'#5b2a86','#f2b632',0.70],
  ['W','Pasifik','Phoenix','Scorpions','PHX',3,'#e4572e','#3d2a6b',0.66],
  ['W','Pasifik','Sacramento','Goldrush','SAC',2,'#c9a227','#3b2f63',0.30],
  ['W','Güneybatı','Dallas','Stampede','DAS',4,'#1f4e9e','#a9b4c2',0.67],
  ['W','Güneybatı','Houston','Orbit','HOU',4,'#b3202d','#c4c9cf',0.51],
  ['W','Güneybatı','Memphis','Blues','MEB',1,'#34558b','#99c2e8',0.49],
  ['W','Güneybatı','New Orleans','Bayou','NOB',1,'#7b2d8b','#3fb39a',0.45],
  ['W','Güneybatı','San Antonio','Vaqueros','SAV',2,'#2a2a2e','#b8bec6',0.61]
];
BM.CONF = {E:'Doğu Konferansı',W:'Batı Konferansı'};

BM.POS = ['PG','SG','SF','PF','C'];
BM.POSNAME = {PG:'Oyun kurucu',SG:'Şutör guard',SF:'Kısa forvet',PF:'Uzun forvet',C:'Pivot'};
BM.ATTR = [
  ['ins','Pota altı','Hücum'],['mid','Orta mesafe','Hücum'],['thr','Üçlük','Hücum'],['ft','Serbest atış','Hücum'],
  ['pas','Pas','Oyun kurma'],['han','Top sürme','Oyun kurma'],['iq','Oyun zekâsı','Oyun kurma'],
  ['pdef','Çevre savunması','Savunma'],['idef','İç savunma','Savunma'],['stl','Top çalma','Savunma'],['blk','Blok','Savunma'],
  ['orb','Hücum ribaundu','Ribaund'],['drb','Savunma ribaundu','Ribaund'],
  ['spd','Hız','Fizik'],['str','Güç','Fizik'],['jmp','Sıçrama','Fizik'],['sta','Dayanıklılık','Fizik'],
  ['cons','İstikrar','Zihinsel'],['work','Çalışkanlık','Zihinsel']
];
BM.AKEYS = BM.ATTR.map(a=>a[0]);
// position weights for the overall rating
BM.OVRW = {
  PG:{han:16,pas:16,thr:10,mid:8,ins:6,pdef:10,stl:6,spd:10,iq:10,ft:3,cons:5},
  SG:{thr:15,mid:12,ins:8,han:10,pas:6,pdef:12,stl:6,spd:10,jmp:5,iq:8,ft:3,cons:5},
  SF:{thr:10,mid:10,ins:10,han:6,pas:6,pdef:12,idef:6,stl:5,drb:6,spd:7,jmp:7,str:5,iq:7,cons:3},
  PF:{ins:14,mid:8,thr:4,idef:14,blk:8,orb:8,drb:12,str:10,jmp:7,iq:7,pas:4,cons:4},
  C:{ins:14,idef:16,blk:12,orb:10,drb:14,str:12,jmp:6,iq:6,pas:3,ft:2,cons:5}
};
// rating templates per position (mean on 1-20 scale)
BM.TPL = {
  PG:{ins:9,mid:11,thr:12,ft:13,pas:14,han:14,iq:12,pdef:11,idef:5,stl:11,blk:3,orb:4,drb:7,spd:14,str:7,jmp:10,sta:13},
  SG:{ins:10,mid:12,thr:13,ft:13,pas:10,han:12,iq:11,pdef:11,idef:6,stl:10,blk:4,orb:5,drb:8,spd:13,str:8,jmp:11,sta:13},
  SF:{ins:11,mid:11,thr:11,ft:12,pas:9,han:10,iq:11,pdef:11,idef:9,stl:9,blk:6,orb:7,drb:10,spd:11,str:10,jmp:12,sta:13},
  PF:{ins:13,mid:10,thr:7,ft:10,pas:8,han:7,iq:10,pdef:8,idef:12,stl:7,blk:10,orb:11,drb:13,spd:9,str:13,jmp:11,sta:12},
  C:{ins:14,mid:7,thr:3,ft:9,pas:7,han:5,iq:10,pdef:6,idef:14,stl:6,blk:13,orb:13,drb:14,spd:7,str:15,jmp:11,sta:12}
};
BM.HGT = {PG:[183,193],SG:[190,198],SF:[198,206],PF:[203,211],C:[208,221]};

BM.FIRST = ['Marcus','Jalen','Darius','Andre','Tyrell','Kevin','Brandon','Derek','Malik','Jordan','Isaiah','Corey','Trevor','Lamar','Devin','Shawn','Rashad','Terrence','Elliot','Quentin','Mason','Caleb','Xavier','Dante','Reggie','Victor','Omar','Luis','Mateo','Nikola','Goran','Luka','Bojan','Tomas','Andrei','Pau','Rudy','Ersan','Hedo','Mehmet','Cem','Furkan','Emre','Kerem','Boris','Tony','Manu','Leandro','Thiago','Yuki','Chen','Kenji','Hamid','Amadou','Kwame','Seydou','Pascal','Serge','Joel','Dwayne','Ray','Paul','Chris','Mike','Josh','Ryan','Tyler','Austin','Cody','Blake','Zach','Gordon','Wesley','Arron','Delonte','Rodney','Carlos','Antoine','Rasheed','Jermaine','Stephon','Vince','Grant','Kenyon','Elton','Lamond','Hakeem','Dikembe','Clyde','Moses','Bernard','Curtis','Felix','Hugo','Ivan','Jonas','Lorenzo','Nate','Oscar','Percy','Quincy','Roy','Sterling','Trent','Ulysses','Vernon','Walt','Yannick','Zeke','Aaron','Bryce','Cedric','Damon','Ezra','Fabian','Gino','Harlan'];
BM.LAST = ['Johnson','Williams','Brooks','Carter','Hayes','Mitchell','Bennett','Coleman','Foster','Griffin','Hollis','Jenkins','Kendall','Lawson','Monroe','Nash','Owens','Pryor','Quinn','Rhodes','Sims','Tatum','Upshaw','Vance','Whitfield','Yates','Abernathy','Barlow','Crawford','Dawson','Ellison','Fairbanks','Garrison','Holloway','Ingram','Jameson','Kirkland','Langford','Maddox','Norwood','Oakley','Pendleton','Ramsey','Sheffield','Thornton','Underwood','Vaughn','Wainwright','Ashby','Blackwell','Calloway','Drummond','Easley','Fitzgerald','Gaines','Hargrove','Irving','Jefferson','Kearney','Lockhart','Mayfield','Newsome','Overton','Pettiford','Radcliffe','Strickland','Townsend','Valentine','Whitaker','Yarbrough','Petrović','Jokanović','Kovač','Marković','Novak','Horvat','Varga','Silva','Moreno','Herrera','Castillo','Navarro','Gómez','Rossi','Bianchi','Conti','Moretti','Kaya','Yılmaz','Demir','Şahin','Aydın','Öztürk','Arslan','Doğan','Koç','Laurent','Dubois','Fontaine','Mercier','Schmidt','Weber','Becker','Hoffmann','Nowak','Kowalski','Lindqvist','Andersen','Nakamura','Tanaka','Diallo','Traoré','Ndiaye','Okafor','Mensah','Adeyemi','Kamara','Sow','Baptiste','Pierre','Boateng','Mutombo-Kalu','Ferreira','Duarte','Sandoval','Quintero','Aguilar','Ibarra','Vasquez','Lopes','Teixeira','Pavlović','Đorđević','Stojanović','Ivanov','Petrov','Volkov','Sokolov','Moroz','Hale','Pruitt','Spears','Dunbar','Merriweather','Holcomb','Ricks','Battle','Peoples','Moody','Knight','Swift','Stone','Rivers','Fields','Banks','Lake','Hill','Wood','Ford','Cross','Steele','Frost','Hart','Wolfe','Fox','Crane','Drake','Bishop','Cannon','Dean','Gentry','Harper','Keller','Lyle','Marsh','Noble','Page','Reed','Shaw','Tucker','Webb','York'];
BM.COLLEGES = ['Kuzey Eyalet Ü.','Güney Teknik','Batı Kıyı Koleji','Göller Bölgesi Ü.','Çöl Vadisi Ü.','Doğu Liman Koleji','Çam Tepesi Ü.','Ova Eyalet','Kanyon Ü.','Körfez Ü.','Avrupa (profesyonel)','Uluslararası','Lise'];

BM.MONTHS = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
BM.U = {
  clamp:(v,a,b)=>v<a?a:v>b?b:v, rnd:(a,b)=>a+Math.random()*(b-a), rint:(a,b)=>Math.floor(a+Math.random()*(b-a+1)),
  pick:a=>a[Math.floor(Math.random()*a.length)], gauss(){ let u=0,v=0; while(!u) u=Math.random(); while(!v) v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); },
  shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; },
  day:(y,m,d)=>Math.floor(Date.UTC(y,m-1,d)/864e5),
  ymd(day){ const d=new Date(day*864e5); return {y:d.getUTCFullYear(),m:d.getUTCMonth()+1,d:d.getUTCDate(),w:d.getUTCDay()}; },
  fdate(day){ const x=BM.U.ymd(day); return x.d+' '+BM.MONTHS[x.m-1]+' '+x.y; },
  money(v){ const a=Math.abs(v); const s=a>=1e6?(a/1e6).toFixed(a>=1e7?1:2)+' M$':a>=1e3?Math.round(a/1e3)+' B$':Math.round(a)+' $'; return (v<0?'-':'')+s; },
  esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  seasonName:y=>y+'-'+String((y+1)%100).padStart(2,'0')
};
})();
