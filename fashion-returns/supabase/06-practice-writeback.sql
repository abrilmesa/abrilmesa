-- Week 3 Exercise 2 · applied 2026-11-17 as migration practice_units_sold_writeback_v1.
-- Protected read/write of ONE numeric field: public.sales.units_sold (record key sale_line_id).
-- Functions are executable by service_role only; the Vercel function /api/fashion-record calls them
-- with SUPABASE_SECRET_KEY after checking LAB_ACCESS_KEY. anon/authenticated cannot read or write.
-- Stale-edit protection: update requires the expected current value AND expected revision (count of edits).
-- Every saved change is logged in practice_edits with old/new value, reason and a synthetic-practice label.

CREATE TABLE IF NOT EXISTS public.practice_edits (
  edit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sale_line_id text NOT NULL REFERENCES public.sales(sale_line_id),
  field text NOT NULL CHECK (field = 'units_sold'),
  old_value integer NOT NULL CHECK (old_value > 0),
  new_value integer NOT NULL CHECK (new_value > 0 AND new_value <> old_value),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 500),
  label text NOT NULL DEFAULT 'synthetic practice adjustment' CHECK (label = 'synthetic practice adjustment'),
  edited_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.practice_edits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.practice_edits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fashion_sale_line_v1(p_sale_line_id text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'sale_line_id', s.sale_line_id, 'order_id', s.order_id, 'order_line_number', s.order_line_number,
    'sale_date', s.sale_date, 'delivered_date', s.delivered_date,
    'product_id', p.product_id, 'product_name', p.product_name, 'category', p.category, 'size', v.size,
    'units_sold', s.units_sold, 'net_unit_price_usd', s.net_unit_price_usd, 'sales_amount_usd', s.sales_amount_usd,
    'linked_returns', (SELECT count(*) FROM public.returns r WHERE r.sale_line_id = s.sale_line_id),
    'eligible', EXISTS (SELECT 1 FROM public.eligible_sales e WHERE e.sale_line_id = s.sale_line_id),
    'revision', (SELECT count(*) FROM public.practice_edits x WHERE x.sale_line_id = s.sale_line_id),
    'last_edit', (SELECT to_jsonb(x) - 'sale_line_id' FROM public.practice_edits x WHERE x.sale_line_id = s.sale_line_id ORDER BY x.edit_id DESC LIMIT 1),
    'source_type', s.source_type, 'read_at', statement_timestamp())
  FROM public.sales s JOIN public.variants v USING (variant_id) JOIN public.products p USING (product_id)
  WHERE s.sale_line_id = p_sale_line_id;
$$;

CREATE OR REPLACE FUNCTION public.fashion_sale_lines_v1(p_product_id text, p_size text, p_start date, p_end date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('sale_line_id', c.sale_line_id, 'sale_date', c.sale_date,
    'units_sold', c.units_sold, 'returned_units', c.returned_units) ORDER BY c.sale_date, c.sale_line_id), '[]'::jsonb)
  FROM public.cohort_context c
  WHERE c.product_id = p_product_id AND c.size = p_size AND c.sale_date BETWEEN p_start AND p_end;
$$;

CREATE OR REPLACE FUNCTION public.fashion_update_units_sold_v1(p_sale_line_id text, p_expected_units integer, p_expected_revision integer, p_new_units integer, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s public.sales%ROWTYPE; rev integer; ret integer;
BEGIN
  SELECT * INTO s FROM public.sales WHERE sale_line_id = p_sale_line_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('state','not_found'); END IF;
  SELECT count(*) INTO rev FROM public.practice_edits WHERE sale_line_id = p_sale_line_id;
  IF s.units_sold <> p_expected_units OR rev <> p_expected_revision THEN
    RETURN jsonb_build_object('state','conflict','current', public.fashion_sale_line_v1(p_sale_line_id));
  END IF;
  SELECT count(*) INTO ret FROM public.returns WHERE sale_line_id = p_sale_line_id;
  IF p_new_units IS NULL OR p_new_units < GREATEST(1, ret) OR p_new_units > 20 OR p_new_units = s.units_sold THEN
    RETURN jsonb_build_object('state','invalid','message', format('New units must be an integer from %s to 20 and differ from %s.', GREATEST(1, ret), s.units_sold));
  END IF;
  IF p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 10 AND 500 THEN
    RETURN jsonb_build_object('state','invalid','message','Reason must be 10–500 characters.');
  END IF;
  UPDATE public.sales SET units_sold = p_new_units, sales_amount_usd = p_new_units * net_unit_price_usd
   WHERE sale_line_id = p_sale_line_id;
  INSERT INTO public.practice_edits (sale_line_id, field, old_value, new_value, reason)
   VALUES (p_sale_line_id, 'units_sold', s.units_sold, p_new_units, btrim(p_reason));
  RETURN jsonb_build_object('state','saved','record', public.fashion_sale_line_v1(p_sale_line_id));
END $$;

REVOKE ALL ON FUNCTION public.fashion_sale_line_v1(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fashion_sale_lines_v1(text,text,date,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fashion_update_units_sold_v1(text,integer,integer,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fashion_sale_line_v1(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fashion_sale_lines_v1(text,text,date,date) TO service_role;
GRANT EXECUTE ON FUNCTION public.fashion_update_units_sold_v1(text,integer,integer,integer,text) TO service_role;
GRANT SELECT, INSERT ON public.practice_edits TO service_role;
