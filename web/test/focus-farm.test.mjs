import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { goalPlan, goals } from '../lib/planner.mjs';
const j=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const planner=j('../public/assets/planner.json'),catalogue=j('../public/assets/catalogue.json');
const data={characters:[{key:'Bennett',level:80,ascension:5,constellation:6,talent:{auto:1,skill:6,burst:8}}],weapons:[],artifacts:[],materials:{}};
// ponytail: smoke check du tri « le plus rare d'abord » pour un seul personnage ciblé.
test('focused farm list puts the scarcest blocking material first',()=>{
 const p=goalPlan(data,catalogue,planner,['Bennett'],goals.all.target,2);
 const r=g=>g.short?.rarity??0;
 for(let i=1;i<p.today.length;i++)assert.ok(r(p.today[i-1])>=r(p.today[i]));
 for(let i=1;i<p.later.length;i++)assert.ok(r(p.later[i-1])>=r(p.later[i]));
});
