'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import { Modal } from './Collection';

const date=value=>new Date(value).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});

function Display() {
  const [theme,setTheme]=useState('system'),[reducedGlass,setReducedGlass]=useState(false),[storageError,setStorageError]=useState(false);
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('gt-appearance')??'{}');setTheme(['light','dark','system'].includes(saved.theme)?saved.theme:'system');setReducedGlass(saved.reducedGlass===true);}catch{}},[]);
  function update(nextTheme,nextReducedGlass) {
    setTheme(nextTheme);setReducedGlass(nextReducedGlass);
    document.documentElement.dataset.theme=nextTheme;document.documentElement.dataset.reducedGlass=String(nextReducedGlass);
    try{localStorage.setItem('gt-appearance',JSON.stringify({theme:nextTheme,reducedGlass:nextReducedGlass}));setStorageError(false);}catch{setStorageError(true);}
  }
  return <section className="settings-section"><h3>Apparence</h3><p>Enregistrée sur ce navigateur.</p>
    <fieldset className="theme-options"><legend className="sr-only">Thème</legend>{[['system','Automatique','monitor'],['light','Clair','sun'],['dark','Sombre','moon']].map(([value,label,icon])=><label key={value}><input type="radio" name="theme" value={value} checked={theme===value} onChange={()=>update(value,reducedGlass)}/><Icon name={icon}/>{label}</label>)}</fieldset>
    <label className="glass-toggle"><span><strong>Réduire la transparence</strong><small>Des surfaces plus opaques pour faciliter la lecture.</small></span><input type="checkbox" checked={reducedGlass} onChange={e=>update(theme,e.target.checked)}/></label>
    {storageError&&<p role="status">Le navigateur ne permet pas d’enregistrer ce réglage. Il reste actif sur cette page.</p>}</section>;
}

export default function Settings({account,busy,initialTab,onClose,onSaveEmail,onResend,onChangePassword,onManageBilling,onChooseBilling,onLogout}) {
  const signedIn=account&&!account.guest,billing=account?.billing;
  const tabs=[...(signedIn?[['account','Compte','users'],['security','Sécurité','shield']]:[]),...(signedIn&&billing?.enabled?[['billing','Abonnement','star']]:[]),['display','Affichage','sun']];
  const [tab,setTab]=useState(tabs.some(([id])=>id===initialTab)?initialTab:tabs[0][0]);
  return <Modal label="Paramètres" onClose={onClose} className="settings-dialog">
    <span className="eyebrow">VOTRE ESPACE</span><h2>Paramètres</h2>
    {account&&<p className="settings-identity"><span className="settings-avatar">{account.user.name[0].toUpperCase()}</span><span><strong>{account.user.name}</strong><small>{account.guest?'Mode visiteur : rien n’est envoyé au serveur.':account.user.email??'Aucune adresse e-mail'}</small></span></p>}
    <div className="settings-tabs" role="tablist" aria-label="Rubriques des paramètres">{tabs.map(([id,label,icon])=><button key={id} type="button" role="tab" id={'tab-'+id} aria-controls={'panel-'+id} aria-selected={tab===id} onClick={()=>setTab(id)}><Icon name={icon}/>{label}</button>)}</div>
    <div role="tabpanel" id={'panel-'+tab} aria-labelledby={'tab-'+tab}>
      {tab==='account'&&<section className="settings-section"><h3>Adresse e-mail</h3><p>Elle sert à récupérer votre mot de passe et à recevoir vos factures.</p>
        <form onSubmit={onSaveEmail} key={account.user.email??'none'}><label htmlFor="account-email">Adresse e-mail{account.user.email&&<span className={`email-status ${account.user.emailVerified?'ok':''}`}>{account.user.emailVerified?'Confirmée':'À confirmer'}</span>}</label>
          <input id="account-email" name="email" type="email" autoComplete="email" maxLength="254" required defaultValue={account.user.email??''} placeholder="vous@exemple.fr"/>
          {account.user.email&&<><label htmlFor="account-password">Mot de passe actuel <small>(seulement pour changer d’adresse)</small></label><input id="account-password" name="password" type="password" autoComplete="current-password" maxLength="128"/></>}
          <label className="glass-toggle"><span><strong>Newsletter</strong><small>Nouveautés du site et conseils de progression. Désinscription à tout moment.</small></span><input type="checkbox" name="newsletter" defaultChecked={account.user.newsletter}/></label>
          <div className="modal-actions"><button className="button primary" disabled={busy}>Enregistrer</button>{account.user.email&&!account.user.emailVerified&&<button type="button" className="text-button" onClick={onResend}>Renvoyer le lien de confirmation</button>}</div></form></section>}
      {tab==='security'&&<section className="settings-section"><h3>Changer de mot de passe</h3><p>Les autres navigateurs seront déconnectés. Vos PC associés restent reliés.</p>
        <form onSubmit={onChangePassword}><label htmlFor="current-password">Mot de passe actuel</label><input id="current-password" name="current" type="password" autoComplete="current-password" maxLength="128" required/>
          <label htmlFor="next-password">Nouveau mot de passe</label><input id="next-password" name="password" type="password" autoComplete="new-password" minLength="8" maxLength="128" required placeholder="8 caractères minimum"/>
          <label htmlFor="confirm-next-password">Confirmer le nouveau mot de passe</label><input id="confirm-next-password" name="confirm" type="password" autoComplete="new-password" minLength="8" maxLength="128" required/>
          <div className="modal-actions"><button className="button primary" disabled={busy}>Mettre à jour</button></div></form>
        <p className="muted">Appareils associés : gérez-les depuis <Link href="/sync" onClick={onClose}>Synchronisation</Link>.</p></section>}
      {tab==='billing'&&<section className="settings-section"><h3>Votre formule</h3>
        {billing.subscribed?<p>Formule <strong>{billing.plan==='year'?'annuelle':'mensuelle'}</strong> · {billing.status==='trialing'?'premier paiement':'prochaine échéance'} le {date(billing.until)}.</p>
          :billing.trial?<p>Essai gratuit jusqu’au <strong>{date(billing.trialEnds)}</strong>. Aucune carte enregistrée.</p>:<p>Aucun abonnement actif.</p>}
        <div className="modal-actions">{billing.manageable&&<button className="button secondary" disabled={busy} onClick={onManageBilling}>Gérer mon abonnement et mes factures</button>}{!billing.subscribed&&<button className="button primary" onClick={onChooseBilling}>Choisir une formule</button>}</div>
        <p className="muted">Paiement et factures gérés par Stripe. <Link href="/conditions-utilisation" onClick={onClose}>Conditions</Link></p></section>}
      {tab==='display'&&<Display/>}
    </div>
    {account&&<div className="settings-footer"><button className="text-button" onClick={onLogout}>{account.guest?'Effacer la session visiteur':'Se déconnecter'}</button></div>}
  </Modal>;
}
