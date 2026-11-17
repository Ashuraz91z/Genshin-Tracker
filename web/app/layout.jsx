import { headers } from 'next/headers';
import './globals.css';
export const metadata={metadataBase:new URL(process.env.PUBLIC_URL||'https://genshin.lux-audere.com'),title:'Genshin Tracker — Votre carnet d’aventure',description:'Votre compagnon Genshin : personnages, inventaire et synchronisation des scans Kamera.',icons:{icon:'/assets/mark.svg'}};
export default async function RootLayout({children}) {
  const nonce=(await headers()).get('x-nonce');
  return <html lang="fr" suppressHydrationWarning><head><script nonce={nonce} dangerouslySetInnerHTML={{__html:`try{var a=JSON.parse(localStorage.getItem('gt-appearance')||'{}');document.documentElement.dataset.theme=['light','dark'].includes(a.theme)?a.theme:'system';document.documentElement.dataset.reducedGlass=String(a.reducedGlass===true)}catch{}`}}/></head><body>{children}</body></html>;
}
