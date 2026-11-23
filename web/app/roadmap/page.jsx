import Link from 'next/link';
import { headers } from 'next/headers';
import Icon from '../../components/Icon';
import Help from '../../components/Help';
import LegalLinks from '../../components/LegalLinks';
import landing from '../landing.module.css';
import styles from './roadmap.module.css';
import { localeFromHeaders, localePath } from '../../lib/i18n.mjs';

// Same content as the "Feuille de route" section of the README: keep both in sync.
const floating = ['TeachingsOfContention', 'TeachingsOfJustice', 'TeachingsOfOrder'];

const copy = {
  fr: {
    title: 'Roadmap — Genshin Tracker', description: 'Ce qui arrive sur Genshin Tracker : applications Android et iPhone, assistant IA, rappels, scan depuis le téléphone. Proposez aussi vos idées.',
    skip: 'Aller au contenu', brandAria: 'Genshin Tracker, accueil', navAria: 'Navigation du site', possibilities: 'Les possibilités', pricing: 'Tarifs', roadmap: 'Roadmap', login: 'Se connecter', trial: 'Essai gratuit',
    heroTitle: <>La suite du <em>voyage.</em></>, heroText: 'Genshin Tracker n’est pas fait pour gagner de l’argent. Les abonnements et les dons paient le site, et tout le reste revient au carnet. Voici ce qu’ils financeront ensuite.',
    propose: 'Proposer une idée', support: 'Soutenir le projet ↗',
    nowTitle: 'À chaque mise à jour', live: 'En cours',
    now: [['refresh', 'Chaque version de Genshin', 'Nouveaux personnages, armes et artéfacts, simulateur mis à jour.'], ['monitor', 'UID lu par le scanner', 'Kamera FR relève votre UID Genshin tout seul.'], ['star', 'Lettre d’information', 'Les nouveautés du carnet, pour les comptes qui l’ont acceptée.']],
    stepsEyebrow: 'LES PROCHAINES ÉTAPES', stepsTitle: 'Chaque palier débloque une plateforme', stepsLead: 'Chaque palier correspond à ce que les abonnements et les dons auront réuni. Quand il est atteint, on le lance.',
    steps: [['25 €', 'Application Android', 'Le compte développeur Google Play (environ 25 €, payé une seule fois) pour sortir le carnet sur le Play Store.'], ['100 €', 'Application iPhone', 'Le compte développeur Apple (environ 99 € par an) pour sortir le carnet sur l’App Store.'], ['Ensuite', 'Paliers suivants', 'Annoncés ici dès qu’ils seront fixés, selon vos idées.']],
    laterTitle: 'Quand les abonnements suivront', laterLead: 'Ces fonctions coûtent chaque mois. Elles arriveront quand les abonnements couvriront ce coût, pas avant : pas de fonction lancée puis coupée.',
    later: [['bulb', 'Assistant IA', 'Il répond à partir de votre compte : « qui monter en premier ? », « que me manque-t-il pour ce personnage ? »', 'Chaque question est facturée par le fournisseur d’IA.'], ['clock', 'Rappels', 'Résine pleine, fin de bannière, domaine du jour : par e-mail ou notification.', 'Envoi de messages en grand nombre.'], ['upload', 'Scan depuis le téléphone', 'À partir de captures d’écran, sans PC Windows.', 'La lecture des images demande un serveur plus puissant.'], ['shield', 'Sauvegardes hors serveur', 'Une copie automatique de chaque carnet, ailleurs que sur le serveur.', 'Stockage externe payé au mois.']],
    whyCost: 'Pourquoi ça coûte :',
    ideaTitle: 'Demander une fonctionnalité', ideaText: 'Il vous manque quelque chose pour préparer vos sessions ? Décrivez-le. Chaque idée est lue par une personne, et les plus demandées passent en priorité.', ideaBullets: ['Réponse par e-mail ou dans Aide et contact', 'Sans compte, il suffit d’une adresse e-mail'],
    footerNotice: '© 2026 Lux Audere · Projet indépendant, non affilié à HoYoverse.',
  },
  en: {
    title: 'Roadmap — Genshin Tracker', description: 'What is coming to Genshin Tracker: Android and iPhone apps, an AI assistant, reminders, phone scanning. You can also suggest ideas.',
    skip: 'Skip to content', brandAria: 'Genshin Tracker, home', navAria: 'Site navigation', possibilities: 'Features', pricing: 'Pricing', roadmap: 'Roadmap', login: 'Log in', trial: 'Free trial',
    heroTitle: <>The rest of the <em>journey.</em></>, heroText: 'Genshin Tracker is not built to make money. Subscriptions and donations pay for the site, and everything else goes back into the notebook. Here is what they will fund next.',
    propose: 'Suggest an idea', support: 'Support the project ↗',
    nowTitle: 'With every update', live: 'In progress',
    now: [['refresh', 'Every Genshin version', 'New characters, weapons and artifacts, simulator kept up to date.'], ['monitor', 'UID read by the scanner', 'Kamera FR reads your Genshin UID by itself.'], ['star', 'Newsletter', 'News about the notebook, for accounts that accepted it.']],
    stepsEyebrow: 'NEXT STEPS', stepsTitle: 'Each milestone unlocks a platform', stepsLead: 'Each milestone matches what subscriptions and donations have raised. When it is reached, we launch.',
    steps: [['€25', 'Android app', 'The Google Play developer account (about €25, paid once) to publish the notebook on the Play Store.'], ['€100', 'iPhone app', 'The Apple developer account (about €99 a year) to publish the notebook on the App Store.'], ['Then', 'Next milestones', 'Announced here as soon as they are set, based on your ideas.']],
    laterTitle: 'When subscriptions cover the costs', laterLead: 'These features cost money every month. They will arrive once subscriptions cover that cost, not before: no feature launched only to be switched off.',
    later: [['bulb', 'AI assistant', 'It answers from your account: “who should I level first?”, “what is missing for this character?”', 'Every question is billed by the AI provider.'], ['clock', 'Reminders', 'Full resin, banner ending, today’s domain: by email or notification.', 'Sending large volumes of messages.'], ['upload', 'Scanning from your phone', 'From screenshots, without a Windows PC.', 'Reading images needs a more powerful server.'], ['shield', 'Off-server backups', 'An automatic copy of each notebook, kept somewhere other than the server.', 'External storage paid monthly.']],
    whyCost: 'Why it costs money:',
    ideaTitle: 'Request a feature', ideaText: 'Missing something to prepare your sessions? Describe it. Every idea is read by a person, and the most requested ones come first.', ideaBullets: ['Reply by email or in Help and contact', 'No account needed, just an email address'],
    footerNotice: '© 2026 Lux Audere · Independent project, not affiliated with HoYoverse.',
  },
};

