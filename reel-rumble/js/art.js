/* Reel Rumble — art: drawing helpers, heroes, projectiles, fx, HUD, film filter */
(function(){
'use strict';
const U = RR.U, Art = RR.Art = {};
const OL = Art.OL = '#1a1210';
const PINK = Art.PINK = '#ff5fa8';
const TITLE = "'Rye', Georgia, serif", BODY = "'Courier Prime','Courier New',monospace";
Art.CREAM = '#f3e4c2';

/* ---------- primitives ---------- */
Art.ell = (c,x,y,rx,ry,fill,lw,rot)=>{ c.beginPath(); c.ellipse(x,y,Math.max(0.1,rx),Math.max(0.1,ry),rot||0,0,Math.PI*2); if(fill){c.fillStyle=fill;c.fill();} if(lw!==0){c.lineWidth=lw||4;c.strokeStyle=OL;c.stroke();} };
Art.circ = (c,x,y,r,fill,lw)=>Art.ell(c,x,y,r,r,fill,lw);
Art.rr = (c,x,y,w,h,r)=>{ if(w<0){x+=w;w=-w;} if(h<0){y+=h;h=-h;} r=Math.max(0,Math.min(r,w/2,h/2)); c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); };
Art.rrect = (c,x,y,w,h,r,fill,lw)=>{ Art.rr(c,x,y,w,h,r); if(fill){c.fillStyle=fill;c.fill();} if(lw!==0){c.lineWidth=lw||4;c.strokeStyle=OL;c.stroke();} };
Art.hose = (c,x1,y1,x2,y2,bend,w,col)=>{
  const mx=(x1+x2)/2, my=(y1+y2)/2, dx=x2-x1, dy=y2-y1, l=Math.hypot(dx,dy)||1;
  const cx=mx-dy/l*bend, cy=my+dx/l*bend;
  c.lineCap='round'; c.beginPath(); c.moveTo(x1,y1); c.quadraticCurveTo(cx,cy,x2,y2);
  c.strokeStyle=OL; c.lineWidth=w+5; c.stroke(); if(col){ c.strokeStyle=col; c.lineWidth=w; c.stroke(); }
};
Art.eye = (c,x,y,rx,ry,lx,ly,o)=>{
  o=o||{};
  if(o.closed){ c.beginPath(); c.lineWidth=3.5; c.strokeStyle=OL; c.lineCap='round'; if(o.happy){ c.arc(x,y+ry*0.3,rx*0.9,Math.PI*1.1,Math.PI*1.9); } else { c.moveTo(x-rx,y); c.lineTo(x+rx,y); } c.stroke(); return; }
  Art.ell(c,x,y,rx,ry,'#fffaf0',3);
  const px=x+lx*rx*0.35, py=y+ly*ry*0.3, pr=Math.min(rx,ry)*(o.small?0.4:0.62);
  Art.ell(c,px,py,pr*0.85,pr*1.15,OL,0);
  c.beginPath(); c.moveTo(px,py); c.arc(px,py,pr*1.2,-1.3,-0.55); c.closePath(); c.fillStyle='#fffaf0'; c.fill();
  if(o.angry){ c.beginPath(); c.lineWidth=5; c.strokeStyle=OL; c.lineCap='round'; c.moveTo(x-rx*1.1,y-ry*(o.angry>0?1.25:0.95)); c.lineTo(x+rx*1.1,y-ry*(o.angry>0?0.95:1.25)); c.stroke(); }
};
Art.glove = (c,x,y,r,rot)=>{ c.save(); c.translate(x,y); c.rotate(rot||0); Art.ell(c,0,0,r,r*0.9,'#fffaf0',3); c.beginPath(); c.moveTo(-r*0.6,-r*0.35); c.lineTo(-r*0.1,-r*0.35); c.moveTo(-r*0.6,0); c.lineTo(-r*0.1,0); c.lineWidth=2; c.stroke(); Art.ell(c,-r*0.95,0,r*0.35,r*0.6,'#fffaf0',3); c.restore(); };
Art.star = (c,x,y,r,fill,lw,rot,pts)=>{ pts=pts||5; c.beginPath(); for(let i=0;i<pts*2;i++){ const a=(rot||0)+i*Math.PI/pts-Math.PI/2, rr=i%2?r*0.45:r; c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);} c.closePath(); if(fill){c.fillStyle=fill;c.fill();} if(lw!==0){c.lineWidth=lw||3;c.strokeStyle=OL;c.stroke();} };
Art.heart = (c,x,y,s,fill,lw)=>{ c.beginPath(); c.moveTo(x,y+s*0.8); c.bezierCurveTo(x-s*1.3,y-s*0.1,x-s*0.6,y-s*1.1,x,y-s*0.35); c.bezierCurveTo(x+s*0.6,y-s*1.1,x+s*1.3,y-s*0.1,x,y+s*0.8); c.closePath(); c.fillStyle=fill; c.fill(); if(lw!==0){c.lineWidth=lw||3;c.strokeStyle=OL;c.stroke();} };
Art.text = (c,s,x,y,size,o)=>{
  o=o||{}; c.save(); c.font=(o.bold?'700 ':'')+size+'px '+(o.title?TITLE:BODY);
  c.textAlign=o.align||'center'; c.textBaseline=o.base||'middle'; c.lineJoin='round';
  if(o.shadow){ c.fillStyle=o.shadow; c.fillText(s,x+(o.sd||4),y+(o.sd||4)); }
  if(o.stroke){ c.lineWidth=o.sw||6; c.strokeStyle=o.stroke; c.strokeText(s,x,y); }
  c.fillStyle=o.color||'#2a1d14'; c.fillText(s,x,y); c.restore();
};
Art.wrap = (c,s,x,y,maxW,lh,size,o)=>{
  o=o||{}; c.save(); c.font=(o.bold?'700 ':'')+size+'px '+(o.title?TITLE:BODY);
  const lines=[]; String(s).split('\n').forEach(par=>{ let line=''; par.split(' ').forEach(w=>{ const t=line?line+' '+w:w; if(c.measureText(t).width>maxW&&line){lines.push(line);line=w;} else line=t; }); lines.push(line); });
  c.restore(); lines.forEach((l,i)=>Art.text(c,l,x,y+i*lh,size,o)); return lines.length*lh;
};
Art.panel = (c,x,y,w,h,o)=>{
  o=o||{}; c.save(); c.fillStyle='rgba(0,0,0,0.35)'; Art.rr(c,x+8,y+10,w,h,16); c.fill();
  Art.rrect(c,x,y,w,h,16,o.fill||Art.CREAM,5); Art.rr(c,x+9,y+9,w-18,h-18,10); c.lineWidth=2; c.strokeStyle=OL; c.stroke(); c.restore();
};
Art.banner = (c,s,t,o)=>{
  o=o||{}; const k=U.clamp(t/0.25,0,1), sc=U.easeBack(k);
  c.save(); c.translate(RR.W/2,o.y||RR.H/2-40); c.scale(sc,sc); c.rotate(o.rot||-0.04);
  Art.text(c,s,0,0,o.size||110,{title:true,color:o.color||'#fff3d6',stroke:OL,sw:14,shadow:'rgba(0,0,0,0.5)',sd:8}); c.restore();
};

