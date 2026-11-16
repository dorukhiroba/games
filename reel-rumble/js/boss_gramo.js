/* Boss 2 — Madam Gramofon: a diva gramophone (notes, records, sonic blasts) */
(function(){
'use strict';
const U=RR.U, Art=RR.Art, OL=Art.OL, GY=RR.GROUND, BU=RR.BU, F=RR.Fight;
const mouth=b=>({x:b.x-170,y:b.y-318});

const B = RR.BOSS.gramo = {
  id:'gramo', name:'Madam Gramofon', title:'Balo Salonunun Divası', hp:3600, bg:'ballroom', music:'gramo', par:120,
  phases:[0.66,0.33], plats:[{x:200,y:450,w:170},{x:500,y:405,w:170}],
  quotes:['Yüksek notalara dayanamadın, şekerim!','Sahnede tek yıldız benim!','Biraz daha prova et, tatlım.'],
  cool:[1.0,0.85,0.65],
  pattern:[['notes','records','aria'],['blast','dancers','notes2'],['spiral','fall','records']],
  init(b){ Object.assign(b,{x:1090,y:GY,sing:0,mood:0,spin:0,lean:0}); },
  hurt(b){ const m=mouth(b); return [{x:m.x-80,y:m.y-140,w:160,h:280},{x:b.x-120,y:b.y-150,w:240,h:150}]; },
  body(b){ return [{x:b.x-110,y:b.y-140,w:220,h:140}]; },
  onPhase(b,G){ b.mood=b.phase; F.fx(G,'conf',mouth(b).x,mouth(b).y,{n:16,col:'#e2b23a'}); },
  update(b,G,dt){ b.sing=Math.max(0,b.sing-dt*2); b.spin+=dt*(3+b.phase*3); b.lean*=0.92; BU.run(b,G,dt,B); },
  atk:{
    notes(b,G,dt,a){
      const n=[4,5,7][G.diff], m=mouth(b), i=BU.every(a,0.25,0.28,n); b.sing=Math.max(b.sing,0.5);
      if(i>=0){ BU.es(G,{k:'note',x:m.x-20,y:m.y+10,vx:-330*G.D.spd,vy:0,r:17,wave:70,wf:4,wp:i*0.9,parry:BU.pinkN(a,3)}); F.sfx(G,'move'); }
      return a.t>0.25+n*0.28+0.3;
    },
    records(b,G,dt,a){
      const n=[2,2,3][G.diff], i=BU.every(a,0.3,0.6,n); b.lean=-0.05;
      if(i>=0){ const p=BU.tgt(G,b.x,b.y);
        if(i%2===0) BU.es(G,{k:'record',x:b.x-130,y:GY-28,vx:-560*G.D.spd,vy:0,r:28,spin:-12,gnd:'roll'});
        else BU.es(G,{k:'record',x:b.x-130,y:Math.min(GY-90,p.y-60),vx:-760*G.D.spd,ax:640*G.D.spd,vy:0,r:28,spin:-14,life:4});
        F.sfx(G,'dash'); }
      return a.t>0.3+n*0.6+0.4;
    },
    aria(b,G,dt,a){
      const m=mouth(b); if(BU.cross(a,0)) F.sfx(G,'sing'); b.sing=1;
      const waves=[2,3,3][G.diff], cnt=[4,5,6][G.diff], i=BU.every(a,0.7,0.45,waves);
      if(i>=0){ const p=BU.tgt(G,m.x,m.y), base=U.ang(m.x,m.y,p.x,p.y-40);
        for(let k=0;k<cnt;k++){ const an=base+(k-(cnt-1)/2)*0.2+(i%2)*0.1; BU.es(G,{k:'note',x:m.x,y:m.y,vx:Math.cos(an)*380*G.D.spd,vy:Math.sin(an)*380*G.D.spd,r:16,parry:k===Math.floor(cnt/2)&&i===waves-1}); } }
      return a.t>0.7+waves*0.45+0.3;
    },
    blast(b,G,dt,a){
      const n=[1,2,2][G.diff];
      if(a.lane==null) a.lane=Math.random()<0.5?0:1;
      const lanes=[{y:GY-55,h:110},{y:340,h:130}];
      const i=BU.every(a,0,1.9,n);
      if(i>=0){ const L=lanes[(a.lane+i)%2]; BU.es(G,{k:'tele',x:430,y:L.y,w:860,h:L.h,harmless:true,life:0.9,keep:true}); a.cur=L; a.fire=a.t+0.9; F.sfx(G,'tele'); }
      if(a.fire!=null&&a.t>=a.fire){ const L=a.cur; BU.es(G,{k:'wave',x:430,y:L.y,w:860,h:L.h,life:0.75,keep:true,pierce:true}); a.fire=null; b.sing=1; F.sfx(G,'sing'); F.shake(G,8); }
      return a.t>(n-1)*1.9+0.9+0.9;
    },
    dancers(b,G,dt,a){
      const n=[2,3,3][G.diff], i=BU.every(a,0.2,0.5,n); b.sing=0.6;
      if(i>=0){ const m=mouth(b); BU.mn(G,{k:'dnote',x:m.x,y:m.y,vx:-200,vy:-200,r:22,hp:12,col:'#2a1d14',parry:i===n-1,hop:0.4}); F.sfx(G,'bounce'); }
      return a.t>0.2+n*0.5+0.4;
    },
    notes2(b,G,dt,a){
      const n=[6,8,10][G.diff], m=mouth(b), i=BU.every(a,0.2,0.2,n); b.sing=0.8;
      if(i>=0){ BU.es(G,{k:'note',x:m.x-20,y:m.y+(i%2?-40:50),vx:-420*G.D.spd,vy:i%2?-20:30,r:16,wave:50,wf:5,wp:i,parry:BU.pinkN(a,4)}); F.sfx(G,'move'); }
      return a.t>0.2+n*0.2+0.3;
    },
    spiral(b,G,dt,a){
      const dur=[2.0,2.4,2.8][G.diff], m=mouth(b); b.sing=1; b.lean=Math.sin(a.t*10)*0.04;
      if(BU.cross(a,0)) F.sfx(G,'sing');
      const i=BU.every(a,0.1,[0.1,0.08,0.065][G.diff],60);
      if(i>=0&&a.t<dur){ a.ang=(a.ang||Math.PI*0.6)+0.55; BU.es(G,{k:'note',x:m.x,y:m.y,vx:Math.cos(a.ang)*240*G.D.spd,vy:Math.sin(a.ang)*240*G.D.spd,r:15,parry:BU.pinkN(a,8)}); }
      return a.t>dur+0.4;
    },
    fall(b,G,dt,a){
      const n=[4,6,8][G.diff], i=BU.every(a,0.2,0.32,n);
      if(i>=0){ const p=BU.tgt(G,b.x,b.y); const x=U.clamp(p.x+U.rnd(-120,120),40,980);
        BU.es(G,{k:'tele',x,y:GY-4,w:70,h:8,harmless:true,life:0.55}); BU.es(G,{k:'record',x,y:-60,vx:0,vy:250,ay:1100,r:30,spin:6,gnd:'shatter',parry:BU.pinkN(a,4)}); }
      return a.t>0.2+n*0.32+1;
    }
  },
  draw(c,b,G){ drawGramo(c,b,G.t); },
  portrait(c,x,y,s,t){ c.save(); c.translate(x,y); c.scale(s,s); c.translate(-920+60,-240+80); drawGramo(c,{x:1090,y:GY,sing:0,mood:0,spin:t||0,lean:0,trans:0},t||0); c.restore(); }
};
RR.EUPD.shatter=(e,G)=>{ e.dead=true; F.fx(G,'debris',e.x,GY-10,{n:5,col:'#1d1a1a'}); F.sfx(G,'small'); };
RR.MUPD.dnote=(m,G,dt)=>{
  const p=BU.tgt(G,m.x,m.y); m.hop-=dt;
  if(m.y>=GY-m.r-1){ m.vx=U.sign(p.x-m.x)*160*G.D.spd; if(m.hop<=0){ m.vy=-620; m.hop=U.rnd(0.5,0.9); } }
  m.vy+=1700*dt; m.x+=m.vx*dt; m.y+=m.vy*dt; if(m.y>GY-m.r){ m.y=GY-m.r; m.vy=0; }
};
RR.MDRAW.dnote=(c,m,G)=>{
  const t=G.t, col=m.parry?Art.PINK:'#2a1d14'; c.save(); c.translate(m.x,m.y);
  const s=Math.sin(t*16+m.x); c.beginPath(); c.moveTo(-6,14); c.lineTo(-10+s*5,24); c.moveTo(6,14); c.lineTo(10-s*5,24); c.lineWidth=4; c.strokeStyle=OL; c.stroke();
  Art.ell(c,10,24,7,4,'#fffaf0',2); Art.ell(c,-10,24,7,4,'#fffaf0',2);
  Art.ell(c,0,0,24,18,col,3.5,-0.3); c.beginPath(); c.moveTo(20,-6); c.lineTo(20,-58); c.quadraticCurveTo(44,-44,36,-22); c.lineWidth=6; c.strokeStyle=col; c.stroke();
  Art.eye(c,-8,-2,6,8,-0.6,0,{}); Art.eye(c,6,-2,6,8,-0.6,0,{}); c.beginPath(); c.arc(-1,6,6,0.2,Math.PI-0.2); c.lineWidth=3; c.strokeStyle='#fff'; c.stroke();
  c.restore();
};

function drawGramo(c,b,t){
  const sh=b.trans>0?U.rnd(-4,4):0;
  c.save(); c.translate(b.x+sh,b.y);
  // box
  Art.rrect(c,-128,-150,256,150,10,'#7a3e22',5); Art.rrect(c,-110,-130,220,110,8,'#9a5630',3);
  c.strokeStyle='#e2b23a'; c.lineWidth=3; c.strokeRect(-100,-120,200,90);
  for(let i=0;i<5;i++){ Art.circ(c,-80+i*40,-75,9,'#5a2a12',2.5); }
  Art.rrect(c,-120,-6,28,16,4,'#e2b23a',3); Art.rrect(c,92,-6,28,16,4,'#e2b23a',3);
  c.save(); c.translate(128,-80); c.rotate(b.spin*0.8); Art.rrect(c,0,-5,40,10,4,'#e2b23a',3); Art.circ(c,40,0,8,'#d8343a',3); c.restore();
  // turntable
  Art.ell(c,0,-152,118,22,'#3a2a24',4); Art.ell(c,0,-158,100,17,'#151212',3); Art.ell(c,0,-158,30,6,'#d8343a',2);
  c.beginPath(); c.ellipse(0,-158,80,13,0,b.spin%6.28,b.spin%6.28+0.6); c.lineWidth=3; c.strokeStyle='rgba(255,255,255,0.3)'; c.stroke();
  // horn tube
  const mx=-170, my=-318;
  c.beginPath(); c.moveTo(60,-165); c.bezierCurveTo(80,-260,-10,-300,mx+40,my+10); c.lineCap='round'; c.lineWidth=46; c.strokeStyle=OL; c.stroke(); c.lineWidth=36; c.strokeStyle=b.mood>=1?'#d07a3a':'#d9a83a'; c.stroke();
  c.lineWidth=8; c.strokeStyle='rgba(255,255,255,0.35)'; c.beginPath(); c.moveTo(56,-175); c.bezierCurveTo(70,-255,-10,-290,mx+40,my); c.stroke();
  for(let i=0;i<6;i++){ const k=i/5; Art.circ(c,U.lerp(30,mx+60,k),U.lerp(-200,my+50,k)+Math.sin(k*3)*-30,6,'#fffaf0',2); }
  // bell
  c.save(); c.translate(mx,my); c.rotate((b.lean||0)+(b.mood>=2?Math.sin(t*8)*0.05:0));
  const petals=10; c.beginPath(); for(let i=0;i<=petals*8;i++){ const an=i/(petals*8)*Math.PI*2, wob=1+0.06*Math.sin(an*petals); c.lineTo(Math.cos(an)*82*wob,Math.sin(an)*140*wob); } c.closePath();
  c.fillStyle=b.mood>=1?'#e0883a':'#e8b84a'; c.fill(); c.lineWidth=5; c.strokeStyle=OL; c.stroke();
  Art.ell(c,0,0,66,120,'#f6d8c4',4);
  // feather plume
  c.save(); c.translate(30,-128); c.rotate(0.4+Math.sin(t*2)*0.08); c.beginPath(); c.moveTo(0,0); c.bezierCurveTo(30,-50,10,-110,-10,-130); c.bezierCurveTo(-30,-90,-30,-40,0,0); c.fillStyle='#8a4ab0'; c.fill(); c.lineWidth=3.5; c.strokeStyle=OL; c.stroke(); c.restore();
  // face
  const ang=b.mood>=1;
  [-22,22].forEach((ex,i)=>{ Art.eye(c,ex,-40,15,22,-0.8,0.2,{}); for(let k=0;k<3;k++){ c.beginPath(); c.moveTo(ex-10+k*10,-62); c.lineTo(ex-14+k*12,-72); c.lineWidth=3; c.strokeStyle=OL; c.stroke(); }
    c.beginPath(); if(ang){ c.moveTo(ex-16,-78+(i?-6:6)); c.lineTo(ex+16,-78+(i?6:-6)); } else c.arc(ex,-70,16,Math.PI*1.15,Math.PI*1.85); c.lineWidth=4; c.stroke(); });
  if(ang){ c.globalAlpha=0.35; Art.circ(c,-38,0,14,'#ff5a5a',0); Art.circ(c,38,0,14,'#ff5a5a',0); c.globalAlpha=1; }
  Art.circ(c,30,20,3,OL,0);
  const s=b.sing||0;
  if(s>0.1){ Art.ell(c,0,40,18+s*4,8+s*22,'#5a1010',4); Art.ell(c,0,40+s*12,10,5,'#d8343a',0); }
  else { c.beginPath(); c.moveTo(-20,40); c.quadraticCurveTo(-10,30,0,38); c.quadraticCurveTo(10,30,20,40); c.quadraticCurveTo(0,58,-20,40); c.fillStyle='#d8343a'; c.fill(); c.lineWidth=3; c.strokeStyle=OL; c.stroke(); }
  c.restore();
  c.restore();
}
})();
