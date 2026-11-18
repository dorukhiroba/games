/* BasketballManager — generators: players, league, free agents, draft classes, picks */
(function(){
'use strict';
const BM=window.BM, U=BM.U, R=BM.RULES;
const G = BM.Gen = {};
let nid=1;
G.setId=n=>{ nid=n; };
G.nextId=()=>nid++;

G.ovr=function(p){ const w=BM.OVRW[p.pos]; let s=0,t=0; for(const k in w){ s+=p.r[k]*w[k]; t+=w[k]; } return Math.round(U.clamp(25+(s/t)*3.6,30,99)); };
G.name=function(used){ for(let i=0;i<60;i++){ const n=U.pick(BM.FIRST)+' '+U.pick(BM.LAST); if(!used.has(n)){ used.add(n); return n; } } const n=U.pick(BM.FIRST)+' '+U.pick(BM.LAST)+' II'; used.add(n); return n; };
G.potFor=function(age,ovr){ const g=age<=19?U.rnd(6,24):age<=21?U.rnd(4,18):age<=23?U.rnd(2,12):age<=25?U.rnd(0,6):age<=27?U.rnd(0,2):0; return Math.min(99,Math.round(ovr+g)); };

G.player=function(o){
  const pos=o.pos||U.pick(BM.POS), T=BM.TPL[pos], r={};
  for(const k of BM.AKEYS){ const b=T[k]!=null?T[k]:10; r[k]=U.clamp(b+U.gauss()*2.4,1,20); }
  r.cons=U.clamp(10+U.gauss()*3,1,20); r.work=U.clamp(11+U.gauss()*3.5,1,20); r.sta=U.clamp(r.sta+U.gauss(),5,20);
  // one or two specialities so players feel different
  const spec=U.shuffle(Object.keys(BM.OVRW[pos])).slice(0,U.rint(1,2)); spec.forEach(k=>{ r[k]=U.clamp(r[k]+U.rnd(2,5),1,20); });
  const hg=BM.HGT[pos], age=o.age!=null?o.age:U.rint(21,32);
  const p={id:G.nextId(),name:G.name(o.used||new Set()),pos,age,hgt:U.rint(hg[0],hg[1]),r,ovr:0,pot:0,tid:o.tid!=null?o.tid:-1,gl:false,
    exp:o.exp!=null?o.exp:Math.max(0,age-U.rint(19,23)),bird:0,contract:null,mood:70,inj:null,stats:{},hist:[],draft:o.draft||null,
    college:U.pick(BM.COLLEGES),num:0,prom:null,ovrHist:[]};
  p.wgt=Math.round(p.hgt*0.52-5+U.rnd(-6,8));
  if(o.target){ const keys=Object.keys(BM.OVRW[pos]);
    for(let it=0;it<14;it++){ const d=o.target-G.ovr(p); if(Math.abs(d)<0.6) break; const st=d/3.6; keys.forEach(k=>{ p.r[k]=U.clamp(p.r[k]+st,1,20); }); } }
  for(const k in p.r) p.r[k]=Math.round(p.r[k]*10)/10;
  p.ovr=G.ovr(p); p.pot=o.pot!=null?Math.max(p.ovr,o.pot):G.potFor(age,p.ovr);
  return p;
};

/* market value -> salary for a new deal */
G.maxFor=exp=>{ const cap=BM.S?BM.S.cap:R.cap; return Math.round(cap*(exp>=10?R.maxPct[2]:exp>=7?R.maxPct[1]:R.maxPct[0])); };
G.minFor=exp=>{ const g=BM.S?BM.S.cap/R.cap:1; return Math.round(R.minScale[Math.min(10,exp)]*g); };
G.value=function(p){ let v=p.ovr; if(p.age<25) v+=(p.pot-p.ovr)*0.35; if(p.age>30) v-=(p.age-30)*1.6; return v; };
G.salaryFor=function(p){ const v=G.value(p), mn=G.minFor(p.exp), mx=G.maxFor(p.exp); if(v<52) return mn; const k=Math.pow(U.clamp((v-52)/36,0,1),1.8); return Math.round((mn+(mx-mn)*k)/10000)*10000; };
G.contract=function(start,first,years,bird,opt){ const amt=[]; const raise=bird?R.raiseBird:R.raise; for(let i=0;i<years;i++) amt.push(Math.round(first*(1+raise*i)/1000)*1000); return {start,amt,opt:opt||null,rookie:false}; };
G.rookieContract=function(start,pick){ const g=BM.S?BM.S.cap/R.cap:1; const base=Math.round(R.rookieScale[Math.min(29,pick-1)]*g); return {start,amt:[0,1,2,3].map(i=>Math.round(base*(1+0.05*i))),opt:'team',rookie:true}; };

G.autoRotation=function(t,S){
  const ps=t.roster.map(id=>S.players[id]).filter(p=>p&&!p.gl&&!(p.inj&&p.inj.days>0)).sort((a,b)=>b.ovr-a.ovr);
  const starters=[]; BM.POS.forEach(pos=>{ const c=ps.find(p=>p.pos===pos&&!starters.includes(p)); if(c) starters.push(c); });
  ps.forEach(p=>{ if(starters.length<5&&!starters.includes(p)) starters.push(p); });
  const bench=ps.filter(p=>!starters.includes(p));
  const order=starters.concat(bench).map(p=>p.id), mins={}; const plan=[34,32,32,31,30,22,18,14,10,8,6,3,0,0,0];
  order.forEach((id,i)=>{ mins[id]=plan[i]||0; });
  t.rot={order,mins,auto:true};
};

G.team=function(t0,i){
  return {id:i,conf:t0[0],div:t0[1],city:t0[2],name:t0[3],abbr:t0[4],market:t0[5],c1:t0[6],c2:t0[7],power:t0[8],
    glName:t0[3]+' Gelişim',roster:[],rot:null,
    tac:{plays:{pnr:U.rint(2,4),horns:U.rint(1,3),motion:U.rint(1,3),iso:U.rint(0,2),post:U.rint(0,2),flex:U.rint(0,2),spain:U.rint(0,2),dho:U.rint(0,2)},def:U.pick(['man','man','man','man','switch','switch','z23','z32']),pnrD:U.pick(['drop','drop','hedge','blitz']),pace:U.pick([0.9,1,1,1,1.12]),three:U.pick([0.75,1,1,1.3]),press:Math.random()<0.06},
    fin:{cash:Math.round(6e6+t0[5]*4e6),rev:0,exp:0,ticket:Math.round(45+t0[5]*12),hype:U.clamp(t0[8]+0.1,0.1,0.95),pop:0.3+t0[5]*0.12},
    board:{conf:70,goal:t0[8]>0.62?'Şampiyonluk yarışı':t0[8]>0.45?'Playoff':'Gelişim ve play-in hedefi'},
    strat:t0[8]>0.6?'contend':t0[8]<0.36?'rebuild':'mid',ex:{mle:true,baeYear:-9},
    w:0,l:0,hw:0,hl:0,cw:0,cl:0,dw:0,dl:0,streak:0,last10:[],pf:0,pa:0};
};

G.league=function(S){
  const used=new Set(); S.players={}; S.teams=BM.TEAMS0.map((t0,i)=>G.team(t0,i));
  const POSLIST=['PG','SG','SF','PF','C','PG','SG','SF','PF','C','SG','SF','PF','PG'];
  S.teams.forEach(t=>{
    const base=62.5+t.power*15, nums=new Set();
    const targets=[base+11+U.rnd(-2,5),base+U.rnd(-1,5),base+U.rnd(-2,4),base+U.rnd(-3,3),base+U.rnd(-4,3),base-2+U.rnd(-3,3),base-5+U.rnd(-3,3),base-7+U.rnd(-3,3),base-9+U.rnd(-3,3),base-11+U.rnd(-3,3),base-13+U.rnd(-3,3),base-15+U.rnd(-3,3),base-16+U.rnd(-3,3),base-18+U.rnd(-3,3)];
    if(t.power>0.62) targets[1]+=5; // contenders have a second star
    const starIdx=U.rint(0,4); [targets[0],targets[starIdx]]=[targets[starIdx],targets[0]];
    POSLIST.forEach((pos,k)=>{
      const young=k>=11||(k>=8&&Math.random()<0.4); const age=young?U.rint(19,23):k===starIdx?U.rint(23,31):U.rint(22,34);
      const p=G.player({pos,age,target:Math.round(targets[k]),tid:t.id,used});
      let n; do{ n=U.rint(0,55); }while(nums.has(n)); nums.add(n); p.num=n;
      if(young&&p.exp<=3&&Math.random()<0.75){ const pick=U.rint(1,30); p.exp=Math.min(p.exp,3); const start=R.firstSeason-p.exp; p.contract=G.rookieContract(start,pick); p.draft={year:start,rnd:1,pick,tid:t.id}; if(p.contract.amt.length-(R.firstSeason-start)<1) p.contract=G.contract(R.firstSeason,G.salaryFor(p),2,false); }
      else { const yrs=p.age>=33?U.rint(1,2):p.age>=29?U.rint(1,4):U.rint(1,5); p.contract=G.contract(R.firstSeason,G.salaryFor(p),yrs,false); }
      p.bird=Math.min(p.exp,U.rint(0,4)); S.players[p.id]=p; t.roster.push(p.id);
    });
    // payroll toward a realistic 2010 band (contenders spend more)
    const pay=()=>t.roster.reduce((s,id)=>s+BM.Cap.salary(S.players[id],R.firstSeason),0);
    const target=R.cap*(0.86+t.power*0.55);
    for(let it=0;it<3;it++){ const k=U.clamp(target/Math.max(1,pay()),0.7,1.4);
      t.roster.forEach(id=>{ const p=S.players[id]; if(p.contract.rookie) return; const mn=G.minFor(p.exp), mx=G.maxFor(p.exp); p.contract.amt=p.contract.amt.map(a=>U.clamp(Math.round(a*k/1000)*1000,mn,mx)); }); }
    // the two youngest go to the development affiliate
    t.roster.map(id=>S.players[id]).filter(p=>p.exp<=2&&p.age<=22).sort((a,b)=>a.ovr-b.ovr).slice(0,2).forEach(p=>{ p.gl=true; });
    G.autoRotation(t,S);
  });
  // free agents left over from the 2010 market
  for(let i=0;i<48;i++){ const p=G.player({age:U.rint(22,36),target:U.rint(44,69),tid:-1,used}); p.contract=null; S.players[p.id]=p; }
  // draft picks for the next four drafts
  S.picks=[]; for(let y=R.firstSeason+1;y<=R.firstSeason+4;y++) S.teams.forEach(t=>{ [1,2].forEach(rd=>S.picks.push({season:y,round:rd,orig:t.id,owner:t.id})); });
  G.draftClass(S,R.firstSeason+1,used);
};

G.draftClass=function(S,year,used){
  used=used||new Set(Object.values(S.players).map(p=>p.name));
  for(let i=0;i<72;i++){
    const age=U.rint(19,22), tier=Math.random();
    const target=Math.round(tier<0.08?U.rnd(58,64):tier<0.35?U.rnd(50,58):U.rnd(40,51));
    const p=G.player({age,target,tid:-2,used,exp:0});
    p.pot=Math.min(99,Math.round(p.ovr+(age<=19?U.rnd(10,30):age<=20?U.rnd(8,24):U.rnd(4,16))));
    p.draftYear=year; p.scout=U.rnd(0.25,0.55); p.college=age<=19&&Math.random()<0.3?'Uluslararası':U.pick(BM.COLLEGES); S.players[p.id]=p;
  }
};
})();
