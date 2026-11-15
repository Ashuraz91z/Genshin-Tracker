// HTTP adapter used only by isolated API tests; production is served by Next route handlers.
import http from 'node:http';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { createApi } from '../lib/api.mjs';
const publicDirectory=fileURLToPath(new URL('../public/',import.meta.url));
export function createApp({dbPath}) {
  const api=createApi({dbPath,publicDirectory});
  const server=http.createServer(async(req,res)=>{
    try {
      const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,
        ...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
      const response=await api.handle(request);res.writeHead(response.status,Object.fromEntries(response.headers));
      if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
    }catch{res.writeHead(500);res.end('{}');}
  });
  server.on('close',()=>api.close());return {server,store:api.store};
}
