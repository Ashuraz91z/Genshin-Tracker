"""Check canonical export keys and references required before starting a scan."""
import importlib.util
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('reference',root/'scripts/prepare_french_data.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
for name,key in [("Gladiator's Finale",'GladiatorsFinale'),("Wolf's Gravestone",'WolfsGravestone'),("Hunter's Path",'HuntersPath'),('Kamisato Ayaka','KamisatoAyaka'),('A Thousand Floating Dreams','AThousandFloatingDreams')]:
    assert m.good(name)==key,(name,m.good(name))
folder=root/'InventoryKamera-FR/InventoryKamera/inventorylists'
characters=json.loads((folder/'characters.json').read_text())
assert characters['traveler']['Element']
assert characters['wanderer']['GOOD']=='Wanderer'
assert characters['amber']['ConstellationOrder']==['burst','skill']
assert json.loads((folder/'artifacts.json').read_text())['gladiatorsfinale']['GOOD']=='GladiatorsFinale'
assert json.loads((folder/'weapons.json').read_text())['wolfsgravestone']=='WolfsGravestone'
print('10 reference checks passed: canonical GOOD keys, Traveler, Wanderer and constellation bonuses.')
