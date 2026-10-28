from datetime import date

import pytest
from connector import PortalChanged
from group_store import GroupStore
from session import ConsultationError, DateConsultation


def person(**overrides):
    data = {
        'applicant_id': 'persona-001',
        'schedule_id': '123456',
        'consulate': 'Monterrey',
        'current_date': '2027-08-20',
        'earliest': '2026-11-01',
        'latest': '2026-12-31',
        'consent': True,
    }
    data.update(overrides)
    return data


class FakePortal:
    def __init__(self, days=(), error=None, fail_open=False):
        self.days = list(days)
        self.error = error
        self.fail_open = fail_open
        self.closed = False
        self.location = None
        self.schedule_id = None
        self.login_opened = False
        self.login_count = 0

    def open(self, schedule_id):
        if self.fail_open:
            raise OSError('missing browser')
        self.schedule_id = schedule_id

    def open_login(self):
        self.login_opened = True
        self.login_count += 1

    def read_visible_days(self, location):
        self.location = location
        if self.error:
            raise self.error
        return list(self.days)

    def close(self):
        self.closed = True


def ready_store(tmp_path, **overrides):
    saved = GroupStore(tmp_path / 'group.json', tmp_path / 'audit.sqlite3')
    saved.set_group_id('camion-001')
    saved.add(person(**overrides))
    return saved


def test_start_requires_consent(tmp_path):
    saved = ready_store(tmp_path, consent=False)
    consultation = DateConsultation(saved, lambda: FakePortal())
    with pytest.raises(ConsultationError, match='autorización'):
        consultation.start('persona-001')


def test_start_waits_and_continue_filters_dates(tmp_path):
    saved = ready_store(tmp_path)
    portal = FakePortal(days=[
        date(2026, 11, 15),
        date(2026, 10, 1),
        date(2027, 1, 2),
        date(2026, 12, 1),
    ])
    consultation = DateConsultation(saved, lambda: portal)
    waiting = consultation.start('persona-001')
    assert waiting['status'] == 'waiting_for_login'
    assert portal.login_opened is True
    assert 'Ya inicié sesión' in waiting['message']
    done = consultation.continue_after_login()
    assert done['status'] == 'done'
    assert done['dates'] == ['2026-11-15', '2026-12-01']
    assert 'no están confirmadas' in done['message'].lower() or 'Ninguna está confirmada' in done['message']
    assert portal.closed is False
    assert portal.location == 'Monterrey'
    assert portal.schedule_id == '123456'
    assert saved.audit.events('persona-001')[-1][0] == 'dates_read'


def test_without_appointment_uses_the_range_only(tmp_path):
    saved = GroupStore(tmp_path / 'group.json', tmp_path / 'audit.sqlite3')
    saved.set_group_id('camion-001')
    payload = person(no_appointment=True, earliest='2026-11-01', latest='2026-12-31')
    del payload['current_date']
    saved.add(payload)
    portal = FakePortal(days=[date(2026, 12, 1), date(2026, 10, 1), date(2027, 1, 2)])
    consultation = DateConsultation(saved, lambda: portal)
    consultation.start('persona-001')
    done = consultation.continue_after_login()
    assert done['dates'] == ['2026-12-01']


def test_no_candidate_dates(tmp_path):
    saved = ready_store(tmp_path)
    consultation = DateConsultation(saved, lambda: FakePortal(days=[date(2026, 1, 1)]))
    consultation.start('persona-001')
    done = consultation.continue_after_login()
    assert done['dates'] == []
    assert 'No hay fechas candidatas' in done['message']


def test_second_consultation_is_blocked(tmp_path):
    saved = ready_store(tmp_path)
    consultation = DateConsultation(saved, lambda: FakePortal())
    consultation.start('persona-001')
    with pytest.raises(ConsultationError, match='consulta abierta'):
        consultation.start('persona-001')


def test_portal_failure_does_not_confirm(tmp_path):
    saved = ready_store(tmp_path)
    portal = FakePortal(days=[date(2026, 11, 15)], error=PortalChanged('calendar missing'))
    consultation = DateConsultation(saved, lambda: portal)
    consultation.start('persona-001')
    done = consultation.continue_after_login()
    assert done['status'] == 'error'
    assert done['dates'] == []
    assert done['message'] == 'No se pudo leer el calendario. No se confirmó ninguna cita. La sesión sigue abierta.'
    assert portal.closed is False
    portal.error = None
    retried = consultation.retry()
    assert retried['status'] == 'done'
    assert retried['dates'] == ['2026-11-15']
    assert portal.login_count == 1
    assert portal.closed is False


def test_browser_open_failure(tmp_path):
    saved = ready_store(tmp_path)
    portal = FakePortal(fail_open=True)
    consultation = DateConsultation(saved, lambda: portal)
    with pytest.raises(ConsultationError, match='No se pudo abrir el navegador'):
        consultation.start('persona-001')
    assert portal.closed is True


def test_cancel_before_login_closes(tmp_path):
    saved = ready_store(tmp_path)
    portal = FakePortal(days=[date(2026, 11, 15)])
    consultation = DateConsultation(saved, lambda: portal)
    consultation.start('persona-001')
    closed = consultation.cancel()
    assert closed['status'] == 'idle'
    assert closed['message'] == 'Consulta cerrada.'
    assert portal.closed is True


def test_next_person_reuses_the_same_login(tmp_path):
    saved = ready_store(tmp_path)
    saved.add(person(applicant_id='persona-002', schedule_id='654321', consulate='Tijuana'))
    portal = FakePortal(days=[date(2026, 11, 15)])
    consultation = DateConsultation(saved, lambda: portal)
    consultation.start('persona-001')
    consultation.continue_after_login()
    nxt = consultation.start('persona-002')
    assert nxt['status'] == 'done'
    assert nxt['applicant_id'] == 'persona-002'
    assert portal.login_count == 1
    assert portal.schedule_id == '654321'
    assert portal.location == 'Tijuana'
    assert portal.closed is False
