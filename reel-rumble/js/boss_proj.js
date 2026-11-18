/* Final boss — Projeksiyoncu (a cursed film projector) + tutorial dummy */
(function(){
'use strict';
const U=RR.U, Art=RR.Art, OL=Art.OL, GY=RR.GROUND, BU=RR.BU, F=RR.Fight, W=RR.W;
const lens=b=>({x:b.x-150,y:b.y});

const B = RR.BOSS.proj = {
  id:'proj', name:'Projeksiyoncu', title:'Lanetli Makinist', hp:4500, bg:'cinema', music:'proj', par:150,
  phases:[0.66,0.33], plats:[{x:150,y:440,w:150},{x:400,y:390,w:150},{x:650,y:440,w:140}],
  quotes:['Bu film benim, sonunu da ben yazarım!','Perde kapandı... senin için.','Makarayı başa sar ve tekrar izle!'],
  cool:[0.95,0.8,0.55],
  pattern:[['frames','lensbeam','ghosts'],['reels','stars','frames'],['spiral2','sandbags','lensbeam']],
  init(b){ Object.assign(b,{x:1040,y:300,bx:1040,by:300,mouth:0,reels:true,red:0,glare:0}); },
  hurt(b){ return [{x:b.x-160,y:b.y-80,w:280,h:160}]; },
  body(b){ return [{x:b.x-120,y:b.y-70,w:230,h:140}]; },
  onPhase(b,G){
    if(b.phase===1){ b.reels=false; spawnSaws(b,G); }
    if(b.phase===2){ b.red=1; F.fx(G,'boom',b.x,b.y,{s:2}); }
  },
  update(b,G,dt){
    b.mouth=Math.max(0,b.mouth-dt*2); b.glare=Math.max(0,b.glare-dt*1.5);
    const amp=b.phase===2?160:40;
    b.x=b.bx+Math.sin(b.t*0.6)*amp-(b.phase===2?60:0); b.y=b.by+Math.sin(b.t*1.5)*22;
    BU.run(b,G,dt,B);
  },
  atk:{
    frames(b,G,dt,a){
      const bursts=[2,3,3][G.diff]+(b.phase>0?1:0);
      for(let k=0;k<bursts;k++){ const i=BU.every(a,0.3+k*0.7,0.12,3); if(i>=0){ const L=lens(b), p=BU.tgt(G,L.x,L.y), an=U.ang(L.x,L.y,p.x,p.y-40)+U.rnd(-0.05,0.05);
        BU.es(G,{k:'frame',x:L.x,y:L.y,vx:Math.cos(an)*520*G.D.spd,vy:Math.sin(an)*520*G.D.spd,r:18,a:an,parry:BU.pinkN(a,4)}); F.sfx(G,'shoot'); b.glare=0.5; } }
      return a.t>0.3+bursts*0.7+0.2;
    },
    lensbeam(b,G,dt,a){
      const n=b.phase===2?2:(G.diff===2?2:1);
      const i=BU.every(a,0,1.5,n);
      if(i>=0){ const L=lens(b); BU.es(G,{k:'lbeam',x:L.x,y:L.y,x1:L.x,y1:L.y,x2:L.x-1600,y2:L.y,w:46,harmless:true,keep:true,life:0.9,upd:'lbtrack',onEnd:'lbfire'}); F.sfx(G,'tele'); b.glare=1; }
      return a.t>(n-1)*1.5+1.6;
    },
    ghosts(b,G,dt,a){
      const n=[2,2,3][G.diff], i=BU.every(a,0.2,0.5,n);
      if(i>=0){ const L=lens(b); BU.mn(G,{k:'spook',x:L.x+40,y:L.y-60,vx:-60,vy:-40,r:26,hp:16,col:'#f6f2ff',parry:i===n-1}); F.sfx(G,'sing'); }
      return a.t>0.2+n*0.5+0.5;
    },
    reels(b,G,dt,a){ if(BU.cross(a,0.1)&&!G.es.some(e=>e.k==='reelsaw')) spawnSaws(b,G); return a.t>0.8; },
    stars(b,G,dt,a){
      const n=[2,3,4][G.diff], i=BU.every(a,0.2,0.35,n);
      if(i>=0){ const L=lens(b); BU.es(G,{k:'star',x:L.x,y:L.y,vx:-200,vy:U.rnd(-250,250),r:20,home:2,spd:260*G.D.spd,life:4.5,parry:i===1}); F.sfx(G,'coin'); b.glare=0.6; }
      return a.t>0.2+n*0.35+0.5;
    },
    spiral2(b,G,dt,a){
      const dur=[2.0,2.5,3.0][G.diff], i=BU.every(a,0.1,[0.12,0.1,0.08][G.diff],60); b.glare=1;
      if(i>=0&&a.t<dur){ a.ang=(a.ang||0)+0.42; const L=lens(b); [0,Math.PI].forEach((o,k)=>BU.es(G,{k:'frame',x:L.x,y:L.y,vx:Math.cos(a.ang+o)*230*G.D.spd,vy:Math.sin(a.ang+o)*230*G.D.spd,r:16,a:a.ang+o,parry:k===0&&BU.pinkN(a,7)})); }
      return a.t>dur+0.4;
    },
    sandbags(b,G,dt,a){
      const n=[4,6,7][G.diff], i=BU.every(a,0.2,0.35,n);
      if(i>=0){ const p=BU.tgt(G,b.x,b.y), x=U.clamp(p.x+U.rnd(-90,90),40,1000); BU.es(G,{k:'tele',x,y:GY-4,w:70,h:8,harmless:true,life:0.6}); BU.es(G,{k:'bag',x,y:-60,vx:0,vy:200,ay:1300,r:28,gnd:'bagLand',parry:BU.pinkN(a,4)}); }
      return a.t>0.2+n*0.35+1;
    }
  },
  draw(c,b,G){ drawProj(c,b,G.t); },
  portrait(c,x,y,s,t){ c.save(); c.translate(x,y); c.scale(s,s); drawProj(c,{x:20,y:60,reels:true,red:0,glare:0,mouth:0,phase:0,trans:0},t||0); c.restore(); }
};
function spawnSaws(b,G){ const n=G.diff===0?1:2, sp=[170,200,240][G.diff];
  for(let k=0;k<n;k++) BU.es(G,{k:'reelsaw',x:b.x+(k?60:-50),y:b.y-130,vx:(k?1:-1)*sp*0.6-sp*0.5,vy:k?sp:-sp*0.7,r:40,keep:true,life:8,upd:'saw'}); F.sfx(G,'dash'); }
RR.EUPD.saw=(e)=>{ if(e.x<e.r+10&&e.vx<0) e.vx*=-1; if(e.x>W-e.r-10&&e.vx>0) e.vx*=-1; if(e.y<e.r+50&&e.vy<0) e.vy*=-1; if(e.y>GY-e.r&&e.vy>0) e.vy*=-1; };
RR.EUPD.lbtrack=(e,G)=>{ if(e.t<0.55){ const p=BU.tgt(G,e.x1,e.y1), a=U.ang(e.x1,e.y1,p.x,p.y-40); e.x2=e.x1+Math.cos(a)*1700; e.y2=e.y1+Math.sin(a)*1700; } };
RR.EUPD.lbfire=(e,G)=>{ BU.es(G,{k:'lbeam',x:e.x,y:e.y,x1:e.x1,y1:e.y1,x2:e.x2,y2:e.y2,w:46,life:0.5,keep:true,pierce:true}); F.sfx(G,'beam'); F.shake(G,8); };
RR.EUPD.bagLand=(e,G)=>{ e.dead=true; F.fx(G,'puff',e.x,GY-10,{n:3,col:'#d8c49c'}); F.fx(G,'debris',e.x,GY-10,{n:4,col:'#b88a52'}); F.sfx(G,'land'); F.shake(G,4); };
RR.MUPD.spook=(m,G,dt)=>{ const p=BU.tgt(G,m.x,m.y), a=U.ang(m.x,m.y,p.x,p.y-50), sp=120*G.D.spd; m.vx=U.lerp(m.vx,Math.cos(a)*sp,0.03); m.vy=U.lerp(m.vy,Math.sin(a)*sp,0.03); m.x+=m.vx*dt; m.y+=m.vy*dt+Math.sin(m.t*4)*0.6; };
RR.MDRAW.spook=(c,m,G)=>{ const t=G.t; c.save(); c.translate(m.x,m.y); c.scale(m.vx<0?1:-1,1);
  c.beginPath(); c.moveTo(-24,10); c.quadraticCurveTo(-28,-34,0,-34); c.quadraticCurveTo(28,-34,24,10); for(let i=0;i<4;i++){ const x=24-i*12; c.quadraticCurveTo(x-3,22+((i+Math.floor(t*8))%2)*6,x-12,10); } c.closePath();
  c.fillStyle=m.parry?Art.PINK:'#f6f2ff'; c.fill(); c.lineWidth=3.5; c.strokeStyle=OL; c.stroke();
  c.fillStyle='#2a2a30'; c.fillRect(-26,-2,52,10); c.fillStyle='#f3e4c2'; for(let i=0;i<5;i++) c.fillRect(-22+i*10,0,5,5);
  Art.eye(c,-9,-16,6,8,-0.7,0,{angry:1}); Art.eye(c,6,-16,6,8,-0.7,0,{angry:-1}); c.restore(); };

function reel(c,x,y,r,t){ c.save(); c.translate(x,y); c.rotate(t); Art.circ(c,0,0,r,'#3a3a44',5); Art.circ(c,0,0,r*0.84,'#6d6d78',3); for(let i=0;i<5;i++){ const an=i*1.2566; Art.circ(c,Math.cos(an)*r*0.5,Math.sin(an)*r*0.5,r*0.19,'#1d1d22',2.5); } Art.circ(c,0,0,r*0.14,'#e2b23a',3); c.restore(); }
function drawProj(c,b,t){
  const sh=b.trans>0?U.rnd(-4,4):0, red=b.red>0;
  c.save(); c.translate(b.x+sh,b.y);
  // light cone from lens
  c.save(); c.globalCompositeOperation='lighter'; c.globalAlpha=0.08+0.12*(b.glare||0); c.fillStyle=red?'#ff6a6a':'#fff6d8'; c.beginPath(); c.moveTo(-150,-18); c.lineTo(-900,-260); c.lineTo(-900,260); c.lineTo(-150,18); c.fill(); c.restore();
  // tripod legs
  [-60,10,80].forEach((x,i)=>{ Art.hose(c,x,60,x+(i-1)*30,170+Math.sin(t*3+i)*8,0,6,'#5a5550'); Art.ell(c,x+(i-1)*30,174+Math.sin(t*3+i)*8,10,5,'#3a3634',3); });
  // reels + film loop
  if(b.reels){ c.beginPath(); c.moveTo(-50,-120); c.lineTo(-100,-60); c.lineTo(110,-60); c.lineTo(60,-130); c.lineWidth=8; c.strokeStyle='#2a2a30'; c.stroke(); reel(c,-50,-125,56,-t*3); reel(c,62,-138,56,-t*3+1); }
  else { Art.rrect(c,-56,-120,12,50,4,'#5a5550',3); Art.rrect(c,56,-130,12,60,4,'#5a5550',3); }
  // body
  Art.rrect(c,-120,-76,236,152,18,red?'#5a2228':'#3a3a44',6);
  Art.rrect(c,-104,-60,204,120,12,red?'#7a2a30':'#4e4e5a',3);
  for(let x=-96;x<=96;x+=48){ Art.circ(c,x,-66,4,'#9aa0a6',1.5); Art.circ(c,x,66,4,'#9aa0a6',1.5); }
  // grille mouth
  const mo=b.mouth||0; Art.rrect(c,-60,10,120,34+mo*14,8,'#15151a',3); c.fillStyle='#fffaf0'; for(let i=0;i<6;i++){ c.beginPath(); c.moveTo(-54+i*20,12); c.lineTo(-44+i*20,26); c.lineTo(-34+i*20,12); c.fill(); }
  // brow + small eye
  Art.eye(c,30,-26,16,20,-0.8,0.1,{angry:-1});
  // crank
  c.save(); c.translate(116,0); c.rotate(t*4); Art.rrect(c,-4,-4,40,8,3,'#9aa0a6',3); Art.circ(c,36,0,7,'#d8343a',3); c.restore();
  // lens barrel = big eye
  Art.rrect(c,-160,-44,50,88,10,'#2a2a30',5); Art.rrect(c,-150,-36,8,72,3,'#e2b23a',2);
  const lg=c.createRadialGradient(-160,-8,4,-160,0,42); lg.addColorStop(0,'#ffffff'); lg.addColorStop(1,red?'#ff5a4a':'#9ad8ff');
  Art.ell(c,-162,0,24,42,lg,5);
  Art.ell(c,-170,4,9,16,OL,0); c.beginPath(); c.moveTo(-170,4); c.arc(-170,4,16,-1.3,-0.5); c.closePath(); c.fillStyle='#fff'; c.fill();
  c.beginPath(); c.moveTo(-190,-54); c.lineTo(-130,red?-36:-44); c.lineWidth=8; c.strokeStyle=OL; c.stroke();
  // top hat
  c.save(); c.translate(0,b.reels?-180:-90); c.rotate(-0.1); Art.rrect(c,-50,-6,100,14,6,'#15151a',4); Art.rrect(c,-32,-76,64,74,6,'#15151a',4); c.fillStyle='#8a1820'; c.fillRect(-30,-22,60,10); c.restore();
  c.restore();
}

/* ---------- tutorial dummy ---------- */
const TUT=[[1,'Hareket','←→ / A D','{LS} / {DPAD}'],[2,'Zıpla','Z / Boşluk','{@jump}'],[64,'Eğil','↓','{DPAD} aşağı'],[4,'Atıl','Shift','{@dash}'],[8,'Ateş et','X (basılı tut)','{@shoot} basılı'],[128,'Sabitle & nişan','V + yön','{@lock} + yön'],[16,'Pembeyi savuştur','Havada tekrar Z','havada {@jump}'],[32,'EX atış','C (1 kart)','{@ex} (1 kart)'],[256,'Süper','C (5 kart)','{@ex} (5 kart)']];
const D = RR.BOSS.dummy = {
  id:'dummy', name:'Antrenman Kuklası', title:'Prova Sahnesi', hp:999999, noScale:true, noDeath:true, tutorial:true, bg:'stage', music:'tutorial', par:999,
  phases:[], plats:[{x:330,y:450,w:170},{x:620,y:380,w:170}], quotes:['...'], introTxt:'PROVA!', goTxt:'BAŞLA!',
  init(b,G){ Object.assign(b,{x:1060,y:GY,sw:0,thr:3}); [[415,330],[705,260],[880,420]].forEach(p=>BU.es(G,{k:'pinkstar',x:p[0],y:p[1],r:22,parry:true,soft:true,keep:true,upd:'pstar'})); },
  hurt(b){ return [{x:b.x-55,y:b.y-310,w:110,h:220}]; },
  update(b,G,dt){
    b.sw=U.lerp(b.sw,b.flash>0?0.25:0,0.1)+Math.sin(b.t*2)*0.002; b.hp=b.mhp;
    if(G.state==='fight'){ b.thr-=dt; if(b.thr<=0){ b.thr=3.2; const pink=(b.n=(b.n||0)+1)%2===0; BU.es(G,{k:'ball',x:b.x-60,y:GY-30,vx:-260,vy:0,r:16,parry:pink,gnd:'roll'}); F.sfx(G,'move'); } }
    const p=G.players[0]; if(p&&!G.tutDone&&TUT.every(x=>p.tf&x[0])){ G.tutDone=true; F.banner(G,'PROVA TAMAM!',2.2,{size:80}); F.sfx(G,'revive'); }
  },
  draw(c,b,G){
    const t=G.t; c.save(); c.translate(b.x,b.y);
    Art.rrect(c,70,-430,20,430,4,'#7a5a32',4); Art.rrect(c,-10,-440,100,20,4,'#7a5a32',4); Art.rrect(c,40,-30,80,30,4,'#7a5a32',4);
    c.save(); c.translate(0,-420); c.rotate(b.sw); c.beginPath(); c.moveTo(0,0); c.lineTo(0,40); c.lineWidth=4; c.strokeStyle='#5a5550'; c.stroke();
    Art.rrect(c,-55,40,110,230,40,'#d8343a',5);
    [46,30,14].forEach((r,i)=>Art.circ(c,0,170,r,i%2?'#d8343a':'#f3e4c2',3));
    Art.eye(c,-20,90,12,16,-0.7,0,{}); Art.eye(c,16,90,12,16,-0.7,0,{});
    c.beginPath(); c.arc(-2,118,14,0.2,Math.PI-0.2); c.lineWidth=4; c.strokeStyle=OL; c.stroke();
    c.restore(); c.restore();
  },
  drawUI(c,b,G){
    const p=G.players[0]; if(!p) return;
    c.save(); c.globalAlpha=0.93; Art.panel(c,16,70,300,40+TUT.length*30); c.restore();
    Art.text(c,'ANTRENMAN LİSTESİ',166,96,18,{title:true});
    TUT.forEach((x,i)=>{ const y=128+i*30, ok=!!(p.tf&x[0]); Art.rrect(c,32,y-10,20,20,4,ok?'#58c47c':'#fffaf0',2.5); if(ok) Art.text(c,'✓',42,y,16,{bold:true,color:'#fff'});
      Art.text(c,x[1],60,y,16,{align:'left',bold:true,color:ok?'#3a7a4a':'#2a1d14'}); RR.UI.rich(c,RR.Input.device==='pad'?x[3]:x[2],300,y,13,{align:'right',color:'#6a5a4a',bold:false}); });
    Art.text(c,'Toplam hasar: '+Math.round(p.st.dmg),RR.W/2,100,20,{bold:true,color:'#fff3d6',stroke:OL,sw:5});
    RR.UI.rich(c,RR.Input.device==='pad'?'{START} → Haritaya dön':'ESC → Haritaya dön',RR.W-20,100,16,{align:'right',color:'#fff3d6',stroke:OL,sw:4});
  },
  portrait(c,x,y,s){ c.save(); c.translate(x,y); c.scale(s,s); Art.rrect(c,-40,-60,80,160,30,'#d8343a',4); c.restore(); }
};
RR.EUPD.pstar=(e,G,dt)=>{ e.parryCD=Math.max(0,(e.parryCD||0)-dt); e.harmless=e.parryCD>0; };
})();
