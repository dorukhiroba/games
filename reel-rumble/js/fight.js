/* Reel Rumble — fight engine: state, collisions, phases, grading, net snapshots */
(function(){
'use strict';
const U=RR.U, Art=RR.Art, GY=RR.GROUND, W=RR.W;
const F = RR.Fight = {};
RR.BOSS = RR.BOSS || {};
RR.MUPD = {}; RR.MDRAW = {}; RR.EUPD = {}; RR.PUPD = {};

/* ---------- boss helper toolkit ---------- */
const BU = RR.BU = {
  cross:(a,T)=>a.pt<=T&&a.t>T,
  every(a,start,int,count){ for(let i=0;i<count;i++){ const T=start+i*int; if(a.pt<=T&&a.t>T) return i; } return -1; },
  tgt(G,x,y){ let best=null,bd=1e9; G.players.forEach(p=>{ if(p.dead) return; const d=Math.abs(p.x-x)+Math.abs(p.y-y); if(d<bd){bd=d;best=p;} }); return best||{x:400,y:GY,dead:true}; },
  es(G,o){ const e=Object.assign({r:14,t:0,a:0,vx:0,vy:0},o); G.es.push(e); return e; },
  mn(G,o){ const m=Object.assign({r:24,t:0,hp:10,vx:0,vy:0,flash:0},o); m.id='m'+(G.nid++); G.mn.push(m); return m; },
  lob(x0,y0,tx,ty,T,g){ return {vx:(tx-x0)/T, vy:(ty-y0-0.5*g*T*T)/T}; },
  pinkN(a,n){ a.n=(a.n||0)+1; return a.n%n===0; },
  run(b,G,dt,def){
    if(G.state!=='fight'||b.trans>0||b.hp<=0) return;
    if(b.atk){ const a=b.atk; a.pt=a.t; a.t+=dt; if(def.atk[a.id](b,G,dt,a)){ b.atk=null; b.cd=(def.cool?def.cool[b.phase]:1.1); } }
    else { b.cd-=dt*G.D.rate; if(b.cd<=0){ const list=def.pattern[b.phase]; let id=list[0], k=0; do{ id=U.pick(list); k++; }while(list.length>1&&id===b.last&&k<10); b.last=id; b.atk={id,t:0,pt:-1e-6,n:0}; } }
  }
};

/* ---------- emitters (mirrored to online client) ---------- */
F.sfx=(G,n)=>{ if(G.mode!=='client') RR.Audio.sfx(n); if(G.mode==='host') G.ev.push(['s',n]); };
F.fx=(G,k,x,y,o)=>{ Art.fxSpawn(G.fx,k,x,y,o); if(G.mode==='host') G.ev.push(['f',k,Math.round(x),Math.round(y),o||0]); };
F.shake=(G,a)=>{ G.shake=Math.max(G.shake,a); if(G.mode==='host') G.ev.push(['k',a]); };
F.ps=(G,o)=>{ const s=Object.assign({t:0,a:0},o); s._hits={}; s.hitN=0; G.ps.push(s); return s; };
F.banner=(G,txt,dur,o)=>{ G.banner={txt,t:0,dur:dur||1.6,o:o||{}}; };

F.create = function(o){
  const def=RR.BOSS[o.boss], D=RR.DIFFS[o.diff||0];
  const G={bossId:o.boss,diff:o.diff||0,D,mode:o.mode||'solo',t:0,state:'intro',st:0,ps:[],es:[],mn:[],fx:[],ev:[],
    plats:(def.plats||[]).map(p=>Object.assign({},p)),hitstop:0,shake:0,players:[],ctrls:o.ctrls||[],nid:1,time:0,over:null,banner:null,slow:1,noDeath:!!def.noDeath,tut:!!def.tutorial};
  const PS=PSof(G); G.camX=0; G.coins=[]; G.coinIds=[]; G.coinsGot=0; G.revives=0; if(def.run) G.noFloor=true;
  (o.loads||[null]).forEach((l,i)=>{ const p=PS.create(i,l,i===0?180:300); G.players.push(p); });
  G.boss={id:o.boss,x:0,y:0,hp:1,mhp:1,phase:0,trans:0,cd:1.6,atk:null,flash:0,t:0,last:null};
  const mh=Math.round(def.hp*(def.noScale?1:D.hp)); G.boss.hp=G.boss.mhp=mh; def.init(G.boss,G);
  G.ready=false;
  return G;
};
const PSof = G => (RR.BOSS[G.bossId]&&RR.BOSS[G.bossId].plane) ? RR.PlaneSys : RR.PlayerSys;
F.PSof = PSof;
const say = t => { if(RR.say) RR.say(t); };

F.update = function(G,dt){
  if(G.mode==='client') return;
  G.ctrls.forEach(c=>c&&c.poll());
  Art.fxStep(G.fx,dt);
  if(G.banner){ G.banner.t+=dt; if(G.banner.t>G.banner.dur) G.banner=null; }
  G.shake=Math.max(0,G.shake-dt*40);
  if(G.hitstop>0){ G.hitstop-=dt; return; }
  dt*=G.slow; G.t+=dt; G.st+=dt;
  const def=RR.BOSS[G.bossId], b=G.boss;
  if(G.state==='intro'){
    if(!G.ready&&G.st>1.1){ G.ready=true; F.banner(G,def.introTxt||'HAZIR MISIN?',1.2,{size:80}); F.sfx(G,'ready'); say(def.introTxt||'Hazır mısın?'); }
    if(G.st>2.3){ G.state='fight'; G.st=0; F.banner(G,def.goTxt||'MOTOR!',0.9); F.sfx(G,'select'); say(def.goTxt||'Motor!'); }
  }
  if(G.state==='fight') G.time+=dt;
  const PSU=PSof(G); G.players.forEach((p,i)=>PSU.update(p,G,G.ctrls[i],dt));
  b.t+=dt; b.flash=Math.max(0,b.flash-dt); if(b.trans>0) b.trans=Math.max(0,b.trans-dt);
  def.update(b,G,dt);
  // phase change
  const th=def.phases||[];
  if(G.state==='fight'&&b.phase<th.length&&b.hp<=b.mhp*th[b.phase]){
    b.phase++; b.trans=def.transT||1.6; b.atk=null; b.cd=0.8;
    G.es.forEach(e=>{ if(!e.keep){ e.dead=true; F.fx(G,'puff',e.x,e.y,{s:0.6}); } });
    if(def.onPhase) def.onPhase(b,G); F.sfx(G,'phase'); F.shake(G,14);
  }
  if(G.state==='fight'&&b.hp<=0&&!def.noDeath){
    b.hp=0; G.state='ko'; G.st=0; G.hitstop=0.35; G.es.forEach(e=>e.dead=true); G.mn.forEach(m=>m.dead=true);
    F.sfx(G,'ko'); F.shake(G,20); F.banner(G,'KES! FİLM BİTTİ!',2.6,{size:92}); say('Kes! Film bitti!'); if(def.onKO) def.onKO(b,G);
  }
  if(G.state==='ko'){ G.slow=G.st<1.2?0.45:1; if(Math.random()<0.25){ const hb=(def.hurt(b)[0])||{x:b.x-50,y:b.y-50,w:100,h:100}; F.fx(G,'boom',hb.x+Math.random()*hb.w,hb.y+Math.random()*hb.h,{s:U.rnd(0.6,1.4)}); if(Math.random()<0.4) F.sfx(G,'small'); } if(G.st>3.4){ G.state='done'; G.over={won:true}; } }
  if(G.state==='fight'&&G.players.every(p=>p.dead)){ G.state='lost'; G.st=0; F.banner(G,'YENİLDİN!',2.5,{size:100,color:'#ff9a8a'}); F.sfx(G,'ko'); say('Yenildin!'); }
  if(G.state==='lost'&&G.st>2.2){ G.state='done'; G.over={won:false}; }
  updShots(G,dt); updEnemy(G,dt); updMinions(G,dt); collide(G,dt);
  G.ps=G.ps.filter(s=>!s.dead); G.es=G.es.filter(e=>!e.dead); G.mn=G.mn.filter(m=>!m.dead);
};

/* ---------- player shots ---------- */
function targets(G){
  const out=[]; const b=G.boss, def=RR.BOSS[G.bossId];
  if(b.hp>0&&G.state==='fight'&&!b.inv) def.hurt(b).forEach(r=>out.push({id:'boss',r,cx:r.x+r.w/2,cy:r.y+r.h/2}));
  G.mn.forEach(m=>{ if(!m.dead&&!m.inv) out.push({id:m.id,m,r:{x:m.x-m.r,y:m.y-m.r,w:m.r*2,h:m.r*2},cx:m.x,cy:m.y}); });
  return out;
}
function updShots(G,dt){
  const tg=targets(G);
  G.ps.forEach(s=>{
    s.t+=dt; if(s.life!=null){ s.life-=dt; if(s.life<=0){ if(s.bomb) explode(G,s); s.dead=true; return; } }
    const own=G.players[s.o];
    const cx=G.camX||0;
    if(s.beam){ if(!own||own.dead){ s.dead=true; return; } s.y=own.y-(own.plane?0:56); s.x0=own.x+own.face*40; s.x1=cx+(own.face>0?W+40:-40); s.x=(s.x0+s.x1)/2; return; }
    if(s.orbit&&own){ s.oa+=dt*7; s.x=own.x+Math.cos(s.oa)*90; s.y=own.y-50+Math.sin(s.oa)*90; return; }
    if(s.home&&tg.length){ let best=null,bd=1e9; tg.forEach(t=>{ const d=U.dist(s.x,s.y,t.cx,t.cy); if(d<bd){bd=d;best=t;} }); if(best){ const a=Math.atan2(s.vy,s.vx), ta=U.ang(s.x,s.y,best.cx,best.cy), na=a+U.clamp(U.angDiff(a,ta),-s.home*dt,s.home*dt); s.vx=Math.cos(na)*s.spd; s.vy=Math.sin(na)*s.spd; } }
    if(s.ret!=null&&s.t>s.ret&&own){ const a=U.ang(s.x,s.y,own.x,own.y-50); s.vx=U.lerp(s.vx,Math.cos(a)*1000,0.12); s.vy=U.lerp(s.vy,Math.sin(a)*1000,0.12); if(s.t>s.ret+0.15&&U.dist(s.x,s.y,own.x,own.y-50)<40){ s.dead=true; return; } }
    if(s.grav) s.vy+=s.grav*dt;
    s.x+=s.vx*dt; s.y+=s.vy*dt;
    if(s.bn!=null&&s.y>GY-s.r){ s.y=GY-s.r; s.vy=-Math.abs(s.vy)*0.78; s.bn--; if(s.bn<0) s.dead=true; }
    if(s.bomb&&s.y>GY-s.r){ explode(G,s); s.dead=true; }
    if(s.k==='reel'){ if((s.vx>0&&s.x>cx+W+120)||(s.vx<0&&s.x<cx-120)){ if(s.turns>0){ s.turns--; s.vx*=-1; } else s.dead=true; } return; }
    if(s.upd&&RR.PUPD[s.upd]) RR.PUPD[s.upd](s,G,dt);
    if(s.x<cx-120||s.x>cx+W+120||s.y<-200||s.y>RR.H+60) s.dead=true;
  });
}
function explode(G,s){
  F.fx(G,'boom',s.x,s.y,{s:1.6}); F.sfx(G,'boom'); F.shake(G,8);
  targets(G).forEach(t=>{ if(U.circRect(s.x,s.y,s.blast||150,t.r)) dmgTarget(G,s,t); });
}
function dmgTarget(G,s,t){
  const p=G.players[s.o], dmg=s.dmg*(p?p.dmul:1);
  if(t.id==='boss'){ const b=G.boss; if(b.trans>0||b.hp<=0){ F.fx(G,'hit',s.x,s.y,{s:0.5}); return; }
    b.hp-=dmg; b.flash=0.05; if(p){ p.st.dmg+=dmg; if(!s.ex&&!s.sup) p.sup=Math.min(5,p.sup+dmg/160); } }
  else { const m=t.m; m.hp-=dmg; m.flash=0.05; if(m.hp<=0&&!m.dead){ m.dead=true; F.fx(G,'boom',m.x,m.y,{s:0.7}); F.fx(G,'debris',m.x,m.y,{n:4,col:m.col}); F.sfx(G,'small'); } if(p&&!s.ex&&!s.sup) p.sup=Math.min(5,p.sup+dmg/200); }
  F.fx(G,'hit',s.x,s.y,{s:s.r>20?1.4:0.7}); F.sfx(G,'hit');
}

/* ---------- enemy bullets ---------- */
function updEnemy(G,dt){
  G.es.forEach(e=>{
    e.t+=dt;
    if(e.ay) e.vy+=e.ay*dt; if(e.ax) e.vx+=e.ax*dt;
    if(e.home){ const p=BU.tgt(G,e.x,e.y); const a=Math.atan2(e.vy,e.vx), ta=U.ang(e.x,e.y,p.x,p.y-40), na=a+U.clamp(U.angDiff(a,ta),-e.home*dt,e.home*dt), sp=e.spd||Math.hypot(e.vx,e.vy); e.vx=Math.cos(na)*sp; e.vy=Math.sin(na)*sp; }
    if(e.wave){ e.by=(e.by==null?e.y:e.by)+e.vy*dt; e.x+=e.vx*dt; e.y=e.by+Math.sin(e.t*e.wf+(e.wp||0))*e.wave; }
    else { e.x+=e.vx*dt; e.y+=e.vy*dt; }
    if(e.spin) e.a+=e.spin*dt;
    if(e.upd&&RR.EUPD[e.upd]) RR.EUPD[e.upd](e,G,dt);
    if(e.gnd&&e.y>=GY-(e.h?e.h/2:e.r)){ e.y=GY-(e.h?e.h/2:e.r);
      if(e.gnd==='bounce'){ e.vy=-Math.abs(e.vy)*0.6; if(Math.abs(e.vy)<120) e.dead=true; }
      else if(e.gnd==='roll'){ e.vy=0; }
      else if(RR.EUPD[e.gnd]) RR.EUPD[e.gnd](e,G,dt,true);
      else { e.dead=true; F.fx(G,'puff',e.x,GY-10,{s:0.7}); } }
    if(e.life!=null){ e.life-=dt; if(e.life<=0){ e.dead=true; if(e.onEnd&&RR.EUPD[e.onEnd]) RR.EUPD[e.onEnd](e,G,dt,true); } }
    const cx=G.camX||0;
    if(!e.keep&&(e.x<cx-250||e.x>cx+W+250||e.y>RR.H+150||e.y<-450)) e.dead=true;
  });
}
function updMinions(G,dt){ G.mn.forEach(m=>{ m.t+=dt; m.flash=Math.max(0,m.flash-dt); const f=RR.MUPD[m.k]; if(f) f(m,G,dt); else { m.x+=m.vx*dt; m.y+=m.vy*dt; } const cx=G.camX||0; if(m.x<cx-200||m.x>cx+W+(m.far||200)||m.y>RR.H+200) m.dead=true; }); }

/* ---------- collisions ---------- */
function eHits(e,R){
  if(e.shape==='rect'||e.w) return U.rectHit({x:e.x-e.w/2,y:e.y-e.h/2,w:e.w,h:e.h},R);
  if(e.k==='lbeam'){ const n=24; for(let i=0;i<=n;i++){ const x=U.lerp(e.x1,e.x2,i/n), y=U.lerp(e.y1,e.y2,i/n); if(U.circRect(x,y,e.w/2,R)) return true; } return false; }
  return U.circRect(e.x,e.y,e.r*0.82,R);
}
function collide(G,dt){
  const PS=PSof(G), def=RR.BOSS[G.bossId], b=G.boss, tg=targets(G);
  // player shots -> targets
  G.ps.forEach(s=>{
    if(s.dead||s.bomb&&false) return;
    if(s.blocks){ G.es.forEach(e=>{ if(!e.dead&&!e.keep&&!e.w&&!e.parry&&e.k!=='lbeam'&&U.dist(s.x,s.y,e.x,e.y)<s.r+e.r){ e.dead=true; F.fx(G,'puff',e.x,e.y,{s:0.5}); } }); }
    for(const t of tg){
      const hit = s.beam ? U.rectHit({x:Math.min(s.x0,s.x1),y:s.y-s.h/2,w:Math.abs(s.x1-s.x0),h:s.h},t.r) : U.circRect(s.x,s.y,s.r,t.r);
      if(!hit) continue;
      if(s.bomb){ explode(G,s); s.dead=true; return; }
      if(s.pierce){ const last=s._hits[t.id]; if(last!=null&&s.t-last<s.hitcd) continue; s._hits[t.id]=s.t; s.hitN++; dmgTarget(G,s,t); if(s.maxHits&&s.hitN>=s.maxHits){ s.dead=true; return; } }
      else { dmgTarget(G,s,t); s.dead=true; return; }
    }
  });
  if(G.state!=='fight') return;
  // enemies -> players
  G.players.forEach(p=>{
    if(p.dead) return;
    const R=PS.hb(p), PR={x:R.x-12,y:R.y-12,w:R.w+24,h:R.h+24};
    for(const e of G.es){
      if(e.dead||e.harmless) continue;
      const auto=p.charm==='ribbon'&&!p.onGround&&!(p.ribT>0);
      if(e.parry&&(p.parryT>0||auto)&&eHits(e,PR)){ if(auto&&p.parryT<=0) p.ribT=0.6; PS.parry(p,G); if(!e.keep) e.dead=true; else { e.parryCD=1.2; e.harmless=true; } if(e.onParry&&RR.EUPD[e.onParry]) RR.EUPD[e.onParry](e,G,0,p); break; }
      if(e.soft) continue;
      if(eHits(e,R)){ if(PS.hurt(p,G)&&!e.pierce&&!e.w&&e.k!=='lbeam') e.dead=true; break; }
    }
    if(p.dead) return;
    for(const m of G.mn){
      if(m.dead||m.harmless) continue;
      const mr={x:m.x-m.r,y:m.y-m.r,w:m.r*2,h:m.r*2};
      if(m.parry&&p.parryT>0&&U.rectHit(mr,PR)){ PS.parry(p,G); m.dead=true; F.fx(G,'boom',m.x,m.y,{s:0.6}); break; }
      if(U.rectHit(mr,R)){ PS.hurt(p,G); break; }
    }
    if(!p.dead&&b.hp>0&&def.body) for(const r of def.body(b)){ if(U.rectHit(r,R)){ PS.hurt(p,G); break; } }
  });
  // revive ghosts
  G.players.forEach(p=>{ if(!p.dead||!p.revivable) return; G.players.forEach(o=>{ if(o!==p&&!o.dead&&o.parryT>0&&U.dist(o.x,o.y-40,p.x,p.y-40)<70) PS.revive(p,o,G); }); });
}

/* ---------- draw ---------- */
F.draw = function(c,G){
  const def=RR.BOSS[G.bossId], b=G.boss, t=G.t, set=RR.Save.d.set;
  c.save();
  if(set.shake&&G.shake>0) c.translate(U.rnd(-1,1)*G.shake,U.rnd(-1,1)*G.shake);
  Art.bg(c,def.bg,t,G);
  if(G.camX) c.translate(-Math.round(G.camX),0);
  G.plats.forEach(p=>{ if(!G.camX||(p.x<G.camX+W+50&&p.x+p.w>G.camX-50)) Art.plat(c,p,def.bg,t); });
  if(def.drawBack) def.drawBack(c,b,G);
  if(b&&b.id){ c.save(); if(b.flash>0) c.filter='brightness(1.7) saturate(0.5)'; def.draw(c,b,G); c.restore(); }
  G.mn.forEach(m=>{ c.save(); if(m.flash>0) c.filter='brightness(1.8)'; const d=RR.MDRAW[m.k]; if(d) d(c,m,G); else Art.circ(c,m.x,m.y,m.r,m.parry?Art.PINK:'#ccc',3); c.restore(); });
  G.es.forEach(e=>Art.ebullet(c,e,t));
  G.players.forEach(p=>(p.plane?Art.plane:Art.player)(c,p,t));
  G.ps.forEach(s=>Art.pshot(c,s,t));
  G.fx.forEach(f=>Art.fx(c,f));
  if(set.hitbox){ c.lineWidth=2; c.strokeStyle='lime'; G.players.forEach(p=>{ const r=PSof(G).hb(p); c.strokeRect(r.x,r.y,r.w,r.h); }); c.strokeStyle='cyan'; if(b.hp>0) def.hurt(b).forEach(r=>c.strokeRect(r.x,r.y,r.w,r.h)); c.strokeStyle='red'; if(def.body) def.body(b).forEach(r=>c.strokeRect(r.x,r.y,r.w,r.h)); G.es.forEach(e=>{ if(e.w) c.strokeRect(e.x-e.w/2,e.y-e.h/2,e.w,e.h); else { c.beginPath(); c.arc(e.x,e.y,e.r*0.82,0,6.28); c.stroke(); } }); }
  c.restore();
  Art.bgFront(c,def.bg,t);
  if(def.drawUI) def.drawUI(c,b,G);
  Art.hud(c,G);
  if(G.state==='intro'&&G.st<1.15&&Art.titleCard) Art.titleCard(c,def,G.st,G);
  if(G.banner) Art.banner(c,G.banner.txt,G.banner.t,G.banner.o);
};

/* ---------- results / grading ---------- */
F.results = function(G){
  const def=RR.BOSS[G.bossId], D=G.D, b=G.boss;
  const won=!!(G.over&&G.over.won);
  const hp=Math.max(0,...G.players.map(p=>p.dead?0:p.hp));
  const parries=G.players.reduce((a,p)=>a+p.st.parries,0), sup=G.players.reduce((a,p)=>a+p.st.supUsed,0);
  const par=def.par||120, time=G.time;
  const sTime = time<=par?25:25*Math.max(0,1-(time-par)/par);
  const sHp=Math.min(hp,3)/3*25, sPar=Math.min(parries,3)/3*20, sSup=def.run?(G.coinsGot||0)/5*20:Math.min(sup,6)/6*20, sDiff=D.score;
  const score=Math.round(sTime+sHp+sPar+sSup+sDiff);
  let gi = score>=92?9:score>=86?8:score>=80?7:score>=74?6:score>=68?5:score>=62?4:score>=55?3:score>=48?2:score>=40?1:0;
  if(G.diff===2&&score>=97) gi=10;
  const grade=RR.GRADES[gi];
  const hits=G.players.reduce((a,p)=>a+p.st.hits,0);
  const progress=def.run?U.clamp((G.camX||0)/Math.max(1,(def.length||W)-W),0,1):U.clamp(1-b.hp/b.mhp,0,1);
  return {boss:G.bossId,diff:G.diff,won,time,par,hp,parries,sup,score,grade,gi,progress,coins:0,first:false,phases:def.phases||[],
    run:!!def.run,plane:!!def.plane,coinsGot:G.coinsGot||0,coinIds:(G.coinIds||[]).slice(),revives:G.revives||0,supers:G.players.some(p=>p.tf&256),hits,coop:G.players.length>1,rush:!!(RR.S&&RR.S.rush)};
};
F.reward = function(res){
  const S=RR.Save.d; if(!res.won){ S.stats.deaths++; RR.Save.save(); if(RR.Ach) RR.Ach.onResult(res); return res; }
  if(RR.BOSS[res.boss].tutorial){ return res; }
  S.stats.wins++; const first=!S.beaten[res.boss]; S.beaten[res.boss]=true; res.first=first;
  S.paid[res.boss]=S.paid[res.boss]||[false,false,false];
  let coins=1;
  if(res.run){ S.runCoins=S.runCoins||{}; const got=S.runCoins[res.boss]=S.runCoins[res.boss]||[]; coins=0; res.coinIds.forEach(id=>{ if(!got.includes(id)){ got.push(id); coins++; } }); res.coinsTotal=got.length; }
  else if(!S.paid[res.boss][res.diff]){ coins=RR.DIFFS[res.diff].coin+(res.gi>=8?2:res.gi>=5?1:0); S.paid[res.boss][res.diff]=true; }
  res.coins=coins; S.coins+=coins;
  if(res.time>0){ S.best=S.best||{}; const k=res.boss+res.diff; if(!S.best[k]||res.time<S.best[k]) S.best[k]=res.time; }
  S.grades[res.boss]=S.grades[res.boss]||[null,null,null];
  const old=S.grades[res.boss][res.diff]; if(old==null||RR.GRADES.indexOf(old)<res.gi) S.grades[res.boss][res.diff]=res.grade;
  S.stats.parries+=res.parries; RR.Save.save(); if(RR.Ach) RR.Ach.onResult(res); return res;
};

/* ---------- net snapshots ---------- */
F.snap = function(G){
  const s={t:'s',st:G.state,ss:G.st,tt:G.t,tm:G.time,bn:G.banner,p:G.players,b:G.boss,ps:G.ps,es:G.es,mn:G.mn,pl:RR.BOSS[G.bossId].run?undefined:G.plats,ev:G.ev,sh:G.shake,cx:G.camX,co:G.coins,cg:G.coinsGot};
  G.ev=[]; return s;
};
F.apply = function(G,m){
  G.state=m.st; G.st=m.ss; G.t=m.tt; G.time=m.tm; G.banner=m.bn; G.players=m.p; G.boss=m.b; G.ps=m.ps; G.es=m.es; G.mn=m.mn; G.plats=m.pl||G.plats; G.camX=m.cx||0; G.coins=m.co||[]; G.coinsGot=m.cg||0;
  (m.ev||[]).forEach(e=>{ if(e[0]==='s') RR.Audio.sfx(e[1]); else if(e[0]==='f') Art.fxSpawn(G.fx,e[1],e[2],e[3],e[4]||undefined); else if(e[0]==='k') G.shake=Math.max(G.shake,e[1]); });
};
F.clientStep = function(G,dt){ Art.fxStep(G.fx,dt); G.shake=Math.max(0,G.shake-dt*40); };
})();
