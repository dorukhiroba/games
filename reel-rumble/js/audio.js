/* Reel Rumble — audio: synthesized SFX + procedural swing/ragtime music (all generated, original) */
(function(){
'use strict';
const A = RR.Audio = {ctx:null, ok:false, pending:null, cur:null, last:{}};

A.unlock = function(){
  if(!this.ctx){
    try{
      const C = window.AudioContext||window.webkitAudioContext; if(!C) return;
      const c = this.ctx = new C();
      this.comp = c.createDynamicsCompressor(); this.comp.threshold.value=-14; this.comp.ratio.value=4;
      this.master = c.createGain(); this.master.connect(this.comp); this.comp.connect(c.destination);
      this.mus = c.createGain(); this.mus.connect(this.master);
      this.sfxG = c.createGain(); this.sfxG.connect(this.master);
      const len = c.sampleRate*2, buf = c.createBuffer(1,len,c.sampleRate), d = buf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
      this.noiseBuf = buf; this.ok = true; this.applyVol();
      if(this.pending){ const p=this.pending; this.pending=null; this.playMusic(p); }
    }catch(e){ return; }
  }
  if(this.ctx && this.ctx.state==='suspended') this.ctx.resume();
};
A.applyVol = function(){ if(!this.ctx) return; const s=RR.Save.d.set; this.mus.gain.value=s.music*0.55; this.sfxG.gain.value=s.sfx*0.55; };

function tone(type,f0,f1,dur,vol,when,dest,att){
  const c=A.ctx, t=when||c.currentTime, o=c.createOscillator(), g=c.createGain();
  o.type=type; o.frequency.setValueAtTime(f0,t); if(f1) o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  if(att){ g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(vol,t+att); } else g.gain.setValueAtTime(vol,t);
  g.gain.exponentialRampToValueAtTime(0.0008,t+dur);
  o.connect(g); g.connect(dest||A.sfxG); o.start(t); o.stop(t+dur+0.03);
  return o;
}
function noise(dur,vol,ft,f0,f1,when,dest,q){
  const c=A.ctx, t=when||c.currentTime, s=c.createBufferSource(), f=c.createBiquadFilter(), g=c.createGain();
  s.buffer=A.noiseBuf; f.type=ft||'lowpass'; f.frequency.setValueAtTime(f0||2000,t); if(q) f.Q.value=q;
  if(f1) f.frequency.exponentialRampToValueAtTime(f1,t+dur);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0008,t+dur);
  s.connect(f); f.connect(g); g.connect(dest||A.sfxG); s.start(t,Math.random()*1.5); s.stop(t+dur+0.03);
}

const SFX = {
  shoot:[0.045,()=>{ tone('square',820,420,0.05,0.07); }],
  hit:[0.05,()=>{ noise(0.05,0.12,'highpass',2500); }],
  tink:[0.08,()=>{ tone('triangle',2200,1800,0.06,0.08); }],
  jump:[0.05,()=>{ tone('sine',320,720,0.13,0.18); }],
  land:[0.08,()=>{ noise(0.07,0.12,'lowpass',600); }],
  dash:[0.05,()=>{ noise(0.22,0.28,'bandpass',600,3200,0,0,1.2); }],
  parry:[0.05,()=>{ const t=A.ctx.currentTime; tone('sine',1318,0,0.5,0.25,t); tone('sine',1975,0,0.45,0.18,t+0.04); tone('triangle',2637,0,0.3,0.08,t+0.08); }],
  hurt:[0.1,()=>{ tone('sawtooth',420,70,0.35,0.22); noise(0.2,0.2,'lowpass',1500); }],
  ex:[0.05,()=>{ tone('square',180,900,0.25,0.15); noise(0.25,0.2,'bandpass',1200,300,0,0,2); }],
  super:[0.1,()=>{ const t=A.ctx.currentTime; [523,659,784,1046].forEach((f,i)=>tone('square',f,0,0.5,0.1,t+i*0.07)); noise(0.8,0.2,'lowpass',4000,300,t); }],
  boom:[0.06,()=>{ noise(0.6,0.45,'lowpass',1800,80); tone('sine',120,35,0.4,0.4); }],
  small:[0.05,()=>{ noise(0.18,0.22,'lowpass',2200,200); }],
  coin:[0.08,()=>{ const t=A.ctx.currentTime; tone('square',988,0,0.08,0.1,t); tone('square',1319,0,0.25,0.1,t+0.08); }],
  move:[0.03,()=>{ tone('square',660,0,0.04,0.06); }],
  select:[0.05,()=>{ const t=A.ctx.currentTime; tone('square',660,0,0.06,0.08,t); tone('square',990,0,0.12,0.08,t+0.05); }],
  back:[0.05,()=>{ tone('square',500,300,0.1,0.07); }],
  deny:[0.1,()=>{ tone('sawtooth',160,120,0.25,0.12); }],
  phase:[0.2,()=>{ const t=A.ctx.currentTime; [262,330,392,466].forEach(f=>tone('sawtooth',f,f*0.97,0.6,0.07,t)); noise(0.5,0.25,'lowpass',900,100,t); }],
  ko:[0.3,()=>{ const t=A.ctx.currentTime; noise(1.4,0.5,'lowpass',2500,60,t); tone('sine',90,30,1,0.5,t); [523,659,784].forEach((f,i)=>tone('square',f,0,0.7,0.09,t+0.3+i*0.12)); }],
  tele:[0.1,()=>{ tone('triangle',500,1400,0.35,0.12); }],
  bounce:[0.06,()=>{ tone('sine',180,520,0.18,0.2); }],
  whistle:[0.2,()=>{ tone('sine',1700,1650,0.6,0.12,0,0,0.05); tone('sine',2140,2100,0.6,0.08,0,0,0.05); }],
  sing:[0.2,()=>{ const o=tone('sine',880,1320,0.7,0.14,0,0,0.05); }],
  beam:[0.2,()=>{ tone('sawtooth',110,90,1.2,0.12); noise(1.2,0.15,'bandpass',800,2000,0,0,1); }],
  stamp:[0.2,()=>{ noise(0.15,0.4,'lowpass',900); tone('sine',140,60,0.2,0.35); }],
  ready:[0.2,()=>{ const t=A.ctx.currentTime; tone('square',392,0,0.12,0.1,t); tone('square',523,0,0.3,0.1,t+0.14); }],
  revive:[0.2,()=>{ const t=A.ctx.currentTime; [523,659,784,1046,1318].forEach((f,i)=>tone('sine',f,0,0.3,0.12,t+i*0.06)); }],
  charge:[0.15,()=>{ tone('sine',300,900,0.4,0.08); }]
};
A.sfx = function(n){
  if(!this.ok) return; const s=SFX[n]; if(!s) return;
  const now=this.ctx.currentTime; if(this.last[n] && now-this.last[n]<s[0]) return; this.last[n]=now;
  try{ s[1](); }catch(e){}
};

/* ---------------- music ---------------- */
const CH = {M:[0,4,7],m:[0,3,7],'7':[0,4,7,10],m7:[0,3,7,10],d:[0,3,6]};
const SC = {maj:[0,2,4,5,7,9,11],min:[0,2,3,5,7,8,10]};
const PROG = {
  maj:[[0,'M'],[9,'7'],[2,'7'],[7,'7'],[0,'M'],[5,'M'],[2,'m7'],[7,'7'],[4,'7'],[9,'7'],[2,'7'],[7,'7'],[0,'M'],[5,'M'],[7,'7'],[0,'M']],
  min:[[0,'m'],[0,'m'],[5,'m'],[0,'m'],[8,'7'],[7,'7'],[0,'m'],[7,'7'],[5,'m'],[5,'m'],[0,'m'],[8,'7'],[2,'d'],[7,'7'],[0,'m'],[7,'7']]
};
const RHY = [[1,0,1,1,0,1,1,0],[1,2,1,2,1,1,1,0],[1,1,1,1,1,0,1,0],[1,2,2,1,0,1,1,1],[0,1,1,1,1,2,1,0],[1,0,0,1,1,0,1,2],[1,1,0,1,1,1,0,1],[1,2,2,2,1,0,0,0]];
const TRACKS = {
  title:{bpm:132,root:55,mode:'maj',seed:11,lead:'clar'},
  menu:{bpm:124,root:57,mode:'maj',seed:17,lead:'clar'},
  map:{bpm:112,root:53,mode:'maj',seed:23,lead:'clar',soft:true},
  shop:{bpm:96,root:58,mode:'maj',seed:37,lead:'clar',soft:true},
  tutorial:{bpm:118,root:60,mode:'maj',seed:5,lead:'clar'},
  corn:{bpm:172,root:55,mode:'maj',seed:101,lead:'tpt'},
  gramo:{bpm:150,root:50,mode:'min',seed:202,lead:'clar'},
  boiler:{bpm:178,root:52,mode:'min',seed:303,lead:'tpt'},
  proj:{bpm:186,root:48,mode:'min',seed:404,lead:'tpt'},
  cloud:{bpm:164,root:53,mode:'maj',seed:505,lead:'clar'},
  paper:{bpm:170,root:51,mode:'min',seed:606,lead:'tpt'},
  run:{bpm:158,root:57,mode:'maj',seed:707,lead:'tpt'},
  win:{bpm:144,root:60,mode:'maj',seed:9,lead:'tpt',bars:4},
  lose:{bpm:80,root:57,mode:'min',seed:13,lead:'clar',bars:4,soft:true}
};
function build(id){
  const T=TRACKS[id], R=RR.U.seeded(T.seed), sc=SC[T.mode], prog=PROG[T.mode], bars=T.bars||16;
  const ev=[]; // per step: list of [inst, midi, lenSteps]
  const steps=bars*8; for(let i=0;i<steps;i++) ev.push([]);
  let prev=T.root+12+sc[2];
  const melBars=[];
  for(let b=0;b<bars;b++){
    const [cr,cq]=prog[b%prog.length], chord=CH[cq].map(x=>x+cr);
    const s=b*8;
    // bass / stride
    const bassRoot=T.root-12+cr;
    ev[s].push(['bass',bassRoot,3]); ev[s+4].push(['bass',bassRoot+(b%2?7:(cq==='m'||cq==='m7'?3:4))-(b%2?12:0)+ (b%2?12:0),3]);
    if(!T.soft||true){ [2,6].forEach(k=>chord.slice(0,3).forEach(n=>ev[s+k].push(['stab',T.root+n+(n<5?12:0),1]))); }
    ev[s].push(['kick',0,1]); ev[s+4].push(['kick',0,1]);
    if(!T.soft){ ev[s+2].push(['snare',0,1]); ev[s+6].push(['snare',0,1]); }
    for(let k=0;k<8;k+=(T.soft?2:1)) if(k%2===0||R()<0.5) ev[s+k].push(['hat',0,1]);
    // melody: A A' B A'' structure
    let mel;
    const sec=Math.floor(b/4)%4;
    if((sec===1||sec===3) && melBars[b-4*(sec===1?1:3)] && R()<0.75){
      mel=melBars[b-4*(sec===1?1:3)].map(x=>x?[x[0],x[1]]:null);
      if(R()<0.5){ const j=Math.floor(R()*8); if(mel[j]) mel[j][0]+= (R()<0.5?2:-1); }
    } else {
      const rhy=RHY[Math.floor(R()*RHY.length)]; mel=new Array(8).fill(null);
      for(let k=0;k<8;k++){
        if(rhy[k]!==1) continue;
        let len=1; while(k+len<8&&rhy[k+len]===2) len++;
        let n;
        if(k%4===0){ // chord tone nearest prev
          let best=prev,bd=99; for(let o=0;o<3;o++) chord.forEach(c=>{ const cand=T.root+12*o+c; const d=Math.abs(cand-prev)+R()*3; if(d<bd&&cand>=T.root+7&&cand<=T.root+26){bd=d;best=cand;} }); n=best;
        } else {
          // scale step
          const deg=sc.map(x=>x); let cands=[]; for(let o=0;o<3;o++) deg.forEach(x=>{const c=T.root+12*o+x; if(Math.abs(c-prev)<=4&&c!==prev&&c>=T.root+7&&c<=T.root+26) cands.push(c);});
          n=cands.length?cands[Math.floor(R()*cands.length)]:prev;
        }
        if(b===bars-1&&k>=4) n=T.root+12;
        mel[k]=[n,len]; prev=n;
      }
    }
    melBars[b]=mel;
    mel.forEach((x,k)=>{ if(x) ev[s+k].push([T.lead,x[0],x[1]]); });
  }
  return {T,ev,steps,stepDur:60/T.bpm/2};
}
const mtof=m=>440*Math.pow(2,(m-69)/12);
function play(inst,m,len,t,sd,dest){
  const c=A.ctx;
  if(inst==='kick'){ tone('sine',110,40,0.13,0.45,t,dest); return; }
  if(inst==='snare'){ noise(0.12,0.22,'bandpass',1800,0,t,dest,0.9); return; }
  if(inst==='hat'){ noise(0.04,0.06,'highpass',7000,0,t,dest); return; }
  const f=mtof(m), dur=Math.max(0.08,len*sd*0.95);
  if(inst==='bass'){ tone('triangle',f,0,dur*1.1,0.38,t,dest,0.005); tone('sine',f,0,dur,0.18,t,dest,0.005); return; }
  if(inst==='stab'){ const fl=c.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=1700; fl.connect(dest); tone('square',f,0,0.11,0.045,t,fl,0.004); return; }
  const fl=c.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value= inst==='tpt'?2600:2100; fl.Q.value= inst==='tpt'?3:1; fl.connect(dest);
  const o=c.createOscillator(), g=c.createGain(), lfo=c.createOscillator(), lg=c.createGain();
  o.type= inst==='tpt'?'sawtooth':'square'; o.frequency.setValueAtTime(f*(inst==='tpt'?0.97:1),t); o.frequency.linearRampToValueAtTime(f,t+0.04);
  lfo.frequency.value=5.5; lg.gain.value=f*0.008; lfo.connect(lg); lg.connect(o.frequency);
  const v= inst==='tpt'?0.075:0.085;
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(v,t+0.025); g.gain.setValueAtTime(v*0.8,t+dur*0.7); g.gain.exponentialRampToValueAtTime(0.0008,t+dur);
  o.connect(g); g.connect(fl); o.start(t); lfo.start(t); o.stop(t+dur+0.05); lfo.stop(t+dur+0.05);
}
A.playMusic = function(id){
  if(this.cur===id) return;
  this.stopMusic(); this.cur=id;
  if(!this.ok){ this.pending=id; return; }
  if(!TRACKS[id]) return;
  const song=build(id), g=this.ctx.createGain(); g.gain.value=1; g.connect(this.mus);
  const st={song,g,step:0,next:this.ctx.currentTime+0.12};
  st.timer=setInterval(()=>{
    if(!A.ctx) return;
    while(st.next < A.ctx.currentTime+0.15){
      const sd=song.stepDur, swing=(st.step%2)?sd/3:0, list=song.ev[st.step];
      for(let i=0;i<list.length;i++){ try{ play(list[i][0],list[i][1],list[i][2],st.next+swing,sd,g); }catch(e){} }
      st.next+=sd; st.step=(st.step+1)%song.steps;
    }
  },25);
  this.st=st;
};
A.stopMusic = function(){
  this.pending=null; this.cur=null;
  const st=this.st; if(!st) return; this.st=null; clearInterval(st.timer);
  try{ const t=this.ctx.currentTime; st.g.gain.setValueAtTime(st.g.gain.value,t); st.g.gain.linearRampToValueAtTime(0,t+0.3); setTimeout(()=>{ try{st.g.disconnect();}catch(e){} },500); }catch(e){}
};
})();
