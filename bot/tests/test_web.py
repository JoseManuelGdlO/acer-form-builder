import json
import threading
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from group_store import GroupStore
from session import DateConsultation
from web import make_server

STATIC_DIR = Path(__file__).resolve().parents[1] / 'static'


class FakePortal:
    def __init__(self):
        self.closed = False
        self.login_opened = False

    def open(self, schedule_id):
        self.schedule_id = schedule_id

    def open_login(self):
        self.login_opened = True

    def read_visible_days(self, location):
        from datetime import date
        self.location = location
        return [date(2026, 11, 15)]

    def close(self):
        self.closed = True


def start_server(tmp_path):
    saved = GroupStore(tmp_path / 'group.json', tmp_path / 'audit.sqlite3')
    portal = FakePortal()
    consultation = DateConsultation(saved, lambda: portal)
    httpd = make_server('127.0.0.1', 0, saved, consultation, STATIC_DIR)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd, saved, portal


def request(httpd, method, path, body=None):
    url = f'http://127.0.0.1:{httpd.server_address[1]}{path}'
    data = None if body is None else json.dumps(body).encode()
    headers = {'Content-Type': 'application/json'} if body is not None else {}
    req = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(req) as response:
            raw = response.read()
            content_type = response.headers.get('Content-Type', '')
            if 'json' in content_type:
                return response.status, json.loads(raw.decode())
            return response.status, raw.decode()
    except HTTPError as exc:
        payload = json.loads(exc.read().decode())
        return exc.code, payload


def test_refuses_non_local_host(tmp_path):
    saved = GroupStore(tmp_path / 'group.json', tmp_path / 'audit.sqlite3')
    consultation = DateConsultation(saved, lambda: FakePortal())
    try:
        make_server('0.0.0.0', 0, saved, consultation, tmp_path)
    except RuntimeError as exc:
        assert 'esta computadora' in str(exc)
    else:
        raise AssertionError('expected local-only server')


def test_page_and_group_roundtrip(tmp_path):
    httpd, saved, portal = start_server(tmp_path)
    try:
        status, html = request(httpd, 'GET', '/')
        assert status == 200
        assert 'Monitor de citas' in html
        assert 'Agregar al grupo' in html
        assert 'Esta persona autorizó consultar su cita' in html
        assert 'Aún no tiene cita' in html
        assert 'Ya inicié sesión' in html
        code, created = request(httpd, 'PUT', '/api/group', {'group_id': 'camion-001'})
        assert code == 200
        assert created['group_id'] == 'camion-001'
        code, added = request(httpd, 'POST', '/api/applicants', {
            'applicant_id': 'persona-001',
            'schedule_id': '123456',
            'consulate': 'Monterrey',
            'current_date': '2027-08-20',
            'earliest': '2026-11-01',
            'latest': '2026-12-31',
            'consent': True,
        })
        assert code == 200
        assert added['applicants'][0]['status'] == 'ready_for_manual_login'
        code, group = request(httpd, 'GET', '/api/group')
        assert code == 200
        labels = {item['id']: item['label'] for item in group['consulates']}
        assert labels['Mexico City'] == 'Ciudad de México'
        code, rejected = request(httpd, 'POST', '/api/applicants', {
            'applicant_id': '',
            'schedule_id': '1',
            'consulate': 'Monterrey',
            'current_date': '2027-08-20',
            'earliest': '2026-11-01',
            'latest': '2026-12-31',
            'consent': False,
        })
        assert code == 400
        assert 'identificador' in rejected['error']
        code, waiting = request(httpd, 'POST', '/api/sessions', {'applicant_id': 'persona-001'})
        assert code == 200
        assert waiting['status'] == 'waiting_for_login'
        code, done = request(httpd, 'POST', '/api/sessions/continue')
        assert code == 200
        assert done['dates'] == ['2026-11-15']
        assert portal.closed is False
        code, removed = request(httpd, 'DELETE', '/api/applicants/persona-001')
        assert code == 200
        assert removed['applicants'] == []
        assert saved.load()['applicants'] == []
    finally:
        httpd.shutdown()
