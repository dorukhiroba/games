/* BasketballManager — playbook (offence sets + defences), play analysis for the engine, and the set editor.
   Half-court coordinates in feet: x lateral -25..25, y distance from the baseline 0..47, rim at (0, 5.25). */
(function(){
'use strict';
const BM=window.BM, U=BM.U;
const T = BM.Tactics = {};
const RIM=[0,5.25];

T.PLAYS = [
  {id:'pnr',name:'Pick & Roll',desc:'Pivot top sahibine perde koyar, oyun kurucu sürer, pivot potaya döner.',
   spots:[[0,31],[-22.5,5],[22.5,5],[-17,22],[8,24]],
   steps:[{t:1.2,mv:[[5,[2,29]]],scr:[5,1]},{t:1.5,mv:[[1,[-9,19]],[5,[2,11]]]},{t:0.7,pass:[1,5]},{t:0.6,shot:5}]},
  {id:'horns',name:'Horns',desc:'İki uzun dirsek başında, perde sonrası pop ya da kenar şutu.',
   spots:[[0,32],[-22,5],[22,5],[-8,20],[8,20]],
   steps:[{t:1,pass:[1,4]},{t:1.3,mv:[[5,[-6,22]],[1,[-14,23]]],scr:[5,1]},{t:0.8,pass:[4,1]},{t:0.6,shot:1}]},
  {id:'motion',name:'Motion (5 açık)',desc:'Sürekli pas ve kesmeyle en açık şutçuyu arar.',
   spots:[[0,30],[-18,20],[18,20],[-22,4],[22,4]],
   steps:[{t:0.8,pass:[1,2]},{t:1.2,mv:[[1,[4,10]],[3,[6,26]]]},{t:0.8,pass:[2,3]},{t:1.1,mv:[[4,[-18,18]],[1,[20,6]]]},{t:0.8,pass:[3,1]},{t:0.6,shot:1}]},
  {id:'iso',name:'İzolasyon',desc:'En iyi skorer bir tarafta tek başına; diğerleri alanı açar.',
   spots:[[-16,24],[0,32],[-22,4],[22,4],[18,12]],
   steps:[{t:0.8,pass:[2,1]},{t:2.2,mv:[[1,[-9,13]]]},{t:0.6,shot:1}]},
  {id:'post',name:'Post-Up',desc:'Uzun oyuncu blokta topu alır, sırtı dönük oynar.',
   spots:[[0,30],[-20,14],[20,14],[22,4],[-8,8]],
   steps:[{t:1,mv:[[1,[-14,22]]]},{t:0.8,pass:[1,5]},{t:1.8,mv:[[5,[-4,7]]]},{t:0.6,shot:5}]},
  {id:'flex',name:'Flex',desc:'Dip çizgide perde ve kesme, ardından dirsekten şut.',
   spots:[[-8,22],[8,22],[-20,6],[20,6],[0,30]],
   steps:[{t:0.8,pass:[1,5]},{t:1.3,mv:[[4,[-4,7]],[3,[6,5]]],scr:[4,3]},{t:0.9,pass:[5,3]},{t:0.6,shot:3}]},
  {id:'spain',name:'Spain Pick & Roll',desc:'Pick & roll, rolün arkasından şutçu perde koyup üçlüğe açılır.',
   spots:[[0,31],[-22,5],[22,5],[-15,24],[3,26]],
   steps:[{t:1.1,mv:[[5,[1,29]],[2,[0,22]]],scr:[5,1]},{t:1.3,mv:[[1,[8,19]],[5,[1,10]],[2,[-1,26]]],scr:[2,5]},{t:0.8,pass:[1,2]},{t:0.6,shot:2}]},
  {id:'dho',name:'El Pası (DHO)',desc:'Uzun oyuncu topu el ele kanattaki şutçuya teslim eder.',
   spots:[[0,30],[-22.5,8],[22.5,8],[-12,24],[10,25]],
   steps:[{t:0.8,pass:[1,4]},{t:1.2,mv:[[4,[-17,23]],[2,[-18,22]]]},{t:0.7,pass:[4,2]},{t:0.6,shot:2}]}
];
T.DEFS = [
  {id:'man',name:'Adam adama',type:'man',press:0,desc:'Her oyuncu kendi adamını tutar. Çevre savunması önemli.'},
  {id:'switch',name:'Adam adama (her perdede değiş)',type:'man',press:0,switching:true,desc:'Perdelerde değişir: pick & roll\'u söndürür, uzunlar kısalara kalabilir.'},
  {id:'z23',name:'2-3 Alan',type:'zone',spots:[[-9,24],[9,24],[-14,9],[0,6],[14,9]],desc:'Potayı kapatır, köşe üçlüklerine açık verir.'},
  {id:'z32',name:'3-2 Alan',type:'zone',spots:[[0,27],[-16,19],[16,19],[-8,8],[8,8]],desc:'Çevreyi baskılar, potada zayıflar.'},
  {id:'z131',name:'1-3-1 Alan',type:'zone',spots:[[0,30],[-17,17],[0,15],[17,17],[0,5]],desc:'Top çalmaya oynar, köşeler riskli.'},
  {id:'press',name:'Tam saha pres',type:'man',press:1,desc:'Top kaybı yaptırır ama yorar ve kolay sayı verebilir.'}
];

T.allPlays=S=>T.PLAYS.concat((S&&S.customPlays)||[]);
T.myPlays=S=>T.allPlays(S).filter(p=>!p.custom||p.own==null||p.own===S.user);
T.myDefs=S=>T.allDefs(S).filter(d=>!d.custom||d.own==null||d.own===S.user);
T.getPlay=(S,id)=>T.allPlays(S).find(p=>p.id===id)||T.PLAYS[0];
T.allDefs=S=>T.DEFS.concat(((S||BM.S)&&(S||BM.S).customDefs)||[]);
T.getDef=(id,S)=>T.allDefs(S).find(d=>d.id===id)||T.DEFS[0];
/* zone shape -> shooting modifiers by zone: who covers the rim, the elbows, the arc and the corners */
T.defMods=function(d){ if(!d||d.type!=='zone'||!d.spots) return {rim:0,mid:0,three:0,tov:0};
  const sp=d.spots, dist=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]), cover=(pt,r)=>Math.max(...sp.map(q=>Math.max(0,1-dist(pt,q)/r)));
  const rimC=sp.reduce((a,q)=>a+Math.max(0,1-dist(q,[0,5.25])/12),0);
  const midC=[[-8,17],[8,17],[0,19]].reduce((a,pt)=>a+cover(pt,8),0);
  const thrC=[[-17,20],[17,20],[0,27],[-22,3],[22,3]].reduce((a,pt)=>a+cover(pt,9),0);
  const top=sp.filter(q=>q[1]>=24).length, wing=sp.filter(q=>Math.abs(q[0])>=15&&q[1]>=12).length, point=sp.some(q=>q[1]>=28)?1:0;
  const c=v=>U.clamp(Math.round(v*1000)/1000,-0.04,0.04);
  return {rim:c(0.005-0.035*rimC),mid:c(0.015-0.02*midC),three:c(0.012-0.01*thrC),tov:c(0.006*top+0.004*wing+0.006*point-0.004)}; };

