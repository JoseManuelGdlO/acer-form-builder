"""One visible-date consultation at a time. Does not submit appointments."""
from datetime import date
import queue
import sys
import threading

from connector import PortalChanged
from engine import Applicant
from portal import QUERY_CAP, PortalReadError

_READ_FAILURE = 'No se pudo leer el calendario. No se confirmó ninguna cita. La sesión sigue abierta.'
_KEEP_OPEN = ' La sesión sigue abierta.'


class ConsultationError(RuntimeError):
    pass


class DateConsultation:
    def __init__(self, store, gateway_factory):
        self.store = store
        self._gateway_factory = gateway_factory
        self._lock = threading.Lock()
        self._opened = threading.Event()
        self._result = threading.Event()
        self._commands = queue.Queue()
        self._gateway = None
        self.status = 'idle'
        self.applicant_id = None
        self.dates = []
        self.message = ''

    def snapshot(self):
        with self._lock:
            return {
                'status': self.status,
                'applicant_id': self.applicant_id,
                'dates': list(self.dates),
                'message': self.message,
                'browser_open': self._gateway is not None,
            }

    def start(self, applicant_id):
        with self._lock:
            if self.status in ('opening', 'waiting_for_login', 'reading'):
                raise ConsultationError('Ya hay una consulta abierta. Termínala o ciérrala antes de abrir otra.')
            row = self._find(applicant_id)
            if row is None:
                raise ConsultationError('No está en el grupo.')
            if not row['consent']:
                raise ConsultationError('Falta la autorización de esta persona.')
            row = dict(row)
            if self._gateway is not None:
                self.applicant_id = applicant_id
                self.dates = []
                self.status = 'reading'
                self.message = 'Leyendo el calendario…'
                self._result.clear()
                self._commands.put(('read', row))
                reuse = True
            else:
                self.status = 'opening'
                self.applicant_id = applicant_id
                self.dates = []
                self.message = 'Abriendo el navegador…'
                self._opened.clear()
                gateway = self._gateway_factory()
                thread = threading.Thread(target=self._worker, args=(row, gateway), daemon=True)
                thread.start()
                reuse = False
        if reuse:
            return self._wait_result()
        if not self._opened.wait(180):  # shortcut: ~70 keystrokes at the login pace, raise this if the account is longer
            raise ConsultationError('No se pudo abrir el navegador.')
        current = self.snapshot()
        if current['status'] == 'error':
            raise ConsultationError(current['message'])
        return current

    def continue_after_login(self):
        with self._lock:
            if self.status == 'reading':
                already = True
            elif self.status != 'waiting_for_login':
                raise ConsultationError('No hay un inicio de sesión esperando.')
            else:
                already = False
                row = dict(self._find(self.applicant_id))
                self.status = 'reading'
                self.message = 'Leyendo el calendario…'
                self._result.clear()
        if already:
            return self._wait_result()
        self._commands.put(('read', row))
        return self._wait_result()

    def retry(self):
        with self._lock:
            if self._gateway is None or self.status not in ('error', 'done'):
                raise ConsultationError('No hay una sesión abierta para reintentar.')
            row = self._find(self.applicant_id)
            if row is None:
                raise ConsultationError('No está en el grupo.')
            self.status = 'reading'
            self.dates = []
            self.message = 'Leyendo el calendario…'
            self._result.clear()
            self._commands.put(('read', dict(row)))
        return self._wait_result()

    def cancel(self):
        with self._lock:
            if self._gateway is None:
                closed = True
            else:
                closed = False
                self._result.clear()
        if closed:
            return self.snapshot()
        self._commands.put(('close', None))
        self._result.wait(10)
        return self.snapshot()

    def _wait_result(self):
        if not self._result.wait(60):
            raise ConsultationError('La consulta tardó demasiado. No se confirmó ninguna cita.')
        return self.snapshot()

    def _find(self, applicant_id):
        for row in self.store.load()['applicants']:
            if row['applicant_id'] == applicant_id:
                return row
        return None

    def _set(self, **fields):
        with self._lock:
            for key, value in fields.items():
                setattr(self, key, value)

    def _worker(self, row, gateway):
        try:
            gateway.open(row['schedule_id'])
            gateway.open_login()
        except Exception:
            self._set(status='error', message='No se pudo abrir el navegador.', dates=[])
            self._close(gateway)
            self._opened.set()
            return
        self._gateway = gateway
        self._set(
            status='waiting_for_login',
            message='Se abrió el navegador. Inicia sesión y resuelve las verificaciones. Al entrar, la consulta sigue sola. También puedes pulsar Ya inicié sesión.',
        )
        self._opened.set()
        signed_in_checks = 0
        while True:
            try:
                command, payload = self._commands.get(timeout=0.4)
            except queue.Empty:
                if self.snapshot()['status'] != 'waiting_for_login':
                    signed_in_checks = 0
                    continue
                if not self._session_started(gateway):
                    signed_in_checks = 0
                    continue
                signed_in_checks += 1
                if signed_in_checks < 2:
                    continue
                current = self._find(self.applicant_id)
                if current is None or not self._claim_read():
                    continue
                self._read(dict(current), gateway)
                self._result.set()
                continue
            if command == 'close':
                self._close(gateway)
                self._gateway = None
                self._set(status='idle', applicant_id=None, dates=[], message='Consulta cerrada.')
                self._result.set()
                return
            self._read(payload, gateway)
            self._result.set()

    def _claim_read(self):
        with self._lock:
            if self.status != 'waiting_for_login':
                return False
            self.status = 'reading'
            self.message = 'Leyendo el calendario…'
            self._result.clear()
            return True

    def _session_started(self, gateway):
        detect = getattr(gateway, 'session_started', None)
        if detect is None:
            return False
        try:
            return bool(detect())
        except Exception:
            return False

    def _read(self, row, gateway):
        try:
            gateway.open(row['schedule_id'])
            earliest = date.fromisoformat(row['earliest'])
            latest = date.fromisoformat(row['latest'])
            current = date.fromisoformat(row['current_date']) if row.get('current_date') else None
            visible = gateway.read_visible_days(row['consulate'], earliest=earliest, latest=latest, current=current)
            chosen = sorted(
                day for day in visible
                if earliest <= day <= latest and (current is None or day < current)
            )
            dates = [day.isoformat() for day in chosen]
            message = (
                'Fechas candidatas. Ninguna está confirmada.' + _KEEP_OPEN
                if dates else
                'No hay fechas candidatas en ese rango. No se confirmó ninguna cita.' + _KEEP_OPEN
            )
            self._set(status='done', applicant_id=row['applicant_id'], dates=dates, message=message)
            self._record(row, 'dates_read', {'dates': dates, 'consulate': row['consulate']})
        except PortalReadError as exc:
            if str(exc) == QUERY_CAP:
                self._set(status='error', applicant_id=row['applicant_id'], dates=[], message=QUERY_CAP)
                self._record(row, 'dates_read_failed', {'reason': 'cap'})
                return
            self._fail_read(row)
        except PortalChanged:
            self._fail_read(row)
        except Exception as exc:
            print(f'Consulta fallida: {type(exc).__name__}', file=sys.stderr)
            self._fail_read(row)

    def _fail_read(self, row):
        self._set(status='error', applicant_id=row['applicant_id'], dates=[], message=_READ_FAILURE)
        self._record(row, 'dates_read_failed', {'reason': 'portal'})

    def _record(self, row, event_type, details):
        applicant = Applicant(
            row['applicant_id'], row['group_id'], row['schedule_id'], row['consulate'],
            date.fromisoformat(row['current_date']) if row.get('current_date') else None,
            date.fromisoformat(row['earliest']), date.fromisoformat(row['latest']), bool(row['consent']),
        )
        self.store.audit.record(applicant, event_type, details)

    def _close(self, gateway):
        try:
            gateway.close()
        except Exception:
            print('No se pudo cerrar el navegador.', file=sys.stderr)
