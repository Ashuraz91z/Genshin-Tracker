import { cpSync } from 'node:fs';
// Next standalone omits static assets; include them in the runnable output.
cpSync('public','.next/standalone/public',{recursive:true});
cpSync('.next/static','.next/standalone/.next/static',{recursive:true});
