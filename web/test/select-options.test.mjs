import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h, Fragment } from 'react';
import { optionsFrom } from '../lib/select-options.mjs';
test('custom select preserves empty, numeric and disabled choices across fragments and mapped arrays',()=>{
 const children=[h('option',{value:''},'Tous'),h(Fragment,null,[20,100,500].map(value=>h('option',{key:value,value,disabled:value===500},value))),false,null];
 const options=optionsFrom(children);
 assert.deepEqual(options.map(o=>o.props.value),['',20,100,500]);
 assert.equal(options[0].props.children,'Tous');assert.equal(options[3].props.disabled,true);
 assert.deepEqual(optionsFrom(null),[]);
});
