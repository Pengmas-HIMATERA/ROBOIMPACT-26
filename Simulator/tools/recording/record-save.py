"""Local-only receiver for the preview canvas recording."""
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

output = Path(__file__).resolve().parents[2] / 'output' / 'pid-follow-preview.webm'
frames = output.parent / 'preview-frames'

class Receiver(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('Content-Length', '0'))
        if not 0 < length < 200_000_000:
            self.send_error(400)
            return
        output.parent.mkdir(exist_ok=True)
        payload = self.rfile.read(length)
        if self.path.startswith('/frame/') and self.path.removeprefix('/frame/').isdigit():
            frames.mkdir(exist_ok=True)
            index = int(self.path.removeprefix('/frame/'))
            (frames / f'{index:05d}.png').write_bytes(payload)
        elif self.path == '/finish':
            (output.parent / 'preview-recording.json').write_bytes(payload)
        elif self.path == '/video':
            output.write_bytes(payload)
        else:
            self.send_error(400)
            return
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', 'http://127.0.0.1:8765')
        self.end_headers()
        self.wfile.write(b'Saved')

HTTPServer(('127.0.0.1', 8766), Receiver).serve_forever()
