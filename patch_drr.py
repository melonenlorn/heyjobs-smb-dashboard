import json, sys

PATH = '/Users/ferdinandbarenfanger/heyjobs-smb-dashboard/pages/Dashboard/widgets/KPI_Hero_Cards.json'

# ── Replacement 1: paceCls/paceArrow — binary → 3-tier ────────────────────
OLD_PACE = (
    "const onTrack    = ctx.onTrack;\n"
    "    const paceCls    = onTrack ? 'h-green' : 'h-red';\n"
    "    const paceArrow  = onTrack ? '↑' : '↓';"
)
NEW_PACE = (
    "const onTrack    = ctx.onTrack;\n"
    "    const bkRatio    = (ctx.neededDRR||0) > 0 ? (ctx.pace||0) / ctx.neededDRR : 1;\n"
    "    const pilRatio   = (ctx.pilotenNeededDRR||0) > 0 ? (ctx.pilotenPace||0) / ctx.pilotenNeededDRR : 1;\n"
    "    const worstRatio = Math.min(bkRatio, pilRatio);\n"
    "    const paceCls    = worstRatio >= 1 ? 'green' : worstRatio >= 0.85 ? 'amber' : 'red';\n"
    "    const paceArrow  = worstRatio >= 1 ? '✓' : worstRatio >= 0.85 ? '→' : '↓';"
)

# ── Replacement 2: DRR bisher label + subtitle ─────────────────────────────
OLD_BISHER_LABEL = "DRR bisher (Booking)</span>"
NEW_BISHER_LABEL = "DRR BISHER</span>"

OLD_BISHER_SUB = (
    "<span class=\"h-sub\" title='Gebuchte Piloten pro Werktag bisher im Quartal'>"
    "${(ctx.pilotenPace || 0).toFixed(1).replace('.',',')} Piloten/Tag</span>"
)
NEW_BISHER_SUB = (
    "<span class=\"h-sub\">"
    "${fmt(ctx.pace || 0)} BK \u00b7 ${(ctx.pilotenPace || 0).toFixed(1).replace('.',',')} PIL/Tag</span>"
)

# ── Replacement 3: DRR needed → DRR → TARGET with subtitle ────────────────
OLD_NEEDED_LABEL = "DRR needed</span>"
NEW_NEEDED_LABEL = "DRR \u2192 TARGET</span>"

OLD_NEEDED_SUB = (
    "<span class=\"h-sub\">${(ctx.pilotenNeededDRR || 0).toFixed(1).replace('.',',')} Piloten/Tag</span>"
)
NEW_NEEDED_SUB = (
    "<span class=\"h-sub\">"
    "${((ctx.neededDRR||0)/1000).toFixed(1).replace('.',',')}k BK/Tag \u00b7 "
    "${(ctx.pilotenNeededDRR || 0).toFixed(1).replace('.',',')} PIL/Tag</span>"
)

# ── Replacement 4: DRR → Commit — 3-tier + PIL in subtitle ────────────────
OLD_COMMIT_LOGIC = (
    "const onTrackCmt = (ctx.pace || 0) >= (cmt.drrToCommit || 0); "
    "const cPaceCls = onTrackCmt ? 'green' : 'red'; "
    "const cArrow = onTrackCmt ? '✓' : '⚠';"
)
NEW_COMMIT_LOGIC = (
    "const cRatio = (cmt.drrToCommit||0) > 0 ? (ctx.pace||0) / cmt.drrToCommit : 1; "
    "const cPaceCls = cRatio >= 1 ? 'green' : cRatio >= 0.85 ? 'amber' : 'red'; "
    "const cArrow = cRatio >= 1 ? '✓' : cRatio >= 0.85 ? '→' : '↓';"
)

OLD_COMMIT_SUB = "Commit: ${fmt(cmt.amount || 0)}</span>"
NEW_COMMIT_SUB = "${fmt(cmt.amount || 0)} BK \u00b7 ${cmt.pilotCount || 0} PIL Commit</span>"

