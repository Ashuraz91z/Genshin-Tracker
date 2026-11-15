import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readdirSync, statSync, linkSync, unlinkSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

export function prepareDatabase({cwd=process.cwd(),configured=process.env.DATABASE_PATH,publicUrl=process.env.PUBLIC_URL??'',home=homedir()}={}) {
  if(configured)return resolve(cwd,configured);
  const origin=publicUrl?new URL(publicUrl):null;
  if(!origin||['localhost','127.0.0.1','[::1]'].includes(origin.hostname))return resolve(cwd,'data/tracker.sqlite');
  let ancestor=resolve(/* turbopackIgnore: true */ cwd),builds;
  while(ancestor!==parse(ancestor).root){if(ancestor.split(/[\\/]/).pop()==='hbuilds'){builds=ancestor;break;}ancestor=dirname(ancestor);}
  const target=builds?join(dirname(builds),'tracker-data/tracker.sqlite'):join(home,'.local/share/genshin-tracker',origin.host.replace(/:/g,'_'),'tracker.sqlite');
  if(existsSync(target))return target;
  const candidates=new Set([resolve(cwd,'data/tracker.sqlite'),resolve(cwd,'.next/standalone/data/tracker.sqlite')]);
  if(builds)for(const build of readdirSync(/* turbopackIgnore: true */ builds,{withFileTypes:true}).filter(entry=>entry.isDirectory())) {
    for(const suffix of ['nodejs/data/tracker.sqlite','web/data/tracker.sqlite','web/.next/standalone/data/tracker.sqlite','data/tracker.sqlite','.next/standalone/data/tracker.sqlite'])candidates.add(join(/* turbopackIgnore: true */ builds,build.name,suffix));
  }
  if(builds)candidates.add(join(/* turbopackIgnore: true */ builds,'current/nodejs/data/tracker.sqlite'));
  const sources=[];
  for(const file of candidates){
    if(!existsSync(file))continue;
    let source;
    try{
      source=new DatabaseSync(file,{readOnly:true});
      if(!source.prepare('SELECT COUNT(*) AS n FROM users').get().n)continue;
      const latest=source.prepare('SELECT MAX(ts) AS latest FROM (SELECT created AS ts FROM users UNION ALL SELECT received FROM scans UNION ALL SELECT created FROM devices)').get().latest;
      sources.push({file,latest:Date.parse(latest)||statSync(file).mtimeMs});
    }finally{source?.close();}
  }
  mkdirSync(dirname(target),{recursive:true,mode:0o700});
  const previous=sources.sort((a,b)=>b.latest-a.latest)[0];
  if(previous){
    const source=new DatabaseSync(previous.file,{readOnly:true}),temporary=target+'.migration-'+randomUUID();
    try{
      // Include committed WAL changes, then publish atomically without replacing another instance's database.
      source.prepare('VACUUM INTO ?').run(temporary);
      try{linkSync(temporary,target);}catch(error){if(error.code!=='EEXIST')throw error;}
      console.info('[storage] Existing accounts and device keys copied to persistent storage. Original database retained.');
    }finally{source.close();if(existsSync(temporary))unlinkSync(temporary);}
  }
  return target;
}
