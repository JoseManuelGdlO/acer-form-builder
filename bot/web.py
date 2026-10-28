"""Local operator page. Binds to this computer only."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from urllib.parse import unquote, urlparse

from group_store import CONSULATE_LABELS, GroupError, GroupStore
from portal import PlaywrightPortal
from session import ConsultationError, DateConsultation


def make_server(host, port, store, consultation, static_dir):
    if host != '127.0.0.1':
        raise RuntimeError('La página solo puede abrirse en esta computadora.')
    page = Path(static_dir) / 'index.html'

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):
            return

        def do_GET(self):
            path = _path(self.path)
            if path == '/':
                if not page.exists():
                    self._json(404, {'error': 'No se encontró esa página.'})
                    return
                body = page.read_bytes()
                self._bytes(200, body, 'text/html; charset=utf-8')
                return
            if path == '/api/group':
                self._safe(lambda: self._json(200, _payload(store, consultation)))
                return
            if path == '/api/sessions':
                self._json(200, consultation.snapshot())
                return
            self._json(404, {'error': 'No se encontró esa página.'})

        def do_PUT(self):
            path = _path(self.path)
            if path == '/api/group':
                self._safe(lambda: self._json(200, store.set_group_id(self._body().get('group_id', ''))))
                return
            applicant_id = _applicant_id(path)
            if applicant_id is not None:
                self._safe(lambda: self._json(200, store.update(applicant_id, self._body())))
                return
            self._json(404, {'error': 'No se encontró esa página.'})

        def do_POST(self):
            path = _path(self.path)
            if path == '/api/applicants':
                self._safe(lambda: self._json(200, store.add(self._body())))
                return
            if path == '/api/sessions':
                self._safe(lambda: self._json(200, consultation.start(str(self._body().get('applicant_id', '')))))
                return
            if path == '/api/sessions/continue':
                self._safe(lambda: self._json(200, consultation.continue_after_login()))
                return
            if path == '/api/sessions/retry':
                self._safe(lambda: self._json(200, consultation.retry()))
                return
            self._json(404, {'error': 'No se encontró esa página.'})

        def do_DELETE(self):
            path = _path(self.path)
            if path == '/api/sessions':
                self._safe(lambda: self._json(200, consultation.cancel()))
                return
            applicant_id = _applicant_id(path)
            if applicant_id is not None:
                self._safe(lambda: self._json(200, store.remove(applicant_id)))
                return
            self._json(404, {'error': 'No se encontró esa página.'})

        def _safe(self, action):
            try:
                action()
            except GroupError as exc:
                code = 404 if str(exc).startswith('No está') else 400
                self._json(code, {'error': str(exc)})
            except ConsultationError as exc:
                self._json(409, {'error': str(exc)})
            except json.JSONDecodeError:
                self._json(400, {'error': 'No se pudo leer el formulario.'})

        def _body(self):
            length = int(self.headers.get('Content-Length', '0') or 0)
            raw = self.rfile.read(length) if length else b'{}'
            if not raw:
                return {}
            return json.loads(raw.decode())

        def _json(self, status, payload):
            self._bytes(status, json.dumps(payload, ensure_ascii=False).encode(), 'application/json; charset=utf-8')

        def _bytes(self, status, body, content_type):
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)

    return ThreadingHTTPServer((host, port), Handler)


def _path(raw):
    path = urlparse(raw).path
    if len(path) > 1 and path.endswith('/'):
        return path[:-1]
    return path


def _applicant_id(path):
    prefix = '/api/applicants/'
    if not path.startswith(prefix) or path == prefix:
        return None
    return unquote(path[len(prefix):])


def _payload(store, consultation):
    state = store.load()
    state['consulates'] = [{'id': key, 'label': label} for key, label in CONSULATE_LABELS.items()]
    state['session'] = consultation.snapshot()
    return state


def main():
    root = Path(__file__).resolve().parent
    store = GroupStore(root / 'data' / 'group.json', root / 'data' / 'audit.sqlite3')
    consultation = DateConsultation(store, PlaywrightPortal)
    server = make_server('127.0.0.1', 8765, store, consultation, root / 'static')
    print('Abre esta dirección en el navegador: http://127.0.0.1:8765', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nPágina cerrada.')


if __name__ == '__main__':
    main()
