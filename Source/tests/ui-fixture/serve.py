"""Serve source UI and isolated extension mocks for local, reproducible review."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[2]
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'src'), **kwargs)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def do_GET(self):
        route = self.path.split('?')[0]
        fixtures = {'/mock.js': 'mock.js', '/test.js': 'test.js', '/design-test.js': 'design-test.js', '/bilibili-fixture.js': 'bilibili-fixture.js', '/bilibili-test.js': 'bilibili-test.js', '/wave-fixture.js': 'wave-fixture.js', '/wave-video.js': 'wave-video.js', '/wave-edge-test.js': 'wave-edge-test.js', '/wave-test.js': 'wave-test.js', '/youtube-wave-fixture.js': 'youtube-wave-fixture.js', '/youtube-wave-test.js': 'youtube-wave-test.js'}
        fixture = ROOT / 'tests/ui-fixture' / route.lstrip('/')
        if route.endswith('.js') and fixture.parent == ROOT / 'tests/ui-fixture' and fixture.is_file():
            self.send_response(200); self.send_header('Content-Type', 'text/javascript'); self.end_headers(); self.wfile.write(fixture.read_bytes()); return
        if route in fixtures:
            file = ROOT / 'tests/ui-fixture' / fixtures[route]
            self.send_response(200); self.send_header('Content-Type', 'text/javascript'); self.end_headers(); self.wfile.write(file.read_bytes()); return
        if route.startswith('/package/'):
            self.directory = str(ROOT.parent / 'Builds/chromium/current/Chrome'); self.path = self.path.removeprefix('/package'); super().do_GET(); return
        if route in ('/youtube-engine.html','/panel.html'):
            content = (ROOT / 'tests/ui-fixture/youtube-engine.html').read_text()
            if route == '/panel.html': content = content.replace('<script src="youtube-engine-test.js"></script>', '')
        elif route == '/x-test.html':
            content = (ROOT / 'tests/ui-fixture/x-test.html').read_text()
        elif route == '/package-preview.html':
            content = (ROOT.parent / 'Builds/chromium/current/Chrome/options.html').read_text().replace('<head>', '<head><base href="/package/">').replace('<script src="scripts/halo-ui.js"', '<script src="/mock.js"></script><script src="scripts/halo-ui.js"')
        elif route == '/youtube-wave.html':
            content = (ROOT / 'tests/ui-fixture/youtube-wave.html').read_text()
        elif route == '/responsive.html':
            content = (ROOT / 'tests/ui-fixture/responsive.html').read_text()
        elif route == '/layout-repro.html':
            content = (ROOT / 'tests/ui-fixture/wave.html').read_text().replace('</body>','<script src="layout-repro.js"></script></body>')
        elif route == '/wave.html':
            content = (ROOT / 'tests/ui-fixture/wave.html').read_text()
        elif route == '/features.html':
            content = (ROOT / 'tests/ui-fixture/features.html').read_text()
        elif route == '/suite.html':
            content = (ROOT / 'tests/ui-fixture/suite.html').read_text()
        elif route == '/duplicate-init.html':
            content = (ROOT / 'tests/ui-fixture/bilibili-panel.html').read_text().replace('<script src="scripts/halo-video.js"></script><script src="scripts/halo-engine.js"></script>', '<script src="duplicate-storage.js"></script><script src="scripts/halo-video.js"></script><script src="scripts/halo-engine.js"></script><script src="scripts/halo-video.js"></script><script src="scripts/halo-engine.js"></script>').replace('bilibili-test.js', 'duplicate-test.js')
        elif route == '/parameter-race.html':
            content = (ROOT / 'tests/ui-fixture/bilibili-panel.html').read_text().replace('<script src="scripts/halo-video.js"></script><script src="scripts/halo-engine.js"></script>', '<script src="parameter-race-storage.js"></script><script src="scripts/halo-video.js"></script><script src="scripts/halo-engine.js"></script>').replace('bilibili-test.js', 'parameter-race-test.js')
        elif route == '/bilibili-mini.html':
            content = (ROOT / 'tests/ui-fixture/bilibili-panel.html').read_text().replace('<video ', '<div class="bpx-player-container" data-screen="normal"><video ').replace('</video>', '</video></div>').replace('bilibili-test.js', 'bilibili-mini-test.js')
        elif route == '/bilibili-panel.html':
            content = (ROOT / 'tests/ui-fixture/bilibili-panel.html').read_text()
        elif route in ('/preview.html', '/test.html', '/update-test.html', '/update-live.html', '/x-popup.html'):
            content = (ROOT / 'src/options.html').read_text().replace('<script src="scripts/halo-ui.js"', '<script src="mock.js"></script><script src="scripts/halo-update.js"></script><script src="scripts/halo-background.js"></script>\n  <script src="scripts/halo-ui.js"')
            if route == '/x-popup.html':
                content = content.replace('<script src="scripts/halo-controls.js"', '<script src="x-popup-mock.js"></script><script src="scripts/halo-controls.js"').replace('</body>', '<script src="x-popup-test.js"></script></body>')
            if route == '/update-live.html':
                content = content.replace('<script src="scripts/halo-controls.js"', '<script src="update-live.js"></script><script src="scripts/halo-controls.js"')
            if route == '/update-test.html':
                content = content.replace('</body>','<script src="update-test.js"></script></body>')
            if route == '/test.html':
                content = content.replace('</body>', '<script src="test.js"></script><script src="design-test.js"></script></body>')
        else:
            super().do_GET(); return
        content = re.sub(r'src="(scripts/[^"]+)"', lambda m: f'src="{m[1]}?v={(ROOT / "src" / m[1]).stat().st_mtime_ns}"', content)
        self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.end_headers(); self.wfile.write(content.encode())
class FixtureServer(ThreadingHTTPServer):
    # Browser preload scanners open many connections at once. The default
    # backlog of five can drop scripts during rapid isolated-context tests.
    request_queue_size = 64

FixtureServer(('127.0.0.1', 8765), Handler).serve_forever()
