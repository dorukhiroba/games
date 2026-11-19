/* BasketballManager — 2D live match viewer.
   The engine resolves one possession at a time; the viewer turns each result into a short choreography
   (bring-up, the called set from the playbook, extra pass / drive, shot, rebound, free throws) on a full court. */
(function(){
'use strict';
const BM=window.BM, U=BM.U, T=BM.Tactics, E=BM.Engine;
const MV = BM.MatchView = {};
const W=94, H=50, SC=10, CW=W*SC, CH=H*SC, RIM=[0,5.25];
const POSORD={PG:0,SG:1,SF:2,PF:3,C:4};
const cp=a=>a.slice();
const ease=k=>k*k*(3-2*k);
const toFull=(p,right)=>right?[W-p[1],H/2+p[0]]:[p[1],H/2-p[0]];
const hexRgb=h=>{ const n=parseInt(String(h).replace('#',''),16)||0; return [n>>16&255,n>>8&255,n&255]; };
const rgba=(h,a)=>{ const c=hexRgb(h); return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'; };
const cdist=(a,b)=>{ const x=hexRgb(a),y=hexRgb(b); return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2]); };
const lum=h=>{ const c=hexRgb(h); return (0.299*c[0]+0.587*c[1]+0.114*c[2])/255; };
const toward=(a,b,d)=>{ const dx=b[0]-a[0], dy=b[1]-a[1], l=Math.max(0.01,Math.hypot(dx,dy)); return [a[0]+dx/l*Math.min(d,l*0.8),a[1]+dy/l*Math.min(d,l*0.8)]; };
const nearest=(arr,p)=>{ let bi=0,bd=1e9; arr.forEach((q,i)=>{ const d=Math.hypot(q[0]-p[0],q[1]-p[1]); if(d<bd){bd=d;bi=i;} }); return bi; };
const lastName=n=>{ const s=String(n).split(' '); return s.length>1?s.slice(1).join(' '):n; };
const clockStr=c=>{ c=Math.max(0,c); const m=Math.floor(c/60), s=Math.floor(c%60); return m+':'+String(s).padStart(2,'0'); };
const qName=q=>q<=4?q+'Ç':'UZ'+(q-4);
const ZN={rim:'pota altı',mid:'orta mesafe',three:'üçlük'};

/* defensive positions (half-court play coords) for a given offensive layout */
function defSpots(defSet,po,h,press){
  const bp=po[h];
  if(defSet.type==='zone'&&defSet.spots) return defSet.spots.map(s=>[s[0]+(bp[0]-s[0])*0.22,Math.max(1.5,s[1]+(bp[1]-s[1])*0.16)]);
  return po.map((o,i)=>{ const d=Math.max(0.1,Math.hypot(RIM[0]-o[0],RIM[1]-o[1])); const gap=i===h?(press?1.6:2.8):Math.min(6.5,2.4+d*0.16);
    const p=toward(o,RIM,Math.min(gap,d*0.6)); if(i!==h){ p[0]+=(bp[0]-p[0])*0.18; p[1]+=(bp[1]-p[1])*0.1; } return p; });
}
function zoneSpot(z,sp){
  const s=sp[0]>=0?1:-1;
  if(z==='rim') return [U.clamp(sp[0]*0.25,-3,3),6.5];
  if(z==='mid') return [s*U.rnd(5,12),U.rnd(11,18)];
  const a=Math.atan2(sp[0],Math.max(0.5,sp[1]-RIM[1])); let p=[24.8*Math.sin(a),RIM[1]+24.8*Math.cos(a)];
  if(Math.abs(p[0])>21.5&&p[1]<14) p=[s*22.6,Math.max(2,p[1])]; return p;
}

/* ---------- choreography for one engine event ---------- */
function build(v,ev){
  const S=v.S, g=v.g, right=(ev.off==='h')===(ev.q<=2), F=p=>toFull(p,right), full=a=>a.map(F);
  const offIds=ev.on, defIds=ev.don, defSet=T.getDef(ev.def,S), defSide=g[ev.off==='h'?'a':'h'], press=defSide.tac.press||defSet.press;
  const bench=()=>[W/2+U.rnd(-5,5),H+1.2];
  let O=offIds.map(id=>v.pos[id]?cp(v.pos[id]):bench()), D=defIds.map(id=>v.pos[id]?cp(v.pos[id]):bench());
  const keys=[{t:0,O:O.map(cp),D:D.map(cp),B:cp(v.ball)}]; let t=0;
  const push=(dt,o,d,b,x)=>{ t+=dt; keys.push(Object.assign({t,O:o.map(cp),D:d.map(cp),B:cp(b)},x||{})); };
  const hb=p=>[p[0]+0.9,p[1]+0.9];
  const dpos=(po,h)=>defSpots(defSet,po,h,press);
  let po, holder, dp, label;
  if(ev.play==='fast'){
    const idx=offIds.indexOf(ev.type==='shot'?ev.shooter:ev.by); holder=idx<0?0:idx;
    po=[[-17,21],[17,21],[0,27],[-9,33],[9,35]]; po[holder]=[1.5,8];
    dp=[[0,7],[-8,12],[8,12],[-3,19],[5,25]]; label='Hızlı hücum';
    push(2.3,full(po),full(dp),F(hb(po[holder])),{label});
  } else {
    const play=T.getPlay(S,ev.play), tl=T.timeline(play); label=play.name;
    po=tl.frames[0].pos.map(cp); holder=tl.frames[0].holder-1;
    push(press?2.6:1.9,full(po),full(dpos(po,holder)),F(hb(po[holder])),{label});
    let frames=tl.frames.slice(1).filter(f=>f.step.mv||f.step.pass||f.step.scr);
    if(ev.type==='tov') frames=frames.slice(0,U.rint(0,Math.max(0,frames.length-1)));
    frames.forEach(f=>{ po=f.pos.map(cp); holder=f.holder-1; push(Math.max(0.55,f.step.t),full(po),full(dpos(po,holder)),F(hb(po[holder])),{scr:f.step.scr?[f.step.scr[0]-1,f.step.scr[1]-1]:null,pass:!!f.step.pass}); });
    dp=dpos(po,holder);
  }
  if(ev.type==='tov'){
    const bp=po[holder];
    if(ev.stl){ const di=Math.max(0,defIds.indexOf(ev.stl)); dp=dpos(po,holder); dp[di]=[bp[0]+0.7,bp[1]-0.5];
      push(0.45,full(po),full(dp),F(bp),{fx:'steal'}); const run=dp.map(cp); run[di]=[bp[0]*0.5,Math.min(46,bp[1]+13)]; push(0.9,full(po),full(run),F(hb(run[di]))); }
    else push(0.75,full(po),full(dp),F([bp[0]>=0?26.8:-26.8,bp[1]+2]),{arc:2,fx:'out'});
    return keys;
  }
  let si=offIds.indexOf(ev.shooter); if(si<0) si=holder;
  if(si!==holder){ push(0.6,full(po),full(dpos(po,si)),F(hb(po[si])),{pass:true}); holder=si; }
  if(ev.play!=='fast'&&T.zoneOf(po[si][0],po[si][1])!==ev.zone){ po=po.map(cp); po[si]=zoneSpot(ev.zone,po[si]); push(0.8,full(po),full(dpos(po,si)),F(hb(po[si]))); }
  if(ev.putback){ po=po.map(cp); po[si]=[U.rnd(-3,3),U.rnd(5.5,8)]; }
  dp=dpos(po,si); const cd=defSet.type==='zone'?nearest(dp,po[si]):si; dp[cd]=toward(po[si],RIM,2.1);
  push(0.35,full(po),full(dp),F(hb(po[si])));
  if(ev.blk){ const bi=Math.max(0,defIds.indexOf(ev.blk)); dp[bi]=toward(po[si],RIM,1.3); const m=[po[si][0]*0.8+RIM[0]*0.2,po[si][1]*0.8+RIM[1]*0.2]; push(0.3,full(po),full(dp),F(m),{arc:3,fx:'block'}); }
  else push(ev.zone==='three'?1:0.8,full(po),full(dp),F(RIM),{arc:ev.zone==='three'?13:ev.zone==='mid'?9:4});
  if(ev.made) push(0.3,full(po),full(dp),F([0,3.4]),{fx:'made',pts:ev.pts-(ev.ft?ev.ft[0]:0)});
  if(ev.ft){
    const sh=[0,19.5], ol=[[-7.6,10],[7.6,12],[-12,27],[12,27],[-7.6,14]], dl=[[-7.6,7],[7.6,7],[-7.6,15],[7.6,15],[0,31]];
    po=po.map((p,i)=>i===si?sh:ol[(i+5-si)%5]); dp=dl.map(cp);
    push(1.1,full(po),full(dp),F(hb(sh)),{label:'Serbest atış'});
    for(let i=0;i<ev.ft[1];i++){ const mk=i<ev.ft[0];
      push(0.8,full(po),full(dp),F(RIM),{arc:7}); push(0.25,full(po),full(dp),F(mk?[0,3.4]:[U.rnd(-2,2),7]),mk?{fx:'ft'}:{});
      if(i<ev.ft[1]-1) push(0.35,full(po),full(dp),F(hb(sh))); }
  }
  if(ev.reb){ const off=!!ev.oreb, idx=off?offIds.indexOf(ev.reb):defIds.indexOf(ev.reb);
    const spot=[U.rnd(-8,8),U.rnd(4.5,12)]; const po2=po.map(p=>[p[0]*0.75,Math.max(3,p[1]*0.72)]), dp2=dpos(po2,si);
    if(idx>=0){ if(off) po2[idx]=spot; else dp2[idx]=spot; }
    push(0.75,full(po2),full(dp2),F([spot[0]+0.6,spot[1]+0.6]),{arc:4,fx:off?'oreb':'reb'});
  }
  return keys;
}

/* ---------- drawing ---------- */
function drawCourt(g,home){
  const grd=g.createLinearGradient(0,0,0,CH); grd.addColorStop(0,'#dcaa6e'); grd.addColorStop(1,'#c78d52'); g.fillStyle=grd; g.fillRect(0,0,CW,CH);
  g.strokeStyle='rgba(110,62,24,0.13)'; g.lineWidth=1; for(let y=7;y<CH;y+=14){ g.beginPath(); g.moveTo(0,y); g.lineTo(CW,y); g.stroke(); }
  g.save(); g.globalAlpha=0.13; g.fillStyle=home.c1; g.font='700 128px "Barlow Condensed", sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(home.abbr,CW/2,CH/2+8); g.restore();
  g.strokeStyle='rgba(255,255,255,0.92)'; g.lineWidth=2.2;
  g.strokeRect(1.5,1.5,CW-3,CH-3);
  g.beginPath(); g.moveTo(CW/2,0); g.lineTo(CW/2,CH); g.stroke();
  g.beginPath(); g.arc(CW/2,CH/2,6*SC,0,Math.PI*2); g.stroke(); g.beginPath(); g.arc(CW/2,CH/2,2*SC,0,Math.PI*2); g.stroke();
  const a=Math.asin(22/23.75);
  [0,1].forEach(side=>{ const s=side?-1:1, bx=side?W:0, rx=(bx+s*5.25)*SC, ry=25*SC;
    const px=side?(W-19)*SC:0; g.fillStyle=rgba(home.c1,0.5); g.fillRect(px,17*SC,19*SC,16*SC); g.strokeRect(px,17*SC,19*SC,16*SC);
    g.beginPath(); g.arc((bx+s*19)*SC,ry,6*SC,side?Math.PI/2:-Math.PI/2,side?Math.PI*1.5:Math.PI/2); g.stroke();
    g.beginPath(); g.moveTo(bx*SC,3*SC); g.lineTo((bx+s*14.2)*SC,3*SC); g.moveTo(bx*SC,47*SC); g.lineTo((bx+s*14.2)*SC,47*SC); g.stroke();
    g.beginPath(); if(side) g.arc(rx,ry,23.75*SC,Math.PI-a,Math.PI+a); else g.arc(rx,ry,23.75*SC,-a,a); g.stroke();
    g.beginPath(); if(side) g.arc(rx,ry,4*SC,Math.PI/2,Math.PI*1.5); else g.arc(rx,ry,4*SC,-Math.PI/2,Math.PI/2); g.stroke();
    g.save(); g.lineWidth=4; g.strokeStyle='#f4f6f8'; g.beginPath(); g.moveTo((bx+s*4)*SC,22*SC); g.lineTo((bx+s*4)*SC,28*SC); g.stroke(); g.restore();
    g.save(); g.strokeStyle='#ff6a1a'; g.lineWidth=3; g.beginPath(); g.arc(rx,ry,0.75*SC,0,Math.PI*2); g.stroke(); g.restore();
  });
}
function token(g,x,y,col,ring,num,name,hasBall,dim){
  const X=x*SC, Y=y*SC; g.save(); if(dim) g.globalAlpha=0.55;
  g.beginPath(); g.ellipse(X+2,Y+6,17,9,0,0,Math.PI*2); g.fillStyle='rgba(0,0,0,0.22)'; g.fill();
  g.beginPath(); g.arc(X,Y,17,0,Math.PI*2); g.fillStyle=col; g.fill(); g.lineWidth=hasBall?5:3; g.strokeStyle=hasBall?'#ffd23a':ring; g.stroke();
  g.fillStyle=lum(col)>0.62?'#14161a':'#fff'; g.font='700 17px Barlow, sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(String(num),X,Y+1);
  if(name){ g.font='700 14px Barlow, sans-serif'; g.lineWidth=4; g.strokeStyle='rgba(10,14,22,0.8)'; g.strokeText(name,X,Y+29); g.fillStyle='#fff'; g.fillText(name,X,Y+29); }
  g.restore();
}

/* ---------- viewer ---------- */
MV.defSpots=defSpots;
/* ---------- feeds: where the viewer gets its possessions from ----------
   local: the engine runs right here. remote (online): the host runs the engine and streams events;
   the viewer only needs a game-shaped mirror (sides with ids/on/energy/box/score/tac, q, clock, done). */
const BOXK=['sec','pts','fgm','fga','tpm','tpa','ftm','fta','orb','drb','ast','stl','blk','tov','pf','pm'];
MV.BOXK=BOXK;
MV.applyCoach=function(g,k,cmd,to){ const s=g&&g[k]; if(!s||!cmd) return;
  if(cmd.c==='tac'&&['def','pnrD','pace','three','press'].includes(cmd.k)) s.tac[cmd.k]=cmd.k==='press'?!!cmd.v:(cmd.k==='pace'||cmd.k==='three')?+cmd.v:String(cmd.v);
  if(cmd.c==='play'&&typeof cmd.id==='string') s.tac.plays[cmd.id]=U.clamp(Math.round(+cmd.w||0),0,5);
  if(cmd.c==='sub'){ const out=+cmd.out, inn=+cmd.inn, S=g.S||BM.S; if(s.on.includes(out)&&!s.on.includes(inn)&&s.ids.includes(inn)){ s.on=s.on.map(x=>x===out?inn:x).sort((x,y)=>POSORD[S.players[x].pos]-POSORD[S.players[y].pos]); s.hold=(g.elapsed||0)+240; } }
  if(cmd.c==='timeout'&&to&&to[k]>0){ to[k]--; s.on.forEach(id=>{ s.energy[id]=Math.min(1,(s.energy[id]||1)+0.07); }); }
};
MV.localFeed=function(S,h,a){ const g=E.newGame(S,h,a), to={h:7,a:7};
  return {g,to,next(cb){ cb(E.step(g)); },skip(untilQ,cb){ const evs=[]; let guard=0; while(!g.done&&guard++<900){ const ev=E.step(g); if(!ev) break; evs.push(ev); if(untilQ&&ev.endQ) break; } cb(evs); },coach(cmd,k){ MV.applyCoach(g,k,cmd,to); }}; };
MV.snap=(g,to)=>({q:g.q,clock:g.clock,n:g.n,done:g.done,el:g.elapsed,to:to?[to.h,to.a]:null,s:['h','a'].map(k=>{ const s=g[k]; return {tid:s.tid,ids:s.ids,on:s.on,en:s.ids.map(id=>Math.round(s.energy[id]*100)),bx:s.ids.map(id=>BOXK.map(x=>s.box[id][x])),sc:s.score,qf:s.qfouls}; })});
MV.mirror=function(S,h,a){ const mk=tid=>({tid,ids:[],on:[],energy:{},box:{},score:0,qfouls:0,tac:JSON.parse(JSON.stringify(S.teams[tid].tac))}); return {S,h:mk(h),a:mk(a),q:1,clock:720,n:0,done:false,elapsed:0}; };
MV.applySnap=function(m,st,to){ if(!st) return; m.q=st.q; m.clock=st.clock; m.n=st.n; m.done=st.done; m.elapsed=st.el; if(to&&st.to){ to.h=st.to[0]; to.a=st.to[1]; }
  ['h','a'].forEach((k,i)=>{ const x=st.s[i], s=m[k]; s.ids=x.ids; s.on=x.on; s.score=x.sc; s.qfouls=x.qf; s.energy={}; s.box={}; x.ids.forEach((id,j)=>{ s.energy[id]=x.en[j]/100; const b={}; BOXK.forEach((kk,q)=>{ b[kk]=x.bx[j][q]; }); s.box[id]=b; }); }); };
MV.open=function(S,h,a,o){
  o=o||{}; const feed=o.feed||MV.localFeed(S,h,a); const g=feed.g; const H0=S.teams[h], A0=S.teams[a];
  const colH=H0.c1, colA=cdist(A0.c1,H0.c1)<120?A0.c2:A0.c1, ringH=cdist(H0.c2,colH)<60?'#0b111a':H0.c2, ringA=colA===A0.c1?A0.c2:A0.c1;
  const userK=o.userK!==undefined?o.userK:(h===S.user?'h':a===S.user?'a':null); const TO=feed.to||{h:7,a:7};
  const SY=!!feed.sync; /* online: shared clock, speed and pauses for every live game of the day */
  const v={S,g,pos:{},ball:[W/2,H/2],keys:null,t:0,ev:null,speed:o.speed||2,paused:false,alive:true,score:[0,0],q:1,clock:720,banner:null,fx:[],fired:0,names:true,tab:'pbp',sel:null,done:false,waiting:false,waitT:0,rp:null,rpAt:0,info:null};
  MV.cur=v;
  const el=document.createElement('div'); el.className='mv';
  const crest=t=>`<span class="crest" style="background:${t.c1};color:${lum(t.c1)>0.62?'#111':'#fff'}">${t.abbr}</span>`;
  el.innerHTML=`<div class="mv-top">
    <div class="mv-team">${crest(H0)}<div><b>${U.esc(H0.city+' '+H0.name)}</b><small>${H0.w}-${H0.l} · ev sahibi</small></div></div>
    <div class="mv-score"><span data-hs>0</span><div><b data-clock>1Ç 12:00</b><small data-sub>${o.title?U.esc(o.title):''}</small></div><span data-as>0</span></div>
    <div class="mv-team r"><div><b>${U.esc(A0.city+' '+A0.name)}</b><small>${A0.w}-${A0.l} · deplasman</small></div>${crest(A0)}</div><div class="mv-others" data-others style="display:none"></div></div>
  <div class="mv-body"><div class="mv-court"><canvas width="${CW}" height="${CH}"></canvas>
    <div class="mv-ctrl">${SY&&!userK?'':'<button class="btn sm" data-a="pause">⏸ Duraklat</button>'}
      <span class="mv-speed">${[1,2,4,8,16].map(s=>`<button class="btn sm" data-speed="${s}">${s}x</button>`).join('')}</span><span class="dim" data-spd style="font-size:12px"></span>
      <button class="btn sm" data-a="names">İsimler</button><span class="grow"></span>${o.closable?'<button class="btn sm danger" data-a="close">İzlemeyi bırak</button>':''}
      ${SY&&!userK?'':'<button class="btn sm" data-a="quarter">Çeyrek sonuna ⏭</button><button class="btn sm" data-a="end">Maç sonuna ⏭⏭</button>'}</div><div class="mv-last" data-last></div><div class="mv-strip"><div data-ln="h"></div><div data-ln="a"></div></div></div>
    <div class="mv-side"><div class="tabs"><button data-tab="pbp">Anlatım</button><button data-tab="box">Kutu skor</button>${userK?'<button data-tab="coach">Koçluk</button>':''}</div><div data-panel></div></div></div>`;
  document.body.appendChild(el);
  const cv=el.querySelector('canvas'), cx=cv.getContext('2d'), $=s=>el.querySelector(s), panel=$('[data-panel]');
  const pbp=[];
  const P=id=>S.players[id];
  const side=k=>k==='h'?H0:A0;

  function curFrame(){
    if(!v.keys) return null; const ks=v.keys; let i=1; while(i<ks.length-1&&ks[i].t<v.t) i++;
    const k1=ks[i], k0=ks[i-1], span=Math.max(0.001,k1.t-k0.t), raw=U.clamp((v.t-k0.t)/span,0,1), k=ease(raw);
    const L=(A,B,kk)=>A.map((p,j)=>[p[0]+(B[j][0]-p[0])*kk,p[1]+(B[j][1]-p[1])*kk]);
    const b=[k0.B[0]+(k1.B[0]-k0.B[0])*raw,k0.B[1]+(k1.B[1]-k0.B[1])*raw], z=k1.arc?Math.sin(Math.PI*raw)*k1.arc:0;
    return {O:L(k0.O,k1.O,k),D:L(k0.D,k1.D,k),B:b,z,scr:k1.scr,seg:i,raw};
  }
  function render(){
    drawCourt(cx,H0);
    const f=curFrame(), ev=v.ev;
    const drawSide=(ids,ps,k,holderIdx)=>ids.forEach((id,i)=>{ const p=P(id); token(cx,ps[i][0],ps[i][1],k==='h'?colH:colA,k==='h'?ringH:ringA,p.num,v.names?lastName(p.name):'',i===holderIdx,false); });
    if(f&&ev){
      const dk=ev.off==='h'?'a':'h';
      let hi=-1; let bd=2.2; f.O.forEach((p,i)=>{ const d=Math.hypot(p[0]-f.B[0],p[1]-f.B[1]); if(d<bd&&f.z<1){ bd=d; hi=i; } });
      if(f.scr){ const s=f.O[f.scr[0]], tg=f.O[f.scr[1]]; const an=Math.atan2(tg[1]-s[1],tg[0]-s[0])+Math.PI/2; cx.save(); cx.strokeStyle='#ffd23a'; cx.lineWidth=5; cx.lineCap='round'; cx.beginPath(); cx.moveTo((s[0]+Math.cos(an)*1.6)*SC,(s[1]+Math.sin(an)*1.6)*SC); cx.lineTo((s[0]-Math.cos(an)*1.6)*SC,(s[1]-Math.sin(an)*1.6)*SC); cx.stroke(); cx.restore(); }
      drawSide(ev.don,f.D,dk,-1); drawSide(ev.on,f.O,ev.off,hi);
      const bx=f.B[0]*SC, by=f.B[1]*SC; cx.beginPath(); cx.ellipse(bx+2,by+3,6,3.5,0,0,Math.PI*2); cx.fillStyle='rgba(0,0,0,0.28)'; cx.fill();
      const r=7+f.z*0.5; cx.beginPath(); cx.arc(bx,by-f.z*SC*0.55,r,0,Math.PI*2); cx.fillStyle='#ff8a2a'; cx.fill(); cx.lineWidth=1.5; cx.strokeStyle='#5a2a08'; cx.stroke();
      const lab=v.keys.slice(0,f.seg+1).reverse().find(k=>k.label); if(lab){ const txt=(ev.play==='fast'?'':'Hücum: ')+lab.label+(lab.label==='Serbest atış'?'':' · Savunma: '+T.getDef(ev.def,S).name); cx.font='600 18px Barlow, sans-serif'; const w=cx.measureText(txt).width+26; cx.fillStyle='rgba(10,15,24,0.78)'; cx.fillRect(CW/2-w/2,8,w,30); cx.fillStyle=ev.off==='h'?'#fff':'#fff'; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(txt,CW/2,23); }
    } else {
      ['h','a'].forEach(k=>{ const s=g[k]; s.on.forEach((id,i)=>{ const p=P(id), q=v.pos[id]||[W/2+(k==='h'?-8:8)+(i-2)*2.5,H/2+(i-2)*6]; token(cx,q[0],q[1],k==='h'?colH:colA,k==='h'?ringH:ringA,p.num,v.names?lastName(p.name):'',false,false); }); });
      cx.beginPath(); cx.arc(v.ball[0]*SC,v.ball[1]*SC,5.5,0,Math.PI*2); cx.fillStyle='#ff8a2a'; cx.fill();
    }
    v.fx=v.fx.filter(x=>x.life>0); v.fx.forEach(x=>{ cx.save(); cx.globalAlpha=U.clamp(x.life,0,1); cx.font='700 26px "Barlow Condensed", sans-serif'; cx.textAlign='center'; cx.lineWidth=4; cx.strokeStyle='rgba(10,14,22,0.8)'; cx.strokeText(x.text,x.x*SC,x.y*SC-(1-x.life)*30); cx.fillStyle=x.col; cx.fillText(x.text,x.x*SC,x.y*SC-(1-x.life)*30); cx.restore(); });
    if(v.waiting&&v.waitT>1.2&&!v.done&&!v.banner&&!v.rp){ const wt=(typeof feed.waitText==='function'?feed.waitText():feed.waitText)||'Bekleniyor…'; cx.save(); cx.font='600 16px Barlow, sans-serif'; const ww=Math.max(420,cx.measureText(wt).width+40); cx.fillStyle='rgba(8,12,20,0.7)'; cx.fillRect(CW/2-ww/2,CH-46,ww,34); cx.fillStyle='#ffd23a'; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(wt,CW/2,CH-29); cx.restore(); }
    if(v.rp&&!v.done&&!v.banner) drawPause();
    if(v.banner){ cx.save(); cx.fillStyle='rgba(8,12,20,0.78)'; cx.fillRect(0,CH/2-48,CW,96); cx.fillStyle='#fff'; cx.font='700 40px "Barlow Condensed", sans-serif'; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(v.banner.text,CW/2,CH/2-10); cx.font='600 18px Barlow, sans-serif'; cx.fillStyle='#ffb36b'; cx.fillText(v.banner.sub||'',CW/2,CH/2+24); cx.restore(); }
    // header
    $('[data-hs]').textContent=v.score[0]; $('[data-as]').textContent=v.score[1];
    let clk=v.clock, q=v.q; if(v.keys&&v.ev){ const tot=v.keys[v.keys.length-1].t||1; clk=v.clock0+(v.ev.clock-v.clock0)*U.clamp(v.t/tot,0,1); q=v.ev.q; }
    $('[data-clock]').textContent=v.done?'MAÇ SONU':qName(q)+' '+clockStr(clk);
  }
  /* someone paused or took a timeout: every live game waits for them (the host ends it after 90 s at most) */
  function iHold(){ return !!(v.rp&&v.rp.some(p=>p.cid===feed.me)); }
  function pzLeft(){ return Math.max(0,Math.round(Math.max(...v.rp.map(p=>p.left))-(performance.now()-v.rpAt)/1000)); }
  function holdLocal(on,why){ const now=performance.now(), rest=(v.rp||[]).filter(p=>p.cid!==feed.me).map(p=>Object.assign({},p,{left:Math.max(0,p.left-(now-v.rpAt)/1000)}));
    if(on) rest.push({cid:feed.me,name:'Sen',why,left:90}); v.rp=rest.length?rest:null; v.rpAt=now; }
  function drawPause(){ const mine=iHold(), left=pzLeft(), mm=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
    const others=v.rp.filter(p=>p.cid!==feed.me).map(p=>p.name), tmo=v.rp.some(p=>p.why==='timeout');
    const t1='⏸ '+(tmo?'MOLA':'DURAKLATILDI')+' · '+v.rp.map(p=>p.cid===feed.me?'Sen':p.name).join(', ');
    const t2=mine?'Bütün maçlar seni bekliyor. Hazır olunca ▶ Devam (en geç '+mm+')':others.join(', ')+' taktik yapıyor; bütün maçlar durdu. En geç '+mm+' sonra devam.';
    cx.save(); cx.fillStyle='rgba(8,12,20,0.84)'; cx.fillRect(0,CH/2-48,CW,96); cx.textAlign='center'; cx.textBaseline='middle';
    cx.fillStyle='#ffd23a'; cx.font='700 36px "Barlow Condensed", sans-serif'; cx.fillText(t1,CW/2,CH/2-12);
    cx.fillStyle='#e8eef7'; cx.font='600 17px Barlow, sans-serif'; cx.fillText(t2,CW/2,CH/2+24); cx.restore(); }
  function fx(text,p,col){ v.fx.push({text,x:p[0],y:p[1],col:col||'#fff',life:1.2}); }
  function fire(k,ev){ if(!k.fx) return; const at=k.B;
    if(k.fx==='made') fx('+'+(k.pts||2),at,'#ffd23a'); if(k.fx==='block') fx('BLOK!',at,'#7fd0ff'); if(k.fx==='steal') fx('TOP ÇALINDI',at,'#ff9a9a');
    if(k.fx==='ft') fx('+1',at,'#ffd23a'); if(k.fx==='out') fx('TOP KAYBI',at,'#ff9a9a'); if(k.fx==='oreb') fx('Hücum ribaundu',at,'#c8ffde'); }
  function addPbp(ev){ const t=side(ev.off); const txt=U.esc(ev.text||'')+(ev.bonus?' · bonus serbest atış '+ev.bonus[1]+'/2':''); pbp.unshift(`<div class="${ev.pts?'sc':''}"><span class="tm">${qName(ev.q)} ${clockStr(ev.clock)}</span><span class="ab" style="background:${t.c1};color:${lum(t.c1)>0.62?'#111':'#fff'}">${t.abbr}</span>${txt}${ev.pts?` <b>${ev.score[0]}-${ev.score[1]}</b>`:''}</div>`);
    if(ev.endQ) pbp.unshift(`<div class="qe">${qName(ev.endQ)} sonu · ${H0.abbr} ${ev.score[0]} - ${ev.score[1]} ${A0.abbr}</div>`); if(pbp.length>120) pbp.length=120; if(v.tab==='pbp') panelRender(); }
  function next(){ if(v.waiting) return; v.waiting=true; v.waitT=0;
    feed.next(ev=>{ v.waiting=false; if(!v.alive||v.done) return; if(!ev){ finish(); return; } v.ev=ev; v.keys=build(v,ev); v.t=0; v.fired=1; v.clock0=v.clock; });
  }
  function batch(evs,quiet){ v.banner=null; v.waiting=false; if(v.keys) endEvent(); if(v.done) return; evs.forEach(ev=>{ v.ev=ev; v.score=ev.score.slice(); addPbp(ev); }); v.clock=g.clock; v.q=g.q; v.pos={}; v.keys=null;
    if(g.done) finish(); else if(evs.length&&!quiet){ v.banner={text:qName(Math.max(1,g.q-1))+' SONU',sub:H0.abbr+' '+g.h.score+' - '+g.a.score+' '+A0.abbr,t:1.4}; } strip(); panelRender(); }
  feed.onBatch=(evs,quiet)=>{ if(v.alive) batch(evs,quiet); };
  function strip(){ ['h','a'].forEach(k=>{ const s=g[k], t=side(k); const box=el.querySelector('[data-ln="'+k+'"]'); if(!box) return; box.innerHTML='<b>'+t.abbr+' sahada</b> <span class="dim">faul '+s.qfouls+(s.qfouls>=5?' · bonus':'')+'</span><div class="ln">'+s.on.map(id=>{ const p=P(id), e=s.energy[id], b=s.box[id]; return '<div class="pc"><span>'+p.num+' '+U.esc(lastName(p.name))+'</span><span class="dim">'+b.pts+' sy · '+(b.orb+b.drb)+' rb · '+b.ast+' as</span><span class="bar"><i style="width:'+Math.round(e*100)+'%;background:'+(e<0.6?'var(--bad)':e<0.8?'var(--warn)':'var(--good)')+'"></i></span></div>'; }).join('')+'</div>'; });
    const ls=el.querySelector('[data-last]'); if(ls&&v.lastTxt) ls.innerHTML=v.lastTxt; }
  function endEvent(){
    const ev=v.ev, last=v.keys[v.keys.length-1];
    ev.on.forEach((id,i)=>{ v.pos[id]=cp(last.O[i]); }); ev.don.forEach((id,i)=>{ v.pos[id]=cp(last.D[i]); }); v.ball=cp(last.B);
    Object.keys(v.pos).forEach(id=>{ if(!g.h.on.includes(+id)&&!g.a.on.includes(+id)) delete v.pos[id]; });
    v.score=ev.score.slice(); v.clock=g.clock; v.q=g.q; addPbp(ev); v.keys=null; v.lastTxt='<span class="ab" style="background:'+side(ev.off).c1+'">'+side(ev.off).abbr+'</span> '+U.esc(ev.text||''); strip();
    if(ev.end){ finish(); return; }
    if(ev.endQ){ v.banner={text:qName(ev.endQ)+(ev.endQ<4?'. ÇEYREK SONU':ev.endQ===4?' · NORMAL SÜRE BİTTİ':' SONU'),sub:H0.abbr+' '+ev.score[0]+' - '+ev.score[1]+' '+A0.abbr+(ev.endQ===2?' · devre arası':''),t:1.6}; if(v.stopQ){ v.stopQ=false; v.speed=v.prevSpeed||2; syncSpeed(); } }
    if(v.tab==='box'&&g.n%4===0) panelRender(); if(v.tab==='coach'&&g.n%3===0) panelRender();
  }
  function finish(){ if(v.done) return; v.done=true; v.keys=null; v.score=[g.h.score,g.a.score];
    const win=g.h.score>g.a.score?H0:A0; v.banner={text:'MAÇ SONU · '+H0.abbr+' '+g.h.score+' - '+g.a.score+' '+A0.abbr,sub:win.city+' '+win.name+' kazandı'+(g.q>4?' (uzatma)':''),t:1e9};
    $('.mv-ctrl').innerHTML=`<button class="btn sm" data-tab-go="box">Kutu skor</button><span class="grow"></span><button class="btn pri" data-a="close">Devam ›</button>`;
    el.classList.add('final'); strip(); v.tab='box'; panelRender(); render(); }
  function skip(untilQ){ if(v.done) return; if(v.keys) endEvent(); if(v.done) return; feed.skip(untilQ,evs=>batch(evs)); }

  /* ---------- side panel ---------- */
  function boxTable(k){ const s=g[k], t=side(k);
    const rows=s.ids.filter(id=>s.box[id].sec>0||s.on.includes(id)).map(id=>{ const b=s.box[id], p=P(id); return `<tr${s.on.includes(id)&&!v.done?' class="me"':''}><td>${p.num} ${U.esc(lastName(p.name))} <span class="dim">${p.pos}</span></td><td class="n">${Math.round(b.sec/60)}</td><td class="n"><b>${b.pts}</b></td><td class="n">${b.orb+b.drb}</td><td class="n">${b.ast}</td><td class="n">${b.stl}</td><td class="n">${b.blk}</td><td class="n">${b.tov}</td><td class="n">${b.fgm}-${b.fga}</td><td class="n">${b.tpm}-${b.tpa}</td><td class="n">${b.ftm}-${b.fta}</td><td class="n">${b.pm>0?'+':''}${b.pm}</td></tr>`; }).join('');
    const tot=s.ids.reduce((a,id)=>{ const b=s.box[id]; ['pts','orb','drb','ast','stl','blk','tov','fgm','fga','tpm','tpa','ftm','fta'].forEach(x=>a[x]=(a[x]||0)+b[x]); return a; },{});
    return `<h3 style="margin:8px 0 4px">${t.abbr} · ${s.score}</h3><div class="tw" style="max-height:none"><table><tr><th>Oyuncu</th><th class="n">DK</th><th class="n">SY</th><th class="n">RB</th><th class="n">AS</th><th class="n">TÇ</th><th class="n">BL</th><th class="n">TK</th><th class="n">SA</th><th class="n">3S</th><th class="n">SB</th><th class="n">+/-</th></tr>${rows}<tr><td><b>Toplam</b></td><td></td><td class="n"><b>${tot.pts}</b></td><td class="n">${tot.orb+tot.drb}</td><td class="n">${tot.ast}</td><td class="n">${tot.stl}</td><td class="n">${tot.blk}</td><td class="n">${tot.tov}</td><td class="n">${tot.fgm}-${tot.fga}</td><td class="n">${tot.tpm}-${tot.tpa}</td><td class="n">${tot.ftm}-${tot.fta}</td><td></td></tr></table></div><p class="dim" style="font-size:12px;margin:4px 0">SA %${tot.fga?Math.round(tot.fgm/tot.fga*100):0} · 3S %${tot.tpa?Math.round(tot.tpm/tot.tpa*100):0} · SB %${tot.fta?Math.round(tot.ftm/tot.fta*100):0}</p>`; }
  function coachPanel(){ const s=g[userK], tac=s.tac;
    const opt=(arr,cur)=>arr.map(([v0,l])=>`<option value="${v0}"${String(cur)===String(v0)?' selected':''}>${l}</option>`).join('');
    const on=s.on.map(id=>{ const p=P(id); return `<div class="mv-pl${v.sel===id?' on':''}" data-pl="${id}"><span>${p.num} ${U.esc(lastName(p.name))} <span class="dim">${p.pos}</span></span><span class="bar" style="width:60px"><i style="width:${Math.round(s.energy[id]*100)}%;background:${s.energy[id]<0.6?'var(--bad)':s.energy[id]<0.8?'var(--warn)':'var(--good)'}"></i></span><span class="dim">${s.box[id].pts}sy ${s.box[id].pf}f</span></div>`; }).join('');
    const bench=s.ids.filter(id=>!s.on.includes(id)).map(id=>{ const p=P(id); return `<div class="mv-pl${v.sel===id?' on':''}" data-pl="${id}"><span>${p.num} ${U.esc(lastName(p.name))} <span class="dim">${p.pos} · ${p.ovr}</span></span><span class="bar" style="width:60px"><i style="width:${Math.round(s.energy[id]*100)}%"></i></span><span class="dim">${Math.round(s.box[id].sec/60)}dk ${s.box[id].pf}f</span></div>`; }).join('');
    return `<div class="grid" style="gap:8px">
      <div class="row"><button class="btn sm pri" data-a="timeout"${TO[userK]?'':' disabled'}>Mola (${TO[userK]})</button><span class="dim" style="font-size:12px">Mola maçı durdurur, sahadakilere nefes aldırır.</span></div>
      <label>Savunma <select data-tac="def">${opt(T.myDefs(S).map(d=>[d.id,d.name]),tac.def)}</select></label>
      <label>Pick & roll savunması <select data-tac="pnrD">${opt([['drop','Geride bekle (drop)'],['hedge','Hedge / öne çık'],['blitz','İkili sıkıştır (blitz)']],tac.pnrD||'drop')}</select></label>
      <div class="row"><label>Tempo <select data-tac="pace">${opt([[0.9,'Yavaş'],[1,'Normal'],[1.12,'Hızlı']],tac.pace)}</select></label><label>Üçlük <select data-tac="three">${opt([[0.75,'Az'],[1,'Dengeli'],[1.3,'Çok']],tac.three)}</select></label><label class="row" style="gap:4px"><input type="checkbox" data-tac="press"${tac.press?' checked':''}> Pres</label></div>
      <div><b style="font-size:13px">Setler</b><div class="mv-plays">${Object.keys(tac.plays).map(id=>{ const pl=T.getPlay(S,id); return `<label>${U.esc(pl.name)} <select data-play="${id}">${[0,1,2,3,4,5].map(n=>`<option${tac.plays[id]===n?' selected':''}>${n}</option>`).join('')}</select></label>`; }).join('')}</div></div>
      <div><b style="font-size:13px">Sahada</b> <span class="dim" style="font-size:12px">(değiştirmek için sahadaki oyuncuya, sonra yedeğe tıkla)</span>${on}<b style="font-size:13px;display:block;margin-top:6px">Yedekler</b>${bench}</div></div>`; }
  function panelRender(){
    el.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===v.tab));
    if(v.tab==='pbp') panel.innerHTML=`<div class="pbp mv-pbp">${pbp.join('')||'<div class="dim">Hava atışı bekleniyor…</div>'}</div>`;
    if(v.tab==='box') panel.innerHTML=boxTable('h')+boxTable('a');
    if(v.tab==='coach'&&userK) panel.innerHTML=coachPanel();
  }
  function syncSpeed(){ const my=SY?(feed.mySpeed||2):v.speed; el.querySelectorAll('[data-speed]').forEach(b=>{ b.classList.add('tool'); b.classList.toggle('on',+b.dataset.speed===my); });
    const pb=$('[data-a="pause"]'); if(pb){ pb.textContent=SY?(iHold()?'▶ Devam':'⏸ Durdur'):(v.paused?'▶ Devam':'⏸ Duraklat'); if(SY) pb.title=iHold()?'Bütün maçlar seni bekliyor':'Bütün canlı maçları durdurur (en çok 90 sn)'; }
    const sl=$('[data-spd]'); if(sl&&SY){ const sp=(v.info&&v.info.sp)||[]; sl.textContent=sp.length>1?'Ortak hız '+v.speed+'x'+(my!==v.speed?' (en yavaş seçim)':''):''; sl.title=sp.map(x=>x.name+' '+x.v+'x').join(' · '); } }
  el.addEventListener('click',e=>{
    const sw=e.target.closest('[data-sw]'); if(sw){ if(o.onSwitch) o.onSwitch(sw.dataset.sw); return; }
    const tb=e.target.closest('[data-tab],[data-tab-go]'); if(tb){ v.tab=tb.dataset.tab||tb.dataset.tabGo; panelRender(); return; }
    const sp=e.target.closest('[data-speed]'); if(sp){ if(SY){ feed.setSpeed(+sp.dataset.speed); syncSpeed(); return; } v.speed=+sp.dataset.speed; v.paused=false; syncSpeed(); return; }
    const pl=e.target.closest('[data-pl]'); if(pl&&userK){ const id=+pl.dataset.pl, s=g[userK];
      if(v.sel&&v.sel!==id){ const aOn=s.on.includes(v.sel), bOn=s.on.includes(id); if(aOn!==bOn){ const out=aOn?v.sel:id, inn=aOn?id:v.sel; feed.coach({c:'sub',out,inn},userK); BM.UI&&BM.UI.toast(P(inn).name+' oyuna girdi, '+P(out).name+' kenara.'); } v.sel=null; }
      else v.sel=v.sel===id?null:id; panelRender(); return; }
    const b=e.target.closest('[data-a]'); if(!b) return; const a2=b.dataset.a;
    if(a2==='pause'){ if(SY){ const on=!iHold(); feed.pause(on,'pause'); holdLocal(on,'pause'); } else v.paused=!v.paused; syncSpeed(); }
    if(a2==='names'){ v.names=!v.names; }
    if(a2==='quarter') skip(true);
    if(a2==='end') skip(false);
    if(a2==='timeout'&&userK&&TO[userK]>0){ feed.coach({c:'timeout'},userK); if(SY){ feed.pause(true,'timeout'); holdLocal(true,'timeout'); } else v.paused=true; v.tab='coach'; syncSpeed(); panelRender(); BM.UI&&BM.UI.toast(SY?'Mola alındı: bütün maçlar durdu. Ayarları yap, sonra ▶ Devam.':'Mola alındı. Ayarları yap, sonra ▶ Devam.'); }
    if(a2==='close') close();
  });
  el.addEventListener('change',e=>{ if(!userK) return; const k=e.target.dataset.tac, pk=e.target.dataset.play;
    if(k) feed.coach({c:'tac',k,v:k==='press'?e.target.checked:(k==='pace'||k==='three')?+e.target.value:e.target.value},userK);
    if(pk) feed.coach({c:'play',id:pk,w:+e.target.value},userK); });
  function close(silent){ if(!v.alive) return; v.alive=false; el.remove(); MV.cur=null; if(feed.close) feed.close(); if(o.onDone&&silent!==true) o.onDone(g); }
  v.close=close; v.feed=feed;
  /* online: the other live games of the day, with their score and clock; click one to watch it */
  function renderOthers(info){ const box=$('[data-others]'); if(!box) return; const others=(info.ses||[]).filter(s=>s.key!==o.key);
    if(!others.length){ box.style.display='none'; return; } box.style.display='';
    box.innerHTML='<span class="dim">Diğer maçlar</span>'+others.map(s=>{ const Hh=S.teams[s.h], Aa=S.teams[s.a], mine=s.humans.includes(S.user), on=s.live&&!s.done&&!!o.onSwitch;
      const st=s.done?'bitti':s.live?(s.q<=4?s.q+'Ç':'UZ')+' '+clockStr(s.clock):'karar bekleniyor';
      return '<button class="mv-ot'+(mine?' mine':'')+'"'+(on?' data-sw="'+s.key+'"':' disabled')+' title="'+(mine?'Senin maçın':'İzlemek için tıkla')+'"><b>'+Hh.abbr+'</b> '+s.sc[0]+'-'+s.sc[1]+' <b>'+Aa.abbr+'</b> <span class="dim">'+st+'</span>'+(on?(mine?' · ↩ maçına dön':' · 👁 izle'):'')+'</button>'; }).join(''); }
  v.onInfo=function(info){ if(!SY||!info||!v.alive) return; v.info=info; if(!v.done&&info.spd) v.speed=info.spd; const me=(info.ses||[]).find(s=>s.key===o.key); v.pf=me&&me.pf||1;
    v.rp=info.pz&&info.pz.length?info.pz:null; v.rpAt=performance.now();
    const qb=$('[data-a="quarter"]'); if(qb) qb.style.display=(info.ses||[]).some(s=>s.key!==o.key&&s.live&&!s.done)?'none':'';
    renderOthers(info); syncSpeed(); };
  let lastT=performance.now();
  /* online: keep up with the others while this tab is in the background or the browser stops sending animation frames */
  if(SY){ const bg=setInterval(()=>{ if(!v.alive){ clearInterval(bg); return; } if(document.hidden||performance.now()-(v.rafAt||0)>600){ const now=performance.now(), dt=Math.min(1000,now-lastT); lastT=now; tick(dt); } },250); }
  function tick(dt){
    v.fx.forEach(x=>x.life-=dt/1000); if(v.waiting) v.waitT+=dt/1000;
    if(v.banner&&!v.done){ v.banner.t-=dt/1000; if(v.banner.t<=0) v.banner=null; render(); return; }
    if(!v.paused&&!v.rp&&!v.done){
      if(!v.keys) next();
      if(v.keys){ v.t+=dt/1000*v.speed*(v.pf||1)*(feed.backlog&&feed.backlog()>2?5:1); while(v.fired<v.keys.length&&v.keys[v.fired].t<=v.t){ fire(v.keys[v.fired],v.ev); v.fired++; } if(v.t>=v.keys[v.keys.length-1].t) endEvent(); }
    }
    render();
  }
  function loop(now){ if(!v.alive) return; v.rafAt=performance.now(); const dt=Math.min(100,now-lastT); lastT=now; tick(dt); requestAnimationFrame(loop); }
  v.tick=tick; MV.debugTick=ms=>{ for(let i=0;i<ms;i+=50) tick(50); };
  panelRender(); syncSpeed(); strip(); render(); requestAnimationFrame(loop);
  return v;
};
})();
