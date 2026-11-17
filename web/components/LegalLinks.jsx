import Link from 'next/link';
import styles from './legal.module.css';

export default function LegalLinks() {
  return <nav className={styles.links} aria-label="Informations légales">
    <Link href="/mentions-legales">Mentions légales</Link>
    <Link href="/confidentialite">Confidentialité</Link>
    <Link href="/cookies">Cookies et stockage local</Link>
    <Link href="/conditions-utilisation">Conditions d’utilisation</Link>
    <Link href="/aide">Aide et contact</Link>
  </nav>;
}
