import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareDatabase } from '../lib/storage.mjs';
import { openStore } from '../store.mjs';
import { guestAccount } from '../lib/guest.mjs';
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
  const result=await request('/api/sync',{method:'POST',token,data:partial,origin:false});assert.equal(result.body.applied.weapons,'empty_scan');
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

test('guest GOOD import validates all categories locally and replaces rather than merges',()=>{
  const good=scan('guest-test').good;
  const local=guestAccount(good);
  assert.equal(local.guest,true);assert.deepEqual(local.devices,[]);
  assert.equal(local.data.characters[0].key,'KamisatoAyaka');
  assert.equal(local.data.weapons[0].key,'DullBlade');
  assert.equal(local.data.artifacts[0].mainStatKey,'hp');
  assert.equal(local.data.materials.Mora,123456);
  assert.equal(local.data.quality.weapons,'first_partial');
  assert.deepEqual(guestAccount({format:'GOOD',version:2,materials:{Mora:2}}).data.characters,[]);
  assert.throws(()=>guestAccount({format:'invalid',version:2,materials:{}}),/GOOD/);
  assert.throws(()=>guestAccount({...good,characters:[{...character(),level:-1}]}),/Personnage/);
  assert.throws(()=>guestAccount({...good,materials:JSON.parse('{"__proto__":1}')}),/Quantité/);
  assert.deepEqual(guestAccount(JSON.parse(JSON.stringify(good)),local.data.updatedAt).data,local.data);
});

test('desktop login persists device access, reuses its key, reads actual account and respects revocation',async t=>{
  const {request,register,dbPath}=await setup(t);const owner=await register('Desktop'),other=await register('Other');
  const login={name:'Desktop',password:'a-test-password-at-least-12',deviceName:'PC Windows'};
  assert.equal((await request('/api/device/login',{method:'POST',origin:false,data:{...login,password:'wrongpass'}})).status,401);
  const connected=await request('/api/device/login',{method:'POST',origin:false,data:login});assert.equal(connected.status,200);const token=connected.body.token;
  assert.equal((await request('/api/device/account',{cookie:owner})).status,401);
  const payload=scan('desktop-upload');payload.report.events=[{at:new Date().toISOString(),message:'Lecture des personnages terminée.'}];
  const receipt=await request('/api/sync',{method:'POST',origin:false,token,data:payload});assert.equal(receipt.body.counts.characters,1);assert.equal(receipt.body.applied.characters,'merged');
  const actual=await request('/api/device/account',{origin:false,token});assert.equal(actual.body.user.name,'Desktop');assert.equal(actual.body.data.characters[0].talent.burst,9);assert.equal(actual.body.scans[0].report.events[0].message,'Lecture des personnages terminée.');
  const repeated=await request('/api/device/login',{method:'POST',origin:false,token,data:login});assert.equal(repeated.body.token,token);assert.equal((await request('/api/account',{cookie:owner})).body.devices.length,1);
  const duplicate=await request('/api/sync',{method:'POST',origin:false,token,data:payload});assert.equal(duplicate.body.duplicate,true);assert.deepEqual(duplicate.body.counts,receipt.body.counts);assert.deepEqual(duplicate.body.applied,receipt.body.applied);
  const reopened=openStore(dbPath);assert.ok(reopened.device(token));reopened.close();
  assert.equal((await request('/api/account',{cookie:other})).body.data.characters.length,0);
  const switched=await request('/api/device/login',{method:'POST',origin:false,token,data:{...login,name:'Other'}});assert.notEqual(switched.body.token,token);assert.equal((await request('/api/device/account',{token:switched.body.token})).body.user.name,'Other');
  await request('/api/devices/'+connected.body.deviceId,{method:'DELETE',cookie:owner});assert.equal((await request('/api/device/account',{token})).status,401);assert.equal((await request('/api/sync',{method:'POST',origin:false,token,data:payload})).status,401);
});

test('empty character scans preserve data without blocking a valid delayed scan and explain the outcome',async t=>{
  const {request,register,pair}=await setup(t);const owner=await register('EmptyScan');const token=(await pair(owner)).body.token;
  const first=scan('first-populated',-1000);first.good={format:'GOOD',version:2,characters:[character(70)]};
  await request('/api/sync',{method:'POST',origin:false,token,data:first});
  const empty=scan('empty-newer',1000);empty.good={format:'GOOD',version:2,characters:[],materials:{}};
  const rejected=await request('/api/sync',{method:'POST',origin:false,token,data:empty});assert.equal(rejected.body.applied.characters,'empty_scan');assert.equal(rejected.body.applied.materials,'empty_scan');
  const valid=scan('valid-delayed',0);valid.good={format:'GOOD',version:2,characters:[character(80)]};
  const accepted=await request('/api/sync',{method:'POST',origin:false,token,data:valid});assert.equal(accepted.body.applied.characters,'merged');assert.equal((await request('/api/account',{cookie:owner})).body.data.characters[0].level,80);
});

