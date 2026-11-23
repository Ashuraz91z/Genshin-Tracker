import { characterEquipment, elementName } from './collection.mjs';
import { critValue } from './insights.mjs';
import { substatLimits, minimumSubstats } from './customization.mjs';
// ponytail: rôles saisis à la main pour les soutiens connus ; à compléter à chaque nouveau personnage.
const healers=['Bennett','Barbara','SangonomiyaKokomi','Qiqi','Jean','Diona','Noelle','Baizhu','Yaoyao','KukiShinobu','Charlotte','Dori','Sigewinne','Xianyun','Mika','Xilonen','Chevreuse','Kaveh','Furina','Escoffier','Aino','Lauma'];
const shielders=['Zhongli','Diona','Noelle','Layla','Thoma','Kirara','Beidou','Xinyan','Yanfei','Citlali','LanYan','Candace'];
const groupSets=['NoblesseOblige','ViridescentVenerer','TenacityOfTheMillelith','Instructor','DeepwoodMemories','ArchaicPetra','ScrollOfTheHeroOfCinderCity','SongOfDaysPast'];
const resonances={Pyro:'Fervent Flammes : +25 % ATQ',Hydro:'Cœur d’eau : +25 % PV max',Cryo:'Glace pénétrante : +15 % taux CRIT contre les ennemis Cryo/gelés',Électro:'Électricité surchargée : particules d’énergie en plus',Anémo:'Vent porteur : −5 % TdR, endurance réduite',Géo:'Roc inébranlable : boucliers renforcés, +15 % DGT sous bouclier',Dendro:'Vigueur luxuriante : +50 à +100 de maîtrise élémentaire'};
const reactions=[[['Pyro','Hydro'],'Vaporisation (×1,5 à ×2)'],[['Pyro','Cryo'],'Fonte (×1,5 à ×2)'],[['Hydro','Cryo'],'Gel (contrôle)'],[['Électro','Dendro'],'Catalyse / Aggravation'],[['Hydro','Dendro'],'Floraison'],[['Hydro','Électro'],'Électrocharge'],[['Pyro','Électro'],'Surcharge'],[['Cryo','Électro'],'Supraconduction'],[['Pyro','Dendro'],'Combustion']];
export function analyzeTeam(keys,data,catalogue) {
  const good=[],bad=[],info=[],members=keys.filter(Boolean).map(key=>({key,char:data.characters.find(c=>c.key===key),ref:catalogue.characters?.[key]??{}}));
  if(!members.length)return {good,bad,info};
  const name=m=>m.ref.name??m.key,els=members.map(m=>elementName(m.ref.element));
  const counts={};els.forEach(e=>counts[e]=(counts[e]??0)+1);
  if(members.length<4)bad.push(`Équipe incomplète : ${members.length}/4. Les résonances élémentaires demandent 4 membres.`);
  else{const res=Object.entries(counts).filter(([e,n])=>n>=2&&resonances[e]).map(([e])=>resonances[e]);if(res.length)good.push('Résonance : '+res.join(' · '));else if(Object.keys(counts).length===4)info.push('Quatre éléments différents : résonance Protection (+15 % RÉS à tous les éléments).');}
  const found=reactions.filter(([pair])=>pair.every(e=>counts[e])).map(([,label])=>label);
  if(counts['Anémo']&&Object.keys(counts).some(e=>['Pyro','Hydro','Électro','Cryo'].includes(e)))found.push('Dispersion (réduction de RÉS avec Viridescent)');
  if(counts['Géo']&&members.length>1&&Object.keys(counts).length>1)found.push('Cristallisation (boucliers)');
  if(found.length)good.push('Réactions possibles : '+found.join(', ')+'.');else if(members.length>1)bad.push('Aucune réaction élémentaire forte : les dégâts reposent uniquement sur les statistiques brutes.');
  const sustain=members.filter(m=>healers.includes(m.key)||shielders.includes(m.key));
  if(sustain.length)good.push('Survie assurée par '+sustain.map(name).join(', ')+'.');else if(members.length>=3)bad.push('Pas de soigneur ni de bouclier identifié : l’équipe peut manquer de confort dans les Abysses.');
  const fourSets={};
  for(const m of members){
    const eq=characterEquipment(data,catalogue,m.key),pieces=Object.values(eq.slots).flat(),sets={};
    pieces.forEach(a=>sets[a.setKey]=(sets[a.setKey]??0)+1);
    Object.entries(sets).filter(([,n])=>n>=4).forEach(([set])=>(fourSets[set]??=[]).push(name(m)));
    if(!m.char)continue;const issues=[];
    if(m.char.level<80)issues.push(`niveau ${m.char.level} (visez 80+)`);
    if(!eq.weapons.length)issues.push('aucune arme identifiée');
    else if(eq.weapons[0].level<80)issues.push(`${eq.weapons[0].name} niveau ${eq.weapons[0].level}`);
    if(pieces.length<5)issues.push(`${5-pieces.length} artéfact(s) non identifié(s)`);
    const cv=pieces.reduce((s,a)=>s+critValue(a),0);
    if(pieces.length===5&&cv>=150)good.push(`${name(m)} : artéfacts solides (CV ${Math.round(cv)}).`);
    if(Math.max(m.char.talent?.skill??1,m.char.talent?.burst??1)<6&&m.char.level>=70)issues.push(`aptitudes basses (${m.char.talent.auto}/${m.char.talent.skill}/${m.char.talent.burst})`);
    if(issues.length)bad.push(`${name(m)} : ${issues.join(', ')}.`);
  }
  for(const [set,who] of Object.entries(fourSets))if(groupSets.includes(set)&&who.length>1)bad.push(`${catalogue.artifacts?.[set]?.name??set} 4 pièces porté par ${who.join(' et ')} : le bonus d’équipe ne se cumule pas.`);
  info.push('Les rôles (soin, bouclier) viennent d’une liste interne : un personnage récent peut manquer.');
  return {good,bad,info};
}
const elementDmg={Pyro:'pyro_dmg_',Hydro:'hydro_dmg_',Cryo:'cryo_dmg_',Électro:'electro_dmg_',Anémo:'anemo_dmg_',Géo:'geo_dmg_',Dendro:'dendro_dmg_'};
const slots=['flower','plume','sands','goblet','circlet'];
const avgRoll={critRate_:3.3,critDMG_:6.6,atk_:4.96,enerRech_:5.51,eleMas:19.82,hp_:4.96,def_:6.2,hp:253.94,atk:16.54,def:19.68};
// Profil « bien farmé » : 3 jets taux CRIT, 3 jets DGT CRIT, 1 ATQ %, 1 recharge par pièce (≈ 40 CV par pièce).
function farmedPiece(setKey,slotKey,mainStatKey,location) {
  const keys=['critRate_','critDMG_','atk_','enerRech_','eleMas','hp_'].filter(k=>k!==mainStatKey).slice(0,4);
  const rolls=Object.fromEntries(keys.map(k=>[k,{critRate_:3,critDMG_:3}[k]??1]));
  if(mainStatKey==='critRate_'||mainStatKey==='critDMG_')rolls.atk_+=2;
  return {setKey,slotKey,rarity:5,level:20,mainStatKey,location,lock:false,substats:Object.entries(rolls).map(([key,n])=>({key,value:Math.round(avgRoll[key]*n*10)/10}))};
}
// Renforcement : chaque palier de +4 restant ajoute un jet moyen à la meilleure sous-statistique CRIT présente.
function upgradedPiece(a) {
  const max=a.rarity===5?20:a.rarity===4?16:12,extra=Math.max(0,Math.floor(max/4)-Math.floor(a.level/4)),subs=a.substats.map(s=>({...s}));
  for(let i=0;i<extra;i++){
    if(subs.length<4){const key=['critRate_','critDMG_','atk_','enerRech_'].find(k=>k!==a.mainStatKey&&!subs.some(s=>s.key===k));if(key){subs.push({key,value:avgRoll[key]});continue;}}
    const target=subs.find(s=>s.key==='critDMG_')??subs.find(s=>s.key==='critRate_')??subs[0];if(target)target.value=Math.min(substatLimits[target.key]??Infinity,Math.round((target.value+(avgRoll[target.key]??0))*10)/10);
  }
  return {...a,level:max,substats:subs};
}
// Pièce scannée avec une sous-statistique illisible : on complète par une statistique neutre plutôt que de bloquer.
function complete(a) {
  const subs=a.substats.map(s=>({...s}));
  for(const key of ['atk_','enerRech_','eleMas','hp_','def_','atk','hp','def'])if(subs.length<minimumSubstats(a.rarity,a.level)&&key!==a.mainStatKey&&!subs.some(s=>s.key===key))subs.push({key,value:avgRoll[key]??0});
  return {...a,substats:subs};
}
// Meilleures pièces de tout l'inventaire (équipées ou non) : bonus 4 pièces du set visé si possible, puis meilleure valeur CRIT une fois renforcées.
// ponytail: les premiers membres de l'équipe choisissent en premier ; un vrai optimiseur répartirait les pièces entre eux.
function inventoryPieces(set,mains,artifacts,used) {
  const fit=slots.map(s=>artifacts.map((a,i)=>({i,a})).filter(x=>x.a.slotKey===s&&x.a.mainStatKey===mains[s]&&x.a.rarity>=4&&!used.has(x.i)).map(x=>({...x,piece:upgradedPiece(complete(x.a))})).map(x=>({...x,score:critValue(x.piece)})).sort((a,b)=>b.score-a.score));
  const any=fit.map(l=>l[0]),inSet=fit.map(l=>l.find(x=>x.a.setKey===set));
  let best=any,total=-1;
  if(inSet.filter(Boolean).length>=4)for(let off=0;off<5;off++){const combo=inSet.map((x,j)=>j===off?any[j]:x);if(combo.some(x=>!x))continue;const sum=combo.reduce((n,x)=>n+x.score,0);if(sum>total){total=sum;best=combo;}}
  return best;
}
export function weaponChoices(key,data,catalogue,metadata,mode) {
  const type=catalogue.characters?.[key]?.weapon;
  if(mode==='ideal')return Object.entries(catalogue.weapons??{}).filter(([k,w])=>w.weapon===type&&metadata.weapons[k]).map(([k,w])=>({key:k,name:w.name,rarity:w.rarity}));
  return data.weapons.map((w,index)=>({...w,index})).filter(w=>catalogue.weapons?.[w.key]?.weapon===type&&metadata.weapons[w.key]).map(w=>({key:w.key,index:w.index,name:catalogue.weapons[w.key].name,rarity:catalogue.weapons[w.key].rarity,refinement:w.refinement,location:w.location}));
}
export function defaultWeapon(key,data,catalogue,metadata,planner,mode,taken=[]) {
  const list=weaponChoices(key,data,catalogue,metadata,mode).filter(w=>mode==='ideal'||!taken.includes(w.index));
  const atk=w=>planner?.weapons?.[w.key]?.baseAtk??0,current=data.weapons.find(w=>w.location===key);
  if(mode==='ideal'){const own=current&&list.find(w=>w.key===current.key&&w.rarity===5);return own??[...list].sort((a,b)=>b.rarity-a.rarity||atk(b)-atk(a))[0];}
  return list.find(w=>w.location===key&&w.rarity>=Math.max(...list.map(x=>x.rarity)))??[...list].sort((a,b)=>b.rarity-a.rarity||b.refinement-a.refinement||atk(b)-atk(a))[0];
}
// Construit un relevé virtuel pour un scénario, puis réutilise buildSimulation sans modification.
export function scenarioData(mode,keys,data,catalogue,metadata,planner,options={}) {
  const next={...data,characters:data.characters.map(c=>({...c})),weapons:data.weapons.map(w=>({...w})),artifacts:data.artifacts.map(a=>({...a}))},taken=[],usedPieces=new Set(),copies=next.artifacts;
  for(const key of keys.filter(Boolean)){
    const char=next.characters.find(c=>c.key===key);if(!char)continue;const o=options[key]??{};
    Object.assign(char,{level:90,ascension:6,talent:{auto:10,skill:10,burst:10}});
    if(mode==='ideal')char.constellation=Number(o.constellation??options.constellation??char.constellation);
    const pick=o.weapon?weaponChoices(key,data,catalogue,metadata,mode).find(w=>mode==='ideal'?w.key===o.weapon:String(w.index)===String(o.weapon)):defaultWeapon(key,data,catalogue,metadata,planner,mode,taken);
    next.weapons.forEach(w=>{if(w.location===key)w.location='';});
    if(pick){if(mode==='ideal')next.weapons.push({key:pick.key,level:90,ascension:6,refinement:Number(o.refinement??options.refinement??1),location:key,lock:false});else{taken.push(pick.index);Object.assign(next.weapons[pick.index],{level:90,ascension:6,location:key});}}
    const current=data.artifacts.filter(a=>a.location===key),bySlot=Object.fromEntries(slots.map(s=>[s,current.find(a=>a.slotKey===s)]));
    next.artifacts=next.artifacts.filter(a=>a.location!==key);
    const counts={};current.forEach(a=>counts[a.setKey]=(counts[a.setKey]??0)+1);
    const set=o.set||Object.entries(counts).filter(([s])=>metadata.artifacts[s]).sort((a,b)=>b[1]-a[1])[0]?.[0]||'GladiatorsFinale';
    const element=elementDmg[elementName(catalogue.characters?.[key]?.element)]??'atk_';
    const mains={flower:'hp',plume:'atk',sands:bySlot.sands?.mainStatKey??'atk_',goblet:bySlot.goblet?.mainStatKey??element,circlet:bySlot.circlet?.mainStatKey??'critRate_'};
    const upgrade=mode==='inventory'&&o.artifacts!=='farmed';
    const owned=upgrade?inventoryPieces(set,mains,data.artifacts,usedPieces):[];
    owned.forEach(x=>{if(x){usedPieces.add(x.i);next.artifacts=next.artifacts.filter(a=>a!==copies[x.i]);}});
    next.artifacts.push(...slots.map((s,j)=>owned[j]?{...owned[j].piece,location:key}:farmedPiece(set,s,mains[s],key)));
  }
  return next;
}
// Résumé en français d'une composition, sans équipement : résonance, réactions et survie.
export function teamSummary(keys,catalogue){
  const els=keys.map(k=>elementName(catalogue.characters?.[k]?.element)),counts={};els.forEach(e=>counts[e]=(counts[e]??0)+1);
  const res=Object.entries(counts).filter(([e,n])=>n>=2&&resonances[e]).map(([e])=>resonances[e].split(' :')[0]);
  const found=reactions.filter(([pair])=>pair.every(e=>counts[e])).map(([,label])=>label.split(' (')[0]);
  if(counts['Anémo']&&Object.keys(counts).some(e=>['Pyro','Hydro','Électro','Cryo'].includes(e)))found.push('Dispersion');
  if(counts['Géo']&&Object.keys(counts).length>1)found.push('Cristallisation');
  const sustain=keys.filter(k=>healers.includes(k)||shielders.includes(k)).map(k=>catalogue.characters?.[k]?.name??k);
  return [res.length&&'Résonance : '+res.join(', '),found.length&&'Réactions : '+found.join(', '),sustain.length&&'Survie : '+sustain.join(', ')].filter(Boolean).join(' · ');
}
