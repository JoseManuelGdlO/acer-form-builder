"""Local group file for the operator page. No portal traffic."""
from datetime import date
import json
from pathlib import Path

from connector import FACILITIES
from engine import Applicant, AuditStore

CONSULATE_LABELS = {
    'Ciudad Juarez': 'Ciudad Juárez',
    'Guadalajara': 'Guadalajara',
    'Hermosillo': 'Hermosillo',
    'Matamoros': 'Matamoros',
    'Merida': 'Mérida',
    'Mexico City': 'Ciudad de México',
    'Monterrey': 'Monterrey',
    'Nogales': 'Nogales',
    'Nuevo Laredo': 'Nuevo Laredo',
    'Tijuana': 'Tijuana',
}

_FIELDS = (
    'applicant_id', 'group_id', 'schedule_id', 'consulate',
    'current_date', 'earliest', 'latest', 'consent',
)


class GroupError(ValueError):
    pass


class GroupStore:
    def __init__(self, path, audit_path):
        self.path = Path(path)
        self.audit = AuditStore(str(audit_path))

    def load(self):
        group_id, rows = self._read()
        return {'group_id': group_id, 'applicants': [self._public(row, group_id) for row in rows]}

    def manifest_rows(self):
        _, rows = self._read()
        return [{key: row[key] for key in _FIELDS} for row in rows]

    def set_group_id(self, group_id):
        cleaned = str(group_id).strip()
        if not cleaned:
            raise GroupError('Escribe el nombre del grupo.')
        _, rows = self._read()
        for row in rows:
            row['group_id'] = cleaned
        self._write(cleaned, rows)
        return self.load()

    def add(self, fields):
        group_id, rows = self._read()
        if not group_id:
            raise GroupError('Escribe el nombre del grupo.')
        if len(rows) >= 50:
            raise GroupError('El grupo admite como máximo 50 personas.')
        parsed = self._parse(fields, group_id)
        if any(row['applicant_id'] == parsed['applicant_id'] for row in rows):
            raise GroupError('Ese identificador ya está en el grupo.')
        rows.append(parsed)
        self._write(group_id, rows)
        self._audit(parsed)
        return self.load()

    def update(self, applicant_id, fields):
        group_id, rows = self._read()
        if not group_id:
            raise GroupError('Escribe el nombre del grupo.')
        index = next((i for i, row in enumerate(rows) if row['applicant_id'] == applicant_id), None)
        if index is None:
            raise GroupError('No está en el grupo.')
        parsed = self._parse(fields, group_id)
        if parsed['applicant_id'] != applicant_id and any(row['applicant_id'] == parsed['applicant_id'] for row in rows):
            raise GroupError('Ese identificador ya está en el grupo.')
        rows[index] = parsed
        self._write(group_id, rows)
        self._audit(parsed)
        return self.load()

    def remove(self, applicant_id):
        group_id, rows = self._read()
        kept = [row for row in rows if row['applicant_id'] != applicant_id]
        if len(kept) == len(rows):
            raise GroupError('No está en el grupo.')
        self._write(group_id, kept)
        return self.load()

    def _parse(self, fields, group_id):
        applicant_id = str(fields.get('applicant_id', '')).strip()
        if not applicant_id:
            raise GroupError('Escribe un identificador.')
        schedule_id = str(fields.get('schedule_id', '')).strip()
        if not schedule_id.isdigit():
            raise GroupError('El número de cita solo puede tener dígitos.')
        consulate = str(fields.get('consulate', '')).strip()
        if consulate not in FACILITIES:
            raise GroupError('Elige un consulado de la lista.')
        no_appointment = fields.get('no_appointment') is True
        if no_appointment:
            current = None
        else:
            try:
                current = date.fromisoformat(str(fields['current_date']))
            except (KeyError, TypeError, ValueError):
                raise GroupError('Escribe la fecha de la cita actual.') from None
        try:
            earliest = date.fromisoformat(str(fields['earliest']))
            latest = date.fromisoformat(str(fields['latest']))
        except (KeyError, TypeError, ValueError):
            raise GroupError('Usa una fecha válida.') from None
        if earliest > latest:
            raise GroupError('Revisa las fechas. La más temprana no puede ser posterior a la más tardía.')
        consent = fields.get('consent') is True
        try:
            Applicant(applicant_id, group_id, schedule_id, consulate, current, earliest, latest, consent)
        except ValueError as exc:
            raise GroupError('Revisa los datos de la persona.') from exc
        return {
            'applicant_id': applicant_id,
            'group_id': group_id,
            'schedule_id': schedule_id,
            'consulate': consulate,
            'current_date': None if current is None else current.isoformat(),
            'earliest': earliest.isoformat(),
            'latest': latest.isoformat(),
            'consent': consent,
        }

    def _audit(self, row):
        applicant = Applicant(
            row['applicant_id'], row['group_id'], row['schedule_id'], row['consulate'],
            date.fromisoformat(row['current_date']) if row.get('current_date') else None,
            date.fromisoformat(row['earliest']),
            date.fromisoformat(row['latest']), row['consent'],
        )
        status = 'ready_for_manual_login' if row['consent'] else 'consent_required'
        self.audit.record(applicant, status, {'consulate': row['consulate'], 'current_date': row['current_date']})

    def _public(self, row, group_id):
        stored = {key: row[key] for key in _FIELDS if key in row}
        stored['group_id'] = row.get('group_id') or group_id
        stored['current_date'] = stored.get('current_date') or None
        stored['no_appointment'] = stored['current_date'] is None
        stored['consent'] = bool(stored.get('consent', False))
        stored['status'] = 'ready_for_manual_login' if stored['consent'] else 'consent_required'
        stored['consulate_label'] = CONSULATE_LABELS.get(stored.get('consulate'), stored.get('consulate', ''))
        return stored

    def _read(self):
        if not self.path.exists():
            return '', []
        try:
            data = json.loads(self.path.read_text(encoding='utf-8'))
        except json.JSONDecodeError as exc:
            raise GroupError('No se pudo leer el grupo guardado.') from exc
        if isinstance(data, list):
            group_id = str(data[0].get('group_id', '')).strip() if data else ''
            return group_id, data
        if isinstance(data, dict):
            return str(data.get('group_id', '')).strip(), list(data.get('applicants') or [])
        raise GroupError('No se pudo leer el grupo guardado.')

    def _write(self, group_id, rows):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {'group_id': group_id, 'applicants': rows}
        temporary = self.path.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
        temporary.replace(self.path)
