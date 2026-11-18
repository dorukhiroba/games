/* Reel Rumble — plane mode: toy biplane player (free flight, shrink, bombs, parry, EX torpedo, mega shell) + sky backgrounds */
(function(){
'use strict';
const U=RR.U, Art=RR.Art, OL=Art.OL, W=RR.W, H=RR.H;
const PL = RR.PlaneSys = {};
const F=()=>RR.Fight;

PL.create=function(id,load,x){
  const p=RR.PlayerSys.create(id,load,x);
  return Object.assign(p,{plane:true,x:170-(id%2)*30,y:150+id*125,onGround:false,small:false,wasSmall:false,weapons:['ink','charge'],wslot:0,parryCD:0,prop:0,tilt:0,alt:false});
};
PL.hb = p => p.small?{x:p.x-12,y:p.y-9,w:24,h:18}:{x:p.x-26,y:p.y-15,w:50,h:30};
PL.muzzle = p => ({x:p.x+(p.small?20:44),y:p.y+(p.small?3:6)});

PL.update=function(p,G,ctrl,dt){
  p.invT=Math.max(0,p.invT-dt); p.hurtT=Math.max(0,p.hurtT-dt); p.parryT=Math.max(0,p.parryT-dt); p.parryCD=Math.max(0,p.parryCD-dt);
  p.starT=Math.max(0,p.starT-dt); p.exT=Math.max(0,p.exT-dt); p.shootCD-=dt; p.ribT=Math.max(0,(p.ribT||0)-dt); p.prop+=dt*40;
  if(p.dead){ if(!p.gone){ p.y-=48*dt; p.x+=Math.sin(G.t*2+p.id)*30*dt; if(p.y<-160) p.gone=true; } p.revivable=!p.gone&&G.players.some(o=>o!==p&&!o.dead); return; }
  if(p.superT>0){ p.superT-=dt; p.vx*=0.9; p.vy*=0.9; p.x+=p.vx*dt; p.y+=p.vy*dt; return; }
  const inp=G.state==='fight'?ctrl:null, Hd=n=>inp?inp.held(n):false, PR=n=>inp?inp.pressed(n):false;
  const h=(Hd('right')?1:0)-(Hd('left')?1:0), v=(Hd('down')?1:0)-(Hd('up')?1:0);
  p.small=Hd('dash');
  if(p.small!==p.wasSmall){ p.wasSmall=p.small; F().fx(G,'puff',p.x,p.y,{s:0.6}); if(p.small){ F().sfx(G,'dash'); p.tf|=4; } }
  const spd=p.small?560:430; let tx=h*spd, ty=v*spd; if(h&&v){ tx*=0.7071; ty*=0.7071; }
  if(p.hurtT>0){ tx*=0.3; ty*=0.3; }
  p.vx=U.lerp(p.vx,tx,0.22); p.vy=U.lerp(p.vy,ty,0.22);
  p.x=U.clamp(p.x+p.vx*dt,34,W-50); p.y=U.clamp(p.y+p.vy*dt,44,H-44);
  p.tilt=U.lerp(p.tilt,p.vy/1700,0.2);
  if(h||v) p.tf|=1;
  if(PR('jump')&&p.parryT<=0&&p.parryCD<=0){ p.parryT=p.charm==='glove'?0.36:0.26; p.parryCD=0.45; p.tf|=2; F().sfx(G,'jump'); }
  if(PR('swap')){ p.wslot^=1; F().sfx(G,'move'); }
  p.face=1; p.aimX=1; p.aimY=0;
  if(Hd('shoot')&&p.shootCD<=0&&p.hurtT<=0){
    const m=PL.muzzle(p);
    if(p.wslot===0){ p.alt=!p.alt; F().ps(G,{k:'pbul',x:m.x,y:m.y+(p.alt?-5:5),vx:1600,vy:U.rnd(-25,25),r:p.small?6:9,dmg:p.small?2.4:3.8,o:p.id,life:1}); p.shootCD=0.075; F().sfx(G,'shoot'); }
    else { F().ps(G,{k:'pbomb',x:p.x+8,y:p.y+16,vx:540,vy:-60,grav:1300,r:p.small?10:15,dmg:p.small?8:13,o:p.id,life:2,bomb:true,blast:95}); p.shootCD=0.42; F().sfx(G,'small'); }
    p.tf|=8;
  }
  p.shootT=Hd('shoot')?0.12:Math.max(0,p.shootT-dt);
  if(PR('ex')&&p.sup>=1&&!p.small&&p.hurtT<=0){
    if(p.sup>=5) PL.super(p,G);
    else { const m=PL.muzzle(p); p.sup-=1; p.st.supUsed+=1; p.tf|=32; p.exT=0.3;
      F().ps(G,{k:'ptorp',x:m.x,y:m.y,vx:500,vy:0,r:26,dmg:9,o:p.id,life:2.6,pierce:true,hitcd:0.1,maxHits:4,ex:true,upd:'accel'});
      p.vx-=220; F().sfx(G,'ex'); F().rumble(G,p.id,0.3,80); F().fx(G,'puff',m.x,m.y,{n:2}); F().shake(G,4); }
  }
  if(p.charm==='coffee') p.sup=Math.min(5,p.sup+dt*0.045);
};
PL.super=function(p,G){
  const f=F(); p.sup=0; p.st.supUsed+=5; p.tf|=256; p.superT=0.5; p.starT=1.6;
  f.ps(G,{k:'pmega',x:p.x+60,y:p.y,vx:620,vy:0,r:80,dmg:24,o:p.id,life:3.2,pierce:true,hitcd:0.1,sup:true,keep:true});
  f.sfx(G,'super'); f.shake(G,14); f.rumble(G,p.id,0.9,400); f.fx(G,'ring',p.x,p.y,{col:'#ffd23a',s:2.5,life:0.6}); G.hitstop=Math.max(G.hitstop,0.15);
};
PL.hurt=function(p,G){ const r=RR.PlayerSys.hurt(p,G); if(r){ p.vy=0; p.vx=-260; p.onGround=false; } return r; };
PL.parry=function(p,G){ const f=F(); p.parryT=0; p.parryCD=0; p.sup=Math.min(5,p.sup+1); p.st.parries++; p.tf|=16; p.invT=Math.max(p.invT,0.3);
  G.hitstop=Math.max(G.hitstop,0.12); f.sfx(G,'parry'); f.rumble(G,p.id,0.35,90); f.fx(G,'ring',p.x,p.y,{s:1.4}); f.fx(G,'spark',p.x,p.y,{n:6,col:'#ff9ccc'}); };
PL.revive=function(p,o,G){ RR.PlayerSys.revive(p,o,G); o.vy=0; o.parryCD=0; };
RR.PUPD.accel=(s,G,dt)=>{ s.vx=Math.min(1500,s.vx+1100*dt); if(Math.random()<0.5) RR.Art.fxSpawn(G.fx,'dust',s.x-s.r*1.4,s.y,{life:0.35}); };

/* ---------- drawing ---------- */
Art.plane=function(c,p,t){
  if(p.dead){ Art.ghost(c,{x:p.x,y:p.y+40,revivable:p.revivable},t); return; }
  const C=RR.CHARS[p.char]||RR.CHARS.bobbin;
  c.save();
  if(p.invT>0&&!p.starT&&!p.superT&&Math.floor(t*24)%2===0) c.globalAlpha*=0.3;
  c.translate(p.x,p.y+Math.sin(t*5+p.id)*2);
  const s=p.small?0.5:1; c.scale(s,s);
  if(p.starT>0){ c.save(); c.globalAlpha=0.35+0.2*Math.sin(t*30); Art.star(c,0,0,80,'#fff3a0',0,t*3,8); c.restore(); }
  c.rotate(p.tilt+(p.parryT>0?(t*24)%(Math.PI*2):0));
  // tail
  c.beginPath(); c.moveTo(-36,-2); c.lineTo(-62,-30); c.lineTo(-56,2); c.closePath(); c.fillStyle=C.dark; c.fill(); c.lineWidth=3.5; c.strokeStyle=OL; c.stroke();
  Art.rrect(c,-62,0,26,8,3,'#f3e4c2',3);
  // lower wing (back part)
  Art.rrect(c,-14,14,58,10,5,'#f3e4c2',3.5);
  // fuselage
  Art.ell(c,0,6,48,16,C.color,4); c.save(); c.beginPath(); c.ellipse(0,6,46,14,0,0,6.283); c.clip(); c.fillStyle='rgba(255,255,255,0.85)'; c.fillRect(-30,4,60,4); c.fillStyle='rgba(255,255,255,0.25)'; c.fillRect(-46,-8,92,5); c.restore();
  Art.star(c,-24,6,6,'#fffaf0',2);
  // pilot
  let mood='norm'; if(p.hurtT>0) mood='hurt'; else if(p.parryT>0||p.superT>0) mood='happy'; else if(p.shootT>0) mood='grit';
  c.save(); c.translate(-12,33); c.scale(0.52,0.52); Art.head(c,p,t,mood); c.restore();
  Art.ell(c,-12,-6,16,5,'#2a1d14',3);
  // struts + top wing
  c.beginPath(); c.moveTo(6,-16); c.lineTo(4,14); c.moveTo(34,-16); c.lineTo(32,14); c.lineWidth=3; c.strokeStyle=OL; c.stroke();
  Art.rrect(c,-4,-24,62,10,5,'#f3e4c2',3.5); c.fillStyle=C.color; c.fillRect(40,-22,10,6);
  // gun + nose + propeller
  Art.rrect(c,30,14,20,6,2,'#4a4a52',2.5);
  if(p.shootT>0&&Math.floor(t*30)%2===0) Art.star(c,54,17,7,'#fff3a0',2,t*9,6);
  Art.circ(c,48,6,8,'#e2b23a',3);
  c.save(); c.globalAlpha=0.55; Art.ell(c,54,6,4,28*Math.abs(Math.sin(p.prop)),'#e8e0d0',2); c.restore();
  c.restore();
};
Art.PSD.pbul=(c,s)=>{ c.save(); c.translate(s.x,s.y); Art.ell(c,0,0,s.r*1.6,s.r*0.55,'#fff3a0',2.5); Art.ell(c,-s.r*0.6,0,s.r*0.6,s.r*0.3,'#ffb02e',0); c.restore(); };
Art.PSD.pbomb=(c,s,t)=>{ c.save(); c.translate(s.x,s.y); c.rotate(Math.atan2(s.vy,s.vx)); Art.ell(c,0,0,s.r*1.2,s.r*0.8,'#2b2b33',3); c.beginPath(); c.moveTo(-s.r*1.1,0); c.lineTo(-s.r*1.8,-s.r*0.7); c.lineTo(-s.r*1.8,s.r*0.7); c.closePath(); c.fillStyle='#d8343a'; c.fill(); c.lineWidth=2.5; c.stroke(); Art.ell(c,s.r*0.3,-s.r*0.3,s.r*0.3,s.r*0.15,'rgba(255,255,255,0.5)',0); c.restore(); };
Art.PSD.ptorp=(c,s,t)=>{ c.save(); c.translate(s.x,s.y); const r=s.r; Art.rrect(c,-r*1.6,-r*0.55,r*3,r*1.1,r*0.5,'#9aa0a6',4); Art.ell(c,r*1.4,0,r*0.5,r*0.5,'#d8343a',3);
  c.beginPath(); c.moveTo(-r*1.4,-r*0.4); c.lineTo(-r*2,-r); c.lineTo(-r*1.8,0); c.lineTo(-r*2,r); c.lineTo(-r*1.4,r*0.4); c.fillStyle='#5a5550'; c.fill(); c.lineWidth=3; c.stroke(); c.fillStyle='#fffaf0'; c.fillRect(-r*0.4,-r*0.5,6,r); c.restore(); };
Art.PSD.pmega=(c,s,t)=>{ c.save(); c.translate(s.x,s.y); const r=s.r; c.globalAlpha=0.35; Art.circ(c,-r*0.4,0,r*1.25,'#fff3a0',0); c.globalAlpha=1;
  Art.rrect(c,-r*1.4,-r*0.7,r*2.4,r*1.4,r*0.7,'#d8343a',6); Art.ell(c,r*1.0,0,r*0.6,r*0.62,'#e2b23a',5); Art.star(c,-r*0.3,0,r*0.45,'#fffaf0',3,t*6);
  Art.eye(c,r*0.85,-r*0.2,r*0.16,r*0.22,1,0,{angry:-1}); c.restore(); };

/* ---------- sky backgrounds (parallax, always scrolling) ---------- */
let skyCv={};
function grad(id,top,bot){ if(skyCv[id]) return skyCv[id]; const cv=Art.mkCanvas(), x=cv.getContext('2d'); const g=x.createLinearGradient(0,0,0,H); g.addColorStop(0,top); g.addColorStop(1,bot); x.fillStyle=g; x.fillRect(0,0,W,H); skyCv[id]=cv; return cv; }
function layer(c,t,speed,span,n,fn){ for(let i=0;i<n;i++){ const x=((i*span-t*speed)%(span*n)+span*n)%(span*n)-span; fn(x,i); } }
Art.BGL.sky=function(c,t){
  c.drawImage(grad('sky','#8ec3cf','#f6e2b6'),0,0);
  c.save(); c.translate(1060,120); for(let i=0;i<12;i++){ c.rotate(Math.PI/6); c.fillStyle='rgba(255,226,140,0.3)'; c.beginPath(); c.moveTo(0,0); c.lineTo(240,-20); c.lineTo(240,20); c.fill(); } c.restore(); Art.circ(c,1060,120,54,'#ffd76a',4);
  layer(c,t,30,420,4,(x,i)=>Art.cloud(c,x,90+(i%2)*60,1.3,'rgba(251,243,224,0.8)'));
  c.fillStyle='#9bb07a'; layer(c,t,45,640,3,(x,i)=>{ c.beginPath(); c.moveTo(x,H); c.quadraticCurveTo(x+160,H-120-(i%2)*40,x+320,H); c.fill(); c.lineWidth=3; c.strokeStyle='rgba(30,20,10,0.4)'; c.stroke(); });
  c.fillStyle='#6f9fb0'; c.fillRect(0,H-40,W,40); c.strokeStyle='rgba(255,255,255,0.6)'; c.lineWidth=3; layer(c,t,160,80,18,(x)=>{ c.beginPath(); c.arc(x,H-30,14,Math.PI*1.1,Math.PI*1.9); c.stroke(); });
  layer(c,t,120,520,4,(x,i)=>Art.cloud(c,x,260+(i%3)*110,1.0));
};
Art.BGL.sky2=function(c,t){
  c.drawImage(grad('sky2','#e8a878','#f6dcb0'),0,0);
  Art.circ(c,900,360,120,'rgba(255,200,120,0.6)',0); Art.circ(c,900,360,90,'#ffcf7a',4);
  c.fillStyle='#b87a5a'; layer(c,t,25,300,6,(x,i)=>{ const h=120+((i*53)%90); c.fillRect(x,H-60-h,90,h+60); c.fillRect(x+30,H-90-h,20,30); for(let k=0;k<4;k++){ c.fillStyle='rgba(255,230,160,0.6)'; c.fillRect(x+12+(k%2)*40,H-40-h+Math.floor(k/2)*40,18,18); c.fillStyle='#b87a5a'; } });
  layer(c,t,70,460,4,(x,i)=>{ c.save(); c.translate(x,120+(i%2)*80); c.rotate(-0.05); Art.rrect(c,-80,-22,160,44,4,'#f3ead8',3); c.fillStyle='rgba(40,30,20,0.4)'; for(let k=0;k<4;k++) c.fillRect(-66,-12+k*8,120-(k%2)*30,3); c.restore(); });
  layer(c,t,150,560,4,(x,i)=>Art.cloud(c,x,300+(i%3)*100,0.9,'rgba(251,236,214,0.9)'));
};
})();
