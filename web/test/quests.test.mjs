import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestPages } from '../lib/quests.mjs';

// Tesseract fra+eng output of the reference screenshot (Kamera preprocessing: red channel > 110, ×2), noise included.
const page1=["& Quêtes d'Archons","$ L'impitoyable hiver éternel","Chapitre VII - Acte]","| Dans le vent, dans le nord glacial Q","11199m",
  "$ Sentier périlleux","Intermède - Acte 2",": Un touriste inattendu © |","Al Terminez d'abord les quêtes requises avant de continuer,",
  "a Re Len Leone, De Den D Res Den MR ei","ee","$ Genèse inversée","Intermède - Acte 3","Tombée de rideau et d'oiseau de nuit",
  "Terminez d'abord les quètes requises avant de continuer,","% Quêtes d'histoire","6 Sal Flore","Historia Antiqua - Acte |","Une ombre du passé"];
// After scrolling: the last card shows again with its status line.
const page2=["6 Sal Flore","Historia Antiqua - Acte |","Une ombre du passé","Terminez d'abord les quêtes requises avant de continuer."];

test('quest log pages become quests with section, chapter and status',()=>{
  const quests=parseQuestPages([page1,page2]);
  assert.deepEqual(quests.map(q=>[q.section,q.group,q.chapter,q.title,q.status,q.distance]),[
    ["Quêtes d'Archons","L'impitoyable hiver éternel",'Chapitre VII - Acte 1','Dans le vent, dans le nord glacial','available',11199],
    ["Quêtes d'Archons",'Sentier périlleux','Intermède - Acte 2','Un touriste inattendu','locked',undefined],
    ["Quêtes d'Archons",'Genèse inversée','Intermède - Acte 3',"Tombée de rideau et d'oiseau de nuit",'locked',undefined],
    ["Quêtes d'histoire",'Sal Flore','Historia Antiqua - Acte I','Une ombre du passé','locked',undefined]]);
  assert.equal(quests[1].reason,'Terminez d’abord les quêtes requises.');
});

test('Kamera report pages are validated and parsed into report.quests',async()=>{
  const {validateScan}=await import('../lib/scan.mjs');
  const scan=validateScan({scanId:'q'.repeat(20),capturedAt:new Date().toISOString(),good:{format:'GOOD',version:2,materials:{Mora:1}},report:{quests:{pages:[page1,page2,'pas une page']}}});
  assert.equal(scan.report.quests.length,4);
  assert.equal(validateScan({scanId:'q'.repeat(20),capturedAt:new Date().toISOString(),good:{format:'GOOD',version:2,materials:{Mora:1}},report:{}}).report.quests,undefined);
});

test('a scan with only the quest log is accepted and stored',async()=>{
  const {openStore}=await import('../store.mjs');const {mkdtempSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const store=openStore(join(mkdtempSync(join(tmpdir(),'quests-')),'t.sqlite')),u=store.register('Quetes','quetes-password-123','q@example.test');
  const result=store.sync(u.id,'PC',{scanId:'r'.repeat(20),capturedAt:new Date().toISOString(),good:{format:'GOOD',version:2},report:{quests:{pages:[page1,page2]}}});
  assert.deepEqual([result.counts,result.applied],[{quests:4},{quests:'log_replaced'}]);
  assert.equal(store.account(u).data.quests.list.length,4);
  store.close();
});

test('every tab of the log is read on its own and duplicates across tabs are merged',async()=>{
  const {parseQuestTabs,validateQuestTabs}=await import('../lib/quests.mjs');
  // Second tab: one quest type only, no section header, starts mid-list; one quest already seen in « En cours ».
  const archonTab=[["Intermède - Acte 2","$ Sentier périlleux","Intermède - Acte 2","Un touriste inattendu","Terminez d'abord les quêtes requises avant de continuer.",
    "$ Le chant de la cité","Chapitre VI - Acte 4","Au-delà des nuages","842m"]];
  const quests=parseQuestTabs([[page1,page2],archonTab]);
  assert.equal(quests.length,5);
  const tourist=quests.filter(q=>q.title==='Un touriste inattendu');
  assert.equal(tourist.length,1);assert.equal(tourist[0].section,"Quêtes d'Archons");
  assert.deepEqual(quests.at(-1),{group:'Le chant de la cité',chapter:'Chapitre VI - Acte 4',title:'Au-delà des nuages',status:'available',distance:842});
  // Older 0.9 builds sent one flat list of pages.
  assert.equal(validateQuestTabs({pages:[page1]}).length,1);
  assert.equal(validateQuestTabs({tabs:[[],'x']}),null);
});

test('the scan report keeps a line-by-line trace of the quest log for debugging',async()=>{
  const {validateScan}=await import('../lib/scan.mjs');
  const scan=validateScan({scanId:'t'.repeat(20),capturedAt:new Date().toISOString(),good:{format:'GOOD',version:2},report:{quests:{tabs:[[page1]]}}});
  assert.equal(scan.report.questTrace.length,page1.length);
  assert.deepEqual(scan.report.questTrace[3],[1,1,'| Dans le vent, dans le nord glacial Q','quête : « Dans le vent, dans le nord glacial »']);
  assert.ok(scan.report.questTrace.some(([, , ,kind])=>kind==='bruit (ignoré)'));
});