test('manual equipment replacement requires explicit authenticated import; device payload cannot bypass protection',async t=>{
  const {request,register,pair}=await setup(t);const owner=await register('ManualChoice'),token=(await pair(owner)).body.token;
  await request('/api/sync',{method:'POST',token,origin:false,data:scan('complete-equipment')});
  const changed={format:'GOOD',version:2,weapons:[{...weapon,level:40}]};
  const ordinary=await request('/api/import',{method:'POST',cookie:owner,data:{good:changed}});assert.equal(ordinary.body.applied.weapons,'partial_merged');
  const spoof=scan('spoof-replacement',1000);spoof.good=changed;spoof.report.status='failed';spoof.replaceInventory=true;
  assert.equal((await request('/api/sync',{method:'POST',token,origin:false,data:spoof})).body.applied.weapons,'older_scan');
  assert.equal((await request('/api/import',{method:'POST',data:{good:changed,replaceInventory:true}})).status,401);
  const forced=await request('/api/import',{method:'POST',cookie:owner,data:{good:changed,replaceInventory:true}});assert.equal(forced.body.applied.weapons,'manual_replaced');
  const after=await request('/api/account',{cookie:owner});assert.equal(after.body.data.weapons[0].level,40);assert.equal(after.body.data.quality.weapons,'manual');assert.equal(after.body.data.artifacts.length,1);
});