/* Run a play forward to get every role's position over time (used by the engine, viewer and editor). */
T.timeline=function(play){
  const pos=play.spots.map(s=>s.slice()); let holder=1; const frames=[{t:0,pos:pos.map(p=>p.slice()),holder}]; let t=0; const meta={passes:0,screens:0,shooter:1};
  for(const st of play.steps){
    const from=pos.map(p=>p.slice()); const to=pos.map(p=>p.slice());
    (st.mv||[]).forEach(([r,xy])=>{ to[r-1]=xy.slice(); });
    if(st.scr) meta.screens++;
    if(st.pass){ meta.passes++; }
    t+=st.t; for(let i=0;i<5;i++) pos[i]=to[i].slice();
    if(st.pass) holder=st.pass[1];
    if(st.shot) meta.shooter=st.shot;
    frames.push({t,pos:pos.map(p=>p.slice()),holder,from,step:st});
  }
  if(!play.steps.some(s=>s.shot)) meta.shooter=holder;
  meta.dur=t; return {frames,meta};
};
T.zoneOf=(x,y)=>{ const d=Math.hypot(x-RIM[0],y-RIM[1]); if(d<=8) return 'rim'; if((Math.abs(x)>=21.5&&y<=14)||d>=23.6) return 'three'; return 'mid'; };
/* Features the match engine uses: shot zone, ball movement, screens, spacing at the shot. */
T.analyze=function(play){
  const tl=T.timeline(play), last=tl.frames[tl.frames.length-1].pos, sp=last[tl.meta.shooter-1];
  let dsum=0,n=0,outside=0; for(let i=0;i<5;i++){ if(T.zoneOf(last[i][0],last[i][1])==='three') outside++; for(let j=i+1;j<5;j++){ dsum+=Math.hypot(last[i][0]-last[j][0],last[i][1]-last[j][1]); n++; } }
  const spacing=U.clamp((dsum/n-12)/14,0,1);
  return {zone:T.zoneOf(sp[0],sp[1]),shooter:tl.meta.shooter,passes:tl.meta.passes,screens:tl.meta.screens,dur:tl.meta.dur,spacing,outside};
};

