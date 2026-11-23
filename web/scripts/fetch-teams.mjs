// Récupère les équipes recommandées de genshin-builds.com et les écrit dans public/assets/teams-genshin-builds.json.
// Usage : node scripts/fetch-teams.mjs  (à lancer depuis web/, par exemple dans une tâche planifiée).
// La page liste ne montre que l'équipe n° 1 de chaque personnage : on lit ensuite la page de chaque personnage,
// une à la fois avec une pause, pour avoir toutes ses équipes.
import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
const base='https://genshin-builds.com/fr/teams';
const root=new URL('..',import.meta.url);
const catalogue=JSON.parse(await readFile(new URL('public/assets/catalogue.json',root),'utf8'));
const get=async url=>{const r=await fetch(url,{headers:{'User-Agent':'GenshinTracker/1.0 (+https://genshin-tracker.com)'}});if(!r.ok)throw Error(`${url} : ${r.status}`);return r.text();};
const unescape=s=>s.replace(/&quot;/g,'"').replace(/&#x?27;|&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const index=list=>Object.fromEntries(Object.keys(list).map(k=>[norm(k),k]));
const chars=index(catalogue.characters),weapons=index(catalogue.weapons);
const roles={'main dps':'DPS principal','sub dps':'DPS secondaire','sub-dps':'DPS secondaire',support:'Soutien','buffer / sub-dps':'Buffer / DPS secondaire','sub-dps / support':'DPS secondaire / Soutien'};
const role=r=>roles[r.trim().toLowerCase()]??r.trim();

// 1. Page liste : identifiants des personnages (format de sérialisation d'Astro : [0, valeur] ou [1, tableau]).
const raw=(await get(base)).match(/component-url="\/_astro\/List[^"]*"[^>]*?props="([^"]*)"/)?.[1];
if(!raw)throw Error('Liste des équipes introuvable : la structure du site a changé.');
const decode=v=>Array.isArray(v)?(v[0]===1?v[1].map(decode):decode(v[1])):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,decode(x)])):v;
const ids=Object.values(decode(JSON.parse(unescape(raw))).teamsByName).flat().map(t=>t.id);

// 2. Page de chaque personnage : blocs <h2 id="team_N">, puis une carte par membre (personnage, rôle, armes).
export function parseTeams(html,id){
  const blocks=html.split(/<h2 id="team_(\d+)"/).slice(1),out=[];
  for(let i=0;i<blocks.length;i+=2){
    const n=blocks[i],body=blocks[i+1],tier=body.match(/data-slot="badge"[^>]*>Tier ([A-Z]+)</)?.[1]??null;
    const members=body.split('data-slot="card-header"').slice(1).map(card=>({
      key:chars[norm(card.match(/href="\/fr\/character\/([^"]+)"/)?.[1]??'')],
      role:role(unescape(card.match(/data-slot="badge"[^>]*>([^<]+)</)?.[1]??'')),
      weapons:[...new Set([...card.matchAll(/href="\/fr\/weapon\/([^"]+)"/g)].map(m=>weapons[norm(m[1])]).filter(Boolean))],
    }));
    if(members.length!==4||members.some(m=>!m.key))continue;
    out.push({character:chars[norm(id)]??members[0].key,rank:+n,tier,url:`${base}/${encodeURIComponent(id)}#team_${n}`,members});
  }
  return out;
}
if(import.meta.url===`file://${process.argv[1]}`){
  const teams=[],failed=[];
  for(const id of ids){
    try{const found=parseTeams(await get(`${base}/${encodeURIComponent(id)}`),id);if(!found.length)failed.push(id);teams.push(...found);}
    catch(e){failed.push(id);console.warn(e.message);}
    await sleep(700);
  }
  if(teams.length<300)throw Error(`Seulement ${teams.length} équipes lues : fichier non remplacé.`);
  await writeFile(new URL('public/assets/teams-genshin-builds.json',root),JSON.stringify({source:base,fetchedAt:new Date().toISOString().slice(0,10),teams})+'\n');
  console.log(`${teams.length} équipes enregistrées (${ids.length} personnages).${failed.length?` Sans équipe lisible : ${failed.join(', ')}.`:''}`);
}
