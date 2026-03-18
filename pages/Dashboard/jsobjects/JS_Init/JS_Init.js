export default {

  // ── Run all queries in parallel on page load ──────────────────────────────
  // Mark this function as "Run on page load" in Appsmith.
  async initDashboard() {
    // Use allSettled so one failing query doesn't block the others
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
      Q_Users_Team.run(),
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
    ]);
  },

}
