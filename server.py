"""
Simple HTTP server for Language SRS.
- Serves static files (HTML, CSS, JS)
- GET /api/progress  → returns progress.json from repo
- POST /api/progress → saves posted JSON to progress.json in repo
"""

import http.server
import json
import os
import sys

PORT = 8765
PROGRESS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'progress.json')


class SRSHandler(http.server.SimpleHTTPRequestHandler):
    """Extends SimpleHTTPRequestHandler with a small REST API for progress."""

    def do_GET(self):
        if self.path == '/api/progress':
            self._serve_progress()
        else:
            super().do_GET()

    def end_headers(self):
        # Prevent caching of static files during development
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        if self.path == '/api/progress':
            self._save_progress()
        else:
            self.send_error(404, 'Not Found')

    def do_OPTIONS(self):
        # CORS preflight
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    # ---- API helpers ----

    def _serve_progress(self):
        """Return the contents of progress.json, or empty object if missing."""
        try:
            if os.path.exists(PROGRESS_FILE):
                with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                    data = f.read()
            else:
                data = '{}'
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._cors_headers()
            self.end_headers()
            self.wfile.write(data.encode('utf-8'))
        except Exception as e:
            self._json_error(500, str(e))

    def _save_progress(self):
        """Write the posted JSON body to progress.json."""
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            data = json.loads(body)  # validate it's proper JSON

            with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode('utf-8'))
        except json.JSONDecodeError as e:
            self._json_error(400, f'Invalid JSON: {e}')
        except Exception as e:
            self._json_error(500, str(e))

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _json_error(self, code, message):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self._cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({'error': message}).encode('utf-8'))

    # Suppress noisy access logs
    def log_message(self, format, *args):
        first = str(args[0]) if args else ''
        if '/api/' in first:
            super().log_message(format, *args)


def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with http.server.HTTPServer(('127.0.0.1', PORT), SRSHandler) as server:
        print(f'Language SRS server running on http://localhost:{PORT}')
        print(f'Progress file: {PROGRESS_FILE}')
        print('Press Ctrl+C to stop.')
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('\nServer stopped.')
            sys.exit(0)


if __name__ == '__main__':
    main()
