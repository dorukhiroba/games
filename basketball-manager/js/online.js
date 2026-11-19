/* BasketballManager — online career (network game).
   The host keeps the only copy of the league and runs everything: guests send actions, the host runs them for
   the guest's club and sends back patches. Time moves only when every online manager is ready. On a match day
   each manager chooses to watch (2D, live) or take the result; watched games run on the host and stream to the
   players' screens in lockstep, so two managers can coach against each other in the same game.
   All live games of a match day share one clock: they start together, stay within a possession of each other and
   wait for each other at quarter breaks; the slowest chosen speed applies to everyone, and a pause or a timeout by
   any manager stops every game until they continue (at most 90 s). */
(function(){
'use strict';
const BM=window.BM, U=BM.U, R=BM.RULES;
const L=()=>BM.League, UI=()=>BM.UI, App=()=>BM.App, MV=()=>BM.MatchView, E=()=>BM.Engine, Act=()=>BM.Actions;
const O = BM.Online = {mode:null,code:null,game:null,lobby:null,roster:{},status:null,md:null,chat:[],feeds:{},pend:{},seq:0,unsubs:[],games:[]};
const rid=n=>{ const a='abcdefghjkmnpqrstuvwxyz23456789'; let s=''; for(let i=0;i<n;i++) s+=a[Math.floor(Math.random()*a.length)]; return s; };
const ls=(k,v)=>{ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }catch(e){ return null; } };
/* identity: one id per league code, kept in this browser, so a manager who closes the page and comes back is
   still the same manager. A second tab of the same browser in the same league gets its own temporary id. */
const ss=(k,v)=>{ try{ if(v===undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k,v); }catch(e){ return null; } };
const TAB=ss('bm-tab')||(()=>{ const t='t'+rid(8); ss('bm-tab',t); return t; })();
O.me={cid:'u'+rid(10),name:ls('bm-name')||'Menajer'};
O.idFor=function(code){ const k='bm-id-'+code; let id=ls(k); if(!id){ id='u'+rid(10); ls(k,id); }
  try{ const l=JSON.parse(localStorage.getItem('bm-lock-'+id)||'null'); if(l&&l.tab!==TAB&&Date.now()-l.at<6000){ let tmp=ss('bm-tmp-'+code); if(!tmp){ tmp='u'+rid(10); ss('bm-tmp-'+code,tmp); } return tmp; } }catch(e){}
  return id; };
const lockNow=()=>{ try{ if(O.game) localStorage.setItem('bm-lock-'+O.me.cid,JSON.stringify({tab:TAB,at:Date.now()})); }catch(e){} };
setInterval(lockNow,2000);
const norm=s=>String(s||'').trim().toLocaleLowerCase('tr');
O.setName=n=>{ O.me.name=String(n||'Menajer').slice(0,24); ls('bm-name',O.me.name); };
O.isHost=()=>O.mode==='host'; O.isGuest=()=>O.mode==='guest'; O.active=()=>!!O.mode;
const MODES={day:0,game:1,week:2,phase:3};

/* ---------- transport: ordered, chunked, compressed ---------- */
async function gz(str){ const cs=new CompressionStream('gzip'); const buf=await new Response(new Blob([str]).stream().pipeThrough(cs)).arrayBuffer(); const u8=new Uint8Array(buf); let s=''; for(let i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000)); return btoa(s); }
async function ungz(b){ const bin=atob(b); const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text(); }
const CH=2800; let outQ=[], sendChain=Promise.resolve(), inChain=Promise.resolve(); const parts={};
function send(topic,d,to){ sendChain=sendChain.then(async()=>{ if(!O.game) return; const body=JSON.stringify(d);
  if(body.length<=CH){ outQ.push([topic,{to:to||'*',f:O.me.cid,d}]); return; }
  let str=body, z=0; if(window.CompressionStream){ try{ str=await gz(body); z=1; }catch(e){ str=body; z=0; } }
  const mid=rid(7), n=Math.ceil(str.length/CH); for(let i=0;i<n;i++) outQ.push(['ck',{to:to||'*',f:O.me.cid,mid,i,n,z,t:topic,c:str.slice(i*CH,(i+1)*CH)}]); }).catch(e=>console.error(e)); }
O.send=send;
setInterval(()=>{ if(!O.game||!outQ.length) return; const k=window.claude?1:6; for(let i=0;i<k&&outQ.length;i++){ const [t,d]=outQ.shift(); O.game.emit(t,d).catch(()=>{}); } },40);
function onMsg(m){ if(m.isMe||m.sameTab) return; const x=m.data; if(!x||typeof x!=='object') return; if(x.to!=='*'&&x.to!==O.me.cid) return;
  inChain=inChain.then(async()=>{
    if(m.topic==='ck'){ const k=x.f+':'+x.mid; const p=parts[k]||(parts[k]={n:x.n,got:0,c:new Array(x.n),at:Date.now()}); if(p.c[x.i]===undefined){ p.c[x.i]=x.c; p.got++; }
      if(p.got<p.n) return; delete parts[k]; let str=p.c.join(''); if(x.z) str=await ungz(str); handle(x.t,x.f,JSON.parse(str),m.peer); return; }
    handle(m.topic,x.f,x.d,m.peer); }).catch(e=>console.error('[BM online]',e)); }
const TOPICS=['hb','ck','hello','welcome','snap','patch','act','res','ready','need','chat','st','md','mdc','mev','mnext','mc','msk','mspec','mleave','mdend','bye','end','mds','mview','mpz','msp'];

