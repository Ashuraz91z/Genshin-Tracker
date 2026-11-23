import Help from '../../../components/Help';
import { headers } from 'next/headers';
import { localeFromHeaders } from '../../../lib/i18n.mjs';

const meta = {
  fr: { title: 'Aide et contact — Genshin Tracker', description: 'Questions fréquentes et formulaire de contact de Genshin Tracker.' },
  en: { title: 'Help and contact — Genshin Tracker', description: 'Frequently asked questions and the Genshin Tracker contact form.' },
};

export async function generateMetadata() {
  const locale = localeFromHeaders(await headers());
  return { ...meta[locale], alternates: { canonical: locale === 'en' ? '/en/aide' : '/aide' } };
}

export default async function Page() {
  const locale = localeFromHeaders(await headers());
  return <Help locale={locale} />;
}
