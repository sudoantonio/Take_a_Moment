"""Local static preview with compressed, revalidated public assets."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import lru_cache
from io import BytesIO
import gzip
import os


@lru_cache(maxsize=64)
def compressed_asset(path, modified_ns, size):
    # Metadata changes invalidate this small in-memory cache during development.
    return gzip.compress(Path(path).read_bytes(), compresslevel=6, mtime=0)


class Handler(SimpleHTTPRequestHandler):
    COMPRESSIBLE = {'.html', '.css', '.js', '.json', '.svg', '.txt', '.webmanifest'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).parent / 'dist'), **kwargs)

    def send_head(self):
        path = Path(self.translate_path(self.path))
        if path.is_dir() and self.path.split('?', 1)[0].endswith('/'):
            path = path / 'index.html'
        if not path.is_file() or path.suffix not in self.COMPRESSIBLE or self.headers.get('Range'):
            return super().send_head()
        try:
            stat = path.stat()
            encodings = [item.strip().lower() for item in self.headers.get('Accept-Encoding', '').split(',')]
            use_gzip = any(item.split(';')[0].strip() == 'gzip' and not any(
                part.strip() in ('q=0', 'q=0.0', 'q=0.00', 'q=0.000') for part in item.split(';')[1:]
            ) for item in encodings)
            tag = f'"{stat.st_mtime_ns:x}-{stat.st_size:x}-{"gz" if use_gzip else "raw"}"'
            unchanged = self.headers.get('If-None-Match') == tag
            body = b'' if unchanged else compressed_asset(str(path), stat.st_mtime_ns, stat.st_size) if use_gzip else path.read_bytes()
            self.send_response(304 if unchanged else 200)
            self.send_header('ETag', tag)
            self.send_header('Vary', 'Accept-Encoding')
            if unchanged:
                self.end_headers()
                return None
            self.send_header('Content-Type', self.guess_type(str(path)))
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Last-Modified', self.date_time_string(stat.st_mtime))
            if use_gzip:
                self.send_header('Content-Encoding', 'gzip')
            self.end_headers()
            return BytesIO(body)
        except OSError:
            self.send_error(404, 'File not found')
            return None

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        # Reuse public response bodies, but revalidate so edits never stay stale.
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, format, *args):
        pass  # No contact payloads, query strings or personal data in logs.


if __name__ == '__main__':
    port = int(os.environ.get('BFP_PORT', '8780'))
    print(f'Local: http://127.0.0.1:{port}/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
