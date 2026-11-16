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
UI.hint = function(c,s,y){ Art.text(c,s,W/2,y||H-26,16,{bold:true,color:'#fff3d6',stroke:OL,sw:4}); };
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
  base:[{label:'Tek Oyuncu',id:'solo'},{label:'Yerel 2 Oyuncu',id:'local'},{label:'Çevrimiçi 2 Oyuncu',id:'online'},{label:'Boss Maratonu',id:'rush'},{label:'Başarımlar',id:'ach'},{label:'Nasıl Oynanır',id:'howto'},{label:'Ayarlar',id:'settings'}],
  enter(){ this.t=0; this.items=this.base.concat(window.KQuit&&KQuit.onSite?[{label:'Oyunlardan Çık',id:'quit'}]:[]); this.sel=Math.min(this.sel||0,this.items.length-1); A.playMusic('menu'); if(RR.Net&&RR.Net.connected) RR.Net.close(); RR.S.mode='solo'; RR.S.role=null; },
  update(dt){ this.t+=dt; this.sel=UI.nav(this.sel,this.items.length);
    if(In.m('back')){ A.sfx('back'); RR.go('title'); return; }
    if(In.m('ok')){ const id=this.items[this.sel].id; A.sfx('select');
      if(id==='solo'||id==='local'){ RR.S.mode=id; RR.S.role=null; RR.go(RR.Save.d.seenStory?'map':'story'); }
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
  enter(a){ this.back=(a&&a.back)||'menu'; this.sel=0; this.confirm=false; this.t=0; },
  rows(){ const s=RR.Save.d.set, onoff=v=>v?'Açık':'Kapalı';
    return [['Müzik',Math.round(s.music*10)],['Efektler',Math.round(s.sfx*10)],['Film efekti',onoff(s.filter)],['Ekran sarsıntısı',onoff(s.shake)],['Boss can barı',onoff(s.bossbar)],['Çarpışma kutuları',onoff(s.hitbox)],['Sunucu sesi',onoff(s.voice)],['Tam ekran',document.fullscreenElement?'Açık':'Kapalı'],['Kaydı sıfırla',this.confirm?'EMİN MİSİN?':''],['Geri','']]; },
  update(dt){ this.t+=dt; const s=RR.Save.d.set, n=this.rows().length; const prev=this.sel; this.sel=UI.nav(this.sel,n); if(prev!==this.sel) this.confirm=false;
    const d=(In.m('right')?1:0)-(In.m('left')?1:0), ok=In.m('ok');
    if(In.m('back')){ A.sfx('back'); RR.Save.save(); RR.go(this.back); return; }
    switch(this.sel){
      case 0: if(d){ s.music=U.clamp(Math.round(s.music*10+d)/10,0,1); A.applyVol(); A.sfx('move'); } break;
      case 1: if(d){ s.sfx=U.clamp(Math.round(s.sfx*10+d)/10,0,1); A.applyVol(); A.sfx('coin'); } break;
      case 2: if(d||ok){ s.filter=!s.filter; A.sfx('move'); } break;
      case 3: if(d||ok){ s.shake=!s.shake; A.sfx('move'); } break;
      case 4: if(d||ok){ s.bossbar=!s.bossbar; A.sfx('move'); } break;
      case 5: if(d||ok){ s.hitbox=!s.hitbox; A.sfx('move'); } break;
      case 6: if(d||ok){ s.voice=!s.voice; A.sfx('move'); if(s.voice&&RR.say) RR.say('Motor!'); } break;
      case 7: if(d||ok){ RR.toggleFull(); A.sfx('move'); } break;
      case 8: if(ok){ if(this.confirm){ const keep=Object.assign({},s); RR.Save.reset(); RR.Save.d.set=keep; RR.Save.save(); this.confirm=false; A.sfx('boom'); UI.toast('Kayıt sıfırlandı.'); } else { this.confirm=true; A.sfx('deny'); } } break;
      case 9: if(ok){ A.sfx('back'); RR.Save.save(); RR.go(this.back); } break;
    }
    if(d||ok) RR.Save.save(); },
  draw(c){ UI.stage(c,this.t); Art.curtains(c,1,this.t); Art.panel(c,W/2-340,70,680,600);
    Art.text(c,'AYARLAR',W/2,118,46,{title:true,color:'#d8343a'});
    this.rows().forEach((r,i)=>{ const y=172+i*48, on=i===this.sel;
      if(on){ c.save(); c.fillStyle='rgba(216,52,58,0.12)'; c.fillRect(W/2-310,y-22,620,44); c.restore(); }
      Art.text(c,r[0],W/2-290,y,26,{title:true,align:'left',color:on?'#d8343a':'#2a1d14'});
      if(typeof r[1]==='number'){ for(let k=0;k<10;k++) Art.rrect(c,W/2+60+k*22,y-12,16,24,3,k<r[1]?'#d8343a':'#fffaf0',2.5); }
      else Art.text(c,r[1],W/2+290,y,22,{bold:true,align:'right',color:r[1]==='EMİN MİSİN?'?'#d8343a':'#2a1d14'}); });
    UI.hint(c,'←→: değiştir  •  Z: seç  •  Esc: geri'); }
};

/* ---------- how to play ---------- */
const HOW=[
  ['KLAVYE (Tek Oyuncu)',[['Hareket','Yön tuşları / WASD'],['Zıpla','Z  /  Boşluk  /  J'],['Ateş','X  /  K (basılı tut)'],['EX / Süper','C  /  I'],['Atılma (dash)','Shift  /  L'],['Sabitle & 8 yöne nişan','V  /  U'],['Silah değiştir','Tab  /  Q  /  O'],['Duraklat','Esc  /  P'],['Tam ekran','F']]],
  ['YEREL 2 OYUNCU',[['P1 hareket','W A S D'],['P1 zıpla/ateş/atıl','J / K / L'],['P1 EX / sabitle / silah','I / U / O'],['P2 hareket','Yön tuşları'],['P2 zıpla/ateş/atıl','Num1 , / Num2 . / Num3 /'],['P2 EX / sabitle / silah','Num0 \' / Num4 ; / Num5 \\'],['Gamepad','Takılı gamepad\'ler otomatik atanır']]],
  ['GAMEPAD',[['Hareket','Sol çubuk / D-pad'],['Zıpla','A'],['Ateş','X  /  RT'],['EX / Süper','B'],['Atılma','RB'],['Sabitle','LB  /  LT'],['Silah değiştir','Y'],['Duraklat','Start']]],
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
