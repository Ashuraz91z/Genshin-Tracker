import { need, validateScan } from './scan.mjs';
export const artifactSlots=['flower','plume','sands','goblet','circlet'];
export const mainStats={flower:['hp'],plume:['atk'],sands:['hp_','atk_','def_','eleMas','enerRech_'],goblet:['hp_','atk_','def_','eleMas','physical_dmg_','pyro_dmg_','hydro_dmg_','cryo_dmg_','electro_dmg_','anemo_dmg_','geo_dmg_','dendro_dmg_'],circlet:['hp_','atk_','def_','eleMas','critRate_','critDMG_','heal_']};
export const substatLimits={hp:2000,atk:150,def:200,hp_:50,atk_:50,def_:60,enerRech_:50,eleMas:160,critRate_:25,critDMG_:50};
export const minimumSubstats=(rarity,level)=>Math.min(4,Math.max(0,rarity-2)+Math.floor(level/4));
export const maxArtifactLevel=rarity=>({1:4,2:4,3:12,4:16,5:20})[rarity];
export const emptyCustomization=()=>({artifacts:[],teams:[]});
// Valeur maximale d'une sous-stat sur un 5★ ; les 4 tirages possibles valent 70, 80, 90 et 100 % de ce maximum.
// Source : note Obsidian « 11 — Artéfacts, statistiques et paliers » (wiki Genshin, 24 nov. 2026). Mêmes pour tous les joueurs.
export const substatRolls={hp:298.75,atk:19.45,def:23.15,hp_:5.83,atk_:5.83,def_:7.29,enerRech_:6.48,eleMas:23.31,critRate_:3.89,critDMG_:7.77};
export const rollTiers=key=>[0.7,0.8,0.9,1].map(f=>+(substatRolls[key]*f).toFixed(2));
// Améliorations (+4, +8…) : chacune ajoute une sous-stat ou améliore une existante.
export const upgradeCount=level=>Math.floor((Number(level)||0)/4);
// Lignes de sous-stats à +0 selon la rareté (note Obsidian) : [minimum, maximum].
export const startLines={1:[0,0],2:[0,1],3:[1,2],4:[2,3],5:[3,4]};
// Valeurs exactes possibles pour k tirages : chaque tirage vaut 70, 80, 90 ou 100 % du maximum (somme discrète, pas une fourchette).
const achievedCache=new Map();
export function achievableValues(key,k) {
  const id=key+':'+k;if(achievedCache.has(id))return achievedCache.get(id);
  const sums=new Set();const walk=(n,sum)=>{if(n===0){sums.add(Math.round(sum));return;}for(const f of [700,800,900,1000])walk(n-1,sum+f);};
  walk(k,0);
  const values=[...sums].map(s=>substatRolls[key]*s/1000);achievedCache.set(id,values);return values;
}
// Le joueur indique combien de tirages a eu chaque sous-stat. Total = lignes de départ (selon la rareté) + améliorations.
// Ok si chaque valeur est une somme exacte de ses tirages (à l'arrondi près) et si le total tombe dans la plage. Sans indication : null.
// Total de tirages : exact si le nombre de lignes de départ est connu, sinon la plage de la rareté.
export function rollBudget(rarity,level,start) {
  const up=upgradeCount(level);
  if(Number.isInteger(start))return {min:start+up,max:start+up};
  const [startMin,startMax]=startLines[rarity]??[0,0];
  return {min:startMin+up,max:startMax+up};
}
// Plafond de tirages sur une seule ligne, selon le nombre de sous-stats actives : 5 avec 3 lignes, 4 avec 4 lignes.
export function maxRollsPerLine(activeLines) {
  return activeLines>=4?4:5;
}
export function rollCheck(subs,rarity,level,start) {
  const {min:lo,max:hi}=rollBudget(rarity,level,start);
  const total=lo===hi?String(lo):`${lo} à ${hi}`,filled=subs.filter(s=>s.key);
  const cap=maxRollsPerLine(filled.length);
  if(!filled.length)return {ok:null,total};
  const rolled=filled.reduce((sum,s)=>sum+(Number(s.rolls)||0),0);
  if(filled.some(s=>!Number(s.rolls)))return {ok:null,total,rolled};
  const over=filled.find(s=>Number(s.rolls)>cap);
  if(over)return {ok:false,total,rolled,over:over.key,cap};
  const bad=filled.find(s=>{const v=Number(String(s.value).replace(',','.'));return !achievableValues(s.key,Number(s.rolls)).some(a=>Math.abs(a-v)<=0.011);});
  if(bad)return {ok:false,total,rolled,bad:bad.key};
  return {ok:rolled>=lo&&rolled<=hi,total,rolled};
}
export function artifactIdentity(item){return JSON.stringify({setKey:item.setKey,slotKey:item.slotKey,rarity:item.rarity,level:item.level,mainStatKey:item.mainStatKey,substats:[...item.substats].map(s=>({key:s.key,value:s.value})).sort((a,b)=>a.key.localeCompare(b.key))});}
export function validateArtifactEdit(input,data,catalogue,custom=emptyCustomization()){
  need(input&&typeof input==='object','Correction invalide.');
  need(data.characters.some(c=>c.key===input.characterKey),'Personnage absent de ce compte.');
  const item={...input.artifact,location:input.characterKey};
  const clean=validateScan({scanId:'manual-artifact-edit',capturedAt:new Date().toISOString(),good:{format:'GOOD',version:2,artifacts:[item]}}).good.artifacts[0];
  const set=catalogue.artifacts?.[clean.setKey];
  need(set?.pieces?.[clean.slotKey],'Choisissez une pièce du catalogue.');
  need((set.rarities??[set.rarity]).includes(clean.rarity),'Rareté indisponible pour ce set.');
  need(clean.level<=maxArtifactLevel(clean.rarity),'Niveau trop élevé pour cette rareté.');
  need(mainStats[clean.slotKey].includes(clean.mainStatKey),'Statistique principale incompatible avec cette pièce.');
  need(clean.substats.length>=minimumSubstats(clean.rarity,clean.level),'Renseignez toutes les sous-statistiques de cette pièce.');
  need(clean.substats.every(s=>s.key!==clean.mainStatKey&&s.value<=substatLimits[s.key]),'Sous-statistique incompatible ou valeur trop élevée.');
  need(input.source===undefined||input.source===null||typeof input.source==='string'&&input.source.length<3000,'Objet source invalide.');
  let source=input.source||null;
  if(source&&!data.artifacts.some(a=>artifactIdentity(a)===source)){const previous=custom.artifacts.find(e=>e.characterKey===input.characterKey&&e.artifact.slotKey===clean.slotKey);need(previous?.source===source,'L’objet source a changé. Actualisez le compte.');source=null;}
  return {characterKey:input.characterKey,artifact:clean,source};
}
export function projectInventory(data,custom=emptyCustomization()){
  const artifacts=data.artifacts.map(a=>({...a})),identities=data.artifacts.map(artifactIdentity);
  for(const edit of custom.artifacts){
    const item=edit.artifact;
    artifacts.forEach(a=>{if(a.location===edit.characterKey&&a.slotKey===item.slotKey)a.location='';});
    let index=edit.source?artifacts.findIndex((a,i)=>!a.manualId&&identities[i]===edit.source):-1;
    if(index<0)index=data.artifacts.findIndex((a,i)=>a.location===edit.characterKey&&identities[i]===artifactIdentity(item));
    const corrected={...item,location:edit.characterKey,manualId:edit.id};
    if(index>=0)artifacts[index]=corrected;else artifacts.push(corrected);
  }
  return {...data,artifacts};
}
export function validateTeam(input,data){
  need(input&&typeof input==='object','Équipe invalide.');
  need(typeof input.name==='string'&&input.name.trim().length>0&&input.name.length<=60,'Nom d’équipe : 1 à 60 caractères.');
  need(Array.isArray(input.characters)&&input.characters.length>=1&&input.characters.length<=4&&new Set(input.characters).size===input.characters.length&&input.characters.every(key=>data.characters.some(c=>c.key===key)),'Choisissez de 1 à 4 personnages distincts de votre compte.');
  const duration=Number(input.duration??20),enemyLevel=Number(input.enemyLevel??100),resistance=Number(input.resistance??10),iterations=Number(input.iterations??100);
  need(Number.isInteger(duration)&&duration>=5&&duration<=120,'Durée : 5 à 120 secondes.');
  need(Number.isInteger(enemyLevel)&&enemyLevel>=1&&enemyLevel<=200,'Niveau ennemi invalide.');
  need(Number.isFinite(resistance)&&resistance>=-100&&resistance<=200,'Résistance ennemie invalide.');
  need([20,100,500].includes(iterations),'Nombre de simulations invalide.');
  need(input.rotation===undefined||typeof input.rotation==='string'&&input.rotation.length<=10000,'Rotation trop longue.');
  return {name:input.name.trim(),characters:[...input.characters],duration,enemyLevel,resistance,iterations,rotation:input.rotation??'',energy:input.energy==='unlimited'?'unlimited':'normal'};
}
