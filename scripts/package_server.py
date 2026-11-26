"""Package the deployable site and current Windows download, excluding runtime data."""
import hashlib
import json
import zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'web/package.json').read_text())['version']
name=f'GenshinTracker-Serveur-{version}'
archive=root/'dist'/f'{name}.zip'
files=[p for p in (root/'web').rglob('*') if p.is_file() and not (p.name.startswith('.env') and p.name!='.env.example') and not any(part in {'data','node_modules','.env','.next','out'} for part in p.relative_to(root/'web').parts)]
files += [root/'.dockerignore',root/'LICENSE',root/'dist/GenshinTracker-KameraFR-0.7.2.zip']
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as out:
    for file in files:out.write(file,Path(name)/file.relative_to(root))
    out.writestr(name+'/README.md',(root/'web/README.md').read_text())
with zipfile.ZipFile(archive) as check:
    assert check.testzip() is None
    assert name+'/LICENSE' in check.namelist()
    assert not any('/data/' in n or n.endswith('.env') or n.endswith('.sqlite') for n in check.namelist())
archive.with_suffix('.zip.sha256').write_text(hashlib.sha256(archive.read_bytes()).hexdigest()+'  '+archive.name+'\n')
print(f'Serveur prêt : {archive.name}, {archive.stat().st_size/1024/1024:.1f} Mio, sans base utilisateur ni secret.')
