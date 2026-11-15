import { need, validateScan } from './scan.mjs';
export const artifactSlots=['flower','plume','sands','goblet','circlet'];
export const mainStats={flower:['hp'],plume:['atk'],sands:['hp_','atk_','def_','eleMas','enerRech_'],goblet:['hp_','atk_','def_','eleMas','physical_dmg_','pyro_dmg_','hydro_dmg_','cryo_dmg_','electro_dmg_','anemo_dmg_','geo_dmg_','dendro_dmg_'],circlet:['hp_','atk_','def_','eleMas','critRate_','critDMG_','heal_']};
export const substatLimits={hp:2000,atk:150,def:200,hp_:50,atk_:50,def_:60,enerRech_:50,eleMas:160,critRate_:25,critDMG_:50};
export const minimumSubstats=(rarity,level)=>Math.min(4,Math.max(0,rarity-2)+Math.floor(level/4));
export const maxArtifactLevel=rarity=>({1:4,2:4,3:12,4:16,5:20})[rarity];
export const emptyCustomization=()=>({artifacts:[],teams:[]});
export function artifactIdentity(item){return JSON.stringify({setKey:item.setKey,slotKey:item.slotKey,rarity:item.rarity,level:item.level,mainStatKey:item.mainStatKey,substats:[...item.substats].sort((a,b)=>a.key.localeCompare(b.key))});}
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
