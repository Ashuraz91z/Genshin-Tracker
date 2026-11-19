'use client';
import { useState } from 'react';
import Link from 'next/link';
import s from './features.module.css';
import usePlanner from './usePlanner';
import { farmPlan, dayNames, openOn } from '../lib/planner.mjs';
import Select from './Select';
const groups=[['talent','Livres d’aptitudes','pour monter les talents de'],['weapon','Matériaux d’arme','pour élever l’arme de']];
export default function FarmToday({data,catalogue,teams=[]}) {
  const planner=usePlanner(),today=new Date().getDay(),[day,setDay]=useState(today),[teamId,setTeamId]=useState('');
  const team=teams.find(t=>t.id===teamId),only=team&&new Set(team.characters);
  const scope=only?{...data,characters:data.characters.filter(c=>only.has(c.key)),weapons:data.weapons.filter(w=>only.has(w.location))}:data;
  if(!planner)return null;
  const plan=farmPlan(scope,catalogue,planner,day).filter(g=>openOn(g,day)),top=plan[0];
  const name=k=>catalogue.characters?.[k]?.name??k,when=day===today?'aujourd’hui':dayNames[day].toLowerCase();
  const count=n=>n+(n>1?' personnages':' personnage');
  return <section className="panel farm-today" id="farm" aria-label="Donjons du jour"><div className="section-heading"><div><span className="eyebrow">VOTRE PRIORITÉ DU JOUR</span><h2>Quoi farmer {when}</h2></div>{teams.length>0&&<label className="farm-scope">Pour<Select aria-label="Priorités pour" value={teamId} onChange={e=>setTeamId(e.target.value)}><option value="">Tous mes personnages</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</Select></label>}</div>
    <div className={s.days} role="group" aria-label="Jour">{[1,2,3,4,5,6,0].map(d=><button key={d} aria-pressed={d===day} onClick={()=>setDay(d)}>{d===today?'Aujourd’hui':dayNames[d].slice(0,3)}</button>)}</div>
    {top?<p className={s.farmLead}>Commencez par <strong>{top.place}</strong> : {top.name} sert à {count(top.who.length)}.{day===0&&' Le dimanche, tous les donjons sont ouverts.'}</p>
      :<p className="muted">Rien d’utile {when} pour {team?'cette équipe':'vos personnages et armes équipées encore à améliorer'}. Essayez un autre jour.</p>}
    {groups.map(([kind,title,purpose])=>{const items=plan.filter(g=>g.kind===kind);return items.length>0&&<div key={kind} className={s.farmGroup}><h3>{title}</h3>
      <ul className={s.farmList}>{items.map(g=><li key={g.key}>{g.image&&<img src={g.image} width="44" height="44" alt="" loading="lazy"/>}<div><strong>{g.place}</strong><span>{g.name}</span><small>{purpose} {count(g.who.length)}</small>
        <span className={s.who}>{g.who.slice(0,6).map(k=><Link key={k} href={'/characters/'+encodeURIComponent(k)} title={name(k)} aria-label={name(k)}>{catalogue.characters?.[k]?.portrait?<img src={catalogue.characters[k].portrait} width="28" height="28" alt=""/>:name(k)}</Link>)}{g.who.length>6&&<small>+{g.who.length-6}</small>}</span></div></li>)}</ul></div>;})}
  </section>;
}
