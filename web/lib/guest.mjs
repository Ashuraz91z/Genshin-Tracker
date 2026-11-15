import { validateScan } from './scan.mjs';
export const guestStorageKey='genshin-tracker-guest';
export function guestAccount(good,now=new Date().toISOString()) {
  const scan=validateScan({scanId:'guest-local-import',capturedAt:now,good});
  return {guest:true,user:{name:'Visiteur'},devices:[],scans:[],data:{characters:[],weapons:[],artifacts:[],materials:{},...scan.good,quality:{weapons:'first_partial',artifacts:'first_partial'},updatedAt:scan.capturedAt}};
}
