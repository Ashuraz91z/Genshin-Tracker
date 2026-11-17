import Link from 'next/link';
import styles from '../../../components/legal.module.css';

export const metadata={title:'Mentions légales — Genshin Tracker'};
export default function Page() {
  return <>
    <h1>Mentions légales</h1><p className={styles.date}>Dernière mise à jour : 17 novembre 2026</p>
    <h2>Éditeur du site</h2>
    <dl><dt>Identité</dt><dd>Lucas Fernandes — entrepreneur individuel (EI)</dd><dt>Nom commercial</dt><dd>Lux Audere</dd><dt>SIREN</dt><dd>930 334 248</dd><dt>SIRET du siège</dt><dd>930 334 248 00018</dd><dt>Immatriculation</dt><dd>Registre national des entreprises (RNE), depuis le 25 juin 2024</dd><dt>Adresse professionnelle</dt><dd>128 avenue Jean Jaurès, 91200 Athis-Mons, France</dd><dt>Contact</dt><dd><a href="mailto:contact@genshin-tracker.com">contact@genshin-tracker.com</a></dd><dt>Téléphone</dt><dd><a href="tel:+33759945525">+33 7 59 94 55 25</a></dd><dt>Directeur de la publication</dt><dd>Lucas Fernandes</dd></dl>
    <h2>Hébergement</h2>
    <p>Hostinger — HOSTINGER INTERNATIONAL LIMITED, 61 Lordou Vironos, 6023 Larnaca, Chypre.</p>
    <p>Contact technique réseau (NOC) : <a href="tel:+13024640055">+1 302 464 0055</a>. Ce contact technique ne remplace pas l’assistance client en ligne.</p>
    <p>Site et contact : <a href="https://www.hostinger.com/fr/contact" target="_blank" rel="noreferrer">hostinger.com</a>. Informations contractuelles : <a href="https://www.hostinger.com/fr/legal/termes-universels-de-contrat-de-service" target="_blank" rel="noreferrer">conditions Hostinger</a>.</p>
    <h2>Code source et propriété intellectuelle</h2>
    <p>Le code original du site et les outils propres au projet sont distribués sous <a href="/licenses/agpl-3.0.txt">GNU AGPL version 3 uniquement</a>. Le compagnon Windows Kamera FR reste sous licence MIT ; il adapte <a href="https://github.com/Andrewthe13th/Inventory_Kamera" target="_blank" rel="noreferrer">Inventory Kamera</a>, dont les <a href="/licenses/inventory-kamera.txt">notices d’origine</a> sont conservées. Les composants tiers restent soumis à leurs propres licences.</p>
    <p>Le dépôt du projet est <a href="https://github.com/Ashuraz91z/Genshin-Tracker" target="_blank" rel="noreferrer">Ashuraz91z/Genshin-Tracker</a>. Il est privé pendant la préparation de sa publication. Une copie du code correspondant au service peut être demandée à <a href="mailto:contact@genshin-tracker.com?subject=Code%20source%20Genshin%20Tracker">contact@genshin-tracker.com</a>.</p>
    <p>Genshin Impact, ses marques, personnages et illustrations appartiennent à leurs ayants droit, notamment HoYoverse / Cognosphere. Ces éléments ne deviennent pas libres du fait de la licence du code. Ce projet communautaire n’est ni affilié, ni approuvé par HoYoverse.</p>
    <h2>Données personnelles et utilisation</h2><p>Consultez la <Link href="/confidentialite">politique de confidentialité</Link>, les informations sur les <Link href="/cookies">cookies et stockages locaux</Link> et les <Link href="/conditions-utilisation">conditions d’utilisation</Link>.</p>
    <h2>Signaler un problème</h2><p>Pour une erreur, un contenu portant atteinte à vos droits ou une demande concernant le site, écrivez à <a href="mailto:contact@genshin-tracker.com">contact@genshin-tracker.com</a> en précisant la page et le problème rencontré. N’envoyez pas de mot de passe, de clé d’appareil ni de justificatif d’identité sans demande justifiée.</p>
  </>;
}
