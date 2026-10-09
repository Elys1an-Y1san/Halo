from pathlib import Path
import json, plistlib, sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_paths import build_dir
root=Path(__file__).resolve().parents[2]
native = build_dir('safari')/'Halo.app'
packages = [build_dir('firefox')/'Firefox',build_dir('chromium')/'Chrome',root/'Source/Native/Halo/Halo Extension/Resources']
if native.exists(): packages.append(native/'Contents/PlugIns/Halo Extension.appex/Contents/Resources')
for directory in packages:
 m=json.loads((directory/'manifest.json').read_text())
 assert m['name']=='映光 Halo' and m['version']==json.loads((root/'Source/package.json').read_text())['version']
 refs=[m['action']['default_popup'],m['options_ui']['page'],*m['icons'].values()]
 bg=m['background'];refs+=bg.get('scripts',[]) or [bg['service_worker']]
 for entry in m['content_scripts']:
  refs+=entry.get('js',[])+entry.get('css',[])
 for entry in m['web_accessible_resources']:refs+=entry['resources']
 for file in [*refs,'credits.html','LICENSE']:assert (directory/file).is_file(),file
 assert set(m['host_permissions'])=={'https://www.youtube.com/*','https://www.bilibili.com/*','https://player.bilibili.com/*','https://live.bilibili.com/*','https://api.github.com/*','https://x.com/*','https://www.x.com/*','https://twitter.com/*','https://www.twitter.com/*'}
 assert 'service_worker' in bg if directory.name=='Chrome' else 'scripts' in bg
 print('PASS',directory.name,len(refs),'manifest resources')
print('PASS: Safari/Chrome/Firefox manifests, resources, license and host scope')

from hashlib import sha256
ui_files = ['options.html','credits.html','scripts/halo-ui.js','scripts/halo-update.js','scripts/halo-wave.js','scripts/halo-controls.js','scripts/bilibili.js','scripts/x-player.js','styles/halo-x.css','styles/halo-popup.css']
for file in ui_files:
 expected = sha256((root/'Source/src'/file).read_bytes()).digest()
 for directory in [*packages,root/'Source/dist']:
  assert sha256((directory/file).read_bytes()).digest() == expected, (directory,file)
print('PASS: all packaged UI resources match source byte for byte')

version=json.loads((root/'Source/package.json').read_text())['version']
for bundle in ([native,native/'Contents/PlugIns/Halo Extension.appex'] if native.exists() else []):
 with (bundle/'Contents/Info.plist').open('rb') as file: info=plistlib.load(file)
 assert info['CFBundleShortVersionString']==version,(bundle,info['CFBundleShortVersionString'])
print('PASS: built native app and extension versions match the release' if native.exists() else 'SKIP: native app is not built on this host')


# Verify the delivered archive, not only the unpacked development folder.
from zipfile import ZipFile
archive = build_dir('firefox')/f'Halo-Firefox-{version}-unsigned.zip'
with ZipFile(archive) as package:
 files = {str(p.relative_to(build_dir('firefox')/'Firefox')): p for p in (build_dir('firefox')/'Firefox').rglob('*') if p.is_file()}
 assert set(package.namelist()) == set(files), 'Firefox ZIP has missing or stale files'
 for name, path in files.items():
  assert package.read(name) == path.read_bytes(), name
print('PASS: unsigned Firefox ZIP matches generated folder byte for byte')
