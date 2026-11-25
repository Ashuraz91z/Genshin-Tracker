import Link from 'next/link';
import CharacterEquipment from './CharacterEquipment';
import UpgradeGuide from './UpgradeGuide';
import { elementName } from '../lib/collection.mjs';
export default function CharacterDetails({character,reference={},data,catalogue,onEdit}){
  return <section className="character-page"><Link className="text-button" href="/characters">← Tous les personnages</Link><div className="character-profile panel" data-element={elementName(reference.element)}>{reference.portrait&&<img src={reference.portrait} alt="" width="220" height="220"/>}<div><span className="eyebrow">{elementName(reference.element)} · {reference.rarity} ÉTOILES</span><h2>{reference.name??character.key}</h2><p>Niveau {character.level} · Constellation {character.constellation}</p><div className="profile-talents">{['auto','skill','burst'].map((key,i)=><div key={key}><strong><span>Nv.</span>{character.talent[key]}</strong><span>{['Attaque normale','Compétence','Déchaînement'][i]}</span></div>)}</div><small>Aptitudes de base relevées, avant bonus de constellation.</small></div></div><UpgradeGuide character={character} data={data} catalogue={catalogue}/><CharacterEquipment data={data} catalogue={catalogue} characterKey={character.key} onEdit={onEdit}/></section>;
}
