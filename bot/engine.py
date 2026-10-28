"""Independent scheduling policy and durable audit. No third-party source copied."""
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Optional
import json
import sqlite3
import threading
from pathlib import Path
from connector import Appointment, eligible

@dataclass(frozen=True)
class Applicant:
    applicant_id: str
    group_id: str
    schedule_id: str
    consulate: str
    current_date: Optional[date]
    earliest: date
    latest: date
    consent: bool = False

    def __post_init__(self):
        if self.earliest > self.latest:
            raise ValueError('Invalid date window')
        if not self.applicant_id or not self.schedule_id.isdigit():
            raise ValueError('Invalid applicant or schedule ID')


def best_candidate(applicant: Applicant, slots: list[Appointment]):
    matches = [s for s in slots if s.consulate == applicant.consulate and eligible(s, applicant.current_date, applicant.earliest, applicant.latest)]
    return min(matches, key=lambda s: (s.consulate_date, s.consulate_time, s.asc_date), default=None)


class AuditStore:
    def __init__(self, filename: str):
        Path(filename).parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self.db = sqlite3.connect(filename, check_same_thread=False)
        self.db.execute('''CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            applicant_id TEXT NOT NULL,
            group_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            event_at TEXT NOT NULL,
            details TEXT NOT NULL
        )''')
        self.db.commit()

    def record(self, applicant: Applicant, event_type: str, details: dict):
        # Never store credentials or cookies in audit details.
        forbidden = {'password', 'cookie', 'token', 'secret'}
        if any(k.lower() in forbidden for k in details):
            raise ValueError('Sensitive data in audit event')
        with self._lock:
            self.db.execute('INSERT INTO events (applicant_id,group_id,event_type,event_at,details) VALUES (?,?,?,?,?)',
                            (applicant.applicant_id, applicant.group_id, event_type, datetime.now(timezone.utc).isoformat(), json.dumps(details)))
            self.db.commit()

    def events(self, applicant_id: str):
        with self._lock:
            return self.db.execute('SELECT event_type,details FROM events WHERE applicant_id=? ORDER BY id', (applicant_id,)).fetchall()


def _optional_date(value):
    if value in (None, ''):
        return None
    return date.fromisoformat(value)


def load_applicants(path: str) -> list[Applicant]:
    rows = json.loads(Path(path).read_text(encoding='utf-8'))
    if len(rows) > 50:
        raise ValueError('Maximum 50 applicants per manifest')
    ids = [row['applicant_id'] for row in rows]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate applicant IDs')
    return [Applicant(
        applicant_id=r['applicant_id'], group_id=r['group_id'], schedule_id=str(r['schedule_id']),
        consulate=r['consulate'], current_date=_optional_date(r.get('current_date')),
        earliest=date.fromisoformat(r['earliest']), latest=date.fromisoformat(r['latest']),
        consent=bool(r.get('consent', False))) for r in rows]
