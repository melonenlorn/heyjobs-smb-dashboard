import json
import sys

PATH = '/Users/ferdinandbarenfanger/heyjobs-smb-dashboard/pages/Dashboard/widgets/Rep_Table.json'

NEW_FUNC = r"""function coachingTips(r) {
  var tips = [];
  var qp     = (_wk && _wk.total > 0) ? (_wk.done / _wk.total) : 0.5;
  var isEndQ = qp > 0.85;

  // Dynamic team benchmarks
  var bm = (function() {
    var reps = (_allReps || []).filter(function(x){ return (x.l30TouchPerDay||0) > 0; });
    function med(arr) {
      var s = arr.filter(function(v){ return v > 0; }).sort(function(a,b){ return a-b; });
      return s.length ? s[Math.floor(s.length/2)] : 0;
    }
    return {
      touch: med(reps.map(function(x){ return x.l30TouchPerDay||0; })),
      tToQT: med(reps.map(function(x){ return x.l30TouchToQual||0; })),
      qtToO: med(reps.map(function(x){ return x.l30QualToOpp||0; })),
      mtg:   med(reps.map(function(x){ return x.l30MeetingsPerDay||0; })),
      wr:    med(reps.map(function(x){ return x.winRateVal||0; })),
      d2po:  med(reps.map(function(x){ return x.demoToPilotOpp||0; })),
      p2pil: med(reps.map(function(x){ return x.pilotToOpp||0; })),
    };
  })();

  // Shortcuts
  var touch   = r.l30TouchPerDay    || 0;
  var tToQT   = r.l30TouchToQual    || 0;
  var qtToOpp = r.l30QualToOpp      || 0;
  var mtg     = r.l30MeetingsPerDay || 0;
  var wr      = r.winRateVal        || 0;
  var bkARR   = r.bookingsARR       || 0;
  var bkTgt   = r.bookingsTarget    || 0;
  var bkAtt   = bkTgt > 0 ? (bkARR / bkTgt * 100) : 0;
  var pipe    = r.pipelineARR       || 0;
  var stale   = r.staleCount        || 0;
  var totalOp = r.totalOpenCount    || 0;
  var pilCnt  = r.pilotenCount      || 0;
  var pilTgt  = r.pilotenTarget     || 0;
  var pilWt   = r.pilotenWeight     || 0;
  var pilPipe = r.pilotPipeOpps     || 0;
  var d2po    = r.demoToPilotOpp    || 0;
  var p2pil   = r.pilotToOpp        || 0;
  var demos   = r.demos             || 0;
  var overdue = r.overdueCount      || 0;
  var forecast= r.compositeForecast || 0;
  var staleHeavy = totalOp > 0 && (stale / totalOp) > 0.35;

  // PILOT CHAIN
  if (pilWt > 0 && pilTgt > 0) {
    var pilGap = pilTgt - pilCnt;
    if (pilGap > 0 && qp > 0.2) {
      var repP2pil = p2pil > 0 ? p2pil : (bm.p2pil || 50);
      var expectedClose = pilPipe * (repP2pil / 100);
      if (pilPipe > 0 && expectedClose >= pilGap) {
        tips.push({ prio: 1, emoji: '🔒',
          title: 'Pilot-Pipeline schließen: ' + pilCnt + '/' + pilTgt,
          detail: pilPipe + ' Opps in Pilot-Pipeline \u2192 ' + Math.round(expectedClose * 10) / 10 + ' erwartet. Jede Opp auf n\u00e4chsten Schritt pushen \u2014 Close-Date-Review mit TL.'
        });
      } else if (bm.d2po > 0 && d2po > 0 && d2po < bm.d2po * 0.7) {
        tips.push({ prio: 1, emoji: '🔄',
          title: 'Demo\u2192Pilot-Opp: ' + Math.round(d2po) + '% (Team: ' + Math.round(bm.d2po) + '%)',
          detail: 'Demos werden zu selten zu Pilot-Opps. Discovery im Demo: Pilot-Scope direkt adressieren. Nicht nur pr\u00e4sentieren \u2014 Fit und n\u00e4chsten Schritt kl\u00e4ren.'
        });
      } else if (bm.mtg > 0 && mtg < bm.mtg * 0.75) {
        tips.push({ prio: 1, emoji: '📅',
          title: 'Meeting-Rate: ' + fmtD(mtg) + '/Tag (Team: ' + fmtD(bm.mtg) + ')',
          detail: 'Zu wenig Meetings um Pilot-Funnel zu f\u00fcllen. Kalendertermin direkt im QualCall setzen \u2014 nicht per Mail nachfassen.'
        });
      } else if (demos < 3) {
        tips.push({ prio: 1, emoji: '🎯',
          title: 'Demo-Pipeline aufbauen: nur ' + demos + ' Demos Q-t-D',
          detail: 'Pilot-Funnel beginnt beim Demo. QT-Calls auf Demo-Booking optimieren: Wert klar machen, Termin sofort im Call buchen.'
        });
      } else {
        tips.push({ prio: 1, emoji: '🚀',
          title: 'Piloten: ' + pilCnt + '/' + pilTgt + ' \u2014 ' + pilPipe + ' Opps in Pipeline',
          detail: 'Noch ' + pilGap + ' Pilot(en) ben\u00f6tigt. Pipeline: ' + pilPipe + ' Opps. Pilot-Scope in jedem Discovery-Call aktiv einbringen.'
        });
      }
    } else if (pilGap <= 0 && bm.p2pil > 0 && p2pil > bm.p2pil * 1.2) {
      tips.push({ prio: 0, emoji: '⭐',
        title: 'Pilot-Excellence: ' + pilCnt + '/' + pilTgt,
        detail: 'Ziel erreicht, Conversion ' + Math.round(p2pil) + '% vs. Team ' + Math.round(bm.p2pil) + '%. Methodik im Team-Meeting teilen.'
      });
    }
  }

  // BOOKING CHAIN
  var bkGap = Math.max(0, bkTgt - bkARR);
  if (bkGap > 0 && bkTgt > 0 && qp > 0.15) {
    var covRatio = pipe / bkGap;
    var gapK = Math.round(bkGap / 1000);
    if (isEndQ && covRatio < 1.5) {
      tips.push({ prio: 1, emoji: '⚡',
        title: 'Endspurt: ' + Math.round(bkAtt) + '% \u2014 Coverage ' + fmtD(covRatio) + 'x',
        detail: '1-2 Deals mit h\u00f6chster Close-Wahrscheinlichkeit identifizieren, 100% Fokus. Rest \u2192 Q2.'
      });
    } else if (covRatio >= 2.5) {
      if (bm.wr > 0 && wr < bm.wr * 0.75) {
        tips.push({ prio: 1, emoji: '📉',
          title: 'Win Rate ' + Math.round(wr) + '% (Team: ' + Math.round(bm.wr) + '%)',
          detail: 'Pipeline ausreichend (' + fmtD(covRatio) + 'x). Hebel ist Win Rate. In welcher Stage verlierst du? Deal-Review + die letzten 2 Lost Deals mit TL anh\u00f6ren.'
        });
      } else if (staleHeavy) {
        tips.push({ prio: 2, emoji: '🧹',
          title: stale + ' Stale Opps \u2014 Pipeline bereinigen',
          detail: 'Genug Volumen, aber ' + Math.round(stale/totalOp*100) + '% stale. Bereinigen gibt realistisches Coverage-Bild. Heute ' + Math.min(stale,5) + ' Deals reaktivieren/schlie\u00dfen.'
        });
      }
    } else {
      if (bm.qtToO > 0 && qtToOpp > 0 && qtToOpp < bm.qtToO * 0.65) {
        tips.push({ prio: 1, emoji: '🔄',
          title: 'QT\u2192Opp: ' + Math.round(qtToOpp) + '% (Team: ' + Math.round(bm.qtToO) + '%)',
          detail: 'Pipeline-Gap ' + gapK + 'k. QT\u2192Opp unter Team-Median. Next-Steps im QT-Call direkt committen: Pilot-Scope + Datum sofort setzen.'
        });
      } else if (bm.tToQT > 0 && tToQT > 0 && tToQT < bm.tToQT * 0.65) {
        tips.push({ prio: 1, emoji: '🎯',
          title: 'T\u2192QT: ' + Math.round(tToQT) + '% (Team: ' + Math.round(bm.tToQT) + '%)',
          detail: 'Pipeline-Gap ' + gapK + 'k. Qualifizierungsrate unter Team-Median. Pitch-Review: Wird der Schmerzpunkt klar adressiert? Call-Recordings mit TL.'
        });
      } else if (bm.touch > 0 && touch < bm.touch * 0.75) {
        tips.push({ prio: 1, emoji: '📞',
          title: 'Aktivit\u00e4t: ' + fmtD(touch) + '/Tag (Team: ' + fmtD(bm.touch) + ')',
          detail: 'Pipeline-Gap ' + gapK + 'k. Hebel: +' + Math.round(bm.touch - touch) + ' Touches/Tag. Blockierzeit im Kalender reservieren.'
        });
      } else {
        tips.push({ prio: 1, emoji: '🚨',
          title: 'Coverage ' + fmtD(covRatio) + 'x \u2014 Ziel 2,5x',
          detail: 'Pipeline-Gap ' + gapK + 'k ARR. T\u00e4glich mind. 1 neue Opp er\u00f6ffnen. Fokus auf QT-Calls \u2192 direktes Opp-Opening.'
        });
      }
    }
  } else if (bkGap <= 0 && bm.wr > 0 && wr > bm.wr * 1.2) {
    tips.push({ prio: 0, emoji: '🏆',
      title: 'BK-Ziel erreicht + Win Rate ' + Math.round(wr) + '%',
      detail: 'Team-Median: ' + Math.round(bm.wr) + '%. Peer-Coaching: welcher Kollege k\u00e4mpft mit Win Rate?'
    });
  }

  // SEKUNDÄRE HYGIENE
  if (stale > 3 && !tips.find(function(t){ return t.emoji === '🧹'; })) {
    tips.push({ prio: 2, emoji: '🧹',
      title: stale + ' Opps ohne Follow-up (>14d)',
      detail: 'Heute ' + Math.min(stale,5) + ' Deals reaktivieren oder schlie\u00dfen. Stale Opps verzerren Coverage + Forecast.'
    });
  }
  if (overdue > 4 && tips.length < 3) {
    tips.push({ prio: 2, emoji: '⏰',
      title: overdue + ' \u00fcberf\u00e4llige Deals',
      detail: 'CloseDate \u00fcberschritten. F\u00fcr jeden: Datum verschieben (+ warum), pushen oder verlieren. Keine Zombie-Deals.'
    });
  }

  // EXCELLENCE (kein Prio-1-Gap)
  if (!tips.find(function(t){ return t.prio === 1; })) {
    if (bm.touch > 0 && touch > bm.touch * 1.3 && bm.tToQT > 0 && tToQT > bm.tToQT * 1.2) {
      tips.push({ prio: 0, emoji: '⭐',
        title: 'Top-Aktivit\u00e4t + Top-Qualifizierung',
        detail: fmtD(touch) + ' Touch/Tag, T\u2192QT ' + Math.round(tToQT) + '% \u2014 beides deutlich \u00fcber Team. Methodik im Team-Meeting teilen.'
      });
    }
    if (bm.wr > 0 && wr > bm.wr * 1.3) {
      tips.push({ prio: 0, emoji: '🏆',
        title: 'Beste Win Rate: ' + Math.round(wr) + '% (Team: ' + Math.round(bm.wr) + '%)',
        detail: 'Was machst du anders in der Closing-Stage? Peer-Coaching anbieten.'
      });
    }
  }

  // END-Q URGENZ
  if (isEndQ && forecast < 80) {
    var p1 = tips.find(function(t){ return t.prio === 1; });
    if (p1) p1.detail = '\u26a1 ' + p1.detail;
  }

  tips.sort(function(a,b){ return a.prio - b.prio; });
  tips = tips.slice(0, 3);
  if (!tips.length) {
    tips.push({ prio: 0, emoji: '✅', title: 'Auf Kurs!',
      detail: 'Alle KPIs im gr\u00fcnen Bereich. Peer-Coaching: hilf einem Kollegen mit der gr\u00f6\u00dften L\u00fccke.'
    });
  }
  return tips;
}"""

