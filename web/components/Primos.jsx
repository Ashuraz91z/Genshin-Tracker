'use client';
import { useEffect, useState } from 'react';
import { number } from './Collection';
import { forecast } from '../lib/primos.mjs';
const key='gt-primos',per={day:'par jour',month:'par mois',version:'par version'};
const iso=d=>d.toISOString().slice(0,10),inSix=()=>iso(new Date(Date.now()+42*864e5));
// ponytail: saved in this browser only; move to account customizations if people want it on every device.
export default function Primos() {
  const [state,setState]=useState({primos:0,fates:0,target:inSix(),settings:{}});
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(key));if(saved)setState(s=>({...s,...saved}));}catch{}},[]);
  const save=next=>{setState(next);try{localStorage.setItem(key,JSON.stringify(next));}catch{}};
  const set=(field,value)=>save({...state,[field]:value}),source=(id,field,value)=>save({...state,settings:{...state.settings,[id]:{...state.settings[id],[field]:value}}});
  const target=new Date(state.target+'T00:00'),f=forecast({...state,target}),date=target.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
  return <section className="panel primos" aria-label="Prévision de primogemmes">
    <div className="section-heading"><div><span className="eyebrow">VOS VŒUX À VENIR</span><h2>Primogemmes d’ici le {date}</h2></div></div>
    <div className="primos-summary"><strong>≈ {number(f.wishes)} vœux</strong><span>{number(f.totalPrimos)} primogemmes + {number(f.totalFates)} vœux entrelacés · dans {f.days} jour{f.days>1?'s':''}</span></div>
    <div className="primos-inputs">
      <label>Primogemmes actuelles<input type="number" min="0" inputMode="numeric" value={state.primos} onChange={e=>set('primos',Math.max(0,Number(e.target.value)))}/></label>
      <label>Vœux entrelacés actuels<input type="number" min="0" inputMode="numeric" value={state.fates} onChange={e=>set('fates',Math.max(0,Number(e.target.value)))}/></label>
      <label>Jusqu’au (prochaine bannière)<input type="date" min={iso(new Date())} value={state.target} onChange={e=>e.target.value&&set('target',e.target.value)}/></label>
    </div>
    <ul className="primos-sources">{f.rows.map(r=><li key={r.id} className={r.on?'':'off'}>
      <label className="check"><input type="checkbox" checked={r.on} onChange={e=>source(r.id,'on',e.target.checked)}/><span>{r.name}</span></label>
      <label className="primos-amount"><input type="number" min="0" aria-label={`Primogemmes ${per[r.per]} : ${r.name}`} value={r.amount} onChange={e=>source(r.id,'amount',Math.max(0,Number(e.target.value)))}/><small>{per[r.per]}{r.fates?` + ${r.fates} vœux`:''}</small></label>
      <strong>{r.on?`+${number(r.primos)}${r.fates?` · +${r.fates*r.count} vœux`:''}`:'—'}</strong>
    </li>)}</ul>
    <p className="simulation-note">Montants estimés pour un joueur qui termine tout ; ils changent selon les versions, ajustez-les si besoin. Les événements de version varient trop pour être devinés : indiquez leur total quand la version est annoncée. Enregistré dans ce navigateur.</p>
  </section>;
}
