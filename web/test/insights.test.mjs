import test from 'node:test';
import assert from 'node:assert/strict';
import { critValue, critGrade, toGood, progressionTips, forgottenArtifacts } from '../lib/insights.mjs';
test('crit value, grades, GOOD export and progression tips',()=>{
 const art={setKey:'A',slotKey:'flower',rarity:5,level:20,location:'',substats:[{key:'critRate_',value:10.5},{key:'critDMG_',value:21},{key:'atk',value:19}]};
 assert.equal(critValue(art),42);assert.equal(critGrade(42).tier,'a');assert.equal(critValue({substats:[]}),0);
 const data={characters:[{key:'Ayaka',level:90,ascension:6,constellation:0,talent:{auto:1,skill:4,burst:5}},{key:'Bennett',level:40,ascension:1,constellation:6,talent:{auto:1,skill:1,burst:1}}],weapons:[],artifacts:[art,{...art,location:'Ayaka',manualId:'x'}],materials:{}};
 const good=toGood(data);assert.equal(good.format,'GOOD');assert.equal('manualId' in good.artifacts[1],false);assert.equal(data.artifacts[1].manualId,'x');
 const tips=progressionTips(data,{});assert.ok(tips.some(t=>t.key==='Ayaka'&&t.text.includes('aptitudes')));assert.ok(tips.some(t=>t.key==='Bennett'&&t.text.includes('élévation')));
 assert.deepEqual(forgottenArtifacts(data).map(a=>a.cv),[42]);
});
