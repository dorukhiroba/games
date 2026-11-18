/* Reel Rumble — fight scene wrapper (solo / local / online host / online client), pause, results, defeat */
(function(){
'use strict';
const U=RR.U, Art=RR.Art, OL=Art.OL, In=RR.Input, A=RR.Audio, W=RR.W, H=RR.H, UI=RR.UI;

RR.startFight = function(boss,diff){
  if(RR.S.mode==='online'&&RR.S.role==='host'){ const order=[0].concat(RR.Net.slots()); const loads=order.map(s=>s===0?RR.Save.d.load[0]:((RR.S.remoteLoads||{})[s]||RR.defaultLoad(s))); RR.S.order=order; RR.Net.send({t:'fight',boss,diff,loads,order}); }
  RR.go('fight',{boss,diff});
};

RR.Scenes.fight = {
  enter(a){
    this.a=a; this.paused=false; this.psel=0; this.ended=false; this.t=0;
    const S=RR.S, Ctrl=In.Ctrl, D=RR.Save.d; let mode, ctrls=[], loads;
    mode = S.mode==='online' ? S.role : (S.mode==='local'?'local':'solo');
    if(mode==='local'){ const L=(S.locals&&S.locals.length)?S.locals:[{scheme:'solo',pad:0}]; ctrls=L.map(d=>new Ctrl(d.scheme,d.pad)); loads=L.map((d,i)=>D.load[i]); }
    else if(mode==='host'){ const order=(S.order&&S.order[0]===0)?S.order:[0].concat(RR.Net.slots()); this.order=order; this.rc={}; ctrls=order.map(s=>s===0?new Ctrl('solo',0):(this.rc[s]=new In.RemoteCtrl())); loads=order.map(s=>s===0?D.load[0]:((S.remoteLoads||{})[s]||RR.defaultLoad(s))); }
    else if(mode==='client'){ this.lc=new Ctrl('solo',0); this.order=a.order||[0,RR.Net.slot]; loads=a.loads||[RR.defaultLoad(0),D.load[0]]; }
    else { ctrls=[new Ctrl('solo',0)]; loads=[D.load[0]]; }
    this.mode=mode;
    this.G=RR.Fight.create({boss:a.boss,diff:a.diff||0,loads,mode,ctrls});
    this.G.myIdx=mode==='client'?Math.max(0,this.order.indexOf(RR.Net.slot)):0;
    A.playMusic(RR.BOSS[a.boss].music);
  },
  leave(){ },
  setPause(on){ this.paused=on; this.psel=0; A.sfx(on?'select':'back'); if(this.mode==='host') RR.Net.send({t:'pause',on}); },
  update(dt){
    const G=this.G; this.t+=dt;
    if(In.m('pause')&&!this.ended){ if(this.mode==='client') RR.Net.send({t:'pausereq'}); else { this.setPause(!this.paused); In.eat(); } }
    if(this.paused){ if(this.mode!=='client') this.pauseMenu(); return; }
    if(this.mode==='client'){ this.lc.poll(); RR.Net.send({t:'in',h:this.lc.cur,p:this.lc.edges()}); RR.Fight.clientStep(G,dt); return; }
    RR.Fight.update(G,dt);
    if(this.mode==='host') RR.Net.sendSnap(RR.Fight.snap(G));
    if(G.over&&!this.ended){ this.ended=true; this.finish(); }
  },
  pauseMenu(){
    const items=this.items(); this.psel=UI.nav(this.psel,items.length);
    if(In.m('back')){ this.setPause(false); return; }
    if(In.m('ok')){ const id=items[this.psel].id; A.sfx('select');
      if(id==='resume') this.setPause(false);
      else if(id==='retry'){ this.paused=false; if(RR.S.rush) RR.S.rush.time+=this.G.time; RR.startFight(this.a.boss,this.a.diff); }
      else if(id==='map'){ this.paused=false; RR.go('map'); }
      else if(id==='quit'){ KQuit.go(); } }
  },
  items(){ const tut=RR.BOSS[this.a.boss].tutorial; return [{label:'Devam Et',id:'resume'}].concat(tut?[]:[{label:'Yeniden Dene',id:'retry'}]).concat([{label:'Haritaya Dön',id:'map'}]).concat(window.KQuit&&KQuit.onSite&&this.mode!=='client'?[{label:'Oyunlardan Çık',id:'quit'}]:[]); },
  finish(){
    const res=RR.Fight.reward(RR.Fight.results(this.G));
    if(this.mode==='host') RR.Net.send({t:'end',res});
    RR.go(res.won?'results':'dead',{res});
  },
  onLeave(slot){ if(this.mode!=='host') return; const i=(this.order||[]).indexOf(slot), p=i>0&&this.G.players[i]; if(p){ p.dead=true; p.gone=true; p.hp=0; } },
  onNet(m,slot){
    if(this.mode==='host'){ if(m.t==='in'){ const r=this.rc&&this.rc[slot]; if(r) r.feed(m.h,m.p); return true; } if(m.t==='pausereq'){ if(!this.ended) this.setPause(!this.paused); return true; } }
    if(this.mode==='client'){ if(m.t==='s'){ RR.Fight.apply(this.G,m); return true; } if(m.t==='pause'){ this.paused=m.on; return true; } }
    return false;
  },
  draw(c){
    const G=this.G; RR.Fight.draw(c,G);
    if(this.paused){
      c.fillStyle='rgba(10,6,3,0.6)'; c.fillRect(0,0,W,H);
      Art.panel(c,W/2-240,160,480,380); Art.text(c,'DURAKLATILDI',W/2,210,40,{title:true,color:'#d8343a'});
      const def=RR.BOSS[G.bossId]; Art.text(c,def.name+' • '+RR.DIFFS[G.diff].name+' • '+U.fmtTime(G.time),W/2,250,17,{bold:true});
      if(this.mode==='client') Art.text(c,'Ev sahibi oyunu duraklattı...',W/2,370,24,{title:true});
      else UI.list(c,this.items(),this.psel,W/2,320,{gap:62,size:32});
    }
  }
};

/* ---------- results ---------- */
RR.Scenes.results = {
  enter(a){ this.r=a.res; this.t=0; this.stamped=false; this.ticks=0; A.playMusic('win'); },
  rows(){ const r=this.r; return [['Süre',U.fmtTime(r.time)+' / '+U.fmtTime(r.par)],['Kalan can',Math.min(r.hp,3)+' / 3'],['Savuşturma',Math.min(r.parries,3)+' / 3'],r.run?['Jeton',r.coinsGot+' / 5']:['Süper kart',Math.min(r.sup,6)+' / 6'],r.run?['Bölüm','Koşu']:['Zorluk',RR.DIFFS[r.diff].name]]; },
  update(dt){ this.t+=dt; const n=this.rows().length, T=0.6+n*0.4;
    const shown=Math.min(n,Math.floor((this.t-0.6)/0.4)+1); if(shown>this.ticks&&this.t>0.6){ this.ticks=shown; A.sfx('move'); }
    if(this.t>T+0.3&&!this.stamped){ this.stamped=true; A.sfx('stamp'); if(this.r.coins) setTimeout(()=>A.sfx('coin'),400); }
    if(this.t>T+0.8&&In.m('ok')&&!(RR.S.mode==='online'&&RR.S.role==='client')){ A.sfx('select');
      if(RR.S.rush&&this.r.won) RR.Rush.next(this.r);
      else if(this.r.boss==='proj'&&this.r.first) RR.go('ending'); else RR.go('map'); }
    if(In.m('ok')&&this.t<T) this.t=T; },
  draw(c){ const t=this.t, r=this.r, def=RR.BOSS[r.boss]; c.fillStyle='#2a1418'; c.fillRect(0,0,W,H); Art.curtains(c,1,t);
    c.save(); c.translate(W/2,H/2); c.rotate(-0.02); Art.panel(c,-420,-280,840,540); c.restore();
    Art.text(c,'SONUÇLAR',W/2,130,48,{title:true,color:'#d8343a'}); Art.text(c,def.name,W/2,172,20,{bold:true});
    this.rows().forEach((row,i)=>{ if(i>=this.ticks) return; const y=225+i*52; Art.text(c,row[0],W/2-330,y,28,{title:true,align:'left'}); c.save(); c.setLineDash([3,9]); c.beginPath(); c.moveTo(W/2-120,y+8); c.lineTo(W/2+80,y+8); c.lineWidth=3; c.strokeStyle='#8a7a6a'; c.stroke(); c.restore(); Art.text(c,row[1],W/2+110,y,26,{bold:true,align:'left'}); });
    const T=0.6+this.rows().length*0.4;
    if(this.stamped){ const k=U.clamp((t-T-0.3)*5,0,1); c.save(); c.translate(W/2+260,330); c.rotate(-0.2); c.scale(3-2*k,3-2*k); c.globalAlpha=k;
      c.beginPath(); c.arc(0,0,90,0,6.283); c.lineWidth=8; c.strokeStyle='#d8343a'; c.stroke(); Art.text(c,r.grade,0,6,r.grade.length>1?88:110,{title:true,color:'#d8343a'}); c.restore();
      Art.text(c,'NOT',W/2+260,450,22,{title:true,color:'#d8343a'});
      if(r.first) Art.text(c,'İLK ZAFER!',W/2-160,505,30,{title:true,color:'#2f6fd6'});
      if(r.coins) Art.text(c,'+'+r.coins+' jeton',W/2+60,505,30,{title:true,color:'#b8860b'}); }
    if(RR.S.rush) Art.text(c,'MARATON '+(RR.S.rush.i+1)+' / '+RR.S.rush.list.length+'  •  toplam '+U.fmtTime(RR.S.rush.time+r.time),W/2,560,20,{title:true,color:'#2f6fd6'});
    UI.hint(c,(RR.S.mode==='online'&&RR.S.role==='client')?'Ev sahibi devam etmeyi bekliyor...':(RR.S.rush?'Z / Enter: sonraki boss':'Z / Enter: devam'));
    UI.hero(c,'bobbin',150,H-40,t,0,{air:Math.sin(t*6)>0,vy:-400}); }
};

/* ---------- defeat ---------- */
RR.Scenes.dead = {
  enter(a){ this.r=a.res; this.t=0; this.sel=0; this.quote=U.pick(RR.BOSS[this.r.boss].quotes); A.playMusic('lose'); },
  update(dt){ this.t+=dt; if(RR.S.mode==='online'&&RR.S.role==='client') return; if(this.t<1) return;
    this.sel=UI.nav(this.sel,2);
    if(In.m('ok')){ A.sfx('select'); if(this.sel===0){ if(RR.S.rush) RR.S.rush.time+=this.r.time; RR.startFight(this.r.boss,this.r.diff); } else RR.go('map'); }
    if(In.m('back')){ A.sfx('back'); RR.go('map'); } },
  draw(c){ const t=this.t, r=this.r, def=RR.BOSS[r.boss]; c.fillStyle='#120c0a'; c.fillRect(0,0,W,H);
    c.save(); c.translate(W/2,H/2-20); c.rotate(0.015); Art.panel(c,-430,-270,860,520,{fill:'#e9dcc0'}); c.restore();
    Art.text(c,'YENİLDİN!',W/2,120,64,{title:true,color:'#d8343a'});
    def.portrait(c,260,300,0.42,t);
    Art.rrect(c,380,190,480,110,20,'#fffaf0',4); c.beginPath(); c.moveTo(390,260); c.lineTo(350,280); c.lineTo(392,240); c.fillStyle='#fffaf0'; c.fill(); c.lineWidth=4; c.strokeStyle=OL; c.stroke();
    Art.wrap(c,'"'+this.quote+'"',620,228,440,28,20,{bold:true});
    // progress bar
    const bx=230, bw=820, by=390;
    Art.rrect(c,bx,by-8,bw,16,8,'#c9b88f',3);
    (r.phases||[]).forEach(th=>{ const x=bx+bw*(1-th); Art.rrect(c,x-4,by-16,8,32,3,'#2a1d14',0); });
    const k=U.clamp(t/1.2,0,1)*r.progress; c.fillStyle='#d8343a'; c.fillRect(bx+3,by-5,(bw-6)*k,10);
    c.save(); c.translate(bx+bw,by-30); c.scale(0.18,0.18); def.portrait(c,0,0,1,t); c.restore();
    c.save(); c.translate(bx+bw*k,by+4); c.scale(0.4,0.4); UI.hero(c,RR.Save.d.load[0].char,0,0,t*2,0,{run:t<1.2}); c.restore();
    Art.text(c,'İlerleme: %'+Math.round(r.progress*100),W/2,by+50,20,{bold:true});
    if(RR.S.mode==='online'&&RR.S.role==='client') UI.hint(c,'Ev sahibinin kararını bekle...',560);
    else if(t>=1) UI.list(c,['Tekrar Dene','Haritaya Dön'],this.sel,W/2,505,{gap:52,size:30});
  }
};
})();
