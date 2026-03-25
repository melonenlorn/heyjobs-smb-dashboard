export default {

  // ── Run dashboard init on page load ──────────────────────────────────────
  // Mark this function as "Run on page load" in Appsmith.
  async initDashboard() {
    // Phase 1: Team-Struktur dynamisch aus Salesforce laden
    await Q_Users_Team.run();
    JS_Config.buildTeamsFromQuery();

    // Snapshot-Check: Fehlt ein Snapshot für das letzte abgeschlossene Quartal?
    const curr  = JS_Config.currentQuarter();
    const prevQ = JS_Config.previousQuarterLabel();
    // Nur wenn ein vergangenes Quartal existiert
    if (prevQ !== curr.label) {
      const snapKey = 'snap_' + prevQ.replace(' ', '_');
      const hasSnap = !!(appsmith.store[snapKey]);
      if (!hasSnap) {
        storeValue('missingSnapshot', prevQ);
      } else {
        storeValue('missingSnapshot', null);
      }
    }

    // Phase 2: Historisches Quartal → nur Snapshot, keine Live-Queries
    const aq = JS_Config.getActiveQuarter();
    if (!aq.isCurrent) {
      return; // JS_Data liest direkt aus appsmith.store
    }

    // Phase 2: Laufendes Quartal → alle Daten-Queries parallel
    await Promise.allSettled([
      Q_Bookings_QTD.run(),
      Q_SelfService_QTD.run(),
      Q_Pipeline_Open.run(),
      Q_Pilots_Open.run(),
      Q_Stale_Pipeline.run(),
      Q_WinLoss.run(),
      Q_Calls_QTD.run(),
      Q_QualCalls_QTD.run(),
      Q_Emails_QTD.run(),
      Q_Meetings_QTD.run(),
      Q_Quotas.run(),
      Q_Opps_Created_QTD.run(),
      Q_Calls_CW.run(),
      Q_Calls_PW.run(),
      Q_QualCalls_CW.run(),
      Q_QualCalls_PW.run(),
      Q_Emails_CW.run(),
      Q_Emails_PW.run(),
      Q_Meetings_CW.run(),
      Q_Meetings_PW.run(),
      Q_Demos_QTD.run(),
      Q_Calls_L30.run(),
      Q_QualCalls_L30.run(),
      Q_Emails_L30.run(),
      Q_Meetings_L30.run(),
      Q_Opps_L30.run(),
      Q_Overdue_Pipeline.run(),
      Q_Overdue_Accounts.run(),
      Q_PilotOpps_QTD.run(),
    ]);
  },

  // ── Snapshot für aktuelles (oder aktives) Quartal erstellen ──────────────
  // Speichert alle KPI-Daten persistent im Appsmith Store (localStorage).
  async createSnapshot() {
    const aq   = JS_Config.getActiveQuarter();
    const reps = JS_Data.allRepKPIs();
    const hero = JS_Data.heroKPIs();
    const teams = {};
    for (const [key, t] of Object.entries(JS_Config.TEAMS || {})) {
      teams[key] = { label: t.label, emoji: t.emoji, tlId: t.tlId, reps: t.reps };
    }

    const snapshot = {
      quarter:      aq.label,
      snapshotDate: JS_Config._localStr(new Date()),
      version:      1,
      teams,
      reps,
      heroKPIs: hero,
    };

    const snapKey = 'snap_' + aq.label.replace(' ', '_');
    // true = persist across sessions (localStorage)
    await storeValue(snapKey, snapshot, true);
    await storeValue('missingSnapshot', null);

    showAlert('Snapshot für ' + aq.label + ' gespeichert ✓', 'success');
    return snapshot;
  },

  // ── Snapshot für ein Quartal laden ────────────────────────────────────────
  loadSnapshot(quarterLabel) {
    const snapKey = 'snap_' + quarterLabel.replace(' ', '_');
    return appsmith.store[snapKey] || null;
  },

}
