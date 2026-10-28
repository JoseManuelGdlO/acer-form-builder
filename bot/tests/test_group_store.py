import json
from pathlib import Path

import pytest
from connector import FACILITIES
from engine import load_applicants
from group_store import CONSULATE_LABELS, GroupError, GroupStore


def store(tmp_path: Path) -> GroupStore:
    return GroupStore(tmp_path / 'group.json', tmp_path / 'audit.sqlite3')


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


def test_labels_match_facilities():
    assert set(CONSULATE_LABELS) == set(FACILITIES)
    assert CONSULATE_LABELS['Mexico City'] == 'Ciudad de México'
    assert CONSULATE_LABELS['Ciudad Juarez'] == 'Ciudad Juárez'
    assert CONSULATE_LABELS['Merida'] == 'Mérida'


def test_starts_empty(tmp_path):
    state = store(tmp_path).load()
    assert state['group_id'] == ''
    assert state['applicants'] == []


def test_set_group_name_persists(tmp_path):
    store(tmp_path).set_group_id('camion-001')
    reloaded = GroupStore(tmp_path / 'group.json', tmp_path / 'audit.sqlite3').load()
    assert reloaded['group_id'] == 'camion-001'


def test_rejects_blank_group_name(tmp_path):
    with pytest.raises(GroupError, match='nombre del grupo'):
        store(tmp_path).set_group_id('   ')


def test_add_requires_group_name(tmp_path):
    with pytest.raises(GroupError, match='nombre del grupo'):
        store(tmp_path).add(person())


def test_add_person_with_consent(tmp_path):
    saved = store(tmp_path)
    saved.set_group_id('camion-001')
    state = saved.add(person())
    row = state['applicants'][0]
    assert row['group_id'] == 'camion-001'
    assert row['consent'] is True
    assert row['status'] == 'ready_for_manual_login'
    assert row['consulate_label'] == 'Monterrey'
    assert saved.audit.events('persona-001')[0][0] == 'ready_for_manual_login'


def test_add_without_consent(tmp_path):
    saved = store(tmp_path)
    saved.set_group_id('camion-001')
    state = saved.add(person(consent=False))
    assert state['applicants'][0]['status'] == 'consent_required'


def test_duplicate_id(tmp_path):
    saved = store(tmp_path)
    saved.set_group_id('g')
    saved.add(person())
    with pytest.raises(GroupError, match='ya está en el grupo'):
        saved.add(person())


def test_invalid_schedule(tmp_path):
    saved = store(tmp_path)
    saved.set_group_id('g')
    with pytest.raises(GroupError, match='dígitos'):
        saved.add(person(schedule_id='12-34'))


def test_inverted_dates(tmp_path):
    saved = store(tmp_path)
    saved.set_group_id('g')
    with pytest.raises(GroupError, match='temprana'):
        saved.add(person(earliest='2026-12-31', latest='2026-11-01'))


def test_unknown_consulate(tmp_path):
    saved = store(tmp_path)
    saved.set_group_id('g')
    with pytest.raises(GroupError, match='consulado'):
        saved.add(person(consulate='París'))


def test_max_50(tmp_path):
    saved = store(tmp_path)
    saved.set_group_id('g')
    for i in range(50):
        saved.add(person(applicant_id=f'p{i}', schedule_id=str(1000 + i)))
    with pytest.raises(GroupError, match='50'):
        saved.add(person(applicant_id='extra', schedule_id='9999'))


def test_update_remove_and_rename_group(tmp_path):
    saved = store(tmp_path)
    saved.set_group_id('viejo')
    saved.add(person(consent=False))
    state = saved.update('persona-001', person(applicant_id='persona-002', consent=True, consulate='Tijuana'))
    assert state['applicants'][0]['applicant_id'] == 'persona-002'
    assert state['applicants'][0]['consulate'] == 'Tijuana'
    assert state['applicants'][0]['status'] == 'ready_for_manual_login'
    state = saved.set_group_id('nuevo')
    assert state['applicants'][0]['group_id'] == 'nuevo'
    assert saved.remove('persona-002')['applicants'] == []


def test_update_missing(tmp_path):
    saved = store(tmp_path)
    saved.set_group_id('g')
    with pytest.raises(GroupError, match='No está'):
        saved.update('nadie', person())


def test_manifest_rows_load_in_engine(tmp_path):
    saved = store(tmp_path)
    saved.set_group_id('camion-001')
    saved.add(person())
    manifest = tmp_path / 'manifest.json'
    manifest.write_text(json.dumps(saved.manifest_rows()), encoding='utf-8')
    loaded = load_applicants(str(manifest))
    assert loaded[0].applicant_id == 'persona-001'
    assert loaded[0].consent is True
    assert loaded[0].group_id == 'camion-001'


def test_reads_legacy_list_file(tmp_path):
    path = tmp_path / 'group.json'
    path.write_text(json.dumps([person(group_id='camion-001')]), encoding='utf-8')
    state = GroupStore(path, tmp_path / 'audit.sqlite3').load()
    assert state['group_id'] == 'camion-001'
    assert state['applicants'][0]['status'] == 'ready_for_manual_login'
    assert state['applicants'][0]['no_appointment'] is False


def test_add_without_current_appointment(tmp_path):
    saved = store(tmp_path)
    saved.set_group_id('g')
    payload = person(no_appointment=True)
    del payload['current_date']
    state = saved.add(payload)
    row = state['applicants'][0]
    assert row['no_appointment'] is True
    assert row['current_date'] is None
    manifest = tmp_path / 'manifest.json'
    manifest.write_text(json.dumps(saved.manifest_rows()), encoding='utf-8')
    loaded = load_applicants(str(manifest))
    assert loaded[0].current_date is None


def test_current_date_required_when_they_have_an_appointment(tmp_path):
    saved = store(tmp_path)
    saved.set_group_id('g')
    payload = person()
    del payload['current_date']
    with pytest.raises(GroupError, match='cita actual'):
        saved.add(payload)
