import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi } from '../lib/api.mjs';

test('annual plans get one renewal reminder 31–45 days before term, never when canceling or monthly',async t=>{
  const folder=mkdtempSync(join(tmpdir(),'gt-renewal-')),sent=[];
  const end=Math.floor((Date.now()+40*864e5)/1000);
  const subs={sub_y:{id:'sub_y',customer:'cus_y',status:'active',items:{data:[{current_period_end:end,price:{recurring:{interval:'year'}}}]}},
    sub_c:{id:'sub_c',customer:'cus_c',status:'active',cancel_at_period_end:true,items:{data:[{current_period_end:end,price:{recurring:{interval:'year'}}}]}},
    sub_m:{id:'sub_m',customer:'cus_m',status:'active',items:{data:[{current_period_end:end,price:{recurring:{interval:'month'}}}]}}};
  const stripe=async(method,path)=>{const s=subs[path.split('/')[1]];if(s)return s;throw new Error('unexpected '+path);};
  const api=createApi({dbPath:join(folder,'t.sqlite'),stripe,mailer:async mail=>{sent.push(mail);return {};}});
  t.after(()=>{api.close();rmSync(folder,{recursive:true,force:true});});
  for(const [name,sub] of [['Annuel','sub_y'],['Resilie','sub_c'],['Mensuel','sub_m']]){
    const id=api.store.register(name,'long-enough-password',name.toLowerCase()+'@example.com').id;
    // Local state says "renewing", Stripe is the truth: the canceling one must be skipped after refresh.
    api.store.setBilling(id,{customer:'cus',subscription:sub,status:'active',plan:sub==='sub_m'?'month':'year',until:end*1000});
  }
  assert.equal(await api.sendRenewalReminders(Date.now()-50*864e5),0,'too early: 90 days out');
  assert.equal(await api.sendRenewalReminders(),1);
  assert.equal(sent.length,1);assert.equal(sent[0].to,'annuel@example.com');
  assert.match(sent[0].subject,/renouvelé le/);assert.match(sent[0].text,/14,99 €/);assert.match(sent[0].text,/parametres#abonnement/);
  assert.equal(await api.sendRenewalReminders(),0,'once per period');
});
