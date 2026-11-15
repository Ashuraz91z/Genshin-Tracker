import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
// Keep the original database location when Next changes its working directory.
process.env.DATABASE_PATH=resolve(root,process.env.DATABASE_PATH??'data/tracker.sqlite');
process.env.DOWNLOAD_PATH=resolve(root,process.env.DOWNLOAD_PATH??'../dist/GenshinTracker-KameraFR-0.2.1.zip');
process.env.HOSTNAME=process.env.HOST??process.env.HOSTNAME??'0.0.0.0';
await import(pathToFileURL(join(root,'.next/standalone/server.js')).href);