/* ---------- rooms ---------- */
async function lobbyRoom(){ if(O.lobby) return O.lobby; try{ if(window.claude&&typeof window.claude.use==='function') O.lobby=await window.claude.use('room'); else if(window.KNet) O.lobby=await window.KNet.use('room'); }catch(e){ O.lobby=null; } return O.lobby; }
O.listGames=async function(cb){ const r=await lobbyRoom(); if(!r){ cb(null); return; } const list=()=>r.peers().filter(p=>p.presence&&p.presence.bm&&p.presence.bm.c).map(p=>p.presence.bm); cb(list()); O.lobbyUnsub&&O.lobbyUnsub(); O.lobbyUnsub=r.onPeers(()=>cb(list()),()=>{}); };
async function enter(code){ const r=await lobbyRoom(); if(!r) throw new Error('Çevrimiçi bağlantı kurulamadı.'); O.me.cid=O.idFor(code); const g=await r.join('bm-'+code);
  O.game=g; O.code=code; lockNow(); O.unsubs.forEach(u=>{ try{ u(); }catch(e){} }); O.unsubs=TOPICS.map(t=>g.on(t,onMsg)); O.unsubs.push(g.onPeers(onPeers,()=>{}));
  g.presence({cid:O.me.cid,name:O.me.name,host:O.mode==='host'?1:0}).catch(()=>{});
  O.lastSeen={}; clearInterval(O.hbT); O.hbT=setInterval(()=>{ if(O.game) send('hb',{h:O.mode==='host'?1:0}); },3000); return g; }
function onPeers(){ if(!O.game) return; const ps=O.game.peers(); const ro={}; ps.forEach(p=>{ const pr=p.presence||{}; if(pr.cid) ro[pr.cid]={peer:p.peer,name:pr.name,host:pr.host}; }); ro[O.me.cid]={peer:'me',name:O.me.name,host:O.mode==='host'?1:0};
  const before=O.roster; O.roster=ro;
  if(O.isHost()){ const gone=Object.keys(before).filter(c=>!ro[c]); gone.forEach(c=>dropWatcher(c)); hostStatus(); maybeAdvance(); }
  else if(O.mode==='guest'){ const hostOn=Object.values(ro).some(p=>p.host); if(hostOn!==O.hostOn){ O.hostOn=hostOn; if(hostOn&&O.mode==='guest') send('hello',{name:O.me.name}); App().renderTop(); } } }
O.online=cid=>!!O.roster[cid];
setInterval(()=>{ if(!O.game) return; const now=Date.now();
  if(O.isHost()){ let ch=false; Object.keys(O.roster).forEach(c=>{ if(c===O.me.cid) return; const t=O.lastSeen[c]; if(t&&now-t>10000){ delete O.roster[c]; dropWatcher(c); ch=true; } }); if(ch){ hostStatus(); maybeAdvance(); } }
  else if(O.mode==='guest'){ const on=!!O.hostSeen&&now-O.hostSeen<10000; if(on!==O.hostOn){ O.hostOn=on; if(on) send('hello',{name:O.me.name}); App().renderTop(); } } },2000);
O.leave=function(silent){ if(O.game){ if(!silent) send('bye',{}); const g=O.game; setTimeout(()=>{ g.leave().catch(()=>{}); },300); }
  O.unsubs.forEach(u=>{ try{ u(); }catch(e){} }); O.unsubs=[]; if(O.lobby) O.lobby.presence({bm:null}).catch(()=>{});
  Object.assign(O,{mode:null,code:null,game:null,roster:{},status:null,md:null,mdInfo:null,feeds:{},pend:{},hostOn:false,hostSeen:0,gotSnap:false,myTid:null,ver:0}); outQ=[]; clearInterval(O.helloT); clearInterval(O.presT); };
window.addEventListener('pagehide',()=>{ if(O.game) try{ O.game.emit('bye',{to:'*',f:O.me.cid,d:{}}); }catch(e){} try{ localStorage.removeItem('bm-lock-'+O.me.cid); }catch(e){} });

/* =================== HOST =================== */
O.host=async function(S){
  L().migrate(S); const code=(S.mp&&S.mp.code)||rid(5);
  if(S.mp&&S.mp.code){ O.mode='probe'; O.hostSeen=0; await enter(code);
    const other=await new Promise(res=>{ const t0=Date.now(); const iv=setInterval(()=>{ const pres=O.game&&O.game.peers().some(p=>p.presence&&p.presence.host&&p.presence.cid!==O.me.cid); if(pres||O.hostSeen){ clearInterval(iv); res(true); } else if(Date.now()-t0>3500){ clearInterval(iv); res(false); } },250); });
    if(other){ O.mode='guest'; O.myTid=null; O.ver=0; O.gotSnap=false; send('hello',{name:O.me.name}); startHello(); return {code,joined:true}; } }
  O.mode='host'; S.mp={code};
  if(!O.game) await enter(code); else O.game.presence({cid:O.me.cid,name:O.me.name,host:1}).catch(()=>{});
  const me=S.humans.find(h=>h.tid===S.user); if(me){ me.cid=O.me.cid; me.name=O.me.name; }
  O.ready={}; O.modes={}; O.seen={}; O.snapAt={}; O.roster[O.me.cid]={peer:'me',name:O.me.name,host:1};
  O.sig=null; O.sync(true);
  const pres=()=>{ if(O.lobby&&O.mode==='host') O.lobby.presence({bm:{c:code,h:O.me.name,n:S.humans.length,s:U.seasonName(S.season),t:S.teams[S.user].abbr}}).catch(()=>{}); }; pres(); O.presT=setInterval(pres,15000);
  hostStatus(); return {code};
};
const humanByCid=cid=>(BM.S.humans||[]).find(h=>h.cid===cid);
const onlineHumans=()=>(BM.S.humans||[]).filter(h=>h.cid===O.me.cid||O.online(h.cid));
function hostStatus(extra){ if(!O.isHost()) return; clearTimeout(O.stT); O.stT=setTimeout(()=>{ const S=BM.S; if(!S) return;
  O.status=Object.assign({humans:S.humans.map(h=>({tid:h.tid,name:h.name,cid:h.cid,online:h.cid===O.me.cid||O.online(h.cid),ready:!!O.ready[h.cid],mode:O.modes[h.cid]||'game',fired:!!h.fired})),busy:!!O.busy,prog:O.prog||'',spect:Object.keys(O.roster).filter(c=>!humanByCid(c)).length},extra||{});
  send('st',O.status); App().renderTop(); if(App().screen==='managers') App().render(); },120); }
