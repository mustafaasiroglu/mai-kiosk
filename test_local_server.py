import http.client
import json
import tempfile
import threading
import unittest
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

from local_server import LocalHandler, read_settings


class LocalSettingsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.server = ThreadingHTTPServer(
            ("127.0.0.1", 0), partial(LocalHandler, directory=str(self.root))
        )
        self.thread = threading.Thread(target=self.server.serve_forever)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.thread.join()
        self.server.server_close()
        self.temp.cleanup()

    def request(self, path, headers=None, method="GET"):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port)
        try:
            connection.request(method, path, headers=headers or {})
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def test_settings_mapping_quotes_empty_values_and_no_cache(self):
        (self.root / ".env").write_text(
            '# Comment\nFOUNDRY_ENDPOINT="https://test.services.ai.azure.com"\n'
            "FOUNDRY_API_KEY='fake=key#value'\n"
            "FOUNDRY_IMAGE_DEPLOYMENT=test-image\nFOUNDRY_LAB_DEPLOYMENT=\n"
            "FOUNDRY_SPEECH_VOICE=en-US-Harper:MAI-Voice-2-Flash\n"
            "UNRELATED_SECRET=never-return\n",
            encoding="utf-8",
        )
        status, headers, body = self.request("/local-config")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertEqual(json.loads(body), {
            "endpoint": "https://test.services.ai.azure.com",
            "key": "fake=key#value", "imageModel": "test-image", "labModel": "",
            "voice": "en-US-Harper:MAI-Voice-2-Flash",
        })
        status, headers, body = self.request("/local-config", method="HEAD")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertEqual(body, b"")
        (self.root / ".env").write_text("FOUNDRY_API_KEY=updated", encoding="utf-8")
        self.assertEqual(json.loads(self.request("/local-config")[2]), {"key": "updated"})

    def test_missing_env_keeps_saved_settings(self):
        self.assertEqual(json.loads(self.request("/local-config")[2]), {})

    def test_invalid_env_is_explicit_error_without_secret(self):
        (self.root / ".env").write_text('FOUNDRY_API_KEY="fake-secret', encoding="utf-8")
        status, _, body = self.request("/local-config")
        self.assertEqual(status, 500)
        self.assertNotIn(b"fake-secret", body)
        with self.assertRaises(ValueError):
            read_settings(self.root / ".env")

    def test_hidden_files_traversal_and_directory_listing_are_blocked(self):
        (self.root / ".env").write_text("FOUNDRY_API_KEY=fake-secret", encoding="utf-8")
        (self.root / ".git").mkdir()
        (self.root / ".git" / "config").write_text("private", encoding="utf-8")
        for path in ("/.env", "/%2eenv", "/.git/config", "/%2e%2e/.env", "/"):
            with self.subTest(path=path):
                self.assertEqual(self.request(path)[0], 404)
                self.assertEqual(self.request(path, method="HEAD")[0], 404)

    def test_cross_origin_and_rebinding_hosts_are_rejected(self):
        for headers in ({"Origin": "https://example.com"}, {"Host": "example.com"}):
            self.assertEqual(self.request("/local-config", headers)[0], 403)

    def test_kiosk_index_is_served_at_root(self):
        (self.root / "index.html").write_text("<html>Kiosk</html>", encoding="utf-8")
        status, _, body = self.request("/")
        self.assertEqual(status, 200)
        self.assertEqual(body, b"<html>Kiosk</html>")


if __name__ == "__main__":
    unittest.main()