/* ---------- heroes (original characters: Bobbin the spool, Bolt the bulb) ---------- */
function drawHead(c,p,t,mood){
  const blink=((t*0.45+p.id*0.37)%3.2)<0.09;
  if(p.char==='dugme'){
    c.save(); Art.rrect(c,-6,-76,12,14,3,'#f3e4c2',3);
    Art.ell(c,0,-103,32,31,'#2f9d6c',4); Art.ell(c,2,-103,25,24,'#5fd6a2',3);
    const holes=[[-13,-121],[17,-122],[-15,-85],[19,-84]]; holes.forEach(h=>Art.circ(c,h[0],h[1],3.8,'#17603e',2));
    c.beginPath(); c.moveTo(-13,-121); c.quadraticCurveTo(2,-132,17,-122); c.moveTo(-15,-85); c.quadraticCurveTo(2,-74,19,-84); c.lineWidth=2.5; c.strokeStyle='#d8343a'; c.stroke();
    c.beginPath(); c.arc(-10,-112,9,Math.PI*1.1,Math.PI*1.5); c.lineWidth=3; c.strokeStyle='rgba(255,255,255,0.7)'; c.stroke();
    faceAt(c,1,-106,mood,blink,p); c.restore();
  } else if(p.char==='kibrit'){
    c.save(); Art.rrect(c,-7,-84,14,24,3,'#e8c38a',3);
    c.beginPath(); c.moveTo(-2,-82); c.lineTo(-2,-62); c.moveTo(3,-80); c.lineTo(3,-64); c.lineWidth=1.5; c.strokeStyle='rgba(120,80,30,0.5)'; c.stroke();
    const hot=p.shootT>0||p.starT>0||p.superT>0, fl=hot?1.45:1, fk=Math.sin(t*22+p.id)*3;
    c.beginPath(); c.moveTo(-12,-128); c.bezierCurveTo(-19,-144,-6,-150,1,-130-26*fl-fk); c.bezierCurveTo(9,-148,19,-142,12,-128); c.closePath(); c.fillStyle='#ffb02e'; c.fill(); c.lineWidth=3; c.strokeStyle=Art.OL; c.stroke();
    c.beginPath(); c.moveTo(-6,-128); c.quadraticCurveTo(-6,-140,1,-128-16*fl-fk*0.6); c.quadraticCurveTo(7,-140,6,-128); c.closePath(); c.fillStyle='#fff3a0'; c.fill();
    Art.ell(c,0,-104,26,29,'#c8402a',4); Art.ell(c,-9,-116,7,5,'rgba(255,255,255,0.45)',0);
    faceAt(c,1,-104,mood,blink,p); c.restore();
  } else if(p.char==='bolt'){
    c.save(); Art.rrect(c,-12,-80,24,16,4,'#a7adb4',3);
    c.beginPath(); for(let i=0;i<3;i++){ c.moveTo(-12,-76+i*5); c.lineTo(12,-73+i*5);} c.lineWidth=2; c.stroke();
    Art.ell(c,0,-62,6,3,OL,0);
    const glow=p.shootT>0||p.starT>0||p.superT>0;
    c.beginPath(); c.moveTo(-13,-80); c.bezierCurveTo(-20,-88,-32,-96,-30,-108); c.arc(0,-108,30,Math.PI,0); c.bezierCurveTo(32,-96,20,-88,13,-80); c.closePath();
    const g=c.createRadialGradient(-8,-116,4,0,-104,36); g.addColorStop(0,'#ffffff'); g.addColorStop(1,glow?'#ffe46b':'#f7efc8');
    c.fillStyle=g; c.fill(); c.lineWidth=4; c.strokeStyle=OL; c.stroke();
    c.beginPath(); c.moveTo(-6,-82); c.lineTo(-6,-118); c.moveTo(6,-82); c.lineTo(6,-118); c.lineWidth=1.5; c.strokeStyle='rgba(60,40,20,0.6)'; c.stroke();
    c.beginPath(); for(let i=0;i<=6;i++){ c.lineTo(-6+i*2,-118-(i%2?6:0)); } c.lineWidth=2.5; c.strokeStyle=glow?'#ff8a00':'#b46a2a'; c.stroke();
    if(glow){ c.globalAlpha=0.25; Art.circ(c,0,-108,44,'#fff3a0',0); c.globalAlpha=1; }
    c.beginPath(); c.arc(-14,-118,8,Math.PI*1.1,Math.PI*1.5); c.lineWidth=3; c.strokeStyle='#fff'; c.stroke();
    faceAt(c,0,-100,mood,blink,p); c.restore();
  } else {
    c.save();
    Art.ell(c,0,-66,30,8,'#c9955a',4);
    c.fillStyle='#d8343a'; c.fillRect(-23,-112,46,46);
    c.save(); c.beginPath(); c.rect(-23,-112,46,46); c.clip(); c.strokeStyle='#9e1f25'; c.lineWidth=2;
    for(let i=-6;i<8;i++){ c.beginPath(); c.moveTo(-30,-112+i*7); c.lineTo(30,-104+i*7); c.stroke(); } c.restore();
    c.beginPath(); c.moveTo(-23,-112); c.lineTo(-23,-66); c.moveTo(23,-112); c.lineTo(23,-66); c.lineWidth=4; c.strokeStyle=OL; c.stroke();
    Art.ell(c,0,-112,30,8,'#d9a86c',4); Art.ell(c,0,-112,6,2,OL,0);
    c.beginPath(); c.moveTo(16,-110); c.bezierCurveTo(26,-122,10,-134,20,-140); c.bezierCurveTo(28,-146,34,-136,26,-132); c.lineWidth=3; c.strokeStyle='#d8343a'; c.stroke();
    faceAt(c,2,-92,mood,blink,p); c.restore();
  }
}
function faceAt(c,x,y,mood,blink,p){
  const ly= p.aimY||0;
  if(mood==='happy'){ Art.eye(c,x+2,y,6,9,0,0,{closed:true,happy:true}); Art.eye(c,x+16,y,6,9,0,0,{closed:true,happy:true}); }
  else if(blink&&mood!=='hurt'){ Art.eye(c,x+2,y,6,9,0,0,{closed:true}); Art.eye(c,x+16,y,6,9,0,0,{closed:true}); }
  else { const big=mood==='hurt'?1.25:1; Art.eye(c,x+2,y,6*big,9*big,0.8,ly,{small:mood==='hurt'}); Art.eye(c,x+16,y,6*big,9*big,0.8,ly,{small:mood==='hurt'}); }
  Art.ell(c,x+22,y+8,3.5,3,'#e88',2);
  c.beginPath(); c.lineWidth=3; c.strokeStyle=OL; c.lineCap='round';
  if(mood==='hurt'){ Art.ell(c,x+12,y+16,4,5,'#5a1010',2.5); }
  else if(mood==='grit'){ c.moveTo(x+4,y+15); c.lineTo(x+20,y+14); c.stroke(); }
  else { c.arc(x+12,y+10,8,0.25,Math.PI-0.5); c.stroke(); }
}
Art.player = function(c,p,t){
  if(p.dead){ Art.ghost(c,p,t); return; }
  const C=RR.CHARS[p.char]||RR.CHARS.bobbin;
  c.save();
  if(p.invT>0&&!p.starT&&!p.superT&&Math.floor(t*24)%2===0) c.globalAlpha*=0.3;
  if(p.dashT>0&&p.charm==='smoke') c.globalAlpha*=0.22;
  c.translate(p.x,p.y);
  if(p.starT>0){ c.save(); c.globalAlpha=0.35+0.2*Math.sin(t*30); Art.star(c,0,-60,90,'#fff3a0',0,t*3,8); c.restore(); }
  let sx=1,sy=1; const air=!p.onGround;
  if(p.duck){sx=1.18;sy=0.62;} else if(p.dashT>0){sx=1.28;sy=0.84;}
  else if(air){ const s=U.clamp(-p.vy/2600,-0.12,0.15); sy=1+s; sx=1-s*0.6; }
  else if(p.landT>0){ sy=1-p.landT*1.4; sx=1+p.landT*1.2; }
  c.scale(p.face*sx,sy);
  if(p.parryT>0){ c.translate(0,-50); c.rotate((t*22)%(Math.PI*2)); c.translate(0,50); }
  const run=!air&&Math.abs(p.vx)>20&&!p.duck, ph=p.runT*15;
  let f1x=-9,f1y=0,f2x=9,f2y=0;
  if(run){ f1x=Math.sin(ph)*17; f1y=-Math.max(0,Math.cos(ph))*12; f2x=-f1x; f2y=-Math.max(0,-Math.cos(ph))*12; }
  else if(air){ f1x=-13;f1y=-14;f2x=11;f2y=-24; } else if(p.duck){ f1x=-15; f2x=15; }
  // back arm
  const bob = run?Math.abs(Math.sin(ph))*-4:Math.sin(t*4+p.id)*1.5;
  c.translate(0,bob);
  Art.hose(c,-6,-56,-18+(run?-Math.sin(ph)*8:0),-40,-4,5,null); Art.glove(c,-18+(run?-Math.sin(ph)*8:0),-40,7,0.4);
  // legs + shoes
  Art.hose(c,-6,-30,f1x,f1y-7,run?4:2,5,null); Art.hose(c,6,-30,f2x,f2y-7,run?-4:-2,5,null);
  const shoe=(x,y)=>{ Art.ell(c,x+5,y-5,13,7.5,C.dark,3.5); Art.ell(c,x+9,y-8,4,2,'rgba(255,255,255,0.5)',0); };
  shoe(f1x,f1y); shoe(f2x,f2y);
  // body
  Art.ell(c,0,-50,15,15,'#f6efe0',4);
  c.beginPath(); c.moveTo(-17,-44); c.lineTo(17,-44); c.lineTo(19,-27); c.quadraticCurveTo(0,-20,-19,-27); c.closePath(); c.fillStyle=C.color; c.fill(); c.lineWidth=4; c.strokeStyle=OL; c.stroke();
  Art.circ(c,-7,-38,2.6,'#fffaf0',1.5); Art.circ(c,7,-38,2.6,'#fffaf0',1.5);
  if(p.char==='bolt'){ c.beginPath(); c.moveTo(-10,-62); c.quadraticCurveTo(0,-56,10,-62); c.lineWidth=6; c.strokeStyle='#f2c230'; c.stroke(); }
  else { c.beginPath(); c.moveTo(0,-62); c.lineTo(-9,-67); c.lineTo(-9,-57); c.closePath(); c.moveTo(0,-62); c.lineTo(9,-67); c.lineTo(9,-57); c.closePath(); c.fillStyle=OL; c.fill(); }
  // head
  let mood='norm'; if(p.hurtT>0) mood='hurt'; else if(p.parryT>0||p.superT>0) mood='happy'; else if(p.shootT>0||p.exT>0) mood='grit';
  c.save(); if(p.duck) c.translate(0,6); drawHead(c,p,t,mood); c.restore();
  // front arm + pop gun
  const ax=(p.aimX==null?1:p.aimX)*p.face, ay=p.aimY||0, an=Math.atan2(ay,ax);
  const hx=6+Math.cos(an)*24, hy=-56+Math.sin(an)*24;
  Art.hose(c,6,-56,hx,hy,ay<0?-3:3,5,null);
  c.save(); c.translate(hx,hy); c.rotate(an);
  const rec=p.shootT>0?Math.sin(t*60)*2:0;
  Art.rrect(c,2-rec,-5,22,9,3,'#6b3d1f',3); Art.rrect(c,18-rec,-6,6,11,2,'#e2b23a',2.5);
  Art.rrect(c,-2,-2,8,14,3,'#4a2a12',2.5);
  if(p.shootT>0&&Math.floor(t*30)%2===0) Art.star(c,30,0,9,'#fff3a0',2,t*9,6);
  c.restore(); Art.glove(c,hx,hy,7.5,an);
  c.restore();
};
Art.head = drawHead;
// P1..P4 tag above each hero in multiplayer
Art.marker = function(c,p,i,t){
  if(p.gone) return; const col=RR.PCOL[i%4]; const y=p.plane?p.y-(p.small?36:58):(p.dead?p.y-140:p.y-(p.duck?118:166));
  c.save(); c.translate(p.x,y+Math.sin(t*4+i)*3);
  c.beginPath(); c.moveTo(-9,0); c.lineTo(9,0); c.lineTo(0,11); c.closePath(); c.fillStyle=col; c.fill(); c.lineWidth=2.5; c.strokeStyle=OL; c.stroke();
  Art.text(c,'P'+(i+1),0,-11,16,{title:true,color:col,stroke:OL,sw:4}); c.restore();
};
Art.ghost = function(c,p,t){
  c.save(); c.translate(p.x,p.y+Math.sin(t*3)*6); c.globalAlpha=0.75;
  c.beginPath(); c.moveTo(-26,-20); c.quadraticCurveTo(-30,-90,0,-100); c.quadraticCurveTo(30,-90,26,-20);
  for(let i=0;i<5;i++){ const x=26-i*13; c.quadraticCurveTo(x-3,-8+((i+Math.floor(t*6))%2)*8,x-13,-20); }
  c.closePath(); c.fillStyle='#f8f4ff'; c.fill(); c.lineWidth=3; c.strokeStyle='#7a7090'; c.stroke();
  Art.eye(c,-8,-66,5,7,0,0,{closed:true}); Art.eye(c,8,-66,5,7,0,0,{closed:true});
  c.globalAlpha=1; c.beginPath(); c.ellipse(0,-112,18,5,0,0,Math.PI*2); c.lineWidth=4; c.strokeStyle='#e8c040'; c.stroke();
  if(p.revivable) Art.heart(c,0,-40,13,PINK,3);
  c.restore();
};