O.hostStatus=hostStatus;
/* sync: small patches after actions, full snapshot after days */
const SKIP=new Set(['players','teams','user','ver']);
function sigs(S){ const p={}, t=[], k={}; for(const id in S.players) p[id]=JSON.stringify(S.players[id]); S.teams.forEach((x,i)=>t[i]=JSON.stringify(x)); for(const key in S) if(!SKIP.has(key)) k[key]=JSON.stringify(S[key]); return {p,t,k}; }
O.sync=function(full,to){ const S=BM.S; if(!O.isHost()||!S) return; const now=sigs(S), prev=O.sig; S.ver=(S.ver||0)+1;
  if(full||!prev){ O.sig=now; send('snap',{ver:S.ver,S:Object.assign({},S,{user:null})},to||'*'); return; }
  const patch={players:{},teams:{},k:{}}; let n=0;
  for(const id in now.p) if(now.p[id]!==prev.p[id]){ patch.players[id]=S.players[id]; n++; }
  for(const id in prev.p) if(!(id in now.p)){ patch.players[id]=null; n++; }
  now.t.forEach((s,i)=>{ if(s!==prev.t[i]){ patch.teams[i]=S.teams[i]; n++; } });
  for(const key in now.k) if(now.k[key]!==prev.k[key]) patch.k[key]=S[key];
  O.sig=now; if(n>160) { send('snap',{ver:S.ver,S:Object.assign({},S,{user:null})},'*'); return; }
  send('patch',{base:S.ver-1,ver:S.ver,p:patch},'*'); };
O.changed=function(){ if(!O.isHost()) return; clearTimeout(O.chT); O.chT=setTimeout(()=>{ O.sync(false); hostStatus(); },60); };
function hostAct(cid,q,type,p){ const S=BM.S, h=humanByCid(cid); let r;
  O.seen[cid]=O.seen[cid]||{}; if(O.seen[cid][q]) return; O.seen[cid][q]=1;
  if(type==='claim') r=claim(cid,p);
  else if(!h) r={err:'Önce bir takım seç.'};
  else if(Act().HOST_ONLY.has(type)) r={err:'Bu işlemi yalnızca ev sahibi yapabilir.'};
  else r=Act().run(S,h.tid,type,p);
  O.sync(false); send('res',{q,r},cid); hostStatus(); App().save(); App().refresh(); }
function claim(cid,p){ const S=BM.S, tid=+p.tid, name=String(p.name||'Menajer').slice(0,24); const ex=humanByCid(cid); if(ex) return {ok:true,tid:ex.tid};
  const back=(S.humans||[]).find(h=>h.tid===tid&&h.cid!==O.me.cid&&!O.online(h.cid)&&norm(h.name)===norm(name));
  if(back){ back.cid=cid; L().tell(S,tid,'Tekrar hoş geldin','<p>'+U.esc(name)+', '+L().tname(S,tid)+' seni bekliyordu.</p>','board',{quiet:true}); return {ok:true,tid}; }
  if(!S.teams[tid]||L().isHuman(S,tid)) return {err:'Bu takım artık müsait değil.'};
  S.humans.push({tid,name,cid}); S.scout=S.scout||{}; S.scout[tid]=3; BM.Gen.autoRotation(S.teams[tid],S);
  L().welcome(S,tid); L().news(S,'Yeni menajer: '+name,'<p>'+U.esc(name)+' '+L().tname(S,tid)+' takımının başına geçti.</p>','league',{not:[tid]}); return {ok:true,tid}; }

/* ---------- time ---------- */
/* online there is a single step: Devam = until the next match day or something that needs a manager */
O.setReady=function(cid,ready){ O.ready[cid]=!!ready; O.modes[cid]='game'; hostStatus(); maybeAdvance(); };
O.force=function(){ onlineHumans().forEach(h=>{ O.ready[h.cid]=true; }); hostStatus(); maybeAdvance(true); };
function maybeAdvance(force){ const S=BM.S; if(!O.isHost()||O.busy||O.md||!S) return;
  const hs=onlineHumans(); if(!hs.length) return; if(!force&&!hs.every(h=>O.ready[h.cid])) return;
  runDays('game'); }
