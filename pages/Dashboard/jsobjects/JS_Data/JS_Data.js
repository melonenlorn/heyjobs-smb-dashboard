export default {

  // ── Safe record accessor ──────────────────────────────────────────────────
  _records(query) {
    try { return query.data.output.records || []; } catch(e) { return []; }
  },

  // ── Bookings per rep (rep-driven, QTD) ───────────────────────────────────
  bookingsByRep() {
    const map = {};
    JS_Data._records(Q_Bookings_QTD).forEach(r => {
      const id   = r.OwnerId;
      const name = r.Owner && r.Owner.Name ? r.Owner.Name : id;
      if (!map[id]) map[id] = { name, arr: 0, deals: 0, pilots: 0 };
      map[id].arr    += Number(r.Amount) || 0;
      map[id].deals  += 1;
      if ((Number(r.Winback_Pilot__c) || 0) > 0) map[id].pilots += 1;
    });
    return map;
  },

  // ── Self-service per rep (QTD) ────────────────────────────────────────────
  selfServiceByRep() {
    const map = {};
    JS_Data._records(Q_SelfService_QTD).forEach(r => {
      const id = r.OwnerId;
      if (!map[id]) map[id] = { arr: 0, deals: 0, pilots: 0 };
      map[id].arr   += Number(r.Amount) || 0;
      map[id].deals += 1;
      if ((Number(r.Winback_Pilot__c) || 0) > 0) map[id].pilots += 1;
    });
    return map;
  },

  // ── Open pipeline per rep ─────────────────────────────────────────────────
  pipelineByRep() {
    const map = {};
    JS_Data._records(Q_Pipeline_Open).forEach(r => {
      const id = r.OwnerId;
      if (!map[id]) map[id] = { arr: 0, opps: 0 };
      map[id].arr  += Number(r.Amount) || 0;
      map[id].opps += 1;
    });
    return map;
  },

  // ── Open pilots per rep ───────────────────────────────────────────────────
  openPilotsByRep() {
    const map = {};
    JS_Data._records(Q_Pilots_Open).forEach(r => {
      const id = r.OwnerId;
      if (!map[id]) map[id] = 0;
      map[id] += 1;
    });
    return map;
  },

  // ── Win / Loss per rep (last 90 days) ────────────────────────────────────
  winLossByRep() {
    const map = {};
    JS_Data._records(Q_WinLoss).forEach(r => {
      const id = r.OwnerId;
      if (!map[id]) map[id] = { won: 0, lost: 0 };
      if (r.IsWon) map[id].won += 1;
      else         map[id].lost += 1;
    });
    return map;
  },

  // ── Stale opps per rep ───────────────────────────────────────────────────
  staleByRep() {
    const allOpen = JS_Data._records(Q_Pipeline_Open);
    const stale   = JS_Data._records(Q_Stale_Pipeline);
    const totalMap = {};
    allOpen.forEach(r => {
      const id = r.OwnerId;
      totalMap[id] = (totalMap[id] || 0) + 1;
    });
    const staleMap = {};
    stale.forEach(r => {
      const id = r.OwnerId;
      staleMap[id] = (staleMap[id] || 0) + 1;
    });
    const result = {};
    Object.keys(totalMap).forEach(id => {
      result[id] = { stale: staleMap[id] || 0, total: totalMap[id] };
    });
    return result;
  },

  // ── Calls per rep (QTD) ───────────────────────────────────────────────────
  callsByRep() {
    const map = {};
    JS_Data._records(Q_Calls_QTD).forEach(r => {
      if (!map[r.OwnerId]) map[r.OwnerId] = { dials: 0, qualCalls: 0 };
      map[r.OwnerId].dials = Number(r.dialCount) || 0;
    });
    JS_Data._records(Q_QualCalls_QTD).forEach(r => {
      if (!map[r.OwnerId]) map[r.OwnerId] = { dials: 0, qualCalls: 0 };
      map[r.OwnerId].qualCalls = Number(r.qualCount) || 0;
    });
    return map;
  },

  // ── Meetings per rep (QTD, deduplicated via GROUP BY in SOQL) ────────────
  meetingsByRep() {
    const map = {};
    JS_Data._records(Q_Meetings_QTD).forEach(r => {
      map[r.OwnerId] = (map[r.OwnerId] || 0) + 1;
    });
    return map;
  },

  // ── Emails per rep (QTD) ──────────────────────────────────────────────────
  emailsByRep() {
    const map = {};
    JS_Data._records(Q_Emails_QTD).forEach(r => {
      map[r.OwnerId] = Number(r.emailCount) || 0;
    });
    return map;
  },

  // ── Opps created per rep (QTD) ────────────────────────────────────────────
  oppCreatedByRep() {
    const map = {};
    JS_Data._records(Q_Opps_Created_QTD).forEach(r => {
      map[r.CreatedById] = Number(r.oppCount) || 0;
    });
    return map;
  },

  // ── Demos per rep (QTD) ───────────────────────────────────────────────────
  demosByRep() {
    const map = {};
    JS_Data._records(Q_Demos_QTD).forEach(r => {
      map[r.OwnerId] = Number(r.demoCount) || 0;
    });
    return map;
  },

  // ── Activity weekly per rep (CW or PW) ───────────────────────────────────
  activityWeeklyByRep(period) {
    const map = {};
    const sfx = period === 'CW' ? '_CW' : '_PW';
    const callsQ     = period === 'CW' ? Q_Calls_CW     : Q_Calls_PW;
    const qualCallsQ = period === 'CW' ? Q_QualCalls_CW : Q_QualCalls_PW;
    const emailsQ    = period === 'CW' ? Q_Emails_CW    : Q_Emails_PW;
    const meetingsQ  = period === 'CW' ? Q_Meetings_CW  : Q_Meetings_PW;

    JS_Data._records(callsQ).forEach(r => {
      if (!map[r.OwnerId]) map[r.OwnerId] = { dials: 0, qualCalls: 0, emails: 0, meetings: 0 };
      map[r.OwnerId].dials = Number(r.dialCount) || 0;
    });
    JS_Data._records(qualCallsQ).forEach(r => {
      if (!map[r.OwnerId]) map[r.OwnerId] = { dials: 0, qualCalls: 0, emails: 0, meetings: 0 };
      map[r.OwnerId].qualCalls = Number(r.qualCount) || 0;
    });
    JS_Data._records(emailsQ).forEach(r => {
      if (!map[r.OwnerId]) map[r.OwnerId] = { dials: 0, qualCalls: 0, emails: 0, meetings: 0 };
      map[r.OwnerId].emails = Number(r.emailCount) || 0;
    });
    // meetings: count rows per OwnerId (deduplicated by GROUP BY in SOQL)
    JS_Data._records(meetingsQ).forEach(r => {
      if (!map[r.OwnerId]) map[r.OwnerId] = { dials: 0, qualCalls: 0, emails: 0, meetings: 0 };
      map[r.OwnerId].meetings = (map[r.OwnerId].meetings || 0) + 1;
    });
    return map;
  },

  // ── Quota per rep ─────────────────────────────────────────────────────────
  quotaByRep() {
    const users  = JS_Data._records(Q_Users_Team);
    const idToName = {};
    users.forEach(u => { idToName[u.Id] = u.Name; });

    const map = {};
    JS_Data._records(Q_Quotas).forEach(r => {
      const id  = r.QuotaOwnerId;
      const amt = Number(r.QuotaAmount) || 0;
      if (!map[id] || amt > map[id]) map[id] = amt;
    });
    return map;
  },

  // ── Build full KPI row for every rep ─────────────────────────────────────
  allRepKPIs() {
    const bookings   = JS_Data.bookingsByRep();
    const selfSvc    = JS_Data.selfServiceByRep();
    const pipeline   = JS_Data.pipelineByRep();
    const openPilots = JS_Data.openPilotsByRep();
    const winLoss    = JS_Data.winLossByRep();
    const staleData  = JS_Data.staleByRep();
    const calls      = JS_Data.callsByRep();
    const meetings   = JS_Data.meetingsByRep();
    const emails     = JS_Data.emailsByRep();
    const quotas     = JS_Data.quotaByRep();
    const oppCreated = JS_Data.oppCreatedByRep();
    const demos      = JS_Data.demosByRep();

    return JS_Config.ALL_REP_IDS.map(id => {
      const name         = (bookings[id] && bookings[id].name)
                         || (JS_Data._records(Q_Users_Team).find(u => u.Id === id) || {}).Name
                         || id;
      const bookingsARR  = (bookings[id] && bookings[id].arr)  || 0;
      const closedPilots = (bookings[id] && bookings[id].pilots) || 0;
      const selfSvcARR   = (selfSvc[id]  && selfSvc[id].arr)   || 0;
      const pipelineARR  = (pipeline[id] && pipeline[id].arr)  || 0;
      const totalOpen    = (pipeline[id] && pipeline[id].opps) || 0;
      // Bug 2 fix: use closed pilot deals (from bookings), not open pipeline
      // Bug A fix: also count SS pilots (Winback_Pilot__c > 0 from SS deals)
      const pilotenCount = closedPilots + ((selfSvc[id] && selfSvc[id].pilots) || 0);
      const wonCount     = (winLoss[id]   && winLoss[id].won)  || 0;
      const lostCount    = (winLoss[id]   && winLoss[id].lost) || 0;
      const staleCount   = (staleData[id] && staleData[id].stale) || 0;
      const bookingsTarget = quotas[id] || 0;

      // Bug 3 fix: pass total (rep+SS) as bookingsARR for attainment; zero out selfServiceARR
      // so coverage() doesn't double-subtract. selfSvcARR stored separately for display.
      const kpis = JS_Scoring.buildRepKPIs(name, {
        bookingsARR: bookingsARR + selfSvcARR, bookingsTarget, selfServiceARR: 0,
        openPipelineARR: pipelineARR, pilotenCount,
        wonCount, lostCount, staleCount, totalOpenCount: totalOpen,
      });

      return {
        id,
        ...kpis,
        closedPilots,
        wonCount,    // Bug 1 fix: expose for heroKPIs() sum
        lostCount,   // Bug 1 fix: expose for heroKPIs() sum
        dials:     (calls[id]    && calls[id].dials)    || 0,
        qualCalls: (calls[id]    && calls[id].qualCalls) || 0,
        meetings:  meetings[id]  || 0,
        emails:    emails[id]    || 0,
        oppCreated: oppCreated[id] || 0,
        demos:      demos[id]      || 0,
        selfSvcARR,
        pipelineARR,
        openOpps:  totalOpen,
        bookingsTarget,
      };
    });
  },

  // ── Team summary (aggregated across all reps of a team) ──────────────────
  teamSummary(teamKey) {
    const members = JS_Config.TEAMS[teamKey] && JS_Config.TEAMS[teamKey].reps || [];
    const reps    = JS_Data.allRepKPIs().filter(r => members.includes(r.repName));

    const sum = (field) => reps.reduce((s, r) => s + (r[field] || 0), 0);

    const bookingsARR    = sum('bookingsARR');
    const bookingsTarget = sum('bookingsTarget');
    const pipelineARR    = sum('pipelineARR');
    const selfSvcARR     = sum('selfSvcARR');
    const wonCount       = sum('wonCount');
    const lostCount      = sum('lostCount');

    return {
      teamKey,
      label:         JS_Config.TEAMS[teamKey].label,
      bookingsARR,
      bookingsTarget,
      bookingsAtt:   bookingsTarget > 0 ? Math.round((bookingsARR / bookingsTarget) * 100) : 0,
      pipelineARR,
      selfSvcARR,
      winRate:       JS_Scoring.winRate(wonCount, lostCount),
      staleCount:    sum('staleCount'),
      dials:         sum('dials'),
      qualCalls:     sum('qualCalls'),
      meetings:      sum('meetings'),
    };
  },

  // ── Full team dashboard (filtered, sorted worst-first) ───────────────────
  dashboardReps() {
    const all = JS_Data.allRepKPIs();
    const filtered = JS_Filters.applyFilters(all);
    // Sort: highest composite (TA%) first by default
    return filtered.sort((a, b) => (b.composite || 0) - (a.composite || 0));
  },

  // ── Stale pipeline list (for stale queue widget) ──────────────────────────
  staleList() {
    const today = new Date();
    return JS_Data._records(Q_Stale_Pipeline).map(r => {
      const last  = r.LastActivityDate ? new Date(r.LastActivityDate) : null;
      const days  = last ? Math.floor((today - last) / 86400000) : 999;
      return {
        id:       r.Id,
        name:     r.Name,
        account:  r.Account && r.Account.Name ? r.Account.Name : '—',
        rep:      r.Owner && r.Owner.Name ? r.Owner.Name : '—',
        ownerId:  r.OwnerId,
        arr:      Number(r.Amount) || 0,
        stage:    r.StageName,
        daysSinceActivity: days,
        ageBucket: days >= 30 ? '30d+' : days >= 21 ? '21–30d' : '14–21d',
      };
    }).sort((a, b) => b.arr - a.arr);
  },

  // ── KPI cards data (team-level aggregation for hero cards) ───────────────
  heroKPIs() {
    const reps = JS_Data.allRepKPIs();
    // Filter by active team filter
    const filtered = JS_Filters.applyFilters(reps);

    const sum  = (f) => filtered.reduce((s, r) => s + (r[f] || 0), 0);
    const avg  = (f) => filtered.length ? Math.round(sum(f) / filtered.length) : 0;

    const bookingsARR    = sum('bookingsARR');
    const bookingsTarget = sum('bookingsTarget');
    const pipelineARR    = sum('pipelineARR');
    const selfSvcARR     = sum('selfSvcARR');
    const wonCount       = sum('wonCount');
    const lostCount      = sum('lostCount');
    const staleCount     = sum('staleCount');
    const totalOpen      = sum('totalOpenCount');
    const dials          = sum('dials');
    const qualCalls      = sum('qualCalls');
    const meetings       = sum('meetings');
    const emails         = sum('emails');
    const oppCreated     = sum('oppCreated');
    const totalQT        = qualCalls + meetings;
    const repCount       = Math.max(1, filtered.length);
    const qtConv         = totalQT > 0 ? Math.round((oppCreated / totalQT) * 100) : 0;

    // WoW weekly data (team avg per rep)
    const cwMap = JS_Data.activityWeeklyByRep('CW');
    const pwMap = JS_Data.activityWeeklyByRep('PW');
    const cwSum = { dials: 0, qualCalls: 0, emails: 0, meetings: 0 };
    const pwSum = { dials: 0, qualCalls: 0, emails: 0, meetings: 0 };
    filtered.forEach(r => {
      const cw = cwMap[r.id] || {};
      const pw = pwMap[r.id] || {};
      cwSum.dials     += cw.dials     || 0;
      cwSum.qualCalls += cw.qualCalls || 0;
      cwSum.emails    += cw.emails    || 0;
      cwSum.meetings  += cw.meetings  || 0;
      pwSum.dials     += pw.dials     || 0;
      pwSum.qualCalls += pw.qualCalls || 0;
      pwSum.emails    += pw.emails    || 0;
      pwSum.meetings  += pw.meetings  || 0;
    });

    const bookingsAtt    = bookingsTarget > 0 ? Math.round((bookingsARR / bookingsTarget) * 100) : 0;
    const progress       = JS_Config.getQuarterProgress();
    const forecast       = progress > 0 ? Math.round(bookingsARR / progress) : bookingsARR;
    const coverage       = (() => {
      // bookingsARR already includes selfSvcARR (after Bug 3 fix), so don't subtract again
      const rem = bookingsTarget - bookingsARR;
      return rem > 0 ? Math.round((pipelineARR / rem) * 10) / 10 : 99;
    })();
    const winRate        = JS_Scoring.winRate(wonCount, lostCount);
    const staleRate      = totalOpen > 0 ? Math.round((staleCount / totalOpen) * 100) : 0;
    const qualConv       = dials > 0 ? Math.round(((qualCalls + meetings) / dials) * 100) : 0;

    return {
      progress,
      bookings: {
        arr:         bookingsARR,
        target:      bookingsTarget,
        attainment:  bookingsAtt,
        forecast,
        selfSvcARR,
        selfSvcPct:  bookingsTarget > 0 ? Math.round((selfSvcARR / bookingsTarget) * 100) : 0,
        status:      JS_Scoring.status('compositeAttainment', bookingsAtt),
      },
      coverage: {
        value:       coverage,
        pipelineARR,
        status:      JS_Scoring.status('coverage', coverage),
      },
      winRate: {
        value:       winRate,
        wonCount,
        lostCount,
        status:      JS_Scoring.status('winRate', winRate),
      },
      activity: {
        dials,
        qualCalls,
        meetings,
        emails,
        oppCreated,
        qtConv,
        qualConv,
        cw: {
          dials:     Math.round(cwSum.dials     / repCount),
          qualCalls: Math.round(cwSum.qualCalls / repCount),
          emails:    Math.round(cwSum.emails    / repCount),
          meetings:  Math.round(cwSum.meetings  / repCount),
        },
        pw: {
          dials:     Math.round(pwSum.dials     / repCount),
          qualCalls: Math.round(pwSum.qualCalls / repCount),
          emails:    Math.round(pwSum.emails    / repCount),
          meetings:  Math.round(pwSum.meetings  / repCount),
        },
      },
      stale: {
        value:       staleRate,
        staleCount,
        totalOpen,
        status:      JS_Scoring.status('staleRate', staleRate),
        list:        JS_Data.staleList().slice(0, 20),
      },
    };
  },

}
