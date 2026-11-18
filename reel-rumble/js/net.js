/* Reel Rumble — online co-op for up to 4 over WebRTC (PeerJS). Star layout: the host runs the game,
   up to 3 guests send input and draw the host's snapshots. Slots: host 0, guests 1..3. */
(function(){
'use strict';
const In=RR.Input, A=RR.Audio, UI=RR.UI;
const Net = RR.Net = {peer:null,conn:null,conns:new Map(),connected:false,role:null,code:null,slot:0,ls:{}};
const PFX='reelrumble-v2-';
const rep=(k,v)=>(k&&k[0]==='_')?undefined:(typeof v==='number'?Math.round(v*100)/100:v);
Net.avail=()=>typeof window.Peer==='function';
Net.on=(ev,fn)=>{ (Net.ls[ev]=Net.ls[ev]||[]).push(fn); };
Net.emit=(ev,a,b)=>{ (Net.ls[ev]||[]).forEach(f=>{ try{ f(a,b); }catch(e){ console.error(e); } }); };
Net.count=()=>Net.role==='host'?1+Net.conns.size:(Net.role==='client'?(RR.S.roster||[]).length||2:1);
Net.slots=()=>[...Net.conns.keys()].sort((a,b)=>a-b);
function mkCode(){ const s='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r=''; for(let i=0;i<5;i++) r+=s[Math.floor(Math.random()*s.length)]; return r; }
function errText(e){ const t=e&&e.type;
  if(t==='peer-unavailable') return 'Oda bulunamadı. Kodu kontrol et.';
  if(t==='network'||t==='server-error'||t==='socket-error'||t==='socket-closed') return 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.';
  if(t==='browser-incompatible') return 'Tarayıcın WebRTC desteklemiyor.';
  return 'Bağlantı hatası: '+(t||e); }
const parse=d=>{ if(typeof d!=='string') return d; try{ return JSON.parse(d); }catch(e){ return null; } };
const lobbyOpen=()=>['map','equip','shop','results','dead'].includes(RR.sceneName);

/* ---------- host ---------- */
Net.host=function(status){
  Net.close(); Net.role='host'; Net.slot=0; Net.code=mkCode();
  const p=Net.peer=new Peer(PFX+Net.code,{debug:0});
  p.on('open',()=>{ Net.connected=true; status('code',Net.code); Net.emit('open'); });
  p.on('connection',c=>{
    const free=[1,2,3].find(s=>!Net.conns.has(s)&&!(Net._pending||new Set()).has(s));
    if(free==null||!lobbyOpen()){ c.on('open',()=>{ try{ c.send(JSON.stringify({t:'full',busy:free!=null})); }catch(e){} setTimeout(()=>{ try{ c.close(); }catch(e){} },400); }); return; }
    (Net._pending=Net._pending||new Set()).add(free); c.slot=free;
    c.on('open',()=>{ Net._pending.delete(free); c._seen=performance.now(); Net.conns.set(free,c); c.send(JSON.stringify({t:'welcome',slot:free,code:Net.code})); Net.emit('join',free); });
    c.on('data',d=>{ c._seen=performance.now(); const m=parse(d); if(!m||!m.t||m.t==='ping') return; if(m.t==='bye'){ try{ c.close(); }catch(e){} dropSlot(c.slot,c); return; } Net.emit('msg',m,c.slot); });
    c.on('close',()=>{ Net._pending.delete(free); dropSlot(free,c); });
    c.on('error',()=>{});
  });
  p.on('error',e=>{ if(e.type==='unavailable-id'){ Net.host(status); return; } if(e.type==='peer-unavailable') return; status('error',errText(e)); });
  p.on('disconnected',()=>{ try{ if(!p.destroyed) p.reconnect(); }catch(e){} });
};
/* ---------- guest ---------- */
Net.join=function(code,status){
  Net.close(); Net.role='client'; Net.code=code;
  const p=Net.peer=new Peer({debug:0});
  p.on('open',()=>{ status('info','Odaya bağlanılıyor...');
    const c=p.connect(PFX+code,{reliable:true,serialization:'raw'}); Net.conn=c;
    c.on('data',d=>{ Net._hostSeen=performance.now(); const m=parse(d); if(!m||!m.t||m.t==='ping') return;
      if(m.t==='welcome'){ Net.slot=m.slot; Net.connected=true; Net.emit('open'); return; }
      if(m.t==='full'){ status('error',m.busy?'Ev sahibi şu an bir bölümde. Haritaya dönünce tekrar dene.':'Oda dolu (4/4).'); return; }
      Net.emit('msg',m,0); });
    c.on('close',()=>{ const was=Net.connected; Net.connected=false; Net.conn=null; if(was) Net.emit('close'); });
    c.on('error',()=>{});
    setTimeout(()=>{ if(!Net.connected&&Net.peer===p) status('error','Odaya bağlanılamadı. Kodu kontrol et.'); },10000);
  });
  p.on('error',e=>status('error',errText(e)));
};
function dropSlot(slot,c){ if(Net.conns.get(slot)===c){ Net.conns.delete(slot); Net.emit('leave',slot); } }
/* ---------- keep-alive: a closed tab can take a long time to drop its WebRTC link, so both sides
   ping every 2 s and give up on a silent peer (host: guest silent 7 s, guest: host silent 9 s) ---------- */
setInterval(()=>{
  if(!Net.connected) return; const now=performance.now();
  if(Net.role==='host'){ Net.send({t:'ping'}); Net.conns.forEach((c,slot)=>{ if(now-(c._seen||now)>7000){ try{ c.close(); }catch(e){} dropSlot(slot,c); } }); }
  else if(Net.role==='client'&&Net.conn){ Net.send({t:'ping'}); if(now-(Net._hostSeen||now)>9000){ const c=Net.conn; Net.connected=false; Net.conn=null; try{ c.close(); }catch(e){} Net.emit('close'); } }
},2000);
addEventListener('pagehide',()=>{ if(Net.role==='client'&&Net.connected) Net.send({t:'bye'}); });
/* ---------- send ---------- */
const enc=o=>typeof o==='string'?o:JSON.stringify(o,rep);
Net.send=function(o){ if(!Net.connected) return; const s=enc(o);
  if(Net.role==='host') Net.conns.forEach(c=>{ try{ c.send(s); }catch(e){} });
  else if(Net.conn){ try{ Net.conn.send(s); }catch(e){} } };
Net.sendTo=function(slot,o){ const c=Net.conns.get(slot); if(c){ try{ c.send(enc(o)); }catch(e){} } };
Net.sendSnap=function(o){ if(Net.role!=='host'||!Net.conns.size) return; const s=enc(o);
  Net.conns.forEach(c=>{ const dc=c.dataChannel; if(dc&&dc.bufferedAmount>200000) return; try{ c.send(s); }catch(e){} }); };
Net.close=function(){ Net.connected=false; const c=Net.conn, p=Net.peer, cs=[...Net.conns.values()]; Net.conn=null; Net.peer=null; Net.conns=new Map(); Net._pending=new Set();
  try{ c&&c.close(); }catch(e){} cs.forEach(x=>{ try{ x.close(); }catch(e){} }); try{ p&&p.destroy(); }catch(e){} };

/* ---------- roster (who is in the room, which hero) ---------- */
function roster(){ const S=RR.S, list=[{slot:0,char:RR.Save.d.load[0].char}];
  Net.slots().forEach(s=>list.push({slot:s,char:((S.remoteLoads||{})[s]||RR.defaultLoad(s)).char})); return list; }
Net.roster=roster;
function pushRoster(){ if(Net.role==='host'){ RR.S.roster=roster(); Net.send({t:'roster',list:RR.S.roster}); } }
Net.pushRoster=pushRoster;

/* ---------- routing ---------- */
Net.on('open',()=>{
  const S=RR.S; S.mode='online'; S.role=Net.role; S.remoteLoads={}; S.mapPeers={}; S.roster=Net.role==='host'?roster():[];
  if(Net.role==='client'){ Net.send({t:'hello',load:RR.Save.d.load[0]}); UI.toast('Bağlandın! Sen P'+(Net.slot+1)+' oldun. Ev sahibi bölüm seçecek.',3500); A.sfx('revive'); }
  else UI.toast('Oda açıldı: '+Net.code+' — kodu arkadaşlarına ver (4 kişiye kadar).',4200);
  RR.go('map');
});
Net.on('join',slot=>{ A.sfx('revive'); UI.toast('P'+(slot+1)+' odaya katıldı!',2600); pushRoster(); if(RR.sceneName==='map') Net.sendTo(slot,{t:'map'}); });
Net.on('leave',slot=>{ const S=RR.S; if(S.remoteLoads) delete S.remoteLoads[slot]; if(S.mapPeers) delete S.mapPeers[slot]; UI.toast('P'+(slot+1)+' odadan ayrıldı.',2600); pushRoster(); if(RR.scene&&RR.scene.onLeave) RR.scene.onLeave(slot); });
Net.on('msg',(m,slot)=>{
  const sc=RR.scene; if(sc&&sc.onNet&&sc.onNet(m,slot)) return;
  const S=RR.S;
  switch(m.t){
    case 'hello': case 'load': if(Net.role==='host'){ S.remoteLoads[slot]=m.load; pushRoster(); } break;
    case 'roster': S.roster=m.list||[]; break;
    case 'mpos': if(Net.role==='host') S.mapPeers[slot]={slot,x:+m.x||0,y:+m.y||0,f:m.f|0,mv:!!m.mv,c:m.c}; break;
    case 'mall': if(Net.role==='client'){ const o={}; (m.list||[]).forEach(e=>{ if(e.slot!==Net.slot) o[e.slot]=e; }); S.mapPeers=o; } break;
    case 'enterreq': if(Net.role==='host') UI.toast('P'+(slot+1)+': "'+(m.name||'bölüm')+'" bölümüne girelim diyor.',3000); break;
    case 'map': if(Net.role==='client'&&!['map','equip','shop'].includes(RR.sceneName)) RR.go('map'); break;
    case 'fight': if(Net.role==='client') RR.go('fight',{boss:m.boss,diff:m.diff,loads:m.loads,order:m.order}); break;
    case 'end': if(Net.role==='client'){ const res=RR.Fight.reward(Object.assign({},m.res)); RR.go(res.won?'results':'dead',{res}); } break;
  }
});
Net.on('close',()=>{ if(RR.S.mode==='online'){ RR.S.mode='solo'; RR.S.role=null; UI.toast('Ev sahibiyle bağlantı koptu. Ana menüye dönülüyor.',4000); RR.go('menu'); } });

/* ---------- lobby scene (DOM overlay) ---------- */
const $=id=>document.getElementById(id);
RR.Scenes.online = {
  enter(){
    this.t=0; A.playMusic('menu'); RR.S.mode='solo'; RR.S.role=null;
    const lob=$('lobby'), st=$('netStatus'), hc=$('hostCode'), inp=$('joinCode');
    lob.classList.remove('hidden'); hc.textContent=''; inp.value='';
    const status=(kind,msg)=>{ if(kind==='code'){ hc.textContent=msg; st.textContent='Oda hazır, haritaya geçiliyor...'; st.style.color='#2a1d14'; }
      else { st.textContent=msg; st.style.color=kind==='error'?'#b0202a':'#2a1d14'; } };
    if(!Net.avail()) status('error','Çevrimiçi modül yüklenemedi.'); else status('info','');
    $('btnHost').onclick=()=>{ if(!Net.avail()) return; A.unlock(); A.sfx('select'); status('info','Oda oluşturuluyor...'); Net.host(status); };
    const join=()=>{ if(!Net.avail()) return; A.unlock(); const code=inp.value.trim().toUpperCase().replace(/[^A-Z0-9]/g,''); if(code.length<4){ status('error','Geçerli bir oda kodu yaz.'); return; } A.sfx('select'); hc.textContent=''; status('info','Sunucuya bağlanılıyor...'); Net.join(code,status); };
    $('btnJoin').onclick=join; inp.onkeydown=e=>{ if(e.key==='Enter') join(); if(e.key==='Escape'){ inp.blur(); } };
    $('btnBack').onclick=()=>{ A.sfx('back'); Net.close(); RR.go('menu'); };
  },
  leave(){ $('lobby').classList.add('hidden'); const a=document.activeElement; if(a&&a.blur) a.blur(); },
  update(dt){ this.t+=dt; if(In.m('back')){ A.sfx('back'); Net.close(); RR.go('menu'); } },
  draw(c){ UI.stage(c,this.t); RR.Art.curtains(c,1,this.t);
    ['bobbin','bolt','dugme','kibrit'].forEach((ch,i)=>UI.hero(c,ch,150+i*(RR.W-300)/3,RR.H-90,this.t+i*0.4,i,{face:i<2?1:-1})); }
};
})();
