/* BasketballManager — season loop: calendar, schedule, standings, stats, playoffs, awards, lottery, draft,
   finances, board, development and the yearly rollover. */
(function(){
'use strict';
const BM=window.BM, U=BM.U, R=BM.RULES, C=()=>BM.Cap, G=()=>BM.Gen;
const L = BM.League = {};
const D=(S,m,d,next)=>U.day(S.season+(next?1:0),m,d);

L.create=function(userTid,manager,o){
  o=o||{}; BM.Gen.setId(1);
  const S={v:2,cid:'k'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),season:R.firstSeason,day:U.day(R.firstSeason,7,1),phase:'fa',user:userTid,manager:manager||'Menajer',
    humans:[{tid:userTid,name:manager||'Menajer',cid:o.cid||null}],scout:{},
    cap:R.cap,tax:R.tax,minPayroll:R.minPayroll,mle:R.mle,bae:R.bae,teams:[],players:{},picks:[],games:[],news:[],
    history:{champs:[],awards:{},seasons:[]},customPlays:[],customDefs:[],fa:{offers:[]},tradeOffers:[],playoffs:null,draft:null,lottery:null,boxes:[]};
  BM.S=S; BM.Gen.league(S); S.idSeq=Object.keys(S.players).reduce((m,k)=>Math.max(m,+k),0)+1;
  Object.values(S.players).forEach(p=>{ p.ovrStart=p.ovr; });
  L.schedule(S);
  const start=o.start||'draft';
  if(start==='draft') L.preDraftStart(S);
  S.scout[userTid]=start==='draft'?6:3;
  L.news(S,'Maaş tavanı açıklandı',`<p>${U.seasonName(S.season)} sezonu: tavan <b>${U.money(S.cap)}</b>, lüks vergi sınırı <b>${U.money(S.tax)}</b>, minimum bordro ${U.money(S.minPayroll)}. MLE ${U.money(S.mle)}, BAE ${U.money(S.bae)}.</p>`,'league');
  if(start==='late') L.fastForward(S,U.day(R.firstSeason,8,26));
  L.welcome(S,userTid);
  return S;
};
/* career that opens before the 2010 draft: 2009-10 records, the 2010 class, lottery already drawn */
L.preDraftStart=function(S){
  const Y=R.firstSeason; S.day=U.day(Y,6,1); S.phase='predraft'; S.initialDraft=true;
  S.teams.forEach(t=>{ const w=U.clamp(Math.round(t.power*82+U.rnd(-1.5,1.5)),12,66); t.prev={w,l:82-w}; });
  const used=new Set(Object.values(S.players).map(p=>p.name)); BM.Gen.setId(S.idSeq); BM.Gen.draftClass(S,Y,used); S.idSeq=BM.Gen.nextId();
  S.teams.forEach(t=>[1,2].forEach(rd=>S.picks.push({season:Y,round:rd,orig:t.id,owner:t.id})));
  const pct=t=>t.prev.w/82, seeds=['E','W'].flatMap(cf=>S.teams.filter(t=>t.conf===cf).sort((a,b)=>pct(b)-pct(a)).slice(0,8));
  const champ=S.teams.find(t=>t.abbr==='LAW')||seeds[0], ru=S.teams.find(t=>t.abbr==='BOS')||seeds[1];
  S.history.seasons.push({season:Y-1,table:S.teams.map(t=>({tid:t.id,w:t.prev.w,l:t.prev.l})),champ:champ.id});
  S.history.champs.push({season:Y-1,tid:champ.id,ru:ru.id}); (S.history.awards[Y-1]={}).champ=champ.id;
  L.news(S,U.seasonName(Y-1)+' sezonu tamamlandı','<p>Şampiyon <b>'+L.tname(S,champ.id)+'</b>, finalde '+L.tname(S,ru.id)+' yenildi. Lig şimdi 24 Haziran\'daki '+Y+' draftına hazırlanıyor.</p>','league');
  L.lottery(S,{year:Y,rec:pct,inP:new Set(seeds.map(t=>t.id))});
};
L.fastForward=function(S,day){ let g=0; while(S.day<day&&g++<400) L.endDay(S); };
L.welcome=function(S,tid){ const t=S.teams[tid], h=L.human(S,tid)||{name:S.manager};
  const when={predraft:'Takvim: <b>24 Haziran</b> draft, <b>1 Temmuz</b> serbest oyuncu dönemi, <b>1 Ekim</b> hazırlık kampı, <b>26 Ekim</b> sezon başlangıcı. Draft ekranından adayları gözlemleyerek başla.',fa:'Serbest oyuncu dönemi açık. Kadroyu toparla, Taktik ekranında setlerini çiz; 1 Ekim\'de kamp, 26 Ekim\'de sezon başlıyor.',camp:'Hazırlık kampı sürüyor; sezon 26 Ekim\'de başlıyor.',regular:'Sezon devam ediyor.'}[S.phase]||'';
  L.tell(S,tid,'Yönetim kurulundan hoş geldin','<p>'+U.esc(h.name)+', '+t.city+' '+t.name+' ailesine hoş geldin. Kurulun beklentisi: <b>'+t.board.goal+'</b>.</p><p>'+when+'</p>','board'); };
/* older saves and online hosting both go through this */
L.migrate=function(S){ if(!S.humans||!S.humans.length) S.humans=[{tid:S.user,name:S.manager||'Menajer',cid:null}]; if(!S.scout){ S.scout={}; S.humans.forEach(h=>{ S.scout[h.tid]=S.scoutPts!=null?S.scoutPts:3; }); }
  if(!S.cid) S.cid='k'+Date.now().toString(36); if(!S.customDefs) S.customDefs=[]; S.v=2; return S; };
L.news=function(S,title,body,type,extra){ S.news.unshift(Object.assign({id:'n'+(S.nid=(S.nid||0)+1),day:S.day,title,body,type:type||'info',read:false},extra||{})); if(S.news.length>160) S.news.length=160; };
L.team=(S,tid)=>S.teams[tid];
L.tname=(S,tid)=>{ const t=S.teams[tid]; return t?t.city+' '+t.name:'—'; };
L.humans=S=>S.humans&&S.humans.length?S.humans.map(h=>h.tid):[S.user];
L.isHuman=(S,tid)=>tid!=null&&tid>=0&&L.humans(S).includes(tid);
L.human=(S,tid)=>(S.humans||[]).find(h=>h.tid===tid);
L.tell=(S,tid,title,body,type,extra)=>L.news(S,title,body,type,Object.assign({to:tid},extra||{}));
L.draftYear=S=>S.initialDraft?S.season:S.season+1;

/* ---------- schedule: 82 games (division 4x4, conference 6x4 + 4x3, other conference 15x2) ---------- */
L.schedule=function(S){
  const T=S.teams, list=[], add=(h,a,n)=>{ for(let k=0;k<n;k++) list.push([h,a]); };
  for(let i=0;i<30;i++) for(let j=i+1;j<30;j++){ const a=T[i], b=T[j];
    if(a.conf!==b.conf){ add(i,j,1); add(j,i,1); continue; }
    if(a.div===b.div){ add(i,j,2); add(j,i,2); continue; }
    // same conference, other division: 6 opponents x4 and 4 opponents x3 for everyone, 41 home games each
    const divs=[...new Set(T.filter(t=>t.conf===a.conf).map(t=>t.div))]; let A=a, B=b; if(divs.indexOf(a.div)>divs.indexOf(b.div)){ A=b; B=a; }
    const ia=T.filter(t=>t.div===A.div).indexOf(A), ib=T.filter(t=>t.div===B.div).indexOf(B), d=((ib-ia)%5+5)%5;
    if(d===0){ add(A.id,B.id,2); add(B.id,A.id,1); } else if(d===1){ add(B.id,A.id,2); add(A.id,B.id,1); } else { add(A.id,B.id,2); add(B.id,A.id,2); }
  }
  U.shuffle(list);
  const start=D(S,...R.dates.seasonStart), end=D(S,...R.dates.seasonEnd,true); const days=end-start+1; const per=list.length/(days+3);
  S.games=[]; let gid=1; let rem=list; let day=start;
  while(rem.length&&day<=end+40){ const busy=new Set(); const keep=[]; let c=0; const wd=U.ymd(day).w; const left=end-day+1; const need=rem.length/Math.max(1,left); const quota=Math.min(15,Math.max(1,Math.round(Math.max(per,need)*(wd===5||wd===6?1.25:wd===1||wd===4?0.85:1)*U.rnd(0.8,1.2))));
    for(const g of rem){ if(c<quota&&!busy.has(g[0])&&!busy.has(g[1])){ busy.add(g[0]); busy.add(g[1]); S.games.push({id:gid++,day,h:g[0],a:g[1],hs:0,as:0,played:false}); c++; } else keep.push(g); }
    rem=keep; day++; }
  S.lastDay=Math.max(...S.games.map(g=>g.day));
};

L.standings=function(S,conf){ return S.teams.filter(t=>!conf||t.conf===conf).slice().sort((a,b)=>(b.w/(b.w+b.l||1))-(a.w/(a.w+a.l||1))||(b.w-a.w)||(b.pf-b.pa)-(a.pf-a.pa)); };
L.gb=(lead,t)=>((lead.w-t.w)+(t.l-lead.l))/2;
L.today=S=>S.games.filter(g=>g.day===S.day&&!g.played);
L.userGameToday=(S,tid)=>{ if(tid==null) tid=S.user; if(S.phase==='playoffs'){ const s=(S.playoffs&&S.playoffs.series||[]).find(x=>!x.done&&(x.a===tid||x.b===tid)&&x.next===S.day&&x.round===S.playoffs.round); if(!s) return null; const n=s.wa+s.wb, home=[0,1,4,6].includes(n)?s.a:s.b; return {po:true,series:s,h:home,a:home===s.a?s.b:s.a}; } return S.phase==='regular'?(L.today(S).find(g=>g.h===tid||g.a===tid)||null):null; };
/* every human-coached game today, keyed the same way playDay / playoffDay look them up */
L.humanGames=function(S){ const out=[], H=new Set(L.humans(S));
  if(S.phase==='playoffs'&&S.playoffs&&!S.playoffs.done) S.playoffs.series.filter(s=>s.round===S.playoffs.round&&!s.done&&s.next===S.day&&(H.has(s.a)||H.has(s.b))).forEach(s=>{ const n=s.wa+s.wb, home=[0,1,4,6].includes(n)?s.a:s.b; out.push({key:'p'+s.id+n,po:true,sid:s.id,h:home,a:home===s.a?s.b:s.a}); });
  else if(S.phase==='regular') L.today(S).filter(g=>H.has(g.h)||H.has(g.a)).forEach(g=>out.push({key:String(g.id),po:false,h:g.h,a:g.a}));
  return out; };

/* ---------- applying a finished engine game ---------- */
const STATK=['sec','pts','fgm','fga','tpm','tpa','ftm','fta','orb','drb','ast','stl','blk','tov','pf','pm'];
L.record=function(S,g,eg,po){
  const key=po?S.season+'p':S.season;
  [eg.h,eg.a].forEach((sd,k)=>{ sd.ids.forEach(id=>{ const b=sd.box[id]; if(!b.sec) return; const p=S.players[id]; const st=p.stats[key]||(p.stats[key]=Object.assign({gp:0,gs:0,tid:sd.tid},Object.fromEntries(STATK.map(s=>[s,0]))));
    st.gp++; if(sd.ids.indexOf(id)<5) st.gs++; STATK.forEach(s=>st[s]+=b[s]); st.tid=sd.tid; }); });
  const hs=eg.h.score, as=eg.a.score; g.hs=hs; g.as=as; g.played=true;
  if(!po){ const H=S.teams[g.h], A=S.teams[g.a], hw=hs>as;
    [[H,hw,true,hs,as],[A,!hw,false,as,hs]].forEach(([t,w,home,f,a])=>{ t.w+=w?1:0; t.l+=w?0:1; if(home){ t.hw+=w?1:0; t.hl+=w?0:1; } t.pf+=f; t.pa+=a; t.streak=w?(t.streak>0?t.streak+1:1):(t.streak<0?t.streak-1:-1); t.last10.push(w?1:0); if(t.last10.length>10) t.last10.shift();
      t.fin.hype=U.clamp(t.fin.hype+(w?0.006:-0.005),0.05,1); });
    if(H.conf===A.conf){ H.cw+=hw?1:0; H.cl+=hw?0:1; A.cw+=hw?0:1; A.cl+=hw?1:0; }
    L.money(S,H,true); L.money(S,A,false);
  }
  const hum=[g.h,g.a].filter(t=>L.isHuman(S,t)); if(hum.length){ S.boxes.unshift({gid:g.id,day:S.day,po:!!po,h:g.h,a:g.a,hs,as,players:[eg.h,eg.a].map(sd=>sd.ids.filter(id=>sd.box[id].sec>0).map(id=>[id,...STATK.map(s=>sd.box[id][s])]))}); const bmax=40*L.humans(S).length; if(S.boxes.length>bmax) S.boxes.length=bmax; hum.forEach(t=>L.board(S,t,g,hs,as)); }
  // injuries
  [eg.h,eg.a].forEach(sd=>sd.ids.forEach(id=>{ const b=sd.box[id]; if(b.sec>300&&Math.random()<0.0035*b.sec/1800){ const p=S.players[id]; const d=U.pick([[2,'Ayak bileği burkulması'],[4,'Diz zorlanması'],[7,'Kas sakatlığı'],[12,'Hamstring'],[21,'Ayak kırığı'],[45,'Diz bağı']]); const days=Math.round(d[0]*U.rnd(0.6,1.6)); p.inj={name:d[1],days};
      if(L.isHuman(S,sd.tid)) L.tell(S,sd.tid,'Sakatlık: '+p.name,'<p>'+p.name+' maçta sakatlandı: <b>'+d[1]+'</b>. Tahmini '+days+' gün yok.</p>','injury'); } }));
};
L.money=function(S,t,home){ const pay=C().payroll(S,t.id); t.fin.exp+=pay/R.games+120000; t.fin.cash-=pay/R.games+120000;
  if(home){ const att=Math.round(Math.min(19500,10500+t.fin.hype*8000+t.market*700)*U.clamp(1.25-t.fin.ticket/120,0.55,1.15)); const rev=att*t.fin.ticket+700000+t.market*150000; t.fin.rev+=rev; t.fin.cash+=rev; t.lastAtt=att; } };
L.board=function(S,tid,g,hs,as){ const t=S.teams[tid], won=(g.h===tid)===(hs>as); const exp=0.3+t.power*0.6; t.board.conf=U.clamp(t.board.conf+((won?1:0)-exp)*2.2,0,100); };

/* ---------- a day ---------- */
L.playDay=function(S,o){
  o=o||{};
  if(S.phase==='regular'){
    L.today(S).forEach(g=>{ let eg=o.games&&o.games[g.id]; if(!eg&&o.userGame&&(g.h===S.user||g.a===S.user)) eg=o.userGame; if(!eg) eg=BM.Engine.sim(S,g.h,g.a); L.record(S,g,eg,false); });
  } else if(S.phase==='playoffs') L.playoffDay(S,o);
  L.endDay(S);
};
L.endDay=function(S){
  // injuries heal, G-League minutes, small development
  Object.values(S.players).forEach(p=>{ if(p.inj&&p.inj.days>0){ p.inj.days--; if(p.inj.days<=0){ p.inj=null; } } });
  if(S.phase==='regular'){ S.teams.forEach(t=>t.roster.forEach(id=>{ const p=S.players[id]; if(p.gl) p.glDays=(p.glDays||0)+1; })); }
  S.day++;
  const md=U.ymd(S.day);
  if(md.w===1){ S.scout=S.scout||{}; L.humans(S).forEach(tid=>{ S.scout[tid]=Math.min(6,L.scoutPts(S,tid)+3); }); }
  if(md.d===1&&(S.phase==='regular'||S.phase==='playoffs')) L.monthly(S);
  if(BM.Market) BM.Market.daily(S);
  L.phaseCheck(S);
};
L.monthly=function(S){ Object.values(S.players).forEach(p=>{ if(p.tid<0&&p.tid!==-1) return; L.develop(p,0.09,S); }); if(BM.Market&&BM.Market.moodCheck) BM.Market.moodCheck(S); };
L.develop=function(p,k,S){
  const t=p.tid>=0?S.teams[p.tid]:null, focus=t?t.tac.training||'balanced':'balanced';
  const base=p.age<=21?1.45:p.age<=24?0.95:p.age<=27?0.25:p.age<=30?-0.35:p.age<=33?-1.05:-1.8;
  const room=(p.pot-p.ovr)/10, work=(p.r.work-10)*0.06, gl=p.gl?0.35:0, mins=(p.stats[S.season]&&p.stats[S.season].sec||0)/60/1200;
  let d=(base+room*0.6+work+gl+mins*0.3+U.gauss()*0.6)*k; if(p.ovr>=p.pot&&d>0) d*=0.25;
  const keys=Object.keys(BM.OVRW[p.pos]); const bias={offense:['ins','mid','thr','pas','han'],defense:['pdef','idef','stl','blk','drb'],physical:['spd','str','jmp','sta']}[focus]||[];
  keys.concat(['sta','spd','jmp']).forEach(key=>{ const b=bias.includes(key)?1.3:1; const ag=(key==='spd'||key==='jmp')&&p.age>29?-0.25*k:0; p.r[key]=U.clamp(Math.round((p.r[key]+d*0.9*b*U.rnd(0.5,1.5)/3.6+ag)*10)/10,1,20); });
  p.ovr=BM.Gen.ovr(p);
};

L.phaseCheck=function(S){
  const md=U.ymd(S.day), Y=S.season;
  if(S.phase==='predraft'&&S.day>=U.day(Y,...R.dates.draft)){ S.phase='draft'; L.setupDraft(S); return; }
  if(S.phase==='post'&&S.skipRollover&&S.day>=U.day(Y,7,1)){ S.skipRollover=false; S.phase='fa'; L.news(S,'Serbest oyuncu dönemi açıldı','<p>'+U.seasonName(Y)+' serbest oyuncu dönemi başladı. Teklifler artık geçerli; oyuncular birkaç gün içinde karar verir.</p>','league'); return; }
  if(S.phase==='fa'&&S.day>=U.day(Y,...R.dates.camp)){ S.phase='camp'; if(BM.Market) BM.Market.fillRosters(S); L.news(S,'Hazırlık kampı başladı','<p>Kadrolar en az '+R.rosterMin+', en fazla '+R.rosterMax+' oyuncu olmalı. Sezon 26 Ekim\'de başlıyor.</p>','league'); }
  if(S.phase==='camp'&&S.day>=U.day(Y,...R.dates.seasonStart)){ if(BM.Market) BM.Market.fillRosters(S); S.phase='regular'; S.teams.forEach(t=>{ if(!t.rot||t.rot.auto) BM.Gen.autoRotation(t,S); }); L.news(S,U.seasonName(Y)+' sezonu başladı','<p>82 maçlık normal sezon başladı. Takas son günü: <b>24 Şubat</b>.</p>','league'); }
  if(S.phase==='regular'&&S.day===U.day(Y+1,...R.dates.deadline)) L.news(S,'Takas dönemi kapanıyor','<p>Bugün takas için son gün. Yarından itibaren sezon sonuna kadar takas yapılamaz.</p>','league');
  if(S.phase==='regular'&&S.day>S.lastDay){ L.endRegular(S); }
  if(S.phase==='playoffs'&&S.playoffs&&S.playoffs.done&&S.day>=U.day(Y+1,...R.dates.draft)){ S.phase='draft'; L.setupDraft(S); }
  if(S.phase==='post'&&S.day>=U.day(Y+1,...R.dates.rollover)){ L.rollover(S); }
};
L.tradeOpen=S=>!(S.phase==='regular'&&S.day>U.day(S.season+1,...R.dates.deadline))&&S.phase!=='playoffs'&&S.phase!=='draft';

/* ---------- playoffs ---------- */
L.endRegular=function(S){
  S.phase='playoffs'; L.awards(S);
  const seeds={E:L.standings(S,'E').slice(0,8),W:L.standings(S,'W').slice(0,8)};
  const series=[]; ['E','W'].forEach(cf=>{ const s=seeds[cf]; [[0,7],[3,4],[2,5],[1,6]].forEach(([i,j],k)=>series.push({id:cf+'1'+k,conf:cf,round:1,slot:k,a:s[i].id,b:s[j].id,sa:i+1,sb:j+1,wa:0,wb:0,done:false,next:S.day,home:s[i].id,games:[]})); });
  S.playoffs={round:1,series,done:false,champ:null};
  const inP0=new Set([...seeds.E,...seeds.W].map(t=>t.id)); L.humans(S).forEach(tid=>L.tell(S,tid,inP0.has(tid)?'Playoff\'tayız!':'Playoff dışında kaldık','<p>'+(inP0.has(tid)?'Takımın playoff\'a kaldı. Eşleşmeler Puan durumu › Playoff ekranında.':'Takımın bu yıl playoff dışında kaldı; draft piyangosuna giriyorsun.')+'</p>','result'));
  L.news(S,'Normal sezon bitti',`<p>Playoff eşleşmeleri belli oldu. Her konferanstan 8 takım, 7 maç üzerinden.</p>`,'league');
  L.lottery(S);
};
L.playoffDay=function(S,o){
  const P=S.playoffs; if(!P||P.done) return;
  P.series.filter(s=>s.round===P.round&&!s.done).forEach(s=>{
    const n=s.wa+s.wb, hi=s.a; const home=[0,1,4,6].includes(n)?hi:s.b; s.home=home; const away=home===s.a?s.b:s.a;
    let eg=o.games&&o.games['p'+s.id+n]; if(!eg&&o.userGame&&(home===S.user||away===S.user)) eg=o.userGame; if(!eg) eg=BM.Engine.sim(S,home,away);
    const g={id:'p'+s.id+n,day:S.day,h:home,a:away}; L.record(S,g,eg,true);
    const hw=g.hs>g.as, winA=(home===s.a)===hw; if(winA) s.wa++; else s.wb++; s.games.push([home,g.hs,g.as]);
    if(s.wa===R.seriesWins||s.wb===R.seriesWins){ s.done=true; s.win=s.wa>s.wb?s.a:s.b; [s.a,s.b].filter(t=>L.isHuman(S,t)).forEach(t=>L.tell(S,t,(s.win===t?'Seri kazanıldı! ':'Elendik: ')+L.tname(S,s.a)+' '+s.wa+'-'+s.wb+' '+L.tname(S,s.b),'<p>'+(s.win===t?'Takımın bir sonraki tura yükseldi.':'Sezon burada bitti.')+'</p>','result')); }
    else s.next=S.day+1;
  });
  const cur=P.series.filter(s=>s.round===P.round);
  if(cur.every(s=>s.done)){
    if(P.round===4){ P.done=true; P.champ=cur[0].win; S.history.champs.push({season:S.season,tid:P.champ,ru:cur[0].win===cur[0].a?cur[0].b:cur[0].a});
      const aw=S.history.awards[S.season]||(S.history.awards[S.season]={}); aw.champ=P.champ;
      const fm=S.teams[P.champ].roster.map(id=>S.players[id]).filter(p=>p.stats[S.season+'p']).sort((x,y)=>y.stats[S.season+'p'].pts-x.stats[S.season+'p'].pts)[0]; if(fm) aw.fmvp=fm.id;
      L.news(S,'ŞAMPİYON: '+L.tname(S,P.champ),'<p>'+U.seasonName(S.season)+' şampiyonu '+L.tname(S,P.champ)+'!'+(fm?' Final MVP: <b>'+fm.name+'</b>.':'')+'</p>'+'','league');
      if(L.isHuman(S,P.champ)){ S.teams[P.champ].board.conf=100; L.tell(S,P.champ,'Tebrikler, şampiyonsun!','<p>'+U.seasonName(S.season)+' şampiyonluğu senin. Kurulun güveni tavan yaptı.</p>','result'); }
      return; }
    const next=P.round+1, win=cur.map(s=>s.win);
    const mk=(a,b,cf,slot)=>{ const ta=S.teams[a], tb=S.teams[b]; const better=(ta.w-ta.l)>=(tb.w-tb.l)?a:b; return {id:cf+next+slot,conf:cf,round:next,slot,a:better,b:better===a?b:a,wa:0,wb:0,done:false,next:S.day+1,home:better,games:[]}; };
    if(next<4){ ['E','W'].forEach(cf=>{ const w=cur.filter(s=>s.conf===cf).sort((x,y)=>x.slot-y.slot).map(s=>s.win); for(let k=0;k<w.length;k+=2) P.series.push(mk(w[k],w[k+1],cf,k/2)); }); }
    else P.series.push(mk(win[0],win[1],'F',0));
    P.round=next;
  }
};

/* ---------- awards ---------- */
L.awards=function(S){
  const ps=Object.values(S.players).filter(p=>p.tid>=0&&p.stats[S.season]&&p.stats[S.season].gp>=40);
  const pg=(p,k)=>p.stats[S.season][k]/p.stats[S.season].gp, wp=p=>{ const t=S.teams[p.tid]; return t.w/(t.w+t.l||1); };
  const best=(f,arr)=>(arr||ps).slice().sort((a,b)=>f(b)-f(a))[0];
  const prev=(S.history.awards[S.season-1]||{}).mvp; const mvp=best(p=>p.ovr*0.5+pg(p,'pts')*1.1+(pg(p,'orb')+pg(p,'drb'))*0.45+pg(p,'ast')*0.7+wp(p)*30+(p.id===prev?-3:0)+U.rnd(0,2.5));
  const dpoy=best(p=>(p.r.idef+p.r.pdef)*1.2+pg(p,'stl')*6+pg(p,'blk')*6+pg(p,'drb')*0.8);
  const rk=ps.filter(p=>p.draft&&p.draft.year===S.season&&p.exp<=1); const roy=rk.length?best(p=>p.ovr+pg(p,'pts')*1.5,rk):null;
  const bn=ps.filter(p=>p.stats[S.season].gs<p.stats[S.season].gp*0.4); const smoy=bn.length?best(p=>pg(p,'pts')*1.3+p.ovr*0.4,bn):null;
  const mip=best(p=>p.ovr-(p.ovrStart||p.ovr));
  const aw={mvp:mvp&&mvp.id,dpoy:dpoy&&dpoy.id,roy:roy&&roy.id,smoy:smoy&&smoy.id,mip:mip&&mip.id}; S.history.awards[S.season]=aw;
  const nm=id=>id?S.players[id].name+' ('+S.teams[S.players[id].tid].abbr+')':'—';
  L.news(S,'Sezon ödülleri','<p>MVP: <b>'+nm(aw.mvp)+'</b><br>Yılın Savunmacısı: '+nm(aw.dpoy)+'<br>Yılın Çaylağı: '+nm(aw.roy)+'<br>Yılın 6. Adamı: '+nm(aw.smoy)+'<br>En Çok Gelişen: '+nm(aw.mip)+'</p>','league');
};

/* ---------- lottery + draft ---------- */
L.lottery=function(S,o){
  o=o||{}; const year=o.year||S.season+1, inP=o.inP||new Set(S.playoffs.series.filter(s=>s.round===1).flatMap(s=>[s.a,s.b])), rec=o.rec||(t=>t.w/(t.w+t.l||1));
  const byRec=S.teams.slice().sort((a,b)=>rec(a)-rec(b)||U.rnd(-1,1));
  const lot=byRec.filter(t=>!inP.has(t.id)).slice(0,14), rest=byRec.filter(t=>!lot.includes(t));
  const order=[]; const pool=lot.map((t,i)=>({t,w:R.lotteryOdds[i]}));
  for(let k=0;k<3;k++){ const tot=pool.reduce((a,x)=>a+x.w,0); let r=Math.random()*tot; const i=pool.findIndex(x=>(r-=x.w)<=0); order.push(pool.splice(i<0?0:i,1)[0].t); }
  pool.forEach(x=>order.push(x.t)); rest.forEach(t=>order.push(t));
  const owner=(orig,rd)=>{ const p=S.picks.find(x=>x.season===year&&x.round===rd&&x.orig===orig); return p?p.owner:orig; };
  S.lottery={year,order:order.map(t=>t.id)};
  const r1=order.map((t,i)=>({round:1,pick:i+1,orig:t.id,tid:owner(t.id,1)})), r2=byRec.map((t,i)=>({round:2,pick:31+i,orig:t.id,tid:owner(t.id,2)}));
  S.draftOrder=r1.concat(r2);
  L.news(S,year+' draft piyangosu sonuçlandı','<p>İlk üç seçim: '+order.slice(0,3).map((t,i)=>(i+1)+'. '+L.tname(S,t.id)).join(', ')+'.</p>','draft');
  L.humans(S).forEach(tid=>{ const my=S.draftOrder.filter(x=>x.tid===tid).map(x=>'#'+x.pick).join(', '); L.tell(S,tid,'Draft sıran belli oldu','<p>'+year+' draftındaki seçimlerin: <b>'+(my||'yok')+'</b>. Draft ekranından adayları gözlemleyebilirsin.</p>','draft'); });
};
L.prospects=S=>{ const y=L.draftYear(S); return Object.values(S.players).filter(p=>p.tid===-2&&(p.draftYear==null||p.draftYear===y)); };
L.scoutAcc=(S,p,tid)=>{ if(tid==null) tid=S.user; return Math.max(p.scout||0.3,(p.sc&&p.sc[tid])||0); };
L.scoutPts=(S,tid)=>{ if(tid==null) tid=S.user; return S.scout&&S.scout[tid]!=null?S.scout[tid]:(S.scoutPts!=null?S.scoutPts:3); };
L.scoutVal=(S,p,tid)=>{ const acc=L.scoutAcc(S,p,tid), noise=(1-acc)*12; const seed=(p.id*9301+49297)%233280/233280-0.5; return {ovr:Math.round(p.ovr+seed*noise),pot:Math.round(p.pot+seed*noise*1.4),range:Math.round(noise)}; };
L.setupDraft=function(S){ if(!S.draftOrder) L.lottery(S); S.draft={idx:0,done:false,picks:[]}; L.news(S,'Draft günü','<p>'+L.draftYear(S)+' draftı başladı. Sıra sana gelince Draft ekranından seçimini yap.</p>','draft'); L.draftAI(S); };
L.draftAI=function(S){ const D=S.draft; while(D&&!D.done){ const slot=S.draftOrder[D.idx]; if(!slot){ L.endDraft(S); return; } if(L.isHuman(S,slot.tid)) return;
  const pool=L.prospects(S); if(!pool.length){ L.endDraft(S); return; } const pick=pool.slice().sort((a,b)=>(b.ovr+(b.pot-b.ovr)*0.55+U.rnd(-4,4))-(a.ovr+(a.pot-a.ovr)*0.55+U.rnd(-4,4)))[0]; L.draftPick(S,pick.id); } };
L.draftPick=function(S,pid){
  const D=S.draft, slot=S.draftOrder[D.idx], p=S.players[pid], t=S.teams[slot.tid];
  p.tid=t.id; const dy=L.draftYear(S); p.draft={year:dy,rnd:slot.round,pick:slot.pick,tid:t.id}; p.exp=0; p.bird=0;
  const start=dy; p.contract=slot.round===1?BM.Gen.rookieContract(start,slot.pick):BM.Gen.contract(start,BM.Gen.minFor(0),2,false); p.contract.rookie=slot.round===1;
  if(start>S.season) p.pendingStart=start; t.roster.push(p.id); if(t.roster.length>R.rosterMax&&!L.isHuman(S,t.id)){ p.gl=true; }
  D.picks.push({pick:slot.pick,round:slot.round,tid:t.id,pid}); D.idx++;
  if(L.isHuman(S,t.id)) L.tell(S,t.id,'Draft: '+p.name+' seçildi','<p>'+slot.pick+'. sıradan '+p.name+' ('+p.pos+', '+p.age+' yaş, '+p.college+') takımına katıldı.</p>','draft');
  if(D.idx>=S.draftOrder.length) L.endDraft(S); else L.draftAI(S);
};
L.endDraft=function(S){ const D=S.draft; if(!D||D.done) return; D.done=true; L.prospects(S).forEach(p=>{ p.tid=-1; p.contract=null; p.draftYear=null; }); S.phase='post';
  const dy=L.draftYear(S); S.picks=S.picks.filter(x=>x.season>dy); S.tradeOffers=[]; if(S.initialDraft){ S.initialDraft=false; S.skipRollover=true; }
  L.news(S,'Draft tamamlandı','<p>Seçilmeyen adaylar serbest oyuncu oldu. '+(S.skipRollover?'1 Temmuz\'da serbest oyuncu dönemi açılır.':'30 Haziran\'da yeni sezona geçilir ve 1 Temmuz\'da serbest oyuncu dönemi açılır.')+'</p>','draft'); };

/* ---------- rollover to the next season ---------- */
L.rollover=function(S){
  const old=S.season, ns=old+1, t0=S.teams;
  S.history.seasons.push({season:old,table:t0.map(t=>({tid:t.id,w:t.w,l:t.l})),champ:S.playoffs&&S.playoffs.champ});
  L.humans(S).forEach(tid=>{ const ht=t0[tid]; const madePO=S.playoffs&&S.playoffs.series.some(s=>s.round===1&&(s.a===tid||s.b===tid)); ht.board.conf=U.clamp(ht.board.conf+(madePO?8:-10)+(S.playoffs&&S.playoffs.champ===tid?20:0),0,100); });
  t0.forEach(t=>{ const short=S.minPayroll-C().payroll(S,t.id); if(short>0){ t.fin.cash-=short; t.fin.exp+=short; } const tax=C().taxBill(S,t.id); if(tax>0){ t.fin.cash-=tax; t.fin.exp+=tax; if(L.isHuman(S,t.id)) L.tell(S,t.id,'Lüks vergi ödendi','<p>Bordro vergi sınırını aştığı için '+U.money(tax)+' lüks vergi ödendi.</p>','finance'); } });
  S.season=ns; C().rollover(S);
  const leaving=[];
  Object.values(S.players).forEach(p=>{
    if(p.tid===-3) return;
    p.age++; if(p.tid>=0) p.exp++;
    L.develop(p,1,S); p.pot=Math.max(p.ovr,Math.min(99,Math.round(p.pot+U.gauss()*1.5-(p.age>26?1:0))));
    p.ovrStart=p.ovr; p.ovrHist.push([old,p.ovr]); if(p.ovrHist.length>20) p.ovrHist.shift(); p.glDays=0;
    const retire=p.age>=33&&Math.random()<(p.age-32)*0.13+(p.ovr<55?0.25:0)||p.age>=40;
    if(retire){ if(p.tid>=0){ const t=S.teams[p.tid]; t.roster=t.roster.filter(id=>id!==p.id); if(L.isHuman(S,p.tid)) L.tell(S,p.tid,'Emeklilik: '+p.name,'<p>'+p.name+' '+p.age+' yaşında kariyerini noktaladı.</p>','info'); } p.tid=-3; return; }
    if(p.tid>=0&&C().expires(p)<ns&&!p.pendingStart){ leaving.push(p); }
    if(p.tid>=0&&C().expires(p)>=ns) p.bird=(p.bird||0)+1;
    delete p.pendingStart;
  });
  leaving.forEach(p=>{ const t=S.teams[p.tid]; const keep=!L.isHuman(S,t.id)&&BM.Market&&BM.Market.aiResign(S,t,p);
    if(!keep){ p.lastSalary=p.contract?p.contract.amt[p.contract.amt.length-1]:0; p.rfa=!!(p.contract&&p.contract.rookie); p.rights=t.id; t.roster=t.roster.filter(id=>id!==p.id); p.tid=-1; p.contract=null; p.gl=false;
      if(L.isHuman(S,t.id)) L.tell(S,t.id,'Sözleşmesi bitti: '+p.name,'<p>'+p.name+' serbest oyuncu oldu. Bird hakların sende ('+(p.bird||0)+' yıl): Transfer › Serbest oyuncular ekranından tavanı aşarak geri imzalayabilirsin.'+(p.rfa?' Çaylak sözleşmesi bittiği için <b>kısıtlı serbest oyuncu</b>: başka takımın teklifini eşleştirme hakkın var.':'')+'</p>','contract'); } });
  // free agent pool hygiene (unsigned players go overseas or retire) + international newcomers
  Object.values(S.players).forEach(p=>{ if(p.exp>3) p.gl=false; if(p.tid!==-1) { p.faYears=0; return; } p.faYears=(p.faYears||0)+1;
    if(p.age>=36||p.faYears>=3||(p.faYears>=2&&p.ovr<58)||(p.age>=31&&p.ovr<57)||(p.faYears>=1&&p.ovr<47)){ if(L.isHuman(S,p.rights)&&p.faYears<2) return; p.tid=-3; } });
  Object.keys(S.players).forEach(id=>{ const p=S.players[id]; if(p.tid===-3&&!(S.history.retired||(S.history.retired=[])).some(x=>x.id===p.id)){ if(p.ovr>=72||Object.values(S.history.awards).some(a=>Object.values(a).includes(p.id))) S.history.retired.push({id:p.id,name:p.name,pos:p.pos,ovr:Math.max(p.ovr,...p.ovrHist.map(x=>x[1])),season:old}); delete S.players[id]; } });
  const used=new Set(Object.values(S.players).map(p=>p.name)); BM.Gen.setId(S.idSeq);
  for(let i=0;i<8;i++){ const p=BM.Gen.player({age:U.rint(20,27),target:U.rint(48,66),tid:-1,used,exp:0}); p.college='Uluslararası'; p.contract=null; S.players[p.id]=p; }
  BM.Gen.draftClass(S,ns+1,used); S.idSeq=BM.Gen.nextId();
  for(const t of S.teams){ [1,2].forEach(rd=>S.picks.push({season:ns+4,round:rd,orig:t.id,owner:t.id})); Object.assign(t,{w:0,l:0,hw:0,hl:0,cw:0,cl:0,dw:0,dl:0,streak:0,last10:[],pf:0,pa:0}); t.fin.rev=0; t.fin.exp=0; t.power=U.clamp(BM.Market?BM.Market.teamStrength(S,t.id):t.power,0.1,0.9); t.strat=t.power>0.6?'contend':t.power<0.36?'rebuild':'mid'; t.board.goal=t.power>0.62?'Şampiyonluk yarışı':t.power>0.45?'Playoff':'Gelişim ve genç oyuncular'; }
  S.playoffs=null; S.draft=null; S.draftOrder=null; S.lottery=null; S.phase='fa'; S.day=U.day(ns,7,1);
  L.schedule(S);
  (S.humans||[]).forEach(h=>{ const ht=S.teams[h.tid]; if(ht.board.conf<15){ h.fired=true; L.tell(S,h.tid,'Yönetim kurulu kararı: görevden alındın','<p>Kurulun güveni tükendi. Seni isteyen kulüplerden birini seçebilirsin.</p>','board',{stop:true}); }
    else L.tell(S,h.tid,U.seasonName(ns)+' sezonuna hoş geldin','<p>Yeni tavan: <b>'+U.money(S.cap)+'</b>, vergi sınırı '+U.money(S.tax)+'. Kurulun güveni: %'+Math.round(ht.board.conf)+'. Serbest oyuncu dönemi açıldı.</p>','board'); });
  S.fired=!!(L.human(S,S.user)||{}).fired;
};
})();
