import { useEffect, useRef } from 'react';
import Icon from './Icon';
import { elementName } from '../lib/collection.mjs';
export const number=n=>new Intl.NumberFormat('fr-FR').format(n);
export const when=value=>value?new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'Pas encore de scan';
export function Modal({children,onClose,label,className}) {
  const dialog=useRef(null);
  useEffect(()=>{dialog.current.showModal();dialog.current.querySelector('[data-autofocus]')?.focus();},[]);
  return <dialog ref={dialog} className={className} onClose={onClose} aria-label={label}><form method="dialog"><button className="close-button" aria-label="Fermer la fenêtre">×</button></form>{children}</dialog>;
}
export function Empty({title,description,onPair}) {
  return <div className="empty-state"><div className="empty-orbit"><Icon name="star"/></div><h3>{title}</h3><p>{description}</p>{onPair&&<button className="button secondary" onClick={onPair}>Relier Kamera <Icon name="link"/></button>}</div>;
}
const slotOrder=['flower','plume','sands','goblet','circlet'];
// Weapon + the 5 artifact slots as thumbnails; a dashed square marks what the scan could not identify.
export function Loadout({equipment}) {
  const weapon=equipment.weapons[0],thumb=(item,label)=>item?.image?<img src={item.image} alt="" title={item.name} width="34" height="34" loading="lazy" className={`rarity-${item.rarity}`}/>:<span className="loadout-empty" title={label}/>;
  return <div className="character-loadout">
    <div className="loadout-weapon">{thumb(weapon,'Arme non identifiée')}<span><strong>{weapon?weapon.name:'Arme non identifiée'}</strong>{weapon&&<small>Niv. {weapon.level} · R{weapon.refinement??1}</small>}</span></div>
    <div className="loadout-artifacts">{slotOrder.map(slot=>{const item=equipment.slots[slot][0];return <span key={slot}>{thumb(item,'Artéfact non identifié')}<small>{item?'+'+(item.level??0):'—'}</small></span>;})}</div>
  </div>;
}
export function CharacterCard({character,reference={},equipment,onClick}) {
  const name=reference.name??character.key;
  return <button className="character-card" data-element={elementName(reference.element)} onClick={onClick} aria-label={`Voir ${name}`}><div className={`portrait-wrap ${reference.rarity===4?'four':''}`}>
    {reference.portrait?<img src={reference.portrait} alt="" loading="lazy" width="200" height="190"/>:<span className="portrait-initial">{name[0]}</span>}
    <span className="element-badge">{elementName(reference.element)||'Non référencé'}</span></div><div className="character-info"><div className="stars" aria-label={`${reference.rarity??'?'} étoiles`}>{'✦'.repeat(reference.rarity??0)}</div><h3>{name}</h3><div><span>Niv. {character.level}</span><span>C{character.constellation}</span></div>{equipment&&<Loadout equipment={equipment}/>}</div></button>;
}
const categories={characters:'Personnages',weapons:'Armes',artifacts:'Artéfacts',materials:'Matériaux',quests:'Quêtes'};
const outcomes={log_replaced:'journal de quêtes remplacé par ce relevé',partial_merged:'pièces valides fusionnées, pièces précédentes conservées',merged:'données fusionnées',replaced:'inventaire actualisé, compteur concordant',first_partial:'premier relevé partiel enregistré',preserved_previous:'inventaire précédent conservé, scan incomplet',older_scan:'relevé plus ancien, données actuelles conservées',empty_scan:'aucune donnée lisible, données précédentes conservées',manual_replaced:'inventaire remplacé à votre demande, import non vérifié'};
// Debug: every line Kamera read in the quest log, and what the site understood (lib/quests.mjs).
function QuestTrace({trace}) {
  return <details className="scan-details"><summary>Journal de quêtes : lecture ligne par ligne ({number(trace.length)} lignes)</summary>
    <ol className="scan-timeline" style={{maxHeight:480,listStyle:'none',paddingLeft:0}}>{trace.map(([tab,page,line,kind],i)=><li key={i} style={{opacity:/ignor|bruit|vide/.test(kind)?.6:1}}>
      <time>onglet {tab} · p. {page}</time>« {line} » → {kind}</li>)}</ol></details>;
}
export function Activity({scan,details=false,catalogue}) {
  const issue=scan.report.errors.length>0||scan.report.partialCharacters.length>0||['interrupted','failed','finished_with_errors','imported'].includes(scan.report.status)||Object.values(scan.applied).some(v=>['partial_merged','preserved_previous','first_partial','older_scan','empty_scan','manual_replaced'].includes(v));
  const total=Object.entries(scan.counts).map(([key,n])=>`${number(n)} ${categories[key].toLocaleLowerCase('fr')}`).join(' · ');
  return <><div className="activity-row"><span className={`activity-icon ${issue?'warning':''}`}><Icon name={issue?'shield':'refresh'}/></span><div><div className="activity-title">{scan.device}</div><p>{total||'Aucune catégorie actualisée'}</p></div><div className="activity-time"><div className={`status-badge ${issue?'warning':''}`}>{issue?'À vérifier':'Reçu'}</div><div>{when(scan.received)}</div></div></div>
    {details&&<details className="scan-details" open={issue||undefined}><summary>Détails du relevé</summary><p>Capture : {when(scan.captured)} · Réception : {when(scan.received)} · Statut : {scan.report.status}. L’exhaustivité du compte reste non vérifiée.</p><ul>
      {Object.entries(scan.applied).map(([key,value])=><li key={key}>{categories[key]} : {number(scan.counts[key]??0)} reçus — {outcomes[value]??value}</li>)}
      {scan.report.rejectedArtifacts>0&&<li>{scan.report.rejectedArtifacts} artéfact(s) invalides exclus. Le reste du relevé a été traité ; l’ancien inventaire peut avoir été conservé.</li>}
      {scan.counts.characters===0&&<li>Aucun personnage valide dans ce fichier. Vérifiez que la catégorie Personnages est cochée et consultez les erreurs OCR.</li>}
      {scan.report.partialCharacters.map((c,i)=><li key={`partial-${i}`}>Personnage incomplet : {catalogue.characters?.[c.key]?.name??c.key}</li>)}
      {scan.report.errors.map((error,i)=><li key={`error-${i}`}>{error}</li>)}
      {scan.report.errorCount>scan.report.errors.length&&<li>Autres erreurs disponibles dans le rapport local de Kamera.</li>}</ul>{scan.report.events?.length>0&&<><h3>Étapes du scan</h3><ol className="scan-timeline">{scan.report.events.map((event,i)=><li key={i}><time>{event.at?when(event.at):"Heure inconnue"}</time> {event.message}</li>)}</ol></>}{scan.report.questTrace?.length>0&&<QuestTrace trace={scan.report.questTrace}/>}</details>}</>;
}
export const statNames={hp:'PV',hp_:'PV %',atk:'ATQ',atk_:'ATQ %',def:'DÉF',def_:'DÉF %',enerRech_:'Recharge d’énergie',eleMas:'Maîtrise élémentaire',critRate_:'Taux CRIT',critDMG_:'DGT CRIT',heal_:'Bonus de soins',physical_dmg_:'DGT physiques',pyro_dmg_:'Bonus DGT Pyro',hydro_dmg_:'Bonus DGT Hydro',anemo_dmg_:'Bonus DGT Anémo',electro_dmg_:'Bonus DGT Électro',cryo_dmg_:'Bonus DGT Cryo',geo_dmg_:'Bonus DGT Géo',dendro_dmg_:'Bonus DGT Dendro'};
export const slotNames={flower:'Fleur',plume:'Plume',sands:'Sablier',goblet:'Coupe',circlet:'Couronne'};
