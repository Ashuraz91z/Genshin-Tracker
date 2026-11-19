import Link from 'next/link';
import styles from '../../../components/legal.module.css';

export const metadata={title:'Cookies et stockage local — Genshin Tracker'};
export default function Page() {
  return <>
    <h1>Cookies et stockage local</h1><p className={styles.date}>Dernière mise à jour : 17 novembre 2026</p>
    <p>Le site utilise les stockages ci-dessous pour la connexion ou pour les fonctionnalités que vous demandez. Le code du site n’intègre actuellement aucun outil publicitaire ni de mesure d’audience tiers. Aucun choix « tout accepter » n’est demandé pour les fonctions strictement nécessaires ; cela ne vaut pas autorisation pour ajouter d’autres traceurs.</p>
    <div className={styles.table}><table><caption>Stockages utilisés par l’application</caption><thead><tr><th scope="col">Nom et support</th><th scope="col">Utilité</th><th scope="col">Durée sur le navigateur</th></tr></thead><tbody>
      <tr><td><code>gt_session</code><br/>Cookie</td><td>Vous reconnaître après connexion. Il n’est pas accessible aux scripts du site.</td><td>Sept jours au maximum pour ce cookie, ou jusqu’à déconnexion ou effacement par le navigateur. Une nouvelle connexion crée une nouvelle session.</td></tr>
      <tr><td><code>gt-appearance</code><br/>Stockage local</td><td>Conserver le thème et le réglage de transparence choisis.</td><td>Jusqu’à l’effacement du stockage du site par l’utilisateur ; aucune expiration automatique.</td></tr>
    </tbody></table></div>
    <h2>Gérer ou effacer ces données</h2><p>Vous pouvez vous déconnecter pour supprimer le cookie de connexionet supprimer les données de ce site dans les réglages de votre navigateur. Bloquer le cookie de connexion empêche de maintenir une session authentifiée. Bloquer les stockages locaux peut empêcher de conserver vos préférences. Cela n’empêche pas de lire les pages publiques.</p>
    <p>L’hébergement et la protection technique du trafic peuvent évoluer ; tout traceur supplémentaire doit être vérifié avant activation. Si un outil de mesure d’audience ou de publicité soumis à consentement est ajouté, il devra rester désactivé avant votre choix, avec un refus et un retrait aussi simples que l’acceptation.</p>
    <p>Pour les données traitées sur le serveur, consultez la <Link href="/confidentialite">politique de confidentialité</Link>. Les clés de connexion du compagnon Windows restent sur le PC, protégées par Windows ; elles ne sont pas des cookies du navigateur.</p>
  </>;
}
