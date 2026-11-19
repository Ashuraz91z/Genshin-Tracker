import { ImageResponse } from 'next/og';
// Share preview for links posted on Discord, X, etc. (Next serves it at /opengraph-image).
export const alt='Genshin Tracker — Suivi de compte, inventaire et équipes Genshin Impact';
export const size={width:1200,height:630};
export const contentType='image/png';
export default function Image(){return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',padding:'80px',background:'linear-gradient(135deg,#0b1120 0%,#14283b 100%)',color:'#edf2f7',fontFamily:'Georgia, serif'}}>
  <div style={{fontSize:28,letterSpacing:8,color:'#e7bf7c'}}>GENSHIN TRACKER</div>
  <div style={{fontSize:72,lineHeight:1.1,marginTop:28,maxWidth:950}}>Votre compte Genshin Impact, en clair.</div>
  <div style={{fontSize:32,marginTop:32,color:'#a6b3c6'}}>Personnages, inventaire, équipes et matériaux à farmer · Essai gratuit 14 jours</div>
</div>,size);}
