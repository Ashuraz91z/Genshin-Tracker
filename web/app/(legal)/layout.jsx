import Link from 'next/link';
import { headers } from 'next/headers';
import LegalLinks from '../../components/LegalLinks';
import styles from '../../components/legal.module.css';
import { localeFromHeaders, localePath } from '../../lib/i18n.mjs';

const chrome = {
  fr: { skip: 'Aller au contenu', open: 'Ouvrir mon carnet ↗' },
  en: { skip: 'Skip to content', open: 'Open my notebook ↗' },
};

export default async function LegalLayout({children}) {
  const locale = localeFromHeaders(await headers()), t = chrome[locale], L = href => localePath(locale, href);
  return <div className={styles.shell}>
    <a className="skip" href="#legal-main">{t.skip}</a>
    <header className={styles.header}><Link href={L('/')} className={styles.brand}>Genshin Tracker</Link><Link href={L('/app')} className="text-button">{t.open}</Link></header>
    <main id="legal-main" tabIndex="-1" className={styles.main}><article className={styles.article}>{children}</article></main>
    <footer className={styles.footer}><LegalLinks locale={locale}/></footer>
  </div>;
}
