import nodemailer from 'nodemailer';
// SMTP of the noreply mailbox (Hostinger by default). Without credentials, mails are only logged.
export function createMailer(env=process.env) {
  if(!env.SMTP_USER||!env.SMTP_PASS)return null;
  const port=Number(env.SMTP_PORT??465);
  const transport=nodemailer.createTransport({host:env.SMTP_HOST??'smtp.hostinger.com',port,secure:port===465,auth:{user:env.SMTP_USER,pass:env.SMTP_PASS}});
  const from=env.MAIL_FROM??`Genshin Tracker <${env.SMTP_USER}>`;
  return ({to,subject,text,html,replyTo})=>transport.sendMail({from,to,subject,text,html,replyTo});
}
const sign='\n\n— Genshin Tracker\nhttps://genshin-tracker.com';
const esc=v=>String(v).replace(/[&<>"']/g,c=>`&#${c.charCodeAt(0)};`);
// Table layout + inline styles: the only thing every mail client renders the same way.
const font='font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif';
export function layout({title,intro,cta,link,note}) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#edf1fa;${font}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#edf1fa;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px #0b112014">
<tr><td style="background:#0b1120;padding:22px 32px;color:#e7bf7c;font-size:15px;font-weight:700;letter-spacing:.14em">GENSHIN <span style="color:#a6b3c6;font-weight:600">TRACKER</span></td></tr>
<tr><td style="padding:32px 32px 8px;color:#0b1120">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${esc(title)}</h1>
${intro.map(t=>`<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3a4a63">${t}</p>`).join('')}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="border-radius:10px;background:#0b1120"><a href="${esc(link)}" style="display:inline-block;padding:14px 26px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px">${esc(cta)}</a></td></tr></table>
<p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#586780">${note}</p>
<p style="margin:0 0 24px;font-size:12px;line-height:1.5;color:#586780;word-break:break-all">Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br><a href="${esc(link)}" style="color:#5765c9">${esc(link)}</a></p>
</td></tr>
<tr><td style="padding:18px 32px;border-top:1px solid #e3e8f2;font-size:12px;color:#8895b5">Genshin Tracker · <a href="https://genshin-tracker.com" style="color:#8895b5">genshin-tracker.com</a> · Non affilié à HoYoverse</td></tr>
</table></td></tr></table></body></html>`;
}
export const mails={
  // welcome: true only right after sign-up (not for an address change or a resend).
  verify:(name,link,welcome=false)=>{
    const thanks='Merci de vous être inscrit sur Genshin Tracker ! ';
    return {subject:welcome?'Bienvenue ! Confirmez votre adresse e-mail':'Confirmez votre adresse e-mail',
      text:`Bonjour ${name},\n\n${welcome?thanks:''}Confirmez l’adresse e-mail de votre compte Genshin Tracker en ouvrant ce lien :\n${link}\n\nLe lien est valable 48 heures. Si vous n’avez pas créé ce compte, ignorez ce message.${sign}`,
      html:layout({title:welcome?'Merci de vous être inscrit !':'Confirmez votre adresse e-mail',link,cta:'Confirmer mon adresse',
        intro:[`Bonjour ${esc(name)},`,welcome?'Merci de vous être inscrit sur Genshin Tracker. Il ne reste qu’une étape : confirmer votre adresse e-mail pour sécuriser votre compte.':'Confirmez l’adresse e-mail de votre compte Genshin Tracker.'],
        note:'Le lien est valable 48 heures. Si vous n’avez pas créé ce compte, ignorez ce message.'})};
  },
  reset:(name,link)=>({subject:'Réinitialiser votre mot de passe',text:`Bonjour ${name},\n\nVous avez demandé à changer le mot de passe de votre compte Genshin Tracker. Choisissez-en un nouveau ici :\n${link}\n\nLe lien est valable 1 heure et ne sert qu’une fois. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.${sign}`,
    html:layout({title:'Réinitialiser votre mot de passe',link,cta:'Choisir un nouveau mot de passe',
      intro:[`Bonjour ${esc(name)},`,'Vous avez demandé à changer le mot de passe de votre compte Genshin Tracker.'],
      note:'Le lien est valable 1 heure et ne sert qu’une fois. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.'})}),
  ticket:(t,body,link)=>({subject:'[Support] '+t.subject,replyTo:t.email,text:`Nouvelle demande de ${t.name} <${t.email}> :\n\n${body}\n\nRépondre depuis le panel : ${link}`}),
  cancel:(name,until,link)=>({subject:'Confirmation de résiliation de votre abonnement',text:`Bonjour ${name},\n\nNous confirmons la résiliation de votre abonnement Genshin Tracker, demandée le ${new Date().toLocaleDateString('fr-FR')}.\n\nElle prend effet le ${until} : vous gardez l’accès jusqu’à cette date et aucun autre paiement ne sera prélevé. Vos données restent conservées.\n\nVous avez changé d’avis ? Reprenez votre abonnement à tout moment avant cette date depuis vos paramètres : ${link}${sign}`}),
  reply:(name,subject,body,link)=>({subject:'Re : '+subject,text:`Bonjour ${name},\n\nVoici la réponse à votre demande « ${subject} » :\n\n${body}\n\nPour répondre, ouvrez la page Aide et contact en étant connecté : ${link}\nSans compte, écrivez à contact@genshin-tracker.com.${sign}`})
};
