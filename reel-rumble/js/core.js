/* Reel Rumble — core: utils, data tables, save, input */
(function(){
'use strict';
const RR = window.RR = {};
RR.W = 1280; RR.H = 720; RR.GROUND = 600; RR.DT = 1/60;

/* ---------------- utils ---------------- */
const U = RR.U = {
  clamp:(v,a,b)=>v<a?a:v>b?b:v,
  lerp:(a,b,t)=>a+(b-a)*t,
  rnd:(a,b)=>a+Math.random()*(b-a),
  rint:(a,b)=>Math.floor(a+Math.random()*(b-a+1)),
  pick:a=>a[Math.floor(Math.random()*a.length)],
  sign:v=>v<0?-1:v>0?1:0,
  dist:(ax,ay,bx,by)=>Math.hypot(bx-ax,by-ay),
  ang:(ax,ay,bx,by)=>Math.atan2(by-ay,bx-ax),
  rectHit:(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y,
  circRect(cx,cy,r,R){const nx=cx<R.x?R.x:cx>R.x+R.w?R.x+R.w:cx;const ny=cy<R.y?R.y:cy>R.y+R.h?R.y+R.h:cy;const dx=cx-nx,dy=cy-ny;return dx*dx+dy*dy<r*r;},
  easeOut:t=>1-(1-t)*(1-t),
  easeBack:t=>{const c=1.7;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);},
  angDiff(a,b){let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return d;},
  seeded(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};},
  fmtTime(s){s=Math.max(0,s);const m=Math.floor(s/60),r=Math.floor(s%60);return m+':'+(r<10?'0':'')+r;}
};

/* ---------------- data ---------------- */
RR.CHARS = {
  bobbin:{name:'Bobbin',color:'#d8343a',dark:'#8e1b20',desc:'Makara kafalı, iplik gibi esnek.'},
  bolt:{name:'Bolt',color:'#2f6fd6',dark:'#18407f',desc:'Ampul kafalı, fikirleri hep parlak.'}
};
RR.WEAPONS = {
  ink:{name:'Mürekkep Atar',price:0,desc:'Dengeli, hızlı ve uzun menzilli.',ex:'EX: Delip geçen dev mürekkep damlası.'},
  spread:{name:'Saçma Tabanca',price:4,desc:'Yakından çok güçlü, menzili kısa.',ex:'EX: Geniş yelpaze patlaması.'},
  homing:{name:'Kıvılcım Kovan',price:4,desc:'Hedefi kendisi bulur, hasarı düşük.',ex:'EX: Üç dev güdümlü kıvılcım.'},
  charge:{name:'Şarj Topu',price:4,desc:'Basılı tut, dolunca bırak: büyük hasar.',ex:'EX: Patlayan bomba.'},
  bounce:{name:'Zıp Bilye',price:4,desc:'Kavis çizer, yerde seker.',ex:'EX: Delip geçen dev bilye.'},
  boomer:{name:'Bumerang',price:5,desc:'Gider, delip geçer, geri döner.',ex:'EX: Etrafında dönen koruyucu halka.'}
};
RR.CHARMS = {
  heart:{name:'Ekstra Kalp',price:3,desc:'+1 can. Verdiğin hasar %5 azalır.'},
  heart2:{name:'Çifte Kalp',price:5,desc:'+2 can. Verdiğin hasar %10 azalır.'},
  smoke:{name:'Duman Bombası',price:3,desc:'Atılırken görünmez olursun, hasar almazsın.'},
  coffee:{name:'Sıcak Kahve',price:3,desc:'Süper barın zamanla kendiliğinden dolar.'},
  glove:{name:'Sihirli Eldiven',price:3,desc:'Savuşturma penceresi daha uzun sürer.'},
  tin:{name:'Teneke Kalkan',price:4,desc:'Her dövüşte ilk darbeyi engeller.'},
  ribbon:{name:'Pembe Kurdele',price:4,desc:'Havadayken pembe nesnelere dokununca otomatik savuşturursun.'}
};
RR.SUPERS = {
  beam:{name:'Projektör Işını',unlock:null,desc:'İleriye dev bir ışık huzmesi fırlatır.'},
  star:{name:'Yıldız Parıltısı',unlock:'corn',desc:'Birkaç saniye tamamen dokunulmaz olursun.'},
  reel:{name:'Dev Makara',unlock:'gramo',desc:'Ekranı silip süpüren dev film makarası.'}
};
RR.BOSS_ORDER = ['corn','gramo','boiler','cloud','paper','proj'];
RR.DIFFS = [
  {id:0,name:'Basit',hp:0.72,rate:0.72,spd:0.85,coin:2,score:0},
  {id:1,name:'Normal',hp:1,rate:1,spd:1,coin:4,score:5},
  {id:2,name:'Uzman',hp:1.3,rate:1.25,spd:1.15,coin:6,score:10}
];
RR.GRADES = ['D','C-','C','C+','B-','B','B+','A-','A','A+','S'];

/* ---------------- save ---------------- */
const SKEY = 'reelrumble_save_v1';
function defSave(){
  return {
    coins:0, own:{w:['ink'],c:[]},
    load:[{char:'bobbin',w:['ink',null],sup:'beam',charm:null},{char:'bolt',w:['ink',null],sup:'beam',charm:null}],
    grades:{}, beaten:{}, paid:{}, seenStory:false, ending:false,
    set:{music:0.55,sfx:0.8,filter:true,shake:true,bossbar:false,hitbox:false,voice:true,rumble:true,dead:0.45,padmap:null},
    stats:{deaths:0,parries:0,wins:0}, ach:{}, runCoins:{}, best:{}, rushBest:null
  };
}
RR.Save = {
  d:null,
  load(){
    const def = defSave();
    try{ const raw = localStorage.getItem(SKEY); this.d = raw ? Object.assign(def, JSON.parse(raw)) : def; }
    catch(e){ this.d = def; }
    this.d.set = Object.assign(defSave().set, this.d.set||{});
    this.d.stats = Object.assign(defSave().stats, this.d.stats||{});
    if(!Array.isArray(this.d.load)||this.d.load.length<2) this.d.load = defSave().load;
  },
  save(){ try{ localStorage.setItem(SKEY, JSON.stringify(this.d)); }catch(e){} },
  reset(){ this.d = defSave(); this.save(); },
  superUnlocked(id){ const u = RR.SUPERS[id].unlock; return !u || !!this.d.beaten[u]; },
  finalUnlocked(){ const b=this.d.beaten; return !!(b.corn&&b.gramo&&b.boiler&&b.cloud&&b.paper); }
};
RR.Save.load();
RR.defaultLoad = i => JSON.parse(JSON.stringify(defSave().load[i||0]));

/* ---------------- input ---------------- */
const keys = Object.create(null);
const PREVENT = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab','Slash','Quote','Backquote','ShiftLeft','ShiftRight']);
const isTyping = () => { const a=document.activeElement; return a && (a.tagName==='INPUT'||a.tagName==='TEXTAREA'); };
addEventListener('keydown', e=>{
  if(isTyping()) return;
  keys[e.code] = true; In.any = true; In.lastKey = e.code; In.device = 'kb';
  if(PREVENT.has(e.code)) e.preventDefault();
  if(RR.Audio) RR.Audio.unlock();
});
addEventListener('keyup', e=>{ keys[e.code] = false; });
addEventListener('blur', ()=>{ for(const k in keys) keys[k]=false; if(RR.onBlur) RR.onBlur(); });
addEventListener('mousedown', ()=>{ if(RR.Audio) RR.Audio.unlock(); });

const BITS = {left:1,right:2,up:4,down:8,jump:16,shoot:32,ex:64,dash:128,lock:256,swap:512};
const BIND = {
  solo:{left:['ArrowLeft','KeyA'],right:['ArrowRight','KeyD'],up:['ArrowUp','KeyW'],down:['ArrowDown','KeyS'],
        jump:['KeyZ','Space','KeyJ'],shoot:['KeyX','KeyK'],ex:['KeyC','KeyI'],dash:['ShiftLeft','ShiftRight','KeyL'],
        lock:['KeyV','KeyU'],swap:['Tab','KeyQ','KeyO']},
  p1:{left:['KeyA'],right:['KeyD'],up:['KeyW'],down:['KeyS'],jump:['KeyJ','Space'],shoot:['KeyK'],ex:['KeyI'],
      dash:['KeyL'],lock:['KeyU'],swap:['KeyO']},
  p2:{left:['ArrowLeft'],right:['ArrowRight'],up:['ArrowUp'],down:['ArrowDown'],jump:['Numpad1','Comma'],
      shoot:['Numpad2','Period'],ex:['Numpad0','Quote'],dash:['Numpad3','Slash'],lock:['Numpad4','Semicolon'],swap:['Numpad5','Backslash']},
  none:{}
};
function pads(){ try{ return navigator.getGamepads ? navigator.getGamepads() : []; }catch(e){ return []; } }
function padList(){ const r=[]; const p=pads(); for(let i=0;i<p.length;i++) if(p[i]&&p[i].connected) r.push(p[i]); return r; }
/* gamepad: remappable action buttons (standard mapping indices), adjustable dead zone, rumble */
const PADACT=['jump','shoot','ex','dash','lock','swap'];
const PADDEF={jump:[0],shoot:[2,7],ex:[1],dash:[5],lock:[4,6],swap:[3]};
function padMap(){ const m=RR.Save.d.set.padmap, out={}; PADACT.forEach(k=>{ out[k]=(m&&Array.isArray(m[k]))?m[k].slice():PADDEF[k].slice(); }); return out; }
function deadzone(){ const v=+RR.Save.d.set.dead; return v>=0.1&&v<=0.8?v:0.45; }
function padStyleOf(g){ return /054c|playstation|dualshock|dualsense|sony|ps4|ps5/i.test((g&&g.id)||'')?'ps':'xbox'; }
function padName(g){ return ((g&&g.id)||'Gamepad').replace(/\(.*?\)/g,'').replace(/vendor:.*$/i,'').trim().slice(0,30)||'Gamepad'; }
let padPrev={};
function rumble(idx,s,ms){
  try{ if(!RR.Save.d.set.rumble||idx==null) return; const g=padList()[idx]; if(!g) return; const va=g.vibrationActuator;
    if(va&&va.playEffect){ const r=va.playEffect('dual-rumble',{startDelay:0,duration:ms,weakMagnitude:Math.min(1,s*0.7),strongMagnitude:Math.min(1,s)}); if(r&&r.catch) r.catch(()=>{}); }
    else if(g.hapticActuators&&g.hapticActuators[0]&&g.hapticActuators[0].pulse) g.hapticActuators[0].pulse(Math.min(1,s),ms);
  }catch(e){}
}
function rumbleAll(s,ms){ padList().forEach((g,i)=>rumble(i,s,ms)); }
function padBits(idx){
  const g = padList()[idx]; if(!g) return 0;
  const b=g.buttons, a=g.axes, B=k=>b[k]&&b[k].pressed, d=deadzone(); let m=0;
  if(a[0]<-d||B(14)) m|=BITS.left; if(a[0]>d||B(15)) m|=BITS.right;
  if(a[1]<-d-0.05||B(12)) m|=BITS.up; if(a[1]>d+0.05||B(13)) m|=BITS.down;
  const pm=padMap(); for(const act of PADACT){ const l=pm[act]; for(let i=0;i<l.length;i++) if(B(l[i])){ m|=BITS[act]; break; } }
  return m;
}
class Ctrl{
  constructor(scheme,pad){ this.scheme=scheme; this.pad=pad; this.cur=0; this.prev=0; this.extra=0; }
  poll(){
    this.prev=this.cur; let m=0; const b=BIND[this.scheme]||{};
    if(!isTyping()) for(const k in BITS){ const l=b[k]; if(l) for(let i=0;i<l.length;i++) if(keys[l[i]]){ m|=BITS[k]; break; } }
    if(this.pad!=null) m|=padBits(this.pad);
    this.cur=m;
  }
  held(n){ return !!(this.cur&BITS[n]); }
  pressed(n){ return !!(((this.cur&~this.prev)|this.extra)&BITS[n]); }
  edges(){ return this.cur&~this.prev; }
}
class RemoteCtrl extends Ctrl{
  constructor(){ super('none',null); this.rh=0; this.racc=0; }
  feed(h,p){ this.rh=h|0; this.racc|=(p|0); }
  poll(){ this.prev=this.cur; this.cur=this.rh; this.extra=this.racc; this.racc=0; }
}

/* menu input (any keyboard key set + any pad) */
const MB = {up:1,down:2,left:4,right:8,ok:16,back:32,pause:64,alt:128,alt2:256};
const MKEYS = {up:['ArrowUp','KeyW'],down:['ArrowDown','KeyS'],left:['ArrowLeft','KeyA'],right:['ArrowRight','KeyD'],
  ok:['Enter','Space','KeyZ','KeyJ','NumpadEnter'],back:['Escape','Backspace','KeyX'],pause:['Escape','KeyP'],
  alt:['Tab','KeyE','KeyY'],alt2:['KeyQ','KeyR']};
let mcur=0, mprev=0, rep={}, padPrevAny=0;
const In = RR.Input = {
  BITS, keys, Ctrl, RemoteCtrl, padList, any:false, lastKey:null, mp:0,
  device:'kb', padStyle:'xbox', btnEdge:-1, PADACT, PADDEF, padMap, rumble, rumbleAll,
  update(dt){
    mprev=mcur; let m=0;
    if(!isTyping()) for(const k in MKEYS){ const l=MKEYS[k]; for(let i=0;i<l.length;i++) if(keys[l[i]]){ m|=MB[k]; break; } }
    let anyBtn=0; const d=deadzone()+0.05; In.btnEdge=-1;
    padList().forEach(g=>{
      const b=g.buttons,a=g.axes; const B=k=>b[k]&&b[k].pressed;
      if(a[1]<-d||B(12)) m|=MB.up; if(a[1]>d||B(13)) m|=MB.down;
      if(a[0]<-d||B(14)) m|=MB.left; if(a[0]>d||B(15)) m|=MB.right;
      if(B(0)) m|=MB.ok; if(B(1)) m|=MB.back; if(B(9)) m|=MB.pause; if(B(3)) m|=MB.alt; if(B(2)) m|=MB.alt2;
      const prev=padPrev[g.index]||[]; let active=Math.abs(a[0]||0)>d||Math.abs(a[1]||0)>d;
      for(let i=0;i<b.length;i++){ const on=!!b[i].pressed; if(on){ anyBtn++; active=true; if(!prev[i]&&In.btnEdge<0) In.btnEdge=i; } prev[i]=on; }
      padPrev[g.index]=prev;
      if(active){ In.device='pad'; In.padStyle=padStyleOf(g); }
    });
    if(anyBtn>padPrevAny){ In.any=true; if(RR.Audio) RR.Audio.unlock(); }
    padPrevAny=anyBtn;
    mcur=m; let p=mcur&~mprev;
    // auto-repeat for directions
    ['up','down','left','right'].forEach(k=>{
      const bit=MB[k];
      if(mcur&bit){ rep[k]=(rep[k]||0)+dt; if(rep[k]>0.38){ rep[k]-=0.075; p|=bit; } } else rep[k]=0;
    });
    In.mp=p;
  },
  m(n){ return !!(In.mp&MB[n]); },
  eat(){ In.mp=0; },
  consumeAny(){ const a=In.any; In.any=false; return a; },
  key(code){ return !!keys[code]; },
  padCount(){ return padList().length; }
};
addEventListener('gamepadconnected', e=>{ In.device='pad'; In.padStyle=padStyleOf(e.gamepad); if(RR.UI) RR.UI.toast('🎮 Kol bağlandı: '+padName(e.gamepad),2600); if(RR.Audio&&RR.Audio.ok) RR.Audio.sfx('select'); });
addEventListener('gamepaddisconnected', e=>{ if(!padList().length) In.device='kb'; if(RR.UI) RR.UI.toast('🎮 Kol çıkarıldı',2600); if(RR.onPadLost) RR.onPadLost(e.gamepad.index); });
})();
