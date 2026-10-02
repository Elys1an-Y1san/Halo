#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
./build-chrome.sh
read -r halo_sign_identity halo_sign_team < <(python3 resolve-signing.py)
test -n "$halo_sign_identity"
xcodebuild -project Native/Halo/Halo.xcodeproj -scheme Halo -configuration Release -derivedDataPath .build/native CODE_SIGN_IDENTITY="$halo_sign_identity" DEVELOPMENT_TEAM="$halo_sign_team" CODE_SIGN_STYLE=Manual CODE_SIGNING_ALLOWED=YES build
mkdir -p ../Safari
python3 - <<'PY'
from pathlib import Path
import shutil
root=Path.cwd()
output=root.parent/'Safari/Halo.app'
if output.exists():shutil.rmtree(output)
shutil.copytree(root/'.build/native/Build/Products/Release/Halo.app',output,symlinks=True)
PY
codesign --force --deep --options runtime --preserve-metadata=entitlements --sign "$halo_sign_identity" ../Safari/Halo.app
codesign --verify --deep --strict ../Safari/Halo.app
