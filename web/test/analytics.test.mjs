import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi } from '../lib/api.mjs';

test('stats: visitors are pseudonymous, internal accounts are left out, fixed errors are tracked',async t=>{
  const folder=mkdtempSync(join(tmpdir(),'gt-stats-')),sent=[];
  const api=createApi({dbPath:join(folder,'t.sqlite'),mailer:async mail=>{sent.push(mail);},adminEmails:'boss@example.com',internalEmails:'dev@example.com',supportEmail:'support@example.com'});
  t.after(()=>{api.close();rmSync(folder,{recursive:true,force:true});});
  const call=async(path,{method='GET',data,cookie,headers={}}={})=>{const r=await api.handle(new Request('http://localhost'+path,{method,headers:{host:'localhost',origin:'http://localhost',...headers,...(cookie?{cookie}:{}),...(data?{'content-type':'application/json'}:{})},body:data&&JSON.stringify(data)}));
    return {status:r.status,cookie:r.headers.get('set-cookie')?.split(';')[0],body:await r.json()};};
  const register=(name,email)=>call('/api/register',{method:'POST',data:{name,password:'long-password-1',email,terms:true}});
  const boss=await register('Boss','boss@example.com');
  const dev=await register('Dev','dev@example.com');
  api.store.verifyEmail(api.store.userByEmail('boss@example.com').id);

  // Two real visitors (two IPs), one of them coming back; the dev's own browser is signed in and clicks.
  const guest=(ip,events)=>call('/api/events',{method:'POST',data:{events},headers:{'x-forwarded-for':ip,'user-agent':'Firefox/1'}});
  await guest('1.2.3.4',[{kind:'page',name:'/'},{kind:'error',name:'TypeError',detail:'boom'}]);
  await guest('5.6.7.8',[{kind:'page',name:'/'}]);
  await guest('1.2.3.4',[{kind:'click',name:'Accueil'}]);
  await call('/api/events',{method:'POST',data:{events:[{kind:'click',name:'Créer mon compte'},{kind:'error',name:'DevCrash',detail:'test'}]},cookie:dev.cookie,headers:{'x-forwarded-for':'9.9.9.9'}});

  let overview=(await call('/api/admin',{cookie:boss.cookie})).body;
  assert.equal(overview.visitors.d30,2,'same IP and browser count once, dev excluded');
  assert.ok(overview.usage.some(u=>u.name==='Accueil'));
  assert.ok(!overview.usage.some(u=>u.name==='Créer mon compte'),'internal clicks are not counted');
  assert.ok(!overview.errors.some(e=>e.name==='DevCrash'),'internal errors are not listed');
  assert.ok(overview.errors.some(e=>e.name==='TypeError'));
  assert.ok(!JSON.stringify(overview).includes('1.2.3.4'),'no raw IP in the panel');

  // Mark the error fixed, then reopen it.
  const sig=['error','TypeError',null,'boom'].join('|');
  assert.equal((await call('/api/admin/errors',{method:'POST',data:{sig,fixed:true},cookie:boss.cookie})).status,200);
  overview=(await call('/api/admin',{cookie:boss.cookie})).body;
  assert.ok(overview.fixes[sig],'fix date is stored');
  assert.equal((await call('/api/admin/errors',{method:'POST',data:{sig,fixed:false},cookie:boss.cookie})).status,200);
  overview=(await call('/api/admin',{cookie:boss.cookie})).body;
  assert.equal(overview.fixes[sig],undefined,'reopened error has no fix date');
  assert.equal((await call('/api/admin/errors',{method:'POST',data:{sig,fixed:true},cookie:dev.cookie})).status,403,'only admins change error status');
  const audit=overview.audit.map(a=>a.name);
  assert.ok(audit.includes('error:fixed') && audit.includes('error:reopened'),'fix actions are journaled');
});
