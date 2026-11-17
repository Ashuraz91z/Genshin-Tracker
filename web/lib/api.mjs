import { readFile, stat } from 'node:fs/promises';
import { mkdirSync, createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { dirname, resolve, join } from 'node:path';
import { prepareDatabase } from './storage.mjs';
import { need } from './scan.mjs';
import { openStore, Problem, secret } from '../store.mjs';
import { billingView, pickSubscription, prices, stripeClient, subscriptionState } from './billing.mjs';

const securityHeaders={'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY',
  'Content-Security-Policy':"default-src 'none'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'"};
export function createApi({dbPath=resolve('data/tracker.sqlite'),publicUrl='',download=resolve('../dist/GenshinTracker-KameraFR-0.4.1.zip'),publicDirectory=resolve('public'),stripe=stripeClient(process.env.STRIPE_SECRET_KEY)}={}) {
  const publicOrigin=publicUrl?new URL(publicUrl).origin:null;
  if(publicOrigin && !publicOrigin.startsWith('https://') && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(publicOrigin))throw new Error('PUBLIC_URL doit utiliser HTTPS hors localhost.');
  mkdirSync(dirname(dbPath),{recursive:true,mode:0o700});
  const store=openStore(dbPath),rates=new Map(),secure=publicOrigin?.startsWith('https:');
  const json=(status,body,headers={})=>Response.json(body,{status,headers:{...securityHeaders,'Cache-Control':'no-store',...headers}});
  // Without a Stripe key (self-hosting, tests) every account has full access.
  async function refreshBilling(userId,subscriptionId) {
    store.checkedBilling(userId);
    const subscription=subscriptionId?await stripe('GET','subscriptions/'+encodeURIComponent(subscriptionId))
      :pickSubscription((await stripe('GET','subscriptions/search',{query:`metadata['user_id']:'${userId}'`,limit:10})).data);
    if(subscription)store.setBilling(userId,subscriptionState(subscription));
  }
  async function billing(userId) {
    if(!stripe)return {enabled:false,active:true};
    let row=store.billing(userId),view=billingView(row);
    const age=Date.now()-(row.sub_checked??0);
    // Re-check Stripe hourly once the trial is over, and sooner when a paid period has just ended.
    if(!view.trial&&(age>36e5||(row.sub_until&&row.sub_until<Date.now()&&age>3e5))){
      try{await refreshBilling(userId,row.stripe_subscription);row=store.billing(userId);view=billingView(row);}catch(error){console.error('[billing]',error.message);}
    }
    return view;
  }
  const paid=async userId=>{if(!(await billing(userId)).active)throw new Problem('Votre essai gratuit est terminé. Choisissez une formule pour continuer.',402);};
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
      // Never trust a client-supplied proxy IP: limits are per route and, for logins, per pseudo.
      // ponytail: in-memory per-process map, cleared when large; move to SQLite if several instances run.
      const limit=(key,max)=>{const previous=rates.get(key),rate=previous&&previous.until>Date.now()?previous:{count:0,until:Date.now()+600000};
        if(++rate.count>max)throw new Problem('Trop de tentatives. Réessayez dans dix minutes.',429);if(rates.size>10000)rates.clear();rates.set(key,rate);};
      const limitLogin=input=>limit(path+':'+String(input?.name??'').trim().toLowerCase(),10);
      if(method==='POST' && ['/api/register','/api/login','/api/device/pair','/api/device/login'].includes(path))limit(path,path.endsWith('/login')?300:30);
      if(method==='POST' && ['/api/register','/api/login'].includes(path)) {
        const input=await body();if(path==='/api/login')limitLogin(input);const account=path==='/api/register'?store.register(input.name,input.password):store.login(input.name,input.password);
        return json(200,{user:{name:account.name}},{'Set-Cookie':cookie(store.session(account))});
      }
      if(method==='POST' && path==='/api/logout'){store.logout(session);return json(200,{ok:true},{'Set-Cookie':cookie('',true)});}
      if(method==='GET' && path==='/api/account'){const u=requireUser(),plan=await billing(u.id);return json(200,plan.active?{...store.account(u),billing:plan}:{user:{name:u.name},billing:plan,locked:true});}
      if(method==='POST' && path.startsWith('/api/billing/')) {
        const u=requireUser(),input=await body();
        if(!stripe)throw new Problem('Le paiement n’est pas configuré sur ce serveur.',404);
        const row=store.billing(u.id);
        if(path==='/api/billing/checkout') {
          need(Object.hasOwn(prices,input.plan),'Formule inconnue.');
          if(billingView(row).subscribed)throw new Problem('Vous êtes déjà abonné. Gérez votre formule depuis votre compte.',409);
          const session=await stripe('POST','checkout/sessions',{mode:'subscription',locale:'fr',line_items:[{price:prices[input.plan],quantity:1}],client_reference_id:u.id,customer:row.stripe_customer??undefined,
            subscription_data:{metadata:{user_id:u.id},trial_end:Date.parse(row.trial_ends)-Date.now()>2*864e5?Math.floor(Date.parse(row.trial_ends)/1000):undefined},allow_promotion_codes:true,success_url:origin+'/app?abonnement=ok&session={CHECKOUT_SESSION_ID}',cancel_url:origin+'/app',
            custom_text:{submit:{message:'Abonnement sans engagement, résiliable à tout moment depuis votre compte. En vous abonnant, vous acceptez les conditions d’utilisation de Genshin Tracker.'}}});
          return json(200,{url:session.url});
        }
        if(path==='/api/billing/confirm') {
          need(typeof input.session==='string'&&/^cs_[A-Za-z0-9_]{1,200}$/.test(input.session),'Session de paiement invalide.');
          const session=await stripe('GET','checkout/sessions/'+input.session);
          if(session.client_reference_id!==u.id)throw new Problem('Session de paiement introuvable.',404);
          if(session.subscription)await refreshBilling(u.id,session.subscription);
          return json(200,{billing:await billing(u.id)});
        }
        if(path==='/api/billing/portal') {
          if(!row.stripe_customer)throw new Problem('Aucun abonnement à gérer pour ce compte.',404);
          return json(200,{url:(await stripe('POST','billing_portal/sessions',{customer:row.stripe_customer,return_url:origin+'/app'})).url});
        }
        throw new Problem('Route introuvable.',404);
      }
      if(method==='POST' && path==='/api/pair'){const u=requireUser();await paid(u.id);return json(200,store.pair(u));}
      if(method==='DELETE' && /^\/api\/devices\/[^/]+$/.test(path)){store.revoke(requireUser(),decodeURIComponent(path.split('/').pop()));return json(200,{ok:true});}
      if(method==='POST' && path==='/api/device/login') {
        const input=await body();limitLogin(input);const account=store.login(input.name,input.password);
        const bearer=request.headers.get('authorization')??'';
        return json(200,store.connect(account,input.deviceName,bearer.startsWith('Bearer ')?bearer.slice(7):null));
      }
      if(method==='GET' && path==='/api/device/account') {
        const bearer=request.headers.get('authorization')??'',device=store.device(bearer.startsWith('Bearer ')?bearer.slice(7):null);
        if(!device)throw new Problem('Appareil non associé ou accès révoqué.',401);
        await paid(device.user_id);
        return json(200,store.account({id:device.user_id,name:store.db.prepare('SELECT name FROM users WHERE id=?').get(device.user_id).name}));
      }
      if(method==='POST' && path==='/api/device/pair'){const input=await body();return json(200,store.redeem(input.code,input.deviceName));}
      if(method==='POST' && path==='/api/sync') {
        const authorization=request.headers.get('authorization')??'',device=store.device(authorization.startsWith('Bearer ')?authorization.slice(7):null);
        if(!device)throw new Problem('Appareil non associé ou accès révoqué.',401);
        await paid(device.user_id);
        return json(200,store.sync(device.user_id,device.name,await body(),device.id));
      }
      if(method==='POST' && path==='/api/import'){const u=requireUser();await paid(u.id);const input=await body();input.scanId??=secret();input.capturedAt??=new Date().toISOString();return json(200,store.sync(u.id,'Import manuel',input,undefined,input.replaceInventory===true));}
      if(method==='POST'&&path==='/api/manual-artifacts'){const u=requireUser();await paid(u.id);const input=await body(),catalogue=JSON.parse(await readFile(join(publicDirectory,'assets/catalogue.json'),'utf8'));return json(200,store.saveArtifact(u,input,catalogue));}
      if(method==='DELETE'&&/^\/api\/manual-artifacts\/[^/]+$/.test(path)){await paid(requireUser().id);return json(200,store.removeArtifact(user,decodeURIComponent(path.split('/').pop())));}
      if(method==='POST'&&path==='/api/teams'){await paid(requireUser().id);return json(200,store.saveTeam(user,await body()));}
      if(method==='DELETE'&&/^\/api\/teams\/[^/]+$/.test(path)){await paid(requireUser().id);return json(200,store.removeTeam(user,decodeURIComponent(path.split('/').pop())));}
      if(method==='GET' && path==='/api/catalogue')return new Response(await readFile(join(publicDirectory,'assets/catalogue.json')),{headers:{...securityHeaders,'Content-Type':'application/json','Cache-Control':'public,max-age=3600'}});
      if(method==='GET' && path==='/api/download') {
        const info=await stat(/* turbopackIgnore: true */ download).catch(()=>null);
        if(!info?.isFile())throw new Problem('Le paquet Windows n’est pas disponible sur ce serveur.',404);
        return new Response(Readable.toWeb(createReadStream(/* turbopackIgnore: true */ download)),{headers:{...securityHeaders,'Content-Type':'application/zip','Content-Length':String(info.size),
          'Content-Disposition':'attachment; filename="GenshinTracker-KameraFR-0.4.1.zip"','Cache-Control':'no-store'}});
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
