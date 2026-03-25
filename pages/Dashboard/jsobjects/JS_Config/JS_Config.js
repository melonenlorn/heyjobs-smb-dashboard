export default {

  // ── Rep level mapping (by Salesforce Owner.Name) ─────────────────────────
  REP_LEVELS: {
    // Ferdinand's / Mareike's team (Wolves)
    'Alina Kühne':          '2',
    'Pierre Byer':          '2',
    'Jan-Thore Kaulbach':   'rampup',
    // Jan's team (Titans)
    'Hikmet Canbolat':      '3',
    'Tamina Stange':        '3',
    'Jane Siewert':         '2',
    'Florian Dalis':        '2',
    'Robert Eismann':       '2',
    'Michael Wahl':         '1',
    // Philipp's / Raven's team (Locos)
    'Raven Schulz':         '3',
    'Ebru Kizilkaya':       '3',
    'Marius Buga':          '3',
    'Marlies Konrad':       '3',
    'David Beck':           '3',
    'Philipp Schmidt':      '2',
    'Nina Hoffmann':        '2',
  },

  // ── Manager-Registry je Quartal ───────────────────────────────────────────
  MANAGERS: {
    'Q1 2026': {
      wolves: { label: 'Wolves', emoji: '🐺', tlName: 'Ferdinand Bärenfänger' },
      titans: { label: 'Titans', emoji: '⚡', tlName: 'Jan Hinrichsen' },
      locos:  { label: 'Locos',  emoji: '🔥', tlName: 'Philipp Bahls' },
    },
    'Q2 2026': {
      wolves: { label: 'Wolves', emoji: '🐺', tlName: 'Mareike Schliesser' },
      titans: { label: 'Titans', emoji: '⚡', tlName: 'Jan Hinrichsen' },
      locos:  { label: 'Locos',  emoji: '🔥', tlName: 'Raven Schulz' },
    },
  },

  // ── Feiertage je Quartal (Berlin) ─────────────────────────────────────────
  QUARTER_HOLIDAYS: {
    'Q1 2026': ['2026-01-01'],
    'Q2 2026': ['2026-05-01', '2026-05-14', '2026-05-25'],
    'Q3 2026': [],
    'Q4 2026': ['2026-12-25', '2026-12-26'],
  },

  // ── Team-Daten: statische Defaults, werden durch buildTeamsFromQuery() überschrieben ──
  // WICHTIG: Appsmith JSObjects unterstützen keine ES6 Getter → direkte Properties
  TEAMS: {
    wolves: { label: 'Wolves', emoji: '🐺', tlId: '005W7000006FAIDIA4', reps: ['Alina Kühne', 'Pierre Byer', 'Jan-Thore Kaulbach'] },
    titans: { label: 'Titans', emoji: '⚡', tlId: '005W7000004kT37IAE', reps: ['Hikmet Canbolat', 'Tamina Stange', 'Jane Siewert', 'Florian Dalis', 'Robert Eismann', 'Michael Wahl'] },
    locos:  { label: 'Locos',  emoji: '🔥', tlId: '0059L000000JKFGQA4', reps: ['Raven Schulz', 'Ebru Kizilkaya', 'Marius Buga', 'Marlies Konrad', 'David Beck', 'Philipp Schmidt', 'Nina Hoffmann'] },
  },
  ALL_REP_IDS: [
    '0059L000000JKG9QAO', '005W7000000zmHSIAY', '005W7000009NCmTIAW',
    '0051v00000BjKXAAA3', '0059L000000JKFlQAO', '005W7000005SzP3IAK',
    '005W7000005SxQTIA0', '005W7000004vQt7IAE', '005W7000005WNTFIA4',
    '0059L000000IlsvQAC', '0059L000000JKGDQA4', '005W7000002HR5tIAG',
    '005W70000048JRNIA2', '005W7000003UovJIAS', '0059L000000JKGOQA4',
    '005W7000004vQptIAE',
  ],
  ID_TO_NAME: {
    '0059L000000JKG9QAO': 'Alina Kühne',       '005W7000000zmHSIAY': 'Pierre Byer',
    '005W7000009NCmTIAW': 'Jan-Thore Kaulbach', '0051v00000BjKXAAA3': 'Hikmet Canbolat',
    '0059L000000JKFlQAO': 'Tamina Stange',      '005W7000005SzP3IAK': 'Jane Siewert',
    '005W7000005SxQTIA0': 'Florian Dalis',      '005W7000004vQt7IAE': 'Robert Eismann',
    '005W7000005WNTFIA4': 'Michael Wahl',        '0059L000000IlsvQAC': 'Raven Schulz',
    '0059L000000JKGDQA4': 'Ebru Kizilkaya',     '005W7000002HR5tIAG': 'Marius Buga',
    '005W70000048JRNIA2': 'Marlies Konrad',      '005W7000003UovJIAS': 'David Beck',
    '0059L000000JKGOQA4': 'Philipp Schmidt',     '005W7000004vQptIAE': 'Nina Hoffmann',
  },
  _newReps: [],

  // ── Level config: weights and pilot targets ───────────────────────────────
  LEVEL_CONFIG: {
    '3':      { bookingsWeight: 0.75, pilotenWeight: 0.25, pilotenTarget: 12 },
    '2':      { bookingsWeight: 0.50, pilotenWeight: 0.50, pilotenTarget: 16 },
    '1':      { bookingsWeight: 0.25, pilotenWeight: 0.75, pilotenTarget: 18 },
    'rampup': { bookingsWeight: 1.00, pilotenWeight: 0.00, pilotenTarget: 0  },
  },

  // ── Per-rep overrides (quartals-aware) ────────────────────────────────────
  // David Beck: promoted to L3 in Q1 but keeps L2 pilot target until 2026-03-31
  LEVEL_OVERRIDES: {
    'David Beck': {
      'Q1 2026': { bookingsWeight: 0.50, pilotenWeight: 0.50, pilotenTarget: 16 },
      // Ab Q2: kein Override → Standard L3
    },
  },

  // ── Thresholds for traffic light status ──────────────────────────────────
  THRESHOLDS: {
    compositeAttainment: { green: 80, amber: 60 },  // %
    coverage:            { green: 2.5, amber: 1.5 }, // x
    winRate:             { green: 30,  amber: 20  }, // %
    staleRate:           { green: 15,  amber: 30  }, // % (inverted: lower = better)
  },

  // ── Stale definition ─────────────────────────────────────────────────────
  STALE_DAYS: 14,

  // ── ForecastingQuota type IDs ─────────────────────────────────────────────
  FORECASTING_TYPE_BOOKINGS: '0DbW7000000DaaLKAS',

  // ── Dynamisches Quartal: aktuelles Quartal aus Systemdatum ───────────────
  currentQuarter() {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3) + 1;
    const y = now.getFullYear();
    const start = y + '-' + String((q - 1) * 3 + 1).padStart(2, '0') + '-01';
    const endDate = new Date(y, q * 3, 0);
    return { start, end: JS_Config._localStr(endDate), label: 'Q' + q + ' ' + y, q, year: y };
  },

  // ── Aktives Quartal (aus Store oder aktuell) ──────────────────────────────
  getActiveQuarter() {
    const curr = JS_Config.currentQuarter();
    const sel  = (typeof appsmith !== 'undefined' && appsmith.store && appsmith.store.selectedQuarter)
                 ? appsmith.store.selectedQuarter
                 : curr.label;
    const holidays = JS_Config.QUARTER_HOLIDAYS[sel] || [];
    if (sel === curr.label) {
      return { ...curr, isCurrent: true, holidays };
    }
    // Historisches Quartal
    const qn = parseInt(sel[1]);
    const y  = parseInt(sel.slice(3));
    const start = y + '-' + String((qn - 1) * 3 + 1).padStart(2, '0') + '-01';
    const endDate = new Date(y, qn * 3, 0);
    return { start, end: JS_Config._localStr(endDate), label: sel, q: qn, year: y, isCurrent: false, holidays };
  },

  // ── Hilfsfunktion: Vorheriges Quartal bestimmen ──────────────────────────
  previousQuarterLabel() {
    const curr = JS_Config.currentQuarter();
    let q = curr.q - 1, y = curr.year;
    if (q < 1) { q = 4; y -= 1; }
    return 'Q' + q + ' ' + y;
  },

  // ── Manager-Namen für aktives Quartal ────────────────────────────────────
  managerNames() {
    const q    = JS_Config.getActiveQuarter().label;
    const mgrs = JS_Config.MANAGERS[q] || JS_Config.MANAGERS[JS_Config.currentQuarter().label] || {};
    return Object.values(mgrs).map(function(m) { return m.tlName; });
  },

  // ── Team-Struktur aus Q_Users_Team aufbauen ──────────────────────────────
  buildTeamsFromQuery() {
    const q    = JS_Config.getActiveQuarter().label;
    const mgrs = JS_Config.MANAGERS[q] || JS_Config.MANAGERS[JS_Config.currentQuarter().label] || {};
    let records = [];
    try { records = Q_Users_Team.data.output.records || []; } catch(e) { records = []; }

    // Manager-IDs per Name finden
    const mgrLookup = {}; // SF-Id → teamKey
    for (const [key, m] of Object.entries(mgrs)) {
      const found = records.find(function(r) { return r.Name === m.tlName; });
      if (found) mgrLookup[found.Id] = key;
    }

    // Teams initialisieren
    const teams = {};
    for (const [key, m] of Object.entries(mgrs)) {
      teams[key] = { label: m.label, emoji: m.emoji || '', tlId: null, reps: [] };
    }

    const allIds = [], idToName = {}, newReps = [];

    for (const r of records) {
      if (mgrLookup[r.Id]) {
        // Ist selbst Manager
        teams[mgrLookup[r.Id]].tlId = r.Id;
      } else if (mgrLookup[r.ManagerId]) {
        // IC unter bekanntem Manager
        const teamKey = mgrLookup[r.ManagerId];
        teams[teamKey].reps.push(r.Name);
        allIds.push(r.Id);
        idToName[r.Id] = r.Name;
        if (!JS_Config.REP_LEVELS[r.Name]) newReps.push(r.Name);
      }
    }

    JS_Config.TEAMS      = teams;
    JS_Config.ALL_REP_IDS = allIds;
    JS_Config.ID_TO_NAME  = idToName;
    JS_Config._newReps    = newReps;
  },

  // ── SOQL IN-Clause für Rep-IDs ────────────────────────────────────────────
  repIdInClause() {
    return JS_Config.ALL_REP_IDS.map(function(id) { return "'" + id + "'"; }).join(',');
  },

  // ── Helper: get level config for a rep (quartals-aware override) ─────────
  levelConfig(repName) {
    const q         = JS_Config.getActiveQuarter().label;
    const overrides = JS_Config.LEVEL_OVERRIDES[repName];
    if (overrides && overrides[q]) return overrides[q];
    const level = JS_Config.REP_LEVELS[repName] || 'rampup';
    return JS_Config.LEVEL_CONFIG[level] || JS_Config.LEVEL_CONFIG['rampup'];
  },

  // ── Helper: get pilot target for a rep ───────────────────────────────────
  pilotenTarget(repName) {
    return JS_Config.levelConfig(repName).pilotenTarget;
  },

  // ── Helper: get team key for a rep ───────────────────────────────────────
  teamForRep(repName) {
    for (const [key, team] of Object.entries(JS_Config.TEAMS)) {
      if (team.reps && team.reps.includes(repName)) return key;
    }
    return null;
  },

  // ── Parse YYYY-MM-DD string as LOCAL midnight (avoids UTC timezone shift) ──
  _parseLocal(s) {
    if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  },

  // ── Format Date as YYYY-MM-DD using LOCAL date methods (not toISOString) ──
  _localStr(d) {
    return d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
  },

  // ── Count working days (Mon–Fri, excl. Berlin holidays) from date A to date B inclusive ──
  werktage(from, to) {
    const holidays = new Set(JS_Config.getActiveQuarter().holidays);
    let count = 0;
    const d   = JS_Config._parseLocal(from);
    const end = JS_Config._parseLocal(to);
    while (d <= end) {
      const dow = d.getDay();
      const ds  = JS_Config._localStr(d);
      if (dow !== 0 && dow !== 6 && !holidays.has(ds)) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  },

  // ── Werktage-Kontext für das aktive Quartal ──────────────────────────────
  getWerktageContext() {
    const aq      = JS_Config.getActiveQuarter();
    const now     = new Date();
    const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start   = JS_Config._parseLocal(aq.start);
    const end     = JS_Config._parseLocal(aq.end);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const total   = JS_Config.werktage(start, end);
    const done    = today <= start ? 0 : Math.min(JS_Config.werktage(start, yesterday), total);
    const remaining = total - done;
    const daysToEnd = Math.ceil(Math.max(0, end - today) / 86400000);
    return { total, done, remaining, daysToEnd };
  },

  // ── Helper: quarter date helpers ─────────────────────────────────────────
  getQuarterProgress() {
    const aq    = JS_Config.getActiveQuarter();
    const now   = new Date();
    const start = new Date(aq.start);
    const end   = new Date(aq.end);
    const total = end - start;
    const elapsed = Math.min(now - start, total);
    return Math.max(0, Math.min(1, elapsed / total));
  },

  // ── Number formatting (German locale, no Intl — Appsmith compatible) ─────
  formatEUR(val) {
    if (!val || val === 0) return '€\u00a00';
    const n   = Math.round(Math.abs(val));
    const str = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (val < 0 ? '-' : '') + '€\u00a0' + str;
  },

  formatNum(val) {
    const n   = Math.round(Math.abs(val || 0));
    const str = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return ((val || 0) < 0 ? '-' : '') + str;
  },

  formatPct(val) {
    return (val || 0) + '\u202f%';
  },

}
