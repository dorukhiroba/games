/* Reel Rumble — online co-op over WebRTC (PeerJS). Host is authoritative; client sends input, renders snapshots. */
(function(){
'use strict';
const In=RR.Input, A=RR.Audio, UI=RR.UI, W=RR.W, H=RR.H;
const Net = RR.Net = {peer:null,conn:null,connected:false,role:null,code:null,ls:{}};
const PFX='reelrumble-v1-';
const rep=(k,v)=>(k&&k[0]==='_')?undefined:(typeof v==='number'?Math.round(v*100)/100:v);
Net.avail=()=>typeof window.Peer==='function';
Net.on=(ev,fn)=>{ (Net.ls[ev]=Net.ls[ev]||[]).push(fn); };
Net.emit=(ev,a)=>{ (Net.ls[ev]||[]).forEach(f=>{ try{ f(a); }catch(e){ console.error(e); } }); };
function mkCode(){ const s='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r=''; for(let i=0;i<5;i++) r+=s[Math.floor(Math.random()*s.length)]; return r; }
function errText(e){ const t=e&&e.type;
  if(t==='peer-unavailable') return 'Oda bulunamadı. Kodu kontrol et.';
  if(t==='network'||t==='server-error'||t==='socket-error'||t==='socket-closed') return 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.';
  if(t==='browser-incompatible') return 'Tarayıcın WebRTC desteklemiyor.';
  return 'Bağlantı hatası: '+(t||e); }

Net.host=function(status){
  Net.close(); Net.role='host'; Net.code=mkCode();
  const p=Net.peer=new Peer(PFX+Net.code,{debug:0});
  p.on('open',()=>status('code',Net.code));
  p.on('connection',c=>{ if(Net.conn){ try{ c.close(); }catch(e){} return; } Net.setup(c); });
  p.on('error',e=>{ if(e.type==='unavailable-id'){ Net.host(status); return; } status('error',errText(e)); });
  p.on('disconnected',()=>{ try{ if(!p.destroyed) p.reconnect(); }catch(e){} });
};
Net.join=function(code,status){
  Net.close(); Net.role='client'; Net.code=code;
  const p=Net.peer=new Peer({debug:0});
  p.on('open',()=>{ status('info','Odaya bağlanılıyor...'); Net.setup(p.connect(PFX+code,{reliable:true,serialization:'raw'}));
    setTimeout(()=>{ if(!Net.connected&&Net.peer===p) status('error','Odaya bağlanılamadı. Kodu kontrol et.'); },10000); });
  p.on('error',e=>status('error',errText(e)));
};
Net.setup=function(c){
  Net.conn=c;
  c.on('open',()=>{ Net.connected=true; Net.emit('open'); });
  c.on('data',d=>{ let m=d; if(typeof d==='string'){ try{ m=JSON.parse(d); }catch(e){ return; } } if(m&&m.t) Net.emit('msg',m); });
  c.on('close',()=>{ const was=Net.connected; Net.connected=false; Net.conn=null; if(was) Net.emit('close'); });
  c.on('error',()=>{});
};
Net.send=function(o){ if(!Net.conn||!Net.connected) return; try{ Net.conn.send(JSON.stringify(o,rep)); }catch(e){} };
Net.sendSnap=function(o){ const dc=Net.conn&&Net.conn.dataChannel; if(dc&&dc.bufferedAmount>200000) return; Net.send(o); };
Net.close=function(){ Net.connected=false; const c=Net.conn, p=Net.peer; Net.conn=null; Net.peer=null; try{ c&&c.close(); }catch(e){} try{ p&&p.destroy(); }catch(e){} };

/* ---------- routing ---------- */
Net.on('open',()=>{
  RR.S.mode='online'; RR.S.role=Net.role; RR.S.hostNode=0; RR.S.remoteLoad=null;
  Net.send({t:'hello',load:RR.Save.d.load[0]});
  A.sfx('revive'); UI.toast(Net.role==='host'?'Arkadaşın bağlandı! Haritada bir yıldız seç.':'Bağlandın! Ev sahibi seçim yapacak.',3500);
  RR.go('map');
});
Net.on('msg',m=>{
  const sc=RR.scene; if(sc&&sc.onNet&&sc.onNet(m)) return;
  const S=RR.S;
  switch(m.t){
    case 'hello': case 'load': S.remoteLoad=m.load; break;
    case 'map': S.hostNode=m.n|0; if(S.role==='client'&&RR.sceneName!=='map'&&RR.sceneName!=='equip') RR.go('map'); break;
    case 'fight': if(S.role==='client') RR.go('fight',{boss:m.boss,diff:m.diff,loads:m.loads}); break;
    case 'end': if(S.role==='client'){ const res=RR.Fight.reward(Object.assign({},m.res)); RR.go(res.won?'results':'dead',{res}); } break;
  }
});
Net.on('close',()=>{ if(RR.S.mode==='online'){ RR.S.mode='solo'; RR.S.role=null; UI.toast('Bağlantı koptu. Ana menüye dönülüyor.',4000); RR.go('menu'); } });

/* ---------- lobby scene (DOM overlay) ---------- */
const $=id=>document.getElementById(id);
RR.Scenes.online = {
  enter(){
    this.t=0; A.playMusic('menu'); RR.S.mode='solo'; RR.S.role=null;
    const lob=$('lobby'), st=$('netStatus'), hc=$('hostCode'), inp=$('joinCode');
    lob.classList.remove('hidden'); hc.textContent=''; inp.value='';
    const status=(kind,msg)=>{ if(kind==='code'){ hc.textContent=msg; st.textContent='Bu kodu arkadaşına ver. Bağlanması bekleniyor...'; st.style.color='#2a1d14'; }
      else { st.textContent=msg; st.style.color=kind==='error'?'#b0202a':'#2a1d14'; } };
    if(!Net.avail()) status('error','Çevrimiçi modül yüklenemedi. İnternet bağlantısı gerekli.'); else status('info','');
    $('btnHost').onclick=()=>{ if(!Net.avail()) return; A.unlock(); A.sfx('select'); status('info','Oda oluşturuluyor...'); Net.host(status); };
    const join=()=>{ if(!Net.avail()) return; A.unlock(); const code=inp.value.trim().toUpperCase().replace(/[^A-Z0-9]/g,''); if(code.length<4){ status('error','Geçerli bir oda kodu yaz.'); return; } A.sfx('select'); hc.textContent=''; status('info','Sunucuya bağlanılıyor...'); Net.join(code,status); };
    $('btnJoin').onclick=join; inp.onkeydown=e=>{ if(e.key==='Enter') join(); if(e.key==='Escape'){ inp.blur(); } };
    $('btnBack').onclick=()=>{ A.sfx('back'); Net.close(); RR.go('menu'); };
  },
  leave(){ $('lobby').classList.add('hidden'); const a=document.activeElement; if(a&&a.blur) a.blur(); },
  update(dt){ this.t+=dt; if(In.m('back')){ A.sfx('back'); Net.close(); RR.go('menu'); } },
  draw(c){ UI.stage(c,this.t); Art_curtains(c,this.t);
    UI.hero(c,'bobbin',180,H-90,this.t,0,{}); UI.hero(c,'bolt',W-180,H-90,this.t,1,{face:-1}); }
};
function Art_curtains(c,t){ RR.Art.curtains(c,1,t); }
})();
