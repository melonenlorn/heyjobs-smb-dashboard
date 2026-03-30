import json, sys

PATH = '/Users/ferdinandbarenfanger/heyjobs-smb-dashboard/pages/Dashboard/widgets/Rep_Table.json'

# ── CSS to inject before </style> ────────────────────────────────────────────
CSS = """
\t\t\t/* ── Loading Overlay ── */
\t\t\t#loadingOverlay {
\t\t\t\tposition: fixed;
\t\t\t\tinset: 0;
\t\t\t\tdisplay: flex;
\t\t\t\talign-items: center;
\t\t\t\tjustify-content: center;
\t\t\t\tflex-direction: column;
\t\t\t\tgap: 14px;
\t\t\t\tbackground: rgba(255,255,255,0.65);
\t\t\t\tbackdrop-filter: blur(6px);
\t\t\t\t-webkit-backdrop-filter: blur(6px);
\t\t\t\tz-index: 9999;
\t\t\t\topacity: 1;
\t\t\t\ttransition: opacity 0.45s ease;
\t\t\t\tpointer-events: none;
\t\t\t}
\t\t\t#loadingOverlay.hidden {
\t\t\t\topacity: 0;
\t\t\t}
\t\t\t.loader-spinner {
\t\t\t\twidth: 38px;
\t\t\t\theight: 38px;
\t\t\t\tborder: 3px solid #e5e7eb;
\t\t\t\tborder-top-color: #4f46e5;
\t\t\t\tborder-radius: 50%;
\t\t\t\tanimation: loaderSpin 0.7s linear infinite;
\t\t\t}
\t\t\t@keyframes loaderSpin { to { transform: rotate(360deg); } }
\t\t\t.loader-text {
\t\t\t\tfont-size: 12px;
\t\t\t\tcolor: #6b7280;
\t\t\t\tletter-spacing: 0.02em;
\t\t\t}

\t\t"""

# ── Overlay HTML to inject after <body> ────────────────────────────────────
OVERLAY_HTML = """\t\t<div id="loadingOverlay">
\t\t\t<div class="loader-spinner"></div>
\t\t\t<span class="loader-text">Daten werden geladen\u2026</span>
\t\t</div>

\t\t"""

# ── JS to inject into render() after 'var reps = model.reps || [];' ────────
RENDER_JS = """\n\t\t\t\tvar _hasData = reps.length > 0 && reps.some(function(r){ return (r.bookingsARR||0)+(r.dials||0) > 0; });\n\t\t\t\tvar _ov = document.getElementById('loadingOverlay');\n\t\t\t\tif (_ov) { if (_hasData) _ov.classList.add('hidden'); else _ov.classList.remove('hidden'); }"""

CSS_MARKER    = '\t\t</style>\n\t</head>'
BODY_MARKER   = '<body>\n\n\t\t<div class="container" id="container">'
RENDER_MARKER = 'function render(model) {\n\t\t\t\tpopulateQuarterDropdown(model);\n\t\t\t\tvar reps = model.reps || [];'

def patch_html(html, label):
    changed = False

    # 1. CSS
    if CSS_MARKER not in html:
        print(f'  {label}: CSS_MARKER not found')
        return None, False
    html = html.replace(CSS_MARKER, CSS + CSS_MARKER, 1)
    print(f'  {label}: CSS injected')
    changed = True

    # 2. Overlay HTML
    if BODY_MARKER not in html:
        print(f'  {label}: BODY_MARKER not found')
        return None, False
    html = html.replace(BODY_MARKER, BODY_MARKER + '\n' + OVERLAY_HTML, 1)
    print(f'  {label}: Overlay HTML injected')

    # 3. Render JS
    if RENDER_MARKER not in html:
        print(f'  {label}: RENDER_MARKER not found')
        return None, False
    html = html.replace(RENDER_MARKER, RENDER_MARKER + RENDER_JS, 1)
    print(f'  {label}: Render JS injected')

    return html, changed

with open(PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

changed = False
for key in ['srcDoc', 'uncompiledSrcDoc']:
    if key not in data:
        print(f"Key '{key}' not found, skipping")
        continue
    val = data[key]
    if isinstance(val, dict):
        html = val.get('html', '')
        sub_key = 'html'
    else:
        html = val
        sub_key = None
    print(f"Processing {key}[{sub_key or 'str'}] ({len(html)} chars)...")
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
    print("\nDone — Rep_Table.json updated.")
else:
    print("No changes.")
