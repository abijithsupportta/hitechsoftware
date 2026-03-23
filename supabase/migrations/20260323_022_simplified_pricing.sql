-- ============================================================================
-- Migration 022: Simplified Pricing — Purchase Price + MRP Only
-- Hi Tech Software
--
-- Simplifies the pricing model:
--   - Only two prices matter: purchase_price (cost) and MRP (selling price)
--   - selling_price and minimum_selling_price are deprecated (kept for history)
--   - Product MRP and purchase_price auto-update from latest stock entry
--   - mrp_change_log table tracks all MRP changes (auto + manual)
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Create mrp_change_log table for audit trail
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mrp_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.inventory_products(id) ON DELETE CASCADE,
  old_mrp NUMERIC(12,2),
  new_mrp NUMERIC(12,2) NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('auto_from_stock_entry', 'manual_override')),
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mrp_change_log_product
  ON public.mrp_change_log(product_id, changed_at DESC);

COMMENT ON TABLE public.mrp_change_log IS
  'Tracks every MRP change on a product — whether automatic (from stock entry) or manual override.';

-- Enable RLS
ALTER TABLE public.mrp_change_log ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can read
CREATE POLICY mrp_change_log_select ON public.mrp_change_log
  FOR SELECT TO authenticated USING (true);

-- RLS: authenticated users can insert (service layer controls who can write)
CREATE POLICY mrp_change_log_insert ON public.mrp_change_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- --------------------------------------------------------------------------
-- 2. Update trigger to also auto-update product MRP and purchase_price
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_update_product_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_wac             NUMERIC(12,2);
  v_latest_pp       NUMERIC(12,2);
  v_latest_mrp      NUMERIC(12,2);
  v_current_mrp     NUMERIC(12,2);
  v_target_product  UUID;
BEGIN
  -- Determine which product was affected
  v_target_product := COALESCE(NEW.product_id, OLD.product_id);

  -- Skip if no product linked
  IF v_target_product IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate weighted average cost
  v_wac := public.calculate_weighted_average_cost(v_target_product);

  -- Get latest purchase price and MRP from most recent stock entry
  SELECT sei.purchase_price, sei.mrp
  INTO v_latest_pp, v_latest_mrp
  FROM public.stock_entry_items sei
  JOIN public.stock_entries se ON se.id = sei.stock_entry_id AND se.is_deleted = false
  WHERE sei.product_id = v_target_product
    AND sei.purchase_price IS NOT NULL
  ORDER BY se.entry_date DESC, sei.created_at DESC
  LIMIT 1;

  -- Get current MRP for change logging
  SELECT mrp INTO v_current_mrp
  FROM public.inventory_products
  WHERE id = v_target_product;

  -- Update the product with latest pricing
  UPDATE public.inventory_products
  SET
    weighted_average_cost  = v_wac,
    default_purchase_price = COALESCE(v_latest_pp, default_purchase_price),
    purchase_price         = COALESCE(v_latest_pp, purchase_price),
    mrp                    = COALESCE(v_latest_mrp, mrp)
  WHERE id = v_target_product;

  -- Log MRP change if it actually changed
  IF v_latest_mrp IS NOT NULL AND (v_current_mrp IS NULL OR v_current_mrp != v_latest_mrp) THEN
    INSERT INTO public.mrp_change_log (product_id, old_mrp, new_mrp, change_type)
    VALUES (v_target_product, v_current_mrp, v_latest_mrp, 'auto_from_stock_entry');
  END IF;

  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- 3. Update current_stock_levels view to include purchase_price
-- --------------------------------------------------------------------------
DROP VIEW IF EXISTS public.current_stock_levels CASCADE;

CREATE OR REPLACE VIEW public.current_stock_levels AS
SELECT
  p.id AS product_id,
  p.material_code,
  p.product_name,
  p.minimum_stock_level,
  COALESCE(received.total, 0)::bigint AS total_received,
  GREATEST(
    COALESCE(received.total, 0) - COALESCE(issued.total, 0),
    0
  )::bigint AS current_quantity,
  received.last_date AS last_received_date,
  received.latest_purchase_price,
  p.purchase_price,
  p.weighted_average_cost,
  p.mrp,
  ROUND(
    GREATEST(
      COALESCE(received.total, 0) - COALESCE(issued.total, 0),
      0
    ) * COALESCE(p.weighted_average_cost, 0),
    2
  )::numeric(14,2) AS total_stock_value,
  CASE
    WHEN COALESCE(received.total, 0) - COALESCE(issued.total, 0) <= 0 THEN 'out_of_stock'
    WHEN COALESCE(received.total, 0) - COALESCE(issued.total, 0) <= p.minimum_stock_level THEN 'low_stock'
    ELSE 'in_stock'
  END AS stock_status
FROM public.inventory_products p
LEFT JOIN LATERAL (
  SELECT
    COALESCE(SUM(sei.quantity), 0)::bigint AS total,
    MAX(se.entry_date) AS last_date,
    (
      SELECT sei2.purchase_price
      FROM public.stock_entry_items sei2
      JOIN public.stock_entries se2 ON se2.id = sei2.stock_entry_id AND se2.is_deleted = false
      WHERE sei2.product_id = p.id AND sei2.purchase_price IS NOT NULL
      ORDER BY se2.entry_date DESC, sei2.created_at DESC
      LIMIT 1
    ) AS latest_purchase_price
  FROM public.stock_entry_items sei
  JOIN public.stock_entries se ON se.id = sei.stock_entry_id AND se.is_deleted = false
  WHERE sei.product_id = p.id
) received ON true
LEFT JOIN LATERAL (
  SELECT
    COALESCE(SUM(dbi.quantity_issued - dbi.quantity_returned), 0)::bigint AS total
  FROM public.digital_bag_items dbi
  JOIN public.digital_bag_sessions dbs ON dbs.id = dbi.session_id
  WHERE dbi.product_id = p.id
) issued ON true
WHERE p.is_active = true
  AND p.is_deleted = false;

COMMENT ON VIEW public.current_stock_levels IS
  'Aggregated current stock per active product with simplified pricing (purchase_price + MRP).';
