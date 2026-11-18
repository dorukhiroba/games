/* Reel Rumble — walkable overworld for 1–4 heroes (local or online) + local "press jump to join" lobby */
(function(){
'use strict';
const U=RR.U, Art=RR.Art, OL=Art.OL, In=RR.Input, A=RR.Audio, W=RR.W, H=RR.H, UI=RR.UI;

/* ---------- world layout (original island) ---------- */
const ISLAND=[[70,430],[120,280],[260,170],[470,120],[700,95],[930,110],[1120,90],[1225,170],[1240,330],[1200,470],[1230,600],[1080,672],[820,682],[560,668],[330,682],[150,630],[80,540]];
const RIVER=[[652,60],[622,200],[684,300],[642,420],[700,540],[664,720]];
const BRIDGES=[{x:630,y:280,w:108,h:42},{x:642,y:520,w:112,h:42}];
const LOCS=[
  {id:'tutorial',kind:'tutorial',x:200,y:525,name:'Prova Çadırı',desc:'Kontrolleri ve savuşturmayı öğren.'},
  {id:'shop',kind:'shop',x:305,y:305,name:'Bilet Gişesi',desc:'Silah ve tılsım al.'},
  {id:'luna',kind:'run',x:480,y:245,name:'Lunapark Yolu',desc:'Koş ve ateş et, 5 gizli jeton.'},
  {id:'corn',kind:'boss',x:470,y:565},
  {id:'gramo',kind:'boss',x:830,y:215},
  {id:'boiler',kind:'boss',x:860,y:585},
  {id:'cloud',kind:'boss',x:1000,y:395},
  {id:'paper',kind:'boss',x:1140,y:545},
  {id:'proj',kind:'boss',x:1115,y:205}
];
RR.LOCS=LOCS;
const TREES=[[150,360],[195,415],[235,250],[390,190],[565,175],[395,430],[560,440],[330,620],[590,610],[770,330],[800,455],[905,300],[960,170],[1185,395],[1060,615],[945,655],[125,505],[1200,250],[760,640],[540,330]];
const COINS=[{id:0,x:108,y:468},{id:1,x:578,y:648},{id:2,x:1210,y:300}];
RR.Ach&&RR.Ach.list&&!RR.Ach.list.some(a=>a[0]==='explorer')&&RR.Ach.list.push(['explorer','Kâşif','Haritadaki 3 gizli jetonun hepsini bul.']);

function inPoly(x,y,P){ let ins=false; for(let i=0,j=P.length-1;i<P.length;j=i++){ const xi=P[i][0],yi=P[i][1],xj=P[j][0],yj=P[j][1]; if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)) ins=!ins; } return ins; }
function segDist(px,py,ax,ay,bx,by){ const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy; const t=l?U.clamp(((px-ax)*dx+(py-ay)*dy)/l,0,1):0; return Math.hypot(px-(ax+dx*t),py-(ay+dy*t)); }
function riverDist(x,y){ let d=1e9; for(let i=0;i<RIVER.length-1;i++) d=Math.min(d,segDist(x,y,RIVER[i][0],RIVER[i][1],RIVER[i+1][0],RIVER[i+1][1])); return d; }
const onBridge=(x,y)=>BRIDGES.some(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);
function walkable(x,y){
  if(!inPoly(x,y,ISLAND)) return false;
  for(const d of [[14,0],[-14,0],[0,9],[0,-9]]) if(!inPoly(x+d[0],y+d[1],ISLAND)) return false;
  if(riverDist(x,y)<32&&!onBridge(x,y)) return false;
  for(const L of LOCS) if(Math.hypot(x-L.x,(y-(L.y-26))*1.3)<36) return false;
  for(const t of TREES) if(Math.hypot(x-t[0],(y-t[1])*1.4)<20) return false;
  return true;
}
RR.mapWalkable=walkable;
const locked=L=>L.id==='proj'&&!RR.Save.finalUnlocked();

