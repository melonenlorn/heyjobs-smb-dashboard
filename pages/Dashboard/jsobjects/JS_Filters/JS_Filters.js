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
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const currentYear = now.getFullYear();

  // Determine current quarter label (prefer JS_Config if available)
  let currentLabel = `Q${currentQuarter} ${currentYear}`;
  try {
    const configLabel = JS_Config.currentQuarter().label;
    if (configLabel) currentLabel = configLabel;
  } catch (e) {}

  // Initialize options with the current quarter
  const opts = [{ label: `Laufendes Quartal (${currentLabel})`, value: currentLabel }];
  const seen = { [currentLabel]: true };

  // Add previous quarter
  const prevQuarter = currentQuarter - 1 < 1 ? 4 : currentQuarter - 1;
  const prevYear = currentQuarter - 1 < 1 ? currentYear - 1 : currentYear;
  const prevLabel = `Q${prevQuarter} ${prevYear}`;

  if (!seen[prevLabel]) {
    opts.push({ label: `${prevLabel} · EoQ`, value: prevLabel });
    seen[prevLabel] = true;
  }

  // Add any stored snapshots as additional quarter options
  try {
    const storeKeys = Object.keys(appsmith.store || {});

    for (const key of storeKeys) {
      if (key.startsWith('snap_')) {
        const label = key.replace('snap_', '').replace('_', ' ');

        if (!seen[label]) {
          opts.push({ label: `${label} · EoQ`, value: label });
          seen[label] = true;
        }
      }
    }
  } catch (e) {}

  return opts;
},

}
