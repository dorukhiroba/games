/* Boss 3 — Baron Kazan: a monocled steam boiler (coal, steam, pistons, fire) */
(function(){
'use strict';
const U=RR.U, Art=RR.Art, OL=Art.OL, GY=RR.GROUND, BU=RR.BU, F=RR.Fight;

const B = RR.BOSS.boiler = {
  id:'boiler', name:'Baron Kazan', title:'Buharlı Demiryolu Baronu', hp:3900, bg:'depot', music:'boiler', par:130,
  phases:[0.66,0.33], plats:[{x:290,y:460,w:140},{x:560,y:430,w:140}],
  quotes:['Basıncımı kaldıramadın, ufaklık!','Tren kalkıyor, sen yine perondasın!','Kömürü bol, sabrı az bir baronum ben.'],
  cool:[1.0,0.85,0.6],
  pattern:[['coal','steam','jet'],['punch','gears','bolts'],['pillars','fireballs','coal']],
  init(b){ Object.assign(b,{x:1070,y:GY,mouth:0,heat:0,whistle:0,arm:0,bob:0,wheel:0}); },
  hurt(b){ return [{x:b.x-120,y:b.y-420,w:240,h:420}]; },
  body(b){ return [{x:b.x-110,y:b.y-330,w:220,h:330}]; },
  onPhase(b,G){ F.fx(G,'puff',b.x,b.y-430,{n:8,s:1.6,col:'#cfc7bb'}); if(b.phase===2){ b.heat=1; F.fx(G,'boom',b.x,b.y-200,{s:1.8}); } },
  update(b,G,dt){
    b.mouth=Math.max(0,b.mouth-dt*2); b.whistle=Math.max(0,b.whistle-dt*2); b.arm=Math.max(0,b.arm-dt*1.5); b.wheel+=dt*(1+b.phase);
    if(Math.random()<dt*6) F.fx(G,'puff',b.x+U.rnd(-10,10),b.y-440,{s:0.6,col:b.phase===2?'#555':'#d8d2c8',vy:-80,life:0.9});
    BU.run(b,G,dt,B);
  },
  atk:{
    coal(b,G,dt,a){
      const n=[3,3,4][G.diff]+(b.phase===2?1:0), i=BU.every(a,0.3,b.phase===2?0.3:0.42,n); b.mouth=0.3;
      if(i>=0){ const p=BU.tgt(G,b.x,b.y), x0=b.x, y0=b.y-440, v=BU.lob(x0,y0,p.x+U.rnd(-60,60),GY-16,1.1/G.D.spd,1200);
        BU.es(G,{k:'coal',x:x0,y:y0,vx:v.vx,vy:v.vy,ay:1200,r:20,spin:5,gnd:'coalLand',parry:BU.pinkN(a,3)}); F.sfx(G,'small'); }
      return a.t>0.3+n*0.42+0.4;
    },
    steam(b,G,dt,a){
      const n=[3,4,5][G.diff], i=BU.every(a,0.2,0.4,n);
      if(i>=0){ BU.es(G,{k:'steam',x:b.x-20,y:b.y-430,vx:-180,vy:-120,r:26,home:1.5,spd:170*G.D.spd,life:4.6,parry:i===1}); F.sfx(G,'dash'); }
      return a.t>0.2+n*0.4+0.6;
    },
    jet(b,G,dt,a){
      const n=[1,2,2][G.diff]; b.whistle=1; if(BU.cross(a,0)) F.sfx(G,'whistle');
      const i=BU.every(a,0.65,0.85,n);
      if(i>=0){ BU.es(G,{k:'jet',x:b.x-210,y:GY-36,w:190,h:72,vx:-820*G.D.spd,keep:false,pierce:true}); b.mouth=1; F.sfx(G,'dash'); F.shake(G,6); }
      return a.t>0.65+n*0.85+0.3;
    },
    punch(b,G,dt,a){
      const n=[1,2,3][G.diff], lanes=[{y:GY-45,h:90},{y:372,h:96}];
      if(a.lane==null) a.lane=Math.random()<0.5?0:1;
      const i=BU.every(a,0,1.6,n);
      if(i>=0){ const L=lanes[(a.lane+i)%2]; a.cur=L; a.go=a.t+0.65; BU.es(G,{k:'tele',x:560,y:L.y,w:820,h:L.h,harmless:true,life:0.65,keep:true}); F.sfx(G,'tele'); b.arm=1; }
      if(a.go!=null&&a.t>=a.go){ BU.es(G,{k:'fist',x:b.x-130,y:a.cur.y,w:20,h:a.cur.h,x0:b.x-110,life:0.95,keep:true,pierce:true,upd:'fist'}); a.go=null; F.sfx(G,'boom'); F.shake(G,8); }
      return a.t>(n-1)*1.6+0.65+1.1;
    },
    gears(b,G,dt,a){
      const n=[2,2,3][G.diff], i=BU.every(a,0.2,0.7,n); b.mouth=0.8;
      if(i>=0){ BU.mn(G,{k:'gearm',x:b.x-140,y:GY-34,vx:-260*G.D.spd,vy:0,r:34,hp:20,col:'#8a8580',parry:i===n-1,hop:U.rnd(0.6,1.2)}); F.sfx(G,'small'); }
      return a.t>0.2+n*0.7+0.3;
    },
    bolts(b,G,dt,a){
      const n=[8,10,14][G.diff], i=BU.every(a,0.2,1.6/n,n);
      if(i>=0){ const p=BU.tgt(G,b.x,b.y); BU.es(G,{k:'bolt',x:U.clamp(p.x+U.rnd(-260,260),30,960),y:-30,vx:0,vy:250,ay:900,r:14,spin:8,gnd:'die',parry:BU.pinkN(a,5)}); if(i%3===0) F.sfx(G,'tink'); }
      return a.t>2.2;
    },
    pillars(b,G,dt,a){
      const n=[3,3,4][G.diff], i=BU.every(a,0.1,0.55,n);
      if(i>=0){ const p=BU.tgt(G,b.x,b.y), x=U.clamp(p.x,50,940); a.q=a.q||[]; a.q.push({x,at:a.t+0.65}); BU.es(G,{k:'tele',x,y:GY-6,w:100,h:12,harmless:true,life:0.65}); F.sfx(G,'tele'); }
      (a.q||[]).forEach(q=>{ if(!q.done&&a.t>=q.at){ q.done=true; BU.es(G,{k:'pillar',x:q.x,y:GY-300,w:90,h:600,life:0.6,keep:true,pierce:true}); F.sfx(G,'boom'); F.shake(G,6); } });
      return a.t>0.1+n*0.55+1.3;
    },
    fireballs(b,G,dt,a){
      const waves=3, cnt=[3,5,5][G.diff], i=BU.every(a,0.4,0.6,waves); b.mouth=1;
      if(i>=0){ const x0=b.x-70, y0=b.y-90, p=BU.tgt(G,x0,y0), base=U.ang(x0,y0,p.x,p.y-40);
        for(let k=0;k<cnt;k++){ const an=base+(k-(cnt-1)/2)*0.22; BU.es(G,{k:'fire',x:x0,y:y0,vx:Math.cos(an)*420*G.D.spd,vy:Math.sin(an)*420*G.D.spd,r:15,parry:i===waves-1&&k===Math.floor(cnt/2)}); }
        F.sfx(G,'ex'); }
      return a.t>0.4+waves*0.6+0.3;
    }
  },
  draw(c,b,G){ drawBoiler(c,b,G.t); },
  portrait(c,x,y,s,t){ c.save(); c.translate(x,y); c.scale(s,s); drawBoiler(c,{x:0,y:230,mouth:0,heat:0,whistle:0,arm:0,wheel:t||0,phase:0,trans:0},t||0); c.restore(); }
};
RR.EUPD.coalLand=(e,G)=>{ e.dead=true; F.fx(G,'puff',e.x,GY-10,{n:2,col:'#555'}); F.sfx(G,'small');
  [-1,0,1].forEach(d=>BU.es(G,{k:'frag',x:e.x,y:GY-14,vx:d*230,vy:-420,ay:1300,r:10,spin:9,gnd:'die'})); };
RR.EUPD.fist=(e,G)=>{ const t=e.t, ext=t<0.28?t/0.28:t<0.62?1:Math.max(0,1-(t-0.62)/0.3); const R=e.x0, Lx=U.lerp(R-20,140,U.easeOut(ext)); e.x=(Lx+R)/2; e.w=Math.max(20,R-Lx); e.fx=Lx; };
Art.EB.fist=(c,e,t)=>{ const L=e.x-e.w/2, R=e.x+e.w/2, y=e.y, h=e.h;
  Art.rrect(c,L+40,y-h*0.22,R-L-40,h*0.44,6,'#8a8580',4); for(let x=L+70;x<R;x+=60) Art.rrect(c,x,y-h*0.3,14,h*0.6,3,'#5a5550',3);
  c.save(); c.translate(L,y); Art.rrect(c,-10,-h/2,70,h,18,'#b8bcc2',5); c.beginPath(); for(let k=1;k<4;k++){ c.moveTo(-6,-h/2+k*h/4); c.lineTo(20,-h/2+k*h/4); } c.lineWidth=3; c.strokeStyle=OL; c.stroke(); Art.circ(c,40,-h*0.25,5,'#5a5550',2); Art.circ(c,40,h*0.25,5,'#5a5550',2); c.restore(); };
RR.MUPD.gearm=(m,G,dt)=>{ m.hop-=dt; if(m.hop<=0&&m.y>=GY-m.r-1){ m.vy=-420; m.hop=U.rnd(0.8,1.4); } m.vy+=1500*dt; m.x+=m.vx*dt; m.y+=m.vy*dt; if(m.y>GY-m.r){ m.y=GY-m.r; m.vy=0; } m.a=(m.a||0)+m.vx*dt/m.r; };
RR.MDRAW.gearm=(c,m,G)=>{ c.save(); c.translate(m.x,m.y); c.save(); c.rotate(m.a||0); Art.gear(c,m.r,m.parry?Art.PINK:'#8a8580'); c.restore(); Art.eye(c,-9,-4,6,8,-0.8,0,{angry:1}); Art.eye(c,7,-4,6,8,-0.8,0,{angry:-1}); c.beginPath(); c.moveTo(-10,12); c.lineTo(8,10); c.lineWidth=3; c.strokeStyle=OL; c.stroke(); c.restore(); };

function drawBoiler(c,b,t){
  const sh=(b.trans>0||b.heat>0)?U.rnd(-2,2)*(b.heat?1:2):0, hot=b.heat>0;
  c.save(); c.translate(b.x+sh,b.y);
  // wheels
  [-80,80].forEach(x=>{ c.save(); c.translate(x,-30); c.rotate(-b.wheel*2); Art.circ(c,0,0,46,'#3a3634',5); for(let k=0;k<6;k++){ c.rotate(Math.PI/3); c.beginPath(); c.moveTo(0,0); c.lineTo(40,0); c.lineWidth=5; c.strokeStyle='#8a8580'; c.stroke(); } Art.circ(c,0,0,10,'#d8343a',3); c.restore(); });
  // back pipe arm
  Art.hose(c,110,-230,160,-150,-20,16,'#8a8580');
  // drum
  c.beginPath(); c.moveTo(-122,-40); c.lineTo(-122,-300); c.quadraticCurveTo(-122,-360,0,-366); c.quadraticCurveTo(122,-360,122,-300); c.lineTo(122,-40); c.closePath();
  const g=c.createLinearGradient(-122,0,122,0); g.addColorStop(0,hot?'#7a2a1a':'#2e3a4a'); g.addColorStop(0.45,hot?'#c8502a':'#55687e'); g.addColorStop(1,hot?'#6a2010':'#26303c');
  c.fillStyle=g; c.fill(); c.lineWidth=6; c.strokeStyle=OL; c.stroke();
  [-250,-160,-70].forEach(y=>{ Art.rrect(c,-124,y,248,14,4,'#c49a3a',3); for(let x=-110;x<=110;x+=22) Art.circ(c,x,y+7,3,'#5a4a2a',0); });
  // chimney top hat
  Art.rrect(c,-60,-382,120,22,8,'#1d1a1a',4); Art.rrect(c,-40,-470,80,92,6,'#1d1a1a',4); c.fillStyle='#d8343a'; c.fillRect(-38,-404,76,14);
  // whistle
  c.save(); c.translate(-80,-350+(b.whistle?Math.sin(t*60)*3:0)); Art.rrect(c,-10,-40,20,44,6,'#e2b23a',3); Art.ell(c,0,-40,12,5,'#e2b23a',3); c.restore();
  // face
  Art.eye(c,-42,-286,22,26,-0.8,0.2,{angry:hot?1:0}); Art.eye(c,30,-286,20,24,-0.8,0.2,{angry:hot?-1:0});
  c.beginPath(); c.arc(-42,-286,30,0,6.283); c.lineWidth=5; c.strokeStyle='#e2b23a'; c.stroke(); c.beginPath(); c.moveTo(-14,-280); c.quadraticCurveTo(0,-230,-10,-190); c.lineWidth=2; c.stroke();
  if(!hot){ c.beginPath(); c.moveTo(-70,-322); c.lineTo(-14,-318); c.moveTo(6,-318); c.lineTo(56,-322); c.lineWidth=7; c.strokeStyle=OL; c.stroke(); }
  Art.ell(c,-6,-240,18,14,'#c8b090',3.5);
  // walrus mustache
  c.beginPath(); c.moveTo(-6,-232); c.bezierCurveTo(-60,-240,-100,-210,-96,-170); c.bezierCurveTo(-80,-190,-60,-196,-40,-196); c.bezierCurveTo(-30,-200,-16,-206,-6,-214); c.bezierCurveTo(4,-206,18,-200,28,-196); c.bezierCurveTo(48,-196,68,-190,84,-170); c.bezierCurveTo(88,-210,48,-240,-6,-232); c.fillStyle='#e8e2d6'; c.fill(); c.lineWidth=4; c.strokeStyle=OL; c.stroke();
  // firebox mouth
  const mo=b.mouth||0;
  Art.rrect(c,-62,-150,124,86,12,'#1d1a1a',5);
  const fg=c.createRadialGradient(0,-100,4,0,-100,70); fg.addColorStop(0,'#fff6b0'); fg.addColorStop(0.5,'#ff8a2a'); fg.addColorStop(1,'#a82a10');
  c.fillStyle=fg; c.fillRect(-52,-140,104,66*Math.max(0.15,mo));
  c.save(); c.translate(-62,-150); c.rotate(-mo*0.9); Art.rrect(c,0,0,124,30+(1-mo)*56,8,'#3a3634',4); for(let k=0;k<4;k++){ c.fillStyle='#1d1a1a'; c.fillRect(14+k*26,10,14,6); } c.restore();
  // front arm (valve hand)
  const ay=-200-(b.arm||0)*80, ax=-170-(b.arm||0)*20;
  Art.hose(c,-110,-220,ax,ay,18,16,'#8a8580');
  c.save(); c.translate(ax,ay); c.rotate(t*(b.arm?12:2)); Art.circ(c,0,0,22,null,0); c.beginPath(); c.arc(0,0,22,0,6.283); c.lineWidth=9; c.strokeStyle=OL; c.stroke(); c.lineWidth=5; c.strokeStyle='#d8343a'; c.stroke(); for(let k=0;k<3;k++){ c.rotate(Math.PI*2/3); c.beginPath(); c.moveTo(0,0); c.lineTo(22,0); c.lineWidth=5; c.strokeStyle=OL; c.stroke(); } c.restore();
  if(hot){ for(let i=0;i<3;i++){ const k=(t*1.3+i/3)%1; c.globalAlpha=1-k; Art.ell(c,-90+i*90,-300-k*80,4,8,'#9ad8ff',2); } c.globalAlpha=1; }
  c.restore();
}
})();
