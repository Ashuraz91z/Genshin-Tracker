'use client';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import { Modal } from './Collection';
export default function Settings() {
  const [open,setOpen]=useState(false),[theme,setTheme]=useState('system'),[reducedGlass,setReducedGlass]=useState(false),[storageError,setStorageError]=useState(false);
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('gt-appearance')??'{}');setTheme(['light','dark','system'].includes(saved.theme)?saved.theme:'system');setReducedGlass(saved.reducedGlass===true);}catch{}},[]);
  function update(nextTheme,nextReducedGlass) {
    setTheme(nextTheme);setReducedGlass(nextReducedGlass);
    document.documentElement.dataset.theme=nextTheme;document.documentElement.dataset.reducedGlass=String(nextReducedGlass);
    try{localStorage.setItem('gt-appearance',JSON.stringify({theme:nextTheme,reducedGlass:nextReducedGlass}));setStorageError(false);}catch{setStorageError(true);}
  }
  return <><button className="settings-button" aria-label="Ouvrir les paramètres" onClick={()=>setOpen(true)}><Icon name="settings"/><span>Paramètres</span></button>{open&&<Modal label="Paramètres d’affichage" onClose={()=>setOpen(false)}><span className="eyebrow">À VOTRE IMAGE</span><h2>Paramètres</h2><p>Personnalisez votre carnet. Ces préférences sont enregistrées sur ce navigateur.</p><fieldset className="theme-options"><legend>Apparence</legend>{[['system','Automatique','monitor'],['light','Clair','sun'],['dark','Sombre','moon']].map(([value,label,icon])=><label key={value}><input type="radio" name="theme" value={value} checked={theme===value} onChange={()=>update(value,reducedGlass)}/><Icon name={icon}/>{label}</label>)}</fieldset><label className="glass-toggle"><span><strong>Réduire la transparence</strong><small>Des surfaces plus opaques pour faciliter la lecture.</small></span><input type="checkbox" checked={reducedGlass} onChange={e=>update(theme,e.target.checked)}/></label>{storageError&&<p role="status">Le navigateur ne permet pas d’enregistrer ce réglage. Il reste actif sur cette page.</p>}</Modal>}</>;
}
