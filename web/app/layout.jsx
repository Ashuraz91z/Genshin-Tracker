import { headers } from 'next/headers';
import './globals.css';
import Telemetry from '../components/Telemetry';
import LocalFeedback from '../components/LocalFeedback';
import { localeFromHeaders } from '../lib/i18n.mjs';
export const metadata={metadataBase:new URL(process.env.PUBLIC_URL||'https://genshin-tracker.com'),title:'Genshin Tracker — Votre carnet d’aventure',description:'Votre compagnon Genshin : personnages, inventaire et synchronisation des scans Kamera.',icons:{icon:'/assets/mark.svg'},verification:{other:{'msvalidate.01':'014B6B50364432E6EF12A9D49441E4C8'}},...(process.env.SITE_ENV==='dev'&&{robots:{index:false,follow:false}})};
export default async function RootLayout({children}) {
  const requestHeaders=await headers(),nonce=requestHeaders.get('x-nonce'),locale=localeFromHeaders(requestHeaders);
  return <html lang={locale} suppressHydrationWarning><head><script nonce={nonce} dangerouslySetInnerHTML={{__html:`try{var a=JSON.parse(localStorage.getItem('gt-appearance')||'{}');document.documentElement.dataset.theme=['light','dark'].includes(a.theme)?a.theme:'system';document.documentElement.dataset.reducedGlass=String(a.reducedGlass===true)}catch{}`}}/></head><body>{process.env.SITE_ENV==='dev'&&<div className="dev-banner">Site de test — paiements réels (Stripe live)</div>}{children}<Telemetry/>{process.env.NODE_ENV==='development'&&<LocalFeedback/>}</body></html>;
}
