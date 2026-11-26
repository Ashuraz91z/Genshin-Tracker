import { number, when } from './Collection';
import s from './Resources.module.css';

// Read by Kamera on the Paimon menu, the wish screen and the character screen.
const items=[['Primogem','Primogemmes'],['IntertwinedFate','Pierres de la fatalité'],['AcquaintFate','Pierres de la destinée'],
  ['MasterlessStarglitter','Astéries libres'],['MasterlessStardust','Astrions libres'],['Mora','Moras']];

export default function Resources({data}) {
  const profile=data.profile??{},owned=items.filter(([key])=>data.materials?.[key]!==undefined);
  if(!profile.nickname&&!profile.uid&&!owned.length)return null;
  return <section className="panel" aria-label="Profil et monnaies du compte">
    <div className="section-heading"><div><span className="eyebrow">VOTRE COMPTE EN JEU</span><h2>{profile.nickname??'Profil'}</h2>
      {profile.uid&&<p>UID {profile.uid}{profile.at?` · relevé ${when(profile.at)}`:''}</p>}</div></div>
    <ul className={s.grid}>{items.map(([key,label])=><li key={key} className={s.item}>
      <span>{label}</span><strong>{data.materials?.[key]===undefined?'—':number(data.materials[key])}</strong></li>)}</ul>
  </section>;
}