/* ---------- editor (canvas, half court with the rim at the top) ---------- */
const CW=500, CH=470;
const toC=(x,y)=>[(x+25)/50*CW,(y)/47*CH];
const fromC=(cx,cy)=>[U.clamp(cx/CW*50-25,-24.5,24.5),U.clamp(cy/CH*47,0.5,46.5)];
T.drawCourt=function(g,w,h){
  g.fillStyle='#c8955a'; g.fillRect(0,0,w,h);
  g.strokeStyle='rgba(255,255,255,0.9)'; g.lineWidth=2;
  const sx=w/50, sy=h/47, X=x=>(x+25)*sx, Y=y=>y*sy;
  g.strokeRect(1,1,w-2,h-2);
  g.fillStyle='rgba(242,107,29,0.35)'; g.fillRect(X(-8),Y(0),16*sx,19*sy); g.strokeRect(X(-8),Y(0),16*sx,19*sy);
  g.beginPath(); g.ellipse(X(0),Y(19),6*sx,6*sy,0,0,Math.PI*2); g.stroke();
  g.beginPath(); g.moveTo(X(-22),Y(0)); g.lineTo(X(-22),Y(14)); g.stroke(); g.beginPath(); g.moveTo(X(22),Y(0)); g.lineTo(X(22),Y(14)); g.stroke();
  const a0=Math.acos(22/23.75); g.beginPath(); g.ellipse(X(0),Y(5.25),23.75*sx,23.75*sy,0,a0,Math.PI-a0); g.stroke();
  g.beginPath(); g.ellipse(X(0),Y(47),6*sx,6*sy,0,Math.PI,0); g.stroke();
  g.beginPath(); g.moveTo(X(-3),Y(4)); g.lineTo(X(3),Y(4)); g.stroke(); g.strokeStyle='#ff7a2a'; g.beginPath(); g.ellipse(X(0),Y(5.25),0.9*sx,0.9*sy,0,0,Math.PI*2); g.stroke();
};
function dot(g,x,y,txt,col,ring){ g.beginPath(); g.arc(x,y,13,0,Math.PI*2); g.fillStyle=col; g.fill(); g.lineWidth=ring?4:2; g.strokeStyle=ring?'#ffd23a':'#0b111a'; g.stroke(); g.fillStyle='#fff'; g.font='700 13px Barlow, sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(txt,x,y+1); }
function arrow(g,a,b,col,dash){ g.save(); g.strokeStyle=col; g.fillStyle=col; g.lineWidth=2.5; if(dash) g.setLineDash([6,5]); g.beginPath(); g.moveTo(a[0],a[1]); g.lineTo(b[0],b[1]); g.stroke(); g.setLineDash([]); const an=Math.atan2(b[1]-a[1],b[0]-a[0]); g.beginPath(); g.moveTo(b[0],b[1]); g.lineTo(b[0]-10*Math.cos(an-0.4),b[1]-10*Math.sin(an-0.4)); g.lineTo(b[0]-10*Math.cos(an+0.4),b[1]-10*Math.sin(an+0.4)); g.closePath(); g.fill(); g.restore(); }

T.editor=function(root,S,onSave){
  const plays=T.myPlays(S); let play=JSON.parse(JSON.stringify(plays[0])); let tool='move', sel=null, anim=null, def=T.DEFS[0];
  root.innerHTML=`<div class="split"><div><div class="court-wrap"><canvas class="court" width="${CW}" height="${CH}"></canvas></div>
    <div class="row" style="margin-top:8px">${[['move','Yerleştir'],['run','Hareket'],['screen','Perde'],['pass','Pas'],['shot','Şut']].map(([k,l])=>`<button class="btn sm tool" data-tool="${k}">${l}</button>`).join('')}
    <button class="btn sm" data-a="undo">Son adımı sil</button><button class="btn sm" data-a="clear">Adımları temizle</button><button class="btn sm pri" data-a="play">▶ Oynat</button></div>
    <p class="muted" data-hint style="margin:6px 0 0;font-size:13px"></p></div>
    <div><div class="row"><select data-sel style="flex:1">${plays.map(p=>`<option value="${p.id}">${U.esc(p.name)}</option>`).join('')}</select><button class="btn sm" data-a="new">Yeni set</button></div>
    <div class="row" style="margin-top:8px"><input type="text" data-name style="flex:1" maxlength="28"><button class="btn sm pri" data-a="save">Kaydet</button></div>
    <h3 style="margin-top:12px">Adımlar</h3><ol data-steps style="padding-left:20px;margin:0;font-size:14px"></ol>
    <h3 style="margin-top:12px">Analiz</h3><div data-an class="muted" style="font-size:14px"></div>
    <h3 style="margin-top:12px">Savunma önizleme</h3><select data-def>${T.DEFS.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}</select></div></div>`;
  const cv=root.querySelector('canvas'), g=cv.getContext('2d'), $=s=>root.querySelector(s);
  const hint={move:'Oyuncuları sürükleyerek başlangıç yerlerini ayarla.',run:'Önce oyuncuya, sonra gideceği yere tıkla.',screen:'Önce perde koyacak oyuncuya, sonra perde koyulacak oyuncuya tıkla.',pass:'Önce pası atana (topu tutan), sonra alana tıkla.',shot:'Şutu atacak oyuncuya tıkla. Set burada biter.'};
  function cur(){ const tl=T.timeline(play); return tl.frames[tl.frames.length-1]; }
  function draw(){
    T.drawCourt(g,CW,CH); const tl=T.timeline(play);
    if(def.type==='zone'&&def.spots) def.spots.forEach((s,i)=>{ const c=toC(s[0],s[1]); g.globalAlpha=0.55; dot(g,c[0],c[1],'S'+(i+1),'#3b4a63'); g.globalAlpha=1; });
    tl.frames.slice(1).forEach(f=>{ const st=f.step;
      (st.mv||[]).forEach(([r,xy])=>{ const a=toC(...f.from[r-1]), b=toC(...xy); arrow(g,a,b,st.scr&&st.scr[0]===r?'#ffd23a':'#ffffff'); });
      if(st.pass){ const a=toC(...f.from[st.pass[0]-1]), b=toC(...f.pos[st.pass[1]-1]); arrow(g,a,b,'#4ea1ff',true); }
      if(st.shot){ const a=toC(...f.pos[st.shot-1]); arrow(g,a,toC(0,5.25),'#3ccf8e',true); } });
    const fr=anim?anim.frame:tl.frames[tool==='move'?0:tl.frames.length-1];
    fr.pos.forEach((p,i)=>{ const c=toC(p[0],p[1]); dot(g,c[0],c[1],String(i+1),'#f26b1d',sel===i+1); });
    const hb=fr.pos[fr.holder-1]; if(hb){ const c=toC(hb[0],hb[1]); g.beginPath(); g.arc(c[0]+11,c[1]-11,6,0,Math.PI*2); g.fillStyle='#ff9a3a'; g.fill(); g.strokeStyle='#0b111a'; g.lineWidth=2; g.stroke(); }
    $('[data-steps]').innerHTML=play.steps.map((s,i)=>'<li>'+[(s.mv||[]).map(m=>m[0]+' koşar').join(', '),s.scr?s.scr[0]+' → '+s.scr[1]+' perde':'',s.pass?'pas '+s.pass[0]+' → '+s.pass[1]:'',s.shot?s.shot+' şut':''].filter(Boolean).join(' · ')+'</li>').join('')||'<li class="muted">Henüz adım yok</li>';
    const an=T.analyze(play); $('[data-an]').innerHTML=`Şut bölgesi: <b>${{rim:'Pota altı',mid:'Orta mesafe',three:'Üçlük'}[an.zone]}</b> · ${an.passes} pas · ${an.screens} perde · süre ${an.dur.toFixed(1)} sn · boşluk ${(an.spacing*100|0)}% · çizgi dışında ${an.outside}`;
    root.querySelectorAll('.tool').forEach(b=>b.classList.toggle('on',b.dataset.tool===tool)); $('[data-hint]').textContent=hint[tool];
  }
  function pickAt(cx,cy){ const fr=tool==='move'?T.timeline(play).frames[0]:cur(); let best=null,bd=20; fr.pos.forEach((p,i)=>{ const c=toC(p[0],p[1]); const d=Math.hypot(c[0]-cx,c[1]-cy); if(d<bd){bd=d;best=i+1;} }); return best; }
  const evPos=e=>{ const r=cv.getBoundingClientRect(); return [(e.clientX-r.left)*CW/r.width,(e.clientY-r.top)*CH/r.height]; };
  let drag=null;
  cv.addEventListener('pointerdown',e=>{ const [cx,cy]=evPos(e); const hit=pickAt(cx,cy);
    if(tool==='move'){ if(hit){ drag=hit; cv.setPointerCapture(e.pointerId); } return; }
    if(tool==='shot'){ if(hit){ play.steps=play.steps.filter(s=>!s.shot); play.steps.push({t:0.6,shot:hit}); } draw(); return; }
    if(tool==='run'){ if(sel&&!hit){ play.steps.push({t:1.2,mv:[[sel,fromC(cx,cy).map(v=>Math.round(v*10)/10)]]}); sel=null; } else sel=hit; draw(); return; }
    if(tool==='screen'){ if(sel&&hit&&hit!==sel){ const tp=cur().pos[hit-1]; play.steps.push({t:1.1,mv:[[sel,[tp[0]+(tp[0]>0?-2.5:2.5),tp[1]-1.5]]],scr:[sel,hit]}); sel=null; } else sel=hit; draw(); return; }
    if(tool==='pass'){ const h=cur().holder; if(!sel){ if(hit===h) sel=hit; else BM.UI.toast('Topu '+h+' numara tutuyor; pası o atar.'); } else if(hit&&hit!==sel){ play.steps.push({t:0.8,pass:[sel,hit]}); sel=null; } draw(); }
  });
  cv.addEventListener('pointermove',e=>{ if(!drag) return; const [cx,cy]=evPos(e); play.spots[drag-1]=fromC(cx,cy).map(v=>Math.round(v*10)/10); draw(); });
  cv.addEventListener('pointerup',()=>{ drag=null; });
  root.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.tool){ tool=b.dataset.tool; sel=null; draw(); return; }
    const a=b.dataset.a;
    if(a==='undo'){ play.steps.pop(); draw(); }
    if(a==='clear'){ play.steps=[]; draw(); }
    if(a==='new'){ play={id:'c'+Date.now().toString(36),name:'Yeni set',desc:'Kendi çizdiğin set.',spots:T.PLAYS[0].spots.map(s=>s.slice()),steps:[],custom:true}; $('[data-name]').value=play.name; draw(); }
    if(a==='save'){ play.name=($('[data-name]').value||play.name).slice(0,28); if(!play.steps.some(s=>s.shot)) play.steps.push({t:0.6,shot:cur().holder});
      if(!play.custom){ play=Object.assign(JSON.parse(JSON.stringify(play)),{id:'c'+Date.now().toString(36),custom:true}); if(!/\(kopya\)$/.test(play.name)) play.name+=' (kopya)'; }
      onSave&&onSave(JSON.parse(JSON.stringify(play))); }
    if(a==='play'){ if(anim) return; const tl=T.timeline(play); const t0=performance.now();
      const stepA=()=>{ const t=(performance.now()-t0)/1000; let i=1; while(i<tl.frames.length-1&&tl.frames[i].t<t) i++; const f1=tl.frames[i], f0=tl.frames[i-1]; const k=U.clamp((t-f0.t)/Math.max(0.01,f1.t-f0.t),0,1);
        anim={frame:{pos:f0.pos.map((p,j)=>[p[0]+(f1.pos[j][0]-p[0])*k,p[1]+(f1.pos[j][1]-p[1])*k]),holder:k<0.5?f0.holder:f1.holder}}; draw();
        if(t<tl.meta.dur+0.4) requestAnimationFrame(stepA); else { anim=null; draw(); } };
      requestAnimationFrame(stepA); }
  });
  $('[data-sel]').addEventListener('change',e=>{ const p=T.getPlay(S,e.target.value); play=JSON.parse(JSON.stringify(p)); if(!p.custom) play.custom=false; $('[data-name]').value=play.name; draw(); });
  $('[data-def]').addEventListener('change',e=>{ def=T.getDef(e.target.value); draw(); });
  $('[data-name]').value=play.name; draw();
};
})();