/* ---------- player shots ---------- */
Art.PSD = {}; // custom player-shot drawers
Art.pshot = function(c,s,t){
  if(Art.PSD[s.k]){ Art.PSD[s.k](c,s,t); return; }
  c.save(); c.translate(s.x,s.y);
  const a=Math.atan2(s.vy||0,s.vx||1);
  switch(s.k){
    case 'ink': c.rotate(a); Art.ell(c,-4,0,16,7,'#24307a',3); Art.ell(c,2,-2,5,2,'#9fb1ff',0); break;
    case 'spread': Art.star(c,0,0,8,'#ffb02e',2.5,t*12); break;
    case 'homing': c.globalAlpha=0.5; Art.circ(c,0,0,13,'#fff3a0',0); c.globalAlpha=1; Art.star(c,0,0,9,'#ffe04a',2.5,t*15,4); break;
    case 'charge': { const r=s.r; const g=c.createRadialGradient(0,0,2,0,0,r); g.addColorStop(0,'#fff'); g.addColorStop(1,'#5ac8ff'); Art.circ(c,0,0,r,g,3.5); break; }
    case 'bounce': case 'xbounce': { Art.circ(c,0,0,s.r,s.k==='xbounce'?'#ff7a45':'#58c47c',3.5); c.rotate(t*8); c.beginPath(); c.arc(0,0,s.r*0.55,0,Math.PI); c.lineWidth=3; c.strokeStyle='rgba(255,255,255,0.7)'; c.stroke(); break; }
    case 'boomer': c.rotate(t*18); c.beginPath(); c.arc(0,0,14,0.3,Math.PI*1.7); c.arc(-6,0,9,Math.PI*1.6,0.4,true); c.closePath(); c.fillStyle='#c97b2a'; c.fill(); c.lineWidth=3; c.strokeStyle=OL; c.stroke(); break;
    case 'xink': c.rotate(a); { const w=Math.sin(t*20)*3; Art.ell(c,0,0,s.r+w,s.r-w,'#1b1450',4); Art.ell(c,-s.r*0.3,-s.r*0.35,s.r*0.3,s.r*0.15,'#8c7dff',0); } break;
    case 'xspread': Art.star(c,0,0,s.r,'#ff7030',3,t*10); break;
    case 'xhoming': c.globalAlpha=0.4; Art.circ(c,0,0,s.r*1.6,'#fff3a0',0); c.globalAlpha=1; Art.star(c,0,0,s.r,'#ffd23a',3.5,t*8); break;
    case 'xbomb': Art.circ(c,0,0,s.r,'#2b2b33',4); c.beginPath(); c.moveTo(0,-s.r); c.quadraticCurveTo(8,-s.r-12,14,-s.r-8); c.lineWidth=3; c.strokeStyle='#8a6a3a'; c.stroke(); Art.star(c,14,-s.r-8,7,'#ffcf3a',2,t*20,6); Art.ell(c,-7,-7,5,3,'rgba(255,255,255,0.5)',0); break;
    case 'xring': c.globalAlpha=0.5; Art.circ(c,0,0,s.r+6,'#9ad8ff',0); c.globalAlpha=1; Art.circ(c,0,0,s.r,'#3c8de0',3.5); Art.star(c,0,0,s.r*0.6,'#fff',0,t*10,4); break;
    case 'beam': { c.translate(-s.x,-s.y); const x=Math.min(s.x0,s.x1), w=Math.abs(s.x1-s.x0), h=s.h*(0.85+0.15*Math.sin(t*50));
      const g=c.createLinearGradient(0,s.y-h/2,0,s.y+h/2); g.addColorStop(0,'rgba(255,240,170,0.2)'); g.addColorStop(0.5,'#fffdf0'); g.addColorStop(1,'rgba(255,240,170,0.2)');
      c.fillStyle=g; c.fillRect(x,s.y-h/2,w,h); c.strokeStyle=OL; c.lineWidth=4; c.beginPath(); c.moveTo(x,s.y-h/2); c.lineTo(x+w,s.y-h/2); c.moveTo(x,s.y+h/2); c.lineTo(x+w,s.y+h/2); c.stroke(); break; }
    case 'reel': { c.rotate(s.vx>0?t*8:-t*8); Art.circ(c,0,0,s.r,'#3a3a44',6); Art.circ(c,0,0,s.r*0.82,'#7b7b88',3);
      for(let i=0;i<5;i++){ const an=i*Math.PI*2/5; Art.circ(c,Math.cos(an)*s.r*0.5,Math.sin(an)*s.r*0.5,s.r*0.2,'#2a2a30',3); }
      Art.circ(c,0,0,s.r*0.15,'#e2b23a',3); break; }
    default: Art.circ(c,0,0,s.r||8,'#24307a',3);
  }
  c.restore();
};

