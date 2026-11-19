/* Adapter for gcsim v2.50.0 (AGPL-3.0, by the gcsim contributors), built unmodified from upstream. See SOURCES.md. */
importScripts('/simulator/wasm_exec.js');
let engine;
async function load(){
  if(engine)return engine;
  engine=(async()=>{const response=await fetch('/simulator/gcsim.wasm.gz');if(!response.ok)throw Error('Le moteur de simulation est indisponible.');const stream=response.body.pipeThrough(new DecompressionStream('gzip'));const bytes=await new Response(stream).arrayBuffer();const go=new Go();const result=await WebAssembly.instantiate(bytes,go.importObject);go.run(result.instance);})();return engine;
}
function decoded(value){if(typeof value==='string'){const result=JSON.parse(value);if(result.error)throw Error(result.error);return result;}return value;}
onmessage=async event=>{
 try{
  await load();const {config,iterations}=event.data;
  const parsed=decoded(validateConfig(config));if(parsed.settings.damage_mode)throw Error('Utilisez une simulation limitée dans le temps, sans PV d’ennemi.');if(!Number.isInteger(iterations)||iterations<1||iterations>500)throw Error('Nombre de simulations invalide.');
  decoded(initializeAggregator(config));decoded(initializeWorker(config));
  for(let i=0;i<iterations;i++){
   const sample=decoded(simulate());decoded(aggregate(sample));
   if((i+1)%10===0)postMessage({progress:i+1});
  }
  const output=decoded(flush());postMessage({done:true,stats:JSON.parse(output.result).statistics});
 }catch(error){postMessage({error:error.message??String(error)});}
};
