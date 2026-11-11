# Block 02 Exercise 04 — Overview polish and actual tests

App: https://hello-world-puce-two-10.vercel.app/fashion-returns/index.html
Implementation commit: c166a0cedec90922e6ffa12b5c8ec917a7bf9a04
Date: November 10, 2026 (America/New_York).
All data remains synthetic foundation v1.1. No business formulas, imported rows or database permissions changed.

## Three observed priorities and fixes

1. Narrow-screen readability, control size and contrast. At 320px the existing filter labels were9px, metric notes10px and help controls19px. These became11px labels,12px metric notes and28px help controls (32px at390px). Compact month/year control labels prevent clipping; the full period remains in the active-filter summary. Mobile visual order now follows the keyboard order. The muted note on the primary lilac card was4.42:1; its corrected color gives5.38:1. Chart month/year labels have more space, and a readable summary/table supplies the exact values. Card fade animation was removed so refreshed figures are immediately readable.

2. Keyboard focus. Before the fix, Enter on a monthly point opened Products & sizes but focus fell to BODY. Now the destination heading receives visible focus; chart points have a dark focus ring. Dialogs have explicit accessible names/descriptions, and the skip link targets a focusable main region. Monthly values have a caption and a keyboard-focusable scroll region.

3. Loading and data-error feedback. The original local503 test showed a technical error with no alert role or nearby retry button. Now there is a plain-language alert and Try again. Status updates identify loading/validation, disable filters/Reset during requests and indicate retained data during a refresh. Failed or invalid refreshes preserve the existing figures and successful-read time. Retry recovers.

## Tests actually performed

- Published app inspected at measured1512px desktop,320px and390px narrow widths. No page-level horizontal overflow. Refund value fits, and no KPI-label clipping was detected at320px. See production-checks.json.
- Keyboard: category type-ahead d + Enter selects Dresses; Tab moves to Product with a visible outline. Enter activates Reset and monthly points. Enter on September opens its breakdown and focuses page-title. The overview button works with Enter. Skip-to-content + Enter focuses main. Help opens with Enter; Escape closes it and restores focus to its originating help button.
- Chart alternative: Enter opens Read monthly values;12 rows are present. The September row is518 sold,107 returned,20.66%. Category bars include names, rates and returned/sold counts in text. Titles, percentages, USD units and non-color labels were inspected. Spot checks of the specified text/color pairs were calculated; this is not a complete accessibility certification.
- Controlled slow load: isolated local server delayed the response15seconds. Observed aria-busy=true, status text, disabled filters/Reset and no KPI cards before completion. Valid response then showed22.87%,1660,$110852.40,50.84%.
- Controlled initial error: HTTP503 produced role=alert, no KPI cards and Try again. Enter on Try again recovered the figures and focused the page title.
- Controlled refresh error: second response503 preserved all four figures and the read timestamp, with a visible failure/retained-data message. Another refresh recovered.
- Controlled incomplete response: dropping a cohort aggregate was rejected; figures and the successful-read time remained unchanged.
- Regression:30 preserved-source versus frozen API-response selections and3 malformed-data guards passed again. No metric-definition changes.

Production desktop/mobile and keyboard checks used the deployed Vercel app connected to Supabase. Loading/error/partial-response checks used the same application files with a copied validated synthetic fixture on an isolated local server. They did not induce a real Supabase outage or write any rows. Their screenshots display a CONTROLLED LOCAL SIMULATION banner. Slow-load simulation tested15seconds; a20second timeout case was not run. Screen-reader speech output, every browser and a full formal accessibility audit were not tested.

## Concrete verification steps

1. Open the app at320px and390px. Check readable date labels, help buttons, monetary value and filter summary; confirm no page-level sideways scroll.
2. Keyboard: focus Category, type d and Enter, then Tab to Product. Activate Reset with Enter. Tab through the monthly points and Enter on September; verify focus at the new heading. Open metric help with Enter and close with Escape. Open the monthly-values table with Enter.
3. For failure tests, run `python3 tests/controlled-server.py` from the downloadable app package. The package includes public/data/validated-snapshot.json. Open `http://127.0.0.1:8772/?scenario=slow&run=unique1` for the15second load; `?scenario=initial-error&run=unique2` for first-load503 followed by successful Try again; `?scenario=refresh-error&run=unique3` for success then one failed refresh; `?scenario=partial&run=unique4` for a rejected incomplete refresh. Use a fresh run value for an independent test. Production has no failure switches.

