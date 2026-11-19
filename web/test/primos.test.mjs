import test from 'node:test';
import assert from 'node:assert/strict';
import { forecast, resetsBetween } from '../lib/primos.mjs';
test('primogem forecast counts days, monthly resets and versions', () => {
  assert.equal(resetsBetween(new Date(2026,10,19),new Date(2027,0,16),16),2); // 16 Dec, 16 Jan
  assert.equal(resetsBetween(new Date(2026,10,16),new Date(2026,11,15),16),0);
  const f=forecast({primos:1600,fates:2,target:new Date(2027,0,1)},new Date(2026,10,19,15));
  assert.equal(f.days,43);
  const by=Object.fromEntries(f.rows.map(r=>[r.id,r]));
  assert.equal(by.commissions.primos,2580);assert.equal(by.welkin.primos,0);
  assert.equal(by.abyss.count,1);assert.equal(by.theater.count,2);assert.equal(by.stygian.count,1);
  assert.equal(by.bargains.fates,10);
  assert.equal(f.wishes,Math.floor(f.totalPrimos/160)+12);
});
