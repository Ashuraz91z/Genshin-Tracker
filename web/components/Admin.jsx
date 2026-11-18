'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from './support.module.css';

const day=864e5,bad=['past_due','unpaid','incomplete'];
const when=value=>value?new Date(value).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):'—';
const ago=value=>{if(!value)return 'jamais';const m=Math.round((Date.now()-new Date(value))/6e4);return m<60?`il y a ${Math.max(m,1)} min`:m<1440?`il y a ${Math.round(m/60)} h`:`il y a ${Math.round(m/1440)} j`;};
const kindLabel={page:'Page',click:'Bouton',api:'Action serveur',error:'Navigateur (non vérifié)'};
const statusLabel={open:'À traiter',answered:'Répondu',closed:'Fermé'};
async function api(path,options={}) {
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options,headers:{'Content-Type':'application/json'}});
  const result=await response.json();if(!response.ok){const error=new Error(result.error??'Une erreur est survenue.');error.status=response.status;throw error;}return result;
}
function access(u) {
  if(u.disabled)return ['Suspendu','bad'];
  if(bad.includes(u.sub_status))return ['Paiement en échec','bad'];
  if(['active','trialing'].includes(u.sub_status)&&u.sub_until>Date.now())return [`Abonné ${u.sub_plan==='year'?'annuel':'mensuel'}`,'ok'];
  if(Date.parse(u.trial_ends)>Date.now())return [`Essai · ${Math.ceil((Date.parse(u.trial_ends)-Date.now())/day)} j`,'info'];
  return ['Sans accès','muted'];
}
const tabs=[['overview','Vue d’ensemble'],['users','Utilisateurs'],['payments','Paiements'],['problems','Problèmes'],['usage','Utilisation'],['support','Support'],['audit','Journal']];

