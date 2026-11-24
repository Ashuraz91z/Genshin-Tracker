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
test('sub-stat rolls declared by the player must match the value and the upgrade count', () => {
  const s=(key,value,rolls)=>({key,value:String(value),rolls});
  // +4 : 3 tirages de départ + 1 amélioration = 4 tirages, critDMG a eu les deux.
  assert.equal(rollCheck([s('critDMG_',13.21,2),s('critRate_',3.89,1),s('atk',19.45,1)],5,4).ok,true);
  // Même valeurs mais le total de tirages ne correspond pas.
  assert.equal(rollCheck([s('critDMG_',13.21,1),s('critRate_',3.89,1),s('atk',19.45,1)],5,4).ok,false);
  // critDMG 7.77 ne peut pas venir de 2 tirages (minimum 2 × 5,44).
  assert.equal(rollCheck([s('critDMG_',7.77,2),s('critRate_',3.89,1),s('atk',19.45,1)],5,4).ok,false);
  // Sans nombre de tirages : pas de verdict.
  assert.equal(rollCheck([s('critDMG_',7.77,undefined)],5,4).ok,null);
});
test('a 5★ that started with four lines accepts one more roll', () => {
  const s=(key,value,rolls)=>({key,value:String(value),rolls});
  // Départ 4 lignes, +4 : 5 tirages, total valide.
  assert.equal(rollCheck([s('critDMG_',13.21,2),s('critRate_',3.89,1),s('atk',19.45,1),s('hp_',5.83,1)],5,4).ok,true);
  // Valeur ATQ fixe 19.81 n'existe pas (maximum 19.45).
  assert.equal(rollCheck([s('atk',19.81,1)],5,0).ok,false);
});
import { rollBudget } from '../lib/customization.mjs';
test('roll budget follows the starting lines and the upgrade count', () => {
  assert.deepEqual(rollBudget(5,0),{min:3,max:4});
  assert.deepEqual(rollBudget(5,20),{min:8,max:9});
});
