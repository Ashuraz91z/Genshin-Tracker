import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { mkdirSync, existsSync, createReadStream } from 'node:fs';
import { dirname, resolve, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore, Problem, secret } from './store.mjs';

const ROOT=dirname(fileURLToPath(import.meta.url));
export function createApp({dbPath=join(ROOT,'data/tracker.sqlite'),publicUrl='',download=resolve(ROOT,'../dist/GenshinTracker-KameraFR-0.2.0.zip')}={}) {
  mkdirSync(dirname(dbPath),{recursive:true,mode:0o700});
  const store=openStore(dbPath),rates=new Map();
  const publicOrigin=publicUrl?new URL(publicUrl).origin:null;
  if(publicOrigin && !publicOrigin.startsWith('https://') && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(publicOrigin)) throw new Error('PUBLIC_URL doit utiliser HTTPS hors localhost.');
  const secure=publicOrigin?.startsWith('https:');
  function respond(res,status,body,headers={}) {
    res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(body));
  }
  function cookie(token,remove=false) {return `gt_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${remove?0:604800}${secure?'; Secure':''}`;}
  const server=http.createServer(async(req,res)=>{
    const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY',
      'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"};
    Object.entries(headers).forEach(([k,v])=>res.setHeader(k,v));
    try {
      const url=new URL(req.url,'http://localhost'),path=url.pathname;
      if(path==='/health') return respond(res,200,{ok:true});
      if(!publicOrigin && !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(req.headers.host??'')) throw new Problem('Configurer PUBLIC_URL avant un accès distant.',403);
      const origin=publicOrigin??`http://${req.headers.host}`;
      if(req.method==='POST' || req.method==='DELETE') {
        if(req.headers.origin && req.headers.origin!==origin) throw new Problem('Origine de requête refusée.',403);
        if(!['/api/device/pair','/api/sync'].includes(path) && req.headers.origin!==origin) throw new Problem('Origine de requête requise.',403);
      }
      const session=(req.headers.cookie??'').split(';').map(x=>x.trim()).find(x=>x.startsWith('gt_session='))?.slice(11);
      const user=store.user(session);
      const requireUser=()=>{if(!user)throw new Problem('Connectez-vous pour accéder à votre compte.',401);return user;};
      async function body() {
        if(!(req.headers['content-type']??'').startsWith('application/json'))throw new Problem('Format JSON requis.',415);
        let size=0;const chunks=[];
        for await(const chunk of req) {size+=chunk.length;if(size>16*1024*1024)throw new Problem('Scan trop volumineux (16 Mo maximum).',413);chunks.push(chunk);}
        try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Problem('JSON illisible.');}
      }
      if(path==='/api/register' || path==='/api/login' || path==='/api/device/pair') {
        const ip=req.socket.remoteAddress,rateKey=ip+path,previous=rates.get(rateKey);
        const rate=previous && previous.until>Date.now()?previous:{count:0,until:Date.now()+600000};
        if(++rate.count>30)throw new Problem('Trop de tentatives. Réessayez dans dix minutes.',429);
        rates.set(rateKey,rate);
        if(rates.size>1000)for(const [key,value] of rates)if(value.until<Date.now())rates.delete(key);
      }
      if(req.method==='POST' && ['/api/register','/api/login'].includes(path)) {
        const input=await body();
        const account=path==='/api/register'?store.register(input.name,input.password):store.login(input.name,input.password);
        return respond(res,200,{user:{name:account.name}},{'Set-Cookie':cookie(store.session(account))});
      }
      if(req.method==='POST' && path==='/api/logout') {store.logout(session);return respond(res,200,{ok:true},{'Set-Cookie':cookie('',true)});}
      if(req.method==='GET' && path==='/api/account') return respond(res,200,store.account(requireUser()));
      if(req.method==='POST' && path==='/api/pair') return respond(res,200,store.pair(requireUser()));
      if(req.method==='DELETE' && path.startsWith('/api/devices/')) {store.revoke(requireUser(),decodeURIComponent(path.split('/').pop()));return respond(res,200,{ok:true});}
      if(req.method==='POST' && path==='/api/device/pair') {const input=await body();return respond(res,200,store.redeem(input.code,input.deviceName));}
      if(req.method==='POST' && path==='/api/sync') {
        const authorization=req.headers.authorization??'';
        const device=store.device(authorization.startsWith('Bearer ')?authorization.slice(7):null);
        if(!device)throw new Problem('Appareil non associé ou accès révoqué.',401);
        return respond(res,200,store.sync(device.user_id,device.name,await body(),device.id));
      }
      if(req.method==='POST' && path==='/api/import') {const u=requireUser();const input=await body();input.scanId??=secret();input.capturedAt??=new Date().toISOString();return respond(res,200,store.sync(u.id,'Import manuel',input));}
      if(req.method==='GET' && path==='/api/catalogue') {const data=await readFile(join(ROOT,'public/assets/catalogue.json'));res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'public,max-age=3600'});return res.end(data);}
      if(req.method==='GET' && path==='/api/download') {
        if(!existsSync(download))throw new Problem('Le paquet Windows n’est pas disponible sur ce serveur.',404);
        res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="GenshinTracker-KameraFR-0.2.0.zip"','Cache-Control':'no-store'});
        createReadStream(download).on('error',()=>res.destroy()).pipe(res);
        return;
      }
      if(req.method!=='GET' && req.method!=='HEAD') throw new Problem('Route introuvable.',404);
      if(path.startsWith('/api/'))throw new Problem('Route introuvable.',404);
      const publicRoot=join(ROOT,'public'),filename=resolve(publicRoot,'.'+(path==='/'?'/index.html':decodeURIComponent(path)));
      if(!filename.startsWith(publicRoot+'/'))throw new Problem('Accès refusé.',403);
      const info=await stat(filename).catch(()=>null);
      if(!info?.isFile())throw new Problem('Page introuvable.',404);
      const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
      res.writeHead(200,{'Content-Type':types[extname(filename)]??'application/octet-stream','Cache-Control':'no-cache'});
      res.end(req.method==='HEAD'?undefined:await readFile(filename));
    } catch(error) {
      if(error.status)respond(res,error.status,{error:error.message});
      else {console.error('Erreur serveur',error.message);respond(res,500,{error:'Erreur interne. Vos données précédentes sont conservées.'});}
    }
  });
  server.on('close',()=>store.close());
  server.requestTimeout=30000;
  return {server,store};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT??8788),host=process.env.HOST??'127.0.0.1';
  const {server}=createApp({dbPath:process.env.DATABASE_PATH??join(ROOT,'data/tracker.sqlite'),publicUrl:process.env.PUBLIC_URL??'',download:process.env.DOWNLOAD_PATH??undefined});
  server.listen(port,host,()=>console.log(`Genshin Tracker : http://${host}:${port}`));
}
