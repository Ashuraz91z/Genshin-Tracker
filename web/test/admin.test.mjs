import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi } from '../lib/api.mjs';

test('admin: access by confirmed e-mail, support thread, user actions, usage events',async t=>{
  const folder=mkdtempSync(join(tmpdir(),'gt-admin-')),sent=[];
  const api=createApi({dbPath:join(folder,'t.sqlite'),mailer:async mail=>{sent.push(mail);},adminEmails:'boss@example.com',supportEmail:'support@example.com'});
  t.after(()=>{api.close();rmSync(folder,{recursive:true,force:true});});
  const call=async(path,{method='GET',data,cookie}={})=>{const r=await api.handle(new Request('http://localhost'+path,{method,headers:{host:'localhost',origin:'http://localhost',...(cookie?{cookie}:{}),...(data?{'content-type':'application/json'}:{})},body:data&&JSON.stringify(data)}));
    return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],body:await r.json()};};
  const boss=await call('/api/register',{method:'POST',data:{name:'Boss',password:'long-password-1',email:'boss@example.com',terms:true}});
  const player=await call('/api/register',{method:'POST',data:{name:'Joueuse',password:'long-password-1',email:'joueuse@example.com',terms:true}});

  assert.equal((await call('/api/admin',{cookie:boss.cookie})).status,403,'unconfirmed admin e-mail is refused');
  assert.equal((await call('/api/admin',{cookie:player.cookie})).status,403);
  api.store.verifyEmail(api.store.userByEmail('boss@example.com').id);
  assert.equal((await call('/api/account',{cookie:boss.cookie})).body.user.admin,true);

  // Guest contact, then a signed-in request answered from the panel.
  assert.equal((await call('/api/support',{method:'POST',data:{name:'Anonyme',email:'anon@example.com',subject:'Question',body:'Bonjour, une question.'}})).status,200);
  assert.equal((await call('/api/support',{method:'POST',data:{subject:'Import',body:'Mon import échoue toujours.'},cookie:player.cookie})).body.email,'joueuse@example.com');
  assert.equal(sent.at(-1).to,'support@example.com');
  await call('/api/events',{method:'POST',data:{events:[{kind:'click',name:'Importer mon inventaire'},{kind:'error',name:'TypeError',detail:'x is undefined'},{kind:'bad',name:'ignored'}]},cookie:player.cookie});
  await call('/api/import',{method:'POST',data:{good:'nope'},cookie:player.cookie});

  let overview=(await call('/api/admin',{cookie:boss.cookie})).body;
  assert.equal(overview.users.length,2);
  assert.equal(overview.tickets.length,2);
  assert.ok(overview.usage.some(u=>u.name==='Importer mon inventaire'&&u.users===1));
  assert.ok(overview.errors.some(e=>e.kind==='error'&&e.user==='Joueuse'));
  assert.ok(overview.errors.some(e=>e.name==='POST /api/import'&&e.status===400),'failed imports show up as problems');
  const ticket=overview.tickets.find(x=>x.subject==='Import');
  await call('/api/admin/tickets/'+ticket.id,{method:'POST',data:{body:'Essayez de rescanner.'},cookie:boss.cookie});
  assert.equal(sent.at(-1).to,'joueuse@example.com');
  let mine=(await call('/api/support',{cookie:player.cookie})).body.tickets;
  assert.deepEqual(mine[0].messages.map(m=>m.author),['user','admin']);
  assert.equal(mine[0].status,'answered');
  mine=(await call('/api/support/'+ticket.id,{method:'POST',data:{body:'Merci, ça marche.'},cookie:player.cookie})).body.tickets;
  assert.equal(mine[0].status,'open');
  assert.equal((await call('/api/support/'+ticket.id,{method:'POST',data:{body:'intrusion'},cookie:boss.cookie})).status,404,'only the author replies as user');

  const playerId=api.store.userByEmail('joueuse@example.com').id;
  await call('/api/admin/users/'+playerId,{method:'POST',data:{action:'extend',days:30},cookie:boss.cookie});
  assert.ok(Date.parse(api.store.billing(playerId).trial_ends)>Date.now()+40*864e5);
  await call('/api/admin/users/'+playerId,{method:'POST',data:{action:'disable'},cookie:boss.cookie});
  assert.equal((await call('/api/account',{cookie:player.cookie})).status,401,'suspension closes sessions');
  assert.equal((await call('/api/login',{method:'POST',data:{name:'Joueuse',password:'long-password-1'}})).status,403);
  await call('/api/admin/users/'+playerId,{method:'POST',data:{action:'enable'},cookie:boss.cookie});
  assert.equal((await call('/api/login',{method:'POST',data:{name:'Joueuse',password:'long-password-1'}})).status,200);
  assert.equal((await call('/api/admin/users/'+api.store.userByEmail('boss@example.com').id,{method:'POST',data:{action:'delete'},cookie:boss.cookie})).status,409);
  await call('/api/admin/users/'+playerId,{method:'POST',data:{action:'delete'},cookie:boss.cookie});
  overview=(await call('/api/admin',{cookie:boss.cookie})).body;
  assert.equal(overview.users.length,1);
  assert.equal(overview.tickets.length,2,'support history survives account deletion');
});

test('admin hardening: e-mail squat released, admin actions logged, header-safe tickets',async t=>{
  const folder=mkdtempSync(join(tmpdir(),'gt-admin-')),sent=[];
  const api=createApi({dbPath:join(folder,'t.sqlite'),mailer:async mail=>{sent.push(mail);},adminEmails:'boss@example.com',supportEmail:'support@example.com'});
  t.after(()=>{api.close();rmSync(folder,{recursive:true,force:true});});
  const call=async(path,{method='GET',data,cookie}={})=>{const r=await api.handle(new Request('http://localhost'+path,{method,headers:{host:'localhost',origin:'http://localhost',...(cookie?{cookie}:{}),...(data?{'content-type':'application/json'}:{})},body:data&&JSON.stringify(data)}));
    return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],body:await r.json()};};
  const squat=await call('/api/register',{method:'POST',data:{name:'Squat',password:'long-password-1',email:'boss@example.com',terms:true}});
  const boss=await call('/api/register',{method:'POST',data:{name:'Boss',password:'long-password-1',email:'BOSS@example.com',terms:true}});
  assert.equal(boss.status,200,'an unconfirmed squatter does not block the admin address');
  assert.equal(api.store.userByEmail('boss@example.com').name,'Boss');
  api.store.verifyEmail(api.store.userByEmail('boss@example.com').id);
  assert.equal((await call('/api/register',{method:'POST',data:{name:'Squat2',password:'long-password-1',email:'boss@example.com',terms:true}})).status,409,'a confirmed admin address stays taken');
  assert.equal((await call('/api/account',{cookie:squat.cookie})).body.user.admin,false);

  await call('/api/support',{method:'POST',data:{name:'A\r\nBcc: x@evil.test',email:'anon@example.com',subject:'Hi\r\nBcc: x@evil.test',body:'Bonjour, une question.'}});
  assert.ok(!/[\r\n]/.test(sent.at(-1).subject),'no line break reaches the Subject header');

  const squatId=api.store.db.prepare("SELECT id FROM users WHERE name='Squat'").get().id;
  await call('/api/admin/users/'+squatId,{method:'POST',data:{action:'disable'},cookie:boss.cookie});
  const {audit}=(await call('/api/admin',{cookie:boss.cookie})).body;
  assert.equal(audit[0].name,'user:disable');assert.equal(audit[0].user,'Boss');
});
