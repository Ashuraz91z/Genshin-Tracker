#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
dotnet_cmd="${DOTNET:-dotnet}"
python_cmd="${PYTHON:-python3}"
"$python_cmd" scripts/download_ocr_models.py
"$dotnet_cmd" build InventoryKamera-FR/InventoryKamera/InventoryKamera.FR.csproj -c Release --nologo
"$dotnet_cmd" run --project tests/FrenchRecognition/FrenchRecognition.csproj -c Release
"$dotnet_cmd" run --project tests/Inventory/Inventory.csproj -c Release
"$python_cmd" tests/test_reference.py
"$python_cmd" scripts/package_windows.py
