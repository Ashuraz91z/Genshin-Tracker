'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import s from './features.module.css';
import { recommendTeams, adviseTeam, buildScore } from '../lib/recommend.mjs';
const storageKey='gt-main-team';
function Portraits({keys,catalogue}) {return <div className={s.who}>{keys.map(k=><Link key={k} href={'/characters/'+encodeURIComponent(k)} title={catalogue.characters?.[k]?.name??k}>{catalogue.characters?.[k]?.portrait?<img src={catalogue.characters[k].portrait} width="48" height="48" alt={catalogue.characters[k].name??k}/>:k}</Link>)}</div>;}
export default function Recommendations({data,catalogue,teams,onSave}) {
  const [main,setMain]=useState('auto'),[onlyComplete,setOnlyComplete]=useState(true),[saved,setSaved]=useState({}),[error,setError]=useState('');
  useEffect(()=>{try{const v=localStorage.getItem(storageKey);if(v)setMain(v);}catch{}},[]);
  const choose=v=>{setMain(v);try{localStorage.setItem(storageKey,v);}catch{}};
  const name=k=>catalogue.characters?.[k]?.name??k;
  const auto=[...data.characters].sort((a,b)=>buildScore(b.key,data,catalogue)-buildScore(a.key,data,catalogue)).slice(0,4).map(c=>c.key);
  const team=teams.find(t=>t.id===main),keys=team?.characters??auto,advice=adviseTeam(keys,data,catalogue);
  const recos=recommendTeams(data,catalogue,12).filter(t=>!onlyComplete||t.coverage===1);
  async function add(t){setError('');try{await onSave({name:t.name,characters:t.picked,duration:20,enemyLevel:100,resistance:10,iterations:100,rotation:'',energy:'normal'});setSaved(p=>({...p,[t.id]:true}));}catch(e){setError(e.message);}}
  return <section style={{marginBottom:24}}>
    <section className="panel"><div className="section-heading"><div><span className="eyebrow">VOTRE ÉQUIPE PRINCIPALE</span><h2>{team?.name??'Vos 4 personnages les plus investis'}</h2></div>
      <label className="select-label">Équipe principale<select value={team?main:'auto'} onChange={e=>choose(e.target.value)}><option value="auto">Automatique (plus investis)</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label></div>
      <Portraits keys={keys} catalogue={catalogue}/>
      {advice.archetype&&<p style={{marginTop:12}}>Ressemble à <strong>{advice.archetype.name}</strong> : {advice.archetype.text}</p>}
      <div className={s.verdict}><div className={s.good}><h4>Ce qui va bien</h4>{advice.analysis.good.length?<ul>{advice.analysis.good.map(t=><li key={t}>{t}</li>)}</ul>:<p className="muted">Rien de marquant.</p>}</div><div className={s.bad}><h4>À corriger</h4>{advice.analysis.bad.length?<ul>{advice.analysis.bad.map(t=><li key={t}>{t}</li>)}</ul>:<p className="muted">Aucun point faible détecté.</p>}</div></div>
      {advice.swaps.length>0&&<><h4>Changements suggérés</h4><ul className="tips-list">{advice.swaps.map(w=><li key={w.add}><Link href={'/characters/'+encodeURIComponent(w.add)}>{catalogue.characters?.[w.add]?.portrait&&<img src={catalogue.characters[w.add].portrait} width="36" height="36" alt=""/>}<span><strong>Essayer {name(w.add)}</strong><small>{w.text}</small></span></Link></li>)}</ul></>}
      <h4 style={{marginTop:16}}>Ordre d’investissement</h4><ol className={s.steps}>{advice.invest.map((m,i)=><li key={m.key}><span className={`${s.tag} ${i===0?s.high:m.score>75?s.low:s.mid}`}>{i===0?'D’abord':'Ensuite'} · {m.score}/100</span><strong>{name(m.key)}</strong><p>Indice de build : niveau, aptitudes, artéfacts, valeur CRIT et arme. <Link className="text-button" href={'/characters/'+encodeURIComponent(m.key)}>Voir son guide ↗</Link></p></li>)}</ol>
      <p className="simulation-note">Pour comparer les dégâts actuels et atteignables, ouvrez cette équipe dans <Link className="text-button" href="/teams">Équipes</Link>.</p></section>
    <section className="panel" style={{marginTop:24}}><div className="section-heading"><div><span className="eyebrow">AVEC VOTRE BOX</span><h2>Les meilleures équipes à construire</h2></div><label className="glass-toggle"><span>Équipes complètes uniquement</span><input type="checkbox" checked={onlyComplete} onChange={e=>setOnlyComplete(e.target.checked)}/></label></div>
      <p className="muted">Classement : couverture de l’archétype avec vos personnages, préférence des choix et niveau d’investissement actuel. Liste d’archétypes interne, inspirée des équipes communautaires courantes.</p>
      {error&&<p className="field-error" role="alert">{error}</p>}
      <div className={s.members} style={{marginTop:12}}>{recos.map((t,i)=><article className={s.member} key={t.id}><header><span className={`${s.tag} ${t.coverage===1?s.low:s.mid}`}>#{i+1} · {t.tag}</span>{t.name}</header><Portraits keys={t.picked} catalogue={catalogue}/><p className="muted" style={{margin:0,fontSize:13}}>{t.text}</p>
        <div className={s.bar}><i style={{width:Math.min(100,t.score)+'%'}}/></div><small className="muted">Score {t.score}/100 · investissement moyen {t.build}/100</small>
        {t.missing.length>0&&<small className="field-error">Il manque : {t.missing.map(m=>m.slice(0,3).map(name).join(' ou ')).join(' · ')}</small>}
        <button className="button secondary" disabled={saved[t.id]} onClick={()=>add(t)}>{saved[t.id]?'Ajoutée à vos équipes ✓':'Ajouter à mes équipes'}</button></article>)}</div>
      {!recos.length&&<p className="muted">Aucune équipe d’archétype ne correspond encore à votre box. Décochez « complètes uniquement » ou importez vos personnages.</p>}</section>
  </section>;
}
