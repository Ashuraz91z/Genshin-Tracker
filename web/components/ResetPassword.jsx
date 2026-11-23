'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { localePath } from '../lib/i18n.mjs';

const T = {
  fr: {
    mismatch: 'Les deux mots de passe ne correspondent pas.', error: 'Une erreur est survenue.',
    incompleteTitle: 'Lien incomplet', incomplete: 'Ouvrez le lien reçu par e-mail en entier, ou refaites une demande depuis la page de connexion.', back: 'Retour à la connexion',
    doneTitle: 'Mot de passe modifié', done: 'Vous pouvez vous connecter avec votre nouveau mot de passe. Par sécurité, vos autres sessions ont été fermées ; vos PC associés restent reliés.', signIn: 'Se connecter',
    chooseTitle: 'Choisir un nouveau mot de passe', choose: 'Utilisez un mot de passe d’au moins 8 caractères, différent de celui de votre compte HoYoverse.',
    newPassword: 'Nouveau mot de passe', confirm: 'Confirmer le mot de passe', saving: 'Enregistrement…', save: 'Enregistrer le mot de passe',
  },
  en: {
    mismatch: 'The two passwords do not match.', error: 'Something went wrong.',
    incompleteTitle: 'Incomplete link', incomplete: 'Open the link you received by email in full, or request a new one from the sign-in page.', back: 'Back to sign in',
    doneTitle: 'Password changed', done: 'You can now sign in with your new password. For security, your other sessions have been closed; your linked PCs stay connected.', signIn: 'Sign in',
    chooseTitle: 'Choose a new password', choose: 'Use a password of at least 8 characters, different from your HoYoverse account password.',
    newPassword: 'New password', confirm: 'Confirm password', saving: 'Saving…', save: 'Save password',
  },
};

export default function ResetPassword({ locale = 'fr' }) {
  const t = T[locale], href = path => localePath(locale, path);
  const [token, setToken] = useState(null), [state, setState] = useState('form'), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { const value = new URLSearchParams(window.location.search).get('token'); setToken(value ?? ''); window.history.replaceState(null, '', window.location.pathname); }, []);
  async function submit(event) {
    event.preventDefault(); setError(''); const form = new FormData(event.currentTarget);
    if (form.get('password') !== form.get('confirm')) { setError(t.mismatch); return; }
    setBusy(true);
    try { const response = await fetch('/api/password/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password: form.get('password') }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setState('done'); }
    catch (failure) { setError(failure.message || t.error); } finally { setBusy(false); }
  }
  if (token === null) return null;
  if (!token) return <><h1>{t.incompleteTitle}</h1><p>{t.incomplete}</p><p><Link href={href('/app')}>{t.back}</Link></p></>;
  if (state === 'done') return <><h1>{t.doneTitle}</h1><p>{t.done}</p><p><Link href={href('/app')} className="button primary">{t.signIn}</Link></p></>;
  return <><h1>{t.chooseTitle}</h1><p>{t.choose}</p>
    <form className="auth-form reset-form" onSubmit={submit}><label htmlFor="new-password">{t.newPassword}</label><input id="new-password" name="password" type="password" autoComplete="new-password" minLength="8" maxLength="128" required />
      <label htmlFor="confirm-password">{t.confirm}</label><input id="confirm-password" name="confirm" type="password" autoComplete="new-password" minLength="8" maxLength="128" required />
      <p className="field-error" role="alert">{error}</p><button className="button primary" disabled={busy}>{busy ? t.saving : t.save}</button></form></>;
}