/* ---------- enemy bullets ---------- */
Art.EB = {}; // bosses can register custom drawers
Art.ebullet = function(c,e,t){
  if(Art.EB[e.k]){ Art.EB[e.k](c,e,t); return; }
  const P=e.parry, col=(n)=>P?PINK:n;
  c.save(); c.translate(e.x,e.y);
  switch(e.k){
    case 'pop': { const r=e.r; c.rotate(e.a||0); [[-0.4,-0.2],[0.4,-0.3],[0,0.35],[0.1,-0.5]].forEach(o=>Art.circ(c,o[0]*r,o[1]*r,r*0.6,col('#fff4d8'),3)); break; }
    case 'kernel': c.rotate(Math.atan2(e.vy,e.vx)); c.beginPath(); c.moveTo(e.r*1.3,0); c.quadraticCurveTo(0,-e.r,-e.r,0); c.quadraticCurveTo(0,e.r,e.r*1.3,0); c.fillStyle=col('#f2c230'); c.fill(); c.lineWidth=3; c.strokeStyle=OL; c.stroke(); break;
    case 'note': { c.rotate(Math.sin(t*8+e.x*0.01)*0.3); Art.ell(c,0,0,e.r*0.85,e.r*0.62,col('#2a1d14'),3,-0.4);
      c.beginPath(); c.moveTo(e.r*0.75,-e.r*0.2); c.lineTo(e.r*0.75,-e.r*2.2); c.quadraticCurveTo(e.r*1.6,-e.r*1.6,e.r*1.4,-e.r*0.9); c.lineWidth=4; c.strokeStyle=P?PINK:OL; c.stroke(); break; }
    case 'record': c.rotate(e.a||t*10); Art.circ(c,0,0,e.r,col('#1d1a1a'),3); c.strokeStyle='rgba(255,255,255,0.15)'; c.lineWidth=1.5; c.beginPath(); c.arc(0,0,e.r*0.7,0,6.28); c.stroke(); Art.circ(c,0,0,e.r*0.35,P?'#fff':'#d8343a',2); Art.circ(c,0,0,3,OL,0); break;
    case 'coal': case 'frag': c.rotate(e.a||0); c.beginPath(); for(let i=0;i<7;i++){ const an=i/7*6.283, rr=e.r*(0.8+((i*37)%5)/12); c.lineTo(Math.cos(an)*rr,Math.sin(an)*rr);} c.closePath(); c.fillStyle=col('#2c2622'); c.fill(); c.lineWidth=3; c.strokeStyle=OL; c.stroke(); if(!P){ Art.ell(c,-e.r*0.3,-e.r*0.3,e.r*0.25,e.r*0.12,'#ff7a2a',0);} break;
    case 'steam': { c.globalAlpha=0.95; const r=e.r; [[-0.45,0.1],[0.45,0.1],[0,-0.35],[0,0.25]].forEach(o=>Art.circ(c,o[0]*r,o[1]*r,r*0.6,col('#eeeeea'),3)); break; }
    case 'fire': c.rotate(Math.atan2(e.vy,e.vx)); c.beginPath(); c.moveTo(e.r*1.2,0); c.quadraticCurveTo(0,-e.r*1.1,-e.r*1.8,0); c.quadraticCurveTo(0,e.r*1.1,e.r*1.2,0); c.fillStyle=col('#ff8a2a'); c.fill(); c.lineWidth=3; c.strokeStyle=OL; c.stroke(); Art.ell(c,e.r*0.3,0,e.r*0.4,e.r*0.3,P?'#fff':'#ffe46b',0); break;
    case 'bolt': c.rotate(e.a||0); Art.rrect(c,-5,-e.r,10,e.r*1.6,2,col('#9aa0a6'),3); Art.rrect(c,-e.r*0.6,-e.r,e.r*1.2,8,2,col('#c4c8cc'),3); break;
    case 'frame': c.rotate(e.a||0); Art.rrect(c,-e.r,-e.r*0.8,e.r*2,e.r*1.6,3,col('#2a2a30'),3); c.fillStyle=P?'#ffd0e6':'#f3e4c2'; c.fillRect(-e.r*0.6,-e.r*0.5,e.r*1.2,e.r); c.fillStyle='#f3e4c2'; for(let i=0;i<3;i++){ c.fillRect(-e.r*0.8+i*e.r*0.62,-e.r*0.75,5,4); c.fillRect(-e.r*0.8+i*e.r*0.62,e.r*0.55,5,4);} break;
    case 'star': Art.star(c,0,0,e.r,col('#ffd23a'),3,t*4); Art.eye(c,-4,-1,3,4,0,0,{}); Art.eye(c,4,-1,3,4,0,0,{}); break;
    case 'bag': c.rotate(Math.sin(t*6)*0.15); c.beginPath(); c.moveTo(-e.r*0.7,-e.r*0.6); c.quadraticCurveTo(0,-e.r*1.1,e.r*0.7,-e.r*0.6); c.quadraticCurveTo(e.r*1.1,e.r,0,e.r); c.quadraticCurveTo(-e.r*1.1,e.r,-e.r*0.7,-e.r*0.6); c.fillStyle=col('#b88a52'); c.fill(); c.lineWidth=3.5; c.strokeStyle=OL; c.stroke(); Art.text(c,'$',0,e.r*0.2,e.r*0.9,{title:true,color:'#5a3a1a'}); c.beginPath(); c.moveTo(0,-e.r*0.9); c.lineTo(0,-900); c.lineWidth=2; c.strokeStyle='rgba(30,20,10,0.6)'; c.stroke(); break;
    case 'butter': Art.rrect(c,-e.r,-e.r*0.7,e.r*2,e.r*1.4,5,col('#ffe066'),3); break;
    case 'ball': Art.circ(c,0,0,e.r,col('#e8e0d0'),3); break;
    case 'puddle': c.translate(-e.x,-e.y); Art.ell(c,e.x,e.y+e.h*0.2,e.w/2,e.h*0.6,'#ffd84a',3); Art.ell(c,e.x-e.w*0.15,e.y,e.w*0.12,3,'#fff6b0',0); break;
    case 'shock': { c.translate(-e.x,-e.y); const x=e.x-e.w/2, y=e.y-e.h/2; c.beginPath(); c.moveTo(x,y+e.h); c.quadraticCurveTo(x+e.w*0.2,y,x+e.w*0.5,y+e.h*0.15); c.quadraticCurveTo(x+e.w*0.8,y,x+e.w,y+e.h); c.closePath(); c.fillStyle=col('#f6ead0'); c.fill(); c.lineWidth=3.5; c.strokeStyle=OL; c.stroke(); break; }
    case 'tele': { c.translate(-e.x,-e.y); if(Math.floor(t*12)%2){ c.setLineDash([14,10]); c.lineWidth=4; c.strokeStyle='rgba(220,30,30,0.85)'; c.strokeRect(e.x-e.w/2,e.y-e.h/2,e.w,e.h); c.setLineDash([]); c.fillStyle='rgba(255,60,40,0.12)'; c.fillRect(e.x-e.w/2,e.y-e.h/2,e.w,e.h);} break; }
    case 'wave': { c.translate(-e.x,-e.y); const x=e.x-e.w/2, y=e.y-e.h/2; c.fillStyle='rgba(200,170,255,0.55)'; c.fillRect(x,y,e.w,e.h); c.strokeStyle='#fff'; c.lineWidth=3; for(let i=0;i<4;i++){ c.beginPath(); for(let xx=x;xx<x+e.w;xx+=20) c.lineTo(xx,y+e.h*(0.2+i*0.2)+Math.sin(xx*0.05+t*30+i)*8); c.stroke(); } c.strokeStyle=OL; c.lineWidth=4; c.strokeRect(x,y,e.w,e.h); break; }
    case 'jet': { c.translate(-e.x,-e.y); const x=e.x-e.w/2; for(let i=0;i<6;i++){ Art.circ(c,x+15+i*(e.w-30)/5,e.y+Math.sin(t*20+i)*6,e.h*0.42,col('#f2f2ee'),3);} break; }
    case 'pillar': { c.translate(-e.x,-e.y); const x=e.x-e.w/2, y=e.y-e.h/2; const g=c.createLinearGradient(x,0,x+e.w,0); g.addColorStop(0,'#ff6a1a'); g.addColorStop(0.5,'#ffe46b'); g.addColorStop(1,'#ff6a1a'); c.fillStyle=g; c.beginPath(); c.moveTo(x,y+e.h); for(let yy=y+e.h;yy>y;yy-=30) c.lineTo(x+Math.sin(yy*0.05+t*25)*8,yy); c.lineTo(x+e.w/2,y-20); for(let yy=y;yy<y+e.h;yy+=30) c.lineTo(x+e.w+Math.sin(yy*0.05+t*25)*8,yy); c.closePath(); c.fill(); c.lineWidth=4; c.strokeStyle=OL; c.stroke(); break; }
    case 'lbeam': { c.translate(-e.x,-e.y); c.lineCap='round';
      if(e.harmless){ c.setLineDash([10,12]); c.lineWidth=3; c.strokeStyle=Math.floor(t*14)%2?'rgba(255,40,40,0.9)':'rgba(255,220,220,0.6)'; }
      else { c.lineWidth=e.w+8; c.strokeStyle=OL; c.beginPath(); c.moveTo(e.x1,e.y1); c.lineTo(e.x2,e.y2); c.stroke(); c.lineWidth=e.w; c.strokeStyle='#fff6d0'; }
      c.beginPath(); c.moveTo(e.x1,e.y1); c.lineTo(e.x2,e.y2); c.stroke(); c.setLineDash([]); break; }
    case 'reelsaw': c.rotate(t*9); for(let i=0;i<10;i++){ const an=i*0.628; c.save(); c.rotate(an); c.beginPath(); c.moveTo(e.r-4,-7); c.lineTo(e.r+10,0); c.lineTo(e.r-4,7); c.fillStyle='#c4c8cc'; c.fill(); c.lineWidth=2.5; c.strokeStyle=OL; c.stroke(); c.restore(); }
      Art.circ(c,0,0,e.r,col('#3a3a44'),4); for(let i=0;i<5;i++){ const an=i*1.2566; Art.circ(c,Math.cos(an)*e.r*0.5,Math.sin(an)*e.r*0.5,e.r*0.18,'#15151a',2.5);} break;
    case 'pinkstar': Art.star(c,0,Math.sin(t*3)*6,e.r,PINK,3,t*2); break;
    default: Art.circ(c,0,0,e.r,col('#e8e0d0'),3);
  }
  c.restore();
};

