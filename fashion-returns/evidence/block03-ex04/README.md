# Block 03 Exercise 04 — Connected analytical journey

Live route: https://hello-world-puce-two-10.vercel.app/fashion-returns/index.html#view=overview&start=2026-04&end=2026-09&category=Trousers

Synthetic foundationv1.1 stored in Supabase, existing aggregate read API, hosted in Vercel. No source data, KPI calculation or database permission changed.

## Changes

All overview links/KPI actions connect to Products & sizes or Return reasons. An explicit scope panel explains shared original-sale period/category/product/size and both investigative routes. Cross-view buttons retain the same cohort. Breadcrumb, sidebar Overview and brand link now share one restoration behavior: return to the overview entry filters/comparison, even after narrowing a product/size or changing a diagnostic filter.

View changes now add browser history entries instead of replacing every screen. Browser Back/Forward restore URL context; the overview entry is attached to its history state so refresh retains it and direct visits do not reuse a stale session-wide overview snapshot. Diagnostic selections update their own screen entry.

ViewB labels its local reason/month evidence filter beside the KPIs. It intersects the global cohort for supporting evidence only and never changes headline denominators. It survives switching A↔B under the same cohort; changing any global filter clears it. Reset all filters clears both global/local context and the saved overview entry, so a subsequent in-app return does not undo the explicit reset.

A final keyboard check exposed focus falling to the document body when Browser Back removed a selected reason panel. The hash-navigation handler now explicitly focuses the destination heading. Keyboard navigation moves focus to the destination heading; heatmap cells and reason-mix segments work with Enter/Space. On narrow screens, scroll regions contain wide tables/charts, with visible horizontal-scroll instructions and keyboard focus. No record-detail access is claimed; this exercise connects the existing three screens.

## Expected route

Global selection: April–September2026, Trousers, all products and sizes. Unit return rate remains the original-sale-cohort returned/sold ratio.

| Step | Expected sold | Expected returned | Expected rate | Observed |
|---|---:|---:|---:|---|
|1 Overview|1106|313|28.30%|matched|
|2 EnterA, then choose CroppedTrousers/XS|24|9|37.50%|matched|
|3 Back to overview|1106|313|28.30%|matched|
|4 OpenB, select April/Fit locally|1106|313|28.30%|matched; local count26/45 April returns|

Browser Back from selectedA restored starting overview; Forward restored selectedA. Breadcrumb and sidebar Overview restored the starting cohort. ReloadingB retained local April/Fit selection and cohort. A↔B preserved cohort; local count26 did not replace313 headline returns. Changing global start toMay cleared local evidence; returning Overview restoredApril start and313/1106.

Empty test: October2025 / Dresses / MidiDress / XS has0sold,0returns,N/Arates in bothAandB. Returning restores313/1106, not zero or an altered starting period. Reset test restores all categories,Oct2025–Sep2026,1660/7257=22.87%; returning does not undo reset.

18 observed local-app journey states were independently checked against preserved raw SQLite sales and returns under identical filters. Sold units are summed separately from raw returns to avoid multiplying sales. Each displayed KPI matches source at displayed precision. The local app used live Supabase aggregates; this was not a fresh source-table SQL execution in Supabase. See expected-vs-observed.json and journey-observed-local.json.

## Narrow-screen checks

Actual viewport390px, document width390px for both views: no page-level horizontal overflow. Navigation buttons fit. Heatmap visible320px/content660px; keyboard ArrowRight moved its scrollLeft40px with focus retained. ViewB chart visible320px/content700px in its bounded scroll region. Both views use readable labels, counts and explicit local/global scope; complex charts/tables deliberately scroll rather than shrink labels to illegibility. Screenshots05/06 show both complete narrow screens. No formal screen-reader audit claimed.

## Evidence

01→04 sequential published-screen route;05/06 narrow-screen checks. Source and browser observations are preserved; screenshots are the app, not wireframes. Individual records remain the next layer.
