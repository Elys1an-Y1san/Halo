"""Serve source UI and isolated extension mocks for local, reproducible review."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'src'), **kwargs)
    def do_GET(self):
        route = self.path.split('?')[0]
        fixtures = {'/mock.js': 'mock.js', '/test.js': 'test.js', '/bridge-core.js': 'bridge-core.js', '/bridge-test.js': 'bridge-test.js', '/design-test.js': 'design-test.js', '/bilibili-fixture.js': 'bilibili-fixture.js', '/bilibili-test.js': 'bilibili-test.js', '/wave-fixture.js': 'wave-fixture.js', '/wave-video.js': 'wave-video.js', '/wave-edge-test.js': 'wave-edge-test.js', '/wave-test.js': 'wave-test.js', '/youtube-wave-fixture.js': 'youtube-wave-fixture.js', '/youtube-wave-core.js': 'youtube-wave-core.js', '/youtube-wave-test.js': 'youtube-wave-test.js'}
        fixture = ROOT / 'tests/ui-fixture' / route.lstrip('/')
        if route.endswith('.js') and fixture.parent == ROOT / 'tests/ui-fixture' and fixture.is_file():
            self.send_response(200); self.send_header('Content-Type', 'text/javascript'); self.end_headers(); self.wfile.write(fixture.read_bytes()); return
        if route in fixtures:
            file = ROOT / 'tests/ui-fixture' / fixtures[route]
            self.send_response(200); self.send_header('Content-Type', 'text/javascript'); self.end_headers(); self.wfile.write(file.read_bytes()); return
        if route.startswith('/package/'):
            self.directory = str(ROOT.parent / 'Chrome'); self.path = self.path.removeprefix('/package'); super().do_GET(); return
        if route == '/package-preview.html':
            content = (ROOT.parent / 'Chrome/options.html').read_text().replace('<head>', '<head><base href="/package/">').replace('<script src="scripts/halo-ui.js"', '<script src="/mock.js"></script><script src="scripts/halo-ui.js"')
        elif route == '/youtube-wave.html':
            content = (ROOT / 'tests/ui-fixture/youtube-wave.html').read_text()
        elif route == '/responsive.html':
            content = (ROOT / 'tests/ui-fixture/responsive.html').read_text()
        elif route == '/layout-repro.html':
            content = (ROOT / 'tests/ui-fixture/wave.html').read_text().replace('</body>','<script src="layout-repro.js"></script></body>')
        elif route == '/wave.html':
            content = (ROOT / 'tests/ui-fixture/wave.html').read_text()
        elif route == '/parameter-race.html':
            content = (ROOT / 'tests/ui-fixture/bilibili-panel.html').read_text().replace('<script src="scripts/bilibili.js"></script>', '<script src="parameter-race-storage.js"></script><script src="scripts/bilibili.js"></script>').replace('bilibili-test.js', 'parameter-race-test.js')
        elif route == '/bilibili-panel.html':
            content = (ROOT / 'tests/ui-fixture/bilibili-panel.html').read_text()
        elif route in ('/preview.html', '/test.html', '/update-test.html'):
            content = (ROOT / 'src/options.html').read_text().replace('<script src="scripts/halo-ui.js"', '<script src="mock.js"></script><script src="scripts/halo-update.js"></script><script src="scripts/halo-background.js"></script>\n  <script src="scripts/halo-ui.js"')
            if route == '/update-test.html':
                content = content.replace('</body>','<script src="update-test.js"></script></body>')
            if route == '/test.html':
                content = content.replace('</body>', '<script src="test.js"></script><script src="design-test.js"></script></body>')
        elif route in ('/bridge.html', '/panel.html'):
            content = (ROOT / 'tests/ui-fixture/bridge.html').read_text()
            if route == '/panel.html':
                content = content.replace('<script src="bridge-test.js"></script>', '')
                content = content.replace('<body>', '<body style="margin:0;min-height:100vh;background:#0c0e11;color:#b7bbc3;font:14px/1.5 system-ui"><main style="padding:48px;max-width:900px;margin:auto"><p style="font-size:11px;letter-spacing:2px;color:#f3c780">HALO / LOCAL PREVIEW</p><h1 style="color:#f2f3f4;font-size:36px;font-weight:500">画面之外，也有光。</h1><p>页内控制面板，点击右下角「映光」展开</p></main>')
        else:
            super().do_GET(); return
        self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.end_headers(); self.wfile.write(content.encode())
ThreadingHTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
