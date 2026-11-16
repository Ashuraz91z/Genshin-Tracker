'use client';
import Select from './Select';
import { useState } from 'react';
import Link from 'next/link';
import s from './features.module.css';
import { number } from './Collection';
import { elements, elementName } from '../lib/collection.mjs';
const tabs=[['characters','Personnages'],['weapons','Armes'],['artifacts','Sets d’artéfacts']];
const hidden=key=>/^(Traveler|Manekin)/.test(key);
export default function GameCollection({data,catalogue}) {
  const [tab,setTab]=useState('characters'),[f,setF]=useState({owned:'',rarity:'',element:'',weapon:'',minC:'0',maxC:'6',minR:'1',search:''});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const owned={characters:new Map(data.characters.map(c=>[c.key,c])),weapons:new Map(),artifacts:new Map()};
  for(const w of data.weapons){const best=owned.weapons.get(w.key);if(!best||w.refinement>best.refinement)owned.weapons.set(w.key,{...w,copies:(best?.copies??0)+1});else best.copies++;}
  for(const a of data.artifacts){const e=owned.artifacts.get(a.setKey)??{pieces:0,maxed:0};e.pieces++;if(a.rarity===5&&a.level===20)e.maxed++;owned.artifacts.set(a.setKey,e);}
  const q=f.search.trim().toLocaleLowerCase('fr'),weaponTypes=[...new Set(Object.values(catalogue.weapons??{}).map(w=>w.weapon).filter(Boolean))].sort();
  const all=Object.entries(catalogue[tab]??{}).filter(([k])=>tab!=='characters'||!hidden(k));
  const rows=all.filter(([key,r])=>{const mine=owned[tab].get(key);
    if(f.owned==='yes'&&!mine||f.owned==='no'&&mine)return false;
    if(q&&!r.name.toLocaleLowerCase('fr').includes(q))return false;
    if(f.rarity&&String(r.rarity)!==f.rarity)return false;
    if(tab==='characters'){if(f.element&&elementName(r.element)!==f.element||f.weapon&&r.weapon!==f.weapon)return false;if(mine&&(mine.constellation<Number(f.minC)||mine.constellation>Number(f.maxC)))return false;if(!mine&&f.minC!=='0')return false;}
    if(tab==='weapons'){if(f.weapon&&r.weapon!==f.weapon)return false;if(mine&&mine.refinement<Number(f.minR))return false;if(!mine&&f.minR!=='1')return false;}
    return true;}).sort((a,b)=>(b[1].rarity??0)-(a[1].rarity??0)||a[1].name.localeCompare(b[1].name,'fr'));
  const count=(t,pred=()=>true)=>Object.entries(catalogue[t]??{}).filter(([k])=>(t!=='characters'||!hidden(k))&&pred(k)).length;
  const fiveStars=count('weapons',k=>catalogue.weapons[k].rarity===5);
  const summary=[[`${owned.characters.size} / ${count('characters')}`,'personnages possédés'],[data.characters.filter(c=>c.constellation===6).length,'personnages C6'],[`${[...owned.weapons.keys()].filter(k=>catalogue.weapons?.[k]?.rarity===5).length} / ${fiveStars}`,'armes 5★ différentes'],[`${owned.artifacts.size} / ${count('artifacts')}`,'sets d’artéfacts représentés']];
  const pct=Math.round(100*owned[tab].size/Math.max(1,all.length));
  return <section>
    <div className={s.summary}>{summary.map(([v,l])=><div key={l}><strong>{v}</strong><span>{l}</span></div>)}</div>
    <div className="inventory-categories" aria-label="Catégorie">{tabs.map(([k,l])=><button key={k} className={tab===k?'selected':''} aria-pressed={tab===k} onClick={()=>setTab(k)}>{l}<span>{owned[k].size}/{count(k)}</span></button>)}</div>
    <div className="panel"><div className={s.filters}>
      <label className="search-field"><input type="search" value={f.search} onChange={e=>set('search',e.target.value)} placeholder="Rechercher…" aria-label="Rechercher dans le jeu"/></label>
      <label>Possession<Select value={f.owned} onChange={e=>set('owned',e.target.value)}><option value="">Tout le jeu</option><option value="yes">Possédés</option><option value="no">Manquants</option></Select></label>
      <label>Rareté<Select value={f.rarity} onChange={e=>set('rarity',e.target.value)}><option value="">Toutes</option>{[5,4,3].map(n=><option key={n} value={n}>{n}★</option>)}</Select></label>
      {tab==='characters'&&<><label>Élément<Select value={f.element} onChange={e=>set('element',e.target.value)}><option value="">Tous</option>{elements.map(e=><option key={e}>{e}</option>)}</Select></label>
        <label>Constellation min.<Select value={f.minC} onChange={e=>set('minC',e.target.value)}>{[0,1,2,3,4,5,6].map(n=><option key={n} value={n}>C{n}</option>)}</Select></label>
        <label>Constellation max.<Select value={f.maxC} onChange={e=>set('maxC',e.target.value)}>{[0,1,2,3,4,5,6].map(n=><option key={n} value={n}>C{n}</option>)}</Select></label></>}
      {tab!=='artifacts'&&<label>Type d’arme<Select value={f.weapon} onChange={e=>set('weapon',e.target.value)}><option value="">Tous</option>{weaponTypes.map(w=><option key={w}>{w}</option>)}</Select></label>}
      {tab==='weapons'&&<label>Raffinement min.<Select value={f.minR} onChange={e=>set('minR',e.target.value)}>{[1,2,3,4,5].map(n=><option key={n} value={n}>R{n}</option>)}</Select></label>}
      <button className="text-button" onClick={()=>setF({owned:'',rarity:'',element:'',weapon:'',minC:'0',maxC:'6',minR:'1',search:''})}>Réinitialiser</button></div>
      <p className="muted">{number(rows.length)} résultat(s) · {pct} % de cette catégorie possédée. {f.minC!=='0'||f.minR!=='1'?'Un filtre de constellation ou de raffinement masque les éléments manquants.':''}</p>
      <div className={s.bar}><i style={{width:pct+'%'}}/></div></div>
    <div className={s.cards} style={{marginTop:16}}>{rows.map(([key,r])=>{const mine=owned[tab].get(key),img=r.portrait??r.image??Object.values(r.pieces??{})[0]?.image;const body=<>{img&&<img src={img} width="72" height="72" alt="" loading="lazy" className={mine?'':s.missing}/>}<strong>{r.name}</strong><small>{'★'.repeat(r.rarity??0)}</small><small>{!mine?'Non possédé':tab==='characters'?`C${mine.constellation} · Niv. ${mine.level}`:tab==='weapons'?`R${mine.refinement}${mine.copies>1?` · ×${mine.copies}`:''}`:`${mine.pieces} pièce(s) · ${mine.maxed} 5★ +20`}</small></>;
      return tab==='characters'&&mine?<Link key={key} className={`${s.card} elemental-card`} data-element={tab==='characters'?elementName(r.element):undefined} href={'/characters/'+encodeURIComponent(key)}>{body}</Link>:<div key={key} className={`${s.card} elemental-card`} data-element={tab==='characters'?elementName(r.element):undefined}>{body}</div>;})}</div>
  </section>;
}
