'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { plans, included } from '../lib/plans.mjs';

// Stripe.js must come from js.stripe.com (PCI): loaded on demand, only when someone pays.
let stripeJs;
const loadStripe=key=>stripeJs??=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://js.stripe.com/v3/';script.async=true;
  script.onload=()=>resolve(window.Stripe(key));
  script.onerror=()=>{stripeJs=null;script.remove();reject(new Error('Le module de paiement n’a pas pu se charger. Vérifiez votre connexion ou désactivez un bloqueur de publicité.'));};
  document.head.appendChild(script);
});

export default function Checkout({billing,request}) {
  const [plan,setPlan]=useState('year'),[session,setSession]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),frame=useRef(null);
  const chosen=plans.find(p=>p.id===plan),trialEnds=billing?.trial&&Date.parse(billing.trialEnds)-Date.now()>2*864e5?new Date(billing.trialEnds).toLocaleDateString('fr-FR',{day:'numeric',month:'long'}):null;
  useEffect(()=>{
    if(!session)return;let embedded,alive=true;
    loadStripe(session.publishableKey).then(stripe=>stripe.initEmbeddedCheckout({clientSecret:session.clientSecret})).then(instance=>{embedded=instance;if(alive){instance.mount(frame.current);setBusy(false);}else instance.destroy();})
      .catch(e=>{if(alive){setError(e.message);setSession(null);setBusy(false);}});
    return()=>{alive=false;embedded?.destroy();};
  },[session]);
  async function pay() {
    setBusy(true);setError('');
    try{const result=await request(plan);if(result.url){window.location.assign(result.url);return;}setSession(result);}
    catch(e){setError(e.message);setBusy(false);}
  }
  if(session)return <div className="checkout">
    <div className="checkout-summary"><button className="text-button" onClick={()=>setSession(null)}><span className="flip"><Icon name="chevron"/></span>Changer de formule</button><span>Formule {chosen.name.toLowerCase()} · <strong>{chosen.price}</strong> {chosen.period}</span></div>
    {busy&&<p className="checkout-loading" role="status">Ouverture du paiement sécurisé…</p>}
    <div ref={frame} className="checkout-frame"/>
  </div>;
  return <div className="checkout">
    <fieldset className="plan-picker"><legend className="sr-only">Formule</legend>{plans.map(p=><label key={p.id} className={`plan-choice ${plan===p.id?'selected':''}`}>
      <input type="radio" name="plan" value={p.id} checked={plan===p.id} onChange={()=>setPlan(p.id)}/>
      <span className="plan-choice-name"><strong>{p.name}</strong>{p.saving&&<span className="plan-saving">{p.saving}</span>}<small>{p.monthly}</small></span>
      <span className="plan-choice-price">{p.price}<small>{p.short}</small></span>
    </label>)}</fieldset>
    <ul className="plan-included">{included.map(item=><li key={item}><Icon name="check"/>{item}</li>)}</ul>
    {error&&<p className="field-error" role="alert">{error}</p>}
    <button className="button primary full checkout-cta" disabled={busy} onClick={pay}>{busy?'Ouverture…':trialEnds?'Continuer sans payer aujourd’hui':`Continuer · ${chosen.price} ${chosen.period}`}<Icon name="chevron"/></button>
    <p className="checkout-note">{trialEnds?<>Rien n’est prélevé avant le <strong>{trialEnds}</strong>, à la fin de votre essai. Puis {chosen.price} {chosen.period}.</>:<>Accès immédiat après le paiement.</>}</p>
    <ul className="checkout-trust"><li><Icon name="shield"/>Paiement sécurisé par Stripe</li><li><Icon name="refresh"/>Sans engagement, résiliable en deux clics</li><li><Icon name="box"/>Vos données restent conservées</li></ul>
    <small className="checkout-legal">Prix TTC. En continuant, vous acceptez les <Link href="/conditions-utilisation">conditions d’utilisation</Link>.</small>
  </div>;
}
