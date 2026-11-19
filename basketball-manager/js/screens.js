/* BasketballManager — screens: inbox, squad, rotation, G-League, tactics (set + defence designer), schedule,
   standings, playoffs, transfers (free agency + negotiation, trade centre), contracts, draft, league, club, data.
   Screens never change the league directly: they call App.act(), which runs an action locally or sends it to the online host. */
(function(){
'use strict';
const BM=window.BM, U=BM.U, R=BM.RULES, UI=BM.UI;
const C=BM.Cap, L=BM.League, M=BM.Market, T=BM.Tactics, G=BM.Gen;
const Sc = BM.Screens = {};
const A=()=>BM.App;
const P=(S,id)=>S.players[id];
const tabs=(scr,cur,list)=>`<div class="tabs">${list.map(([k,l])=>`<button data-go="${scr}" data-tab="${k}" class="${cur===k?'on':''}">${l}</button>`).join('')}</div>`;
const stat=(p,S,key)=>p.stats[key==null?S.season:key];
const roleName=r=>M.ROLES[r]||'—';
const PHASES={predraft:'Draft öncesi',fa:'Serbest oyuncu dönemi',camp:'Hazırlık kampı',regular:'Normal sezon',playoffs:'Playoff',draft:'Draft',post:'Sezon arası'};
Sc.PHASES=PHASES;
/* run an action, toast its error, re-render */
const run=(type,p,ok)=>A().act(type,p).then(r=>{ r=r||{}; if(r.err) UI.toast(U.esc(r.err)); else if(ok) ok(r); A().render(); return r; });
Sc.run=run;
const mgr=(S,tid)=>{ const h=L.human(S,tid); return h&&(S.humans||[]).length>1?` <span class="pill b" title="Menajer">👤 ${U.esc(h.name)}</span>`:''; };
Sc.mgr=mgr;
Sc.visible=(S,n)=>(n.to==null||n.to===S.user)&&!(n.not&&n.not.includes(S.user));
Sc.myNews=S=>S.news.filter(n=>Sc.visible(S,n));
Sc.unread=S=>Sc.myNews(S).filter(n=>!n.quiet&&!A().isRead(n)).length;
Sc.myOffers=S=>S.tradeOffers.filter(x=>x.to==null||x.to===S.user);

/* =================== INBOX =================== */
Sc.inbox=function(S,root,o){
  const list=Sc.myNews(S); let cur=list.find(n=>n.id===o.id)||list.find(n=>!n.quiet&&!A().isRead(n))||list[0];
  if(cur) A().markRead(cur);
  const icon={board:'🏛',league:'🏀',contract:'✍',trade:'🔁',injury:'✚',draft:'🎓',result:'🏆',finance:'💰',squad:'👥',info:'ℹ',chat:'💬'};
  root.innerHTML=`<h1>Gelen kutusu</h1><div class="inbox"><div class="card tight" style="padding:0;max-height:76vh;overflow:auto">${list.map(n=>`<div class="msg${A().isRead(n)||n.quiet?'':' unread'}${cur&&n.id===cur.id?' on':''}" data-go="inbox" data-id="${n.id}"><div class="t">${icon[n.type]||'•'} ${U.esc(n.title)}</div><div class="d">${U.fdate(n.day)}${n.to==null?' · lig':''}</div></div>`).join('')||'<p class="muted" style="padding:12px">Mesaj yok.</p>'}</div>
    <div class="card">${cur?`<div class="row sp"><h2 style="margin:0">${U.esc(cur.title)}</h2><span class="muted">${U.fdate(cur.day)}</span></div><div style="margin-top:8px">${cur.body}</div><div data-act style="margin-top:12px"></div>`:'<p class="muted">Seçili mesaj yok.</p>'}</div></div>`;
  if(!cur) return;
  const act=root.querySelector('[data-act]');
  if(cur.offer){ const of=Sc.myOffers(S).find(x=>x.id===cur.offer);
    if(!of) act.innerHTML='<p class="dim">Bu teklif artık geçerli değil.</p>';
    else { act.innerHTML=offerCard(S,of,true);
      act.onclick=e=>{ const b=e.target.closest('[data-x]'); if(b) offerAct(S,of,b.dataset.x,()=>A().go('inbox',{id:cur.id})); }; }
  }
  if(cur.rfa){ const p=P(S,cur.rfa);
    if(!p||!p.pendingMatch||p.rights!==S.user) act.innerHTML='<p class="dim">Bu karar artık verildi.</p>';
    else { act.innerHTML=`<div class="row"><button class="btn pri" data-a="m1">Eşleştir (${U.money(p.pendingMatch.salary)} × ${p.pendingMatch.years})</button><button class="btn danger" data-a="m0">Bırak gitsin</button></div>`;
      act.onclick=e=>{ const b=e.target.closest('[data-a]'); if(b) run('rfa',{pid:p.id,match:b.dataset.a==='m1'}); }; }
  }
};
function offerCard(S,of,withButtons){ const d=of.deal, nm=a=>U.esc(M.assetName(S,a)), sal=a=>a.pid!=null&&P(S,a.pid)?U.money(C.salary(P(S,a.pid),S.season)):'';
  const who=of.human?`${U.esc((L.human(S,of.by)||{}).name||'Menajer')} · ${U.esc(L.tname(S,of.by))}`:U.esc(L.tname(S,d.tid));
  return `<div class="offer" style="margin-bottom:10px"><div class="row sp"><b>${who}${of.human?' <span class="pill b">menajer</span>':''}</b><span class="dim">${U.fdate(of.day)}</span></div>${of.note?`<p class="muted" style="margin:4px 0">"${U.esc(of.note)}"</p>`:''}
    <div class="split"><div><b>Sen verirsin</b>${d.give.map(a=>`<div class="asset"><span>${nm(a)}</span><span class="dim">${sal(a)}</span></div>`).join('')||'<div class="dim">—</div>'}</div><div><b>Sen alırsın</b>${d.get.map(a=>`<div class="asset"><span>${nm(a)}</span><span class="dim">${sal(a)}</span></div>`).join('')||'<div class="dim">—</div>'}</div></div>
    ${withButtons?`<div class="row" style="margin-top:10px"><button class="btn pri" data-x="acc">Kabul et</button><button class="btn" data-x="look">Takas ekranında incele</button><button class="btn danger" data-x="rej">Reddet</button></div>`:''}</div>`; }
function offerAct(S,of,x,after){ const d=of.deal;
  if(x==='look'){ A().trade={tid:d.tid,give:d.give.slice(),get:d.get.slice()}; A().go('transfer',{tab:'trade'}); return; }
  if(x==='acc'){ const err=BM.Actions.validDeal(S,S.user,Object.assign({},d,{from:S.user})); if(err){ UI.toast(U.esc(err)); return; } A().act('offerAccept',{id:of.id}).then(r=>{ if(r.err) UI.toast(U.esc(r.err)); else { UI.toast('Takas tamamlandı.'); A().go('squad'); } }); return; }
  if(x==='rej') A().act('offerReject',{id:of.id}).then(()=>after&&after());
}

/* =================== SQUAD =================== */
Sc.squad=function(S,root,o){
  const tab=o.tab||'list', t=S.teams[S.user];
  let html=`<div class="row sp"><h1>${U.esc(t.city+' '+t.name)} · Kadro</h1><span class="muted">${t.roster.length}/${C.rosterLimit(S)} oyuncu · bordro ${U.money(C.payroll(S,S.user))}</span></div>`+tabs('squad',tab,[['list','Oyuncular'],['rot','Rotasyon ve süreler'],['gl','Gelişim Ligi'],['stats','İstatistik']]);
  const ps=t.roster.map(id=>P(S,id));
  if(tab==='list'){
    html+=UI.table([
      {k:'num',l:'#',n:1},{k:'name',l:'Oyuncu',f:p=>`${UI.pl(p)} ${UI.injury(p)}${p.gl?' <span class="pill y">GL</span>':''}${p.wantsOut?' <span class="pill r">transfer istiyor</span>':''}${p.pendingStart?' <span class="pill b">yeni çaylak</span>':''}`},
      {k:'pos',l:'Poz'},{k:'age',l:'Yaş',n:1},{k:'ovr',l:'Güç',n:1,f:p=>UI.ovr(p.ovr)},{k:'pot',l:'Pot.',n:1},
      {k:'sal',l:'Maaş',n:1,v:p=>C.salary(p,S.season),f:p=>U.money(C.salary(p,S.season))},{k:'exp',l:'Bitiş',n:1,v:p=>C.expires(p),f:p=>U.seasonName(C.expires(p))},
      {k:'mood',l:'Moral',n:1,f:p=>UI.moodTxt(p.mood)},{k:'prom',l:'Rol sözü',f:p=>p.prom?roleName(p.prom):'<span class="dim">—</span>'},
      {k:'pts',l:'SY',n:1,v:p=>{ const s=stat(p,S); return s&&s.gp?s.pts/s.gp:0; },f:p=>UI.pg(stat(p,S),'pts')},
      {k:'reb',l:'RB',n:1,v:p=>{ const s=stat(p,S); return s&&s.gp?(s.orb+s.drb)/s.gp:0; },f:p=>{ const s=stat(p,S); return s&&s.gp?((s.orb+s.drb)/s.gp).toFixed(1):'-'; }},
      {k:'ast',l:'AS',n:1,v:p=>{ const s=stat(p,S); return s&&s.gp?s.ast/s.gp:0; },f:p=>UI.pg(stat(p,S),'ast')},
      {k:'min',l:'DK',n:1,v:p=>{ const s=stat(p,S); return s&&s.gp?s.sec/s.gp:0; },f:p=>{ const s=stat(p,S); return s&&s.gp?(s.sec/60/s.gp).toFixed(1):'-'; }}
    ],ps,{id:'squad',sort:'ovr',desc:true,pid:p=>p.id});
    html+=`<p class="dim" style="font-size:13px">Oyuncuya tıkla: profil, sözleşme uzatma, serbest bırakma, Gelişim Ligi'ne gönderme. Kadro sınırı: sezon içinde ${R.rosterMin}-${R.rosterMax}, sezon arasında en fazla ${R.offseasonMax}.</p>`;
    root.innerHTML=html; return;
  }
  if(tab==='rot'){
    if(!t.rot) G.autoRotation(t,S);
    const rot=JSON.parse(JSON.stringify(t.rot));
    const order=rot.order.filter(id=>t.roster.includes(id)&&!P(S,id).gl); t.roster.forEach(id=>{ const p=P(S,id); if(!p.gl&&!order.includes(id)) order.push(id); }); rot.order=order;
    const tot=order.reduce((a,id)=>a+(+rot.mins[id]||0),0);
    html+=`<div class="card"><div class="row sp"><div><b>Rotasyon</b> <span class="muted">İlk beş = ilk 5 sıra. Dakikalar maçta hedef süredir; motor yorgunluk ve faul durumuna göre sapar.</span></div>
      <div class="row"><span class="${Math.abs(tot-240)>10?'warn':'good'}" data-tot>Toplam ${tot} / 240 dk</span><label class="row" style="gap:5px"><input type="checkbox" data-a="auto" ${rot.auto?'checked':''}> Otomatik (yardımcı antrenör)</label><button class="btn sm" data-a="reset">Önerilen rotasyon</button></div></div>
      <table style="margin-top:8px"><tr><th>Sıra</th><th>Oyuncu</th><th>Poz</th><th class="n">Güç</th><th class="n">Dayanıklılık</th><th>Dakika</th><th></th></tr>${order.map((id,i)=>{ const p=P(S,id); return `<tr${i<5?' class="me"':''}><td>${i<5?'<span class="pill o">İlk 5</span>':i+1}</td><td>${UI.pl(p)} ${UI.injury(p)}</td><td>${p.pos}</td><td class="n">${p.ovr}</td><td class="n">${UI.attr(p.r.sta)}</td>
        <td><input type="range" min="0" max="44" value="${rot.mins[id]||0}" data-min="${id}" ${rot.auto?'disabled':''}> <b data-mv="${id}">${rot.mins[id]||0}</b></td><td><button class="btn sm" data-a="up" data-id="${id}" ${rot.auto||!i?'disabled':''}>▲</button><button class="btn sm" data-a="dn" data-id="${id}" ${rot.auto||i===order.length-1?'disabled':''}>▼</button></td></tr>`; }).join('')}</table></div>`;
    root.innerHTML=html;
    const push=r=>{ t.rot=r; return run('rotation',{rot:r}); };
    root.oninput=e=>{ const id=e.target.dataset.min; if(!id) return; rot.mins[id]=+e.target.value; root.querySelector(`[data-mv="${id}"]`).textContent=e.target.value; const s=order.reduce((a,x)=>a+(+rot.mins[x]||0),0); const el=root.querySelector('[data-tot]'); el.textContent='Toplam '+s+' / 240 dk'; el.className=Math.abs(s-240)>10?'warn':'good'; };
    root.onchange=e=>{ if(e.target.dataset.min){ rot.auto=false; push(rot); } if(e.target.dataset.a==='auto'){ rot.auto=e.target.checked; push(rot); } };
    root.onclick=e=>{ const b=e.target.closest('button[data-a]'); if(!b) return; const id=+b.dataset.id, i=rot.order.indexOf(id);
      if(b.dataset.a==='reset'){ G.autoRotation(t,S); const r=JSON.parse(JSON.stringify(t.rot)); r.auto=false; push(r); return; }
      if(b.dataset.a==='up'&&i>0) [rot.order[i-1],rot.order[i]]=[rot.order[i],rot.order[i-1]];
      if(b.dataset.a==='dn'&&i<rot.order.length-1) [rot.order[i+1],rot.order[i]]=[rot.order[i],rot.order[i+1]];
      rot.auto=false; push(rot); };
    return;
  }
  if(tab==='gl'){
    const gl=ps.filter(p=>p.gl), elig=ps.filter(p=>!p.gl&&p.exp<=3);
    html+=`<div class="grid g2"><div class="card"><h3>${U.esc(t.glName)} (Gelişim Ligi)</h3><p class="muted" style="font-size:13px">Gönderilen oyuncular NBA maçlarında oynamaz ama düzenli süre aldıkları için daha hızlı gelişir. En fazla ${R.glMax} oyuncu, ilk 3 sezonundaki oyuncular gönderilebilir. Kadro sayısına dahildirler.</p>
      ${gl.length?gl.map(p=>`<div class="asset"><span>${UI.pl(p)} · ${p.pos} · ${p.age} yaş · ${UI.ovr(p.ovr)} → pot. ${p.pot}</span><span>${p.glDays||0} gün <button class="btn sm" data-a="recall" data-id="${p.id}">Geri çağır</button></span></div>`).join(''):'<p class="dim">Şu an Gelişim Ligi\'nde oyuncun yok.</p>'}</div>
      <div class="card"><h3>Gönderilebilir</h3>${elig.length?elig.map(p=>`<div class="asset"><span>${UI.pl(p)} · ${p.pos} · ${p.age} yaş · ${UI.ovr(p.ovr)} → pot. ${p.pot}</span><button class="btn sm" data-a="send" data-id="${p.id}" ${gl.length>=R.glMax?'disabled':''}>Gönder</button></div>`).join(''):'<p class="dim">Uygun oyuncu yok.</p>'}</div></div>`;
    root.innerHTML=html;
    root.onclick=e=>{ const b=e.target.closest('button[data-a]'); if(b) run('gl',{pid:+b.dataset.id,on:b.dataset.a==='send'}); };
    return;
  }
  const key=o.po?S.season+'p':S.season;
  html+=`<div class="row" style="margin-bottom:8px"><button class="btn sm${o.po?'':' tool on'}" data-go="squad" data-tab="stats">Normal sezon</button><button class="btn sm${o.po?' tool on':''}" data-go="squad" data-tab="stats" data-po="1">Playoff</button></div>`;
  html+=statTable(S,ps.filter(p=>p.stats[key]&&p.stats[key].gp),key,'sqst');
  root.innerHTML=html;
};
function statTable(S,rows,key,id,extra){
  const s=p=>p.stats[key];
  const pg=k=>({k,l:k.toUpperCase(),n:1,v:p=>s(p)[k]/s(p).gp,f:p=>(s(p)[k]/s(p).gp).toFixed(1)});
  return UI.table([{k:'name',l:'Oyuncu',f:p=>UI.pl(p)},...(extra||[]),{k:'gp',l:'M',n:1,v:p=>s(p).gp,f:p=>s(p).gp},{k:'gs',l:'İ5',n:1,v:p=>s(p).gs,f:p=>s(p).gs},
    {k:'min',l:'DK',n:1,v:p=>s(p).sec/s(p).gp,f:p=>(s(p).sec/60/s(p).gp).toFixed(1)},Object.assign(pg('pts'),{l:'SY'}),
    {k:'reb',l:'RB',n:1,v:p=>(s(p).orb+s(p).drb)/s(p).gp,f:p=>((s(p).orb+s(p).drb)/s(p).gp).toFixed(1)},Object.assign(pg('ast'),{l:'AS'}),Object.assign(pg('stl'),{l:'TÇ'}),Object.assign(pg('blk'),{l:'BL'}),Object.assign(pg('tov'),{l:'TK'}),
    {k:'fg',l:'SA%',n:1,v:p=>s(p).fgm/(s(p).fga||1),f:p=>UI.pct(s(p).fgm,s(p).fga)},{k:'tp',l:'3S%',n:1,v:p=>s(p).tpm/(s(p).tpa||1),f:p=>UI.pct(s(p).tpm,s(p).tpa)},{k:'ft',l:'SB%',n:1,v:p=>s(p).ftm/(s(p).fta||1),f:p=>UI.pct(s(p).ftm,s(p).fta)},
    {k:'pm',l:'+/-',n:1,v:p=>s(p).pm/s(p).gp,f:p=>(s(p).pm/s(p).gp).toFixed(1)}],rows,{id,sort:'pts',desc:true,pid:p=>p.id});
}
Sc.statTable=statTable;

/* =================== PLAYER PROFILE (modal) =================== */
Sc.player=function(pid){
  const S=BM.S, p=P(S,pid); if(!p){ UI.toast('Oyuncu bulunamadı (emekli olmuş olabilir).'); return; }
  const t=S.teams[p.tid], mine=p.tid===S.user, prospect=p.tid===-2;
  const sv=prospect?L.scoutVal(S,p,S.user):null, acc=prospect?L.scoutAcc(S,p,S.user):1;
  const groups={}; BM.ATTR.forEach(([k,l,gp])=>{ (groups[gp]=groups[gp]||[]).push([k,l]); });
  const seasons=Object.keys(p.stats).sort();
  const yrs=p.contract?p.contract.amt.map((a,i)=>`<span class="chip">${U.seasonName(p.contract.start+i)}: <b>${U.money(a)}</b></span>`).join(' '):'<span class="dim">Sözleşmesi yok</span>';
  const draft=p.draft?`${p.draft.year} draftı, ${p.draft.rnd}. tur ${p.draft.pick}. sıra (${S.teams[p.draft.tid]?S.teams[p.draft.tid].abbr:'?'})`:'Draft edilmedi';
  const box=UI.modal(`<div class="prof">${t?UI.crest(t,54):'<span class="crest" style="width:54px;height:54px;background:#333">SO</span>'}
    <div><h1 style="margin:0">${U.esc(p.name)} <span class="muted" style="font-size:18px">#${p.num}</span></h1>
      <div class="muted">${BM.POSNAME[p.pos]} · ${p.age} yaş · ${p.hgt} cm · ${p.wgt} kg · ${U.esc(p.college)} · ${t?U.esc(t.city+' '+t.name):prospect?'Draft adayı '+p.draftYear:'Serbest oyuncu'}${t?mgr(S,t.id):''}</div>
      <div class="row" style="margin-top:6px">${UI.injury(p)}${p.gl?'<span class="pill y">Gelişim Ligi</span>':''}${p.rights!=null&&p.tid===-1&&S.teams[p.rights]?`<span class="pill b">Haklar: ${S.teams[p.rights].abbr}${p.rfa?' (kısıtlı)':''}</span>`:''}<span class="chip">Moral: ${UI.moodTxt(p.mood)}</span>${p.prom?`<span class="chip">Söz verilen rol: ${roleName(p.prom)}</span>`:''}<span class="chip">Bird: ${p.bird||0} yıl</span></div></div>
    <div style="text-align:center">${prospect?`<div class="muted" style="font-size:12px">Gözlem (%${Math.round(acc*100)})</div><div class="big">${sv.ovr}<span class="muted" style="font-size:15px"> ±${sv.range}</span></div><div class="muted">pot. ~${sv.pot}</div>`:`${UI.ovr(p.ovr)}<div class="muted" style="font-size:12px;margin-top:4px">Potansiyel</div><b>${p.pot}</b>`}</div></div>
    <div class="grid g2" style="margin-top:12px"><div class="card tight"><h3>Özellikler</h3>${prospect?'<p class="muted">Gözlemcin netleştikçe değerler belirginleşir.</p>':''}${Object.entries(groups).map(([gp,ks])=>`<div style="margin-bottom:6px"><b style="font-size:12px;color:var(--muted);text-transform:uppercase">${gp}</b><div class="attrs">${ks.map(([k,l])=>`<div><span>${l}</span>${prospect?UI.attr(U.clamp(Math.round(p.r[k]+((p.id*7+k.charCodeAt(0))%9-4)*(1-acc)),1,20)):UI.attr(p.r[k])}</div>`).join('')}</div></div>`).join('')}</div>
      <div class="card tight"><h3>Sözleşme</h3><div class="row">${yrs}</div><p class="muted" style="font-size:13px">${draft}${p.contract&&p.contract.rookie?' · çaylak ölçeği':''}</p>
        <h3>Gelişim</h3>${UI.spark((p.ovrHist||[]).concat([[S.season,p.ovr]]))}
        <div class="row" data-acts style="margin-top:10px"></div></div></div>
    <div class="card tight" style="margin-top:12px"><h3>Kariyer istatistikleri</h3>${seasons.length?`<div class="tw" style="max-height:260px"><table><tr><th>Sezon</th><th>Takım</th><th class="n">M</th><th class="n">DK</th><th class="n">SY</th><th class="n">RB</th><th class="n">AS</th><th class="n">TÇ</th><th class="n">BL</th><th class="n">SA%</th><th class="n">3S%</th><th class="n">SB%</th></tr>${seasons.map(k=>{ const s=p.stats[k]; const po=String(k).endsWith('p'); return `<tr><td>${U.seasonName(parseInt(k))}${po?' <span class="pill o">PO</span>':''}</td><td>${S.teams[s.tid]?S.teams[s.tid].abbr:'-'}</td><td class="n">${s.gp}</td><td class="n">${(s.sec/60/s.gp).toFixed(1)}</td><td class="n">${(s.pts/s.gp).toFixed(1)}</td><td class="n">${((s.orb+s.drb)/s.gp).toFixed(1)}</td><td class="n">${(s.ast/s.gp).toFixed(1)}</td><td class="n">${(s.stl/s.gp).toFixed(1)}</td><td class="n">${(s.blk/s.gp).toFixed(1)}</td><td class="n">${UI.pct(s.fgm,s.fga)}</td><td class="n">${UI.pct(s.tpm,s.tpa)}</td><td class="n">${UI.pct(s.ftm,s.fta)}</td></tr>`; }).join('')}</table></div>`:'<p class="dim">Henüz NBA maçı yok.</p>'}</div>`,{w:1000});
  const acts=box.querySelector('[data-acts]'); const btn=(a,l,cls)=>`<button class="btn sm ${cls||''}" data-a="${a}">${l}</button>`;
  let h='';
  if(mine){ if(C.yearsLeft(p,S)<=1&&!p.pendingStart) h+=btn('ext','Sözleşme uzat','pri'); if(p.exp<=3) h+=btn(p.gl?'recall':'gl',p.gl?'Gelişim Ligi\'nden çağır':'Gelişim Ligi\'ne gönder'); h+=btn('rel','Serbest bırak','danger'); }
  else if(p.tid>=0) h+=btn('trade',L.isHuman(S,p.tid)?'Menajere takas teklifi hazırla':'Takas teklifi hazırla','pri');
  else if(p.tid===-1) h+=btn('neg','Pazarlık yap','pri');
  else if(prospect) h+=btn('scout','Gözlemci gönder ('+L.scoutPts(S,S.user)+' puan)','pri');
  if(S.editor&&A().canEdit()) h+=btn('edit','✎ Düzenle');
  acts.innerHTML=h;
  acts.onclick=e=>{ const b=e.target.closest('[data-a]'); if(!b) return; const a=b.dataset.a;
    if(a==='ext'){ UI.close(); Sc.negotiate(p.id,true); }
    if(a==='neg'){ UI.close(); Sc.negotiate(p.id,false); }
    if(a==='gl'||a==='recall'){ UI.close(); run('gl',{pid:p.id,on:a==='gl'}); }
    if(a==='rel'){ const dead=[]; for(let y=S.season;y<=C.expires(p);y++){ const v=C.salary(p,y); if(v) dead.push(U.seasonName(y)+': '+U.money(v)); }
      UI.confirm(`<p>${U.esc(p.name)} serbest bırakılsın mı?</p><p class="muted">Kalan garantili maaş ölü para olarak bordronda kalır:<br>${dead.join('<br>')||'yok'}</p>`,()=>run('release',{pid:p.id}),{danger:true,ok:'Serbest bırak'}); }
    if(a==='trade'){ UI.close(); A().trade={tid:p.tid,give:[],get:[{pid:p.id}]}; A().go('transfer',{tab:'trade'}); }
    if(a==='scout'){ A().act('scout',{pid:p.id}).then(r=>{ if(r.err){ UI.toast(U.esc(r.err)); return; } UI.close(); Sc.player(p.id); A().render(); }); }
    if(a==='edit'){ UI.close(); Sc.editPlayer(p.id); } };
};
Sc.editPlayer=function(pid){
  const S=BM.S, p=P(S,pid);
  const box=UI.modal(`<h2>Oyuncu düzenle (editör)</h2><div class="row"><label>Ad <input type="text" data-f="name" value="${U.esc(p.name)}"></label><label>Yaş <input type="number" data-f="age" value="${p.age}" min="17" max="45" style="width:70px"></label><label>Boy <input type="number" data-f="hgt" value="${p.hgt}" style="width:80px"></label><label>Poz <select data-f="pos">${BM.POS.map(x=>`<option${x===p.pos?' selected':''}>${x}</option>`).join('')}</select></label><label>Pot. <input type="number" data-f="pot" value="${p.pot}" style="width:70px"></label><label># <input type="number" data-f="num" value="${p.num}" style="width:60px"></label></div>
    <div class="attrs" style="margin-top:10px">${BM.ATTR.map(([k,l])=>`<div><span>${l}</span><input type="number" min="1" max="20" step="0.5" data-r="${k}" value="${p.r[k]}" style="width:64px"></div>`).join('')}</div>
    <div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn pri" data-a="save">Kaydet</button></div>`,{w:860});
  box.querySelector('[data-a="save"]').onclick=()=>{ const data={r:{}}; box.querySelectorAll('[data-f]').forEach(i=>{ data[i.dataset.f]=i.value; }); box.querySelectorAll('[data-r]').forEach(i=>{ data.r[i.dataset.r]=+i.value; }); UI.close(); run('editPlayer',{pid,data},()=>UI.toast('Kaydedildi.')); };
};
Sc.team=function(tid){
  const S=BM.S, t=S.teams[tid]; if(!t) return;
  const ps=t.roster.map(id=>P(S,id)).sort((a,b)=>b.ovr-a.ovr);
  const box=UI.modal(`<div class="row">${UI.crest(t,48)}<div><h1 style="margin:0">${U.esc(t.city+' '+t.name)}</h1><div class="muted">${BM.CONF[t.conf]} · ${t.div} · ${t.w}-${t.l} · bordro ${U.money(C.payroll(S,tid))} · ${L.isHuman(S,tid)?'menajer: <b>'+U.esc((L.human(S,tid)||{}).name||'')+'</b>':'strateji: '+{contend:'şampiyonluk',mid:'dengeli',rebuild:'yeniden yapılanma'}[t.strat]}</div></div></div>
    <div style="margin-top:12px">${UI.table([{k:'name',l:'Oyuncu',f:p=>UI.pl(p)+(p.gl?' <span class="pill y">GL</span>':'')+' '+UI.injury(p)},{k:'pos',l:'Poz'},{k:'age',l:'Yaş',n:1},{k:'ovr',l:'Güç',n:1,f:p=>UI.ovr(p.ovr)},{k:'pot',l:'Pot.',n:1},{k:'sal',l:'Maaş',n:1,v:p=>C.salary(p,S.season),f:p=>U.money(C.salary(p,S.season))},{k:'ex',l:'Bitiş',n:1,v:p=>C.expires(p),f:p=>U.seasonName(C.expires(p))},{k:'pts',l:'SY',n:1,v:p=>{ const s=p.stats[S.season]; return s?s.pts/s.gp:0; },f:p=>UI.pg(p.stats[S.season],'pts')}],ps,{sort:'ovr',desc:true,pid:p=>p.id,h:'50vh'})}</div>
    ${tid!==S.user?'<div class="row" style="margin-top:10px"><button class="btn pri" data-a="tr">Bu takımla takas</button></div>':''}`,{w:900});
  const b=box.querySelector('[data-a="tr"]'); if(b) b.onclick=()=>{ UI.close(); A().trade={tid,give:[],get:[]}; A().go('transfer',{tab:'trade'}); };
};

/* =================== NEGOTIATION (modal) =================== */
Sc.negotiate=function(pid,ext){
  const S=BM.S, p=P(S,pid); if(!p) return;
  if(ext&&p.tid!==S.user) return;
  A().act('talkStart',{pid,ext:!!ext}).then(st=>{ if(st.err){ UI.toast(U.esc(st.err)); return; } openTalk(pid,!!ext,st.talk); });
};
function openTalk(pid,ext,tk){
  const S=BM.S, p=P(S,pid);
  let salary=tk.ask, years=tk.years, role=tk.role, busy=false, over=false; const log=[`<div class="say">"${ext?'Uzatma konusunda konuşmaya açığım':'Sizi dinliyorum'}. Beklentim: ${U.money(tk.ask)}, ${tk.years} yıl, ${roleName(tk.role)} rolü."</div>`];
  const own=()=>p.tid===S.user||p.rights===S.user, maxY=(p.bird>=3&&own())?R.maxYearsBird:R.maxYears;
  const box=UI.modal(`<h2>${ext?'Sözleşme uzatma':'Sözleşme görüşmesi'}: ${U.esc(p.name)}</h2>
    <div class="muted">${p.pos} · ${p.age} yaş · güç ${p.ovr} / pot. ${p.pot} · ${p.exp} yıl tecrübe · min ${U.money(G.minFor(p.exp))} · max ${U.money(G.maxFor(p.exp))}</div>
    <div class="grid g2" style="margin-top:12px"><div class="neg"><div class="row"><label>İlk yıl maaşı (M$) <input type="number" data-sal step="0.05" min="0" style="width:110px"></label><input type="range" data-salr style="flex:1" min="${G.minFor(p.exp)}" max="${G.maxFor(p.exp)}" step="10000"></div>
      <div class="row"><label>Süre <select data-yrs>${Array.from({length:maxY},(_,i)=>`<option value="${i+1}">${i+1} yıl</option>`).join('')}</select></label><label>Rol sözü <select data-role>${Object.entries(M.ROLES).map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label></div>
      <div data-cap class="muted" style="font-size:13px"></div><div data-sum style="font-size:13px"></div>
      <div class="row"><button class="btn pri" data-a="offer">Teklif ver</button><button class="btn" data-a="ask">Talebini kabul et</button><button class="btn ghost" data-a="close">Görüşmeyi bitir</button></div></div>
      <div><b>Menajerin sabrı</b><div class="bar" style="margin:6px 0 10px"><i data-pat style="width:100%"></i></div><div data-log class="neg" style="max-height:300px;overflow:auto"></div></div></div>`,{w:880,sticky:true});
  const $=s=>box.querySelector(s);
  function upd(){ $('[data-sal]').value=(salary/1e6).toFixed(2); $('[data-salr]').value=salary; $('[data-yrs]').value=years; $('[data-role]').value=role;
    const chk=C.canSign(S,S.user,p,salary,years,{rights:p.rights,extension:ext});
    $('[data-cap]').innerHTML=chk.ok?`<span class="good">✔ ${U.esc(chk.msg||M.viaName(chk.via))}</span>`:`<span class="bad">✖ ${U.esc(chk.msg)}</span>`;
    const bird=own()&&p.bird>=2, c=G.contract(0,salary,years,bird); $('[data-sum]').innerHTML='Toplam: <b>'+U.money(c.amt.reduce((a,v)=>a+v,0))+'</b> · yıllık artış %'+((bird?R.raiseBird:R.raise)*100).toFixed(1)+' · bordro sonrası: '+U.money(C.payroll(S,S.user)+(ext?0:salary));
    const pat=over?0:Math.max(0,tk.patience); $('[data-pat]').style.width=pat+'%'; $('[data-pat]').style.background=pat<35?'var(--bad)':'var(--accent)';
    $('[data-log]').innerHTML=log.join(''); box.querySelectorAll('[data-a="offer"],[data-a="ask"]').forEach(b=>{ b.disabled=over||busy; }); }
  $('[data-sal]').oninput=e=>{ salary=Math.round(U.clamp(+e.target.value*1e6,G.minFor(p.exp),G.maxFor(p.exp))/10000)*10000; $('[data-salr]').value=salary; upd(); };
  $('[data-salr]').oninput=e=>{ salary=+e.target.value; upd(); };
  $('[data-yrs]').onchange=e=>{ years=+e.target.value; upd(); };
  $('[data-role]').onchange=e=>{ role=e.target.value; upd(); };
  box.onclick=e=>{ const b=e.target.closest('[data-a]'); if(!b||busy) return; const a=b.dataset.a;
    if(a==='close'){ if(!over) A().act('talkEnd',{pid}); UI.close(); A().render(); return; }
    if(over) return;
    if(a==='ask'){ salary=tk.ask; years=tk.years; role=tk.role; }
    const chk=C.canSign(S,S.user,p,salary,years,{rights:p.rights,extension:ext}); if(!chk.ok){ UI.toast(U.esc(chk.msg)); upd(); return; }
    log.unshift(`<div class="asset"><span>Sen: ${U.money(salary)} × ${years} yıl, ${roleName(role)}</span></div>`); busy=true; upd();
    A().act('talkOffer',{pid,salary,years,role}).then(r=>{ busy=false;
      if(r.err){ log.unshift(`<div class="bad">${U.esc(r.err)}</div>`); upd(); return; }
      if(r.status==='signed'){ UI.close(); UI.toast(ext?'Uzatma imzalandı!':p.name+' imzaladı!'); A().render(); return; }
      if(r.status==='pending'){ UI.close(); UI.toast(r.sheet?p.name+' teklif kağıdını imzaladı; eski takımı 3 gün içinde eşleştirebilir.':p.name+' teklifini kabul edilebilir buldu; '+r.n+' başka teklifi var, birkaç gün içinde karar verecek.',4600); A().render(); return; }
      log.unshift(`<div class="say">${U.esc(r.msg)}</div>`); if(r.talk) tk=r.talk;
      if(r.status==='walk'){ over=true; log.unshift('<div class="bad">Görüşme sona erdi.</div>'); }
      upd(); }); };
  upd();
}

/* =================== TACTICS =================== */
Sc.tactics=function(S,root,o){
  const tab=o.tab||'plays', t=S.teams[S.user], tac=t.tac;
  const setTac=x=>{ Object.assign(tac,x); return run('tactics',{tac:x}); };
  let html=`<h1>Taktik</h1>`+tabs('tactics',tab,[['plays','Hücum setleri'],['def','Savunma ve tempo'],['editor','Set çizici'],['defed','Savunma çizici'],['train','Antrenman']]);
  if(tab==='plays'){
    const plays=T.myPlays(S), w=id=>tac.plays[id]||0, tot=plays.reduce((a,pl)=>a+w(pl.id),0)||1;
    html+=`<p class="muted">Her setin kullanım ağırlığını seç. Motor her hücumda bu ağırlıklara göre set çağırır; setin şut bölgesi, pas ve perde sayısı, boşluk dağılımı isabetleri etkiler.</p><div class="grid g2">${plays.map(pl=>{ const an=T.analyze(pl); return `<div class="card tight"><div class="row sp"><b>${U.esc(pl.name)}${pl.custom?' <span class="pill o">senin</span>':''}</b><select data-w="${pl.id}">${[0,1,2,3,4,5].map(n=>`<option${w(pl.id)===n?' selected':''}>${n}</option>`).join('')}</select></div>
      <div class="muted" style="font-size:13px">${U.esc(pl.desc||'')}</div><div style="font-size:12px;margin-top:4px">Şut: <b>${{rim:'pota altı',mid:'orta mesafe',three:'üçlük'}[an.zone]}</b> · ${an.passes} pas · ${an.screens} perde · boşluk %${Math.round(an.spacing*100)} · kullanım %${Math.round(w(pl.id)/tot*100)}</div>
      ${pl.custom?`<button class="btn sm danger" data-del="${pl.id}" style="margin-top:6px">Sil</button>`:''}</div>`; }).join('')}</div>`;
    root.innerHTML=html;
    root.onchange=e=>{ const id=e.target.dataset.w; if(id) setTac({plays:{[id]:+e.target.value}}); };
    root.onclick=e=>{ const d=e.target.closest('[data-del]'); if(d) run('deletePlay',{id:d.dataset.del}); };
    return;
  }
  if(tab==='def'){
    const opt=(arr,cur)=>arr.map(([v,l])=>`<option value="${v}"${String(cur)===String(v)?' selected':''}>${l}</option>`).join('');
    const d=T.getDef(tac.def,S), dm=T.defMods(d);
    html+=`<div class="grid g2"><div class="card"><h3>Takım savunması</h3><select data-k="def" style="width:100%">${opt(T.myDefs(S).map(x=>[x.id,x.name+(x.custom?' (senin)':'')]),tac.def)}</select><p class="muted" style="font-size:13px">${U.esc(d.desc||'')}</p>
      ${d.type==='zone'?`<div style="font-size:13px">Etki (rakip isabetine): pota ${(dm.rim*100).toFixed(1)}% · orta ${(dm.mid*100).toFixed(1)}% · üçlük ${(dm.three*100).toFixed(1)}% · top kaybı ${(dm.tov*100).toFixed(1)}%</div>`:''}
      <h3 style="margin-top:12px">Pick & roll savunması</h3><select data-k="pnrD">${opt([['drop','Geride bekle (drop): potayı korur, orta mesafe verir'],['hedge','Hedge: top sahibine çıkar, üçlüğü kapatır'],['blitz','Blitz: ikili sıkıştırma, top kaybı ama rol açık']],tac.pnrD||'drop')}</select>
      <label class="row" style="margin-top:12px"><input type="checkbox" data-k="press" ${tac.press?'checked':''}> Tam saha pres (top kaybı +, yorgunluk +)</label></div>
      <div class="card"><h3>Hücum anlayışı</h3><label>Tempo <select data-k="pace">${opt([[0.9,'Yavaş · yarım saha'],[1,'Normal'],[1.12,'Hızlı · geçiş hücumu']],tac.pace)}</select></label>
      <p></p><label>Üçlük eğilimi <select data-k="three">${opt([[0.75,'Az · içeriyi zorla'],[1,'Dengeli'],[1.3,'Çok · çizgiye yayıl']],tac.three)}</select></label>
      <p class="muted" style="font-size:13px">Maç sırasında 2D izleme ekranındaki Koçluk sekmesinden de bu ayarları değiştirebilir, mola alıp oyuncu değiştirebilirsin.</p></div></div>`;
    root.innerHTML=html;
    root.onchange=e=>{ const k=e.target.dataset.k; if(!k) return; setTac({[k]:k==='press'?e.target.checked:(k==='pace'||k==='three')?+e.target.value:e.target.value}); };
    return;
  }
  if(tab==='editor'){
    html+=`<p class="muted">Oyuncuları yerleştir, koşuları, perdeleri ve pasları sırayla çiz, ▶ ile oynat. Kaydettiğin set Hücum setleri listesine eklenir ve maç motoru onu analiz edip kullanır.</p><div data-ed></div>`;
    root.innerHTML=html;
    T.editor(root.querySelector('[data-ed]'),S,pl=>{ A().act('savePlay',{play:pl}).then(r=>{ if(r.err) UI.toast(U.esc(r.err)); else UI.toast('Set kaydedildi: '+U.esc(pl.name)+'. Hücum setleri sekmesinden kullanım ağırlığını ver.'); }); });
    return;
  }
  if(tab==='defed'){ root.innerHTML=html+'<div data-ded></div>'; defEditor(root.querySelector('[data-ded]'),S); return; }
  const opts=[['balanced','Dengeli','Tüm özellikler eşit gelişir.'],['offense','Hücum','Şut, pas ve top sürme ağırlıklı.'],['defense','Savunma','Çevre/iç savunma, top çalma, blok, ribaund.'],['physical','Fizik','Hız, güç, sıçrama, dayanıklılık.']];
  html+=`<div class="grid g4">${opts.map(([k,l,d])=>`<div class="teamcard${(tac.training||'balanced')===k?' on':''}" data-tr="${k}"><div><b>${l}</b><div class="muted" style="font-size:13px">${d}</div></div></div>`).join('')}</div>
    <div class="card" style="margin-top:14px"><h3>Gelişim raporu</h3>${UI.table([{k:'name',l:'Oyuncu',f:p=>UI.pl(p)},{k:'age',l:'Yaş',n:1},{k:'work',l:'Çalışkanlık',n:1,v:p=>p.r.work,f:p=>UI.attr(p.r.work)},{k:'start',l:'Sezon başı',n:1,v:p=>p.ovrStart||p.ovr,f:p=>p.ovrStart||p.ovr},{k:'ovr',l:'Şimdi',n:1,f:p=>UI.ovr(p.ovr)},{k:'d',l:'Fark',n:1,v:p=>p.ovr-(p.ovrStart||p.ovr),f:p=>{ const d=p.ovr-(p.ovrStart||p.ovr); return `<span class="${d>0?'good':d<0?'bad':''}">${d>0?'+':''}${d}</span>`; }},{k:'pot',l:'Pot.',n:1}],t.roster.map(id=>P(S,id)),{sort:'d',desc:true,pid:p=>p.id})}</div>`;
  root.innerHTML=html;
  root.onclick=e=>{ const c=e.target.closest('[data-tr]'); if(c) setTac({training:c.dataset.tr}); };
};
/* defence designer: drag five defenders into a zone shape, preview it against any set */
function defEditor(root,S){
  const CWd=500, CHd=470, toC=(x,y)=>[(x+25)/50*CWd,y/47*CHd], fromC=(cx,cy)=>[U.clamp(cx/CWd*50-25,-24,24),U.clamp(cy/CHd*47,1,45)];
  const zones=()=>T.myDefs(S).filter(x=>x.type==='zone');
  let d=JSON.parse(JSON.stringify(zones()[0]||T.DEFS[2])), play=T.PLAYS[0], anim=null, drag=null;
  root.innerHTML=`<div class="split"><div><div class="court-wrap"><canvas class="court" width="${CWd}" height="${CHd}"></canvas></div><div class="row" style="margin-top:8px"><select data-play>${T.myPlays(S).map(p=>`<option value="${p.id}">${U.esc(p.name)}</option>`).join('')}</select><button class="btn sm pri" data-a="play">▶ Sete karşı oynat</button></div></div>
    <div><p class="muted">Savunmacıları (S1–S5) sürükleyerek kendi alan savunmanı çiz. Motor şekli analiz eder: potaya yakın oyuncu sayısı pota şutlarını, yaydaki ve köşedeki oyuncular üçlükleri, öndeki baskı top kayıplarını etkiler.</p>
      <div class="row"><select data-sel style="flex:1">${zones().map(x=>`<option value="${x.id}">${U.esc(x.name)}</option>`).join('')}</select><button class="btn sm" data-a="new">Yeni savunma</button></div>
      <div class="row" style="margin-top:8px"><input type="text" data-name maxlength="28" style="flex:1"><button class="btn sm pri" data-a="save">Kaydet</button></div><h3 style="margin-top:12px">Analiz</h3><div data-an style="font-size:14px"></div></div></div>`;
  const cv=root.querySelector('canvas'), g=cv.getContext('2d'), $=s=>root.querySelector(s);
  const dotD=(x,y,t,c)=>{ g.beginPath(); g.arc(x,y,13,0,Math.PI*2); g.fillStyle=c; g.fill(); g.lineWidth=2; g.strokeStyle='#0b111a'; g.stroke(); g.fillStyle='#fff'; g.font='700 12px Barlow, sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(t,x,y+1); };
  function draw(){ T.drawCourt(g,CWd,CHd);
    let off=null, ballI=0; if(anim){ off=anim.pos; ballI=anim.holder-1; }
    const spots=off?BM.MatchView.defSpots(d,off,ballI,false):d.spots;
    spots.forEach((s,i)=>{ const c=toC(s[0],s[1]); dotD(c[0],c[1],'S'+(i+1),'#3a66b0'); });
    if(off) off.forEach((s,i)=>{ const c=toC(s[0],s[1]); dotD(c[0],c[1],String(i+1),'#f26b1d'); if(i===ballI){ g.beginPath(); g.arc(c[0]+11,c[1]-11,6,0,Math.PI*2); g.fillStyle='#ff9a3a'; g.fill(); } });
    const m=T.defMods(d), bar=(l,v,inv)=>{ const good=inv?v>0:v<0; return `<div class="row sp"><span>${l}</span><span class="${good?'good':v===0?'':'bad'}">${v>0?'+':''}${(v*100).toFixed(1)}%</span></div>`; };
    $('[data-an]').innerHTML=`<p class="muted" style="font-size:13px;margin:0 0 6px">Rakibin isabetine / top kaybına etkisi (eksi = iyi savunma)</p>${bar('Pota altı',m.rim)}${bar('Orta mesafe',m.mid)}${bar('Üçlük',m.three)}${bar('Top kaybı yaptırma',m.tov,true)}`; }
  const ev=e=>{ const r=cv.getBoundingClientRect(); return [(e.clientX-r.left)*CWd/r.width,(e.clientY-r.top)*CHd/r.height]; };
  cv.addEventListener('pointerdown',e=>{ if(anim) return; const [x,y]=ev(e); d.spots.forEach((s,i)=>{ const c=toC(s[0],s[1]); if(Math.hypot(c[0]-x,c[1]-y)<18) drag=i; }); if(drag!=null) cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove',e=>{ if(drag==null) return; const [x,y]=ev(e); d.spots[drag]=fromC(x,y).map(v=>Math.round(v*10)/10); draw(); });
  cv.addEventListener('pointerup',()=>{ drag=null; });
  root.onclick=e=>{ const b=e.target.closest('[data-a]'); if(!b) return; const a=b.dataset.a;
    if(a==='new'){ d={id:'d'+Date.now().toString(36),name:'Yeni savunma',type:'zone',custom:true,desc:'Kendi çizdiğin alan savunması.',spots:[[-8,23],[8,23],[-14,9],[0,6],[14,9]]}; $('[data-name]').value=d.name; draw(); }
    if(a==='save'){ d.name=($('[data-name]').value||d.name).slice(0,28); if(!d.custom){ d=Object.assign(JSON.parse(JSON.stringify(d)),{id:'d'+Date.now().toString(36),custom:true,name:d.name+' (kopya)'}); }
      A().act('saveDef',{def:d}).then(r=>{ if(r.err) UI.toast(U.esc(r.err)); else { d.id=r.id; UI.toast('Savunma kaydedildi: '+U.esc(d.name)+'. Savunma ve tempo sekmesinden seç.'); } }); }
    if(a==='play'&&!anim){ play=T.getPlay(S,$('[data-play]').value); const tl=T.timeline(play); const t0=performance.now();
      const step=()=>{ const t=(performance.now()-t0)/1000; let i=1; while(i<tl.frames.length-1&&tl.frames[i].t<t) i++; const f1=tl.frames[i], f0=tl.frames[i-1], k=U.clamp((t-f0.t)/Math.max(0.01,f1.t-f0.t),0,1);
        anim={pos:f0.pos.map((p,j)=>[p[0]+(f1.pos[j][0]-p[0])*k,p[1]+(f1.pos[j][1]-p[1])*k]),holder:k<0.5?f0.holder:f1.holder}; draw(); if(t<tl.meta.dur+0.5) requestAnimationFrame(step); else { anim=null; draw(); } };
      requestAnimationFrame(step); } };
  $('[data-sel]').onchange=e=>{ d=JSON.parse(JSON.stringify(T.getDef(e.target.value,S))); $('[data-name]').value=d.name; draw(); };
  $('[data-name]').value=d.name; draw();
}

/* =================== SCHEDULE =================== */
Sc.schedule=function(S,root,o){
  const tab=o.tab||'mine', myBoxes=S.boxes.filter(b=>b.h===S.user||b.a===S.user);
  let html=`<h1>Fikstür ve sonuçlar</h1>`+tabs('schedule',tab,[['mine','Maçlarım'],['today','Lig sonuçları'],['box','Kutu skorları']]);
  if(tab==='mine'){
    const gs=S.games.filter(g=>g.h===S.user||g.a===S.user);
    const byM={}; gs.forEach(g=>{ const m=U.ymd(g.day); const k=m.y*100+m.m; (byM[k]=byM[k]||[]).push(g); });
    const t=S.teams[S.user];
    html+=`<div class="row" style="margin-bottom:10px"><span class="chip">Rekor <b>${t.w}-${t.l}</b></span><span class="chip">İç saha ${t.hw}-${t.hl}</span><span class="chip">Seri ${t.streak>0?t.streak+'G':t.streak<0?(-t.streak)+'M':'-'}</span><span class="chip">Son 10: ${t.last10.filter(x=>x).length}-${t.last10.filter(x=>!x).length}</span></div>`;
    html+=Object.keys(byM).sort().map(k=>{ const y=Math.floor(k/100), m=k%100; return `<div class="card tight" style="margin-bottom:10px"><h3>${BM.MONTHS[m-1]} ${y}</h3><div class="tw" style="max-height:none"><table>${byM[k].map(g=>{ const home=g.h===S.user, opp=home?g.a:g.h, won=g.played&&((home&&g.hs>g.as)||(!home&&g.as>g.hs)); return `<tr${g.day===S.day?' class="me"':''}><td>${U.fdate(g.day)}</td><td>${home?'vs':'@'} ${UI.crest(S.teams[opp],22)} ${UI.tm(S,opp)} <span class="dim">${S.teams[opp].w}-${S.teams[opp].l}</span>${mgr(S,opp)}</td><td>${g.played?`<b class="${won?'good':'bad'}">${won?'G':'M'}</b> ${g.hs}-${g.as}`:'<span class="dim">—</span>'}</td><td>${g.played&&S.boxes.some(b=>b.gid===g.id)?`<button class="btn sm" data-box="${g.id}">Kutu</button>`:''}</td></tr>`; }).join('')}</table></div></div>`; }).join('')||'<p class="muted">Fikstür yok.</p>';
  }
  if(tab==='today'){
    const days=[...new Set(S.games.filter(g=>g.played).map(g=>g.day))].sort((a,b)=>b-a).slice(0,6);
    html+=days.map(d=>`<div class="card tight" style="margin-bottom:10px"><h3>${U.fdate(d)}</h3>${S.games.filter(g=>g.day===d&&g.played).map(g=>`<div class="asset"><span>${UI.tm(S,g.a)} <b>${g.as}</b> @ <b>${g.hs}</b> ${UI.tm(S,g.h)}</span><span class="dim">${g.hs>g.as?S.teams[g.h].abbr:S.teams[g.a].abbr} kazandı${S.boxes.some(b=>b.gid===g.id)?` <button class="btn sm" data-box="${g.id}">Kutu</button>`:''}</span></div>`).join('')}</div>`).join('')||'<p class="muted">Henüz oynanan maç yok.</p>';
  }
  if(tab==='box'){ html+=myBoxes.length?myBoxes.map(b=>`<div class="asset" data-boxi="${S.boxes.indexOf(b)}"><span>${U.fdate(b.day)} ${b.po?'<span class="pill o">PO</span>':''} ${S.teams[b.a].abbr} ${b.as} @ ${b.hs} ${S.teams[b.h].abbr}</span><button class="btn sm">Aç</button></div>`).join(''):'<p class="muted">Kutu skoru yok.</p>'; }
  root.innerHTML=html;
  root.onclick=e=>{ const b=e.target.closest('[data-box],[data-boxi]'); if(!b) return; const bx=b.dataset.box?S.boxes.find(x=>String(x.gid)===b.dataset.box):S.boxes[+b.dataset.boxi]; if(bx) Sc.boxModal(S,bx); };
};
Sc.boxModal=function(S,b){
  const K=['sec','pts','fgm','fga','tpm','tpa','ftm','fta','orb','drb','ast','stl','blk','tov','pf','pm'];
  const side=(tid,rows,sc)=>{ const t=S.teams[tid]; return `<h3>${t.city} ${t.name} · ${sc}</h3><table><tr><th>Oyuncu</th><th class="n">DK</th><th class="n">SY</th><th class="n">RB</th><th class="n">AS</th><th class="n">TÇ</th><th class="n">BL</th><th class="n">TK</th><th class="n">SA</th><th class="n">3S</th><th class="n">SB</th><th class="n">+/-</th></tr>${rows.map(r=>{ const o={}; K.forEach((k,i)=>o[k]=r[i+1]); const p=P(S,r[0]); return `<tr><td>${p?UI.pl(p):'?'}</td><td class="n">${Math.round(o.sec/60)}</td><td class="n"><b>${o.pts}</b></td><td class="n">${o.orb+o.drb}</td><td class="n">${o.ast}</td><td class="n">${o.stl}</td><td class="n">${o.blk}</td><td class="n">${o.tov}</td><td class="n">${o.fgm}-${o.fga}</td><td class="n">${o.tpm}-${o.tpa}</td><td class="n">${o.ftm}-${o.fta}</td><td class="n">${o.pm}</td></tr>`; }).join('')}</table>`; };
  UI.modal(`<h2>${U.fdate(b.day)}${b.po?' · Playoff':''}</h2>${side(b.h,b.players[0],b.hs)}<div style="height:12px"></div>${side(b.a,b.players[1],b.as)}`,{w:900});
};

/* =================== STANDINGS / PLAYOFFS =================== */
Sc.standings=function(S,root,o){
  const tab=o.tab||'conf';
  let html=`<h1>Puan durumu</h1>`+tabs('standings',tab,[['conf','Konferanslar'],['div','Bölümler'],['po','Playoff'],['power','Güç sıralaması']]);
  const hum=t=>L.isHuman(S,t.id)&&(S.humans||[]).length>1?' <span title="'+U.esc((L.human(S,t.id)||{}).name||'')+'">👤</span>':'';
  const row=(t,i,lead,cut)=>`<tr class="click${t.id===S.user?' me':''}" data-t="${t.id}"${cut&&i===8?' style="border-top:2px solid var(--accent)"':''}><td>${i+1}</td><td>${UI.crest(t,22)} ${U.esc(t.city+' '+t.name)}${hum(t)}</td><td class="n">${t.w}</td><td class="n">${t.l}</td><td class="n">${(t.w/(t.w+t.l||1)).toFixed(3).replace(/^0/,'')}</td><td class="n">${lead?L.gb(lead,t)||'-':'-'}</td><td class="n">${t.hw}-${t.hl}</td><td class="n">${t.w+t.l-t.hw-t.hl?(t.w-t.hw)+'-'+(t.l-t.hl):'0-0'}</td><td class="n">${t.cw}-${t.cl}</td><td class="n">${t.last10.filter(x=>x).length}-${t.last10.filter(x=>!x).length}</td><td class="n">${t.streak>0?t.streak+'G':t.streak<0?(-t.streak)+'M':'-'}</td><td class="n">${t.w+t.l?((t.pf-t.pa)/(t.w+t.l)).toFixed(1):'-'}</td></tr>`;
  const head='<tr><th>#</th><th>Takım</th><th class="n">G</th><th class="n">M</th><th class="n">%</th><th class="n">Fark</th><th class="n">İç</th><th class="n">Dış</th><th class="n">Konf</th><th class="n">S10</th><th class="n">Seri</th><th class="n">+/-</th></tr>';
  if(tab==='conf') html+=`<div class="grid g2">${['E','W'].map(cf=>{ const st=L.standings(S,cf); return `<div class="card tight"><h3>${BM.CONF[cf]}</h3><div class="tw" style="max-height:none"><table>${head}${st.map((t,i)=>row(t,i,st[0],true)).join('')}</table></div></div>`; }).join('')}</div><p class="dim" style="font-size:13px">Turuncu çizginin üstündeki 8 takım playoff'a kalır (2010 formatı, play-in yok).</p>`;
  if(tab==='div'){ const divs=[...new Set(S.teams.map(t=>t.conf+'|'+t.div))]; html+=`<div class="grid g3">${divs.map(k=>{ const [cf,dv]=k.split('|'); const st=L.standings(S,cf).filter(t=>t.div===dv); return `<div class="card tight"><h3>${dv} <span class="dim">(${cf==='E'?'Doğu':'Batı'})</span></h3><table>${st.map(t=>`<tr class="click${t.id===S.user?' me':''}" data-t="${t.id}"><td>${UI.crest(t,20)} ${t.abbr}${hum(t)}</td><td class="n">${t.w}-${t.l}</td><td class="n">${L.gb(st[0],t)||'-'}</td></tr>`).join('')}</table></div>`; }).join('')}</div>`; }
  if(tab==='po'){ const P0=S.playoffs; if(!P0) html+='<p class="muted">Playoff henüz başlamadı.'+(S.lastDay&&S.phase==='regular'?' Normal sezon '+U.fdate(S.lastDay)+' tarihinde biter.':'')+'</p>';
    else { const names=['1. Tur','Konferans yarı finali','Konferans finali','Final']; html+=`<div class="bracket">${[1,2,3,4].map(r=>`<div><h3>${names[r-1]}</h3>${P0.series.filter(s=>s.round===r).map(s=>`<div class="series"><div class="${s.win===s.a?'w':''}">${s.sa?'('+s.sa+') ':''}${UI.tm(S,s.a)} <b style="float:right">${s.wa}</b></div><div class="${s.win===s.b?'w':''}">${s.sb?'('+s.sb+') ':''}${UI.tm(S,s.b)} <b style="float:right">${s.wb}</b></div></div>`).join('')||'<p class="dim">—</p>'}</div>`).join('')}</div>${P0.champ!=null?`<h2 style="margin-top:14px">🏆 Şampiyon: ${U.esc(L.tname(S,P0.champ))}</h2>`:''}`; } }
  if(tab==='power'){ const pw=S.teams.slice().sort((a,b)=>M.teamStrength(S,b.id)-M.teamStrength(S,a.id)); html+=UI.table([{k:'r',l:'#',n:1},{k:'nm',l:'Takım',f:t=>UI.crest(t,20)+' '+UI.tm(S,t.id)+' '+U.esc(t.name)+hum(t)},{k:'s',l:'Kadro gücü',n:1,v:t=>M.teamStrength(S,t.id),f:t=>Math.round(M.teamStrength(S,t.id)*100)},{k:'rec',l:'Rekor',f:t=>t.w+'-'+t.l},{k:'pay',l:'Bordro',n:1,v:t=>C.payroll(S,t.id),f:t=>U.money(C.payroll(S,t.id))},{k:'st',l:'Strateji',f:t=>L.isHuman(S,t.id)?'Menajer':({contend:'Şampiyonluk',mid:'Dengeli',rebuild:'Yeniden yapılanma'})[t.strat]}],pw.map((t,i)=>Object.assign(Object.create(t),{r:i+1})),{sort:'s',desc:true,me:t=>t.id===S.user}); }
  root.innerHTML=html;
};

/* =================== TRANSFERS =================== */
Sc.transfer=function(S,root,o){
  const tab=o.tab||'fa';
  const inc=Sc.myOffers(S), out=S.tradeOffers.filter(x=>x.by===S.user);
  const room=C.room(S,S.user);
  let html=`<div class="row sp"><h1>Transfer</h1><span class="muted">${L.tradeOpen(S)?'<span class="good">Takas dönemi açık</span>':'<span class="bad">Takas dönemi kapalı</span>'} · Tavan ${U.money(S.cap)} · ${room>=0?'Boşluk <b>'+U.money(room)+'</b>':'Tavan üstü <b>'+U.money(-room)+'</b>'} · MLE ${S.teams[S.user].ex.mle?U.money(S.mle):'kullanıldı'}</span></div>`+tabs('transfer',tab,[['fa','Serbest oyuncular'],['trade','Takas merkezi'],['search','Oyuncu ara'],['offers','Teklifler'+(inc.length?' ('+inc.length+')':'')]]);
  if(tab==='fa'){
    const fas=M.freeAgents(S).filter(p=>!o.pos||p.pos===o.pos);
    const closed=S.phase==='predraft'||(S.phase==='post'&&S.skipRollover);
    html+=`${closed?'<div class="card" style="margin-bottom:10px;border-color:var(--warn)">Serbest oyuncu görüşmeleri <b>1 Temmuz</b>\'da başlıyor. Şimdilik listeyi inceleyip hedeflerini belirleyebilirsin.</div>':''}<div class="row" style="margin-bottom:8px"><button class="btn sm${!o.pos?' tool on':''}" data-go="transfer" data-tab="fa">Hepsi</button>${BM.POS.map(x=>`<button class="btn sm${o.pos===x?' tool on':''}" data-go="transfer" data-tab="fa" data-pos="${x}">${x}</button>`).join('')}<span class="dim" style="font-size:13px">Tavan üstündeysen MLE (${U.money(S.mle)}), BAE (${U.money(S.bae)}), minimum maaş ya da Bird haklarınla imzalayabilirsin.</span></div>`;
    html+=UI.table([{k:'name',l:'Oyuncu',f:p=>UI.pl(p)+(p.rights===S.user?' <span class="pill b">Bird hakkın</span>':'')+(p.rfa?' <span class="pill y">kısıtlı</span>':'')+((p.offers||[]).length?` <span class="pill">${p.offers.length} teklif</span>`:'')+(p.pendingMatch?' <span class="pill y">eşleştirme bekliyor</span>':'')},{k:'pos',l:'Poz'},{k:'age',l:'Yaş',n:1},{k:'ovr',l:'Güç',n:1,f:p=>UI.ovr(p.ovr)},{k:'pot',l:'Pot.',n:1},
      {k:'ask',l:'İstek',n:1,v:p=>M.demand(S,p,S.user).salary,f:p=>{ const d=M.demand(S,p,S.user); return U.money(d.salary)+' × '+d.years; }},{k:'last',l:'Önceki takım',f:p=>p.rights!=null&&S.teams[p.rights]?UI.tm(S,p.rights):'<span class="dim">—</span>'},{k:'act',l:'',f:p=>`<button class="btn sm pri" data-neg="${p.id}" ${closed?'disabled':''}>Pazarlık</button>`}],fas,{id:'fa',sort:'ovr',desc:true,pid:p=>p.id,h:'66vh'});
    root.innerHTML=html; root.onclick=e=>{ const b=e.target.closest('[data-neg]'); if(b) Sc.negotiate(+b.dataset.neg,false); }; return;
  }
  if(tab==='offers'){
    html+=`<h3>Gelen teklifler</h3>`+(inc.length?inc.map(of=>`<div data-of="${of.id}">${offerCard(S,of,true)}</div>`).join(''):'<p class="muted">Bekleyen takas teklifi yok. Sezon boyunca diğer takımlar (ve menajerler) oyuncuların için teklif gönderir.</p>');
    if(out.length) html+=`<h3 style="margin-top:14px">Gönderdiğin teklifler</h3>`+out.map(of=>`<div class="offer" style="margin-bottom:10px"><div class="row sp"><b>${U.esc(L.tname(S,of.to))}${mgr(S,of.to)}</b><button class="btn sm danger" data-cancel="${of.id}">Geri çek</button></div><div class="split"><div>Verirsin: ${of.deal.get.map(a=>U.esc(M.assetName(S,a))).join(', ')||'—'}</div><div>Alırsın: ${of.deal.give.map(a=>U.esc(M.assetName(S,a))).join(', ')||'—'}</div></div></div>`).join('');
    root.innerHTML=html;
    root.onclick=e=>{ const c=e.target.closest('[data-cancel]'); if(c){ run('offerCancel',{id:c.dataset.cancel}); return; }
      const b=e.target.closest('[data-x]'), w=e.target.closest('[data-of]'); if(!b||!w) return; const of=inc.find(x=>x.id===w.dataset.of); if(of) offerAct(S,of,b.dataset.x,()=>A().go('transfer',{tab:'offers'})); }; return;
  }
  if(tab==='search'){
    const q=(o.q||'').toLowerCase(), pos=o.pos||'', mn=+(o.min||60);
    const all=Object.values(S.players).filter(p=>p.tid>=-1&&p.tid!==S.user&&(!pos||p.pos===pos)&&p.ovr>=mn&&(!q||p.name.toLowerCase().includes(q)));
    html+=`<div class="row" style="margin-bottom:8px"><input type="text" placeholder="İsim ara" data-q value="${U.esc(o.q||'')}"><select data-pos><option value="">Tüm pozisyonlar</option>${BM.POS.map(x=>`<option${x===pos?' selected':''}>${x}</option>`).join('')}</select><label>Min güç <input type="number" data-min value="${mn}" style="width:70px"></label><button class="btn sm pri" data-a="go">Ara</button></div>`;
    html+=UI.table([{k:'name',l:'Oyuncu',f:p=>UI.pl(p)},{k:'tm',l:'Takım',v:p=>p.tid,f:p=>UI.tm(S,p.tid)+(p.tid>=0&&L.isHuman(S,p.tid)&&(S.humans||[]).length>1?' 👤':'')},{k:'pos',l:'Poz'},{k:'age',l:'Yaş',n:1},{k:'ovr',l:'Güç',n:1,f:p=>UI.ovr(p.ovr)},{k:'pot',l:'Pot.',n:1},{k:'sal',l:'Maaş',n:1,v:p=>C.salary(p,S.season),f:p=>p.contract?U.money(C.salary(p,S.season)):'SO'},{k:'ex',l:'Bitiş',n:1,v:p=>C.expires(p),f:p=>p.contract?U.seasonName(C.expires(p)):'—'},{k:'val',l:'Takas değeri',n:1,v:p=>p.tid>=0?M.pval(S,p,p.tid):0,f:p=>p.tid>=0?Math.round(M.pval(S,p,p.tid)):'—'}],all,{id:'srch',sort:'ovr',desc:true,pid:p=>p.id,limit:200,h:'62vh'});
    root.innerHTML=html;
    root.onclick=e=>{ if(e.target.closest('[data-a="go"]')) A().go('transfer',{tab:'search',q:root.querySelector('[data-q]').value,pos:root.querySelector('[data-pos]').value,min:root.querySelector('[data-min]').value}); };
    root.onkeydown=e=>{ if(e.key==='Enter'&&e.target.dataset.q!=null) root.querySelector('[data-a="go"]').click(); }; return;
  }
  // trade centre
  const tr=A().trade=A().trade&&S.teams[A().trade.tid]&&A().trade.tid!==S.user?A().trade:{tid:S.teams.find(t=>t.id!==S.user).id,give:[],get:[]};
  const other=S.teams[tr.tid], human=L.isHuman(S,other.id);
  const myAssets=S.teams[S.user].roster.map(id=>({pid:id})).concat(S.picks.filter(p=>p.owner===S.user).sort((a,b)=>a.season-b.season||a.round-b.round).map(p=>({pick:M.pickKey(p)})));
  const thAssets=other.roster.map(id=>({pid:id})).concat(S.picks.filter(p=>p.owner===other.id).sort((a,b)=>a.season-b.season||a.round-b.round).map(p=>({pick:M.pickKey(p)})));
  tr.give=tr.give.filter(a=>myAssets.some(x=>(a.pid!=null&&x.pid===a.pid)||(a.pick&&x.pick===a.pick))); tr.get=tr.get.filter(a=>thAssets.some(x=>(a.pid!=null&&x.pid===a.pid)||(a.pick&&x.pick===a.pick)));
  const has=(arr,a)=>arr.some(x=>(a.pid!=null&&x.pid===a.pid)||(a.pick&&x.pick===a.pick));
  const aRow=(a,side)=>{ const sel=has(side==='g'?tr.give:tr.get,a); if(a.pid!=null){ const p=P(S,a.pid); return `<div class="asset${sel?' on':''}" data-as="${side}" data-pid="${p.id}"><span><b>${U.esc(p.name)}</b> <span class="dim">${p.pos} · ${p.age}y</span> ${UI.injury(p)}</span><span>${UI.ovr(p.ovr)} <span class="dim">${U.money(C.salary(p,S.season))} → ${U.seasonName(C.expires(p))}</span></span></div>`; }
    const pk=M.findPick(S,a.pick); return `<div class="asset${sel?' on':''}" data-as="${side}" data-pick="${a.pick}"><span>🎟 ${U.esc(M.pickName(S,pk))}</span><span class="dim">${pk.orig!==pk.owner?'':'kendi'}</span></div>`; };
  const deal={from:S.user,tid:tr.tid,give:tr.give,get:tr.get}; const any=tr.give.length||tr.get.length;
  const legal=any?BM.Actions.validDeal(S,S.user,deal):null, ev=any&&!human?M.evalTrade(S,deal):null;
  const sal=arr=>arr.filter(a=>a.pid!=null).reduce((s,a)=>s+C.salary(P(S,a.pid),S.season),0);
  const interest=ev?U.clamp(ev.inV/Math.max(1,ev.need),0,1.5):0;
  html+=`<div class="row" style="margin-bottom:10px"><label>Karşı takım <select data-tt>${S.teams.filter(t=>t.id!==S.user).map(t=>`<option value="${t.id}"${t.id===tr.tid?' selected':''}>${t.city} ${t.name} (${t.w}-${t.l})${L.isHuman(S,t.id)?' · 👤 '+U.esc((L.human(S,t.id)||{}).name||''):''}</option>`).join('')}</select></label>${human?`<span class="chip">👤 Menajer: <b>${U.esc((L.human(S,other.id)||{}).name||'')}</b> · teklifin gelen kutusuna gider</span>`:`<span class="chip">${({contend:'Şampiyonluk yarışında: deneyimli oyuncu ister',mid:'Dengeli',rebuild:'Yeniden yapılanma: genç ve draft hakkı ister'})[other.strat]}</span>`}<span class="chip">Bordro ${U.money(C.payroll(S,other.id))}</span></div>
  <div class="trade"><div class="card tight"><h3>Senin varlıkların <span class="dim" style="font-size:13px">(vermek için tıkla)</span></h3><div style="max-height:46vh;overflow:auto">${myAssets.map(a=>aRow(a,'g')).join('')}</div></div>
    <div class="card tight"><h3>${U.esc(other.city+' '+other.name)} <span class="dim" style="font-size:13px">(almak için tıkla)</span></h3><div style="max-height:46vh;overflow:auto">${thAssets.map(a=>aRow(a,'r')).join('')}</div></div></div>
  <div class="card" style="margin-top:12px"><div class="split"><div><b>Verdiğin</b> (${U.money(sal(tr.give))}): ${tr.give.map(a=>U.esc(M.assetName(S,a))).join(', ')||'<span class="dim">—</span>'}</div><div><b>Aldığın</b> (${U.money(sal(tr.get))}): ${tr.get.map(a=>U.esc(M.assetName(S,a))).join(', ')||'<span class="dim">—</span>'}</div></div>
    ${any?`<div style="margin-top:8px">${!legal?'<span class="good">✔ Maaş eşleşmesi ve kadro kuralları uygun.</span>':'<span class="bad">✖ '+U.esc(legal)+'</span>'}</div>`:''}
    ${ev?`<div class="row" style="margin-top:8px"><span>Karşı tarafın ilgisi</span><div class="bar" style="flex:1;max-width:320px"><i style="width:${Math.min(100,interest*100)}%;background:${interest>=1?'var(--good)':interest>0.75?'var(--warn)':'var(--bad)'}"></i></div><span>${interest>=1?'Kabul edebilirler':interest>0.75?'Yakın':'Uzak'}</span></div>`:''}
    ${human?`<div class="row" style="margin-top:10px"><input type="text" data-note maxlength="140" placeholder="Not ekle (isteğe bağlı)" style="flex:1"><button class="btn pri" data-a="send" ${any&&!legal?'':'disabled'}>Teklif gönder</button><button class="btn ghost" data-a="clear">Temizle</button></div>`
      :`<div class="row" style="margin-top:10px"><button class="btn pri" data-a="propose" ${any&&L.tradeOpen(S)?'':'disabled'}>Teklif et</button><button class="btn" data-a="ask" ${L.tradeOpen(S)?'':'disabled'}>Ne istersiniz?</button><button class="btn ghost" data-a="clear">Temizle</button><span data-resp class="muted"></span></div>`}</div>`;
  root.innerHTML=html;
  root.onchange=e=>{ if(e.target.dataset.tt!=null){ A().trade={tid:+e.target.value,give:[],get:[]}; A().go('transfer',{tab:'trade'}); } };
  const plain={tid:tr.tid,give:tr.give.slice(),get:tr.get.slice()};
  const showCounter=r=>{ const resp=root.querySelector('[data-resp]'); if(!resp) return; if(r.counter){ resp.innerHTML=U.esc(r.msg)+' <button class="btn sm pri" data-a="takec">Karşı teklifi yükle</button>'; tr._c=r.counter; } else resp.textContent=r.msg||''; };
  root.onclick=e=>{
    const as=e.target.closest('[data-as]'); if(as){ const a=as.dataset.pid?{pid:+as.dataset.pid}:{pick:as.dataset.pick}; const arr=as.dataset.as==='g'?tr.give:tr.get; const i=arr.findIndex(x=>(a.pid!=null&&x.pid===a.pid)||(a.pick&&x.pick===a.pick)); if(i>=0) arr.splice(i,1); else arr.push(a); A().go('transfer',{tab:'trade',keep:1}); return; }
    const b=e.target.closest('[data-a]'); if(!b) return;
    if(b.dataset.a==='clear'){ tr.give=[]; tr.get=[]; A().go('transfer',{tab:'trade'}); }
    if(b.dataset.a==='send'){ A().act('tradeOfferHuman',{deal:plain,note:(root.querySelector('[data-note]')||{}).value||''}).then(r=>{ if(r.err) UI.toast(U.esc(r.err)); else { UI.toast('Teklif gönderildi.'); A().trade=null; A().go('transfer',{tab:'offers'}); } }); }
    if(b.dataset.a==='propose'){ if(legal){ UI.toast(U.esc(legal)); return; }
      if(ev&&ev.ok){ UI.confirm(`<p>${U.esc(other.city+' '+other.name)} takası kabul ediyor.</p><p>Verdiğin: ${tr.give.map(a=>U.esc(M.assetName(S,a))).join(', ')||'—'}<br>Aldığın: ${tr.get.map(a=>U.esc(M.assetName(S,a))).join(', ')||'—'}</p>`,()=>{ A().act('tradePropose',{deal:plain}).then(r=>{ if(r.err){ UI.toast(U.esc(r.err)); return; } if(r.done){ A().trade=null; UI.toast('Takas tamamlandı!'); A().go('squad'); } else showCounter(r); }); },{title:'Takas onayı',ok:'Takası tamamla'}); return; }
      A().act('tradePropose',{deal:plain}).then(r=>{ if(r.err){ UI.toast(U.esc(r.err)); return; } if(r.done){ A().trade=null; UI.toast('Takas tamamlandı!'); A().go('squad'); } else showCounter(r); }); }
    if(b.dataset.a==='ask') A().act('tradeAsk',{deal:plain}).then(r=>{ if(r.err) UI.toast(U.esc(r.err)); else showCounter(r); });
    if(b.dataset.a==='takec'&&tr._c){ tr.give=tr._c.give.slice(); tr.get=tr._c.get.slice(); tr._c=null; A().go('transfer',{tab:'trade'}); }
  };
};

/* =================== CONTRACTS / CAP SHEET =================== */
Sc.contracts=function(S,root){
  const t=S.teams[S.user], sh=C.sheet(S,S.user);
  const deadRows=(t.dead||[]).filter(d=>d.season>=S.season);
  const pay=C.payroll(S,S.user);
  root.innerHTML=`<h1>Kontratlar ve maaş tavanı</h1>
  <div class="grid g4"><div class="card kpi"><span class="l">Bordro ${U.seasonName(S.season)}</span><span class="v">${U.money(pay)}</span></div><div class="card kpi"><span class="l">Tavan / vergi sınırı</span><span class="v">${U.money(S.cap)} <span class="dim" style="font-size:15px">/ ${U.money(S.tax)}</span></span></div>
    <div class="card kpi"><span class="l">${pay<S.cap?'Tavan altı boşluk':'Tavan üstü'}</span><span class="v ${pay<S.cap?'good':pay>S.tax?'bad':'warn'}">${U.money(Math.abs(S.cap-pay))}</span></div><div class="card kpi"><span class="l">Tahmini lüks vergi</span><span class="v ${C.taxBill(S,S.user)>0?'bad':''}">${U.money(C.taxBill(S,S.user))}</span></div></div>
  <div class="row" style="margin:12px 0"><span class="chip">MLE: ${t.ex.mle?'<b class="good">'+U.money(S.mle)+'</b> kullanılabilir':'kullanıldı'}</span><span class="chip">BAE: ${S.season-t.ex.baeYear>=2?'<b class="good">'+U.money(S.bae)+'</b>':'bu sezon yok'}</span><span class="chip">Minimum bordro: ${U.money(S.minPayroll)}</span><span class="chip">Maksimum maaş: ${U.money(G.maxFor(0))} / ${U.money(G.maxFor(7))} / ${U.money(G.maxFor(10))}</span></div>
  <div class="card tight"><div class="tw" style="max-height:none"><table><tr><th>Oyuncu</th><th>Bird</th>${sh.seasons.map(s=>`<th class="n">${U.seasonName(s)}</th>`).join('')}<th></th></tr>
    ${sh.rows.map(r=>`<tr><td>${UI.pl(r.p)} <span class="dim">${r.p.pos} · ${r.p.age}y · ${r.p.ovr}</span>${r.p.contract&&r.p.contract.rookie?' <span class="pill b">çaylak</span>':''}</td><td>${r.p.bird>=3?'<span class="pill g">Tam</span>':r.p.bird===2?'<span class="pill y">Erken</span>':'<span class="dim">—</span>'}</td>${r.amts.map((a,i)=>`<td class="n">${a?U.money(a):i===0&&r.p.pendingStart?'<span class="dim">gelecek sezon</span>':'<span class="dim">·</span>'}</td>`).join('')}<td>${C.yearsLeft(r.p,S)<=1&&!r.p.pendingStart?`<button class="btn sm" data-ext="${r.p.id}">Uzat</button>`:''}</td></tr>`).join('')}
    ${deadRows.length?`<tr><td colspan="${sh.seasons.length+3}"><b>Ölü para</b></td></tr>`+[...new Set(deadRows.map(d=>d.name))].map(nm=>`<tr><td class="dim">${U.esc(nm)} (bırakıldı)</td><td></td>${sh.seasons.map(s=>{ const v=deadRows.filter(d=>d.name===nm&&d.season===s).reduce((a,d)=>a+d.amt,0); return `<td class="n bad">${v?U.money(v):''}</td>`; }).join('')}<td></td></tr>`).join(''):''}
    <tr><td><b>Toplam</b></td><td></td>${sh.totals.map(v=>`<td class="n"><b class="${v>S.tax?'bad':v>S.cap?'warn':'good'}">${U.money(v)}</b></td>`).join('')}<td></td></tr></table></div></div>
  <div class="card" style="margin-top:12px;font-size:14px"><h3>Kural özeti (2010-11)</h3><ul class="muted" style="margin:0;padding-left:18px">
    <li>Yumuşak tavan: tavan altındaysan boşluk kadar imza; üstündeysen yalnızca istisnalarla (MLE ${U.money(S.mle)}, iki yılda bir BAE ${U.money(S.bae)}, minimum maaş, Bird hakları).</li>
    <li>Bird hakları: aynı takımda 3 sezon = tam Bird (tavanı aşarak maks. maaşa kadar, 6 yıl, %10.5 artış). 2 sezon = erken Bird (önceki maaşın %175'i). Daha azı = önceki maaşın %120'si.</li>
    <li>Takas: tavan üstündeki takım, gönderdiği maaşın %125'i + 100 B$'a kadar maaş alabilir.</li>
    <li>Vergi sınırı üstündeki her dolar için 1$ lüks vergi ödenir (sezon sonunda). Minimum bordro altında kalan takım farkı öder.</li>
    <li>Çaylak ölçeği: 1. tur seçimleri 4 yıllık ölçekli sözleşme, 2. tur seçimleri 2 yıllık minimum. Çaylak sözleşmesi bitince oyuncu kısıtlı serbest oyuncu olur: takımı gelen teklifi eşleştirebilir.</li></ul></div>`;
  root.onclick=e=>{ const b=e.target.closest('[data-ext]'); if(b) Sc.negotiate(+b.dataset.ext,true); };
};

/* =================== DRAFT =================== */
Sc.draft=function(S,root){
  const D=S.draft, live=S.phase==='draft'&&D&&!D.done, slot=live&&S.draftOrder?S.draftOrder[D.idx]:null, onClock=!!slot&&slot.tid===S.user;
  const pros=L.prospects(S), year=L.draftYear(S), pts=L.scoutPts(S,S.user);
  const mine=(S.draftOrder||[]).filter(x=>x.tid===S.user);
  const myPicks=S.picks.filter(p=>p.owner===S.user&&p.season===year);
  const sv=p=>L.scoutVal(S,p,S.user);
  let html=`<div class="row sp"><h1>${year} Draftı</h1><span class="muted">Gözlem puanı: <b>${pts}</b> (her pazartesi +3, en fazla 6) · Draft günü: 24 Haziran</span></div>`;
  if(onClock) html+=`<div class="card" style="border-color:var(--accent);margin-bottom:12px"><h2 style="margin:0">⏱ Sıra sende! ${slot.pick}. seçim</h2><p class="muted" style="margin:4px 0 0">Aşağıdan bir aday seç ya da en yüksek gözlem notuna sahip adayı otomatik seç.</p><button class="btn pri" data-a="auto" style="margin-top:8px">Otomatik seç</button></div>`;
  else if(slot) html+=`<div class="card" style="margin-bottom:12px"><b>Sırada:</b> ${slot.pick}. seçim · ${U.esc(L.tname(S,slot.tid))}${mgr(S,slot.tid)} seçimini yapıyor…${A().isHost()&&L.isHuman(S,slot.tid)?' <button class="btn sm" data-a="force">Onun yerine otomatik seç</button>':''}</div>`;
  else if(S.phase==='post'||(D&&D.done)) html+='<p class="good">Draft tamamlandı.</p>';
  html+=`<div class="row" style="margin-bottom:10px">${S.draftOrder?`<span class="chip">Senin seçimlerin: <b>${mine.map(x=>'#'+x.pick).join(', ')||'yok'}</b></span>`:`<span class="chip">Bu yılki haklar: ${myPicks.map(p=>p.round+'. tur'+(p.orig!==S.user?' ('+S.teams[p.orig].abbr+')':'')).join(', ')||'yok'}</span><span class="chip">Sıra, sezon sonunda piyango ile belirlenir</span>`}</div>`;
  html+=`<div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(240px,1fr)"><div>${UI.table([{k:'name',l:'Aday',f:p=>UI.pl(p)},{k:'pos',l:'Poz'},{k:'age',l:'Yaş',n:1},{k:'college',l:'Okul'},{k:'hgt',l:'Boy',n:1},
    {k:'so',l:'Güç (gözlem)',n:1,v:p=>sv(p).ovr,f:p=>{ const v=sv(p); return `${v.ovr} <span class="dim">±${v.range}</span>`; }},{k:'sp',l:'Potansiyel',n:1,v:p=>sv(p).pot,f:p=>'~'+sv(p).pot},{k:'sc',l:'Bilgi',n:1,v:p=>L.scoutAcc(S,p,S.user),f:p=>Math.round(L.scoutAcc(S,p,S.user)*100)+'%'},
    {k:'act',l:'',f:p=>(onClock?`<button class="btn sm pri" data-pick="${p.id}">Seç</button> `:'')+`<button class="btn sm" data-scout="${p.id}" ${pts>0?'':'disabled'}>Gözlemle</button>`}],pros,{id:'draft',sort:'sp',desc:true,pid:p=>p.id,h:'68vh'})}</div>
    <div class="card tight"><h3>${S.draftOrder?'Draft sırası':'Piyango oranları'}</h3>${S.draftOrder?`<div style="max-height:64vh;overflow:auto">${S.draftOrder.map((x,i)=>{ const done=D&&D.picks[i]; const p=done?P(S,done.pid):null; return `<div class="asset"${x.tid===S.user?' style="outline:1px solid var(--accent)"':''}><span>${x.pick}. ${UI.tm(S,x.tid)}${x.orig!==x.tid?' <span class="dim">('+S.teams[x.orig].abbr+')</span>':''}${L.isHuman(S,x.tid)&&(S.humans||[]).length>1?' 👤':''}</span><span>${p?U.esc(p.name):D&&i===D.idx&&!D.done?'<b class="warn">sırada</b>':''}</span></div>`; }).join('')}</div>`:`<p class="muted" style="font-size:13px">Playoff'a kalamayan 14 takım piyangoya girer; en kötü takımın 1. seçimi alma şansı %25. İlk 3 seçim çekilişle, kalanı ters sıralamayla belirlenir.</p>${R.lotteryOdds.map((v,i)=>`<div class="asset"><span>${i+1}. en kötü</span><span>%${(v/10).toFixed(1)}</span></div>`).join('')}`}</div></div>`;
  root.innerHTML=html;
  root.onclick=e=>{ const pk=e.target.closest('[data-pick]'), sc=e.target.closest('[data-scout]'), au=e.target.closest('[data-a="auto"]'), fo=e.target.closest('[data-a="force"]');
    if(sc){ run('scout',{pid:+sc.dataset.scout}); return; }
    if(fo){ run('draftForce',{}); return; }
    if(pk) run('draftPick',{pid:+pk.dataset.pick});
    if(au) run('draftAuto',{}); };
};

/* =================== LEAGUE =================== */
Sc.league=function(S,root,o){
  const tab=o.tab||'lead';
  let html=`<h1>Lig</h1>`+tabs('league',tab,[['lead','Liderler'],['stats','Tüm istatistikler'],['awards','Ödüller'],['hist','Tarihçe'],['legends','Efsaneler']]);
  if(tab==='lead'||tab==='stats'){
    const key=o.po?S.season+'p':S.season; const ps=Object.values(S.players).filter(p=>p.stats[key]&&p.stats[key].gp>=(o.po?1:Math.max(1,Math.min(20,Math.floor(S.teams[0].w+S.teams[0].l)/3))));
    html+=`<div class="row" style="margin-bottom:8px"><button class="btn sm${o.po?'':' tool on'}" data-go="league" data-tab="${tab}">Normal sezon</button><button class="btn sm${o.po?' tool on':''}" data-go="league" data-tab="${tab}" data-po="1">Playoff</button></div>`;
    if(tab==='lead'){ const cats=[['pts','Sayı'],['reb','Ribaund'],['ast','Asist'],['stl','Top çalma'],['blk','Blok'],['tpm','Üçlük'],['fgp','Saha içi %'],['min','Dakika']];
      const val=(p,k)=>{ const s=p.stats[key]; if(k==='reb') return (s.orb+s.drb)/s.gp; if(k==='fgp') return s.fga>=s.gp*5?s.fgm/s.fga:0; if(k==='min') return s.sec/60/s.gp; return s[k]/s.gp; };
      html+=`<div class="grid g4">${cats.map(([k,l])=>`<div class="card tight"><h3>${l}</h3>${ps.slice().sort((a,b)=>val(b,k)-val(a,k)).slice(0,8).map((p,i)=>`<div class="asset"><span>${i+1}. ${UI.pl(p)} <span class="dim">${S.teams[p.tid]?S.teams[p.tid].abbr:''}</span></span><b>${k==='fgp'?(val(p,k)*100).toFixed(1):val(p,k).toFixed(1)}</b></div>`).join('')||'<p class="dim">—</p>'}</div>`).join('')}</div>`; }
    else html+=statTable(S,ps,key,'lgst',[{k:'tm',l:'Takım',v:p=>p.tid,f:p=>UI.tm(S,p.tid)},{k:'pos',l:'Poz'}]);
  }
  if(tab==='awards'){ const ys=Object.keys(S.history.awards).sort((a,b)=>b-a); const nm=id=>{ if(id==null) return '—'; const p=P(S,id); if(p) return UI.pl(p); const r=(S.history.retired||[]).find(x=>x.id===id); return r?U.esc(r.name)+' <span class="dim">(emekli)</span>':'—'; };
    html+=ys.length?`<div class="tw" style="max-height:none"><table><tr><th>Sezon</th><th>Şampiyon</th><th>Final MVP</th><th>MVP</th><th>Savunma</th><th>Çaylak</th><th>6. adam</th><th>Gelişim</th></tr>${ys.map(y=>{ const a=S.history.awards[y]; return `<tr><td>${U.seasonName(+y)}</td><td>${a.champ!=null?UI.tm(S,a.champ):'—'}</td><td>${nm(a.fmvp)}</td><td>${nm(a.mvp)}</td><td>${nm(a.dpoy)}</td><td>${nm(a.roy)}</td><td>${nm(a.smoy)}</td><td>${nm(a.mip)}</td></tr>`; }).join('')}</table></div>`:'<p class="muted">Ödüller normal sezon sonunda verilir.</p>'; }
  if(tab==='hist'){ html+=S.history.seasons.length?S.history.seasons.slice().reverse().map(h=>{ const top=h.table.slice().sort((a,b)=>b.w-a.w).slice(0,4); const me=h.table.find(x=>x.tid===S.user); return `<div class="asset"><span><b>${U.seasonName(h.season)}</b> · Şampiyon: ${h.champ!=null?UI.tm(S,h.champ):'—'} · En iyi rekorlar: ${top.map(x=>S.teams[x.tid].abbr+' '+x.w+'-'+x.l).join(', ')}</span><span>Sen: ${me?me.w+'-'+me.l:'—'}</span></div>`; }).join(''):'<p class="muted">İlk sezon henüz bitmedi.</p>'; }
  if(tab==='legends'){ const r=(S.history.retired||[]).slice().sort((a,b)=>b.ovr-a.ovr); html+=r.length?UI.table([{k:'name',l:'Oyuncu'},{k:'pos',l:'Poz'},{k:'ovr',l:'En yüksek güç',n:1},{k:'season',l:'Emeklilik',n:1,f:x=>U.seasonName(x.season)}],r,{sort:'ovr',desc:true}):'<p class="muted">Henüz emekli efsane yok.</p>'; }
  root.innerHTML=html;
};

/* =================== CLUB (finance + board) =================== */
Sc.club=function(S,root){
  const t=S.teams[S.user], f=t.fin, b=t.board;
  root.innerHTML=`<h1>Kulüp ve yönetim</h1><div class="grid g4"><div class="card kpi"><span class="l">Kasa</span><span class="v ${f.cash<0?'bad':''}">${U.money(f.cash)}</span></div><div class="card kpi"><span class="l">Sezon geliri</span><span class="v good">${U.money(f.rev)}</span></div><div class="card kpi"><span class="l">Sezon gideri</span><span class="v bad">${U.money(f.exp)}</span></div><div class="card kpi"><span class="l">Son seyirci</span><span class="v">${t.lastAtt?t.lastAtt.toLocaleString('tr-TR'):'—'}</span></div></div>
  <div class="grid g2" style="margin-top:12px"><div class="card"><h3>Yönetim kurulu</h3><p>Hedef: <b>${U.esc(b.goal)}</b></p><div class="row"><span>Güven</span><div class="bar" style="flex:1"><i style="width:${b.conf}%;background:${b.conf<30?'var(--bad)':b.conf<55?'var(--warn)':'var(--good)'}"></i></div><b>%${Math.round(b.conf)}</b></div>
    <p class="muted" style="font-size:13px">Güven maç sonuçlarına (takım gücüne göre beklentiye), playoff'a ve şampiyonluğa göre değişir. Sezon sonunda %15'in altındaysa görevden alınırsın.</p></div>
    <div class="card"><h3>Bilet ve taraftar</h3><label>Ortalama bilet fiyatı: <b data-tv>${f.ticket} $</b><input type="range" min="20" max="160" value="${f.ticket}" data-ticket style="width:100%"></label><p class="muted" style="font-size:13px">Yüksek fiyat seyirciyi azaltır. Heyecan (galibiyetlerle artar): <b>%${Math.round(f.hype*100)}</b> · Pazar büyüklüğü: ${UI.stars(t.market)}</p></div></div>`;
  root.oninput=e=>{ if(e.target.dataset.ticket!=null) root.querySelector('[data-tv]').textContent=e.target.value+' $'; };
  root.onchange=e=>{ if(e.target.dataset.ticket!=null){ f.ticket=+e.target.value; run('ticket',{v:+e.target.value}); } };
};

/* =================== DATA (import / export / editor) =================== */
Sc.data=function(S,root){
  const can=A().canEdit();
  root.innerHTML=`<h1>Veri</h1><div class="grid g2"><div class="card"><h3>Dışa aktar</h3><p class="muted" style="font-size:14px">Ligi içe aktarma formatında (takımlar + oyuncular + sözleşmeler) JSON olarak indir. Dosyayı düzenleyip yeni bir kariyerde yükleyebilirsin.</p><div class="row"><button class="btn pri" data-a="exp">Lig verisini indir</button><button class="btn" data-a="save">Kayıt dosyasını indir</button></div></div>
    <div class="card"><h3>Editör modu</h3>${can?`<p class="muted" style="font-size:14px">Açıkken oyuncu profillerinde <b>✎ Düzenle</b> düğmesi çıkar: isim, yaş, pozisyon ve tüm özellikleri değiştirebilirsin.</p><label class="row"><input type="checkbox" data-a="editor" ${S.editor?'checked':''}> Editör modunu aç</label>`:'<p class="muted" style="font-size:14px">Çevrimiçi oyunda editörü yalnızca ev sahibi kullanabilir.</p>'}</div>
    <div class="card" style="grid-column:1/-1"><h3>Takım isimleri</h3><p class="muted" style="font-size:14px">Lig 2010 NBA yapısındadır (aynı şehirler, konferanslar, bölümler). ${can?'Takım adlarını, kısaltmalarını ve renklerini buradan değiştirebilirsin.':'Değişiklikleri ev sahibi yapabilir.'}</p>
      <div class="tw" style="max-height:50vh"><table><tr><th>Bölüm</th><th>Şehir</th><th>Takma ad</th><th>Kısaltma</th><th>Renk 1</th><th>Renk 2</th></tr>${S.teams.map(t=>`<tr><td class="dim">${t.conf} · ${t.div}</td><td><input type="text" data-tf="city" data-id="${t.id}" value="${U.esc(t.city)}" ${can?'':'disabled'}></td><td><input type="text" data-tf="name" data-id="${t.id}" value="${U.esc(t.name)}" ${can?'':'disabled'}></td><td><input type="text" data-tf="abbr" data-id="${t.id}" value="${U.esc(t.abbr)}" maxlength="4" style="width:64px" ${can?'':'disabled'}></td><td><input type="color" data-tf="c1" data-id="${t.id}" value="${t.c1}" ${can?'':'disabled'}></td><td><input type="color" data-tf="c2" data-id="${t.id}" value="${t.c2}" ${can?'':'disabled'}></td></tr>`).join('')}</table></div></div>
    <div class="card" style="grid-column:1/-1"><h3>İçe aktarma formatı</h3><p class="muted" style="font-size:14px">Yeni kariyer başlatırken (ana menü › Veri yükle) aşağıdaki biçimde JSON verebilirsin. Gerçek oyuncu verisini kendin hazırlayıp yükleyebilirsin; alanların hepsi isteğe bağlıdır. Özellikler 1–20 (ya da 0–100, otomatik çevrilir) ölçeğindedir.</p>
<textarea readonly>${U.esc(JSON.stringify(BM.App.importSample(),null,1))}</textarea></div></div>`;
  root.onclick=e=>{ const b=e.target.closest('button[data-a]'); if(!b) return; if(b.dataset.a==='exp') BM.App.download('basketballmanager-lig.json',JSON.stringify(BM.App.exportData(S),null,1)); if(b.dataset.a==='save') BM.App.download('basketballmanager-kayit.json',JSON.stringify(S)); };
  root.onchange=e=>{ if(e.target.dataset.a==='editor'){ run('editor',{on:e.target.checked}); return; } const k=e.target.dataset.tf; if(k) A().act('teamEdit',{tid:+e.target.dataset.id,k,v:e.target.value}).then(()=>A().renderTop()); };
};
})();
