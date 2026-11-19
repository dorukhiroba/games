/* BasketballManager — every change a manager makes goes through these handlers.
   Single player runs them directly; online, guests send them to the host, which runs them for the
   guest's team and syncs the result back. Handlers validate everything because guests are remote. */
(function(){
'use strict';
const BM=window.BM, U=BM.U, R=BM.RULES;
const C=()=>BM.Cap, L=()=>BM.League, M=()=>BM.Market, G=()=>BM.Gen, T=()=>BM.Tactics;
const A = BM.Actions = {};
const H = {};
A.HOST_ONLY=new Set(['editPlayer','teamEdit','editor','draftForce','releaseHuman']);
A.run=function(S,tid,type,p){
  const f=H[type]; if(!f) return {err:'Bilinmeyen işlem: '+type};
  const prev=S.user; let r=null; S.user=tid;
  try{ r=f(S,tid,p||{})||{ok:true}; }catch(e){ console.error(e); r={err:'Hata: '+e.message}; }
  finally{ S.user=(r&&r.newTid!=null&&prev===tid)?r.newTid:prev; }
  return r;
};
const mine=(S,tid,pid)=>{ const p=S.players[pid]; return p&&p.tid===tid?p:null; };
const num=(v,a,b,d)=>{ v=+v; return isFinite(v)?U.clamp(v,a,b):d; };
const asset=a=>a&&a.pid!=null?{pid:+a.pid}:a&&a.pick!=null?{pick:String(a.pick)}:null;
const cleanDeal=d=>({tid:+d.tid,give:(d.give||[]).map(asset).filter(Boolean).slice(0,12),get:(d.get||[]).map(asset).filter(Boolean).slice(0,12)});
A.cleanDeal=cleanDeal;

/* trade legality from the point of view of team `from` */
A.validDeal=function(S,from,d){
  if(!BM.League.tradeOpen(S)) return 'Takas dönemi kapalı.';
  if(d.tid===from||!S.teams[d.tid]) return 'Geçersiz takım.';
  if(!d.give.length&&!d.get.length) return 'Takasa bir şey ekle.';
  for(const a of d.give){ if(a.pid!=null&&(S.players[a.pid]||{}).tid!==from) return 'Takastaki oyunculardan biri artık takımında değil.'; if(a.pick&&(M().findPick(S,a.pick)||{}).owner!==from) return 'Draft hakkı artık sende değil.'; }
  for(const a of d.get){ if(a.pid!=null&&(S.players[a.pid]||{}).tid!==d.tid) return 'Karşı takımın oyuncusu artık orada değil.'; if(a.pick&&(M().findPick(S,a.pick)||{}).owner!==d.tid) return 'Karşı takımın draft hakkı değişmiş.'; }
  const chk=C().tradeCheck(S,from,d.give.filter(a=>a.pid!=null).map(a=>a.pid),d.tid,d.get.filter(a=>a.pid!=null).map(a=>a.pid));
  return chk.ok?null:chk.msgs.join(' ');
};
A.jobOffers=(S,tid)=>S.teams.filter(t=>t.id!==tid&&!L().isHuman(S,t.id)).sort((a,b)=>a.power-b.power).slice(0,3);
/* a human that is away: the host keeps their club legal so the league can move on */
A.autoFix=function(S,tid){ const t=S.teams[tid];
  while(t.roster.length>R.rosterMax){ const w=t.roster.map(id=>S.players[id]).sort((a,b)=>G().value(a)-G().value(b))[0]; M().release(S,w.id,true); }
  H.fillMin(S,tid,{}); if(S.phase==='draft'&&S.draft&&!S.draft.done&&S.draftOrder[S.draft.idx].tid===tid) H.draftAuto(S,tid,{});
};

/* ---------- squad ---------- */
H.tactics=(S,tid,p)=>{ const tac=S.teams[tid].tac, x=p.tac||{};
  if(x.plays&&typeof x.plays==='object'){ const ids=new Set(T().allPlays(S).map(q=>q.id)); Object.keys(x.plays).forEach(id=>{ if(ids.has(id)) tac.plays[id]=Math.round(num(x.plays[id],0,5,0)); }); }
  if(x.def&&T().allDefs(S).some(d=>d.id===x.def)) tac.def=x.def;
  if(['drop','hedge','blitz'].includes(x.pnrD)) tac.pnrD=x.pnrD;
  if([0.9,1,1.12].includes(+x.pace)) tac.pace=+x.pace;
  if([0.75,1,1.3].includes(+x.three)) tac.three=+x.three;
  if(x.press!=null) tac.press=!!x.press;
  if(['balanced','offense','defense','physical'].includes(x.training)) tac.training=x.training;
  BM.Engine.clearCache(); };
H.rotation=(S,tid,p)=>{ const t=S.teams[tid], r=p.rot||{}; if(r.auto){ G().autoRotation(t,S); return; }
  const order=(r.order||[]).map(Number).filter((id,i,a)=>t.roster.includes(id)&&a.indexOf(id)===i); t.roster.forEach(id=>{ if(!order.includes(id)) order.push(id); });
  const mins={}; order.forEach(id=>{ mins[id]=Math.round(num((r.mins||{})[id],0,48,0)); }); t.rot={order,mins,auto:false}; };
H.gl=(S,tid,p)=>{ const pl=mine(S,tid,p.pid), t=S.teams[tid]; if(!pl) return {err:'Oyuncu takımında değil.'};
  if(p.on){ if(pl.exp>3) return {err:'Yalnızca ilk 3 sezonundaki oyuncular gönderilebilir.'}; if(t.roster.filter(id=>S.players[id].gl).length>=R.glMax) return {err:'Gelişim Ligi kontenjanı dolu ('+R.glMax+').'}; }
  pl.gl=!!p.on; if(!t.rot||t.rot.auto) G().autoRotation(t,S); else { t.rot.order=t.rot.order.filter(id=>id!==pl.id); if(!pl.gl){ t.rot.order.push(pl.id); t.rot.mins[pl.id]=0; } }
  L().tell(S,tid,(pl.gl?'Gelişim Ligi\'ne gönderildi: ':'Geri çağrıldı: ')+pl.name,'<p>'+pl.name+(pl.gl?' '+t.glName+' takımında süre alacak.':' NBA kadrosuna döndü.')+'</p>','squad',{quiet:true}); };
H.release=(S,tid,p)=>{ const pl=mine(S,tid,p.pid); if(!pl) return {err:'Oyuncu takımında değil.'}; M().release(S,pl.id); };
H.ticket=(S,tid,p)=>{ S.teams[tid].fin.ticket=Math.round(num(p.v,20,160,60)); };
H.fillMin=(S,tid)=>{ const t=S.teams[tid]; let n=0;
  while(t.roster.length<R.rosterMin&&n<8){ const pl=M().freeAgents(S).sort((a,b)=>G().value(b)-G().value(a))[0]; if(!pl) break; M().sign(S,pl,tid,G().minFor(pl.exp),1,'min'); L().tell(S,tid,'İmza: '+pl.name,'<p>'+pl.name+' 1 yıllık minimum sözleşme imzaladı.</p>','contract',{quiet:true}); n++; }
  return {ok:true,n}; };

/* ---------- playbook ---------- */
const pt=v=>[Math.round(num(v&&v[0],-25,25,0)*10)/10,Math.round(num(v&&v[1],0,47,20)*10)/10];
const role=v=>Math.round(num(v,1,5,1));
H.savePlay=(S,tid,p)=>{ const q=p.play||{}; const id=/^c[a-z0-9]{3,14}$/.test(q.id)?q.id:'c'+Date.now().toString(36);
  const own=(S.customPlays||[]).find(x=>x.id===id); if(own&&own.own!=null&&own.own!==tid) return {err:'Bu set başka bir menajere ait.'};
  if(!Array.isArray(q.spots)||q.spots.length!==5) return {err:'Set geçersiz.'};
  const steps=(q.steps||[]).slice(0,16).map(s=>{ const o={t:num(s.t,0.3,3,1)}; if(Array.isArray(s.mv)) o.mv=s.mv.slice(0,5).map(m=>[role(m[0]),pt(m[1])]); if(s.scr) o.scr=[role(s.scr[0]),role(s.scr[1])]; if(s.pass) o.pass=[role(s.pass[0]),role(s.pass[1])]; if(s.shot) o.shot=role(s.shot); return o; });
  if(!steps.some(s=>s.shot)) steps.push({t:0.6,shot:1});
  const play={id,name:String(q.name||'Set').slice(0,28),desc:'Kendi çizdiğin set.',spots:q.spots.map(pt),steps,custom:true,own:tid};
  S.customPlays=(S.customPlays||[]).filter(x=>x.id!==id).concat([play]);
  const tac=S.teams[tid].tac; if(tac.plays[id]==null) tac.plays[id]=2; BM.Engine.clearCache(); return {ok:true,id}; };
H.deletePlay=(S,tid,p)=>{ const pl=(S.customPlays||[]).find(x=>x.id===p.id); if(!pl||(pl.own!=null&&pl.own!==tid)) return {err:'Set bulunamadı.'};
  S.customPlays=S.customPlays.filter(x=>x!==pl); S.teams.forEach(t=>{ delete t.tac.plays[pl.id]; }); BM.Engine.clearCache(); };
H.saveDef=(S,tid,p)=>{ const q=p.def||{}; const id=/^d[a-z0-9]{3,14}$/.test(q.id)?q.id:'d'+Date.now().toString(36);
  const own=(S.customDefs||[]).find(x=>x.id===id); if(own&&own.own!=null&&own.own!==tid) return {err:'Bu savunma başka bir menajere ait.'};
  if(!Array.isArray(q.spots)||q.spots.length!==5) return {err:'Savunma geçersiz.'};
  const d={id,name:String(q.name||'Savunma').slice(0,28),type:'zone',custom:true,own:tid,desc:'Kendi çizdiğin alan savunması.',spots:q.spots.map(pt)};
  S.customDefs=(S.customDefs||[]).filter(x=>x.id!==id).concat([d]); return {ok:true,id}; };

/* ---------- contracts ---------- */
H.talkStart=(S,tid,p)=>{ const pl=S.players[p.pid]; if(!pl) return {err:'Oyuncu bulunamadı.'};
  if(p.ext){ if(pl.tid!==tid) return {err:'Oyuncu takımında değil.'}; if(C().yearsLeft(pl,S)>1||pl.pendingStart) return {err:'Uzatma yalnızca sözleşmesinin son yılındaki oyuncularla yapılır.'}; }
  else { if(pl.tid!==-1) return {err:pl.name+' serbest oyuncu değil.'}; if(S.phase==='predraft'||(S.phase==='post'&&S.skipRollover)) return {err:'Serbest oyuncu görüşmeleri 1 Temmuz\'da başlar.'}; if(pl.pendingMatch) return {err:pl.name+' için eşleştirme kararı bekleniyor.'}; }
  const st=M().startTalk(S,pl,tid,!!p.ext); if(st.err) return st; return {talk:Object.assign({},st.talk)}; };
H.talkOffer=(S,tid,p)=>{ const pl=S.players[p.pid]; const tk=pl&&pl.talks&&pl.talks[tid]; if(!tk) return {err:'Görüşme sona ermiş.'};
  const ext=!!tk.ext; if(ext?pl.tid!==tid:pl.tid!==-1){ delete pl.talks[tid]; return {err:pl.name+' artık müsait değil.'}; }
  const salary=Math.round(num(p.salary,0,1e9,0)/10000)*10000, years=Math.round(num(p.years,1,R.maxYearsBird,1)), rl=M().ROLES[p.role]?p.role:'bench';
  const chk=C().canSign(S,tid,pl,salary,years,{rights:pl.rights,extension:ext}); if(!chk.ok) return {err:chk.msg};
  const r=M().offer(S,pl,{salary,years,role:rl});
  if(r.status==='accept'){
    if(ext){ M().sign(S,pl,tid,salary,years,chk.via,{ext:true,role:rl}); L().tell(S,tid,'Uzatma: '+pl.name,'<p>'+pl.name+' sözleşmesini '+years+' yıl uzattı (ilk yıl '+U.money(salary)+').</p>','contract',{quiet:true}); return {status:'signed',msg:r.msg}; }
    const others=(pl.offers||[]).filter(x=>x.tid!==tid), sheet=!!(pl.rfa&&pl.rights!=null&&pl.rights!==tid);
    const res=M().userOffer(S,pl,{salary,years,role:rl},tid); if(res.err) return {err:res.err}; if(pl.talks) delete pl.talks[tid];
    if(!others.length&&!sheet){ M().sign(S,pl,tid,salary,years,res.via,{role:rl}); L().tell(S,tid,'İmza: '+pl.name,'<p>'+pl.name+' ile '+years+' yıl, ilk yıl '+U.money(salary)+' ('+M().viaName(res.via)+') anlaştın.</p>','contract',{quiet:true});
      L().news(S,'Transfer: '+pl.name+' → '+S.teams[tid].abbr,'<p>'+pl.name+' ('+pl.ovr+') '+L().tname(S,tid)+' ile '+years+' yıl / '+U.money(salary)+' imzaladı.</p>','league',{not:[tid]}); return {status:'signed',msg:r.msg}; }
    return {status:'pending',msg:r.msg,n:others.length,sheet}; }
  return {status:r.status,msg:r.msg,talk:pl.talks&&pl.talks[tid]?Object.assign({},pl.talks[tid]):null}; };
H.talkEnd=(S,tid,p)=>{ const pl=S.players[p.pid]; if(pl&&pl.talks) delete pl.talks[tid]; };
H.rfa=(S,tid,p)=>{ const pl=S.players[p.pid]; if(!pl||!pl.pendingMatch||pl.rights!==tid) return {err:'Bu karar artık verildi.'}; return M().resolveMatch(S,pl,!!p.match)||{ok:true}; };

/* ---------- trades ---------- */
const counterOut=c=>c.deal?{tid:c.deal.tid,give:c.deal.give,get:c.deal.get}:null;
H.tradePropose=(S,tid,p)=>{ const d=cleanDeal(p.deal||{}); d.from=tid; if(L().isHuman(S,d.tid)) return {err:'Bu takımı bir menajer yönetiyor; teklifini ona gönder.'};
  const err=A.validDeal(S,tid,d); if(err) return {err};
  const ev=M().evalTrade(S,d); if(ev.ok){ M().execute(S,d); return {done:true}; }
  const c=M().counter(S,d); return {done:false,msg:c.msg,counter:counterOut(c)}; };
H.tradeAsk=(S,tid,p)=>{ const d=cleanDeal(p.deal||{}); d.from=tid; if(L().isHuman(S,d.tid)) return {err:'Menajerlerle pazarlığı teklif göndererek yaparsın.'}; const c=M().counter(S,d); return {msg:c.msg,counter:counterOut(c)}; };
H.tradeOfferHuman=(S,tid,p)=>{ const d=cleanDeal(p.deal||{}); d.from=tid; if(!L().isHuman(S,d.tid)) return {err:'Bu takım bir menajere ait değil.'};
  const err=A.validDeal(S,tid,d); if(err) return {err};
  if(S.tradeOffers.filter(x=>x.by===tid&&x.to===d.tid).length>=3) return {err:'Bu menajere bekleyen en fazla 3 teklifin olabilir.'};
  const id='h'+Date.now().toString(36)+Math.floor(Math.random()*999), me=L().human(S,tid);
  S.tradeOffers.push({id,to:d.tid,by:tid,human:true,day:S.day,note:String(p.note||'').slice(0,140),deal:{from:d.tid,tid,give:d.get,get:d.give}});
  const nm=a=>M().assetName(S,a);
  L().tell(S,d.tid,'Takas teklifi: '+(me?me.name:'Menajer')+' ('+S.teams[tid].abbr+')','<p><b>'+U.esc(me?me.name:'')+'</b> ('+L().tname(S,tid)+') teklif gönderdi.</p><p>Sen verirsin: '+d.get.map(nm).join(', ')+'<br>Sen alırsın: '+d.give.map(nm).join(', ')+'</p>'+(p.note?'<p class="muted">"'+U.esc(String(p.note).slice(0,140))+'"</p>':''),'trade',{offer:id,stop:true});
  return {ok:true}; };
const findOffer=(S,tid,id)=>S.tradeOffers.find(x=>x.id===id&&(x.to==null||x.to===tid));
H.offerAccept=(S,tid,p)=>{ const of=findOffer(S,tid,p.id); if(!of) return {err:'Teklif artık geçerli değil.'};
  const err=A.validDeal(S,tid,Object.assign({},of.deal,{from:tid})); if(err) return {err};
  M().execute(S,Object.assign({},of.deal,{from:tid})); S.tradeOffers=S.tradeOffers.filter(x=>x!==of);
  if(of.human) L().tell(S,of.by,'Takas kabul edildi','<p>'+L().tname(S,tid)+' teklifini kabul etti.</p>','trade'); return {ok:true}; };
H.offerReject=(S,tid,p)=>{ const of=findOffer(S,tid,p.id); if(!of) return {err:'Teklif bulunamadı.'}; S.tradeOffers=S.tradeOffers.filter(x=>x!==of);
  if(of.human) L().tell(S,of.by,'Takas reddedildi','<p>'+L().tname(S,tid)+' teklifini reddetti.</p>','trade'); };
H.offerCancel=(S,tid,p)=>{ const of=S.tradeOffers.find(x=>x.id===p.id&&x.by===tid); if(!of) return {err:'Teklif bulunamadı.'}; S.tradeOffers=S.tradeOffers.filter(x=>x!==of); };

/* ---------- draft ---------- */
const onClock=(S,tid)=>{ const D=S.draft; if(!(S.phase==='draft'&&D&&!D.done)) return false; const slot=S.draftOrder[D.idx]; return !!slot&&slot.tid===tid; };
H.draftPick=(S,tid,p)=>{ if(!onClock(S,tid)) return {err:'Sıra sende değil.'}; const pl=S.players[p.pid]; if(!pl||!L().prospects(S).includes(pl)) return {err:'Aday bulunamadı.'}; L().draftPick(S,pl.id); };
H.draftAuto=(S,tid)=>{ if(!onClock(S,tid)) return {err:'Sıra sende değil.'};
  const best=L().prospects(S).slice().sort((a,b)=>{ const x=L().scoutVal(S,a,tid), y=L().scoutVal(S,b,tid); return (y.ovr+(y.pot-y.ovr)*0.55)-(x.ovr+(x.pot-x.ovr)*0.55); })[0];
  if(!best) return {err:'Aday kalmadı.'}; L().draftPick(S,best.id); return {ok:true,pid:best.id}; };
H.draftForce=(S)=>{ const D=S.draft; if(!(S.phase==='draft'&&D&&!D.done)) return {err:'Draft açık değil.'}; const slot=S.draftOrder[D.idx]; return H.draftAuto(S,slot.tid,{}); };
H.scout=(S,tid,p)=>{ const pl=S.players[p.pid]; if(!pl||pl.tid!==-2) return {err:'Aday bulunamadı.'}; const pts=L().scoutPts(S,tid); if(pts<=0) return {err:'Gözlem puanın yok. Her pazartesi 3 puan gelir.'};
  S.scout=S.scout||{}; S.scout[tid]=pts-1; (pl.sc=pl.sc||{})[tid]=Math.min(0.97,L().scoutAcc(S,pl,tid)+0.2); };

/* ---------- career ---------- */
H.takeJob=(S,tid,p)=>{ const h=L().human(S,tid); if(!h||!h.fired) return {err:'Şu an iş teklifin yok.'}; const nt=+p.tid;
  if(!A.jobOffers(S,tid).some(t=>t.id===nt)) return {err:'Bu kulüp artık müsait değil.'};
  h.tid=nt; h.fired=false; S.scout[nt]=L().scoutPts(S,tid); const t=S.teams[nt]; t.board.conf=55; G().autoRotation(t,S);
  L().tell(S,nt,'Yeni görev: '+L().tname(S,nt),'<p>'+L().tname(S,nt)+' seni yeni menajeri olarak açıkladı. Hedef: <b>'+t.board.goal+'</b>.</p>','board');
  L().news(S,'Menajer değişikliği: '+t.abbr,'<p>'+U.esc(h.name)+' artık '+L().tname(S,nt)+' takımını çalıştırıyor.</p>','league',{not:[nt]}); return {ok:true,newTid:nt}; };
H.quitCareer=(S,tid)=>{ if((S.humans||[]).length<=1) return {err:'Tek menajer kariyeri bırakamaz; ana menüden silebilirsin.'}; const h=L().human(S,tid); S.humans=S.humans.filter(x=>x!==h);
  L().news(S,'Menajer ayrıldı','<p>'+U.esc(h?h.name:'Menajer')+' ligden ayrıldı; '+L().tname(S,tid)+' artık yapay zekâda.</p>','league'); G().autoRotation(S.teams[tid],S); return {ok:true,left:true}; };

/* ---------- host / editor ---------- */
H.editor=(S,tid,p)=>{ S.editor=!!p.on; };
H.editPlayer=(S,tid,p)=>{ const pl=S.players[p.pid]; if(!pl) return {err:'Oyuncu bulunamadı.'}; const d=p.data||{};
  if(d.name) pl.name=String(d.name).slice(0,40); if(BM.POS.includes(d.pos)) pl.pos=d.pos; ['age','hgt','pot','num'].forEach(k=>{ if(d[k]!=null&&isFinite(+d[k])) pl[k]=Math.round(+d[k]); });
  if(d.r) BM.AKEYS.forEach(k=>{ if(d.r[k]!=null) pl.r[k]=num(d.r[k],1,20,pl.r[k]); }); pl.ovr=G().ovr(pl); pl.pot=Math.max(pl.ovr,pl.pot); };
H.teamEdit=(S,tid,p)=>{ const t=S.teams[+p.tid]; if(!t||!['city','name','abbr','c1','c2'].includes(p.k)) return {err:'Geçersiz alan.'}; const v=String(p.v||'').slice(0,p.k==='abbr'?4:30); if(!v) return; t[p.k]=v; if(p.k==='name') t.glName=t.name+' Gelişim'; };
H.releaseHuman=(S,tid,p)=>{ const h=L().human(S,+p.tid); if(!h) return {err:'Menajer bulunamadı.'}; if(h.tid===tid) return {err:'Kendi takımını bırakamazsın.'}; return H.quitCareer(S,h.tid); };
A.H=H;
})();