/* ---------- fx ---------- */
Art.fxSpawn = function(list,k,x,y,o){
  o=o||{}; const n=o.n||1;
  for(let i=0;i<n;i++){
    const f={k,x,y,t:0,life:o.life||0.4,s:o.s||1,col:o.col,vx:0,vy:0,a:Math.random()*6.28,txt:o.txt};
    if(k==='debris'||k==='spark'||k==='conf'){ const an=o.an!=null?o.an+U.rnd(-0.6,0.6):U.rnd(0,6.283), sp=U.rnd(150,o.sp||480); f.vx=Math.cos(an)*sp; f.vy=Math.sin(an)*sp-(k==='spark'?0:200); f.life=o.life||U.rnd(0.5,1); }
    if(k==='puff'||k==='dust'){ f.vx=(o.vx||0)+U.rnd(-40,40); f.vy=(o.vy||0)+U.rnd(-60,0); }
    if(k==='text'){ f.vy=-70; f.life=o.life||1; }
    list.push(f);
  }
};
Art.fxStep = function(list,dt){
  for(let i=list.length-1;i>=0;i--){ const f=list[i]; f.t+=dt; if(f.t>=f.life){ list.splice(i,1); continue; }
    f.x+=f.vx*dt; f.y+=f.vy*dt; if(f.k==='debris'||f.k==='conf') f.vy+=1400*dt*(f.k==='conf'?0.25:1); f.a+=dt*8; }
  if(list.length>400) list.splice(0,list.length-400);
};
Art.fx = function(c,f){
  const k=f.t/f.life; c.save(); c.translate(f.x,f.y);
  switch(f.k){
    case 'puff': case 'dust': c.globalAlpha=1-k; Art.circ(c,0,0,(f.k==='dust'?10:24)*f.s*(0.5+k),f.col||'#f6ead0',3); break;
    case 'hit': c.globalAlpha=1-k; Art.star(c,0,0,18*f.s*(0.6+k),f.col||'#fffaf0',3,f.a,6); break;
    case 'ring': c.globalAlpha=1-k; c.beginPath(); c.arc(0,0,(10+90*k)*f.s,0,6.283); c.lineWidth=8*(1-k)+1; c.strokeStyle=f.col||PINK; c.stroke(); break;
    case 'boom': { c.globalAlpha=Math.min(1,(1-k)*1.6); const r=60*f.s*U.easeOut(Math.min(1,k*2.2)); Art.circ(c,0,0,r,'#ff8a2a',4); Art.circ(c,r*0.1,-r*0.1,r*0.65,'#ffd04a',0); Art.circ(c,r*0.2,-r*0.2,r*0.3,'#fffbe8',0); break; }
    case 'debris': c.rotate(f.a); Art.rrect(c,-6*f.s,-4*f.s,12*f.s,8*f.s,2,f.col||'#8a6a4a',2.5); break;
    case 'conf': c.rotate(f.a); c.fillStyle=f.col||'#d8343a'; c.fillRect(-5,-3,10,6); break;
    case 'spark': c.globalAlpha=1-k; c.rotate(Math.atan2(f.vy,f.vx)); c.fillStyle=f.col||'#fff3a0'; c.fillRect(-8,-2,16,4); break;
    case 'text': c.globalAlpha=1-k*k; Art.text(c,f.txt,0,0,28*f.s,{title:true,color:f.col||'#fff3d6',stroke:OL,sw:6}); break;
    case 'speed': c.globalAlpha=(1-k)*0.8; c.fillStyle='#fffaf0'; c.strokeStyle=OL; c.lineWidth=2; for(let i=0;i<3;i++){ c.beginPath(); c.rect(-40*f.s,-30+i*20,40-i*8,4); c.fill(); c.stroke(); } break;
  }
  c.restore();
};

