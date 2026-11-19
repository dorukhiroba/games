/* BasketballManager — transfer market: contract talks, free agency, trades (valuation, counters, AI offers), waivers */
(function(){
'use strict';
const BM=window.BM, U=BM.U, R=BM.RULES;
const M = BM.Market = {};
const Cap=()=>BM.Cap, Gen=()=>BM.Gen, L=()=>BM.League;

M.teamStrength=function(S,tid){ const t=S.teams[tid]; const top=t.roster.map(id=>S.players[id]).filter(p=>!p.gl).map(p=>p.ovr).sort((a,b)=>b-a).slice(0,8); const avg=top.reduce((a,v)=>a+v,0)/Math.max(1,top.length); return U.clamp((avg-56)/22,0,1); };
M.roleOf=function(S,p,tid){ const ps=S.teams[tid].roster.map(id=>S.players[id]).filter(x=>!x.gl&&x.id!==p.id).map(x=>x.ovr).sort((a,b)=>b-a); const rank=ps.filter(o=>o>p.ovr).length; return rank<5?'starter':rank<9?'rotation':'bench'; };
M.ROLES={starter:'İlk beş',rotation:'Rotasyon',bench:'Yedek'};

/* ---------- what a player asks this team for ---------- */
M.demand=function(S,p,tid){
  const base=Gen().salaryFor(p), str=M.teamStrength(S,tid), t=S.teams[tid];
  let k=1; if(p.age>=30) k-=str*0.12; k+=(3-t.market)*0.02; if(p.rights===tid||p.tid===tid) k-=0.04;
  const years=p.age<=24?U.clamp(3+(p.id%3),3,5):p.age<=29?4:p.age<=32?2:1;
  return {salary:U.clamp(Math.round(base*k/10000)*10000,Gen().minFor(p.exp),Gen().maxFor(p.exp)),years,role:M.roleOf(S,p,tid)};
};
M.startTalk=function(S,p,tid,ext){
  if(p.lock&&p.lock.tid===tid&&p.lock.until>S.day) return {err:p.name+' şu an seninle görüşmek istemiyor ('+Math.ceil(p.lock.until-S.day)+' gün).'};
  const d=M.demand(S,p,tid); (p.talks=p.talks||{})[tid]={tid,ask:d.salary,years:d.years,role:d.role,patience:100,round:0,ext:!!ext}; p.talk=null; return {talk:p.talks[tid]};
};
/* offer {salary, years, role} -> {status:'accept'|'counter'|'walk', msg, counter} */
M.offer=function(S,p,o){
  const tk=p.talks&&p.talks[S.user]; if(!tk) return {status:'walk',msg:'"Görüşmemiz bitti."'}; tk.round++;
  const want={starter:3,rotation:2,bench:1}, roleGap=want[o.role]-want[tk.role];
  let sc=o.salary/tk.ask - Math.abs(o.years-tk.years)*0.03 + roleGap*0.05 + (p.mood-70)/1000;
  const mood=sc>=0.97?'accept':null;
  if(mood){ return {status:'accept',msg:'"Anlaştık. Bu şartlar beni mutlu eder."'}; }
  tk.patience-=Math.round((1-sc)*70+8);
  if(tk.patience<=0){ p.lock={tid:tk.tid,until:S.day+10}; delete p.talks[S.user]; return {status:'walk',msg:'"Bu teklifler ciddi değil. Menajerim görüşmeleri kesiyor."'}; }
  tk.ask=Math.round(Math.max(o.salary,tk.ask*(1-0.02*tk.round))/10000)*10000;
  const lines=sc>0.9?'"Yakınız. Biraz daha gelirseniz imzalarım."':sc>0.75?'"Bu rakam beklentimin altında."':'"Bu teklif değerimi yansıtmıyor."';
  return {status:'counter',msg:lines+(roleGap<0?' Ayrıca daha fazla süre istiyorum ('+M.ROLES[tk.role]+').':''),counter:{salary:tk.ask,years:tk.years,role:tk.role}};
};
M.sign=function(S,p,tid,salary,years,via,o){
  o=o||{}; const t=S.teams[tid], own=p.rights===tid||p.tid===tid, ext=o.ext&&p.tid===tid;
  const start=ext?Cap().expires(p)+1:((S.phase==='post'&&!S.skipRollover)?S.season+1:S.season);
  const c=Gen().contract(start,salary,years,own&&p.bird>=2);
  if(ext){ const old=p.contract; const keep=old.amt.slice(0,start-old.start); p.contract={start:old.start,amt:keep.concat(c.amt),opt:null,rookie:false}; }
  else { p.contract=c; if(!own) p.bird=0; if(p.tid!==tid){ if(p.tid>=0){ const ot=S.teams[p.tid]; ot.roster=ot.roster.filter(id=>id!==p.id); } t.roster.push(p.id); } p.tid=tid; p.gl=false; }
  Cap().useException(S,tid,via); p.rights=null; p.talk=null; p.talks=null; p.offers=null; p.decide=null; p.prom=o.role||null; p.mood=U.clamp(p.mood+5,0,100);
  if(!t.rot||t.rot.auto) Gen().autoRotation(t,S); else { t.rot.order.push(p.id); t.rot.mins[p.id]=0; }
  return true;
};

/* ---------- free agency ---------- */
M.freeAgents=S=>Object.values(S.players).filter(p=>p.tid===-1);
M.userOffer=function(S,p,o,tid){ if(tid==null) tid=S.user; const chk=Cap().canSign(S,tid,p,o.salary,o.years,{rights:p.rights}); if(!chk.ok) return {err:chk.msg};
  p.offers=(p.offers||[]).filter(x=>x.tid!==tid); p.offers.push({tid,salary:o.salary,years:o.years,via:chk.via,role:o.role,day:S.day}); if(p.decide==null) p.decide=S.day+U.rint(1,3); return {ok:true,via:chk.via,msg:chk.msg}; };
function utility(S,p,of){ const str=M.teamStrength(S,of.tid); const roleB={starter:1.06,rotation:1,bench:0.94}[of.role||M.roleOf(S,p,of.tid)]||1; return of.salary*Math.pow(of.years,p.age>29?0.35:0.15)*(1+str*(p.age>28?0.25:0.1))*roleB*(of.tid===p.rights?1.04:1); }
M.daily=function(S){
  const ph=S.phase, open=ph==='fa'||ph==='camp'||ph==='regular'||ph==='post';
  if(!open) return;
  const fas=M.freeAgents(S);
  if(ph!=='post'){
    // AI teams bid on free agents
    const rmax=Cap().rosterLimit(S); S.teams.forEach(t=>{ if(L().isHuman(S,t.id)) return; const room=S.cap-Cap().payroll(S,t.id), rich=ph!=='regular'&&room>2500000;
      if(t.roster.length>=Math.min(rmax,ph==='regular'?R.rosterMax:rich?18:16)) return; const busy=ph==='regular'?0.04:rich?0.55:0.3; if(Math.random()>busy) return;
      const need=t.roster.length<R.rosterMin;
      const cands=fas.filter(p=>!(p.offers||[]).some(o=>o.tid===t.id)).sort((a,b)=>Gen().value(b)-Gen().value(a)).slice(0,12);
      const pay=Cap().payroll(S,t.id), over=U.clamp((S.minPayroll-pay)/S.minPayroll,0,0.6);
      for(const p of cands){ const d=M.demand(S,p,t.id); let sal=Math.round(Math.min(Gen().maxFor(p.exp),d.salary*U.rnd(0.85,1.05)*(1+over))/10000)*10000; const yrs=d.years;
        let chk=Cap().canSign(S,t.id,p,sal,yrs,{rights:p.rights}); if(!chk.ok){ sal=Gen().minFor(p.exp); chk=Cap().canSign(S,t.id,p,sal,Math.min(2,yrs),{}); if(!chk.ok||(!need&&p.ovr<52)) continue; }
        p.offers=(p.offers||[]); p.offers.push({tid:t.id,salary:sal,years:chk.via==='min'?Math.min(2,yrs):yrs,via:chk.via,day:S.day}); if(p.decide==null) p.decide=S.day+U.rint(2,5); break; } });
  }
  // players decide
  fas.forEach(p=>{
    if(p.pendingMatch){ if(S.day>=p.pendingMatch.until){ const of=p.pendingMatch; p.pendingMatch=null; M.resolveMatch(S,p,false,of); } return; }
    if(!p.offers||!p.offers.length||p.decide==null||S.day<p.decide) return;
    const valid=p.offers.filter(of=>Cap().canSign(S,of.tid,p,of.salary,of.years,{rights:p.rights}).ok);
    if(!valid.length){ p.offers=null; p.decide=null; return; }
    const best=valid.sort((a,b)=>utility(S,p,b)-utility(S,p,a))[0], lost=p.offers.filter(o=>o.tid!==best.tid&&L().isHuman(S,o.tid));
    // restricted free agent: the old team may match any outside offer sheet
    if(p.rfa&&p.rights!=null&&p.rights>=0&&best.tid!==p.rights){
      const rt=p.rights;
      if(L().isHuman(S,rt)){ p.pendingMatch=Object.assign({},best,{until:S.day+3}); p.decide=null;
        L().tell(S,rt,'Teklif eşleştirme: '+p.name,'<p>Kısıtlı serbest oyuncun <b>'+p.name+'</b>, '+L().tname(S,best.tid)+' ile teklif kağıdı imzaladı: <b>'+best.years+' yıl, ilk yıl '+U.money(best.salary)+'</b>.</p><p>3 gün içinde eşleştirirsen Bird hakkınla sende kalır; eşleştirmezsen gider.</p>','contract',{rfa:p.id,stop:true}); return; }
      const chk=Cap().canSign(S,rt,p,best.salary,best.years,{rights:rt});
      if(chk.ok&&M.pval(S,p,rt)>Math.pow(Math.max(0,M.demand(S,p,rt).salary/1e6*1.8+20),1.6)&&Math.random()<0.75){ p.offers=null; M.sign(S,p,rt,best.salary,best.years,chk.via);
        if(L().isHuman(S,best.tid)) L().tell(S,best.tid,p.name+' eşleştirildi','<p>'+L().tname(S,rt)+' teklifini eşleştirdi; '+p.name+' takımında kaldı.</p>','contract'); return; }
    }
    M.sign(S,p,best.tid,best.salary,best.years,best.via,{role:best.role});
    if(L().isHuman(S,best.tid)) L().tell(S,best.tid,'İmza: '+p.name,'<p>'+p.name+' teklifini kabul etti: '+best.years+' yıl, ilk yıl '+U.money(best.salary)+' ('+viaName(best.via)+').</p>','contract');
    lost.forEach(o=>L().tell(S,o.tid,p.name+' başka takımı seçti','<p>'+p.name+', '+L().tname(S,best.tid)+' ile '+best.years+' yıl / '+U.money(best.salary)+' anlaştı. Senin teklifin: '+U.money(o.salary)+'.</p>','contract'));
    if(p.ovr>=68||L().isHuman(S,best.tid)) L().news(S,'Transfer: '+p.name+' → '+S.teams[best.tid].abbr,'<p>'+p.name+' ('+p.ovr+') '+L().tname(S,best.tid)+' ile '+best.years+' yıl / '+U.money(best.salary)+' imzaladı.</p>','league');
  });
  // trade market
  if(L().tradeOpen(S)&&(ph==='regular'||ph==='fa')){ L().humans(S).forEach(tid=>{ if(Math.random()<0.06) M.aiOfferTo(S,tid); }); if(Math.random()<0.05) M.aiTrade(S); }
};
M.resolveMatch=function(S,p,match,of){ of=of||p.pendingMatch; if(!of) return; p.pendingMatch=null; const rt=p.rights;
  if(match){ const chk=Cap().canSign(S,rt,p,of.salary,of.years,{rights:rt}); if(!chk.ok){ p.pendingMatch=of; return {err:chk.msg}; } M.sign(S,p,rt,of.salary,of.years,chk.via);
    L().tell(S,rt,p.name+' eşleştirildi','<p>Teklifi eşleştirdin: '+p.name+' '+of.years+' yıl / '+U.money(of.salary)+' ile takımında.</p>','contract');
    if(L().isHuman(S,of.tid)) L().tell(S,of.tid,p.name+' eşleştirildi','<p>'+L().tname(S,rt)+' teklif kağıdını eşleştirdi; '+p.name+' eski takımında kaldı.</p>','contract'); return {ok:true}; }
  const chk=Cap().canSign(S,of.tid,p,of.salary,of.years,{}); if(chk.ok){ M.sign(S,p,of.tid,of.salary,of.years,chk.via); L().tell(S,rt,p.name+' ayrıldı','<p>'+p.name+', '+L().tname(S,of.tid)+' ile '+of.years+' yıl / '+U.money(of.salary)+' anlaştı.</p>','contract');
    if(L().isHuman(S,of.tid)) L().tell(S,of.tid,'İmza: '+p.name,'<p>Teklif kağıdın eşleştirilmedi: '+p.name+' artık senin oyuncun.</p>','contract'); } else { p.rfa=false; p.offers=null; p.decide=null; }
  return {ok:true}; };
/* monthly: promised roles vs. reality, morale drift, transfer requests */
M.moodCheck=function(S){ L().humans(S).forEach(tid=>moodTeam(S,S.teams[tid])); };
function moodTeam(S,t){
  t.roster.forEach(id=>{ const p=S.players[id], st=p.stats[S.season]; if(!st||st.gp<6) return; const mpg=st.sec/60/st.gp, gsr=st.gs/st.gp;
    let d=(t.w/(t.w+t.l||1)-0.5)*6+1;
    if(p.prom==='starter'&&gsr<0.6){ d-=9; } else if(p.prom==='rotation'&&mpg<16){ d-=7; } else if(!p.prom&&p.ovr>=68&&mpg<20){ d-=5; }
    if(p.mood<70&&d>0) d+=1; p.mood=U.clamp(Math.round(p.mood+d),0,100);
    if(p.mood<28&&!p.wantsOut){ p.wantsOut=true; L().tell(S,t.id,p.name+' transfer istiyor','<p>'+p.name+' rolünden memnun değil (moral %'+p.mood+'). Ya daha çok süre ver ya da takas için değerlendir.</p>','squad'); }
    if(p.mood>=45&&p.wantsOut){ p.wantsOut=false; }
  }); }
const viaName=v=>({cap:'tavan boşluğu',mle:'MLE',bae:'BAE',min:'minimum',bird:'Bird hakkı',rookie:'çaylak ölçeği'})[v]||v;
M.viaName=viaName;
M.fillRosters=function(S){
  const trim=S.day>=U.day(S.season,...R.dates.seasonStart);
  S.teams.forEach(t=>{ if(L().isHuman(S,t.id)) return;
    while(trim&&t.roster.length>R.rosterMax){ const w=t.roster.map(id=>S.players[id]).sort((a,b)=>Gen().value(a)-Gen().value(b))[0]; M.release(S,w.id,true); }
    let guard=0; while(t.roster.length<R.rosterMin&&guard++<6){ const p=M.freeAgents(S).sort((a,b)=>Gen().value(b)-Gen().value(a))[0]; if(!p) break; M.sign(S,p,t.id,Gen().minFor(p.exp),1,'min'); }
    if(trim){ const ps=t.roster.map(id=>S.players[id]); ps.forEach(p=>{ p.gl=false; }); ps.filter(p=>p.exp<=2&&p.age<=23).sort((a,b)=>a.ovr-b.ovr).slice(0,2).forEach(p=>{ if(t.roster.length-ps.filter(x=>x.gl).length>12) p.gl=true; }); }
    Gen().autoRotation(t,S); });
  L().humans(S).forEach(tid=>{ const u=S.teams[tid]; if(u.roster.length<R.rosterMin) L().tell(S,tid,'Kadro eksik','<p>Kadronda '+u.roster.length+' oyuncu var; en az '+R.rosterMin+' gerekli. Serbest oyunculardan minimum maaşla tamamlayabilirsin.</p>','contract'); });
};
M.release=function(S,pid,silent){ const p=S.players[pid], t=S.teams[p.tid]; if(!t) return;
  for(let y=S.season;y<=Cap().expires(p);y++){ const a=Cap().salary(p,y); if(a>0) (t.dead=t.dead||[]).push({season:y,amt:a,name:p.name}); }
  t.roster=t.roster.filter(id=>id!==pid); if(t.rot){ t.rot.order=t.rot.order.filter(id=>id!==pid); delete t.rot.mins[pid]; }
  p.tid=-1; p.contract=null; p.gl=false; p.rights=null; p.bird=0;
  if(!silent&&L().isHuman(S,t.id)) L().tell(S,t.id,'Serbest bırakıldı: '+p.name,'<p>'+p.name+' serbest bırakıldı. Kalan maaşı ölü para olarak bordronda kalır.</p>','contract'); };
M.aiResign=function(S,t,p){ const v=Gen().value(p); const pay0=Cap().payroll(S,t.id); if(p.age>=34||v<56||Math.random()<(pay0<S.cap*0.85?0.12:0.35)) return false; const sal=Gen().salaryFor(p); if(Cap().payroll(S,t.id)+sal>S.tax*1.12&&v<72) return false; const yrs=p.age<=27?4:p.age<=31?3:1;
  const c=Gen().contract(S.season,sal,yrs,p.bird>=2); p.contract=c; return true; };

/* ---------- trades ---------- */
M.pval=function(S,p,tid){
  const t=S.teams[tid]; const age=p.age; let v=Math.pow(Math.max(0,p.ovr-40),2);
  v*=age<=24?1.05:age<=29?1:age<=31?0.85:age<=33?0.65:0.45;
  if(age<=24) v+=Math.pow(Math.max(0,p.pot-p.ovr),1.5)*4;
  const fair=Gen().salaryFor(p); let surplus=0; for(let i=0;i<Cap().yearsLeft(p,S);i++) surplus+=(fair-Cap().salary(p,S.season+i))*Math.pow(0.9,i);
  v+=surplus/1e6*9;
  if(t.strat==='rebuild') v*=age<=25?1.2:0.7; if(t.strat==='contend') v*=p.ovr>=70?1.15:0.9;
  return Math.max(0,v);
};
M.pickKey=pk=>pk.season+'-'+pk.round+'-'+pk.orig;
M.findPick=(S,k)=>S.picks.find(p=>M.pickKey(p)===k);
M.pickVal=function(S,pk,tid){ if(!pk) return 0; const str=S.teams[pk.orig].power, pos=1+str*29, ahead=pk.season-(S.season+1);
  let v=pk.round===1?1300*Math.pow(1-(pos-1)/31,1.6)+160:60; v*=Math.pow(0.86,Math.max(0,ahead)); if(S.teams[tid].strat==='rebuild') v*=1.25; if(S.teams[tid].strat==='contend') v*=0.75; return v; };
M.assetVal=(S,a,tid)=>a.pid!=null?M.pval(S,S.players[a.pid],tid):M.pickVal(S,M.findPick(S,a.pick),tid);
/* deal = {tid (AI team), give:[assets user gives], get:[assets user gets]}, asset = {pid} | {pick: pick key 'season-round-orig'} */
M.evalTrade=function(S,deal){
  const from=deal.from!=null?deal.from:S.user; const legal=Cap().tradeCheck(S,from,deal.give.filter(a=>a.pid!=null).map(a=>a.pid),deal.tid,deal.get.filter(a=>a.pid!=null).map(a=>a.pid));
  const inV=deal.give.reduce((s,a)=>s+M.assetVal(S,a,deal.tid),0), outV=deal.get.reduce((s,a)=>s+M.assetVal(S,a,deal.tid),0);
  const need=outV*1.06+40; return {legal,inV,outV,need,ok:legal.ok&&inV>=need&&(deal.give.length+deal.get.length)>0};
};
M.counter=function(S,deal){
  const ev=M.evalTrade(S,deal); if(ev.ok) return {deal,msg:'Bu haliyle kabul ederler.'};
  const gap=ev.need-ev.inV;
  const from=deal.from!=null?deal.from:S.user; const mine=S.teams[from].roster.filter(id=>!deal.give.some(a=>a.pid===id)).map(id=>({pid:id})).concat(S.picks.filter(p=>p.owner===from).map(p=>M.pickKey(p)).filter(k=>!deal.give.some(a=>a.pick===k)).map(k=>({pick:k})));
  const cands=mine.map(a=>({a,v:M.assetVal(S,a,deal.tid)})).filter(x=>x.v>0).sort((x,y)=>x.v-y.v);
  const fit=cands.find(x=>x.v>=gap)||cands[cands.length-1];
  if(fit){ const d2={from,tid:deal.tid,give:deal.give.concat([fit.a]),get:deal.get.slice()}; if(M.evalTrade(S,d2).legal.ok) return {deal:d2,msg:'"'+assetName(S,fit.a)+' de eklenirse anlaşırız."'}; }
  const theirs=deal.get.map(a=>({a,v:M.assetVal(S,a,deal.tid)})).sort((x,y)=>y.v-x.v);
  for(const x of theirs){ const d2={from,tid:deal.tid,give:deal.give.slice(),get:deal.get.filter(g=>g!==x.a)}; if(d2.get.length&&M.evalTrade(S,d2).ok) return {deal:d2,msg:'"'+assetName(S,x.a)+' bu takasta olmaz; geri kalanı tamam."'}; }
  return {deal:null,msg:'"Bu takas bizim için mantıklı değil."'};
};
const assetName=(S,a)=>a.pid!=null?S.players[a.pid].name:pickName(S,M.findPick(S,a.pick));
const pickName=(S,p)=>p?p.season+' '+p.round+'. tur ('+S.teams[p.orig].abbr+')':'(geçersiz seçim)';
M.assetName=assetName; M.pickName=pickName;
M.execute=function(S,deal,quiet){
  const from=deal.from!=null?deal.from:S.user, A=S.teams[from], B=S.teams[deal.tid];
  const gs=deal.give.map(a=>assetName(S,a)).join(', '), gt=deal.get.map(a=>assetName(S,a)).join(', ');
  const move=(a,from,to)=>{ if(a.pid!=null){ const p=S.players[a.pid]; from.roster=from.roster.filter(id=>id!==p.id); to.roster.push(p.id); p.tid=to.id; p.gl=false; p.bird=0; p.mood=U.clamp(p.mood-5,0,100); } else { const pk=M.findPick(S,a.pick); if(pk) pk.owner=to.id; } };
  deal.give.forEach(a=>move(a,A,B)); deal.get.forEach(a=>move(a,B,A));
  [A,B].forEach(t=>{ if(!L().isHuman(S,t.id)||!t.rot||t.rot.auto) Gen().autoRotation(t,S); else { t.rot.order=t.rot.order.filter(id=>t.roster.includes(id)); t.roster.forEach(id=>{ if(!t.rot.order.includes(id)){ t.rot.order.push(id); t.rot.mins[id]=0; } }); } });
  if(!quiet){ L().tell(S,from,'Takas tamamlandı: '+B.abbr,'<p>Giden: '+gs+'<br>Gelen: '+gt+'</p>','trade'); if(L().isHuman(S,B.id)) L().tell(S,B.id,'Takas tamamlandı: '+A.abbr,'<p>Giden: '+gt+'<br>Gelen: '+gs+'</p>','trade');
    L().news(S,'Takas: '+A.abbr+' ↔ '+B.abbr,'<p>'+L().tname(S,A.id)+' alır: '+gt+'<br>'+L().tname(S,B.id)+' alır: '+gs+'</p>','league',{not:[from,B.id]}); }
};
M.aiOfferTo=function(S,tid){
  const U0=S.teams[tid]; const targets=U0.roster.map(id=>S.players[id]).filter(p=>p.ovr>=60&&!p.gl); if(!targets.length) return;
  const want=U.pick(targets), ai=U.pick(S.teams.filter(t=>!L().isHuman(S,t.id))), wv=M.pval(S,want,ai.id);
  const pool=ai.roster.map(id=>S.players[id]).filter(p=>!p.gl).sort((a,b)=>M.pval(S,b,tid)-M.pval(S,a,tid));
  const get=[]; let gv=0; for(const p of pool){ if(gv>=wv*0.95) break; const v=M.pval(S,p,ai.id); if(v<=wv*1.05){ get.push({pid:p.id}); gv+=v; } if(get.length>=2) break; }
  if(!get.length) return; const deal={from:tid,tid:ai.id,give:[{pid:want.id}],get};
  if(!Cap().tradeCheck(S,tid,[want.id],ai.id,get.map(a=>a.pid)).ok) return;
  if(!M.evalTrade(S,deal).ok) return;
  const id='t'+Date.now().toString(36)+Math.floor(Math.random()*999); S.tradeOffers.push({id,deal,day:S.day,to:tid});
  L().tell(S,tid,'Takas teklifi: '+ai.city+' '+ai.name,'<p>'+L().tname(S,ai.id)+', <b>'+want.name+'</b> için şunu öneriyor: '+get.map(a=>assetName(S,a)).join(', ')+'.</p>','trade',{offer:id});
};
M.aiOfferToUser=S=>M.aiOfferTo(S,S.user);
M.aiTrade=function(S){
  const ts=U.shuffle(S.teams.filter(t=>!L().isHuman(S,t.id))).slice(0,2); const [a,b]=ts; if(!a||!b) return;
  const pa=U.pick(a.roster.map(id=>S.players[id]).filter(p=>!p.gl)), pb=U.pick(b.roster.map(id=>S.players[id]).filter(p=>!p.gl)); if(!pa||!pb) return;
  const va=M.pval(S,pa,b.id), vb=M.pval(S,pb,a.id); if(Math.abs(va-vb)>Math.max(va,vb)*0.15) return;
  if(!Cap().tradeCheck(S,a.id,[pa.id],b.id,[pb.id]).ok) return;
  a.roster=a.roster.filter(id=>id!==pa.id); b.roster=b.roster.filter(id=>id!==pb.id); a.roster.push(pb.id); b.roster.push(pa.id); pa.tid=b.id; pb.tid=a.id; pa.bird=0; pb.bird=0;
  Gen().autoRotation(a,S); Gen().autoRotation(b,S);
  if(pa.ovr>=66||pb.ovr>=66) L().news(S,'Lig takası: '+a.abbr+' ↔ '+b.abbr,'<p>'+pa.name+' '+L().tname(S,b.id)+'\'ye, '+pb.name+' '+L().tname(S,a.id)+'\'ye gitti.</p>','league');
};
})();
