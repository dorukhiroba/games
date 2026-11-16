/* Plane boss 2 — Kaptan Kâğıt: an origami admiral (paper plane -> newspaper -> crumpled ball) */
(function(){
'use strict';
const U=RR.U, Art=RR.Art, OL=Art.OL, BU=RR.BU, F=RR.Fight, W=RR.W, H=RR.H;
const WORDS=['BUM','PAT','ÇAT','VIZ','HOP'];
const B = RR.BOSS.paper = {
  id:'paper', name:'Kaptan Kâğıt', title:'Origami Filosunun Amirali', plane:true, hp:3300, bg:'sky2', music:'paper', par:120,
  phases:[0.66,0.33], plats:[], introTxt:'KANATLAR HAZIR!', goTxt:'UÇUŞ!',
  quotes:['Seni katlayıp cebime koyarım!','Yarınki gazetede manşet sensin: YENİLDİ!','Kâğıttan kaplan değilim, kâğıttan kaptanım!'],
  cool:[0.95,0.85,0.6],
  pattern:[['darts','cranes','ink'],['headline','pages','darts'],['scraps','charge','darts']],
  init(b){ Object.assign(b,{x:1020,y:320,mode:'plane',mouth:0,wob:0,vx:-240,vy:180,dash:0}); },
  hurt(b){ return b.mode==='ball'?[{x:b.x-92,y:b.y-92,w:184,h:184}]:b.mode==='paper'?[{x:b.x-130,y:b.y-170,w:260,h:340}]:[{x:b.x-165,y:b.y-70,w:310,h:140}]; },
  body(b){ return b.mode==='ball'?[{x:b.x-80,y:b.y-80,w:160,h:160}]:b.mode==='paper'?[{x:b.x-110,y:b.y-150,w:220,h:300}]:[{x:b.x-120,y:b.y-50,w:260,h:100}]; },
  onPhase(b,G){ F.fx(G,'debris',b.x,b.y,{n:12,col:'#f3ead8',sp:600}); F.sfx(G,'dash'); if(b.phase===1){ b.mode='paper'; } else { b.mode='ball'; b.vx=-260; b.vy=200; } },
  update(b,G,dt){
    b.mouth=Math.max(0,b.mouth-dt*2); b.wob+=dt;
    if(b.mode==='ball'){
      if(b.dash>0){ b.dash-=dt; }
      else { const sp=260*G.D.spd, l=Math.hypot(b.vx,b.vy)||1; b.vx=b.vx/l*sp; b.vy=b.vy/l*sp; }
      b.x+=b.vx*dt; b.y+=b.vy*dt;
      if(b.x<380&&b.vx<0){ b.vx=Math.abs(b.vx); } if(b.x>W-100&&b.vx>0){ b.vx=-Math.abs(b.vx); }
      if(b.y<100&&b.vy<0){ b.vy=Math.abs(b.vy); } if(b.y>H-100&&b.vy>0){ b.vy=-Math.abs(b.vy); }
      if(b.dash>0&&(b.x<=380||b.x>=W-100)) b.dash=0;
    } else { b.y=320+Math.sin(b.t*0.9)*(b.mode==='paper'?60:110); b.x=1020+Math.sin(b.t*0.6)*20; }
    BU.run(b,G,dt,B);
  },
  atk:{
    darts(b,G,dt,a){
      const n=[3,4,5][G.diff]+(b.phase>0?1:0), i=BU.every(a,0.25,b.phase>0?0.28:0.36,n); b.mouth=0.5;
      if(i>=0){ const x0=b.mode==='plane'?b.x-160:b.x-80, p=BU.tgt(G,x0,b.y), an=U.ang(x0,b.y,p.x,p.y);
        BU.es(G,{k:'dart',x:x0,y:b.y,vx:Math.cos(an)*540*G.D.spd,vy:Math.sin(an)*540*G.D.spd,r:16,parry:BU.pinkN(a,4)}); F.sfx(G,'dash'); }
      return a.t>0.25+n*0.36+0.3;
    },
    cranes(b,G,dt,a){
      const n=[2,3,4][G.diff], i=BU.every(a,0.2,0.45,n);
      if(i>=0){ BU.mn(G,{k:'crane',x:b.x-60,y:b.y+(i%2?-90:90),vx:-260*G.D.spd,vy:(i%2?1:-1)*120,r:24,hp:12,col:'#f3ead8',parry:i===n-1}); F.sfx(G,'bounce'); }
      return a.t>0.2+n*0.45+0.4;
    },
    ink(b,G,dt,a){
      const waves=[2,2,3][G.diff], cnt=[4,5,6][G.diff], i=BU.every(a,0.35,0.55,waves); b.mouth=1;
      if(i>=0){ const x0=b.x-120, p=BU.tgt(G,x0,b.y), base=U.ang(x0,b.y,p.x,p.y);
        for(let k=0;k<cnt;k++){ const an=base+(k-(cnt-1)/2)*0.22; BU.es(G,{k:'blot',x:x0,y:b.y,vx:Math.cos(an)*320*G.D.spd,vy:Math.sin(an)*320*G.D.spd,r:17,parry:i===waves-1&&k===0}); } F.sfx(G,'small'); }
      return a.t>0.35+waves*0.55+0.3;
    },
    headline(b,G,dt,a){
      if(!a.w) a.w=U.pick(WORDS); const w=a.w, n=w.length*[1,2,2][G.diff];
      const i=BU.every(a,0.3,0.22,n); b.mouth=1;
      if(i>=0){ const ch=w[i%w.length]; BU.es(G,{k:'letter',ch,x:b.x-120,y:b.y-80+(i%w.length)*80,vx:-380*G.D.spd,vy:0,r:26,wave:40,wf:3,wp:i,parry:i===n-1}); F.sfx(G,'move'); }
      return a.t>0.3+n*0.22+0.4;
    },
    pages(b,G,dt,a){
      const n=[4,6,8][G.diff], i=BU.every(a,0.2,0.3,n);
      if(i>=0){ BU.es(G,{k:'page',x:U.rnd(120,W-260),y:-30,vx:-50,vy:170*G.D.spd,r:22,upd:'flutter',parry:BU.pinkN(a,5)}); }
      return a.t>0.2+n*0.3+0.5;
    },
    scraps(b,G,dt,a){
      const waves=[2,2,3][G.diff], cnt=[8,10,12][G.diff], i=BU.every(a,0.2,0.6,waves);
      if(i>=0){ for(let k=0;k<cnt;k++){ const an=k/cnt*Math.PI*2+i*0.25; BU.es(G,{k:'frag',x:b.x,y:b.y,vx:Math.cos(an)*280*G.D.spd,vy:Math.sin(an)*280*G.D.spd,r:12,spin:9,parry:k===0&&i===waves-1}); } F.sfx(G,'small'); }
      return a.t>0.2+waves*0.6+0.3;
    },
    charge(b,G,dt,a){
      if(BU.cross(a,0)) F.sfx(G,'tele');
      if(a.t<0.6){ b.vx*=0.9; b.vy*=0.9; b.x+=U.rnd(-3,3); }
      if(BU.cross(a,0.6)){ const p=BU.tgt(G,b.x,b.y), an=U.ang(b.x,b.y,p.x,p.y), sp=900*G.D.spd; b.vx=Math.cos(an)*sp; b.vy=Math.sin(an)*sp; b.dash=0.7; F.sfx(G,'dash'); F.shake(G,6); }
      return a.t>1.5;
    }
  },
  draw(c,b,G){ drawPaper(c,b,G.t); },
  portrait(c,x,y,s,t){ c.save(); c.translate(x,y); c.scale(s,s); drawPaper(c,{x:0,y:0,mode:'plane',mouth:0,wob:t||0,trans:0},t||0); c.restore(); }
};
RR.EUPD.flutter=(e,G,dt)=>{ e.x+=Math.sin(e.t*4)*140*dt; e.a=Math.sin(e.t*4)*0.6; };
RR.MUPD.crane=(m,G,dt)=>{ if(m.t>1.2){ const p=BU.tgt(G,m.x,m.y), an=U.ang(m.x,m.y,p.x,p.y); m.vx=U.lerp(m.vx,Math.cos(an)*230,0.03); m.vy=U.lerp(m.vy,Math.sin(an)*230,0.03); } else m.vy*=0.98; m.x+=m.vx*dt; m.y+=m.vy*dt; };
RR.MDRAW.crane=(c,m,G)=>{ const t=G.t, col=m.parry?Art.PINK:'#f3ead8'; c.save(); c.translate(m.x,m.y); c.scale(m.vx<0?1:-1,1); const f=Math.sin(t*12)*14;
  c.beginPath(); c.moveTo(-28,0); c.lineTo(0,-6); c.lineTo(26,4); c.lineTo(0,10); c.closePath(); c.fillStyle=col; c.fill(); c.lineWidth=3; c.strokeStyle=OL; c.stroke();
  c.beginPath(); c.moveTo(-4,-2); c.lineTo(10,-26-f); c.lineTo(16,0); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-28,0); c.lineTo(-38,-18); c.lineTo(-30,-2); c.fill(); c.stroke();
  Art.circ(c,-30,-12,2.5,OL,0); c.restore(); };
Art.EB.dart=(c,e)=>{ c.save(); c.translate(e.x,e.y); c.rotate(Math.atan2(e.vy,e.vx)); const r=e.r; c.beginPath(); c.moveTo(r*1.4,0); c.lineTo(-r,-r*0.8); c.lineTo(-r*0.5,0); c.lineTo(-r,r*0.8); c.closePath(); c.fillStyle=e.parry?Art.PINK:'#f3ead8'; c.fill(); c.lineWidth=3; c.strokeStyle=OL; c.stroke(); c.beginPath(); c.moveTo(r*1.4,0); c.lineTo(-r*0.5,0); c.lineWidth=2; c.stroke(); c.restore(); };
Art.EB.blot=(c,e,t)=>{ c.save(); c.translate(e.x,e.y); c.rotate(t*3); c.beginPath(); for(let i=0;i<10;i++){ const an=i/10*6.283, rr=e.r*(i%2?0.75:1.05); c.lineTo(Math.cos(an)*rr,Math.sin(an)*rr); } c.closePath(); c.fillStyle=e.parry?Art.PINK:'#1b1450'; c.fill(); c.lineWidth=3; c.strokeStyle=OL; c.stroke(); c.restore(); };
Art.EB.letter=(c,e)=>{ c.save(); c.translate(e.x,e.y); Art.rrect(c,-e.r,-e.r,e.r*2,e.r*2,6,e.parry?Art.PINK:'#f3ead8',3.5); Art.text(c,e.ch,0,3,e.r*1.4,{title:true,color:'#2a1d14'}); c.restore(); };
Art.EB.page=(c,e)=>{ c.save(); c.translate(e.x,e.y); c.rotate(e.a||0); Art.rrect(c,-e.r,-e.r*1.25,e.r*2,e.r*2.5,2,e.parry?Art.PINK:'#f3ead8',3); c.fillStyle='rgba(40,30,20,0.45)'; for(let k=0;k<5;k++) c.fillRect(-e.r*0.7,-e.r*0.9+k*e.r*0.42,e.r*1.4-(k%2)*e.r*0.5,3); c.restore(); };

function drawPaper(c,b,t){
  const sh=b.trans>0?U.rnd(-5,5):0; c.save(); c.translate(b.x+sh,b.y);
  const lines=(x0,y0,w,n,gap)=>{ c.fillStyle='rgba(40,30,20,0.35)'; for(let k=0;k<n;k++) c.fillRect(x0,y0+k*gap,w-((k*37)%3)*14,3); };
  if(b.mode==='ball'){
    c.rotate(t*2); c.beginPath(); for(let i=0;i<14;i++){ const an=i/14*6.283, rr=95*(0.86+((i*7)%4)/18); c.lineTo(Math.cos(an)*rr,Math.sin(an)*rr); } c.closePath(); c.fillStyle='#ece2cc'; c.fill(); c.lineWidth=6; c.strokeStyle=OL; c.stroke();
    c.beginPath(); for(let i=0;i<7;i++){ const an=i*0.9; c.moveTo(Math.cos(an)*20,Math.sin(an)*20); c.lineTo(Math.cos(an+0.4)*80,Math.sin(an+0.4)*80); } c.lineWidth=2; c.strokeStyle='rgba(40,30,20,0.5)'; c.stroke();
    c.rotate(-t*2); Art.eye(c,-30,-14,18,22,-0.8,0,{angry:1}); Art.eye(c,22,-14,16,20,-0.8,0,{angry:-1}); Art.ell(c,-4,34,24,8+((b.mouth||0)*12),'#3a1a20',4);
  } else if(b.mode==='paper'){
    c.rotate(Math.sin(b.wob*2)*0.04);
    c.beginPath(); c.moveTo(-130,-170); for(let x=-130;x<=130;x+=26) c.lineTo(x,-170+Math.sin(x*0.05+t*6)*6); c.lineTo(130,170); for(let x=130;x>=-130;x-=26) c.lineTo(x,170+Math.sin(x*0.05+t*6+1)*6); c.closePath(); c.fillStyle='#f3ead8'; c.fill(); c.lineWidth=6; c.strokeStyle=OL; c.stroke();
    Art.text(c,'SON DAKİKA!',0,-136,32,{title:true}); c.fillStyle=OL; c.fillRect(-116,-112,232,4);
    lines(-112,-96,100,4,14); lines(14,-96,100,4,14); lines(-112,100,224,4,14);
    Art.eye(c,-46,-10,24,30,-0.8,0.2,{angry:1}); Art.eye(c,30,-10,22,28,-0.8,0.2,{angry:-1});
    const mo=b.mouth||0; Art.ell(c,-6,56,36,8+mo*18,'#3a1a20',4);
    c.save(); c.translate(0,-196); bicorne(c); c.restore();
  } else {
    const f=Math.sin(t*3)*4;
    c.beginPath(); c.moveTo(-170,0); c.lineTo(150,-74+f); c.lineTo(120,0); c.lineTo(150,64-f); c.closePath(); c.fillStyle='#f3ead8'; c.fill(); c.lineWidth=6; c.strokeStyle=OL; c.stroke();
    c.beginPath(); c.moveTo(-170,0); c.lineTo(150,24); c.lineTo(110,62); c.closePath(); c.fillStyle='#ddd2ba'; c.fill(); c.lineWidth=4; c.stroke();
    c.save(); c.beginPath(); c.moveTo(-170,0); c.lineTo(150,-74+f); c.lineTo(120,0); c.closePath(); c.clip(); lines(-40,-44,170,6,12); c.restore();
    c.beginPath(); c.moveTo(-170,0); c.lineTo(120,0); c.lineWidth=3; c.stroke();
    Art.eye(c,-46,-22,16,20,-0.8,0.2,{angry:1}); Art.eye(c,-6,-26,15,19,-0.8,0.2,{angry:-1});
    c.beginPath(); c.moveTo(-60,6); c.bezierCurveTo(-40,-6,-20,-6,-10,6); c.bezierCurveTo(0,-6,20,-6,30,6); c.lineWidth=6; c.stroke();
    const mo=b.mouth||0; if(mo>0.1) Art.ell(c,-20,22,16,4+mo*10,'#3a1a20',3);
    c.save(); c.translate(40,-70+f*0.5); c.rotate(-0.15); bicorne(c); c.restore();
  }
  c.restore();
}
function bicorne(c){ c.beginPath(); c.moveTo(-80,10); c.quadraticCurveTo(0,-70,80,10); c.quadraticCurveTo(0,-6,-80,10); c.fillStyle='#1d2a4a'; c.fill(); c.lineWidth=4; c.strokeStyle=OL; c.stroke(); c.beginPath(); c.moveTo(-70,6); c.quadraticCurveTo(0,-14,70,6); c.lineWidth=4; c.strokeStyle='#e2b23a'; c.stroke(); Art.circ(c,0,-18,9,'#d8343a',3); }
})();
