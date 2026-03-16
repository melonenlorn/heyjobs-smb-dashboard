export default {

  // ── Quarter definition ────────────────────────────────────────────────────
  QUARTER: {
    start: '2026-01-01',
    end:   '2026-03-31',
    label: 'Q1 2026',
  },

  // ── Rep level mapping (by Salesforce Owner.Name) ─────────────────────────
  REP_LEVELS: {
    // Ferdinand's team
    'Alina Kühne':          '2',
    'Pierre Byer':          '2',
    'Friederike Wilsenack': '2',
    'Jan-Thore Kaulbach':   'rampup',
    // Jan's team
    'Hikmet Canbolat':      '3',
    'Tamina Stange':        '3',
    'Jane Siewert':         '2',
    'Florian Dalis':        '2',
    'Robert Eismann':       '2',
    'Michael Wahl':         '1',
    // Philipp's team
    'Raven Schulz':         '3',
    'Ebru Kizilkaya':       '3',
    'Marius Buga':          '3',
    'Marlies Konrad':       '3',
    'David Beck':           '3',
    'Philipp Schmidt':      '2',
    'Nina Hoffmann':        '2',
  },

  // ── Team membership ───────────────────────────────────────────────────────
  TEAMS: {
    ferdinand: {
      label: 'Ferdinand',
      tlId:  '005W7000006FAIDIA4',
      reps:  ['Alina Kühne', 'Pierre Byer', 'Friederike Wilsenack', 'Jan-Thore Kaulbach'],
    },
    jan: {
      label: 'Jan',
      tlId:  '005W7000004kT37IAE',
      reps:  ['Hikmet Canbolat', 'Tamina Stange', 'Jane Siewert', 'Florian Dalis', 'Robert Eismann', 'Michael Wahl'],
    },
    philipp: {
      label: 'Philipp',
      tlId:  '0059L000000JKFGQA4',
      reps:  ['Raven Schulz', 'Ebru Kizilkaya', 'Marius Buga', 'Marlies Konrad', 'David Beck', 'Philipp Schmidt', 'Nina Hoffmann'],
    },
  },

  // ── All rep Salesforce IDs ────────────────────────────────────────────────
  ALL_REP_IDS: [
    '0059L000000JKG9QAO', // Alina Kühne
    '005W7000000zmHSIAY', // Pierre Byer
    '005W7000005SxezIAC', // Friederike Wilsenack
    '005W7000009NCmTIAW', // Jan-Thore Kaulbach
    '0051v00000BjKXAAA3', // Hikmet Canbolat
    '0059L000000JKFlQAO', // Tamina Stange
    '005W7000005SzP3IAK', // Jane Siewert
    '005W7000005SxQTIA0', // Florian Dalis
    '005W7000004vQt7IAE', // Robert Eismann
    '005W7000005WNTFIA4', // Michael Wahl
    '0059L000000IlsvQAC', // Raven Schulz
    '0059L000000JKGDQA4', // Ebru Kizilkaya
    '005W7000002HR5tIAG', // Marius Buga
    '005W70000048JRNIA2', // Marlies Konrad
    '005W7000003UovJIAS', // David Beck
    '0059L000000JKGOQA4', // Philipp Schmidt
    '005W7000004vQptIAE', // Nina Hoffmann
  ],

  // ── Level config: weights and pilot targets ───────────────────────────────
  LEVEL_CONFIG: {
    '3':      { bookingsWeight: 0.75, pilotenWeight: 0.25, pilotenTarget: 12 },
    '2':      { bookingsWeight: 0.50, pilotenWeight: 0.50, pilotenTarget: 16 },
    '1':      { bookingsWeight: 0.25, pilotenWeight: 0.75, pilotenTarget: 18 },
    'rampup': { bookingsWeight: 1.00, pilotenWeight: 0.00, pilotenTarget: 0  },
  },

  // ── Per-rep overrides (special cases) ────────────────────────────────────
  // David Beck: promoted to L3 in Q1 but keeps L2 pilot target until 2026-03-31
  LEVEL_OVERRIDES: {
    'David Beck': { bookingsWeight: 0.50, pilotenWeight: 0.50, pilotenTarget: 16 },
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

  // ── Helper: get level config for a rep (with override support) ───────────
  levelConfig(repName) {
    if (JS_Config.LEVEL_OVERRIDES[repName]) return JS_Config.LEVEL_OVERRIDES[repName];
    const level = JS_Config.REP_LEVELS[repName] || '2';
    return JS_Config.LEVEL_CONFIG[level] || JS_Config.LEVEL_CONFIG['2'];
  },

  // ── Helper: get pilot target for a rep ───────────────────────────────────
  pilotenTarget(repName) {
    return JS_Config.levelConfig(repName).pilotenTarget;
  },

  // ── Helper: get team key for a rep ───────────────────────────────────────
  teamForRep(repName) {
    for (const [key, team] of Object.entries(JS_Config.TEAMS)) {
      if (team.reps.includes(repName)) return key;
    }
    return null;
  },

  // ── Helper: quarter date helpers ─────────────────────────────────────────
  getQuarterProgress() {
    const now   = new Date();
    const start = new Date(JS_Config.QUARTER.start);
    const end   = new Date(JS_Config.QUARTER.end);
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
