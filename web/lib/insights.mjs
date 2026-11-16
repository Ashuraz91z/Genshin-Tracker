// Valeur CRIT = 2 × Taux CRIT + DGT CRIT, sur les sous-statistiques uniquement (convention communautaire).
export function critValue(artifact) {
  const sub=key=>artifact.substats?.find(s=>s.key===key)?.value??0;
  return Math.round((2*sub('critRate_')+sub('critDMG_'))*10)/10;
}
// ponytail: seuils fixes pour un 5★ +20, à ajuster si on veut noter selon le niveau.
export function critGrade(cv) {
  return cv>=45?{label:'Exceptionnel',tier:'s'}:cv>=35?{label:'Excellent',tier:'a'}:cv>=25?{label:'Bon',tier:'b'}:cv>=15?{label:'Correct',tier:'c'}:{label:'Faible',tier:'d'};
}
export function toGood(data) {
  const strip=({manualId,...item})=>item;
  return {format:'GOOD',version:2,source:'Genshin Tracker',characters:data.characters,weapons:data.weapons.map(strip),artifacts:data.artifacts.map(strip),materials:data.materials};
}
const levelCaps=[20,40,50,60,70,80,90];
export function progressionTips(data,catalogue,limit=6) {
  const name=key=>catalogue.characters?.[key]?.name??key,tips=[];
  for(const c of data.characters) {
    const pieces=data.artifacts.filter(a=>a.location===c.key),slots=new Set(pieces.map(a=>a.slotKey)).size;
    const talents=c.talent?Math.max(c.talent.auto,c.talent.skill,c.talent.burst):0;
    if(c.level>=80&&talents&&talents<6)tips.push({key:c.key,weight:3,title:name(c.key),text:`Niveau ${c.level} mais meilleure aptitude au niveau ${talents} : ses aptitudes sont en retard.`});
    if(c.level>=70&&slots<5)tips.push({key:c.key,weight:2,title:name(c.key),text:`${5-slots} emplacement(s) d’artéfact non identifié(s) sur un personnage niveau ${c.level}.`});
    const low=pieces.filter(a=>a.rarity===5&&a.level<16).length;
    if(low)tips.push({key:c.key,weight:1,title:name(c.key),text:`${low} artéfact(s) 5★ équipé(s) sous +16 à monter.`});
    if(c.ascension<6&&c.level===levelCaps[c.ascension])tips.push({key:c.key,weight:2,title:name(c.key),text:`Bloqué au niveau ${c.level} : prochaine élévation disponible.`});
  }
  return tips.sort((a,b)=>b.weight-a.weight).slice(0,limit);
}
export function forgottenArtifacts(data,limit=4) {
  return data.artifacts.filter(a=>!a.location&&a.rarity===5).map(a=>({...a,cv:critValue(a)})).filter(a=>a.cv>=25).sort((a,b)=>b.cv-a.cv).slice(0,limit);
}
