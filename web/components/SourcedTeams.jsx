'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import s from './features.module.css';
import { teamSummary } from '../lib/team.mjs';
const tierRank={SS:0,S:1,A:2,B:3},first=6;
const fold=t=>t.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
// genshin-builds propose souvent la même composition sur plusieurs pages de personnage : une seule carte, plusieurs guides.
const group=teams=>Object.values(teams.reduce((acc,t)=>{const id=t.members.map(m=>m.key).sort().join();const g=acc[id]??={...t,id,guides:[]};if(!g.guides.some(x=>x.character===t.character))g.guides.push({character:t.character,url:t.url});if((tierRank[t.tier]??9)<(tierRank[g.tier]??9))g.tier=t.tier;return acc;},{}));
// Équipes recommandées par genshin-builds.com (public/assets/teams-genshin-builds.json, régénéré par scripts/fetch-teams.mjs).
export default function SourcedTeams({data,catalogue,onSave}){
  const [onlyComplete,setOnlyComplete]=useState(false),[query,setQuery]=useState(''),[limit,setLimit]=useState(first),[gb,setGb]=useState(null),[saved,setSaved]=useState({}),[error,setError]=useState('');
  useEffect(()=>{fetch('/assets/teams-genshin-builds.json').then(r=>{if(!r.ok)throw Error('Équipes recommandées indisponibles pour le moment.');return r.json();}).then(d=>setGb({...d,teams:group(d.teams)})).catch(e=>setError(e.message));},[]);
  useEffect(()=>setLimit(first),[query,onlyComplete]);
  const owned=new Set(data.characters.map(c=>c.key)),name=k=>catalogue.characters?.[k]?.name??k,q=fold(query.trim());
  const list=(gb?.teams??[]).map(t=>({...t,have:t.members.filter(m=>owned.has(m.key)).length,keys:t.members.map(m=>m.key)}))
    .filter(t=>(!onlyComplete||t.have===t.members.length)&&(!q||t.keys.some(k=>fold(name(k)).includes(q))))
    .sort((a,b)=>b.have-a.have||(tierRank[a.tier]??9)-(tierRank[b.tier]??9)||a.rank-b.rank);
  const shown=list.slice(0,limit),complete=list.filter(t=>t.have===t.members.length).length;
  async function add(t){setError('');try{await onSave({name:`Équipe ${name((t.members.find(m=>m.role==='DPS principal')??t.members[0]).key)} (genshin-builds)`,characters:t.keys,duration:20,enemyLevel:100,resistance:10,iterations:100,rotation:'',energy:'normal'});setSaved(p=>({...p,[t.id]:true}));}catch(e){setError(e.message);}}
  return <section className="panel" style={{marginBottom:24}} aria-labelledby="gb-teams">
    <div className="section-heading"><div><span className="eyebrow">ÉQUIPES RECOMMANDÉES</span><h2 id="gb-teams">Les compositions de genshin-builds.com</h2></div><label className="glass-toggle"><span>Seulement celles que je peux former</span><input type="checkbox" checked={onlyComplete} onChange={e=>setOnlyComplete(e.target.checked)}/></label></div>
    <p className="muted" style={{maxWidth:'75ch'}}>Ces équipes viennent de <a style={{color:'var(--gold)',textDecoration:'underline',textUnderlineOffset:3}} href="https://genshin-builds.com/fr/teams" target="_blank" rel="noreferrer">genshin-builds.com<span className="sr-only"> (nouvel onglet)</span></a>, relevées le {gb?new Date(gb.fetchedAt).toLocaleDateString('fr-FR'):'…'}. Pour lire le guide complet d’une équipe et soutenir leur travail, ouvrez-la sur leur site. Celles que vous pouvez former apparaissent en premier.</p>
    <label className="select-label" style={{marginTop:12,maxWidth:320}}>Chercher un personnage<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex. Furina" autoComplete="off"/></label>
    {error&&<p className="field-error" role="alert">{error}</p>}
    {gb&&<p className="muted" aria-live="polite" style={{marginTop:8}}>{list.length} équipe{list.length>1?'s':''}{q?` avec « ${query.trim()} »`:''} · {complete?`${complete} que vous pouvez former`:'aucune que vous pouvez former en entier'}.</p>}
    <div className={s.members} style={{marginTop:12}}>{shown.map(t=><article className={s.member} key={t.id}>
      <header>{t.tier&&<span className={`${s.tag} ${t.tier==='SS'?s.low:s.mid}`}>Rang {t.tier}</span>}<span>Équipe {name((t.members.find(m=>m.role==='DPS principal')??t.members[0]).key)}</span></header>
      <ul style={{listStyle:'none',margin:0,padding:0,display:'grid',gap:8}}>{t.members.map(m=><li key={m.key} style={{display:'flex',alignItems:'center',gap:8}}>
        {catalogue.characters?.[m.key]?.portrait&&<img src={catalogue.characters[m.key].portrait} width="36" height="36" alt="" style={owned.has(m.key)?undefined:{filter:'grayscale(1)',opacity:.5}}/>}
        <span style={{lineHeight:1.35}}><Link href={'/characters/'+encodeURIComponent(m.key)}>{name(m.key)}</Link><br/><small className="muted">{m.role}{!owned.has(m.key)&&' · non possédé'}</small></span></li>)}</ul>
      <p className="muted" style={{margin:0,fontSize:13}}>{teamSummary(t.keys,catalogue)}</p>
      <details className="muted" style={{fontSize:13}}><summary style={{cursor:'pointer',minHeight:24}}>Armes conseillées</summary><ul style={{margin:'6px 0 0',paddingLeft:18}}>{t.members.map(m=><li key={m.key}><strong>{name(m.key)}</strong> : {m.weapons.map(w=>catalogue.weapons?.[w]?.name??w).join(', ')}</li>)}</ul></details>
      <small className={t.have===t.members.length?s.gain:'muted'}>{t.have===t.members.length?'Vous avez les 4 personnages':`${t.have}/${t.members.length} personnages possédés`}</small>
      {t.guides.length===1?<a className="text-button" href={t.url} target="_blank" rel="noreferrer">Guide sur genshin-builds.com ↗<span className="sr-only"> (nouvel onglet)</span></a>:<p className="muted" style={{margin:0,fontSize:13}}>Guides sur genshin-builds.com : {t.guides.map((g,i)=><span key={g.url}>{i>0&&' · '}<a className="text-button inline" href={g.url} target="_blank" rel="noreferrer">{name(g.character)} ↗<span className="sr-only"> (nouvel onglet)</span></a></span>)}</p>}
      <button className="button secondary" disabled={saved[t.id]} onClick={()=>add(t)}>{saved[t.id]?'Ajoutée à vos équipes ✓':'Ajouter à mes équipes'}</button></article>)}</div>
    {list.length>limit&&<button className="button secondary" style={{marginTop:12}} onClick={()=>setLimit(n=>n+12)}>Afficher 12 équipes de plus ({list.length-limit} restantes)</button>}
    {gb&&!list.length&&<p className="muted" style={{marginTop:12}}>{q?`Aucune équipe avec « ${query.trim()} ».`:'Aucune de ces équipes n’est complète avec vos personnages pour l’instant.'}</p>}
  </section>;
}
