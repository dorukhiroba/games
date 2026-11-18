/* Reel Rumble — UI helpers + title, main menu, story, settings, how-to, ending */
(function(){
'use strict';
const U=RR.U, Art=RR.Art, OL=Art.OL, In=RR.Input, A=RR.Audio, W=RR.W, H=RR.H;
RR.Scenes = RR.Scenes || {};
RR.S = RR.S || {mode:'solo',role:null,remoteLoad:null,hostNode:0};
const UI = RR.UI = {};

UI.nav = function(sel,n,horiz){
  const a=horiz?'left':'up', b=horiz?'right':'down';
  if(In.m(a)){ sel=(sel-1+n)%n; A.sfx('move'); } if(In.m(b)){ sel=(sel+1)%n; A.sfx('move'); } return sel;
};
UI.list = function(c,items,sel,x,y,o){
  o=o||{}; const gap=o.gap||58, size=o.size||34, t=RR.time||0;
  items.forEach((it,i)=>{
    const yy=y+i*gap, on=i===sel, lab=typeof it==='string'?it:it.label, dis=it.dis;
    if(on){ c.save(); c.translate(x-(o.left?20:0)-(o.left?0:measure(c,lab,size)/2)-38+Math.sin(t*8)*5,yy); Art.glove(c,0,0,13,Math.PI); c.restore(); }
    Art.text(c,lab,x,yy,size,{title:true,align:o.left?'left':'center',color:dis?'#9a8a7a':on?'#d8343a':(o.color||'#2a1d14'),stroke:o.stroke,sw:o.sw});
  });
};
function measure(c,s,size){ c.save(); c.font=size+"px 'Rye', Georgia, serif"; const w=c.measureText(s).width; c.restore(); return w; }
UI.measure=measure;
UI.hint = function(c,s,y){ UI.rich(c,In.device==='pad'?UI.padify(s):s,W/2,y||H-26,16,{color:'#fff3d6',stroke:OL,sw:4}); };
/* gamepad prompts: tokens like {A} {RT} {START} {DPAD}, or {@jump} for whatever button that action is mapped to */
const BTN=['A','B','X','Y','LB','RB','LT','RT','SELECT','START','LS','RS','UP','DOWN','LEFT','RIGHT'];
UI.btnName=i=>BTN[i]||('#'+i);
UI.actTok=act=>{ const l=In.padMap()[act]; return l&&l.length?l.map(i=>'{'+UI.btnName(i)+'}').join(' / '):'—'; };
UI.padify=s=>String(s).replace(/Yön tuşları/g,'{DPAD}').replace(/Z ?\/ ?Enter/g,'{A}').replace(/Esc \/ Z/g,'{B}').replace(/\bZ:/g,'{A}:')
  .replace(/Esc:/g,'{B}:').replace(/Tab\/E:/g,'{Y}:').replace(/Tab:/g,'{Y}:').replace(/↑↓:|←→:/g,'{DPAD}:').replace(/\s*•\s*F: tam ekran/,'');
const glyphW=n=>/^(LB|RB|LT|RT)$/.test(n)?1.6:/^(START|SELECT|DPAD)$/.test(n)?1.3:1.15;
UI.glyph = function(c,name,x,y,s){
  const ps=In.padStyle==='ps', OLc=Art.OL;
  const face={A:ps?['✕','#5a8ee8']:['A','#3fae49'],B:ps?['○','#e0485a']:['B','#d8343a'],X:ps?['□','#d878c8']:['X','#2f6fd6'],Y:ps?['△','#3fbf8a']:['Y','#e2b23a']};
  c.save(); c.translate(x,y);
  if(face[name]){ Art.circ(c,0,0,s*0.5,face[name][1],2.5); Art.text(c,face[name][0],0,1,s*0.62,{bold:true,color:'#fff'}); }
  else if(/^(LB|RB|LT|RT)$/.test(name)){ const lab=ps?{LB:'L1',RB:'R1',LT:'L2',RT:'R2'}[name]:name, w=s*1.5; Art.rrect(c,-w/2,-s*0.4,w,s*0.8,s*(name[1]==='T'?0.18:0.36),'#3a3a44',2.5); Art.text(c,lab,0,1,s*0.5,{bold:true,color:'#fff'}); }
  else if(name==='START'||name==='SELECT'){ const w=s*1.2; Art.rrect(c,-w/2,-s*0.34,w,s*0.68,s*0.34,'#3a3a44',2.5); Art.text(c,name==='START'?'☰':'⧉',0,1,s*0.55,{bold:true,color:'#fff'}); }
  else if(/^(DPAD|UP|DOWN|LEFT|RIGHT)$/.test(name)){ const a=s*0.19,b=s*0.52; c.beginPath(); c.rect(-a,-b,a*2,b*2); c.rect(-b,-a,b*2,a*2); c.fillStyle='#3a3a44'; c.fill(); c.lineWidth=2; c.strokeStyle=OLc; c.stroke();
    const hi={UP:[0,-b*0.6],DOWN:[0,b*0.6],LEFT:[-b*0.6,0],RIGHT:[b*0.6,0]}[name]; if(hi){ Art.circ(c,hi[0],hi[1],a*0.8,'#ffd23a',0); } }
  else if(name==='LS'||name==='RS'){ Art.circ(c,0,0,s*0.48,'#3a3a44',2.5); Art.circ(c,0,0,s*0.27,'#5a5a66',0); Art.text(c,name[0],0,1,s*0.42,{bold:true,color:'#fff'}); }
  else Art.text(c,name,0,1,s*0.45,{bold:true,color:'#fff',stroke:OLc,sw:3});
  c.restore();
};
UI.rich = function(c,s,x,y,size,o){
  o=o||{}; const bold=o.bold!==false;
  const parts=String(s).split(/(\{@?[A-Za-z]+\})/).filter(Boolean).flatMap(p=>{ const m=p.match(/^\{(@?)([A-Za-z]+)\}$/); if(!m) return [{t:p}];
    if(m[1]) return UI.actTok(m[2]).split(/(\{[A-Z]+\})/).filter(Boolean).map(q=>{ const k=q.match(/^\{([A-Z]+)\}$/); return k?{g:k[1]}:{t:q}; });
    return [{g:m[2].toUpperCase()}]; });
  const gs=size*1.3;
  c.save(); c.font=(bold?'700 ':'')+size+"px 'Courier Prime','Courier New',monospace";
  const ws=parts.map(p=>p.g?gs*glyphW(p.g)+4:c.measureText(p.t).width); c.restore();
  const total=ws.reduce((a,b)=>a+b,0); let cx=o.align==='left'?x:o.align==='right'?x-total:x-total/2;
  parts.forEach((p,i)=>{ if(p.g) UI.glyph(c,p.g,cx+ws[i]/2,y,gs); else Art.text(c,p.t,cx,y,size,{align:'left',bold,color:o.color||'#fff3d6',stroke:o.stroke,sw:o.sw}); cx+=ws[i]; });
};
UI.toast = function(msg,ms){ const el=document.getElementById('toast'); if(!el) return; el.textContent=msg; el.classList.remove('hidden'); clearTimeout(UI._tt); UI._tt=setTimeout(()=>el.classList.add('hidden'),ms||3000); };
UI.stage = function(c,t){ c.fillStyle='#2a1418'; c.fillRect(0,0,W,H); const g=c.createRadialGradient(W/2,H*0.45,40,W/2,H*0.45,560); g.addColorStop(0,'rgba(255,230,180,0.55)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(0,0,W,H);
  c.fillStyle='#6a3a1e'; c.fillRect(0,H-90,W,90); c.strokeStyle='rgba(0,0,0,0.4)'; c.lineWidth=2; for(let x=0;x<W;x+=60){ c.beginPath(); c.moveTo(x,H-90); c.lineTo(x-20,H); c.stroke(); } c.beginPath(); c.moveTo(0,H-90); c.lineTo(W,H-90); c.lineWidth=5; c.strokeStyle=OL; c.stroke(); };
UI.hero = function(c,ch,x,y,t,id,o){ o=o||{}; const p={id:id||0,char:ch,x,y,vx:o.run?200:0,vy:o.vy||0,face:o.face||1,onGround:!o.air,aimX:o.aimX!=null?o.aimX:1,aimY:o.aimY||0,runT:t,landT:0,shootT:o.shoot?0.1:0,parryT:o.parry?0.1:0,starT:0,superT:0,dead:false,invT:0,hurtT:0,duck:false,dashT:0}; Art.player(c,p,t); };
UI.logo = function(c,x,y,s,t){ c.save(); c.translate(x,y); c.scale(s,s); c.rotate(-0.03);
  Art.text(c,'REEL',-10,-70,130,{title:true,color:'#d8343a',stroke:OL,sw:16,shadow:'rgba(0,0,0,0.55)',sd:10});
  Art.text(c,'RUMBLE',10,50,130,{title:true,color:'#2f6fd6',stroke:OL,sw:16,shadow:'rgba(0,0,0,0.55)',sd:10});
  c.save(); c.translate(0,138); c.rotate(0.02); Art.rrect(c,-230,-26,460,52,10,'#f3e4c2',5); Art.text(c,'MAKARA KAPIŞMASI',0,2,32,{title:true,color:'#2a1d14'}); c.restore();
  c.restore(); };

/* ---------- title ---------- */
RR.Scenes.title = {
  enter(){ this.t=0; A.playMusic('title'); In.consumeAny(); },
  update(dt){ this.t+=dt; if(this.t>0.6&&In.consumeAny()){ A.unlock(); A.playMusic('title'); A.sfx('select'); RR.go('menu'); } },
  draw(c){ const t=this.t; UI.stage(c,t);
    Art.curtains(c,U.clamp(t/1.5,0,1),t);
    UI.logo(c,W/2,250+Math.sin(t*2)*6,1,t);
    UI.hero(c,'bobbin',380,H-90,t,0,{run:false,vy:Math.sin(t*6)*-300});
    UI.hero(c,'bolt',900,H-90,t+1,1,{face:-1});
    if(Math.floor(t*2)%2===0) Art.text(c,'Başlamak için bir tuşa bas',W/2,560,30,{title:true,color:'#fff3d6',stroke:OL,sw:6});
    Art.text(c,'Özgün bir 1930\'lar çizgi film macerası • v1.0',W/2,H-24,15,{bold:true,color:'#f3e4c2'});
  }
};

/* ---------- main menu ---------- */
RR.Scenes.menu = {
  base:[{label:'Tek Oyuncu',id:'solo'},{label:'Yerel Çok Oyunculu (2-4)',id:'local'},{label:'Çevrimiçi (2-4 Kişi)',id:'online'},{label:'Boss Maratonu',id:'rush'},{label:'Başarımlar',id:'ach'},{label:'Nasıl Oynanır',id:'howto'},{label:'Ayarlar',id:'settings'}],
  enter(){ this.t=0; this.items=this.base.concat(window.KQuit&&KQuit.onSite?[{label:'Oyunlardan Çık',id:'quit'}]:[]); this.sel=Math.min(this.sel||0,this.items.length-1); A.playMusic('menu'); if(RR.Net&&RR.Net.connected) RR.Net.close(); RR.S.mode='solo'; RR.S.role=null; },
  update(dt){ this.t+=dt; this.sel=UI.nav(this.sel,this.items.length);
    if(In.m('back')){ A.sfx('back'); RR.go('title'); return; }
    if(In.m('ok')){ const id=this.items[this.sel].id; A.sfx('select');
      if(id==='solo'){ RR.S.mode='solo'; RR.S.role=null; RR.S.mapPos=null; RR.go(RR.Save.d.seenStory?'map':'story'); }
      else if(id==='local') RR.go('join');
      else if(id==='online') RR.go('online'); else if(id==='quit') KQuit.go(); else RR.go(id,{back:'menu'}); } },
  draw(c){ const t=this.t; UI.stage(c,t); Art.curtains(c,1,t); UI.logo(c,W/2,170,0.62,t);
    Art.panel(c,W/2-260,262,520,30+this.items.length*44); UI.list(c,this.items,this.sel,W/2,298,{gap:44,size:27});
    UI.hero(c,'bobbin',170,H-90,t,0,{shoot:true}); UI.hero(c,'bolt',W-170,H-90,t,1,{face:-1,shoot:true});
    Art.text(c,'Jeton: '+RR.Save.d.coins,W-30,30,20,{title:true,align:'right',color:'#ffd23a',stroke:OL,sw:5});
    UI.hint(c,'Yön tuşları: seç  •  Z / Enter: onayla  •  Esc: geri  •  F: tam ekran',H-8); }
};

/* ---------- story ---------- */
const STORY=[
  ['Bir Gece Yarısı...','Bobbin ve Bolt, kasabanın eski Rüya Sineması\'na gece yarısı gösterimi için gizlice girdiler. Salon bomboştu, sadece makine tıkırdıyordu.'],
  ['Işık! Kamera!','Perde açılınca tuhaf bir projeksiyon makinesi onları ışığıyla yakaladı ve fırrr diye filmin içine çekti!'],
  ['Projeksiyoncu Konuşuyor','"Filmimdeki her yıldızı yenmeden buradan çıkamazsınız! Yenilirseniz sonsuza dek siyah-beyaz kalırsınız, ha-ha!"'],
  ['Sinema Adası','Adadaki üç kara yıldızını ve iki gökyüzü yıldızını yen, Lunapark Yolu\'nda jeton topla, Bilet Gişesi\'nden yeni silahlar al ve sonunda Projeksiyoncu\'yla yüzleş. Kamera... MOTOR!']
];
RR.Scenes.story = {
  enter(){ this.i=0; this.t=0; A.playMusic('menu'); },
  update(dt){ this.t+=dt; if(In.m('ok')){ A.sfx('select'); this.i++; this.t=0; if(this.i>=STORY.length) this.finish(); } if(In.m('back')) this.finish(); },
  finish(){ RR.Save.d.seenStory=true; RR.Save.save(); RR.go('map'); },
  draw(c){ const t=this.t, s=STORY[Math.min(this.i,STORY.length-1)]; c.fillStyle='#1a1210'; c.fillRect(0,0,W,H);
    c.save(); c.translate(W/2,H/2-30); c.scale(U.easeBack(Math.min(1,t*3)),U.easeBack(Math.min(1,t*3))); Art.panel(c,-420,-230,840,400);
    Art.text(c,s[0],0,-170,44,{title:true,color:'#d8343a'});
    const k=this.i;
    if(k===0){ UI.hero(c,'bobbin',-80,40,t,0,{face:1}); UI.hero(c,'bolt',60,40,t,1,{face:-1}); }
    else if(k===1){ c.save(); c.globalAlpha=0.6; c.fillStyle='#fff6d0'; c.beginPath(); c.moveTo(300,-120); c.lineTo(-200,-40); c.lineTo(-200,90); c.fill(); c.restore(); UI.hero(c,'bobbin',-130,40,t*3,0,{air:true,vy:-400}); UI.hero(c,'bolt',-30,30,t*3,1,{air:true,vy:-200}); }
    else if(k===2){ RR.BOSS.proj.portrait(c,0,-30,0.62,t); }
    else { UI.hero(c,'bobbin',-100,40,t,0,{shoot:true}); UI.hero(c,'bolt',100,40,t,1,{shoot:true,face:-1}); }
    c.restore();
    Art.wrap(c,s[1],W/2,H-150,900,30,22,{bold:true,color:'#f3e4c2'});
    UI.hint(c,'Z / Enter: devam  •  Esc: atla'); }
};

/* ---------- settings ---------- */
RR.Scenes.settings = {
  enter(a){ if(a&&a.back) this.back=a.back; this.back=this.back||'menu'; this.sel=a&&a.keepSel?this.sel||0:0; this.confirm=false; this.t=0; },
  rows(){
    const s=RR.Save.d.set, onoff=v=>v?'Açık':'Kapalı', me=this;
    return [
      {n:'Müzik',bar:Math.round(s.music*10),adj:d=>{ s.music=U.clamp(Math.round(s.music*10+d)/10,0,1); A.applyVol(); A.sfx('move'); }},
      {n:'Efektler',bar:Math.round(s.sfx*10),adj:d=>{ s.sfx=U.clamp(Math.round(s.sfx*10+d)/10,0,1); A.applyVol(); A.sfx('coin'); }},
      {n:'Film efekti',v:onoff(s.filter),tog:()=>{ s.filter=!s.filter; }},
      {n:'Ekran sarsıntısı',v:onoff(s.shake),tog:()=>{ s.shake=!s.shake; }},
      {n:'Boss can barı',v:onoff(s.bossbar),tog:()=>{ s.bossbar=!s.bossbar; }},
      {n:'Çarpışma kutuları',v:onoff(s.hitbox),tog:()=>{ s.hitbox=!s.hitbox; }},
      {n:'Sunucu sesi',v:onoff(s.voice),tog:()=>{ s.voice=!s.voice; if(s.voice&&RR.say) RR.say('Motor!'); }},
      {n:'Kol titreşimi',v:onoff(s.rumble),tog:()=>{ s.rumble=!s.rumble; if(s.rumble) In.rumbleAll(0.6,250); }},
      {n:'Çubuk ölü bölgesi',bar:Math.round(((s.dead||0.45)-0.15)/0.05),adj:d=>{ s.dead=U.clamp(Math.round(((s.dead||0.45)+d*0.05)*100)/100,0.15,0.65); A.sfx('move'); }},
      {n:'Kol tuşları',v:'Ayarla ›',ok:()=>{ A.sfx('select'); RR.go('padmap'); }},
      {n:'Tam ekran',v:document.fullscreenElement?'Açık':'Kapalı',tog:()=>{ RR.toggleFull(); }},
      {n:'Kaydı sıfırla',v:this.confirm?'EMİN MİSİN?':'',ok:()=>{ if(me.confirm){ const keep=Object.assign({},s); RR.Save.reset(); RR.Save.d.set=keep; RR.Save.save(); me.confirm=false; A.sfx('boom'); UI.toast('Kayıt sıfırlandı.'); } else { me.confirm=true; A.sfx('deny'); } }},
      {n:'Geri',v:'',ok:()=>{ A.sfx('back'); RR.Save.save(); RR.go(me.back); }}
    ];
  },
  update(dt){
    this.t+=dt; const rows=this.rows(), prev=this.sel; this.sel=UI.nav(this.sel,rows.length); if(prev!==this.sel) this.confirm=false;
    if(In.m('back')){ A.sfx('back'); RR.Save.save(); RR.go(this.back); return; }
    const r=rows[this.sel], d=(In.m('right')?1:0)-(In.m('left')?1:0), ok=In.m('ok');
    if(r.adj&&d){ r.adj(d); RR.Save.save(); }
    else if(r.tog&&(d||ok)){ r.tog(); A.sfx('move'); RR.Save.save(); }
    else if(r.ok&&ok){ r.ok(); RR.Save.save(); }
  },
  draw(c){ UI.stage(c,this.t); Art.curtains(c,1,this.t); Art.panel(c,W/2-340,62,680,616);
    Art.text(c,'AYARLAR',W/2,104,42,{title:true,color:'#d8343a'});
    this.rows().forEach((r,i)=>{ const y=150+i*39, on=i===this.sel;
      if(on){ c.save(); c.fillStyle='rgba(216,52,58,0.12)'; c.fillRect(W/2-310,y-18,620,36); c.restore(); }
      Art.text(c,r.n,W/2-290,y,23,{title:true,align:'left',color:on?'#d8343a':'#2a1d14'});
      if(r.bar!=null){ for(let k=0;k<10;k++) Art.rrect(c,W/2+60+k*22,y-11,16,22,3,k<r.bar?'#d8343a':'#fffaf0',2.5); }
      else Art.text(c,r.v,W/2+290,y,20,{bold:true,align:'right',color:r.v==='EMİN MİSİN?'?'#d8343a':'#2a1d14'}); });
    UI.hint(c,'←→: değiştir  •  Z: seç  •  Esc: geri',H-22); }
};

/* ---------- gamepad button mapping ---------- */
const PADROWS=[['jump','Zıpla / Savuştur'],['shoot','Ateş'],['ex','EX / Süper'],['dash','Atılma'],['lock','Sabitle & nişan'],['swap','Silah değiştir']];
RR.Scenes.padmap = {
  enter(){ this.sel=0; this.wait=false; this.wt=0; this.t=0; },
  update(dt){
    this.t+=dt; const n=PADROWS.length+2;
    if(this.wait){
      this.wt+=dt; const e=In.btnEdge;
      if(In.key('Escape')||this.wt>6){ this.wait=false; A.sfx('back'); In.eat(); return; }
      if(e>=0&&this.wt>0.2){
        if(e===8||e===9||(e>=12&&e<=15)){ A.sfx('deny'); UI.toast('Start, Select ve D-pad menü ve hareket için ayrılmış.'); }
        else {
          const s=RR.Save.d.set, pm=In.padMap(), old=pm[this.act].filter(x=>x!==e);
          for(const k in pm){ if(k===this.act||!pm[k].includes(e)) continue; pm[k]=pm[k].filter(x=>x!==e); if(!pm[k].length) pm[k]=old.length?[old[0]]:[]; }
          pm[this.act]=[e];
          s.padmap=pm; RR.Save.save(); A.sfx('select'); In.rumbleAll(0.4,120);
        }
        this.wait=false; In.eat();
      }
      return;
    }
    this.sel=UI.nav(this.sel,n);
    if(In.m('back')){ A.sfx('back'); RR.go('settings',{keepSel:true}); return; }
    if(In.m('ok')){
      if(this.sel<PADROWS.length){ if(!In.padCount()){ A.sfx('deny'); UI.toast('Önce kolu bağla ve bir tuşuna bas.'); return; } this.act=PADROWS[this.sel][0]; this.wait=true; this.wt=0; A.sfx('tele'); }
      else if(this.sel===PADROWS.length){ RR.Save.d.set.padmap=null; RR.Save.save(); A.sfx('coin'); UI.toast('Kol tuşları varsayılana döndü.'); }
      else { A.sfx('back'); RR.go('settings',{keepSel:true}); }
    }
  },
  draw(c){ UI.stage(c,this.t); Art.curtains(c,1,this.t); Art.panel(c,W/2-360,80,720,560);
    Art.text(c,'KOL TUŞLARI',W/2,128,42,{title:true,color:'#d8343a'});
    const pads=In.padList();
    Art.text(c,pads.length?('🎮 '+pads.length+' kol bağlı · '+(In.padStyle==='ps'?'PlayStation':'Xbox')+' düzeni'):'Kol bağlı değil — koldaki bir tuşa bas',W/2,168,17,{bold:true,color:pads.length?'#3a7a4a':'#8a1820'});
    PADROWS.forEach((r,i)=>{ const y=218+i*50, on=i===this.sel;
      if(on){ c.save(); c.fillStyle='rgba(216,52,58,0.12)'; c.fillRect(W/2-330,y-22,660,44); c.restore(); }
      Art.text(c,r[1],W/2-300,y,25,{title:true,align:'left',color:on?'#d8343a':'#2a1d14'});
      if(this.wait&&on) Art.text(c,Math.floor(this.t*3)%2?'Bir tuşa bas…':'',W/2+300,y,20,{bold:true,align:'right',color:'#d8343a'});
      else UI.rich(c,UI.actTok(r[0]),W/2+300,y,18,{align:'right',color:'#2a1d14'}); });
    const yb=218+PADROWS.length*50;
    [['Varsayılana dön',PADROWS.length],['Geri',PADROWS.length+1]].forEach(([t,i],k)=>{ const on=this.sel===i; Art.text(c,t,W/2,yb+k*46,26,{title:true,color:on?'#d8343a':'#2a1d14'}); });
    UI.hint(c,this.wait?'Atamak istediğin tuşa bas  •  Esc: vazgeç':'↑↓: seç  •  Z: tuş ata  •  Esc: geri',H-22); }
};

/* ---------- how to play ---------- */
const HOW=[
  ['KLAVYE (Tek Oyuncu)',[['Hareket','Yön tuşları / WASD'],['Zıpla','Z  /  Boşluk  /  J'],['Ateş','X  /  K (basılı tut)'],['EX / Süper','C  /  I'],['Atılma (dash)','Shift  /  L'],['Sabitle & 8 yöne nişan','V  /  U'],['Silah değiştir','Tab  /  Q  /  O'],['Duraklat','Esc  /  P'],['Tam ekran','F']]],
  ['YEREL ÇOK OYUNCULU (2-4)',[['Katılma','Katılma ekranında ZIPLA tuşuna bas'],['Klavye 1','WASD + J zıpla / K ateş / L atıl'],['Klavye 1 diğer','I EX / U sabitle / O silah'],['Klavye 2','Yön tuşları + Num1 / Num2 / Num3'],['Klavye 2 diğer','Num0 EX / Num4 sabitle / Num5 silah'],['Kollar','Her kol bir oyuncu, en fazla 4 kişi'],['Karakter / ayrılma','◀ ▶ karakter, atılma tuşu ayrılır'],['Haritada','Herkes yürür; yanına gidip zıpla: gir']]],
  ['GAMEPAD',[['Hareket','Sol çubuk / D-pad'],['Zıpla','A'],['Ateş','X  /  RT'],['EX / Süper','B'],['Atılma','RB'],['Sabitle','LB  /  LT'],['Silah değiştir','Y'],['Duraklat','Start'],['Tuşlar, titreşim, ölü bölge','Ayarlar menüsünden değişir']]],
  ['UÇAK BÖLÜMLERİ',[['Uçuş','8 yöne serbest hareket'],['Ateş','Ateş tuşu (basılı tut)'],['Makineli / Bomba','Silah değiştir tuşu'],['Küçül','Atılma tuşunu BASILI tut: küçük, hızlı, zor vurulur'],['Savuştur','Zıpla tuşu (pembe nesnelere)'],['EX torpido','EX tuşu (1 kart)'],['Dev mermi','5 kart dolunca EX tuşu']]],
  ['KOŞU BÖLÜMLERİ',[['Amaç','Sağdaki ÇIKIŞ çadırına ulaş'],['Çukurlar','Düşersen 1 can kaybedip geri dönersin'],['Jeton','Her bölümde 5 gizli jeton var'],['Pembe balonlar','Savuştur, süper kart kazan'],['Not','Süre, can, savuşturma ve jetonlar']]],
  ['OYUN KURALLARI',[['Pembe nesneler','Havadayken tekrar zıpla tuşuna bas: savuştur!'],['Süper bar','Hasar vererek ve savuşturarak kart doldur'],['EX atış','1 kart harcar, güçlü özel atış'],['Süper','5 kart dolunca EX tuşu: süper hareket'],['Ortak oyun','Düşen arkadaşının hayaletindeki kalbi savuştur'],['Not','Süre, can, savuşturma ve süper kullanımı'],['Jeton','Kazandıkça al, Bilet Gişesi\'nde harca']]]
];
RR.Scenes.howto = {
  enter(a){ this.back=(a&&a.back)||'menu'; this.pg=0; this.t=0; },
  update(dt){ this.t+=dt; const n=HOW.length; if(In.m('right')||In.m('ok')){ if(this.pg<n-1){ this.pg++; A.sfx('move'); } else if(In.m('ok')){ A.sfx('back'); RR.go(this.back); return; } } if(In.m('left')&&this.pg>0){ this.pg--; A.sfx('move'); } if(In.m('back')){ A.sfx('back'); RR.go(this.back); } },
  draw(c){ UI.stage(c,this.t); Art.curtains(c,1,this.t); const pg=HOW[this.pg]; Art.panel(c,W/2-440,80,880,560);
    Art.text(c,pg[0],W/2,130,40,{title:true,color:'#d8343a'});
    pg[1].forEach((r,i)=>{ const y=195+i*48; Art.text(c,r[0],W/2-400,y,22,{title:true,align:'left'}); Art.text(c,r[1],W/2+400,y,19,{bold:true,align:'right',color:'#4a3a2a'}); c.fillStyle='rgba(42,29,20,0.15)'; c.fillRect(W/2-400,y+22,800,2); });
    for(let i=0;i<HOW.length;i++) Art.circ(c,W/2-(HOW.length-1)*14+i*28,610,7,i===this.pg?'#d8343a':'#fffaf0',2.5);
    UI.hint(c,'←→: sayfa  •  Esc: geri'); }
};

/* ---------- ending ---------- */
RR.Scenes.ending = {
  enter(){ this.t=0; A.playMusic('win'); RR.Save.d.ending=true; RR.Save.save(); },
  update(dt){ this.t+=dt; if(this.t>2&&(In.m('ok')||In.m('back'))){ A.sfx('select'); RR.go('map'); } },
  draw(c){ const t=this.t; UI.stage(c,t); Art.curtains(c,U.clamp(t/2,0,1),t);
    Art.text(c,'SON',W/2,170,120,{title:true,color:'#fff3d6',stroke:OL,sw:14,shadow:'rgba(0,0,0,0.5)',sd:8});
    Art.wrap(c,'Projeksiyoncu\'nun makarası koptu, film yanıp söndü ve Bobbin ile Bolt koltuklarına geri düştüler! Salonun ışıkları yandı... ama projeksiyon makinesi hâlâ hafifçe tıkırdıyordu.',W/2,300,860,34,24,{bold:true,color:'#f3e4c2'});
    Art.text(c,'Uzman zorluğunu dene ve S notunun peşine düş!',W/2,470,26,{title:true,color:'#ffd23a',stroke:OL,sw:5});
    UI.hero(c,'bobbin',W/2-140,H-90,t,0,{air:Math.sin(t*5)>0,vy:-300}); UI.hero(c,'bolt',W/2+140,H-90,t+0.5,1,{face:-1,air:Math.sin(t*5+1)>0,vy:-300});
    if(t>2) UI.hint(c,'Z / Enter: haritaya dön'); }
};
})();
