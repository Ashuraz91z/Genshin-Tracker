import Link from 'next/link';
import styles from './legal.module.css';
import { localePath } from '../lib/i18n.mjs';

const labels = {
  fr: { aria: 'Informations légales', legal: 'Mentions légales', privacy: 'Confidentialité', cookies: 'Cookies et stockage local', terms: 'Conditions d’utilisation', credits: 'Crédits et licences', roadmap: 'Roadmap', help: 'Aide et contact' },
  en: { aria: 'Legal information', legal: 'Legal notice', privacy: 'Privacy', cookies: 'Cookies and local storage', terms: 'Terms of use', credits: 'Credits and licenses', roadmap: 'Roadmap', help: 'Help and contact' },
};

export default function LegalLinks({ locale = 'fr' }) {
  const t = labels[locale], L = href => localePath(locale, href);
  return <nav className={styles.links} aria-label={t.aria}>
    <Link href={L('/mentions-legales')}>{t.legal}</Link>
    <Link href={L('/confidentialite')}>{t.privacy}</Link>
    <Link href={L('/cookies')}>{t.cookies}</Link>
    <Link href={L('/conditions-utilisation')}>{t.terms}</Link>
    <Link href={L('/mentions-legales#credits')}>{t.credits}</Link>
    <Link href={L('/roadmap')}>{t.roadmap}</Link>
    <Link href={L('/aide')}>{t.help}</Link>
  </nav>;
}
