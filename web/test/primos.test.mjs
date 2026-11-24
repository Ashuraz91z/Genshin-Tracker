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
import { featuredFor, nextBanners, wishesToGuarantee } from '../lib/primos.mjs';
test('featured banner lookup returns the ups only inside their dates', () => {
  assert.deepEqual(featuredFor(new Date(2026,10,24,9)).featured,['Zibai','Linnea']);
  assert.equal(featuredFor(new Date(2026,10,20)),null);
  assert.equal(featuredFor(new Date(2026,11,16)),null);
});
test('banner calendar follows the 42-day version cycle and phase 2', () => {
  const [a,b,c]=nextBanners(new Date(2026,10,19,15),3);
  assert.deepEqual([a.date.getMonth(),a.date.getDate(),a.label],[10,24,'Phase 2']);
  assert.deepEqual([b.date.getMonth(),b.date.getDate(),b.label],[11,16,'Nouvelle version']);
  assert.deepEqual([c.date.getFullYear(),c.date.getMonth(),c.date.getDate()],[2027,0,5]);
  assert.equal(wishesToGuarantee(30,false),150);assert.equal(wishesToGuarantee(30,true),60);
});
import { rollTiers, upgradeCount } from '../lib/customization.mjs';
test('substat roll tiers and upgrade count', () => {
  assert.deepEqual(rollTiers('critDMG_'),[5.44,6.22,6.99,7.77]);
  assert.equal(upgradeCount(0),0);assert.equal(upgradeCount(7),1);assert.equal(upgradeCount(20),5);
});
import { rollCheck } from '../lib/customization.mjs';
test('sub-stat values must be sums of the rolls the upgrades allow', () => {
  const s=(key,value)=>({key,value:String(value)});
  // +4 : 3 tirages de départ + 1 amélioration = 4 tirages, une valeur par stat.
  assert.equal(rollCheck([s('critDMG_',7.77),s('critRate_',3.89),s('atk',19.81),s('hp_',5.83)],5,4).ok,true);
  // +8 : 5 tirages ; critDMG 14 = 2 tirages, le reste 1 chacun.
  assert.equal(rollCheck([s('critDMG_',14),s('critRate_',3.89),s('atk',19.81),s('hp_',5.83)],5,8).ok,true);
  // +8 sans tirage supplémentaire possible : 4 stats au maximum d'un tirage ne font pas 5 tirages.
  assert.equal(rollCheck([s('critDMG_',7.77),s('critRate_',3.89),s('atk',19.81),s('hp_',5.83)],5,8).ok,false);
});
