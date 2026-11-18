/* Boss 1 — Albay Mısır (Colonel Corn): cob general -> overheated -> giant popcorn */
(function(){
'use strict';
const U=RR.U, Art=RR.Art, OL=Art.OL, GY=RR.GROUND, BU=RR.BU, F=RR.Fight;

function hopAtk(b,G,a,count){
  if(a.k==null){ a.k=0; a.wait=0.35; }
  if(!b.air){
    if(a.wait==null) a.wait=a.t+0.32;
    if(a.t>=a.wait){
      if(a.k>=count) return true;
      const p=BU.tgt(G,b.x,b.y), T=0.95/G.D.spd, tx=U.clamp(p.x+U.rnd(-50,50),130,1150);
      b.vx=(tx-b.x)/T; b.vy=-1000*T; b.g=2000; b.air=true; b.apex=false; a.k++; a.wait=null; F.sfx(G,'bounce');
    }
  }
  return false;
}
const B = RR.BOSS.corn = {
  id:'corn', name:'Albay Mısır', title:'Tarla Generali', hp:3200, bg:'farm', music:'corn', par:110,
  phases:[0.66,0.33], plats:[{x:170,y:470,w:120},{x:420,y:430,w:130},{x:670,y:470,w:120}],
  quotes:['Bu tarlada emirleri ben veririm, er!','Patlamaya hazır ol, asker!','Sıraya gir ve bir daha dene!'],
  cool:[1.0,0.85,0.6],
  pattern:[['volley','troops','cannon'],['rain','butter','ring'],['hop','hop3','spit']],
  init(b){ Object.assign(b,{x:1050,y:GY,mode:'cob',arm:0,mouth:0,puff:0,tilt:0,vx:0,vy:0,air:false,sq:0}); },
  hurt(b){ return b.mode==='pop'?[{x:b.x-95,y:b.y-95,w:190,h:190}]:[{x:b.x-78,y:b.y-375,w:156,h:330}]; },
  body(b){ return b.mode==='pop'?[{x:b.x-78,y:b.y-78,w:156,h:156}]:[{x:b.x-58,y:b.y-330,w:116,h:330}]; },
  onPhase(b,G){
    if(b.phase===1){ b.mode='hot'; F.fx(G,'puff',b.x,b.y-380,{n:6,s:1.4}); }
    else { b.mode='pop'; b.y=GY-100; b.air=false; F.fx(G,'boom',b.x,b.y,{s:2.4}); F.fx(G,'debris',b.x,b.y,{n:12,col:'#5f8a3a',sp:700}); F.sfx(G,'boom'); }
  },
  update(b,G,dt){
    b.mouth=Math.max(0,b.mouth-dt*2.5); b.sq=Math.max(0,b.sq-dt*4);
    if(!b.atk) { b.arm=Math.max(0,b.arm-dt*3); b.puff=Math.max(0,b.puff-dt*3); b.tilt*=0.9; }
    if(b.mode==='pop'&&b.air){
      b.vy+=b.g*dt; b.x+=b.vx*dt; b.y+=b.vy*dt;
      if(!b.apex&&b.vy>0){ b.apex=true; if(G.diff>0&&b.atk&&b.atk.id==='hop'){ for(let k=0;k<6;k++){ const an=k/6*Math.PI*2+0.3; BU.es(G,{k:'kernel',x:b.x,y:b.y,vx:Math.cos(an)*280,vy:Math.sin(an)*280,r:13,parry:k===4}); } } }
      if(b.y>=GY-100){ b.y=GY-100; b.air=false; b.vx=0; b.sq=1; F.shake(G,12); F.sfx(G,'boom'); F.fx(G,'dust',b.x,GY,{n:6,s:2});
        [-1,1].forEach(d=>BU.es(G,{k:'shock',x:b.x+d*90,y:GY-24,w:64,h:48,vx:d*520*G.D.spd})); }
      b.x=U.clamp(b.x,100,1180);
    }
    BU.run(b,G,dt,B);
  },
  atk:{
    volley(b,G,dt,a){
      const n=[3,4,5][G.diff]; b.arm=Math.min(1,a.t/0.3);
      const i=BU.every(a,0.4,0.38,n);
      if(i>=0){ const p=BU.tgt(G,b.x,b.y), x0=b.x-120, y0=b.y-300, v=BU.lob(x0,y0,p.x+U.rnd(-50,50),GY-20,1.05/G.D.spd,1100);
        BU.es(G,{k:'pop',x:x0,y:y0,vx:v.vx,vy:v.vy,ay:1100,r:20,spin:4,parry:BU.pinkN(a,3),gnd:'die'}); F.sfx(G,'small'); b.mouth=1; }
      return a.t>0.4+n*0.38+0.3;
    },
    troops(b,G,dt,a){
      const n=[2,3,4][G.diff], i=BU.every(a,0.2,0.6,n); b.mouth=0.6;
      if(i>=0){ BU.mn(G,{k:'ktroop',x:b.x-90,y:GY-28,vx:-(150+i*20)*G.D.spd,r:26,hp:14,col:'#f2c230',parry:i===n-1,hop:U.rnd(0.5,1.1)}); F.sfx(G,'move'); }
      return a.t>0.2+n*0.6+0.3;
    },
    cannon(b,G,dt,a){
      if(BU.cross(a,0)) F.sfx(G,'tele');
      const seq=[GY-32,GY-120,GY-32].slice(0,[2,2,3][G.diff]);
      b.puff=a.t<0.7?a.t/0.7:Math.max(0,b.puff-dt*2);
      const i=BU.every(a,0.75,0.65,seq.length);
      if(i>=0){ const low=seq[i]>GY-60; BU.es(G,{k:'kernel',x:low?b.x-190:b.x-70,y:seq[i],vx:-700*G.D.spd,vy:0,r:26}); F.sfx(G,'boom'); F.shake(G,5); if(low) F.fx(G,'puff',b.x-200,GY-34,{n:2}); else b.mouth=1; b.puff=0.6; }
      return a.t>0.75+seq.length*0.65+0.2;
    },
    rain(b,G,dt,a){
      const dur=[1.6,2.0,2.5][G.diff]; b.mouth=1; b.tilt=Math.sin(a.t*25)*0.03;
      const i=BU.every(a,0.1,[0.17,0.13,0.1][G.diff],40);
      if(i>=0&&a.t<dur){ const p=BU.tgt(G,b.x,b.y); BU.es(G,{k:'pop',x:U.clamp(p.x+U.rnd(-280,280),20,960),y:-30,vx:U.rnd(-20,20),vy:180,ay:520,r:16,spin:3,parry:BU.pinkN(a,5),gnd:'die'});
        if(i%2===0) F.fx(G,'puff',b.x+U.rnd(-40,40),b.y-390,{s:0.5}); }
      return a.t>dur+0.5;
    },
    butter(b,G,dt,a){
      const n=[1,2,3][G.diff], i=BU.every(a,0.3,0.45,n); b.arm=1;
      if(i>=0){ const p=BU.tgt(G,b.x,b.y), x0=b.x-120, y0=b.y-300, tx=U.clamp(p.x+(i-(n-1)/2)*160,60,920), v=BU.lob(x0,y0,tx,GY,1.0,1200);
        BU.es(G,{k:'butter',x:x0,y:y0,vx:v.vx,vy:v.vy,ay:1200,r:18,gnd:'butterLand'}); F.sfx(G,'small'); }
      return a.t>0.3+n*0.45+0.4;
    },
    ring(b,G,dt,a){
      const waves=[2,2,3][G.diff], cnt=[8,10,12][G.diff]; b.tilt=Math.sin(a.t*22)*0.06;
      const i=BU.every(a,0.4,0.55,waves);
      if(i>=0){ for(let k=0;k<cnt;k++){ const an=k/cnt*Math.PI*2+i*0.3; BU.es(G,{k:'kernel',x:b.x,y:b.y-220,vx:Math.cos(an)*300*G.D.spd,vy:Math.sin(an)*300*G.D.spd,r:14,parry:k===Math.floor(cnt/2)&&i===waves-1}); } F.sfx(G,'boom'); b.mouth=1; }
      return a.t>0.4+waves*0.55+0.3;
    },
    hop(b,G,dt,a){ return hopAtk(b,G,a,1); },
    hop3(b,G,dt,a){ return hopAtk(b,G,a,[2,3,3][G.diff]); },
    spit(b,G,dt,a){
      const i=BU.every(a,0.3,0.45,3);
      if(i>=0){ const p=BU.tgt(G,b.x,b.y), base=U.ang(b.x-60,b.y,p.x,p.y-40);
        for(let k=-1;k<=1;k++) BU.es(G,{k:'pop',x:b.x-70,y:b.y,vx:Math.cos(base+k*0.25)*420*G.D.spd,vy:Math.sin(base+k*0.25)*420*G.D.spd,r:18,spin:5,parry:i===2&&k===0});
        b.mouth=1; F.sfx(G,'small'); }
      return a.t>1.7;
    }
  },
  draw(c,b,G){ if(b.mode==='pop') drawPop(c,b,G.t); else { drawCannon(c,b.x-190,GY,b); drawCob(c,b,G.t); } },
  portrait(c,x,y,s,t){ c.save(); c.translate(x,y); c.scale(s,s); drawCob(c,{x:0,y:230,mode:'cob',arm:0,mouth:0,puff:0,tilt:0,trans:0},t||0); c.restore(); }
};

RR.EUPD.butterLand=(e,G)=>{ e.dead=true; BU.es(G,{k:'puddle',x:e.x,y:GY-8,w:130,h:16,life:3.2,keep:true}); F.fx(G,'puff',e.x,GY-10,{n:2,col:'#ffe066'}); F.sfx(G,'land'); };
RR.MUPD.ktroop=(m,G,dt)=>{
  m.hop-=dt; if(m.hop<=0&&m.y>=GY-m.r-1){ m.vy=-560; m.hop=U.rnd(0.9,1.5); }
  m.vy+=1600*dt; m.x+=m.vx*dt; m.y+=m.vy*dt; if(m.y>GY-m.r){ m.y=GY-m.r; m.vy=0; }
};
RR.MDRAW.ktroop=(c,m,G)=>{
  const t=G.t; c.save(); c.translate(m.x,m.y); const step=Math.sin(t*14+m.x*0.1);
  c.beginPath(); c.moveTo(-8,16); c.lineTo(-8+step*6,26); c.moveTo(8,16); c.lineTo(8-step*6,26); c.lineWidth=4; c.strokeStyle=OL; c.stroke();
  c.beginPath(); c.moveTo(0,-30); c.quadraticCurveTo(26,-18,22,8); c.quadraticCurveTo(0,26,-22,8); c.quadraticCurveTo(-26,-18,0,-30); c.fillStyle=m.parry?Art.PINK:'#f2c230'; c.fill(); c.lineWidth=3.5; c.stroke();
  Art.ell(c,0,-24,20,9,'#4f6a2e',3); Art.rrect(c,-24,-22,10,5,2,'#4f6a2e',2);
  Art.eye(c,-10,-4,5,7,-0.8,0,{angry:1}); Art.eye(c,2,-4,5,7,-0.8,0,{angry:-1});
  c.beginPath(); c.moveTo(-14,10); c.lineTo(-2,8); c.lineWidth=3; c.stroke();
  c.restore();
};

function leaf(c,dir,h,spread,col){ c.beginPath(); c.moveTo(dir*10,-10); c.bezierCurveTo(dir*(40*spread),-h*0.4,dir*(70*spread),-h*0.8,dir*(55*spread),-h); c.bezierCurveTo(dir*(30*spread),-h*0.7,dir*20,-h*0.4,dir*-12,-10); c.closePath(); c.fillStyle=col; c.fill(); c.lineWidth=4; c.strokeStyle=OL; c.stroke(); c.beginPath(); c.moveTo(dir*2,-14); c.quadraticCurveTo(dir*40*spread,-h*0.55,dir*50*spread,-h*0.92); c.lineWidth=2; c.stroke(); }
function mustache(c,x,y,s){ c.save(); c.translate(x,y); c.scale(s,s); c.beginPath(); c.moveTo(0,0); c.bezierCurveTo(-20,-16,-50,-14,-62,4); c.bezierCurveTo(-74,22,-90,6,-80,-6); c.bezierCurveTo(-70,8,-56,-2,-52,10); c.bezierCurveTo(-36,22,-12,12,0,6); c.bezierCurveTo(12,12,36,22,52,10); c.bezierCurveTo(56,-2,70,8,80,-6); c.bezierCurveTo(90,6,74,22,62,4); c.bezierCurveTo(50,-14,20,-16,0,0); c.fillStyle='#3a2412'; c.fill(); c.lineWidth=3; c.strokeStyle=OL; c.stroke(); c.restore(); }
function drawCannon(c,x,y,b){ c.save(); c.translate(x,y); Art.circ(c,22,-22,22,'#6b3d1f',4); Art.circ(c,22,-22,6,OL,0); c.save(); c.translate(10,-38); c.rotate(-0.12); Art.rrect(c,-70,-16,96,32,10,'#4a4a52',4); Art.rrect(c,-78,-20,14,40,4,'#5a5a62',4); Art.ell(c,-78,0,5,12,OL,0); c.restore();
  if(b&&b.puff>0){ c.globalAlpha=b.puff; Art.star(c,-75,-50,10+b.puff*8,'#ffcf3a',2,b.puff*8,6); } c.restore(); }
function drawCob(c,b,t){
  const hot=b.mode==='hot', shake=b.trans>0?U.rnd(-4,4):0;
  c.save(); c.translate(b.x+shake,b.y); c.rotate(b.tilt||0);
  const br=Math.sin(t*3)*4, lc=hot?'#7f8a3a':'#5f8a3a';
  leaf(c,-1,190,1.3,lc); leaf(c,1,190,1.3,lc);
  c.save(); c.translate(0,br*0.5);
  // epaulettes + arms (back arm)
  Art.hose(c,62,-205,96,-160,-8,8,'#2b3a67'); Art.glove(c,90,-150,13,-2.2);
  Art.ell(c,0,-215,80,170,hot?'#f29a30':'#f2c230',5);
  c.save(); c.beginPath(); c.ellipse(0,-215,76,166,0,0,Math.PI*2); c.clip();
  for(let r=0;r<16;r++){ const y=-372+r*22; for(let k=-4;k<=4;k++) Art.ell(c,k*20+(r%2)*10,y,9,10,hot?'#e47a1e':'#e2ad22',1.5); }
  c.fillStyle='rgba(255,255,255,0.18)'; c.fillRect(-60,-370,24,330); c.restore();
  if(hot){ for(let i=0;i<3;i++){ const k=(t*0.8+i/3)%1; c.globalAlpha=1-k; c.beginPath(); c.moveTo(-40+i*40,-380-k*60); c.quadraticCurveTo(-30+i*40,-400-k*60,-40+i*40,-420-k*60); c.lineWidth=3; c.strokeStyle='#fff'; c.stroke(); } c.globalAlpha=1;
    for(let i=0;i<3;i++){ const an=t*3+i*2.1; const pc={k:'pop',x:Math.cos(an)*60,y:-400+Math.sin(an*1.3)*14,r:12,a:an}; Art.ebullet(c,pc,t); } }
  // eyes / face
  const lk=-0.8;
  Art.eye(c,-32,-282,18,24,lk,0.2,{angry:1}); Art.eye(c,14,-282,18,24,lk,0.2,{angry:-1});
  if(b.puff>0){ Art.circ(c,-62,-232,14+b.puff*10,'#ff9a7a',3); }
  Art.circ(c,-12,-246,13,hot?'#ff7a5a':'#f0884a',3);
  const mo=b.mouth||0; if(mo>0.05){ Art.ell(c,-10,-208,24,6+16*mo,'#5a1010',3); c.fillStyle='#fffaf0'; c.fillRect(-26,-208-6-16*mo+3,32,6); }
  mustache(c,-10,-228,1);
  // cap
  c.save(); c.translate(0,-376); c.rotate(-0.12);
  Art.rrect(c,-56,-62,112,64,12,'#2b3a67',4); c.fillStyle='#e2b23a'; c.fillRect(-54,-18,108,12); c.strokeStyle=OL; c.lineWidth=2; c.strokeRect(-54,-18,108,12);
  Art.star(c,0,-38,13,'#e2b23a',2.5); Art.ell(c,-34,4,52,10,'#151515',3);
  c.restore();
  // front arm
  const ay=-250-(b.arm||0)*60; Art.ell(c,-66,-202,18,9,'#e2b23a',3); Art.ell(c,66,-202,18,9,'#e2b23a',3);
  Art.hose(c,-64,-200,-122,ay,10,8,'#2b3a67'); Art.glove(c,-126,ay,14,0.4+Math.sin(t*6)*0.1);
  c.restore();
  leaf(c,-1,110,1.7,lc); leaf(c,1,110,1.7,lc);
  c.restore();
}
function drawPop(c,b,t){
  c.save(); c.translate(b.x,b.y+(b.trans>0?U.rnd(-3,3):0));
  const sq=b.sq||0, sy=b.air?1+U.clamp(-b.vy/4000,-0.1,0.15):1-sq*0.25; c.scale(2-sy,sy); c.rotate((b.vx||0)*0.0003);
  const blobs=[[0,0,82],[-62,-28,52],[58,-34,56],[-52,42,54],[52,42,56],[0,-70,52],[0,64,50],[-82,8,40],[84,10,40]];
  blobs.forEach(o=>{ c.beginPath(); c.arc(o[0],o[1],o[2],0,6.283); c.lineWidth=10; c.strokeStyle=OL; c.stroke(); });
  blobs.forEach((o,i)=>{ c.beginPath(); c.arc(o[0],o[1],o[2],0,6.283); c.fillStyle=i%2?'#fff1cc':'#fff8e4'; c.fill(); });
  Art.ell(c,24,74,26,14,'#e2a032',3);
  Art.eye(c,-30,-18,18,22,-0.8,0.3,{angry:1}); Art.eye(c,14,-18,18,22,-0.8,0.3,{angry:-1});
  const mo=Math.max(b.mouth||0,b.air?0.6:0.2); Art.ell(c,-8,32,26,6+18*mo,'#5a1010',3);
  mustache(c,-8,14,0.8);
  c.save(); c.translate(6,-108); c.rotate(-0.25); Art.rrect(c,-46,-46,92,50,10,'#2b3a67',4); c.fillStyle='#e2b23a'; c.fillRect(-44,-12,88,10); Art.star(c,0,-28,11,'#e2b23a',2.5); Art.ell(c,-28,4,42,8,'#151515',3); c.restore();
  c.restore();
  if(!b.air){ c.save(); c.globalAlpha=0.25; Art.ell(c,b.x,GY+4,110,12,'#000',0); c.restore(); }
  else { c.save(); c.globalAlpha=0.25; Art.ell(c,b.x,GY+4,80,10,'#000',0); c.restore(); }
}
})();
