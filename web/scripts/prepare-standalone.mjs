import { cpSync } from 'node:fs';
import { prepareDatabase } from '../lib/storage.mjs';
// Preserve the current Hostinger database before its current deployment directory is switched.
if(process.cwd().split(/[\\/]/).includes('hbuilds'))prepareDatabase();
// Next standalone omits static assets; include them in the runnable output.
cpSync('public','.next/standalone/public',{recursive:true});
cpSync('.next/static','.next/standalone/.next/static',{recursive:true});
