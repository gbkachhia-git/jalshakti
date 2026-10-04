# Ministry of Jal Shakti — Executive Portfolio Dashboard

A standalone, offline-first executive decision-support dashboard built from the project-level data found in the supplied Excel workbooks. It is a static site (HTML/CSS/vanilla JS) — no server, no build step, no external account needed.

## 1. What this dashboard actually is (read this first)

The supplied files are **not** a Ministry-of-Jal-Shakti-wide dataset. They are the internal Project Management System ("Core PMS") export of the Ministry's implementing PSU that executes consultancy / EPC / PMC / DPR assignments across Water Resources, Waste Water, Power, Infrastructure, Environment and Construction & Commercial verticals, for central ministries, state governments, PSUs and institutions across India and a handful of overseas locations.

No programme-level MIS data for NMCG, CWC, CGWB, NWM, NIH or Jal Jeevan Mission was present in the supplied folder. So this dashboard is best understood as a **Ministry-level oversight view of one key implementing agency's live project portfolio** — not a whole-of-Ministry dashboard. This scope is stated plainly in the Overview and Data Quality tabs of the app itself.

The agency's own name has been removed from the dashboard's titles, headers and descriptive text per your request. It is **kept, verbatim, in two places, deliberately**:
- The one business vertical in the source data that is itself literally named "WAPCOS" (1 project) — this is a real categorical value from the source register, not UI branding, so relabelling or hiding it would misrepresent the data. You'll see it as a normal card on the Departments tab.
- The real on-disk source file names and internal sheet names in the Data Quality tab's provenance footer (e.g. `ProjectPortfolio_all_20261003_061248.xlsx`) — again, these are factual citations, not branding, and changing them would make the provenance trail inaccurate.

If you want these handled differently, say so and they can be adjusted.

## 2. Running it

Open `index.html` directly in a modern browser (Chrome/Edge recommended). No install, no server required — everything the dashboard needs to show your data is bundled locally in `data/dataset.js`, `js/`, and `css/`.

**One exception — the India map needs internet.** The "India Map" panels (on the Overview and Geography tabs) use live map tiles from public map providers (OpenStreetMap, Esri World Imagery, OpenTopoMap) so you can switch between street/satellite/terrain views. Loading those map images requires an active internet connection. If you're fully offline, every other part of the dashboard (all KPIs, tables, charts, filters, search, drill-downs) still works normally — only the map tiles themselves won't render, and the panel will show blank/grey tiles.

## 3. What's in this round of changes

