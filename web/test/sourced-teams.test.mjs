import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { teamSummary } from '../lib/team.mjs';
const catalogue=JSON.parse(await readFile(new URL('../public/assets/catalogue.json',import.meta.url),'utf8'));
const gb=JSON.parse(await readFile(new URL('../lib/teams-genshin-builds.json',import.meta.url),'utf8'));
test('équipes genshin-builds : personnages et armes connus du catalogue, lien vers leur page',()=>{
  assert.ok(gb.teams.length>=50);
  for(const t of gb.teams){
    assert.match(t.url,/^https:\/\/genshin-builds\.com\/fr\/teams\/./);
    for(const m of t.members){assert.ok(catalogue.characters[m.key],m.key);assert.ok(t.members.some(x=>x.key===t.character),t.id);m.weapons.forEach(w=>assert.ok(catalogue.weapons[w],w));}
  }
});
test('résumé français d’une équipe',()=>{
  const r=teamSummary(['Xiangling','Bennett','Xingqiu','KaedeharaKazuha'],catalogue);
  assert.match(r,/Résonance : Fervent Flammes/);assert.match(r,/Vaporisation/);assert.match(r,/Dispersion/);assert.match(r,/Survie : Bennett/);
});
