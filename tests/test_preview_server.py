"""Exercise actual response generation without opening a listening socket."""
import gzip
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

spec = importlib.util.spec_from_file_location('preview', Path(__file__).parents[1] / 'dev-server.py')
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)


class PreviewTest(unittest.TestCase):
    def response(self, directory, headers):
        handler = preview.Handler.__new__(preview.Handler)
        handler.directory = directory
        handler.path = '/app.js'
        handler.headers = headers
        result = {'headers': {}}
        handler.send_response = lambda code: result.update(status=code)
        handler.send_header = lambda key, value: result['headers'].update({key: value})
        handler.end_headers = lambda: None
        body = handler.send_head()
        result['body'] = body.read() if body else b''
        return result

    def test_compression_revalidation_and_edits(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / 'app.js'
            original = b'const message = "A moment for you";\n' * 100
            path.write_bytes(original)
            compressed = self.response(directory, {'Accept-Encoding': 'gzip, deflate'})
            self.assertEqual(compressed['status'], 200)
            self.assertEqual(gzip.decompress(compressed['body']), original)
            self.assertLess(len(compressed['body']), len(original) / 4)
            tag = compressed['headers']['ETag']
            cached = self.response(directory, {'Accept-Encoding': 'gzip', 'If-None-Match': tag})
            self.assertEqual(cached['status'], 304)
            self.assertEqual(cached['body'], b'')
            path.write_bytes(original + b'// updated')
            changed = self.response(directory, {'Accept-Encoding': 'gzip', 'If-None-Match': tag})
            self.assertEqual(changed['status'], 200)
            self.assertNotEqual(changed['headers']['ETag'], tag)
            for encoding in ('identity', 'gzip;q=0, deflate'):
                plain = self.response(directory, {'Accept-Encoding': encoding})
                self.assertNotIn('Content-Encoding', plain['headers'])
                self.assertEqual(plain['body'], path.read_bytes())


if __name__ == '__main__':
    unittest.main()