- **Logo**: a placeholder emblem now sits top-left of the header (`assets/emblem-placeholder.svg`). The India emblem image you attached was a watermarked stock photo, not official Government of India artwork, so it was **not** embedded — using it would have put a visible "Dreamstime" watermark into a government-styled deliverable and raised a licensing question. Swap in your real, unwatermarked logo file by replacing `assets/emblem-placeholder.svg` (or point `index.html`'s `<img class="appbar-emblem">` `src` at a PNG/SVG of your choice — any reasonable square-ish image will fit the 42×42px slot).
- **Layout**: "India & Overseas Footprint" now sits directly under "Portfolio at a Glance" on the Overview tab, with the new interactive India map directly below it.
- **India map**: a full Leaflet map with Street / Satellite / Terrain base layers (switchable via the layer control, top-right of the map), state-wise markers sized by project count and coloured by delayed/critical share, and click-through to the same state drill-down used elsewhere in the dashboard. Present on both the Overview and Geography tabs.
- **Tab order**: Overview → Financial → Geography → Timeline → Departments → Programmes → Projects → Actions → Issues → Data Quality.
- **Charts**: doughnut/pie charts now render with a pseudo-3D cylinder-extrusion effect, and bar charts have a glossy gradient + soft shadow treatment. (These are CSS/Canvas visual effects on top of Chart.js — the underlying numbers are unchanged.)
- **Theme**: a light/dark toggle sits in the top-right of the header (moon/sun icon). Your choice is remembered in the browser via `localStorage`.

## 4. Folder structure

```
index.html              Entry point — open this file
css/dashboard.css        All styling, incl. light & dark theme tokens
js/                      App logic (vanilla JS, no framework/build step)
  utils.js, state.js      Formatting helpers, global state & filter engine
  theme.js                Light/dark theme toggle
  chart3d.js               Pseudo-3D Chart.js plugins (doughnut extrusion, glossy bars)
  charts.js                Chart.js chart builders
  geomap.js                 Leaflet India map
  datatable.js, drawer.js, actions.js, views.js, app.js
  chart.umd.min.js          Chart.js v4.4.4, vendored locally
  leaflet/                  Leaflet v1.9.4, vendored locally (JS, CSS, marker icons)
assets/
  emblem-placeholder.svg    Placeholder header logo — replace with your real one
data/
  dataset.js                Combined data bundle loaded by the app (window.MJS_DASHBOARD_DATA)
  projects.json, legacy_projects.json, forensic_*.json, meta.json
                             Same data as plain JSON, for reference/reuse outside the dashboard
etl.py                   The Python script that built data/* from the source Excel workbooks
```

## 5. Data sources

| File | Sheet(s) | Rows | Used for |
|---|---|---|---|
| `ProjectPortfolio_all_20261003_061248.xlsx` | `wapcos_all_projects` | 1,148 | Primary project register — status, health, schedule & financial KPIs |
| `ProjectPortfolio_all_20261003_061248.xlsx` | `Projects (2)` | 1,155 | State/location, contract type & service-component enrichment |
| `ProjectPortfolio_all_20261003_061248.xlsx` | `Active Projects` | 1,155 | Client names, milestones, invoicing & debtor realization |
| `ProjectPortfolio_all_20261003_061248.xlsx` | `Inactive Projects` | 746 | Legacy/closed-out register (kept separate, viewable under "Legacy Register") |
| `ProjectPortfolio_all_20261003_061248.xlsx` | `forensic_bid_analysis`, `forensic_dpr_rfp_varience`, `forensic_bom_variance`, `forensic_budget_component`, `forensic_ledger` | 122 / 45 / 135 / 720 / 229 | **Illustrative only** — every row is flagged `is_demo_data = TRUE` in the source file itself; shown on the Financial tab as a clearly-labelled methodology preview, never mixed into the live KPIs |
| `project-list-report.xlsx`, the full-portfolio yearly report export, `Project Information.xlsx` | — | — | Cross-checked against the primary register during ETL for consistency |

## 6. KPI definitions (as implemented)

- **On Track**: health = "On Time" or "Ahead of Schedule".
- **Delayed**: health = "Delayed".
- **Priority bands**: Critical = 181+ days late or in that delay band; High = 91–180 days late, or not-started with elapsed time more than double the planned duration; Medium = 1–90 days late or otherwise flagged Delayed with no further detail.
- **Attention Required**: priority is Critical or High, and status is not Completed.
- **Financial Utilization**: total actual cost ÷ total award value, across whatever project set is currently filtered.
- **Geographic coverage**: distinct Indian states/UTs + distinct overseas countries represented in the project set, resolved from the free-text location field (ambiguous values are kept in "Unclassified" rather than guessed).

## 7. Assumptions & limitations

- "Since Last Review" shows "not available" — the supplied export is a single point-in-time snapshot (03 Oct 2026); no prior snapshot exists to compute period-over-period change against.
- One project (code H4782) shows actual cost roughly 4,000× its award value, which is almost certainly a data-entry issue in the source PMS export. The figure is **shown as-is, not corrected**, and is flagged with a visible warning on both the Financial and Data Quality tabs.
- A small number of free-text location values (~12 records) couldn't be confidently resolved to an Indian state/UT or a country and are kept in an "Unclassified" bucket rather than guessed — see the Data Quality tab.
- Two records have residual encoding artifacts in free-text fields that an automated repair pass couldn't fully clean (0.17% of records) — a known, minor, documented limitation.
- The India map requires internet access to load its base-map imagery (see Section 2). No other part of the dashboard has this requirement.
- All data is embedded directly in `data/dataset.js` at build time. To refresh the dashboard with newer source data, re-run `etl.py` against the updated Excel workbook(s) and reload `index.html` — there is no live database connection.

## 8. Customizing

- **Logo**: replace `assets/emblem-placeholder.svg` with your official logo file (same filename), or edit the `src` on the `<img class="appbar-emblem">` element in `index.html`.
- **Theme colors**: all colors are CSS custom properties at the top of `css/dashboard.css` (`:root` for light, `:root[data-theme="dark"]` for dark).
- **Refreshing data**: re-run `python3 etl.py` (requires `pandas` and `openpyxl`) against the source workbook(s), which regenerates everything under `data/`.
