/* BasketballManager — app shell: welcome / new career (single player or online), routing, top bar, day advance,
   match day, managers & chat, saves, import/export */
(function(){
'use strict';
const BM=window.BM, U=BM.U, R=BM.RULES, UI=BM.UI, L=BM.League, C=BM.Cap, M=BM.Market, Sc=BM.Screens, ON=BM.Online, ACT=BM.Actions;
const App = BM.App = {screen:'inbox',params:{},trade:null,slot:null,busy:false};
const KEY='bm-save-', META='bm-saves';
const NAV=[['inbox','📥','Gelen kutusu'],['squad','👥','Kadro'],['tactics','📋','Taktik'],['schedule','📅','Fikstür'],['standings','🏆','Puan durumu'],null,['transfer','🔁','Transfer'],['contracts','💰','Kontratlar'],['draft','🎓','Draft'],null,['managers','🌐','Menajerler'],['league','📊','Lig'],['club','🏛','Kulüp'],['data','🗂','Veri'],['menu','💾','Kaydet / Menü']];
const app=()=>document.getElementById('app');
const lum=h=>{ const n=parseInt(String(h).slice(1),16); return ((n>>16&255)*0.299+(n>>8&255)*0.587+(n&255)*0.114)/255; };

/* ---------- actions: local, or sent to the online host ---------- */
App.act=function(type,p){ const S=BM.S; if(!S) return Promise.resolve({err:'Oyun yok.'});
  if(ON.isGuest()) return ON.act(type,p);
  const r=ACT.run(S,S.user,type,p); App.save(); if(ON.isHost()) ON.changed(); return Promise.resolve(r); };
App.canEdit=()=>!ON.isGuest();
App.isHost=()=>ON.isHost();
App.multi=()=>ON.active()||((BM.S&&BM.S.humans)||[]).length>1;
/* read marks live on this device, so managers sharing a league each keep their own inbox state */
let readSet=null, readKey=null;
const readStore=()=>{ const S=BM.S; const k='bm-read-'+(S&&S.cid)+'-'+ON.me.cid; if(k!==readKey){ readKey=k; try{ readSet=new Set(JSON.parse(localStorage.getItem(k)||'[]')); }catch(e){ readSet=new Set(); } } return readSet; };
App.isRead=n=>!!n.read&&!App.multi()||readStore().has(n.id);
App.markRead=n=>{ const s=readStore(); if(s.has(n.id)) return; s.add(n.id); try{ localStorage.setItem(readKey,JSON.stringify([...s].slice(-400))); }catch(e){} };

/* ---------- saves ---------- */
const meta=()=>{ try{ return JSON.parse(localStorage.getItem(META)||'[]'); }catch(e){ return []; } };
App.save=function(){ const S=BM.S; if(!S||!App.slot||ON.isGuest()) return; try{ localStorage.setItem(KEY+App.slot,JSON.stringify(S)); const t=S.teams[S.user]; const m=meta().filter(x=>x.slot!==App.slot); m.unshift({slot:App.slot,manager:(L.human(S,S.user)||{}).name||S.manager,team:t.city+' '+t.name,abbr:t.abbr,c1:t.c1,season:S.season,day:S.day,rec:t.w+'-'+t.l,ts:Date.now(),mp:S.mp?S.mp.code:null,n:(S.humans||[]).length}); localStorage.setItem(META,JSON.stringify(m.slice(0,12))); }
  catch(e){ UI.toast('Kayıt yapılamadı: tarayıcı depolama alanı dolu olabilir. Veri › Kayıt dosyasını indir ile yedek al.',5000); } };
App.load=function(slot,online){ let S; try{ S=JSON.parse(localStorage.getItem(KEY+slot)); }catch(e){ S=null; } if(!S){ UI.toast('Kayıt okunamadı.'); return; }
  L.migrate(S); BM.S=S; App.slot=slot; BM.Gen.setId(S.idSeq||1); BM.Engine.clearCache(); App.trade=null;
  if(online){ ON.setName((L.human(S,S.user)||{}).name||ON.me.name); UI.toast('Lig çevrimiçi açılıyor…',3000); ON.host(S).then(r=>{ if(r&&r.joined){ UI.toast('Bu lig şu an başka bir menajerin bilgisayarında açık; ona bağlanıyorsun…',6000); return; } App.save(); App.shell(); App.go('managers'); UI.toast('Çevrimiçi oyun açıldı. Kod: <b>'+r.code+'</b> · arkadaşların ana menüdeki kariyer listesinden ya da bu kodla katılır.',8000); }).catch(e=>UI.toast(U.esc(e.message))); return; }
  App.shell(); App.go('inbox'); };
let bkT=null;
App.saveBackup=function(){ clearTimeout(bkT); bkT=setTimeout(()=>{ const S=BM.S; if(!S||!ON.isGuest()||!ON.code||ON.myTid==null||App.keepBackup) return; const slot='g-'+ON.code;
  try{ localStorage.setItem(KEY+slot,JSON.stringify(Object.assign({},S,{user:ON.myTid}))); const t=S.teams[ON.myTid]; const m=meta().filter(x=>x.slot!==slot); m.unshift({slot,manager:ON.me.name,team:t.city+' '+t.name,abbr:t.abbr,c1:t.c1,season:S.season,day:S.day,rec:t.w+'-'+t.l,ts:Date.now(),mp:ON.code,n:(S.humans||[]).length,guest:true,host:ON.hostName||''}); localStorage.setItem(META,JSON.stringify(m.slice(0,12))); }
  catch(e){ if(!App._bkWarn){ App._bkWarn=true; UI.toast('Ligin yedeği bu cihaza kaydedilemedi (depolama dolu olabilir).',5000); } } },2500); };
App.remove=function(slot){ localStorage.removeItem(KEY+slot); localStorage.setItem(META,JSON.stringify(meta().filter(x=>x.slot!==slot))); };
App.download=function(name,text){ const b=new Blob([text],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); };

/* ---------- welcome / new career ---------- */
const START=[['draft','Draft öncesi · 1 Haziran 2010','2010 draftı, yaz transferleri, hazırlık kampı ve sezon. Önerilen.'],['fa','Serbest oyuncu dönemi · 1 Temmuz 2010','Draft bitmiş, piyasa açılıyor.'],['late','Sezona 2 ay kala · 26 Ağustos 2010','Piyasanın büyük kısmı tamamlanmış; kamp ve sezon.']];
App.welcome=function(){
  if(ON.active()) ON.leave();
  BM.S=null; App.slot=null; const el=app(); el.style.display='block';
  const saves=meta(); let pick=null, start='draft';
  el.innerHTML=`<div class="welcome"><div class="row sp"><div><div class="brand" style="font-size:40px">Basketball<b>Manager</b></div><p class="muted" style="margin:4px 0 0">2010 NBA yapısında 30 takımlık lig · maaş tavanı ve Bird hakları · pazarlık · takas · set çizme · 2D canlı maç · draft ve Gelişim Ligi · arkadaşlarınla çevrimiçi kariyer</p></div><span data-q></span></div>
    ${saves.length?`<div class="card" style="margin-top:18px"><h2>Kariyerlerin</h2>${saves.map(s=>`<div class="asset" style="padding:8px 10px"><span class="row"><span class="crest" style="background:${s.c1};color:${lum(s.c1)>0.62?'#111':'#fff'}">${U.esc(s.abbr)}</span><span><b>${U.esc(s.team)}</b> · ${U.esc(s.manager)}${s.n>1?' · 🌐 '+s.n+' menajer':''}<br><span class="dim">${U.seasonName(s.season)} · ${U.fdate(s.day)} · ${s.rec}</span></span></span><span class="row">${s.guest?`<span class="dim" style="font-size:12px">ev sahibi ${U.esc(s.host||'?')} · kod ${U.esc(s.mp)}</span><button class="btn pri" data-rejoin="${s.slot}">Devam et</button><button class="btn" data-host="${s.slot}" title="Ev sahibi gelemiyorsa ligi kendi kopyanla sen aç; diğerleri sana bağlanır">Ev sahibi yoksa sen aç</button>`:s.mp?`<span class="dim" style="font-size:12px">kod ${U.esc(s.mp)}</span><button class="btn pri" data-host="${s.slot}" title="Çevrimiçi açılır, arkadaşların bağlanabilir">Devam et</button><button class="btn" data-load="${s.slot}" title="Arkadaşların bağlanamaz; onların takımlarını yardımcı antrenör yönetir">Tek başına aç</button>`:`<button class="btn pri" data-load="${s.slot}">Devam et</button><button class="btn" data-host="${s.slot}" title="Bu kariyeri arkadaşlarınla oyna">🌐 Çevrimiçi aç</button>`}<button class="btn sm danger" data-del="${s.slot}">Sil</button></span></div>`).join('')}</div>`:''}
    <div class="card" style="margin-top:18px;border-color:#2d4f7a"><h2>🌐 Arkadaşınla oyna</h2><p class="muted" style="font-size:14px;margin-top:-4px">Bir kişi oyunu kurar, diğerleri 5 haneli kodla katılır ve <b>her biri farklı bir takım</b> seçer. Zaman, herkes <b>Devam</b>'a basınca ilerler; maç günlerinde herkes kendi maçını 2D canlı izler ya da sonucunu alır. İki menajer karşılaşırsa aynı maçı birlikte, karşılıklı koçluk yaparak izlersiniz.</p>
      <div class="row"><label>Adın <input type="text" data-nm value="${U.esc(ON.me.name)}" maxlength="24"></label><label>Oyun kodu <input type="text" data-code maxlength="5" placeholder="abc12" style="width:90px;text-transform:lowercase"></label><button class="btn pri" data-join>Katıl</button><span class="dim" style="font-size:13px">Kurmak için aşağıdan takımını seç ve <b>Çevrimiçi kur</b>'a bas.</span></div>
      <div data-games class="row" style="margin-top:8px"></div></div>
    <div class="card" style="margin-top:18px"><h2>Yeni kariyer</h2><div class="row"><label>Menajer adı <input type="text" data-mgr value="${U.esc(ON.me.name)}" maxlength="24"></label><span class="muted" style="font-size:13px">Kurgusal lig: şehirler, konferanslar, bölümler ve güç dengesi 2009-10 NBA sezonuna göre; isimler kurgusaldır. Gerçek veriyi aşağıdan JSON ile yükleyebilirsin.</span></div>
      <h3 style="margin-top:12px">Başlangıç</h3><div class="grid g3" data-starts>${START.map(([k,l,d])=>`<div class="teamcard${k===start?' on':''}" data-start="${k}"><div><b>${l}</b><div class="dim" style="font-size:12px">${d}</div></div></div>`).join('')}</div>
      ${['E','W'].map(cf=>`<h3 style="margin-top:14px">${BM.CONF[cf]}</h3><div class="teamgrid">${BM.TEAMS0.map((t,i)=>[t,i]).filter(([t])=>t[0]===cf).map(([t,i])=>`<div class="teamcard" data-team="${i}"><span class="crest" style="background:${t[6]};color:${lum(t[6])>0.62?'#111':'#fff'}">${t[4]}</span><div><b>${t[2]} ${t[3]}</b><div class="dim" style="font-size:12px">${t[1]} · ${t[8]>0.6?'<span class="good">Favori</span>':t[8]>0.42?'<span class="warn">Orta</span>':'<span class="bad">Zor</span>'} · pazar ${'●'.repeat(t[5])}</div></div></div>`).join('')}</div>`).join('')}
      <details style="margin-top:14px"><summary class="muted" style="cursor:pointer">Veri yükle (isteğe bağlı JSON: gerçek takım/oyuncu verisi)</summary><p class="muted" style="font-size:13px">Biçim için oyunda Veri ekranına bak. Boş bırakırsan kurgusal lig oluşturulur.</p><textarea data-imp placeholder='{"teams":[...],"players":[...]}'></textarea><input type="file" accept=".json,application/json" data-file></details>
      <div class="row" style="margin-top:14px;justify-content:flex-end"><span data-pickname class="muted">Bir takım seç</span><button class="btn" data-start-online disabled>🌐 Çevrimiçi kur</button><button class="btn pri" data-start-go disabled>Kariyere başla ›</button></div></div>
    <p class="dim" style="font-size:12px;text-align:center;margin-top:18px">Kurallar 2010-11 toplu sözleşmesinin sadeleştirilmiş halidir. Tüm kulüp ve oyuncu adları kurgusaldır.</p></div>`;
  const q=el.querySelector('[data-q]'); if(window.KQuit) q.appendChild(KQuit.button('btn ghost'));
  const gamesEl=el.querySelector('[data-games]');
  ON.listGames(list=>{ if(!gamesEl.isConnected) return; if(list===null){ gamesEl.innerHTML='<span class="warn" style="font-size:13px">Çevrimiçi bağlantı kurulamadı; tek oyunculu oynayabilirsin.</span>'; return; }
    gamesEl.innerHTML=list.length?'<span class="dim" style="font-size:13px">Açık oyunlar:</span>'+list.map(g=>`<button class="btn sm" data-joincode="${U.esc(g.c)}">${U.esc(g.h)} · ${U.esc(g.t||'')} · ${g.n} menajer · ${U.esc(g.s||'')} › Katıl</button>`).join(''):'<span class="dim" style="font-size:13px">Şu an açık oyun görünmüyor; kodla katılabilirsin.</span>'; });
  const readImport=()=>{ const txt=el.querySelector('[data-imp]').value.trim(); if(!txt) return null; try{ return JSON.parse(txt); }catch(err){ UI.toast('JSON okunamadı: '+U.esc(err.message)); return false; } };
  /* joining waits for the host: if they open the league later, this connects by itself */
  const doJoin=code=>{ ON.setName(el.querySelector('[data-nm]').value.trim()||'Menajer'); const b=el.querySelector('[data-join]');
    if(ON.isGuest()&&!ON.gotSnap){ ON.leave(true); b.textContent='Katıl'; b.classList.add('pri'); return; }
    b.textContent='Bağlanıyor…';
    ON.join(code).then(()=>{ setTimeout(()=>{ if(ON.isGuest()&&!ON.gotSnap&&b.isConnected){ b.textContent='Ev sahibi bekleniyor… (iptal)'; b.classList.remove('pri'); UI.toast('Ev sahibi şu an ligi açmamış. Bu sayfa açık kaldıkça bekliyoruz; ligi açtığı anda otomatik bağlanacaksın.',8000); } },8000); })
      .catch(e=>{ b.textContent='Katıl'; UI.toast(U.esc(e.message)); }); };
  el.onclick=e=>{ const c=e.target.closest('[data-team]'); if(c){ pick=+c.dataset.team; el.querySelectorAll('[data-team]').forEach(x=>x.classList.toggle('on',x===c)); const t=BM.TEAMS0[pick]; el.querySelector('[data-pickname]').textContent=t[2]+' '+t[3]; el.querySelector('[data-start-go]').disabled=false; el.querySelector('[data-start-online]').disabled=false; return; }
    const st=e.target.closest('[data-start]'); if(st){ start=st.dataset.start; el.querySelectorAll('[data-start]').forEach(x=>x.classList.toggle('on',x===st)); return; }
    const ld=e.target.closest('[data-load]'); if(ld){ App.load(ld.dataset.load); return; }
    const rj=e.target.closest('[data-rejoin]'); if(rj){ const s=meta().find(x=>x.slot===rj.dataset.rejoin); if(s){ el.querySelector('[data-nm]').value=s.manager; doJoin(s.mp); } return; }
    const hs=e.target.closest('[data-host]'); if(hs){ ON.setName(el.querySelector('[data-nm]').value.trim()||ON.me.name); App.load(hs.dataset.host,true); return; }
    const dl=e.target.closest('[data-del]'); if(dl){ UI.confirm('Bu kariyer kalıcı olarak silinsin mi? Geri alınamaz.',()=>{ App.remove(dl.dataset.del); App.welcome(); },{danger:true,ok:'Sil'}); return; }
    const jc=e.target.closest('[data-joincode]'); if(jc){ doJoin(jc.dataset.joincode); return; }
    if(e.target.closest('[data-join]')){ doJoin(el.querySelector('[data-code]').value); return; }
    const go=e.target.closest('[data-start-go],[data-start-online]'); if(go&&pick!=null){ const data=readImport(); if(data===false) return; const nm=el.querySelector('[data-mgr]').value.trim()||'Menajer'; ON.setName(nm);
      App.newCareer(pick,nm,data,start,!!go.dataset.startOnline||go.hasAttribute('data-start-online')); } };
  el.querySelector('[data-file]').onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ el.querySelector('[data-imp]').value=r.result; }; r.readAsText(f); };
};
App.newCareer=function(tid,mgr,data,start,online){
  const S=L.create(tid,mgr,{start,cid:ON.me.cid});
  if(data){ const r=App.applyImport(S,data); L.news(S,'Veri yüklendi','<p>'+r+'</p>','info'); }
  App.slot='c'+Date.now().toString(36); App.trade=null; App.save();
  if(online){ ON.host(S).then(r=>{ App.save(); App.shell(); App.go('managers'); UI.toast('Çevrimiçi oyun kuruldu. Arkadaşlarına kodu ver: <b>'+r.code+'</b>',8000); }).catch(e=>{ UI.toast(U.esc(e.message)); App.shell(); App.go('inbox'); }); return; }
  App.shell(); App.go('inbox');
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
  const S=BM.S; if(!S) return; const top=app().querySelector('.top'); if(!top) return; const t=S.teams[S.user];
  const draftTurn=S.phase==='draft'&&S.draft&&!S.draft.done&&S.draftOrder[S.draft.idx]&&S.draftOrder[S.draft.idx].tid===S.user;
  let right;
  if(ON.active()){
    const st=ON.status||{humans:[]}, me=st.humans.find(h=>h.cid===ON.me.cid), on=st.humans.filter(h=>h.online), rd=on.filter(h=>h.ready).length;
    const chips=st.humans.map(h=>`<span class="chip" title="${U.esc(h.name)} · ${S.teams[h.tid]?S.teams[h.tid].abbr:''}${h.online?'':' · çevrimdışı'}" style="${h.online?'':'opacity:.45'}">${h.ready?'✅':h.online?'⏳':'💤'} ${U.esc(h.name)}</span>`).join('');
    const busy=st.busy, md=ON.mdInfo;
    const btn=busy?`<button class="btn pri" disabled>⏩ ${U.esc(st.prog||'Simülasyon…')}</button>`:md?`<button class="btn pri" data-md>🏀 Maç günü</button>`:draftTurn?`<button class="btn pri" data-go="draft">Draft sırası ›</button>`
      :`<button class="btn ${me&&me.ready?'':'pri'}" data-adv="game" title="Herkes Devam'a basınca bir sonraki maça ya da önemli bir olaya kadar ilerlenir">${me&&me.ready?'✅ Diğerleri bekleniyor ('+rd+'/'+on.length+') · iptal':'Devam ▶'+(on.length>1?' ('+rd+'/'+on.length+')':'')}</button>`;
    right=`<div class="cont" style="align-items:center;flex-wrap:wrap">${chips}<span class="chip" title="Oyun kodu" data-copy style="cursor:pointer">🔑 ${U.esc(ON.code||'')}</span>${ON.isGuest()&&!ON.hostOn?'<span class="chip bad">Ev sahibi bağlantısı yok</span>':''}
      ${btn}</div>`;
  } else {
    const ug=L.userGameToday(S); const label=draftTurn?'Draft sırası ›':ug?'Maç günü ▶':'Devam ▶';
    right=`<div class="cont"><button class="btn sm ghost" data-adv="day" title="Bir gün ilerle">+1 gün</button><button class="btn sm ghost" data-adv="week" title="Maçlar otomatik oynanır">+1 hafta</button><button class="btn sm ghost" data-adv="phase" title="Maçlar otomatik oynanır">Aşama sonuna ⏭</button><button class="btn pri" data-adv="game">${label}</button></div>`;
  }
  top.innerHTML=`<div class="brand">Basketball<b>Manager</b></div><div class="club">${UI.crest(t)}<div><div class="nm">${U.esc(t.city+' '+t.name)}</div><div class="meta">${t.w}-${t.l} · ${U.esc((L.human(S,S.user)||{}).name||S.manager)}</div></div></div>
    <div class="meta">${U.fdate(S.day)} · ${Sc.PHASES[S.phase]} · ${U.seasonName(S.season)}</div><div class="grow"></div>${right}`;
  top.onclick=e=>{ const b=e.target.closest('[data-adv]'); if(b){ App.advance(b.dataset.adv); return; } if(e.target.closest('[data-force]')){ ON.force(); return; } if(e.target.closest('[data-md]')){ App.matchdayModal(); return; }
    if(e.target.closest('[data-copy]')){ try{ navigator.clipboard.writeText(ON.code); UI.toast('Kod kopyalandı: '+ON.code); }catch(err){ UI.toast('Kod: '+ON.code); } } };
};
App.renderNav=function(){
  const S=BM.S, nav=app().querySelector('nav'); if(!nav) return; const unread=Sc.unread(S), offers=Sc.myOffers(S).length, draftTurn=S.phase==='draft'&&S.draft&&!S.draft.done&&S.draftOrder[S.draft.idx]&&S.draftOrder[S.draft.idx].tid===S.user;
  nav.innerHTML=NAV.filter(n=>!n||n[0]!=='managers'||App.multi()).map(n=>n?`<button data-go="${n[0]}" class="${App.screen===n[0]?'on':''}"><span class="ico">${n[1]}</span>${n[2]}${n[0]==='inbox'&&unread?`<span class="badge">${unread}</span>`:''}${n[0]==='transfer'&&offers?`<span class="badge">${offers}</span>`:''}${n[0]==='draft'&&draftTurn?'<span class="badge">!</span>':''}${n[0]==='managers'&&App.unreadChat?`<span class="badge">${App.unreadChat}</span>`:''}</button>`:'<div class="sep"></div>').join('');
};
App.go=function(name,params){ if(!BM.S){ App.welcome(); return; } if(UI.isOpen()&&!(params&&params.keepModal)) UI.close(); App.screen=name; App.params=params||{}; App.render(); const m=document.getElementById('main'); if(m&&!(params&&params.keep)) m.scrollTop=0; };
App.render=function(){
  const S=BM.S; if(!S) return; const main=document.getElementById('main'); if(!main) return; App.renderTop();
  const st=main.scrollTop; main.onclick=null; main.onchange=null; main.oninput=null; main.onkeydown=null;
  const f=App.screen==='menu'?App.menu:App.screen==='managers'?App.managers:Sc[App.screen]; try{ f(S,main,App.params||{}); }catch(err){ console.error(err); main.innerHTML='<div class="card"><h2>Ekran yüklenemedi</h2><pre class="muted" style="white-space:pre-wrap">'+U.esc(err.stack||err.message)+'</pre></div>'; }
  if(App.params&&App.params.keep) main.scrollTop=st;
  App.renderNav();
};
/* after a sync from the host (or a guest action on the host): redraw without yanking the user out of what they're doing */
App.refresh=function(){ if(!BM.S||!document.getElementById('main')) return; App.renderTop(); App.renderNav();
  if(BM.MatchView.cur||UI.isOpen()) return; const a=document.activeElement; if(a&&a.closest&&a.closest('#main')&&/INPUT|SELECT|TEXTAREA/.test(a.tagName)) return;
  App.params=Object.assign({},App.params,{keep:1}); App.render(); };
