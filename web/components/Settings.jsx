'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import { plans } from '../lib/plans.mjs';

const date=value=>value?new Date(value).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}):'—';
const daysLeft=value=>Math.max(0,Math.ceil((Date.parse(value)-Date.now())/864e5));
const field=event=>Object.fromEntries(new FormData(event.currentTarget));

function Card({id,icon,title,description,children,danger}) {
  return <section id={id} className={`settings-card ${danger?'danger':''}`} aria-labelledby={id+'-title'}>
    <header><span className="settings-card-icon"><Icon name={icon}/></span><div><h2 id={id+'-title'}>{title}</h2>{description&&<p>{description}</p>}</div></header>{children}
  </section>;
}
function Row({label,hint,children}) {
  return <div className="settings-row"><div className="settings-row-label"><strong>{label}</strong>{hint&&<small>{hint}</small>}</div><div className="settings-row-control">{children}</div></div>;
}

function Display() {
  const [theme,setTheme]=useState('system'),[reducedGlass,setReducedGlass]=useState(false),[storageError,setStorageError]=useState(false);
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('gt-appearance')??'{}');setTheme(['light','dark','system'].includes(saved.theme)?saved.theme:'system');setReducedGlass(saved.reducedGlass===true);}catch{}},[]);
  function update(nextTheme,nextReducedGlass) {
    setTheme(nextTheme);setReducedGlass(nextReducedGlass);
    document.documentElement.dataset.theme=nextTheme;document.documentElement.dataset.reducedGlass=String(nextReducedGlass);
    try{localStorage.setItem('gt-appearance',JSON.stringify({theme:nextTheme,reducedGlass:nextReducedGlass}));setStorageError(false);}catch{setStorageError(true);}
  }
  return <Card id="affichage" icon="sun" title="Affichage" description="Enregistré sur ce navigateur uniquement.">
    <Row label="Thème"><fieldset className="theme-options"><legend className="sr-only">Thème</legend>{[['system','Automatique','monitor'],['light','Clair','sun'],['dark','Sombre','moon']].map(([value,label,icon])=><label key={value}><input type="radio" name="theme" value={value} checked={theme===value} onChange={()=>update(value,reducedGlass)}/><Icon name={icon}/>{label}</label>)}</fieldset></Row>
    <Row label="Réduire la transparence" hint="Des surfaces plus opaques, plus faciles à lire."><input className="switch" type="checkbox" aria-label="Réduire la transparence" checked={reducedGlass} onChange={e=>update(theme,e.target.checked)}/></Row>
    {storageError&&<p className="settings-note" role="status">Le navigateur ne permet pas d’enregistrer ce réglage. Il reste actif sur cette page.</p>}
  </Card>;
}

