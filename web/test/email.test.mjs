import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi } from '../lib/api.mjs';

test('email: verification, password reset without enumeration, protected email change',async t=>{
  const folder=mkdtempSync(join(tmpdir(),'gt-mail-')),sent=[];
  const api=createApi({dbPath:join(folder,'t.sqlite'),mailer:async mail=>{sent.push(mail);}});
  t.after(()=>{api.close();rmSync(folder,{recursive:true,force:true});});
  const call=async(path,{method='GET',data,cookie}={})=>{const r=await api.handle(new Request('http://localhost'+path,{method,redirect:'manual',headers:{host:'localhost',origin:'http://localhost',...(cookie?{cookie}:{}),...(data?{'content-type':'application/json'}:{})},body:data&&JSON.stringify(data)}));
    return {status:r.status,location:r.headers.get('location'),cookie:r.headers.get('set-cookie')?.split(';')[0],body:r.status===303?null:await r.json()};};
  const link=mail=>new URL(mail.text.match(/https?:\/\/\S+/)[0]);

  assert.equal((await call('/api/register',{method:'POST',data:{name:'Sans mail',password:'long-password-1',terms:true}})).status,400);
  assert.equal((await call('/api/register',{method:'POST',data:{name:'Sans CGU',password:'long-password-1',email:'cgu@example.com'}})).status,400);
  const first=await call('/api/register',{method:'POST',data:{name:'Voyageuse',password:'long-password-1',email:' Voya@Example.com ',newsletter:true,terms:true}});
  assert.equal(first.status,200);
  assert.equal((await call('/api/register',{method:'POST',data:{name:'Copie',password:'long-password-1',email:'voya@example.com',terms:true}})).status,409);
  assert.equal(sent[0].to,'voya@example.com');
  let account=await call('/api/account',{cookie:first.cookie});
  assert.deepEqual([account.body.user.email,account.body.user.emailVerified,account.body.user.newsletter],['voya@example.com',false,true]);

  const verify=await call(link(sent[0]).pathname+link(sent[0]).search);
  assert.equal(verify.location,'http://localhost/app?email=ok');
  assert.equal((await call(link(sent[0]).pathname+link(sent[0]).search)).location,'http://localhost/app?email=expire');
  assert.equal((await call('/api/account',{cookie:first.cookie})).body.user.emailVerified,true);

  assert.equal((await call('/api/password/forgot',{method:'POST',data:{email:'inconnu@example.com',terms:true}})).status,200);
  assert.equal(sent.length,1,'no mail for an unknown address');
  assert.equal((await call('/api/password/forgot',{method:'POST',data:{email:'VOYA@example.com',terms:true}})).status,200);
  const reset=link(sent[1]);assert.equal(reset.pathname,'/mot-de-passe');
  assert.equal((await call('/api/password/reset',{method:'POST',data:{token:reset.searchParams.get('token'),password:'short'}})).status,400);
  assert.equal((await call('/api/password/reset',{method:'POST',data:{token:reset.searchParams.get('token'),password:'new-password-2'}})).status,200);
  assert.equal((await call('/api/password/reset',{method:'POST',data:{token:reset.searchParams.get('token'),password:'new-password-3'}})).status,400,'single use');
  assert.equal((await call('/api/account',{cookie:first.cookie})).status,401,'old sessions closed');
  assert.equal((await call('/api/login',{method:'POST',data:{name:'Voyageuse',password:'long-password-1'}})).status,401);
  const login=await call('/api/login',{method:'POST',data:{name:'Voyageuse',password:'new-password-2'}});assert.equal(login.status,200);

  assert.equal((await call('/api/account/email',{method:'POST',cookie:login.cookie,data:{email:'pirate@example.com',password:'wrong-password'}})).status,401);
  const changed=await call('/api/account/email',{method:'POST',cookie:login.cookie,data:{email:'nouvelle@example.com',password:'new-password-2',newsletter:false}});
  assert.deepEqual(changed.body.profile,{email:'nouvelle@example.com',emailVerified:false,newsletter:false});
  assert.equal(sent.at(-1).to,'nouvelle@example.com');
  assert.ok(api.store.db.prepare("SELECT terms_at FROM users WHERE name='Voyageuse'").get().terms_at);
  assert.equal((await call('/api/account/password',{method:'POST',cookie:login.cookie,data:{current:'wrong-password',password:'new-password-4'}})).status,401);
  const changedPassword=await call('/api/account/password',{method:'POST',cookie:login.cookie,data:{current:'new-password-2',password:'new-password-4'}});
  assert.equal(changedPassword.status,200);assert.equal((await call('/api/account',{cookie:login.cookie})).status,401,'old session closed');
  assert.equal((await call('/api/account',{cookie:changedPassword.cookie})).status,200,'this browser stays signed in');
});
