"""Package Halo's independent static runtime for all browser targets."""
from pathlib import Path
import json
import shutil
import runpy
from build_paths import build_dir, set_current

root = Path(__file__).resolve().parent
source = root / 'dist'
manifest = json.loads((source / 'manifest.json').read_text())
assert manifest['version'] == json.loads((root / 'package.json').read_text())['version'], 'Run npm run build first'

def copy_clean(target, config):
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(source, target)
    (target / 'manifest.json').write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n')

chrome = build_dir('chromium') / 'Chrome'
chrome_manifest = {**manifest, 'minimum_chrome_version': '121'}
copy_clean(chrome, chrome_manifest)
set_current('chromium')
safari_manifest = {**manifest, 'permissions': ['storage', 'activeTab', 'nativeMessaging'],
                   'background': {'scripts': ['scripts/halo-update.js', 'scripts/background.js']}}
copy_clean(root / 'Native/Halo/Halo Extension/Resources', safari_manifest)
print(f'Prepared Chromium and Safari resources: {chrome}')
runpy.run_path(str(root / 'package-firefox.py'), run_name='__main__')
