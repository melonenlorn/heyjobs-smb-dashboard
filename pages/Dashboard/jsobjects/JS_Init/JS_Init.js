export default {

  // ── Run dashboard init on page load ──────────────────────────────────────
  // Mark this function as "Run on page load" in Appsmith.
  async initDashboard() {
    // Phase 1: Team-Struktur aus Salesforce laden — nur für laufendes Quartal nötig.
    // Für historische Quartale: statische Defaults (JS_Config.TEAMS/ALL_REP_IDS/ID_TO_NAME) verwenden,
    // weil historische Manager-IDs nicht mehr mit aktuellen SF-Daten übereinstimmen.
    const aq = JS_Config.getActiveQuarter();
    if (aq.isCurrent) {
      const teamQueryData = await Q_Users_Team.run();
      JS_Config.buildTeamsFromQuery(teamQueryData);
    }

    // Phase 2: Historisches Quartal → Daten kommen aus Snapshot (kein Query nötig)
    if (!aq.isCurrent) {
      await storeValue('_refreshTs', Date.now());
      return;
    }

    // Phase 3a: Kritische Queries parallel — alle Daten für die Hauptkarten
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
      Q_Demos_QTD.run(),
      Q_Quotas.run(),
      Q_Opps_Created_QTD.run(),
      Q_PilotOpps_QTD.run(),
      Q_Overdue_Pipeline.run(),
      Q_Overdue_Accounts.run(),
      // eslint-disable-next-line no-undef
      (typeof Q_Forecast_Commit !== 'undefined' ? Q_Forecast_Commit.run() : Promise.resolve()),
      // eslint-disable-next-line no-undef
      (typeof Q_Forecast_Commit_Pilots !== 'undefined' ? Q_Forecast_Commit_Pilots.run() : Promise.resolve()),
    ]);

    // Sofort rendern — Hauptkarten jetzt sichtbar
    await storeValue('_refreshTs', Date.now());

    // Phase 3b: Trend-Queries im Hintergrund (CW/PW/L30/L90 — nicht für Hauptkarten nötig)
    await Promise.allSettled([
      Q_Calls_CW.run(),
      Q_Calls_PW.run(),
      Q_QualCalls_CW.run(),
      Q_QualCalls_PW.run(),
      Q_Emails_CW.run(),
      Q_Emails_PW.run(),
      Q_Meetings_CW.run(),
      Q_Meetings_PW.run(),
      Q_Calls_L30.run(),
      Q_QualCalls_L30.run(),
      Q_Emails_L30.run(),
      Q_Meetings_L30.run(),
      Q_Opps_L30.run(),
      // eslint-disable-next-line no-undef
      (typeof Q_Tasks_L90 !== 'undefined' ? Q_Tasks_L90.run() : Promise.resolve()),
      // eslint-disable-next-line no-undef
      (typeof Q_Events_L90 !== 'undefined' ? Q_Events_L90.run() : Promise.resolve()),
      // eslint-disable-next-line no-undef
      (typeof Q_Task_BK_L90 !== 'undefined' ? Q_Task_BK_L90.run() : Promise.resolve()),
      // eslint-disable-next-line no-undef
      (typeof Q_Event_BK_L90 !== 'undefined' ? Q_Event_BK_L90.run() : Promise.resolve()),
    ]);

    // Phase 4: Auto-Snapshot + finales Re-Render (jetzt auch Trenddaten sichtbar)
    await JS_Init.saveSnapshot();
    await storeValue('_refreshTs', Date.now());

    // Phase 5: Filter-Ping-Pong — erzwingt Widget-Re-Evaluierung nach initialem Load.
    // Hintergrund: Appsmith reagiert auf storeValue('_refreshTs') nicht zuverlässig
    // beim ersten Page-Load. Ein kurzes Toggle des filterTeam-Stores triggert das
    // nötige Re-Render sicher (entspricht manuellem Wolves→Alle-Klick des Nutzers).
    const _currentTeam = appsmith.store.filterTeam || 'all';
    await storeValue('filterTeam', '__init__');
    await storeValue('filterTeam', _currentTeam);
  },

  // ── Snapshot für aktuelles Quartal speichern ──────────────────────────────
  // Wird automatisch nach jedem Query-Load aufgerufen — kein manueller Button nötig.
  // Speichert Rohdaten aller Queries persistent im Appsmith Store (localStorage).
  // Wird übersprungen wenn der letzte Snapshot < 30 Min alt ist (schnellere Folge-Loads).
  async saveSnapshot() {
    const aq  = JS_Config.getActiveQuarter();
    const key = 'snap_' + aq.label.replace(' ', '_');

    // Cache: Skip wenn Snapshot < 30 Min alt
    const existing = appsmith.store[key];
    if (existing && existing.savedAt && (Date.now() - existing.savedAt) < 30 * 60 * 1000) {
      return;
    }

    const snapshot = {
      quarter:      aq.label,
      snapshotDate: JS_Config._localStr(new Date()),
      savedAt:      Date.now(),
      version:      2,
      queries: {
        Q_Bookings_QTD:     JS_Data._r('Q_Bookings_QTD'),
        Q_SelfService_QTD:  JS_Data._r('Q_SelfService_QTD'),
        Q_Pipeline_Open:    JS_Data._r('Q_Pipeline_Open'),
        Q_Pilots_Open:      JS_Data._r('Q_Pilots_Open'),
        Q_Stale_Pipeline:   JS_Data._r('Q_Stale_Pipeline'),
        Q_WinLoss:          JS_Data._r('Q_WinLoss'),
        Q_Calls_QTD:        JS_Data._r('Q_Calls_QTD'),
        Q_QualCalls_QTD:    JS_Data._r('Q_QualCalls_QTD'),
        Q_Emails_QTD:       JS_Data._r('Q_Emails_QTD'),
        Q_Meetings_QTD:     JS_Data._r('Q_Meetings_QTD'),
        Q_Quotas:           JS_Data._r('Q_Quotas'),
        Q_Opps_Created_QTD: JS_Data._r('Q_Opps_Created_QTD'),
        Q_PilotOpps_QTD:    JS_Data._r('Q_PilotOpps_QTD'),
        Q_Demos_QTD:        JS_Data._r('Q_Demos_QTD'),
        Q_Calls_CW:         JS_Data._r('Q_Calls_CW'),
        Q_Calls_PW:         JS_Data._r('Q_Calls_PW'),
        Q_QualCalls_CW:     JS_Data._r('Q_QualCalls_CW'),
        Q_QualCalls_PW:     JS_Data._r('Q_QualCalls_PW'),
        Q_Emails_CW:        JS_Data._r('Q_Emails_CW'),
        Q_Emails_PW:        JS_Data._r('Q_Emails_PW'),
        Q_Meetings_CW:      JS_Data._r('Q_Meetings_CW'),
        Q_Meetings_PW:      JS_Data._r('Q_Meetings_PW'),
        Q_Calls_L30:        JS_Data._r('Q_Calls_L30'),
        Q_QualCalls_L30:    JS_Data._r('Q_QualCalls_L30'),
        Q_Emails_L30:       JS_Data._r('Q_Emails_L30'),
        Q_Meetings_L30:     JS_Data._r('Q_Meetings_L30'),
        Q_Opps_L30:         JS_Data._r('Q_Opps_L30'),
        Q_Overdue_Pipeline: JS_Data._r('Q_Overdue_Pipeline'),
        Q_Overdue_Accounts: JS_Data._r('Q_Overdue_Accounts'),
        Q_Forecast_Commit:        JS_Data._r('Q_Forecast_Commit'),
        Q_Forecast_Commit_Pilots: JS_Data._r('Q_Forecast_Commit_Pilots'),
      },
    };

    // true = persist across sessions (Appsmith localStorage)
    await storeValue(key, snapshot, true);
  },

}
