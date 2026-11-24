import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi } from '../lib/api.mjs';

test('account deletion: an already-cancelled Stripe subscription does not block it, other Stripe failures keep the account',async t=>{
  const folder=mkdtempSync(join(tmpdir(),'gt-delete-'));
  let stripeError=null;
  const stripe=async(method)=>{if(method==='DELETE'&&stripeError)throw new Error(stripeError);return {};};
  const api=createApi({dbPath:join(folder,'t.sqlite'),mailer:async()=>{},stripe,supportEmail:'support@example.com'});
  t.after(()=>{api.close();rmSync(folder,{recursive:true,force:true});});
  const call=async(path,{method='GET',data,cookie}={})=>{const r=await api.handle(new Request('http://localhost'+path,{method,headers:{host:'localhost',origin:'http://localhost',...(cookie?{cookie}:{}),...(data?{'content-type':'application/json'}:{})},body:data&&JSON.stringify(data)}));
    return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],body:await r.json()};};
  const subscribed=async(name,email)=>{
    const r=await call('/api/register',{method:'POST',data:{name,password:'long-password-1',email,terms:true}});
    api.store.setBilling(api.store.userByEmail(email).id,{customer:'cus_'+name,subscription:'sub_'+name,status:'active',plan:'month',until:Date.now()+30*864e5});
    return r.cookie;
  };

  // Subscription already cancelled on Stripe: the account is deleted anyway.
  const first=await subscribed('Ancienne','ancienne@example.com');
  stripeError='Stripe : No such subscription: sub_Ancienne';
  assert.equal((await call('/api/account/delete',{method:'POST',data:{password:'long-password-1'},cookie:first})).status,200);
  assert.equal(api.store.userByEmail('ancienne@example.com'),undefined);

  // Any other Stripe failure: the account stays, with a readable reason instead of « Erreur interne ».
  const second=await subscribed('Payante','payante@example.com');
  stripeError='Stripe : boom';
  const failed=await call('/api/account/delete',{method:'POST',data:{password:'long-password-1'},cookie:second});
  assert.equal(failed.status,502);
  assert.match(failed.body.error,/n’a pas pu être résilié/);
  assert.ok(api.store.userByEmail('payante@example.com'),'account kept while billing could not be stopped');
});
