import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi } from '../lib/api.mjs';

test('trial grants access, expiry locks the account, checkout + confirm unlock it',async t=>{
  const folder=mkdtempSync(join(tmpdir(),'gt-billing-')),calls=[];
  const period=Math.floor(Date.now()/1000)+30*86400;
  const subscription={id:'sub_1',customer:'cus_1',status:'active',items:{data:[{current_period_end:period,price:{recurring:{interval:'month'}}}]}};
  const stripe=async(method,path,params)=>{calls.push([method,path,params]);
    if(path==='checkout/sessions')return {url:'https://checkout.stripe.com/c/pay/cs_test'};
    if(path==='checkout/sessions/cs_ok')return {client_reference_id:userId,subscription:'sub_1'};
    if(path==='subscriptions/sub_1')return subscription;
    if(path==='subscriptions/search')return {data:[]};
    if(path==='billing_portal/sessions')return {url:'https://billing.stripe.com/p/session'};
    throw new Error('unexpected '+path);};
  const api=createApi({dbPath:join(folder,'t.sqlite'),stripe});
  t.after(()=>{api.close();rmSync(folder,{recursive:true,force:true});});
  let cookie,userId;
  const call=async(path,method='GET',data)=>{const r=await api.handle(new Request('http://localhost'+path,{method,headers:{host:'localhost',origin:'http://localhost',...(cookie?{cookie}:{}),...(data?{'content-type':'application/json'}:{})},body:data&&JSON.stringify(data)}));
    const setCookie=r.headers.get('set-cookie');if(setCookie)cookie=setCookie.split(';')[0];return {status:r.status,body:await r.json()};};
  await call('/api/register','POST',{name:'Abonne',password:'long-enough-password',email:'abonne@example.com',terms:true});
  userId=api.store.db.prepare('SELECT id FROM users').get().id;
  let account=await call('/api/account');
  assert.equal(account.body.billing.trial,true);assert.ok(account.body.data);
  assert.ok(Date.parse(account.body.billing.trialEnds)-Date.now()>13*864e5);

  api.store.db.prepare('UPDATE users SET trial_ends=?').run(new Date(Date.now()-1000).toISOString());
  account=await call('/api/account');
  assert.equal(account.body.locked,true);assert.equal(account.body.data,undefined);
  assert.equal((await call('/api/teams','POST',{})).status,402);
  assert.equal((await call('/api/pair','POST',{})).status,402);
  assert.equal((await call('/api/billing/checkout','POST',{plan:'lifetime'})).status,400);

  const checkout=await call('/api/billing/checkout','POST',{plan:'year'});
  assert.equal(checkout.body.url,'https://checkout.stripe.com/c/pay/cs_test');
  const params=calls.find(c=>c[1]==='checkout/sessions')[2];
  assert.equal(params.client_reference_id,userId);assert.equal(params.subscription_data.metadata.user_id,userId);assert.equal(params.line_items[0].price,'price_1Ucn6rRgFbPfVITSjwOsIRzx');assert.equal(params.customer_email,'abonne@example.com');

  assert.equal((await call('/api/billing/confirm','POST',{session:'cs_ok'})).body.billing.subscribed,true);
  account=await call('/api/account');assert.ok(account.body.data);assert.equal(account.body.billing.plan,'month');
  assert.equal((await call('/api/billing/checkout','POST',{plan:'month'})).status,409);
  assert.equal((await call('/api/billing/portal','POST',{})).body.url,'https://billing.stripe.com/p/session');

  subscription.status='canceled';api.store.db.prepare('UPDATE users SET sub_checked=0').run();
  assert.equal((await call('/api/account')).body.locked,true);
});

test('the free trial needs a confirmed e-mail once mail is configured',async t=>{
  const folder=mkdtempSync(join(tmpdir(),'gt-billing-'));
  const api=createApi({dbPath:join(folder,'t.sqlite'),stripe:async()=>({data:[]}),mailer:async()=>{}});
  t.after(()=>{api.close();rmSync(folder,{recursive:true,force:true});});
  let cookie;
  const call=async(path,method='GET',data)=>{const r=await api.handle(new Request('http://localhost'+path,{method,headers:{host:'localhost',origin:'http://localhost',...(cookie?{cookie}:{}),...(data?{'content-type':'application/json'}:{})},body:data&&JSON.stringify(data)}));
    const setCookie=r.headers.get('set-cookie');if(setCookie)cookie=setCookie.split(';')[0];return {status:r.status,body:await r.json()};};
  await call('/api/register','POST',{name:'Essai',password:'long-enough-password',email:'essai@example.com',terms:true});
  assert.equal((await call('/api/pair','POST',{})).status,403);
  api.store.verifyEmail(api.store.userByEmail('essai@example.com').id);
  assert.equal((await call('/api/pair','POST',{})).status,200);
});
