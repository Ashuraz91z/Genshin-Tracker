'use client';
import { useEffect, useRef, useState } from 'react';
import s from './features.module.css';
import usePlanner from './usePlanner';
import { number } from './Collection';
import { buildSimulation } from '../lib/simulation.mjs';
import { analyzeTeam, scenarioData, weaponChoices, defaultWeapon } from '../lib/team.mjs';
const tiers=[['current','Actuel','Votre compte tel que scanné : niveaux, aptitudes, arme et artéfacts équipés.'],['inventory','Avec votre inventaire','Niveau 90, aptitudes 10, meilleure arme possédée montée au 90, artéfacts renforcés (ou farmés). Constellations actuelles.'],['ideal','Tout le jeu','Toute arme du jeu, constellations et raffinements choisis, artéfacts bien farmés (≈ 40 CV par pièce).']];
function run(config,iterations,onProgress){
  return new Promise((resolve,reject)=>{const w=new Worker('/simulator/worker.js'),timer=setTimeout(()=>{w.terminate();reject(Error('Simulation interrompue après 60 secondes.'));},60000);
    w.onerror=e=>{clearTimeout(timer);w.terminate();reject(Error('Le moteur n’a pas pu démarrer : '+(e.message??'navigateur incompatible')));};
    w.onmessage=({data:m})=>{if(m.error){clearTimeout(timer);w.terminate();reject(Error(m.error));}else if(m.done){clearTimeout(timer);w.terminate();resolve(m.stats);}else if(m.progress)onProgress(m.progress);};
    w.postMessage({config,iterations});run.stop=()=>{clearTimeout(timer);w.terminate();reject(Error('Simulation arrêtée.'));};});
}
export default function TeamInsights({draft,data,catalogue,metadata}) {
  const planner=usePlanner(),[opts,setOpts]=useState({constellation:'0',refinement:'1',artifacts:'upgrade'}),[results,setResults]=useState({}),[status,setStatus]=useState(''),[error,setError]=useState('');
  const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;run.stop?.();};},[]);
  const keys=draft.characters.filter(Boolean),analysis=analyzeTeam(keys,data,catalogue);
  const member=(key,field,value)=>setOpts(o=>({...o,[key]:{...o[key],[field]:value}}));
  const perChar=mode=>Object.fromEntries(keys.map(k=>[k,{...opts[k],constellation:opts[k]?.constellation??opts.constellation,refinement:opts[k]?.refinement??opts.refinement,artifacts:opts.artifacts,weapon:mode==='ideal'?opts[k]?.idealWeapon:opts[k]?.weapon}]));
  const configs=metadata&&planner&&keys.length?Object.fromEntries(tiers.map(([mode])=>{const d=mode==='current'?data:scenarioData(mode,keys,data,catalogue,metadata,planner,perChar(mode));return [mode,buildSimulation({...draft,characters:keys},d,catalogue,metadata)];})):{};
  async function simulateAll(){
    setError('');const next={};
    for(const [mode,label] of tiers){const c=configs[mode];if(!c||c.issues.length){next[mode]={issues:c?.issues??[]};continue;}
      try{setStatus(`${label}…`);const stats=await run(c.config,Number(draft.iterations),p=>alive.current&&setStatus(`${label} · ${p}/${draft.iterations}`));next[mode]={stats,config:c.config};if(alive.current)setResults({...next});}
      catch(e){if(alive.current)setError(e.message);break;}}
    if(alive.current){setResults({...next});setStatus('');}
  }
  const dps=mode=>results[mode]?.stats&&results[mode].config===configs[mode]?.config?results[mode].stats.dps.mean:null;
  const best=Math.max(...tiers.map(([m])=>dps(m)??0),1);
  return <section className="panel team-result" aria-label="Analyse de l’équipe">
    <div className="section-heading"><div><span className="eyebrow">ANALYSE ET POTENTIEL</span><h2>{draft.name||'Votre équipe'}</h2></div><div className="team-sim-actions"><button className="button primary" disabled={!!status||!keys.length||!metadata||!planner} onClick={simulateAll}>{status?`Simulation · ${status}`:'Estimer les 3 niveaux de dégâts'}</button>{status&&<button className="button secondary" onClick={()=>run.stop?.()}>Arrêter</button>}</div></div>
    {keys.length>0&&<div className={s.verdict}><div className={s.good}><h4>Ce qui va bien</h4>{analysis.good.length?<ul>{analysis.good.map(t=><li key={t}>{t}</li>)}</ul>:<p className="muted">Rien de marquant pour l’instant.</p>}</div><div className={s.bad}><h4>À corriger</h4>{analysis.bad.length?<ul>{analysis.bad.map(t=><li key={t}>{t}</li>)}</ul>:<p className="muted">Aucun point faible détecté.</p>}</div></div>}
    <div className={s.tiers}>{tiers.map(([mode,label,text])=>{const v=dps(mode),cur=dps('current'),r=results[mode];return <div className={s.tier} key={mode}><span className="eyebrow">{label}</span><strong>{v!==null?number(Math.round(v)):'—'}</strong><small>DPS moyen{v!==null?` · ${number(Math.round(results[mode].stats.total_damage.mean))} dégâts en ${draft.duration} s`:''}</small>{v!==null&&cur&&mode!=='current'&&<span className={s.gain}>+{number(Math.round(100*(v-cur)/cur))} % par rapport à l’actuel</span>}<div className={s.bar}><i style={{width:(v??0)/best*100+'%'}}/></div><small>{text}</small>{(r?.issues??configs[mode]?.issues??[]).length>0&&<small className="field-error">{(r?.issues??configs[mode].issues).slice(0,3).join(' ')}</small>}</div>;})}</div>
    {error&&<p className="field-error" role="alert">{error}</p>}
    {keys.length>0&&metadata&&planner&&<details open><summary>Personnaliser les hypothèses « inventaire » et « tout le jeu »</summary>
      <div className={s.options}><label>Artéfacts (inventaire)<select value={opts.artifacts} onChange={e=>setOpts(o=>({...o,artifacts:e.target.value}))}><option value="upgrade">Renforcer mes pièces actuelles à +20</option><option value="farmed">Farmer des pièces neuves (≈ 40 CV)</option></select></label>
        <label>Constellations (tout le jeu)<select value={opts.constellation} onChange={e=>setOpts(o=>({...o,constellation:e.target.value}))}>{[0,1,2,3,4,5,6].map(n=><option key={n} value={n}>Toutes C{n}</option>)}</select></label>
        <label>Raffinement (tout le jeu)<select value={opts.refinement} onChange={e=>setOpts(o=>({...o,refinement:e.target.value}))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>Toutes R{n}</option>)}</select></label></div>
      <div className={s.members}>{keys.map(k=>{const ref=catalogue.characters?.[k]??{},own=weaponChoices(k,data,catalogue,metadata,'inventory'),game=weaponChoices(k,data,catalogue,metadata,'ideal').sort((a,b)=>b.rarity-a.rarity||a.name.localeCompare(b.name,'fr')),def=defaultWeapon(k,data,catalogue,metadata,planner,'ideal'),sets=Object.keys(metadata.artifacts).filter(x=>catalogue.artifacts?.[x]).sort((a,b)=>catalogue.artifacts[a].name.localeCompare(catalogue.artifacts[b].name,'fr'));
        return <div className={s.member} key={k}><header>{ref.portrait&&<img src={ref.portrait} width="32" height="32" alt=""/>}{ref.name??k}<small className="muted">C{data.characters.find(c=>c.key===k)?.constellation}</small></header>
          <label>Arme possédée (inventaire)<select value={opts[k]?.weapon??''} onChange={e=>member(k,'weapon',e.target.value)}><option value="">Automatique (meilleure)</option>{own.map(w=><option key={w.index} value={w.index}>{w.name} R{w.refinement}{w.location&&w.location!==k?' · équipée ailleurs':''}</option>)}</select></label>
          <label>Arme (tout le jeu)<select value={opts[k]?.idealWeapon??''} onChange={e=>member(k,'idealWeapon',e.target.value)}><option value="">Automatique · {def?.name??'—'}</option>{game.map(w=><option key={w.key} value={w.key}>{'★'.repeat(w.rarity)} {w.name}</option>)}</select></label>
          <label>Constellation (tout le jeu)<select value={opts[k]?.constellation??''} onChange={e=>member(k,'constellation',e.target.value||undefined)}><option value="">Comme le réglage global</option>{[0,1,2,3,4,5,6].map(n=><option key={n} value={n}>C{n}</option>)}</select></label>
          <label>Raffinement (tout le jeu)<select value={opts[k]?.refinement??''} onChange={e=>member(k,'refinement',e.target.value||undefined)}><option value="">Comme le réglage global</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>R{n}</option>)}</select></label>
          <label>Set farmé<select value={opts[k]?.set??''} onChange={e=>member(k,'set',e.target.value)}><option value="">Set actuel majoritaire</option>{sets.map(x=><option key={x} value={x}>{catalogue.artifacts[x].name}</option>)}</select></label></div>;})}</div></details>}
    {analysis.info.map(t=><p className="simulation-note" key={t}>{t}</p>)}
    <p className="simulation-note">Estimations gcsim {metadata?.version??''} dans votre navigateur, avec la rotation et les hypothèses de l’éditeur ci-dessous. La rotation de base n’est pas optimisée : comparez surtout les trois niveaux entre eux. L’EXP des personnages et des armes n’est pas comptée dans les coûts.</p>
  </section>;
}
