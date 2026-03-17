export default {

  // ── Run all queries in parallel on page load ──────────────────────────────
  // Mark this function as "Run on page load" in Appsmith.
  async initDashboard() {
    await Promise.all([
      Q_Bookings_QTD.run(),
      Q_SelfService_QTD.run(),
      Q_Pipeline_Open.run(),
      Q_Pilots_Open.run(),
      Q_Stale_Pipeline.run(),
      Q_WinLoss.run(),
      Q_Calls_QTD.run(),
      Q_Emails_QTD.run(),
      Q_Meetings_QTD.run(),
      Q_Quotas.run(),
      Q_Users_Team.run(),
    ]);
  },

}
