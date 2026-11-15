import concurrent.futures
import importlib.util
import json
import sys
import urllib.request
from pathlib import Path

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('reference',root/'scripts/prepare_french_data.py');ref=importlib.util.module_from_spec(spec);spec.loader.exec_module(ref)
source=Path(sys.argv[1]);dest=root/'web/public/assets';(dest/'portraits').mkdir(parents=True,exist_ok=True)
images={category:json.loads((source/f'src/data/image/{category}.json').read_text()) for category in ['characters','weapons','materials','artifacts']}
catalog={};jobs=[]
for category in ['characters','weapons','materials','artifacts']:
    result={}
    for f in sorted((source/'src/data/English'/category).glob('*.json')):
        en=json.loads(f.read_text());fr=json.loads((source/'src/data/French'/category/f.name).read_text());key=ref.good(en['name'])
        row={'name':fr['name'],'rarity':fr.get('rarity',max(fr.get('rarityList',[0]))),'id':fr['id']}
        if category=='characters':
            row.update(element=fr.get('elementText',''),weapon=fr.get('weaponText',''))
            record=images[category].get(f.stem,{})
            image=[record.get(field) for field in ['hoyowiki_icon','mihoyo_icon'] if record.get(field)]
            if not image:
                try:
                    with urllib.request.urlopen(urllib.request.Request('https://gi.yatta.moe/api/v2/en/avatar/'+str(fr['id']),headers={'User-Agent':'Mozilla/5.0'}),timeout=10) as response:avatar=json.load(response)['data']
                    if ref.good(avatar['name'])==key and avatar.get('icon'):record['filename_icon']=avatar['icon']
                except Exception:pass
            if record.get('filename_icon'):image.append('https://enka.network/ui/'+record['filename_icon']+'.png')
            if image: row['portrait']=f'/assets/portraits/{key}.png';jobs.append((image,dest/'portraits'/f'{key}.png'))
        else:
            record=images[category].get(f.stem,{})
            (dest/category).mkdir(exist_ok=True)
            if category=='artifacts':
                row['rarities']=fr.get('rarityList',[row['rarity']]);row['effect2Pc']=fr.get('effect2Pc','');row['effect4Pc']=fr.get('effect4Pc','')
                row['pieces']={slot:{'name':fr[slot]['name']} for slot in ['flower','plume','sands','goblet','circlet'] if slot in fr}
                for slot,piece in row['pieces'].items():
                    urls=[record[field] for field in [slot,'mihoyo_'+slot] if record.get(field)]
                    if record.get('filename_'+slot):urls.append('https://enka.network/ui/'+record['filename_'+slot]+'.png')
                    if urls:
                        piece['image']=f'/assets/{category}/{key}-{slot}.png'
                        jobs.append((urls,dest/category/f'{key}-{slot}.png'))
            else:
                urls=[record[field] for field in ['icon','mihoyo_icon'] if record.get(field)]
                if not urls and record.get('filename_icon'):
                    urls=['https://upload-os-bbs.mihoyo.com/game_record/genshin/equip/'+record['filename_icon']+'.png']
                if record.get('filename_icon'):urls.extend(['https://enka.network/ui/'+record['filename_icon']+'.png','https://gi.yatta.moe/assets/UI/'+record['filename_icon']+'.png'])
                if urls:
                    row['image']=f'/assets/{category}/{key}.png'
                    jobs.append((urls,dest/category/f'{key}.png'))
                if category=='weapons':row['weapon']=fr.get('weaponText','')
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
            req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; GenshinTracker)' })
            with urllib.request.urlopen(req,timeout=15) as r: data=r.read()
            if not data.startswith(b'\x89PNG'):continue
            path.write_bytes(data);return True
        except Exception:continue
    return False
# A pinned mirror fills gaps in the community snapshot's HoYoverse URLs.
mirror_commit=''
try:
    with urllib.request.urlopen('https://api.github.com/repos/MadeBaruna/paimon-moe/commits/main',timeout=15) as response:
        mirror_commit=json.load(response)['sha']
    with urllib.request.urlopen('https://api.github.com/repos/MadeBaruna/paimon-moe/git/trees/'+mirror_commit+'?recursive=1',timeout=20) as response:
        tree=json.load(response)['tree']
    mirror={}
    for entry in tree:
        path=entry['path']
        for category,folder in [('materials','items'),('weapons','weapons'),('artifacts','artifacts')]:
            if path.startswith('static/images/'+folder+'/') and path.endswith('.png'):
                normalized=''.join(c for c in Path(path).stem.casefold() if c.isalnum())
                mirror[(category,normalized)]='https://raw.githubusercontent.com/MadeBaruna/paimon-moe/'+mirror_commit+'/'+path
    for category in ['materials','weapons']:
        for key,row in catalog[category].items():
            url=mirror.get((category,''.join(c for c in key.casefold() if c.isalnum())))
            if url:
                path=dest/category/f'{key}.png'
                row['image']=f'/assets/{category}/{key}.png'
                existing=next((job for job in jobs if job[1]==path),None)
                if existing:existing[0].append(url)
                else:jobs.append(([url],path))
    for key,row in catalog['artifacts'].items():
        for slot,piece in row.get('pieces',{}).items():
            url=mirror.get(('artifacts',''.join(c for c in (key+slot).casefold() if c.isalnum())))
            if url:
                path=dest/'artifacts'/f'{key}-{slot}.png'
                piece['image']=f'/assets/artifacts/{key}-{slot}.png'
                existing=next((job for job in jobs if job[1]==path),None)
                if existing:existing[0].append(url)
                else:jobs.append(([url],path))
except Exception as error:
    print('Miroir indisponible :',error)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    results=list(pool.map(fetch,jobs))
for records in catalog.values():
    for row in records.values():
        for entry in [row,*row.get('pieces',{}).values()]:
            for field in ['portrait','image']:
                if entry.get(field) and not (root/'web/public'/entry[field].lstrip('/')).exists():
                    del entry[field]
(dest/'catalogue.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':')))
print(f'Catalogue FR préparé ; {sum(results)}/{len(jobs)} illustrations disponibles. Les autres utilisent un pictogramme.')
(dest/'SOURCES.md').write_text('Noms et métadonnées : https://github.com/theBowja/genshin-db ; commit '+json.loads((root/'InventoryKamera-FR/InventoryKamera/inventorylists/source.json').read_text())['commit']+'\nIllustrations : URLs HoYoverse/mihoyo présentes dans ce référentiel, fichiers conservés localement. Genshin Impact et personnages : ayants droit HoYoverse.\nPanorama céleste : illustration SVG originale pour cette interface.\n')

if mirror_commit:
    with (dest/'SOURCES.md').open('a') as sources:sources.write('Illustrations complémentaires : https://github.com/MadeBaruna/paimon-moe/tree/'+mirror_commit+'/static/images (miroir des illustrations du jeu, droits HoYoverse).\n')

with (dest/'SOURCES.md').open('a') as sources:sources.write('Images manquantes : https://enka.network/ui/ et https://gi.yatta.moe/assets/UI/ ; identifiants et icônes manquants vérifiés via https://gi.yatta.moe/api/v2/en/avatar/<id>.\n')
