# Block 02 Exercise 05 — Useful comparison mode

Selected by Abril: one size versus the other sizes of the same product. Audience: an e-commerce manager deciding which size to investigate for a possible size-guide, description or quality review.

App: https://hello-world-puce-two-10.vercel.app/fashion-returns/index.html#view=overview&comparison=size-peers&start=2025-10&end=2026-09&category=Dresses&product=P001&size=XS
Implementation commit:0713d2996e27479b2771821dab6390e2ebcc8bcf. Verified November11,2026.

## Basis

Use COMPARISON MODE → Selected size vs other sizes. Choose one product and size in the shared filters. The selected size is compared with the pooled sold/returned units of the other sizes of the same product, over the same full selected original-sale period. The selected size is EXCLUDED from the reference. The benchmark is internal to the approved synthetic dataset; no external industry rate or target was invented.

Both groups use the same source foundation v1.1, eligibility rules and fixed observation cutoff2026-11-09. Original sale cohorts are fully observed for30days after delivery. The benchmark recomputes a ratio of summed returned/sold units, never an unweighted average of size rates. The difference uses unrounded rates and is displayed in percentage points.

This is a descriptive prioritization aid. Different customers and sample sizes can affect the result; a gap does not prove a sizing problem or estimate a causal effect. The product manager should investigate the underlying records and reasons before choosing an intervention.

## Independent validation

Wrap Dress(P001), XS, Oct2025–Sep2026:
- Selected:18 returned /53 sold =33.9622641509% → screen33.96%.
- Reference S/M/L/XL:75 returned /335 sold =22.3880597015% → screen22.39%.
- Difference:(18/53−75/335)×100 =+11.5742044495pp → screen+11.57pp.

The reference's335 sold units exclude the selected53. Its75 returned units exclude the selected18. Counts were calculated independently with read-only SQL on the preserved raw sales, returns and variants tables imported into Supabase; this check does not use the dashboard aggregate or semantic views. It is not a claim that a new raw-source SQL query was run on Supabase.

Model tests compare133 selections with independent preserved raw source rows:120 product/size full-period cohorts,12 monthly WrapDress/XS cohorts, and one genuine empty selection. Tests also cover missing product/size, a zero peer denominator, and positive peer sales with zero returns using isolated in-memory fixtures. All passed. Existing30 primary-KPI source checks and3 malformed-data guards passed again using the frozen baseline response.

The deployed browser showed the same selected/benchmark values. Switching to monthly comparison and back kept the four headline values identical:33.96%,18,$1566.40,72.22%. Removing the product selection showed a choose-product-and-size message, without inventing a reference. The published example had no horizontal overflow at1512px.

## Missing-data rules and state

- No single product or size selected: explain the required selection; no benchmark or difference is fabricated.
- Selected size has no sold units: existing overview empty state; ratesN/A, no fabricated comparison.
- Other sizes have no sold units: comparison unavailable; no difference calculated.
- Positive sales but zero returned units: valid0% rate.
- Primary KPI remains returned units / sold units for the selected cohort. Mode switches do not change filters or KPI definitions.
- Previous monthly mode remains available. It uses latest selected month vs immediate prior month, while this optional mode uses the full selected period; both are explicitly labeled.
- Mode is retained in the URL. Reset restores the default filters and monthly mode.

## Reproduce and evidence

Open the linked example or select Dresses, WrapDress, XS and the full period, then choose the optional comparison. Switch modes and confirm identical headline values. Clear Product to see the missing-selection explanation.

Local exercise package:01-comparison-mode.png is an actual deployed screenshot;02-validated-comparison.png is a generated calculation report from the executed source check. source-size-comparison.sql and source-size-results.json record the independent source calculation; validation-results.json records model tests; browser-verification.json records published screen observations. All data is synthetic; no source rows or database permissions changed.

## Independent source calculation

```sql
-- Independent read-only SQLite source-table calculation. No analytical views used.
WITH chosen_sales AS (
 SELECT s.*,v.size FROM sales s JOIN variants v ON s.variant_id=v.variant_id
 WHERE v.product_id='P001' AND s.sale_date BETWEEN '2025-10-01' AND '2026-09-30'
 AND s.delivered_date <= date('2026-11-09','-30 days')
), groups AS (
 SELECT CASE WHEN size='XS' THEN 'Selected size XS' ELSE 'Other sizes S/M/L/XL' END comparison_group,
 count(*) sales_lines,sum(units_sold) sold_units FROM chosen_sales GROUP BY 1
), returned AS (
 SELECT CASE WHEN s.size='XS' THEN 'Selected size XS' ELSE 'Other sizes S/M/L/XL' END comparison_group,
 sum(r.returned_units) returned_units
 FROM returns r JOIN chosen_sales s ON s.sale_line_id=r.sale_line_id
 WHERE julianday(r.return_date)-julianday(s.delivered_date) BETWEEN 1 AND 30
 AND r.return_date<='2026-11-09' GROUP BY 1
)
SELECT g.*,coalesce(r.returned_units,0) returned_units,
 100.0*coalesce(r.returned_units,0)/nullif(g.sold_units,0) rate_pct
FROM groups g LEFT JOIN returned r USING(comparison_group) ORDER BY comparison_group;

```

```json
[
  {
    "comparison_group": "Other sizes S/M/L/XL",
    "sales_lines": 284,
    "sold_units": 335,
    "returned_units": 75,
    "rate_pct": 22.388059701492537
  },
  {
    "comparison_group": "Selected size XS",
    "sales_lines": 44,
    "sold_units": 53,
    "returned_units": 18,
    "rate_pct": 33.9622641509434
  }
]
```
