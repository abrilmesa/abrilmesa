# Block 02 Exercise 03 — Filter and comparison verification

Live app: https://hello-world-puce-two-10.vercel.app/fashion-returns/index.html

Synthetic foundation v1.1. No metric definitions or source data changed for this exercise. Existing controls were tested in the deployed app on November 10, 2026.

Shared scope: original sale-month range, category, product and size affect all headline KPIs, monthly points and category bars. Monthly rates and the overall reference are recomputed as ratios of sums. A visible summary includes the active period/segments, sales-line count and sold units. Reset restores the full default cohort.

The separate monthly comparison uses the latest selected sale month versus its immediate predecessor, with the same category/product/size filters. Its prior month can be outside the displayed range; both month names and denominators are shown. It compares rates, not totals for unequal time spans. The date controls select whole months only, so there are no partial calendar-month or month-to-date selections. Every delivery has a full 30-day return window as of November 9, 2026. Month length, sales volume and product mix can still differ; this is descriptive analysis. October 2025 has no prior month in source coverage and explicitly shows comparison unavailable.

Independent check: read-only SQLite SQL against the preserved source tables imported into Supabase, not against cohort_context or dashboard JSON. Original sale dates April 1–September 30, 2026; Dresses; M; all products. Source = 71 returns / 323 sold = 21.9814241486%; deployed screen = 21.98% with71/323 visible. Numerator/denominator differences are zero; displayed rate matches at two decimal places. The local source check is not a claim that a new direct-source query was executed on Supabase.

The same segment's monthly comparison independently checks as September10/53=18.8679245% vs August8/57=14.0350877%, difference+4.8328368 percentage points, displayed+4.83pp.

Real empty selection: October2025, Dresses, Midi Dress(P002), XS. Source has zero sales lines. Screen shows N/A rates, zero additive totals, no charts, a helpful no-sales explanation and Reset filters. Reset restores22.87%,1660,$110852.40,50.84%.

Files: source-check.sql + source-results.json; browser-observations.json; comparison-observations.json; verification-results.json. The downloadable/local exercise package contains four main PNGs: default, filtered, empty and source-versus-screen. The source-versus-screen PNG is a generated evidence report using query results and observed screen values, not a screenshot of a SQL tool. Optional fifth PNG shows the unavailable first-month comparison.

Prompt excerpt: Add shared period/segment filters and reset; retain visible filter context; reconcile the filtered KPI independently; handle empty results and partial comparison periods explicitly.

## Independent source query (SQLite)

```sql
-- SQLite read-only check against preserved source tables, not semantic views.
-- Bind parameters are recorded in source-results.json.
WITH chosen_sales AS (
 SELECT s.* FROM sales s
 JOIN variants v ON v.variant_id=s.variant_id
 JOIN products p ON p.product_id=v.product_id
 WHERE s.sale_date BETWEEN :start AND :end
 AND s.delivered_date <= date('2026-11-09','-30 days')
 AND p.category=:category AND v.size=:size
 AND (:product='' OR v.product_id=:product)
), sold AS (
 SELECT count(*) sales_lines,coalesce(sum(units_sold),0) sold_units FROM chosen_sales
), returned AS (
 SELECT coalesce(sum(r.returned_units),0) returned_units
 FROM returns r JOIN chosen_sales s ON r.sale_line_id=s.sale_line_id
 WHERE julianday(r.return_date)-julianday(s.delivered_date) BETWEEN 1 AND 30
 AND r.return_date <= '2026-11-09'
)
SELECT sales_lines,sold_units,returned_units,
 100.0*returned_units/nullif(sold_units,0) unit_return_rate_pct
FROM sold CROSS JOIN returned;
```

## Exact results and treatments

```json
{
  "independent_source": "Read-only SQLite over preserved source tables sales, variants, products and returns; no cohort_context view used. These are the source inputs imported into Supabase.",
  "live_screen": "https://hello-world-puce-two-10.vercel.app/fashion-returns/index.html#view=overview&start=2026-04&end=2026-09&category=Dresses&size=M",
  "filters": "Original sales Apr 1\u2013Sep 30 2026 / Dresses / size M / all products; as-of Nov 9 2026; mature 30-day return window",
  "returned_units": {
    "source": 71,
    "screen": 71,
    "difference": 0
  },
  "sold_units": {
    "source": 323,
    "screen": 323,
    "difference": 0
  },
  "rate_pct": {
    "source_unrounded": 21.981424148606813,
    "source_rounded": 21.98,
    "screen": 21.98,
    "difference_at_display_precision_pp": 0
  },
  "comparison_filtered": {
    "current_month": "2026-09",
    "current_returned": 10,
    "current_sold": 53,
    "prior_month": "2026-08",
    "prior_returned": 8,
    "prior_sold": 57,
    "change_pp": 4.832836809003643
  },
  "partial_periods": "Controls select whole calendar months only; all selected deliveries have completed 30 days. No month-to-date/extrapolated comparison is shown. Rates adjust for differing sold-unit counts; unequal month lengths and product mix can still affect interpretation.",
  "empty_case": {
    "filters": {
      "start": "2025-10-01",
      "end": "2025-10-31",
      "category": "Dresses",
      "size": "XS",
      "product": "P002"
    },
    "source": {
      "sales_lines": 0,
      "sold_units": 0,
      "returned_units": 0,
      "unit_return_rate_pct": null
    }
  },
  "reset_passed": true,
  "missing_prior_comparison": "October2025 prior outside coverage, shown unavailable",
  "passed": true
}
```
