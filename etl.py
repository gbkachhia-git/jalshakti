import pandas as pd
import numpy as np
import json
import math
from datetime import datetime

SRC = "/mnt/user-data/uploads/Project Infomration/ProjectPortfolio_all_20261003_061248.xlsx"
OUT = "/tmp/build/data"

def fix_mojibake(s):
    """Repair common double-encoded UTF-8-as-CP1252 artifacts (e.g. smart quotes/dashes
    rendered as 'Ã¢â‚¬Å"') and the literal '_x000D_' carriage-return escape some Excel
    exports leave in text. Pure display/encoding normalization - no factual content changed."""
    if not isinstance(s, str):
        return s
    out = s.replace('_x000D_', ' ').replace('_x000d_', ' ')
    for _ in range(2):
        if 'Ã' in out or 'â€' in out:
            try:
                out = out.encode('cp1252').decode('utf-8')
            except (UnicodeDecodeError, UnicodeEncodeError):
                break
        else:
            break
    out = ' '.join(out.split())
    return out

def clean(v):
    """Make a value JSON-safe: NaN/NaT -> None, Timestamp -> ISO date, numpy types -> python."""
    if v is None:
        return None
    if isinstance(v, (pd.Timestamp, np.datetime64)):
        if pd.isna(v):
            return None
        return pd.Timestamp(v).strftime("%Y-%m-%d")
    if isinstance(v, (np.floating, float)):
        if v is None or (isinstance(v, float) and math.isnan(v)):
            return None
        return round(float(v), 2)
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.bool_, bool)):
        return bool(v)
    if isinstance(v, str):
        v = fix_mojibake(v.strip())
        if v == "" or v.lower() == "nan":
            return None
        return v
    if pd.isna(v):
        return None
    return v

def df_records(df):
    return [{k: clean(v) for k, v in row.items()} for row in df.to_dict(orient="records")]

print("Loading sheets...")
wap = pd.read_excel(SRC, sheet_name="wapcos_all_projects")
p2 = pd.read_excel(SRC, sheet_name="Projects (2)")
act = pd.read_excel(SRC, sheet_name="Active Projects", header=3)
inact = pd.read_excel(SRC, sheet_name="Inactive Projects", header=3)
bid = pd.read_excel(SRC, sheet_name="forensic_bid_analysis")
dprv = pd.read_excel(SRC, sheet_name="forensic_dpr_rfp_varience")
bom = pd.read_excel(SRC, sheet_name="forensic_bom_variance")
budget = pd.read_excel(SRC, sheet_name="forensic_budget_component")
ledger = pd.read_excel(SRC, sheet_name="forensic_ledger")

# ---------- MASTER PROJECTS TABLE ----------
# base = wap (richest status/financial/health fields), enrich with location/type/component from p2,
# and client / invoicing / milestone detail from 'act' (Active Projects detailed tracker).
p2_small = p2[['Code', 'Location', 'Type', 'Component']].drop_duplicates(subset='Code')
master = wap.merge(p2_small, left_on='project_code', right_on='Code', how='left')

act_small = act[['Project No', 'Client', 'Amount (INR)', 'Planned Start', 'End Date',
                  'Project Tasks / Milestones (Nos)', 'Tasks / Milestones Achieved (Nos)',
                  'Achieved %', 'Remaining Tasks / Milestones (Nos)', '% Pending',
                  'Revised Date of Completion', 'Revised cost, if any',
                  'Invoices Raised (INR)', 'Invoice % Raised', 'Invoices to be Raised (INR)',
                  'Invoices Realized (INR)', 'Debtors (INR)', 'Reason for Delay - Debtor Realization']]
act_small = act_small.rename(columns={
    'Project No': 'project_code', 'Client': 'client', 'Amount (INR)': 'contract_amount',
    'Planned Start': 'planned_start', 'End Date': 'planned_end',
    'Project Tasks / Milestones (Nos)': 'milestones_total',
    'Tasks / Milestones Achieved (Nos)': 'milestones_achieved',
    'Achieved %': 'milestones_achieved_pct',
    'Remaining Tasks / Milestones (Nos)': 'milestones_remaining',
    '% Pending': 'milestones_pending_pct',
    'Revised Date of Completion': 'revised_completion',
    'Revised cost, if any': 'revised_cost',
    'Invoices Raised (INR)': 'invoices_raised',
    'Invoice % Raised': 'invoice_pct',
    'Invoices to be Raised (INR)': 'invoices_to_be_raised',
    'Invoices Realized (INR)': 'invoices_realized',
    'Debtors (INR)': 'debtors',
    'Reason for Delay - Debtor Realization': 'delay_reason',
}).drop_duplicates(subset='project_code')

