/* BasketballManager — possession-by-possession match engine.
   Each possession records enough (play, roles, shooter, zone, outcome) for the 2D viewer to animate it. */
(function(){
'use strict';
const BM=window.BM, U=BM.U, T=BM.Tactics;
const E = BM.Engine = {};
const BOX=()=>({sec:0,pts:0,fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,orb:0,drb:0,ast:0,stl:0,blk:0,tov:0,pf:0,pm:0});
const POSORD={PG:0,SG:1,SF:2,PF:3,C:4};
const anCache={};
const analysis=(S,id)=>anCache[id]||(anCache[id]=T.analyze(T.getPlay(S,id)));
E.clearCache=()=>{ for(const k in anCache) delete anCache[k]; };

function side(S,tid){
  const t=S.teams[tid]; if(!t.rot) BM.Gen.autoRotation(t,S);
  let avail=t.roster.map(id=>S.players[id]).filter(p=>p&&!p.gl&&!(p.inj&&p.inj.days>0));
  // emergency: never fewer than five bodies (G-League call-ups, then players carrying knocks)
  if(avail.length<5) avail=avail.concat(t.roster.map(id=>S.players[id]).filter(p=>p&&p.gl&&!(p.inj&&p.inj.days>0))).slice(0,8);
  if(avail.length<5) avail=avail.concat(t.roster.map(id=>S.players[id]).filter(p=>p&&!avail.includes(p))).slice(0,8);
  const order=t.rot.order.filter(id=>avail.some(p=>p.id===id)); avail.forEach(p=>{ if(!order.includes(p.id)) order.push(p.id); });
  const s={tid,team:t,ids:order,mins:Object.assign({},t.rot.mins),energy:{},box:{},score:0,qfouls:0,tac:JSON.parse(JSON.stringify(t.tac)),on:[]};
  order.forEach(id=>{ s.energy[id]=1; s.box[id]=BOX(); if(s.mins[id]==null) s.mins[id]=0; });
  s.on=order.slice(0,5); return s;
}
E.newGame=function(S,h,a,o){
  const g={S,h:side(S,h),a:side(S,a),hid:h,aid:a,q:1,clock:720,poss:Math.random()<0.5?'h':'a',done:false,log:[],n:0,lastSub:720,trans:false,elapsed:0,o:o||{}};
  return g;
};
const P=(g,id)=>g.S.players[id];
const eff=(g,s,id,k)=>{ const p=P(g,id); return p.r[k]*(0.82+0.18*s.energy[id]); };
function pickW(items,w){ let tot=0; const ws=items.map((x,i)=>{ const v=Math.max(0.0001,w(x,i)); tot+=v; return v; }); let r=Math.random()*tot; for(let i=0;i<items.length;i++){ r-=ws[i]; if(r<=0) return items[i]; } return items[items.length-1]; }

/* lineup: stars play their minutes, tired players sit, keep at least one guard and one big */
function lineup(g,s){
  const played=s.ids.map(id=>s.box[id].sec/60), el=Math.max(1,g.elapsed/60), late=g.q>=4&&g.clock<240&&Math.abs(g.h.score-g.a.score)<=8;
  const score=s.ids.map((id,i)=>{ const tgt=s.mins[id]||0; if(tgt<=0&&!late) return -99; const pace=tgt/48*el; const need=(pace-played[i])/6; return (late?P(g,id).ovr/10:tgt/12)+need+(s.energy[id]-0.75)*3; });
  const idx=s.ids.map((_,i)=>i).sort((x,y)=>score[y]-score[x]).filter(i=>score[i]>-90);
  const pick=[]; const take=f=>{ const i=idx.find(j=>!pick.includes(j)&&f(P(g,s.ids[j]))); if(i!=null) pick.push(i); };
  take(p=>p.pos==='PG'||p.pos==='SG'); take(p=>p.pos==='PF'||p.pos==='C');
  idx.forEach(i=>{ if(pick.length<5&&!pick.includes(i)) pick.push(i); });
  s.ids.forEach((id,i)=>{ if(pick.length<5&&!pick.includes(i)) pick.push(i); });
  s.on=pick.slice(0,5).map(i=>s.ids[i]).sort((x,y)=>POSORD[P(g,x).pos]-POSORD[P(g,y).pos]);
}
function fatigue(g,dur){ ['h','a'].forEach(k=>{ const s=g[k]; const pr=s.tac.press?1.25:1; s.ids.forEach(id=>{ const on=s.on.includes(id);
  if(on){ s.box[id].sec+=dur; s.energy[id]=Math.max(0.35,s.energy[id]-dur*0.0016*pr*(1.35-P(g,id).r.sta/20)); } else s.energy[id]=Math.min(1,s.energy[id]+dur*0.0022); }); }); }

function credit(s,id,k,v){ s.box[id][k]+=v==null?1:v; }
function addPts(g,offK,n){ const off=g[offK], def=g[offK==='h'?'a':'h']; off.score+=n; off.on.forEach(id=>off.box[id].pm+=n); def.on.forEach(id=>def.box[id].pm-=n); }

E.step=function(g){
  if(g.done) return null;
  const S=g.S, offK=g.poss, defK=offK==='h'?'a':'h', off=g[offK], def=g[defK];
  if(g.lastSub-g.clock>=170||g.clock===720||g.needSub){ [g.h,g.a].forEach(s=>{ if(s.hold&&g.elapsed<s.hold&&!g.needSub) return; s.hold=0; lineup(g,s); }); g.lastSub=g.clock; g.needSub=false; }
  const defSet=T.getDef(def.tac.def,S), isZone=defSet.type==='zone', press=def.tac.press||defSet.press;
  const ev={off:offK,q:g.q,on:off.on.slice(),don:def.on.slice(),def:defSet.id,pts:0};
  // transition chance after a stop
  const spd=k=>g[k].on.reduce((a,id)=>a+eff(g,g[k],id,'spd'),0)/5;
  const fast=g.trans&&Math.random()<0.1+(spd(offK)-spd(defK))*0.02+(off.tac.pace-1)*0.25+(press?0.04:0);
  let playId, an;
  if(fast){ playId='fast'; an={zone:'rim',shooter:1,passes:1,screens:0,dur:4,spacing:0.6,outside:2}; }
  else { const w=off.tac.plays; const ids=Object.keys(w).filter(id=>w[id]>0); playId=ids.length?pickW(ids,id=>w[id]):'pnr'; an=analysis(S,playId); }
  ev.play=playId;
  const roles=off.on.slice(); // PG..C order = roles 1..5
  ev.roles=roles;
  let dur=fast?U.rnd(3,7):U.clamp(an.dur+U.rnd(9,15.5)+U.gauss()*2.5,6,24)/(off.tac.pace||1);
  if(g.putback){ dur*=0.45; g.putback=false; ev.putback=true; }
  const ballH=roles[0];
  // turnovers
  const hp=(eff(g,off,ballH,'han')+eff(g,off,ballH,'pas'))/2, st=def.on.reduce((a,id)=>a+eff(g,def,id,'stl'),0)/5;
  const dm=T.defMods(defSet), pnrD=def.tac.pnrD||'drop';
  let tov=0.142-(hp-11)*0.006+(st-9)*0.005+an.passes*0.004+(press?0.035:0)+dm.tov+(an.screens&&!isZone?(pnrD==='blitz'?0.025:pnrD==='hedge'?0.01:0):0);
  if(Math.random()<U.clamp(tov,0.05,0.25)){
    const loser=pickW(roles,(id,i)=>i===0?3:1); credit(off,loser,'tov'); ev.type='tov'; ev.by=loser;
    if(Math.random()<0.55){ const thief=pickW(def.on,id=>Math.pow(eff(g,def,id,'stl'),2)); credit(def,thief,'stl'); ev.stl=thief; g.trans=true; ev.text=P(g,thief).name+' topu çaldı ('+P(g,loser).name+')'; }
    else { g.trans=false; ev.text=P(g,loser).name+' top kaybı'; }
    dur=Math.min(dur,U.rnd(4,12)); return finish(g,ev,dur,true);
  }
  // shooter + zone
  let shooter;
  if(fast) shooter=pickW(roles,id=>Math.pow(eff(g,off,id,'spd'),2));
  else if(Math.random()<0.62) shooter=roles[an.shooter-1];
  else shooter=pickW(roles,id=>{ const p=P(g,id); return Math.pow(p.ovr-35,2)*(0.6+0.4*off.energy[id]); });
  const sp=P(g,shooter);
  let zone=an.zone;
  if(!fast&&(shooter!==roles[an.shooter-1]||Math.random()<0.3)){ const w3=0.8*Math.pow(sp.r.thr,2.2)*(off.tac.three||1)*(zone==='three'?1.3:1), wr=Math.pow((sp.r.ins+sp.r.str)/2,2.2), wm=Math.pow(sp.r.mid,2.1)*0.7; zone=pickW(['three','rim','mid'],z=>z==='three'?w3:z==='rim'?wr:wm); }
  ev.shooter=shooter; ev.zone=zone;
  // contest from the matched defender (man) or the nearest zone defender
  const roleIdx=roles.indexOf(shooter), defender=def.on[zone==='rim'?(Math.random()<0.6?4:roleIdx):roleIdx]||def.on[0];
  const skill={rim:(eff(g,off,shooter,'ins')*0.6+eff(g,off,shooter,'str')*0.2+eff(g,off,shooter,'jmp')*0.2),mid:eff(g,off,shooter,'mid'),three:eff(g,off,shooter,'thr')}[zone];
  const cont={rim:(eff(g,def,defender,'idef')*0.55+eff(g,def,defender,'blk')*0.45),mid:eff(g,def,defender,'pdef'),three:eff(g,def,defender,'pdef')}[zone];
  let pct={rim:0.53,mid:0.345,three:0.27}[zone]+(skill-10)*0.018-(cont-10)*0.012;
  pct+=fast?0.08:(an.spacing*0.03+an.screens*(defSet.switching?0.004:isZone?0.006:0.012)+an.passes*(isZone?0.004:0.008));
  if(zoneDef(defSet)){ pct+=dm[zone]; if(zone==='three'&&an.outside>=3) pct+=0.02; if(an.passes>=3) pct+=0.012; }
  else if(an.screens&&!defSet.switching){ pct+={drop:{rim:-0.02,mid:0.025,three:0.005},hedge:{rim:0.01,mid:0,three:-0.01},blitz:{rim:0.035,mid:0.01,three:0.01}}[pnrD][zone]; }
  if(defSet.switching&&an.screens>0&&P(g,defender).hgt<P(g,shooter).hgt-8&&zone==='rim') pct+=0.04;
  if(offK==='h') pct+=0.012;
  pct+=U.gauss()*0.03*(1.5-sp.r.cons/20);
  pct=U.clamp(pct,0.12,0.86);
  const fr={rim:0.21,mid:0.075,three:0.022}[zone]*(1+(eff(g,off,shooter,'str')-10)*0.03);
  const fouled=Math.random()<fr, made=Math.random()<pct*(fouled?0.42:1);
  const tp=zone==='three';
  credit(off,shooter,'fga'); if(tp) credit(off,shooter,'tpa');
  ev.type='shot'; ev.made=made;
  if(fouled){ const fouler=defender; credit(def,fouler,'pf'); def.qfouls++; ev.foul=fouler; }
  if(made){ credit(off,shooter,'fgm'); if(tp) credit(off,shooter,'tpm'); const n=tp?3:2; credit(off,shooter,'pts',n); addPts(g,offK,n); ev.pts=n;
    const astP={rim:0.45,mid:0.55,three:0.8}[zone]*(playId==='iso'?0.4:1)*(fast?0.7:1);
    if(Math.random()<astP){ const cands=roles.filter(id=>id!==shooter); const passer=pickW(cands,id=>Math.pow(eff(g,off,id,'pas'),2.2)*(id===roles[0]?1.6:1)); credit(off,passer,'ast'); ev.ast=passer; }
    ev.text=sp.name+' '+(tp?'üçlük':zone==='rim'?'pota altı':'orta mesafe')+' sayı'+(ev.ast?' (asist '+P(g,ev.ast).name+')':'');
  }
  if(fouled){ const n=made?1:(tp?3:2); const ftp=U.clamp(0.42+eff(g,off,shooter,'ft')*0.023,0.4,0.93); let m=0; for(let i=0;i<n;i++){ credit(off,shooter,'fta'); if(Math.random()<ftp){ m++; credit(off,shooter,'ftm'); credit(off,shooter,'pts'); addPts(g,offK,1); } }
    ev.ft=[m,n]; ev.pts+=m; ev.text=(ev.text||sp.name+' faul aldı')+' · serbest atış '+m+'/'+n; if(made||m===n||Math.random()<0.6){ g.trans=false; return finish(g,ev,dur,true); } }
  if(made){ g.trans=false; return finish(g,ev,dur,true); }
  // miss: block, then rebound
  if(zone!=='three'){ const bl=pickW(def.on,id=>Math.pow(eff(g,def,id,'blk'),2.5)); if(Math.random()<(eff(g,def,bl,"blk")-5)*0.021){ credit(def,bl,'blk'); ev.blk=bl; } }
  const orbS=off.on.reduce((a,id)=>a+eff(g,off,id,'orb'),0), drbS=def.on.reduce((a,id)=>a+eff(g,def,id,'drb'),0);
  const oreb=Math.random()<U.clamp(0.25+(orbS-drbS)/5*0.013+(zone==='three'?0.02:0),0.12,0.4);
  if(oreb){ const rb=pickW(off.on,id=>Math.pow(eff(g,off,id,'orb'),2.4)); credit(off,rb,'orb'); ev.reb=rb; ev.oreb=true; g.putback=true; ev.text=(sp.name+' kaçırdı'+(ev.blk?' (blok '+P(g,ev.blk).name+')':''))+' · hücum ribaundu '+P(g,rb).name; g.trans=false; return finish(g,ev,dur,false); }
  const rb=pickW(def.on,id=>Math.pow(eff(g,def,id,'drb'),2.4)); credit(def,rb,'drb'); ev.reb=rb; ev.text=sp.name+' kaçırdı'+(ev.blk?' (blok '+P(g,ev.blk).name+')':'')+' · ribaund '+P(g,rb).name; g.trans=true;
  return finish(g,ev,dur,true);
};
const zoneDef=d=>d.type==='zone';
function finish(g,ev,dur,swap){
  dur=Math.min(dur,g.clock); g.clock-=dur; g.elapsed+=dur; fatigue(g,dur); ev.dur=dur; ev.clock=g.clock; ev.score=[g.h.score,g.a.score]; g.n++;
  // random non-shooting fouls put teams in the bonus
  if(Math.random()<0.09){ const dk=ev.off==='h'?'a':'h', d=g[dk], f=U.pick(d.on); credit(d,f,'pf'); d.qfouls++; if(d.qfouls>=5&&ev.type!=='tov'){ const o=g[ev.off], sh=U.pick(o.on); const ftp=U.clamp(0.42+eff(g,o,sh,'ft')*0.023,0.4,0.93); let m=0; for(let i=0;i<2;i++){ credit(o,sh,'fta'); if(Math.random()<ftp){ m++; credit(o,sh,'ftm'); credit(o,sh,'pts'); addPts(g,ev.off,1);} } ev.bonus=[sh,m]; ev.score=[g.h.score,g.a.score]; } }
  if(swap) g.poss=ev.off==='h'?'a':'h';
  g.log.push(ev);
  if(g.clock<=0){
    if(g.q<4||g.h.score===g.a.score){ g.q++; g.clock=g.q>4?300:720; g.lastSub=g.clock+999; g.h.qfouls=0; g.a.qfouls=0; g.needSub=true; if(g.q===2||g.q===4) g.poss=Math.random()<0.5?'h':'a'; ev.endQ=g.q-1; }
    else { g.done=true; ev.end=true; }
  }
  return ev;
}
E.sim=function(S,h,a){ const g=E.newGame(S,h,a); let guard=0; while(!g.done&&guard++<800) E.step(g); return g; };
})();