/* ---------- cached island art ---------- */
let bgCv=null;
function drawBG(){
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const m=cv.getContext('2d');
  m.fillStyle='#7fb0b4'; m.fillRect(0,0,W,H);
  m.strokeStyle='rgba(255,255,255,0.35)'; m.lineWidth=3; for(let i=0;i<80;i++){ const x=(i*173)%W, y=(i*97)%H; m.beginPath(); m.arc(x,y,12,Math.PI*1.1,Math.PI*1.9); m.stroke(); }
  const poly=(P)=>{ m.beginPath(); P.forEach((p,i)=>i?m.lineTo(p[0],p[1]):m.moveTo(p[0],p[1])); m.closePath(); };
  m.save(); m.translate(0,12); poly(ISLAND); m.fillStyle='#e9d7a6'; m.fill(); m.restore();
  poly(ISLAND); m.fillStyle='#9dbb6e'; m.fill(); m.lineWidth=6; m.strokeStyle=OL; m.stroke();
  m.save(); poly(ISLAND); m.clip();
  // final hill
  m.fillStyle='#86a85a'; m.beginPath(); m.ellipse(1110,180,150,90,0,0,Math.PI*2); m.fill(); m.lineWidth=3; m.strokeStyle='rgba(30,40,10,0.35)'; m.stroke();
  // farm fields near the corn general
  for(let k=0;k<6;k++){ m.fillStyle=k%2?'#c9a95a':'#b8954a'; m.fillRect(380+k*30,600,26,60); }
  // airfield
  m.fillStyle='#8f8f8a'; Art.rr(m,930,450,270,40,12); m.fill(); m.lineWidth=4; m.strokeStyle=OL; m.stroke();
  m.setLineDash([16,12]); m.beginPath(); m.moveTo(945,470); m.lineTo(1185,470); m.lineWidth=3; m.strokeStyle='#fffaf0'; m.stroke(); m.setLineDash([]);
  // dirt paths
  m.lineCap='round'; m.lineJoin='round';
  const path=(P)=>{ m.beginPath(); P.forEach((p,i)=>i?m.lineTo(p[0],p[1]):m.moveTo(p[0],p[1])); m.lineWidth=24; m.strokeStyle='#d9c48c'; m.stroke(); m.lineWidth=2; m.strokeStyle='rgba(120,90,40,0.35)'; m.setLineDash([3,12]); m.stroke(); m.setLineDash([]); };
  path([[260,600],[200,560],[260,430],[305,340],[420,280],[480,280],[600,300],[690,300],[780,250],[830,250],[960,240],[1080,240],[1115,240]]);
  path([[305,340],[380,470],[470,600],[600,560],[700,540],[800,560],[860,620],[960,560],[1000,430],[1080,470],[1140,580]]);
  // grass tufts
  m.fillStyle='rgba(60,90,30,0.25)'; for(let i=0;i<70;i++){ const x=110+(i*211)%1100, y=140+(i*131)%520; m.beginPath(); m.arc(x,y,5,Math.PI,0); m.fill(); }
  m.restore();
  // river + bridges
  m.lineCap='round'; m.lineJoin='round';
  m.save(); poly(ISLAND); m.clip();
  m.beginPath(); RIVER.forEach((p,i)=>i?m.lineTo(p[0],p[1]):m.moveTo(p[0],p[1])); m.lineWidth=64; m.strokeStyle=OL; m.stroke(); m.lineWidth=56; m.strokeStyle='#6aa3c0'; m.stroke();
  m.lineWidth=4; m.strokeStyle='rgba(255,255,255,0.45)'; m.setLineDash([10,22]); m.stroke(); m.setLineDash([]);
  m.restore();
  BRIDGES.forEach(b=>{ m.fillStyle='#a8743c'; Art.rr(m,b.x,b.y,b.w,b.h,6); m.fill(); m.lineWidth=4; m.strokeStyle=OL; m.stroke();
    m.lineWidth=2; m.strokeStyle='rgba(60,30,10,0.6)'; for(let x=b.x+10;x<b.x+b.w;x+=12){ m.beginPath(); m.moveTo(x,b.y+4); m.lineTo(x,b.y+b.h-4); m.stroke(); }
    m.fillStyle='#7a4f26'; m.fillRect(b.x,b.y-4,b.w,6); m.fillRect(b.x,b.y+b.h-2,b.w,6); });
  Art.text(m,'SİNEMA ADASI',190,52,40,{title:true,color:'#f3e4c2',stroke:OL,sw:8});
  return cv;
}
function drawTree(c,x,y,t){ c.save(); c.translate(x,y); Art.ell(c,0,4,18,6,'rgba(0,0,0,0.2)',0); Art.rrect(c,-4,-20,8,22,2,'#7a5a32',2.5); Art.circ(c,0,-30,17,'#5f8a3a',3); Art.circ(c,-7,-36,7,'#77a24a',0); c.restore(); }

