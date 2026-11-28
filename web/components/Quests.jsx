'use client';
import { number, when } from './Collection';
import s from './Resources.module.css';

// Quest log read by Kamera (journal J, onglet « En cours »), parsed in lib/quests.mjs.
const where=q=>[q.section,q.group&&`${q.group}${q.chapter?` (${q.chapter})`:''}`].filter(Boolean).join(' · ');

export default function Quests({quests}) {
  if(!quests?.list?.length)return null;
  const open=quests.list.filter(q=>q.status!=='locked'),locked=quests.list.filter(q=>q.status==='locked');
  const list=(items,tone,label)=><ul className={s.tips} aria-label={label}>{items.map(q=><li key={where(q)+q.title} className={s.tip} data-tone={tone}>
    <strong>{q.title}</strong><p>{[where(q),tone==='ok'?(q.distance?`faisable · à ${number(q.distance)} m`:'faisable'):`bloquée · ${q.reason??'conditions non remplies'}`].filter(Boolean).join(' · ')}</p></li>)}</ul>;
  return <section className="panel" aria-label="Quêtes en cours">
    <div className="section-heading"><div><span className="eyebrow">JOURNAL DE QUÊTES</span><h2>{open.length} faisable{open.length>1?'s':''} maintenant · {locked.length} bloquée{locked.length>1?'s':''}</h2>
      <p>Relevé par Kamera {when(quests.at)}, onglet « En cours ».</p></div></div>
    {open.length>0&&<><h3 style={{marginTop:22}}>Faisables maintenant</h3>{list(open,'ok','Quêtes faisables')}</>}
    {locked.length>0&&<><h3 style={{marginTop:22}}>Bloquées</h3>{list(locked,'warn','Quêtes bloquées')}</>}
  </section>;
}
