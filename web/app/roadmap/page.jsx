import Link from 'next/link';
import Icon from '../../components/Icon';
import Help from '../../components/Help';
import LegalLinks from '../../components/LegalLinks';
import landing from '../landing.module.css';
import styles from './roadmap.module.css';

export const metadata={title:'Roadmap — Genshin Tracker',description:'Ce qui arrive sur Genshin Tracker : applications Android et iPhone, assistant IA, rappels, scan depuis le téléphone. Proposez aussi vos idées.',alternates:{canonical:'/roadmap'}};
// Same content as the "Feuille de route" section of the README: keep both in sync.
const now=[['refresh','Chaque version de Genshin','Nouveaux personnages, armes et artéfacts, simulateur mis à jour.'],['monitor','UID lu par le scanner','Kamera FR relève votre UID Genshin tout seul.'],['star','Lettre d’information','Les nouveautés du carnet, pour les comptes qui l’ont acceptée.']];
const steps=[['25 €','Application Android','Le compte développeur Google Play (environ 25 €, payé une seule fois) pour sortir le carnet sur le Play Store.'],['100 €','Application iPhone','Le compte développeur Apple (environ 99 € par an) pour sortir le carnet sur l’App Store.'],['Ensuite','Paliers suivants','Annoncés ici dès qu’ils seront fixés, selon vos idées.']];
const later=[['bulb','Assistant IA','Il répond à partir de votre compte : « qui monter en premier ? », « que me manque-t-il pour ce personnage ? »','Chaque question est facturée par le fournisseur d’IA.'],['clock','Rappels','Résine pleine, fin de bannière, domaine du jour : par e-mail ou notification.','Envoi de messages en grand nombre.'],['upload','Scan depuis le téléphone','À partir de captures d’écran, sans PC Windows.','La lecture des images demande un serveur plus puissant.'],['shield','Sauvegardes hors serveur','Une copie automatique de chaque carnet, ailleurs que sur le serveur.','Stockage externe payé au mois.']];
const floating=['TeachingsOfContention','TeachingsOfJustice','TeachingsOfOrder'];

export default function Page(){return <div className={`${landing.landing} ${styles.page}`}>
  <a className="skip" href="#contenu">Aller au contenu</a>
  <header className={landing.header}><Link href="/" className={landing.brand} aria-label="Genshin Tracker, accueil"><img src="/assets/mark.svg" width="36" height="36" alt=""/><span>GENSHIN<small>TRACKER</small></span></Link><nav aria-label="Navigation du site"><Link href="/#possibilites">Les possibilités</Link><Link href="/#tarifs">Tarifs</Link><Link href="/roadmap" aria-current="page">Roadmap</Link></nav><div className={landing.headerActions}><Link href="/app?connexion" className="text-button">Se connecter</Link><Link href="/app" className="button primary">Essai gratuit <Icon name="chevron"/></Link></div></header>
  <main id="contenu" className={landing.main}>
    <section className={styles.hero} aria-labelledby="roadmap-title">
      <div className={styles.sky} aria-hidden="true"><span className={styles.ring}/><span className={styles.ring}/>{floating.map(key=><img key={key} src={`/assets/materials/${key}.png`} alt="" width="56" height="56"/>)}</div>
      <h1 id="roadmap-title">La suite du <em>voyage.</em></h1>
      <p>Genshin Tracker n’est pas fait pour gagner de l’argent. Les abonnements et les dons paient le site, et tout le reste revient au carnet. Voici ce qu’ils financeront ensuite.</p>
      <div className={styles.actions}><a href="#idee" className="button primary">Proposer une idée <Icon name="bulb"/></a><a href="https://donate.stripe.com/7sYcN7blUaiE2ldgCK4gg00" target="_blank" rel="noreferrer" className="text-button">Soutenir le projet ↗</a></div>
    </section>

    <section className={styles.block} aria-labelledby="now-title">
      <h2 id="now-title">À chaque mise à jour</h2>
      <div className={styles.now}>{now.map(([icon,title,text])=><article key={title} className={styles.reveal}><span className={styles.live}>En cours</span><span className={landing.symbol}><Icon name={icon}/></span><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>

    <section className={styles.block} aria-labelledby="steps-title">
      <span className="eyebrow">LES PROCHAINES ÉTAPES</span><h2 id="steps-title">Chaque palier débloque une plateforme</h2>
      <p className={styles.lead}>Chaque palier correspond à ce que les abonnements et les dons auront réuni. Quand il est atteint, on le lance.</p>
      <ol className={styles.path}>{steps.map(([tier,title,text],i)=><li key={title} className={styles.reveal} style={{'--i':i}}><span className={styles.node} aria-hidden="true">{i+1}</span><div><strong className={styles.tier}>{tier}</strong><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
    </section>

    <section className={styles.block} aria-labelledby="later-title">
      <h2 id="later-title">Quand les abonnements suivront</h2>
      <p className={styles.lead}>Ces fonctions coûtent chaque mois. Elles arriveront quand les abonnements couvriront ce coût, pas avant : pas de fonction lancée puis coupée.</p>
      <div className={styles.later}>{later.map(([icon,title,text,cost])=><article key={title} className={styles.reveal}><span className={landing.symbol}><Icon name={icon}/></span><h3>{title}</h3><p>{text}</p><small><strong>Pourquoi ça coûte :</strong> {cost}</small></article>)}</div>
    </section>

    <section id="idee" className={styles.idea} aria-labelledby="idea-title">
      <div className={styles.ideaCopy}><span className={landing.symbol}><Icon name="bulb"/></span><h2 id="idea-title">Demander une fonctionnalité</h2><p>Il vous manque quelque chose pour préparer vos sessions ? Décrivez-le. Chaque idée est lue par une personne, et les plus demandées passent en priorité.</p><ul><li><Icon name="check"/>Réponse par e-mail ou dans Aide et contact</li><li><Icon name="check"/>Sans compte, il suffit d’une adresse e-mail</li></ul></div>
      <div className={styles.ideaForm}><Help idea/></div>
    </section>
  </main>
  <footer className={styles.footer}><LegalLinks/><span>© 2026 Lux Audere · Projet indépendant, non affilié à HoYoverse.</span></footer>
</div>;}
