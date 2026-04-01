#!/usr/bin/env python3
"""
update_queries.py — Batch-Update aller Salesforce Query Metadata Files
Macht das Dashboard low-maintenance: keine hardcodierten Datumsranges oder OwnerId-Listen mehr.
"""

import json
import re
import os
import glob

QUERIES_DIR = os.path.join(os.path.dirname(__file__), "pages", "Dashboard", "queries")

# Forecast-Queries nutzen repIdInClauseWithManagers + getForecastPeriodId
FORECAST_QUERIES = {"Q_Forecast_Commit", "Q_Forecast_Commit_Pilots"}

# Queries die keine Änderungen brauchen (schon dynamisch oder kein OwnerId-Filter)
SKIP_QUERIES = {"Q_Users_Team"}

DYNAMIC_BINDING_PATHS = [
    {"key": "actionConfiguration.formData.CUSTOM_ACTION.params[0].value"},
    {"key": "actionConfiguration.formData.CUSTOM_ACTION.path"},
]


def transform_soql(soql: str, query_name: str) -> tuple[str, bool]:
    """Gibt (transformed_soql, was_changed) zurück."""
    original = soql
    is_forecast = query_name in FORECAST_QUERIES

    # 1. ActivityDate / dateTimestampContractreceived__c Datumsrange → THIS_QUARTER
    soql = re.sub(
        r"(ActivityDate|dateTimestampContractreceived__c)\s*>=\s*\d{4}-\d{2}-\d{2}"
        r"\s+AND\s+\1\s*<=\s*\d{4}-\d{2}-\d{2}",
        r"\1 = THIS_QUARTER",
        soql,
    )

    # 2. CreatedDate mit Timestamp-Range → THIS_QUARTER
    soql = re.sub(
        r"CreatedDate\s*>=\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z"
        r"\s+AND\s+CreatedDate\s*<=\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z",
        "CreatedDate = THIS_QUARTER",
        soql,
    )

    # 3. StartDate Datumsliteral → THIS_QUARTER (Q_Quotas)
    soql = re.sub(
        r"StartDate\s*=\s*\d{4}-\d{2}-\d{2}",
        "StartDate = THIS_QUARTER",
        soql,
    )

    # 4. PeriodId Hardcoding → dynamic (nur Forecast-Queries)
    if is_forecast:
        soql = re.sub(
            r"PeriodId\s*=\s*'[0-9A-Za-z]+'",
            "PeriodId = '{{JS_Config.getForecastPeriodId()}}'",
            soql,
        )

    # 5. OwnerId IN (hardcoded IDs) → dynamic binding
    owner_binding = (
        "{{JS_Config.repIdInClauseWithManagers()}}"
        if is_forecast
        else "{{JS_Config.repIdInClause()}}"
    )
    soql = re.sub(
        r"OwnerId\s+IN\s+\('[0-9A-Za-z'',\s]+'\)",
        f"OwnerId IN ({owner_binding})",
        soql,
    )

    # 6. QuotaOwnerId IN (hardcoded IDs) → dynamic binding (Q_Quotas)
    soql = re.sub(
        r"QuotaOwnerId\s+IN\s+\('[0-9A-Za-z'',\s]+'\)",
        "QuotaOwnerId IN ({{JS_Config.repIdInClause()}})",
        soql,
    )

    # 7. CreatedById IN (hardcoded IDs) → dynamic binding (Q_Opps_Created_QTD, Q_PilotOpps_QTD)
    soql = re.sub(
        r"CreatedById\s+IN\s+\('[0-9A-Za-z'',\s]+'\)",
        "CreatedById IN ({{JS_Config.repIdInClause()}})",
        soql,
    )

    return soql, soql != original


def process_file(path: str) -> bool:
    query_name = os.path.basename(os.path.dirname(path))

    # Nur Q_ Salesforce-Queries anfassen
    if not query_name.startswith("Q_"):
        return False
    if query_name in SKIP_QUERIES:
        return False

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    action = data.get("unpublishedAction", {})
    form_data = action.get("actionConfiguration", {}).get("formData", {})
    custom = form_data.get("CUSTOM_ACTION", {})
    params = custom.get("params", [])

    if not params:
        return False

    # Transformations anwenden
    original_value = params[0].get("value", "")
    original_path = custom.get("path", "")

    new_value, v_changed = transform_soql(original_value, query_name)
    new_path, p_changed = transform_soql(original_path, query_name)

    if not (v_changed or p_changed):
        return False

    # Werte schreiben
    params[0]["value"] = new_value
    custom["path"] = new_path

    # dynamicBindingPathList ergänzen (deduped)
    existing_keys = {e["key"] for e in action.get("dynamicBindingPathList", [])}
    new_bindings = list(action.get("dynamicBindingPathList", []))
    for entry in DYNAMIC_BINDING_PATHS:
        if entry["key"] not in existing_keys:
            new_bindings.append(entry)
    action["dynamicBindingPathList"] = new_bindings

    # userSetOnLoad: false → Queries laufen nur via initDashboard()
    action["userSetOnLoad"] = False

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
        f.write("\n")

    return True


def main():
    pattern = os.path.join(QUERIES_DIR, "*/metadata.json")
    files = sorted(glob.glob(pattern))
    changed = []
    skipped = []

    for path in files:
        query_name = os.path.basename(os.path.dirname(path))
        if process_file(path):
            changed.append(query_name)
        else:
            skipped.append(query_name)

    print(f"\n✅ Geändert ({len(changed)}):")
    for q in changed:
        print(f"   {q}")

    print(f"\n⏭  Unverändert ({len(skipped)}):")
    for q in skipped:
        print(f"   {q}")


if __name__ == "__main__":
    main()