const awayTids=()=>(BM.S.humans||[]).filter(h=>!(h.cid===O.me.cid||O.online(h.cid))).map(h=>h.tid);
function stopCheck(S,mode,days){
  // draft: wait for the manager on the clock (away managers get an automatic pick)
  if(S.phase==='draft'&&S.draft&&!S.draft.done){ const slot=S.draftOrder[S.draft.idx]; if(slot&&L().isHuman(S,slot.tid)){ if(awayTids().includes(slot.tid)){ Act().run(S,slot.tid,'draftAuto',{}); return stopCheck(S,mode,days); } return 'draft'; } }
  if(S.phase==='camp'&&S.day+1>=U.day(S.season,...R.dates.seasonStart)){ let bad=false; (S.humans||[]).forEach(h=>{ const n=S.teams[h.tid].roster.length; if(n>R.rosterMax||n<R.rosterMin){ if(awayTids().includes(h.tid)) Act().autoFix(S,h.tid); else bad=true; } }); if(bad) return 'roster'; }
  if((mode==='game'||mode==='day')&&L().humanGames(S).some(g=>[g.h,g.a].some(t=>L().isHuman(S,t)&&!awayTids().includes(t)))) return 'match';
  return null; }
function runDays(mode){ const S=BM.S; O.busy=true; O.prog=''; const startPhase=S.phase, top=S.news[0]&&S.news[0].id; let days=0; hostStatus();
  const done=why=>{ O.busy=false; O.prog=''; (S.humans||[]).forEach(h=>{ O.ready[h.cid]=false; }); App().save(); O.sync(true); hostStatus({reason:why||''}); App().refresh();
    if(why==='match') startMatchday(); };
  const chunk=()=>{ for(let n=0;n<3;n++){
      const st=stopCheck(S,mode,days); if(st){ done(st); return; }
      L().playDay(S); days++;
      if(S.phase!==startPhase){ done('phase'); return; }
      const fresh=[]; for(const x of S.news){ if(x.id===top) break; fresh.push(x); }
      const forOnline=x=>x.to==null?false:!awayTids().includes(x.to);
      if(fresh.some(x=>x.stop&&forOnline(x))){ done('news'); return; }
      if(mode==='day'){ done(); return; }
      if(mode==='week'&&days>=7){ done(); return; }
      if(mode==='game'&&S.phase!=='regular'&&(days>=7||fresh.some(x=>forOnline(x)&&!x.quiet&&['contract','trade','board','draft','squad','injury','result'].includes(x.type)))){ done(); return; }
      if(days>400){ done(); return; } }
    O.prog=U.fdate(S.day)+' · '+days+' gün'; hostStatus(); setTimeout(chunk,0); };
  chunk(); }

/* ---------- match day (host) ---------- */
function startMatchday(){ const S=BM.S, away=awayTids();
  const ses=L().humanGames(S).map(x=>{ const hum=[x.h,x.a].filter(t=>L().isHuman(S,t)); const s=Object.assign({},x,{humans:hum,choice:{},watchers:new Set(),want:new Set(),g:null,done:false,live:false,log:[],to:{h:7,a:7},waitSince:0});
    const sr=x.po?(S.playoffs.series.find(q=>q.id===x.sid)):null; s.title=x.po?'Playoff · seri '+S.teams[sr.a].abbr+' '+sr.wa+'-'+sr.wb+' '+S.teams[sr.b].abbr:'Normal sezon';
    hum.forEach(t=>{ if(away.includes(t)) s.choice[t]='quick'; }); return s; });
  O.md={day:S.day,ses,pz:{},spd:{}}; ses.forEach(resolveChoice); mdBroadcast(); App().refresh(); checkMatchday(); pump(); }
O.mdChoice=function(cid,key,choice){ const s=O.md&&O.md.ses.find(x=>x.key===key), h=humanByCid(cid); if(!s||!h||!s.humans.includes(h.tid)||s.done) return;
  if(s.choice[h.tid]&&s.live){ if(choice==='watch') s.watchers.add(cid); return; }
  s.choice[h.tid]=choice==='watch'?'watch':'quick'; if(choice==='watch') s.watchers.add(cid); resolveChoice(s); mdBroadcast(); checkMatchday(); pump(); };
function resolveChoice(s){ if(s.done||s.live) return; const S=BM.S; if(!s.humans.every(t=>s.choice[t])) return;
  s.g=E().newGame(S,s.h,s.a);
  if(s.humans.some(t=>s.choice[t]==='watch')){ s.live=true; s.waitSince=Date.now(); }
  else { let guard=0; while(!s.g.done&&guard++<900) E().step(s.g); s.done=true; }
  if(allResolved()) O.md.ses.forEach(x=>{ x.waitSince=Date.now(); }); }
const nameOf=c=>{ const h=humanByCid(c); return (h&&h.name)||(O.roster[c]||{}).name||'Seyirci'; };
/* pace: a watched game that is ahead of the others is shown a little slower, one that is behind a little faster,
   so the games drift back together instead of stopping at the LEAD limit */
function paceOf(s){ const att=liveS().filter(x=>x.watchers.size); if(att.length<2||!s.live||s.done) return 1; const m=att.reduce((a,x)=>a+elOf(x),0)/att.length;
  return Math.round(U.clamp(1-(elOf(s)-m)/60,0.7,1.4)*20)/20; }