master = master.merge(act_small, on='project_code', how='left')

# ---------- Priority / Attention derivation (documented rule) ----------
def derive_priority(row):
    if row['project_status'] == 'Completed':
        return 'Completed'
    db = row['delay_band']
    dl = row['days_late'] if pd.notna(row['days_late']) else 0
    elapsed = row['elapsed_pct']
    progress = row['physical_progress_pct']
    if db == '181+ days' or dl >= 180:
        return 'Critical'
    if db == '91-180 days' or (90 <= dl < 180):
        return 'High'
    if db in ('31-90 days', '1-30 days') or (0 < dl < 90):
        return 'Medium'
    # not formally late-tracked, but badly behind elapsed-time vs progress and flagged Delayed
    if row['health'] == 'Delayed' and pd.notna(elapsed) and pd.notna(progress) and (elapsed - progress) >= 100:
        return 'High'
    if row['health'] == 'Delayed':
        return 'Medium'
    return 'Normal'

master['priority'] = master.apply(derive_priority, axis=1)

# ---------- Geography normalization (India states/UTs vs overseas vs unclassified) ----------
INDIAN_STATES = {
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
    'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
    'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
    'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
    'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi',
    'Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
}
CITY_TO_COUNTRY = {
    'Kathmandu': 'Nepal', 'Unguja': 'Tanzania', 'Dushanbe': 'Tajikistan', 'Dodoma': 'Tanzania',
    'Lome': 'Togo', 'Beira': 'Mozambique', 'Kabul': 'Afghanistan', 'Bogura': 'Bangladesh',
    'Nigde': 'Turkey', 'Gaoui': 'Chad', 'Pacific Harbour': 'Fiji', 'Newton And Lungi': 'Sierra Leone',
    'Nimba County': 'Liberia',
}
DIRECT_COUNTRIES = {
    'Fiji','Togo','Rwanda','Nepal','Tanzania','Mozambique','Mongolia','Ghana','Uganda','Angola',
    'Afghanistan','Cambodia','Botswana','Uzbekistan','Democratic Republic of the Congo','Liberia',
    'Lesotho','Ethiopia','Ethopia','Timor-Leste','Turkey','Kenya','Chad','The Gambia',
}
UNCLASSIFIED = {'Odramakachu', 'Vulcan International', 'Sonauli', 'India', 'Not recorded', None}

def classify_geo(loc):
    if loc is None or (isinstance(loc, float) and pd.isna(loc)):
        return ("Not Available", "Unclassified")
    loc = str(loc).strip()
    if loc in INDIAN_STATES:
        return (loc, "India")
    if loc in CITY_TO_COUNTRY:
        return (CITY_TO_COUNTRY[loc], "Overseas")
    if loc in DIRECT_COUNTRIES:
        c = 'Ethiopia' if loc == 'Ethopia' else loc
        return (c, "Overseas")
    if loc in UNCLASSIFIED:
        return (loc, "Unclassified")
    return (loc, "Unclassified")

geo = master['Location'].apply(classify_geo)
master['geo_name'] = geo.apply(lambda t: t[0])
master['geo_region'] = geo.apply(lambda t: t[1])

# financial utilization
master['utilization_pct'] = np.where(
    (master['award_value'].notna()) & (master['award_value'] > 0),
    (master['actual_cost'] / master['award_value'] * 100).round(2),
    np.nan
)

cols_order = [
    'project_code', 'project_title', 'vertical', 'Location', 'geo_name', 'geo_region', 'Type', 'Component',
    'project_status', 'health', 'priority', 'start_month', 'finish_month',
    'physical_progress_pct', 'elapsed_pct', 'days_late', 'delay_band', 'eta', 'eta_note',
    'award_value', 'actual_cost', 'earned_value', 'utilization_pct',
    'planned_billing_value', 'realized_value', 'outstanding_value', 'realized_pct', 'billed_pct',
    'is_stalled', 'client', 'contract_amount', 'planned_start', 'planned_end',
    'milestones_total', 'milestones_achieved', 'milestones_achieved_pct', 'milestones_remaining',
    'milestones_pending_pct', 'revised_completion', 'revised_cost',
    'invoices_raised', 'invoice_pct', 'invoices_to_be_raised', 'invoices_realized', 'debtors',
    'delay_reason',
]
master_out = master[cols_order].rename(columns={
    'project_code': 'code', 'project_title': 'title', 'Location': 'location',
    'Type': 'contract_type', 'Component': 'component', 'project_status': 'status',
    'start_month': 'start_date', 'finish_month': 'planned_finish',
})

