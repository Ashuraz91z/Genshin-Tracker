import test from 'node:test';
import assert from 'node:assert/strict';
import { inventoryItems, filterInventory, elementName } from '../lib/collection.mjs';
import { readFileSync, existsSync } from 'node:fs';
test('inventory filters combine rarity, set, slot, owner and level without mutating imported data',()=>{
 const data={artifacts:[{setKey:'A',slotKey:'flower',rarity:5,level:20,location:'Ayaka'},{setKey:'A',slotKey:'flower',rarity:4,level:16},{setKey:'B',slotKey:'plume',rarity:5,level:0}],weapons:[],materials:{Crown:4,Mora:10000}};
 const catalogue={artifacts:{A:{name:'Set A',rarity:5,pieces:{flower:{name:'Fleur A',image:'/flower.png'}}},B:{name:'Set B'}},materials:{Crown:{name:'Couronne',rarity:5},Mora:{name:'Mora',rarity:3}}};
 const items=inventoryItems(data,catalogue,'artifacts');assert.equal(items[1].rarity,4);assert.equal(items[0].image,'/flower.png');
 assert.deepEqual(filterInventory(items,{search:'set a',set:'A',slot:'flower',rarity:'5',equipped:'Ayaka',minLevel:'18',maxLevel:'20'}).map(i=>i.id),[0]);
 assert.equal(filterInventory(items,{equipped:'none'}).length,2);assert.equal(filterInventory(items,{equipped:'any'}).length,1);
 assert.equal(filterInventory(items,{minLevel:'21'}).length,0);assert.equal(filterInventory(items,{search:'inexistant'}).length,0);
 assert.deepEqual(filterInventory(items,{sort:'levelAsc'}).map(i=>i.level),[0,16,20]);assert.equal(items[0].level,20);
 const materials=inventoryItems(data,catalogue,'materials');assert.equal(filterInventory(materials,{sort:'quantity'})[0].key,'Mora');assert.equal(filterInventory(materials,{rarity:'5'})[0].key,'Crown');
 assert.equal(elementName('Cryo'),'Cryo');assert.equal(elementName('Electro'),'Électro');assert.equal(elementName('Anemo'),'Anémo');
});
test('every published illustration points to an existing local PNG',()=>{
 const catalogue=JSON.parse(readFileSync(new URL('../public/assets/catalogue.json',import.meta.url)));
 for(const category of Object.values(catalogue))for(const row of Object.values(category))for(const entry of [row,...Object.values(row.pieces??{})])for(const field of ['image','portrait'])if(entry[field]){
  const file=new URL('../public'+entry[field],import.meta.url);assert.ok(existsSync(file),entry[field]);assert.equal(readFileSync(file).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 }
});
