"""Group operations. Only authorized accounts may be queued."""
import argparse
from engine import load_applicants, AuditStore


def main():
    p = argparse.ArgumentParser(description='Validate a group manifest and prepare authorized monitoring queue')
    p.add_argument('--manifest', required=True)
    p.add_argument('--database', default='data/audit.sqlite3')
    args = p.parse_args()
    applicants = load_applicants(args.manifest)
    store = AuditStore(args.database)
    for a in applicants:
        status = 'ready_for_manual_login' if a.consent else 'consent_required'
        store.record(a, status, {'consulate': a.consulate, 'current_date': a.current_date.isoformat()})
        print(f'{a.applicant_id}: {status}')
    print(f'Processed {len(applicants)} applicants. No portal traffic generated.')

if __name__ == '__main__':
    main()
