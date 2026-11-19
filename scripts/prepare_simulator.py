"""Prepare the pinned gcsim build (AGPL-3.0 since v2.48, MIT notice kept) and its GOOD mappings. Build wasm separately with Go."""
from pathlib import Path
import gzip, hashlib, json, os, re, shutil, subprocess, sys
root=Path(__file__).resolve().parents[1];source=Path(sys.argv[1]);wasm=Path(sys.argv[2]);goroot=Path(sys.argv[3]);dest=root/'web/public/simulator';dest.mkdir(exist_ok=True)
assert 'GNU Affero General Public License' in (source/'LICENSE').read_text()
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()=='b107b5dc5cb88977bed5270e5d83e64934730d4d','Use the pinned v2.50.0 sources'
with wasm.open('rb') as inp,gzip.open(dest/'gcsim.wasm.gz','wb',compresslevel=9) as out:shutil.copyfileobj(inp,out)
shutil.copy(goroot/'lib/wasm/wasm_exec.js',dest/'wasm_exec.js');shutil.copy(source/'LICENSE',dest/'LICENSE-gcsim.txt');shutil.copy(source/'LICENSE-MIT',dest/'LICENSE-gcsim-MIT.txt');shutil.copy(goroot/'LICENSE',dest/'LICENSE-go.txt')
data=source/'ui/packages/ui/src/Data';catalog=json.loads((root/'web/public/assets/catalogue.json').read_text());metadata={}
for category,filename in [('characters','character.dm.json'),('weapons','weapon.dm.json'),('artifacts','artifact.dm.json')]:
    entries=json.loads((data/filename).read_text())['data'];byid={str(v['id']):k for k,v in entries.items() if v.get('id')}
    implemented={m.group(1) for f in (source/'internal'/category).rglob('config.yml') for m in [re.search(r'^name:\s*(\S+)',f.read_text(),re.M)] if m}
    metadata[category]={key:byid[str(row['id'])] for key,row in catalog[category].items() if row.get('id') and str(row['id']) in byid and byid[str(row['id'])] in implemented}
metadata.update(mainStats=json.loads((data/'artifact_main_gen.json').read_text()),version='2.50.0',commit='b107b5dc5cb88977bed5270e5d83e64934730d4d')
(dest/'data.json').write_text(json.dumps(metadata,separators=(',',':')))
(dest/'SOURCES.md').write_text('gcsim v2.50.0 par les contributeurs de gcsim (AGPL-3.0 ; code antérieur sous MIT, voir LICENSE-gcsim-MIT.txt) : https://github.com/genshinsim/gcsim/tree/'+metadata['commit']+'\nBuild: Go 1.27.4, GOOS=js GOARCH=wasm go build -trimpath -ldflags="-s -w" ./cmd/wasm\nSHA256 wasm: '+hashlib.sha256(wasm.read_bytes()).hexdigest()+'\nGo runtime: https://go.dev/ ; see LICENSE-go.txt.\n')
print('Moteur gcsim prêt :', {k:len(metadata[k]) for k in ['characters','weapons','artifacts']})

# Retain the notices of the Go modules actually linked into the browser engine.
modules=subprocess.check_output([str(goroot/'bin/go'),'list','-deps','-f','{{if .Module}}{{.Module.Path}}|{{.Module.Version}}|{{.Module.Dir}}{{end}}','./cmd/wasm'],cwd=source,env=dict(os.environ,GOOS='js',GOARCH='wasm'),text=True)
notices=[]
for entry in sorted(set(modules.splitlines())):
    if not entry:continue
    name,version,directory=entry.split('|',2)
    for file in sorted(Path(directory).iterdir()):
        if file.is_file() and file.name.upper().startswith(('LICENSE','LICENCE','NOTICE','COPYING')):
            notices.append(name+' '+version+' / '+file.name+'\n'+file.read_text(errors='replace'))
(dest/'THIRD-PARTY-NOTICES.txt').write_text('\n\n'.join(notices)+'\n')
