import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './http-fixture.mjs';

const character=(level=80)=>({key:'KamisatoAyaka',level,constellation:2,ascension:6,talent:{auto:8,skill:8,burst:9}});
const weapon={key:'DullBlade',level:20,ascension:1,refinement:1,location:'KamisatoAyaka',lock:false};
const artifact={setKey:'GladiatorsFinale',slotKey:'flower',rarity:5,level:20,mainStatKey:'hp',substats:[{key:'critRate_',value:3.9}],location:'',lock:false};
function scan(id,offset=0){return {scanId:id.padEnd(16,'x'),capturedAt:new Date(Date.now()-60000+offset).toISOString(),good:{format:'GOOD',version:2,characters:[character()],weapons:[weapon],artifacts:[artifact],materials:{Mora:123456}},report:{status:'finished_unverified',errors:[],selected:{characters:true,weapons:true,artifacts:true,materials:true},expectedFromScreen:{weapons:1,artifacts:1}}};}
async function setup(t) {
  const folder=mkdtempSync(join(tmpdir(),'genshin-sync-'));const dbPath=join(folder,'test.sqlite');
  const app=createApp({dbPath});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+app.server.address().port;
  t.after(async()=>{await new Promise(resolve=>app.server.close(resolve));rmSync(folder,{recursive:true,force:true});});
  const request=async(path,{cookie,token,origin=true,method='GET',data}={})=>{
    const response=await fetch(url+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(origin?{Origin:url}:{}),...(data!==undefined?{'Content-Type':'application/json'}:{})},body:data===undefined?undefined:JSON.stringify(data)});
    return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers};
  };
  async function register(name){const res=await request('/api/register',{method:'POST',data:{name,password:'a-test-password-at-least-12'}});assert.equal(res.status,200);return res.cookie;}
  async function pair(cookie){const code=await request('/api/pair',{method:'POST',cookie,data:{}});return request('/api/device/pair',{method:'POST',origin:false,data:{code:code.body.code,deviceName:'PC de test'}});}
  return {...app,request,register,pair,dbPath};
}

test('pairing is single-use; bearer sync updates only its owner; token can be revoked',async t=>{
  const {request,register}=await setup(t);const alice=await register('Alice'),bob=await register('Bob');
  const code=await request('/api/pair',{method:'POST',cookie:alice,data:{}});assert.ok(code.body.code);
  const paired=await request('/api/device/pair',{method:'POST',data:{code:code.body.code,deviceName:'PC Alice'},origin:false});assert.equal(paired.status,200);
  assert.equal((await request('/api/device/pair',{method:'POST',data:{code:code.body.code,deviceName:'Duplicate'},origin:false})).status,401);
  const token=paired.body.token,body=scan('sync-one');
  assert.equal((await request('/api/sync',{method:'POST',data:body,origin:false})).status,401);
  assert.equal((await request('/api/sync',{method:'POST',token,data:body,origin:false})).status,200);
  const received=await request('/api/account',{cookie:alice});assert.equal(received.body.data.characters[0].level,80);assert.equal(received.body.data.materials.Mora,123456);assert.equal(received.body.data.quality.artifacts,'count_matched');
  assert.equal((await request('/api/account',{cookie:bob})).body.data.characters.length,0);
  const bobRevoke=await request('/api/devices/'+paired.body.deviceId,{method:'DELETE',cookie:bob});assert.equal(bobRevoke.status,200);
  assert.equal((await request('/api/sync',{method:'POST',token,data:body,origin:false})).body.duplicate,true);
  assert.equal((await request('/api/account',{cookie:alice})).body.scans.length,1);
  await request('/api/devices/'+paired.body.deviceId,{method:'DELETE',cookie:alice});
  assert.equal((await request('/api/sync',{method:'POST',token,data:scan('after-revoked'),origin:false})).status,401);
});

