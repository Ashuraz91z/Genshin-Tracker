import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const hash = value => createHash('sha256').update(value).digest('hex');
export const secret = () => randomBytes(32).toString('base64url');
export class Problem extends Error { constructor(message, status=400) { super(message); this.status=status; } }
const integer = (v,min,max) => Number.isInteger(v) && v>=min && v<=max;
const key = v => typeof v==='string' && /^[A-Za-z][A-Za-z0-9]{0,100}$/.test(v);
const need = (condition,message) => { if (!condition) throw new Problem(message); };

export function validateScan(body) {
  need(body && typeof body==='object' && !Array.isArray(body),'Scan invalide.');
  need(typeof body.scanId==='string' && /^[a-zA-Z0-9_-]{16,100}$/.test(body.scanId),'Identifiant du scan invalide.');
  const time=Date.parse(body.capturedAt);
  need(Number.isFinite(time) && time<=Date.now()+600000,'Date du scan invalide ou horloge du PC en avance.');
  const good=body.good;
  need(good?.format==='GOOD' && [1,2,3].includes(good.version),'Un fichier GOOD compatible est attendu.');
  const cleaned={};
  for (const category of ['characters','weapons','artifacts']) {
    if (good[category]===undefined) continue;
    need(Array.isArray(good[category]) && good[category].length<=20000,`Liste ${category} invalide.`);
    cleaned[category]=good[category].map(item => {
      need(item && typeof item==='object' && !Array.isArray(item),'Objet invalide.');
      const location=item.location??'';
      if (category==='characters') {
        need(key(item.key) && integer(item.level,1,100) && integer(item.constellation,0,6) && integer(item.ascension,0,10),'Personnage invalide.');
        need(item.talent && ['auto','skill','burst'].every(t=>integer(item.talent[t],1,15)),'Aptitudes invalides.');
        return {key:item.key,level:item.level,constellation:item.constellation,ascension:item.ascension,
          talent:Object.fromEntries(['auto','skill','burst'].map(t=>[t,item.talent[t]]))};
      }
      need(location==='' || key(location),'Équipement associé invalide.');
      need(integer(item.rarity??1,1,5) && integer(item.level,0,100),'Niveau ou rareté invalide.');
      if(category==='weapons') {
        need(key(item.key) && integer(item.refinement,1,5) && integer(item.ascension,0,10),'Arme invalide.');
        return {key:item.key,level:item.level,ascension:item.ascension,refinement:item.refinement,location,lock:item.lock===true};
      }
      need(integer(item.rarity,1,5) && key(item.setKey) && ['flower','plume','sands','goblet','circlet'].includes(item.slotKey) && integer(item.level,0,20),'Artéfact invalide.');
      need(typeof item.mainStatKey==='string' && /^[A-Za-z_]{1,40}$/.test(item.mainStatKey),'Statistique principale invalide.');
      need(Array.isArray(item.substats) && item.substats.length<=4 && item.substats.every(s=>s && /^[A-Za-z_]{1,40}$/.test(s.key) && typeof s.value==='number' && Number.isFinite(s.value) && s.value>=0 && s.value<=100000),'Statistiques secondaires invalides.');
      return {setKey:item.setKey,slotKey:item.slotKey,rarity:item.rarity,level:item.level,mainStatKey:item.mainStatKey,
        substats:item.substats.map(s=>({key:s.key,value:s.value})),location,lock:item.lock===true};
    });
    if(category==='characters') need(new Set(cleaned.characters.map(c=>c.key)).size===cleaned.characters.length,'Personnages en double.');
  }
  if(good.materials!==undefined) {
    need(good.materials && typeof good.materials==='object' && !Array.isArray(good.materials) && Object.keys(good.materials).length<=10000,'Matériaux invalides.');
    need(Object.entries(good.materials).every(([k,v])=>key(k) && !['constructor','prototype'].includes(k) && integer(v,0,1e12)),'Quantité de matériau invalide.');
    cleaned.materials={...good.materials};
  }
  need(Object.keys(cleaned).length>0,'Le scan ne contient aucune catégorie exploitable.');
  const raw=body.report??{};
  need(raw && typeof raw==='object' && !Array.isArray(raw),'Rapport invalide.');
  const errors=Array.isArray(raw.errors)?raw.errors.slice(0,500).map(e=>String(e).slice(0,2000)):[];
  const selected={};
  for(const category of ['characters','weapons','artifacts','materials','developmentItems']) selected[category]=raw.selected?.[category]===true;
  const expected={};
  for(const category of ['weapons','artifacts']) expected[category]=integer(raw.expectedFromScreen?.[category],0,20000)?raw.expectedFromScreen[category]:null;
  return {scanId:body.scanId,capturedAt:new Date(time).toISOString(),good:cleaned,
    report:{errorCount:Array.isArray(raw.errors)?raw.errors.length:0,status:String(raw.status??'imported').slice(0,80),errors,selected,expectedFromScreen:expected,
      partialCharacters:Array.isArray(raw.partialCharacters)?raw.partialCharacters.slice(0,300).map(c=>({key:String(c?.key??'Inconnu').slice(0,100),level:integer(c?.level,1,100)?c.level:null})):[],completenessVerified:false}};
}

