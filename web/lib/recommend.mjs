import { characterEquipment } from './collection.mjs';
import { critValue } from './insights.mjs';
import { analyzeTeam } from './team.mjs';
// ponytail: archétypes saisis à la main d'après les équipes communautaires courantes (version 6.x) ;
// chaque emplacement liste les candidats du meilleur au plus accessible. À enrichir à chaque nouvelle version.
export const archetypes=[
  {id:'national',name:'Vaporisation « National »',tag:'Polyvalente',text:'Xiangling et Bennett boostés par un Hydro hors champ : très forte et accessible.',slots:[['Xiangling'],['Bennett'],['Xingqiu','Yelan'],['KaedeharaKazuha','Sucrose','Chongyun']]},
  {id:'raiden-national',name:'Raiden National',tag:'Polyvalente',text:'Raiden recharge l’équipe et déclenche les réactions des soutiens hors champ.',slots:[['RaidenShogun'],['Xiangling'],['Bennett'],['Xingqiu','Yelan']]},
  {id:'raiden-hyper',name:'Raiden hypercarry',tag:'Monocible',text:'Raiden au centre, buffée par Sara, Bennett et une dispersion.',slots:[['RaidenShogun'],['KujouSara'],['Bennett'],['KaedeharaKazuha','Sucrose']]},
  {id:'hutao',name:'Hu Tao Vaporisation',tag:'Monocible',text:'Hu Tao vaporise grâce à un Hydro hors champ, protégée par un bouclier.',slots:[['HuTao'],['Xingqiu','Yelan'],['Yelan','Furina','Xingqiu'],['Zhongli','Xilonen','Layla']]},
  {id:'skirk',name:'Skirk Cryo/Hydro',tag:'Monocible',text:'Skirk avec des soutiens uniquement Cryo et Hydro.',slots:[['Skirk'],['Escoffier','Shenhe','Citlali'],['Furina','Yelan','Xingqiu','SangonomiyaKokomi'],['Citlali','Shenhe','Escoffier','Diona','Charlotte','Mona']]},
  {id:'freeze',name:'Ayaka Gel',tag:'Contrôle',text:'Gel permanent : sûr dans les Abysses et très fort contre les groupes.',slots:[['KamisatoAyaka'],['Shenhe','Escoffier'],['KaedeharaKazuha','Sucrose','Venti'],['SangonomiyaKokomi','Furina','Mona']]},
  {id:'ganyu-melt',name:'Ganyu Fonte',tag:'Zone',text:'Ganyu fait fondre avec l’application Pyro de Xiangling et Bennett.',slots:[['Ganyu'],['Xiangling'],['Bennett'],['Zhongli','Layla','Diona']]},
  {id:'neuvi',name:'Neuvillette Hydro',tag:'Zone',text:'Neuvillette porté par Furina et une dispersion, avec un soigneur ou un bouclier.',slots:[['Neuvillette'],['Furina'],['KaedeharaKazuha','Sucrose'],['Zhongli','Baizhu','Xilonen']]},
  {id:'mavuika',name:'Mavuika Fonte',tag:'Natlan',text:'Mavuika et ses soutiens de Natlan pour une fonte surpuissante.',slots:[['Mavuika'],['Citlali'],['Xilonen'],['Bennett','Furina']]},
  {id:'arle',name:'Arlecchino Vaporisation',tag:'Monocible',text:'Arlecchino vaporise avec un Hydro hors champ et Bennett.',slots:[['Arlecchino'],['Bennett'],['Yelan','Xingqiu','Furina'],['KaedeharaKazuha','Xianyun','Sucrose']]},
  {id:'hyperbloom',name:'Hyperfloraison',tag:'Zone',text:'Graines de Floraison transformées par l’Électro : très peu dépendante des artéfacts.',slots:[['Nahida','Alhaitham'],['Xingqiu','Yelan','Furina'],['KukiShinobu','RaidenShogun'],['Alhaitham','Collei','Yaoyao','Baizhu']]},
  {id:'bloom',name:'Floraison Nilou',tag:'Zone',text:'Nilou transforme la Floraison en Bourgeons de Dendro très puissants.',slots:[['Nilou'],['Nahida'],['SangonomiyaKokomi','Yelan','Furina'],['Baizhu','Yaoyao','Collei']]},
  {id:'aggravate',name:'Cyno Aggravation',tag:'Monocible',text:'Cyno et Fischl exploitent la Catalyse de Nahida.',slots:[['Cyno'],['Nahida'],['Fischl','Beidou'],['Baizhu','Zhongli','Yaoyao']]},
  {id:'lunar-charged',name:'Électrocharge lunaire',tag:'Nod-Krai',text:'Flins et Ineffa déclenchent l’Électrocharge lunaire avec un Hydro de Nod-Krai.',slots:[['Flins'],['Ineffa'],['Columbina','Aino','Furina'],['Sucrose','Jahoda','Ifa','KaedeharaKazuha']]},
  {id:'lunar-bloom',name:'Floraison lunaire',tag:'Nod-Krai',text:'Lauma et Nefer autour de la Floraison lunaire.',slots:[['Nefer'],['Lauma'],['Columbina','Aino','Furina'],['Nahida','Baizhu']]},
  {id:'navia',name:'Navia Cristallisation',tag:'Géo',text:'Navia consomme les fragments de Cristallisation.',slots:[['Navia'],['Furina','Xingqiu'],['Xilonen','Zhongli'],['Bennett','Fischl']]},
  {id:'mono-geo',name:'Mono Géo',tag:'Géo',text:'Itto ou Chiori avec Gorou et une résonance Géo.',slots:[['AratakiItto','Chiori'],['Gorou'],['Zhongli','Xilonen'],['Albedo','Chiori']]},
  {id:'plunge',name:'Plongée Xianyun',tag:'Monocible',text:'Xiao enchaîne les attaques plongeantes grâce à Xianyun.',slots:[['Xiao'],['Xianyun'],['Furina'],['Bennett','Faruzan']]},
  {id:'taser',power:0.85,name:'Électrocharge accessible',tag:'Gratuite',text:'Beidou, Fischl et Xingqiu : simple, solide et avec des 4★.',slots:[['Beidou'],['Fischl'],['Xingqiu'],['Sucrose','KaedeharaKazuha']]},
  {id:'f2p-bloom',power:0.85,name:'Floraison accessible',tag:'Gratuite',text:'Floraison avec des personnages faciles à obtenir.',slots:[['Nahida','Collei'],['Xingqiu','Barbara'],['SangonomiyaKokomi','Barbara','Xingqiu'],['Collei','Yaoyao','Kirara']]},
];
export function buildScore(key,data,catalogue) {
  const c=data.characters.find(x=>x.key===key);if(!c)return 0;
  const eq=characterEquipment(data,catalogue,key),pieces=Object.values(eq.slots).flat(),cv=pieces.reduce((s,a)=>s+critValue(a),0);
  const talents=((c.talent?.auto??1)+(c.talent?.skill??1)+(c.talent?.burst??1))/30;
  return Math.round(100*(0.3*c.level/90+0.25*talents+0.2*pieces.length/5+0.15*Math.min(1,cv/180)+0.1*(eq.weapons[0]?.level??0)/90));
}
export function recommendTeams(data,catalogue,limit=8) {
  const owned=new Set(data.characters.map(c=>c.key)),scores=new Map(data.characters.map(c=>[c.key,buildScore(c.key,data,catalogue)]));
  return archetypes.map(a=>{
    const picked=[],missing=[];let preference=0;
    a.slots.forEach(slot=>{const i=slot.findIndex(k=>owned.has(k)&&!picked.includes(k));if(i<0){missing.push(slot.filter(k=>!picked.includes(k)));return;}picked.push(slot[i]);preference+=1-i/slot.length;});
    const coverage=picked.length/4,build=picked.length?picked.reduce((s,k)=>s+scores.get(k),0)/picked.length:0;
    const core=owned.has(a.slots[0][0])||a.slots[0].some(k=>owned.has(k));
    return {...a,picked,missing,coverage,build:Math.round(build),score:Math.min(100,Math.round((a.power??1)*(core?coverage*55+preference/4*15+build*0.3:coverage*30)))};
  }).filter(t=>t.picked.length>=2).sort((a,b)=>b.score-a.score).slice(0,limit);
}
export function adviseTeam(keys,data,catalogue) {
  const members=keys.filter(Boolean),owned=new Set(data.characters.map(c=>c.key));
  const match=archetypes.map(a=>({a,overlap:members.filter(k=>a.slots.flat().includes(k)).length})).sort((x,y)=>y.overlap-x.overlap)[0];
  const swaps=[];
  if(match?.overlap>=2){
    const used=new Set(),open=[];
    match.a.slots.forEach(slot=>{const k=slot.find(x=>members.includes(x)&&!used.has(x));if(k)used.add(k);else open.push(slot);});
    const extra=members.filter(k=>!used.has(k));
    open.forEach((slot,i)=>{const alt=slot.find(k=>owned.has(k)&&!members.includes(k)&&!swaps.some(w=>w.add===k));if(alt)swaps.push({add:alt,remove:extra[i],text:`${extra[i]?`Remplacer ${catalogue.characters?.[extra[i]]?.name??extra[i]} : `:''}l’archétype « ${match.a.name} » prévoit ${catalogue.characters?.[alt]?.name??alt} à cette place, et vous l’avez.`});});
  }
  const invest=members.map(k=>({key:k,score:buildScore(k,data,catalogue)})).sort((a,b)=>a.score-b.score);
  return {archetype:match?.overlap>=2?match.a:null,swaps,invest,analysis:analyzeTeam(members,data,catalogue)};
}
