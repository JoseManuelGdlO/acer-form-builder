from datetime import date
import json
import pytest
from connector import Appointment, eligible
from engine import Applicant, AuditStore, best_candidate, load_applicants

def applicant():
    return Applicant('p1','g1','123','Monterrey',date(2027,8,20),date(2026,11,1),date(2026,12,31),True)

def test_earliest_candidate():
    slots = [Appointment(date(2026,12,15),'09:00',date(2026,12,14),'08:00','Monterrey'),
             Appointment(date(2026,11,20),'11:00',date(2026,11,19),'10:00','Monterrey')]
    assert best_candidate(applicant(),slots).consulate_date == date(2026,11,20)

def test_eligible_without_current_appointment():
    inside = Appointment(date(2026, 12, 15), '09:00', date(2026, 12, 14), '08:00', 'Monterrey')
    outside = Appointment(date(2027, 1, 2), '09:00', date(2027, 1, 1), '08:00', 'Monterrey')
    assert eligible(inside, None, date(2026, 11, 1), date(2026, 12, 31))
    assert eligible(outside, None, date(2026, 11, 1), date(2026, 12, 31)) is False

def test_filters_invalid_asc():
    slot = Appointment(date(2026,12,15),'09:00',date(2026,12,16),'08:00','Monterrey')
    assert best_candidate(applicant(),[slot]) is None

def test_audit(tmp_path):
    s = AuditStore(str(tmp_path/'audit.db'))
    s.record(applicant(),'opportunity',{'date':'2026-11-20'})
    assert s.events('p1')[0][0] == 'opportunity'
    with pytest.raises(ValueError):
        s.record(applicant(),'error',{'password':'bad'})

def test_manifest_limit(tmp_path):
    p=tmp_path/'manifest.json'
    p.write_text(json.dumps([{'applicant_id':str(i)} for i in range(51)]))
    with pytest.raises(ValueError):
        load_applicants(str(p))