records = df_records(master_out)
with open(f"{OUT}/projects.json", "w") as f:
    json.dump(records, f)
print("projects.json:", len(records), "records")

# ---------- LEGACY / INACTIVE PROJECT REGISTER ----------
inact_small = inact.rename(columns={
    'Project No': 'code', 'Name of the Project': 'title', 'Vertical': 'vertical',
    'Type': 'contract_type', 'Amount (INR)': 'contract_amount', 'Client': 'client',
    'Planned Start': 'planned_start', 'Start Date': 'start_date', 'End Date': 'planned_end',
    'Achieved %': 'milestones_achieved_pct', 'Invoices Raised (INR)': 'invoices_raised',
    'Invoices Realized (INR)': 'invoices_realized', 'Debtors (INR)': 'debtors',
})[['code', 'title', 'vertical', 'contract_type', 'contract_amount', 'client',
    'planned_start', 'start_date', 'planned_end', 'milestones_achieved_pct',
    'invoices_raised', 'invoices_realized', 'debtors']]
legacy_records = df_records(inact_small)
with open(f"{OUT}/legacy_projects.json", "w") as f:
    json.dump(legacy_records, f)
print("legacy_projects.json:", len(legacy_records), "records")

# ---------- FORENSIC / ANALYTICAL TABLES (all flagged is_demo_data=True in source -> illustrative) ----------
for name, df in [("forensic_bid", bid), ("forensic_variance", dprv), ("forensic_bom", bom),
                  ("forensic_budget", budget), ("forensic_ledger", ledger)]:
    recs = df_records(df)
    with open(f"{OUT}/{name}.json", "w") as f:
        json.dump(recs, f)
    print(f"{name}.json:", len(recs), "records")

# ---------- META ----------
total_projects = len(master_out)
total_legacy = len(legacy_records)
vertical_counts = master_out['vertical'].value_counts(dropna=False).to_dict()
location_counts = master_out['location'].value_counts(dropna=False).to_dict()
status_counts = master_out['status'].value_counts(dropna=False).to_dict()
health_counts = master_out['health'].value_counts(dropna=False).to_dict()
priority_counts = master_out['priority'].value_counts(dropna=False).to_dict()