## Evidence images

01-before-mobile.png: original published screen at320px.
02-after-mobile.png: updated published screen at320px (same comparison width).
03-after-desktop.png: updated published screen at1512px.
04-keyboard-and-chart-table.png: published chart/table with keyboard focus.
05-loading-simulation.png: isolated local delayed response.
06-error-simulation.png: isolated local initial503 error and retry.

Raw observations: keyboard-checks.json, production-checks.json, loading-error-checks.json, before-error-observation.json, contrast-spot-checks.json. PNGs are supplied in the local exercise package for upload to the course portal.

## Published observations

```json
{
  "app": "https://hello-world-puce-two-10.vercel.app/fashion-returns/index.html",
  "sourceCommit": "c166a0cedec90922e6ffa12b5c8ec917a7bf9a04",
  "finalMobile320": {
    "clippedKpiLabels": 0,
    "helpSize": 28,
    "labelFont": "11px",
    "noteColor": "rgb(101, 91, 110)",
    "noteFont": "12px",
    "overflow": false,
    "periodLabels": [
      "Oct 2025",
      "Sept 2026"
    ],
    "refundFits": true,
    "width": 320
  },
  "finalMobile390": {
    "helpSize": 32,
    "overflow": false,
    "refundFits": true,
    "width": 390
  },
  "finalDesktop": {
    "overflow": false,
    "source": "● Connected to Supabase · foundation v1.1",
    "width": 1512
  },
  "liveKeyboardCategory": "Sales: October 2025 – September 2026 · Dresses · All products · All sizes · 1,766 sales lines · 2,067 sold units",
  "liveKeyboardNext": {
    "activeId": "product",
    "focusVisible": true
  },
  "liveTable": {
    "rows": 12,
    "lastRow": "September 2026\t518\t107\t20.66%"
  },
  "livePointFocus": {
    "focusVisible": true,
    "haloOpacity": "1",
    "label": "September 2026: 20.66%, 107 returned, 518 sold. Open product breakdown"
  },
  "liveNavigationFocus": {
    "activeId": "page-title",
    "context": "Sales: September 2026 – September 2026 · All categories · All products · All sizes · 450 sales lines · 518 sold units",
    "heading": "Products & sizes."
  }
}
```

## Controlled simulation observations

```json
{
  "simulation": "Isolated local server serving the actual app files; copied validated synthetic fixture; 15-second delay; HTTP503; truncated response. No Supabase writes or production failure toggles.",
  "loadingCheck": {
    "busy": "true",
    "filtersDisabled": true,
    "metrics": 0,
    "resetDisabled": true,
    "status": "Loading and validating data…",
    "statusRole": "status"
  },
  "loadingComplete": [
    "22.87%",
    "1,660",
    "$110,852.40",
    "50.84%"
  ],
  "initialErrorCheck": {
    "alertRole": "alert",
    "filtersDisabled": true,
    "message": "Data could not be loaded\n\nThe data service could not be reached. Check your connection and try again.\n\nNo metrics are shown until a complete response has been validated.\n\nTry again",
    "metrics": 0,
    "retry": "Try again"
  },
  "retryCheck": {
    "kpis": [
      "22.87%",
      "1,660",
      "$110,852.40",
      "50.84%"
    ],
    "focus": "page-title"
  },
  "refreshErrorCheck": {
    "message": "Refresh failed. The data service could not be reached. Showing the last successfully read, validated data. Its read time has not changed. Try Refresh data again.",
    "kpis": [
      "22.87%",
      "1,660",
      "$110,852.40",
      "50.84%"
    ],
    "timestampUnchanged": true
  },
  "refreshRecovered": {
    "status": "● Connected to Supabase · foundation v1.1",
    "kpis": [
      "22.87%",
      "1,660",
      "$110,852.40",
      "50.84%"
    ]
  },
  "partialCheck": {
    "notice": "Refresh failed. The new response did not pass data validation. Showing the last successfully read, validated data. Its read time has not changed. Try Refresh data again.",
    "kpis": [
      "22.87%",
      "1,660",
      "$110,852.40",
      "50.84%"
    ],
    "timestampUnchanged": true
  }
}
```
