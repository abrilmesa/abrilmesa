-- Read-only public endpoint for this entirely synthetic class dataset.
-- Base tables remain protected: no table grants or RLS changes.
-- Returns only month/product/size aggregates, not order or customer records.
BEGIN;
CREATE OR REPLACE FUNCTION public.fashion_dashboard_v1()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
SET statement_timeout = '10s'
AS $function$
  WITH cohort AS (
    SELECT substring(sale_date::text, 1, 7) AS month,
      product_id, product_name, category, size,
      COUNT(*) AS sales_lines, SUM(units_sold) AS sold,
      SUM(returned_units) AS returned,
      SUM(refund_usd) AS refunds,
      SUM(fit_returned_units) AS fit
    FROM public.cohort_context
    GROUP BY 1,2,3,4,5
  ), reasons AS (
    SELECT substring(r.sale_date::text, 1, 7) AS month,
      v.product_id, p.category, v.size, d.reason_code,
      d.reason_label, d.reason_group,
      SUM(r.returned_units) AS returned
    FROM public.return_detail r
    JOIN public.variants v ON r.variant_id = v.variant_id
    JOIN public.products p ON v.product_id = p.product_id
    JOIN public.return_reasons d ON r.reason_code = d.reason_code
    GROUP BY 1,2,3,4,5,6,7
  )
  SELECT jsonb_build_object(
    'contract', 'foundation-v1.1',
    'source_type', 'synthetic',
    'business_as_of', '2026-11-09',
    'validated_on', '2026-11-10',
    'coverage_start', '2025-10-01',
    'coverage_end', '2026-09-30',
    'queried_at', statement_timestamp(),
    'cohorts', (SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.month,c.product_id,c.size), '[]'::jsonb) FROM cohort c),
    'reasons', (SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.month,r.product_id,r.size,r.reason_code), '[]'::jsonb) FROM reasons r)
  );
$function$;
REVOKE ALL ON FUNCTION public.fashion_dashboard_v1() FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fashion_dashboard_v1() TO anon, authenticated;
COMMENT ON FUNCTION public.fashion_dashboard_v1() IS
  'Intentional public read access to aggregate SYNTHETIC class data only. No writes, no source-row access. Fixed approved foundation v1.1.';
COMMIT;

-- Expected: 6229 lines, 7257 sold, 1660 returned, 110852.40 refunds, 844 Fit.
SELECT SUM((c->>'sales_lines')::integer) AS sales_lines,
       SUM((c->>'sold')::integer) AS sold_units,
       SUM((c->>'returned')::integer) AS returned_units,
       SUM((c->>'refunds')::numeric) AS refunds_usd,
       SUM((c->>'fit')::integer) AS fit_units
FROM jsonb_array_elements(public.fashion_dashboard_v1()->'cohorts') c;
