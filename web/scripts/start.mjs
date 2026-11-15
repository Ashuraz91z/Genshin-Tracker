import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { prepareDatabase } from '../lib/storage.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
// Keep the original database location when Next changes its working directory.
process.env.DATABASE_PATH=prepareDatabase({cwd:root});
process.env.DOWNLOAD_PATH=resolve(root,process.env.DOWNLOAD_PATH??'../dist/GenshinTracker-KameraFR-0.3.2.zip');
process.env.HOSTNAME=process.env.HOST??process.env.HOSTNAME??'0.0.0.0';
await import(pathToFileURL(join(root,'.next/standalone/server.js')).href);
