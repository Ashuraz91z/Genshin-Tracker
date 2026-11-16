'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import Icon from './Icon';
import { Modal } from './Collection';
import { elementName } from '../lib/collection.mjs';
import styles from './controls.module.css';
export default function QuickSearch({sections,characters=[],catalogue}) {
 const router=useRouter(),[open,setOpen]=useState(false),[query,setQuery]=useState(''),[shortcut,setShortcut]=useState('Ctrl K');
 const show=()=>{setQuery('');setOpen(true);};
 useEffect(()=>{
  setShortcut(/Mac|iPhone|iPad/.test(navigator.platform)?'⌘ K':'Ctrl K');
  const key=e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setOpen(value=>!value);setQuery('');}};
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[]);
 const go=url=>{setOpen(false);router.push(url);};
 const pages=Object.values(sections);
 const people=characters.map(c=>{const r=catalogue.characters?.[c.key]??{};return {...c,name:r.name??c.key,element:elementName(r.element),portrait:r.portrait};});
 return <><button className="settings-button" aria-label={`Recherche rapide (${shortcut})`} onClick={show}><Icon name="search"/><span>Rechercher <kbd>{shortcut}</kbd></span></button>
 {open&&<Modal label="Recherche rapide" className={styles.commandDialog} onClose={()=>setOpen(false)}><Command label="Navigation rapide" loop className={styles.command}>
  <div className={styles.commandHeader}><Icon name="search"/><Command.Input autoFocus data-autofocus value={query} onValueChange={setQuery} placeholder="Où voulez-vous aller ?" aria-label="Rechercher une page ou un personnage"/></div>
  <Command.List className={styles.commandList}><Command.Empty className={styles.commandEmpty}><Icon name="search"/><strong>Aucun résultat</strong><span>Essayez un autre nom de personnage ou de page.</span></Command.Empty>
   <Command.Group heading="Navigation">{pages.map(page=><Command.Item key={page.url} value={page.label} onSelect={()=>go(page.url)} className={styles.commandItem}><span className={styles.commandIcon}><Icon name={page.icon}/></span><span className={styles.commandText}>{page.label}</span><span className={styles.commandHint}>Ouvrir <span aria-hidden="true">↵</span></span></Command.Item>)}</Command.Group>
   <Command.Group heading="Vos personnages">{people.map(person=><Command.Item key={person.key} value={`${person.name} ${person.element}`} onSelect={()=>go('/characters/'+encodeURIComponent(person.key))} className={styles.commandItem}><span className={styles.commandAvatar} data-element={person.element}>{person.portrait?<img src={person.portrait} width="34" height="38" alt=""/>:<Icon name="users"/>}</span><span className={styles.commandText}>{person.name}<small>{person.element} · Niveau {person.level} · C{person.constellation}</small></span><span className={styles.commandHint} aria-hidden="true">↵</span></Command.Item>)}</Command.Group>
  </Command.List><div className={styles.commandFooter}><span><kbd>↑</kbd><kbd>↓</kbd> Naviguer</span><span><kbd>↵</kbd> Ouvrir</span><span><kbd>esc</kbd> Fermer</span></div>
 </Command></Modal>}</>;
}
