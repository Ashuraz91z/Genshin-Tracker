import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { characterNeeds, shortfall, openOn, farmPlan, upgradeGuide } from '../lib/planner.mjs';
import { analyzeTeam, scenarioData } from '../lib/team.mjs';
import { buildSimulation } from '../lib/simulation.mjs';
const j=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const planner=j('../public/assets/planner.json'),catalogue=j('../public/assets/catalogue.json'),metadata=j('../public/simulator/data.json');
const data={characters:[{key:'Bennett',level:80,ascension:5,constellation:6,talent:{auto:1,skill:6,burst:8}},{key:'Xiangling',level:90,ascension:6,constellation:6,talent:{auto:1,skill:9,burst:9}}],weapons:[{key:'AquilaFavonia',level:1,ascension:0,refinement:1,location:''}],artifacts:[],materials:{TeachingsOfResistance:100}};
test('planner costs, domain days, guide, team analysis and damage scenarios',()=>{
 const book=planner.characters.Bennett.talentBook;assert.equal(book,'TeachingsOfResistance');assert.ok(openOn(planner.materialDays[book],0));assert.ok(!openOn(planner.materialDays[book],1));
 const needs=characterNeeds(data.characters[0],planner.characters.Bennett);assert.ok(needs.Mora>0&&needs.CrownOfInsight===3);
 assert.equal(shortfall(needs,data.materials).find(n=>n.key==='TeachingsOfResistance').missing,0);
 assert.ok(farmPlan(data,catalogue,planner,2).some(g=>g.key===book&&g.who.includes('Bennett')));
 assert.ok(upgradeGuide(data.characters[0],data,catalogue,planner).steps.some(s=>s.area==='Artéfacts'));
 const a=analyzeTeam(['Bennett','Xiangling'],data,catalogue);assert.ok(a.good.some(t=>t.includes('Bennett')));assert.ok(a.bad.some(t=>t.includes('incomplète')));
 const team={characters:['Bennett'],duration:20,enemyLevel:100,resistance:10,iterations:20,energy:'normal',rotation:''};
 for(const mode of ['inventory','ideal']){const d=scenarioData(mode,team.characters,data,catalogue,metadata,planner,{constellation:0});assert.deepEqual(buildSimulation(team,d,catalogue,metadata).issues,[]);assert.equal(d.characters[0].talent.skill,10);}
 assert.equal(data.characters[0].level,80);
});
