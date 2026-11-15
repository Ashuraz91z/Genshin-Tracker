"""Fetch only the OCR models used by Kamera FR, pinned and SHA-256 checked."""
import hashlib
import urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
COMMIT='87416418657359cb625c412a48b6e1d6d41c29bd'
MODELS={'fra':'ced037562e8c80c13122dece28dd477d399af80911a28791a66a63ac1e3445ca','eng':'7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2'}
folder=ROOT/'InventoryKamera-FR/InventoryKamera/tessdata';folder.mkdir(parents=True,exist_ok=True)
for language,expected in MODELS.items():
    path=folder/(language+'.traineddata')
    if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest()==expected:continue
    url=f'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/{COMMIT}/{language}.traineddata'
    with urllib.request.urlopen(url,timeout=60) as response:data=response.read()
    if hashlib.sha256(data).hexdigest()!=expected:raise ValueError(f'Invalid OCR model hash: {language}')
    temporary=path.with_suffix('.tmp');temporary.write_bytes(data);temporary.replace(path)
print('Modèles OCR français/anglais vérifiés.')
