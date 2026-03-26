---
name: appsmith-dashboard
description: SMB-spezifischer Kontext für das HeyJobs SMB Steering Dashboard. Ergänzt den globalen heyjobs-appsmith Skill um Team-Struktur, Level-Configs, Quartalswechsel-Workflow und Dashboard-Architektur. Immer zusammen mit /heyjobs-appsmith verwenden.
tools: Read, Glob, Grep, Edit, Write, Bash
---

# SMB Steering Dashboard — Spezifische Patterns

> Voraussetzung: globaler `/heyjobs-appsmith` Skill für Appsmith-Constraints und SF-Datenmodell.

## Team-Struktur

```js
MANAGERS: {
  'Q2 2026': {
    wolves: { label: 'Wolves', emoji: '🐺', tlName: 'Mareike Schliesser' },
    titans: { label: 'Titans', emoji: '⚡', tlName: 'Jan Hinrichsen' },
    locos:  { label: 'Locos',  emoji: '🔥', tlName: 'Raven Schulz' },
  },
},
// tlName muss exakt mit Manager.Name in SF übereinstimmen (IsActive = true!)
```

## Rep-Level Config

```js
REP_LEVELS: { 'Alina Kühne': '2', 'Raven Schulz': '3', ... }

LEVEL_CONFIG: {
  '3':      { bookingsWeight: 0.75, pilotenWeight: 0.25, pilotenTarget: 12 },
  '2':      { bookingsWeight: 0.50, pilotenWeight: 0.50, pilotenTarget: 16 },
  '1':      { bookingsWeight: 0.25, pilotenWeight: 0.75, pilotenTarget: 18 },
  'rampup': { bookingsWeight: 1.00, pilotenWeight: 0.00, pilotenTarget: 0  },
}
// LEVEL_OVERRIDES für rep-spezifische Ausnahmen (quartals-aware, z.B. David Beck Q1)
```

## EXCLUDED_REPS

```js
EXCLUDED_REPS: ['Friederike Wilsenack'],
// Aktiv in SF unter Ferdinand (Wolves), aber aus Dashboard ausgeschlossen bis auf Widerruf.
// buildTeamsFromQuery() filtert diese vor Team-Zuordnung heraus.
// Nicht entfernen ohne explizite Anweisung von Ferdinand.
```

## JSObject-Dateistruktur

```
JS_Config   → Teams, Levels, Thresholds, Quarter-Helpers, buildTeamsFromQuery()
JS_Data     → alle KPI-Berechnungen via _r(queryName)
JS_Init     → initDashboard() + saveSnapshot() (auto nach jedem Init)
JS_Filters  → Filter-State, teamOptions, quarterOptions (liest aus JS_Snapshots + appsmith.store)
JS_Snapshots→ { data: {} } — git-committetes Snapshot-JSObject (update_quarter.py)
```

## Quartalswechsel

```bash
python3 scripts/update_quarter.py 2 2026
# → Aktualisiert QTD-Query-Dates + OwnerId IN (...) via sf data query + git push
# → Snapshot kommt automatisch von Appsmith (saveSnapshot nach jedem Init)
```

**Manuell prüfen beim Quartalswechsel:**
1. `JS_Config.MANAGERS` für neues Quartal vorhanden?
2. `JS_Config.REP_LEVELS` für neue Reps ergänzen?
3. `EXCLUDED_REPS` aktuell?

## Neue KPI hinzufügen — Checkliste

1. `pages/Dashboard/queries/Q_NeueKPI/metadata.json` erstellen
2. `JS_Init.initDashboard()`: Query zu `Promise.allSettled([...])` hinzufügen
3. `JS_Init.saveSnapshot()`: Query zu `queries: { ... }` hinzufügen
4. `JS_Data._r() liveMap`: Query-Referenz ergänzen
5. `JS_Data`: Neue `*ByRep()` Funktion mit `JS_Data._r('Q_NeueKPI')`
6. `JS_Data.allRepKPIs()`: Neues Feld ins Rep-Objekt
7. Widget-Binding auf `defaultModel.repRows` oder `JS_Data.heroKPIs()`
8. `defaultModel`: Neue Query ins Dependency-Array

## Thresholds (Traffic Light)

```js
THRESHOLDS: {
  compositeAttainment: { green: 80, amber: 60 },  // % of quota
  coverage:            { green: 2.5, amber: 1.5 }, // x quota
  winRate:             { green: 30,  amber: 20  },  // %
  staleRate:           { green: 15,  amber: 30  },  // % (invertiert: niedriger = besser)
}
STALE_DAYS: 14
FORECASTING_TYPE_BOOKINGS: '0DbW7000000DaaLKAS'
```
