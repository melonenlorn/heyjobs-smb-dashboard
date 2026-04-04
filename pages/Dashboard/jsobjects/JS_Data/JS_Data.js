export default {

  // ── Safe record accessor (live mode only, kept for backward compat) ─────
  _records(query) {
    try { return query.data.output.records || []; } catch(e) { return []; }
  },

  // ── Dualmode record accessor: live or snapshot ───────────────────────────
  _r(queryName) {
    const aq = JS_Config.getActiveQuarter();
    if (!aq.isCurrent) {
      // 1. Git-committed snapshot (update_quarter.py)
      try {
        const snap = JS_Snapshots.data[aq.label];
        if (snap && snap.queries && snap.queries[queryName] && snap.queries[queryName].length > 0) {
          return snap.queries[queryName];
        }
      } catch(e) {}
      // 2. Appsmith Store snapshot (auto-saved on page load)
      try {
        const snapKey = 'snap_' + aq.label.replace(' ', '_');
        const snap = appsmith.store[snapKey];
        if (snap && snap.queries && snap.queries[queryName] && snap.queries[queryName].length > 0) {
          return snap.queries[queryName];
        }
      } catch(e) {}
      return [];
    }
    // Live mode: lookup query by name
    const liveMap = {
      Q_Bookings_QTD: Q_Bookings_QTD, Q_SelfService_QTD: Q_SelfService_QTD,
      Q_Pipeline_Open: Q_Pipeline_Open, Q_Pilots_Open: Q_Pilots_Open,
      Q_Stale_Pipeline: Q_Stale_Pipeline, Q_WinLoss: Q_WinLoss,
      Q_Calls_QTD: Q_Calls_QTD, Q_QualCalls_QTD: Q_QualCalls_QTD,
      Q_Emails_QTD: Q_Emails_QTD, Q_Meetings_QTD: Q_Meetings_QTD,
      Q_Quotas: Q_Quotas, Q_Users_Team: Q_Users_Team,
      Q_Opps_Created_QTD: Q_Opps_Created_QTD, Q_PilotOpps_QTD: Q_PilotOpps_QTD,
      Q_Demos_QTD: Q_Demos_QTD, Q_Calls_CW: Q_Calls_CW, Q_Calls_PW: Q_Calls_PW,
      Q_QualCalls_CW: Q_QualCalls_CW, Q_QualCalls_PW: Q_QualCalls_PW,
      Q_Emails_CW: Q_Emails_CW, Q_Emails_PW: Q_Emails_PW,
      Q_Meetings_CW: Q_Meetings_CW, Q_Meetings_PW: Q_Meetings_PW,
      Q_Calls_L30: Q_Calls_L30, Q_QualCalls_L30: Q_QualCalls_L30,
      Q_Emails_L30: Q_Emails_L30, Q_Meetings_L30: Q_Meetings_L30,
      Q_Opps_L30: Q_Opps_L30, Q_Overdue_Pipeline: Q_Overdue_Pipeline,
      Q_Overdue_Accounts: Q_Overdue_Accounts,
      // eslint-disable-next-line no-undef
      Q_Forecast_Commit: typeof Q_Forecast_Commit !== 'undefined' ? Q_Forecast_Commit : null,
      // eslint-disable-next-line no-undef
      Q_Forecast_Commit_Pilots: typeof Q_Forecast_Commit_Pilots !== 'undefined' ? Q_Forecast_Commit_Pilots : null,
      Q_Tasks_L90: typeof Q_Tasks_L90 !== 'undefined' ? Q_Tasks_L90 : null,
      Q_Events_L90: typeof Q_Events_L90 !== 'undefined' ? Q_Events_L90 : null,
      Q_Acct_First_Close: typeof Q_Acct_First_Close !== 'undefined' ? Q_Acct_First_Close : null,
      Q_Task_BK_L90:  typeof Q_Task_BK_L90  !== 'undefined' ? Q_Task_BK_L90  : null,
      Q_Event_BK_L90: typeof Q_Event_BK_L90 !== 'undefined' ? Q_Event_BK_L90 : null,
    };
    const q = liveMap[queryName];
    if (!q) return [];
    try { return q.data.output.records || []; } catch(e) { return []; }
  },

  // ── Bookings per rep (rep-driven, QTD) ───────────────────────────────────
  bookingsByRep() {
    const map = {};
    JS_Data._r('Q_Bookings_QTD').forEach(r => {
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
    JS_Data._r('Q_SelfService_QTD').forEach(r => {
      const id = r.OwnerId;
      if (!map[id]) map[id] = { arr: 0, deals: 0, pilots: 0 };
      map[id].arr   += Number(r.Amount) || 0;
      map[id].deals += 1;
      if ((Number(r.Winback_Pilot__c) || 0) > 0) map[id].pilots += 1;
    });
    return map;
  },

  // ── Open pipeline per rep (with segmentation + new-this-week) ───────────
  pipelineByRep() {
    const now = new Date();
    const map = {};
    JS_Data._r('Q_Pipeline_Open').forEach(r => {
      const id   = r.OwnerId;
      const arr  = Number(r.Amount) || 0;
      const bk12 = Number((r.Account && r.Account.Bookings_last_12_months__c) || 0);
      const isNew = r.CreatedDate && (Math.floor((now - new Date(r.CreatedDate)) / 86400000) < 7);
      if (!map[id]) map[id] = { arr: 0, opps: 0, pilotArr: 0, pilotOpps: 0, bestandArr: 0, bestandOpps: 0, newArr: 0, newOpps: 0 };
      map[id].arr  += arr;
      map[id].opps += 1;
      if (bk12 === 0) {
        map[id].pilotArr  += arr;
        map[id].pilotOpps += 1;
      } else {
        map[id].bestandArr  += arr;
        map[id].bestandOpps += 1;
      }
      if (isNew) {
        map[id].newArr  += arr;
        map[id].newOpps += 1;
      }
    });
    return map;
  },

  // ── Pipeline WoW movement per rep (won/lost this week from Q_WinLoss) ────
  pipelineMovementByRep() {
    const now = new Date();
    const _dow = (now.getDay() + 6) % 7; // 0=Mon, 6=Sun
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - _dow);
    const isThisWeek = (ts) => ts && new Date(ts) >= startOfWeek;
    const map = {};
    JS_Data._r('Q_WinLoss').forEach(r => {
      const id  = r.OwnerId;
      const arr = Number(r.Amount) || 0;
      if (!map[id]) map[id] = { wonCW: 0, wonCWArr: 0, lostCW: 0, lostCWArr: 0 };
      if (r.IsWon) {
        const ts = r.dateTimestampContractreceived__c || r.CloseDate;
        if (isThisWeek(ts)) { map[id].wonCW += 1; map[id].wonCWArr += arr; }
      } else {
        if (r.RecordType && r.RecordType.Name === 'Second Purchase') return;
        if (isThisWeek(r.CloseDate)) { map[id].lostCW += 1; map[id].lostCWArr += arr; }
      }
    });
    return map;
  },

  // ── Open pilots per rep ───────────────────────────────────────────────────
  openPilotsByRep() {
    const map = {};
    JS_Data._r('Q_Pilots_Open').forEach(r => {
      const id = r.OwnerId;
      if (!map[id]) map[id] = 0;
      map[id] += 1;
    });
    return map;
  },

  // ── Win / Loss per rep (last 90 days, excl. Self-Service) ───────────────
  winLossByRep() {
    const map = {};
    JS_Data._r('Q_WinLoss').forEach(r => {
      if (r.RecordType && r.RecordType.Name === 'Customer Self Service') return;
      const id = r.OwnerId;
      if (!map[id]) map[id] = { won: 0, lost: 0 };
      if (r.IsWon) map[id].won += 1;
      else         map[id].lost += 1;
    });
    return map;
  },

  // ── Stale opps per rep ───────────────────────────────────────────────────
  staleByRep() {
    const allOpen = JS_Data._r('Q_Pipeline_Open');
    const stale   = JS_Data._r('Q_Stale_Pipeline');
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

  // ── Overdue opps per rep (CloseDate < today, still open) ─────────────────
  overdueByRep() {
    const map = {};
    JS_Data._r('Q_Overdue_Pipeline').forEach(r => {
      const id = r.OwnerId;
      if (!map[id]) map[id] = { count: 0, arr: 0 };
      map[id].count += 1;
      map[id].arr   += Number(r.Amount) || 0;
    });
    return map;
  },

  // ── Calls per rep (QTD) ───────────────────────────────────────────────────
  callsByRep() {
    const map = {};
    JS_Data._r('Q_Calls_QTD').forEach(r => {
      if (!map[r.OwnerId]) map[r.OwnerId] = { dials: 0, qualCalls: 0 };
      map[r.OwnerId].dials = Number(r.dialCount) || 0;
    });
    JS_Data._r('Q_QualCalls_QTD').forEach(r => {
      if (!map[r.OwnerId]) map[r.OwnerId] = { dials: 0, qualCalls: 0 };
      map[r.OwnerId].qualCalls = Number(r.qualCount) || 0;
    });
    return map;
  },

  // ── Meetings per rep (QTD, deduplicated via GROUP BY in SOQL) ────────────
  meetingsByRep() {
    const map = {};
    JS_Data._r('Q_Meetings_QTD').forEach(r => {
      map[r.OwnerId] = (map[r.OwnerId] || 0) + 1;
    });
    return map;
  },

  // ── Emails per rep (QTD) ──────────────────────────────────────────────────
  emailsByRep() {
    const map = {};
    JS_Data._r('Q_Emails_QTD').forEach(r => {
      map[r.OwnerId] = Number(r.emailCount) || 0;
    });
    return map;
  },

  // ── Opps created per rep (QTD) ────────────────────────────────────────────
  oppCreatedByRep() {
    const map = {};
    JS_Data._r('Q_Opps_Created_QTD').forEach(r => {
      map[r.CreatedById] = Number(r.oppCount) || 0;
    });
    return map;
  },

  // ── Pilot Opps per rep (Accounts with no prior bookings, QTD) ─────────────
  pilotOppsByRep() {
    const map = {};
    JS_Data._r('Q_PilotOpps_QTD').forEach(r => {
      map[r.CreatedById] = Number(r.oppCount) || 0;
    });
    return map;
  },

  // ── Demos per rep (QTD) ───────────────────────────────────────────────────
  demosByRep() {
    const map = {};
    JS_Data._r('Q_Demos_QTD').forEach(r => {
      map[r.OwnerId] = Number(r.demoCount) || 0;
    });
    return map;
  },

  // ── 30-day rolling activity per rep (with off-day filtering) ────────────
  activityL30ByRep() {
    // Pre-aggregated detection: Git-Snapshots (update_quarter.py) store L30 queries already
    // summed per rep with no ActivityDate. Live queries and appsmith.store snaps have per-day
    // records with ActivityDate. Handle both formats.
    const callsData = JS_Data._r('Q_Calls_L30');
    if (callsData.length > 0 && callsData[0].ActivityDate === undefined) {
      // Pre-aggregated format: field "dialCount" (not "dials"), no ActivityDate.
      // Q_Meetings_L30 has individual meeting records (each row = 1 meeting).
      // Use fixed 22-workday denominator instead of active-day detection.
      const L30_DAYS = 22;
      const totals = {};
      const init = id => { if (!totals[id]) totals[id] = { dials: 0, qc: 0, emails: 0, mtg: 0 }; return totals[id]; };
      callsData.forEach(r                       => { init(r.OwnerId).dials  += Number(r.dialCount)  || 0; });
      JS_Data._r('Q_QualCalls_L30').forEach(r  => { init(r.OwnerId).qc     += Number(r.qualCount)  || 0; });
      JS_Data._r('Q_Emails_L30').forEach(r     => { init(r.OwnerId).emails += Number(r.emailCount) || 0; });
      JS_Data._r('Q_Meetings_L30').forEach(r   => { init(r.OwnerId).mtg    += 1; });
      const result = {};
      Object.entries(totals).forEach(([id, d]) => {
        const n = L30_DAYS;
        const touch   = d.dials + d.emails;
        const qualTch = d.qc + d.mtg;
        result[id] = {
          activeDays:        n,
          touchPerDay:       Math.round(touch   / n * 10) / 10,
          qualTouchPerDay:   Math.round(qualTch / n * 10) / 10,
          dialsPerDay:       Math.round(d.dials  / n * 10) / 10,
          emailsPerDay:      Math.round(d.emails / n * 10) / 10,
          qualCallsPerDay:   Math.round(d.qc     / n * 10) / 10,
          meetingsPerDay:    Math.round(d.mtg    / n * 10) / 10,
          callTimeMinPerDay: 0,
          touchToQual: touch > 0 ? Math.round((qualTch / touch) * 100) : 0,
        };
      });
      return result;
    }

    const dayMap = {};
    const ensure = (id, date) => {
      if (!dayMap[id]) dayMap[id] = {};
      if (!dayMap[id][date]) dayMap[id][date] = { dials: 0, qualCalls: 0, emails: 0, meetings: 0, callTimeSec: 0 };
      return dayMap[id][date];
    };

    JS_Data._r('Q_Calls_L30').forEach(r => {
      const d = ensure(r.OwnerId, r.ActivityDate);
      d.dials = Number(r.dials) || 0;
      d.callTimeSec = Number(r.callTimeSec) || 0;
    });
    JS_Data._r('Q_QualCalls_L30').forEach(r => {
      const d = ensure(r.OwnerId, r.ActivityDate);
      d.qualCalls = Number(r.qualCount) || 0;
    });
    JS_Data._r('Q_Emails_L30').forEach(r => {
      const d = ensure(r.OwnerId, r.ActivityDate);
      d.emails = Number(r.emailCount) || 0;
    });
    JS_Data._r('Q_Meetings_L30').forEach(r => {
      const d = ensure(r.OwnerId, r.ActivityDate);
      d.meetings = Number(r.meetingCount) || 0;
    });

    const isOff = (day) =>
      day.dials <= 2 && day.emails <= 2 && (day.qualCalls + day.meetings) <= 1;

    const result = {};
    Object.entries(dayMap).forEach(([repId, days]) => {
      let ad = 0, totDials = 0, totQC = 0, totEmails = 0, totMtg = 0, totCallTime = 0;
      Object.values(days).forEach(day => {
        if (!isOff(day)) {
          ad++;
          totDials    += day.dials;
          totQC       += day.qualCalls;
          totEmails   += day.emails;
          totMtg      += day.meetings;
          totCallTime += day.callTimeSec;
        }
      });
      const n = Math.max(1, ad);
      const touch   = totDials + totEmails;
      const qualTch = totQC + totMtg;
      result[repId] = {
        activeDays:        ad,
        touchPerDay:       Math.round(touch   / n * 10) / 10,
        qualTouchPerDay:   Math.round(qualTch / n * 10) / 10,
        dialsPerDay:       Math.round(totDials  / n * 10) / 10,
        emailsPerDay:      Math.round(totEmails / n * 10) / 10,
        qualCallsPerDay:   Math.round(totQC     / n * 10) / 10,
        meetingsPerDay:    Math.round(totMtg    / n * 10) / 10,
        callTimeMinPerDay: Math.round(totCallTime / n / 60 * 10) / 10,
        touchToQual:   touch  > 0 ? Math.round((qualTch / touch)  * 100) : 0,
      };
    });
    return result;
  },

  // ── Unique accounts touched per rep (L90, prospect/BK split) ──────────────
  uniqueAccountsByRep() {
    const taskTot = {}, taskBK = {}, evtTot = {}, evtBK = {};
    JS_Data._r('Q_Tasks_L90').forEach(r => { taskTot[r.OwnerId] = Number(r.tot) || 0; });
    JS_Data._r('Q_Task_BK_L90').forEach(r => { taskBK[r.OwnerId] = Number(r.bks) || 0; });
    JS_Data._r('Q_Events_L90').forEach(r => { evtTot[r.OwnerId] = Number(r.tot) || 0; });
    JS_Data._r('Q_Event_BK_L90').forEach(r => { evtBK[r.OwnerId] = Number(r.bks) || 0; });

    const result = {};
    const ids = new Set([...Object.keys(taskTot), ...Object.keys(evtTot)]);
    ids.forEach(id => {
      const total = (taskTot[id] || 0) + (evtTot[id] || 0);
      const bks   = (taskBK[id]  || 0) + (evtBK[id]  || 0);
      result[id] = { total, bks, prospects: Math.max(0, total - bks) };
    });
    return result;
  },

  // ── Activity weekly per rep (CW or PW) ───────────────────────────────────
  activityWeeklyByRep(period) {
    const map = {};
    const sfx = period === 'CW' ? '_CW' : '_PW';

    JS_Data._r('Q_Calls' + sfx).forEach(r => {
      if (!map[r.OwnerId]) map[r.OwnerId] = { dials: 0, qualCalls: 0, emails: 0, meetings: 0 };
      map[r.OwnerId].dials = Number(r.dialCount) || 0;
    });
    JS_Data._r('Q_QualCalls' + sfx).forEach(r => {
      if (!map[r.OwnerId]) map[r.OwnerId] = { dials: 0, qualCalls: 0, emails: 0, meetings: 0 };
      map[r.OwnerId].qualCalls = Number(r.qualCount) || 0;
    });
    JS_Data._r('Q_Emails' + sfx).forEach(r => {
      if (!map[r.OwnerId]) map[r.OwnerId] = { dials: 0, qualCalls: 0, emails: 0, meetings: 0 };
      map[r.OwnerId].emails = Number(r.emailCount) || 0;
    });
    // meetings: count rows per OwnerId (deduplicated by GROUP BY in SOQL)
    JS_Data._r('Q_Meetings' + sfx).forEach(r => {
      if (!map[r.OwnerId]) map[r.OwnerId] = { dials: 0, qualCalls: 0, emails: 0, meetings: 0 };
      map[r.OwnerId].meetings = (map[r.OwnerId].meetings || 0) + 1;
    });
    return map;
  },

  // ── Quota per rep ─────────────────────────────────────────────────────────
  quotaByRep() {
    const users  = JS_Data._r('Q_Users_Team');
    const idToName = {};
    users.forEach(u => { idToName[u.Id] = u.Name; });

    const map = {};
    JS_Data._r('Q_Quotas').forEach(r => {
      const id  = r.QuotaOwnerId;
      const amt = Number(r.QuotaAmount) || 0;
      if (!map[id] || amt > map[id]) map[id] = amt;
    });
    return map;
  },

  // ── Overdue accounts per rep (Follow_up_Date < today), grouped by stage ──
  overdueAccountsByRep() {
    const map = {};
    JS_Data._r('Q_Overdue_Accounts').forEach(r => {
      const id    = r.OwnerId;
      const stage = r.Stage_ACM__c || 'Sonstige';
      if (!map[id]) map[id] = { total: 0 };
      map[id].total++;
      map[id][stage] = (map[id][stage] || 0) + 1;
    });
    return map;
  },

  // ── Weekly buckets for drill-down sparkline charts ───────────────────────
  weeklyBuckets() {
    function isoWeek(dateStr) {
      if (!dateStr) return 'KW?';
      const d = new Date(dateStr);
      const jan4 = new Date(d.getFullYear(), 0, 4);
      const startOfWeek1 = new Date(jan4);
      startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
      const weekNo = Math.floor((d - startOfWeek1) / 604800000) + 1;
      return 'KW' + String(Math.max(1, weekNo)).padStart(2, '0');
    }

    const result = {};
    const ensure = (id) => {
      if (!result[id]) result[id] = { activity: {}, bookings: {}, winLoss: {} };
      return result[id];
    };

    // ── Activity: group daily L30 data into ISO-weeks ──
    const dayMap = {};
    const ensureDay = (id, date) => {
      if (!dayMap[id]) dayMap[id] = {};
      if (!dayMap[id][date]) dayMap[id][date] = { dials: 0, qualCalls: 0, emails: 0, meetings: 0 };
      return dayMap[id][date];
    };
    JS_Data._r('Q_Calls_L30').forEach(r => {
      const d = ensureDay(r.OwnerId, r.ActivityDate);
      d.dials = Number(r.dials) || 0;
    });
    JS_Data._r('Q_QualCalls_L30').forEach(r => {
      const d = ensureDay(r.OwnerId, r.ActivityDate);
      d.qualCalls = Number(r.qualCount) || 0;
    });
    JS_Data._r('Q_Emails_L30').forEach(r => {
      const d = ensureDay(r.OwnerId, r.ActivityDate);
      d.emails = Number(r.emailCount) || 0;
    });
    JS_Data._r('Q_Meetings_L30').forEach(r => {
      const d = ensureDay(r.OwnerId, r.ActivityDate);
      d.meetings = Number(r.meetingCount) || 0;
    });
    Object.entries(dayMap).forEach(([repId, days]) => {
      const rep = ensure(repId);
      const weekMap = {};
      Object.entries(days).forEach(([date, day]) => {
        const wk = isoWeek(date);
        if (!weekMap[wk]) weekMap[wk] = { week: wk, dials: 0, qualCalls: 0, emails: 0, meetings: 0, touch: 0, qual: 0 };
        weekMap[wk].dials     += day.dials;
        weekMap[wk].qualCalls += day.qualCalls;
        weekMap[wk].emails    += day.emails;
        weekMap[wk].meetings  += day.meetings;
        weekMap[wk].touch     += day.dials + day.emails;
        weekMap[wk].qual      += day.qualCalls + day.meetings;
      });
      rep.activity = Object.values(weekMap).sort((a, b) => a.week.localeCompare(b.week));
    });

    // ── Bookings: cumulative QTD by week ──
    const bookWeekMap = {};
    const ensureBookWeek = (id, wk) => {
      if (!bookWeekMap[id]) bookWeekMap[id] = {};
      if (!bookWeekMap[id][wk]) bookWeekMap[id][wk] = { week: wk, arr: 0, pilots: 0 };
      return bookWeekMap[id][wk];
    };
    // Q_Bookings_QTD uses dateTimestampContractreceived__c, not CloseDate
    JS_Data._r('Q_Bookings_QTD').forEach(r => {
      const w = ensureBookWeek(r.OwnerId, isoWeek(r.dateTimestampContractreceived__c));
      w.arr += Number(r.Amount) || 0;
      if ((Number(r.Winback_Pilot__c) || 0) > 0) w.pilots += 1;
    });
    JS_Data._r('Q_SelfService_QTD').forEach(r => {
      const w = ensureBookWeek(r.OwnerId, isoWeek(r.dateTimestampContractreceived__c));
      w.arr += Number(r.Amount) || 0;
      if ((Number(r.Winback_Pilot__c) || 0) > 0) w.pilots += 1;
    });
    Object.entries(bookWeekMap).forEach(([repId, wks]) => {
      const rep = ensure(repId);
      const sorted = Object.values(wks).sort((a, b) => a.week.localeCompare(b.week));
      let cumArr = 0, cumPilots = 0;
      rep.bookings = sorted.map(w => {
        cumArr    += w.arr;
        cumPilots += w.pilots;
        return { week: w.week, cumArr, cumPilots };
      });
    });

    // ── Win/Loss: weekly win rate ──
    const wlWeekMap = {};
    JS_Data._r('Q_WinLoss').forEach(r => {
      if (r.RecordType && r.RecordType.Name === 'Customer Self Service') return;
      const id = r.OwnerId;
      const wk = isoWeek(r.CloseDate);
      if (!wlWeekMap[id]) wlWeekMap[id] = {};
      if (!wlWeekMap[id][wk]) wlWeekMap[id][wk] = { week: wk, won: 0, lost: 0 };
      if (r.IsWon) wlWeekMap[id][wk].won += 1;
      else         wlWeekMap[id][wk].lost += 1;
    });
    Object.entries(wlWeekMap).forEach(([repId, wks]) => {
      const rep = ensure(repId);
      rep.winLoss = Object.values(wks).sort((a, b) => a.week.localeCompare(b.week)).map(w => ({
        week: w.week, won: w.won, lost: w.lost,
        wr: (w.won + w.lost) > 0 ? Math.round(w.won / (w.won + w.lost) * 100) : 0,
      }));
    });

    // ── Opps created per week (L30) ──
    const oppWeekMap = {};
    JS_Data._r('Q_Opps_L30').forEach(r => {
      const id = r.OwnerId;
      const wk = isoWeek(r.CreatedDate);
      if (!oppWeekMap[id]) oppWeekMap[id] = {};
      if (!oppWeekMap[id][wk]) oppWeekMap[id][wk] = { week: wk, opps: 0 };
      oppWeekMap[id][wk].opps += 1;
    });
    Object.entries(oppWeekMap).forEach(([repId, wks]) => {
      const rep = ensure(repId);
      rep.opps = Object.values(wks).sort((a, b) => a.week.localeCompare(b.week));
    });

    return result;
  },

  // ── SF Forecast Commit: OwnerId → ForecastAmount (Bookings) ─────────────
  forecastCommitMap() {
    const map = {};
    JS_Data._r('Q_Forecast_Commit').forEach(r => {
      map[r.OwnerId] = Number(r.ForecastAmount) || 0;
    });
    return map;
  },

  // ── SF Forecast Commit: OwnerId → ForecastQuantity (Piloten) ────────────
  forecastCommitPilotsMap() {
    const map = {};
    JS_Data._r('Q_Forecast_Commit_Pilots').forEach(r => {
      map[r.OwnerId] = Number(r.ForecastQuantity) || 0;
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
    const pilotOpps         = JS_Data.pilotOppsByRep();
    const oppCreated        = JS_Data.oppCreatedByRep();
    const demos             = JS_Data.demosByRep();
    const pipelineMovement  = JS_Data.pipelineMovementByRep();
    const l30Map            = JS_Data.activityL30ByRep();
    const acctMap           = JS_Data.uniqueAccountsByRep();
    const cwMap             = JS_Data.activityWeeklyByRep('CW');
    const overdueMap        = JS_Data.overdueByRep();
    const overdueAccMap     = JS_Data.overdueAccountsByRep();
    const l30WorkingDays    = 22;
    // oppL30Map: total opps per rep; oppDaysMap: unique opp-creation dates per rep (live mode)
    const oppL30Map  = {};
    const oppDaysMap = {};
    JS_Data._r('Q_Opps_L30').forEach(r => {
      oppL30Map[r.OwnerId] = (oppL30Map[r.OwnerId] || 0) + 1;
      if (!oppDaysMap[r.OwnerId]) oppDaysMap[r.OwnerId] = new Set();
      oppDaysMap[r.OwnerId].add((r.CreatedDate || '').substring(0, 10));
    });
    // Fallback für historische Quartale: Q_Opps_L30 ist leer → QTD-Daten verwenden.
    // O/D  = QTD-Opps / unique Meeting-Tage (bester verfügbarer Proxy für aktive Verkaufstage).
    // QT→O = total_opps / total_qt (Nenner kürzt sich raus, ist exakt).
    const oppL30Empty = Object.keys(oppL30Map).length === 0;
    const qtdOppMap = {}, qtdQtMap = {}, mtgDaysMap = {};
    if (oppL30Empty) {
      JS_Data._r('Q_Opps_Created_QTD').forEach(r => { qtdOppMap[r.CreatedById] = Number(r.oppCount) || 0; });
      JS_Data._r('Q_QualCalls_QTD').forEach(r => { qtdQtMap[r.OwnerId] = (qtdQtMap[r.OwnerId] || 0) + (Number(r.qualCount) || 0); });
      JS_Data._r('Q_Meetings_QTD').forEach(r => {
        qtdQtMap[r.OwnerId] = (qtdQtMap[r.OwnerId] || 0) + 1;
        if (!mtgDaysMap[r.OwnerId]) mtgDaysMap[r.OwnerId] = new Set();
        if (r.ActivityDate) mtgDaysMap[r.OwnerId].add(r.ActivityDate);
      });
    }
    const commitMap         = JS_Data.forecastCommitMap();
    const pilotCommitMap    = JS_Data.forecastCommitPilotsMap();
    const cwDaysElapsed = Math.max(1, [1,1,2,3,4,5,5][new Date().getDay()]);
    const qtdDaysElapsed = Math.max(1, JS_Config.getWerktageContext().done);
    function repTrendArrow(cwVal, l30Val) {
      if (!l30Val || l30Val === 0) return { arrow: '→', cls: 'neutral' };
      const delta = ((cwVal - l30Val) / l30Val) * 100;
      if (delta > 5)  return { arrow: '↑', cls: 'green' };
      if (delta < -5) return { arrow: '↓', cls: 'red' };
      return { arrow: '→', cls: 'neutral' };
    }

    return JS_Config.ALL_REP_IDS.map(id => {
      const name         = JS_Config.ID_TO_NAME[id]
                         || (bookings[id] && bookings[id].name)
                         || (JS_Data._r('Q_Users_Team').find(u => u.Id === id) || {}).Name
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

      const commitAmount    = commitMap[id] || 0;
      const commitAtt       = bookingsTarget > 0 ? Math.round((commitAmount / bookingsTarget) * 100) : 0;
      const commitDeviation = (kpis.forecast || 0) > 0
        ? Math.round(((commitAmount - (kpis.forecast || 0)) / (kpis.forecast || 0)) * 100) : 0;
      const pilotenTgt          = kpis.pilotenTarget || 0;
      const pilotCommitCount    = pilotCommitMap[id] || 0;
      const pilotCommitAtt      = pilotenTgt > 0 ? Math.round((pilotCommitCount / pilotenTgt) * 100) : 0;

      return {
        id,
        ...kpis,
        commitAmount,
        commitAtt,
        commitDeviation,
        pilotCommitCount,
        pilotCommitAtt,
        closedPilots,
        wonCount,    // Bug 1 fix: expose for heroKPIs() sum
        lostCount,   // Bug 1 fix: expose for heroKPIs() sum
        dials:     (calls[id]    && calls[id].dials)    || 0,
        qualCalls: (calls[id]    && calls[id].qualCalls) || 0,
        meetings:  meetings[id]  || 0,
        emails:    emails[id]    || 0,
        pilotOpps:      pilotOpps[id]  || 0,
        oppCreated:     oppCreated[id] || 0,
        demos:          demos[id]      || 0,
        demoToPilotOpp: (demos[id] || 0) > 0
          ? Math.round(((pilotOpps[id] || 0) / demos[id]) * 100) : 0,
        pilotToOpp:     (pilotOpps[id] || 0) > 0
          ? Math.round((closedPilots / (pilotOpps[id] || 0)) * 100) : 0,
        selfSvcARR,
        pipelineARR,
        openOpps:  totalOpen,
        bookingsTarget,
        pilotPipeArr:  (pipeline[id] && pipeline[id].pilotArr)   || 0,
        pilotPipeOpps: (pipeline[id] && pipeline[id].pilotOpps)  || 0,
        bestandArr:    (pipeline[id] && pipeline[id].bestandArr) || 0,
        bestandOpps:   (pipeline[id] && pipeline[id].bestandOpps)|| 0,
        newPipeArr:    (pipeline[id] && pipeline[id].newArr)     || 0,
        newPipeOpps:   (pipeline[id] && pipeline[id].newOpps)    || 0,
        wonCW:         (pipelineMovement[id] && pipelineMovement[id].wonCW)    || 0,
        wonCWArr:      (pipelineMovement[id] && pipelineMovement[id].wonCWArr) || 0,
        lostCW:        (pipelineMovement[id] && pipelineMovement[id].lostCW)   || 0,
        lostCWArr:     (pipelineMovement[id] && pipelineMovement[id].lostCWArr)|| 0,
        l30TouchPerDay:    (l30Map[id] && l30Map[id].touchPerDay)       || 0,
        l30QualPerDay:     (l30Map[id] && l30Map[id].qualTouchPerDay)   || 0,
        l30CallMinPerDay:  (l30Map[id] && l30Map[id].callTimeMinPerDay) || 0,
        l30TouchToQual:    (l30Map[id] && l30Map[id].touchToQual)       || 0,
        l30DialsPerDay:    (l30Map[id] && l30Map[id].dialsPerDay)       || 0,
        l30EmailsPerDay:   (l30Map[id] && l30Map[id].emailsPerDay)      || 0,
        l30QualCallsPerDay:(l30Map[id] && l30Map[id].qualCallsPerDay)   || 0,
        l30MeetingsPerDay: (l30Map[id] && l30Map[id].meetingsPerDay)    || 0,
        l90UniqueAccounts: (acctMap[id] && acctMap[id].total)            || 0,
        l90UniqueProspects:(acctMap[id] && acctMap[id].prospects)        || 0,
        l90UniqueBKs:      (acctMap[id] && acctMap[id].bks)              || 0,
        l30OppPerDay:      (() => {
          if (oppL30Empty) {
            // Historisch: QTD-Opps / unique Meeting-Tage (Proxy für aktive Verkaufstage).
            // Fallback auf QTD-Arbeitstage wenn keine Meeting-Daten.
            const opps = qtdOppMap[id] || 0;
            const days = mtgDaysMap[id] && mtgDaysMap[id].size > 0
              ? mtgDaysMap[id].size
              : Math.max(1, JS_Config.getWerktageContext().total);
            return Math.round(opps / days * 10) / 10;
          }
          // Live: Opps / unique Opp-Erstellungstage
          const opps = oppL30Map[id] || 0;
          const days = oppDaysMap[id] && oppDaysMap[id].size > 0 ? oppDaysMap[id].size : l30WorkingDays;
          return Math.round(opps / days * 10) / 10;
        })(),
        l30QualToOpp:      (() => {
          if (oppL30Empty) {
            const totalOpps = qtdOppMap[id] || 0;
            const totalQt   = qtdQtMap[id]  || 0;
            return totalQt > 0 ? Math.round((totalOpps / totalQt) * 100) : 0;
          }
          const qual = (l30Map[id] && l30Map[id].qualTouchPerDay) || 0;
          const opp  = Math.round((oppL30Map[id] || 0) / l30WorkingDays * 10) / 10;
          return qual > 0 ? Math.round((opp / qual) * 100) : 0;
        })(),
        overdueAccounts:   (overdueAccMap[id] && overdueAccMap[id].total) || 0,
        overdueAccByStage: overdueAccMap[id] || {},
        staleCount:        (staleData[id] && staleData[id].stale) || 0,
        totalOpenCount:    totalOpen,
        overdueCount:      (overdueMap[id] && overdueMap[id].count) || 0,
        overdueArr:        (overdueMap[id] && overdueMap[id].arr)   || 0,
        l30TrendOpp:       (() => {
          const qtdRate = (oppCreated[id] || 0) / qtdDaysElapsed;
          return repTrendArrow(qtdRate, Math.round((oppL30Map[id] || 0) / l30WorkingDays * 10) / 10);
        })(),
        l30TrendTouch:     (() => {
          const cw = cwMap[id] || {};
          const cwTouch = ((cw.dials || 0) + (cw.emails || 0)) / cwDaysElapsed;
          return repTrendArrow(cwTouch, (l30Map[id] && l30Map[id].touchPerDay) || 0);
        })(),
        l30TrendQual:      (() => {
          const cw = cwMap[id] || {};
          const cwQual = ((cw.qualCalls || 0) + (cw.meetings || 0)) / cwDaysElapsed;
          return repTrendArrow(cwQual, (l30Map[id] && l30Map[id].qualTouchPerDay) || 0);
        })(),
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

  // ── Drilldown list — routes ctx.metric to filtered record list ───────────
  drilldownList(ctx) {
    const SF_OPP = 'https://heyjobs.lightning.force.com/lightning/r/Opportunity/';
    const SF_ACC = 'https://heyjobs.lightning.force.com/lightning/r/Account/';
    const sfUrl    = (id) => id ? SF_OPP + id + '/view' : null;
    const sfAccUrl = (id) => id ? SF_ACC + id + '/view' : null;
    const ageInDays = (d) => d ? Math.floor((new Date() - new Date(d)) / 86400000) : 0;

    const teamKey = JS_Filters.getTeam();
    const teamRepNames = teamKey !== 'all' && JS_Config.TEAMS[teamKey]
        ? JS_Config.TEAMS[teamKey].reps : null;
    const teamRepIds = teamRepNames
        ? new Set(JS_Config.ALL_REP_IDS.filter(id => teamRepNames.includes(JS_Config.ID_TO_NAME[id])))
        : null;
    const repFilter = (ctx && ctx.repId)
        ? (r) => r.OwnerId === ctx.repId
        : teamRepIds ? (r) => teamRepIds.has(r.OwnerId)
        : () => true;

    // Default / stale ─────────────────────────────────────────────────────
    if (!ctx || !ctx.metric || ctx.metric === 'stale') {
      const recs = JS_Data._r('Q_Stale_Pipeline').filter(repFilter);
      const title = ctx && ctx.title ? ctx.title
        : (ctx && ctx.repName ? 'Stale Pipeline — ' + ctx.repName : 'Stale Pipeline');
      return {
        title,
        isDrilldown: !!(ctx && ctx.metric),
        columns: [
          { key:'name',    label:'Opportunity',    sortable:true, type:'opp-link' },
          { key:'account', label:'Account',        sortable:true, type:'acc-link' },
          { key:'rep',     label:'Rep',            sortable:true },
          { key:'arr',     label:'ARR',            sortable:true, type:'currency', align:'right' },
          { key:'stage',   label:'Stage',          sortable:true },
          { key:'age',     label:'Inaktiv',        sortable:true, type:'age-badge', align:'center' },
        ],
        rows: recs.map(r => {
          const last = r.LastActivityDate ? new Date(r.LastActivityDate) : null;
          const days = last ? Math.floor((new Date() - last) / 86400000) : 999;
          return { name: r.Name||'—', account: (r.Account&&r.Account.Name)||'—', rep: (r.Owner&&r.Owner.Name)||'—', arr: Number(r.Amount)||0, stage: r.StageName||'—', age: days, sfUrl: sfUrl(r.Id), sfAccUrl: sfAccUrl(r.AccountId) };
        }).sort((a,b) => b.arr - a.arr),
        infoMessage: null,
      };
    }

    const { metric, repName, title: ctxTitle } = ctx;
    const repSuffix = repName ? ' — ' + repName : '';
    const title = (ctxTitle || metric) + repSuffix;

    // Non-drillable activity metrics ──────────────────────────────────────
    if (['touch','calls','mails','qt','qc','mtg'].indexOf(metric) >= 0) {
      return { title, isDrilldown: true, columns: [], rows: [], infoMessage: 'Aktivitäts-Details sind in Salesforce verfügbar (Reports → Activity).' };
    }

    // Bookings ─────────────────────────────────────────────────────────────
    if (metric === 'bookings') {
      const recs = JS_Data._r('Q_Bookings_QTD').filter(repFilter);
      return {
        title, isDrilldown: true,
        columns: [
          { key:'name',      label:'Opportunity', sortable:true, type:'opp-link' },
          { key:'account',   label:'Account',     sortable:true, type:'acc-link' },
          { key:'arr',       label:'ARR',         sortable:true, type:'currency', align:'right' },
          { key:'closeDate', label:'Datum',       sortable:true, type:'date' },
          { key:'rep',       label:'Rep',         sortable:true },
        ],
        rows: recs.map(r => ({ name: r.Name||'—', account: (r.Account&&r.Account.Name)||'—', arr: Number(r.Amount)||0, closeDate: r.dateTimestampContractreceived__c||r.CloseDate||null, rep: (r.Owner&&r.Owner.Name)||'—', sfUrl: sfUrl(r.Id), sfAccUrl: sfAccUrl(r.AccountId) })).sort((a,b) => b.arr - a.arr),
        infoMessage: null,
      };
    }

    // Pipeline ─────────────────────────────────────────────────────────────
    if (metric === 'pipeline') {
      const recs = JS_Data._r('Q_Pipeline_Open').filter(repFilter);
      return {
        title, isDrilldown: true,
        columns: [
          { key:'name',      label:'Opportunity', sortable:true, type:'opp-link' },
          { key:'account',   label:'Account',     sortable:true, type:'acc-link' },
          { key:'arr',       label:'ARR',         sortable:true, type:'currency', align:'right' },
          { key:'stage',     label:'Stage',       sortable:true },
          { key:'closeDate', label:'CloseDate',   sortable:true, type:'date' },
          { key:'age',       label:'Alter (Tage)',sortable:true, align:'right' },
          { key:'rep',       label:'Rep',         sortable:true },
        ],
        rows: recs.map(r => ({ name: r.Name||'—', account: (r.Account&&r.Account.Name)||'—', arr: Number(r.Amount)||0, stage: r.StageName||'—', closeDate: r.CloseDate||null, age: r.CreatedDate ? ageInDays(r.CreatedDate) : 0, rep: (r.Owner&&r.Owner.Name)||'—', sfUrl: sfUrl(r.Id), sfAccUrl: sfAccUrl(r.AccountId) })).sort((a,b) => b.arr - a.arr),
        infoMessage: null,
      };
    }

    // Overdue ──────────────────────────────────────────────────────────────
    if (metric === 'overdue') {
      const today = new Date();
      const recs = JS_Data._r('Q_Pipeline_Open').filter(repFilter).filter(r => r.CloseDate && new Date(r.CloseDate) < today);
      return {
        title, isDrilldown: true,
        columns: [
          { key:'name',    label:'Opportunity',       sortable:true, type:'opp-link' },
          { key:'account', label:'Account',           sortable:true, type:'acc-link' },
          { key:'arr',     label:'ARR',               sortable:true, type:'currency', align:'right' },
          { key:'stage',   label:'Stage',             sortable:true },
          { key:'overdue', label:'Überfällig (Tage)', sortable:true, type:'overdue', align:'right' },
          { key:'rep',     label:'Rep',               sortable:true },
        ],
        rows: recs.map(r => ({ name: r.Name||'—', account: (r.Account&&r.Account.Name)||'—', arr: Number(r.Amount)||0, stage: r.StageName||'—', overdue: Math.floor((today - new Date(r.CloseDate)) / 86400000), rep: (r.Owner&&r.Owner.Name)||'—', sfUrl: sfUrl(r.Id), sfAccUrl: sfAccUrl(r.AccountId) })).sort((a,b) => b.overdue - a.overdue),
        infoMessage: null,
      };
    }

    // Won / Lost ───────────────────────────────────────────────────────────
    if (metric === 'won' || metric === 'lost') {
      const isWon = metric === 'won';
      const recs = JS_Data._r('Q_WinLoss').filter(r => r.IsWon === isWon && repFilter(r) && !(r.RecordType && r.RecordType.Name === 'Customer Self Service'));
      const cols = [
        { key:'name',      label:'Opportunity', sortable:true, type:'opp-link' },
        { key:'account',   label:'Account',     sortable:true, type:'acc-link' },
        { key:'arr',       label:'ARR',         sortable:true, type:'currency', align:'right' },
        { key:'closeDate', label:'CloseDate',   sortable:true, type:'date' },
        { key:'rep',       label:'Rep',         sortable:true },
      ];
      if (!isWon) cols.push({ key:'stage', label:'Stage', sortable:true });
      return {
        title, isDrilldown: true, columns: cols,
        rows: recs.map(r => ({ name: r.Name||'—', account: (r.Account&&r.Account.Name)||'—', arr: Number(r.Amount)||0, closeDate: r.CloseDate||null, stage: r.StageName||'—', rep: (r.Owner&&r.Owner.Name)||'—', sfUrl: sfUrl(r.Id), sfAccUrl: sfAccUrl(r.AccountId) })).sort((a,b) => b.arr - a.arr),
        infoMessage: null,
      };
    }

    // Pilots open ──────────────────────────────────────────────────────────
    if (metric === 'pilots') {
      const recs = JS_Data._r('Q_Pilots_Open').filter(repFilter);
      return {
        title, isDrilldown: true,
        columns: [
          { key:'name',      label:'Opportunity', sortable:true, type:'opp-link' },
          { key:'account',   label:'Account',     sortable:true, type:'acc-link' },
          { key:'arr',       label:'ARR',         sortable:true, type:'currency', align:'right' },
          { key:'stage',     label:'Stage',       sortable:true },
          { key:'closeDate', label:'CloseDate',   sortable:true, type:'date' },
          { key:'rep',       label:'Rep',         sortable:true },
        ],
        rows: recs.map(r => ({ name: r.Name||'—', account: (r.Account&&r.Account.Name)||'—', arr: Number(r.Amount)||0, stage: r.StageName||'—', closeDate: r.CloseDate||null, rep: (r.Owner&&r.Owner.Name)||'—', sfUrl: sfUrl(r.Id), sfAccUrl: sfAccUrl(r.AccountId) })).sort((a,b) => b.arr - a.arr),
        infoMessage: null,
      };
    }

    // Self-service ─────────────────────────────────────────────────────────
    if (metric === 'selfservice') {
      const recs = JS_Data._r('Q_SelfService_QTD').filter(repFilter);
      return {
        title, isDrilldown: true,
        columns: [
          { key:'name',      label:'Opportunity', sortable:true, type:'opp-link' },
          { key:'arr',       label:'ARR',         sortable:true, type:'currency', align:'right' },
          { key:'closeDate', label:'Datum',       sortable:true, type:'date' },
          { key:'rep',       label:'Rep',         sortable:true },
        ],
        rows: recs.map(r => ({ name: r.Name||'—', arr: Number(r.Amount)||0, closeDate: r.dateTimestampContractreceived__c||null, rep: (r.Owner&&r.Owner.Name)||'—', sfUrl: sfUrl(r.Id) })).sort((a,b) => b.arr - a.arr),
        infoMessage: null,
      };
    }

    // Fallback: unbekannte metric → stale list
    return JS_Data.drilldownList_stale(null);
  },

  // ── Stale-only helper (used as drilldownList fallback, avoids self-reference) ─
  drilldownList_stale(repId) {
    const SF_OPP = 'https://heyjobs.lightning.force.com/lightning/r/Opportunity/';
    const SF_ACC = 'https://heyjobs.lightning.force.com/lightning/r/Account/';
    const teamKey = JS_Filters.getTeam();
    const teamRepNames = teamKey !== 'all' && JS_Config.TEAMS[teamKey]
        ? JS_Config.TEAMS[teamKey].reps : null;
    const teamRepIds = teamRepNames
        ? new Set(JS_Config.ALL_REP_IDS.filter(id => teamRepNames.includes(JS_Config.ID_TO_NAME[id])))
        : null;
    const repFilter = repId ? (r) => r.OwnerId === repId
        : teamRepIds ? (r) => teamRepIds.has(r.OwnerId)
        : () => true;
    const recs = JS_Data._r('Q_Stale_Pipeline').filter(repFilter);
    return {
      title: 'Stale Pipeline',
      isDrilldown: false,
      columns: [
        { key:'name',    label:'Opportunity', sortable:true, type:'opp-link' },
        { key:'account', label:'Account',     sortable:true, type:'acc-link' },
        { key:'rep',     label:'Rep',         sortable:true },
        { key:'arr',     label:'ARR',         sortable:true, type:'currency', align:'right' },
        { key:'stage',   label:'Stage',       sortable:true },
        { key:'age',     label:'Inaktiv',     sortable:true, type:'age-badge', align:'center' },
      ],
      rows: recs.map(r => {
        const last = r.LastActivityDate ? new Date(r.LastActivityDate) : null;
        const days = last ? Math.floor((new Date() - last) / 86400000) : 999;
        return { name: r.Name||'—', account: (r.Account&&r.Account.Name)||'—', rep: (r.Owner&&r.Owner.Name)||'—', arr: Number(r.Amount)||0, stage: r.StageName||'—', age: days, sfUrl: r.Id ? SF_OPP+r.Id+'/view' : null, sfAccUrl: r.AccountId ? SF_ACC+r.AccountId+'/view' : null };
      }).sort((a,b) => b.arr - a.arr),
      infoMessage: null,
    };
  },

  // ── Stale pipeline list (for stale queue widget) ──────────────────────────
  staleList() {
    const today = new Date();
    return JS_Data._r('Q_Stale_Pipeline').map(r => {
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
    const aq   = JS_Config.getActiveQuarter();
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
    // Fix: compute staleCount directly from filtered stale list (buildRepKPIs doesn't reliably expose staleCount)
    const allStaleList   = JS_Data.staleList();
    const filteredIds    = new Set(filtered.map(r => r.id));
    const filteredStaleList = allStaleList.filter(o => filteredIds.has(o.ownerId));
    const staleCount     = filteredStaleList.length;
    const totalOpen      = sum('openOpps');
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

    // ── L30 funnel aggregation ─────────────────────────────────────────────
    const l30Map = JS_Data.activityL30ByRep();
    let l30TouchSum = 0, l30QualSum = 0, l30CallMinSum = 0;
    let l30DialsSum = 0, l30EmailsSum = 0, l30QCSum = 0, l30MtgSum = 0;
    filtered.forEach(r => {
      const d = l30Map[r.id] || {};
      l30TouchSum   += d.touchPerDay       || 0;
      l30QualSum    += d.qualTouchPerDay   || 0;
      l30CallMinSum += d.callTimeMinPerDay || 0;
      l30DialsSum   += d.dialsPerDay       || 0;
      l30EmailsSum  += d.emailsPerDay      || 0;
      l30QCSum      += d.qualCallsPerDay   || 0;
      l30MtgSum     += d.meetingsPerDay    || 0;
    });
    const oppL30Map = {};
    JS_Data._r('Q_Opps_L30').forEach(r => { oppL30Map[r.OwnerId] = (oppL30Map[r.OwnerId] || 0) + 1; });
    const l30OppTotal = filtered.reduce((s, r) => s + (oppL30Map[r.id] || 0), 0);
    const avgTouchPerDay   = Math.round(l30TouchSum   / repCount * 10) / 10;
    const avgQualPerDay    = Math.round(l30QualSum    / repCount * 10) / 10;
    const avgCallMinPerDay = Math.round(l30CallMinSum / repCount * 10) / 10;
    const l30WorkingDays   = 22;
    const avgOppPerDay     = Math.round(l30OppTotal / repCount / l30WorkingDays * 10) / 10;
    const touchToQual      = avgTouchPerDay > 0 ? Math.round((avgQualPerDay  / avgTouchPerDay) * 100) : 0;
    const qualToOpp        = avgQualPerDay  > 0 ? Math.round((avgOppPerDay   / avgQualPerDay)  * 100) : 0;
    // Trend: CW daily rate vs L30 avg
    function trendArrow(cwVal, l30Val) {
      if (!l30Val || l30Val === 0) return { arrow: '→', cls: 'neutral' };
      const delta = ((cwVal - l30Val) / l30Val) * 100;
      if (delta > 5)  return { arrow: '↑', cls: 'green' };
      if (delta < -5) return { arrow: '↓', cls: 'red' };
      return { arrow: '→', cls: 'neutral' };
    }
    const cwDaysElapsed   = Math.max(1, [1,1,2,3,4,5,5][new Date().getDay()]);
    const cwTouchPerDay   = ((cwSum.dials || 0) + (cwSum.emails || 0)) / repCount / cwDaysElapsed;
    const cwQualPerDay    = ((cwSum.qualCalls || 0) + (cwSum.meetings || 0)) / repCount / cwDaysElapsed;
    const trendTouch      = trendArrow(cwTouchPerDay, avgTouchPerDay);
    const trendQual       = trendArrow(cwQualPerDay,  avgQualPerDay);
    const wkDone          = Math.max(1, JS_Config.getWerktageContext().done);
    const qtdOppPerDay    = oppCreated / repCount / wkDone;
    const trendOpp        = trendArrow(qtdOppPerDay, avgOppPerDay);

    // Overdue opps aggregation (filtered by team)
    const overdueMap    = JS_Data.overdueByRep();
    const overdueCount  = filtered.reduce((s, r) => s + ((overdueMap[r.id] && overdueMap[r.id].count) || 0), 0);
    const overdueArr    = filtered.reduce((s, r) => s + ((overdueMap[r.id] && overdueMap[r.id].arr)   || 0), 0);
    // Overdue accounts aggregation by stage
    const overdueAccMap = JS_Data.overdueAccountsByRep();
    const overdueAccByStage = {};
    filtered.forEach(r => {
      const d = overdueAccMap[r.id] || {};
      Object.entries(d).forEach(([stage, cnt]) => {
        if (stage === 'total') return;
        overdueAccByStage[stage] = (overdueAccByStage[stage] || 0) + cnt;
      });
    });

    const pilotPipeArr  = sum('pilotPipeArr');
    const pilotPipeOpps = sum('pilotPipeOpps');
    const bestandArr    = sum('bestandArr');
    const bestandOpps   = sum('bestandOpps');
    const newPipeArr    = sum('newPipeArr');
    const newPipeOpps   = sum('newPipeOpps');
    const wonCW         = sum('wonCW');
    const wonCWArr      = sum('wonCWArr');
    const lostCW        = sum('lostCW');
    const lostCWArr     = sum('lostCWArr');

    const bookingsAtt    = bookingsTarget > 0 ? Math.round((bookingsARR / bookingsTarget) * 100) : 0;
    const progress       = JS_Config.getQuarterProgress();
    const forecast       = progress > 0 ? Math.round(bookingsARR / progress) : bookingsARR;
    const pilotenCount       = sum('pilotenCount');
    const pilotenTarget      = sum('pilotenTarget');
    const pilotenAtt         = pilotenTarget > 0 ? Math.round((pilotenCount / pilotenTarget) * 100) : 0;
    const pilotenForecast    = progress > 0 ? Math.round(pilotenCount / progress) : pilotenCount;
    const pilotenForecastAtt = pilotenTarget > 0 ? Math.round((pilotenForecast / pilotenTarget) * 100) : 0;
    const composite          = Math.round(bookingsAtt * 0.75 + pilotenAtt * 0.25);
    const forecastAtt        = bookingsTarget > 0 ? Math.round((forecast / bookingsTarget) * 100) : 0;
    const compositeForecast  = Math.round(forecastAtt * 0.75 + pilotenForecastAtt * 0.25);
    const coverage       = (() => {
      // bookingsARR already includes selfSvcARR (after Bug 3 fix), so don't subtract again
      const rem = bookingsTarget - bookingsARR;
      return rem > 0 ? Math.round((pipelineARR / rem) * 10) / 10 : 99;
    })();
    const winRate        = JS_Scoring.winRate(wonCount, lostCount);
    const staleRate      = totalOpen > 0 ? Math.round((staleCount / totalOpen) * 100) : 0;
    const qualConv       = dials > 0 ? Math.round(((qualCalls + meetings) / dials) * 100) : 0;

    // ── Context (date pace, DRR) ───────────────────────────────────────────────
    const wk               = JS_Config.getWerktageContext();
    const pace             = wk.done > 0 ? Math.round(bookingsARR / wk.done) : 0;
    const neededDRR        = wk.remaining > 0 ? Math.round(Math.max(0, bookingsTarget - bookingsARR) / wk.remaining) : 0;
    const pilotenPace      = wk.done > 0 ? Math.round((pilotenCount / wk.done) * 10) / 10 : 0;
    const pilotenNeededDRR = wk.remaining > 0
      ? Math.round(Math.max(0, pilotenTarget - pilotenCount) / wk.remaining * 10) / 10 : 0;

    // ── SF Forecast Commit (team- / motion-level) ─────────────────────────
    const commitMap2        = JS_Data.forecastCommitMap();
    const pilotCommitMap2   = JS_Data.forecastCommitPilotsMap();
    const teamFilter        = JS_Filters.getTeam();
    let heroCommitAmount    = 0;
    let heroPilotCommitCount = 0;
    if (teamFilter === 'all') {
      heroCommitAmount     = commitMap2[JS_Config.HEAD_OF_ID] || 0;
      heroPilotCommitCount = pilotCommitMap2[JS_Config.HEAD_OF_ID] || 0;
    } else {
      const tlId = JS_Config.TEAMS[teamFilter] ? JS_Config.TEAMS[teamFilter].tlId : null;
      heroCommitAmount     = tlId ? (commitMap2[tlId] || 0) : 0;
      heroPilotCommitCount = tlId ? (pilotCommitMap2[tlId] || 0) : 0;
    }
    const bookingsForecastAtt = bookingsTarget > 0 ? Math.round((forecast / bookingsTarget) * 100) : 0;
    const heroCommitAtt       = bookingsTarget > 0 ? Math.round((heroCommitAmount / bookingsTarget) * 100) : 0;
    const heroCommitDeviation = forecast > 0 ? Math.round(((heroCommitAmount - forecast) / forecast) * 100) : 0;
    const heroPilotCommitAtt  = pilotenTarget > 0 ? Math.round((heroPilotCommitCount / pilotenTarget) * 100) : 0;
    const drrToCommit             = wk.remaining > 0
      ? Math.round(Math.max(0, heroCommitAmount - bookingsARR) / wk.remaining) : 0;
    const pilotenDrrToCommit      = wk.remaining > 0
      ? Math.round(Math.max(0, heroPilotCommitCount - pilotenCount) / wk.remaining * 10) / 10 : 0;

    // ── Weekly cumulative bookings (für Chart in Hero Card) ───────────────
    const _isoWk = (dateStr) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      const jan4 = new Date(d.getFullYear(), 0, 4);
      const s1 = new Date(jan4);
      s1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
      return 'KW' + String(Math.max(1, Math.floor((d - s1) / 604800000) + 1)).padStart(2, '0');
    };
    const _wkIncr = {}, _wkPil = {};
    JS_Data._r('Q_Bookings_QTD').forEach(r => {
      if (!filteredIds.has(r.OwnerId)) return;
      const wk = _isoWk(r.dateTimestampContractreceived__c);
      if (!wk) return;
      _wkIncr[wk] = (_wkIncr[wk] || 0) + (Number(r.Amount) || 0);
      if ((Number(r.Winback_Pilot__c) || 0) > 0) _wkPil[wk] = (_wkPil[wk] || 0) + 1;
    });
    JS_Data._r('Q_SelfService_QTD').forEach(r => {
      if (!filteredIds.has(r.OwnerId)) return;
      const wk = _isoWk(r.dateTimestampContractreceived__c);
      if (!wk) return;
      _wkIncr[wk] = (_wkIncr[wk] || 0) + (Number(r.Amount) || 0);
      if ((Number(r.Winback_Pilot__c) || 0) > 0) _wkPil[wk] = (_wkPil[wk] || 0) + 1;
    });
    let _cumBk = 0, _cumPil = 0;
    const _allWks = [...new Set([...Object.keys(_wkIncr), ...Object.keys(_wkPil)])].sort();
    const weeklyBkArr = _allWks.map(wk => {
      _cumBk  += _wkIncr[wk] || 0;
      _cumPil += _wkPil[wk]  || 0;
      return { week: wk, arr: _cumBk, pilots: _cumPil };
    });

    return {
      progress,
      context: {
        quarterLabel:     JS_Config.getActiveQuarter().label,
        progressPct:      Math.round(progress * 100),
        werktage:         wk,
        pace,
        neededDRR,
        pilotenPace,
        pilotenNeededDRR,
        onTrack:          pace >= neededDRR,
        isHistorical:     !JS_Config.getActiveQuarter().isCurrent,
        bookingsForecastAtt,
        commit: {
          amount:     heroCommitAmount,
          attainment: heroCommitAtt,
          deviation:  heroCommitDeviation,
          drrToCommit,
          pilotenDrrToCommit,
          pilotCount: heroPilotCommitCount,
          pilotAtt:   heroPilotCommitAtt,
        },
      },
      // Neue Reps Warnung (falls buildTeamsFromQuery neue Reps erkannt hat)
      newRepsWarning:   JS_Config._newReps && JS_Config._newReps.length > 0 ? JS_Config._newReps : null,
      bookings: {
        arr:         bookingsARR,
        target:      bookingsTarget,
        attainment:  bookingsAtt,
        forecast,
        forecastAtt,
        weekly:      weeklyBkArr,
        selfSvcARR,
        selfSvcPct:  bookingsTarget > 0 ? Math.round((selfSvcARR / bookingsTarget) * 100) : 0,
        status:      JS_Scoring.status('compositeAttainment', bookingsAtt),
      },
      piloten: {
        count:       pilotenCount,
        target:      pilotenTarget,
        attainment:  pilotenAtt,
        forecast:    pilotenForecast,
        forecastAtt: pilotenForecastAtt,
        status:      JS_Scoring.status('compositeAttainment', pilotenAtt),
      },
      composite: {
        value:    composite,
        forecast: compositeForecast,
        status:   JS_Scoring.status('compositeAttainment', composite),
      },
      coverage: {
        value:       coverage,
        pipelineARR,
        pilotArr:    pilotPipeArr,
        pilotOpps:   pilotPipeOpps,
        bestandArr,
        bestandOpps,
        wow: {
          newOpps:  newPipeOpps,
          newArr:   newPipeArr,
          wonCW,
          wonCWArr,
          lostCW,
          lostCWArr,
        },
        status:      JS_Scoring.status('coverage', coverage),
      },
      winRate: {
        value:          winRate,
        wonCount,
        lostCount,
        demos:          sum('demos'),
        pilotOpps:      sum('pilotOpps'),
        oppCreated:     sum('oppCreated'),
        demoToPilotOpp: (() => { const d = sum('demos'); return d > 0 ? Math.round((sum('pilotOpps') / d) * 100) : 0; })(),
        pilotenCountRep: sum('closedPilots'),
        pilotToOpp:     (() => { const p = sum('pilotOpps'); return p > 0 ? Math.round((sum('closedPilots') / p) * 100) : 0; })(),
        status:         JS_Scoring.status('winRate', winRate),
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
        l30: {
          touchPerDay:     avgTouchPerDay,
          qualTouchPerDay: avgQualPerDay,
          oppPerDay:       avgOppPerDay,
          callMinPerDay:   avgCallMinPerDay,
          touchToQual,
          qualToOpp,
          trendTouch,
          trendQual,
          trendOpp,
          dialsPerDay:     Math.round(l30DialsSum  / repCount * 10) / 10,
          emailsPerDay:    Math.round(l30EmailsSum / repCount * 10) / 10,
          qualCallsPerDay: Math.round(l30QCSum     / repCount * 10) / 10,
          meetingsPerDay:  Math.round(l30MtgSum    / repCount * 10) / 10,
          uniqueAccountsAvg:  filtered.length ? Math.round(filtered.reduce((s,r)=>s+(r.l90UniqueAccounts||0),0)/filtered.length*10)/10 : 0,
          uniqueProspectsAvg: filtered.length ? Math.round(filtered.reduce((s,r)=>s+(r.l90UniqueProspects||0),0)/filtered.length*10)/10 : 0,
          uniqueBKsAvg:       filtered.length ? Math.round(filtered.reduce((s,r)=>s+(r.l90UniqueBKs||0),0)/filtered.length*10)/10 : 0,
        },
      },
      stale: {
        value:       staleRate,
        staleCount,
        totalOpen,
        status:      JS_Scoring.status('staleRate', staleRate),
        list:        filteredStaleList.slice(0, 20),
        buckets: (() => {
          const b = { '14-21d': 0, '21-30d': 0, '30d+': 0 };
          filteredStaleList.forEach(o => {
            if (o.daysSinceActivity >= 30)      b['30d+']++;
            else if (o.daysSinceActivity >= 21) b['21-30d']++;
            else                                b['14-21d']++;
          });
          return b;
        })(),
        overdue: {
          count: overdueCount,
          arr:   overdueArr,
        },
        overdueAccounts: {
          byStage: overdueAccByStage,
          total:   Object.values(overdueAccByStage).reduce((s, v) => s + v, 0),
        },
      },
    };
  },

}