/* ---------- icons ---------- */
Art.icon = function(c,kind,id,x,y,s){
  c.save(); c.translate(x,y); c.scale(s/40,s/40);
  if(!id){ Art.text(c,'—',0,0,30,{}); c.restore(); return; }
  if(kind==='w'){
    const fake={x:0,y:0,vx:1,vy:0,r:12,k:id,x0:-20,x1:20,h:10};
    if(id==='ink'){ Art.pshot(c,Object.assign(fake,{k:'ink'}),0); c.translate(-18,10); Art.pshot(c,Object.assign(fake,{k:'ink'}),0); }
    else if(id==='spread'){ [-12,0,12].forEach((yy,i)=>{ Art.star(c,6-Math.abs(yy)*0.3,yy,9,'#ffb02e',2.5,i); }); }
    else if(id==='homing'){ Art.star(c,0,0,14,'#ffe04a',3,0.3,4); c.beginPath(); c.moveTo(-26,14); c.quadraticCurveTo(-18,-4,-8,4); c.lineWidth=3; c.setLineDash([4,4]); c.stroke(); c.setLineDash([]); }
    else if(id==='charge'){ fake.r=17; Art.pshot(c,Object.assign(fake,{k:'charge'}),0); }
    else if(id==='bounce'){ c.beginPath(); c.moveTo(-26,10); c.quadraticCurveTo(-12,-24,2,10); c.lineWidth=3; c.setLineDash([4,4]); c.stroke(); c.setLineDash([]); fake.r=10; c.translate(8,4); Art.pshot(c,Object.assign(fake,{k:'bounce'}),0); }
    else if(id==='boomer'){ Art.pshot(c,Object.assign(fake,{k:'boomer'}),0.2); }
  } else if(kind==='c'){
    if(id==='heart') Art.heart(c,0,2,16,'#d8343a',3);
    else if(id==='heart2'){ Art.heart(c,-8,4,12,'#d8343a',3); Art.heart(c,9,-2,12,'#ff7a7a',3); }
    else if(id==='smoke'){ Art.circ(c,-8,4,11,'#cfcfcf',3); Art.circ(c,6,-4,13,'#e8e8e8',3); Art.circ(c,8,8,9,'#dadada',3); }
    else if(id==='coffee'){ Art.rrect(c,-14,-8,24,24,4,'#fffaf0',3); c.beginPath(); c.arc(12,4,7,-1.4,1.4); c.lineWidth=3; c.stroke(); Art.ell(c,-2,-8,12,4,'#6b3d1f',3); c.beginPath(); c.moveTo(-6,-16); c.quadraticCurveTo(-10,-24,-4,-30); c.moveTo(4,-16); c.quadraticCurveTo(0,-24,6,-30); c.lineWidth=2; c.stroke(); }
    else if(id==='glove') Art.glove(c,0,0,16,-0.4);
    else if(id==='ribbon'){ c.beginPath(); c.moveTo(0,0); c.bezierCurveTo(-24,-22,-26,10,0,0); c.bezierCurveTo(24,-22,26,10,0,0); c.fillStyle=PINK; c.fill(); c.lineWidth=3; c.strokeStyle=OL; c.stroke(); c.beginPath(); c.moveTo(-2,2); c.lineTo(-10,20); c.moveTo(2,2); c.lineTo(10,20); c.lineWidth=5; c.strokeStyle=PINK; c.stroke(); Art.circ(c,0,0,5,'#ff9ccc',2.5); }
    else if(id==='tin'){ c.beginPath(); c.moveTo(0,-18); c.lineTo(16,-10); c.quadraticCurveTo(14,12,0,20); c.quadraticCurveTo(-14,12,-16,-10); c.closePath(); c.fillStyle='#b8bcc2'; c.fill(); c.lineWidth=3; c.stroke(); Art.star(c,0,0,7,'#e2b23a',2); }
  } else if(kind==='s'){
    if(id==='beam'){ c.fillStyle='#fff3a0'; c.beginPath(); c.moveTo(-18,0); c.lineTo(20,-14); c.lineTo(20,14); c.closePath(); c.fill(); c.lineWidth=3; c.stroke(); Art.rrect(c,-26,-8,12,16,3,'#555',3); }
    else if(id==='star') Art.star(c,0,0,18,'#ffd23a',3,0.1);
    else if(id==='reel'){ const s2={x:0,y:0,vx:1,r:18,k:'reel'}; Art.pshot(c,s2,0); }
  } else if(kind==='char'){
    const p={id:0,char:id,x:0,y:62,vx:0,vy:0,face:1,onGround:true,aimX:1,aimY:0,runT:0}; c.scale(0.55,0.55); Art.player(c,p,0);
  }
  c.restore();
};

