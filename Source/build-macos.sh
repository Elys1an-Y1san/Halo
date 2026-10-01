#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
./build-chrome.sh
xcodebuild -project Native/Halo/Halo.xcodeproj -scheme Halo -configuration Release -derivedDataPath .build/native CODE_SIGN_IDENTITY=- CODE_SIGNING_ALLOWED=YES build
mkdir -p ../Safari
python3 - <<'PY'
from pathlib import Path
import shutil
root=Path.cwd()
output=root.parent/'Safari/Halo.app'
if output.exists():shutil.rmtree(output)
shutil.copytree(root/'.build/native/Build/Products/Release/Halo.app',output,symlinks=True)
PY
codesign --verify --deep --strict ../Safari/Halo.app
