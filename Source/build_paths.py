"""Shared locations for versioned local browser builds."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent.parent
VERSION = json.loads((ROOT / 'Source/package.json').read_text())['version']
KINDS = ('chromium', 'firefox', 'safari')

def build_dir(kind, version=VERSION):
    if kind not in KINDS:
        raise ValueError(f'Unknown browser kind: {kind}')
    target = ROOT / 'Builds' / kind / version
    target.mkdir(parents=True, exist_ok=True)
    return target

def set_current(kind):
    target = build_dir(kind)
    link = target.parent / 'current'
    if link.is_symlink():
        link.unlink()
    elif link.exists():
        raise RuntimeError(f'Refusing to replace a non-symlink: {link}')
    link.symlink_to(target.name, target_is_directory=True)
    return target