function Subscription({billing,api,notify,onBilling,onChoose,onManage}) {
  const [confirming,setConfirming]=useState(false),[busy,setBusy]=useState(false);
  const plan=plans.find(p=>p.id===billing.plan);
  async function cancel(resume) {
    setBusy(true);
    try{const result=await api('/api/billing/cancel',{method:'POST',body:JSON.stringify({resume})});onBilling(result.billing);setConfirming(false);
      notify(resume?'Votre abonnement continue. Rien ne change pour vous.':'Résiliation enregistrée. Un e-mail de confirmation vous a été envoyé.');}
    catch(e){notify(e.message,true);}finally{setBusy(false);}
  }
  const failing=['past_due','unpaid'].includes(billing.status);
  const [badge,tone,line]=failing?['Paiement en échec','warning','Votre dernier paiement n’est pas passé. Mettez à jour votre moyen de paiement pour garder l’accès.']
    :billing.canceling?['Résiliation programmée','warning',`Vous gardez l’accès jusqu’au ${date(billing.until)}. Aucun autre paiement ne sera prélevé.`]
    :billing.subscribed?['Actif','ok',`${billing.status==='trialing'?'Premier paiement':'Prochain renouvellement'} le ${date(billing.until)}.`]
    :billing.trial?['Essai gratuit','ok',`Encore ${daysLeft(billing.trialEnds)} jour${daysLeft(billing.trialEnds)>1?'s':''}, jusqu’au ${date(billing.trialEnds)}. Aucune carte enregistrée.`]
    :['Aucun abonnement','muted','Votre carnet est en pause. Vos données sont conservées.'];
  return <Card id="abonnement" icon="star" title="Abonnement" description="Formule, paiements et résiliation.">
    <div className="plan-status"><div><span className={`status-pill ${tone}`}>{badge}</span><strong>{billing.subscribed&&plan?`Formule ${{year:'annuelle',month:'mensuelle'}[plan.id]} · ${plan.price} ${plan.period}`:billing.trial?'Accès complet pendant l’essai':'Genshin Tracker'}</strong><p>{line}</p></div></div>
    <div className="settings-actions">
      {!billing.subscribed&&<button className="button primary" onClick={onChoose}>Choisir une formule</button>}
      {billing.canceling&&<button className="button primary" disabled={busy} onClick={()=>cancel(true)}>Reprendre mon abonnement</button>}
      {billing.manageable&&<button className="button secondary" onClick={onManage}>Moyen de paiement et factures</button>}
    </div>
    {billing.subscribed&&!billing.canceling&&(confirming?<div className="confirm-panel" role="group" aria-labelledby="cancel-title">
      <strong id="cancel-title">Résilier votre abonnement ?</strong>
      <ul><li>L’abonnement s’arrête le <strong>{date(billing.until)}</strong>, à la fin de la période déjà payée.</li><li>Aucun autre paiement ne sera prélevé, sans frais.</li><li>Vos personnages, équipes et inventaires restent conservés.</li></ul>
      <div className="settings-actions"><button className="button danger" disabled={busy} onClick={()=>cancel(false)}>{busy?'Résiliation…':'Confirmer la résiliation'}</button><button className="button secondary" disabled={busy} onClick={()=>setConfirming(false)}>Garder mon abonnement</button></div>
    </div>:<div className="settings-row cancel-row"><div className="settings-row-label"><strong>Résilier l’abonnement</strong><small>Sans frais, effective à la fin de la période payée. Confirmation par e-mail.</small></div><button className="button secondary" onClick={()=>setConfirming(true)}>Résilier mon abonnement</button></div>)}
    <p className="settings-note">Paiements sécurisés par Stripe. <Link href="/conditions-utilisation">Conditions d’utilisation</Link></p>
  </Card>;
}

