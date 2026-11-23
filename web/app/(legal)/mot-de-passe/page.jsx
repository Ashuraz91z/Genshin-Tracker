import ResetPassword from '../../../components/ResetPassword';
import { headers } from 'next/headers';
import { localeFromHeaders } from '../../../lib/i18n.mjs';

export const metadata = { robots: { index: false }, title: 'Nouveau mot de passe — Genshin Tracker' };

export default async function Page() {
  const locale = localeFromHeaders(await headers());
  return <ResetPassword locale={locale} />;
}
