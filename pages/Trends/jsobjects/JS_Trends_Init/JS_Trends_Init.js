export default {

  // ── Run on Trends page load ────────────────────────────────────────────────
  // WICHTIG: "initTrends" in Appsmith UI als "Run on page load" markieren!
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
