import { headers } from 'next/headers';
import './globals.css';
export const metadata={title:'Genshin Tracker — Votre carnet d’aventure',description:'Votre compagnon Genshin : personnages, inventaire et synchronisation des scans Kamera.',icons:{icon:'/assets/mark.svg'}};
export default async function RootLayout({children}) {
  await headers();
  return <html lang="fr"><body>{children}</body></html>;
}
