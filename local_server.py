"""Loopback-only kiosk server with local .env form settings."""

import argparse
import json
import logging
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


ENV_FIELDS = {
    "FOUNDRY_ENDPOINT": "endpoint",
    "FOUNDRY_API_KEY": "key",
    "FOUNDRY_IMAGE_DEPLOYMENT": "imageModel",
    "FOUNDRY_LAB_DEPLOYMENT": "labModel",
    "FOUNDRY_SPEECH_VOICE": "voice",
}


def read_settings(path):
    if not path.exists():
        return {}
    settings = {}
    for number, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        name, separator, value = line.partition("=")
        if not separator:
            raise ValueError(f"Invalid .env assignment on line {number}")
        field = ENV_FIELDS.get(name.strip())
        if field is None:
            continue
        value = value.strip()
        if value.startswith(("'", '"')):
            if len(value) < 2 or value[-1] != value[0]:
                raise ValueError(f"Unclosed .env quote on line {number}")
            value = value[1:-1]
        settings[field] = value
    return settings


class LocalServer(ThreadingHTTPServer):
    request_queue_size = 64


class LocalHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        self.serve_request()

    def do_HEAD(self):
        self.serve_request(head_only=True)

    def serve_request(self, head_only=False):
        port = self.server.server_port
        hosts = {f"localhost:{port}", f"127.0.0.1:{port}"}
        host = self.headers.get("Host", "")
        origin = self.headers.get("Origin")
        if host not in hosts or (origin is not None and origin != f"http://{host}"):
            self.send_error(403, "Local same-origin access only")
            return
        path = unquote(urlsplit(self.path).path).replace("\\", "/")
        if any(part.startswith(".") for part in path.split("/") if part):
            self.send_error(404)
            return
        if path == "/local-config":
            try:
                settings = read_settings(Path(self.directory) / ".env")
            except (OSError, UnicodeError, ValueError) as error:
                logging.error("Cannot read local .env (%s)", type(error).__name__)
                self.send_error(500, "Cannot read local .env; check its format and permissions")
                return
            body = json.dumps(settings).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            if not head_only:
                self.wfile.write(body)
            return
        if head_only:
            super().do_HEAD()
        else:
            super().do_GET()

    def list_directory(self, path):
        self.send_error(404)
        return None


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    handler = partial(LocalHandler, directory=str(root))
    with LocalServer(("127.0.0.1", args.port), handler) as server:
        print(f"Kiosk: http://localhost:{args.port}/", flush=True)
        server.serve_forever()
