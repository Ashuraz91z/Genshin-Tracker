import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { characterNeeds, shortfall, openOn, goalPlan, goals, upgradeGuide } from '../lib/planner.mjs';
import { analyzeTeam, scenarioData } from '../lib/team.mjs';
import { buildSimulation } from '../lib/simulation.mjs';
const j=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const planner=j('../public/assets/planner.json'),catalogue=j('../public/assets/catalogue.json'),metadata=j('../public/simulator/data.json');
const data={characters:[{key:'Bennett',level:80,ascension:5,constellation:6,talent:{auto:1,skill:6,burst:8}},{key:'Xiangling',level:90,ascension:6,constellation:6,talent:{auto:1,skill:9,burst:9}}],weapons:[{key:'AquilaFavonia',level:1,ascension:0,refinement:1,location:''}],artifacts:[],materials:{TeachingsOfResistance:100}};
test('planner costs, domain days, guide, team analysis and damage scenarios',()=>{
 const book=planner.characters.Bennett.talentBook;assert.equal(book,'TeachingsOfResistance');assert.ok(openOn(planner.materialDays[book],0));assert.ok(!openOn(planner.materialDays[book],1));
 const needs=characterNeeds(data.characters[0],planner.characters.Bennett);assert.ok(needs.Mora>0&&needs.CrownOfInsight===3);
 assert.equal(shortfall(needs,data.materials).find(n=>n.key==='TeachingsOfResistance').missing,0);
 const all=goalPlan(data,catalogue,planner,null,goals.all.target,2);assert.ok(all.today.some(g=>g.key===book&&g.who.includes('Bennett')&&g.kind==='talent'&&!g.place.includes(' : ')));
 assert.ok(goalPlan(data,catalogue,planner,null,goals.all.target,1).later.some(g=>g.key===book),'closed domains move to other days');
 assert.ok(all.other.every(g=>g.key!=='Mora'&&!planner.materialDays[g.key]&&g.missing>0),'day-bound materials stay out of the any-day list');
 assert.equal(goalPlan(data,catalogue,planner,['Xiangling'],goals.theater.target,2).today.length,0,'theater targets are lower, Xiangling is done');
 assert.ok(goalPlan(data,catalogue,planner,['Bennett'],goals.abyss.target,2).today.some(g=>g.key===book),'abyss pushes Bennett skill 6 to 9');
 assert.ok(upgradeGuide(data.characters[0],data,catalogue,planner).steps.some(s=>s.area==='Artéfacts'));
 const a=analyzeTeam(['Bennett','Xiangling'],data,catalogue);assert.ok(a.good.some(t=>t.includes('Bennett')));assert.ok(a.bad.some(t=>t.includes('incomplète')));
 const team={characters:['Bennett'],duration:20,enemyLevel:100,resistance:10,iterations:20,energy:'normal',rotation:''};
 for(const mode of ['inventory','ideal']){const d=scenarioData(mode,team.characters,data,catalogue,metadata,planner,{constellation:0});assert.deepEqual(buildSimulation(team,d,catalogue,metadata).issues,[]);assert.equal(d.characters[0].talent.skill,10);}
 assert.equal(data.characters[0].level,80);
});
import { recommendTeams, adviseTeam } from '../lib/recommend.mjs';
test('team recommendations follow the box and advise the main team',()=>{
 const box={characters:['Xiangling','Bennett','Xingqiu','Sucrose','Beidou','Fischl'].map(key=>({key,level:80,ascension:5,constellation:6,talent:{auto:6,skill:8,burst:8}})),weapons:[],artifacts:[],materials:{}};
 const recos=recommendTeams(box,catalogue);assert.equal(recos[0].id,'national');assert.deepEqual(recos[0].picked,['Xiangling','Bennett','Xingqiu','Sucrose']);
 assert.ok(recos.some(t=>t.id==='taser'&&t.coverage===1));assert.ok(recos.every(t=>t.picked.every(k=>box.characters.some(c=>c.key===k))));
 const advice=adviseTeam(['Xiangling','Bennett','Beidou','Fischl'],box,catalogue);assert.ok(advice.archetype);assert.equal(advice.invest.length,4);
});

test('inventory scenario uses the best unequipped pieces and survives misread substats',()=>{
 const piece=(slotKey,mainStatKey,location,cr,extra={})=>({setKey:'EmblemOfSeveredFate',slotKey,rarity:5,level:20,mainStatKey,location,lock:false,substats:[{key:'critRate_',value:cr},{key:'critDMG_',value:14},{key:'def_',value:5},{key:'enerRech_',value:6}],...extra});
 const mains={flower:'hp',plume:'atk',sands:'atk_',goblet:'hydro_dmg_',circlet:'hp_'};
 const worn=Object.entries(mains).map(([s,m])=>piece(s,m,'Xingqiu',3));
 worn[2].substats=worn[2].substats.slice(0,3); // +20 piece read with a missing substat
 const better=piece('flower','hp','',10),spare=piece('plume','atk','',9);
 const data={characters:[{key:'Xingqiu',level:80,ascension:5,constellation:6,talent:{auto:1,skill:6,burst:6}},{key:'Yelan',level:80,ascension:5,constellation:0,talent:{auto:1,skill:6,burst:6}}],weapons:[{key:'SacrificialSword',level:90,ascension:6,refinement:5,location:'Xingqiu',lock:false}],artifacts:[...worn,better,spare],materials:{}};
 const d=scenarioData('inventory',['Xingqiu','Yelan'],data,catalogue,metadata,planner,{});
 const mine=d.artifacts.filter(a=>a.location==='Xingqiu');
 assert.equal(mine.length,5);assert.equal(mine.find(a=>a.slotKey==='flower').substats[0].value,10,'unequipped better flower picked');
 assert.equal(d.artifacts.filter(a=>a.slotKey==='plume'&&a.substats[0]?.value===9).length,1,'a piece is never used twice');
 assert.ok(mine.every(a=>a.substats.length===4));
 assert.deepEqual(buildSimulation({characters:['Xingqiu'],duration:20,enemyLevel:100,resistance:10,iterations:20,energy:'normal',rotation:''},d,catalogue,metadata).issues,[]);
});

test('farmEstimate turns average drops into runs, resin and days', async () => {
  const { farmEstimate } = await import('../lib/planner.mjs');
  assert.deepEqual(farmEstimate([{n:'Arbre congelé',c:2.556,b:1}],46),{where:'Boss : Arbre congelé',runs:18,resin:720,days:4});
  assert.deepEqual(farmEstimate([{n:'Pilleur',c:0.084,b:0}],10),{where:'Ennemis : Pilleur',kills:120});
  assert.deepEqual(farmEstimate([{n:'Stormterror',c:null,b:2}],3),{where:'Boss hebdomadaire : Stormterror'});
  assert.equal(farmEstimate(undefined,3),null);
});

test('domainTier picks the highest tier that still drops the rarest missing book', async () => {
  const { domainTier } = await import('../lib/planner.mjs');
  const talent=[['I',25,2],['II',28,3],['III',36,3],['IV',45,4]];
  assert.deepEqual(domainTier(talent,2),['I',25]);
  assert.deepEqual(domainTier(talent,3),['III',36]);
  assert.deepEqual(domainTier(talent,4),['IV',45]);
  assert.equal(domainTier(talent,0),null,'nothing missing, no tier');
  assert.equal(domainTier(undefined,3),null);
});
