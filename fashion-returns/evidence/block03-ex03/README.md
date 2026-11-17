# Block 03 Exercise 03 — Return reasons and cohort mix

Working URL: https://hello-world-puce-two-10.vercel.app/fashion-returns/index.html#view=reasons&start=2025-10&end=2026-09&category=Trousers

Synthetic foundation v1.1; seed20261110. Data stored in Supabase, read through the existing aggregate RPC, displayed in Vercel. No database edits or permission changes. Primary KPI contract unchanged: original-sale cohorts, mature30-day windows, ratio of summed units, unknown reasons retained, zero sold denominator=N/A.

## Different analytical angle

Reason-count bars show all seven reported reasons, returned-unit counts and shares of all returns. Monthly100% stacked columns show five reason groups by original sale month, not return month. Each column labels its returned-unit base. Text/table alternative provides exact counts and shares. No-return months have no composition, not a fabricated100%. All charts inherit sale period/category/product/size.

Local reason or month×group selection updates a separate evidence context and URL without altering cohort KPIs. Unknown / Not reported remains visible. Individual return_id access remains the later detail layer; this exercise does not pretend aggregates are records.

## Hypothesis and countercheck

Hypothesis: A shift toward Fit-related returns may explain the later cohort’s change in overall return rate. Compare the first and last equal-length original-sale cohorts under the same segment filters; decompose overall return rate into Fit returns/sold and other+unreported returns/sold. This challenges a Fit-only explanation rather than inferring cause from composition.

Trousers, Oct2025–Mar2026 vs Apr–Sep2026, each6months:

| Measure | Early | Late | Change |
|---|---:|---:|---:|
| Sold units |1329|1106| |
| Returned units |375|313| |
| Overall rate |375/1329=28.216704%|313/1106=28.300181%|+0.083477pp|
| Fit share |175/375=46.666667%|163/313=52.076677%|+5.410011pp|
| Fit returns/sold |175/1329=13.167795%|163/1106=14.737794%|+1.569999pp|
| Other+unknown returns/sold |200/1329=15.048909%|150/1106=13.562387%|−1.486522pp|

Observation: fit share rises while the total return rate is almost flat because the increase in Fit incidence is offset by lower other/unknown incidence. A composition change is not sufficient evidence of an equivalent risk change. Absolute Fit units actually fall175→163 as sold population falls; all denominators are visible. Not reported30/688=4.36% remains included.

Visible confounding: product sales mix changes. Wide Leg Trousers falls189/1329=14.22% to134/1106=12.12% of sold units. The expandable table shows all product weights; product/size filters permit narrower checks. No buyer characteristics, verified fit measurements, intervention or control group are available. Synthetic associations cannot establish causes or demonstrate real company behavior. Next evidence: linked returns, measurements, buyer feedback and controlled evaluation of a size-guide change.

For odd-length selections, omit the middle month from the paired comparison only and state this explicitly; charts/headlines still include it. One-month selection: no time comparison. Missing sales/return denominators: N/A, with explanation. No invented target or causal significance claim.

## Validation

19 selections checked against preserved raw SQLite sales/returns with unique dimension lookups, using read-only access. Reason and monthly group counts match raw records; reasons/months reconcile to total returns; primary totals match the overview; paired cohorts have equal lengths and no overlap; reason-specific incidence sums to overall rate. Includes full categories,12monthly cohorts, selectedproductsize, empty and odd-length selections; additional zero-return/zero-sale fixtures. This is not a new SQL execution against live Supabase source tables. Browser checks separately verify the live aggregate API and UI interactions.

Source: work/fashion-diagnostics/verify-b.mjs and validation-results.json. No original data modified.
