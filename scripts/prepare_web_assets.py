import concurrent.futures
import importlib.util
import json
import sys
import urllib.request
from pathlib import Path

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('reference',root/'scripts/prepare_french_data.py');ref=importlib.util.module_from_spec(spec);spec.loader.exec_module(ref)
source=Path(sys.argv[1]);dest=root/'web/public/assets';(dest/'portraits').mkdir(parents=True,exist_ok=True)
images=json.loads((source/'src/data/image/characters.json').read_text())
catalog={};jobs=[]
for category in ['characters','weapons','materials','artifacts']:
    result={}
    for f in sorted((source/'src/data/English'/category).glob('*.json')):
        en=json.loads(f.read_text());fr=json.loads((source/'src/data/French'/category/f.name).read_text());key=ref.good(en['name'])
        row={'name':fr['name'],'rarity':fr.get('rarity',max(fr.get('rarityList',[1]))),'id':fr['id']}
        if category=='characters':
            row.update(element=fr.get('elementText',''),weapon=fr.get('weaponText',''))
            record=images.get(f.stem,{})
            image=[record.get(field) for field in ['hoyowiki_icon','mihoyo_icon'] if record.get(field)]
            if image: row['portrait']=f'/assets/portraits/{key}.png';jobs.append((image,dest/'portraits'/f'{key}.png'))
        result[key]=row
    catalog[category]=result
for element in ['Anemo','Geo','Electro','Dendro','Hydro','Pyro','Cryo']:
    catalog['characters']['Traveler'+element]={'name':'Voyageur · '+element,'rarity':5,'element':element,'weapon':'Épée à une main','portrait':'/assets/portraits/Aether.png'}
(dest/'catalogue.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':')))
def fetch(job):
    urls,path=job
    if path.exists():return True
    for url in urls:
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'GenshinTracker/0.3'})
            with urllib.request.urlopen(req,timeout=15) as r: data=r.read()
            if not data.startswith(b'\x89PNG'):continue
            path.write_bytes(data);return True
        except Exception:continue
    return False
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    results=list(pool.map(fetch,jobs))
for row in catalog['characters'].values():
    if row.get('portrait') and not (root/'web/public'/row['portrait'].lstrip('/')).exists():
        del row['portrait']
(dest/'catalogue.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':')))
print(f'Catalogue FR préparé ; {sum(results)}/{len(jobs)} portraits disponibles. Les autres utilisent les initiales.')
(dest/'SOURCES.md').write_text('Noms et métadonnées : https://github.com/theBowja/genshin-db ; commit '+json.loads((root/'InventoryKamera-FR/InventoryKamera/inventorylists/source.json').read_text())['commit']+'\nPortraits : URLs HoYoverse/mihoyo présentes dans ce référentiel, fichiers conservés localement. Genshin Impact et personnages : ayants droit HoYoverse.\nPanorama céleste : illustration SVG originale pour cette interface.\n')
