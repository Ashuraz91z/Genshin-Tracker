import test from 'node:test';
import assert from 'node:assert/strict';
import { currencyAdvice, moraFloor } from '../lib/advice.mjs';

test('Mora advice is a low-balance warning scaled by Adventure Rank, not a build total',()=>{
  assert.equal(moraFloor(40),1_000_000);assert.equal(moraFloor(55),2_000_000);assert.equal(moraFloor(undefined),2_000_000);
  const low=currencyAdvice({materials:{Mora:137986},profile:{adventureRank:55}});
  assert.equal(low[0].title,'Réserve de moras basse');assert.equal(low[0].tone,'bad');assert.equal(currencyAdvice({materials:{Mora:1500000},profile:{adventureRank:55}})[0].tone,'warn');assert.equal(currencyAdvice({materials:{Mora:16919},profile:{adventureRank:55}})[0].tone,'bad');assert.match(low[0].text,/137\s986 moras, sous les 2\s000\s000/);
  assert.equal(currencyAdvice({materials:{Mora:2500000},profile:{adventureRank:55}}).length,0);
  assert.equal(currencyAdvice({materials:{Mora:1200000},profile:{adventureRank:30}}).length,0);
});

test('wish count and Paimon shop exchanges come from scanned currencies',()=>{
  const tips=currencyAdvice({materials:{Primogem:197,IntertwinedFate:0,MasterlessStardust:435,MasterlessStarglitter:0}});
  assert.equal(tips[0].title,'1 vœu sur les bannières événement');
  assert.match(tips[1].text,/435 Astrions libres → 5 Pierres de la fatalité/);assert.doesNotMatch(tips[1].text,/Astéries/);
});
