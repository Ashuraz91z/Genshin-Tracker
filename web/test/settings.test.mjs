import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi } from '../lib/api.mjs';

test('settings: rename, sign out others, export, cancel/resume with e-mail, delete stops billing',async t=>{
  const folder=mkdtempSync(join(tmpdir(),'gt-settings-')),sent=[],calls=[];
  const period=Math.floor(Date.now()/1000)+30*86400;let cancel=false;
  const sub=()=>({id:'sub_9',customer:'cus_9',status:'active',cancel_at_period_end:cancel,items:{data:[{current_period_end:period,price:{recurring:{interval:'month'}}}]}});
  const stripe=async(method,path,params)=>{calls.push([method,path,params]);
    if(path==='subscriptions/sub_9'&&method==='POST'){cancel=params.cancel_at_period_end;return sub();}
    if(path==='subscriptions/sub_9')return sub();
    return {data:[]};};
  const api=createApi({dbPath:join(folder,'t.sqlite'),stripe,mailer:async m=>{sent.push(m);}});
  t.after(()=>{api.close();rmSync(folder,{recursive:true,force:true});});
  const call=async(path,{method='GET',data,cookie}={})=>{const r=await api.handle(new Request('http://localhost'+path,{method,headers:{host:'localhost',origin:'http://localhost',...(cookie?{cookie}:{}),...(data?{'content-type':'application/json'}:{})},body:data&&JSON.stringify(data)}));
    return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],headers:r.headers,body:await r.json()};};
  const a=await call('/api/register',{method:'POST',data:{name:'Ancien',password:'long-password-1',email:'a@example.com',terms:true}});
  await call('/api/register',{method:'POST',data:{name:'Pris',password:'long-password-1',email:'b@example.com',terms:true}});
  const id=api.store.userByEmail('a@example.com').id;api.store.verifyEmail(id);

  assert.equal((await call('/api/account/name',{method:'POST',data:{name:'pris'},cookie:a.cookie})).status,409,'pseudo taken, case-insensitive');
  assert.equal((await call('/api/account/name',{method:'POST',data:{name:'Nouveau'},cookie:a.cookie})).body.name,'Nouveau');
  assert.equal((await call('/api/login',{method:'POST',data:{name:'Nouveau',password:'long-password-1'}})).status,200,'new pseudo logs in');

  const other=(await call('/api/login',{method:'POST',data:{name:'Nouveau',password:'long-password-1'}})).cookie;
  const fresh=(await call('/api/account/sessions',{method:'POST',data:{},cookie:a.cookie})).cookie;
  assert.equal((await call('/api/account',{cookie:other})).status,401,'other browsers signed out');
  assert.equal((await call('/api/account',{cookie:fresh})).status,200,'this browser stays signed in');

  const exported=await call('/api/account/export',{cookie:fresh});
  assert.match(exported.headers.get('content-disposition'),/attachment/);
  assert.equal(exported.body.account.name,'Nouveau');assert.equal(exported.body.account.password,undefined);assert.equal(exported.body.account.salt,undefined);

  api.store.setBilling(id,{customer:'cus_9',subscription:'sub_9',status:'active',plan:'month',until:period*1000});
  let r=await call('/api/billing/cancel',{method:'POST',data:{},cookie:fresh});
  assert.equal(r.body.billing.canceling,true);assert.equal(cancel,true);
  assert.equal(sent.at(-1).to,'a@example.com');assert.match(sent.at(-1).subject,/résiliation/i);
  r=await call('/api/billing/cancel',{method:'POST',data:{resume:true},cookie:fresh});
  assert.equal(r.body.billing.canceling,false);assert.equal(cancel,false);

  api.store.db.prepare('INSERT INTO accounts VALUES(?,?)').run(id,JSON.stringify({characters:[{key:'Furina'}],weapons:[],artifacts:[],materials:{},updatedAt:'2026-11-01'}));
  api.store.db.prepare('INSERT INTO scans(user_id,scan_id) VALUES(?,?)').run(id,'s1');
  assert.equal((await call('/api/account/reset',{method:'POST',data:{password:'wrong'},cookie:fresh})).status,401);
  assert.equal((await call('/api/account/reset',{method:'POST',data:{password:'long-password-1'},cookie:fresh})).status,200);
  const wiped=(await call('/api/account',{cookie:fresh})).body;
  assert.equal(wiped.data.characters.length,0,'inventory wiped');assert.equal(wiped.scans.length,0,'scan history wiped');assert.equal(wiped.user.name,'Nouveau','account kept');

  assert.equal((await call('/api/account/delete',{method:'POST',data:{password:'wrong'},cookie:fresh})).status,401);
  assert.equal((await call('/api/account/delete',{method:'POST',data:{password:'long-password-1'},cookie:fresh})).status,200);
  assert.ok(calls.some(([m,p])=>m==='DELETE'&&p==='subscriptions/sub_9'),'subscription stopped before deletion');
  assert.equal(api.store.userByEmail('a@example.com'),undefined);
  assert.equal((await call('/api/account',{cookie:fresh})).status,401);
});
