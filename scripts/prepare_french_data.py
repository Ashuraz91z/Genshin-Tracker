#!/usr/bin/env python3
"""Build Kamera lookup tables from paired genshin-db records, never machine translation."""
import argparse
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'InventoryKamera-FR/InventoryKamera/inventorylists'


def good(name):
    titled = re.sub(r"(?<=[A-Za-z])(['’])([A-Z])", lambda m: m[1] + m[2].lower(), name.lower().title())
    return re.sub(r'[^\w]', '', titled, flags=re.UNICODE)


def build(source):
    OUT.mkdir(parents=True, exist_ok=True)
    aliases, characters, weapons, materials, artifacts, catalog = {}, {}, {}, {}, {}, {}
    def alias(fr, en):
        if fr and en and fr.casefold() != en.casefold():
            if fr in aliases and aliases[fr] != en:
                raise ValueError(f'Ambiguous French name: {fr}')
            aliases[fr] = en
    def pairs(category):
        for path in sorted((source/'src/data/English'/category).glob('*.json')):
            en = json.loads(path.read_text())
            frpath = source/'src/data/French'/category/path.name
            if not frpath.exists():
                raise ValueError(f'Missing French record: {path.name}')
            fr = json.loads(frpath.read_text())
            assert en['id'] == fr['id'], path
            yield path.stem, en, fr
    for category in ('characters','weapons','materials','artifacts','talents','constellations'):
        catalog[category] = []
        for stem, en, fr in pairs(category):
            if category not in ('talents','constellations'):
                alias(fr['name'], en['name'])
            catalog[category].append({'id':fr['id'], 'name':fr['name'], 'englishName':en['name']})
            if category == 'characters':
                if not en.get('elementText') or en['elementText'] == 'None':
                    continue
                key = 'Traveler' if stem.startswith('traveler') else good(en['name'])
                entry = characters.setdefault(key.lower(), {'GOOD':key,'ConstellationName':[], 'ConstellationOrder':{} if key=='Traveler' else [], 'Element':[], 'WeaponType':{'WEAPON_SWORD_ONE_HAND':0,'WEAPON_CLAYMORE':1,'WEAPON_POLE':2,'WEAPON_BOW':3,'WEAPON_CATALYST':4}[en['weaponType']]})
                element=en['elementText'].lower()
                if element not in entry['Element']: entry['Element'].append(element)
                if en['constellation'] not in entry['ConstellationName']: entry['ConstellationName'].append(en['constellation'])
                cpath=source/'src/data/English/constellations'/f'{stem}.json'
                tpath=source/'src/data/English/talents'/f'{stem}.json'
                if cpath.exists() and tpath.exists():
                    c=json.loads(cpath.read_text()); t=json.loads(tpath.read_text())
                    order=[]
                    for n in (3,5):
                        desc=c[f'c{n}']['description']
                        matches=[kind for combat,kind in [('combat1','auto'),('combat2','skill'),('combat3','burst')] if t.get(combat,{}).get('name') and t[combat]['name'] in desc]
                        if not matches and 'Level' not in desc:
                            order.append(None)
                            continue
                        if len(matches)!=1:
                            raise ValueError(f'Unresolved C{n} talent bonus for {stem}: {matches}')
                        order.append(matches[0])
                    if key=='Traveler': entry['ConstellationOrder'][element]=order
                    else: entry['ConstellationOrder']=order
                else:
                    raise ValueError(f'Missing talent or constellation data for {stem}')
            elif category in ('weapons','materials'):
                target=weapons if category=='weapons' else materials
                target[good(en['name']).lower()]=good(en['name'])
            elif category=='artifacts':
                key=good(en['name'])
                pieces={}
                for slot in ('flower','plume','sands','goblet','circlet'):
                    if slot not in en: continue
                    alias(fr[slot]['name'],en[slot]['name'])
                    alias(fr[slot]['relicText'],en[slot]['relicText'])
                    pieces[slot]={'artifactName':en[slot]['name'],'GOOD':good(en[slot]['name']),'normalizedName':good(en[slot]['name']).lower()}
                artifacts[key.lower()]={'setName':en['name'],'GOOD':key,'normalizedName':key.lower(),'artifacts':pieces}
            elif category in ('talents','constellations'):
                catalog[category][-1]['data'] = fr
    # genshin-db stores the Traveler's elemental variants under talents, not characters.
    traveler = {'GOOD':'Traveler', 'ConstellationName':['Viator','Viatrix'], 'ConstellationOrder':{}, 'Element':[], 'WeaponType':0}
    for path in sorted((source/'src/data/English/talents').glob('traveler*.json')):
        element = path.stem.removeprefix('traveler')
        talent = json.loads(path.read_text())
        constellation = json.loads((source/'src/data/English/constellations'/path.name).read_text())
        order=[]
        for n in (3,5):
            description=constellation[f'c{n}']['description']
            matches=[kind for combat,kind in [('combat1','auto'),('combat2','skill'),('combat3','burst')] if talent[combat]['name'] in description]
            if len(matches)!=1: raise ValueError(f'Unresolved Traveler {element} C{n}')
            order.append(matches[0])
        traveler['Element'].append(element)
        traveler['ConstellationOrder'][element]=order
    assert traveler['Element'], 'Missing Traveler elemental variants'
    characters['traveler']=traveler
    for filename,data in [('characters',characters),('weapons',weapons),('materials',materials),('artifacts',artifacts),('french-aliases',aliases),('catalogue-fr',catalog)]:
        (OUT/f'{filename}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    commit=subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()
    manifest={'source':'https://github.com/theBowja/genshin-db','commit':commit,'language':'French','counts':{k:len(v) for k,v in catalog.items()},'aliases':len(aliases),'scannerLookupCounts':{'characters':len(characters),'weapons':len(weapons),'artifacts':len(artifacts),'materials':len(materials)},'notice':'Snapshot communautaire ; couverture actuelle du jeu à contrôler.'}
    (OUT/'source.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    (OUT/'version.txt').write_text('0.1.0')
    print(json.dumps(manifest,ensure_ascii=False,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('genshin_db',type=Path);args=p.parse_args();build(args.genshin_db)
