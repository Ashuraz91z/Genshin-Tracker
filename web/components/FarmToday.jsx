'use client';
import { useState } from 'react';
import Link from 'next/link';
import s from './features.module.css';
import usePlanner from './usePlanner';
import { farmPlan, dayNames, openOn } from '../lib/planner.mjs';
export default function FarmToday({data,catalogue}) {
  const planner=usePlanner(),today=new Date().getDay(),[day,setDay]=useState(today);
  if(!planner)return null;
  const plan=farmPlan(data,catalogue,planner,day).filter(g=>openOn(g,day));
  return <section className="panel" aria-label="Donjons du jour"><div className="section-heading"><div><span className="eyebrow">DONJONS DE MAÎTRISE ET DE FORGE</span><h2>Quoi farmer {day===today?'aujourd’hui':dayNames[day].toLowerCase()}</h2></div></div>
    <div className={s.days} role="group" aria-label="Jour">{[1,2,3,4,5,6,0].map(d=><button key={d} aria-pressed={d===day} onClick={()=>setDay(d)}>{dayNames[d].slice(0,3)}{d===today?' ·':''}</button>)}</div>
    {day===0&&<p className="muted">Dimanche : tous les donjons de maîtrise et de forge sont ouverts.</p>}
    {plan.length?<ul className={s.materials} style={{gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))"}}>{plan.map(g=><li key={g.key}>{g.image&&<img src={g.image} width="40" height="40" alt="" loading="lazy"/>}<span><strong>{g.name}</strong><small>{g.domain}</small><span className={s.who}>{g.who.slice(0,6).map(k=><Link key={k} href={'/characters/'+encodeURIComponent(k)} title={catalogue.characters?.[k]?.name??k}>{catalogue.characters?.[k]?.portrait?<img src={catalogue.characters[k].portrait} width="24" height="24" alt={catalogue.characters[k].name}/>:k}</Link>)}{g.who.length>6&&<small>+{g.who.length-6}</small>}</span></span></li>)}</ul>:<p className="muted">Rien d’utile ce jour-là pour vos personnages et armes équipées encore à améliorer.</p>}</section>;
}
