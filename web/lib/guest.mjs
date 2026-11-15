import { validateScan } from './scan.mjs';
import { emptyCustomization, projectInventory } from './customization.mjs';
export const guestCustomStorageKey='genshin-tracker-guest-custom';
export const guestStorageKey='genshin-tracker-guest';
export function guestAccount(good,now=new Date().toISOString(),custom=emptyCustomization()) {
  const scan=validateScan({scanId:'guest-local-import',capturedAt:now,good});
  return {guest:true,customizations:custom,user:{name:'Visiteur'},devices:[],scans:[],data:projectInventory({characters:[],weapons:[],artifacts:[],materials:{},...scan.good,quality:{weapons:'first_partial',artifacts:'first_partial'},updatedAt:scan.capturedAt},custom)};
}
