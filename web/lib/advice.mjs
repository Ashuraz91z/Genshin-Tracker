const fmt=n=>n.toLocaleString('fr-FR');
// Paimon's Bargains: up to 5 Pierres de la fatalité a month for 75 Astrions libres each, and 5 for 5 Astéries libres each.
const SHOP={stardust:75,starglitter:5,perMonth:5};

// Mora reserve below which upgrades risk stalling: the goal is not running dry when spending resin, not a full build total.
// ponytail: two fixed steps by Adventure Rank; tune them if they feel off for very new or very old accounts.
export const moraFloor=rank=>Number.isInteger(rank)&&rank<45?1_000_000:2_000_000;

export function currencyAdvice(data) {
  const m=data.materials??{},tips=[];
  if(m.Mora!==undefined){
    const floor=moraFloor(data.profile?.adventureRank);
    if(m.Mora<floor)tips.push({tone:m.Mora<floor/4?'bad':'warn',title:'Réserve de moras basse',text:`${fmt(m.Mora)} moras, sous les ${fmt(floor)} conseillés pour votre compte. Gardez de la résine pour les Fleurs de richesse (Flux de mora) afin de ne pas être bloqué au moment d’élever un personnage ou une arme.`});
  }
  if(m.Primogem!==undefined||m.IntertwinedFate!==undefined){
    const wishes=Math.floor((m.Primogem??0)/160)+(m.IntertwinedFate??0);
    tips.push({tone:wishes>=90?'ok':'info',title:`${fmt(wishes)} vœu${wishes>1?'x':''} sur les bannières événement`,text:`${fmt(m.Primogem??0)} primogemmes (160 par vœu) et ${fmt(m.IntertwinedFate??0)} Pierre${(m.IntertwinedFate??0)>1?'s':''} de la fatalité. Il faut au pire 90 vœux pour un 5★, 180 pour être sûr d'avoir celui de la bannière.`});
  }
  const shop=[['MasterlessStardust','Astrions libres',SHOP.stardust],['MasterlessStarglitter','Astéries libres',SHOP.starglitter]]
    .map(([key,name,price])=>({name,owned:m[key]??0,price,fates:Math.min(SHOP.perMonth,Math.floor((m[key]??0)/price))})).filter(s=>s.fates>0);
  if(shop.length)tips.push({tone:'info',title:'À échanger à la Boutique de Paimon',text:shop.map(s=>`${fmt(s.owned)} ${s.name} → ${s.fates} Pierre${s.fates>1?'s':''} de la fatalité (${s.price} chacune)`).join(' · ')+'. Jusqu’à 5 par mois et par monnaie : pensez-y avant le 1er.'});
  return tips;
}
