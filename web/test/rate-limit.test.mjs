import assert from 'node:assert';import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import test from 'node:test';import {createApi} from '../lib/api.mjs';
const api=createApi({dbPath:join(mkdtempSync(join(tmpdir(),'gt-')),'t.sqlite')});
const post=(name)=>api.handle(new Request('http://localhost/api/login',{method:'POST',headers:{host:'localhost','content-type':'application/json',origin:'http://localhost'},body:JSON.stringify({name,password:'wrongpass'})}));
for(let i=0;i<10;i++)assert.equal((await post('victim')).status,401);
assert.equal((await post('victim')).status,429,'11th attempt on same pseudo blocked');
assert.equal((await post('other')).status,401,'other pseudo not locked out');
api.close();
