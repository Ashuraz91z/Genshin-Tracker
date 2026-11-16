'use client';
import { useEffect, useState } from 'react';
let cache;
export default function usePlanner() {
  const [planner,setPlanner]=useState(null);
  useEffect(()=>{let alive=true;(cache??=fetch('/assets/planner.json').then(r=>{if(!r.ok)throw Error();return r.json();}).catch(()=>{cache=undefined;return null;})).then(p=>{if(alive)setPlanner(p);});return()=>{alive=false;};},[]);
  return planner;
}