/* ---------- overworld scene ---------- */
const SPEED=240;
RR.Scenes.map = {
  enter(){
    this.t=0; this.pop=null; this.sendT=0; this.rem={}; RR.S.rush=null; if(!bgCv) bgCv=drawBG();
    const S=RR.S, Ctrl=In.Ctrl; let devs;
    if(S.mode==='local'&&S.locals&&S.locals.length) devs=S.locals; else devs=[{scheme:'solo',pad:0}];
    const pos=S.mapPos||[];
    this.locals=devs.map((d,i)=>{ const p=pos[i]||{x:262+(i%2)*34,y:592+Math.floor(i/2)*26}; return {i,ctrl:new Ctrl(d.scheme,d.pad),x:p.x,y:p.y,f:1,mv:false,rt:0}; });
    this.locals.forEach(p=>{ if(!walkable(p.x,p.y)){ p.x=262; p.y=592; } });
    A.playMusic('map'); if(S.mode==='online'&&S.role==='host'){ RR.Net.send({t:'map'}); RR.Net.pushRoster(); }
  },
  leave(){ RR.S.mapPos=this.locals.map(p=>({x:p.x,y:p.y})); },
  slotOf(p){ return RR.S.mode==='online'?RR.Net.slot:p.i; },
  charOf(p){ return RR.S.mode==='local'?RR.Save.d.load[p.i].char:RR.Save.d.load[0].char; },
  near(p){ let best=null,bd=82; LOCS.forEach(L=>{ const d=Math.hypot(p.x-L.x,p.y-(L.y+6)); if(d<bd){bd=d;best=L;} }); return best; },
  activate(L){
    const S=RR.S, client=S.mode==='online'&&S.role==='client';
    if(L.kind==='shop'){ A.sfx('select'); RR.go('shop'); return; }
    if(client){ A.sfx('move'); RR.Net.send({t:'enterreq',name:L.name||RR.BOSS[L.id].name}); UI.toast('Bölüme ev sahibi girer — haber verildi.'); return; }
    if(L.kind==='tutorial'){ A.sfx('select'); RR.startFight('dummy',1); }
    else if(L.kind==='run'){ A.sfx('select'); RR.startFight(L.id,1); }
    else if(locked(L)){ A.sfx('deny'); UI.toast('Kapı kilitli: önce diğer beş yıldızı yen (3 kara + 2 uçak)!'); }
    else { A.sfx('select'); this.pop={sel:Math.min(1,this.popLast==null?1:this.popLast),L}; }
  },
  update(dt){
    this.t+=dt; const S=RR.S;
    if(this.pop){ this.updPop(); return; }
    this.locals.forEach(p=>{
      const c=p.ctrl; c.poll();
      let h=(c.held('right')?1:0)-(c.held('left')?1:0), v=(c.held('down')?1:0)-(c.held('up')?1:0);
      if(h&&v){ h*=0.7071; v*=0.7071; }
      p.mv=!!(h||v); if(h) p.f=h>0?1:-1;
      const nx=p.x+h*SPEED*dt, ny=p.y+v*SPEED*dt;
      if(walkable(nx,p.y)) p.x=nx; if(walkable(p.x,ny)) p.y=ny;
      if(p.mv) p.rt+=dt;
      COINS.forEach(co=>{ const got=RR.Save.d.mapCoins||(RR.Save.d.mapCoins=[]); if(!got.includes(co.id)&&Math.hypot(p.x-co.x,p.y-co.y)<26){ got.push(co.id); RR.Save.d.coins++; RR.Save.save(); A.sfx('coin'); UI.toast('Gizli jeton bulundu! ('+got.length+' / 3)',2600); if(got.length>=3&&RR.Ach) RR.Ach.give('explorer'); } });
      const L=this.near(p);
      if(L&&(c.pressed('jump')||(p.i===0&&In.m('ok')))) this.activate(L);
    });
    if(In.m('alt')){ A.sfx('select'); RR.go('equip',{back:'map'}); return; }
    if(In.m('pause')){ A.sfx('back'); RR.go('menu'); return; }
    // online position sync (~10 Hz)
    if(S.mode==='online'){
      this.sendT+=dt; const me=this.locals[0];
      if(this.sendT>0.1){ this.sendT=0;
        if(S.role==='client') RR.Net.send({t:'mpos',x:me.x,y:me.y,f:me.f,mv:me.mv,c:this.charOf(me)});
        else { const list=[{slot:0,x:me.x,y:me.y,f:me.f,mv:me.mv,c:this.charOf(me)}].concat(Object.values(S.mapPeers||{})); RR.Net.send({t:'mall',list}); } }
      const peers=S.mapPeers||{}; for(const k in peers){ const e=peers[k], r=this.rem[k]||(this.rem[k]={x:e.x,y:e.y,rt:0}); r.x=U.lerp(r.x,e.x,0.25); r.y=U.lerp(r.y,e.y,0.25); r.f=e.f||1; r.mv=e.mv; r.c=e.c||'bolt'; r.slot=e.slot; if(r.mv) r.rt+=dt; }
      for(const k in this.rem) if(!peers[k]) delete this.rem[k];
    }
  },
  updPop(){ const p=this.pop; p.sel=UI.nav(p.sel,3,true); if(In.m('up')||In.m('down')) p.sel=UI.nav(p.sel,3);
    if(In.m('back')||In.m('pause')){ A.sfx('back'); this.pop=null; return; }
    if(In.m('ok')){ A.sfx('select'); this.popLast=p.sel; const id=p.L.id; this.pop=null; RR.startFight(id,p.sel); } },
  draw(c){
    const t=this.t, S=RR.S; c.drawImage(bgCv,0,0);
    for(let i=0;i<3;i++){ const x=((t*18+i*450)%(W+200))-100; c.save(); c.globalAlpha=0.7; c.translate(x,64+i*28); [[-30,0,20],[0,-8,26],[28,2,18]].forEach(o=>Art.circ(c,o[0],o[1],o[2],'#fbf3e0',0)); c.restore(); }
    // depth-sorted world objects
    const items=[];
    TREES.forEach(tr=>items.push({y:tr[1],d:()=>drawTree(c,tr[0],tr[1],t)}));
    LOCS.forEach(L=>items.push({y:L.y,d:()=>{ Art.mapNode(c,L,t,{locked:locked(L),beaten:!!RR.Save.d.beaten[L.id]});
      if(L.id==='proj'&&locked(L)){ c.save(); c.translate(L.x,L.y+18); for(let k=-3;k<=3;k++) Art.rrect(c,k*16-3,-26,6,30,2,'#5a5550',2.5); Art.rrect(c,-56,-20,112,6,2,'#5a5550',2.5); c.restore(); } }}));
    const got=RR.Save.d.mapCoins||[];
    COINS.forEach(co=>{ if(got.includes(co.id)) return; const nearest=Math.min(...this.locals.map(p=>Math.hypot(p.x-co.x,p.y-co.y)));
      items.push({y:co.y,d:()=>{ const a=U.clamp(1-(nearest-60)/140,0.12,1); c.save(); c.globalAlpha=a; c.translate(co.x,co.y-10+Math.sin(t*3+co.id)*3); c.scale(Math.max(0.2,Math.abs(Math.cos(t*3+co.id))),1); Art.circ(c,0,0,10,'#ffd23a',3); c.restore(); if(Math.sin(t*5+co.id*2)>0.85) Art.star(c,co.x+8,co.y-18,5,'#fffaf0',0,t); }}); });
    const hero=(ch,x,y,rt,mv,f,idx,label,col)=>items.push({y,d:()=>{ c.save(); c.translate(x,y); c.scale(0.5,0.5); Art.ell(c,0,4,26,8,'rgba(0,0,0,0.25)',0); UI.hero(c,ch,0,0,mv?rt:t*0.2,idx,{run:mv,face:f}); c.restore();
      if(label){ c.save(); c.translate(x,y-84+Math.sin(t*4+idx)*2); c.beginPath(); c.moveTo(-7,0); c.lineTo(7,0); c.lineTo(0,9); c.closePath(); c.fillStyle=col; c.fill(); c.lineWidth=2; c.strokeStyle=OL; c.stroke(); Art.text(c,label,0,-10,14,{title:true,color:col,stroke:OL,sw:4}); c.restore(); } }});
    const multi=this.locals.length>1||S.mode==='online';
    this.locals.forEach(p=>{ const sl=this.slotOf(p); hero(this.charOf(p),p.x,p.y,p.rt,p.mv,p.f,sl,multi?'P'+(sl+1):'',RR.PCOL[sl%4]); });
    for(const k in this.rem){ const r=this.rem[k]; hero(r.c,r.x,r.y,r.rt,r.mv,r.f,r.slot,'P'+(r.slot+1),RR.PCOL[r.slot%4]); }
    items.sort((a,b)=>a.y-b.y).forEach(o=>o.d());
    // prompts
    const shown=new Set(); const client=S.mode==='online'&&S.role==='client';
    this.locals.forEach(p=>{ const L=this.near(p); if(!L||shown.has(L.id)) return; shown.add(L.id);
      const def=RR.BOSS[L.id], name=L.name||def.name, sub=L.kind==='boss'?(locked(L)?'KİLİTLİ':((RR.Save.d.grades[L.id]||[])[1]?'Not: '+RR.Save.d.grades[L.id][1]:'"'+def.title+'"')):L.desc;
      const act=locked(L)?'':(client&&L.kind!=='shop'?'ev sahibi girer':'gir');
      const key=In.device==='pad'?'{A}':'Z';
      const bw=Math.max(220,UI.measure(c,name,22)+40), bx=U.clamp(L.x-bw/2,10,W-bw-10), by=Math.max(8,L.y-178);
      c.save(); c.globalAlpha=0.95; Art.rrect(c,bx,by,bw,act?78:58,12,'#fffaf0',3.5); c.restore();
      Art.text(c,name,bx+bw/2,by+20,22,{title:true,color:'#d8343a'}); Art.text(c,sub,bx+bw/2,by+42,14,{bold:true});
      if(act) UI.rich(c,key+' '+act,bx+bw/2,by+62,15,{color:'#2a1d14'}); });
    // HUD
    Art.text(c,'Jeton: '+RR.Save.d.coins,W-24,32,24,{title:true,align:'right',color:'#ffd23a',stroke:OL,sw:6});
    if(S.mode==='online'){ const R=S.roster&&S.roster.length?S.roster:[{slot:RR.Net.slot,char:this.charOf(this.locals[0])}];
      Art.text(c,(S.role==='host'?'ODA: '+(RR.Net.code||'')+'  •  ':'ÇEVRİMİÇİ  •  ')+R.length+' / 4',W-24,64,18,{title:true,align:'right',color:'#9ad8ff',stroke:OL,sw:5});
      R.forEach((e,k)=>{ const x=W-24-k*92; Art.rrect(c,x-86,80,86,26,8,'rgba(255,250,240,0.9)',2.5); Art.circ(c,x-74,93,6,RR.PCOL[e.slot%4],2); Art.text(c,'P'+(e.slot+1)+' '+((RR.CHARS[e.char]||{}).name||''),x-64,94,12,{bold:true,align:'left'}); }); }
    else if(S.mode==='local') Art.text(c,'YEREL  •  '+this.locals.length+' OYUNCU',W-24,64,18,{title:true,align:'right',color:'#9ad8ff',stroke:OL,sw:5});
    UI.rich(c,In.device==='pad'?'{LS} yürü   •   {A} gir   •   {Y} ekipman   •   {START} menü':'Yön tuşları / WASD: yürü   •   Z / Enter: gir   •   Tab / E: ekipman   •   Esc: menü',W/2,H-16,15,{color:'#fff3d6',stroke:OL,sw:4});
    if(this.pop) this.drawPop(c);
  },
  drawPop(c){ const L=this.pop.L, def=RR.BOSS[L.id], p=this.pop; c.fillStyle='rgba(0,0,0,0.5)'; c.fillRect(0,0,W,H);
    Art.panel(c,W/2-360,150,720,360); def.portrait(c,W/2,330,0.42,this.t);
    Art.text(c,def.name,W/2,195,40,{title:true,color:'#d8343a'});
    if(def.plane){ c.save(); c.translate(W/2+250,195); c.rotate(-0.1); Art.rrect(c,-44,-14,88,28,6,'#2f6fd6',3); Art.text(c,'UÇAK',0,1,16,{title:true,color:'#fff'}); c.restore(); }
    RR.DIFFS.forEach((d,i)=>{ const x=W/2-230+i*230, on=i===p.sel, g=(RR.Save.d.grades[L.id]||[])[i]; Art.rrect(c,x-90,420,180,62,12,on?'#d8343a':'#fffaf0',4); Art.text(c,d.name,x,446,26,{title:true,color:on?'#fff6e0':'#2a1d14'}); Art.text(c,g?'Not: '+g:'—',x,470,13,{bold:true,color:on?'#fff6e0':'#6a5a4a'}); });
    const n=RR.S.mode==='local'?this.locals.length:(RR.S.mode==='online'?RR.Net.count():1);
    const tips=['Daha az mermi, daha yavaş saldırılar.','Asıl deneyim. Önerilen.','Daha hızlı, daha sert. S notu sadece burada!'];
    Art.text(c,tips[p.sel]+(n>1?'  •  '+n+' oyuncu: boss canı ×'+[1,1.5,1.95,2.4][n-1]:''),W/2,498,16,{bold:true});
    UI.hint(c,'←→: zorluk  •  Z: başla  •  Esc: vazgeç',H-60); }
};

