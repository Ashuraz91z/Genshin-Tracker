import { characterEquipment } from './collection.mjs';
import { mainStats, maxArtifactLevel, minimumSubstats, substatLimits } from './customization.mjs';
const statKeys={hp:'hp',hp_:'hp%',atk:'atk',atk_:'atk%',def:'def',def_:'def%',eleMas:'em',enerRech_:'er',critRate_:'cr',critDMG_:'cd',heal_:'heal',physical_dmg_:'phys%',pyro_dmg_:'pyro%',hydro_dmg_:'hydro%',cryo_dmg_:'cryo%',electro_dmg_:'electro%',anemo_dmg_:'anemo%',geo_dmg_:'geo%',dendro_dmg_:'dendro%'};
export function defaultRotation(keys,metadata){return 'for let i=0; i<100; i=i+1 {\n'+keys.map(key=>`  ${metadata.characters[key]??key.toLowerCase()} skill, burst, attack:3;`).join('\n')+'\n}';}
export function buildSimulation(team,data,catalogue,metadata){
  const issues=[],lines=[],names=[];
  if(!Number.isInteger(team.duration)||team.duration<5||team.duration>120||!Number.isFinite(team.enemyLevel)||team.enemyLevel<1||team.enemyLevel>200||!Number.isFinite(team.resistance)||team.resistance< -100||team.resistance>200||![20,100,500].includes(Number(team.iterations)))issues.push('Vérifiez la durée, le niveau, les résistances et le nombre de simulations.');
  if(!team.characters.length)issues.push('Choisissez au moins un personnage.');
  for(const key of team.characters.filter(Boolean)){
    const char=data.characters.find(c=>c.key===key),name=catalogue.characters?.[key]?.name??key,simKey=metadata.characters[key];
    if(!char||!simKey){issues.push(`${name} : personnage non pris en charge par ce moteur.`);continue;}
    const equipment=characterEquipment(data,catalogue,key),weapon=equipment.weapons[0];
    if(equipment.weapons.length!==1)issues.push(`${name} : identifiez une seule arme.`);
    if(equipment.identifiedSlots!==5||equipment.ambiguous)issues.push(`${name} : complétez les cinq artéfacts et résolvez les associations multiples.`);
    if(!weapon||!metadata.weapons[weapon.key]){issues.push(`${name} : arme absente ou non prise en charge.`);continue;}
    const cap=[20,40,50,60,70,80,90][char.ascension],weaponCap=[20,40,50,60,70,80,90][weapon.ascension];
    if(!cap||!weaponCap||char.level>cap||weapon.level>weaponCap){issues.push(`${name} : niveau ou ascension non pris en charge.`);continue;}
    names.push({key,name,simKey});
    lines.push(`${simKey} char lvl=${char.level}/${cap} cons=${char.constellation} talent=${char.talent.auto},${char.talent.skill},${char.talent.burst};`,`${simKey} add weapon="${metadata.weapons[weapon.key]}" refine=${weapon.refinement} lvl=${weapon.level}/${weaponCap};`);
    const totals={},sets={};
    for(const items of Object.values(equipment.slots)){
      if(items.length!==1)continue;const artifact=items[0];if(artifact.substats.length<minimumSubstats(artifact.rarity,artifact.level))issues.push(`${name} : des sous-statistiques d’artéfact manquent.`);if(!mainStats[artifact.slotKey]?.includes(artifact.mainStatKey)||artifact.level>maxArtifactLevel(artifact.rarity)||artifact.substats.some(s=>s.key===artifact.mainStatKey||s.value>substatLimits[s.key]))issues.push(`${name} : vérifiez les statistiques d’artéfact incohérentes avant de simuler.`);const main=metadata.mainStats[artifact.rarity]?.[artifact.mainStatKey]?.[artifact.level];
      if(main===undefined){issues.push(`${name} : valeur principale d’artéfact inconnue.`);continue;}
      totals[artifact.mainStatKey]=(totals[artifact.mainStatKey]??0)+main;
      for(const s of artifact.substats)totals[s.key]=(totals[s.key]??0)+s.value/(s.key.endsWith('_')?100:1);
      sets[artifact.setKey]=(sets[artifact.setKey]??0)+1;
    }
    for(const [set,count] of Object.entries(sets))if(count>=2){if(!metadata.artifacts[set])issues.push(`${name} : bonus du set ${catalogue.artifacts?.[set]?.name??set} non pris en charge.`);else lines.push(`${simKey} add set="${metadata.artifacts[set]}" count=${count>=4?4:2};`);}
    lines.push(`${simKey} add stats ${Object.entries(totals).map(([stat,value])=>`${statKeys[stat]}=${Number(value.toFixed(6))}`).join(' ')};`);
  }
  if(/\b(?:options|target|energy|char|add)\b/.test((team.rotation??'').replace(/#.*/g,'')))issues.push('La rotation doit contenir les actions uniquement ; utilisez les champs d’hypothèses pour la configuration.');
  const rotation=team.rotation?.trim()||defaultRotation(team.characters.filter(Boolean),metadata);
  const config=[`options iteration=${team.iterations} duration=${team.duration} swap_delay=12;`,...lines,`target lvl=${team.enemyLevel} resist=${team.resistance/100} radius=2 pos=0,2.4;`,...(team.energy==='unlimited'?['energy every interval=60 amount=100;']:[]),names[0]?`active ${names[0].simKey};`:'',rotation].join('\n');
  return {config,issues:[...new Set(issues)],names,rotation};
}
