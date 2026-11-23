import Link from 'next/link';
import { headers } from 'next/headers';
import styles from '../../../components/legal.module.css';
import { localeFromHeaders, localePath } from '../../../lib/i18n.mjs';

export const metadata={title:'Cookies et stockage local — Genshin Tracker'};

function French(L) {
  return <>
    <h1>Cookies et stockage local</h1><p className={styles.date}>Dernière mise à jour : 17 novembre 2026</p>
    <p>Le site utilise les stockages ci-dessous pour la connexion ou pour les fonctionnalités que vous demandez. Le code du site n’intègre actuellement aucun outil publicitaire ni de mesure d’audience tiers. Aucun choix « tout accepter » n’est demandé pour les fonctions strictement nécessaires ; cela ne vaut pas autorisation pour ajouter d’autres traceurs.</p>
    <div className={styles.table}><table><caption>Stockages utilisés par l’application</caption><thead><tr><th scope="col">Nom et support</th><th scope="col">Utilité</th><th scope="col">Durée sur le navigateur</th></tr></thead><tbody>
      <tr><td><code>gt_session</code><br/>Cookie</td><td>Vous reconnaître après connexion. Il n’est pas accessible aux scripts du site.</td><td>Sept jours au maximum pour ce cookie, ou jusqu’à déconnexion ou effacement par le navigateur. Une nouvelle connexion crée une nouvelle session.</td></tr>
      <tr><td><code>gt-appearance</code><br/>Stockage local</td><td>Conserver le thème et le réglage de transparence choisis.</td><td>Jusqu’à l’effacement du stockage du site par l’utilisateur ; aucune expiration automatique.</td></tr>
    </tbody></table></div>
    <h2>Gérer ou effacer ces données</h2><p>Vous pouvez vous déconnecter pour supprimer le cookie de connexion et supprimer les données de ce site dans les réglages de votre navigateur. Bloquer le cookie de connexion empêche de maintenir une session authentifiée. Bloquer les stockages locaux peut empêcher de conserver vos préférences. Cela n’empêche pas de lire les pages publiques.</p>
    <p>L’hébergement et la protection technique du trafic peuvent évoluer ; tout traceur supplémentaire doit être vérifié avant activation. Si un outil de mesure d’audience ou de publicité soumis à consentement est ajouté, il devra rester désactivé avant votre choix, avec un refus et un retrait aussi simples que l’acceptation.</p>
    <p>Pour les données traitées sur le serveur, consultez la <Link href={L('/confidentialite')}>politique de confidentialité</Link>. Les clés de connexion du compagnon Windows restent sur le PC, protégées par Windows ; elles ne sont pas des cookies du navigateur.</p>
  </>;
}

function English(L) {
  return <>
    <h1>Cookies and local storage</h1><p className={styles.date}>Last updated: 17 November 2026</p>
    <p>The site uses the storage below for sign-in and for the features you ask for. The site code currently includes no advertising tool and no third-party analytics. No “accept all” choice is requested for strictly necessary features; this does not authorize adding other trackers.</p>
    <div className={styles.table}><table><caption>Storage used by the application</caption><thead><tr><th scope="col">Name and medium</th><th scope="col">Purpose</th><th scope="col">Duration in the browser</th></tr></thead><tbody>
      <tr><td><code>gt_session</code><br/>Cookie</td><td>Recognizes you after sign-in. Site scripts cannot read it.</td><td>Seven days at most for this cookie, or until you sign out or the browser clears it. A new sign-in creates a new session.</td></tr>
      <tr><td><code>gt-appearance</code><br/>Local storage</td><td>Keeps the theme and transparency setting you chose.</td><td>Until you clear the site’s storage; no automatic expiry.</td></tr>
    </tbody></table></div>
    <h2>Managing or deleting this data</h2><p>You can sign out to remove the sign-in cookie, and delete this site’s data in your browser settings. Blocking the sign-in cookie prevents keeping an authenticated session. Blocking local storage may prevent your preferences from being kept. Public pages remain readable.</p>
    <p>Hosting and technical traffic protection may change; any additional tracker must be checked before it is enabled. If an analytics or advertising tool requiring consent is added, it must stay off until you choose, and refusing or withdrawing must be as simple as accepting.</p>
    <p>For data processed on the server, see the <Link href={L('/confidentialite')}>privacy policy</Link>. The Windows companion’s sign-in keys stay on the PC, protected by Windows; they are not browser cookies.</p>
  </>;
}

export default async function Page() {
  const locale = localeFromHeaders(await headers()), L = href => localePath(locale, href);
  return locale === 'en' ? English(L) : French(L);
}