/* ---------- HUD ---------- */
Art.hud = function(c,G){
  const t=G.t;
  G.players.forEach((p,i)=>{
    const POS=[[24,RR.H-58],[RR.W-254,RR.H-58],[24,14],[RR.W-254,14]], x=POS[i%4][0], y=POS[i%4][1];
    c.save();
    const low=!p.dead&&p.hp===1&&Math.floor(t*4)%2===0;
    Art.rrect(c,x,y,78,40,8,p.dead?'#777':low?'#d8343a':'#fffaf0',3.5);
    Art.text(c,p.dead?'X_X':'HP '+p.hp,x+39,y+21,22,{bold:true,color:low?'#fff':'#2a1d14'});
    for(let k=0;k<5;k++){
      const cx=x+90+k*26, fill=U.clamp(p.sup-k,0,1);
      if(fill>=1){ Art.rrect(c,cx,y-4+Math.sin(t*6+k)*2,22,32,4,'#fffaf0',3); Art.star(c,cx+11,y+12,7,p.sup>=5?'#ffd23a':'#d8343a',2,0); }
      else { Art.rrect(c,cx,y+4,22,28,4,'rgba(255,250,240,0.35)',2.5); if(fill>0){ c.fillStyle='#ffd23a'; c.fillRect(cx+3,y+4+28*(1-fill)+1,16,28*fill-3); } }
    }
    Art.icon(c,'w',p.weapons[p.wslot],x+222,y+20,26);
    if(G.players.length>1) Art.text(c,'P'+(i+1),x+39,i>=2?y+58:y-14,18,{title:true,color:RR.PCOL[i%4],stroke:OL,sw:4});
    c.restore();
  });
  const b=G.boss;
  if(RR.Save.d.set.bossbar && b && b.mhp>0 && !(RR.BOSS[G.bossId]||{}).tutorial){
    const w=420, x=RR.W/2-w/2, y=18;
    Art.rrect(c,x,y,w,18,8,'rgba(0,0,0,0.4)',3); c.fillStyle='#d8343a'; c.fillRect(x+3,y+3,(w-6)*U.clamp(b.hp/b.mhp,0,1),12);
    const def=RR.BOSS[G.bossId]; (def&&def.phases||[]).forEach(th=>{ c.fillStyle=OL; c.fillRect(x+w*th-1,y,3,18); });
  }
};

