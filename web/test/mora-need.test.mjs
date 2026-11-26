import test from 'node:test';
import assert from 'node:assert/strict';
import { moraNeeds } from '../lib/planner.mjs';

// ponytail: one fake character is enough to pin the sum: ascension step + 3 talent steps.
const planner={characters:{A:{ascension:[[{key:'Mora',count:100}]],talents:[[{key:'Mora',count:50}]]}}};
const data={characters:[{key:'A',ascension:0,talent:{auto:1,skill:1,burst:1}},{key:'B',ascension:0,talent:{auto:1,skill:1,burst:1}}],materials:{Mora:120}};

test('account mora need sums planned characters and subtracts owned moras',()=>{
  assert.deepEqual(moraNeeds(data,planner,{ascension:1,talent:2}),{needed:250,owned:120,missing:130});
  assert.deepEqual(moraNeeds(data,planner,{ascension:1,talent:2},['B']),{needed:0,owned:120,missing:0});
  assert.equal(moraNeeds({...data,materials:{Mora:999}},planner,{ascension:1,talent:2}).missing,0);
});
