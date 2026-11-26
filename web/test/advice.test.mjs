import test from 'node:test';
import assert from 'node:assert/strict';
import { currencyAdvice, moraNeeded, mainCharacters } from '../lib/advice.mjs';

const step=mora=>[{key:'Mora',count:mora}];
const planner={characters:{Furina:{ascension:[step(20000),step(40000),step(60000),step(80000),step(100000),step(120000)],talents:Array.from({length:9},(_,i)=>step(12500*(i+1)))}},
  weapons:{Sword:{ascension:[step(10000),step(20000),step(30000),step(45000),step(55000),step(65000)]}}};
const character={key:'Furina',level:80,ascension:5,talent:{auto:6,skill:8,burst:8}};

test('Mora advice compares owned Mora with main-character ascension and talent costs',()=>{
  const data={characters:[character],weapons:[{key:'Sword',ascension:4,location:'Furina'}],materials:{Mora:137986}};
  // ascension 5→6: 120000 ; auto 6→8: 75000+87500 ; weapon 4→6: 55000+65000
  assert.equal(moraNeeded(data,planner).total,120000+75000+87500+55000+65000);
  const [tip]=currencyAdvice(data,planner);
  assert.equal(tip.tone,'warn');assert.match(tip.text,/264\s514/);
  data.materials.Mora=500000;assert.equal(currencyAdvice(data,planner)[0].tone,'ok');
});

test('wish count and Paimon shop exchanges come from scanned currencies',()=>{
  const tips=currencyAdvice({characters:[],weapons:[],materials:{Primogem:197,IntertwinedFate:0,MasterlessStardust:435,MasterlessStarglitter:0}},planner);
  assert.equal(tips[0].title,'1 vœu sur les bannières événement');
  assert.match(tips[1].text,/435 Astrions libres → 5 Pierres de la fatalité/);assert.doesNotMatch(tips[1].text,/Astéries/);
});

test('main characters are team members, otherwise the 8 highest levels',()=>{
  const chars=Array.from({length:10},(_,i)=>({key:'C'+i,level:i+1}));
  assert.deepEqual(mainCharacters({characters:chars},[{characters:['C0']}]).map(c=>c.key),['C0']);
  assert.equal(mainCharacters({characters:chars}).length,8);assert.equal(mainCharacters({characters:chars})[0].key,'C9');
});
