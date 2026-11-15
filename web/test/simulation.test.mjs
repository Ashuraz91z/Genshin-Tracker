import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSimulation } from '../lib/simulation.mjs';
const metadata=JSON.parse(readFileSync(new URL('../public/simulator/data.json',import.meta.url))),catalogue=JSON.parse(readFileSync(new URL('../public/assets/catalogue.json',import.meta.url)));
import { team, data } from './simulation-fixture.mjs';
test('simulation exports actual GOOD gear, main stats, talents and set bonuses without inventing missing data',()=>{
 const result=buildSimulation(team,data,catalogue,metadata);assert.deepEqual(result.issues,[]);assert.match(result.config,/sangonomiyakokomi char lvl=90\/90 cons=0 talent=8,8,8/);assert.match(result.config,/weapon="prototypeamber" refine=1 lvl=90\/90/);assert.match(result.config,/set="oceanhuedclam" count=4/);assert.match(result.config,/hp=4780/);assert.match(result.config,/cr=0.195/);assert.match(result.config,/resist=0.1/);
 assert.ok(buildSimulation(team,{...data,weapons:[]},catalogue,metadata).issues.length>0);
 assert.ok(buildSimulation(team,{...data,artifacts:data.artifacts.slice(1)},catalogue,metadata).issues.length>0);
 assert.ok(buildSimulation(team,{...data,artifacts:[...data.artifacts,data.artifacts[0]]},catalogue,metadata).issues.some(x=>x.includes('associations')));
 assert.ok(buildSimulation({...team,characters:['Valeriy']},data,catalogue,metadata).issues.some(x=>x.includes('non pris en charge')));
 const incomplete=structuredClone(data);incomplete.artifacts[0].substats=[];assert.ok(buildSimulation(team,incomplete,catalogue,metadata).issues.some(x=>x.includes('sous-statistiques')));
 const invalid=structuredClone(data);invalid.artifacts[0].substats[0].value=9999;assert.ok(buildSimulation(team,invalid,catalogue,metadata).issues.some(x=>x.includes('incohérentes')));
 assert.ok(buildSimulation({...team,duration:0},data,catalogue,metadata).issues.length>0);
});
