'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './support.module.css';
import { localePath } from '../lib/i18n.mjs';

const T = {
  fr: {
    faq: [
      ['Mon import ne fonctionne pas', 'Vérifiez que le fichier est un export au format GOOD (.json) de moins de 16 Mo. Si Kamera affiche des erreurs de lecture, relancez le scan avec le jeu en 1920×1080, en français, et sans fenêtre par-dessus. Le journal de la page Synchronisation détaille ce qui a été reçu ou conservé.'],
      ['Kamera n’arrive pas à se connecter', 'Générez un nouveau code dans Synchronisation (il expire après 10 minutes), ou connectez-vous directement avec votre pseudo et votre mot de passe dans l’onglet Connexion de l’application.'],
      ['Mon paiement a échoué', 'Ouvrez Paramètres › Abonnement › « Moyen de paiement et factures » pour mettre à jour votre carte. Votre carnet reste conservé pendant ce temps.'],
      ['Comment résilier ?', 'Paramètres › Abonnement › « Résilier mon abonnement », puis confirmez. La résiliation est sans frais, prend effet à la fin de la période déjà payée et vous est confirmée par e-mail.'],
      ['Je n’ai pas reçu l’e-mail de confirmation', 'Regardez dans les indésirables, puis utilisez « Renvoyer le lien de confirmation » dans Paramètres › Profil.'],
    ],
    dateLocale: 'fr-FR', statusLabel: { open: 'En attente de réponse', answered: 'Répondu', closed: 'Fermé' },
    error: 'Une erreur est survenue.', sentTo: e => `Message envoyé. Nous vous répondrons à ${e}.`, sent: 'Réponse envoyée.',
    signedInNote: 'Vous avez un compte ?', signIn: 'Connectez-vous', signedInTail: 'pour suivre vos demandes et nos réponses', inAid: 'dans', aidLink: 'Aide et contact', here: 'ici', otherwise: 'Sinon, nous vous répondrons par e-mail.',
    name: 'Nom ou pseudo', email: 'Adresse e-mail', subject: 'Sujet', ideaSubject: 'Fonctionnalité souhaitée', ideaPlaceholder: 'Ex. : comparer deux artéfacts', subjectPlaceholder: 'Ex. : mon import ne passe pas',
    message: 'Message', ideaMessage: 'À quoi elle vous servirait', ideaBodyPlaceholder: 'Décrivez ce que vous aimeriez faire et dans quelle situation de jeu.', bodyPlaceholder: 'Décrivez ce que vous faisiez et ce qui s’est passé.',
    sending: 'Envoi…', proposeIdea: 'Proposer cette idée', send: 'Envoyer', ideaPrefix: 'Idée : ',
    title: 'Aide et contact', intro: 'Les réponses aux questions fréquentes, et un formulaire pour nous écrire si quelque chose ne fonctionne pas.', faqTitle: 'Questions fréquentes',
    yourRequests: 'Vos demandes', team: 'Genshin Tracker', you: 'Vous', reply: 'Répondre', sendReply: 'Envoyer la réponse', writeUs: 'Nous écrire',
  },
  en: {
    faq: [
      ['My import does not work', 'Check that the file is a GOOD (.json) export under 16 MB. If Kamera shows reading errors, run the scan again with the game at 1920×1080, in French, and with no window on top. The log on the Sync page details what was received or kept.'],
      ['Kamera cannot connect', 'Generate a new code in Sync (it expires after 10 minutes), or sign in directly with your username and password in the app’s Sign in tab.'],
      ['My payment failed', 'Open Settings › Subscription › “Payment method and invoices” to update your card. Your notebook is kept in the meantime.'],
      ['How do I cancel?', 'Settings › Subscription › “Cancel my subscription”, then confirm. Cancellation is free, takes effect at the end of the period already paid, and is confirmed by email.'],
      ['I did not get the confirmation email', 'Check your spam folder, then use “Resend the confirmation link” in Settings › Profile.'],
    ],
    dateLocale: 'en-GB', statusLabel: { open: 'Awaiting reply', answered: 'Answered', closed: 'Closed' },
    error: 'Something went wrong.', sentTo: e => `Message sent. We will reply to ${e}.`, sent: 'Reply sent.',
    signedInNote: 'Do you have an account?', signIn: 'Sign in', signedInTail: 'to follow your requests and our replies', inAid: 'in', aidLink: 'Help and contact', here: 'here', otherwise: 'Otherwise, we will reply by email.',
    name: 'Name or username', email: 'Email address', subject: 'Subject', ideaSubject: 'Feature you would like', ideaPlaceholder: 'E.g. compare two artifacts', subjectPlaceholder: 'E.g. my import does not go through',
    message: 'Message', ideaMessage: 'What would you use it for', ideaBodyPlaceholder: 'Describe what you would like to do and in which game situation.', bodyPlaceholder: 'Describe what you were doing and what happened.',
    sending: 'Sending…', proposeIdea: 'Suggest this idea', send: 'Send', ideaPrefix: 'Idea: ',
    title: 'Help and contact', intro: 'Answers to frequently asked questions, and a form to write to us if something does not work.', faqTitle: 'Frequently asked questions',
    yourRequests: 'Your requests', team: 'Genshin Tracker', you: 'You', reply: 'Reply', sendReply: 'Send reply', writeUs: 'Write to us',
  },
};

