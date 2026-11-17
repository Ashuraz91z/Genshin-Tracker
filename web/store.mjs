import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const hash = value => createHash('sha256').update(value).digest('hex');
export const secret = () => randomBytes(32).toString('base64url');
export const trialDays = 14;
function validEmail(email) {
  need(typeof email==='string' && email.trim().length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()),'Adresse e-mail invalide.');
  return email.trim().toLowerCase();
}
import { Problem, need, validateScan } from './lib/scan.mjs';
import { emptyCustomization, projectInventory, validateArtifactEdit, validateTeam } from './lib/customization.mjs';
export { Problem, validateScan } from './lib/scan.mjs';

export function openStore(path) {
  const db=new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT UNIQUE COLLATE NOCASE,salt TEXT,password TEXT,created TEXT);
    CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires INTEGER);
    CREATE TABLE IF NOT EXISTS pairs(hash TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires INTEGER);
    CREATE TABLE IF NOT EXISTS devices(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),name TEXT,token TEXT UNIQUE,created TEXT,last_seen TEXT);
    CREATE TABLE IF NOT EXISTS accounts(user_id TEXT PRIMARY KEY REFERENCES users(id),data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS scans(user_id TEXT REFERENCES users(id),scan_id TEXT,captured TEXT,received TEXT,device TEXT,report TEXT,counts TEXT,applied TEXT,PRIMARY KEY(user_id,scan_id));`);
  db.exec('CREATE TABLE IF NOT EXISTS customizations(user_id TEXT PRIMARY KEY REFERENCES users(id),data TEXT NOT NULL)');
  db.exec('CREATE TABLE IF NOT EXISTS tokens(hash TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),kind TEXT,expires INTEGER)');
  for(const column of ['email TEXT','email_verified INTEGER DEFAULT 0','newsletter INTEGER DEFAULT 0','newsletter_at TEXT','trial_ends TEXT','stripe_customer TEXT','stripe_subscription TEXT','sub_status TEXT','sub_plan TEXT','sub_until INTEGER','sub_checked INTEGER'])
    try{db.exec('ALTER TABLE users ADD COLUMN '+column);}catch(error){if(!/duplicate column/.test(error.message))throw error;}
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_email ON users(email COLLATE NOCASE) WHERE email IS NOT NULL');
  // Accounts created before billing existed get a full trial from the day billing ships.
  db.prepare('UPDATE users SET trial_ends=? WHERE trial_ends IS NULL').run(new Date(Date.now()+trialDays*864e5).toISOString());
  const customization=userId=>{const row=db.prepare('SELECT data FROM customizations WHERE user_id=?').get(userId);return row?JSON.parse(row.data):emptyCustomization();};
  const saveCustomization=(userId,value)=>db.prepare('INSERT INTO customizations VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data').run(userId,JSON.stringify(value));
  const now=()=>new Date().toISOString();
  const blank=()=>({characters:[],weapons:[],artifacts:[],materials:{},watermarks:{},quality:{},updatedAt:null});
  return {
    db, close:()=>db.close(),
    register(name,password,email,newsletter=false) {
      need(typeof name==='string' && /^[\p{L}\p{N}_ -]{3,32}$/u.test(name.trim()),'Pseudo : 3 à 32 lettres, chiffres, espaces ou tirets.');
      email=validEmail(email);
      need(typeof password==='string' && password.length>=8 && password.length<=128,'Mot de passe : 8 à 128 caractères.');
      name=name.trim();
      if(db.prepare('SELECT id FROM users WHERE name=?').get(name)) throw new Problem('Ce pseudo est déjà utilisé.',409);
      if(db.prepare('SELECT id FROM users WHERE email=?').get(email)) throw new Problem('Cette adresse e-mail est déjà utilisée par un autre compte.',409);
      const id=secret(), salt=secret(),digest=scryptSync(password,salt,64).toString('hex');
      db.prepare('INSERT INTO users(id,name,salt,password,created,trial_ends,email,newsletter,newsletter_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,name,salt,digest,now(),new Date(Date.now()+trialDays*864e5).toISOString(),email,newsletter===true?1:0,newsletter===true?now():null);
      return {id,name};
    },
    login(name,password) {
      need(typeof name==='string' && typeof password==='string' && password.length<=128,'Identifiants invalides.');
      const user=db.prepare('SELECT * FROM users WHERE name=?').get(name.trim());
      const digest=scryptSync(password,user?.salt??'dummy-salt-for-timing',64);
      if(!user || !timingSafeEqual(digest,Buffer.from(user.password,'hex'))) throw new Problem('Pseudo ou mot de passe incorrect.',401);
      return {id:user.id,name:user.name};
    },
    session(user) { const token=secret(); db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now()); db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),user.id,Date.now()+7*864e5);return token; },
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
    connect(user,name,existingToken) {
      need(typeof name==='string' && name.trim().length>0 && name.length<=64,'Nom du PC invalide.');
      const existing=existingToken?db.prepare('SELECT id,user_id FROM devices WHERE token=?').get(hash(existingToken)):null;
      if(existing?.user_id===user.id)return {token:existingToken,deviceId:existing.id,accountId:user.id,username:user.name};
      const token=secret(),id=secret();
      db.prepare('INSERT INTO devices VALUES(?,?,?,?,?,?)').run(id,user.id,name.trim(),hash(token),now(),null);
      return {token,deviceId:id,accountId:user.id,username:user.name};
    },
    device(token) { return token?db.prepare('SELECT id,user_id,name FROM devices WHERE token=?').get(hash(token)):null; },
    profile(userId) { const row=db.prepare('SELECT email,email_verified,newsletter FROM users WHERE id=?').get(userId);return {email:row.email,emailVerified:row.email_verified===1,newsletter:row.newsletter===1}; },
    setEmail(userId,email) {
      email=validEmail(email);
      if(db.prepare('SELECT id FROM users WHERE email=? AND id<>?').get(email,userId)) throw new Problem('Cette adresse e-mail est déjà utilisée par un autre compte.',409);
      db.prepare('UPDATE users SET email=?,email_verified=CASE WHEN email=? COLLATE NOCASE THEN email_verified ELSE 0 END WHERE id=?').run(email,email,userId);
      return email;
    },
    setNewsletter(userId,value) { db.prepare('UPDATE users SET newsletter=?,newsletter_at=? WHERE id=?').run(value?1:0,now(),userId); },
    userByEmail(email) { return typeof email==='string'?db.prepare('SELECT id,name,email FROM users WHERE email=?').get(email.trim().toLowerCase()):null; },
    issueToken(userId,kind,ttl) { db.prepare('DELETE FROM tokens WHERE (user_id=? AND kind=?) OR expires<?').run(userId,kind,Date.now());const token=secret();db.prepare('INSERT INTO tokens VALUES(?,?,?,?)').run(hash(token),userId,kind,Date.now()+ttl);return token; },
    useToken(token,kind) {
      if(typeof token!=='string'||token.length>100)return null;
      const row=db.prepare('SELECT user_id FROM tokens WHERE hash=? AND kind=? AND expires>?').get(hash(token),kind,Date.now());
      if(row)db.prepare('DELETE FROM tokens WHERE hash=?').run(hash(token));
      return row?.user_id??null;
    },
    verifyEmail(userId) { db.prepare('UPDATE users SET email_verified=1 WHERE id=?').run(userId); },
    resetPassword(userId,password) {
      need(typeof password==='string' && password.length>=8 && password.length<=128,'Mot de passe : 8 à 128 caractères.');
      const salt=secret();db.prepare('UPDATE users SET salt=?,password=? WHERE id=?').run(salt,scryptSync(password,salt,64).toString('hex'),userId);
      db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
    },
    billing(userId) { return db.prepare('SELECT trial_ends,stripe_customer,stripe_subscription,sub_status,sub_plan,sub_until,sub_checked FROM users WHERE id=?').get(userId); },
    checkedBilling(userId) { db.prepare('UPDATE users SET sub_checked=? WHERE id=?').run(Date.now(),userId); },
    setBilling(userId,{customer=null,subscription=null,status=null,plan=null,until=null}) {
      db.prepare('UPDATE users SET stripe_customer=COALESCE(?,stripe_customer),stripe_subscription=?,sub_status=?,sub_plan=?,sub_until=?,sub_checked=? WHERE id=?').run(customer,subscription,status,plan,until,Date.now(),userId);
    },
    revoke(user,id) { db.prepare('DELETE FROM devices WHERE id=? AND user_id=?').run(id,user.id); },
    account(user) {
      const row=db.prepare('SELECT data FROM accounts WHERE user_id=?').get(user.id);
      const devices=db.prepare('SELECT id,name,created,last_seen FROM devices WHERE user_id=? ORDER BY created DESC').all(user.id);
      const scans=db.prepare('SELECT scan_id,captured,received,device,report,counts,applied FROM scans WHERE user_id=? ORDER BY received DESC LIMIT 30').all(user.id)
        .map(s=>({...s,report:((r)=>({...r,errors:r.errors.slice(0,20)}))(JSON.parse(s.report)),counts:JSON.parse(s.counts),applied:JSON.parse(s.applied)}));
      const custom=customization(user.id);
      return {user:{name:user.name,...this.profile(user.id)},data:projectInventory(row?JSON.parse(row.data):blank(),custom),customizations:custom,devices,scans};
    },
    saveArtifact(user,input,catalogue) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const row=db.prepare('SELECT data FROM accounts WHERE user_id=?').get(user.id),data=row?JSON.parse(row.data):blank();
        const custom=customization(user.id),edit=validateArtifactEdit(input,data,catalogue,custom);
        const previous=custom.artifacts.find(a=>a.characterKey===edit.characterKey&&a.artifact.slotKey===edit.artifact.slotKey);
        need(previous||custom.artifacts.length<1500,'Limite de corrections atteinte.');
        custom.artifacts=custom.artifacts.filter(a=>!(a.characterKey===edit.characterKey&&a.artifact.slotKey===edit.artifact.slotKey)&&!(edit.source&&a.source===edit.source));
        custom.artifacts.push({...edit,id:previous?.id??secret()});saveCustomization(user.id,custom);db.exec('COMMIT');
      } catch(error){db.exec('ROLLBACK');throw error;}
      return this.account(user);
    },
    removeArtifact(user,id) {
      db.exec('BEGIN IMMEDIATE');
      try {const custom=customization(user.id);need(custom.artifacts.some(a=>a.id===id),'Correction introuvable.');custom.artifacts=custom.artifacts.filter(a=>a.id!==id);saveCustomization(user.id,custom);db.exec('COMMIT');}
      catch(error){db.exec('ROLLBACK');throw error;}
      return this.account(user);
    },
    saveTeam(user,input) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const data=this.account(user).data,team=validateTeam(input,data),custom=customization(user.id);
        const previous=custom.teams.find(t=>t.id===input.id);need(!input.id||previous,'Équipe introuvable.');need(previous||custom.teams.length<50,'50 équipes maximum.');
        const id=previous?.id??secret();custom.teams=custom.teams.filter(t=>t.id!==id);custom.teams.push({...team,id});saveCustomization(user.id,custom);db.exec('COMMIT');
      }catch(error){db.exec('ROLLBACK');throw error;}
      return this.account(user);
    },
    removeTeam(user,id) {
      db.exec('BEGIN IMMEDIATE');
      try{const custom=customization(user.id);need(custom.teams.some(t=>t.id===id),'Équipe introuvable.');custom.teams=custom.teams.filter(t=>t.id!==id);saveCustomization(user.id,custom);db.exec('COMMIT');}
      catch(error){db.exec('ROLLBACK');throw error;}
      return this.account(user);
    },
    sync(userId,deviceName,body,deviceId,replaceInventory=false) {
      const scan=validateScan(body,{recoverArtifacts:true});
      const duplicate=db.prepare('SELECT applied,counts,report FROM scans WHERE user_id=? AND scan_id=?').get(userId,scan.scanId);
      if(duplicate)return {ok:true,duplicate:true,scanId:scan.scanId,applied:JSON.parse(duplicate.applied),counts:JSON.parse(duplicate.counts),rejectedArtifacts:JSON.parse(duplicate.report).rejectedArtifacts??0};
      const row=db.prepare('SELECT data FROM accounts WHERE user_id=?').get(userId);
      const data=row?JSON.parse(row.data):blank(),applied={},counts={};
      for(const category of ['characters','weapons','artifacts','materials']) {
        const items=scan.good[category];
        if(items===undefined) continue;
        counts[category]=category==='materials'?Object.keys(items).length:items.length;
        if(data.watermarks[category] && scan.capturedAt<=data.watermarks[category]) {applied[category]='older_scan';continue;}
        if((category==='characters'&&items.length===0)||(category==='materials'&&Object.keys(items).length===0)||(category==='artifacts'&&items.length===0&&scan.report.rejectedArtifacts>0)){applied[category]='empty_scan';continue;}
        if(category==='characters') {
          const merged=new Map(data.characters.map(c=>[c.key,c]));
          items.forEach(c=>merged.set(c.key,c));data.characters=[...merged.values()];applied[category]='merged';
        } else if(category==='materials') {data.materials={...data.materials,...items};applied[category]='merged';}
        else {
          const verified=scan.report.status==='finished_unverified' && scan.report.errors.length===0
            && scan.report.selected[category] && scan.report.expectedFromScreen[category]===items.length;
          if(verified || (replaceInventory&&!(category==='artifacts'&&scan.report.rejectedArtifacts>0)) || !data.watermarks[category]) {
            data[category]=items;data.quality[category]=verified?'count_matched':replaceInventory?'manual':'partial';applied[category]=verified?'replaced':replaceInventory?'manual_replaced':'first_partial';
          } else if(items.length) {
            // GOOD has no stable equipment IDs: preserve multiplicity without duplicating identical rescans.
            const fingerprint=item=>JSON.stringify({...item,location:'',lock:false,...(item.substats?{substats:[...item.substats].sort((a,b)=>a.key.localeCompare(b.key))}:{})});
            const remaining=new Map();
            const merged=[...data[category]];
            merged.forEach((item,index)=>{const k=fingerprint(item);if(!remaining.has(k))remaining.set(k,[]);remaining.get(k).push(index);});
            items.forEach(item=>{const matches=remaining.get(fingerprint(item));if(matches?.length)merged[matches.shift()]=item;else merged.push(item);});
            data[category]=merged;data.quality[category]='partial';applied[category]='partial_merged';
          } else {applied[category]='empty_scan';continue;}
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
      return {ok:true,duplicate:false,scanId:scan.scanId,applied,counts,rejectedArtifacts:scan.report.rejectedArtifacts};
    }
  };
}