App.enterOnline=function(){ App.slot=null; App.keepBackup=false; const S=BM.S, newer=meta().filter(x=>x.mp===ON.code&&x.day>S.day).sort((a,b)=>b.day-a.day)[0];
  if(newer){ App.keepBackup=true; setTimeout(()=>UI.toast('Dikkat: bu cihazdaki kayıt daha ileride ('+U.fdate(newer.day)+'). Ev sahibinin ligi '+U.fdate(S.day)+' tarihinde. En ileri kaydı olan kişinin ligi açması daha iyi olur.',9000),600); }
  App.shell(); App.go(ON.myTid==null?'managers':'inbox'); };
App.pickTeam=function(){ const S=BM.S; const free=S.teams.filter(t=>!L.isHuman(S,t.id)); const st=ON.status||{humans:[]}; const away=(S.humans||[]).filter(h=>!(st.humans.find(x=>x.cid===h.cid)||{}).online&&h.tid!==S.humans[0].tid);
  const box=UI.modal(`<h2>Takımını seç</h2><p class="muted">${U.esc(ON.hostName||'Ev sahibi')} liginde boş takımlar. Her menajer farklı bir takım yönetir.</p>${away.length?`<h3>Takımına geri dön</h3><p class="dim" style="font-size:13px">Daha önce bu ligde oynadıysan aynı adla takımını geri alabilirsin.</p><div class="teamgrid" style="margin-bottom:12px">${away.map(h=>{ const t=S.teams[h.tid]; return `<div class="teamcard" data-claim="${t.id}">${UI.crest(t)}<div><b>${U.esc(h.name)}</b><div class="dim" style="font-size:12px">${U.esc(t.city+' '+t.name)} · ${t.w}-${t.l}</div></div></div>`; }).join('')}</div><h3>Boş takımlar</h3>`:''}<div class="teamgrid">${free.map(t=>`<div class="teamcard" data-claim="${t.id}">${UI.crest(t)}<div><b>${U.esc(t.city+' '+t.name)}</b><div class="dim" style="font-size:12px">${t.conf==='E'?'Doğu':'Batı'} · ${t.div} · ${t.w}-${t.l} · güç ${Math.round(M.teamStrength(S,t.id)*100)}</div></div></div>`).join('')}</div>
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" data-leave>Vazgeç</button></div>`,{w:980,sticky:true,noX:true});
  box.onclick=e=>{ const c=e.target.closest('[data-claim]'); if(c){ c.style.opacity=.5; ON.claimTeam(+c.dataset.claim).then(r=>{ if(r.err){ UI.toast(U.esc(r.err)); c.style.opacity=1; return; } UI.close(); BM.S.user=r.tid; App.go('inbox'); UI.toast('Hoş geldin! '+U.esc(L.tname(BM.S,r.tid))+' artık senin.'); }); }
    if(e.target.closest('[data-leave]')){ UI.close(); App.welcome(); } };
};

