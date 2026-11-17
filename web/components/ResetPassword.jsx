'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function ResetPassword() {
  const [token,setToken]=useState(null),[state,setState]=useState('form'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{const value=new URLSearchParams(window.location.search).get('token');setToken(value??'');window.history.replaceState(null,'',window.location.pathname);},[]);
  async function submit(event) {
    event.preventDefault();setError('');const form=new FormData(event.currentTarget);
    if(form.get('password')!==form.get('confirm')){setError('Les deux mots de passe ne correspondent pas.');return;}
    setBusy(true);
    try{const response=await fetch('/api/password/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password:form.get('password')})});const result=await response.json();if(!response.ok)throw new Error(result.error);setState('done');}
    catch(failure){setError(failure.message||'Une erreur est survenue.');}finally{setBusy(false);}
  }
  if(token===null)return null;
  if(!token)return <><h1>Lien incomplet</h1><p>Ouvrez le lien reçu par e-mail en entier, ou refaites une demande depuis la page de connexion.</p><p><Link href="/app">Retour à la connexion</Link></p></>;
  if(state==='done')return <><h1>Mot de passe modifié</h1><p>Vous pouvez vous connecter avec votre nouveau mot de passe. Par sécurité, vos autres sessions ont été fermées ; vos PC associés restent reliés.</p><p><Link href="/app" className="button primary">Se connecter</Link></p></>;
  return <><h1>Choisir un nouveau mot de passe</h1><p>Utilisez un mot de passe d’au moins 8 caractères, différent de celui de votre compte HoYoverse.</p>
    <form className="auth-form reset-form" onSubmit={submit}><label htmlFor="new-password">Nouveau mot de passe</label><input id="new-password" name="password" type="password" autoComplete="new-password" minLength="8" maxLength="128" required/>
      <label htmlFor="confirm-password">Confirmer le mot de passe</label><input id="confirm-password" name="confirm" type="password" autoComplete="new-password" minLength="8" maxLength="128" required/>
      <p className="field-error" role="alert">{error}</p><button className="button primary" disabled={busy}>{busy?'Enregistrement…':'Enregistrer le mot de passe'}</button></form></>;
}