export default function Settings({account,api,notify,setAccount,onLogout,onDeleted,onReset,onChooseBilling,onManageBilling,onPair,onRevoke,onExportGood,activity}) {
  const user=account.user,billing=account.billing,devices=account.devices??[],scans=account.scans??[];
  const sections=[['profil','Profil','users'],...(billing?.enabled?[['abonnement','Abonnement','star']]:[]),['securite','Sécurité','shield'],['appareils','Appareils et journal','monitor'],['donnees','Données et confidentialité','download'],['affichage','Affichage','sun']];
  const [active,setActive]=useState(sections[0][0]),[busy,setBusy]=useState(''),[email,setEmail]=useState(user.email??''),[deleting,setDeleting]=useState(false),[resetting,setResetting]=useState(false);
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(visible)setActive(visible.target.id);},{rootMargin:'-20% 0px -60% 0px'});
    sections.forEach(([id])=>{const el=document.getElementById(id);if(el)observer.observe(el);});
    if(location.hash)document.getElementById(location.hash.slice(1))?.scrollIntoView();
    return()=>observer.disconnect();
  },[sections.length]);
  useEffect(()=>{document.querySelector('.settings-nav a[aria-current]')?.scrollIntoView({block:'nearest',inline:'nearest'});},[active]);
  const patchUser=values=>setAccount(current=>({...current,user:{...current.user,...values}}));
  async function run(key,work,success) {setBusy(key);try{await work();if(success)notify(success);return true;}catch(e){notify(e.message,true);return false;}finally{setBusy('');}}
  const post=(path,data)=>api(path,{method:'POST',body:JSON.stringify(data)});
  const saveName=e=>{e.preventDefault();const {name}=field(e);run('name',async()=>patchUser({name:(await post('/api/account/name',{name})).name}),'Pseudo mis à jour. Utilisez-le pour vous connecter.');};
  const saveEmail=e=>{e.preventDefault();const {password}=field(e);run('email',async()=>{const {profile}=await post('/api/account/email',{email,password});patchUser(profile);},'Adresse enregistrée. Un lien de confirmation vient de vous être envoyé.');};
  const setNewsletter=value=>run('newsletter',async()=>{const {profile}=await post('/api/account/email',{newsletter:value});patchUser(profile);},value?'Inscription à la newsletter enregistrée.':'Vous ne recevrez plus la newsletter.');
  const resend=()=>run('resend',()=>post('/api/email/resend',{}),'Lien de confirmation renvoyé.');
  function changePassword(e) {
    e.preventDefault();const form=e.currentTarget,{current,password,confirm}=field(e);
    if(password!==confirm){notify('Les deux nouveaux mots de passe ne correspondent pas.',true);return;}
    run('password',async()=>{await post('/api/account/password',{current,password});form.reset();},'Mot de passe mis à jour. Les autres navigateurs ont été déconnectés.');
  }
  const signOutOthers=()=>run('sessions',()=>post('/api/account/sessions',{}),'Les autres navigateurs ont été déconnectés.');
  async function resetData(e) {e.preventDefault();const {password}=field(e);if(await run('reset',()=>post('/api/account/reset',{password}),'Toutes vos données importées ont été effacées.')){setResetting(false);onReset();}}
  async function deleteAccount(e) {e.preventDefault();const {password}=field(e);if(await run('delete',()=>post('/api/account/delete',{password})))onDeleted();}
  const emailChanged=email.trim().toLowerCase()!==(user.email??'');
  const lastSync=devices.map(d=>d.last_seen).filter(Boolean).sort().at(-1);

  return <div className="settings-page">
    <div className="page-heading"><div><span className="eyebrow">VOTRE ESPACE</span><h1>Paramètres</h1><p>Connecté en tant que <strong>{user.name}</strong>{user.email&&<> · {user.email}</>}</p></div></div>
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Rubriques des paramètres">{sections.map(([id,label,icon])=><a key={id} href={'#'+id} aria-current={active===id?'true':undefined} onClick={()=>setActive(id)}><Icon name={icon}/>{label}</a>)}
        <div className="settings-nav-footer"><Link href="/aide"><Icon name="bulb"/>Aide et contact</Link>{user.admin&&<Link href="/admin"><Icon name="dashboard"/>Administration</Link>}<button type="button" onClick={onLogout}><Icon name="chevron"/>Se déconnecter</button></div>
      </nav>
      <div className="settings-content">
        {!<section className="settings-card"><header><span className="settings-card-icon"><Icon name="users"/></span><div><h2>Créer un compte</h2><p>Gardez votre carnet sur tous vos appareils, reliez Kamera et retrouvez vos équipes. 14 jours d’essai, sans carte.</p></div></header><div className="settings-actions"><button className="button primary" onClick={onLogout}>Créer un compte ou se connecter</button></div></section>}

        {<Card id="profil" icon="users" title="Profil" description="Ce qui vous identifie sur Genshin Tracker.">
          <form className="settings-row" onSubmit={saveName}><div className="settings-row-label"><label htmlFor="settings-name"><strong>Pseudo</strong></label><small>C’est aussi votre identifiant de connexion.</small></div>
            <div className="settings-row-control inline-form"><input id="settings-name" name="name" defaultValue={user.name} key={user.name} minLength="3" maxLength="32" required autoComplete="username"/><button className="button secondary" disabled={busy==='name'}>{busy==='name'?'…':'Enregistrer'}</button></div></form>
          <form className="settings-row" onSubmit={saveEmail}><div className="settings-row-label"><label htmlFor="settings-email"><strong>Adresse e-mail</strong></label><small>Pour récupérer votre mot de passe et recevoir vos factures.</small></div>
            <div className="settings-row-control stacked"><div className="inline-form"><input id="settings-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength="254" required autoComplete="email" placeholder="vous@exemple.fr"/>{!emailChanged&&user.email&&<span className={`status-pill ${user.emailVerified?'ok':'warning'}`}>{user.emailVerified?'Confirmée':'À confirmer'}</span>}</div>
              {emailChanged&&<>{user.email&&<><label htmlFor="settings-email-password" className="field-label">Mot de passe actuel, pour confirmer le changement</label><input id="settings-email-password" name="password" type="password" required autoComplete="current-password" maxLength="128"/></>}<div className="settings-actions"><button className="button primary" disabled={busy==='email'}>Enregistrer l’adresse</button><button type="button" className="text-button" onClick={()=>setEmail(user.email??'')}>Annuler</button></div></>}
              {!emailChanged&&user.email&&!user.emailVerified&&<p className="settings-note">Ouvrez le lien reçu par e-mail pour confirmer l’adresse. <button type="button" className="text-button inline" disabled={busy==='resend'} onClick={resend}>Renvoyer le lien</button></p>}</div></form>
          <Row label="Newsletter" hint="Nouveautés du site et conseils de progression. Désinscription à tout moment."><input className="switch" type="checkbox" aria-label="Recevoir la newsletter" checked={!!user.newsletter} disabled={busy==='newsletter'} onChange={e=>setNewsletter(e.target.checked)}/></Row>
        </Card>}

        {billing?.enabled&&<Subscription billing={billing} api={api} notify={notify} onBilling={plan=>setAccount(current=>({...current,billing:plan}))} onChoose={onChooseBilling} onManage={onManageBilling}/>}

        {<Card id="securite" icon="shield" title="Sécurité" description="Mot de passe et sessions ouvertes.">
          <form className="settings-form" onSubmit={changePassword}><h3>Changer de mot de passe</h3>
            <div className="field-grid"><label>Mot de passe actuel<input name="current" type="password" autoComplete="current-password" maxLength="128" required/></label>
              <label>Nouveau mot de passe<input name="password" type="password" autoComplete="new-password" minLength="8" maxLength="128" required placeholder="8 caractères minimum"/></label>
              <label>Confirmer le nouveau<input name="confirm" type="password" autoComplete="new-password" minLength="8" maxLength="128" required/></label></div>
            <div className="settings-actions"><button className="button primary" disabled={busy==='password'}>Mettre à jour le mot de passe</button></div></form>
          <Row label="Sessions ouvertes" hint="Déconnecte tous les autres navigateurs. Vos PC associés à Kamera restent reliés."><button className="button secondary" disabled={busy==='sessions'} onClick={signOutOthers}>Déconnecter les autres navigateurs</button></Row>
        </Card>}

        {<Card id="appareils" icon="monitor" title="Appareils et journal" description="Les PC reliés à Kamera et l’historique technique de vos relevés.">
          <div className="settings-subhead"><h3>PC associés</h3><button className="button secondary" onClick={onPair}><Icon name="link"/>Associer un PC</button></div>
          {devices.length?<ul className="device-list">{devices.map(d=><li key={d.id}><Icon name="monitor"/><div><strong>{d.name}</strong><small>Associé le {date(d.created)} · dernier envoi {d.last_seen?date(d.last_seen):'jamais'}</small></div><button className="button secondary" onClick={()=>onRevoke(d.id)}>Dissocier</button></li>)}</ul>:<p className="settings-empty">Aucun PC associé pour l’instant.</p>}
          <dl className="tech-facts"><div><dt>Dernier envoi</dt><dd>{lastSync?date(lastSync):'—'}</dd></div><div><dt>Relevés reçus</dt><dd>{scans.length}{scans.length>=30?'+':''}</dd></div><div><dt>Données mises à jour</dt><dd>{date(account.data?.updatedAt)}</dd></div><div><dt>Format</dt><dd>GOOD</dd></div></dl>
          <details className="settings-log"><summary>Journal des relevés ({scans.length})</summary><div>{activity()}</div></details>
        </Card>}

        <Card id="donnees" icon="download" title="Données et confidentialité" description="Récupérez vos données à tout moment.">
          <Row label="Inventaire au format GOOD" hint="Réutilisable ici ou dans Genshin Optimizer."><button className="button secondary" disabled={!account.data?.updatedAt} onClick={onExportGood}><Icon name="download"/>Télécharger</button></Row>
          {<Row label="Toutes mes données" hint="Compte, inventaire, équipes, appareils, relevés et demandes d’aide, en JSON."><a className="button secondary" href="/api/account/export" download><Icon name="download"/>Exporter</a></Row>}
          <p className="settings-note">Ce que nous conservons et pourquoi : <Link href="/confidentialite">politique de confidentialité</Link>.</p>
        </Card>

        <Display/>

        <section className="settings-card danger" id="reinitialiser" aria-labelledby="reset-title"><header><span className="settings-card-icon"><Icon name="shield"/></span><div><h2 id="reset-title">Effacer toutes mes données</h2><p>Repartez de zéro : tous vos imports sont supprimés, le compte reste.</p></div></header>
          {resetting?<form className="confirm-panel" onSubmit={resetData}><ul><li>Personnages, armes, artéfacts, matériaux, équipes et journal des relevés sont effacés.</li><li>Votre compte, votre abonnement et vos PC associés sont conservés : un prochain relevé Kamera ou import GOOD remplira à nouveau le carnet.</li><li>Irréversible. Pensez à <a href="/api/account/export" download>exporter vos données</a> avant.</li></ul>
            <label className="field-label" htmlFor="reset-password">Mot de passe, pour confirmer</label><input id="reset-password" name="password" type="password" required autoComplete="current-password" maxLength="128"/>
            <div className="settings-actions"><button className="button danger" disabled={busy==='reset'}>{busy==='reset'?'Effacement…':'Tout effacer'}</button><button type="button" className="button secondary" onClick={()=>setResetting(false)}>Annuler</button></div></form>
          :<div className="settings-actions"><button className="button secondary danger-outline" onClick={()=>setResetting(true)}>Effacer toutes mes données…</button></div>}
        </section>

        {<section className="settings-card danger" id="suppression" aria-labelledby="suppression-title"><header><span className="settings-card-icon"><Icon name="shield"/></span><div><h2 id="suppression-title">Supprimer mon compte</h2><p>Définitif : le compte et toutes ses données sont effacés.</p></div></header>
          {deleting?<form className="confirm-panel" onSubmit={deleteAccount}><ul><li>Votre carnet, vos inventaires, équipes et PC associés sont effacés immédiatement.</li>{billing?.subscribed&&<li>Votre abonnement est arrêté tout de suite : aucun autre paiement ne sera prélevé.</li>}<li>Cette action est irréversible. Pensez à <a href="/api/account/export" download>exporter vos données</a> avant.</li></ul>
            <label className="field-label" htmlFor="delete-password">Mot de passe, pour confirmer</label><input id="delete-password" name="password" type="password" required autoComplete="current-password" maxLength="128"/>
            <div className="settings-actions"><button className="button danger" disabled={busy==='delete'}>{busy==='delete'?'Suppression…':'Supprimer définitivement'}</button><button type="button" className="button secondary" onClick={()=>setDeleting(false)}>Annuler</button></div></form>
          :<div className="settings-actions"><button className="button secondary danger-outline" onClick={()=>setDeleting(true)}>Supprimer mon compte…</button></div>}
        </section>}
        <div className="settings-mobile-footer"><Link className="button secondary" href="/aide">Aide et contact</Link>{user.admin&&<Link className="button secondary" href="/admin">Administration</Link>}<button className="button secondary danger-outline" onClick={onLogout}>Se déconnecter</button></div>
      </div>
    </div>
  </div>;
}
