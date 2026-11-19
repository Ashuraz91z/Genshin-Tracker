import { readFile, stat } from 'node:fs/promises';
import { mkdirSync, createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { dirname, resolve, join } from 'node:path';
import { prepareDatabase } from './storage.mjs';
import { need } from './scan.mjs';
import { createMailer, mails } from './mail.mjs';
import { openStore, Problem, secret } from '../store.mjs';
import { billingView, pickSubscription, prices, stripeClient, subscriptionState } from './billing.mjs';

const securityHeaders={'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY',
  'Content-Security-Policy':"default-src 'none'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'"};
export function createApi({dbPath=resolve('data/tracker.sqlite'),publicUrl='',download=resolve('../dist/GenshinTracker-KameraFR-0.4.2.zip'),publicDirectory=resolve('public'),stripe=stripeClient(process.env.STRIPE_SECRET_KEY),mailer=createMailer(),publishableKey=process.env.STRIPE_PUBLISHABLE_KEY??'',adminEmails=process.env.ADMIN_EMAILS??'',supportEmail=process.env.SUPPORT_EMAIL??'contact@genshin-tracker.com'}={}) {
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
  async function sendMail(to,mail) {
    if(!mailer){console.info('[mail] SMTP non configuré, message non envoyé :',mail.subject);return;}
    try{await mailer({to,...mail});}catch(error){console.error('[mail]',error.message);}
  }
  const sendVerification=(user,email,origin,welcome)=>sendMail(email,mails.verify(user.name,origin+'/api/email/verify?token='+store.issueToken(user.id,'verify',2*864e5),welcome));
  const paid=async userId=>{const plan=await billing(userId);if(!plan.active)throw new Problem('Votre essai gratuit est terminé. Choisissez une formule pour continuer.',402);
    // One trial per real inbox (no throwaway-address trial farms); only enforced once mails can actually be sent.
    if(plan.trial&&mailer&&!store.profile(userId).emailVerified)throw new Problem('Confirmez votre adresse e-mail (lien reçu à l’inscription, renvoyable depuis votre compte) pour utiliser l’essai gratuit.',403);};
  // Admins are listed by e-mail and must have confirmed it: a pseudo could be registered by anyone first.
  const admins=new Set(adminEmails.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean));
  const isAdmin=u=>{if(!u||!admins.size)return false;const p=store.profile(u.id);return p.emailVerified&&admins.has(p.email);};
  const cookie=(token,remove=false)=>`gt_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${remove?0:604800}${secure?'; Secure':''}`;
  async function route(request,ctx) {
    try {
      const path=new URL(request.url).pathname,method=request.method,host=request.headers.get('host')??new URL(request.url).host;
      if(!publicOrigin && !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host))throw new Problem('Configurer PUBLIC_URL avant un accès distant.',403);
      const origin=publicOrigin??`http://${host}`,requestOrigin=request.headers.get('origin');
      if(method==='POST'||method==='DELETE') {
        if(requestOrigin && requestOrigin!==origin)throw new Problem('Origine de requête refusée.',403);
        if(!['/api/device/pair','/api/device/login','/api/sync'].includes(path) && requestOrigin!==origin)throw new Problem('Origine de requête requise.',403);
      }
      const session=(request.headers.get('cookie')??'').split(';').map(x=>x.trim()).find(x=>x.startsWith('gt_session='))?.slice(11);
      const user=store.user(session);ctx.userId=user?.id;
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
      if(method==='POST' && ['/api/register','/api/login','/api/device/pair','/api/device/login','/api/password/forgot'].includes(path))limit(path,path.endsWith('/login')?300:30);
      if(method==='POST' && ['/api/register','/api/login'].includes(path)) {
        const input=await body();if(path==='/api/login')limitLogin(input);
        if(path==='/api/register')need(input.terms===true,'Acceptez les conditions d’utilisation pour créer un compte.');
        if(path==='/api/register'&&admins.has(String(input.email??'').trim().toLowerCase()))store.releaseEmail(input.email);
        const account=path==='/api/register'?store.register(input.name,input.password,input.email,input.newsletter):store.login(input.name,input.password);
        ctx.userId=account.id;if(path==='/api/register'){store.acceptTerms(account.id);}
        if(path==='/api/register')await sendVerification(account,store.profile(account.id).email,origin,true);
        return json(200,{user:{name:account.name}},{'Set-Cookie':cookie(store.session(account))});
      }
      if(method==='POST' && path==='/api/logout'){store.logout(session);return json(200,{ok:true},{'Set-Cookie':cookie('',true)});}
      if(method==='GET' && path==='/api/account'){const u=requireUser(),plan=await billing(u.id);const admin=isAdmin(u);if(!plan.active)return json(200,{user:{name:u.name,admin},billing:plan,locked:true});const account=store.account(u);return json(200,{...account,user:{...account.user,admin},billing:plan});}
      if(method==='POST' && path==='/api/account/email') {
        const u=requireUser(),input=await body(),current=store.profile(u.id);
        if(typeof input.email==='string'&&input.email.trim().toLowerCase()!==current.email) {
          // A stolen session must not be enough to redirect password resets to another inbox.
          if(current.email)store.login(u.name,input.password??'');
          if(admins.has(input.email.trim().toLowerCase()))store.releaseEmail(input.email);
          await sendVerification(u,store.setEmail(u.id,input.email),origin);
        }
        if(typeof input.newsletter==='boolean')store.setNewsletter(u.id,input.newsletter);
        return json(200,{profile:store.profile(u.id)});
      }
      if(method==='POST' && path==='/api/account/name') {
        const u=requireUser(),input=await body();limit('name:'+u.id,10);
        return json(200,{name:store.rename(u.id,input.name)});
      }
      if(method==='POST' && path==='/api/account/sessions') {
        // Signs out every other browser; this one gets a fresh session.
        const u=requireUser();store.closeSessions(u.id);return json(200,{ok:true},{'Set-Cookie':cookie(store.session(u))});
      }
      if(method==='GET' && path==='/api/account/export') {
        const u=requireUser();
        return json(200,store.exportData(u),{'Content-Disposition':`attachment; filename="genshin-tracker-compte-${new Date().toISOString().slice(0,10)}.json"`});
      }
      if(method==='POST' && path==='/api/account/delete') {
        const u=requireUser(),input=await body();limit('delete:'+u.id,5);
        store.login(u.name,input.password??'');
        const row=store.billing(u.id);
        // Stop billing before the data goes: a deleted account must never be charged again.
        if(stripe&&row.stripe_subscription&&['active','trialing','past_due','unpaid','incomplete'].includes(row.sub_status))await stripe('DELETE','subscriptions/'+encodeURIComponent(row.stripe_subscription));
        store.deleteUser(u.id);
        return json(200,{ok:true},{'Set-Cookie':cookie('',true)});
      }
      if(method==='POST' && path==='/api/account/password') {
        const u=requireUser(),input=await body();limit('password:'+u.id,10);
        store.login(u.name,input.current??'');store.resetPassword(u.id,input.password);
        // Every other session is closed; this browser gets a fresh one.
        return json(200,{ok:true},{'Set-Cookie':cookie(store.session(u))});
      }
      if(method==='POST' && path==='/api/email/resend') {
        const u=requireUser(),profile=store.profile(u.id);limit('resend:'+u.id,3);
        if(!profile.email||profile.emailVerified)throw new Problem('Aucune adresse à confirmer.',409);
        await sendVerification(u,profile.email,origin);return json(200,{ok:true});
      }
      if(method==='GET' && path==='/api/email/verify') {
        const userId=store.useToken(new URL(request.url).searchParams.get('token'),'verify');
        if(userId)store.verifyEmail(userId);
        return Response.redirect(origin+'/app?email='+(userId?'ok':'expire'),303);
      }
      if(method==='POST' && path==='/api/password/forgot') {
        const input=await body(),target=store.userByEmail(input.email);
        limit('forgot:'+String(input.email??'').trim().toLowerCase(),3);
        if(target)await sendMail(target.email,mails.reset(target.name,origin+'/mot-de-passe?token='+store.issueToken(target.id,'reset',36e5)));
        // Same answer whether or not the address exists.
        return json(200,{ok:true});
      }
      if(method==='POST' && path==='/api/password/reset') {
        const input=await body();
        need(typeof input.password==='string'&&input.password.length>=8&&input.password.length<=128,'Mot de passe : 8 à 128 caractères.');
        const userId=store.useToken(input.token,'reset');
        if(!userId)throw new Problem('Lien expiré ou déjà utilisé. Refaites une demande.',400);
        store.resetPassword(userId,input.password);return json(200,{ok:true});
      }
      if(method==='POST' && path.startsWith('/api/billing/')) {
        const u=requireUser(),input=await body();
        if(!stripe)throw new Problem('Le paiement n’est pas configuré sur ce serveur.',404);
        const row=store.billing(u.id);
        if(path==='/api/billing/checkout') {
          need(Object.hasOwn(prices,input.plan),'Formule inconnue.');
          if(billingView(row).subscribed)throw new Problem('Vous êtes déjà abonné. Gérez votre formule depuis votre compte.',409);
          // Embedded in the site once the publishable key is set; Stripe-hosted page otherwise.
          const embedded=/^pk_(live|test)_/.test(publishableKey);
          const session=await stripe('POST','checkout/sessions',{mode:'subscription',...(embedded?{ui_mode:'embedded_page',return_url:origin+'/app?abonnement=ok&session={CHECKOUT_SESSION_ID}'}:{success_url:origin+'/app?abonnement=ok&session={CHECKOUT_SESSION_ID}',cancel_url:origin+'/app'}),locale:'fr',line_items:[{price:prices[input.plan],quantity:1}],client_reference_id:u.id,customer:row.stripe_customer??undefined,customer_email:row.stripe_customer?undefined:store.profile(u.id).email??undefined,
            subscription_data:{metadata:{user_id:u.id},trial_end:Date.parse(row.trial_ends)-Date.now()>2*864e5?Math.floor(Date.parse(row.trial_ends)/1000):undefined},allow_promotion_codes:true,
            custom_text:{submit:{message:'Abonnement sans engagement, résiliable à tout moment depuis votre compte. En vous abonnant, vous acceptez les conditions d’utilisation de Genshin Tracker.'}}});
          return json(200,embedded?{clientSecret:session.client_secret,publishableKey}:{url:session.url});
        }
        if(path==='/api/billing/confirm') {
          need(typeof input.session==='string'&&/^cs_[A-Za-z0-9_]{1,200}$/.test(input.session),'Session de paiement invalide.');
          const session=await stripe('GET','checkout/sessions/'+input.session);
          if(session.client_reference_id!==u.id)throw new Problem('Session de paiement introuvable.',404);
          if(session.subscription)await refreshBilling(u.id,session.subscription);
          return json(200,{billing:await billing(u.id)});
        }
        if(path==='/api/billing/cancel') {
          // Résiliation en ligne (Code de la consommation, L215-1-1) : effective at period end, confirmed by e-mail.
          if(!row.stripe_subscription||!billingView(row).subscribed)throw new Problem('Aucun abonnement en cours à résilier.',409);
          const resume=input.resume===true;
          store.setBilling(u.id,subscriptionState(await stripe('POST','subscriptions/'+encodeURIComponent(row.stripe_subscription),{cancel_at_period_end:!resume})));
          const plan=await billing(u.id);
          if(!resume){const profile=store.profile(u.id);if(profile.email)await sendMail(profile.email,mails.cancel(u.name,new Date(plan.until).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}),origin+'/parametres#abonnement'));}
          return json(200,{billing:plan});
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
        ctx.userId=device.user_id;await paid(device.user_id);
        return json(200,store.sync(device.user_id,device.name,await body(),device.id));
      }
      if(method==='POST' && path==='/api/import'){const u=requireUser();await paid(u.id);const input=await body();input.scanId??=secret();input.capturedAt??=new Date().toISOString();return json(200,store.sync(u.id,'Import manuel',input,undefined,input.replaceInventory===true));}
      if(method==='POST'&&path==='/api/manual-artifacts'){const u=requireUser();await paid(u.id);const input=await body(),catalogue=JSON.parse(await readFile(join(publicDirectory,'assets/catalogue.json'),'utf8'));return json(200,store.saveArtifact(u,input,catalogue));}
      if(method==='DELETE'&&/^\/api\/manual-artifacts\/[^/]+$/.test(path)){await paid(requireUser().id);return json(200,store.removeArtifact(user,decodeURIComponent(path.split('/').pop())));}
      if(method==='POST'&&path==='/api/teams'){await paid(requireUser().id);return json(200,store.saveTeam(user,await body()));}
      if(method==='DELETE'&&/^\/api\/teams\/[^/]+$/.test(path)){await paid(requireUser().id);return json(200,store.removeTeam(user,decodeURIComponent(path.split('/').pop())));}
      if(method==='POST' && path==='/api/events') {
        const input=await body();limit('events:'+(user?.id??'guest'),300);
        need(Array.isArray(input.events)&&input.events.length<=50,'Événements invalides.');
        for(const e of input.events)if(['click','page','error'].includes(e?.kind)&&typeof e.name==='string'&&e.name)store.record(user?.id,e.kind,e.name,null,typeof e.detail==='string'?e.detail:null);
        return json(200,{ok:true});
      }
      if(path==='/api/support' && method==='GET')return json(200,{tickets:store.tickets(requireUser().id)});
      if(path==='/api/support' && method==='POST') {
        const input=await body();limit('support:'+(user?.id??'guest'),user?5:30);
        if(input.website)return json(200,{ok:true}); // honeypot field, invisible to people
        const ticket=store.openTicket({userId:user?.id??null,name:user?.name??input.name,email:(user&&store.profile(user.id).email)||input.email,subject:input.subject,body:input.body});
        await sendMail(supportEmail,mails.ticket(ticket,input.body.trim(),origin+'/admin?ticket='+ticket.id));
        return json(200,{ok:true,email:ticket.email});
      }
      if(method==='POST' && /^\/api\/support\/[^/]+$/.test(path)) {
        const u=requireUser(),input=await body(),ticket=store.ticket(decodeURIComponent(path.split('/').pop()));limit('support:'+u.id,10);
        if(ticket?.user_id!==u.id)throw new Problem('Demande introuvable.',404);
        store.reply(ticket.id,'user',input.body,'open');
        await sendMail(supportEmail,mails.ticket(ticket,String(input.body).trim(),origin+'/admin?ticket='+ticket.id));
        return json(200,{tickets:store.tickets(u.id)});
      }
      if(path==='/api/admin'||path.startsWith('/api/admin/')) {
        const u=requireUser();if(!isAdmin(u))throw new Problem('Accès réservé à l’administration.',403);
        if(method==='GET'&&path==='/api/admin') {
          // Pull payment failures from Stripe so the list is fresh even for users who have not come back.
          let stripeError=null;
          if(stripe)try{
            const seen=new Set(),bad=['past_due','unpaid','incomplete'];
            for(const status of bad)for(const s of (await stripe('GET','subscriptions',{status,limit:100})).data){const id=s.metadata?.user_id;if(id&&store.billing(id)){store.setBilling(id,subscriptionState(s));seen.add(id);}}
            for(const row of store.db.prepare(`SELECT id,stripe_subscription FROM users WHERE sub_status IN ('past_due','unpaid','incomplete')`).all())if(!seen.has(row.id))await refreshBilling(row.id,row.stripe_subscription);
          }catch(error){stripeError=error.message;}
          return json(200,{...store.adminOverview(),stripe:!!stripe,stripeError,mail:!!mailer});
        }
        const [,,,kind,id]=path.split('/'),target=decodeURIComponent(id??'');
        // Audit trail of every admin write (kept past the 90-day event purge).
        const audit=(action,detail)=>store.record(u.id,'admin',action,null,detail);
        if(kind==='tickets'&&id) {
          const ticket=store.ticket(target);if(!ticket)throw new Problem('Demande introuvable.',404);
          if(method==='GET')return json(200,ticket);
          const input=await body();
          if(input.body!==undefined){store.reply(target,'admin',input.body,'answered');audit('ticket:reply',target);await sendMail(ticket.email,mails.reply(ticket.name,ticket.subject,String(input.body).trim(),origin+'/aide'));}
          if(input.status!==undefined){store.setTicketStatus(target,input.status);audit('ticket:'+input.status,target);}
          return json(200,store.ticket(target));
        }
        if(kind==='users'&&id&&method==='POST') {
          const input=await body(),row=store.billing(target);if(!row)throw new Problem('Compte introuvable.',404);
          if(target===u.id&&['disable','delete'].includes(input.action))throw new Problem('Impossible sur votre propre compte.',409);
          const actions={extend:()=>store.extendTrial(target,input.days),disable:()=>store.setDisabled(target,true),enable:()=>store.setDisabled(target,false),logout:()=>store.closeSessions(target),
            verify:()=>store.verifyEmail(target),delete:()=>store.deleteUser(target),billing:async()=>{if(!stripe)throw new Problem('Stripe non configuré.',404);await refreshBilling(target,row.stripe_subscription);}};
          need(Object.hasOwn(actions,input.action),'Action inconnue.');
          const who=store.profile(target).email??target;await actions[input.action]();
          audit('user:'+input.action,input.action==='extend'?`${who} +${input.days} j`:who);
          return json(200,{ok:true});
        }
        throw new Problem('Route introuvable.',404);
      }
      if(method==='GET' && path==='/api/catalogue')return new Response(await readFile(join(publicDirectory,'assets/catalogue.json')),{headers:{...securityHeaders,'Content-Type':'application/json','Cache-Control':'public,max-age=3600'}});
      if(method==='GET' && path==='/api/download') {
        const info=await stat(/* turbopackIgnore: true */ download).catch(()=>null);
        if(!info?.isFile())throw new Problem('Le paquet Windows n’est pas disponible sur ce serveur.',404);
        return new Response(Readable.toWeb(createReadStream(/* turbopackIgnore: true */ download)),{headers:{...securityHeaders,'Content-Type':'application/zip','Content-Length':String(info.size),
          'Content-Disposition':'attachment; filename="GenshinTracker-KameraFR-0.4.2.zip"','Cache-Control':'no-store'}});
      }
      throw new Problem('Route introuvable.',404);
    } catch(error) {
      ctx.error=error.message;if(error.status)return json(error.status,{error:error.message});
      console.error('Erreur serveur',error.message);return json(500,{error:'Erreur interne. Vos données précédentes sont conservées.'});
    }
  }
  // Every write and every failure is logged as a usage event; reads that succeed (polling) are not.
  async function handle(request) {
    const ctx={},response=await route(request,ctx),{pathname}=new URL(request.url);
    if(pathname!=='/api/events'&&!pathname.startsWith('/api/admin')&&(request.method!=='GET'||response.status>=400))
      try{store.record(ctx.userId,'api',request.method+' '+pathname.replace(/\/[A-Za-z0-9_-]{20,}/g,'/:id'),response.status,ctx.error);}catch(error){console.error('[events]',error.message);}
    return response;
  }
  return {handle,store,close:()=>store.close()};
}
const key=Symbol.for('genshin.api');
export function getApi() {
  return globalThis[key]??=createApi({dbPath:prepareDatabase(),publicUrl:process.env.PUBLIC_URL??'',download:process.env.DOWNLOAD_PATH??undefined});
}
