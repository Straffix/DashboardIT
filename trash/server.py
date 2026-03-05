import http.server
import socketserver
import json
import os

PORT = 8000
DB_FILE = "laptopy.json"

# Upewnij się, że plik bazy istnieje
if not os.path.exists(DB_FILE):
    with open(DB_FILE, "w") as f: json.dump([], f)

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/dane':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            with open(DB_FILE, "r") as f: self.wfile.write(f.read().encode())
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/zapisz':
            content_length = int(self.headers['Content-Length'])
            data = self.rfile.read(content_length)
            with open(DB_FILE, "w") as f: f.write(data.decode())
            self.send_response(200)
            self.end_headers()

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Aplikacja działa pod adresem: http://localhost:{PORT}")
    httpd.serve_forever()