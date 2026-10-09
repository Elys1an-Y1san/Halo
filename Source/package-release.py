"""Archive the current browser builds and retain three previous versions locally."""
from pathlib import Path
import hashlib
import os
import plistlib
import re
import shutil
import subprocess
from build_paths import ROOT, VERSION, KINDS, build_dir, set_current

subprocess.run(['python3', str(ROOT/'Source/package-windows.py')], check=True)
chrome = build_dir('chromium')
shutil.make_archive(str(chrome/f'Halo-Chrome-{VERSION}'), 'zip', chrome, 'Chrome')
safari = build_dir('safari')
app = safari/'Halo.app'
with (app/'Contents/Info.plist').open('rb') as file:
    assert plistlib.load(file)['CFBundleShortVersionString'] == VERSION
subprocess.run(['codesign', '--verify', '--deep', '--strict', str(app)], check=True)
subprocess.run(['ditto', '-c', '-k', '--sequesterRsrc', '--keepParent', str(app), str(safari/f'Halo-Safari-{VERSION}.zip')], check=True)
subprocess.run(['tar', '-cJf', str(safari/f'Halo-Safari-{VERSION}.tar.xz'), '-C', str(safari), 'Halo.app'], check=True, env={**os.environ, 'COPYFILE_DISABLE':'1'})
checksums=[]
for kind in KINDS:
    folder=set_current(kind)
    assets=sorted(p for p in folder.iterdir() if p.is_file() and (p.suffix=='.zip' or p.name.endswith('.tar.xz')))
    lines=[f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in assets]
    (folder/'SHA256.txt').write_text(''.join(lines))
    checksums.extend(lines)
    versions=sorted((p for p in folder.parent.iterdir() if p.is_dir() and not p.is_symlink() and re.fullmatch(r'\d+\.\d+\.\d+',p.name)), key=lambda p:tuple(map(int,p.name.split('.'))), reverse=True)
    historical=[p for p in versions if p.name!=VERSION]
    for old in historical[3:]:
        target=ROOT/'.local/build-archive'/kind/old.name
        if target.exists():
            raise RuntimeError(f'Archive already exists; review before moving {old}')
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.move(old,target)
    print(folder)
metadata=ROOT/'.local/releases'/VERSION
metadata.mkdir(parents=True,exist_ok=True)
(metadata/'SHA256.txt').write_text(''.join(sorted(checksums)))
print(f'Release checksum manifest: {metadata/"SHA256.txt"}')