meta = {
    "generated_on": "2026-10-03",
    "dashboard_built_on": datetime.now().strftime("%Y-%m-%d"),
    "data_scope_note": (
        "The supplied files are WAPCOS Limited's internal Project Management System (Core PMS) "
        "portfolio export, not a Ministry-of-Jal-Shakti-wide dataset. WAPCOS is a Mini-Ratna PSU "
        "under the Department of Water Resources, River Development & Ganga Rejuvenation, Ministry "
        "of Jal Shakti, and executes consultancy/EPC/PMC/DPR assignments across Water Resources, "
        "Waste Water, Power, Infrastructure, Environment and Construction & Commercial verticals for "
        "central ministries, state governments, PSUs and institutions across India and a few overseas "
        "locations. No data for NMCG, CWC, CGWB, NWM, NIH or Jal Jeevan Mission programme-level MIS was "
        "present in the supplied folder, so this dashboard represents WAPCOS's own project portfolio "
        "only, framed as a Ministry-level oversight view of one of its key implementing PSUs."
    ),
    "sources": [
        {"file": "ProjectPortfolio_all_20261003_061248.xlsx", "sheet": "wapcos_all_projects", "rows": 1148,
         "purpose": "Primary project register: status, health, schedule & financial KPIs"},
        {"file": "ProjectPortfolio_all_20261003_061248.xlsx", "sheet": "Projects (2)", "rows": 1155,
         "purpose": "State/location, contract type & service-component enrichment"},
        {"file": "ProjectPortfolio_all_20261003_061248.xlsx", "sheet": "Active Projects", "rows": 1155,
         "purpose": "Client names, milestones, invoicing & debtor realization detail"},
        {"file": "ProjectPortfolio_all_20261003_061248.xlsx", "sheet": "Inactive Projects", "rows": 746,
         "purpose": "Legacy/closed-out project register (not part of the live 1,148-project portfolio)"},
        {"file": "ProjectPortfolio_all_20261003_061248.xlsx", "sheet": "forensic_bid_analysis", "rows": 122,
         "purpose": "ILLUSTRATIVE bid-comparison analysis (source-flagged is_demo_data=TRUE)"},
        {"file": "ProjectPortfolio_all_20261003_061248.xlsx", "sheet": "forensic_dpr_rfp_varience", "rows": 45,
         "purpose": "ILLUSTRATIVE DPR-estimate vs RFP-award variance (source-flagged is_demo_data=TRUE)"},
        {"file": "ProjectPortfolio_all_20261003_061248.xlsx", "sheet": "forensic_bom_variance", "rows": 135,
         "purpose": "ILLUSTRATIVE bill-of-material quantity/rate variance (source-flagged is_demo_data=TRUE)"},
        {"file": "ProjectPortfolio_all_20261003_061248.xlsx", "sheet": "forensic_budget_component", "rows": 720,
         "purpose": "ILLUSTRATIVE budget vs actual by cost component (source-flagged is_demo_data=TRUE)"},
        {"file": "ProjectPortfolio_all_20261003_061248.xlsx", "sheet": "forensic_ledger", "rows": 229,
         "purpose": "ILLUSTRATIVE debtor/creditor ageing ledger (source-flagged is_demo_data=TRUE)"},
        {"file": "project-list-report.xlsx", "sheet": "17 component sheets", "rows": 1042,
         "purpose": "Cross-check: project count by service component (close match, different snapshot time)"},
        {"file": "WAPCOS_FullPortfolio_Report_20261003_065819.xlsx", "sheet": "20 year sheets", "rows": 1149,
         "purpose": "Cross-check: project count by year of record creation"},
        {"file": "Project Information.xlsx", "sheet": "Sheet2", "rows": 14,
         "purpose": "Small sample export, structurally consistent with the above - not separately used"},
    ],
    "totals": {
        "total_projects": total_projects,
        "total_legacy_projects": total_legacy,
        "vertical_counts": vertical_counts,
        "location_counts": location_counts,
        "status_counts": status_counts,
        "health_counts": health_counts,
        "priority_counts": priority_counts,
    },
    "kpi_definitions": {
        "On Track": "health = 'On Time' or 'Ahead of Schedule' (source PMS schedule-health field).",
        "Delayed": "health = 'Delayed' (source PMS schedule-health field, derived from planned vs elapsed timeline).",
        "Critical Priority": "delay_band = '181+ days' OR days_late >= 180.",
        "High Priority": "delay_band = '91-180 days' OR 90 <= days_late < 180, OR (health='Delayed' and project not started while elapsed time already exceeds planned duration by 100%+).",
        "Medium Priority": "delay_band in {'31-90 days','1-30 days'} OR 0 < days_late < 90, OR health='Delayed' with no further banding available.",
        "Financial Utilization %": "actual_cost / award_value * 100, shown only where award_value > 0.",
        "Outstanding Value": "planned_billing_value - realized_value, as computed in the source PMS export (outstanding_value field).",
        "Stalled": "is_stalled = TRUE in source, i.e. project_status = 'Not started / Stuck'.",
        "Attention Required list": "All projects with priority in {Critical, High} and status != Completed.",
    },
}
with open(f"{OUT}/meta.json", "w") as f:
    json.dump(meta, f, indent=2)
print("meta.json written")

# ---------- Combined JS data bundle (so dashboard works via plain file:// open, no server/fetch needed) ----------
bundle = {
    "projects": records,
    "legacy": legacy_records,
    "forensicBid": df_records(bid),
    "forensicVariance": df_records(dprv),
    "forensicBom": df_records(bom),
    "forensicBudget": df_records(budget),
    "forensicLedger": df_records(ledger),
    "meta": meta,
}
with open(f"{OUT}/dataset.js", "w") as f:
    f.write("/* Auto-generated data layer. Source: WAPCOS Core PMS exports in the supplied\n")
    f.write("   'Project Infomration' folder. See meta.sources for file/sheet provenance.\n")
    f.write("   This file is pure data (no presentation logic) and is regenerated by etl.py. */\n")
    f.write("window.MJS_DASHBOARD_DATA = ")
    f.write(json.dumps(bundle))
    f.write(";\n")
print("dataset.js written, size bytes:", __import__('os').path.getsize(f"{OUT}/dataset.js"))
print("\nTotals:", json.dumps(meta['totals'], indent=2)[:2000])