const api = async (path, options = {}, error) => {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { 'Content-Type': 'application/json' } });
  const result = await response.json();
  if (!response.ok) { const failure = new Error(result.error ?? error); failure.status = response.status; throw failure; }
  return result;
};

export default function Help({ idea = false, locale = 'fr' }) {
  const t = T[locale], href = path => localePath(locale, path);
  const when = value => new Date(value).toLocaleString(t.dateLocale, { dateStyle: 'medium', timeStyle: 'short' });
  const [tickets, setTickets] = useState(null), [signedIn, setSignedIn] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState(null);
  const load = () => api('/api/support', {}, t.error).then(r => { setTickets(r.tickets); setSignedIn(true); }).catch(() => setSignedIn(false));
  useEffect(() => { load(); }, []);
  async function send(event, path, payload) {
    event.preventDefault(); const form = event.currentTarget; setBusy(true); setNotice(null);
    try {
      const result = await api(path, { method: 'POST', body: JSON.stringify(payload(new FormData(form))) }, t.error); form.reset();
      if (result.tickets) setTickets(result.tickets); else await load();
      setNotice({ text: result.email ? t.sentTo(result.email) : t.sent });
    } catch (error) { setNotice({ text: error.message, error: true }); } finally { setBusy(false); }
  }
  const form = <>
    {!signedIn && <p>{t.signedInNote} <Link href={href('/app')}>{t.signIn}</Link> {t.signedInTail} {idea ? <>{t.inAid} <Link href={href('/aide')}>{t.aidLink}</Link></> : t.here}. {t.otherwise}</p>}
    <form className={styles.form} onSubmit={e => send(e, '/api/support', f => ({ ...Object.fromEntries(f), ...(idea && { subject: t.ideaPrefix + f.get('subject') }) }))}>
      {!signedIn && <div className={styles.row}><div><label htmlFor="help-name">{t.name}</label><input id="help-name" name="name" autoComplete="nickname" maxLength="64" required /></div>
        <div><label htmlFor="help-email">{t.email}</label><input id="help-email" name="email" type="email" autoComplete="email" maxLength="254" required /></div></div>}
      <label htmlFor="help-subject">{idea ? t.ideaSubject : t.subject}</label><input id="help-subject" name="subject" minLength="3" maxLength={idea ? 113 : 120} required placeholder={idea ? t.ideaPlaceholder : t.subjectPlaceholder} />
      <label htmlFor="help-body">{idea ? t.ideaMessage : t.message}</label><textarea id="help-body" name="body" rows="6" minLength="10" maxLength="5000" required placeholder={idea ? t.ideaBodyPlaceholder : t.bodyPlaceholder} />
      <input className={styles.trap} name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" />
      <button className="button primary" disabled={busy}>{busy ? t.sending : idea ? t.proposeIdea : t.send}</button>
    </form>
    {notice && <p role="status" className={notice.error ? styles.error : styles.ok}>{notice.text}</p>}
  </>;
  if (idea) return form;
  return <>
    <h1>{t.title}</h1>
    <p>{t.intro}</p>
    <h2>{t.faqTitle}</h2>
    <div className={styles.faq}>{t.faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>

    {signedIn && tickets?.length > 0 && <><h2>{t.yourRequests}</h2><div className={styles.threads}>{tickets.map(ticket => <details key={ticket.id} className={styles.thread} open={ticket.status === 'answered'}>
      <summary><strong>{ticket.subject}</strong><span className={`${styles.badge} ${styles[ticket.status]}`}>{t.statusLabel[ticket.status]}</span></summary>
      {ticket.messages.map((m, i) => <div key={i} className={`${styles.message} ${m.author === 'admin' ? styles.fromAdmin : ''}`}><small>{m.author === 'admin' ? t.team : t.you} · {when(m.at)}</small><p>{m.body}</p></div>)}
      <form onSubmit={e => send(e, '/api/support/' + encodeURIComponent(ticket.id), f => ({ body: f.get('body') }))}><label htmlFor={'reply-' + ticket.id}>{t.reply}</label><textarea id={'reply-' + ticket.id} name="body" rows="3" maxLength="5000" required />
        <button className="button secondary" disabled={busy}>{t.sendReply}</button></form>
    </details>)}</div></>}

    <h2>{t.writeUs}</h2>
    {form}
  </>;
}
