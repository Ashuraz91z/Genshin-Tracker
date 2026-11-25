#!/usr/bin/env python3
"""Package the already-built Windows application with its models and notices."""
import hashlib
import json
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
NAME='GenshinTracker-KameraFR-0.5.0'
BUILD=ROOT/'InventoryKamera-FR/InventoryKamera/bin/Release/net472'
DEST=ROOT/'dist'/NAME

def package():
    assert (BUILD/'InventoryKamera.FR.exe').read_bytes()[:2]==b'MZ'
    DEST.mkdir(parents=True,exist_ok=True)
    for item in BUILD.iterdir():
        if item.suffix in ('.pdb','.xml'): continue
        if item.is_dir(): shutil.copytree(item,DEST/item.name,dirs_exist_ok=True,ignore=shutil.ignore_patterns("genshin_best_eng.traineddata","genshin_fast_09_04_21.traineddata"))
        else: shutil.copy2(item,DEST/item.name)
    for unused in ['genshin_best_eng.traineddata','genshin_fast_09_04_21.traineddata']:
        old=DEST/'tessdata'/unused
        if old.exists(): old.unlink()
    shutil.copy2(ROOT/'docs/SCANNER.md',DEST/'README.md')
    shutil.copy2(ROOT/'UPSTREAM.md',DEST/'UPSTREAM.md')
    shutil.copytree(ROOT/'licenses',DEST/'licenses',dirs_exist_ok=True)
    shutil.copy2(ROOT/'InventoryKamera-FR/LICENSE',DEST/'LICENSE.txt')
    shutil.copy2(ROOT/'web/README.md',DEST/'SITE.md')
    assets=json.loads((ROOT/'InventoryKamera-FR/InventoryKamera/obj/project.assets.json').read_text())
    cache=Path(next(iter(assets['packageFolders'])))
    notices=['# Dépendances NuGet du build', '', 'Métadonnées des éditeurs ; DLL conservées sans modification.', '']
    for key, library in assets['libraries'].items():
        if library['type']!='package' or 'referenceassemblies' in key.lower(): continue
        folder=cache/library['path']
        nuspec=next(folder.glob('*.nuspec'))
        metadata=ET.parse(nuspec).getroot()
        def value(tag):
            for e in metadata.iter():
                if e.tag.split('}')[-1]==tag: return e.text or ''
            return ''
        notices.append(f"- {key} — {value('license') or value('licenseUrl')} — {value('projectUrl')} — {value('copyright')}")
        sub=DEST/'licenses'/'nuget'/library['path']
        sub.mkdir(parents=True,exist_ok=True)
        shutil.copy2(nuspec,sub/nuspec.name)
        for p in folder.rglob('*'):
            if p.is_file() and (p.name.lower().startswith(('license','notice','copying'))):
                rel=p.relative_to(folder); (sub/rel).parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,sub/rel)
    (DEST/'licenses'/'NUGet-Notices.md').write_text('\n'.join(notices)+'\n')
    required=['InventoryKamera.FR.exe','InventoryKamera.FR.exe.config','Tesseract.dll','Newtonsoft.Json.dll',
        'x64/tesseract50.dll','x64/leptonica-1.82.0.dll','x86/tesseract50.dll',
        'tessdata/fra.traineddata','tessdata/eng.traineddata','inventorylists/characters.json',
        'inventorylists/french-aliases.json','inventorylists/catalogue-fr.json','README.md','LICENSE.txt']
    for filename in required: assert (DEST/filename).stat().st_size>0,filename
    characters=json.loads((DEST/'inventorylists/characters.json').read_text())
    assert 'traveler' in characters and 'wanderer' in characters
    assert characters['traveler']['ConstellationOrder']['anemo']
    sums=[]
    for file in sorted(DEST.rglob('*')):
        if file.is_file() and file.name!='SHA256SUMS.txt':
            sums.append(hashlib.sha256(file.read_bytes()).hexdigest()+'  '+file.relative_to(DEST).as_posix())
    (DEST/'SHA256SUMS.txt').write_text('\n'.join(sums)+'\n')
    archive=Path(shutil.make_archive(str(ROOT/'dist'/NAME),'zip',ROOT/'dist',NAME))
    (archive.with_suffix('.zip.sha256')).write_text(hashlib.sha256(archive.read_bytes()).hexdigest()+'  '+archive.name+'\n')
    print(f'Paquet vérifié : {archive} ({archive.stat().st_size/1024/1024:.1f} Mio, {len(sums)} fichiers)')

if __name__=='__main__': package()
