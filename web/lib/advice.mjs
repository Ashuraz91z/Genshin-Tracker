import { characterNeeds, weaponNeeds } from './planner.mjs';

const fmt=n=>n.toLocaleString('fr-FR'),who=n=>n>1?`vos ${n} personnages principaux`:'votre personnage principal';
// Paimon's Bargains: up to 5 Pierres de la fatalité a month for 75 Astrions libres each, and 5 for 5 Astéries libres each.
const SHOP={stardust:75,starglitter:5,perMonth:5};
export const TARGET={ascension:6,talent:8};

// Main characters: those in saved teams, otherwise the 8 highest-level ones.
export function mainCharacters(data,teams=[]) {
  const inTeams=new Set(teams.flatMap(t=>t.characters??[]));
  const picked=data.characters.filter(c=>inTeams.has(c.key));
  return picked.length?picked:[...data.characters].sort((a,b)=>b.level-a.level).slice(0,8);
}

// ponytail: ascensions and talents only; character and weapon levels (EXP books cost Mora too) are left out, so this is a floor.
export function moraNeeded(data,planner,teams=[]) {
  const characters=mainCharacters(data,teams);let total=0;
  for(const c of characters){
    total+=characterNeeds(c,planner.characters?.[c.key],TARGET).Mora??0;
    for(const w of data.weapons.filter(w=>w.location===c.key))total+=weaponNeeds(w,planner.weapons?.[w.key]).Mora??0;
  }
  return {total,characters:characters.length};
}

export function currencyAdvice(data,planner,teams=[]) {
  const m=data.materials??{},tips=[];
  if(m.Mora!==undefined&&planner){
    const need=moraNeeded(data,planner,teams),missing=need.total-m.Mora;
    if(missing>0)tips.push({tone:'warn',title:'Moras à farmer',text:`Il vous manque au moins ${fmt(missing)} moras pour élever ${who(need.characters)} et ${need.characters>1?'leurs armes':'son arme'} (élévations et aptitudes 8, sans les niveaux). Passez votre résine dans les Fleurs de richesse (Flux de mora) et faites vos commissions chaque jour.`});
    else if(need.total>0)tips.push({tone:'ok',title:'Moras suffisants',text:`${fmt(m.Mora)} moras couvrent les ${fmt(need.total)} demandés par les élévations et aptitudes 8 de ${who(need.characters)}. Les niveaux de personnage et d'arme en consomment encore.`});
  }
  if(m.Primogem!==undefined||m.IntertwinedFate!==undefined){
    const wishes=Math.floor((m.Primogem??0)/160)+(m.IntertwinedFate??0);
    tips.push({tone:wishes>=90?'ok':'info',title:`${fmt(wishes)} vœu${wishes>1?'x':''} sur les bannières événement`,text:`${fmt(m.Primogem??0)} primogemmes (160 par vœu) et ${fmt(m.IntertwinedFate??0)} Pierre${(m.IntertwinedFate??0)>1?'s':''} de la fatalité. Il faut au pire 90 vœux pour un 5★, 180 pour être sûr d'avoir celui de la bannière.`});
  }
  const shop=[['MasterlessStardust','Astrions libres',SHOP.stardust],['MasterlessStarglitter','Astéries libres',SHOP.starglitter]]
    .map(([key,name,price])=>({name,owned:m[key]??0,price,fates:Math.min(SHOP.perMonth,Math.floor((m[key]??0)/price))})).filter(s=>s.fates>0);
  if(shop.length)tips.push({tone:'info',title:'À échanger à la Boutique de Paimon',text:shop.map(s=>`${fmt(s.owned)} ${s.name} → ${s.fates} Pierre${s.fates>1?'s':''} de la fatalité (${s.price} chacune)`).join(' · ')+'. Jusqu’à 5 par mois et par monnaie : pensez-y avant le 1er.'});
  return tips;
}
