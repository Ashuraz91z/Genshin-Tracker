import Link from 'next/link';
import { headers } from 'next/headers';
import Icon from '../components/Icon';
import LegalLinks from '../components/LegalLinks';
import styles from './landing.module.css';
import { plans as allPlans, included as includedFr } from '../lib/plans.mjs';
import { localeFromHeaders, localePath } from '../lib/i18n.mjs';

const site = 'https://genshin-tracker.com';
// Landing copy in both languages. French is the original; English mirrors it section by section.
const copy = {
  fr: {
    lang: 'fr_FR',
    title: 'Genshin Tracker — Suivi de compte, inventaire et équipes Genshin Impact',
    ogTitle: 'Genshin Tracker — Votre compte Genshin Impact, en clair',
    description: 'Suivez vos personnages, artéfacts et armes Genshin Impact, importez votre inventaire avec un scanner Windows et composez vos équipes. Essai gratuit de 14 jours, sans carte bancaire.',
    nav: { possibilities: 'Les possibilités', how: 'Comment ça marche', pricing: 'Tarifs', roadmap: 'Roadmap' },
    login: 'Se connecter', trial: 'Essai gratuit', skip: 'Aller au contenu', brandAria: 'Genshin Tracker, accueil', navAria: 'Navigation du site',
    heroTitle: <>Quoi farmer aujourd’hui ?<br/>Votre carnet <em>le sait.</em></>,
    heroText: 'Importez votre compte avec le scanner Kamera FR, sans donner vos identifiants HoYoverse. Le carnet vous dit quels matériaux farmer selon le jour et votre objectif, combien de résine prévoir et quels artéfacts équiper.',
    heroCta: 'Commencer mon carnet gratuitement', seePricing: 'Voir les tarifs ↓',
    heroSmall: 'Sans carte bancaire · Sans identifiants HoYoverse · Résiliable en deux clics',
    farmHead: 'À farmer aujourd’hui', farmFor: (who, days) => `Pour ${who} · ${days}, dimanche`, available: 'Disponible', notToday: 'Pas aujourd’hui',
    caption: 'Exemple de carnet avec trois personnages',
    farmNames: ['Enseignement de la Compétition', 'Enseignement de la Justice', 'Enseignement de l’Ordre'],
    days: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
    possTitle: 'Ce que vous voyez en ouvrant le carnet', possText: 'Tout part de votre propre compte : vos personnages, votre inventaire, vos équipes. Captures du site avec un compte de démonstration.',
    features: [
      ['Le farm du jour, déjà trié.', 'Selon le jour et votre objectif (histoire, Abysse ou Théâtre), le carnet liste les livres et matériaux à récolter pour vos personnages, et vous dit par quoi commencer.', 'Section « Quoi farmer aujourd’hui » : livres d’aptitudes ouverts aujourd’hui, avec les personnages qui en ont besoin'],
      ['Vos artéfacts, pièce par pièce.', 'Le scanner relève chaque pièce avec ses sous-statistiques et sa valeur CRIT. Une pièce mal lue se corrige à la main en quelques secondes.', 'Artéfacts équipés sur Furina : quatre pièces Troupe dorée avec leurs sous-statistiques et leur valeur CRIT'],
      ['Vos équipes, chiffrées.', 'Le carnet estime les dégâts d’une rotation avec votre équipement actuel, puis avec les meilleures pièces de votre inventaire. Vous voyez ce que vous gagnez avant de farmer.', 'Estimation des dégâts de l’équipe Furina hyper : actuel, puis avec les meilleures pièces de votre inventaire (+10 %)'],
    ],
    showEyebrow: 'LE CARNET, EN VRAI', showTitle: 'Tous vos personnages sur une page', showText: 'Chaque personnage avec son niveau, son arme et ses artéfacts, relevés par le scanner. Filtrez par élément, triez, ouvrez une fiche : tout est là.',
    showAlt: 'Page Personnages du carnet : Furina, Mavuika, Arlecchino, Neuvillette et Zhongli avec leur niveau, leur arme et leurs cinq artéfacts', showCaption: 'Capture du site avec un compte de démonstration.', showCta: 'Créer mon carnet gratuitement',
    stepsTitle: 'Un scan suffit pour commencer', stepsText: 'Un premier relevé suffit pour commencer. Vous gardez la main sur les informations de votre carnet.', stepsLink: 'Découvrir la synchronisation',
    steps: [
      ['Importez votre collection', 'Utilisez Kamera FR sur PC Windows pour relever votre collection dans les menus du jeu. Reliez le scanner au site, ou importez le fichier d’inventaire (.json) qu’il a créé.'],
      ['Faites le point', 'Retrouvez les données relevées et corrigez les pièces incomplètes ou mal identifiées.'],
      ['Préparez la suite', 'Explorez vos équipements, composez une équipe et testez une rotation prise en charge.'],
    ],
    priceEyebrow: 'TARIFS', priceTitle: (p) => `${p} par mois, après 14 jours d’essai`, priceText: 'Toutes les fonctions sont incluses dans les deux formules. Seule la durée change.',
    best: 'Le plus avantageux', startTrial: 'Commencer l’essai gratuit',
    plans: { year: { name: 'Annuel', period: 'par an', price: '14,99 €', note: 'Soit 1,25 € par mois : 37 % moins cher que le mensuel.' }, month: { name: 'Mensuel', period: 'par mois', price: '1,99 €', note: 'Sans engagement. Résiliable en deux clics.' } },
    includedTitle: 'Inclus dans chaque formule', included: includedFr,
    vat: 'TVA non applicable, art. 293 B du CGI. Essai de 14 jours sans carte, puis paiement sécurisé par Stripe.', terms: 'Conditions',
    faqTitle: 'Questions fréquentes',
    faq: [
      ['Qu’est-ce que Genshin Tracker ?', 'Un carnet en ligne pour suivre son compte Genshin Impact : personnages, armes, artéfacts et matériaux, équipes et estimation des dégâts de rotation, conseils de progression et matériaux à farmer. Le site est en français.'],
      ['Comment importer mon inventaire Genshin ?', 'Lancez Kamera FR, le scanner Windows gratuit fourni avec le service : il lit les menus du jeu par captures d’écran et envoie le relevé à votre carnet. Vos données s’exportent à tout moment au format GOOD.'],
      ['Faut-il une carte bancaire pour l’essai ?', 'Non. Créez un compte avec un pseudo et un mot de passe : vous avez 14 jours d’accès complet, sans moyen de paiement. Rien n’est prélevé automatiquement à la fin de l’essai.'],
      ['Que se passe-t-il après les 14 jours ?', 'Votre carnet est mis en pause, vos données restent conservées. Choisissez une formule quand vous voulez pour tout retrouver.'],
      ['Puis-je résilier à tout moment ?', 'Oui, depuis « Mon compte » sur le site. L’accès reste ouvert jusqu’à la fin de la période déjà payée.'],
      ['Mon compte HoYoverse est-il en danger ?', 'Le site ne demande jamais vos identifiants HoYoverse. Kamera FR lit les menus du jeu sur votre PC, à partir de captures d’écran.'],
      ['Le code est-il vraiment libre ?', 'Oui, sous licence AGPL-3.0. Vous payez le service hébergé, la synchronisation et la conservation de vos données, pas le code.'],
    ],
    asideTitle: 'Une autre question ?', asideText: 'Écrivez-nous depuis la page d’aide : une personne vous répond, en français.', asideCta: 'Poser ma question',
    footerTag: 'Votre aventure, à votre rythme.', footerFree: 'Le code reste libre.', footerHosted: (m, y) => `Le service hébergé : essai gratuit de 14 jours, puis ${m} par mois ou ${y} par an.`,
    projectTitle: 'Le projet', github: 'GitHub du projet ↗', donate: 'Soutenir le projet (don) ↗', roadmapIdeas: 'Roadmap et idées', siteLicense: 'Licence du site · AGPL-3.0',
    kameraFrom: 'Kamera FR, adapté d’', scannerLicense: 'Licence du scanner · MIT', infoTitle: 'Informations',
    notAffiliated: 'Projet indépendant, non affilié à HoYoverse. Genshin Impact et ses visuels appartiennent à leurs ayants droit.', backTop: 'Retour en haut ↑',
    faqSection: 'Questions fréquentes',
  },
  en: {
    lang: 'en_US',
    title: 'Genshin Tracker — Genshin Impact account, inventory and teams',
    ogTitle: 'Genshin Tracker — Your Genshin Impact account, made clear',
    description: 'Track your Genshin Impact characters, artifacts and weapons, import your inventory with a Windows scanner and build your teams. 14-day free trial, no credit card required.',
    nav: { possibilities: 'Features', how: 'How it works', pricing: 'Pricing', roadmap: 'Roadmap' },
    login: 'Log in', trial: 'Free trial', skip: 'Skip to content', brandAria: 'Genshin Tracker, home', navAria: 'Site navigation',
    heroTitle: <>What should I farm today?<br/>Your notebook <em>knows.</em></>,
    heroText: 'Import your account with the Kamera FR scanner, without giving your HoYoverse login. The notebook tells you which materials to farm for the day and your goal, how much resin to plan for, and which artifacts to equip.',
    heroCta: 'Start my notebook for free', seePricing: 'See pricing ↓',
    heroSmall: 'No credit card · No HoYoverse login · Cancel in two clicks',
    farmHead: 'To farm today', farmFor: (who, days) => `For ${who} · ${days}, Sunday`, available: 'Available', notToday: 'Not today',
    caption: 'Example notebook with three characters',
    farmNames: ['Teachings of Contention', 'Teachings of Justice', 'Teachings of Order'],
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    possTitle: 'What you see when you open the notebook', possText: 'Everything starts from your own account: characters, inventory, teams. Site captures made with a demo account.',
    features: [
      ['Today’s farm, already sorted.', 'Based on the day and your goal (story, Abyss or Theater), the notebook lists the books and materials to gather for your characters, and tells you where to start.', '“Farm today” section: talent books open today, with the characters who need them'],
      ['Your artifacts, piece by piece.', 'The scanner records every piece with its substats and its CRIT value. A misread piece is fixed by hand in seconds.', 'Artifacts equipped on Furina: four Gilded Dreams pieces with their substats and CRIT value'],
      ['Your teams, quantified.', 'The notebook estimates a rotation’s damage with your current gear, then with the best pieces from your inventory. You see what you gain before you farm.', 'Damage estimate for the Furina hyperbloom team: current, then with the best pieces from your inventory (+10%)'],
    ],
    showEyebrow: 'THE NOTEBOOK, FOR REAL', showTitle: 'All your characters on one page', showText: 'Each character with its level, weapon and artifacts, recorded by the scanner. Filter by element, sort, open a profile: it is all there.',
    showAlt: 'Notebook characters page: Furina, Mavuika, Arlecchino, Neuvillette and Zhongli with their level, weapon and five artifacts', showCaption: 'Site capture made with a demo account.', showCta: 'Create my notebook for free',
    stepsTitle: 'One scan is enough to start', stepsText: 'A first scan is enough to start. You stay in control of your notebook’s information.', stepsLink: 'Discover syncing',
    steps: [
      ['Import your collection', 'Use Kamera FR on a Windows PC to record your collection from the game’s menus. Connect the scanner to the site, or import the inventory file (.json) it created.'],
      ['Review the results', 'Check the recorded data and fix incomplete or misidentified pieces.'],
      ['Plan what comes next', 'Browse your gear, build a team and test a supported rotation.'],
    ],
    priceEyebrow: 'PRICING', priceTitle: (p) => `${p} per month, after a 14-day trial`, priceText: 'All features are included in both plans. Only the duration changes.',
    best: 'Best value', startTrial: 'Start free trial',
    plans: { year: { name: 'Annual', period: 'per year', price: '€14.99', note: 'That is €1.25 a month: 37% cheaper than monthly.' }, month: { name: 'Monthly', period: 'per month', price: '€1.99', note: 'No commitment. Cancel in two clicks.' } },
    includedTitle: 'Included in every plan', included: [
      'Automatic sync of Kamera FR scans',
      'Inventory kept on the server and editable',
      'Teams, rotations and damage estimates',
      'Progression advice and materials to farm',
      'Export your data in GOOD format, at any time',
    ],
    vat: 'No VAT charged (French VAT exemption, article 293 B of the CGI). 14-day trial without a card, then secure payment via Stripe.', terms: 'Terms',
    faqTitle: 'Frequently asked questions',
    faq: [
      ['What is Genshin Tracker?', 'An online notebook to track your Genshin Impact account: characters, weapons, artifacts and materials, teams and rotation damage estimates, progression advice and materials to farm. The site is available in French and English.'],
      ['How do I import my Genshin inventory?', 'Run Kamera FR, the free Windows scanner provided with the service: it reads the game’s menus through screenshots and sends the record to your notebook. You can export your data at any time in GOOD format.'],
      ['Do I need a credit card for the trial?', 'No. Create an account with a username and password: you get 14 days of full access with no payment method. Nothing is charged automatically at the end of the trial.'],
      ['What happens after 14 days?', 'Your notebook is paused and your data is kept. Choose a plan whenever you like to get everything back.'],
      ['Can I cancel at any time?', 'Yes, from “My account” on the site. Access stays open until the end of the period you have already paid for.'],
      ['Is my HoYoverse account at risk?', 'The site never asks for your HoYoverse credentials. Kamera FR reads the game’s menus on your PC, from screenshots.'],
      ['Is the code really free?', 'Yes, under the AGPL-3.0 license. You pay for the hosted service, the sync and keeping your data, not for the code.'],
    ],
    asideTitle: 'Another question?', asideText: 'Write to us from the help page: a real person answers, in French.', asideCta: 'Ask my question',
    footerTag: 'Your adventure, at your own pace.', footerFree: 'The code stays free.', footerHosted: (m, y) => `The hosted service: 14-day free trial, then ${m} a month or ${y} a year.`,
    projectTitle: 'The project', github: 'Project on GitHub ↗', donate: 'Support the project (donate) ↗', roadmapIdeas: 'Roadmap and ideas', siteLicense: 'Site license · AGPL-3.0',
    kameraFrom: 'Kamera FR, adapted from ', scannerLicense: 'Scanner license · MIT', infoTitle: 'Information',
    notAffiliated: 'Independent project, not affiliated with HoYoverse. Genshin Impact and its visuals belong to their respective rights holders.', backTop: 'Back to top ↑',
    faqSection: 'Frequently asked questions',
  },
};

