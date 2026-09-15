"""Local-only receiver for the preview canvas recording."""
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

output = Path(__file__).parent / 'output' / 'pid-follow-preview.webm'

class Receiver(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('Content-Length', '0'))
        if self.path != '/video' or not 0 < length < 200_000_000:
            self.send_error(400)
            return
        output.parent.mkdir(exist_ok=True)
        output.write_bytes(self.rfile.read(length))
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', 'http://127.0.0.1:8765')
        self.end_headers()
        self.wfile.write(b'Saved')

HTTPServer(('127.0.0.1', 8766), Receiver).serve_forever()