export default function Admin() {
  const [data,setData]=useState(null),[error,setError]=useState(null),[tab,setTab]=useState('overview'),[query,setQuery]=useState(''),[filter,setFilter]=useState('all');
  const [ticketId,setTicketId]=useState(null),[ticket,setTicket]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(null),[usageKind,setUsageKind]=useState('click');
  const load=()=>api('/api/admin').then(d=>{setData(d);setError(null);}).catch(e=>setError(e));
  useEffect(()=>{
    load();const params=new URLSearchParams(location.search),id=params.get('ticket'),hash=location.hash.slice(1);
    if(id){setTab('support');setTicketId(id);}else if(tabs.some(([t])=>t===hash))setTab(hash);
  },[]);
  useEffect(()=>{if(ticketId)api('/api/admin/tickets/'+encodeURIComponent(ticketId)).then(setTicket).catch(e=>say(e.message,true));else setTicket(null);},[ticketId]);
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(null),5000);return()=>clearTimeout(t);},[notice]);
  const say=(text,isError=false)=>setNotice({text,error:isError});
  const open=next=>{setTab(next);history.replaceState(null,'',location.pathname+'#'+next);};
  async function act(user,action,extra={}) {
    if(action==='delete'&&!confirm(`Supprimer définitivement le compte « ${user.name} » et toutes ses données ? Un abonnement Stripe éventuel n’est pas résilié automatiquement.`))return;
    if(action==='disable'&&!confirm(`Suspendre « ${user.name} » ? Ses sessions et son PC seront déconnectés.`))return;
    setBusy(true);
    try{await api('/api/admin/users/'+encodeURIComponent(user.id),{method:'POST',body:JSON.stringify({action,...extra})});await load();say('C’est fait.');}
    catch(e){say(e.message,true);}finally{setBusy(false);}
  }
  async function updateTicket(payload,form) {
    setBusy(true);
    try{setTicket(await api('/api/admin/tickets/'+encodeURIComponent(ticketId),{method:'POST',body:JSON.stringify(payload)}));form?.reset();await load();say(payload.body?'Réponse envoyée'+(data.mail?' par e-mail.':' (SMTP non configuré : visible seulement sur le site).'):'Statut mis à jour.');}
    catch(e){say(e.message,true);}finally{setBusy(false);}
  }

  const view=useMemo(()=>{
    if(!data)return null;
    const now=Date.now(),users=data.users,byId=Object.fromEntries(users.map(u=>[u.id,u]));
    const grouped=new Map();
    for(const e of data.errors){const key=[e.kind,e.name,e.status,e.detail].join('|'),g=grouped.get(key)??{...e,count:0,users:new Set()};g.count++;if(e.user)g.users.add(e.user);grouped.set(key,g);}
    return {byId,now,
      active7:users.filter(u=>u.last_seen>now-7*day).length,new7:users.filter(u=>Date.parse(u.created)>now-7*day).length,
      subscribed:users.filter(u=>access(u)[1]==='ok').length,trial:users.filter(u=>access(u)[1]==='info').length,
      failing:users.filter(u=>bad.includes(u.sub_status)),expired:users.filter(u=>access(u)[0]==='Sans accès'&&!u.sub_status),
      errors24:data.errors.filter(e=>e.at>now-day).length,groups:[...grouped.values()].sort((a,b)=>b.at-a.at),
      openTickets:data.tickets.filter(t=>t.status==='open').length,maxDaily:Math.max(1,...data.daily.map(d=>d.users))};
  },[data]);

  if(error)return <div className={styles.adminShell}><div className={styles.gate}><h1>{error.status===401?'Connectez-vous':'Accès réservé'}</h1>
    <p>{error.status===401?'Connectez-vous avec le compte administrateur, puis revenez sur cette page.':error.status===403?'Ce compte n’est pas administrateur. Ajoutez son adresse e-mail (confirmée) à la variable ADMIN_EMAILS du serveur.':error.message}</p>
    <Link className="button primary" href="/app">Ouvrir le carnet</Link></div></div>;
  if(!data)return <div className={styles.adminShell}><p role="status">Chargement du panel…</p></div>;

  const q=query.trim().toLocaleLowerCase('fr'),match=(...values)=>!q||values.some(v=>String(v??'').toLocaleLowerCase('fr').includes(q));
  const users=data.users.filter(u=>match(u.name,u.email)&&(filter==='all'||(filter==='problems'?u.problems>0||bad.includes(u.sub_status):access(u)[1]===filter)));
  const search=<input type="search" className={styles.search} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filtrer par pseudo ou e-mail…" aria-label="Filtrer par pseudo ou e-mail"/>;
  const Status=({u})=>{const [label,tone]=access(u);return <span className={`${styles.badge} ${styles[tone]}`}>{label}</span>;};

  return <div className={styles.adminShell}>
    <header className={styles.adminHeader}><div><span className="eyebrow">GENSHIN TRACKER</span><h1>Administration</h1></div>
      <div className={styles.headerActions}><button className="button secondary" disabled={busy} onClick={()=>load().then(()=>say('Données actualisées.'))}>Actualiser</button><Link className="text-button" href="/app">Retour au carnet ↗</Link></div></header>
    {(!data.stripe||data.stripeError||!data.mail)&&<p className={styles.warning} role="status">{!data.stripe&&'Stripe non configuré : les paiements ne sont pas suivis. '}{data.stripeError&&'Stripe : '+data.stripeError+' '}{!data.mail&&'SMTP non configuré : les réponses au support ne partent pas par e-mail.'}</p>}
    <div className={styles.tabs} role="tablist" aria-label="Rubriques">{tabs.map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>open(id)}>{label}
      {id==='payments'&&view.failing.length>0&&<span className={styles.count}>{view.failing.length}</span>}{id==='support'&&view.openTickets>0&&<span className={styles.count}>{view.openTickets}</span>}{id==='problems'&&view.errors24>0&&<span className={styles.count}>{view.errors24}</span>}</button>)}</div>

    {tab==='overview'&&<section className={styles.stack}>
      <div className={styles.kpis}>{[['Comptes',data.users.length,`+${view.new7} cette semaine`],['Actifs 7 j',view.active7,'ont utilisé le site'],['Abonnés',view.subscribed,`${view.trial} en essai`],
        ['Paiements en échec',view.failing.length,'à relancer','payments'],['Erreurs 24 h',view.errors24,`${data.scans.length} scan(s) à vérifier`,'problems'],['Demandes ouvertes',view.openTickets,`${data.tickets.length} au total`,'support']]
        .map(([label,value,hint,target])=><button key={label} className={`${styles.kpi} ${target&&value>0?styles.alert:''}`} onClick={()=>target&&open(target)} disabled={!target}><span>{label}</span><strong>{value}</strong><small>{hint}</small></button>)}</div>
      <section className={styles.card}><h2>Utilisateurs actifs par jour (30 j)</h2>
        {data.daily.length?<div className={styles.chart} role="img" aria-label="Utilisateurs actifs par jour">{data.daily.map(d=><div key={d.day} className={styles.bar} title={`${d.day} : ${d.users} utilisateur(s), ${d.errors} erreur(s)`}><span style={{height:`${d.users/view.maxDaily*100}%`}} className={d.errors?styles.barError:''}/></div>)}</div>:<p className={styles.empty}>Aucune activité enregistrée pour l’instant.</p>}
        <p className={styles.legend}><span className={styles.dot}/>Jours sans erreur <span className={`${styles.dot} ${styles.dotError}`}/>Jours avec au moins une erreur</p></section>
      <section className={styles.card}><h2>Dernières erreurs</h2>{view.groups.length?<ul className={styles.list}>{view.groups.slice(0,6).map((g,i)=><li key={i}><strong>{g.name}</strong>{g.status&&<code>{g.status}</code>}<span>{g.detail}</span><small>{g.count}× · {g.users.size} utilisateur(s) · {ago(g.at)}</small></li>)}</ul>:<p className={styles.empty}>Rien à signaler.</p>}</section>
    </section>}

    {tab==='users'&&<section className={styles.stack}><div className={styles.toolbar}>{search}
      <select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filtrer les comptes"><option value="all">Tous ({data.users.length})</option><option value="ok">Abonnés</option><option value="info">En essai</option><option value="muted">Sans accès</option><option value="bad">Suspendus ou en échec</option><option value="problems">Avec problèmes</option></select></div>
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Compte</th><th>Accès</th><th>Kamera</th><th>Activité</th><th>Problèmes 7 j</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {users.map(u=><tr key={u.id}><td><strong>{u.name}</strong><small>{u.email??'sans e-mail'} {u.email&&(u.email_verified?'✓':<em>(non confirmé)</em>)}</small><small>Inscrit le {when(u.created)}</small></td>
          <td><Status u={u}/>{u.sub_until&&<small>Échéance {when(u.sub_until)}</small>}</td>
          <td>{u.devices} PC · {u.scans} scan(s)<small>Dernier : {ago(u.last_scan)}</small></td><td>{ago(u.last_seen)}</td>
          <td>{u.problems>0?<button className={`${styles.badge} ${styles.bad}`} onClick={()=>{setQuery(u.name);open('problems');}}>{u.problems} — voir</button>:<span className={styles.muted}>0</span>}</td>
          <td><details className={styles.menu}><summary>Gérer</summary><div>
            <button disabled={busy} onClick={()=>act(u,'extend',{days:7})}>Prolonger l’essai de 7 jours</button><button disabled={busy} onClick={()=>act(u,'extend',{days:30})}>Prolonger l’essai de 30 jours</button>
            {u.stripe_customer&&<><button disabled={busy} onClick={()=>act(u,'billing')}>Revérifier sur Stripe</button><a href={'https://dashboard.stripe.com/customers/'+encodeURIComponent(u.stripe_customer)} target="_blank" rel="noreferrer">Ouvrir dans Stripe ↗</a></>}
            {u.email&&!u.email_verified&&<button disabled={busy} onClick={()=>act(u,'verify')}>Marquer l’e-mail comme confirmé</button>}
            <button disabled={busy} onClick={()=>act(u,'logout')}>Fermer ses sessions</button>
            {u.disabled?<button disabled={busy} onClick={()=>act(u,'enable')}>Réactiver le compte</button>:<button disabled={busy} className={styles.danger} onClick={()=>act(u,'disable')}>Suspendre le compte</button>}
            <button disabled={busy} className={styles.danger} onClick={()=>act(u,'delete')}>Supprimer le compte</button></div></details></td></tr>)}
      </tbody></table>{!users.length&&<p className={styles.empty}>Aucun compte ne correspond.</p>}</div></section>}

    {tab==='payments'&&<section className={styles.stack}>
      <section className={styles.card}><h2>Paiements en échec</h2><p className={styles.muted}>Abonnements Stripe impayés ou incomplets, revérifiés à chaque ouverture du panel.</p>
        {view.failing.length?<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Compte</th><th>Statut Stripe</th><th>Formule</th><th>Échéance</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
          {view.failing.map(u=><tr key={u.id}><td><strong>{u.name}</strong><small>{u.email}</small></td><td><span className={`${styles.badge} ${styles.bad}`}>{{past_due:'En retard',unpaid:'Impayé',incomplete:'Incomplet'}[u.sub_status]}</span></td><td>{u.sub_plan==='year'?'Annuelle':'Mensuelle'}</td><td>{when(u.sub_until)}</td>
            <td className={styles.rowActions}><button className="text-button" disabled={busy} onClick={()=>act(u,'billing')}>Revérifier</button>{u.stripe_customer&&<a className="text-button" href={'https://dashboard.stripe.com/customers/'+encodeURIComponent(u.stripe_customer)} target="_blank" rel="noreferrer">Stripe ↗</a>}{u.email&&<a className="text-button" href={'mailto:'+u.email}>Écrire</a>}</td></tr>)}</tbody></table></div>
          :<p className={styles.empty}>Aucun paiement en échec.</p>}</section>
      <section className={styles.card}><h2>Essais terminés sans abonnement</h2>{view.expired.length?<ul className={styles.list}>{view.expired.map(u=><li key={u.id}><strong>{u.name}</strong><span>{u.email}</span><small>Essai fini le {when(u.trial_ends)} · vu {ago(u.last_seen)}</small></li>)}</ul>:<p className={styles.empty}>Aucun.</p>}</section>
    </section>}

    {tab==='problems'&&<section className={styles.stack}><div className={styles.toolbar}>{search}</div>
      <section className={styles.card}><h2>Erreurs des 30 derniers jours</h2><p className={styles.muted}>Actions refusées ou en échec côté serveur (dont imports et synchronisations), et erreurs JavaScript dans les navigateurs. Les mauvais mots de passe ne sont pas comptés.</p>
        {(()=>{const groups=view.groups.filter(g=>match(...g.users,g.name,g.detail));return groups.length?<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Où</th><th>Erreur</th><th>Fois</th><th>Qui</th><th>Dernière</th></tr></thead><tbody>
          {groups.map((g,i)=><tr key={i}><td><span className={styles.badge}>{kindLabel[g.kind]}</span><small>{g.name}</small></td><td>{g.status&&<code>{g.status}</code>} {g.detail??'—'}</td><td>{g.count}</td><td>{[...g.users].join(', ')||'visiteur'}</td><td>{ago(g.at)}</td></tr>)}</tbody></table></div>:<p className={styles.empty}>Rien à signaler.</p>;})()}</section>
      <section className={styles.card}><h2>Scans et imports à vérifier</h2><p className={styles.muted}>Relevés reçus avec des erreurs de lecture, des artéfacts rejetés ou des catégories ignorées.</p>
        {(()=>{const scans=data.scans.filter(s=>match(s.user,s.device));return scans.length?<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Reçu</th><th>Compte</th><th>Source</th><th>Reçu</th><th>Problèmes</th></tr></thead><tbody>
          {scans.map((s,i)=><tr key={i}><td>{when(s.received)}</td><td>{s.user??'compte supprimé'}</td><td>{s.device}<small>{s.status}</small></td><td>{Object.entries(s.counts).map(([k,v])=>`${k} ${v}`).join(' · ')}</td><td>{s.issues.join(' · ')}{s.sample.map((e,j)=><small key={j}>{typeof e==='string'?e:JSON.stringify(e).slice(0,160)}</small>)}</td></tr>)}</tbody></table></div>:<p className={styles.empty}>Aucun scan problématique.</p>;})()}</section>
    </section>}

    {tab==='usage'&&<section className={styles.stack}><div className={styles.toolbar}><div className={styles.segmented} role="radiogroup" aria-label="Type">{['click','page','api'].map(k=><button key={k} role="radio" aria-checked={usageKind===k} onClick={()=>setUsageKind(k)}>{{click:'Boutons',page:'Pages',api:'Fonctions'}[k]}</button>)}</div></div>
      <section className={styles.card}><h2>Les plus utilisés (30 j)</h2>{(()=>{const rows=data.usage.filter(u=>u.kind===usageKind),max=Math.max(1,...rows.map(r=>r.count));return rows.length?<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Nom</th><th>Utilisations</th><th>Utilisateurs</th><th>Dernière</th></tr></thead><tbody>
        {rows.map(r=><tr key={r.name}><td>{r.name}</td><td><span className={styles.meter}><span style={{width:`${r.count/max*100}%`}}/></span>{r.count}</td><td>{r.users}</td><td>{ago(r.last)}</td></tr>)}</tbody></table></div>:<p className={styles.empty}>Pas encore de données.</p>;})()}</section></section>}

    {tab==='audit'&&<section className={styles.card}><h2>Actions de l’administration</h2>{data.audit?.length?<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Quand</th><th>Admin</th><th>Action</th><th>Cible</th></tr></thead><tbody>
      {data.audit.map((a,i)=><tr key={i}><td>{when(a.at)}</td><td>{a.user??'compte supprimé'}</td><td><code>{a.name}</code></td><td>{a.detail}</td></tr>)}</tbody></table></div>:<p className={styles.empty}>Aucune action enregistrée.</p>}</section>}
    {tab==='support'&&<section className={styles.supportLayout}>
      <aside className={styles.card}><h2>Demandes</h2><ul className={styles.ticketList}>{data.tickets.map(t=><li key={t.id}><button aria-current={t.id===ticketId} onClick={()=>setTicketId(t.id)}><strong>{t.subject}</strong><small>{t.name} · {ago(t.updated)}</small><span className={`${styles.badge} ${styles[t.status]}`}>{statusLabel[t.status]}</span></button></li>)}</ul>{!data.tickets.length&&<p className={styles.empty}>Aucune demande.</p>}</aside>
      <section className={styles.card}>{ticket?<>
        <div className={styles.threadHead}><div><h2>{ticket.subject}</h2><p className={styles.muted}>{ticket.name} · <a href={'mailto:'+ticket.email}>{ticket.email}</a>{ticket.user_id&&(view.byId[ticket.user_id]?<> · <Status u={view.byId[ticket.user_id]}/></>:' · compte supprimé')}{!ticket.user_id&&' · sans compte'}</p></div>
          {ticket.status==='closed'?<button className="button secondary" disabled={busy} onClick={()=>updateTicket({status:'open'})}>Rouvrir</button>:<button className="button secondary" disabled={busy} onClick={()=>updateTicket({status:'closed'})}>Fermer la demande</button>}</div>
        {ticket.messages.map((m,i)=><div key={i} className={`${styles.message} ${m.author==='admin'?styles.fromAdmin:''}`}><small>{m.author==='admin'?'Vous':ticket.name} · {when(m.at)}</small><p>{m.body}</p></div>)}
        <form className={styles.form} onSubmit={e=>{e.preventDefault();updateTicket({body:new FormData(e.currentTarget).get('body')},e.currentTarget);}}><label htmlFor="admin-reply">Votre réponse</label><textarea id="admin-reply" name="body" rows="5" maxLength="5000" required/><button className="button primary" disabled={busy}>Envoyer la réponse</button></form>
      </>:<p className={styles.empty}>Choisissez une demande.</p>}</section>
    </section>}
    {notice&&<div className={`toast ${notice.error?'error':''}`} role="status" aria-live="polite">{notice.text}</div>}
  </div>;
}
