'use client';
import { useState } from 'react';
import Link from 'next/link';
import { number, when } from './Collection';
import s from './Resources.module.css';
import f from './features.module.css';

// Quest log read by Kamera (journal J, onglet « En cours »), parsed in lib/quests.mjs.
const chapter=q=>q.group&&`${q.group}${q.chapter?` (${q.chapter})`:''}`;
const status=q=>q.status==='locked'?`Bloquée · ${q.reason??'conditions non remplies'}`:q.distance?`Faisable · à ${number(q.distance)} m`:'Faisable';
const filters=[['all','Toutes'],['available','Faisables'],['locked','Bloquées']];

const Item=({q,showSection})=><li className={s.tip} data-tone={q.status==='locked'?'warn':'ok'}>
  <strong>{q.title}</strong><p>{[showSection&&q.section,chapter(q),status(q)].filter(Boolean).join(' · ')}</p></li>;

function Heading({quests,open,locked}){
  return <div className="section-heading"><div><span className="eyebrow">JOURNAL DE QUÊTES</span>
    <h2>{open} faisable{open>1?'s':''} maintenant · {locked} bloquée{locked>1?'s':''}</h2>
    <p>Relevé par Kamera {when(quests.at)}, onglet « En cours » du journal.</p></div></div>;
}

/** Overview: counts and the quests you can do now. Full page (/quests): every quest, by type, with a filter. */
export default function Quests({quests,full=false}) {
  const [filter,setFilter]=useState('all');
  const list=quests?.list??[];
  if(!list.length)return full?<section className="panel" aria-label="Quêtes"><div className="section-heading"><div><span className="eyebrow">JOURNAL DE QUÊTES</span><h2>Aucune quête relevée</h2>
    <p>Lancez un scan avec Kamera, case « Quêtes » cochée (seule si vous voulez, sans scan complet) : il lit votre journal de quêtes (touche J, onglet « En cours ») et l’envoie ici.</p></div></div></section>:null;
  const open=list.filter(q=>q.status!=='locked'),locked=list.length-open.length;
  if(!full)return <section className="panel" aria-label="Quêtes en cours"><Heading quests={quests} open={open.length} locked={locked}/>
    {open.length>0&&<ul className={s.tips} aria-label="Quêtes faisables">{open.slice(0,4).map(q=><Item key={q.section+chapter(q)+q.title} q={q} showSection/>)}</ul>}
    <p style={{marginTop:16}}><Link className="text-button" href="/quests">Voir toutes les quêtes</Link></p></section>;
  const shown=list.filter(q=>filter==='all'||(filter==='locked')===(q.status==='locked'));
  const sections=[...new Set(shown.map(q=>q.section??'Autres quêtes'))];
  return <section className="panel" aria-label="Toutes les quêtes"><Heading quests={quests} open={open.length} locked={locked}/>
    <div role="group" aria-label="Filtrer les quêtes" className={f.days} style={{marginTop:16}}>{filters.map(([key,label])=>
      <button key={key} type="button" aria-pressed={filter===key} onClick={()=>setFilter(key)}>
        {label} ({key==='all'?list.length:key==='locked'?locked:open.length})</button>)}</div>
    {shown.length===0&&<p style={{marginTop:16}}>Aucune quête dans ce filtre.</p>}
    {sections.map(name=><div key={name}><h3 style={{marginTop:22}}>{name}</h3>
      <ul className={s.tips}>{shown.filter(q=>(q.section??'Autres quêtes')===name).map(q=><Item key={name+chapter(q)+q.title} q={q}/>)}</ul></div>)}
  </section>;
}
