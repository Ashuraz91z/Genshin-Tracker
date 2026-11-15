import { useEffect, useRef } from 'react';
import Icon from './Icon';
export const number=n=>new Intl.NumberFormat('fr-FR').format(n);
export const when=value=>value?new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'Pas encore de scan';
export function Modal({children,onClose,label}) {
  const dialog=useRef(null);
  useEffect(()=>{dialog.current.showModal();},[]);
  return <dialog ref={dialog} onClose={onClose} aria-label={label}><form method="dialog"><button className="close-button" aria-label="Fermer la fenêtre">×</button></form>{children}</dialog>;
}
export function Empty({title,description,onPair}) {
  return <div className="empty-state"><div className="empty-orbit"><Icon name="star"/></div><h3>{title}</h3><p>{description}</p>{onPair&&<button className="button secondary" onClick={onPair}>Relier Kamera <Icon name="link"/></button>}</div>;
}
export function CharacterCard({character,reference={},onClick}) {
  const name=reference.name??character.key;
  return <button className="character-card" onClick={onClick} aria-label={`Voir ${name}`}><div className={`portrait-wrap ${reference.rarity===4?'four':''}`}>
    {reference.portrait?<img src={reference.portrait} alt="" loading="lazy" width="200" height="190"/>:<span className="portrait-initial">{name[0]}</span>}
    <span className="element-badge">{reference.element??'Non référencé'}</span></div><div className="character-info"><div className="stars" aria-label={`${reference.rarity??'?'} étoiles`}>{'✦'.repeat(reference.rarity??0)}</div><h3>{name}</h3><div><span>Niv. {character.level}</span><span>C{character.constellation}</span></div></div></button>;
}
const categories={characters:'Personnages',weapons:'Armes',artifacts:'Artéfacts',materials:'Matériaux'};
const outcomes={merged:'données fusionnées',replaced:'inventaire actualisé, compteur concordant',first_partial:'premier relevé partiel enregistré',preserved_previous:'inventaire précédent conservé, scan incomplet',older_scan:'relevé plus ancien, données actuelles conservées'};
export function Activity({scan,details=false,catalogue}) {
  const issue=scan.report.errors.length>0||scan.report.partialCharacters.length>0||['interrupted','failed','finished_with_errors','imported'].includes(scan.report.status)||Object.values(scan.applied).some(v=>['preserved_previous','first_partial','older_scan'].includes(v));
  const total=Object.entries(scan.counts).map(([key,n])=>`${number(n)} ${categories[key].toLocaleLowerCase('fr')}`).join(' · ');
  return <><div className="activity-row"><span className={`activity-icon ${issue?'warning':''}`}><Icon name={issue?'shield':'refresh'}/></span><div><div className="activity-title">{scan.device}</div><p>{total||'Aucune catégorie actualisée'}</p></div><div className="activity-time"><div className={`status-badge ${issue?'warning':''}`}>{issue?'À vérifier':'Reçu'}</div><div>{when(scan.received)}</div></div></div>
    {details&&<details className="scan-details"><summary>Détails du relevé</summary><p>Capture : {when(scan.captured)}. L’exhaustivité du compte reste non vérifiée.</p><ul>
      {Object.entries(scan.applied).map(([key,value])=><li key={key}>{categories[key]} : {outcomes[value]??value}</li>)}
      {scan.report.partialCharacters.map((c,i)=><li key={`partial-${i}`}>Personnage incomplet : {catalogue.characters?.[c.key]?.name??c.key}</li>)}
      {scan.report.errors.map((error,i)=><li key={`error-${i}`}>{error}</li>)}
      {scan.report.errorCount>scan.report.errors.length&&<li>Autres erreurs disponibles dans le rapport local de Kamera.</li>}</ul></details>}</>;
}
export const statNames={hp:'PV',hp_:'PV %',atk:'ATQ',atk_:'ATQ %',def:'DÉF',def_:'DÉF %',enerRech_:'Recharge d’énergie',eleMas:'Maîtrise élémentaire',critRate_:'Taux CRIT',critDMG_:'DGT CRIT',heal_:'Bonus de soins',physical_dmg_:'DGT physiques'};
export const slotNames={flower:'Fleur',plume:'Plume',sands:'Sablier',goblet:'Coupe',circlet:'Couronne'};
