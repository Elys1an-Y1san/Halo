from pathlib import Path
import json,shutil,re
r=Path(__file__).resolve().parent
# Existing Safari bridge and CSS-filter compatibility patches are retained.
exec(compile((r/'prepare-safari.py').read_text(),str(r/'prepare-safari.py'),'exec'))
for name in ['scripts/halo-ui.js','scripts/halo-update.js','scripts/halo-wave.js','scripts/halo-controls.js','scripts/bilibili-player.js','scripts/bilibili.js','styles/bilibili.css','styles/halo-popup.css','styles/halo-youtube.css','options.html','credits.html']:
 shutil.copy2(r/'src'/name,r/'dist'/name)
shutil.copy2(r/'src/scripts/halo-background.js',r/'dist/scripts/background.js')
# Do not forward crash reports from this independent distribution.
for p in (r/'dist/scripts').glob('*.js'):
 if p.name in ['content-main.js','content.js','injected.js']:
  s=p.read_text();s=s.replace("(await storage.get('crashOptions')) || defaultCrashOptions",'({crash:false,technical:false,video:false})')
  s=re.sub(r'(const defaultCrashOptions = \{)[\s\S]*?(\};)',r'\1 video:false, technical:false, crash:false \2',s)
  p.write_text(s)
m=json.loads((r/'dist/manifest.json').read_text());m.update(name='映光 Halo',version='1.0.3',description='让画面，漫出边界。为 YouTube 与哔哩哔哩带来可调节的视频环境光。')
m['host_permissions']=['https://www.youtube.com/*','https://www.bilibili.com/*','https://player.bilibili.com/*','https://live.bilibili.com/*','https://api.github.com/*']
m['background']={'scripts':['scripts/halo-update.js','scripts/background.js']}
m['permissions']=['storage','activeTab','nativeMessaging'];m['action']['default_title']='映光 Halo'
m.pop('homepage_url',None)
for e in m['content_scripts']:
 if 'scripts/bilibili.js' in e.get('js',[]):
  e['js']=['scripts/halo-ui.js','scripts/halo-update.js','scripts/halo-wave.js','scripts/bilibili-player.js','scripts/bilibili.js']
  e['matches']=['https://www.bilibili.com/*','https://player.bilibili.com/*','https://live.bilibili.com/*']
  e['all_frames']=True
m['content_scripts']=[e for e in m['content_scripts'] if 'scripts/halo-controls.js' not in e.get('js',[])]
m['content_scripts'].append({'matches':['https://www.youtube.com/*'],'exclude_matches':['https://www.youtube.com/live_chat*'],'all_frames':True,'js':['scripts/halo-ui.js','scripts/halo-update.js','scripts/halo-wave.js','scripts/halo-controls.js'],'css':['styles/halo-youtube.css'],'run_at':'document_idle'})
(r/'dist/manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2))
resources=r/'Native/Halo/Halo Extension/Resources'
shutil.copytree(r/'dist',resources,dirs_exist_ok=True,ignore=shutil.ignore_patterns('*.map'))
chrome=r.parent/'Chrome'
shutil.copytree(r/'dist',chrome,dirs_exist_ok=True,ignore=shutil.ignore_patterns('*.map'))
m['permissions']=['storage','activeTab']
m['background']={'service_worker':'scripts/background.js'};m['minimum_chrome_version']='121'
(chrome/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2))
print('Prepared Safari resources and Chrome MV3 package')
