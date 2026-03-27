export default {

  // ── Run on Trends page load ────────────────────────────────────────────────
  // Mark "initTrends" as "Run on page load" in Appsmith.
  async initTrends() {
    await Promise.allSettled([
      Q_Trends_Bookings.run(),
      Q_Trends_Pilots.run(),
      Q_Trends_Calls.run(),
      Q_Trends_QualCalls.run(),
      Q_Trends_Emails.run(),
      Q_Trends_Meetings.run(),
      Q_Trends_WinLoss.run(),
      Q_Trends_OppsCreated.run(),
    ]);
    // Signal: zwingt Trends-Widget defaultModel zur Re-Evaluierung
    await storeValue('_trendsTs', Date.now());
  },

}
