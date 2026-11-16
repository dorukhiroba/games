/* Reel Rumble — backgrounds, platforms, map island, curtains (all procedurally drawn) */
(function(){
'use strict';
const U=RR.U, Art=RR.Art, OL=Art.OL, W=RR.W, H=RR.H, GY=RR.GROUND;
const cache={};
function mk(){ const cv=document.createElement('canvas'); cv.width=W; cv.height=H; return cv; }
function sky(c,a,b){ const g=c.createLinearGradient(0,0,0,GY); g.addColorStop(0,a); g.addColorStop(1,b); c.fillStyle=g; c.fillRect(0,0,W,H); }
function cloud(c,x,y,s,col){ c.save(); c.translate(x,y); c.scale(s,s); [[-40,8,26],[-12,-8,34],[22,0,30],[48,10,20],[0,14,28]].forEach(o=>Art.circ(c,o[0],o[1],o[2],col||'#fbf3e0',0)); c.beginPath(); c.moveTo(-66,22); c.lineTo(68,22); c.lineWidth=3; c.strokeStyle='rgba(60,40,20,0.25)'; c.stroke(); c.restore(); }
function ground(c,top,base,line){ c.fillStyle=base; c.fillRect(0,GY,W,H-GY); c.fillStyle=top; c.fillRect(0,GY,W,14); c.beginPath(); c.moveTo(0,GY); c.lineTo(W,GY); c.lineWidth=5; c.strokeStyle=line||OL; c.stroke(); }

const BG = {
  farm(c){
    sky(c,'#9fc6c9','#f3dfb0');
    c.save(); c.translate(1120,110); for(let i=0;i<14;i++){ c.rotate(Math.PI/7); c.fillStyle='rgba(255,220,120,0.35)'; c.beginPath(); c.moveTo(0,0); c.lineTo(260,-22); c.lineTo(260,22); c.fill(); } c.restore();
    Art.circ(c,1120,110,58,'#ffd76a',4);
    c.fillStyle='#9bb07a'; c.beginPath(); c.moveTo(0,470); for(let x=0;x<=W;x+=40) c.lineTo(x,450+Math.sin(x*0.006)*40); c.lineTo(W,GY); c.lineTo(0,GY); c.fill(); c.lineWidth=3; c.strokeStyle='rgba(30,20,10,0.5)'; c.stroke();
    c.fillStyle='#7f9a5c'; c.beginPath(); c.moveTo(0,530); for(let x=0;x<=W;x+=40) c.lineTo(x,515+Math.sin(x*0.011+2)*22); c.lineTo(W,GY); c.lineTo(0,GY); c.fill(); c.stroke();
    // barn
    c.save(); c.translate(150,370); Art.rrect(c,0,40,170,150,2,'#b63a2e',4); c.beginPath(); c.moveTo(-14,44); c.lineTo(85,-30); c.lineTo(184,44); c.closePath(); c.fillStyle='#8e2a22'; c.fill(); c.lineWidth=4; c.strokeStyle=OL; c.stroke();
    Art.rrect(c,50,100,70,90,2,'#f3e4c2',4); c.beginPath(); c.moveTo(50,100); c.lineTo(120,190); c.moveTo(120,100); c.lineTo(50,190); c.lineWidth=4; c.stroke(); Art.circ(c,85,40,16,'#f3e4c2',4); c.restore();
    // corn stalks row
    for(let i=0;i<18;i++){ const x=420+i*48+(i%2)*12, h=120+((i*37)%40); c.beginPath(); c.moveTo(x,GY); c.lineTo(x+4,GY-h); c.lineWidth=6; c.strokeStyle='#5f7a3a'; c.stroke(); c.lineWidth=2; c.strokeStyle=OL; c.stroke();
      c.beginPath(); c.moveTo(x+2,GY-h*0.5); c.quadraticCurveTo(x+30,GY-h*0.7,x+40,GY-h*0.45); c.moveTo(x+3,GY-h*0.7); c.quadraticCurveTo(x-24,GY-h*0.9,x-34,GY-h*0.6); c.lineWidth=5; c.strokeStyle='#6f8c45'; c.stroke(); Art.ell(c,x+8,GY-h*0.62,6,14,'#e8c04a',2); }
    // fence
    c.fillStyle='#d9c39a'; for(let x=0;x<W;x+=90){ Art.rrect(c,x+10,GY-70,14,70,3,'#e3cfa5',3); } Art.rrect(c,0,GY-58,W,10,2,'#e3cfa5',3); Art.rrect(c,0,GY-30,W,10,2,'#e3cfa5',3);
    ground(c,'#9c7a45','#7a5a32');
    c.fillStyle='rgba(40,25,10,0.25)'; for(let i=0;i<60;i++){ c.fillRect((i*137)%W,GY+20+(i*53)%100,18,4); }
  },
  ballroom(c){
    c.fillStyle='#3a1f2c'; c.fillRect(0,0,W,H);
    c.save(); c.globalAlpha=0.35; for(let i=0;i<9;i++){ const x=80+i*140; c.beginPath(); c.moveTo(x,GY); for(let k=0;k<7;k++){ const a=Math.PI+k*Math.PI/6; c.lineTo(x+Math.cos(a)*120,GY-60+Math.sin(a)*120); c.moveTo(x,GY-60); } c.lineWidth=4; c.strokeStyle='#e2b23a'; c.stroke(); } c.restore();
    for(let i=0;i<9;i++){ c.beginPath(); c.arc(80+i*140,GY-60,120,Math.PI,0); c.lineWidth=3; c.strokeStyle='rgba(226,178,58,0.5)'; c.stroke(); }
    // chandelier
    c.save(); c.translate(560,0); c.beginPath(); c.moveTo(0,0); c.lineTo(0,70); c.lineWidth=4; c.strokeStyle=OL; c.stroke(); Art.ell(c,0,90,90,22,'#e2b23a',4); for(let i=-3;i<=3;i++){ Art.ell(c,i*26,112+Math.abs(i)*-3,6,12,'#fff6d0',2.5);} c.restore();
    // curtains
    const cur=(x,dir)=>{ c.save(); c.translate(x,0); c.scale(dir,1); c.beginPath(); c.moveTo(0,0); c.lineTo(170,0); c.quadraticCurveTo(110,300,140,GY+40); c.lineTo(0,GY+40); c.closePath(); const g=c.createLinearGradient(0,0,170,0); g.addColorStop(0,'#5a0e14'); g.addColorStop(0.5,'#a8222c'); g.addColorStop(1,'#6a1018'); c.fillStyle=g; c.fill(); c.lineWidth=5; c.strokeStyle=OL; c.stroke(); for(let k=1;k<5;k++){ c.beginPath(); c.moveTo(k*32,0); c.quadraticCurveTo(k*24,300,k*28,GY+40); c.lineWidth=3; c.strokeStyle='rgba(0,0,0,0.35)'; c.stroke(); } c.restore(); };
    cur(0,1); cur(W,-1);
    c.fillStyle='#8a1820'; c.fillRect(0,0,W,46); for(let x=0;x<W;x+=64){ c.beginPath(); c.arc(x+32,46,32,0,Math.PI); c.fill(); c.lineWidth=4; c.strokeStyle=OL; c.stroke(); }
    ground(c,'#a8743c','#7a4f26'); c.strokeStyle='rgba(30,15,5,0.5)'; c.lineWidth=2; for(let x=0;x<W;x+=70){ c.beginPath(); c.moveTo(x,GY); c.lineTo(x-30,H); c.stroke(); }
  },
  depot(c){
    sky(c,'#a99b86','#d9c49c');
    for(let i=0;i<6;i++) cloud(c,100+i*230,90+(i%2)*40,1.1,'rgba(90,80,70,0.35)');
    c.fillStyle='#8a4a36'; c.fillRect(0,180,W,GY-180); c.strokeStyle='rgba(30,15,10,0.45)'; c.lineWidth=2;
    for(let y=180;y<GY;y+=24){ c.beginPath(); c.moveTo(0,y); c.lineTo(W,y); c.stroke(); for(let x=((y/24)%2)*30;x<W;x+=60){ c.beginPath(); c.moveTo(x,y); c.lineTo(x,y+24); c.stroke(); } }
    for(let i=0;i<4;i++){ Art.rrect(c,90+i*300,240,140,170,6,'#3c3a3a',5); c.fillStyle='rgba(255,200,120,0.35)'; c.fillRect(100+i*300,250,120,150); c.beginPath(); c.moveTo(160+i*300,240); c.lineTo(160+i*300,410); c.moveTo(90+i*300,325); c.lineTo(230+i*300,325); c.lineWidth=5; c.strokeStyle=OL; c.stroke(); }
    Art.rrect(c,0,150,W,30,2,'#5a5550',4); for(let x=20;x<W;x+=40) Art.circ(c,x,165,4,'#8a8580',2);
    Art.rrect(c,-10,470,W+20,22,8,'#7a7570',4); Art.rrect(c,860,180,26,300,6,'#7a7570',4);
    ground(c,'#5a5550','#3d3935'); for(let x=0;x<W;x+=80){ Art.rrect(c,x+4,GY+18,72,12,2,'#6d4a2a',2.5); } c.fillStyle='#9a9590'; c.fillRect(0,GY+10,W,6); c.fillRect(0,GY+34,W,6);
  },
  cinema(c){
    c.fillStyle='#1c1418'; c.fillRect(0,0,W,H);
    const g=c.createRadialGradient(W/2,250,40,W/2,250,520); g.addColorStop(0,'rgba(255,240,200,0.25)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(0,0,W,H);
    Art.rrect(c,180,60,920,420,6,'#e8dcc0',8); c.fillStyle='rgba(0,0,0,0.08)'; for(let x=200;x<1080;x+=40) c.fillRect(x,70,2,400);
    for(let i=0;i<2;i++){ const x=i?1110:0; c.fillStyle='#4a0e16'; c.fillRect(x,0,170,GY); c.strokeStyle='rgba(0,0,0,0.5)'; c.lineWidth=3; for(let k=0;k<6;k++){ c.beginPath(); c.moveTo(x+k*30,0); c.lineTo(x+k*30,GY); c.stroke(); } }
    Art.rrect(c,150,30,980,40,6,'#5a1018',5); Art.text(c,'★ RÜYA SİNEMASI ★',W/2,50,22,{title:true,color:'#e2b23a'});
    ground(c,'#4a2a1c','#2e1a12');
  },
  stage(c){
    sky(c,'#c9b48a','#ead7ad');
    c.fillStyle='#8aa06a'; for(let i=0;i<7;i++){ const x=80+i*190; c.beginPath(); c.moveTo(x-60,GY); c.lineTo(x,250+((i*53)%80)); c.lineTo(x+60,GY); c.closePath(); c.fill(); c.lineWidth=4; c.strokeStyle=OL; c.stroke(); Art.rrect(c,x-8,GY-60,16,60,2,'#7a5a32',3); }
    for(let i=0;i<4;i++) cloud(c,150+i*320,100+(i%2)*50,1);
    Art.rrect(c,30,40,W-60,30,4,'#7a5a32',4); Art.text(c,'PROVA SAHNESİ',W/2,56,22,{title:true,color:'#f3e4c2'});
    ground(c,'#b5874a','#8a6234'); c.strokeStyle='rgba(30,15,5,0.4)'; c.lineWidth=2; for(let y=GY+22;y<H;y+=22){ c.beginPath(); c.moveTo(0,y); c.lineTo(W,y); c.stroke(); }
  }
};
Art.BG = BG; Art.BGL = {}; Art.mkCanvas = mk; Art.cloud = cloud;
Art.bg = function(c,id,t,G){
  if(Art.BGL[id]){ Art.BGL[id](c,t,G); return; }
  if(!cache[id]){ const cv=mk(); (BG[id]||BG.stage)(cv.getContext('2d')); cache[id]=cv; }
  c.drawImage(cache[id],0,0);
  // live layers
  if(id==='farm'||id==='stage'){ for(let i=0;i<4;i++){ const x=((i*360+t*(14+i*4))%(W+300))-150; cloud(c,x,70+i*38,0.8+i*0.12); } }
  else if(id==='ballroom'){ c.save(); c.globalCompositeOperation='lighter'; for(let i=0;i<2;i++){ const a=Math.sin(t*0.7+i*2)*0.5; c.save(); c.translate(i?1000:280,40); c.rotate(a); const g=c.createLinearGradient(0,0,0,560); g.addColorStop(0,'rgba(255,240,200,0.28)'); g.addColorStop(1,'rgba(255,240,200,0)'); c.fillStyle=g; c.beginPath(); c.moveTo(-14,0); c.lineTo(14,0); c.lineTo(130,600); c.lineTo(-130,600); c.fill(); c.restore(); } c.restore(); }
  else if(id==='depot'){ [[1000,120,70],[1180,200,50],[60,110,56]].forEach((g,i)=>{ c.save(); c.translate(g[0],g[1]); c.rotate(t*(i%2?-0.6:0.5)); gear(c,g[2],'#6e6a66'); c.restore(); });
    for(let i=0;i<5;i++){ const k=((t*0.25+i/5)%1); c.globalAlpha=0.5*(1-k); Art.circ(c,700+Math.sin(i)*20,170-k*160,20+k*40,'#cfc7bb',0); } c.globalAlpha=1; }
  else if(id==='cinema'){ c.save(); c.globalAlpha=0.08+Math.random()*0.05; c.fillStyle='#fff'; c.fillRect(186,66,908,408); c.restore();
    c.save(); c.globalCompositeOperation='lighter'; c.globalAlpha=0.07; c.fillStyle='#fff6d8'; c.beginPath(); c.moveTo(W/2-20,H); c.lineTo(190,80); c.lineTo(1090,80); c.lineTo(W/2+20,H); c.fill(); c.restore(); }
};
Art.bgFront = function(c,id,t){
  if(id==='cinema'){ c.fillStyle='#0d0809'; for(let i=0;i<22;i++){ const x=i*62-10; c.beginPath(); c.arc(x+30,H+6+Math.sin(t*2+i)*2,26,Math.PI,0); c.fill(); Art.circ(c,x+30,H-24+Math.sin(t*2+i*1.7)*2,15,'#0d0809',0); } }
};
function gear(c,r,col){ c.beginPath(); for(let i=0;i<24;i++){ const a=i/24*Math.PI*2, rr=i%2?r:r*0.82; c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);} c.closePath(); c.fillStyle=col; c.fill(); c.lineWidth=4; c.strokeStyle=OL; c.stroke(); Art.circ(c,0,0,r*0.3,'#3d3935',3); }
Art.gear=gear;

Art.plat = function(c,p,id,t){
  const x=p.x,y=p.y,w=p.w;
  if(id==='farm'){ Art.rrect(c,x,y-4,w,46,10,'#e2c060',4); c.strokeStyle='rgba(120,80,20,0.6)'; c.lineWidth=2; for(let k=10;k<w;k+=14){ c.beginPath(); c.moveTo(x+k,y); c.lineTo(x+k-6,y+40); c.stroke(); } Art.rrect(c,x+w*0.3,y-4,6,46,2,'#b5523a',2); Art.rrect(c,x+w*0.65,y-4,6,46,2,'#b5523a',2); }
  else if(id==='ballroom'){ const bob=Math.sin(t*2+x)*0; Art.ell(c,x+w/2,y+6+bob,w/2,12,'#1d1a1a',4); Art.ell(c,x+w/2,y+4+bob,w*0.16,5,'#d8343a',2); }
  else if(id==='depot'){ Art.rrect(c,x,y-4,w,50,3,'#a8743c',4); c.beginPath(); c.moveTo(x,y-4); c.lineTo(x+w,y+46); c.moveTo(x+w,y-4); c.lineTo(x,y+46); c.lineWidth=3; c.strokeStyle=OL; c.stroke(); }
  else if(id==='cinema'){ Art.rrect(c,x,y-4,w,34,6,'#6a1a22',4); Art.rrect(c,x-6,y-8,w+12,10,4,'#e2b23a',3); }
  else { Art.rrect(c,x,y-4,w,20,4,'#a8743c',4); Art.rrect(c,x+10,y+14,8,40,2,'#7a5a32',3); Art.rrect(c,x+w-18,y+14,8,40,2,'#7a5a32',3); }
};

/* ---------- curtains for menus ---------- */
Art.curtains = function(c,open,t){
  const side=(dir)=>{ c.save(); const w=W/2*(1-open*0.82)+20; if(dir<0){ c.translate(W,0); c.scale(-1,1); }
    const g=c.createLinearGradient(0,0,w,0); g.addColorStop(0,'#4a0a10'); g.addColorStop(0.6,'#a8222c'); g.addColorStop(1,'#6a1018'); c.fillStyle=g;
    c.beginPath(); c.moveTo(0,0); c.lineTo(w,0); c.quadraticCurveTo(w-30,H*0.5,w+Math.sin(t*1.5)*6,H); c.lineTo(0,H); c.fill(); c.lineWidth=6; c.strokeStyle=OL; c.stroke();
    for(let k=1;k<7;k++){ const x=w*k/7; c.beginPath(); c.moveTo(x,0); c.quadraticCurveTo(x-20,H*0.5,x+Math.sin(t*1.5+k)*5,H); c.lineWidth=3; c.strokeStyle='rgba(0,0,0,0.3)'; c.stroke(); }
    c.restore(); };
  side(1); side(-1);
  c.fillStyle='#7a121a'; c.fillRect(0,0,W,56); for(let x=0;x<W;x+=80){ c.beginPath(); c.arc(x+40,56,40,0,Math.PI); c.fill(); c.lineWidth=5; c.strokeStyle=OL; c.stroke(); }
  c.fillStyle='#e2b23a'; c.fillRect(0,50,W,6);
};

/* ---------- world map ---------- */
let mapCv=null;
Art.mapBG = function(c,t){
  if(!mapCv){ mapCv=mk(); const m=mapCv.getContext('2d');
    m.fillStyle='#7fb0b4'; m.fillRect(0,0,W,H);
    m.strokeStyle='rgba(255,255,255,0.35)'; m.lineWidth=3; for(let i=0;i<70;i++){ const x=(i*173)%W, y=(i*97)%H; m.beginPath(); m.arc(x,y,12,Math.PI*1.1,Math.PI*1.9); m.stroke(); }
    const isl=(pts,col)=>{ m.beginPath(); pts.forEach((p,i)=>i?m.lineTo(p[0],p[1]):m.moveTo(p[0],p[1])); m.closePath(); m.fillStyle='#e9d7a6'; m.save(); m.translate(0,10); m.fill(); m.restore(); m.fillStyle=col; m.fill(); m.lineWidth=6; m.strokeStyle=OL; m.stroke(); };
    isl([[90,470],[150,330],[300,250],[480,230],[640,180],[860,160],[1080,130],[1210,200],[1230,330],[1150,460],[1080,600],[880,650],[640,660],[420,640],[220,630],[110,580]],'#9dbb6e');
    m.fillStyle='rgba(60,90,30,0.25)'; for(let i=0;i<40;i++){ const x=200+(i*211)%900, y=260+(i*131)%340; m.beginPath(); m.arc(x,y,6,Math.PI,0); m.fill(); }
    for(let i=0;i<14;i++){ const x=170+(i*157)%980, y=270+(i*89)%330; m.save(); m.translate(x,y); Art.rrect(m,-4,0,8,22,2,'#7a5a32',2.5); Art.circ(m,0,-6,16,'#5f8a3a',3); m.restore(); }
    // cliff + mountains near final
    m.fillStyle='#8a8a8a'; m.beginPath(); m.moveTo(1000,250); m.lineTo(1060,120); m.lineTo(1120,240); m.closePath(); m.fill(); m.lineWidth=4; m.strokeStyle=OL; m.stroke();
    Art.text(m,'SİNEMA ADASI',220,70,40,{title:true,color:'#f3e4c2',stroke:OL,sw:8});
  }
  c.drawImage(mapCv,0,0);
  for(let i=0;i<3;i++){ const x=((t*20+i*450)%(W+200))-100; c.save(); c.globalAlpha=0.7; c.translate(x,60+i*30); [[-30,0,20],[0,-8,26],[28,2,18]].forEach(o=>Art.circ(c,o[0],o[1],o[2],'#fbf3e0',0)); c.restore(); }
};
Art.mapPath = function(c,pts){ c.save(); c.setLineDash([2,14]); c.lineCap='round'; c.lineWidth=8; c.strokeStyle='#7a5a32'; c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y)); c.stroke(); c.restore(); };
Art.mapNode = function(c,n,t,state){
  c.save(); c.translate(n.x,n.y);
  const loc=state.locked;
  switch(n.kind){
    case 'tutorial': Art.rrect(c,-40,-50,80,50,4,'#b5874a',4); Art.rrect(c,-46,-62,92,14,4,'#7a121a',4); Art.text(c,'PROVA',0,-26,15,{title:true,color:'#f3e4c2'}); break;
    case 'run': { const def=RR.BOSS[n.id]; Art.ell(c,0,-6,52,16,'rgba(0,0,0,0.25)',0); if(def&&def.portrait) def.portrait(c,0,-70,0.3,t); Art.rrect(c,-38,-22,76,22,5,'#d8343a',3); Art.text(c,'KOŞU',0,-10,14,{title:true,color:'#fff'}); if(state.beaten){ c.save(); c.translate(40,-100); Art.star(c,0,0,18,'#ffd23a',3); c.restore(); } break; }
    case 'shop': Art.rrect(c,-34,-70,68,70,6,'#d8343a',4); c.beginPath(); c.moveTo(-44,-62); c.lineTo(0,-96); c.lineTo(44,-62); c.closePath(); c.fillStyle='#f3e4c2'; c.fill(); c.lineWidth=4; c.strokeStyle=OL; c.stroke(); Art.rrect(c,-20,-56,40,26,4,'#fff6d0',3); Art.text(c,'BİLET',0,-14,14,{title:true,color:'#fff6d0'}); break;
    case 'boss': {
      const def=RR.BOSS[n.id];
      Art.ell(c,0,-6,58,18,'rgba(0,0,0,0.25)',0);
      if(def&&def.portrait){ c.save(); if(loc) c.globalAlpha=0.45; def.portrait(c,0,-58,0.32,t); c.restore(); }
      if(loc){ Art.rrect(c,-18,-60,36,30,5,'#9aa0a6',4); c.beginPath(); c.arc(0,-60,12,Math.PI,0); c.lineWidth=5; c.stroke(); }
      if(state.beaten){ c.save(); c.translate(40,-100); c.rotate(0.2); Art.star(c,0,0,18,'#ffd23a',3); c.restore(); }
      break; }
  }
  c.restore();
};
})();
