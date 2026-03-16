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
  teamOptions() {
    return [
      { label: 'Alle Teams', value: 'all' },
      { label: 'Ferdinand', value: 'ferdinand' },
      { label: 'Jan',       value: 'jan'       },
      { label: 'Philipp',   value: 'philipp'   },
    ];
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

}