/* ---------- managers & chat (online) ---------- */
App.unreadChat=0;
App.onChat=function(msg){ if(App.screen==='managers'&&!UI.isOpen()){ App.render(); return; } if(msg.name!==ON.me.name||msg.tid!==BM.S.user){ App.unreadChat++; UI.toast('💬 <b>'+U.esc(msg.name)+'</b>: '+U.esc(msg.text),4000); App.renderNav(); } };
App.managers=function(S,root){ App.unreadChat=0;
  const st=ON.status||{humans:(S.humans||[]).map(h=>({tid:h.tid,name:h.name,cid:h.cid,online:false}))};
  const mine=ON.isHost();
  root.innerHTML=`<div class="row sp"><h1>Menajerler</h1>${ON.active()?`<span class="chip">Oyun kodu: <b style="font-size:18px;letter-spacing:2px">${U.esc(ON.code)}</b> <button class="btn sm" data-copy>Kopyala</button></span>`:''}</div>
  ${ON.active()?'':'<div class="card" style="margin-bottom:12px;border-color:var(--warn)">Bu kariyerde başka menajerler var ama şu an çevrimiçi değilsin. Takımları sen ilerlettikçe yardımcı antrenörler yönetir. Ana menüden <b>🌐 Çevrimiçi aç</b> ile arkadaşlarını davet edebilirsin.</div>'}
  <div class="grid g2"><div class="card"><h3>Ligdeki menajerler</h3>${st.humans.map(h=>{ const t=S.teams[h.tid]; return `<div class="asset" style="padding:8px"><span class="row">${UI.crest(t)}<span><b>${U.esc(h.name)}</b>${h.cid===ON.me.cid?' (sen)':''}<br><span class="dim">${U.esc(t.city+' '+t.name)} · ${t.w}-${t.l} · kurul %${Math.round(t.board.conf)}</span></span></span><span class="row">${h.online?h.ready?'<span class="pill g">Hazır</span>':'<span class="pill y">Düşünüyor</span>':'<span class="pill">Çevrimdışı</span>'}${mine&&h.cid!==ON.me.cid?`<button class="btn sm danger" data-rel="${h.tid}" title="Takımı yapay zekâya devret">Ligden çıkar</button>`:''}</span></div>`; }).join('')}
    ${ON.active()?`<p class="muted" style="font-size:13px;margin-top:10px">Kurallar: herkes <b>Devam</b>'a basınca zaman bir sonraki maça ya da önemli bir olaya kadar ilerler. Çevrimdışı menajerlerin takımını yardımcı antrenör yönetir: kadroyu tamamlar, draftta seçer, maçlarını otomatik oynar. </p>${mine?'<div class="row"><button class="btn sm" data-force title="Devam\'a basmayanları beklemeden ilerle">Beklemeden ilerlet</button><span class="dim" style="font-size:12px">Bir arkadaşın uzun süre yanıt vermezse kullan.</span></div>':''}`:''}
    ${ON.isHost()?'<div class="row" style="margin-top:8px"><button class="btn danger" data-close>Odayı kapat</button></div><p class="muted" style="font-size:13px">Lig senin bilgisayarına kaydediliyor; arkadaşlarının bilgisayarında da bir kopyası tutuluyor. Sonraki sefer ana menüdeki <b>Devam et</b> ligi yeniden çevrimiçi açar; arkadaşların kendi kariyer listelerinden katılır.</p>':ON.isGuest()?'<div class="row" style="margin-top:8px"><button class="btn danger" data-quit>Oyundan ayrıl</button></div><p class="muted" style="font-size:13px">Ligin bir kopyası bu cihaza da kaydediliyor. Sonraki sefer ana menüdeki kariyer listesinden <b>Devam et</b> ile aynı takımına dönersin; ev sahibi gelemezse <b>Ev sahibi yoksa sen aç</b> ile ligi sen açabilirsin.</p>':''}</div>
  <div class="card"><h3>Sohbet</h3><div class="pbp" style="height:320px;display:flex;flex-direction:column-reverse">${ON.chat.slice().reverse().map(m=>`<div><b style="color:${m.tid!=null&&S.teams[m.tid]?S.teams[m.tid].c1:'#aaa'}">${U.esc(m.name)}</b> ${U.esc(m.text)}</div>`).join('')||'<div class="dim">Henüz mesaj yok.</div>'}</div>
    ${ON.active()?'<div class="row" style="margin-top:8px"><input type="text" data-chat maxlength="240" placeholder="Mesaj yaz…" style="flex:1"><button class="btn pri" data-send>Gönder</button></div>':''}</div></div>`;
  const sendChat=()=>{ const i=root.querySelector('[data-chat]'); if(!i||!i.value.trim()) return; ON.chatSend(i.value); i.value=''; };
  root.onclick=e=>{ if(e.target.closest('[data-force]')){ ON.force(); UI.toast('Beklemeden ilerleniyor.'); return; } if(e.target.closest('[data-send]')) sendChat(); if(e.target.closest('[data-copy]')){ try{ navigator.clipboard.writeText(ON.code); UI.toast('Kod kopyalandı.'); }catch(err){} }
    const r=e.target.closest('[data-rel]'); if(r) UI.confirm('Bu menajeri ligden çıkar? Takımı yapay zekâya geçer.',()=>Sc.run('releaseHuman',{tid:+r.dataset.rel}),{danger:true,ok:'Çıkar'});
    if(e.target.closest('[data-close]')) UI.confirm('Oda kapatılsın mı? Kariyer kaydın sende kalır; daha sonra yeniden açabilirsin.',()=>{ App.save(); ON.closeRoom(); setTimeout(()=>{ App.shell(); App.go('inbox'); },500); },{ok:'Kapat'});
    if(e.target.closest('[data-quit]')) UI.confirm('Oyundan ayrılmak istiyor musun? Takımın yardımcı antrenöre geçer; aynı kodla geri dönebilirsin.',()=>{ ON.leave(); App.welcome(); },{ok:'Ayrıl'}); };
  root.onkeydown=e=>{ if(e.key==='Enter'&&e.target.dataset.chat!=null) sendChat(); };
};

/* ---------- menu ---------- */
App.menu=function(S,root){
  root.innerHTML=`<h1>Kaydet / Menü</h1><div class="grid g2"><div class="card"><h3>Kayıt</h3>${ON.isGuest()?'<p class="muted" style="font-size:14px">Çevrimiçi oyunda lig ev sahibinin bilgisayarında kaydedilir. Aynı kodla tekrar katılarak takımına dönebilirsin.</p>':`<p class="muted" style="font-size:14px">Oyun her gün ilerlediğinde otomatik kaydedilir (tarayıcı depolaması). Yedek için Veri ekranından kayıt dosyası indirebilirsin.</p><div class="row"><button class="btn pri" data-a="save">Şimdi kaydet</button><button class="btn" data-a="copy">Kopya olarak kaydet</button><button class="btn" data-a="loadf">Kayıt dosyası yükle</button><input type="file" accept=".json" data-file class="hidden"></div>`}</div>
    <div class="card"><h3>Oyun</h3><div class="row" data-q>${!ON.active()?'<button class="btn" data-a="online">🌐 Çevrimiçi aç</button>':''}<button class="btn" data-a="main">Ana menü</button>${ON.isGuest()?'':'<button class="btn danger" data-a="del">Kariyeri sil</button>'}</div><p class="muted" style="font-size:13px;margin-top:10px">Kısayol: <b>Boşluk</b> = Devam. Maçlar sırasında hız, mola, oyuncu değişikliği ve taktik ayarları izleme ekranındadır.</p></div></div>`;
  if(window.KQuit) root.querySelector('[data-q]').appendChild(KQuit.button('btn ghost'));
  root.onclick=e=>{ const b=e.target.closest('[data-a]'); if(!b) return; const a=b.dataset.a;
    if(a==='save'){ App.save(); UI.toast('Kaydedildi.'); }
    if(a==='copy'){ App.slot='c'+Date.now().toString(36); App.save(); UI.toast('Yeni kayıt yuvası oluşturuldu.'); }
    if(a==='loadf') root.querySelector('[data-file]').click();
    if(a==='online'){ App.save(); ON.setName((L.human(S,S.user)||{}).name||ON.me.name); ON.host(S).then(r=>{ if(r&&r.joined){ UI.toast('Bu lig şu an başka bir menajerde açık; ona bağlanıyorsun…',6000); return; } App.save(); App.go('managers'); UI.toast('Çevrimiçi oyun açıldı. Kod: <b>'+r.code+'</b>',7000); }).catch(err=>UI.toast(U.esc(err.message))); }
    if(a==='main'){ App.save(); App.welcome(); }
    if(a==='del') UI.confirm('Bu kariyer kalıcı olarak silinsin mi? Geri alınamaz.',()=>{ App.remove(App.slot); App.welcome(); },{danger:true,ok:'Sil'}); };
  root.onchange=e=>{ if(e.target.dataset.file==null) return; const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ const S2=JSON.parse(r.result); if(!S2.teams||!S2.players) throw new Error('Geçersiz kayıt'); L.migrate(S2); BM.S=S2; App.slot='c'+Date.now().toString(36); BM.Gen.setId(S2.idSeq||1); BM.Engine.clearCache(); App.save(); App.shell(); App.go('inbox'); UI.toast('Kayıt yüklendi.'); }catch(err){ UI.toast('Yüklenemedi: '+U.esc(err.message)); } }; r.readAsText(f); };
};

/* ---------- time (single player; online goes through "ready") ---------- */
const RELEVANT=['contract','trade','board','draft','squad','injury','result'];
const others=S=>L.humans(S).filter(t=>t!==S.user);
function preDay(S,mode){
  if(S.phase==='draft'&&S.draft&&!S.draft.done){ const slot=S.draftOrder[S.draft.idx]; if(slot&&slot.tid!==S.user&&L.isHuman(S,slot.tid)){ ACT.run(S,slot.tid,'draftAuto',{}); return preDay(S,mode); } if(slot&&slot.tid===S.user) return 'draft'; }
  if(S.phase==='camp'&&S.day+1>=U.day(S.season,...R.dates.seasonStart)){ others(S).forEach(t=>ACT.autoFix(S,t)); const n=S.teams[S.user].roster.length; if(n>R.rosterMax||n<R.rosterMin) return 'roster'; }
  const ug=L.userGameToday(S); if(ug&&(mode==='game'||mode==='day')) return 'game';
  return null;
}
App.advance=function(mode){
  const S=BM.S; if(!S||App.busy) return; if(BM.MatchView.cur) return;
  if(ON.active()){ ON.toggleReady('game'); return; }
  const startPhase=S.phase, newsTop=S.news[0]&&S.news[0].id; let days=0;
  const first=preDay(S,mode); if(first){ handleStop(S,first); return; }
  App.busy=true; const long=mode==='phase'||mode==='week'||mode==='month';
  if(long) UI.modal('<h2>Simülasyon</h2><p class="muted" data-prog>Günler oynanıyor…</p>',{noX:true,sticky:true});
  const done=(why)=>{ App.busy=false; if(long) UI.close(); App.save(); App.render(); if(why) handleStop(S,why); else if(S.fired) handleStop(S,'fired'); };
  const chunk=()=>{
    for(let n=0;n<4;n++){
      if(days>0){ const st=preDay(S,long?'auto':mode); if(st){ done(st); return; } }
      L.playDay(S); days++;
      if(S.fired){ done('fired'); return; }
      if(S.phase!==startPhase){ done(); UI.toast(Sc.PHASES[S.phase]+' başladı.'); return; }
      const fresh=[]; for(const n2 of S.news){ if(n2.id===newsTop) break; if(Sc.visible(S,n2)) fresh.push(n2); }
      if(fresh.some(x=>x.stop)){ done(); UI.toast('Karar bekleyen bir mesajın var.'); App.go('inbox',{id:fresh.find(x=>x.stop).id}); return; }
      if(mode==='day'){ done(); return; }
      if(mode==='week'&&days>=7){ done(); return; }
      if(mode==='game'&&S.phase!=='regular'&&(days>=7||fresh.some(x=>RELEVANT.includes(x.type)&&!x.quiet))){ done(); return; }
      if(days>400){ done(); return; }
    }
    const pr=document.querySelector('[data-prog]'); if(pr) pr.textContent=U.fdate(S.day)+' · '+days+' gün';
    setTimeout(chunk,0);
  };
  chunk();
};
function handleStop(S,why){
  if(why==='draft'){ App.go('draft'); UI.toast('Draft\'ta sıra sende!'); return; }
  if(why==='game'){ App.matchDay(); return; }
  if(why==='fired'){ App.fired(); return; }
  if(why==='roster') App.rosterIssue();
}
App.rosterIssue=function(){ const S=BM.S, t=S.teams[S.user], n=t.roster.length;
  if(n>R.rosterMax){ UI.modal(`<h2>Kadro sınırı</h2><p>Sezon yarın başlıyor ve kadronda <b>${n}</b> oyuncu var. En fazla ${R.rosterMax} oyuncu olabilir (Gelişim Ligi'ndekiler dahil). Fazla oyuncuları serbest bırak ya da takas et.</p><div class="row" style="justify-content:flex-end"><button class="btn pri" data-go="squad">Kadroya git</button></div>`,{w:560}); return; }
  if(n>=R.rosterMin) return;
  const need=R.rosterMin-n; const box=UI.modal(`<h2>Kadro eksik</h2><p>Sezon yarın başlıyor; kadronda ${n} oyuncu var, en az ${R.rosterMin} gerekli.</p><div class="row" style="justify-content:flex-end"><button class="btn" data-go="transfer" data-tab="fa">Serbest oyunculara bak</button><button class="btn pri" data-fill>En iyi ${need} serbest oyuncuyu minimumla imzala</button></div>`,{w:560});
  box.querySelector('[data-fill]').onclick=()=>{ UI.close(); Sc.run('fillMin',{},()=>UI.toast('Kadro tamamlandı.')); }; };
App.matchDay=function(){
  const S=BM.S, ug=L.userGameToday(S); if(!ug) return; const H=S.teams[ug.h], A0=S.teams[ug.a], opp=ug.h===S.user?A0:H;
  const ser=ug.po?ug.series:null; const title=ser?`Playoff ${['','1. tur','Konf. yarı final','Konf. final','Final'][ser.round]} · Seri ${S.teams[ser.a].abbr} ${ser.wa}-${ser.wb} ${S.teams[ser.b].abbr}`:'Normal sezon';
  const box=UI.modal(preview(S,ug.h,ug.a,title,opp)+`<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn" data-go="tactics">Taktiği düzenle</button><button class="btn" data-quick>Sonucu al</button><button class="btn pri" data-watch>▶ 2D izle</button></div>`,{w:760});
  box.querySelector('[data-watch]').onclick=()=>{ UI.close(); BM.MatchView.open(S,ug.h,ug.a,{title,onDone:g=>{ App.playUserDay(g); }}); };
  box.querySelector('[data-quick]').onclick=()=>{ UI.close(); App.playUserDay(null); };
};
function preview(S,h,a,title,opp){ const H=S.teams[h], A0=S.teams[a];
  const key=t=>t.roster.map(id=>S.players[id]).filter(p=>!p.gl).sort((x,y)=>y.ovr-x.ovr).slice(0,3).map(p=>`${UI.pl(p)} <span class="dim">${p.pos} ${p.ovr}</span>${UI.injury(p)}`).join('<br>');
  const inj=S.teams[S.user].roster.map(id=>S.players[id]).filter(p=>p.inj&&p.inj.days>0);
  return `<h2>Maç günü · ${U.fdate(S.day)}</h2><p class="muted" style="margin-top:-6px">${U.esc(title)}</p>
    <div class="score" style="margin:10px 0"><span class="row">${UI.crest(H,46)}<span class="tm">${U.esc(H.city)}<br><b style="color:var(--ink)">${U.esc(H.name)}</b> ${H.w}-${H.l}${Sc.mgr(S,h)}</span></span><span class="dim">vs</span><span class="row"><span class="tm" style="text-align:right">${U.esc(A0.city)}<br><b style="color:var(--ink)">${U.esc(A0.name)}</b> ${A0.w}-${A0.l}${Sc.mgr(S,a)}</span>${UI.crest(A0,46)}</span></div>
    <div class="grid g2"><div class="card tight"><h3>${H.abbr} öne çıkanlar</h3>${key(H)}</div><div class="card tight"><h3>${A0.abbr} öne çıkanlar</h3>${key(A0)}</div></div>
    ${inj.length?`<p class="warn" style="font-size:13px">Sakat: ${inj.map(p=>U.esc(p.name)+' ('+p.inj.days+'g)').join(', ')}</p>`:''}
    ${opp?`<p class="muted" style="font-size:13px">Rakip savunması: <b>${BM.Tactics.getDef(opp.tac.def,S).name}</b> · Tempo ${opp.tac.pace>1?'hızlı':opp.tac.pace<1?'yavaş':'normal'}</p>`:''}`; }
function resultModal(S,b){ if(!b) return; const home=b.h===S.user, my=home?b.hs:b.as, op=home?b.as:b.hs, won=my>op, opp=S.teams[home?b.a:b.h];
  const top=(b.players[home?0:1]||[]).slice().sort((x,y)=>y[2]-x[2]).slice(0,3).map(r=>{ const p=S.players[r[0]]; return p?U.esc(p.name)+' '+r[2]+' sy':''; }).join(', ');
  const box=UI.modal(`<h2 class="${won?'good':'bad'}">${won?'Galibiyet':'Mağlubiyet'} · ${my}-${op}</h2><p>${home?'vs':'@'} ${U.esc(opp.city+' '+opp.name)}</p><p class="muted">Öne çıkanlar: ${top}</p><div class="row" style="justify-content:flex-end"><button class="btn" data-bx>Kutu skor</button><button class="btn pri" data-close>Tamam</button></div>`,{w:520});
  box.querySelector('[data-bx]').onclick=()=>Sc.boxModal(S,b); }
App.playUserDay=function(eg){
  const S=BM.S; const before=S.phase; L.playDay(S,eg?{userGame:eg}:{}); App.save(); App.render();
  const b=S.boxes[0]; if(b&&(b.h===S.user||b.a===S.user)){ if(!eg) resultModal(S,b); else { const home=b.h===S.user, my=home?b.hs:b.as, op=home?b.as:b.hs; UI.toast((my>op?'Galibiyet ':'Mağlubiyet ')+my+'-'+op); } }
  if(S.phase!==before) UI.toast(Sc.PHASES[S.phase]+' başladı.');
  if(S.fired) App.fired();
};

/* ---------- online match day ---------- */
App.onMatchday=function(info){ App.renderTop(); if(!info) return; if(BM.MatchView.cur) return; App.matchdayModal(); };
App.matchdayModal=function(){ const S=BM.S, info=ON.mdInfo; if(!info||!S) return; if(BM.MatchView.cur) return;
  const my=info.ses.find(s=>s.humans.includes(S.user));
  const row=s=>{ const H=S.teams[s.h], A0=S.teams[s.a], mine=s.humans.includes(S.user), ch=s.choice[S.user];
    const status=s.done?`<b>${s.sc[0]}-${s.sc[1]}</b> · bitti`:s.live?`<b>${s.sc[0]}-${s.sc[1]}</b> · ${s.q<=4?s.q+'Ç':'UZ'} · canlı${s.watch&&s.watch.length?' (izleyen: '+s.watch.map(t=>U.esc((L.human(S,t)||{}).name||'')).join(', ')+')':''}`:'karar bekleniyor';
    const btns=mine&&!s.done?(!ch?`<button class="btn pri" data-w="${s.key}">▶ 2D izle</button><button class="btn" data-qk="${s.key}">Sonucu al</button>`:ch==='watch'&&s.live?`<button class="btn pri" data-w="${s.key}">İzlemeye dön</button>`:`<span class="dim">${ch==='quick'?'sonuç bekleniyor':'rakip bekleniyor'}</span>`):(s.live&&!s.done?`<button class="btn sm" data-sp="${s.key}">👁 Seyret</button>`:'');
    return `<div class="asset" style="padding:10px"><span class="row">${UI.crest(H,30)} <b>${H.abbr}</b>${Sc.mgr(S,s.h)} <span class="dim">vs</span> ${UI.crest(A0,30)} <b>${A0.abbr}</b>${Sc.mgr(S,s.a)} <span class="dim" style="font-size:12px">${U.esc(s.title)}</span></span><span class="row">${status} ${btns}</span></div>`; };
  const html=`${my?preview(S,my.h,my.a,my.title,S.teams[my.h===S.user?my.a:my.h]):'<h2>Maç günü · '+U.fdate(S.day)+'</h2>'}<h3 style="margin-top:12px">Menajerlerin bugünkü maçları</h3>${info.ses.map(row).join('')}
    <p class="muted" style="font-size:13px">Tüm menajer maçları bitince gün tamamlanır. İzlediğin maçta hız, mola ve oyuncu değişikliği senin elinde; iki menajer karşılaşırsa maç ikinizin ekranında aynı anda ilerler.</p>
    <div class="row" style="justify-content:flex-end">${ON.isHost()&&info.ses.some(s=>!s.live&&!s.done)?'<button class="btn sm ghost" data-mforce title="Karar vermeyenlerin maçı otomatik oynansın">Bekleyenler için sonucu al</button>':''}<button class="btn" data-go="tactics">Taktiğe bak</button><button class="btn ghost" data-close>Kapat</button></div>`;
  let box=document.querySelector('.modal .box[data-mdbox]'); if(box) box.innerHTML='<button class="btn sm ghost" data-close style="float:right">✕</button>'+html; else { box=UI.modal(html,{w:860}); box.setAttribute('data-mdbox',''); }
  box.onclick=e=>{ const w=e.target.closest('[data-w]'), q=e.target.closest('[data-qk]'), sp=e.target.closest('[data-sp]'); if(e.target.closest('[data-mforce]')){ ON.mdForce(); return; }
    if(w){ const s=info.ses.find(x=>x.key===w.dataset.w); ON.choose(s.key,'watch'); UI.close(); openLive(s,'player'); }
    if(q){ ON.choose(q.dataset.qk,'quick'); UI.toast('Sonuç, diğer maçlar bitince gelecek.'); }
    if(sp){ const s=info.ses.find(x=>x.key===sp.dataset.sp); UI.close(); openLive(s,'spec'); } };
};
function openLive(s,role){ const S=BM.S; const userK=role==='spec'?null:(s.h===S.user?'h':s.a===S.user?'a':null);
  const feed=ON.feed(s.key,s.h,s.a,role);
  BM.MatchView.open(S,s.h,s.a,{feed,userK,title:s.title+(role==='spec'?' · seyirci':''),closable:role==='spec',onDone:()=>{ if(ON.mdInfo) setTimeout(App.matchdayModal,50); }}); }
App.onMatchdayEnd=function(res){ const S=BM.S; if(document.querySelector('.modal .box[data-mdbox]')) UI.close(); App.refresh();
  const r=(res||[]).find(x=>x.h===S.user||x.a===S.user); if(!r) return; const b=S.boxes.find(x=>(x.h===r.h&&x.a===r.a)&&x.day===S.day-1)||S.boxes.find(x=>x.h===S.user||x.a===S.user);
  if(BM.MatchView.cur){ const my=r.h===S.user?r.hs:r.as, op=r.h===S.user?r.as:r.hs; UI.toast((my>op?'Galibiyet ':'Mağlubiyet ')+my+'-'+op); return; } resultModal(S,b); };

App.fired=function(){
  const S=BM.S; const offers=ACT.jobOffers(S,S.user);
  const box=UI.modal(`<h2 class="bad">Görevden alındın</h2><p>Yönetim kurulu güvenini kaybetti. Ama ligde seni isteyen kulüpler var:</p>${offers.map(t=>`<div class="asset" style="padding:8px"><span class="row">${UI.crest(t)} <b>${U.esc(t.city+' '+t.name)}</b> <span class="dim">${t.w}-${t.l} · ${t.board.goal}</span></span><button class="btn pri" data-job="${t.id}">Kabul et</button></div>`).join('')}<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn danger" data-end>Kariyeri bitir</button></div>`,{w:640,sticky:true,noX:true});
  box.onclick=e=>{ const j=e.target.closest('[data-job]'); if(j){ App.act('takeJob',{tid:+j.dataset.job}).then(r=>{ if(r.err){ UI.toast(U.esc(r.err)); return; } if(!ON.isGuest()) S.user=r.newTid; S.fired=false; App.trade=null; UI.close(); App.save(); App.go('inbox'); }); }
    if(e.target.closest('[data-end]')){ UI.close(); if(App.multi()&&(S.humans||[]).length>1){ App.act('quitCareer',{}).then(()=>{ if(ON.active()) ON.leave(); App.welcome(); }); } else { App.remove(App.slot); App.welcome(); } } };
};
/* a fired manager notices on their next screen */
setInterval(()=>{ const S=BM.S; if(!S||UI.isOpen()||BM.MatchView.cur) return; const h=L.human(S,S.user); if(h&&h.fired) App.fired(); },2000);

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
  if(e.key==='Escape'&&UI.isOpen()&&!document.querySelector('.modal .box [data-yes]')&&!document.querySelector('.modal .box[data-sticky]')) UI.close();
});
window.addEventListener('beforeunload',()=>{ if(BM.S) App.save(); });
App.welcome();
})();
