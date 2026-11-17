import Link from 'next/link';
import LegalLinks from '../../components/LegalLinks';
import styles from '../../components/legal.module.css';

export default function LegalLayout({children}) {
  return <div className={styles.shell}>
    <a className="skip" href="#legal-main">Aller au contenu</a>
    <header className={styles.header}><Link href="/" className={styles.brand}>Genshin Tracker</Link><Link href="/app" className="text-button">Ouvrir mon carnet ↗</Link></header>
    <main id="legal-main" tabIndex="-1" className={styles.main}><article className={styles.article}>{children}</article></main>
    <footer className={styles.footer}><LegalLinks/></footer>
  </div>;
}
