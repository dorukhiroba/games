/* Reel Rumble — boot, scaling, scene manager with iris transition, fixed-step loop */
(function(){
'use strict';
const cv=document.getElementById('game'), c=cv.getContext('2d'), In=RR.Input, W=RR.W, H=RR.H;
let scale=1, dpr=1;
function resize(){
  dpr=Math.min(2,window.devicePixelRatio||1);
  scale=Math.min(innerWidth/W,innerHeight/H);
  cv.style.width=Math.floor(W*scale)+'px'; cv.style.height=Math.floor(H*scale)+'px';
  cv.width=Math.floor(W*scale*dpr); cv.height=Math.floor(H*scale*dpr);
}
addEventListener('resize',resize); resize();
RR.toggleFull=()=>{ try{ if(document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(()=>{}); }catch(e){} };
addEventListener('keydown',e=>{ const a=document.activeElement; if(a&&a.tagName==='INPUT') return; if(e.code==='KeyF'&&!e.repeat) RR.toggleFull(); });

let cur=null, curName=null, trans=null;
function swap(name,args){
  if(cur&&cur.leave) try{ cur.leave(); }catch(e){ console.error(e); }
  cur=RR.Scenes[name]; curName=name; RR.scene=cur; RR.sceneName=name; In.eat();
  try{ if(cur.enter) cur.enter(args||{}); }catch(e){ console.error(e); }
}
RR.go=function(name,args){
  if(!RR.Scenes[name]){ console.warn('no scene',name); return; }
  if(trans&&trans.phase==='close'){ trans.next=name; trans.args=args; return; }
  trans={phase:'close',t:0,next:name,args};
};
RR.onBlur=()=>{ if(curName==='fight'&&cur&&!cur.paused&&!cur.ended&&(cur.mode==='solo'||cur.mode==='local')) cur.setPause(true); };

function step(dt){
  RR.time=(RR.time||0)+dt; In.update(dt);
  if(trans){
    trans.t+=dt;
    if(trans.phase==='close'){ if(trans.t>=0.26){ swap(trans.next,trans.args); trans.phase='open'; trans.t=0; } else return; }
    else if(trans.t>=0.3) trans=null;
  }
  if(cur) try{ cur.update(dt); }catch(e){ console.error(e); }
}
function render(){
  c.setTransform(scale*dpr,0,0,scale*dpr,0,0);
  c.fillStyle='#000'; c.fillRect(0,0,W,H);
  if(cur) try{ c.save(); cur.draw(c); c.restore(); }catch(e){ console.error(e); c.restore(); }
  try{ RR.Art.filter(c,RR.time||0); }catch(e){}
  if(trans){
    const k=trans.phase==='close'?Math.min(1,trans.t/0.26):1-Math.min(1,trans.t/0.3), r=Math.max(0,(1-k)*820);
    c.save(); c.fillStyle='#0a0705'; c.beginPath(); c.rect(0,0,W,H); c.arc(W/2,H/2,r,0,Math.PI*2,true); c.fill('evenodd'); c.restore();
  }
}
let last=performance.now(), acc=0;
function tick(now){
  let dt=(now-last)/1000; last=now; if(dt>0.25) dt=0.25; if(dt<0) dt=0; acc+=dt; let n=0;
  while(acc>=RR.DT&&n<5){ acc-=RR.DT; n++; step(RR.DT); }
  if(n>=5) acc=0;
}
let lastRaf=performance.now();
function frame(now){ lastRaf=performance.now(); tick(now); render(); requestAnimationFrame(frame); }
// keep simulating during online play when rAF stalls (background tab / hidden window)
setInterval(()=>{ const now=performance.now(); if(RR.S&&RR.S.mode==='online'&&now-lastRaf>120) tick(now); },16);
swap('title');
requestAnimationFrame(frame);
if(document.fonts&&document.fonts.load){ document.fonts.load("40px 'Rye'").catch(()=>{}); document.fonts.load("20px 'Courier Prime'").catch(()=>{}); }
window.addEventListener('error',e=>{ console.error('Hata:',e.message); });
})();
