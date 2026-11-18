/* Reel Rumble — world map, difficulty select, equipment, shop */
(function(){
'use strict';
const U=RR.U, Art=RR.Art, OL=Art.OL, In=RR.Input, A=RR.Audio, W=RR.W, H=RR.H, UI=RR.UI;
const NODES=[
  {id:'tutorial',kind:'tutorial',x:150,y:520,name:'Prova Sahnesi',desc:'Kontrolleri ve savuşturmayı öğren.'},
  {id:'shop',kind:'shop',x:270,y:370,name:'Bilet Gişesi',desc:'Bay Bilet\'ten silah ve tılsım al.'},
  {id:'corn',kind:'boss',x:410,y:525},
  {id:'luna',kind:'run',x:545,y:380,name:'Lunapark Yolu',desc:'Koş ve ateş et! Çukurlara dikkat, 5 gizli jetonu bul.'},
  {id:'gramo',kind:'boss',x:680,y:275},
  {id:'cloud',kind:'boss',x:800,y:470},
  {id:'boiler',kind:'boss',x:935,y:540},
  {id:'paper',kind:'boss',x:1060,y:400},
  {id:'proj',kind:'boss',x:1150,y:250}
];
RR.NODES=NODES;
const isClient=()=>RR.S.mode==='online'&&RR.S.role==='client';
const isHost=()=>RR.S.mode==='online'&&RR.S.role==='host';
const locked=n=>n.id==='proj'&&!RR.Save.finalUnlocked();

// The world map scene now lives in overworld.js (walkable island for 1-4 heroes).

/* ---------- equipment ---------- */
const ROWS=['Karakter','Silah A','Silah B','Süper','Tılsım'];
RR.Scenes.equip = {
  enter(a){ this.back=(a&&a.back)||'map'; this.pi=0; this.row=0; this.t=0; },
  players(){ return RR.S.mode==='local'&&RR.S.locals&&RR.S.locals.length?RR.S.locals.map((d,i)=>i):[0]; },
  opts(row,L){ const S=RR.Save.d;
    switch(row){
      case 0: return Object.keys(RR.CHARS);
      case 1: return S.own.w.slice();
      case 2: return [null].concat(S.own.w.filter(w=>w!==L.w[0]));
      case 3: return Object.keys(RR.SUPERS).filter(id=>RR.Save.superUnlocked(id));
      case 4: return [null].concat(S.own.c.slice());
    } },
  get(row,L){ return [L.char,L.w[0],L.w[1],L.sup,L.charm][row]; },
  set(row,L,v){ if(row===0) L.char=v; else if(row===1){ L.w[0]=v; if(L.w[1]===v) L.w[1]=null; } else if(row===2) L.w[1]=v; else if(row===3) L.sup=v; else L.charm=v; },
  update(dt){ this.t+=dt; const pl=this.players(), L=RR.Save.d.load[pl[this.pi]];
    if(In.m('alt')&&pl.length>1){ this.pi=(this.pi+1)%pl.length; A.sfx('move'); }
    this.row=UI.nav(this.row,ROWS.length);
    const d=(In.m('right')?1:0)-(In.m('left')?1:0);
    if(d){ const o=this.opts(this.row,L); let i=o.indexOf(this.get(this.row,L)); i=(i+d+o.length)%o.length; this.set(this.row,L,o[i]); A.sfx('move'); RR.Save.save(); }
    if(In.m('back')||In.m('ok')){ A.sfx('back'); RR.Save.save(); if(RR.S.mode==='online'&&RR.Net) RR.Net.send({t:'load',load:RR.Save.d.load[0]}); RR.go(this.back); } },
  draw(c){ const t=this.t, pl=this.players(), idx=pl[this.pi], L=RR.Save.d.load[idx];
    c.fillStyle='#2a1418'; c.fillRect(0,0,W,H); Art.curtains(c,1,t);
    Art.panel(c,90,90,1100,560);
    Art.text(c,'EKİPMAN',W/2,135,44,{title:true,color:'#d8343a'});
    if(pl.length>1) pl.forEach((p,i)=>{ const on=i===this.pi; Art.rrect(c,150+i*130,112,110,44,10,on?'#d8343a':'#fffaf0',3.5); Art.text(c,'P'+(p+1),205+i*130,135,24,{title:true,color:on?'#fff':'#2a1d14'}); });
    // preview
    Art.rrect(c,140,180,300,380,16,'#e9d7a6',4);
    c.save(); c.translate(290,500); c.scale(1.8,1.8); UI.hero(c,L.char,0,0,t,idx,{shoot:Math.sin(t*2)>0}); c.restore();
    Art.text(c,RR.CHARS[L.char].name,290,215,32,{title:true}); Art.wrap(c,RR.CHARS[L.char].desc,290,535,260,20,15,{bold:true});
    ROWS.forEach((r,i)=>{ const y=210+i*70, on=i===this.row, v=this.get(i,L);
      if(on){ c.save(); c.fillStyle='rgba(216,52,58,0.12)'; c.fillRect(470,y-30,690,60); c.restore(); }
      Art.text(c,r,490,y,26,{title:true,align:'left',color:on?'#d8343a':'#2a1d14'});
      const kind=['char','w','w','s','c'][i]; Art.icon(c,kind,v,760,y,40);
      const nm=v==null?'Yok':i===0?RR.CHARS[v].name:(i<3?RR.WEAPONS[v].name:i===3?RR.SUPERS[v].name:RR.CHARMS[v].name);
      Art.text(c,(on?'◀  ':'')+nm+(on?'  ▶':''),800,y,22,{bold:true,align:'left'}); });
    const v=this.get(this.row,L); let desc='';
    if(this.row===1||this.row===2){ if(v) desc=RR.WEAPONS[v].desc+'  '+RR.WEAPONS[v].ex; } else if(this.row===3) desc=RR.SUPERS[v].desc; else if(this.row===4) desc=v?RR.CHARMS[v].desc:'Tılsım takılı değil.'; else desc='Karakterler sadece görünüş olarak farklıdır.';
    Art.wrap(c,desc,815,575,640,22,17,{bold:true,color:'#4a3a2a'});
    const locked=Object.keys(RR.SUPERS).filter(id=>!RR.Save.superUnlocked(id)).length; if(this.row===3&&locked) Art.text(c,'Yeni süperler: yıldızları yenerek açılır',815,620,15,{bold:true,color:'#8a1820'});
    UI.hint(c,(pl.length>1?'Tab: oyuncu  •  ':'')+'↑↓: satır  •  ←→: değiştir  •  Esc: kaydet & çık'); }
};

/* ---------- shop ---------- */
const ITEMS=Object.keys(RR.WEAPONS).filter(k=>k!=='ink').map(k=>({kind:'w',id:k,d:RR.WEAPONS[k]})).concat(Object.keys(RR.CHARMS).map(k=>({kind:'c',id:k,d:RR.CHARMS[k]})));
RR.Scenes.shop = {
  enter(){ this.sel=0; this.t=0; this.say='Hoş geldin! Bir bilet mi, bir silah mı?'; this.sayT=0; A.playMusic('shop'); },
  owned(it){ const o=RR.Save.d.own; return it.kind==='w'?o.w.includes(it.id):o.c.includes(it.id); },
  update(dt){ this.t+=dt; this.sayT+=dt; const n=ITEMS.length, cols=4;
    if(In.m('right')){ this.sel=(this.sel+1)%n; A.sfx('move'); } if(In.m('left')){ this.sel=(this.sel-1+n)%n; A.sfx('move'); }
    if(In.m('down')){ this.sel=Math.min(n-1,this.sel+cols); A.sfx('move'); } if(In.m('up')){ this.sel=Math.max(0,this.sel-cols); A.sfx('move'); }
    if(In.m('back')){ A.sfx('back'); RR.go('map'); return; }
    if(In.m('ok')){ const it=ITEMS[this.sel], S=RR.Save.d;
      if(this.owned(it)){ A.sfx('deny'); this.say='Onu zaten aldın, dostum!'; }
      else if(S.coins<it.d.price){ A.sfx('deny'); this.say='Jetonun yetmiyor. Biraz daha yıldız devir!'; }
      else { S.coins-=it.d.price; (it.kind==='w'?S.own.w:S.own.c).push(it.id); RR.Save.save(); A.sfx('coin'); this.say='Harika seçim! Ekipman menüsünden (Tab) tak.'; if(RR.Ach) RR.Ach.shop(); }
      this.sayT=0; } },
  draw(c){ const t=this.t; c.fillStyle='#3a1f1a'; c.fillRect(0,0,W,H);
    c.fillStyle='#5a2a22'; for(let x=0;x<W;x+=80) c.fillRect(x,0,40,H);
    // shopkeeper: Bay Bilet (a ticket stub)
    c.save(); c.translate(230,420+Math.sin(t*2)*4);
    c.beginPath(); c.moveTo(-80,-200); c.lineTo(80,-200); c.arc(80,-120,18,-Math.PI/2,Math.PI/2,true); c.lineTo(80,40); c.lineTo(-80,40); c.lineTo(-80,-102); c.arc(-80,-120,18,Math.PI/2,-Math.PI/2,true); c.closePath(); c.fillStyle='#e9c46a'; c.fill(); c.lineWidth=5; c.strokeStyle=OL; c.stroke();
    c.setLineDash([6,8]); c.beginPath(); c.moveTo(-60,-30); c.lineTo(60,-30); c.lineWidth=3; c.stroke(); c.setLineDash([]);
    Art.text(c,'BİLET',0,0,26,{title:true,color:'#8a1820'});
    Art.eye(c,-24,-150,14,18,0.6,0,{}); Art.eye(c,22,-150,14,18,0.6,0,{});
    c.beginPath(); c.moveTo(-40,-112); c.bezierCurveTo(-20,-128,0,-120,0,-114); c.bezierCurveTo(0,-120,20,-128,40,-112); c.bezierCurveTo(20,-104,0,-108,0,-110); c.bezierCurveTo(0,-108,-20,-104,-40,-112); c.fillStyle='#3a2412'; c.fill(); c.lineWidth=2.5; c.stroke();
    c.beginPath(); c.arc(0,-96,14,0.2,Math.PI-0.2); c.lineWidth=3.5; c.stroke();
    c.beginPath(); c.moveTo(0,-62); c.lineTo(-22,-74); c.lineTo(-22,-50); c.closePath(); c.moveTo(0,-62); c.lineTo(22,-74); c.lineTo(22,-50); c.closePath(); c.fillStyle='#d8343a'; c.fill(); c.lineWidth=3; c.stroke();
    Art.ell(c,0,-218,60,10,'#2a1d14',3); Art.rrect(c,-36,-262,72,44,6,'#2a1d14',3); c.fillStyle='#d8343a'; c.fillRect(-34,-236,68,8);
    c.restore();
    Art.rrect(c,0,520,470,200,4,'#7a3e22',5); c.fillStyle='#9a5630'; c.fillRect(10,535,450,20);
    // speech bubble
    c.save(); const k=U.clamp(this.sayT*5,0,1); c.globalAlpha=k; Art.rrect(c,60,40,380,110,20,'#fffaf0',4); c.beginPath(); c.moveTo(200,148); c.lineTo(230,190); c.lineTo(250,148); c.fillStyle='#fffaf0'; c.fill(); c.lineWidth=4; c.stroke(); c.fillStyle='#fffaf0'; c.fillRect(196,140,58,10);
    Art.wrap(c,this.say,250,78,340,26,19,{bold:true}); c.restore();
    // items grid
    Art.panel(c,480,60,770,560); Art.text(c,'BİLET GİŞESİ',865,105,40,{title:true,color:'#d8343a'});
    ITEMS.forEach((it,i)=>{ const col=i%4, row=Math.floor(i/4), x=520+col*180, y=142+row*140, on=i===this.sel, own=this.owned(it);
      Art.rrect(c,x,y,160,122,12,on?'#ffe9b0':own?'#d8cdb0':'#fffaf0',on?5:3);
      Art.icon(c,it.kind,it.id,x+80,y+46,50);
      Art.text(c,own?'ALINDI':(it.d.price+' jeton'),x+80,y+100,17,{title:true,color:own?'#3a7a4a':'#8a1820'});
      if(on){ c.save(); c.translate(x+8,y+10+Math.sin(t*8)*3); Art.glove(c,0,0,12,0.6); c.restore(); } });
    const it=ITEMS[this.sel]; Art.rrect(c,500,570,730,40,8,'#fffaf0',3);
    Art.text(c,it.d.name+' — '+it.d.desc,865,590,16,{bold:true});
    Art.text(c,'Jeton: '+RR.Save.d.coins,W-24,32,26,{title:true,align:'right',color:'#ffd23a',stroke:OL,sw:6});
    UI.hint(c,'Yön tuşları: seç  •  Z: satın al  •  Esc: haritaya dön'); }
};
})();
