// Free primogem income, as editable estimates: amounts change between game versions.
// kind: per day, per reset on a day of the month, or per 42-day version.
export const sources=[
  {id:'commissions',name:'Commissions quotidiennes',amount:60,per:'day',on:true},
  {id:'welkin',name:'Bénédiction de la lune',amount:90,per:'day',on:false},
  {id:'abyss',name:'Profondeurs spiralées (36 étoiles)',amount:800,per:'month',day:16,on:true},
  {id:'theater',name:'Théâtre imaginarium',amount:1000,per:'month',day:1,on:true},
  {id:'stygian',name:'Assaut stygien',amount:450,per:'version',on:true},
  {id:'version',name:'Maintenance et codes du live',amount:900,per:'version',on:true},
  {id:'events',name:'Événements et quêtes de version',amount:0,per:'version',on:true},
  {id:'pass',name:'Passe de combat (Hymne gnostique)',amount:680,fates:4,per:'version',on:false},
  {id:'bargains',name:'Boutique de Paimon (poussière)',amount:0,fates:5,per:'month',day:1,on:true}
];
const dayMs=864e5;
// Resets strictly after `from` and up to `to` (inclusive) on a given day of the month.
export function resetsBetween(from,to,day) {
  let n=0;const d=new Date(from.getFullYear(),from.getMonth(),day);
  if(d<=from)d.setMonth(d.getMonth()+1);
  for(;d<=to;d.setMonth(d.getMonth()+1))n++;
  return n;
}
export function forecast({primos=0,fates=0,target,settings={}},now=new Date()) {
  const from=new Date(now.getFullYear(),now.getMonth(),now.getDate()),to=new Date(target);
  const days=Math.max(0,Math.round((to-from)/dayMs)),versions=Math.floor(days/42);
  const rows=sources.map(s=>{
    const o={...s,...settings[s.id]};if(!o.on)return {...o,count:0,primos:0,fates:0};
    const count=o.per==='day'?days:o.per==='version'?versions:resetsBetween(from,to,o.day);
    return {...o,count,primos:count*(Number(o.amount)||0),fates:count*(o.fates??0)};
  });
  const totalPrimos=Number(primos)+rows.reduce((a,r)=>a+r.primos,0),totalFates=Number(fates)+rows.reduce((a,r)=>a+r.fates,0);
  return {days,rows,totalPrimos,totalFates,wishes:Math.floor(totalPrimos/160)+totalFates};
}
// Banners change at each version (every 42 days) and at phase 2 (20 days later).
// Anchor: version 7.2 started on 4 Nov 2026; update it if HoYoverse shifts the calendar.
const anchor=new Date(2026,10,4);
export function nextBanners(now=new Date(),count=4) {
  const out=[];
  for(let k=0;out.length<count;k++){const v=new Date(anchor.getFullYear(),anchor.getMonth(),anchor.getDate()+42*k);
    for(const [offset,phase] of [[0,'Nouvelle version'],[20,'Phase 2']]){const d=new Date(v.getFullYear(),v.getMonth(),v.getDate()+offset);if(d>now&&out.length<count)out.push({date:d,label:phase});}}
  return out;
}
// Worst case for the banner's 5★: 90 wishes to hard pity, twice if the 50/50 is not guaranteed.
export const wishesToGuarantee=(pity=0,guaranteed=false)=>Math.max(0,(guaranteed?90:180)-pity);
// Taux de base de la bannière personnage : identiques pour tous les joueurs (wiki Genshin, guides communautaires).
export const baseRates={fiveStar:{base:0.6,softPityFrom:74,hardPity:90},fourStar:{base:5.1,guaranteedEvery:10},
  fiftyFifty:'Un 5★ sur deux est le personnage à l’affiche ; si on perd, le suivant est garanti.'};
// Personnages à l’affiche (« ups »), saisis à la main d’après des guides : à vérifier en jeu.
export const featuredBanners=[{start:[2026,10,24],end:[2026,11,15],version:'7.2 · Phase 2',featured:['Zibai','Linnea'],checked:'24 novembre 2026, guides communautaires'}];
export function featuredFor(date) {
  const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());
  return featuredBanners.find(b=>d>=new Date(...b.start)&&d<=new Date(...b.end))??null;
}
