import { need, validateScan } from './scan.mjs';
export const artifactSlots=['flower','plume','sands','goblet','circlet'];
export const mainStats={flower:['hp'],plume:['atk'],sands:['hp_','atk_','def_','eleMas','enerRech_'],goblet:['hp_','atk_','def_','eleMas','physical_dmg_','pyro_dmg_','hydro_dmg_','cryo_dmg_','electro_dmg_','anemo_dmg_','geo_dmg_','dendro_dmg_'],circlet:['hp_','atk_','def_','eleMas','critRate_','critDMG_','heal_']};
export const substatLimits={hp:2000,atk:150,def:200,hp_:50,atk_:50,def_:60,enerRech_:50,eleMas:160,critRate_:25,critDMG_:50};
export const minimumSubstats=(rarity,level)=>Math.min(4,Math.max(0,rarity-2)+Math.floor(level/4));
export const maxArtifactLevel=rarity=>({1:4,2:4,3:12,4:16,5:20})[rarity];
export const emptyCustomization=()=>({artifacts:[],teams:[]});
// Valeur maximale d'une sous-stat sur un 5★ ; les 4 tirages possibles valent 70, 80, 90 et 100 % de ce maximum.
// Mêmes pour tous les joueurs. CRIT DMG vérifié (5,44 à 7,77) ; les autres valeurs sont à vérifier en jeu.
export const substatRolls={hp:298.75,atk:19.81,def:23.15,hp_:5.83,atk_:5.83,def_:7.29,enerRech_:6.48,eleMas:23.31,critRate_:3.89,critDMG_:7.77};
export const rollTiers=key=>[0.7,0.8,0.9,1].map(f=>+(substatRolls[key]*f).toFixed(2));
// Améliorations (+4, +8…) : chacune ajoute une sous-stat ou améliore une existante.
export const upgradeCount=level=>Math.floor((Number(level)||0)/4);
// Combien de tirages une sous-stat peut avoir eus : sa valeur doit être une somme de k tirages entre 70 % et 100 % du maximum.
export function rollsFor(key,value) {
  const max=substatRolls[key];if(!max)return null;
  const tol=max*0.005+0.01,kmin=Math.max(1,Math.ceil((value-tol)/max)),kmax=Math.floor((value+tol)/(0.7*max));
  return kmin<=kmax?[kmin,kmax]:null;
}
// Total de tirages = sous-stats de départ (3 pour un 5★) + améliorations. Le joueur indique combien de tirages a eu chaque sous-stat
// (il connaît ses améliorations) : chaque valeur doit tenir dans ses tirages, et le total doit être atteint. Sans indication : null.
export function rollCheck(subs,rarity,level) {
  const total=Math.max(1,rarity-2)+upgradeCount(level),filled=subs.filter(s=>s.key);
  if(!filled.length)return {ok:null,total};
  const rolled=filled.reduce((sum,s)=>sum+(Number(s.rolls)||0),0);
  if(filled.some(s=>!Number(s.rolls)))return {ok:null,total,rolled};
  const bad=filled.find(s=>{const v=Number(String(s.value).replace(',','.')),k=Number(s.rolls),max=substatRolls[s.key],tol=max*0.005+0.01;return !(v>=0.7*max*k-tol&&v<=max*k+tol);});
  if(bad)return {ok:false,total,rolled,bad:bad.key};
  return {ok:rolled===total,total,rolled};
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
