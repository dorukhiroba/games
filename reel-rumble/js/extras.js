/* Reel Rumble — extras: announcer voice, boss title card, achievements, boss rush */
(function(){
'use strict';
const U=RR.U, Art=RR.Art, OL=Art.OL, In=RR.Input, A=RR.Audio, W=RR.W, H=RR.H, UI=RR.UI;

/* ---------- announcer (Web Speech API, Turkish) ---------- */
RR.say=function(txt){
  const s=RR.Save.d.set; if(!s.voice||!window.speechSynthesis) return;
  try{ let t=String(txt).toLocaleLowerCase('tr-TR'); t=t.charAt(0).toLocaleUpperCase('tr-TR')+t.slice(1);
    const u=new SpeechSynthesisUtterance(t); u.lang='tr-TR'; u.rate=1.05; u.pitch=0.75; u.volume=Math.min(1,s.sfx+0.2);
    const v=speechSynthesis.getVoices().find(v=>/^tr/i.test(v.lang)); if(v) u.voice=v;
    speechSynthesis.cancel(); speechSynthesis.speak(u); }catch(e){}
};

/* ---------- boss title card ---------- */
Art.titleCard=function(c,def,st,G){
  const k=U.clamp(st/0.3,0,1), out=U.clamp((st-0.85)/0.3,0,1);
  c.save(); c.globalAlpha=1-out; c.fillStyle='rgba(10,6,3,0.55)'; c.fillRect(0,0,W,H);
  c.translate(W/2,H/2-30); const s=U.easeBack(k); c.scale(s,s); c.rotate(-0.02);
  Art.panel(c,-340,-115,680,210);
  Art.text(c,def.name,0,-44,54,{title:true,color:'#d8343a'});
  Art.text(c,'"'+def.title+'"',0,16,24,{bold:true});
  const tag=def.tutorial?'ANTRENMAN':(RR.DIFFS[G.diff].name.toLocaleUpperCase('tr-TR')+(def.plane?'  •  UÇAK BÖLÜMÜ':def.run?'  •  KOŞU BÖLÜMÜ':'  •  BOSS'));
  Art.text(c,tag,0,60,18,{title:true,color:'#6a5a4a'});
  c.restore();
};

/* ---------- achievements ---------- */
const ACH=[
  ['first','İlk Perde','Herhangi bir bossu yen.'],['parry10','Pembe Çırak','Toplam 10 savuşturma yap.'],['parry50','Pembe Usta','Toplam 50 savuşturma yap.'],
  ['nohit','Kusursuz Çekim','Hiç hasar almadan bir boss yen.'],['expert','Uzman Oyuncu','Bir bossu Uzman zorlukta yen.'],['gradeA','Parlak Yıldız','A veya üstü not al.'],
  ['gradeS','Altın Makara','S notu al.'],['ground','Kara Fatihi','Üç kara bossunu yen.'],['air','Gökyüzü Asi','İki uçak bossunu yen.'],
  ['final','Film Bitti','Projeksiyoncu\'yu yen.'],['run','Lunapark Turu','Lunapark Yolu\'nu bitir.'],['coins5','Jeton Avcısı','Lunapark\'taki 5 jetonun hepsini topla.'],
  ['super','Gösteri Zamanı','Bir süper hareket kullan.'],['revive','Can Dostu','Ortak oyunda arkadaşını dirilt.'],['coop','Çifte Kumpanya','Bir arkadaşınla boss yen.'],
  ['fast','Hızlı Kurgu','Bir bossu par süresinin altında yen.'],['die10','İnatçı','10 kez yenil, pes etme!'],['shop5','Müdavim','Dükkândan 5 eşya al.'],
  ['rush','Maraton Koşucusu','Boss Maratonu\'nu bitir.']
];
RR.Ach={
  list:ACH,
  has(id){ return !!(RR.Save.d.ach||{})[id]; },
  give(id){ const S=RR.Save.d; S.ach=S.ach||{}; if(S.ach[id]) return; S.ach[id]=Date.now(); RR.Save.save(); const a=ACH.find(x=>x[0]===id); if(a){ UI.toast('🏆 Başarım açıldı: '+a[1]+' — '+a[2],3800); A.sfx('coin'); } },
  onResult(res){
    const S=RR.Save.d, g=id=>this.give(id);
    if(S.stats.parries>=10) g('parry10'); if(S.stats.parries>=50) g('parry50'); if(S.stats.deaths>=10) g('die10');
    if(res.supers) g('super'); if(res.revives>0) g('revive');
    if(!res.won) return;
    const def=RR.BOSS[res.boss]; if(!def||def.tutorial) return;
    if(def.run){ g('run'); if(((S.runCoins||{})[res.boss]||[]).length>=5) g('coins5'); return; }
    g('first'); if(res.hits===0) g('nohit'); if(res.diff===2) g('expert'); if(res.gi>=8) g('gradeA'); if(res.grade==='S') g('gradeS');
    if(res.time<=res.par) g('fast'); if(res.coop) g('coop');
    const b=S.beaten; if(b.corn&&b.gramo&&b.boiler) g('ground'); if(b.cloud&&b.paper) g('air'); if(res.boss==='proj') g('final');
  },
  shop(){ const S=RR.Save.d; if(S.own.w.length-1+S.own.c.length>=5) this.give('shop5'); }
};
RR.Scenes.ach={
  enter(a){ this.t=0; this.back=(a&&a.back)||'menu'; },
  update(dt){ this.t+=dt; if(In.m('back')||In.m('ok')){ A.sfx('back'); RR.go(this.back); } },
  draw(c){ const S=RR.Save.d; UI.stage(c,this.t); Art.curtains(c,1,this.t); Art.panel(c,70,70,1140,600);
    const got=ACH.filter(a=>this.has(a[0])).length;
    Art.text(c,'BAŞARIMLAR  '+got+' / '+ACH.length,W/2,112,38,{title:true,color:'#d8343a'});
    const st=S.stats; Art.text(c,'Zafer: '+st.wins+'   •   Yenilgi: '+st.deaths+'   •   Savuşturma: '+st.parries+'   •   Jeton: '+S.coins+(S.rushBest?'   •   En iyi maraton: '+U.fmtTime(S.rushBest):''),W/2,150,17,{bold:true});
    ACH.forEach((a,i)=>{ const col=i%2, row=Math.floor(i/2), x=110+col*540, y=180+row*47, ok=this.has(a[0]);
      Art.rrect(c,x,y,520,40,8,ok?'#ffe9b0':'rgba(255,250,240,0.5)',2.5);
      c.save(); c.translate(x+24,y+20); if(ok) Art.star(c,0,0,13,'#ffd23a',2.5); else { Art.rrect(c,-9,-6,18,14,3,'#9aa0a6',2); c.beginPath(); c.arc(0,-6,6,Math.PI,0); c.lineWidth=3; c.strokeStyle=OL; c.stroke(); } c.restore();
      Art.text(c,a[1],x+46,y+13,17,{title:true,align:'left',color:ok?'#2a1d14':'#8a7a6a'}); Art.text(c,a[2],x+46,y+31,13,{bold:true,align:'left',color:ok?'#4a3a2a':'#9a8a7a'}); });
    UI.hint(c,'Esc / Z: geri'); },
  has(id){ return RR.Ach.has(id); }
};

/* ---------- boss rush ---------- */
RR.Rush={
  list:['corn','cloud','gramo','paper','boiler','proj'],
  start(diff){ RR.S.rush={i:0,diff,time:0,list:this.list.slice()}; RR.startFight(RR.S.rush.list[0],diff); },
  next(res){ const R=RR.S.rush; if(!R) return RR.go('map'); R.time+=res.time; R.i++;
    if(R.i>=R.list.length){ const S=RR.Save.d; const best=!S.rushBest||R.time<S.rushBest; if(best) S.rushBest=R.time; RR.Save.save(); RR.Ach.give('rush');
      UI.toast('Maraton bitti! Toplam süre: '+U.fmtTime(R.time)+(best?'  (YENİ REKOR!)':''),5000); RR.S.rush=null; RR.go('map'); }
    else RR.startFight(R.list[R.i],R.diff); }
};
RR.Scenes.rush={
  enter(){ this.t=0; this.row=0; this.diff=1; this.mode=RR.S.mode==='local'?1:0; A.playMusic('menu'); },
  update(dt){ this.t+=dt; this.row=UI.nav(this.row,3);
    const d=(In.m('right')?1:0)-(In.m('left')?1:0);
    if(d&&this.row===0){ this.mode^=1; A.sfx('move'); } if(d&&this.row===1){ this.diff=(this.diff+d+3)%3; A.sfx('move'); }
    if(In.m('back')){ A.sfx('back'); RR.go('menu'); return; }
    if(In.m('ok')&&this.row===2){ A.sfx('select'); RR.S.mode=this.mode?'local':'solo'; RR.S.role=null; RR.Rush.start(this.diff); } },
  draw(c){ const t=this.t; UI.stage(c,t); Art.curtains(c,1,t); Art.panel(c,W/2-360,110,720,500);
    Art.text(c,'BOSS MARATONU',W/2,165,46,{title:true,color:'#d8343a'});
    Art.wrap(c,'Altı bossla arka arkaya dövüş: kara, gökyüzü ve final. Toplam süren kaydedilir. Yenilirsen aynı bosstan devam edebilirsin.',W/2,215,600,24,18,{bold:true});
    const rows=[['Oyuncu',this.mode?('Yerel '+(((RR.S.locals||[]).length)||1)+' kişi'):'Tek Oyuncu'],['Zorluk',RR.DIFFS[this.diff].name],['BAŞLA','']];
    rows.forEach((r,i)=>{ const y=330+i*70, on=i===this.row; if(on){ c.save(); c.fillStyle='rgba(216,52,58,0.12)'; c.fillRect(W/2-300,y-28,600,56); c.restore(); }
      if(i===2) Art.text(c,r[0],W/2,y,36,{title:true,color:on?'#d8343a':'#2a1d14'});
      else { Art.text(c,r[0],W/2-270,y,28,{title:true,align:'left',color:on?'#d8343a':'#2a1d14'}); Art.text(c,(on?'◀  ':'')+r[1]+(on?'  ▶':''),W/2+270,y,24,{bold:true,align:'right'}); } });
    const S=RR.Save.d; Art.text(c,'En iyi süre: '+(S.rushBest?U.fmtTime(S.rushBest):'—'),W/2,560,20,{title:true,color:'#2f6fd6'});
    RR.Rush.list.forEach((id,i)=>{ const def=RR.BOSS[id]; if(def&&def.portrait){ c.save(); c.globalAlpha=0.9; def.portrait(c,W/2-250+i*100,640,0.14,t); c.restore(); } });
    UI.hint(c,'↑↓: seç  •  ←→: değiştir  •  Z: başla  •  Esc: geri'); }
};
})();
