'use client';
import { number, when } from './Collection';
import { currencyAdvice } from '../lib/advice.mjs';
import { moraNeeds, goals } from '../lib/planner.mjs';
import usePlanner from './usePlanner';
import s from './Resources.module.css';

// Read by Kamera on the Paimon menu, the wish screen and the character screen.
const items=[['Primogem','Primogemmes'],['IntertwinedFate','Pierres de la fatalité'],['AcquaintFate','Pierres de la destinée'],
  ['MasterlessStarglitter','Astéries libres'],['MasterlessStardust','Astrions libres'],['Mora','Moras']];

export default function Resources({data}) {
  const planner=usePlanner();
  const profile=data.profile??{},owned=items.filter(([key])=>data.materials?.[key]!==undefined);
  if(!profile.nickname&&!profile.uid&&!owned.length)return null;
  const tips=currencyAdvice(data);
  // Moras pour tous les personnages, vers la cible « Tous mes personnages ».
  if(planner&&data.characters?.length){const m=moraNeeds(data,planner,goals.all.target);tips.push({tone:m.missing?'info':'ok',title:m.missing?`Il manque ${number(m.missing)} moras pour vos personnages`:'Moras suffisants pour vos personnages',text:`${number(m.needed)} moras pour tous vos personnages (${goals.all.label.toLowerCase()} : ascension 6, aptitudes 10, hors EXP), ${number(m.owned)} possédés.`});}
  return <section className="panel" aria-label="Profil et monnaies du compte">
    <div className="section-heading"><div><span className="eyebrow">VOTRE COMPTE EN JEU</span><h2>{profile.nickname??'Profil'}</h2>
      {(profile.uid||profile.at||profile.adventureRank)&&<p>{[profile.adventureRank&&`Rang d’aventure ${profile.adventureRank}`,profile.worldLevel!==undefined&&`Niveau du monde ${profile.worldLevel}`,profile.uid&&`UID ${profile.uid}`,profile.at&&`relevé ${when(profile.at)}`].filter(Boolean).join(' · ')}</p>}</div></div>
    <ul className={s.grid}>{items.map(([key,label])=><li key={key} className={s.item}>
      <span>{label}</span><strong>{data.materials?.[key]===undefined?'—':number(data.materials[key])}</strong></li>)}</ul>
    {tips.length>0&&<ul className={s.tips} aria-label="Conseils">{tips.map(t=><li key={t.title} className={s.tip} data-tone={t.tone}>
      <strong>{t.title}</strong><p>{t.text}</p></li>)}</ul>}
  </section>;
}
