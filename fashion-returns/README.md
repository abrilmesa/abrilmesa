# Fashion Returns Analytics

Implemented Layout A for Block 02, Exercise 02. Entirely synthetic class data, seed 20261110. Source foundation v1.1 is frozen; this does not describe a real brand.

## Data flow

Vercel serves the static HTML/CSS/JavaScript in `public`. The browser calls the Supabase Postgres function `fashion_dashboard_v1` with a public publishable key. This read-only function returns month/product/size aggregates from the approved `cohort_context` view and reason aggregates from `return_detail`. No secret or service-role key is used. Base tables remain protected with RLS and revoked public table privileges.

The original sales grain is preserved by aggregating returns per sales line before joining sales. The API then sums those safe measures into disjoint month/product/size groups. Client filters sum the groups and recompute ratios from numerators and denominators. Refunds are summed as integer cents.

## Setup

1. Run `supabase/05-dashboard-read-api.sql` in the existing fashion-returns project's SQL Editor, after the previously approved source tables and semantic views.
2. `public/config.js` contains only the project URL and public publishable key. Never substitute a secret/service_role key.
3. For a standalone Vercel project, import this directory with preset Other, no build/install command, output directory `public`. When added to the existing static repository as `fashion-returns/`, deploy its public files at that path without changing the existing root config.
4. Locally: `python3 -m http.server 8771 --bind 127.0.0.1 --directory public`, then open http://127.0.0.1:8771/.

Normal operation always uses Supabase. A missing or failed connection never falls back to example values. The downloadable local package also includes a validated snapshot: `?preview=snapshot` explicitly selects and labels that local preview; it is not included in the production upload.

## Metrics and comparisons

Default sales coverage: 2025-10-01 to 2026-09-30. Fixed observation cutoff: 2026-11-09. Foundation validated: 2026-11-10. Fully observed 30-day return window after delivery; returns attributed to original sale month.

- Unit return rate = returned units / sold units; default 1660 / 7257 = 22.874466%.
- Returned units = 1660.
- Refunded amount = USD 110852.40; product refunds, not profit loss.
- Fit share = 844 / 1660 = 50.843373%; unknown reasons stay in the denominator.

Latest selected month is compared with the immediately preceding month under the same product/category/size filters, even if that prior month is outside the selected display range. Its two month labels and denominators are explicit. If either denominator is zero or the previous month is outside coverage, display comparison unavailable. Never invent a target.

The screen distinguishes historical observation cutoff, foundation validation date and last successful API read time. Manual Refresh data rereads the frozen foundation; there is no scheduled source refresh. A failed or partial read leaves the last successfully read validated data visible with a failure message. Client verification rejects changed frozen totals; a new source version needs explicit revalidation before acceptance. This is a client load guard, not production refresh orchestration.

## Working scope

Overview, cohort filters, Reset, metric help dialogs, accessible monthly values and first aggregate product/reason breakdown screens work. Category/month selection opens a breakdown with context. Detailed diagnostic interactions and sale-line/return-record screens remain for later blocks. This exercise does not claim that the final three-level app is complete.

## Validation

Live Supabase response reconciles to the preserved source tables for 30 selections: all data; Dresses/M April–September; all 12 months; 15 category/size segments; and an empty inconsistent segment. Integer quantities and cents agree exactly. Duplicate aggregate keys, incomplete snapshots and missing required measures are rejected. October has no prior comparison; September vs August is -0.230875 percentage points. See `validation-results.json` in the downloadable evidence package.

## Design critique and selected improvement

Three proposed improvements: make the monthly comparison easier to scan; give the refund amount more space; simplify freshness text. Abril selected the first. The implemented comparison panel now separates current month, prior month and percentage-point change, and displays both returned/sold counts and the common comparison basis.

Supabase database-function permission pattern: https://supabase.com/docs/guides/database/functions . Public execution is intentional for these nonconfidential synthetic aggregates only.
