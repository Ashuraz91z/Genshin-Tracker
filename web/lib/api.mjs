import { readFile, stat } from 'node:fs/promises';
import { mkdirSync, createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { dirname, resolve, join } from 'node:path';
import { prepareDatabase } from './storage.mjs';
import { openStore, Problem, secret } from '../store.mjs';

const securityHeaders={'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY',
  'Content-Security-Policy':"default-src 'none'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'"};
export function createApi({dbPath=resolve('data/tracker.sqlite'),publicUrl='',download=resolve('../dist/GenshinTracker-KameraFR-0.3.2.zip'),publicDirectory=resolve('public')}={}) {
  const publicOrigin=publicUrl?new URL(publicUrl).origin:null;
  if(publicOrigin && !publicOrigin.startsWith('https://') && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(publicOrigin))throw new Error('PUBLIC_URL doit utiliser HTTPS hors localhost.');
  mkdirSync(dirname(dbPath),{recursive:true,mode:0o700});
  const store=openStore(dbPath),rates=new Map(),secure=publicOrigin?.startsWith('https:');
  const json=(status,body,headers={})=>Response.json(body,{status,headers:{...securityHeaders,'Cache-Control':'no-store',...headers}});
  const cookie=(token,remove=false)=>`gt_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${remove?0:604800}${secure?'; Secure':''}`;
  async function handle(request) {
    try {
      const path=new URL(request.url).pathname,method=request.method,host=request.headers.get('host')??new URL(request.url).host;
      if(!publicOrigin && !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host))throw new Problem('Configurer PUBLIC_URL avant un accès distant.',403);
      const origin=publicOrigin??`http://${host}`,requestOrigin=request.headers.get('origin');
      if(method==='POST'||method==='DELETE') {
        if(requestOrigin && requestOrigin!==origin)throw new Problem('Origine de requête refusée.',403);
        if(!['/api/device/pair','/api/device/login','/api/sync'].includes(path) && requestOrigin!==origin)throw new Problem('Origine de requête requise.',403);
      }
      const session=(request.headers.get('cookie')??'').split(';').map(x=>x.trim()).find(x=>x.startsWith('gt_session='))?.slice(11);
      const user=store.user(session);
      const requireUser=()=>{if(!user)throw new Problem('Connectez-vous pour accéder à votre compte.',401);return user;};
      async function body() {
        if(!(request.headers.get('content-type')??'').startsWith('application/json'))throw new Problem('Format JSON requis.',415);
        const limit=16*1024*1024;
        if(Number(request.headers.get('content-length'))>limit)throw new Problem('Scan trop volumineux (16 Mo maximum).',413);
        const chunks=[];let size=0;const reader=request.body?.getReader();
        if(reader)try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new Problem('Scan trop volumineux (16 Mo maximum).',413);}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
        try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Problem('JSON illisible.');}
      }
      if(method==='POST' && ['/api/register','/api/login','/api/device/pair','/api/device/login'].includes(path)) {
        // Personal-service limit shared by the instance; never trust a client-supplied proxy IP.
        const previous=rates.get(path),rate=previous&&previous.until>Date.now()?previous:{count:0,until:Date.now()+600000};
        if(++rate.count>30)throw new Problem('Trop de tentatives. Réessayez dans dix minutes.',429);
        rates.set(path,rate);
      }
      if(method==='POST' && ['/api/register','/api/login'].includes(path)) {
        const input=await body(),account=path==='/api/register'?store.register(input.name,input.password):store.login(input.name,input.password);
        return json(200,{user:{name:account.name}},{'Set-Cookie':cookie(store.session(account))});
      }
      if(method==='POST' && path==='/api/logout'){store.logout(session);return json(200,{ok:true},{'Set-Cookie':cookie('',true)});}
      if(method==='GET' && path==='/api/account')return json(200,store.account(requireUser()));
      if(method==='POST' && path==='/api/pair')return json(200,store.pair(requireUser()));
      if(method==='DELETE' && /^\/api\/devices\/[^/]+$/.test(path)){store.revoke(requireUser(),decodeURIComponent(path.split('/').pop()));return json(200,{ok:true});}
      if(method==='POST' && path==='/api/device/login') {
        const input=await body(),account=store.login(input.name,input.password);
        const bearer=request.headers.get('authorization')??'';
        return json(200,store.connect(account,input.deviceName,bearer.startsWith('Bearer ')?bearer.slice(7):null));
      }
      if(method==='GET' && path==='/api/device/account') {
        const bearer=request.headers.get('authorization')??'',device=store.device(bearer.startsWith('Bearer ')?bearer.slice(7):null);
        if(!device)throw new Problem('Appareil non associé ou accès révoqué.',401);
        return json(200,store.account({id:device.user_id,name:store.db.prepare('SELECT name FROM users WHERE id=?').get(device.user_id).name}));
      }
      if(method==='POST' && path==='/api/device/pair'){const input=await body();return json(200,store.redeem(input.code,input.deviceName));}
      if(method==='POST' && path==='/api/sync') {
        const authorization=request.headers.get('authorization')??'',device=store.device(authorization.startsWith('Bearer ')?authorization.slice(7):null);
        if(!device)throw new Problem('Appareil non associé ou accès révoqué.',401);
        return json(200,store.sync(device.user_id,device.name,await body(),device.id));
      }
      if(method==='POST' && path==='/api/import'){const u=requireUser(),input=await body();input.scanId??=secret();input.capturedAt??=new Date().toISOString();return json(200,store.sync(u.id,'Import manuel',input,undefined,input.replaceInventory===true));}
      if(method==='GET' && path==='/api/catalogue')return new Response(await readFile(join(publicDirectory,'assets/catalogue.json')),{headers:{...securityHeaders,'Content-Type':'application/json','Cache-Control':'public,max-age=3600'}});
      if(method==='GET' && path==='/api/download') {
        const info=await stat(/* turbopackIgnore: true */ download).catch(()=>null);
        if(!info?.isFile())throw new Problem('Le paquet Windows n’est pas disponible sur ce serveur.',404);
        return new Response(Readable.toWeb(createReadStream(/* turbopackIgnore: true */ download)),{headers:{...securityHeaders,'Content-Type':'application/zip','Content-Length':String(info.size),
          'Content-Disposition':'attachment; filename="GenshinTracker-KameraFR-0.3.2.zip"','Cache-Control':'no-store'}});
      }
      throw new Problem('Route introuvable.',404);
    } catch(error) {
      if(error.status)return json(error.status,{error:error.message});
      console.error('Erreur serveur',error.message);return json(500,{error:'Erreur interne. Vos données précédentes sont conservées.'});
    }
  }
  return {handle,store,close:()=>store.close()};
}
const key=Symbol.for('genshin.api');
export function getApi() {
  return globalThis[key]??=createApi({dbPath:prepareDatabase(),publicUrl:process.env.PUBLIC_URL??'',download:process.env.DOWNLOAD_PATH??undefined});
}