/* ---------- local lobby: each device presses jump to join (up to 4) ---------- */
RR.Scenes.join = {
  enter(){ this.t=0; this.slots=[]; this.ctl={}; this.prevEnter=true; this.prevEsc=true; this.prevStart={}; A.playMusic('menu'); },
  devs(){ const L=[{id:'kb1',scheme:'p1',pad:null,label:'Klavye 1 · WASD + J K L'},{id:'kb2',scheme:'p2',pad:null,label:'Klavye 2 · Yön + Num 1 2 3'}];
    In.padList().forEach((g,i)=>L.push({id:'pad'+i,scheme:'none',pad:i,label:'Kol '+(i+1)})); return L; },
  update(dt){
    this.t+=dt; const keysCH=Object.keys(RR.CHARS);
    for(const d of this.devs()){ const c=this.ctl[d.id]||(this.ctl[d.id]=new In.Ctrl(d.scheme,d.pad)); c.poll();
      const j=this.slots.findIndex(s=>s.id===d.id);
      if(j<0&&c.pressed('jump')&&this.slots.length<4){ this.slots.push({id:d.id,scheme:d.scheme,pad:d.pad,label:d.label}); A.sfx('select'); if(d.pad!=null) In.rumble(d.pad,0.5,150); }
      else if(j>=0&&c.pressed('dash')){ this.slots.splice(j,1); A.sfx('back'); }
      else if(j>=0&&(c.pressed('left')||c.pressed('right'))){ const L=RR.Save.d.load[j]; L.char=keysCH[(keysCH.indexOf(L.char)+(c.pressed('right')?1:-1)+keysCH.length)%keysCH.length]; A.sfx('move'); RR.Save.save(); } }
    let startPad=false; In.padList().forEach((g,i)=>{ const on=!!(g.buttons[9]&&g.buttons[9].pressed); if(on&&!this.prevStart[i]) startPad=true; this.prevStart[i]=on; });
    const ent=In.key('Enter')||In.key('NumpadEnter'), esc=In.key('Escape');
    const start=(ent&&!this.prevEnter)||startPad; this.prevEnter=ent;
    if(esc&&!this.prevEsc){ A.sfx('back'); RR.go('menu'); this.prevEsc=esc; return; } this.prevEsc=esc;
    if(start){ if(!this.slots.length){ A.sfx('deny'); UI.toast('Önce en az bir oyuncu katılsın: zıpla tuşuna bas.'); return; }
      const L=this.slots.map(s=>({scheme:s.scheme,pad:s.pad})); const kb=L.filter(d=>d.pad==null); if(kb.length===1) kb[0].scheme='solo';
      RR.S.locals=L; RR.S.mode='local'; RR.S.role=null; RR.S.mapPos=null; A.sfx('select'); RR.go(RR.Save.d.seenStory?'map':'story'); }
  },
  draw(c){ const t=this.t; UI.stage(c,t); Art.curtains(c,1,t);
    Art.text(c,'KİMLER OYNUYOR?',W/2,104,52,{title:true,color:'#fff3d6',stroke:OL,sw:10,shadow:'rgba(0,0,0,0.5)'});
    for(let i=0;i<4;i++){ const x=W/2-500+i*250, y=150, s=this.slots[i], col=RR.PCOL[i];
      if(s){ Art.panel(c,x,y,230,380); Art.text(c,'P'+(i+1),x+115,y+38,34,{title:true,color:col,stroke:OL,sw:5});
        const ch=RR.Save.d.load[i].char; c.save(); c.translate(x+115,y+275); c.scale(1.5,1.5); UI.hero(c,ch,0,0,t+i,i,{shoot:Math.sin(t*2+i)>0.6}); c.restore();
        Art.text(c,'◀ '+RR.CHARS[ch].name+' ▶',x+115,y+305,22,{title:true});
        Art.text(c,s.label,x+115,y+335,13,{bold:true,color:'#4a3a2a'});
        Art.text(c,'Ayrıl: atılma tuşu',x+115,y+357,12,{bold:true,color:'#8a7a6a'}); }
      else { c.save(); c.setLineDash([10,8]); Art.rr(c,x,y,230,380,16); c.lineWidth=4; c.strokeStyle='rgba(243,228,194,0.6)'; c.stroke(); c.restore();
        Art.text(c,'P'+(i+1),x+115,y+60,34,{title:true,color:'rgba(243,228,194,0.7)'});
        Art.text(c,'Katılmak için',x+115,y+150,18,{bold:true,color:'#f3e4c2'}); Art.text(c,'ZIPLA tuşuna bas',x+115,y+174,18,{bold:true,color:'#f3e4c2'});
        Art.text(c,'Klavye 1: J / Boşluk',x+115,y+222,14,{bold:true,color:'#f3e4c2'}); Art.text(c,'Klavye 2: Num1 / ,',x+115,y+244,14,{bold:true,color:'#f3e4c2'});
        UI.rich(c,'Kol: {A}',x+115,y+272,15,{color:'#f3e4c2'}); } }
    UI.rich(c,this.slots.length?'Başla: Enter / {START}   •   Karakter: ◀ ▶   •   Geri: Esc':'En fazla 4 oyuncu   •   Geri: Esc',W/2,H-34,17,{color:'#fff3d6',stroke:OL,sw:4}); }
};
})();
