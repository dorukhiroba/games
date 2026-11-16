/* Plane boss 1 — Bulut Baronu: a grumpy storm cloud (rain, gusts, lightning, vortex) */
(function(){
'use strict';
const U=RR.U, Art=RR.Art, OL=Art.OL, BU=RR.BU, F=RR.Fight, W=RR.W, H=RR.H;
const B = RR.BOSS.cloud = {
  id:'cloud', name:'Bulut Baronu', title:'Fırtınanın Efendisi', plane:true, hp:3000, bg:'sky', music:'cloud', par:110,
  phases:[0.66,0.33], plats:[], introTxt:'KANATLAR HAZIR!', goTxt:'UÇUŞ!',
  quotes:['Gökyüzü benim, bulut beyin de!','Şemsiyeni unuttun galiba, ufaklık!','Bir dahaki sefere rüzgârı arkana al!'],
  cool:[1.0,0.85,0.65],
  pattern:[['rain','puffs','blow'],['bolt','hail','puffs'],['spiral','suck','bolt']],
  init(b){ Object.assign(b,{x:1030,y:300,by:300,cheek:0,mouth:0,spin:0,suck:0}); },
  hurt(b){ return [{x:b.x-150,y:b.y-110,w:300,h:220}]; },
  body(b){ return [{x:b.x-120,y:b.y-80,w:240,h:160}]; },
  onPhase(b,G){ F.fx(G,'puff',b.x,b.y,{n:10,s:2,col:b.phase===1?'#9a9ab0':'#6a6a88'}); if(b.phase===2) F.shake(G,16); },
  update(b,G,dt){
    b.cheek=Math.max(0,b.cheek-dt*2); b.mouth=Math.max(0,b.mouth-dt*2); b.spin+=dt*(b.phase===2?4:1); b.suck=Math.max(0,b.suck-dt);
    b.y=b.by+Math.sin(b.t*1.2)*(b.phase===2?120:50); b.x=1030+Math.sin(b.t*0.5)*30;
    if(b.suck>0) G.players.forEach(p=>{ if(!p.dead) p.x=Math.min(W-50,p.x+150*dt); });
    if(b.phase>=1&&Math.random()<dt*2) F.fx(G,'spark',b.x+U.rnd(-120,120),b.y+U.rnd(-60,60),{n:2,col:'#ffe46b'});
    BU.run(b,G,dt,B);
  },
  atk:{
    rain(b,G,dt,a){
      const dur=[1.8,2.2,2.6][G.diff], i=BU.every(a,0.2,[0.14,0.1,0.08][G.diff],60);
      if(i>=0&&a.t<dur){ BU.es(G,{k:'drop',x:U.rnd(80,W-200),y:-20,vx:-130,vy:430*G.D.spd,r:12,parry:BU.pinkN(a,7)}); }
      b.mouth=0.4; return a.t>dur+0.4;
    },
    puffs(b,G,dt,a){
      const n=[3,4,5][G.diff], i=BU.every(a,0.2,0.4,n);
      if(i>=0){ BU.mn(G,{k:'cloudlet',x:b.x-120,y:b.y+U.rnd(-80,80),vx:-200*G.D.spd,vy:0,r:26,hp:10,col:'#f0f0f6',parry:i===n-1,ph:Math.random()*6}); F.sfx(G,'small'); }
      return a.t>0.2+n*0.4+0.3;
    },
    blow(b,G,dt,a){
      b.cheek=Math.min(1,a.t/0.6); if(BU.cross(a,0)) F.sfx(G,'tele');
      const n=[3,4,5][G.diff], i=BU.every(a,0.7,0.28,n);
      if(i>=0){ const p=BU.tgt(G,b.x,b.y), an=U.ang(b.x-140,b.y+10,p.x,p.y)+U.rnd(-0.12,0.12); BU.es(G,{k:'gust',x:b.x-140,y:b.y+10,vx:Math.cos(an)*480*G.D.spd,vy:Math.sin(an)*480*G.D.spd,r:30,parry:i===n-1}); F.sfx(G,'dash'); b.cheek=0.3; }
      return a.t>0.7+n*0.28+0.3;
    },
    bolt(b,G,dt,a){
      const n=b.phase===2?[2,3,3][G.diff]:[2,3,4][G.diff], i=BU.every(a,0.1,0.6,n);
      a.q=a.q||[];
      if(i>=0){ const p=BU.tgt(G,b.x,b.y), x=U.clamp(p.x+U.rnd(-30,30),40,W-260); a.q.push({x,at:a.t+0.7}); BU.es(G,{k:'tele',x,y:H/2,w:64,h:H,harmless:true,life:0.7}); F.sfx(G,'tele'); }
      a.q.forEach(q=>{ if(!q.done&&a.t>=q.at){ q.done=true; BU.es(G,{k:'zap',x:q.x,y:H/2,w:56,h:H,life:0.35,keep:true,pierce:true}); F.sfx(G,'boom'); F.shake(G,8); } });
      return a.t>0.1+n*0.6+1.2;
    },
    hail(b,G,dt,a){
      const waves=[2,2,3][G.diff], cnt=[8,10,12][G.diff], i=BU.every(a,0.3,0.6,waves); b.mouth=1;
      if(i>=0){ for(let k=0;k<cnt;k++){ const an=Math.PI*0.5+k/(cnt-1)*Math.PI+i*0.15; BU.es(G,{k:'ball',x:b.x-60,y:b.y,vx:Math.cos(an)*300*G.D.spd,vy:Math.sin(an)*300*G.D.spd,r:13,parry:k===Math.floor(cnt/2)&&i===waves-1}); } F.sfx(G,'small'); }
      return a.t>0.3+waves*0.6+0.3;
    },
    spiral(b,G,dt,a){
      const dur=[2.0,2.5,3.0][G.diff], i=BU.every(a,0.1,[0.1,0.08,0.065][G.diff],60); b.mouth=1;
      if(i>=0&&a.t<dur){ a.ang=(a.ang||0)+0.5; BU.es(G,{k:'drop',x:b.x,y:b.y,vx:Math.cos(a.ang)*250*G.D.spd,vy:Math.sin(a.ang)*250*G.D.spd,r:12,parry:BU.pinkN(a,8)}); }
      return a.t>dur+0.4;
    },
    suck(b,G,dt,a){
      const dur=[2.2,2.6,3.0][G.diff]; if(a.t<dur){ b.suck=0.1; b.mouth=1; }
      if(BU.cross(a,0)) F.sfx(G,'whistle');
      const i=BU.every(a,0.3,[0.3,0.24,0.18][G.diff],20);
      if(i>=0&&a.t<dur){ BU.es(G,{k:'frag',x:-20,y:U.rnd(60,H-60),vx:420*G.D.spd,vy:U.rnd(-30,30),r:14,spin:8,parry:BU.pinkN(a,5)}); }
      return a.t>dur+0.5;
    }
  },
  draw(c,b,G){ drawCloud(c,b,G.t); },
  portrait(c,x,y,s,t){ c.save(); c.translate(x,y); c.scale(s,s); drawCloud(c,{x:0,y:0,phase:0,cheek:0,mouth:0,spin:t||0,trans:0},t||0); c.restore(); }
};
RR.MUPD.cloudlet=(m,G,dt)=>{ m.x+=m.vx*dt; m.y+=Math.sin(m.t*3+m.ph)*120*dt; };
RR.MDRAW.cloudlet=(c,m,G)=>{ c.save(); c.translate(m.x,m.y); const col=m.parry?Art.PINK:'#f0f0f6';
  [[-14,4,16],[0,-8,18],[14,4,15]].forEach(o=>{ c.beginPath(); c.arc(o[0],o[1],o[2],0,6.283); c.lineWidth=7; c.strokeStyle=OL; c.stroke(); });
  [[-14,4,16],[0,-8,18],[14,4,15]].forEach(o=>Art.circ(c,o[0],o[1],o[2],col,0));
  Art.eye(c,-7,-2,5,7,-0.8,0,{angry:1}); Art.eye(c,6,-2,5,7,-0.8,0,{angry:-1}); c.restore(); };
Art.EB.drop=(c,e,t)=>{ c.save(); c.translate(e.x,e.y); c.rotate(Math.atan2(e.vy,e.vx)-Math.PI/2); c.beginPath(); c.moveTo(0,e.r*1.6); c.quadraticCurveTo(e.r*1.1,-e.r*0.2,0,-e.r); c.quadraticCurveTo(-e.r*1.1,-e.r*0.2,0,e.r*1.6); c.fillStyle=e.parry?Art.PINK:'#7ab8e8'; c.fill(); c.lineWidth=3; c.strokeStyle=OL; c.stroke(); Art.ell(c,-e.r*0.3,-e.r*0.1,e.r*0.25,e.r*0.4,'rgba(255,255,255,0.7)',0); c.restore(); };
Art.EB.gust=(c,e,t)=>{ c.save(); c.translate(e.x,e.y); c.rotate(-t*10); c.beginPath(); for(let i=0;i<40;i++){ const a=i*0.35, r=e.r*i/40; c.lineTo(Math.cos(a)*r,Math.sin(a)*r); } c.lineWidth=9; c.strokeStyle=OL; c.stroke(); c.lineWidth=5; c.strokeStyle=e.parry?Art.PINK:'#f6f6ff'; c.stroke(); c.restore(); };
Art.EB.zap=(c,e,t)=>{ c.save(); const x=e.x, top=e.y-e.h/2; c.beginPath(); c.moveTo(x,top); for(let y=top;y<top+e.h;y+=40) c.lineTo(x+(Math.floor(y/40+t*30)%2?-e.w/2:e.w/2),y+20); c.lineTo(x,top+e.h);
  c.lineWidth=e.w*0.55+8; c.strokeStyle=OL; c.lineJoin='round'; c.stroke(); c.lineWidth=e.w*0.55; c.strokeStyle='#ffe46b'; c.stroke(); c.lineWidth=e.w*0.2; c.strokeStyle='#fffbe0'; c.stroke(); c.restore(); };

function drawCloud(c,b,t){
  const ph=b.phase||0, col=['#eeeef6','#a0a0b8','#6c6c8c'][ph], sh=b.trans>0?U.rnd(-5,5):0;
  c.save(); c.translate(b.x+sh,b.y);
  if(ph===2){ c.save(); c.rotate(b.spin); c.globalAlpha=0.4; for(let i=0;i<3;i++){ c.beginPath(); c.arc(0,0,200-i*30,i,i+3.5); c.lineWidth=10; c.strokeStyle='#4a4a68'; c.stroke(); } c.restore(); }
  const bl=[[0,0,110],[-110,20,70],[110,24,72],[-60,-70,72],[60,-74,76],[-150,-20,50],[150,-16,52],[0,80,70],[-90,70,56],[90,72,56]];
  bl.forEach(o=>{ c.beginPath(); c.arc(o[0],o[1]+Math.sin(t*2+o[0])*3,o[2],0,6.283); c.lineWidth=12; c.strokeStyle=OL; c.stroke(); });
  bl.forEach((o,i)=>{ c.beginPath(); c.arc(o[0],o[1]+Math.sin(t*2+o[0])*3,o[2],0,6.283); c.fillStyle=i%2?col:shade(col); c.fill(); });
  if(ph>=1){ for(let i=0;i<2;i++){ const x=-60+i*120; c.beginPath(); c.moveTo(x,90); c.lineTo(x-14,130); c.lineTo(x+4,128); c.lineTo(x-10,170); c.lineWidth=7; c.strokeStyle=OL; c.stroke(); c.lineWidth=3; c.strokeStyle='#ffe46b'; c.stroke(); } }
  const ck=b.cheek||0;
  if(ck>0){ Art.circ(c,-110,30,26+ck*22,'#f0c0c8',4); }
  Art.eye(c,-64,-20,26,32,-0.8,0.2,{angry:1}); Art.eye(c,4,-20,24,30,-0.8,0.2,{angry:-1});
  c.beginPath(); c.moveTo(-100,-62); c.quadraticCurveTo(-64,-90,-36,-60); c.moveTo(-24,-60); c.quadraticCurveTo(6,-92,36,-62); c.lineWidth=10; c.strokeStyle=ph?'#3a3a50':'#7a7a90'; c.stroke();
  Art.ell(c,-34,22,16,13,shade(col),4);
  const mo=Math.max(b.mouth||0,ck*0.6);
  if(ck>0.3){ Art.ell(c,-80,52,10,8,'#3a1a20',4); }
  else if(mo>0.1){ Art.ell(c,-30,60,40,10+mo*22,'#3a1a20',4); c.fillStyle='#fffaf0'; c.fillRect(-56,52-mo*18,52,7); }
  else { c.beginPath(); c.moveTo(-70,62); c.quadraticCurveTo(-30,48,10,64); c.lineWidth=5; c.strokeStyle=OL; c.stroke(); }
  // little aviator cap
  c.save(); c.translate(10,-140); c.rotate(0.1); Art.ell(c,0,0,64,30,'#7a4a2a',4); Art.rrect(c,-60,6,120,14,6,'#5a3018',3); Art.circ(c,-30,-6,14,'#9ad8ff',3); Art.circ(c,6,-8,14,'#9ad8ff',3); c.restore();
  c.restore();
}
function shade(h){ const n=parseInt(h.slice(1),16), r=(n>>16)-18, g=((n>>8)&255)-18, b=(n&255)-14; return 'rgb('+Math.max(0,r)+','+Math.max(0,g)+','+Math.max(0,b)+')'; }
})();
