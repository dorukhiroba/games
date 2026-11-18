/* BasketballManager — UI helpers: toast, modal, sortable tables, rating colours, links */
(function(){
'use strict';
const BM=window.BM, U=BM.U;
const UI = BM.UI = {};
let toastT=null;
UI.toast=function(msg,ms){ const t=document.getElementById('toast'); if(!t) return; t.innerHTML=msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.add('hidden'),ms||2800); };
UI.modal=function(html,o){ o=o||{}; const m=document.getElementById('modal'); m.innerHTML=`<div class="box" style="${o.w?'max-width:'+o.w+'px':''}">${o.noX?'':'<button class="btn sm ghost" data-close style="float:right">✕</button>'}${html}</div>`; m.classList.remove('hidden');
  m.onclick=e=>{ if((e.target===m&&!o.sticky)||e.target.closest('[data-close]')) UI.close(); }; return m.querySelector('.box'); };
UI.close=function(){ const m=document.getElementById('modal'); m.classList.add('hidden'); m.innerHTML=''; if(UI.onClose){ const f=UI.onClose; UI.onClose=null; f(); } };
UI.isOpen=()=>!document.getElementById('modal').classList.contains('hidden');
UI.confirm=function(msg,yes,o){ o=o||{}; const b=UI.modal(`<h2>${o.title||'Emin misin?'}</h2><div>${msg}</div><div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn" data-close>Vazgeç</button><button class="btn ${o.danger?'danger':'pri'}" data-yes>${o.ok||'Onayla'}</button></div>`,{w:520});
  b.querySelector('[data-yes]').onclick=()=>{ UI.close(); yes(); }; };

/* 1-20 rating colours */
UI.acol=v=>v>=17?'#1f8a5a':v>=14?'#3d7f3a':v>=11?'#6f6a1f':v>=8?'#7a4a1c':'#7a2430';
UI.attr=v=>`<span class="attr" style="background:${UI.acol(v)}">${Math.round(v)}</span>`;
UI.ocol=v=>v>=80?'#f26b1d':v>=72?'#2f8f5f':v>=64?'#3a6ea8':v>=56?'#5b6578':'#40485a';
UI.ovr=v=>`<span class="ovr" style="background:${UI.ocol(v)};color:#fff">${v}</span>`;
UI.crest=(t,sz)=>{ if(!t) return ''; const c=t.c1, l=(()=>{ const n=parseInt(c.slice(1),16); return ((n>>16&255)*0.299+(n>>8&255)*0.587+(n&255)*0.114)/255; })(); return `<span class="crest" style="background:${c};color:${l>0.62?'#111':'#fff'};${sz?`width:${sz}px;height:${sz}px;font-size:${Math.round(sz*0.38)}px`:''}">${t.abbr}</span>`; };
UI.pl=p=>p?`<a href="#" data-p="${p.id}">${U.esc(p.name)}</a>`:'—';
UI.tm=(S,tid)=>{ const t=S.teams[tid]; return t?`<a href="#" data-t="${tid}">${t.abbr}</a>`:tid===-1?'<span class="pill">SO</span>':tid===-2?'<span class="pill b">Aday</span>':'—'; };
UI.money=v=>U.money(v);
UI.stars=(v,max)=>{ const n=Math.round(U.clamp(v,0,max||5)*2)/2; let s=''; for(let i=1;i<=(max||5);i++) s+=n>=i?'★':n>=i-0.5?'⯪':'☆'; return `<span style="color:#ffc53d;letter-spacing:1px">${s}</span>`; };
UI.injury=p=>p.inj&&p.inj.days>0?`<span class="pill r" title="${U.esc(p.inj.name)}">✚ ${p.inj.days}g</span>`:'';
UI.moodTxt=m=>m>=80?'<span class="good">Çok mutlu</span>':m>=60?'Memnun':m>=40?'<span class="warn">Huzursuz</span>':'<span class="bad">Mutsuz</span>';
UI.pg=(st,k,d)=>st&&st.gp?(st[k]/st.gp).toFixed(d==null?1:d):'-';
UI.pct=(a,b)=>b?(a/b*100).toFixed(1):'-';

/* ---------- sortable tables ----------
   cols: [{k:'name', l:'Ad', n:numeric, v:row=>sortValue, f:row=>cellHtml, w:'title'}], rows: data, o: {id, pid:row=>playerId, me:row=>bool, sort:'k', desc:true, limit} */
const reg={};
UI.table=function(cols,rows,o){
  o=o||{}; const id=o.id||('t'+Math.random().toString(36).slice(2,8)); reg[id]={cols,rows,o:Object.assign({},o,{id})}; return `<div class="tw" data-tbl="${id}"${o.h?` style="max-height:${o.h}"`:''}>${tbody(id)}</div>`;
};
function tbody(id){
  const {cols,rows,o}=reg[id]; let rs=rows.slice();
  if(o.sort){ const c=cols.find(c=>c.k===o.sort); if(c){ const val=c.v||(r=>r[c.k]); rs.sort((a,b)=>{ const x=val(a), y=val(b); const r=typeof x==='string'?String(x).localeCompare(String(y),'tr'):(x==null?-1e9:x)-(y==null?-1e9:y); return o.desc?-r:r; }); } }
  if(o.limit) rs=rs.slice(0,o.limit);
  const th=cols.map(c=>`<th class="${c.n?'n':''}" data-sk="${c.k}" title="${U.esc(c.w||'')}">${c.l}${o.sort===c.k?(o.desc?' ▾':' ▴'):''}</th>`).join('');
  const tr=rs.map(r=>{ const pid=o.pid?o.pid(r):null; return `<tr class="${pid!=null||o.rowAttr?'click':''}${o.me&&o.me(r)?' me':''}"${pid!=null?` data-p="${pid}"`:''}${o.rowAttr?' '+o.rowAttr(r):''}>${cols.map(c=>`<td class="${c.n?'n':''}">${c.f?c.f(r):U.esc(r[c.k]==null?'':r[c.k])}</td>`).join('')}</tr>`; }).join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr||`<tr><td colspan="${cols.length}" class="muted">Kayıt yok</td></tr>`}</tbody></table>`;
}
document.addEventListener('click',e=>{
  const th=e.target.closest('th[data-sk]'); if(!th) return; const w=th.closest('[data-tbl]'); if(!w||!reg[w.dataset.tbl]) return;
  const t=reg[w.dataset.tbl], k=th.dataset.sk; if(t.o.sort===k) t.o.desc=!t.o.desc; else { t.o.sort=k; const c=t.cols.find(c=>c.k===k); t.o.desc=!!(c&&c.n); }
  w.innerHTML=tbody(w.dataset.tbl);
});
UI.spark=function(points,w,h){ if(!points||points.length<2) return '<span class="dim">—</span>'; w=w||260; h=h||60; const vs=points.map(p=>p[1]), mn=Math.min(...vs)-2, mx=Math.max(...vs)+2;
  const X=i=>i/(points.length-1)*(w-8)+4, Y=v=>h-4-(v-mn)/(mx-mn||1)*(h-8);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="#f26b1d" stroke-width="2" points="${points.map((p,i)=>X(i)+','+Y(p[1])).join(' ')}"/>${points.map((p,i)=>`<circle cx="${X(i)}" cy="${Y(p[1])}" r="2.5" fill="#ffb36b"><title>${p[0]}: ${p[1]}</title></circle>`).join('')}</svg>`; };
})();