export function openStore(path) {
  const db=new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT UNIQUE COLLATE NOCASE,salt TEXT,password TEXT,created TEXT);
    CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires INTEGER);
    CREATE TABLE IF NOT EXISTS pairs(hash TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires INTEGER);
    CREATE TABLE IF NOT EXISTS devices(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),name TEXT,token TEXT UNIQUE,created TEXT,last_seen TEXT);
    CREATE TABLE IF NOT EXISTS accounts(user_id TEXT PRIMARY KEY REFERENCES users(id),data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS scans(user_id TEXT REFERENCES users(id),scan_id TEXT,captured TEXT,received TEXT,device TEXT,report TEXT,counts TEXT,applied TEXT,PRIMARY KEY(user_id,scan_id));`);
  const now=()=>new Date().toISOString();
  const blank=()=>({characters:[],weapons:[],artifacts:[],materials:{},watermarks:{},quality:{},updatedAt:null});
  return {
    db, close:()=>db.close(),
    register(name,password) {
      need(typeof name==='string' && /^[\p{L}\p{N}_ -]{3,32}$/u.test(name.trim()),'Pseudo : 3 à 32 lettres, chiffres, espaces ou tirets.');
      need(typeof password==='string' && password.length>=12 && password.length<=128,'Mot de passe : 12 à 128 caractères.');
      name=name.trim();
      if(db.prepare('SELECT id FROM users WHERE name=?').get(name)) throw new Problem('Ce pseudo est déjà utilisé.',409);
      const id=secret(), salt=secret(),digest=scryptSync(password,salt,64).toString('hex');
      db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id,name,salt,digest,now());
      return {id,name};
    },
    login(name,password) {
      need(typeof name==='string' && typeof password==='string' && password.length<=128,'Identifiants invalides.');
      const user=db.prepare('SELECT * FROM users WHERE name=?').get(name.trim());
      const digest=scryptSync(password,user?.salt??'dummy-salt-for-timing',64);
      if(!user || !timingSafeEqual(digest,Buffer.from(user.password,'hex'))) throw new Problem('Pseudo ou mot de passe incorrect.',401);
      return {id:user.id,name:user.name};
    },
    session(user) { const token=secret(); db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),user.id,Date.now()+7*864e5);return token; },
    user(token) { return token?db.prepare('SELECT u.id,u.name FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.hash=? AND s.expires>?').get(hash(token),Date.now()):null; },
    logout(token) { db.prepare('DELETE FROM sessions WHERE hash=?').run(hash(token??'')); },
    pair(user) {
      db.prepare('DELETE FROM pairs WHERE user_id=? OR expires<?').run(user.id,Date.now());
      const code=randomBytes(18).toString('base64url');
      db.prepare('INSERT INTO pairs VALUES(?,?,?)').run(hash(code),user.id,Date.now()+600000);
      return {code,expiresAt:new Date(Date.now()+600000).toISOString()};
    },
    redeem(code,name) {
      need(typeof code==='string' && code.length<=100 && typeof name==='string' && name.trim().length>0 && name.length<=64,'Code ou nom du PC invalide.');
      const pair=db.prepare('SELECT * FROM pairs WHERE hash=? AND expires>?').get(hash(code),Date.now());
      if(!pair) throw new Problem('Code expiré ou déjà utilisé. Générez-en un nouveau sur le site.',401);
      const token=secret(),id=secret();
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('DELETE FROM pairs WHERE hash=?').run(pair.hash);
        db.prepare('INSERT INTO devices VALUES(?,?,?,?,?,?)').run(id,pair.user_id,name.trim(),hash(token),now(),null);
        db.exec('COMMIT');
      } catch(e) {db.exec('ROLLBACK');throw e;}
      const user=db.prepare('SELECT name FROM users WHERE id=?').get(pair.user_id);
      return {token,deviceId:id,accountId:pair.user_id,username:user.name};
    },
    device(token) { return token?db.prepare('SELECT id,user_id,name FROM devices WHERE token=?').get(hash(token)):null; },
    revoke(user,id) { db.prepare('DELETE FROM devices WHERE id=? AND user_id=?').run(id,user.id); },
    account(user) {
      const row=db.prepare('SELECT data FROM accounts WHERE user_id=?').get(user.id);
      const devices=db.prepare('SELECT id,name,created,last_seen FROM devices WHERE user_id=? ORDER BY created DESC').all(user.id);
      const scans=db.prepare('SELECT scan_id,captured,received,device,report,counts,applied FROM scans WHERE user_id=? ORDER BY received DESC LIMIT 30').all(user.id)
        .map(s=>({...s,report:((r)=>({...r,errors:r.errors.slice(0,20)}))(JSON.parse(s.report)),counts:JSON.parse(s.counts),applied:JSON.parse(s.applied)}));
      return {user:{name:user.name},data:row?JSON.parse(row.data):blank(),devices,scans};
    },
    sync(userId,deviceName,body,deviceId) {
      const scan=validateScan(body);
      if(db.prepare('SELECT 1 FROM scans WHERE user_id=? AND scan_id=?').get(userId,scan.scanId)) return {ok:true,duplicate:true};
      const row=db.prepare('SELECT data FROM accounts WHERE user_id=?').get(userId);
      const data=row?JSON.parse(row.data):blank(),applied={},counts={};
      for(const category of ['characters','weapons','artifacts','materials']) {
        const items=scan.good[category];
        if(items===undefined) continue;
        counts[category]=category==='materials'?Object.keys(items).length:items.length;
        if(data.watermarks[category] && scan.capturedAt<=data.watermarks[category]) {applied[category]='older_scan';continue;}
        if(category==='characters') {
          const merged=new Map(data.characters.map(c=>[c.key,c]));
          items.forEach(c=>merged.set(c.key,c));data.characters=[...merged.values()];applied[category]='merged';
        } else if(category==='materials') {data.materials={...data.materials,...items};applied[category]='merged';}
        else {
          const verified=scan.report.status==='finished_unverified' && scan.report.errors.length===0
            && scan.report.selected[category] && scan.report.expectedFromScreen[category]===items.length;
          if(verified || !data.watermarks[category]) {
            data[category]=items;data.quality[category]=verified?'count_matched':'partial';applied[category]=verified?'replaced':'first_partial';
          } else {applied[category]='preserved_previous';continue;}
        }
        data.watermarks[category]=scan.capturedAt;
      }
      data.updatedAt=now();
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('INSERT INTO accounts VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data').run(userId,JSON.stringify(data));
        db.prepare('INSERT INTO scans VALUES(?,?,?,?,?,?,?,?)').run(userId,scan.scanId,scan.capturedAt,now(),deviceName,JSON.stringify(scan.report),JSON.stringify(counts),JSON.stringify(applied));
        if(deviceId) db.prepare('UPDATE devices SET last_seen=? WHERE id=?').run(now(),deviceId);
        db.exec('COMMIT');
      } catch(e) {db.exec('ROLLBACK');throw e;}
      return {ok:true,duplicate:false,applied};
    }
  };
}
