import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { openStore } from '../store.mjs';
const web=dirname(dirname(fileURLToPath(import.meta.url)));

test('Next production preserves existing accounts and device keys, serves all pages with CSP nonces, and receives a Kamera scan',async t=>{
  const folder=mkdtempSync(join(tmpdir(),'genshin-next-')),dbPath=join(folder,'tracker.sqlite'),download=join(folder,'app.zip');
  writeFileSync(download,Buffer.from('PK\x03\x04fixture-download'));
  const original=openStore(dbPath),user=original.register('Migration','migration-password-123','migration@example.com');
  const cookie='gt_session='+original.session(user),pair=original.pair(user),device=original.redeem(pair.code,'Existing Windows PC');original.close();
  const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
  let logs='';const child=spawn(process.execPath,[join(web,'scripts/start.mjs')],{cwd:web,env:{...process.env,NODE_ENV:'production',HOSTNAME:'127.0.0.1',PORT:String(port),DATABASE_PATH:relative(web,dbPath),DOWNLOAD_PATH:relative(web,download),PUBLIC_URL:'',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',chunk=>logs+=chunk);child.stderr.on('data',chunk=>logs+=chunk);
  t.after(async()=>{child.kill();if(child.exitCode===null)await once(child,'exit');rmSync(folder,{recursive:true,force:true});});
  const url='http://127.0.0.1:'+port;
  let ready=false;
  for(let i=0;i<200;i++){if(child.exitCode!==null)throw new Error(logs);try{const r=await fetch(url+'/health');if(r.ok){ready=true;break;}}catch{}await delay(100);}
  assert.ok(ready,'Next server did not become ready: '+logs);
  const call=async(path,{method='GET',data,token,session=cookie,origin=true}={})=>{
    const response=await fetch(url+path,{method,headers:{...(session?{Cookie:session}:{}),...(origin?{Origin:url}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
    return {status:response.status,headers:response.headers,body:await response.json()};
  };
  const desktop=await call('/api/device/login',{method:'POST',origin:false,session:null,token:device.token,data:{name:'Migration',password:'migration-password-123',deviceName:'Existing PC'}});
  assert.equal(desktop.status,200);assert.equal(desktop.body.token,device.token);
  const desktopAccount=await call('/api/device/account',{session:null,token:device.token,origin:false});assert.equal(desktopAccount.status,200);assert.equal(desktopAccount.body.user.name,'Migration');
  const before=await call('/api/account');assert.equal(before.status,200);assert.equal(before.body.user.name,'Migration');
  let previousNonce;
  for(const page of ['/','/app','/characters','/characters/KamisatoAyaka','/inventory','/teams','/sync','/roadmap']) {
    const response=await fetch(url+page);assert.equal(response.status,200,page);const html=await response.text();
    assert.ok(html.includes('GENSHIN'));if(page==='/'){assert.ok(html.includes('Quoi farmer aujourd’hui'));assert.ok(html.includes('href="/app"'));assert.ok(!html.includes('auth-form'));}else assert.ok(html.includes('Ouverture de votre carnet'));
    const csp=response.headers.get('content-security-policy'),nonce=csp?.match(/'nonce-([^']+)'/)?.[1];
    assert.ok(nonce,'Production page missing CSP nonce');assert.notEqual(nonce,previousNonce);previousNonce=nonce;
    assert.ok(!csp.includes("'unsafe-inline'")&&!csp.includes("'unsafe-eval'"));
    const scripts=[...html.matchAll(/<script\b([^>]*)>/g)];assert.ok(scripts.length>0);
    for(const script of scripts)assert.ok(script[1].includes(`nonce="${nonce}"`),'Hydration script blocked by CSP');
    const sources=[...html.matchAll(/(?:src|href)="([^" ]*\/_next\/(?:static|[^" ]+)[^" ]*)"/g)].map(m=>m[1]);
    assert.ok(sources.length>0);for(const asset of sources.slice(0,4)){const r=await fetch(new URL(asset,url));assert.equal(r.status,200,asset);await r.arrayBuffer();}
  }
  for(const [page,title] of [['/mentions-legales','Mentions légales'],['/confidentialite','Confidentialité'],['/cookies','Cookies et stockage local'],['/conditions-utilisation','Conditions d’utilisation'],['/aide','Aide et contact']]) {
    const response=await fetch(url+page);assert.equal(response.status,200,page);const html=await response.text();
    assert.ok(html.includes('<h1>'+title+'</h1>'),page);
    assert.ok(html.includes('href="/aide"'),page);
    for(const href of ['/mentions-legales','/confidentialite','/cookies','/conditions-utilisation','/aide'])assert.ok(html.includes('href="'+href+'"'),page+' missing '+href);
    assert.ok(!/À (?:compléter|renseigner)|\[SIRET\]/i.test(html),'Unfinished legal page');
  }
  for(const page of ['/','/app']) {
    const html=await (await fetch(url+page)).text();
    assert.ok(html.includes('href="/confidentialite"'),'Privacy must be accessible before login');
  }
  assert.equal((await fetch(url+'/not-a-page')).status,404);
  assert.equal((await fetch(url+'/api/not-a-route')).status,404);
  const references=await call('/api/catalogue');assert.equal(references.body.characters.KamisatoAyaka.name,'Kamisato Ayaka');
  for(const asset of ['/assets/mark.svg','/assets/voyage.svg',references.body.characters.KamisatoAyaka.portrait].filter(Boolean)){const r=await fetch(url+asset);assert.equal(r.status,200);await r.arrayBuffer();}
  const zipped=await fetch(url+'/api/download');assert.equal(zipped.status,200);assert.equal(Buffer.from(await zipped.arrayBuffer()).subarray(0,2).toString(),'PK');
  const payload={scanId:'next-migration-scan-0001',capturedAt:new Date().toISOString(),good:{format:'GOOD',version:2,characters:[{key:'KamisatoAyaka',level:80,constellation:2,ascension:6,talent:{auto:8,skill:8,burst:9}}],materials:{Mora:12345}},report:{status:'finished_unverified',errors:[],selected:{characters:true,materials:true}}};
  const receipt=await call('/api/sync',{method:'POST',session:null,origin:false,token:device.token,data:payload});assert.equal(receipt.status,200);assert.equal(receipt.body.ok,true);
  const after=await call('/api/account');assert.equal(after.body.data.characters[0].level,80);assert.equal(after.body.data.materials.Mora,12345);
  const csrf=await call('/api/pair',{method:'POST',origin:false,data:{}});assert.equal(csrf.status,403);
  const code=await call('/api/pair',{method:'POST',data:{}});const paired=await call('/api/device/pair',{method:'POST',session:null,origin:false,data:{code:code.body.code,deviceName:'Next associated PC'}});assert.equal(paired.status,200);
  assert.equal((await call('/api/device/pair',{method:'POST',session:null,origin:false,data:{code:code.body.code,deviceName:'Reused code'}})).status,401);
  assert.equal((await call('/api/sync',{method:'POST',session:null,origin:false,data:payload})).status,401);
});
