/* BasketballManager — app shell: welcome / new career, routing, top bar, day advance, match day, saves, import/export */
(function(){
'use strict';
const BM=window.BM, U=BM.U, R=BM.RULES, UI=BM.UI, L=BM.League, C=BM.Cap, M=BM.Market, Sc=BM.Screens;
const App = BM.App = {screen:'inbox',params:{},trade:null,slot:null,busy:false};
const KEY='bm-save-', META='bm-saves';
const NAV=[['inbox','📥','Gelen kutusu'],['squad','👥','Kadro'],['tactics','📋','Taktik'],['schedule','📅','Fikstür'],['standings','🏆','Puan durumu'],null,['transfer','🔁','Transfer'],['contracts','💰','Kontratlar'],['draft','🎓','Draft'],null,['league','📊','Lig'],['club','🏛','Kulüp'],['data','🗂','Veri'],['menu','💾','Kaydet / Menü']];
const app=()=>document.getElementById('app');

/* ---------- saves ---------- */
const meta=()=>{ try{ return JSON.parse(localStorage.getItem(META)||'[]'); }catch(e){ return []; } };
App.save=function(){ const S=BM.S; if(!S||!App.slot) return; try{ localStorage.setItem(KEY+App.slot,JSON.stringify(S)); const t=S.teams[S.user]; const m=meta().filter(x=>x.slot!==App.slot); m.unshift({slot:App.slot,manager:S.manager,team:t.city+' '+t.name,abbr:t.abbr,c1:t.c1,season:S.season,day:S.day,rec:t.w+'-'+t.l,ts:Date.now()}); localStorage.setItem(META,JSON.stringify(m.slice(0,12))); }
  catch(e){ UI.toast('Kayıt yapılamadı: tarayıcı depolama alanı dolu olabilir. Veri › Kayıt dosyasını indir ile yedek al.',5000); } };
App.load=function(slot){ let S; try{ S=JSON.parse(localStorage.getItem(KEY+slot)); }catch(e){ S=null; } if(!S){ UI.toast('Kayıt okunamadı.'); return; }
  BM.S=S; App.slot=slot; BM.Gen.setId(S.idSeq||1); BM.Engine.clearCache(); App.trade=null; App.shell(); App.go('inbox'); };
App.remove=function(slot){ localStorage.removeItem(KEY+slot); localStorage.setItem(META,JSON.stringify(meta().filter(x=>x.slot!==slot))); };
App.download=function(name,text){ const b=new Blob([text],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); };

/* ---------- welcome / new career ---------- */
App.welcome=function(){
  BM.S=null; App.slot=null; const el=app(); el.style.display='block';
  const saves=meta(); let pick=null;
  el.innerHTML=`<div class="welcome"><div class="row sp"><div><div class="brand" style="font-size:40px">Basketball<b>Manager</b></div><p class="muted" style="margin:4px 0 0">2010 NBA yapısında 30 takımlık lig · maaş tavanı ve Bird hakları · pazarlık · takas · set çizme · 2D canlı maç · draft ve Gelişim Ligi</p></div><span data-q></span></div>
    ${saves.length?`<div class="card" style="margin-top:18px"><h2>Kariyerlerin</h2>${saves.map(s=>`<div class="asset" style="padding:8px 10px"><span class="row"><span class="crest" style="background:${s.c1}">${U.esc(s.abbr)}</span><span><b>${U.esc(s.team)}</b> · ${U.esc(s.manager)}<br><span class="dim">${U.seasonName(s.season)} · ${U.fdate(s.day)} · ${s.rec}</span></span></span><span class="row"><button class="btn pri" data-load="${s.slot}">Devam et</button><button class="btn sm danger" data-del="${s.slot}">Sil</button></span></div>`).join('')}</div>`:''}
    <div class="card" style="margin-top:18px"><h2>Yeni kariyer</h2><div class="row"><label>Menajer adı <input type="text" data-mgr value="Menajer" maxlength="30"></label><span class="muted" style="font-size:13px">Kurgusal lig: şehirler, konferanslar, bölümler ve güç dengesi 2009-10 NBA sezonuna göre; isimler kurgusaldır. Gerçek veriyi aşağıdan JSON ile yükleyebilirsin.</span></div>
      ${['E','W'].map(cf=>`<h3 style="margin-top:14px">${BM.CONF[cf]}</h3><div class="teamgrid">${BM.TEAMS0.map((t,i)=>[t,i]).filter(([t])=>t[0]===cf).map(([t,i])=>`<div class="teamcard" data-team="${i}"><span class="crest" style="background:${t[6]};color:${lum(t[6])>0.62?'#111':'#fff'}">${t[4]}</span><div><b>${t[2]} ${t[3]}</b><div class="dim" style="font-size:12px">${t[1]} · ${t[8]>0.6?'<span class="good">Favori</span>':t[8]>0.42?'<span class="warn">Orta</span>':'<span class="bad">Zor</span>'} · pazar ${'●'.repeat(t[5])}</div></div></div>`).join('')}</div>`).join('')}
      <details style="margin-top:14px"><summary class="muted" style="cursor:pointer">Veri yükle (isteğe bağlı JSON: gerçek takım/oyuncu verisi)</summary><p class="muted" style="font-size:13px">Biçim için oyunda Veri ekranına bak. Boş bırakırsan kurgusal lig oluşturulur.</p><textarea data-imp placeholder='{"teams":[...],"players":[...]}'></textarea><input type="file" accept=".json,application/json" data-file></details>
      <div class="row" style="margin-top:14px;justify-content:flex-end"><span data-pickname class="muted">Bir takım seç</span><button class="btn pri" data-start disabled>Kariyere başla ›</button></div></div>
    <p class="dim" style="font-size:12px;text-align:center;margin-top:18px">Kurallar 2010-11 toplu sözleşmesinin sadeleştirilmiş halidir. Tüm kulüp ve oyuncu adları kurgusaldır.</p></div>`;
  const q=el.querySelector('[data-q]'); if(window.KQuit) q.appendChild(KQuit.button('btn ghost'));
  el.onclick=e=>{ const c=e.target.closest('[data-team]'); if(c){ pick=+c.dataset.team; el.querySelectorAll('.teamcard').forEach(x=>x.classList.toggle('on',x===c)); const t=BM.TEAMS0[pick]; el.querySelector('[data-pickname]').textContent=t[2]+' '+t[3]; el.querySelector('[data-start]').disabled=false; return; }
    const ld=e.target.closest('[data-load]'); if(ld){ App.load(ld.dataset.load); return; }
    const dl=e.target.closest('[data-del]'); if(dl){ UI.confirm('Bu kariyer kalıcı olarak silinsin mi? Geri alınamaz.',()=>{ App.remove(dl.dataset.del); App.welcome(); },{danger:true,ok:'Sil'}); return; }
    if(e.target.closest('[data-start]')&&pick!=null){ let data=null; const txt=el.querySelector('[data-imp]').value.trim();
      if(txt){ try{ data=JSON.parse(txt); }catch(err){ UI.toast('JSON okunamadı: '+U.esc(err.message)); return; } }
      App.newCareer(pick,el.querySelector('[data-mgr]').value.trim()||'Menajer',data); } };
  el.querySelector('[data-file]').onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ el.querySelector('[data-imp]').value=r.result; }; r.readAsText(f); };
};
const lum=h=>{ const n=parseInt(h.slice(1),16); return ((n>>16&255)*0.299+(n>>8&255)*0.587+(n&255)*0.114)/255; };
App.newCareer=function(tid,mgr,data){
  const S=L.create(tid,mgr);
  if(data){ const r=App.applyImport(S,data); L.news(S,'Veri yüklendi','<p>'+r+'</p>','info'); }
  App.slot='c'+Date.now().toString(36); App.trade=null; App.shell(); App.save(); App.go('inbox');
};

