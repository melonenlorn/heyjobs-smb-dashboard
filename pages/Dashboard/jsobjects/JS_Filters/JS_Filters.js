export default {

  // ── Get/set filter state via Appsmith store ───────────────────────────────

  getTeam() {
    return appsmith.store.filterTeam || 'all';
  },
  setTeam(val) {
    storeValue('filterTeam', val);
  },

  getLevel() {
    return appsmith.store.filterLevel || 'all';
  },
  setLevel(val) {
    storeValue('filterLevel', val);
  },

  getRiskLevel() {
    return appsmith.store.filterRisk || 'all';
  },
  setRiskLevel(val) {
    storeValue('filterRisk', val);
  },

  getQuarter() {
    return appsmith.store.selectedQuarter || JS_Config.currentQuarter().label;
  },
  async setQuarter(val) {
    await storeValue('selectedQuarter', val);
    await JS_Init.initDashboard();
  },

  // ── Filter a list of rep KPI rows by current filter state ────────────────
  applyFilters(repRows) {
    let rows = repRows || [];
    const team  = JS_Filters.getTeam();
    const level = JS_Filters.getLevel();
    const risk  = JS_Filters.getRiskLevel();

    if (team !== 'all')  rows = rows.filter(r => r.team === team);
    if (level !== 'all') rows = rows.filter(r => r.level === level);
    if (risk !== 'all')  rows = rows.filter(r => r.overallStatus === risk);

    return rows;
  },

  // ── Options for Select widgets ────────────────────────────────────────────

  // Dynamisch aus JS_Config.TEAMS (wird durch buildTeamsFromQuery befüllt)
  teamOptions() {
    const teams = JS_Config.TEAMS || {};
    const opts  = [{ label: 'Alle Teams', value: 'all' }];
    for (const [key, t] of Object.entries(teams)) {
      opts.push({ label: (t.emoji || '') + ' ' + t.label, value: key });
    }
    // Fallback: statische Optionen wenn Teams noch nicht geladen
    if (opts.length <= 1) {
      return [
        { label: 'Alle Teams', value: 'all'       },
        { label: '🐺 Wolves',  value: 'wolves'    },
        { label: '⚡ Titans',  value: 'titans'    },
        { label: '🔥 Locos',   value: 'locos'     },
      ];
    }
    return opts;
  },

  levelOptions() {
    return [
      { label: 'Alle Level',  value: 'all'    },
      { label: 'Level 3',     value: '3'      },
      { label: 'Level 2',     value: '2'      },
      { label: 'Level 1',     value: '1'      },
      { label: 'Ramp-up',     value: 'rampup' },
    ];
  },

  riskOptions() {
    return [
      { label: 'Alle Status',   value: 'all'    },
      { label: 'Kritisch',      value: 'red'    },
      { label: 'Warnung',       value: 'amber'  },
      { label: 'Gesund',        value: 'green'  },
    ];
  },

  quarterOptions() {
    const curr = JS_Config.currentQuarter();
    const opts = [{ label: 'Laufendes Quartal (' + curr.label + ')', value: curr.label }];
    // Vergangene Quartale mit gespeicherten Snapshots
    const knownQuarters = ['Q1 2026']; // wird erweitert wenn Snapshots existieren
    for (const q of knownQuarters) {
      if (q !== curr.label) {
        opts.push({ label: q, value: q });
      }
    }
    return opts;
  },

}