function mdSummary(){ const md=O.md; if(!md) return null; const now=Date.now(), spd=md.spd||{}, viewers=new Set();
  liveS().forEach(s=>s.watchers.forEach(c=>viewers.add(c)));
  return {day:md.day,go:allResolved(),spd:effSpeed(),sp:[...viewers].map(c=>({name:nameOf(c),v:spd[c]||2})),
    pz:Object.keys(md.pz||{}).map(c=>({cid:c,name:md.pz[c].name,why:md.pz[c].why,left:Math.max(0,Math.ceil((md.pz[c].until-now)/1000))})),
    ses:md.ses.map(s=>({key:s.key,h:s.h,a:s.a,po:s.po,title:s.title,humans:s.humans,choice:s.choice,live:s.live,done:s.done,gate:s.live?s.gate||null:null,pf:s.g&&s.live?paceOf(s):1,
      sc:s.g?[s.g.h.score,s.g.a.score]:[0,0],q:s.g?s.g.q:1,clock:s.g?s.g.clock:720,watch:[...s.watchers].map(c=>(humanByCid(c)||{}).tid)}))}; }
/* md = something changed that needs the match-day screen redrawn; mds (light) = live scores, clock, speed, pauses */
function mdBroadcast(light){ const info=mdSummary(), j=JSON.stringify(info); if(light&&j===O.mdLast) return; O.mdLast=j; O.mdInfo=info;
  send(light?'mds':'md',info); const a=App(); if(light) a.onMdTick&&a.onMdTick(info); else a.onMatchday&&a.onMatchday(info); }
function checkMatchday(){ if(!O.md) return; if(!O.md.ses.every(s=>s.done)) return;
  const S=BM.S, games={}; O.md.ses.forEach(s=>{ games[s.key]=s.g; });
  const res=O.md.ses.map(s=>({key:s.key,h:s.h,a:s.a,hs:s.g.h.score,as:s.g.a.score,po:s.po})); O.md=null; O.mdInfo=null;
  L().playDay(S,{games}); App().save(); O.sync(true); send('mdend',{res}); App().onMatchdayEnd&&App().onMatchdayEnd(res); hostStatus(); App().refresh(); }
/* lockstep: the host plays the next possession once every watching manager has finished animating the last one */
function sesBy(key){ return O.md&&O.md.ses.find(s=>s.key===key); }
function step(s){ if(s.done) return; s.want.clear(); s.waitSince=Date.now(); const ev=E().step(s.g);
  if(ev){ s.log.push(ev); if(s.log.length>40) s.log.shift(); if(s.watchers.size) emitEv(s,{key:s.key,evs:[ev],st:MV().snap(s.g,s.to)}); }
  if(!ev||s.g.done) endSession(s); }
function emitEv(s,msg){ send('mev',msg); deliver(msg); }
function deliver(msg){ const f=O.feeds[msg.key]; if(f) f.push(msg); }
function endSession(s){ if(s.done) return; s.done=true; s.live=false; s.gate=null; mdBroadcast(); checkMatchday(); if(O.md) pump(); }
O.mNext=function(cid,key){ const s=sesBy(key); if(!s||s.done) return; if(!s.watchers.has(cid)){ O.mView(cid,key); return; } s.want.add(cid); pump(); };
O.mCoach=function(cid,key,cmd){ const s=sesBy(key), h=humanByCid(cid); if(!s||!s.g||!h) return; const k=s.h===h.tid?'h':s.a===h.tid?'a':null; if(k) MV().applyCoach(s.g,k,cmd,s.to); };
O.mSkip=function(cid,key,untilQ){ const s=sesBy(key), h=humanByCid(cid); if(!s||!s.live||s.done||!h||!s.humans.includes(h.tid)) return; const evs=[]; let guard=0;
  while(!s.g.done&&guard++<900){ const ev=E().step(s.g); if(!ev) break; evs.push(ev); if(untilQ&&ev.endQ) break; }
  s.want.clear(); s.log=s.log.concat(evs).slice(-40); emitEv(s,{key,evs:evs.slice(-60),st:MV().snap(s.g,s.to),batch:1,by:h.name}); if(s.g.done) endSession(s); else { mdBroadcast(); pump(); } };
function dropWatcher(cid){ if(!O.md) return; const h=humanByCid(cid);
  O.md.ses.forEach(s=>{ if(h&&s.humans.includes(h.tid)&&!s.choice[h.tid]){ s.choice[h.tid]='quick'; resolveChoice(s); } });
  O.md.ses.forEach(s=>{ s.watchers.delete(cid); s.want.delete(cid); }); if(O.md.pz) delete O.md.pz[cid];
  mdBroadcast(); checkMatchday(); pump(); }
O.mdForce=function(){ if(!O.md) return; O.md.ses.forEach(s=>{ s.humans.forEach(t=>{ if(!s.choice[t]) s.choice[t]='quick'; }); resolveChoice(s); }); mdBroadcast(); checkMatchday(); pump(); };
O.mLeave=function(cid,key){ const s=sesBy(key); if(!s) return; s.watchers.delete(cid); s.want.delete(cid); if(O.md&&O.md.pz) delete O.md.pz[cid]; mdBroadcast(true); pump(); };
/* ---------- shared match-day clock (host) ---------- */
const LEAD=36, HOLD_MS=90000;
function allResolved(){ return !!O.md&&O.md.ses.every(s=>s.live||s.done); }
function paused(){ return !!O.md&&Object.keys(O.md.pz||{}).length>0; }
function liveS(){ return O.md?O.md.ses.filter(s=>s.live&&!s.done&&s.g):[]; }
const elOf=s=>s.g.elapsed||0;
const qStart=s=>s.g.n>0&&s.g.clock===(s.g.q>4?300:720);
function effSpeed(){ if(!O.md) return 2; const spd=O.md.spd||{}; let m=0; liveS().forEach(s=>s.watchers.forEach(c=>{ const v=spd[c]||2; m=m?Math.min(m,v):v; })); return m||2; }
/* Plays the next possession of every game whose viewers are all ready, unless that game is more than LEAD seconds
   of game time ahead of the slowest watched game or would start a quarter the others have not reached. Games
   nobody is watching just keep up with the watched ones. Nothing moves until every game is decided or while paused. */
