'use client';
import { useRef, useState } from 'react';
import { setNonce } from 'get-nonce';
import * as SelectPrimitive from '@radix-ui/react-select';
import styles from './controls.module.css';
import { optionsFrom } from '../lib/select-options.mjs';

// Keep the existing form handlers and empty "all" options when replacing native selects.
export default function Select({children,value,onChange,disabled,required,name,id,'aria-label':label}){
 const trigger=useRef(null),[container,setContainer]=useState(null),[nonce,setStyleNonce]=useState();
 return <SelectPrimitive.Root value={String(value??'')||'__empty__'} onValueChange={value=>onChange?.({target:{value:value==='__empty__'?'':value}})} disabled={disabled} required={required} name={name} onOpenChange={()=>{const value=document.querySelector('script[nonce]')?.nonce;setNonce(value);setStyleNonce(value);setContainer(trigger.current?.closest('dialog')??document.body);}}>
  <SelectPrimitive.Trigger ref={trigger} id={id} aria-label={label} className={styles.selectTrigger}><SelectPrimitive.Value/><SelectPrimitive.Icon className={styles.selectChevron}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></SelectPrimitive.Icon></SelectPrimitive.Trigger>
  <SelectPrimitive.Portal container={container}><SelectPrimitive.Content position="popper" sideOffset={8} collisionPadding={12} className={styles.selectMenu}><SelectPrimitive.ScrollUpButton className={styles.scrollButton}>⌃</SelectPrimitive.ScrollUpButton><SelectPrimitive.Viewport nonce={nonce} className={styles.selectViewport}>{optionsFrom(children).map((option,i)=>{const val=String(option.props.value??option.props.children);return <SelectPrimitive.Item value={val||'__empty__'} disabled={option.props.disabled} key={val||`__empty__${i}`} className={styles.selectOption}><SelectPrimitive.ItemText>{option.props.children}</SelectPrimitive.ItemText><SelectPrimitive.ItemIndicator className={styles.check}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg></SelectPrimitive.ItemIndicator></SelectPrimitive.Item>;})}</SelectPrimitive.Viewport><SelectPrimitive.ScrollDownButton className={styles.scrollButton}>⌄</SelectPrimitive.ScrollDownButton></SelectPrimitive.Content></SelectPrimitive.Portal>
 </SelectPrimitive.Root>;
}