export async function generateMetadata() {
  const locale = localeFromHeaders(await headers()), c = copy[locale], path = locale === 'en' ? '/en' : '/';
  return {
    title: c.title, description: c.description,
    alternates: { canonical: path, languages: { fr: '/', en: '/en' } },
    openGraph: { type: 'website', locale: c.lang, siteName: 'Genshin Tracker', title: c.ogTitle, description: c.description, url: path },
    twitter: { card: 'summary_large_image', title: 'Genshin Tracker', description: c.description },
  };
}

export default async function Page() {
  const requestHeaders = await headers(), nonce = requestHeaders.get('x-nonce'), locale = localeFromHeaders(requestHeaders), c = copy[locale];
  const L = href => localePath(locale, href);
  const plans = [...allPlans].reverse();
  const priceOf = id => c.plans[id].price;
  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short' }).format(new Date(Date.now() - 4 * 36e5)));
  const today = dayIndex; // domains reset at 4:00 (EU server)
  const farm = [['TeachingsOfContention', c.farmNames[0], 'Mavuika', [1, 4]], ['TeachingsOfJustice', c.farmNames[1], 'Furina', [2, 5]], ['TeachingsOfOrder', c.farmNames[2], 'Arlecchino', [3, 6]]];
  const featureImages = [['farm', 1936, 1160], ['artefacts', 1366, 1700], ['equipe', 880, 626]];
  const jsonLd = JSON.stringify([
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Genshin Tracker', url: site + (locale === 'en' ? '/en' : ''), inLanguage: locale, applicationCategory: 'GameApplication', operatingSystem: 'Web, Windows (Kamera FR scanner)', description: c.description, license: 'https://www.gnu.org/licenses/agpl-3.0.html',
      publisher: { '@type': 'Organization', name: 'Lux Audere', url: 'https://lux-audere.com' },
      offers: allPlans.map(plan => ({ '@type': 'Offer', name: c.plans[plan.id].name, price: plan.price.replace(/[^\d,]/g, '').replace(',', '.'), priceCurrency: 'EUR', url: site + (locale === 'en' ? '/en' : '') + '/#tarifs' })) },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: c.faq.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) },
  ]).replace(/</g, '\\u003c');
  const monthPrice = priceOf('month'), yearPrice = priceOf('year');
  return <div className={styles.landing}>
    <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    <a className="skip" href="#contenu">{c.skip}</a>
    <header className={styles.header}><Link href={L('/')} className={styles.brand} aria-label={c.brandAria}><img src="/assets/mark.svg" width="36" height="36" alt="" /><span>GENSHIN<small>TRACKER</small></span></Link><nav aria-label={c.navAria}><a href="#possibilites">{c.nav.possibilities}</a><a href="#comment">{c.nav.how}</a><a href="#tarifs">{c.nav.pricing}</a><Link href={L('/roadmap')}>{c.nav.roadmap}</Link></nav><div className={styles.headerActions}><Link href={L('/app?connexion')} className="text-button">{c.login}</Link><Link href={L('/app')} className="button primary">{c.trial} <Icon name="chevron" /></Link></div></header>
    <main id="contenu" className={styles.main}>
      <section className={styles.hero} aria-labelledby="hero-title"><div className={styles.copy}><h1 id="hero-title">{c.heroTitle}</h1><p>{c.heroText}</p><div className={styles.actions}><Link href={L('/app')} className="button primary">{c.heroCta} <Icon name="chevron" /></Link><a href="#tarifs" className="text-button">{c.seePricing}</a></div><small>{c.heroSmall}</small></div><div className={styles.visual}><div className={styles.orbit} aria-hidden="true" /><div className={styles.portraits} aria-hidden="true"><img src="/assets/hero/Mavuika.webp" alt="" width="480" height="640" /><img src="/assets/hero/Furina.webp" alt="" width="480" height="640" fetchPriority="high" /><img src="/assets/hero/Arlecchino.webp" alt="" width="480" height="640" /></div><div className={styles.farm}><div className={styles.farmHead}><strong>{c.farmHead}</strong><span>{c.days[today]}</span></div><ul>{farm.map(([key, name, who, open]) => { const ready = today === 0 || open.includes(today); return <li key={key} className={ready ? styles.ready : undefined}><img src={`/assets/materials/${key}.png`} alt="" width="36" height="36" /><div><strong>{name}</strong><span>{c.farmFor(who, open.map(d => c.days[d]).join(', '))}</span></div><em>{ready ? c.available : c.notToday}</em></li>; })}</ul></div><span className={styles.caption}>{c.caption}</span></div></section>
      <section id="possibilites" className={styles.section} aria-labelledby="possibilites-title"><h2 id="possibilites-title">{c.possTitle}</h2><p>{c.possText}</p>
        <div className={styles.features}>{c.features.map(([title, text, alt], i) => { const [key, width, height] = featureImages[i]; return <article className={styles.feature} key={key}><div><h3>{title}</h3><p>{text}</p></div><img src={`/assets/hero/${key}.webp`} alt={alt} width={width} height={height} loading="lazy" /></article>; })}</div></section>
      <section className={styles.showcase} aria-labelledby="showcase-title"><span className="eyebrow">{c.showEyebrow}</span><h2 id="showcase-title">{c.showTitle}</h2><p>{c.showText}</p><figure><img src="/assets/hero/carnet.webp" alt={c.showAlt} width="2000" height="1139" loading="lazy" /><figcaption>{c.showCaption}</figcaption></figure><Link href={L('/app')} className="button primary">{c.showCta} <Icon name="chevron" /></Link></section>
      <section id="comment" className={styles.stepsSection}><div><h2>{c.stepsTitle}</h2><p>{c.stepsText}</p><Link href={L('/sync')} className="text-button">{c.stepsLink}</Link></div><ol className={styles.steps}>{c.steps.map(([title, text]) => <li key={title}><strong>{title}</strong><p>{text}</p></li>)}</ol></section>
      <section id="tarifs" className={styles.section} aria-labelledby="tarifs-title"><span className="eyebrow">{c.priceEyebrow}</span><h2 id="tarifs-title">{c.priceTitle(monthPrice)}</h2><p>{c.priceText}</p>
        <div className={styles.pricing}>{plans.map(plan => <article key={plan.id} className={`${styles.plan} ${plan.featured ? styles.planFeatured : ''}`}>{plan.featured && <span className={styles.planBadge}>{c.best}</span>}<h3>{c.plans[plan.id].name}</h3><p className={styles.planPrice}><strong>{priceOf(plan.id)}</strong> {c.plans[plan.id].period}</p><p>{c.plans[plan.id].note}</p><Link href={L('/app')} className={`button ${plan.featured ? 'primary' : 'secondary'}`}>{c.startTrial} <Icon name="chevron" /></Link></article>)}
          <div className={styles.included}><h3>{c.includedTitle}</h3><ul>{c.included.map(item => <li key={item}><Icon name="star" />{item}</li>)}</ul><small>{c.vat} <Link href={L('/conditions-utilisation')}>{c.terms}</Link></small></div></div></section>
      <section className={styles.faq} aria-labelledby="faq-title"><div><h2 id="faq-title">{c.faqTitle}</h2>{c.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div><aside className={styles.faqAside}><span className={styles.symbol}><Icon name="bulb" /></span><h3>{c.asideTitle}</h3><p>{c.asideText}</p><Link href={L('/aide')} className="button secondary">{c.asideCta} <Icon name="chevron" /></Link></aside></section>
    </main><footer id="site-footer" className={styles.footer}>
      <div className={styles.footerTop}>
        <div className={styles.footerIntro}><Link href={L('/')} className={styles.footerBrand}><img src="/assets/mark.svg" alt="" width="32" height="32" /><span>Genshin Tracker</span></Link><p>{c.footerTag}</p><p>{c.footerFree}<br />{c.footerHosted(monthPrice, yearPrice)}</p></div>
        <div className={styles.footerColumn}><h2>{c.projectTitle}</h2><a href="https://github.com/Ashuraz91z/Genshin-Tracker" target="_blank" rel="noreferrer">{c.github}</a><a href="https://donate.stripe.com/7sYcN7blUaiE2ldgCK4gg00" target="_blank" rel="noreferrer">{c.donate}</a><Link href={L('/roadmap')}>{c.roadmapIdeas}</Link><a href="/licenses/agpl-3.0.txt">{c.siteLicense}</a><span>{c.kameraFrom}<a href="https://github.com/Andrewthe13th/Inventory_Kamera" target="_blank" rel="noreferrer">Inventory Kamera ↗</a><br /><a href="/licenses/inventory-kamera.txt">{c.scannerLicense}</a></span></div>
        <div className={styles.footerColumn}><h2>{c.infoTitle}</h2><LegalLinks locale={locale} /></div>
      </div>
      <div className={styles.footerBottom}><div><span>© 2026 Lux Audere</span><p>{c.notAffiliated}</p></div><a href="#contenu" className={styles.backToTop}>{c.backTop}</a></div>
    </footer>
  </div>;
}