let pumping=false, pumpAgain=false;
function pump(){ if(!O.isHost()) return; if(pumping){ pumpAgain=true; return; } pumping=true;
  try{ let n=0; do{ pumpAgain=false; pumpOnce(); } while(pumpAgain&&O.md&&n++<20); }catch(e){ console.error('[BM pump]',e); } finally{ pumping=false; } }
function pumpOnce(){ if(!O.md||!allResolved()||paused()) return;
  for(let round=0;round<12;round++){ if(!O.md) return; const live=liveS(); if(!live.length) return;
    const att=live.filter(s=>s.watchers.size); if(!att.length){ nobodyCheck(); return; }
    const minE=Math.min(...att.map(elOf));
    for(const s of live){ if(s.watchers.size) continue; let gd=0; while(O.md&&!s.done&&elOf(s)<minE&&gd++<400) step(s); }
    if(!O.md) return; const still=liveS(); if(!still.length) return; const minQ=Math.min(...still.map(s=>s.g.q)); let moved=false;
    for(const s of still){ if(!O.md) return; if(s.done||!s.watchers.size) continue;
      if(![...s.watchers].every(c=>s.want.has(c))){ s.gate=null; continue; }
      if(elOf(s)>minE+LEAD){ s.gate='lead'; continue; }
      if(qStart(s)&&s.g.q>minQ){ s.gate='q'; continue; }
      s.gate=null; step(s); moved=true; }
    if(!moved) return; } }
/* nobody is watching any live game (everyone closed the viewer): play the rest at once, after a short grace */
function nobodyCheck(){ if(O.nbT) return; O.nbT=setTimeout(()=>{ O.nbT=null; if(!O.md||!allResolved()) return; const live=liveS(); if(!live.length||live.some(s=>s.watchers.size)) return;
  live.forEach(s=>{ let gd=0; while(!s.g.done&&gd++<900){ if(!E().step(s.g)) break; } }); live.forEach(s=>{ if(O.md) endSession(s); }); },3000); }
/* someone opens the 2D view of a game (their own or as a spectator): they now take part in its pacing */
O.mView=function(cid,key){ const s=sesBy(key); if(!s||s.done) return; s.watchers.add(cid);
  if(s.g&&s.g.n>0){ const msg={key:s.key,evs:s.log.slice(-30),st:MV().snap(s.g,s.to),batch:1,spec:1}; if(cid===O.me.cid) deliver(msg); else { s.want.delete(cid); send('mev',msg,cid); } }
  s.waitSince=Date.now(); mdBroadcast(true); pump(); };
O.mPause=function(cid,on,why){ if(!O.md) return; const h=humanByCid(cid); if(!h) return; const pz=O.md.pz=O.md.pz||{};
  if(on){ if(!liveS().some(s=>s.humans.includes(h.tid))) return; pz[cid]={name:h.name,why:why==='timeout'?'timeout':'pause',until:Date.now()+HOLD_MS}; }
  else if(pz[cid]){ delete pz[cid]; if(!paused()) liveS().forEach(s=>{ s.waitSince=Date.now(); }); }
  mdBroadcast(true); pump(); };
O.mSpeed=function(cid,v){ if(!O.md) return; v=+v; if(![1,2,4,8,16].includes(v)) v=2; (O.md.spd=O.md.spd||{})[cid]=v; mdBroadcast(true); };
/* every second: end expired pauses, send live scores / clock / pause countdown */
setInterval(()=>{ if(!O.isHost()||!O.md) return; const now=Date.now(), pz=O.md.pz||{}; let ch=false;
  for(const c in pz) if(pz[c].until<=now){ delete pz[c]; ch=true; }
  if(ch&&!paused()) liveS().forEach(s=>{ s.waitSince=now; });
  if(ch) pump(); if(O.md&&(liveS().length||ch)) mdBroadcast(true); },1000);
/* a viewer that has not asked for the next possession for 45 s (frozen tab, lost connection) stops holding the game up */
setInterval(()=>{ if(!O.isHost()||!O.md) return; const now=Date.now();
  if(!allResolved()||paused()){ liveS().forEach(s=>{ s.waitSince=now; }); return; }
  let ch=false; liveS().forEach(s=>{ if(!s.watchers.size||s.gate){ s.waitSince=now; return; } if(now-s.waitSince<45000) return;
    const lag=[...s.watchers].filter(c=>!s.want.has(c)); if(!lag.length) return; lag.forEach(c=>s.watchers.delete(c)); s.waitSince=now; ch=true; });
  pump(); if(ch&&O.md) mdBroadcast(true); },5000);

/* =================== GUEST =================== */
O.join=async function(code){ code=String(code||'').trim().toLowerCase(); if(!/^[a-z0-9]{5}$/.test(code)) throw new Error('Oyun kodu 5 harf/rakamdır.');
  if(O.game) O.leave(true); O.mode='guest'; O.myTid=null; O.ver=0; O.gotSnap=false; O.hostSeen=0; O.hostOn=false; await enter(code); send('hello',{name:O.me.name}); startHello(); return code; };