/* ---------- film filter ---------- */
let grain=null, grainPat=null, vign=null;
function initFilter(c){
  grain=[]; for(let g=0;g<4;g++){ const cv=document.createElement('canvas'); cv.width=cv.height=256; const x=cv.getContext('2d'); const id=x.createImageData(256,256);
    for(let i=0;i<id.data.length;i+=4){ const v=Math.random()*255|0; id.data[i]=id.data[i+1]=id.data[i+2]=v; id.data[i+3]=Math.random()<0.5?255:0; } x.putImageData(id,0,0); grain.push(cv); }
  grainPat=grain.map(g=>c.createPattern(g,'repeat'));
  vign=document.createElement('canvas'); vign.width=RR.W; vign.height=RR.H; const v=vign.getContext('2d');
  const gr=v.createRadialGradient(RR.W/2,RR.H/2,RR.H*0.38,RR.W/2,RR.H/2,RR.H*0.95); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(20,10,0,0.75)'); v.fillStyle=gr; v.fillRect(0,0,RR.W,RR.H);
}
Art.filter = function(c,t){
  if(!RR.Save.d.set.filter) return;
  if(!grain) initFilter(c);
  c.save();
  c.globalCompositeOperation='multiply'; c.fillStyle='rgb(255,236,204)'; c.fillRect(0,0,RR.W,RR.H);
  c.globalCompositeOperation='source-over';
  c.globalAlpha=0.07; c.fillStyle=grainPat[Math.floor(t*24)%4]; c.translate(Math.random()*256,Math.random()*256); c.fillRect(-256,-256,RR.W+512,RR.H+512); c.setTransform(1,0,0,1,0,0); c.restore(); c.save();
  c.drawImage(vign,0,0,RR.W,RR.H);
  if(Math.random()<0.25){ c.globalAlpha=0.18; c.fillStyle=Math.random()<0.5?'#000':'#fff'; c.fillRect(Math.random()*RR.W,0,1.5,RR.H); }
  c.globalAlpha=0.5; c.fillStyle='#1a1210'; for(let i=0;i<3;i++) if(Math.random()<0.3){ c.beginPath(); c.arc(Math.random()*RR.W,Math.random()*RR.H,Math.random()*2+0.5,0,6.28); c.fill(); }
  c.globalAlpha=Math.random()*0.04; c.fillStyle='#000'; c.fillRect(0,0,RR.W,RR.H);
  c.restore();
};
})();