/* ---------- import / export ---------- */
App.importSample=()=>({format:'basketballmanager-1',
  teams:[{slot:'BOS',city:'Boston',name:'Harbormen',abbr:'BOS',c1:'#1f6f43',c2:'#e8e2d0'}],
  players:[{name:'Örnek Oyuncu',team:'BOS',pos:'PG',age:25,hgt:188,num:9,exp:4,ovr:78,pot:84,ratings:{thr:16,pas:17,han:16,spd:15},salary:[9500000,10260000,11020000]},
    {name:'Serbest Uzun',team:'FA',pos:'C',age:31,hgt:213,ovr:66}],
  replacePlayers:false});
App.exportData=function(S){ const ab=tid=>tid>=0?S.teams[tid].abbr:'FA';
  return {format:'basketballmanager-1',season:S.season,teams:S.teams.map(t=>({slot:t.abbr,city:t.city,name:t.name,abbr:t.abbr,conf:t.conf,div:t.div,c1:t.c1,c2:t.c2})),
    players:Object.values(S.players).filter(p=>p.tid>=-1).map(p=>({name:p.name,team:ab(p.tid),pos:p.pos,age:p.age,hgt:p.hgt,wgt:p.wgt,num:p.num,college:p.college,exp:p.exp,ovr:p.ovr,pot:p.pot,ratings:Object.assign({},p.r),salary:p.contract?p.contract.amt.slice(Math.max(0,S.season-p.contract.start)):[]})),replacePlayers:true}; };
