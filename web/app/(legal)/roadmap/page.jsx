import Help from '../../../components/Help';
import styles from '../../../components/legal.module.css';

export const metadata={title:'Feuille de route — Genshin Tracker',description:'Ce qui arrive sur Genshin Tracker : applications mobiles, assistant IA, rappels, scan depuis le téléphone. Proposez aussi vos idées.',alternates:{canonical:'/roadmap'}};
// Same content as the "Feuille de route" section of the README: keep both in sync.
const tiers=[['25 € récoltés','Compte développeur Google Play (environ 25 €, payé une seule fois) pour sortir une application Android.'],['100 € récoltés','Compte développeur Apple (environ 99 € par an) pour sortir une application iPhone.'],['Paliers suivants','Annoncés ici dès qu’ils seront fixés.']];
const paid=[['Assistant IA qui répond à partir de votre compte (« qui monter en premier ? », « que me manque-t-il pour ce personnage ? »)','Chaque question est facturée par le fournisseur d’IA.'],['Rappels par e-mail ou notification (résine pleine, fin de bannière, domaine du jour)','Envoi de messages en grand nombre.'],['Scan depuis le téléphone à partir de captures d’écran, sans PC Windows','La lecture des images se fait sur un serveur plus puissant.'],['Sauvegardes automatiques hors serveur des comptes','Stockage externe payé au mois.']];
const table=(head,rows)=><div className={styles.table}><table><thead><tr>{head.map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{rows.map(([a,b])=><tr key={a}><td><strong>{a}</strong></td><td>{b}</td></tr>)}</tbody></table></div>;

export default function Page(){return <>
  <h1>Feuille de route</h1>
  <p>Genshin Tracker n’est pas fait pour gagner de l’argent : l’abonnement et les <a href="https://donate.stripe.com/7sYcN7blUaiE2ldgCK4gg00" target="_blank" rel="noreferrer">dons</a> paient ce que le site coûte, et tout le reste est réinvesti dans le projet. Voici ce qu’ils financeront ensuite.</p>
  <h2>Les paliers</h2>
  {table(['Palier','Ce qui sera fait'],tiers)}
  <h2>Dès que les fonds le permettent</h2>
  <p>Ces fonctions coûtent chaque mois. Elles arriveront quand les abonnements couvriront ce coût.</p>
  {table(['Fonctionnalité','Pourquoi elle coûte'],paid)}
  <h2>En continu</h2>
  <ul><li>Mise à jour des données du jeu et du simulateur à chaque nouvelle version de Genshin.</li><li>Lecture automatique de l’UID Genshin par le scanner Kamera FR.</li><li>Lettre d’information pour les comptes qui l’ont acceptée.</li></ul>
  <h2 id="idee">Demander une fonctionnalité</h2>
  <p>Il vous manque quelque chose pour préparer vos sessions ? Décrivez-le : chaque idée est lue, et les plus demandées passent en priorité.</p>
  <Help idea/>
</>;}
