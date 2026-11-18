/* BasketballManager — salary cap rules (2005 CBA as used in 2010-11, simplified where noted) */
(function(){
'use strict';
const BM=window.BM, U=BM.U, R=BM.RULES;
const C = BM.Cap = {};

C.salary=(p,season)=>{ const c=p&&p.contract; if(!c) return 0; const i=season-c.start; return i>=0&&i<c.amt.length?c.amt[i]:0; };
C.expires=p=>p.contract?p.contract.start+p.contract.amt.length-1:-1;
C.yearsLeft=(p,S)=>p.contract?Math.max(0,C.expires(p)-S.season+1):0;
C.payroll=(S,tid,season)=>{ season=season==null?S.season:season; const t=S.teams[tid]; let s=t.roster.reduce((a,id)=>a+C.salary(S.players[id],season),0); (t.dead||[]).forEach(d=>{ if(d.season===season) s+=d.amt; }); return s; };
C.room=(S,tid)=>S.cap-C.payroll(S,tid);
C.taxBill=(S,tid)=>Math.max(0,C.payroll(S,tid)-S.tax)*R.taxRate;
C.minFor=exp=>BM.Gen.minFor(exp);
C.maxFor=exp=>BM.Gen.maxFor(exp);
C.rosterCount=(S,tid)=>S.teams[tid].roster.length;
C.rosterLimit=S=>(S.phase==='regular'||S.phase==='playoffs')?R.rosterMax:R.offseasonMax;

/* Can team `tid` sign player p at first-year salary `first` for `years`?  Returns the cap mechanism used. */
C.canSign=function(S,tid,p,first,years,o){
  o=o||{}; const t=S.teams[tid];
  const rmax=C.rosterLimit(S); if(!o.extension&&t.roster.length>=rmax) return {ok:false,msg:'Kadro dolu (en fazla '+rmax+' oyuncu).'};
  const mn=C.minFor(p.exp), mx=C.maxFor(p.exp);
  if(first<mn) return {ok:false,msg:'Lig minimumunun altında ('+U.money(mn)+').'};
  if(first>mx) return {ok:false,msg:'Maksimum maaşın üstünde ('+U.money(mx)+').'};
  const own=p.tid===tid||(o.rights===tid);
  const birdMax=own&&p.bird>=3?R.maxYearsBird:R.maxYears;
  if(years>birdMax) return {ok:false,msg:'En fazla '+birdMax+' yıl verilebilir.'};
  if(o.rookie) return {ok:true,via:'rookie'};
  const pay=C.payroll(S,tid)-(o.extension?C.salary(p,S.season):0);
  if(own){
    const prev=C.salary(p,S.season)||(p.lastSalary||mn);
    if(p.bird>=3) return {ok:true,via:'bird',msg:'Tam Bird hakkı'};
    if(p.bird===2&&first<=Math.max(prev*1.75,5800000)) return {ok:true,via:'bird',msg:'Erken Bird hakkı'};
    if(first<=Math.max(prev*1.2,mn*1.2)) return {ok:true,via:'bird',msg:'Bird olmayan hak (önceki maaşın %120\'si)'};
  }
  if(pay+first<=S.cap) return {ok:true,via:'cap',msg:'Maaş tavanı altında boşluk'};
  if(first<=mn*1.0001&&years<=2) return {ok:true,via:'min',msg:'Minimum maaş istisnası'};
  if(t.ex.mle&&first<=S.mle&&years<=5) return {ok:true,via:'mle',msg:'Orta seviye istisnası (MLE)'};
  if(S.season-t.ex.baeYear>=2&&first<=S.bae&&years<=2) return {ok:true,via:'bae',msg:'İki yılda bir istisnası (BAE)'};
  return {ok:false,msg:'Tavan üstündesin ('+U.money(pay)+' / '+U.money(S.cap)+'). MLE '+(t.ex.mle?U.money(S.mle)+' kadar':'kullanıldı')+', BAE '+(S.season-t.ex.baeYear>=2?U.money(S.bae)+' kadar':'kullanılamaz')+', ya da minimum maaş.'};
};
C.useException=(S,tid,via)=>{ const t=S.teams[tid]; if(via==='mle') t.ex.mle=false; if(via==='bae') t.ex.baeYear=S.season; };

/* Trade legality: roster limits + salary matching for teams over the cap after the deal. */
C.tradeCheck=function(S,a,aOut,b,bOut){
  const sum=ids=>ids.reduce((s,id)=>s+C.salary(S.players[id],S.season),0);
  const out={ok:true,msgs:[]};
  [[a,aOut,bOut],[b,bOut,aOut]].forEach(([tid,give,get])=>{
    const t=S.teams[tid], O=sum(give), I=sum(get), after=C.payroll(S,tid)-O+I, size=t.roster.length-give.length+get.length;
    const rmax=C.rosterLimit(S); if(size>rmax&&size>t.roster.length){ out.ok=false; out.msgs.push(t.name+': kadro '+size+' kişiye çıkar (en fazla '+rmax+').'); }
    if(after>S.cap&&I>O*R.tradeMatch+R.tradeBuffer){ out.ok=false; out.msgs.push(t.name+': tavan üstünde, gelen maaş ('+U.money(I)+') giden maaşın %125 + 100 B$ sınırını ('+U.money(O*R.tradeMatch+R.tradeBuffer)+') aşıyor.'); }
  });
  return out;
};

C.sheet=function(S,tid){
  const t=S.teams[tid], seasons=[0,1,2,3,4].map(i=>S.season+i);
  const rows=t.roster.map(id=>S.players[id]).sort((x,y)=>C.salary(y,S.season)-C.salary(x,S.season)).map(p=>({p,amts:seasons.map(s=>C.salary(p,s))}));
  const totals=seasons.map(s=>C.payroll(S,tid,s));
  return {seasons,rows,totals};
};
C.rollover=function(S){ const g=1+R.capGrowth; S.cap=Math.round(S.cap*g/1000)*1000; S.tax=Math.round(S.tax*g/1000)*1000; S.minPayroll=Math.round(S.minPayroll*g/1000)*1000; S.mle=Math.round(S.mle*g/1000)*1000; S.bae=Math.round(S.bae*g/1000)*1000; S.teams.forEach(t=>{ t.ex.mle=true; t.dead=(t.dead||[]).filter(d=>d.season>=S.season); }); };
})();