App.applyImport=function(S,data){
  const G=BM.Gen; let nt=0, np=0;
  (data.teams||[]).forEach((d,i)=>{ let t=d.id!=null?S.teams[d.id]:d.slot?S.teams.find(x=>x.abbr===String(d.slot).toUpperCase()):S.teams[i]; if(!t) return; ['city','name','abbr','c1','c2'].forEach(k=>{ if(d[k]) t[k]=String(d[k]).slice(0,k==='abbr'?4:30); }); t.glName=t.name+' Gelişim'; nt++; });
  const ps=data.players||[];
  if(ps.length){
    if(data.replacePlayers){ Object.values(S.players).forEach(p=>{ if(p.tid>=-1) delete S.players[p.id]; }); S.teams.forEach(t=>{ t.roster=[]; t.dead=[]; }); }
    G.setId(S.idSeq); const used=new Set(Object.values(S.players).map(p=>p.name));
    ps.forEach(d=>{ const pos=BM.POS.includes(d.pos)?d.pos:'SF'; const t=d.team&&d.team!=='FA'?S.teams.find(x=>x.abbr===String(d.team).toUpperCase()):null;
      const p=G.player({pos,age:+d.age||25,target:+d.ovr||60,tid:t?t.id:-1,used,exp:d.exp!=null?+d.exp:undefined});
      if(d.name) p.name=String(d.name).slice(0,40);
      if(d.ratings){ const vals=Object.values(d.ratings).map(Number); const k100=vals.some(v=>v>20); Object.entries(d.ratings).forEach(([k,v])=>{ if(BM.AKEYS.includes(k)) p.r[k]=U.clamp(Math.round((k100?v/5:+v)*10)/10,1,20); }); p.ovr=G.ovr(p); }
      ['hgt','wgt','num'].forEach(k=>{ if(d[k]!=null) p[k]=+d[k]; }); if(d.college) p.college=String(d.college).slice(0,40);
      p.pot=Math.max(p.ovr,d.pot!=null?+d.pot:G.potFor(p.age,p.ovr));
      if(t){ const sal=Array.isArray(d.salary)&&d.salary.length?d.salary.map(Number):null; p.contract=sal?{start:S.season,amt:sal,opt:null,rookie:false}:G.contract(S.season,G.salaryFor(p),U.rint(1,4),false); p.bird=Math.min(p.exp,3); t.roster.push(p.id); }
      else p.contract=null;
      S.players[p.id]=p; np++; });
    S.idSeq=G.nextId();
    S.teams.forEach(t=>{ t.roster=t.roster.filter(id=>S.players[id]); G.autoRotation(t,S); t.power=U.clamp(M.teamStrength(S,t.id),0.1,0.9); });
  }
  return nt+' takım ve '+np+' oyuncu içe aktarıldı.';
};

