// Stripe over plain fetch: no SDK needed for four endpoints.
export const prices={month:'price_1Ucn6rRgFbPfVITSRJX1V2T5',year:'price_1Ucn6rRgFbPfVITSjwOsIRzx'};
const active=['active','trialing','past_due'];
function form(value,prefix='',out=new URLSearchParams()) {
  for(const [key,item] of Object.entries(value)){if(item===undefined||item===null)continue;const name=prefix?`${prefix}[${key}]`:key;if(typeof item==='object')form(item,name,out);else out.append(name,String(item));}
  return out;
}
export function stripeClient(key,fetchImpl=fetch) {
  if(!key)return null;
  return async(method,path,params={})=>{
    const query=form(params).toString(),get=method==='GET';
    const response=await fetchImpl('https://api.stripe.com/v1/'+path+(get&&query?'?'+query:''),{method,headers:{Authorization:'Bearer '+key,...(get?{}:{'Content-Type':'application/x-www-form-urlencoded'})},body:get?undefined:query});
    const result=await response.json();
    if(!response.ok)throw new Error('Stripe : '+(result.error?.message??response.status));
    return result;
  };
}
export function subscriptionState(subscription) {
  if(!subscription)return {};
  const item=subscription.items?.data?.[0];
  return {customer:subscription.customer,subscription:subscription.id,status:subscription.status,plan:item?.price?.recurring?.interval??null,until:(item?.current_period_end??subscription.current_period_end??0)*1000};
}
export const pickSubscription=list=>list.find(s=>active.includes(s.status))??list[0];
export function billingView(row,now=Date.now()) {
  const trial=Date.parse(row.trial_ends)>now,subscribed=active.includes(row.sub_status)&&row.sub_until>now;
  return {enabled:true,active:trial||subscribed,trial:trial&&!subscribed,trialEnds:row.trial_ends,subscribed,status:row.sub_status,plan:row.sub_plan,until:row.sub_until?new Date(row.sub_until).toISOString():null,manageable:!!row.stripe_customer};
}
