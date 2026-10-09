"""Build the Windows installer folder and ZIP from the existing Chrome package."""
from pathlib import Path
import hashlib
import json
import shutil
import zipfile

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'Chrome/manifest.json').read_text(encoding='utf-8'))['version']
output = root / 'Releases' / version / f'Halo-Windows-Chrome-{version}'
if output.exists():
    shutil.rmtree(output)
output.mkdir(parents=True)
files = []
for source in sorted((root / 'Chrome').rglob('*')):
    if not source.is_file() or source.suffix == '.md' or source.name.startswith('.'):
        continue
    relative = source.relative_to(root)
    target = output / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(source.read_bytes())
    files.append({'path': relative.as_posix(), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
(output / 'payload.json').write_text(json.dumps({'product': 'Halo', 'version': version, 'files': files}, indent=2) + '\n', encoding='utf-8')
for source in (root / 'Source/Windows').iterdir():
    if not source.is_file():
        continue
    target = output / source.name
    if source.suffix in ('.ps1', '.psm1'):
        target.write_bytes(source.read_text(encoding='utf-8-sig').replace('\r\n', '\n').replace('\n', '\r\n').encode('utf-8-sig'))
    elif source.suffix == '.cmd':
        target.write_bytes(source.read_text(encoding='utf-8').replace('\r\n', '\n').replace('\n', '\r\n').encode('ascii'))
    else:
        shutil.copyfile(source, target)
shutil.copyfile(root / 'LICENSE', output / 'LICENSE')
archive = output.with_name(output.name + '.zip')
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
    for source in sorted(output.rglob('*')):
        if source.is_file():
            bundle.write(source, source.relative_to(output.parent))
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(output.parent / (archive.name + '.sha256')).write_text(f'{digest}  {archive.name}\n', encoding='ascii')
print(archive)
print(f'{len(files)} extension files, {archive.stat().st_size} bytes, SHA256 {digest}')
