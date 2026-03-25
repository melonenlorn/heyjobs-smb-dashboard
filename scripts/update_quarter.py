#!/usr/bin/env python3
"""
Quarter Update Script — SMB Steering Dashboard
===============================================
Aktualisiert alle SOQL-Queries auf ein neues Quartal.

Usage:
    python3 scripts/update_quarter.py <Q> <YEAR>
    python3 scripts/update_quarter.py 2 2026        # → Q2 2026

Was das Script macht:
    1. Ersetzt Datumsbereiche in den QTD-Queries
    2. Aktualisiert OwnerId IN (...) in allen Queries
    3. git commit + push

Snapshots werden automatisch von Appsmith erstellt (kein manueller Schritt nötig):
    → Appsmith speichert nach jedem Dashboard-Öffnen einen Snapshot des aktuellen
      Quartals im Appsmith Store (JS_Init.saveSnapshot).
    → Historische Daten sind damit beim ersten Öffnen im neuen Quartal bereits gespeichert.

Hinweis: OwnerId-Liste wird automatisch aus SF via `sf data query` ermittelt.
Neue IDs für Manager (Mareike Schliesser Wolves-Manager Q2) müssen manuell in
JS_Config.MANAGERS eingetragen werden.
"""

import json, os, sys, re, subprocess

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


def fetch_rep_ids_from_sf(mgr_names, target_org=None):
    """Ermittelt aktive IC-Rep-IDs aus Salesforce via Rollen-Query."""
    soql = "SELECT Id, Name, ManagerId, Manager.Name FROM User WHERE IsActive = true AND UserRole.Name LIKE 'Inside Sales IC%' ORDER BY Manager.Name, Name"
    cmd  = ['sf', 'data', 'query', '--json', '--query', soql]
    if target_org:
        cmd += ['--target-org', target_org]
    try:
        result  = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        data    = json.loads(result.stdout)
        records = data.get('result', {}).get('records', [])
        rep_ids = []
        for r in records:
            mgr_name = (r.get('Manager') or {}).get('Name') or ''
            if mgr_name in mgr_names:
                rep_ids.append(r['Id'])
                print(f'  ✓ {r["Name"]} ({mgr_name})')
        return rep_ids
    except Exception as e:
        print(f'  WARN: SF-Abfrage fehlgeschlagen: {e}')
        return []


def get_manager_names_from_config(quarter_label):
    if not os.path.exists(JS_CONFIG):
        return []
    with open(JS_CONFIG) as f:
        content = f.read()
    pattern = rf"'{re.escape(quarter_label)}':\s*\{{([^}}]+(?:\{{[^}}]*\}}[^}}]*)*)\}}"
    m = re.search(pattern, content, re.DOTALL)
    if not m:
        return []
    return re.findall(r"tlName:\s*'([^']+)'", m.group(1))


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

    qdata     = QUARTER_DATA[key]
    new_label = f'Q{q_num} {year}'
    new_start = qdata['start']
    new_end   = qdata['end']

    prev_q    = str(int(q_num) - 1) if int(q_num) > 1 else '4'
    prev_y    = year if int(q_num) > 1 else str(int(year) - 1)
    prev_data = QUARTER_DATA.get((prev_q, prev_y), {})
    old_start = prev_data.get('start', '2026-01-01')
    old_end   = prev_data.get('end',   '2026-03-31')

    print(f'\n── Update auf {new_label} ──')
    print(f'Dates: {old_start}..{old_end} → {new_start}..{new_end}')

    # [1] QTD-Query-Dates aktualisieren
    print('\n[1] QTD-Query-Datumsbereiche aktualisieren...')
    for qname in QTD_QUERIES:
        ok = update_query_dates(qname, old_start, old_end, new_start, new_end)
        print(f'  {"✓" if ok else "✗"} {qname}')

    # [2] Rep-IDs aus SF ermitteln und Queries aktualisieren
    skip_reps = '--skip-reps' in args
    if not skip_reps:
        print(f'\n[2] Rep-IDs für {new_label} aus Salesforce ermitteln...')
        mgr_names = get_manager_names_from_config(new_label)
        if mgr_names:
            print(f'  Manager: {mgr_names}')
            rep_ids = fetch_rep_ids_from_sf(mgr_names)
            if rep_ids:
                print(f'\n  OwnerId IN-Clause in allen Queries aktualisieren ({len(rep_ids)} IDs)...')
                updated = update_rep_ids(rep_ids)
                for q in updated:
                    print(f'  ✓ {q}')
            else:
                print('  WARN: Keine Rep-IDs ermittelt — Queries unverändert (manuell: --rep-ids id1,id2,...)')
        else:
            print(f'  WARN: Keine Manager-Namen für {new_label} in JS_Config.MANAGERS gefunden')
    else:
        print('\n[2] Rep-IDs: SKIPPED')

    # [3] Manuelle Rep-IDs (Fallback)
    if '--rep-ids' in args:
        idx = args.index('--rep-ids')
        new_ids = args[idx+1].split(',')
        print(f'\n[2b] OwnerId IN-Clause manuell aktualisieren ({len(new_ids)} IDs)...')
        updated = update_rep_ids(new_ids)
        for q in updated:
            print(f'  ✓ {q}')

    # [3] Git commit + push
    print(f'\n[3] Git commit + push...')
    try:
        os.chdir(REPO_ROOT)
        subprocess.run(['git', 'add', '-A'], check=True)
        commit_msg = f'{new_label}: Update Queries'
        subprocess.run(['git', 'commit', '-m', commit_msg], check=True)
        subprocess.run(['git', 'push'], check=True)
        print(f'  ✓ Gepusht')
    except subprocess.CalledProcessError as e:
        print(f'  WARN: Git-Fehler: {e}')
        print(f'  Manuell: git add -A && git commit -m "{new_label}: Update Queries" && git push')

    print(f'\n✅ Done!')
    print(f'   → Appsmith: Pull in Appsmith')
    print(f'   → Snapshot: Wird automatisch beim nächsten Dashboard-Öffnen erstellt')
    print(f'   → Prüfen: JS_Config.MANAGERS für {new_label} korrekt?')


if __name__ == '__main__':
    main()
