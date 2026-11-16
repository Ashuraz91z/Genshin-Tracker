'use client';
import s from './features.module.css';
import usePlanner from './usePlanner';
import { number } from './Collection';
import { upgradeGuide, daysLabel } from '../lib/planner.mjs';
const level={3:['Priorité',s.high],2:['Ensuite',s.mid],1:['Bonus',s.low]};
export default function UpgradeGuide({character,data,catalogue}) {
  const planner=usePlanner();
  if(!planner)return <section className="panel"><p className="muted">Chargement du guide d’amélioration…</p></section>;
  const guide=upgradeGuide(character,data,catalogue,planner);
  return <section className="panel" aria-label="Guide d’amélioration"><div className="section-heading"><div><span className="eyebrow">GUIDE D’AMÉLIORATION</span><h3>Ce qui fera progresser {catalogue.characters?.[character.key]?.name??character.key}</h3></div>{guide.book&&<span className={guide.book.today?s.open:'muted'}>{guide.book.today?'Livres d’aptitude disponibles aujourd’hui':'Livres : '+daysLabel(guide.book)}</span>}</div>
    {guide.steps.length?<ol className={s.steps}>{guide.steps.map((step,i)=><li key={i}><span className={`${s.tag} ${level[step.priority][1]}`}>{level[step.priority][0]} · {step.area}</span><strong>{step.title}</strong><p>{step.text}</p></li>)}</ol>:<p>Personnage au maximum de ce que vos relevés permettent de mesurer. Prochaine étape : améliorer les sous-statistiques en farmant les artéfacts.</p>}
    <h4 style={{marginTop:20}}>Matériaux jusqu’au niveau 90 et aptitudes 10/10/10</h4>
    {guide.missing.length?<><p className="muted">{guide.missing.length} matériau(x) manquant(s) d’après votre dernier scan · {number(guide.mora)} Mora au total (hors EXP de personnage).</p><ul className={s.materials}>{guide.missing.map(m=><li key={m.key}>{m.image&&<img src={m.image} width="36" height="36" alt="" loading="lazy"/>}<span><strong>{m.name}</strong><small>{number(m.owned)} / {number(m.count)} · manque {number(m.missing)}</small>{m.farm&&<small>{daysLabel(m.farm)}</small>}</span></li>)}</ul></>:<p className="muted">{guide.needs?'Vous avez déjà tous les matériaux nécessaires.':'Aucun coût restant connu pour ce personnage.'}</p>}
    <p className="muted" style={{marginTop:12,fontSize:12}}>Coûts et jours des donjons : genshin-db (novembre 2026). Les quantités possédées viennent des onglets matériaux scannés ; un matériau non scanné compte comme 0.</p></section>;
}