export async function generateMetadata() {
  const locale = localeFromHeaders(await headers());
  return { title: copy[locale].title, description: copy[locale].description, alternates: { canonical: locale === 'en' ? '/en/roadmap' : '/roadmap' } };
}

export default async function Page() {
  const locale = localeFromHeaders(await headers()), c = copy[locale], L = href => localePath(locale, href);
  return <div className={`${landing.landing} ${styles.page}`}>
    <a className="skip" href="#contenu">{c.skip}</a>
    <header className={landing.header}><Link href={L('/')} className={landing.brand} aria-label={c.brandAria}><img src="/assets/mark.svg" width="36" height="36" alt="" /><span>GENSHIN<small>TRACKER</small></span></Link><nav aria-label={c.navAria}><Link href={L('/#possibilites')}>{c.possibilities}</Link><Link href={L('/#tarifs')}>{c.pricing}</Link><Link href={L('/roadmap')} aria-current="page">{c.roadmap}</Link></nav><div className={landing.headerActions}><Link href={L('/app?connexion')} className="text-button">{c.login}</Link><Link href={L('/app')} className="button primary">{c.trial} <Icon name="chevron" /></Link></div></header>
    <main id="contenu" className={landing.main}>
      <section className={styles.hero} aria-labelledby="roadmap-title">
        <div className={styles.sky} aria-hidden="true"><span className={styles.ring} /><span className={styles.ring} />{floating.map(key => <img key={key} src={`/assets/materials/${key}.png`} alt="" width="56" height="56" />)}</div>
        <h1 id="roadmap-title">{c.heroTitle}</h1>
        <p>{c.heroText}</p>
        <div className={styles.actions}><a href="#idee" className="button primary">{c.propose} <Icon name="bulb" /></a><a href="https://donate.stripe.com/7sYcN7blUaiE2ldgCK4gg00" target="_blank" rel="noreferrer" className="text-button">{c.support}</a></div>
      </section>

      <section className={styles.block} aria-labelledby="now-title">
        <h2 id="now-title">{c.nowTitle}</h2>
        <div className={styles.now}>{c.now.map(([icon, title, text]) => <article key={title} className={styles.reveal}><span className={styles.live}>{c.live}</span><span className={landing.symbol}><Icon name={icon} /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className={styles.block} aria-labelledby="steps-title">
        <span className="eyebrow">{c.stepsEyebrow}</span><h2 id="steps-title">{c.stepsTitle}</h2>
        <p className={styles.lead}>{c.stepsLead}</p>
        <ol className={styles.path}>{c.steps.map(([tier, title, text], i) => <li key={title} className={styles.reveal} style={{ '--i': i }}><span className={styles.node} aria-hidden="true">{i + 1}</span><div><strong className={styles.tier}>{tier}</strong><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
      </section>

      <section className={styles.block} aria-labelledby="later-title">
        <h2 id="later-title">{c.laterTitle}</h2>
        <p className={styles.lead}>{c.laterLead}</p>
        <div className={styles.later}>{c.later.map(([icon, title, text, cost]) => <article key={title} className={styles.reveal}><span className={landing.symbol}><Icon name={icon} /></span><h3>{title}</h3><p>{text}</p><small><strong>{c.whyCost}</strong> {cost}</small></article>)}</div>
      </section>

      <section id="idee" className={styles.idea} aria-labelledby="idea-title">
        <div className={styles.ideaCopy}><span className={landing.symbol}><Icon name="bulb" /></span><h2 id="idea-title">{c.ideaTitle}</h2><p>{c.ideaText}</p><ul>{c.ideaBullets.map(b => <li key={b}><Icon name="check" />{b}</li>)}</ul></div>
        <div className={styles.ideaForm}><Help idea locale={locale} /></div>
      </section>
    </main>
    <footer className={styles.footer}><LegalLinks locale={locale} /><span>{c.footerNotice}</span></footer>
  </div>;
}