function startHello(){ clearInterval(O.helloT); O.helloT=setInterval(()=>{ if(O.mode==='guest'&&!O.gotSnap) send('hello',{name:O.me.name}); else clearInterval(O.helloT); },3000); }
function guestState(S2,ver){ S2.user=O.myTid!=null?O.myTid:S2.humans[0].tid; BM.S=S2; O.ver=ver; BM.Engine.clearCache(); }
O.act=function(type,p){ return new Promise(res=>{ if(!O.game){ res({err:'Ev sahibine bağlı değilsin.'}); return; } const q=++O.seq; O.pend[q]=res; send('act',{q,type,p}); setTimeout(()=>{ if(O.pend[q]){ delete O.pend[q]; res({err:'Ev sahibinden yanıt gelmedi.'}); } },15000); }); };

/* ---------- message handling ---------- */
function handle(t,from,d,peer){ const host=O.isHost(), S=BM.S;
  if(O.mode==='probe'&&t!=='hb') return;
  if(t==='hb'){ if(host){ O.lastSeen[from]=Date.now(); if(!O.roster[from]){ O.roster[from]={peer,name:(humanByCid(from)||{}).name}; hostStatus(); } } else if(d&&d.h){ O.hostSeen=Date.now(); if(!O.hostOn){ O.hostOn=true; App().renderTop(); } } return; }
  if(host){
    if(t==='hello'){ O.roster[from]=O.roster[from]||{peer,name:d.name}; O.lastSeen[from]=Date.now(); let h=humanByCid(from);
      if(!h&&d.name){ const c=(S.humans||[]).filter(x=>x.cid!==O.me.cid&&!O.online(x.cid)&&norm(x.name)===norm(d.name)); if(c.length===1){ h=c[0]; h.cid=from; O.changed(); } }
      if(h&&d.name){ h.name=String(d.name).slice(0,24); }
      send('welcome',{code:O.code,tid:h?h.tid:null,host:O.me.name},from); const now=Date.now(); if(!O.snapAt[from]||now-O.snapAt[from]>2500){ O.snapAt[from]=now; send('snap',{ver:S.ver,S:Object.assign({},S,{user:null})},from); }
      if(O.mdInfo) send('md',O.mdInfo,from); hostStatus(); return; }
    if(t==='act'){ hostAct(from,d.q,d.type,d.p||{}); return; }
    if(t==='ready'){ if(humanByCid(from)) O.setReady(from,d.ready,d.mode); return; }
    if(t==='need'){ const now=Date.now(); if(O.snapAt[from]&&now-O.snapAt[from]<2500) return; O.snapAt[from]=now; send('snap',{ver:S.ver,S:Object.assign({},S,{user:null})},from); return; }
    if(t==='chat'){ const h=humanByCid(from); const msg={name:(h&&h.name)||d.name||'Seyirci',tid:h?h.tid:null,text:String(d.text||'').slice(0,240),at:Date.now()}; O.chat.push(msg); if(O.chat.length>60) O.chat.shift(); send('chat',msg); App().onChat&&App().onChat(msg); return; }
    if(t==='mdc'){ O.mdChoice(from,d.key,d.choice); return; }
    if(t==='mnext'){ O.mNext(from,d.key); return; }
    if(t==='mc'){ O.mCoach(from,d.key,d.cmd); return; }
    if(t==='msk'){ O.mSkip(from,d.key,!!d.untilQ); return; }
    if(t==='mleave'){ O.mLeave(from,d.key); return; }
    if(t==='mview'||t==='mspec'){ O.mView(from,d.key); return; }
    if(t==='mpz'){ O.mPause(from,!!d.on,d.why); return; }
    if(t==='msp'){ O.mSpeed(from,d.v); return; }
    if(t==='bye'){ delete O.roster[from]; dropWatcher(from); hostStatus(); maybeAdvance(); return; }
    return;
  }
  // guest
  if(t==='welcome'){ O.myTid=d.tid; O.hostName=d.host; O.hostOn=true; return; }
  if(t==='snap'){ const first=!O.gotSnap; O.gotSnap=true; const me=(d.S.humans||[]).find(h=>h.cid===O.me.cid); if(me) O.myTid=me.tid; guestState(d.S,d.ver); if(first) App().enterOnline(); else App().refresh(); if(O.myTid==null) App().pickTeam(); App().saveBackup&&App().saveBackup(); return; }
  if(t==='patch'){ if(!BM.S||d.base!==O.ver){ send('need',{}); return; } const p=d.p; for(const id in p.players){ if(p.players[id]===null) delete S.players[id]; else S.players[id]=p.players[id]; } for(const i in p.teams) S.teams[i]=p.teams[i]; for(const k in p.k) S[k]=p.k[k];
    O.ver=d.ver; S.user=O.myTid!=null?O.myTid:S.user; const me=(S.humans||[]).find(h=>h.cid===O.me.cid); if(me&&me.tid!==O.myTid){ O.myTid=me.tid; S.user=me.tid; } App().refresh(); App().saveBackup&&App().saveBackup(); return; }
  if(t==='res'){ const f=O.pend[d.q]; if(f){ delete O.pend[d.q]; if(d.r&&d.r.tid!=null&&d.r.ok){ O.myTid=d.r.tid; if(BM.S) BM.S.user=d.r.tid; } if(d.r&&d.r.newTid!=null){ O.myTid=d.r.newTid; if(BM.S) BM.S.user=d.r.newTid; } f(d.r||{}); } return; }
  if(t==='st'){ O.status=d; App().renderTop(); if(App().screen==='managers') App().render(); return; }
  if(t==='chat'){ O.chat.push(d); if(O.chat.length>60) O.chat.shift(); App().onChat&&App().onChat(d); return; }
  if(t==='md'){ O.mdInfo=d; App().onMatchday&&App().onMatchday(d); return; }
  if(t==='mds'){ if(!O.mdInfo) return; O.mdInfo=d; App().onMdTick&&App().onMdTick(d); return; }
  if(t==='mev'){ deliver(d); return; }
  if(t==='mdend'){ O.mdInfo=null; App().onMatchdayEnd&&App().onMatchdayEnd(d.res); return; }
  if(t==='end'){ UI().toast('Ev sahibi oyunu kapattı.',5000); O.leave(true); App().welcome(); return; }
}
O.handleLocal=handle;