/* ---------- shell ---------- */
App.shell=function(){ const el=app(); el.style.display=''; el.innerHTML='<header class="top"></header><nav></nav><main id="main"></main>'; el.onclick=null; };
App.renderTop=function(){
  const S=BM.S; if(!S) return; const t=S.teams[S.user], top=app().querySelector('.top'); if(!top) return;
  const ug=L.userGameToday(S), draftTurn=S.phase==='draft'&&S.draft&&!S.draft.done;
  const label=draftTurn?'Draft sırası ›':ug?'Maç günü ▶':'Devam ▶';
  top.innerHTML=`<div class="brand">Basketball<b>Manager</b></div><div class="club">${UI.crest(t)}<div><div class="nm">${U.esc(t.city+' '+t.name)}</div><div class="meta">${t.w}-${t.l} · ${U.esc(S.manager)}</div></div></div>
    <div class="meta">${U.fdate(S.day)} · ${Sc.PHASES[S.phase]} · ${U.seasonName(S.season)}</div><div class="grow"></div>
    <div class="cont"><button class="btn sm ghost" data-adv="day" title="Bir gün ilerle">+1 gün</button><button class="btn sm ghost" data-adv="week" title="Maçlar otomatik oynanır">+1 hafta</button><button class="btn sm ghost" data-adv="phase" title="Maçlar otomatik oynanır">Aşama sonuna ⏭</button><button class="btn pri" data-adv="game">${label}</button></div>`;
  top.onclick=e=>{ const b=e.target.closest('[data-adv]'); if(b) App.advance(b.dataset.adv); };
};
App.renderNav=function(){
  const S=BM.S, nav=app().querySelector('nav'); if(!nav) return; const unread=S.news.filter(n=>!n.read).length, offers=S.tradeOffers.length, draftTurn=S.phase==='draft'&&S.draft&&!S.draft.done;
  nav.innerHTML=NAV.map(n=>n?`<button data-go="${n[0]}" class="${App.screen===n[0]?'on':''}"><span class="ico">${n[1]}</span>${n[2]}${n[0]==='inbox'&&unread?`<span class="badge">${unread}</span>`:''}${n[0]==='transfer'&&offers?`<span class="badge">${offers}</span>`:''}${n[0]==='draft'&&draftTurn?'<span class="badge">!</span>':''}</button>`:'<div class="sep"></div>').join('');
};
App.go=function(name,params){ if(!BM.S){ App.welcome(); return; } if(UI.isOpen()) UI.close(); App.screen=name; App.params=params||{}; App.render(); const m=document.getElementById('main'); if(m&&!(params&&params.keep)) m.scrollTop=0; };
App.render=function(){
  const S=BM.S; if(!S) return; App.renderTop();
  const main=document.getElementById('main'); main.onclick=null; main.onchange=null; main.oninput=null; main.onkeydown=null;
  const f=App.screen==='menu'?App.menu:Sc[App.screen]; try{ f(S,main,App.params||{}); }catch(err){ console.error(err); main.innerHTML='<div class="card"><h2>Ekran yüklenemedi</h2><pre class="muted" style="white-space:pre-wrap">'+U.esc(err.stack||err.message)+'</pre></div>'; }
  App.renderNav();
};
App.menu=function(S,root){
  root.innerHTML=`<h1>Kaydet / Menü</h1><div class="grid g2"><div class="card"><h3>Kayıt</h3><p class="muted" style="font-size:14px">Oyun her gün ilerlediğinde otomatik kaydedilir (tarayıcı depolaması). Yedek için Veri ekranından kayıt dosyası indirebilirsin.</p><div class="row"><button class="btn pri" data-a="save">Şimdi kaydet</button><button class="btn" data-a="copy">Kopya olarak kaydet</button><button class="btn" data-a="loadf">Kayıt dosyası yükle</button><input type="file" accept=".json" data-file class="hidden"></div></div>
    <div class="card"><h3>Oyun</h3><div class="row" data-q><button class="btn" data-a="main">Ana menü</button><button class="btn danger" data-a="del">Kariyeri sil</button></div><p class="muted" style="font-size:13px;margin-top:10px">Kısayol: <b>Boşluk</b> = Devam. Maçlar sırasında hız, mola, oyuncu değişikliği ve taktik ayarları izleme ekranındadır.</p></div></div>`;
  if(window.KQuit) root.querySelector('[data-q]').appendChild(KQuit.button('btn ghost'));
  root.onclick=e=>{ const b=e.target.closest('[data-a]'); if(!b) return; const a=b.dataset.a;
    if(a==='save'){ App.save(); UI.toast('Kaydedildi.'); }
    if(a==='copy'){ App.slot='c'+Date.now().toString(36); App.save(); UI.toast('Yeni kayıt yuvası oluşturuldu.'); }
    if(a==='loadf') root.querySelector('[data-file]').click();
    if(a==='main'){ App.save(); App.welcome(); }
    if(a==='del') UI.confirm('Bu kariyer kalıcı olarak silinsin mi? Geri alınamaz.',()=>{ App.remove(App.slot); App.welcome(); },{danger:true,ok:'Sil'}); };
  root.onchange=e=>{ if(e.target.dataset.file==null) return; const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ const S2=JSON.parse(r.result); if(!S2.teams||!S2.players) throw new Error('Geçersiz kayıt'); BM.S=S2; App.slot='c'+Date.now().toString(36); BM.Gen.setId(S2.idSeq||1); BM.Engine.clearCache(); App.save(); App.shell(); App.go('inbox'); UI.toast('Kayıt yüklendi.'); }catch(err){ UI.toast('Yüklenemedi: '+U.esc(err.message)); } }; r.readAsText(f); };
};