test('Hostinger redeploys keep a stable database and migrate accounts, device tokens, sessions and committed WAL data',async t=>{
  const root=mkdtempSync(join(tmpdir(),'genshin-hostinger-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const previous=join(root,'hbuilds','previous','nodejs');mkdirSync(join(previous,'data'),{recursive:true});
  const original=openStore(join(previous,'data','tracker.sqlite')),user=original.register('Persistent','password123');
  const session=original.session(user),pair=original.pair(user),device=original.redeem(pair.code,'Windows');
  original.sync(user.id,'Windows',scan('before-redeploy'),device.deviceId);
  const current=join(root,'hbuilds','new','nodejs');mkdirSync(current,{recursive:true});
  const path=prepareDatabase({cwd:current,configured:undefined,publicUrl:'https://genshin.example.com'});
  assert.equal(path,join(root,'tracker-data','tracker.sqlite'));assert.ok(existsSync(join(previous,'data','tracker.sqlite')));
  const migrated=openStore(path);assert.equal(migrated.user(session).id,user.id);assert.equal(migrated.device(device.token).user_id,user.id);assert.equal(migrated.account(user).data.characters[0].level,80);
  const next=join(root,'hbuilds','next','web');mkdirSync(next,{recursive:true});assert.equal(prepareDatabase({cwd:next,configured:undefined,publicUrl:'https://genshin.example.com'}),path);
  assert.equal(prepareDatabase({cwd:next,configured:'custom.sqlite',publicUrl:'https://genshin.example.com'}),join(next,'custom.sqlite'));
  assert.equal(prepareDatabase({cwd:next,configured:undefined,publicUrl:''}),join(next,'data/tracker.sqlite'));
  migrated.close();original.close();
});

test('invalid OCR artifacts are excluded with diagnostics while valid artifacts and other categories still sync',async t=>{
 const {request,register,pair}=await setup(t);const owner=await register('ArtifactOCR'),token=(await pair(owner)).body.token;
 const payload=scan('bad-artifact-and-valid');payload.report.status='interrupted';payload.good.artifacts=[artifact,{...artifact,substats:[{key:'',value:5.8}]}];
 const received=await request('/api/sync',{method:'POST',origin:false,token,data:payload});assert.equal(received.status,200);assert.equal(received.body.rejectedArtifacts,1);assert.equal(received.body.counts.artifacts,1);
 const account=(await request('/api/account',{cookie:owner})).body;assert.equal(account.data.characters.length,1);assert.equal(account.data.artifacts.length,1);assert.equal(account.data.quality.artifacts,'partial');assert.equal(account.scans[0].report.rejectedArtifacts,1);assert.match(account.scans[0].report.errors[0],/Artéfact #2 exclu/);
 const malformed=scan('all-invalid-artifacts',1000);malformed.good={format:'GOOD',version:2,artifacts:[{...artifact,mainStatKey:''}]};
 const empty=await request('/api/sync',{method:'POST',origin:false,token,data:malformed});assert.equal(empty.status,200);assert.equal(empty.body.applied.artifacts,'empty_scan');assert.equal((await request('/api/account',{cookie:owner})).body.data.artifacts.length,1);
 const override=await request('/api/import',{method:'POST',cookie:owner,data:{good:payload.good,replaceInventory:true}});assert.equal(override.body.applied.artifacts,'partial_merged');
});

test('partial equipment merges valid multiplicities on every import without deleting other categories',async t=>{
 const {request,register,pair}=await setup(t);const owner=await register('PartialMerge'),token=(await pair(owner)).body.token;
 await request('/api/sync',{method:'POST',token,origin:false,data:scan('merge-original')});
 const partial=scan('merge-artifacts',1000);partial.good={format:'GOOD',version:2,artifacts:[artifact,artifact,{...artifact,setKey:'OceanHuedClam'}]};partial.report.status='finished_with_errors';partial.report.errors=['OCR'];
 const receipt=await request('/api/sync',{method:'POST',token,origin:false,data:partial});assert.equal(receipt.body.applied.artifacts,'partial_merged');
 let data=(await request('/api/account',{cookie:owner})).body.data;assert.equal(data.artifacts.length,3);assert.equal(data.weapons.length,1);assert.equal(data.characters.length,1);
 const again=await request('/api/import',{method:'POST',cookie:owner,data:{good:partial.good}});assert.equal(again.body.applied.artifacts,'partial_merged');
 data=(await request('/api/account',{cookie:owner})).body.data;assert.equal(data.artifacts.length,3);assert.equal(data.materials.Mora,123456);
});

test('manual artifacts and teams are isolated, validated, reversible and survive scans and reopening the database',async t=>{
 const {request,register,dbPath}=await setup(t),alice=await register('Manual Alice'),bob=await register('Manual Bob');
 const imported=scan('customization-original');await request('/api/import',{method:'POST',cookie:alice,data:imported});
 const {artifactIdentity}=await import('../lib/customization.mjs');
 const input={characterKey:'KamisatoAyaka',source:artifactIdentity(artifact),artifact:{...artifact,substats:[{key:'critRate_',value:3.9},{key:'critDMG_',value:7.8},{key:'atk',value:19},{key:'enerRech_',value:5.8}]}};
 assert.equal((await request('/api/manual-artifacts',{method:'POST',cookie:alice,origin:false,data:input})).status,403);
 assert.equal((await request('/api/manual-artifacts',{method:'POST',data:input})).status,401);
 assert.equal((await request('/api/manual-artifacts',{method:'POST',cookie:bob,data:input})).status,400);
 const saved=await request('/api/manual-artifacts',{method:'POST',cookie:alice,data:input});assert.equal(saved.status,200);assert.equal(saved.body.data.artifacts.length,1);assert.equal(saved.body.data.artifacts[0].location,'KamisatoAyaka');
 const id=saved.body.customizations.artifacts[0].id;
 for(const patch of [{rarity:3},{level:21},{mainStatKey:'critRate_'},{substats:[{key:'hp',value:10}]},{substats:[{key:'critRate_',value:9000}]},{setKey:'NoSuchSet'}])assert.equal((await request('/api/manual-artifacts',{method:'POST',cookie:alice,data:{...input,artifact:{...input.artifact,...patch}}})).status,400);
 assert.equal((await request('/api/manual-artifacts/'+id,{method:'DELETE',cookie:bob})).status,400);
 const team=await request('/api/teams',{method:'POST',cookie:alice,data:{name:'Mon équipe',characters:['KamisatoAyaka'],duration:20,enemyLevel:100,resistance:10,iterations:20}});assert.equal(team.status,200);const teamId=team.body.customizations.teams[0].id;
 assert.equal((await request('/api/teams',{method:'POST',cookie:alice,data:{name:'Doublon',characters:['KamisatoAyaka','KamisatoAyaka']}})).status,400);
 assert.equal((await request('/api/teams/'+teamId,{method:'DELETE',cookie:bob})).status,400);
 const newer=scan('customization-newer',1000);newer.good.artifacts[0]={...artifact,level:4,location:'KamisatoAyaka'};
 await request('/api/import',{method:'POST',cookie:alice,data:{...newer,replaceInventory:true}});
 const after=await request('/api/account',{cookie:alice});assert.equal(after.body.customizations.artifacts.length,1);assert.equal(after.body.data.artifacts.filter(a=>a.location==='KamisatoAyaka').length,1);assert.equal(after.body.data.artifacts.find(a=>a.manualId).level,20);
 const reedited=await request('/api/manual-artifacts',{method:'POST',cookie:alice,data:input});assert.equal(reedited.status,200);assert.equal(reedited.body.customizations.artifacts[0].id,id);
 const other=openStore(dbPath);const row=other.db.prepare('SELECT data FROM customizations').get();assert.equal(JSON.parse(row.data).teams[0].name,'Mon équipe');other.close();
 const removed=await request('/api/manual-artifacts/'+id,{method:'DELETE',cookie:alice});assert.equal(removed.status,200);assert.equal(removed.body.data.artifacts.length,1);assert.equal(removed.body.data.artifacts[0].level,4);assert.equal(removed.body.data.artifacts[0].location,'KamisatoAyaka');
 assert.equal((await request('/api/teams/'+teamId,{method:'DELETE',cookie:alice})).status,200);
 const untouched=await request('/api/account',{cookie:bob});assert.equal(untouched.body.customizations.teams.length,0);assert.equal(untouched.body.data.artifacts.length,0);
});
