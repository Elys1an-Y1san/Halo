"""Reject prose reports and generated builds from the Git index."""
from pathlib import PurePosixPath
import subprocess

files=subprocess.check_output(['git','ls-files','-z']).decode().split('\0')
document_types={'.md','.markdown','.mdown','.rst','.txt','.pdf','.doc','.docx','.odt','.rtf'}
ai_names={'agents.md','claude.md','gemini.md','skill.md','copilot-instructions.md'}
errors=[]
for name in filter(None,files):
    path=PurePosixPath(name)
    if name.startswith(('Builds/','Chrome/','Firefox/','Safari/','Releases/','.local/','Source/dist/','Source/Native/Halo/Halo Extension/Resources/')):
        errors.append(name)
    if path.suffix.lower() not in document_types:
        continue
    allowed=path.stem.lower()=='readme' or path.name.lower() in ai_names or any(part in {'.agents','.codex'} for part in path.parts) or '.cursor/rules/' in name
    if not allowed:
        errors.append(name)
if errors:
    raise SystemExit('Files must remain local:\n'+'\n'.join(sorted(set(errors))))
for name,ignored in [('REPORT.md',True),('notes.PDF',True),('Builds/chromium/1.1.3/Chrome/manifest.json',True),('README.md',False),('Source/Windows/README.md',False),('AGENTS.md',False),('CLAUDE.md',False),('.agents/review/SKILL.md',False)]:
    result=subprocess.run(['git','check-ignore','--no-index','-q',name])
    assert (result.returncode==0)==ignored, name
print('PASS repository contains only allowed documents and no generated builds')
