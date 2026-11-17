import nodemailer from 'nodemailer';
// SMTP of the noreply mailbox (Hostinger by default). Without credentials, mails are only logged.
export function createMailer(env=process.env) {
  if(!env.SMTP_USER||!env.SMTP_PASS)return null;
  const port=Number(env.SMTP_PORT??465);
  const transport=nodemailer.createTransport({host:env.SMTP_HOST??'smtp.hostinger.com',port,secure:port===465,auth:{user:env.SMTP_USER,pass:env.SMTP_PASS}});
  const from=env.MAIL_FROM??`Genshin Tracker <${env.SMTP_USER}>`;
  return ({to,subject,text,replyTo})=>transport.sendMail({from,to,subject,text,replyTo});
}
const sign='\n\n— Genshin Tracker\nhttps://genshin-tracker.com';
export const mails={
  verify:(name,link)=>({subject:'Confirmez votre adresse e-mail',text:`Bonjour ${name},\n\nConfirmez l’adresse e-mail de votre compte Genshin Tracker en ouvrant ce lien :\n${link}\n\nLe lien est valable 48 heures. Si vous n’avez pas créé ce compte, ignorez ce message.${sign}`}),
  reset:(name,link)=>({subject:'Réinitialiser votre mot de passe',text:`Bonjour ${name},\n\nVous avez demandé à changer le mot de passe de votre compte Genshin Tracker. Choisissez-en un nouveau ici :\n${link}\n\nLe lien est valable 1 heure et ne sert qu’une fois. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.${sign}`}),
  ticket:(t,body,link)=>({subject:'[Support] '+t.subject,replyTo:t.email,text:`Nouvelle demande de ${t.name} <${t.email}> :\n\n${body}\n\nRépondre depuis le panel : ${link}`}),
  reply:(name,subject,body,link)=>({subject:'Re : '+subject,text:`Bonjour ${name},\n\nVoici la réponse à votre demande « ${subject} » :\n\n${body}\n\nPour répondre, ouvrez la page Aide et contact en étant connecté : ${link}\nSans compte, écrivez à contact@genshin-tracker.com.${sign}`})
};