/* ---------- client API used by the app ---------- */
O.ready=O.ready||{};
O.toggleReady=function(mode){ const st=O.status, me=st&&st.humans.find(h=>h.cid===O.me.cid); const now=!(me&&me.ready);
  if(O.isHost()) O.setReady(O.me.cid,now,mode); else send('ready',{ready:now,mode}); };
O.chatSend=function(text){ text=String(text||'').trim(); if(!text) return; if(O.isHost()) handle('chat',O.me.cid,{text,name:O.me.name}); else send('chat',{text,name:O.me.name}); };
O.choose=function(key,choice){ if(O.isHost()) O.mdChoice(O.me.cid,key,choice); else send('mdc',{key,choice}); };
O.claimTeam=function(tid){ return O.act('claim',{tid,name:O.me.name}); };
/* a feed for the 2D viewer fed by the host's live session. Every viewer (player or spectator) takes part in the
   pacing: the host plays the next possession once all of a game's viewers have started showing the last one. */
O.feed=function(key,h,a,role){ const S=BM.S, host=O.isHost(), s=host?sesBy(key):null;
  const mirror=!(host&&s&&s.g), g=mirror?MV().mirror(S,h,a):s.g, to=mirror?{h:7,a:7}:s.to, q=[]; let want=null, asked=false, askedAt=0;
  /* ask for the next possession as soon as nothing is queued (one possession of look-ahead hides the network delay);
     ask again every few seconds while idle, in case a message got lost */
  const ask=force=>{ if(asked&&!force) return; asked=true; askedAt=Date.now(); if(host) O.mNext(O.me.cid,key); else send('mnext',{key}); };
  const retry=setInterval(()=>{ if(O.feeds[key]!==f){ clearInterval(retry); return; } if(want&&Date.now()-askedAt>3000) ask(true); },1500);
  const f={g,to,remote:mirror,sync:true,me:O.me.cid,mySpeed:O.mySpeed||2,
    waitText(){ const i=O.mdInfo, x=i&&i.ses.find(y=>y.key===key);
      if(i&&!i.go) return 'Diğer menajerlerin maç kararı bekleniyor…';
      if(x&&x.gate==='q') return 'Diğer maçlar bu çeyreği bitirince birlikte devam edilecek…';
      if(x&&x.gate==='lead') return 'Diğer maç biraz geride; onu bekliyoruz…';
      return role==='spec'?'Canlı yayın bekleniyor…':'Diğer menajerler bekleniyor…'; },
    push(msg){ if(msg.batch){ want=null; q.length=0; asked=false; if(mirror) MV().applySnap(g,msg.st,to); if(msg.by&&role!=='spec') UI().toast(U.esc(msg.by)+' maçı ileri sardı.'); f.onBatch&&f.onBatch(msg.evs||[],!!msg.spec); return; }
      asked=false; msg.evs.forEach((ev,i)=>q.push({ev,st:i===msg.evs.length-1?msg.st:null})); if(want){ const cb=want; want=null; f.next(cb); } },
    next(cb){ if(q.length){ const x=q.shift(); if(mirror&&x.st) MV().applySnap(g,x.st,to); cb(x.ev); if(!q.length&&!g.done) ask(); return; } want=cb; ask(); },
    skip(untilQ){ if(role==='spec') return; if(host) O.mSkip(O.me.cid,key,untilQ); else send('msk',{key,untilQ:untilQ?1:0}); },
    coach(cmd,k){ if(role==='spec') return; if(mirror) MV().applyCoach(g,k,cmd,to); if(host) O.mCoach(O.me.cid,key,cmd); else send('mc',{key,cmd}); },
    pause(on,why){ if(host) O.mPause(O.me.cid,!!on,why); else send('mpz',{on:on?1:0,why}); },
    setSpeed(v){ O.mySpeed=f.mySpeed=v; if(host) O.mSpeed(O.me.cid,v); else send('msp',{v}); },
    backlog:()=>q.length,
    close(){ delete O.feeds[key]; clearInterval(retry); if(host) O.mLeave(O.me.cid,key); else send('mleave',{key}); } };
  O.feeds[key]=f;
  if(host){ if(s&&!s.done) s.watchers.add(O.me.cid); setTimeout(()=>{ if(O.feeds[key]===f) O.mView(O.me.cid,key); },0); } else send('mview',{key});
  f.setSpeed(f.mySpeed);
  return f; };
O.closeRoom=function(){ if(O.isHost()) send('end',{}); setTimeout(()=>O.leave(true),400); };
})();
