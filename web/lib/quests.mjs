// Quest log read by Kamera (journal J, onglet « En cours ») : pages of raw OCR lines, top to bottom, while scrolling.
// Card layout: section header, chapter title + subtitle (« Chapitre VII - Acte 1 »), then each quest followed by
// either its distance (« 11199m », faisable) or a red line (« Terminez d'abord les quêtes requises… », bloquée).
const section=/^(qu[êe]tes?\s+(d['’]\s*)?(archons?|histoire|monde|légendes?|commissions?|événements?|d['’]?exploration)|(archon|story|world|event|commission)\s+quests?)\b/i;
const subtitle=/\b(chapitre|chapter|prologue|interm[èeé]de|interlude|acte?|act)\b/i;
const distance=/^\d[\d\s.,]*\s?m$/i;
const lock=/terminez|requis|pr[ée]requis|prerequisite|complete the|niv(eau)?\.? d.?aventure|rang d.?aventure|adventure rank|d[ée]bloqu|unlock|disponible|available/i;

// Card icons on the left come out as symbols, a digit or a lone lowercase letter (« 6 Sal Flore »).
const tidy=l=>l.replace(/^[^\p{L}\d«"']+/u,'').replace(/^(\d{1,2}|\p{Ll})\s+(?=\p{Lu})/u,'').replace(/\s+[^\p{L}\d\s]{1,3}$/u,'').replace(/\s+[QO©@®]$/u,'').replace(/[\s|©@®.,]+$/u,'').trim();
// Archon chapters number acts in digits (« Acte 1 »), the others in Roman numerals (« Acte I »).
const subtitleText=l=>l.replace(/(acte?|act)\s*[\]!l|]?$/i,(_,a)=>a+(/^chap/i.test(l)?' 1':' I'));
const words=l=>l.split(/\s+/).filter(Boolean);
// Card borders sometimes come out as noise (« RE - Jen Rs Re Len Leone… »).
const noise=l=>{const w=words(l),letters=(l.match(/\p{L}/gu)??[]).length;
  return letters<3||letters/l.replace(/\s/g,'').length<0.7||!w.some(x=>x.replace(/[^\p{L}]/gu,'').length>=4)||(w.length>=6&&w.filter(x=>x.length<=3).length/w.length>=0.75);};
const keyOf=q=>[q.section,q.group,q.title].map(x=>(x??'').toLowerCase().replace(/[^\p{L}\d]/gu,'')).join('|');

/** trace (optional): receives one [page, raw line, decision] per line read, to see on the Sync page how each line was understood. */
export function parseQuestPages(pages,trace=null) {
  const found=new Map();let current={section:null,group:null};
  pages.forEach((page,p)=>{
    let previous=null; // last quest read on this page: distance and lock lines belong to it
    for(const raw of page){
      const line=tidy(String(raw)),note=kind=>trace?.push([p+1,String(raw),kind]);
      if(!line){note('vide après nettoyage');continue;}
      if(section.test(line)){current={section:line.replace(/^qu[êe]tes?/i,'Quêtes'),group:null};previous=null;note(`type de quête : ${current.section}`);continue;}
      if(lock.test(line)){if(previous){previous.status='locked';previous.reason=/terminez|requis/i.test(line)?'Terminez d’abord les quêtes requises.':line;note(`bloque « ${previous.title} »`);}else note('ligne de blocage sans quête au-dessus (ignorée)');continue;}
      if(distance.test(line)){if(previous&&previous.status!=='locked'){previous.status='available';previous.distance=Number(line.replace(/\D/g,''));note(`distance de « ${previous.title} »`);}else note('distance sans quête au-dessus (ignorée)');continue;}
      if(noise(line)){note('bruit (ignoré)');continue;}
      if(subtitle.test(line)&&(!previous||previous.reason||previous.distance!==undefined)){note('sous-titre sans titre au-dessus, carte coupée (ignoré)');continue;}
      if(subtitle.test(line)){
        // The line before was a chapter title, not a quest.
        found.delete(previous.key);current={...current,group:previous.title,chapter:subtitleText(line)};previous=null;note(`chapitre : « ${current.group} » (${current.chapter}), la ligne d’avant n’était pas une quête`);continue;}
      const quest={section:current.section,group:current.group,chapter:current.chapter,title:line,status:'available'};
      quest.key=keyOf(quest);
      const seen=found.get(quest.key);
      previous=seen??quest;
      if(!seen)found.set(quest.key,quest);
      note(seen?`quête déjà vue : « ${line} »`:`quête : « ${line} »`);
    }
  });
  return [...found.values()].map(({key,...q})=>Object.fromEntries(Object.entries(q).filter(([,v])=>v!==undefined&&v!==null)));
}

// Kamera reads every tab of the log (E = next tab). The same quest can show in several tabs (« En cours » and its own tab,
// with or without the section header): merged on chapter + title, missing fields filled, a status backed by a distance
// or a red line wins over a bare one.
const evidence=q=>q.distance!==undefined||q.reason!==undefined;
const mergeKey=q=>[q.group,q.title].map(x=>(x??'').toLowerCase().replace(/[^\p{L}\d]/gu,'')).join('|');
export function parseQuestTabs(tabs,trace=null) {
  const merged=new Map();
  for(const [t,tab] of tabs.entries()){const lines=trace?[]:null;const quests=parseQuestPages(tab,lines);lines?.forEach(l=>trace.push([t+1,...l]));for(const q of quests){
    const k=mergeKey(q),old=merged.get(k);
    if(!old){merged.set(k,q);continue;}
    const base=!evidence(old)&&evidence(q)?{...old,...q}:{...q,...old};
    merged.set(k,base);
  }}
  return [...merged.values()];
}

/** Kamera 0.9: {tabs:[[page,…],…]}; first 0.9 builds: {pages:[…]} (one tab). */
export function validateQuestTabs(raw) {
  if(!raw||typeof raw!=='object')return null;
  const tabs=Array.isArray(raw.tabs)?raw.tabs:Array.isArray(raw.pages)?[raw.pages]:null;
  if(!tabs)return null;
  let budget=120;
  const clean=tabs.slice(0,8).filter(Array.isArray).map(t=>t.filter(Array.isArray).slice(0,40).filter(()=>budget-->0)
    .map(p=>p.slice(0,200).map(l=>String(l).slice(0,200))));
  return clean.some(t=>t.length)?clean:null;
}
