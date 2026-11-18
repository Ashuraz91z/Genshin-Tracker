'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Records which pages and buttons are used and which errors happen, never what people type.
const queue=[];
const clean=text=>String(text??'').replace(/\s+/g,' ').trim().slice(0,80);
export function push(kind,name,detail) {if(name&&queue.length<200)queue.push({kind,name:clean(name),detail:detail&&String(detail).slice(0,400)});}
function flush() {
  if(!queue.length)return;
  fetch('/api/events',{method:'POST',keepalive:true,credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:queue.splice(0,50)})}).catch(()=>{});
}

export default function Telemetry() {
  const pathname=usePathname();
  useEffect(()=>{if(!pathname.startsWith('/admin'))push('page',pathname);},[pathname]);
  useEffect(()=>{
    const click=event=>{
      if(location.pathname.startsWith('/admin'))return;
      const target=event.target.closest?.('button,a,[role=tab],summary');
      if(target)push('click',target.dataset.track??target.getAttribute('aria-label')??target.textContent??target.getAttribute('href'),location.pathname);
    };
    const error=event=>push('error',event.message??'Erreur',`${event.filename??''}:${event.lineno??''} ${location.pathname}`);
    const rejection=event=>push('error',event.reason?.message??String(event.reason),location.pathname);
    const hide=()=>{if(document.visibilityState==='hidden')flush();};
    const timer=setInterval(flush,15000);
    document.addEventListener('click',click,{capture:true});window.addEventListener('error',error);window.addEventListener('unhandledrejection',rejection);document.addEventListener('visibilitychange',hide);
    return()=>{clearInterval(timer);document.removeEventListener('click',click,{capture:true});window.removeEventListener('error',error);window.removeEventListener('unhandledrejection',rejection);document.removeEventListener('visibilitychange',hide);};
  },[]);
  return null;
}
