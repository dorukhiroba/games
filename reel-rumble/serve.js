// Reel Rumble — tiny static server: `node serve.js` then open http://localhost:8642
const http=require('http'), fs=require('fs'), path=require('path');
const PORT=process.env.PORT||8642, ROOT=__dirname;
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json','.md':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
  let p=decodeURIComponent((req.url||'/').split('?')[0]); if(p==='/') p='/index.html';
  const f=path.normalize(path.join(ROOT,p));
  if(!f.startsWith(ROOT)){ res.writeHead(403); return res.end(); }
  fs.readFile(f,(err,data)=>{ if(err){ res.writeHead(404); return res.end('404'); } res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'}); res.end(data); });
}).listen(PORT,()=>console.log('Reel Rumble: http://localhost:'+PORT));
