'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './support.module.css';

const faq=[
  ['Mon import ne fonctionne pas','Vérifiez que le fichier est un export au format GOOD (.json) de moins de 16 Mo. Si Kamera affiche des erreurs de lecture, relancez le scan avec le jeu en 1920×1080, en français, et sans fenêtre par-dessus. Le journal de la page Synchronisation détaille ce qui a été reçu ou conservé.'],
  ['Kamera n’arrive pas à se connecter','Générez un nouveau code dans Synchronisation (il expire après 10 minutes), ou connectez-vous directement avec votre pseudo et votre mot de passe dans l’onglet Connexion de l’application.'],
  ['Mon paiement a échoué','Ouvrez Paramètres › Abonnement › « Moyen de paiement et factures » pour mettre à jour votre carte. Votre carnet reste conservé pendant ce temps.'],
  ['Comment résilier ?','Paramètres › Abonnement › « Résilier mon abonnement », puis confirmez. La résiliation est sans frais, prend effet à la fin de la période déjà payée et vous est confirmée par e-mail.'],
  ['Je n’ai pas reçu l’e-mail de confirmation','Regardez dans les indésirables, puis utilisez « Renvoyer le lien de confirmation » dans Paramètres › Profil.']
];
const when=value=>new Date(value).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'});
const statusLabel={open:'En attente de réponse',answered:'Répondu',closed:'Fermé'};
async function api(path,options={}) {
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options,headers:{'Content-Type':'application/json'}});
  const result=await response.json();if(!response.ok){const error=new Error(result.error??'Une erreur est survenue.');error.status=response.status;throw error;}return result;
}

export default function Help({idea=false}) {
  const [tickets,setTickets]=useState(null),[signedIn,setSignedIn]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(null);
  const load=()=>api('/api/support').then(r=>{setTickets(r.tickets);setSignedIn(true);}).catch(()=>setSignedIn(false));
  useEffect(()=>{load();},[]);
  async function send(event,path,payload) {
    event.preventDefault();const form=event.currentTarget;setBusy(true);setNotice(null);
    try{const result=await api(path,{method:'POST',body:JSON.stringify(payload(new FormData(form)))});form.reset();
      if(result.tickets)setTickets(result.tickets);else await load();
      setNotice({text:result.email?`Message envoyé. Nous vous répondrons à ${result.email}.`:'Réponse envoyée.'});}
    catch(error){setNotice({text:error.message,error:true});}finally{setBusy(false);}
  }
  const form=<>
    {!signedIn&&<p>Vous avez un compte ? <Link href="/app">Connectez-vous</Link> pour suivre vos demandes et nos réponses {idea?<>dans <Link href="/aide">Aide et contact</Link></>:'ici'}. Sinon, nous vous répondrons par e-mail.</p>}
    <form className={styles.form} onSubmit={e=>send(e,'/api/support',f=>({...Object.fromEntries(f),...(idea&&{subject:'Idée : '+f.get('subject')})}))}>
      {!signedIn&&<div className={styles.row}><div><label htmlFor="help-name">Nom ou pseudo</label><input id="help-name" name="name" autoComplete="nickname" maxLength="64" required/></div>
        <div><label htmlFor="help-email">Adresse e-mail</label><input id="help-email" name="email" type="email" autoComplete="email" maxLength="254" required/></div></div>}
      <label htmlFor="help-subject">{idea?'Fonctionnalité souhaitée':'Sujet'}</label><input id="help-subject" name="subject" minLength="3" maxLength={idea?113:120} required placeholder={idea?'Ex. : comparer deux artéfacts':'Ex. : mon import ne passe pas'}/>
      <label htmlFor="help-body">{idea?'À quoi elle vous servirait':'Message'}</label><textarea id="help-body" name="body" rows="6" minLength="10" maxLength="5000" required placeholder={idea?'Décrivez ce que vous aimeriez faire et dans quelle situation de jeu.':'Décrivez ce que vous faisiez et ce qui s’est passé.'}/>
      <input className={styles.trap} name="website" tabIndex="-1" autoComplete="off" aria-hidden="true"/>
      <button className="button primary" disabled={busy}>{busy?'Envoi…':idea?'Proposer cette idée':'Envoyer'}</button>
    </form>
    {notice&&<p role="status" className={notice.error?styles.error:styles.ok}>{notice.text}</p>}
  </>;
  if(idea)return form;
  return <>
    <h1>Aide et contact</h1>
    <p>Les réponses aux questions fréquentes, et un formulaire pour nous écrire si quelque chose ne fonctionne pas.</p>
    <h2>Questions fréquentes</h2>
    <div className={styles.faq}>{faq.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>

    {signedIn&&tickets?.length>0&&<><h2>Vos demandes</h2><div className={styles.threads}>{tickets.map(t=><details key={t.id} className={styles.thread} open={t.status==='answered'}>
      <summary><strong>{t.subject}</strong><span className={`${styles.badge} ${styles[t.status]}`}>{statusLabel[t.status]}</span></summary>
      {t.messages.map((m,i)=><div key={i} className={`${styles.message} ${m.author==='admin'?styles.fromAdmin:''}`}><small>{m.author==='admin'?'Genshin Tracker':'Vous'} · {when(m.at)}</small><p>{m.body}</p></div>)}
      <form onSubmit={e=>send(e,'/api/support/'+encodeURIComponent(t.id),f=>({body:f.get('body')}))}><label htmlFor={'reply-'+t.id}>Répondre</label><textarea id={'reply-'+t.id} name="body" rows="3" maxLength="5000" required/>
        <button className="button secondary" disabled={busy}>Envoyer la réponse</button></form>
    </details>)}</div></>}

    <h2>Nous écrire</h2>
    {form}
  </>;
}
