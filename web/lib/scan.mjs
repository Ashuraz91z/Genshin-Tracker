export class Problem extends Error { constructor(message, status=400) { super(message); this.status=status; } }
const integer = (v,min,max) => Number.isInteger(v) && v>=min && v<=max;
const substats=new Set(['hp','hp_','atk','atk_','def','def_','enerRech_','eleMas','critRate_','critDMG_']);
const key = v => typeof v==='string' && /^[A-Za-z][A-Za-z0-9]{0,100}$/.test(v);
export const need = (condition,message) => { if (!condition) throw new Problem(message); };

export function validateScan(body,{recoverArtifacts=false}={}) {
  need(body && typeof body==='object' && !Array.isArray(body),'Scan invalide.');
  need(typeof body.scanId==='string' && /^[a-zA-Z0-9_-]{16,100}$/.test(body.scanId),'Identifiant du scan invalide.');
  const time=Date.parse(body.capturedAt);
  need(Number.isFinite(time) && time<=Date.now()+600000,'Date du scan invalide ou horloge du PC en avance.');
  const good=body.good;
  need(good?.format==='GOOD' && [1,2,3].includes(good.version),'Choisissez un fichier d’inventaire .json exporté par Kamera FR ou un scanner compatible avec le format GOOD, et non son rapport de scan.');
  const cleaned={},rejectionErrors=[];let rejectedArtifacts=0;
  for (const category of ['characters','weapons','artifacts']) {
    if (good[category]===undefined) continue;
    need(Array.isArray(good[category]) && good[category].length<=20000,`Liste ${category} invalide.`);
    cleaned[category]=good[category].map((item,index) => {
      try {
        need(item && typeof item==='object' && !Array.isArray(item),'Objet invalide.');
        const location=item.location??'';
        if (category==='characters') {
          need(key(item.key) && integer(item.level,1,100) && integer(item.constellation,0,6) && integer(item.ascension,0,10),'Personnage invalide.');
          need(item.talent && ['auto','skill','burst'].every(t=>integer(item.talent[t],1,15)),'Aptitudes invalides.');
          return {key:item.key,level:item.level,constellation:item.constellation,ascension:item.ascension,
            talent:Object.fromEntries(['auto','skill','burst'].map(t=>[t,item.talent[t]]))};
        }
        need(location==='' || key(location),'Équipement associé invalide.');
        need(integer(item.rarity??1,1,5) && integer(item.level,0,100),'Niveau ou rareté invalide.');
        if(category==='weapons') {
          need(key(item.key) && integer(item.refinement,1,5) && integer(item.ascension,0,10),'Arme invalide.');
          return {key:item.key,level:item.level,ascension:item.ascension,refinement:item.refinement,location,lock:item.lock===true};
        }
        need(integer(item.rarity,1,5) && key(item.setKey) && ['flower','plume','sands','goblet','circlet'].includes(item.slotKey) && integer(item.level,0,20),'Artéfact invalide.');
        need(typeof item.mainStatKey==='string' && /^[A-Za-z_]{1,40}$/.test(item.mainStatKey),'Statistique principale invalide.');
        need(Array.isArray(item.substats) && item.substats.length<=4 && item.substats.every(s=>s && substats.has(s.key) && typeof s.value==='number' && Number.isFinite(s.value) && s.value>0 && s.value<=100000),'Statistiques secondaires invalides.');
        need(new Set(item.substats.map(s=>s.key)).size===item.substats.length,'Statistiques secondaires en double.');
        return {setKey:item.setKey,slotKey:item.slotKey,rarity:item.rarity,level:item.level,mainStatKey:item.mainStatKey,
          substats:item.substats.map(s=>({key:s.key,value:s.value})),location,lock:item.lock===true};
      } catch(error) {
        if(!recoverArtifacts||category!=='artifacts'||!(error instanceof Problem))throw error;
        rejectedArtifacts++;
        if(rejectionErrors.length<500)rejectionErrors.push(`Artéfact #${index+1} exclu : ${error.message}`);
        return null;
      }
    }).filter(Boolean);
    if(category==='characters') need(new Set(cleaned.characters.map(c=>c.key)).size===cleaned.characters.length,'Personnages en double.');
  }
  if(good.materials!==undefined) {
    need(good.materials && typeof good.materials==='object' && !Array.isArray(good.materials) && Object.keys(good.materials).length<=10000,'Matériaux invalides.');
    need(Object.entries(good.materials).every(([k,v])=>key(k) && !['constructor','prototype'].includes(k) && integer(v,0,1e12)),'Quantité de matériau invalide.');
    cleaned.materials={...good.materials};
  }
  need(Object.keys(cleaned).length>0,'Le scan ne contient aucune catégorie exploitable.');
  const raw=body.report??{};
  need(raw && typeof raw==='object' && !Array.isArray(raw),'Rapport invalide.');
  const errors=[...rejectionErrors,...(Array.isArray(raw.errors)?raw.errors.slice(0,500).map(e=>String(e).slice(0,2000)):[])].slice(0,500);
  const selected={};
  for(const category of ['characters','weapons','artifacts','materials','developmentItems']) selected[category]=raw.selected?.[category]===true;
  const expected={};
  for(const category of ['weapons','artifacts']) expected[category]=integer(raw.expectedFromScreen?.[category],0,20000)?raw.expectedFromScreen[category]:null;
  return {scanId:body.scanId,capturedAt:new Date(time).toISOString(),good:cleaned,
    report:{rejectedArtifacts,errorCount:(Array.isArray(raw.errors)?raw.errors.length:0)+rejectedArtifacts,status:String(raw.status??'imported').slice(0,80),errors,selected,expectedFromScreen:expected,
      events:Array.isArray(raw.events)?raw.events.slice(-500).map(e=>({at:Number.isFinite(Date.parse(e?.at))?new Date(e.at).toISOString():null,message:String(e?.message??'').slice(0,2000)})):[],
      partialCharacters:Array.isArray(raw.partialCharacters)?raw.partialCharacters.slice(0,300).map(c=>({key:String(c?.key??'Inconnu').slice(0,100),level:integer(c?.level,1,100)?c.level:null})):[],completenessVerified:false}};
}

