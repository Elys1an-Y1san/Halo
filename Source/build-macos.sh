#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
./build-chrome.sh
read -r halo_sign_identity halo_sign_team < <(python3 resolve-signing.py)
test -n "$halo_sign_identity"
xcodebuild -project Native/Halo/Halo.xcodeproj -scheme Halo -configuration Release -derivedDataPath .build/native CODE_SIGN_IDENTITY="$halo_sign_identity" DEVELOPMENT_TEAM="$halo_sign_team" CODE_SIGN_STYLE=Manual CODE_SIGNING_ALLOWED=YES build
python3 - <<'PY'
from pathlib import Path
import shutil
from build_paths import build_dir, set_current
root=Path.cwd()
output=build_dir('safari')/'Halo.app'
if output.exists():shutil.rmtree(output)
shutil.copytree(root/'.build/native/Build/Products/Release/Halo.app',output,symlinks=True)
set_current('safari')
PY
codesign --force --deep --options runtime --preserve-metadata=entitlements --sign "$halo_sign_identity" ../Builds/safari/current/Halo.app
codesign --verify --deep --strict ../Builds/safari/current/Halo.app
