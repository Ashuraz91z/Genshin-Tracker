'use client';
import Link from 'next/link';
import { useState } from 'react';
import Icon from './Icon';
import LegalLinks from './LegalLinks';

const benefits=[['users','Vos personnages en détail','Niveaux, talents, constellations et équipement.'],['refresh','Synchronisé avec Kamera','Un scan sur PC, et votre carnet se met à jour.'],['sword','Des équipes à votre image','Composez et estimez vos rotations.']];

// Focused entry screen: no app chrome until there is an account to show.
export default function AuthScreen({signup,setSignup,consent,setConsent,busy,error,onSubmit,onForgot}) {
  const [showPassword,setShowPassword]=useState(false);
  const mode=next=>{if(next!==signup)setSignup(next);};
  return <div className="auth-screen">
    <a className="skip" href="#auth-title">Aller au formulaire</a>
    <header className="auth-top"><Link className="brand" href="/"><img src="/assets/mark.svg" width="38" height="38" alt=""/><span>GENSHIN<span className="brand-small">TRACKER</span></span></Link><Link className="text-button" href="/">← Retour au site</Link></header>
    <main className="auth-main">
      <section className="auth-pitch" aria-label="Pourquoi Genshin Tracker">
        <span className="eyebrow">VOTRE CARNET D’AVENTURE</span>
        <h1>Tout votre compte Genshin, au même endroit.</h1>
        <p>Retrouvez vos personnages, vos équipements et vos prochaines priorités, sans tableur ni captures à la main.</p>
        <ul className="auth-benefits">{benefits.map(([icon,title,text])=><li key={title}><span><Icon name={icon}/></span><div><strong>{title}</strong><small>{text}</small></div></li>)}</ul>
        <p className="auth-trust"><Icon name="shield"/>Aucun identifiant HoYoverse demandé · Non affilié à HoYoverse</p>
      </section>

      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-switch" data-mode={signup?'signup':'login'} role="tablist" aria-label="Choisir une action">
          <button type="button" role="tab" aria-selected={signup} onClick={()=>mode(true)}>Créer un compte</button>
          <button type="button" role="tab" aria-selected={!signup} onClick={()=>mode(false)}>Se connecter</button>
        </div>
        <h2 id="auth-title" key={`t${signup}`} className="auth-swap">{signup?'Commencez votre essai gratuit':'Bon retour, voyageur'}</h2>
        <p className="auth-lead auth-swap" key={`l${signup}`}>{signup?'14 jours d’accès complet, sans carte bancaire.':'Votre carnet vous attend.'}</p>
        {error&&<div className="auth-error" role="alert"><Icon name="shield"/>{error}</div>}
        <form id="auth-form" onSubmit={onSubmit} noValidate={false}>
          <div className="auth-field"><label htmlFor="username">Pseudo</label><input id="username" name="username" autoComplete="username" minLength="3" maxLength="32" required placeholder="Votre nom de voyageur" aria-describedby={signup?'username-help':undefined}/>{signup&&<small id="username-help" className="auth-reveal">3 à 32 caractères. Il servira à vous connecter.</small>}</div>
          {signup&&<div className="auth-field auth-reveal"><label htmlFor="email">Adresse e-mail</label><input id="email" name="email" type="email" autoComplete="email" maxLength="254" required placeholder="vous@exemple.fr" aria-describedby="email-help"/><small id="email-help">Pour confirmer votre compte et récupérer votre mot de passe.</small></div>}
          <div className="auth-field"><div className="auth-label-row"><label htmlFor="password">Mot de passe</label>{!signup&&<button type="button" className="text-button auth-reveal" onClick={onForgot}>Mot de passe oublié ?</button>}</div>
            <div className="password-field"><input id="password" name="password" type={showPassword?'text':'password'} autoComplete={signup?'new-password':'current-password'} minLength={signup?8:1} maxLength="128" required aria-describedby={signup?'password-help':undefined}/>
              <button type="button" className="password-toggle" aria-label={showPassword?'Masquer le mot de passe':'Afficher le mot de passe'} aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)}><Icon name={showPassword?'eyeOff':'eye'}/><span>{showPassword?'Masquer':'Afficher'}</span></button></div>
            {signup&&<small id="password-help" className="auth-reveal">8 caractères minimum. Choisissez-en un différent de celui de votre compte HoYoverse.</small>}</div>
          {signup&&<div className="auth-consents auth-reveal">
            <label className="check"><input type="checkbox" required checked={consent.terms} onChange={e=>setConsent({...consent,terms:e.target.checked})}/><span>J’accepte les <Link href="/conditions-utilisation" target="_blank">conditions d’utilisation</Link> et j’ai lu la <Link href="/confidentialite" target="_blank">politique de confidentialité</Link>.</span></label>
            <label className="check"><input type="checkbox" checked={consent.newsletter} onChange={e=>setConsent({...consent,newsletter:e.target.checked})}/><span>Recevoir la newsletter (facultatif, désinscription en un clic).</span></label>
          </div>}
          <button className="button primary full auth-submit" disabled={busy}>{busy?(signup?'Création du compte…':'Connexion…'):signup?'Créer mon compte gratuitement':'Se connecter'}</button>
        </form>
      </section>
    </main>
    <footer className="auth-footer"><LegalLinks/></footer>
  </div>;
}
