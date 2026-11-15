"""Prepare the pinned MIT gcsim build and its GOOD mappings. Build wasm separately with Go."""
from pathlib import Path
import gzip, hashlib, json, re, shutil, subprocess, sys
root=Path(__file__).resolve().parents[1];source=Path(sys.argv[1]);wasm=Path(sys.argv[2]);goroot=Path(sys.argv[3]);dest=root/'web/public/simulator';dest.mkdir(exist_ok=True)
assert 'MIT License' in (source/'LICENSE').read_text()
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()=='caf738dc807a646e2eee7e7b572f225dd6deb510','Use the pinned v2.47.2 sources'
with wasm.open('rb') as inp,gzip.open(dest/'gcsim.wasm.gz','wb',compresslevel=9) as out:shutil.copyfileobj(inp,out)
shutil.copy(goroot/'lib/wasm/wasm_exec.js',dest/'wasm_exec.js');shutil.copy(source/'LICENSE',dest/'LICENSE-gcsim.txt');shutil.copy(goroot/'LICENSE',dest/'LICENSE-go.txt')
data=source/'ui/packages/ui/src/Data';catalog=json.loads((root/'web/public/assets/catalogue.json').read_text());metadata={}
for category,filename in [('characters','character.dm.json'),('weapons','weapon.dm.json'),('artifacts','artifact.dm.json')]:
    entries=json.loads((data/filename).read_text())['data'];byid={str(v['id']):k for k,v in entries.items() if v.get('id')}
    implemented={m.group(1) for f in (source/'internal'/category).rglob('config.yml') for m in [re.search(r'^name:\s*(\S+)',f.read_text(),re.M)] if m}
    metadata[category]={key:byid[str(row['id'])] for key,row in catalog[category].items() if row.get('id') and str(row['id']) in byid and byid[str(row['id'])] in implemented}
metadata.update(mainStats=json.loads((data/'artifact_main_gen.json').read_text()),version='2.47.2',commit='caf738dc807a646e2eee7e7b572f225dd6deb510')
(dest/'data.json').write_text(json.dumps(metadata,separators=(',',':')))
(dest/'SOURCES.md').write_text('gcsim v2.47.2 (MIT): https://github.com/genshinsim/gcsim/tree/'+metadata['commit']+'\nBuild: Go 1.27.4, GOOS=js GOARCH=wasm go build -trimpath -ldflags="-s -w" ./cmd/wasm\nSHA256 wasm: '+hashlib.sha256(wasm.read_bytes()).hexdigest()+'\nGo runtime: https://go.dev/ ; see LICENSE-go.txt.\n')
print('Moteur gcsim prêt :', {k:len(metadata[k]) for k in ['characters','weapons','artifacts']})
