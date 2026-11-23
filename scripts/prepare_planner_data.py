"""Génère web/public/assets/planner.json depuis un checkout genshin-db :
coûts d'élévation/aptitudes, jours des donjons, donjons d'artéfacts et ennemis qui donnent chaque matériau.
Usage : python3 scripts/prepare_planner_data.py /chemin/vers/genshin-db"""
import importlib.util
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('reference', root / 'scripts/prepare_french_data.py')
ref = importlib.util.module_from_spec(spec); spec.loader.exec_module(ref)
data = Path(sys.argv[1]) / 'src/data'
days = {'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6}


def load(lang, category):
    return {f.stem: json.loads(f.read_text()) for f in sorted((data / lang / category).glob('*.json'))}


def costs(items):
    return [{'key': ref.good(i['name']), 'count': i['count']} for i in items if 'count' in i]


materials, fr_materials = load('English', 'materials'), load('French', 'materials')
domains = {}
for stem, m in materials.items():
    if m.get('daysOfWeek') and m.get('dropDomainName'):
        domains[ref.good(m['name'])] = {'days': sorted(days[d] for d in m['daysOfWeek'] if d != 'Sunday'),
                                        'domain': fr_materials[stem].get('dropDomainName', m['dropDomainName'])}

talents = {ref.good(t['name']): t for t in load('English', 'talents').values()}
characters = {}
for c in load('English', 'characters').values():
    key, t = ref.good(c['name']), talents.get(ref.good(c['name']))
    entry = {'ascension': [costs(c['costs'][f'ascend{n}']) for n in range(1, 7)], 'region': c.get('region', '')}
    if t and 'costs' in t:
        entry['talents'] = [costs(t['costs'][f'lvl{n}']) for n in range(2, 11)]
        entry['talentBook'] = next((i['key'] for lvl in entry['talents'] for i in lvl if i['key'] in domains), None)
    characters[key] = entry

weapons = {}
for w in load('English', 'weapons').values():
    if 'costs' not in w:
        continue
    asc = [costs(w['costs'].get(f'ascend{n}', [])) for n in range(1, 7)]
    weapons[ref.good(w['name'])] = {'ascension': asc, 'baseAtk': round(w.get('baseAtkValue', 0), 1), 'substat': w.get('mainStatType', ''),
                                    'material': next((i['key'] for lvl in asc for i in lvl if i['key'] in domains), None)}

artifact_domains, fr_domains = {}, load('French', 'domains')
for stem, d in load('English', 'domains').items():
    if d.get('domainText') != 'Artifacts':
        continue
    name = fr_domains.get(stem, d)['name'].rsplit(' ', 1)[0]
    for reward in d.get('rewardPreview', []):
        if reward.get('rarity', 0) >= 4 and 'count' not in reward:
            artifact_domains.setdefault(ref.good(reward['name']), set()).add(name)

# Qui le donne (count = moyenne par ennemi/combat, mesurée par genshin-db au niveau du monde 8).
used = {i['key'] for e in [*characters.values(), *weapons.values()] for lvl in e['ascension'] + e.get('talents', []) for i in lvl}
drops, fr_enemies = {}, load('French', 'enemies')
for stem, e in load('English', 'enemies').items():
    weekly = any(r['name'] == 'Dream Solvent' for r in e.get('rewardPreview', []))  # seuls les boss hebdo en donnent
    for r in e.get('rewardPreview', []):
        key = ref.good(r['name'])
        if key in used and 'rarity' not in r:
            drops.setdefault(key, []).append({'n': fr_enemies.get(stem, e)['name'], 'c': r.get('count'), 'b': 2 if weekly else int(e.get('enemyType') == 'BOSS'), 'i': stem})
material_info = {k: sorted(v, key=lambda s: (-(s['c'] or 0), s['b'] == 2))[:3] for k, v in drops.items()}

# Icônes rondes des ennemis : web/public/assets/enemies/<id>.webp (enka, sinon yatta ; 96 px via cwebp).
icons, icon_dir = json.loads((data / 'image/enemies.json').read_text()), root / 'web/public/assets/enemies'
icon_dir.mkdir(exist_ok=True)
for s in (s for v in material_info.values() for s in v):
    stem = s.pop('i')
    file, target, raw = icons.get(stem, {}).get('filename_icon'), icon_dir / f'{stem}.webp', icon_dir / f'{stem}.png'
    if file and not target.exists():
        for url in ('https://enka.network/ui/' + file + '.png', 'https://gi.yatta.moe/assets/UI/monster/' + file + '.png', 'https://gi.yatta.moe/assets/UI/' + file + '.png'):
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=15) as r:
                    raw.write_bytes(r.read())
                subprocess.run(['cwebp', '-quiet', '-q', '82', '-resize', '96', '96', str(raw), '-o', str(target)], check=True)
                break
            except Exception:
                pass
            finally:
                raw.unlink(missing_ok=True)
    if target.exists():
        s['i'] = stem

# Où se trouve chaque donjon : nom sans numéro (I, II…) -> [région, entrée].
places = {}
for d in fr_domains.values():
    base = d['name'].rsplit(' ', 1)[0] if d['name'].rsplit(' ', 1)[-1].strip('IV') == '' else d['name']
    if d.get('regionName') and d.get('entranceName'):
        places.setdefault(base, [d['regionName'], d['entranceName']])

# Épreuves de chaque donjon : [numéro, rang d'aventure requis, meilleure rareté donnée].
rarity = {ref.good(m['name']): m.get('rarity') or 0 for m in materials.values()}
tiers = {}
for stem, d in load('English', 'domains').items():
    fr = fr_domains.get(stem, d)['name']
    base, num = fr.rsplit(' ', 1)
    if num.strip('IV') or not d.get('unlockRank'):
        continue
    top = max([r['rarity'] if 'rarity' in r else rarity.get(ref.good(r['name']), 0) for r in d.get('rewardPreview', []) if 'count' not in r] or [0])
    tiers.setdefault(base, []).append([num, d['unlockRank'], top])
tiers = {k: sorted(v, key=lambda x: x[1]) for k, v in tiers.items()}

out = {'domainPlaces': places, 'domainTiers': tiers, 'materialDays': domains, 'characters': characters, 'weapons': weapons,
       'artifactDomains': {k: sorted(v) for k, v in artifact_domains.items()}, 'drops': material_info}
(root / 'web/public/assets/planner.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
print(len(characters), 'personnages,', len(weapons), 'armes,', len(domains), 'matériaux de donjon,', len(artifact_domains), 'sets')
