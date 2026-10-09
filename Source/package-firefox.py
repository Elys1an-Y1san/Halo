"""Package the shared, prepared renderer for Firefox (no native host required)."""
from pathlib import Path
import json
import shutil
import zipfile
from build_paths import build_dir, set_current

ROOT = Path(__file__).resolve().parent

def package():
    source = ROOT / 'dist'
    manifest = json.loads((source / 'manifest.json').read_text())
    version = json.loads((ROOT / 'package.json').read_text())['version']
    if manifest['name'] != '映光 Halo' or manifest['version'] != version:
        raise SystemExit('Run python3 package-halo.py before packaging Firefox')
    manifest.pop('minimum_chrome_version', None)
    manifest['browser_specific_settings'] = {'gecko': {
        'id': 'halo@elys1an-y1san.github.io',
        # Static MAIN-world scripts are supported starting with Firefox 128.
        'strict_min_version': '128.0',
        'data_collection_permissions': {'required': ['none']},
    }}
    manifest['permissions'] = ['storage', 'activeTab']
    manifest['background'] = {'scripts': ['scripts/halo-update.js', 'scripts/background.js']}
    target = build_dir('firefox') / 'Firefox'
    # Recreate generated output so removed source assets cannot survive a rebuild.
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(source, target, ignore=shutil.ignore_patterns('*.map', '.DS_Store'))
    (target / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    releases = build_dir('firefox')
    releases.mkdir(parents=True, exist_ok=True)
    archive = releases / f'Halo-Firefox-{version}-unsigned.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as output:
        for path in sorted(target.rglob('*')):
            if path.is_file():
                output.write(path, path.relative_to(target))
    set_current('firefox')
    print(f'Prepared Firefox package: {target}\nUnsigned archive: {archive}')

if __name__ == '__main__':
    package()
