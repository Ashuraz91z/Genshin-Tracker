'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { Modal } from './Collection';
import { elementName } from '../lib/collection.mjs';
export default function QuickSearch({sections,characters=[],catalogue}) {
  const router=useRouter(),[open,setOpen]=useState(false),[query,setQuery]=useState('');
  useEffect(()=>{
    const key=e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setQuery('');setOpen(true);}};
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[]);
  const q=query.trim().toLocaleLowerCase('fr');
  const results=[...Object.values(sections).map(s=>({id:s.url,label:s.label,hint:'Page',icon:s.icon,url:s.url})),
    ...characters.map(c=>{const r=catalogue.characters?.[c.key]??{};return {id:c.key,label:r.name??c.key,hint:`${elementName(r.element)||'Personnage'} · Niv. ${c.level} · C${c.constellation}`,portrait:r.portrait,url:'/characters/'+encodeURIComponent(c.key)};})]
    .filter(r=>!q||`${r.label} ${r.hint}`.toLocaleLowerCase('fr').includes(q)).slice(0,8);
  const go=url=>{setOpen(false);router.push(url);};
  return <><button className="settings-button" aria-label="Recherche rapide (Ctrl+K)" onClick={()=>{setQuery('');setOpen(true);}}><Icon name="search"/><span>Rechercher <kbd>Ctrl K</kbd></span></button>
    {open&&<Modal label="Recherche rapide" className="quick-search" onClose={()=>setOpen(false)}><label className="search-field"><Icon name="search"/><input autoFocus type="search" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&results[0])go(results[0].url);}} placeholder="Un personnage, une page…" aria-label="Rechercher un personnage ou une page"/></label>
      <ul className="quick-results">{results.map(r=><li key={r.id}><button onClick={()=>go(r.url)}>{r.portrait?<img src={r.portrait} width="32" height="32" alt=""/>:<Icon name={r.icon}/>}<span><strong>{r.label}</strong><small>{r.hint}</small></span></button></li>)}</ul>
      {!results.length&&<p className="muted">Aucun résultat pour « {query} ». Essayez un nom de personnage comme « Bennett » ou une page comme « Inventaire ».</p>}
      <p className="muted"><kbd>Entrée</kbd> ouvre le premier résultat · <kbd>Échap</kbd> ferme</p></Modal>}</>;
}
