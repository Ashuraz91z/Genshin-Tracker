'use client';
import { useState } from 'react';
import Link from 'next/link';
import s from './features.module.css';
import gb from '../lib/teams-genshin-builds.json' with { type: 'json' };
import { teamSummary } from '../lib/team.mjs';
const tierRank={SS:0,S:1,A:2,B:3};
// Équipes recommandées par genshin-builds.com (lib/teams-genshin-builds.json, régénéré par scripts/fetch-teams.mjs).
export default function SourcedTeams({data,catalogue,onSave}){
  const [onlyComplete,setOnlyComplete]=useState(false),[all,setAll]=useState(false),[saved,setSaved]=useState({}),[error,setError]=useState('');
  const owned=new Set(data.characters.map(c=>c.key)),name=k=>catalogue.characters?.[k]?.name??k;
  const list=gb.teams.map(t=>({...t,have:t.members.filter(m=>owned.has(m.key)).length,keys:t.members.map(m=>m.key)}))
    .filter(t=>!onlyComplete||t.have===t.members.length)
    .sort((a,b)=>b.have-a.have||(tierRank[a.tier]??9)-(tierRank[b.tier]??9));
  const shown=all?list:list.slice(0,12);
  async function add(t){setError('');try{await onSave({name:`Équipe pour ${name(t.character)} (genshin-builds)`,characters:t.keys,duration:20,enemyLevel:100,resistance:10,iterations:100,rotation:'',energy:'normal'});setSaved(p=>({...p,[t.id]:true}));}catch(e){setError(e.message);}}
  return <section className="panel" style={{marginBottom:24}}>
    <div className="section-heading"><div><span className="eyebrow">ÉQUIPES RECOMMANDÉES</span><h2>Les compositions de genshin-builds.com</h2></div><label className="glass-toggle"><span>Seulement celles que je peux former</span><input type="checkbox" checked={onlyComplete} onChange={e=>setOnlyComplete(e.target.checked)}/></label></div>
    <p className="muted">Ces équipes viennent de <a className="text-button" href="https://genshin-builds.com/fr/teams" target="_blank" rel="noreferrer">genshin-builds.com</a> (relevé du {new Date(gb.fetchedAt).toLocaleDateString('fr-FR')}). Pour soutenir leur travail et lire le guide complet de chaque équipe, ouvrez-la sur leur site. Les équipes que vous pouvez former avec vos personnages apparaissent en premier.</p>
    {error&&<p className="field-error" role="alert">{error}</p>}
    <div className={s.members} style={{marginTop:12}}>{shown.map(t=><article className={s.member} key={t.id}>
      <header>{t.tier&&<span className={`${s.tag} ${t.tier==='SS'?s.low:s.mid}`}>Rang {t.tier}</span>}Équipe pour {name(t.character)}{t.f2p&&<small className="muted">F2P</small>}</header>
      <ul style={{listStyle:'none',margin:0,padding:0,display:'grid',gap:6}}>{t.members.map(m=><li key={m.key} style={{display:'flex',alignItems:'center',gap:8,opacity:owned.has(m.key)?1:.55}}>
        {catalogue.characters?.[m.key]?.portrait&&<img src={catalogue.characters[m.key].portrait} width="36" height="36" alt=""/>}
        <span><Link href={'/characters/'+encodeURIComponent(m.key)}>{name(m.key)}</Link> <small className="muted">· {m.role}{owned.has(m.key)?'':' · non possédé'}</small><br/>
        <small className="muted">{m.weapons.map(w=>catalogue.weapons?.[w]?.name??w).join(', ')}</small></span></li>)}</ul>
      <p className="muted" style={{margin:0,fontSize:13}}>{teamSummary(t.keys,catalogue)}</p>
      <small className={t.have===t.members.length?'':'field-error'}>{t.have}/{t.members.length} personnages possédés</small>
      <a className="text-button" href={t.url} target="_blank" rel="noreferrer">Voir le guide sur genshin-builds.com ↗</a>
      <button className="button secondary" disabled={saved[t.id]} onClick={()=>add(t)}>{saved[t.id]?'Ajoutée à vos équipes ✓':'Ajouter à mes équipes'}</button></article>)}</div>
    {list.length>12&&<button className="button secondary" style={{marginTop:12}} onClick={()=>setAll(v=>!v)}>{all?'Afficher moins':`Afficher les ${list.length} équipes`}</button>}
    {!list.length&&<p className="muted">Aucune de ces équipes n’est complète avec vos personnages pour l’instant.</p>}
  </section>;
}
