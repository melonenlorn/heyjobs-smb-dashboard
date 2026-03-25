#!/usr/bin/env python3
"""
Quarter Update Script — SMB Steering Dashboard
===============================================
Aktualisiert alle SOQL-Queries auf ein neues Quartal.

Usage:
    python3 scripts/update_quarter.py <Q> <YEAR>
    python3 scripts/update_quarter.py 2 2026        # → Q2 2026

Was das Script macht:
    1. Ersetzt Datumsbereiche in den 10 QTD-Queries
    2. Aktualisiert die Feiertage in JS_Config (BERLIN_HOLIDAYS)
    3. Falls neue Rep-IDs angegeben werden: aktualisiert alle IN-Clauses

Hinweis: Rep-IDs werden nur aktualisiert wenn --rep-ids übergeben wird.
Neue IDs für Mareike Schliesser (Wolves-Manager Q2) und ggf. neue ICs
müssen manuell in JS_Config.MANAGERS + JS_Config._teams eingetragen werden.
"""

import json, os, sys, re
from datetime import date

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT   = os.path.dirname(SCRIPT_DIR)
QUERIES_DIR = os.path.join(REPO_ROOT, 'pages/Dashboard/queries')
JS_CONFIG   = os.path.join(REPO_ROOT, 'pages/Dashboard/jsobjects/JS_Config/JS_Config.js')

# ── Quartalsdaten ─────────────────────────────────────────────────────────────
QUARTER_DATA = {
    ('1', '2026'): {
        'start': '2026-01-01', 'end': '2026-03-31',
        'holidays': ['2026-01-01'],
    },
    ('2', '2026'): {
        'start': '2026-04-01', 'end': '2026-06-30',
        'holidays': ['2026-05-01', '2026-05-14', '2026-05-25'],
    },
    ('3', '2026'): {
        'start': '2026-07-01', 'end': '2026-09-30',
        'holidays': [],
    },
    ('4', '2026'): {
        'start': '2026-10-01', 'end': '2026-12-31',
        'holidays': ['2026-12-25', '2026-12-26'],
    },
}

# QTD-Queries die Datumsbereiche enthalten
QTD_QUERIES = [
    'Q_Bookings_QTD', 'Q_SelfService_QTD', 'Q_Calls_QTD', 'Q_QualCalls_QTD',
    'Q_Emails_QTD', 'Q_Meetings_QTD', 'Q_Demos_QTD', 'Q_Opps_Created_QTD',
    'Q_PilotOpps_QTD', 'Q_Quotas',
]

def update_query_dates(qname, old_start, old_end, new_start, new_end):
    qpath = os.path.join(QUERIES_DIR, qname, 'metadata.json')
    if not os.path.exists(qpath):
        print(f'  SKIP: {qname} not found')
        return False

    with open(qpath) as f:
        data = json.load(f)

    action = data['unpublishedAction']
    cfg    = action['actionConfiguration']
    custom = cfg['formData']['CUSTOM_ACTION']
    params = custom.get('params', [{}])
    sql    = params[0].get('value', '')
    path   = custom.get('path', '')

    sql  = sql.replace(f'>= {old_start}', f'>= {new_start}')
    sql  = sql.replace(f'<= {old_end}',   f'<= {new_end}')
    sql  = sql.replace(f'StartDate = {old_start}', f'StartDate = {new_start}')
    path = path.replace(f'>= {old_start}', f'>= {new_start}')
    path = path.replace(f'<= {old_end}',   f'<= {new_end}')
    path = path.replace(f'StartDate = {old_start}', f'StartDate = {new_start}')

    params[0]['value'] = sql
    custom['params']   = params
    custom['path']     = path

    with open(qpath, 'w') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    return True


def update_rep_ids(new_ids: list[str]):
    """Alle Queries: OwnerId IN (...) aktualisieren."""
    new_in = "OwnerId IN ('" + "','".join(new_ids) + "')"
    all_queries = [d for d in os.listdir(QUERIES_DIR) if d.startswith('Q_')]
    updated = []
    for qname in all_queries:
        qpath = os.path.join(QUERIES_DIR, qname, 'metadata.json')
        if not os.path.exists(qpath):
            continue
        with open(qpath) as f:
            data = json.load(f)
        custom = data['unpublishedAction']['actionConfiguration']['formData']['CUSTOM_ACTION']
        params = custom.get('params', [{}])
        sql    = params[0].get('value', '')
        path   = custom.get('path', '')
        new_sql  = re.sub(r"OwnerId IN \('[^)]*'\)", new_in, sql)
        new_path = re.sub(r"OwnerId IN \('[^)]*'\)", new_in, path)
        if new_sql != sql:
            params[0]['value'] = new_sql
            custom['params']   = params
            custom['path']     = new_path
            with open(qpath, 'w') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            updated.append(qname)
    return updated


def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)

    q_num = args[0].lstrip('Q').lstrip('q')
    year  = args[1]
    key   = (q_num, year)

    if key not in QUARTER_DATA:
        print(f'ERROR: Unbekanntes Quartal Q{q_num} {year}. Bitte QUARTER_DATA im Script erweitern.')
        sys.exit(1)

    qdata    = QUARTER_DATA[key]
    new_label = f'Q{q_num} {year}'
    new_start = qdata['start']
    new_end   = qdata['end']

    # Determine previous quarter for old dates
    prev_q = str(int(q_num) - 1) if int(q_num) > 1 else '4'
    prev_y = year if int(q_num) > 1 else str(int(year) - 1)
    prev_data = QUARTER_DATA.get((prev_q, prev_y), {})
    old_start = prev_data.get('start', '2026-01-01')
    old_end   = prev_data.get('end',   '2026-03-31')

    print(f'\n── Updating to {new_label} ──')
    print(f'Dates: {old_start}..{old_end} → {new_start}..{new_end}')

    # 1. Update QTD query dates
    print('\n[1] Updating QTD query date ranges...')
    for qname in QTD_QUERIES:
        ok = update_query_dates(qname, old_start, old_end, new_start, new_end)
        print(f'  {"✓" if ok else "✗"} {qname}')

    # 2. Update rep IDs if provided
    rep_ids_flag = '--rep-ids'
    if rep_ids_flag in args:
        idx = args.index(rep_ids_flag)
        new_ids = args[idx+1].split(',')
        print(f'\n[2] Updating OwnerId IN clause ({len(new_ids)} IDs)...')
        updated = update_rep_ids(new_ids)
        for q in updated:
            print(f'  ✓ {q}')
    else:
        print(f'\n[2] Rep-IDs: SKIPPED (pass --rep-ids id1,id2,... to update)')

    print(f'\n✅ Done! Next steps:')
    print(f'   ⚠️  WICHTIG: Reihenfolge beachten!')
    print(f'   1. Zuerst Dashboard im Browser öffnen (BEVOR du pushst)')
    print(f'      → Auto-Snapshot des vorherigen Quartals wird erstellt')
    print(f'   2. Dann pushen: git add -A && git commit -m "Q{q_num} {year}: Update Queries" && git push')
    print(f'   3. Pull in Appsmith + Verify JS_Config.MANAGERS für {new_label}')
    print(f'   4. Update JS_Config.QUARTER_HOLIDAYS wenn nötig')


if __name__ == '__main__':
    main()