test('partial and older scans preserve complete inventories and newer field values',async t=>{
  const {request,register,pair}=await setup(t);const cookie=await register('Voyageur');const token=(await pair(cookie)).body.token;
  await request('/api/sync',{method:'POST',token,data:scan('first-complete'),origin:false});
  const partial=scan('second-partial',1000);partial.good.characters=[character(90)];partial.good.weapons=[];partial.good.artifacts=[];partial.good.materials={Mora:20};partial.report.status='interrupted';partial.report.errors=['Lecture interrompue'];
  const result=await request('/api/sync',{method:'POST',token,data:partial,origin:false});assert.equal(result.body.applied.weapons,'preserved_previous');
  let account=(await request('/api/account',{cookie})).body;
  assert.equal(account.data.weapons.length,1);assert.equal(account.data.artifacts.length,1);assert.equal(account.data.characters[0].level,90);assert.equal(account.data.materials.Mora,20);
  const older=scan('old-outbox',-1000);older.good.characters=[character(10)];
  const old=await request('/api/sync',{method:'POST',token,data:older,origin:false});assert.equal(old.body.applied.characters,'older_scan');
  account=(await request('/api/account',{cookie})).body;assert.equal(account.data.characters[0].level,90);assert.equal(account.data.materials.Mora,20);
});

test('bad data, missing CSRF origin and wrong logins are rejected without modifying saved data',async t=>{
  const {request,register,pair}=await setup(t);const cookie=await register('Securite');const token=(await pair(cookie)).body.token;
  assert.equal((await request('/api/pair',{method:'POST',cookie,data:{},origin:false})).status,403);
  assert.equal((await request('/api/account')).status,401);
  assert.equal((await request('/api/login',{method:'POST',data:{name:'Securite',password:'wrongpasswordlong'}})).status,401);
  const body=scan('invalid-character');body.good.characters[0].talent.auto=-1;
  assert.equal((await request('/api/sync',{method:'POST',token,data:body,origin:false})).status,400);
  const poison=scan('poison-material');poison.good.materials=JSON.parse('{"__proto__":12}');
  assert.equal((await request('/api/sync',{method:'POST',token,data:poison,origin:false})).status,400);
  assert.equal((await request('/api/account',{cookie})).body.scans.length,0);
  const response=await request('/api/account',{cookie});assert.ok(response.headers.get('content-security-policy').includes("script-src 'self'"));
});

test('a first partial scan is usable; a later complete scan replaces it; manual import stays scoped',async t=>{
  const {request,register,pair}=await setup(t);const cookie=await register('Collection');const token=(await pair(cookie)).body.token;
  const first=scan('first-partial');first.report.status='failed';
  const result=await request('/api/sync',{method:'POST',token,data:first,origin:false});assert.equal(result.body.applied.artifacts,'first_partial');
  const second=scan('then-complete',1000);second.good.weapons=[];second.report.expectedFromScreen.weapons=0;
  await request('/api/sync',{method:'POST',token,data:second,origin:false});
  let account=(await request('/api/account',{cookie})).body;assert.equal(account.data.weapons.length,0);
  const imported=await request('/api/import',{method:'POST',cookie,data:{good:{format:'GOOD',version:2,materials:{Mora:777}}}});assert.equal(imported.status,200);
  account=(await request('/api/account',{cookie})).body;assert.equal(account.data.materials.Mora,777);
});

test('SQLite records survive opening a second store on the same database',async t=>{
  const {store,dbPath,register,request,pair}=await setup(t);const cookie=await register('Persistant');const token=(await pair(cookie)).body.token;
  await request('/api/sync',{method:'POST',token,data:scan('persisted-scan'),origin:false});
  const {openStore}=await import('../store.mjs');const reopened=openStore(dbPath);
  try{const user=reopened.user(cookie.split('=')[1]);assert.equal(reopened.account(user).data.characters.length,1);assert.equal(reopened.account(user).scans.length,1);}finally{reopened.close();}
});

 test('registration accepts six characters, rejects five and preserves login',async t=>{
  const {request}=await setup(t);
  assert.equal((await request('/api/register',{method:'POST',data:{name:'Court',password:'12345'}})).status,400);
  assert.equal((await request('/api/register',{method:'POST',data:{name:'SixChars',password:'123456'}})).status,200);
  assert.equal((await request('/api/login',{method:'POST',data:{name:'SixChars',password:'123456'}})).status,200);
});
