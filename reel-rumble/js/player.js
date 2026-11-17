/* Reel Rumble — players: movement, jump, dash, parry, shooting, EX, supers, weapons */
(function(){
'use strict';
const U=RR.U, GY=RR.GROUND;
const RUN=340, JUMP=1000, GRAV=2700, MAXF=1400, DASHV=820, DASHT=0.26;
const P = RR.PlayerSys = {};
const Wp = RR.Weapons = {};
const F = ()=>RR.Fight;

P.create = function(id,load,x){
  const L = load || RR.defaultLoad(id), charm = L.charm||null;
  const mhp = 3+(charm==='heart'?1:charm==='heart2'?2:0);
  return {id,char:L.char||'bobbin',x,y:GY,vx:0,vy:0,face:1,onGround:true,duck:false,dashT:0,dashCD:0,airDash:false,
    parryT:0,canParry:false,invT:0,hurtT:0,hp:mhp,mhp,sup:0,shootCD:0,weapons:[(L.w&&L.w[0])||'ink',(L.w&&L.w[1])||null],wslot:0,
    supId:L.sup||'beam',charm,dead:false,gone:false,aimX:1,aimY:0,runT:0,landT:0,exT:0,superT:0,starT:0,shootT:0,charge:0,chargeFull:false,
    shield:charm==='tin',dmul:charm==='heart'?0.95:charm==='heart2'?0.9:1,dropT:0,jumpHeld:false,revivable:false,plat:null,
    st:{parries:0,supUsed:0,dmg:0,hits:0},tf:0};
};
P.hb = p => p.duck ? {x:p.x-20,y:p.y-42,w:40,h:42} : {x:p.x-17,y:p.y-74,w:34,h:74};
P.muzzle = p => ({x:p.x+p.face*6+p.aimX*50, y:(p.duck?p.y-34:p.y-56)+p.aimY*50});

P.update = function(p,G,ctrl,dt){
  p.invT=Math.max(0,p.invT-dt); p.hurtT=Math.max(0,p.hurtT-dt); p.landT=Math.max(0,p.landT-dt);
  p.exT=Math.max(0,p.exT-dt); p.dropT=Math.max(0,p.dropT-dt); p.dashCD=Math.max(0,p.dashCD-dt);
  p.parryT=Math.max(0,p.parryT-dt); p.starT=Math.max(0,p.starT-dt); p.shootCD-=dt; p.ribT=Math.max(0,(p.ribT||0)-dt);
  if(p.dead){
    if(!p.gone){ p.y-=48*dt; p.x+=Math.sin(G.t*2+p.id)*30*dt; if(p.y<-160) p.gone=true; }
    p.revivable=!p.gone && G.players.some(o=>o!==p&&!o.dead);
    return;
  }
  if(p.superT>0){ p.superT-=dt; p.vx=0; p.vy=0; p.shootT=0; return; }
  const inp = G.state==='fight' ? ctrl : null;
  const H=n=>inp?inp.held(n):false, PR=n=>inp?inp.pressed(n):false;
  const h=(H('right')?1:0)-(H('left')?1:0), v=(H('down')?1:0)-(H('up')?1:0), lock=H('lock');
  if(h&&p.dashT<=0&&p.hurtT<=0){ p.face=h; p.tf|=1; }
  p.duck = p.onGround && v>0 && !lock && p.dashT<=0;
  if(p.duck) p.tf|=64; if(lock) p.tf|=128;
  // aim
  let ax=0, ay=0;
  if(v<0){ ay=-1; ax=h; } else if(v>0&&(!p.onGround||lock)){ ay=1; ax=h; } else ax=h||p.face;
  if(!ax&&!ay) ax=p.face;
  const al=Math.hypot(ax,ay); p.aimX=ax/al; p.aimY=ay/al;
  // horizontal
  if(p.dashT>0){ p.dashT-=dt; p.vx=p.face*DASHV; p.vy=0; if(p.dashT<=0) p.vx=0; if(Math.random()<0.5) F().fx(G,'dust',p.x-p.face*20,p.y-20,{life:0.3}); }
  else if(p.hurtT>0){ p.vx*=0.92; }
  else p.vx = (!lock&&!p.duck) ? h*RUN : 0;
  // jump / parry / drop-through
  if(PR('jump')&&p.hurtT<=0){
    if(p.onGround&&p.plat&&!p.plat.solid&&v>0){ p.dropT=0.25; p.onGround=false; p.y+=3; p.plat=null; }
    else if(p.onGround){ p.vy=-JUMP; p.onGround=false; p.canParry=true; p.jumpHeld=true; p.duck=false; p.tf|=2; F().sfx(G,'jump'); F().fx(G,'dust',p.x,p.y,{n:2}); }
    else if(p.canParry&&p.parryT<=0&&p.dashT<=0){ p.parryT=p.charm==='glove'?0.36:0.24; p.canParry=false; }
  }
  if(!H('jump')){ if(p.jumpHeld&&p.vy<-380){ p.vy=-380; } p.jumpHeld=false; }
  // dash
  if(PR('dash')&&p.dashT<=0&&p.dashCD<=0&&!(p.airDash&&!p.onGround)&&p.hurtT<=0){
    p.dashT=DASHT; p.dashCD=DASHT+0.12; if(!p.onGround) p.airDash=true; p.vy=0; p.parryT=0; p.duck=false; p.tf|=4;
    F().sfx(G,'dash'); F().fx(G,'speed',p.x-p.face*20,p.y-40,{life:0.25});
  }
  // gravity + integrate
  if(p.dashT<=0){ p.vy+=GRAV*dt; if(p.exT>0.14&&!p.onGround) p.vy=Math.min(p.vy,40); }
  if(p.vy>MAXF) p.vy=MAXF;
  const py=p.y; p.x+=p.vx*dt; p.y+=p.vy*dt;
  let landed=false, plat=null;
  if(!G.noFloor&&p.y>=GY){ p.y=GY; landed=true; }
  else if(p.vy>=0&&p.dropT<=0){ for(const pl of G.plats){ if(py<=pl.y+1&&p.y>=pl.y&&p.x>pl.x-10&&p.x<pl.x+pl.w+10){ p.y=pl.y; landed=true; plat=pl; break; } } }
  if(landed){ if(!p.onGround){ p.landT=0.1; F().fx(G,'dust',p.x,p.y,{n:2}); } p.onGround=true; p.vy=0; p.airDash=false; p.canParry=false; p.parryT=0; p.plat=plat; }
  else { p.onGround=false; p.plat=null; }
  p.x=U.clamp(p.x,G.minX!=null?G.minX:24,G.maxX!=null?G.maxX:RR.W-24);
  if(p.onGround&&Math.abs(p.vx)>10) p.runT+=dt;
  // weapons
  if(PR('swap')&&p.weapons[1]){ p.wslot^=1; p.charge=0; p.chargeFull=false; F().sfx(G,'move'); }
  const wid=p.weapons[p.wslot], canAct=p.dashT<=0&&p.hurtT<=0&&p.exT<=0;
  if(wid==='charge'){
    if(H('shoot')&&canAct){ p.charge+=dt; if(p.charge>=0.75&&!p.chargeFull){ p.chargeFull=true; F().sfx(G,'charge'); } p.tf|=8; }
    else if(p.charge>0){ if(canAct&&p.shootCD<=0) Wp.chargeShot(p,G,p.charge); p.charge=0; p.chargeFull=false; }
  } else if(H('shoot')&&canAct&&p.shootCD<=0){ Wp.fire(p,G); p.tf|=8; }
  p.shootT = H('shoot') ? 0.12 : Math.max(0,p.shootT-dt);
  // EX / super
  if(PR('ex')&&canAct&&p.sup>=1){
    if(p.sup>=5&&p.supId) P.startSuper(p,G);
    else { p.sup-=1; p.st.supUsed+=1; p.exT=0.32; p.tf|=32; Wp.ex(p,G); if(p.onGround) p.vx=-p.face*60; }
  }
  if(p.charm==='coffee') p.sup=Math.min(5,p.sup+dt*0.045);
};

P.startSuper = function(p,G){
  const f=F(); p.sup=0; p.st.supUsed+=5; p.tf|=256; p.parryT=0; p.dashT=0;
  f.sfx(G,'super'); f.shake(G,14); f.rumble(G,p.id,0.9,400); f.fx(G,'ring',p.x,p.y-50,{col:'#ffd23a',s:2.5,life:0.6}); G.hitstop=Math.max(G.hitstop,0.15);
  if(p.supId==='star'){ p.superT=0.5; p.starT=6; }
  else if(p.supId==='reel'){ p.superT=0.6; f.ps(G,{k:'reel',x:p.x-p.face*30,y:GY-92,vx:p.face*720,vy:0,r:92,dmg:30,o:p.id,life:6,pierce:true,hitcd:0.1,sup:true,turns:1,keep:true}); }
  else { p.superT=1.35; f.ps(G,{k:'beam',x:p.x,y:p.y-56,x0:p.x,x1:p.x,h:110,vx:0,vy:0,r:1,dmg:26,o:p.id,life:1.35,pierce:true,hitcd:0.1,sup:true,beam:true,keep:true}); f.sfx(G,'beam'); }
};

P.hurt = function(p,G){
  const f=F();
  if(p.dead||p.invT>0||p.superT>0||p.starT>0) return false;
  if(p.dashT>0&&p.charm==='smoke') return false;
  if(p.shield){ p.shield=false; p.invT=1.4; f.fx(G,'ring',p.x,p.y-40,{col:'#b8bcc2',s:1.5}); f.fx(G,'debris',p.x,p.y-50,{n:5,col:'#b8bcc2'}); f.sfx(G,'tink'); return true; }
  p.st.hits++; p.invT=2; p.hurtT=0.35; p.vy=-520; p.vx=-p.face*220; p.dashT=0; p.parryT=0; p.onGround=false; p.charge=0; p.chargeFull=false;
  f.sfx(G,'hurt'); f.shake(G,10); f.fx(G,'hit',p.x,p.y-40,{s:2,col:'#ff8a8a'}); G.hitstop=Math.max(G.hitstop,0.08); f.rumble(G,p.id,0.75,220);
  if(G.noDeath&&p.hp<=1) return true;
  p.hp--;
  if(p.hp<=0){ p.dead=true; p.vx=p.vy=0; p.y-=30; f.sfx(G,'boom'); f.rumble(G,p.id,1,450); f.fx(G,'puff',p.x,p.y-30,{n:6,s:1.4}); }
  return true;
};
P.parry = function(p,G){
  const f=F(); p.vy=-900; p.jumpHeld=false; p.canParry=true; p.parryT=0; p.airDash=false; p.sup=Math.min(5,p.sup+1); p.st.parries++; p.tf|=16;
  p.invT=Math.max(p.invT,0.25); G.hitstop=Math.max(G.hitstop,0.12); f.sfx(G,'parry'); f.rumble(G,p.id,0.35,90); f.fx(G,'ring',p.x,p.y-40,{s:1.4}); f.fx(G,'spark',p.x,p.y-40,{n:6,col:'#ff9ccc'});
};
P.revive = function(p,o,G){
  const f=F(); p.dead=false; p.gone=false; p.hp=1; p.invT=2.5; p.vy=0; p.vx=0; p.revivable=false; G.revives=(G.revives||0)+1;
  o.vy=-900; o.canParry=true; o.parryT=0; o.jumpHeld=false; f.sfx(G,'revive'); f.rumble(G,p.id,0.5,200); f.rumble(G,o.id,0.4,150); f.fx(G,'ring',p.x,p.y-40,{s:2,col:'#ff9ccc'}); f.fx(G,'conf',p.x,p.y-40,{n:12,col:'#ff5fa8'});
};

/* ---------- weapons ---------- */
Wp.fire = function(p,G){
  const f=F(), w=p.weapons[p.wslot], m=P.muzzle(p), ax=p.aimX, ay=p.aimY, base=Math.atan2(ay,ax);
  switch(w){
    case 'spread': [-0.32,-0.16,0,0.16,0.32].forEach(d=>{ const a=base+d+U.rnd(-0.05,0.05); f.ps(G,{k:'spread',x:m.x,y:m.y,vx:Math.cos(a)*1100,vy:Math.sin(a)*1100,r:10,dmg:1.75,o:p.id,life:0.27}); }); p.shootCD=0.13; break;
    case 'homing': f.ps(G,{k:'homing',x:m.x,y:m.y,vx:ax*650+U.rnd(-90,90),vy:ay*650+U.rnd(-150,150),r:10,dmg:3,o:p.id,life:1.8,home:7,spd:860}); p.shootCD=0.13; break;
    case 'bounce': f.ps(G,{k:'bounce',x:m.x,y:m.y,vx:(ax||p.face*0.3)*650,vy:ay*500-420,r:12,dmg:10,o:p.id,life:2.2,grav:1600,bn:2}); p.shootCD=0.28; break;
    case 'boomer': f.ps(G,{k:'boomer',x:m.x,y:m.y,vx:ax*980,vy:ay*980,r:15,dmg:6,o:p.id,life:2,pierce:true,ret:0.36,hitcd:0.15}); p.shootCD=0.34; break;
    default: f.ps(G,{k:'ink',x:m.x,y:m.y+U.rnd(-4,4),vx:ax*1400,vy:ay*1400,r:10,dmg:4,o:p.id,life:1}); p.shootCD=0.1;
  }
  f.sfx(G,'shoot');
};
Wp.chargeShot = function(p,G,c){
  const f=F(), m=P.muzzle(p);
  if(c>=0.75){ f.ps(G,{k:'charge',x:m.x,y:m.y,vx:p.aimX*1150,vy:p.aimY*1150,r:28,dmg:36,o:p.id,life:1.2}); f.sfx(G,'ex'); f.fx(G,'puff',m.x,m.y,{s:0.8}); }
  else { f.ps(G,{k:'charge',x:m.x,y:m.y,vx:p.aimX*1300,vy:p.aimY*1300,r:10,dmg:6,o:p.id,life:1}); f.sfx(G,'shoot'); }
  p.shootCD=0.18;
};
Wp.ex = function(p,G){
  const f=F(), w=p.weapons[p.wslot], m=P.muzzle(p), ax=p.aimX, ay=p.aimY, base=Math.atan2(ay,ax);
  const S=o=>f.ps(G,Object.assign({x:m.x,y:m.y,o:p.id,ex:true},o));
  switch(w){
    case 'spread': for(let i=0;i<7;i++){ const a=base-0.5+i*(1/6); S({k:'xspread',vx:Math.cos(a)*1000,vy:Math.sin(a)*1000,r:17,dmg:6,life:0.5}); } break;
    case 'homing': [-0.6,0,0.6].forEach(d=>{ const a=base+d; S({k:'xhoming',vx:Math.cos(a)*500,vy:Math.sin(a)*500,r:18,dmg:12,home:5,spd:720,life:3}); }); break;
    case 'charge': S({k:'xbomb',vx:ax*700,vy:ay*700-220,grav:900,r:20,dmg:42,life:1.6,bomb:true}); break;
    case 'bounce': S({k:'xbounce',vx:(ax||p.face*0.3)*720,vy:ay*500-520,grav:1500,bn:4,r:32,dmg:9,pierce:true,hitcd:0.12,life:3}); break;
    case 'boomer': [0,Math.PI].forEach(a0=>S({k:'xring',x:p.x,y:p.y-50,vx:0,vy:0,orbit:true,oa:a0,r:22,dmg:7,pierce:true,hitcd:0.15,life:2.4,blocks:true})); break;
    default: S({k:'xink',vx:ax*900,vy:ay*900,r:34,dmg:9,pierce:true,hitcd:0.08,maxHits:4,life:1.6});
  }
  f.sfx(G,'ex'); f.fx(G,'puff',m.x,m.y,{n:2}); f.shake(G,4); f.rumble(G,p.id,0.3,80);
};
})();