MARKER = 'function coachingTips(r) {'

def replace_function_in_html(html, key):
    idx = html.find(MARKER)
    if idx == -1:
        print(f"  ERROR: MARKER not found in {key}")
        return None, False

    # Find the opening brace of the function
    start_brace = html.index('{', idx)
    depth = 0
    i = start_brace
    while i < len(html):
        c = html[i]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                end_idx = i + 1
                break
        i += 1
    else:
        print(f"  ERROR: Could not find closing brace in {key}")
        return None, False

    old_func = html[idx:end_idx]
    new_html = html[:idx] + NEW_FUNC + html[end_idx:]
    print(f"  {key}: replaced {len(old_func)} chars -> {len(NEW_FUNC)} chars")
    return new_html, True

with open(PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

changed = False
for key in ['srcDoc', 'uncompiledSrcDoc']:
    if key not in data:
        print(f"Key '{key}' not found, skipping")
        continue
    val = data[key]
    # srcDoc can be a dict with 'html', 'css', 'js' keys, or a plain string
    if isinstance(val, dict):
        html = val.get('html', '')
        sub_key = 'html'
    else:
        html = val
        sub_key = None
    print(f"Processing {key}[{sub_key or 'str'}] ({len(html)} chars)...")
    new_html, ok = replace_function_in_html(html, key)
    if ok:
        if sub_key:
            data[key][sub_key] = new_html
        else:
            data[key] = new_html
        changed = True
    else:
        sys.exit(1)

if changed:
    with open(PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("\nDone — Rep_Table.json updated successfully.")
else:
    print("No changes made.")