# ── Replacement 5: Tooltips on Attainment rows ─────────────────────────────
# Row 1: Composite forecast label (H compFore%)
OLD_COMP_FORE = (
    '<span style="font-size:10px;color:var(--text-3)">'
    "${compFore ? 'H\u202f'+pct(compFore) : ''}</span>"
)
NEW_COMP_FORE = (
    '<span style="font-size:10px;color:var(--text-3)" '
    "title='Composite Forecast: bei aktuellem Tempo Gesamtziel-Erreichung am Quartalsende (75% Booking + 25% Piloten)'>"
    "${compFore ? 'H\u202f'+pct(compFore) : ''}</span>"
)

# Row 2: Bookings C·H forecast labels
OLD_BK_FORE = (
    '<span style="font-size:10px;color:var(--text-3);white-space:nowrap">'
    "${ctx.commit&&ctx.commit.attainment?'C\u202f'+pct(ctx.commit.attainment||0)+'\u2009\u00b7\u2009':''}H\u202f${pct(b.forecastAtt||0)}</span>"
)
NEW_BK_FORE = (
    '<span style="font-size:10px;color:var(--text-3);white-space:nowrap" '
    "title='C = Commit Forecast (SF Forecast \u00f7 Target) \u00b7 H = Historischer Forecast (bisheriges Tempo hochgerechnet)'>"
    "${ctx.commit&&ctx.commit.attainment?'C\u202f'+pct(ctx.commit.attainment||0)+'\u2009\u00b7\u2009':''}H\u202f${pct(b.forecastAtt||0)}</span>"
)

# Row 3: Piloten C·H forecast labels
OLD_PIL_FORE = (
    '<span style="font-size:10px;color:var(--text-3);white-space:nowrap">'
    "${ctx.commit&&ctx.commit.pilotAtt?'C\u202f'+pct(ctx.commit.pilotAtt||0)+'\u2009\u00b7\u2009':''}H\u202f${pct(p.forecastAtt||0)}</span>"
)
NEW_PIL_FORE = (
    '<span style="font-size:10px;color:var(--text-3);white-space:nowrap" '
    "title='Pilot-Forecast analog zu Bookings \u2014 Tracking verlässlich ab Q1 2026'>"
    "${ctx.commit&&ctx.commit.pilotAtt?'C\u202f'+pct(ctx.commit.pilotAtt||0)+'\u2009\u00b7\u2009':''}H\u202f${pct(p.forecastAtt||0)}</span>"
)

REPLACEMENTS = [
    ('pace vars 3-tier', OLD_PACE, NEW_PACE),
    ('DRR BISHER label', OLD_BISHER_LABEL, NEW_BISHER_LABEL),
    ('DRR BISHER subtitle', OLD_BISHER_SUB, NEW_BISHER_SUB),
    ('DRR TARGET label', OLD_NEEDED_LABEL, NEW_NEEDED_LABEL),
    ('DRR TARGET subtitle', OLD_NEEDED_SUB, NEW_NEEDED_SUB),
    ('DRR Commit 3-tier', OLD_COMMIT_LOGIC, NEW_COMMIT_LOGIC),
    ('DRR Commit subtitle', OLD_COMMIT_SUB, NEW_COMMIT_SUB),
    ('Tooltip composite forecast', OLD_COMP_FORE, NEW_COMP_FORE),
    ('Tooltip bookings forecast', OLD_BK_FORE, NEW_BK_FORE),
    ('Tooltip piloten forecast', OLD_PIL_FORE, NEW_PIL_FORE),
]

def patch_html(html, label):
    changed = False
    for name, old, new in REPLACEMENTS:
        count = html.count(old)
        if count == 0:
            print(f'  {label} [{name}]: NOT FOUND')
            return None, False
        html = html.replace(old, new, 1)
        print(f'  {label} [{name}]: replaced OK')
        changed = True
    return html, changed

with open(PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

changed = False
for key in ['srcDoc', 'uncompiledSrcDoc']:
    if key not in data:
        continue
    val = data[key]
    if isinstance(val, dict):
        html = val.get('html', '')
        sub_key = 'html'
    else:
        html = val
        sub_key = None
    print(f'Processing {key} ({len(html)} chars)...')
    new_html, ok = patch_html(html, key)
    if ok:
        if sub_key:
            data[key][sub_key] = new_html
        else:
            data[key] = new_html
        changed = True
    else:
        sys.exit(1)

if changed:
    with open(PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print('\nDone.')
