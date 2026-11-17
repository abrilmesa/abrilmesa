# Block 03 Exercise 02 — Working product and size diagnosis

Live view: https://hello-world-puce-two-10.vercel.app/fashion-returns/index.html#view=products&start=2025-10&end=2026-09&category=Trousers

Synthetic foundation v1.1, seed 20261110. Existing Supabase aggregate RPC; original sale-month/category/product/size filters. No database changes or new permissions.

Ranking: descending returned units, sold denominators, rates and share of cohort returns. Heatmap: product × size, fixed 0–100% color scale and exact returned/sold counts. Ratios recomputed from sums. Zero sales=N/A; positive sales/no returns=0%. Small samples retained with visible counts. No unknown product/category/size keys exist in the approved foundation; Not reported reasons remain included in all-return counts.

For Trousers, Oct 2025–Sep 2026: 688 returned / 2435 sold = 28.254620%; product sums and heatmap sums equal overview totals. Cropped Trousers contributes 127/688=18.459302% of returns; its rate is127/385=32.987013%. Straight Trousers contributes117/688=17.005814% but has a lower rate117/467=25.053533%; volume is not risk. Cropped XS has14/44=31.818182% and37 sales lines.

Independent verification against preserved raw sales/returns:22 filter selections checked, including categories, all12 Trousers months, five Cropped sizes and an empty cohort. Product/cell sold, returned, cents and sales-line totals reconcile; overview uses the same KPI contract. See validation-results.json. This does not claim a fresh SQL query against Supabase source tables.

Product/cell selection updates shared filters and URL; a downloadable selection context includes filters, totals and intended sale_line_id grain. Includes non-returned sales in denominator. Individual record access is explicitly not implemented; that is the later detail layer. Back to overview restores the saved entry period, filters and comparison mode.

Implemented app code: fashion-returns/app.js, model.js, styles.css. Screenshot evidence captured from the implemented app, not the prior wireframes.
