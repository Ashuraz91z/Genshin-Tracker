import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const hash = value => createHash('sha256').update(value).digest('hex');
export const secret = () => randomBytes(32).toString('base64url');
export const trialDays = 14;
export const termsVersion = '2026-11-17';
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
  // Support threads and usage events keep no foreign key: they outlive a deleted account (user_id set to NULL).
  db.exec(`CREATE TABLE IF NOT EXISTS events(at INTEGER,user_id TEXT,kind TEXT,name TEXT,status INTEGER,detail TEXT);CREATE INDEX IF NOT EXISTS events_at ON events(at);
    CREATE TABLE IF NOT EXISTS tickets(id TEXT PRIMARY KEY,user_id TEXT,name TEXT,email TEXT,subject TEXT,status TEXT,created TEXT,updated TEXT);
    CREATE TABLE IF NOT EXISTS ticket_messages(ticket_id TEXT REFERENCES tickets(id) ON DELETE CASCADE,at TEXT,author TEXT,body TEXT);`);
  for(const column of ['terms_at TEXT','terms_version TEXT','email TEXT','email_verified INTEGER DEFAULT 0','newsletter INTEGER DEFAULT 0','newsletter_at TEXT','trial_ends TEXT','stripe_customer TEXT','stripe_subscription TEXT','sub_status TEXT','sub_plan TEXT','sub_until INTEGER','sub_checked INTEGER','sub_cancel INTEGER DEFAULT 0','disabled INTEGER DEFAULT 0'])
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
      if(user.disabled===1) throw new Problem('Ce compte est suspendu. Écrivez-nous depuis la page Aide et contact.',403);
      return {id:user.id,name:user.name};
    },
    session(user) { const token=secret(); db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now()); db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),user.id,Date.now()+7*864e5);return token; },
    user(token) { return token?db.prepare('SELECT u.id,u.name FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.hash=? AND s.expires>? AND COALESCE(u.disabled,0)=0').get(hash(token),Date.now()):null; },
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
    device(token) { return token?db.prepare('SELECT d.id,d.user_id,d.name FROM devices d JOIN users u ON u.id=d.user_id WHERE d.token=? AND COALESCE(u.disabled,0)=0').get(hash(token)):null; },
    profile(userId) { const row=db.prepare('SELECT email,email_verified,newsletter FROM users WHERE id=?').get(userId);return {email:row.email,emailVerified:row.email_verified===1,newsletter:row.newsletter===1}; },
    setEmail(userId,email) {
      email=validEmail(email);
      if(db.prepare('SELECT id FROM users WHERE email=? AND id<>?').get(email,userId)) throw new Problem('Cette adresse e-mail est déjà utilisée par un autre compte.',409);
      db.prepare('UPDATE users SET email=?,email_verified=CASE WHEN email=? COLLATE NOCASE THEN email_verified ELSE 0 END WHERE id=?').run(email,email,userId);
      return email;
    },
    rename(userId,name) {
      need(typeof name==='string' && /^[\p{L}\p{N}_ -]{3,32}$/u.test(name.trim()),'Pseudo : 3 à 32 lettres, chiffres, espaces ou tirets.');
      name=name.trim();
      if(db.prepare('SELECT id FROM users WHERE name=? AND id<>?').get(name,userId)) throw new Problem('Ce pseudo est déjà utilisé.',409);
      db.prepare('UPDATE users SET name=? WHERE id=?').run(name,userId);return name;
    },
    // Everything stored about one account (GDPR art. 15 and 20), secrets and hashes excluded.
    exportData(user) {
      const u=db.prepare('SELECT name,email,email_verified,newsletter,newsletter_at,created,terms_at,terms_version,trial_ends,sub_status,sub_plan,sub_until FROM users WHERE id=?').get(user.id);
      const {data,customizations,devices,scans}=this.account(user);
      return {exportedAt:now(),account:{...u,email_verified:u.email_verified===1,newsletter:u.newsletter===1,sub_until:u.sub_until?new Date(u.sub_until).toISOString():null},
        inventory:data,customizations,devices,scans,support:this.tickets(user.id)};
    },
    acceptTerms(userId) { db.prepare('UPDATE users SET terms_at=?,terms_version=? WHERE id=?').run(now(),termsVersion,userId); },
    setNewsletter(userId,value) { db.prepare('UPDATE users SET newsletter=?,newsletter_at=? WHERE id=?').run(value?1:0,now(),userId); },
    userByEmail(email) { return typeof email==='string'?db.prepare('SELECT id,name,email FROM users WHERE email=?').get(email.trim().toLowerCase()):null; },
    issueToken(userId,kind,ttl) { db.prepare('DELETE FROM tokens WHERE (user_id=? AND kind=?) OR expires<?').run(userId,kind,Date.now());const token=secret();db.prepare('INSERT INTO tokens VALUES(?,?,?,?)').run(hash(token),userId,kind,Date.now()+ttl);return token; },
    useToken(token,kind) {
      if(typeof token!=='string'||token.length>100)return null;
      const row=db.prepare('SELECT user_id FROM tokens WHERE hash=? AND kind=? AND expires>?').get(hash(token),kind,Date.now());
      if(row)db.prepare('DELETE FROM tokens WHERE hash=?').run(hash(token));
      return row?.user_id??null;
    },
    // An unconfirmed holder does not own an address: free it for an account that will confirm it.
    releaseEmail(email) {
      for(const {id} of db.prepare('SELECT id FROM users WHERE email=? AND COALESCE(email_verified,0)=0').all(String(email).trim().toLowerCase())){
        db.prepare('UPDATE users SET email=NULL WHERE id=?').run(id);db.prepare("DELETE FROM tokens WHERE user_id=? AND kind='verify'").run(id);}
    },
    verifyEmail(userId) { db.prepare('UPDATE users SET email_verified=1 WHERE id=?').run(userId); },
    resetPassword(userId,password) {
      need(typeof password==='string' && password.length>=8 && password.length<=128,'Mot de passe : 8 à 128 caractères.');
      const salt=secret();db.prepare('UPDATE users SET salt=?,password=? WHERE id=?').run(salt,scryptSync(password,salt,64).toString('hex'),userId);
      db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
    },
    billing(userId) { return db.prepare('SELECT trial_ends,stripe_customer,stripe_subscription,sub_status,sub_plan,sub_until,sub_checked,sub_cancel FROM users WHERE id=?').get(userId); },
    checkedBilling(userId) { db.prepare('UPDATE users SET sub_checked=? WHERE id=?').run(Date.now(),userId); },
    setBilling(userId,{customer=null,subscription=null,status=null,plan=null,until=null,cancel=false}) {
      db.prepare('UPDATE users SET stripe_customer=COALESCE(?,stripe_customer),stripe_subscription=?,sub_status=?,sub_plan=?,sub_until=?,sub_cancel=?,sub_checked=? WHERE id=?').run(customer,subscription,status,plan,until,cancel?1:0,Date.now(),userId);
    },
    record(userId,kind,name,status=null,detail=null) { db.prepare('INSERT INTO events VALUES(?,?,?,?,?,?)').run(Date.now(),userId??null,kind,String(name).slice(0,120),status,detail==null?null:String(detail).slice(0,500)); },
    openTicket({userId=null,name,email,subject,body}) {
      need(typeof subject==='string'&&subject.trim().length>=3&&subject.length<=120,'Sujet : 3 à 120 caractères.');
      need(typeof body==='string'&&body.trim().length>=10&&body.length<=5000,'Message : 10 à 5000 caractères.');
      need(typeof name==='string'&&name.trim().length>0&&name.length<=64,'Indiquez votre nom ou pseudo.');
      // Subject and name end up in mail headers: no control characters (CR/LF header injection).
      const line=value=>value.replace(/[\u0000-\u001f\u007f]+/g,' ').trim();subject=line(subject);name=line(name);
      const id=secret(),at=now();email=validEmail(email);
      db.prepare('INSERT INTO tickets VALUES(?,?,?,?,?,?,?,?)').run(id,userId,name.trim(),email,subject.trim(),'open',at,at);
      db.prepare('INSERT INTO ticket_messages VALUES(?,?,?,?)').run(id,at,'user',body.trim());
      return {id,email,name:name.trim(),subject:subject.trim()};
    },
    ticket(id) { const t=db.prepare('SELECT * FROM tickets WHERE id=?').get(id);return t&&{...t,messages:db.prepare('SELECT at,author,body FROM ticket_messages WHERE ticket_id=? ORDER BY at').all(id)}; },
    tickets(userId) { return db.prepare('SELECT id FROM tickets WHERE user_id=? ORDER BY updated DESC LIMIT 50').all(userId).map(t=>this.ticket(t.id)); },
    reply(id,author,body,status) {
      need(typeof body==='string'&&body.trim().length>0&&body.length<=5000,'Message : 1 à 5000 caractères.');
      const at=now();db.prepare('INSERT INTO ticket_messages VALUES(?,?,?,?)').run(id,at,author,body.trim());
      db.prepare('UPDATE tickets SET status=?,updated=? WHERE id=?').run(status,at,id);
    },
    setTicketStatus(id,status) { need(['open','answered','closed'].includes(status),'Statut inconnu.');db.prepare('UPDATE tickets SET status=? WHERE id=?').run(status,id); },
    extendTrial(userId,days) {
      need(Number.isInteger(days)&&days>=1&&days<=365,'Durée : 1 à 365 jours.');
      const row=db.prepare('SELECT trial_ends FROM users WHERE id=?').get(userId);
      db.prepare('UPDATE users SET trial_ends=? WHERE id=?').run(new Date(Math.max(Date.parse(row.trial_ends)||0,Date.now())+days*864e5).toISOString(),userId);
    },
    setDisabled(userId,value) { db.prepare('UPDATE users SET disabled=? WHERE id=?').run(value?1:0,userId);if(value)db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId); },
    closeSessions(userId) { db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId); },
    deleteUser(userId) {
      db.exec('BEGIN IMMEDIATE');
      try {
        for(const table of ['sessions','pairs','devices','accounts','scans','customizations','tokens','events'])db.prepare(`DELETE FROM ${table} WHERE user_id=?`).run(userId);
        db.prepare('UPDATE tickets SET user_id=NULL WHERE user_id=?').run(userId);db.prepare('DELETE FROM users WHERE id=?').run(userId);db.exec('COMMIT');
      } catch(error){db.exec('ROLLBACK');throw error;}
    },
    adminOverview() {
      const day=864e5,since=Date.now()-30*day;
      db.prepare("DELETE FROM events WHERE at<? AND kind<>'admin'").run(Date.now()-90*day);
      const users=db.prepare(`SELECT u.id,u.name,u.email,u.email_verified,u.newsletter,u.created,u.trial_ends,u.stripe_customer,u.sub_status,u.sub_plan,u.sub_until,COALESCE(u.disabled,0) disabled,
        (SELECT COUNT(*) FROM devices d WHERE d.user_id=u.id) devices,(SELECT MAX(received) FROM scans s WHERE s.user_id=u.id) last_scan,(SELECT COUNT(*) FROM scans s WHERE s.user_id=u.id) scans,
        (SELECT MAX(at) FROM events e WHERE e.user_id=u.id) last_seen,(SELECT COUNT(*) FROM events e WHERE e.user_id=u.id AND e.at>? AND (e.status>=400 OR e.kind='error')) problems
        FROM users u ORDER BY u.created DESC`).all(Date.now()-7*day);
      const names=Object.fromEntries(users.map(u=>[u.id,u.name]));
      const errors=db.prepare(`SELECT at,user_id,kind,name,status,detail FROM events WHERE at>? AND (kind='error' OR status>=500 OR (status>=400 AND status NOT IN (401,402,404) AND name NOT LIKE '%/login' AND name NOT LIKE '%/register')) ORDER BY at DESC LIMIT 200`).all(since)
        .map(e=>({...e,user:names[e.user_id]??null}));
      const scans=db.prepare('SELECT user_id,scan_id,received,device,report,counts,applied FROM scans ORDER BY received DESC LIMIT 300').all().map(s=>{
        const report=JSON.parse(s.report),applied=JSON.parse(s.applied),issues=[];
        if(report.errors?.length)issues.push(report.errors.length+' erreur(s) de lecture');
        if(report.rejectedArtifacts)issues.push(report.rejectedArtifacts+' artéfact(s) rejeté(s)');
        if(report.partialCharacters?.length)issues.push(report.partialCharacters.length+' personnage(s) incomplet(s)');
        for(const [category,value] of Object.entries(applied))if(['empty_scan','older_scan','preserved_previous'].includes(value))issues.push(category+' : '+value);
        return {user:names[s.user_id]??null,user_id:s.user_id,received:s.received,device:s.device,status:report.status,counts:JSON.parse(s.counts),issues,sample:(report.errors??[]).slice(0,3)};
      }).filter(s=>s.issues.length).slice(0,100);
      const usage=db.prepare(`SELECT kind,name,COUNT(*) count,COUNT(DISTINCT user_id) users,MAX(at) last FROM events WHERE at>? AND kind IN ('click','page','api') AND COALESCE(status,200)<400 GROUP BY kind,name ORDER BY count DESC LIMIT 150`).all(since);
      const daily=db.prepare(`SELECT CAST(at/? AS INTEGER) day,COUNT(DISTINCT user_id) users,COUNT(*) events,SUM(kind='error' OR status>=500) errors FROM events WHERE at>? GROUP BY day ORDER BY day`).all(day,since).map(d=>({...d,day:new Date(d.day*day).toISOString().slice(0,10)}));
      const tickets=db.prepare('SELECT t.*,(SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id=t.id) messages FROM tickets t ORDER BY (status=\'open\') DESC,updated DESC LIMIT 200').all();
      const audit=db.prepare(`SELECT at,user_id,name,detail FROM events WHERE kind='admin' ORDER BY at DESC LIMIT 200`).all().map(e=>({...e,user:names[e.user_id]??null}));
      return {users,errors,scans,usage,daily,tickets,audit};
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
