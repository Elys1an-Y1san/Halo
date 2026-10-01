from pathlib import Path
import json,shutil
root=Path(__file__).resolve().parent
p=root/'dist/manifest.json';m=json.loads(p.read_text());m.pop('minimum_chrome_version',None);m.pop('browser_specific_settings',None)
m['version']='1.0.0';m['name']='映光 Halo';m['background']={'scripts':['scripts/background.js']};m['options_ui'].pop('open_in_tab',None)
m['description']='Ambient light for YouTube and Bilibili. 视频环境光，支持模糊、扩散和亮度调节。'
m['host_permissions']=['https://www.youtube.com/*','https://www.bilibili.com/*']
# Statically loaded isolated-world entry avoids dynamic import restrictions.
for entry in m['content_scripts']:
 if 'scripts/content.js' in entry.get('js',[]):entry['js']=['scripts/content-main.js','scripts/content.js']
m['content_scripts'] = [e for e in m['content_scripts'] if e.get('world') != 'MAIN']
m['content_scripts'].insert(0, {
 'matches':['https://www.youtube.com/*'],
 'exclude_matches':['https://www.youtube.com/live_chat*'],
 'js':['scripts/injected.js'], 'world':'MAIN', 'all_frames':True, 'run_at':'document_start'
})
m['content_scripts'] = [e for e in m['content_scripts'] if 'scripts/bilibili.js' not in e.get('js', [])]
m['content_scripts'].append({'matches':['https://www.bilibili.com/*'], 'js':['scripts/bilibili.js'], 'css':['styles/bilibili.css'], 'run_at':'document_idle'})
for name in ['scripts/bilibili.js','styles/bilibili.css']:
 shutil.copy2(root/'src'/name,root/'dist'/name)
p.write_text(json.dumps(m,indent=2)+'\n')
p=root/'dist/scripts/injected.js';s=p.read_text()
if not s.startswith('// Safari MAIN bridge'):
 p.write_text('// Safari MAIN bridge\n(() => {\n'+s+"\ndocument.addEventListener('ambientlight-safari-bridge-ping', () => document.dispatchEvent(new Event('ambientlight-safari-bridge-ready')));\n})();\n")
p=root/'dist/scripts/content.js';s=p.read_text()
if "    const script = document.createElement('script');" in s:
 start=s.index('    const script = document.createElement(\'script\');')
 end=s.index('    document.head.appendChild(script);', start)+len('    document.head.appendChild(script);')
 s=s[:start]+"""    // MAIN-world bridge is loaded by Safari, independent of page CSP.
     let attempts = 0;
     const finish = (ok) => {
       clearInterval(timer);
       document.removeEventListener('ambientlight-safari-bridge-ready', ready);
       resolve(ok);
     };
     const ready = () => finish(true);
     document.addEventListener('ambientlight-safari-bridge-ready', ready);
     const timer = setInterval(() => {
       if (++attempts > 50) {
         console.error('Safari MAIN-world bridge did not respond');
         finish(false);
         return;
       }
       document.dispatchEvent(new Event('ambientlight-safari-bridge-ping'));
     }, 100);
 """+s[end:]
s=s.replace('await import(scriptUrl);',"document.dispatchEvent(new Event('ambientlight-safari-ready'));");p.write_text(s)
p=root/'dist/scripts/content-main.js';s=p.read_text();marker="document.addEventListener('ambientlight-safari-ready'"
if not s.startswith(marker):p.write_text(marker+", () => {\n"+s+"\n}, { once: true });\n")
shutil.copy2(root/'LICENSE',root/'dist/LICENSE')
resources=root/'Native/Halo/Halo Extension/Resources'
if resources.exists():shutil.copytree(root/'dist',resources,dirs_exist_ok=True,ignore=shutil.ignore_patterns('*.map'))
