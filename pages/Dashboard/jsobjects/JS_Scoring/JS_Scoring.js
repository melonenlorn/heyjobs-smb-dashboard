export default {

  // ── Composite attainment for a rep ───────────────────────────────────────
  compositeAttainment(bookingsARR, bookingsTarget, pilotenCount, repName) {
    const config = JS_Config.levelConfig(repName);
    if (!bookingsTarget || bookingsTarget === 0) return null;

    const bookingsAtt = Math.round((bookingsARR / bookingsTarget) * 100);
    const pilotenTgt  = config.pilotenTarget;
    const pilotenAtt  = pilotenTgt > 0 ? Math.round((pilotenCount / pilotenTgt) * 100) : 0;

    return {
      composite:    Math.round(bookingsAtt * config.bookingsWeight + pilotenAtt * config.pilotenWeight),
      bookingsAtt,
      pilotenAtt,
      bookingsARR,
      bookingsTarget,
      pilotenCount,
      pilotenTarget: pilotenTgt,
    };
  },

  // ── Run rate forecast ─────────────────────────────────────────────────────
  // forecasts full-quarter bookings based on days elapsed
  runRateForecast(bookingsARR, selfServiceARR) {
    const progress = JS_Config.getQuarterProgress();
    if (progress <= 0) return bookingsARR;
    const repDrivenRate = (bookingsARR - selfServiceARR) / progress;
    return Math.round(repDrivenRate + selfServiceARR);
  },

  // ── Pipeline coverage ────────────────────────────────────────────────────
  // openPipeline / remainingTarget (rep-driven portion)
  coverage(openPipelineARR, bookingsARR, bookingsTarget, selfServiceARR) {
    const remaining = bookingsTarget - bookingsARR - selfServiceARR;
    if (remaining <= 0) return 99;
    return Math.round((openPipelineARR / remaining) * 10) / 10;
  },

  // ── Win rate ─────────────────────────────────────────────────────────────
  winRate(wonCount, lostCount) {
    const total = wonCount + lostCount;
    if (total === 0) return 0;
    return Math.round((wonCount / total) * 100);
  },

  // ── Stale rate ────────────────────────────────────────────────────────────
  staleRate(staleCount, totalOpenCount) {
    if (totalOpenCount === 0) return 0;
    return Math.round((staleCount / totalOpenCount) * 100);
  },

  // ── Traffic light status ─────────────────────────────────────────────────
  status(kpi, value) {
    const t = JS_Config.THRESHOLDS[kpi];
    if (!t || value === null || value === undefined) return 'neutral';
    // Stale rate: lower is better (inverted)
    if (kpi === 'staleRate') {
      if (value <= t.green) return 'green';
      if (value <= t.amber) return 'amber';
      return 'red';
    }
    if (value >= t.green) return 'green';
    if (value >= t.amber) return 'amber';
    return 'red';
  },

  statusLabel(status) {
    return { green: 'Gesund', amber: 'Warnung', red: 'Kritisch', neutral: '—' }[status] || '—';
  },

  statusColor(status) {
    return { green: '#58cc02', amber: '#ff9600', red: '#ff4b4b', neutral: '#6e6e88' }[status] || '#6e6e88';
  },

  // ── Root cause diagnosis ─────────────────────────────────────────────────
  diagnose(repKPIs) {
    const s = (kpi, val) => JS_Scoring.status(kpi, val);
    const checks = [
      { cond: s('coverage', repKPIs.coverage) === 'red',            cause: 'Coverage-Problem',      severity: 3 },
      { cond: s('winRate',  repKPIs.winRate)  === 'red',            cause: 'Conversion-Problem',     severity: 3 },
      { cond: s('staleRate',repKPIs.staleRate) === 'red',           cause: 'Pipeline-Hygiene',       severity: 2 },
      { cond: s('coverage', repKPIs.coverage) === 'amber',          cause: 'Coverage knapp',         severity: 1 },
      { cond: s('staleRate',repKPIs.staleRate) === 'amber',         cause: 'Pipeline-Review nötig',  severity: 1 },
    ];
    const issues = checks.filter(c => c.cond).sort((a, b) => b.severity - a.severity);
    return issues.length ? issues[0] : { cause: 'Kein Handlungsbedarf', severity: 0 };
  },

  // ── Build full KPI row for one rep ───────────────────────────────────────
  // Call this after all queries have loaded.
  buildRepKPIs(repName, data) {
    const {
      bookingsARR    = 0,
      bookingsTarget = 0,
      selfServiceARR = 0,
      openPipelineARR = 0,
      pilotenCount   = 0,
      wonCount       = 0,
      lostCount      = 0,
      staleCount     = 0,
      totalOpenCount = 0,
    } = data;

    const attainment  = JS_Scoring.compositeAttainment(bookingsARR, bookingsTarget, pilotenCount, repName);
    const coverageVal = JS_Scoring.coverage(openPipelineARR, bookingsARR, bookingsTarget, selfServiceARR);
    const winRateVal  = JS_Scoring.winRate(wonCount, lostCount);
    const staleRateVal = JS_Scoring.staleRate(staleCount, totalOpenCount);
    const forecast    = JS_Scoring.runRateForecast(bookingsARR, selfServiceARR);

    return {
      repName,
      level: JS_Config.REP_LEVELS[repName] || '2',
      team:  JS_Config.teamForRep(repName),

      // Attainment
      ...(attainment || {}),
      forecast,

      // Pipeline
      coverageVal,
      coverageStatus: JS_Scoring.status('coverage', coverageVal),

      // Win rate
      winRateVal,
      winRateStatus: JS_Scoring.status('winRate', winRateVal),

      // Stale
      staleRateVal,
      staleRateStatus: JS_Scoring.status('staleRate', staleRateVal),

      // Overall status = worst of the KPIs
      overallStatus: (() => {
        const statuses = [
          JS_Scoring.status('compositeAttainment', attainment?.composite),
          JS_Scoring.status('coverage', coverageVal),
          JS_Scoring.status('winRate', winRateVal),
          JS_Scoring.status('staleRate', staleRateVal),
        ];
        if (statuses.includes('red'))   return 'red';
        if (statuses.includes('amber')) return 'amber';
        return 'green';
      })(),

      // Diagnosis
      rootCause: JS_Scoring.diagnose({ coverage: coverageVal, winRate: winRateVal, staleRate: staleRateVal }),
    };
  },

}
