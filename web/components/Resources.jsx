'use client';
import { number, when } from './Collection';
import { currencyAdvice, moraFloor } from '../lib/advice.mjs';
import { moraNeeds, goals } from '../lib/planner.mjs';
import usePlanner from './usePlanner';
import s from './Resources.module.css';

// Read by Kamera on the Paimon menu, the wish screen and the character screen.
// Couleur d'accent par monnaie (celle de l'objet en jeu).
const items=[['Primogem','Primogemmes','#7cc4ff'],['IntertwinedFate','Pierres de la fatalité','#c9a4ff'],['AcquaintFate','Pierres de la destinée','#ff9fc6'],
  ['MasterlessStarglitter','Astéries libres','#ffd36e'],['MasterlessStardust','Astrions libres','#ff9d6e'],['Mora','Moras','#e7bf7c']];

export default function Resources({data}) {
  const planner=usePlanner();
  const profile=data.profile??{},owned=items.filter(([key])=>data.materials?.[key]!==undefined);
  if(!profile.nickname&&!profile.uid&&!owned.length)return null;
  const tips=currencyAdvice(data),moraTip=tips.find(t=>t.title==='Réserve de moras basse');
  // Moras pour tous les personnages, vers la cible « Tous mes personnages ».
  if(planner&&data.characters?.length){const m=moraNeeds(data,planner,goals.all.target);tips.push({tone:m.missing?(m.owned<m.needed/4?'bad':'warn'):'ok',title:m.missing?`Il manque ${number(m.missing)} moras pour vos personnages`:'Moras suffisants pour vos personnages',text:`${number(m.needed)} moras pour tous vos personnages (${goals.all.label.toLowerCase()} : ascension 6, aptitudes 10, hors EXP), ${number(m.owned)} possédés.`});}
  return <section className="panel" aria-label="Profil et monnaies du compte">
    <div className="section-heading"><div><span className="eyebrow">VOTRE COMPTE EN JEU</span><h2>{profile.nickname??'Profil'}</h2>
      {(profile.uid||profile.at||profile.adventureRank)&&<p>{[profile.adventureRank&&`Rang d’aventure ${profile.adventureRank}`,profile.worldLevel!==undefined&&`Niveau du monde ${profile.worldLevel}`,profile.uid&&`UID ${profile.uid}`,profile.at&&`relevé ${when(profile.at)}`].filter(Boolean).join(' · ')}</p>}</div></div>
    <ul className={s.grid}>{items.map(([key,label,color])=><li key={key} className={s.item} style={{'--c':color}} data-tone={key==='Mora'?moraTip?.tone:undefined}>
      <span>{label}</span><strong>{data.materials?.[key]===undefined?'—':number(data.materials[key])}</strong>
      {key==='Mora'&&moraTip&&<i className={s.gauge} aria-hidden="true"><b style={{width:Math.max(2,Math.min(100,data.materials.Mora/moraFloor(profile.adventureRank)*100))+'%'}}/></i>}</li>)}</ul>
    {tips.length>0&&<ul className={s.tips} aria-label="Conseils">{tips.map(t=><li key={t.title} className={s.tip} data-tone={t.tone}>
      <strong>{t.title}</strong><p>{t.text}</p></li>)}</ul>}
  </section>;
}
