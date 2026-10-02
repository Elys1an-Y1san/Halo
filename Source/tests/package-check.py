from pathlib import Path
import json
root=Path(__file__).resolve().parents[2]
for directory in [root/'Chrome',root/'Source/Native/Halo/Halo Extension/Resources']:
 m=json.loads((directory/'manifest.json').read_text())
 assert m['name']=='映光 Halo' and m['version']=='1.0.4'
 refs=[m['action']['default_popup'],m['options_ui']['page'],*m['icons'].values()]
 bg=m['background'];refs+=bg.get('scripts',[]) or [bg['service_worker']]
 for entry in m['content_scripts']:
  refs+=entry.get('js',[])+entry.get('css',[])
 for entry in m['web_accessible_resources']:refs+=entry['resources']
 for file in [*refs,'credits.html','LICENSE']:assert (directory/file).is_file(),file
 assert set(m['host_permissions'])=={'https://www.youtube.com/*','https://www.bilibili.com/*','https://player.bilibili.com/*','https://live.bilibili.com/*','https://api.github.com/*'}
 assert 'service_worker' in bg if directory.name=='Chrome' else 'scripts' in bg
 print('PASS',directory.name,len(refs),'manifest resources')
print('PASS: Safari/Chrome manifests, resources, license and host scope')

from hashlib import sha256
ui_files = ['options.html','credits.html','scripts/halo-ui.js','scripts/halo-update.js','scripts/halo-wave.js','scripts/halo-controls.js','scripts/bilibili.js','styles/halo-popup.css']
for file in ui_files:
 expected = sha256((root/'Source/src'/file).read_bytes()).digest()
 for directory in [root/'Chrome',root/'Source/dist',root/'Source/Native/Halo/Halo Extension/Resources']:
  assert sha256((directory/file).read_bytes()).digest() == expected, (directory,file)
print('PASS: all packaged UI resources match source byte for byte')
