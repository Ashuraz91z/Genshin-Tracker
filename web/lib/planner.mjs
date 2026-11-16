import { critValue } from './insights.mjs';
import { characterEquipment } from './collection.mjs';
export const dayNames=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
// Les donjons de maîtrise et de forge sont ouverts le dimanche pour tous les matériaux.
export const openOn=(info,day)=>day===0||info.days.includes(day);
export const daysLabel=info=>info.days.map(d=>dayNames[d]).join(' / ')+' / Dimanche';
const add=(totals,items)=>{for(const i of items)totals[i.key]=(totals[i.key]??0)+i.count;return totals;};
// ponytail: niveaux de personnage et d'arme via livres/minerais d'EXP non comptés, seulement élévations + aptitudes.
export function characterNeeds(character,plan,target={ascension:6,talent:10}) {
  const totals={};if(!plan)return totals;
  for(let a=character.ascension??0;a<target.ascension;a++)add(totals,plan.ascension[a]??[]);
  for(const t of ['auto','skill','burst'])for(let lvl=(character.talent?.[t]??1);lvl<target.talent;lvl++)add(totals,plan.talents?.[lvl-1]??[]);
  return totals;
}
export function weaponNeeds(weapon,plan){const totals={};for(let a=weapon.ascension??0;a<6;a++)add(totals,plan?.ascension[a]??[]);return totals;}
export function shortfall(needs,materials={}) {
  return Object.entries(needs).map(([key,count])=>({key,count,owned:materials[key]??0,missing:Math.max(0,count-(materials[key]??0))}));
}
const mainOk={sands:['atk_','hp_','def_','eleMas','enerRech_'],circlet:['critRate_','critDMG_','eleMas','heal_','hp_','atk_','def_']};
export function upgradeGuide(character,data,catalogue,planner,day=new Date().getDay()) {
  const plan=planner.characters?.[character.key],steps=[],name=key=>catalogue.materials?.[key]?.name??key;
  const equipment=characterEquipment(data,catalogue,character.key),weapon=equipment.weapons[0];
  const cap=[20,40,50,60,70,80,90][character.ascension??0];
  if(character.level<90)steps.push({priority:character.level<80?3:1,area:'Niveau',title:character.level===cap?`Élever au-delà du niveau ${cap}`:`Monter au niveau ${cap}`,text:character.level<80?'Le niveau 80 débloque l’essentiel des statistiques de base : priorité haute.':'Le niveau 90 apporte un petit gain : à faire quand le reste est prêt.'});
  const book=plan?.talentBook&&planner.materialDays[plan.talentBook];
  const talents=['auto','skill','burst'].map(t=>character.talent?.[t]??1);
  if(Math.max(...talents)<9)steps.push({priority:3,area:'Aptitudes',title:`Monter compétence et déchaînement à 8 ou plus`,text:`Actuellement ${talents.join(' / ')}. Ce sont généralement les plus rentables ; l’attaque normale dépend du personnage.`+(book?` Livres : ${book.domain}, ${daysLabel(book)}${openOn(book,day)?' — ouvert aujourd’hui.':'.'}`:'')});
  const pieces=Object.values(equipment.slots).flat();
  if(pieces.length<5)steps.push({priority:3,area:'Artéfacts',title:`Équiper ${5-pieces.length} pièce(s) manquante(s)`,text:'Chaque emplacement vide fait perdre beaucoup de statistiques. Vérifiez aussi le scan des artéfacts.'});
  const low=pieces.filter(a=>a.level<(a.rarity===5?20:16));
  if(low.length)steps.push({priority:2,area:'Artéfacts',title:`Renforcer ${low.length} pièce(s)`,text:low.map(a=>`${catalogue.artifacts?.[a.setKey]?.pieces?.[a.slotKey]?.name??a.slotKey} +${a.level}`).join(', ')+'. La statistique principale grimpe à chaque niveau.'});
  const sets={};pieces.forEach(a=>sets[a.setKey]=(sets[a.setKey]??0)+1);
  const active=Object.entries(sets).filter(([,n])=>n>=2);
  if(pieces.length===5&&!active.some(([,n])=>n>=4)&&active.length<2)steps.push({priority:2,area:'Set',title:'Aucun bonus 4 pièces ni double 2 pièces',text:'Visez 4 pièces d’un même set, ou au moins deux bonus 2 pièces.'+(active[0]?` Set principal : ${catalogue.artifacts?.[active[0][0]]?.name}.`:'')});
  const crit=key=>pieces.reduce((s,a)=>s+(a.mainStatKey===key?(key==='critRate_'?31.1:62.2):0)+(a.substats?.find(x=>x.key===key)?.value??0),0);
  const cr=5+crit('critRate_'),cd=50+crit('critDMG_');
  if(pieces.length>=4&&cr+cd>80){const ratio=cd/cr;if(ratio>2.6)steps.push({priority:2,area:'Statistiques',title:'Pas assez de taux CRIT',text:`≈ ${cr.toFixed(0)} % / ${cd.toFixed(0)} % (hors arme et passifs). Visez un ratio proche de 1:2, par exemple avec une couronne Taux CRIT.`});else if(ratio<1.6)steps.push({priority:2,area:'Statistiques',title:'Pas assez de DGT CRIT',text:`≈ ${cr.toFixed(0)} % / ${cd.toFixed(0)} % (hors arme et passifs). Visez un ratio proche de 1:2, par exemple avec une couronne DGT CRIT.`});}
  for(const a of pieces)if(mainOk[a.slotKey]&&!mainOk[a.slotKey].includes(a.mainStatKey))steps.push({priority:2,area:'Artéfacts',title:`Statistique principale inhabituelle`,text:`${a.slotKey} en ${a.mainStatKey}.`});
  const weakest=[...pieces].sort((a,b)=>critValue(a)-critValue(b))[0];
  if(weakest&&critValue(weakest)<15&&pieces.length===5)steps.push({priority:1,area:'Farm',title:'Pièce la plus faible à remplacer',text:`${catalogue.artifacts?.[weakest.setKey]?.pieces?.[weakest.slotKey]?.name??weakest.slotKey} (CV ${critValue(weakest)}).`+((planner.artifactDomains?.[weakest.setKey]??[])[0]?` Donjon : ${planner.artifactDomains[weakest.setKey][0]}.`:'')});
  if(!weapon)steps.push({priority:3,area:'Arme',title:'Arme non identifiée',text:'Refaites le scan des armes avec « Lier les armes » coché.'});
  else if(weapon.level<80){const info=planner.materialDays[planner.weapons?.[weapon.key]?.material];steps.push({priority:2,area:'Arme',title:`Monter ${weapon.name} (niveau ${weapon.level})`,text:'L’ATQ de base de l’arme compte beaucoup.'+(info?` Matériaux : ${info.domain}, ${daysLabel(info)}${openOn(info,day)?' — ouvert aujourd’hui.':'.'}`:'')});}
  const needs=shortfall(characterNeeds(character,plan),data.materials).filter(n=>n.key!=='Mora');
  const missing=needs.filter(n=>n.missing>0).sort((a,b)=>b.missing-a.missing).map(n=>({...n,name:name(n.key),image:catalogue.materials?.[n.key]?.image,farm:planner.materialDays[n.key]}));
  return {steps:steps.sort((a,b)=>b.priority-a.priority),missing,needs:needs.length,mora:characterNeeds(character,plan).Mora??0,book:book?{...book,name:name(plan.talentBook),today:openOn(book,day)}:null};
}
export function farmPlan(data,catalogue,planner,day=new Date().getDay()) {
  const groups={};
  const push=(material,who)=>{const info=planner.materialDays[material];if(!info)return;const g=groups[material]??={key:material,name:catalogue.materials?.[material]?.name??material,image:catalogue.materials?.[material]?.image,...info,today:openOn(info,day),who:[]};if(!g.who.includes(who))g.who.push(who);};
  for(const c of data.characters){const plan=planner.characters?.[c.key];if(plan?.talentBook&&['auto','skill','burst'].some(t=>(c.talent?.[t]??10)<10))push(plan.talentBook,c.key);}
  for(const w of data.weapons)if(w.location&&(w.ascension??6)<6)push(planner.weapons?.[w.key]?.material,w.location);
  return Object.values(groups).sort((a,b)=>b.today-a.today||b.who.length-a.who.length);
}
