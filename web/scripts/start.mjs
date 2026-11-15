import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
// Keep the original database location when Next changes its working directory.
process.env.DATABASE_PATH??=join(root,'data/tracker.sqlite');
process.env.DOWNLOAD_PATH??=resolve(root,'../dist/GenshinTracker-KameraFR-0.2.0.zip');
process.env.HOSTNAME??='0.0.0.0';
await import(pathToFileURL(join(root,'.next/standalone/server.js')).href);
