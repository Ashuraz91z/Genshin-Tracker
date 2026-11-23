// Récupère les équipes recommandées de genshin-builds.com et les écrit dans lib/teams-genshin-builds.json.
// Usage : node scripts/fetch-teams.mjs  (à lancer depuis web/, par exemple dans une tâche planifiée).
import { readFile, writeFile } from 'node:fs/promises';
const base='https://genshin-builds.com/fr/teams';
const root=new URL('..',import.meta.url);
const catalogue=JSON.parse(await readFile(new URL('public/assets/catalogue.json',root),'utf8'));
const response=await fetch(base,{headers:{'User-Agent':'GenshinTracker/1.0 (+https://genshin-tracker.com)'}});
if(!response.ok)throw Error(`genshin-builds.com a répondu ${response.status}`);
const html=await response.text();
const raw=html.match(/component-url="\/_astro\/List[^"]*"[^>]*?props="([^"]*)"/)?.[1];
if(!raw)throw Error('Liste des équipes introuvable dans la page : la structure du site a changé.');
const unescape=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
// Format de sérialisation d'Astro : [0, valeur] ou [1, tableau].
const decode=v=>Array.isArray(v)?(v[0]===1?v[1].map(decode):decode(v[1])):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,decode(x)])):v;
const props=decode(JSON.parse(unescape(raw)));
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const index=list=>Object.fromEntries(Object.keys(list).map(k=>[norm(k),k]));
const chars=index(catalogue.characters),weapons=index(catalogue.weapons);
const roles={'main dps':'DPS principal','sub dps':'DPS secondaire','sub-dps':'DPS secondaire',support:'Soutien','buffer / sub-dps':'Buffer / DPS secondaire','sub-dps / support':'DPS secondaire / Soutien'};
const skipped=[];
const teams=Object.values(props.teamsByName).flat().map(t=>{
  const members=t.characters.map(c=>({key:chars[norm(c.id)],role:roles[c.role.toLowerCase()]??c.role,weapons:c.weapons.map(w=>weapons[norm(w)]).filter(Boolean)}));
  if(members.some(m=>!m.key)){skipped.push(t.id);return null;}
  return {id:t.id,character:chars[norm(t.id)]??members[0].key,tier:t.tier||null,f2p:!!t.is_f2p,url:`${base}/${encodeURIComponent(t.id)}`,members};
}).filter(Boolean);
if(teams.length<50)throw Error(`Seulement ${teams.length} équipes lues : fichier non remplacé.`);
await writeFile(new URL('lib/teams-genshin-builds.json',root),JSON.stringify({source:base,fetchedAt:new Date().toISOString().slice(0,10),teams},null,1)+'\n');
console.log(`${teams.length} équipes enregistrées.${skipped.length?` Ignorées (personnage absent du catalogue) : ${skipped.join(', ')}.`:''}`);