/* ---------- time ---------- */
const RELEVANT=['contract','trade','board','draft','squad','injury','result'];
function preDay(S,mode){
  if(S.phase==='draft'&&S.draft&&!S.draft.done) return 'draft';
  if(S.phase==='camp'&&S.day+1>=U.day(S.season,...R.dates.seasonStart)){ const n=S.teams[S.user].roster.length; if(n>R.rosterMax||n<R.rosterMin) return 'roster'; }
  const ug=L.userGameToday(S); if(ug&&(mode==='game'||mode==='day')) return 'game';
  return null;
}
App.advance=function(mode){
  const S=BM.S; if(!S||App.busy) return; if(BM.MatchView.cur) return;
  const startPhase=S.phase, newsTop=S.news[0]&&S.news[0].id; let days=0;
  const first=preDay(S,mode); if(first){ handleStop(S,first); return; }
  App.busy=true; const long=mode==='phase'||mode==='week'||mode==='month';
  if(long) UI.modal('<h2>Simülasyon</h2><p class="muted" data-prog>Günler oynanıyor…</p>',{noX:true,sticky:true});
  const done=(why)=>{ App.busy=false; if(long) UI.close(); App.save(); App.render(); if(why) handleStop(S,why); else if(S.fired) handleStop(S,'fired'); };
  const chunk=()=>{
    for(let n=0;n<4;n++){
      if(days>0){ const st=preDay(S,mode==='phase'||mode==='week'||mode==='month'?'auto':mode); if(st){ done(st); return; } }
      const ug=L.userGameToday(S);
      L.playDay(S); days++;
      if(ug&&long) quickResultNote(S);
      if(S.fired){ done('fired'); return; }
      if(S.phase!==startPhase){ done(); UI.toast(Sc.PHASES[S.phase]+' başladı.'); return; }
      const fresh=[]; for(const n2 of S.news){ if(n2.id===newsTop) break; fresh.push(n2); }
      if(fresh.some(x=>x.stop)){ done(); UI.toast('Karar bekleyen bir mesajın var.'); App.go('inbox',{id:fresh.find(x=>x.stop).id}); return; }
      if(mode==='day'){ done(); return; }
      if(mode==='week'&&days>=7){ done(); return; }
      if(mode==='game'&&!['regular'].includes(S.phase)&&(days>=7||fresh.some(x=>RELEVANT.includes(x.type)&&!x.read))){ done(); return; }
      if(mode==='game'&&S.phase==='playoffs'&&days>=7){ done(); return; }
      if(days>400){ done(); return; }
    }
    const pr=document.querySelector('[data-prog]'); if(pr) pr.textContent=U.fdate(S.day)+' · '+days+' gün';
    setTimeout(chunk,0);
  };
  chunk();
};
function quickResultNote(S){ const b=S.boxes[0]; if(!b||b.day!==S.day-1) return; }
function handleStop(S,why){
  if(why==='draft'){ App.go('draft'); UI.toast('Draft\'ta sıra sende!'); return; }
  if(why==='game'){ App.matchDay(); return; }
  if(why==='fired'){ App.fired(); return; }
  if(why==='roster'){ const t=S.teams[S.user], n=t.roster.length;
    if(n>R.rosterMax){ UI.modal(`<h2>Kadro sınırı</h2><p>Sezon yarın başlıyor ve kadronda <b>${n}</b> oyuncu var. En fazla ${R.rosterMax} oyuncu olabilir (Gelişim Ligi'ndekiler dahil). Fazla oyuncuları serbest bırak ya da takas et.</p><div class="row" style="justify-content:flex-end"><button class="btn pri" data-go="squad">Kadroya git</button></div>`,{w:560}); return; }
    const need=R.rosterMin-n; const box=UI.modal(`<h2>Kadro eksik</h2><p>Sezon yarın başlıyor; kadronda ${n} oyuncu var, en az ${R.rosterMin} gerekli.</p><div class="row" style="justify-content:flex-end"><button class="btn" data-go="transfer" data-tab="fa">Serbest oyunculara bak</button><button class="btn pri" data-fill>En iyi ${need} serbest oyuncuyu minimumla imzala</button></div>`,{w:560});
    box.querySelector('[data-fill]').onclick=()=>{ for(let i=0;i<need;i++){ const p=M.freeAgents(S).sort((a,b)=>BM.Gen.value(b)-BM.Gen.value(a))[0]; if(!p) break; M.sign(S,p,S.user,BM.Gen.minFor(p.exp),1,'min'); L.news(S,'İmza: '+p.name,'<p>'+p.name+' 1 yıllık minimum sözleşme imzaladı.</p>','contract'); S.news[0].read=true; } UI.close(); App.save(); App.render(); UI.toast('Kadro tamamlandı.'); }; }
}
App.matchDay=function(){
  const S=BM.S, ug=L.userGameToday(S); if(!ug) return; const H=S.teams[ug.h], A0=S.teams[ug.a], opp=ug.h===S.user?A0:H;
  const ser=ug.po?ug.series:null; const title=ser?`Playoff ${['','1. tur','Konf. yarı final','Konf. final','Final'][ser.round]} · Seri ${S.teams[ser.a].abbr} ${ser.wa}-${ser.wb} ${S.teams[ser.b].abbr}`:'Normal sezon';
  const key=t=>t.roster.map(id=>S.players[id]).filter(p=>!p.gl).sort((a,b)=>b.ovr-a.ovr).slice(0,3).map(p=>`${UI.pl(p)} <span class="dim">${p.pos} ${p.ovr}</span>${UI.injury(p)}`).join('<br>');
  const inj=S.teams[S.user].roster.map(id=>S.players[id]).filter(p=>p.inj&&p.inj.days>0);
  const box=UI.modal(`<h2>Maç günü · ${U.fdate(S.day)}</h2><p class="muted" style="margin-top:-6px">${title}</p>
    <div class="score" style="margin:10px 0"><span class="row">${UI.crest(H,46)}<span class="tm">${U.esc(H.city)}<br><b style="color:var(--ink)">${U.esc(H.name)}</b> ${H.w}-${H.l}</span></span><span class="dim">vs</span><span class="row"><span class="tm" style="text-align:right">${U.esc(A0.city)}<br><b style="color:var(--ink)">${U.esc(A0.name)}</b> ${A0.w}-${A0.l}</span>${UI.crest(A0,46)}</span></div>
    <div class="grid g2"><div class="card tight"><h3>${H.abbr} öne çıkanlar</h3>${key(H)}</div><div class="card tight"><h3>${A0.abbr} öne çıkanlar</h3>${key(A0)}</div></div>
    ${inj.length?`<p class="warn" style="font-size:13px">Sakat: ${inj.map(p=>U.esc(p.name)+' ('+p.inj.days+'g)').join(', ')}</p>`:''}
    <p class="muted" style="font-size:13px">Rakip savunması: <b>${BM.Tactics.getDef(opp.tac.def,S).name}</b> · Tempo ${opp.tac.pace>1?'hızlı':opp.tac.pace<1?'yavaş':'normal'}</p>
    <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn" data-go="tactics">Taktiği düzenle</button><button class="btn" data-quick>Sonucu al</button><button class="btn pri" data-watch>▶ 2D izle</button></div>`,{w:760});
  box.querySelector('[data-watch]').onclick=()=>{ UI.close(); BM.MatchView.open(S,ug.h,ug.a,{title,onDone:g=>{ App.playUserDay(g); }}); };
  box.querySelector('[data-quick]').onclick=()=>{ UI.close(); App.playUserDay(null); };
};
App.playUserDay=function(eg){
  const S=BM.S; const before=S.phase; L.playDay(S,eg?{userGame:eg}:{}); App.save(); App.render();
  const b=S.boxes[0]; if(b){ const home=b.h===S.user, my=home?b.hs:b.as, op=home?b.as:b.hs, won=my>op, opp=S.teams[home?b.a:b.h];
    if(!eg){ const K=1; const top=(b.players[home?0:1]||[]).slice().sort((x,y)=>y[2]-x[2]).slice(0,3).map(r=>{ const p=S.players[r[0]]; return p?U.esc(p.name)+' '+r[2]+' sy':''; }).join(', ');
      const box=UI.modal(`<h2 class="${won?'good':'bad'}">${won?'Galibiyet':'Mağlubiyet'} · ${my}-${op}</h2><p>${home?'vs':'@'} ${U.esc(opp.city+' '+opp.name)}</p><p class="muted">Öne çıkanlar: ${top}</p><div class="row" style="justify-content:flex-end"><button class="btn" data-bx>Kutu skor</button><button class="btn pri" data-close>Tamam</button></div>`,{w:520});
      box.querySelector('[data-bx]').onclick=()=>Sc.boxModal(S,b); }
    else UI.toast((won?'Galibiyet ':'Mağlubiyet ')+my+'-'+op); }
  if(S.phase!==before) UI.toast(Sc.PHASES[S.phase]+' başladı.');
  if(S.fired) App.fired();
};
App.fired=function(){
  const S=BM.S; const offers=S.teams.filter(t=>t.id!==S.user).sort((a,b)=>a.power-b.power).slice(0,3);
  const box=UI.modal(`<h2 class="bad">Görevden alındın</h2><p>Yönetim kurulu güvenini kaybetti. Ama ligde seni isteyen kulüpler var:</p>${offers.map(t=>`<div class="asset" style="padding:8px"><span class="row">${UI.crest(t)} <b>${U.esc(t.city+' '+t.name)}</b> <span class="dim">${t.w}-${t.l} · ${t.board.goal}</span></span><button class="btn pri" data-job="${t.id}">Kabul et</button></div>`).join('')}<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn danger" data-end>Kariyeri bitir</button></div>`,{w:640,sticky:true,noX:true});
  box.onclick=e=>{ const j=e.target.closest('[data-job]'); if(j){ S.user=+j.dataset.job; S.fired=false; S.teams[S.user].board.conf=55; S.teams[S.user].rot=null; BM.Gen.autoRotation(S.teams[S.user],S); L.news(S,'Yeni görev: '+L.tname(S,S.user),'<p>'+L.tname(S,S.user)+' seni yeni menajeri olarak açıkladı. Hedef: <b>'+S.teams[S.user].board.goal+'</b>.</p>','board'); App.trade=null; UI.close(); App.save(); App.go('inbox'); }
    if(e.target.closest('[data-end]')){ UI.close(); App.remove(App.slot); App.welcome(); } };
};

/* ---------- global delegation ---------- */
document.addEventListener('click',e=>{
  if(e.target.closest('.mv')) return;
  const go=e.target.closest('[data-go]'); if(go){ e.preventDefault(); const d=Object.assign({},go.dataset); const name=d.go; delete d.go; App.go(name,d); return; }
  const inCtl=e.target.closest('button,input,select,textarea,label');
  const pl=e.target.closest('[data-p]'); if(pl&&(pl.tagName==='A'||!inCtl)){ e.preventDefault(); Sc.player(+pl.dataset.p); return; }
  const tm=e.target.closest('[data-t]'); if(tm&&(tm.tagName==='A'||!inCtl)){ e.preventDefault(); Sc.team(+tm.dataset.t); }
});
document.addEventListener('keydown',e=>{
  if(e.key===' '&&BM.S&&!BM.MatchView.cur&&!UI.isOpen()&&!e.target.closest('input,textarea,select')){ e.preventDefault(); App.advance('game'); }
  if(e.key==='Escape'&&UI.isOpen()&&!document.querySelector('.modal .box [data-yes]')) UI.close();
});
window.addEventListener('beforeunload',()=>{ if(BM.S) App.save(); });
App.welcome();
})();
