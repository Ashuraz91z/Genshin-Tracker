'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import s from './features.module.css';
import usePlanner from './usePlanner';
import { goalPlan, goals, dayNames, farmEstimate } from '../lib/planner.mjs';
import Select from './Select';
import Icon from './Icon';
const mapUrl='https://act.hoyolab.com/ys/app/interactive-map/index.html?lang=fr-fr';
const kinds=[['talent','Livres d’aptitudes','pour les aptitudes de'],['weapon','Matériaux d’arme','pour l’arme de']];
const store='genshin-tracker-farm-goal';
const count=n=>n+(n>1?' personnages':' personnage'),fmt=n=>n.toLocaleString('fr-FR');
const stars=r=>r?<span className={s.rarity} aria-label={r+' étoiles'}>{'★'.repeat(r)}</span>:null;
const estimate=e=>e.runs?`≈ ${fmt(e.runs)} combat${e.runs>1?'s':''} · ${fmt(e.resin)} résine · ${fmt(e.days)} jour${e.days>1?'s':''} de résine`:e.kills?`≈ ${fmt(e.kills)} ennemis à vaincre`:null;
export default function FarmToday({data,catalogue,teams=[]}) {
  const planner=usePlanner(),today=new Date().getDay(),[day,setDay]=useState(today),[goal,setGoal]=useState('all'),[picked,setPicked]=useState([]);
  useEffect(()=>{try{const v=JSON.parse(localStorage.getItem(store)??'null');if(v?.goal&&goals[v.goal]){setGoal(v.goal);setPicked(v.picked??[]);}}catch{}},[]);
  const save=(g,p)=>{setGoal(g);setPicked(p);try{localStorage.setItem(store,JSON.stringify({goal:g,picked:p}));}catch{}};
  if(!planner)return null;
  const mode=goals[goal],slots=Math.min(mode.teams,teams.length);
  const chosen=Array.from({length:slots},(_,i)=>teams.find(t=>t.id===picked[i])??teams[i]);
  const keys=mode.teams&&slots?[...new Set(chosen.flatMap(t=>t.characters))]:null;
  const plan=goalPlan(data,catalogue,planner,keys,mode.target,day),top=plan.today[0];
  const name=k=>catalogue.characters?.[k]?.name??k,when=day===today?'aujourd’hui':dayNames[day].toLowerCase();
  const who=list=><span className={s.who}><em>Pour</em>{list.slice(0,6).map(k=><Link key={k} href={'/characters/'+encodeURIComponent(k)} title={name(k)} aria-label={name(k)}>{catalogue.characters?.[k]?.portrait?<img src={catalogue.characters[k].portrait} width="28" height="28" alt=""/>:name(k)}</Link>)}{list.length>6&&<small>+{list.length-6}</small>}</span>;
  const where=(domain,place)=>{const p=planner.domainPlaces?.[domain];return p&&<span className={s.place}><span><Icon name="pin"/>{p[0]} · {p[1]}</span><a href={mapUrl} target="_blank" rel="noopener noreferrer" aria-label={'Trouver '+place+' sur la carte interactive HoYoLAB (nouvel onglet)'}><Icon name="map"/>Carte</a></span>;};
  const days=g=>g.days.map(d=>dayNames[d].slice(0,3)).join(', ')+', Dim';
  return <section className="panel farm-today" id="farm" aria-label="Quoi farmer"><div className="section-heading"><div><span className="eyebrow">VOTRE PRIORITÉ DU JOUR</span><h2>Quoi farmer {when}</h2></div></div>
    <p className={s.farmLabel} id="farm-goal">Objectif</p><div className={s.days} role="group" aria-labelledby="farm-goal">{Object.entries(goals).map(([k,g])=><button key={k} aria-pressed={k===goal} onClick={()=>save(k,picked)}>{g.label}</button>)}</div>
    {mode.teams>0&&(teams.length?<><p className="muted">{mode.label} : {mode.hint}.</p><div className={s.farmTeams}>{chosen.map((t,i)=><label key={i}>Équipe {i+1}<Select aria-label={'Équipe '+(i+1)} value={t.id} onChange={e=>{const p=chosen.map(c=>c.id);p[i]=e.target.value;save(goal,p);}}>{teams.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</Select></label>)}{teams.length<mode.teams&&<p className="muted">{mode.teams-teams.length} équipe(s) de plus conseillée(s) : <Link href="/teams">créez-les dans Équipes</Link>.</p>}</div></>
      :<p className="muted">Créez d’abord vos équipes dans <Link href="/teams">Équipes</Link> : le plan se calcule à partir d’elles. En attendant, tous vos personnages sont comptés.</p>)}
    <p className={s.farmLabel} id="farm-day">Jour</p><div className={s.days} role="group" aria-labelledby="farm-day">{[1,2,3,4,5,6,0].map(d=><button key={d} aria-pressed={d===day} onClick={()=>setDay(d)}>{d===today?'Aujourd’hui':dayNames[d].slice(0,3)}</button>)}</div>
    {top?<p className={s.farmLead}>Commencez par <strong>{top.place}</strong> : {top.name} sert à {count(top.who.length)}.{day===0&&' Le dimanche, tous les donjons sont ouverts.'}</p>
      :<p className={s.farmLead}>Aucun donjon de livres ou d’armes utile {when}{plan.other.length||plan.artifacts.length?' : profitez-en pour les boss et les artéfacts ci-dessous.':'. Tout est déjà au niveau visé.'}</p>}
    {kinds.map(([kind,title,purpose])=>{const items=plan.today.filter(g=>g.kind===kind);return items.length>0&&<div key={kind} className={s.farmGroup} data-tone={kind}><h3>{title} · ouvert {when}</h3>
      <ul className={s.farmList}>{items.map(g=><li key={g.key}>{g.image&&<img src={g.image} width="44" height="44" alt="" loading="lazy"/>}<div><strong>{g.place}</strong>{where(g.domain,g.place)}<span>{g.name}</span><small>{purpose} {count(g.who.length)}</small>{who(g.who)}</div></li>)}</ul></div>;})}
    {plan.artifacts.length>0&&<div className={s.farmGroup} data-tone="artifact"><h3>Artéfacts · tous les jours</h3><ul className={s.farmList}>{plan.artifacts.slice(0,4).map(g=><li key={g.key}><div><strong>{g.place}</strong>{where(g.key,g.place)}<span>{g.sets.join(', ')}</span><small>pièces faibles ou manquantes chez {count(g.who.length)}</small>{who(g.who)}</div></li>)}</ul></div>}
    {plan.other.length>0&&<div className={s.farmGroup} data-tone="world"><h3>Boss et ressources du monde · tous les jours</h3><ul className={s.farmList}>{plan.other.slice(0,8).map(g=>{const e=farmEstimate(planner.drops?.[g.key],g.missing),r=catalogue.materials?.[g.key]?.rarity;const b=planner.drops?.[g.key]?.[0]?.b;return <li key={g.key} data-foe={b===2?'weekly':b?'boss':b===0?'mob':undefined}>{g.image&&<img src={g.image} width="44" height="44" alt="" loading="lazy"/>}<div><strong>{g.name}</strong>{stars(r)}<small>il en manque {fmt(g.missing)} · {count(g.who.length)}</small>{e?<span className={s.foes}><em>{e.where.split(' : ')[0]}</em>{planner.drops[g.key].map(f=>f.i?<img key={f.n} src={'/assets/enemies/'+f.i+'.webp'} width="40" height="40" alt={f.n} title={f.n} loading="lazy"/>:<b key={f.n}>{f.n}</b>)}</span>:r===0&&<span>Spécialité locale : à ramasser dans le monde</span>}{e&&estimate(e)&&<span className={s.farmTime}>{estimate(e)}</span>}{who(g.who)}</div></li>;})}</ul><p className="muted">Temps estimés au niveau du monde 8 (rang d’aventure 55 et plus), sans compter la synthèse. Plus bas, les boss donnent moins et les matériaux 3★ des ennemis ne tombent que sur les ennemis de niveau 60 et plus.</p></div>}
    {plan.later.length>0&&<details className={s.farmGroup} data-tone="later"><summary>Les autres jours ({plan.later.length})</summary><ul className={s.farmLater}>{plan.later.map(g=><li key={g.key}><span>{days(g)}</span><strong>{g.place}</strong><small>{planner.domainPlaces?.[g.domain]?.[0]&&planner.domainPlaces[g.domain][0]+' · '}{g.name} · {count(g.who.length)}</small></li>)}</ul></details>}
  </section>;
}
