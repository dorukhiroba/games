/* Run & gun level — Lunapark Yolu: scrolling stage with pits, enemies, 5 hidden coins and a finish tent */
(function(){
'use strict';
const U=RR.U, Art=RR.Art, OL=Art.OL, BU=RR.BU, F=RR.Fight, W=RR.W, H=RR.H, GY=RR.GROUND;
const LEN=6400, GOAL=6250;
const GSEG=[[0,1100],[1250,2300],[2450,3300],[3500,4600],[4780,LEN]];
const FLOAT=[[700,460,160],[1110,440,120],[1700,420,160],[1950,300,120],[2330,450,120],[2900,400,160],[3330,440,150],[3700,380,150],[4150,430,160],[4620,440,150],[5350,430,170],[5600,330,150]];
const COINS=[[760,410],[1170,330],[2010,240],[3775,320],[5675,270]];
const SP=[[900,'tix'],[1000,'tix'],[1180,'bal',330,1],[1500,'tur'],[1900,'duck',260],[2050,'tix'],[2150,'tix'],[2400,'bal',300],[2520,'bal',250,1],[2800,'tur'],[3000,'duck',300],[3100,'duck',220],
  [3420,'bal',300,1],[3600,'tix'],[3700,'tix'],[3800,'tix'],[4100,'tur'],[4400,'duck',250],[4700,'bal',320,1],[5000,'tix'],[5100,'tur'],[5400,'duck',280],[5500,'duck',200],[5800,'tix'],[5900,'tix'],[6000,'bal',300,1]];
const groundAt=x=>GSEG.some(s=>x>=s[0]&&x<=s[1]);

const D = RR.BOSS.luna = {
  id:'luna', name:'Lunapark Yolu', title:'Koş ve Ateş Et', run:true, length:LEN, hp:1e9, noScale:true, bg:'luna', music:'run', par:140,
  phases:[], introTxt:'KOŞ!', goTxt:'MOTOR!',
  quotes:['Lunapark kapanmadan çıkışa yetiş!','Biletin yandı, tekrar sıraya gir!','Atlıkarınca bile senden hızlı!'],
  plats:GSEG.map(s=>({x:s[0],y:GY,w:s[1]-s[0],solid:true,ground:true})).concat(FLOAT.map(f=>({x:f[0],y:f[1],w:f[2]}))),
  init(b,G){ Object.assign(b,{x:-9999,y:0}); G.spawnI=0; G.coins=COINS.map((c,i)=>({id:i,x:c[0],y:c[1],got:false})); G.players.forEach((p,i)=>{ p.x=120+i*90; p.safeX=p.x; }); },
  hurt(){ return []; },
  update(b,G,dt){
    if(G.mode==='client') return;
    const alive=G.players.filter(p=>!p.dead);
    if(alive.length){ const ax=alive.reduce((a,p)=>a+p.x,0)/alive.length; const tgt=U.clamp(ax-430,0,LEN-W); G.camX=U.lerp(G.camX,tgt,0.12); }
    G.minX=G.camX+24; G.maxX=Math.min(LEN-24,G.camX+W-24);
    while(G.spawnI<SP.length&&SP[G.spawnI][0]<G.camX+W+80){ spawn(G,SP[G.spawnI]); G.spawnI++; }
    G.coins.forEach(c=>{ if(c.got) return; G.players.forEach(p=>{ if(!c.got&&!p.dead&&U.dist(p.x,p.y-40,c.x,c.y)<46){ c.got=true; G.coinsGot++; G.coinIds.push(c.id); F.sfx(G,'coin'); F.fx(G,'spark',c.x,c.y,{n:8,col:'#ffd23a'}); F.fx(G,'text',c.x,c.y-20,{txt:'JETON!',col:'#ffd23a'}); } }); });
    G.players.forEach(p=>{
      if(p.dead) return;
      if(p.onGround&&p.plat&&p.plat.solid) p.safeX=p.x;
      if(p.y>H+60){ RR.PlayerSys.hurt(p,G); if(!p.dead){ p.x=U.clamp(p.safeX||G.camX+200,G.camX+60,G.camX+W-60); p.y=180; p.vy=0; p.vx=0; p.invT=Math.max(p.invT,1.6); } else p.y=H-80; }
    });
    if(G.state==='fight'&&alive.some(p=>p.x>=GOAL)){ G.state='goal'; G.st=0; F.banner(G,'BÖLÜM TAMAM!',2.4,{size:90}); F.sfx(G,'revive'); F.fx(G,'conf',GOAL,300,{n:30,col:'#d8343a'}); F.fx(G,'conf',GOAL,300,{n:30,col:'#2f6fd6'}); if(RR.say) RR.say('Bölüm tamam!'); }
    if(G.state==='goal'&&G.st>2.6){ G.state='done'; G.over={won:true}; }
  },
  draw(c,b,G){
    const t=G.t, cx=G.camX||0;
    // finish tent
    c.save(); c.translate(GOAL+40,GY); Art.rrect(c,-90,-170,180,170,6,'#f3e4c2',5); for(let k=0;k<4;k++){ c.fillStyle=k%2?'#d8343a':'#f3e4c2'; c.fillRect(-86+k*43,-166,43,166); }
    c.beginPath(); c.moveTo(-110,-170); c.lineTo(0,-260); c.lineTo(110,-170); c.closePath(); c.fillStyle='#d8343a'; c.fill(); c.lineWidth=5; c.strokeStyle=OL; c.stroke();
    c.beginPath(); c.moveTo(0,-260); c.lineTo(0,-320); c.lineWidth=4; c.stroke(); c.beginPath(); c.moveTo(0,-320); c.lineTo(46+Math.sin(t*6)*6,-306); c.lineTo(0,-292); c.fillStyle='#ffd23a'; c.fill(); c.stroke();
    Art.rrect(c,-70,-140,140,40,6,'#2a1d14',3); Art.text(c,'ÇIKIŞ',0,-119,26,{title:true,color:'#ffd23a'}); c.restore();
    // signs
    [[300,'LUNAPARK →'],[3200,'YARI YOL!']].forEach(s=>{ if(s[0]<cx-200||s[0]>cx+W+200) return; c.save(); c.translate(s[0],GY); Art.rrect(c,-6,-120,12,120,3,'#7a5a32',3); Art.rrect(c,-80,-150,160,44,6,'#f3e4c2',4); Art.text(c,s[1],0,-127,20,{title:true}); c.restore(); });
    // coins
    (G.coins||[]).forEach(co=>{ if(co.got||co.x<cx-60||co.x>cx+W+60) return; const sx=Math.abs(Math.cos(t*3+co.id)); c.save(); c.translate(co.x,co.y+Math.sin(t*3+co.id)*5); c.scale(Math.max(0.15,sx),1); Art.circ(c,0,0,18,'#ffd23a',4); Art.circ(c,0,0,11,null,0); c.beginPath(); c.arc(0,0,11,0,6.283); c.lineWidth=2; c.strokeStyle='#b8860b'; c.stroke(); Art.text(c,'R',0,1,15,{title:true,color:'#b8860b'}); c.restore(); });
  },
  drawUI(c,b,G){
    const k=U.clamp((G.camX||0)/(LEN-W),0,1), x=W/2-220, y=20;
    Art.rrect(c,x,y,440,16,8,'rgba(0,0,0,0.35)',3); c.fillStyle='#ffd23a'; c.fillRect(x+3,y+3,434*k,10);
    c.save(); c.translate(x+440*k,y+8); Art.circ(c,0,0,10,'#d8343a',3); c.restore();
    Art.text(c,'Jeton: '+(G.coinsGot||0)+' / 5',W-24,G.players.length>=4?96:30,22,{title:true,align:'right',color:'#ffd23a',stroke:OL,sw:5});
  },
  portrait(c,x,y,s,t){ c.save(); c.translate(x,y); c.scale(s,s); ferris(c,0,0,150,t||0); c.restore(); }
};
function ferris(c,x,y,r,t){ c.save(); c.translate(x,y); c.beginPath(); c.moveTo(-r*0.6,r*1.3); c.lineTo(0,0); c.lineTo(r*0.6,r*1.3); c.lineWidth=8; c.strokeStyle=OL; c.stroke();
  c.save(); c.rotate(t*0.3); c.beginPath(); c.arc(0,0,r,0,6.283); c.lineWidth=7; c.strokeStyle=OL; c.stroke(); for(let i=0;i<8;i++){ c.rotate(Math.PI/4); c.beginPath(); c.moveTo(0,0); c.lineTo(r,0); c.lineWidth=3; c.stroke(); } c.restore();
  for(let i=0;i<8;i++){ const a=t*0.3+i*Math.PI/4; Art.rrect(c,Math.cos(a)*r-14,Math.sin(a)*r,28,22,5,i%2?'#d8343a':'#2f6fd6',3); }
  Art.circ(c,0,0,14,'#e2b23a',4); c.restore(); }

function spawn(G,s){
  const [x,k,y,pink]=s;
  if(k==='tix') BU.mn(G,{k:'tix',x,y:GY-24,vx:-140,vy:0,r:22,hp:6,col:'#e9c46a',hop:U.rnd(0.4,1.2)});
  else if(k==='bal') BU.mn(G,{k:'bal',x,y,by:y,vx:-30,vy:0,r:24,hp:3,col:pink?Art.PINK:'#d8343a',parry:!!pink,ph:Math.random()*6});
  else if(k==='tur') BU.mn(G,{k:'tur',x,y:GY-34,vx:0,vy:0,r:34,hp:30,col:'#d8343a',cd:1.4});
  else if(k==='duck') BU.mn(G,{k:'duck',x,y,by:y,vx:-210,vy:0,r:26,hp:8,col:'#f2c230'});
}
RR.MUPD.tix=(m,G,dt)=>{ const p=BU.tgt(G,m.x,m.y); const onG=groundAt(m.x)&&m.y>=GY-m.r-1&&m.y<=GY-m.r+6;
  if(onG){ m.vx=U.sign(p.x-m.x||-1)*150; m.hop-=dt; if(m.hop<=0){ m.vy=-560; m.hop=U.rnd(0.8,1.5); } }
  m.vy+=1600*dt; m.x+=m.vx*dt; m.y+=m.vy*dt; if(groundAt(m.x)&&m.y>GY-m.r&&m.y<GY-m.r+30){ m.y=GY-m.r; m.vy=0; } if(m.y>H+40) m.dead=true; };
RR.MUPD.bal=(m,G,dt)=>{ m.x+=m.vx*dt; m.y=m.by+Math.sin(m.t*2+m.ph)*40; };
RR.MUPD.duck=(m,G,dt)=>{ m.x+=m.vx*dt; m.y=m.by+Math.sin(m.t*3)*50; };
RR.MUPD.tur=(m,G,dt)=>{ m.cd-=dt; if(m.cd<=0&&m.x<G.camX+W-40&&m.x>G.camX+40){ m.cd=2.2/G.D.rate; const p=BU.tgt(G,m.x,m.y), v=BU.lob(m.x,m.y-30,p.x,GY-20,1.0,1100); BU.es(G,{k:'pop',x:m.x,y:m.y-30,vx:v.vx,vy:v.vy,ay:1100,r:16,spin:4,gnd:'die',parry:Math.random()<0.25}); F.sfx(G,'small'); m.recoil=1; } m.recoil=Math.max(0,(m.recoil||0)-dt*4); };
RR.MDRAW.tix=(c,m,G)=>{ c.save(); c.translate(m.x,m.y); c.scale(m.vx>0?-1:1,1); const s=Math.sin(G.t*14+m.x*0.1);
  c.beginPath(); c.moveTo(-6,18); c.lineTo(-6+s*5,26); c.moveTo(6,18); c.lineTo(6-s*5,26); c.lineWidth=4; c.strokeStyle=OL; c.stroke();
  Art.rrect(c,-20,-24,40,44,4,'#e9c46a',3.5); c.setLineDash([4,4]); c.beginPath(); c.moveTo(-16,6); c.lineTo(16,6); c.lineWidth=2; c.stroke(); c.setLineDash([]);
  Art.eye(c,-8,-10,5,7,-0.8,0,{angry:1}); Art.eye(c,6,-10,5,7,-0.8,0,{angry:-1}); Art.text(c,'ADM',0,14,9,{title:true,color:'#8a1820'}); c.restore(); };
RR.MDRAW.bal=(c,m,G)=>{ c.save(); c.translate(m.x,m.y); c.beginPath(); c.moveTo(0,m.r); c.quadraticCurveTo(8,m.r+30,-4,m.r+60); c.lineWidth=2; c.strokeStyle=OL; c.stroke();
  Art.ell(c,0,0,m.r*0.9,m.r*1.1,m.col,3.5); Art.ell(c,-7,-9,5,8,'rgba(255,255,255,0.6)',0); Art.eye(c,-6,0,4,6,-0.6,0,{}); Art.eye(c,6,0,4,6,-0.6,0,{}); c.restore(); };
RR.MDRAW.duck=(c,m,G)=>{ c.save(); c.translate(m.x,m.y); Art.ell(c,6,6,26,16,'#f2c230',3.5); Art.circ(c,-16,-12,14,'#f2c230',3.5); c.beginPath(); c.moveTo(-28,-12); c.lineTo(-42,-8); c.lineTo(-28,-4); c.fillStyle='#ff8a2a'; c.fill(); c.lineWidth=2.5; c.stroke();
  Art.eye(c,-18,-16,4,6,-0.8,0,{angry:1}); const f=Math.sin(G.t*16)*10; c.beginPath(); c.moveTo(4,0); c.quadraticCurveTo(20,-20-f,30,-4); c.fillStyle='#e2ad22'; c.fill(); c.lineWidth=3; c.stroke(); Art.circ(c,14,10,6,'#fffaf0',2); Art.circ(c,14,10,2,'#d8343a',0); c.restore(); };
RR.MDRAW.tur=(c,m,G)=>{ c.save(); c.translate(m.x,m.y+(m.recoil||0)*4); c.beginPath(); c.moveTo(-30,-30); c.lineTo(30,-30); c.lineTo(22,34); c.lineTo(-22,34); c.closePath(); c.fillStyle='#fffaf0'; c.fill(); c.lineWidth=4; c.strokeStyle=OL; c.stroke();
  for(let k=0;k<3;k++){ c.fillStyle='#d8343a'; c.beginPath(); c.moveTo(-26+k*20,-30); c.lineTo(-14+k*20,-30); c.lineTo(-11+k*16,34); c.lineTo(-19+k*16,34); c.fill(); }
  [[-16,-34],[0,-42],[16,-34]].forEach(o=>Art.circ(c,o[0],o[1],11,'#fff4d8',3));
  Art.eye(c,-9,0,6,8,-0.8,0,{angry:1}); Art.eye(c,8,0,6,8,-0.8,0,{angry:-1}); Art.ell(c,0,18,8,4,'#3a1a20',2); c.restore(); };

/* ---------- parallax background + ground blocks ---------- */
let skyC=null;
Art.BGL.luna=function(c,t,G){
  const cx=G?G.camX||0:0;
  if(!skyC){ skyC=Art.mkCanvas(); const x=skyC.getContext('2d'); const g=x.createLinearGradient(0,0,0,H); g.addColorStop(0,'#f0b88a'); g.addColorStop(0.6,'#f6dcb0'); g.addColorStop(1,'#f3e4c2'); x.fillStyle=g; x.fillRect(0,0,W,H); }
  c.drawImage(skyC,0,0);
  for(let i=0;i<4;i++){ const x=((i*420-cx*0.05-t*8)%(W+300)+W+300)%(W+300)-150; Art.cloud(c,x,80+(i%2)*50,1); }
  const fx=900-cx*0.12; ferris(c,((fx%(W+700))+W+700)%(W+700)-300,300,170,t);
  for(let i=0;i<6;i++){ const x=((i*360-cx*0.3)%(360*6)+360*6)%(360*6)-200; c.save(); c.translate(x,GY); c.globalAlpha=0.9;
    c.beginPath(); c.moveTo(-90,0); c.lineTo(-90,-110); c.lineTo(0,-180); c.lineTo(90,-110); c.lineTo(90,0); c.closePath(); c.fillStyle=i%2?'#c96a6a':'#7a9ac9'; c.fill(); c.lineWidth=4; c.strokeStyle='rgba(40,25,15,0.6)'; c.stroke();
    for(let k=-2;k<=2;k++){ c.beginPath(); c.moveTo(k*36,-110+Math.abs(k)*0); c.lineTo(0,-180); c.lineWidth=2; c.stroke(); } c.restore(); }
  c.save(); const off=-(cx*0.5)%200; for(let x=off-200;x<W+200;x+=200){ c.beginPath(); c.moveTo(x,140); c.quadraticCurveTo(x+100,190,x+200,140); c.lineWidth=2; c.strokeStyle='rgba(40,25,15,0.6)'; c.stroke(); for(let k=0;k<5;k++){ const px=x+20+k*36, py=140+Math.sin((k+0.5)/5*Math.PI)*45*0.55; c.beginPath(); c.moveTo(px-8,py); c.lineTo(px+8,py); c.lineTo(px,py+16); c.closePath(); c.fillStyle=['#d8343a','#ffd23a','#2f6fd6','#58c47c','#ff7a45'][k]; c.fill(); } } c.restore();
};
const basePlat=Art.plat;
Art.plat=function(c,p,id,t){
  if(!p.ground) return basePlat(c,p,id,t);
  c.fillStyle='#8a6234'; c.fillRect(p.x,p.y,p.w,H-p.y+10); c.fillStyle='#b5874a'; c.fillRect(p.x,p.y,p.w,16);
  c.fillStyle='rgba(40,25,10,0.25)'; for(let x=p.x+20;x<p.x+p.w-20;x+=70) c.fillRect(x,p.y+40+((x*7)%50),26,8);
  c.strokeStyle=OL; c.lineWidth=5; c.strokeRect(p.x,p.y,p.w,H-p.y+20);
};
})();
