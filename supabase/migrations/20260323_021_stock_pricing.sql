-- ============================================================================
-- Migration 021: Stock Pricing — Per-Entry Purchase Price, MRP, Selling Price
-- Hi Tech Software
--
-- Adds granular pricing to stock_entry_items (per-invoice pricing) and
-- reference/computed pricing columns to inventory_products (weighted average
-- cost, default purchase price, minimum selling price).
--
-- Also creates a trigger to auto-update weighted_average_cost and
-- default_purchase_price on inventory_products after every stock entry.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Add reference pricing columns to inventory_products
-- --------------------------------------------------------------------------
ALTER TABLE public.inventory_products
  ADD COLUMN IF NOT EXISTS default_purchase_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS minimum_selling_price  NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS weighted_average_cost  NUMERIC(12,2);

-- Constraints
DO $$ BEGIN
  ALTER TABLE public.inventory_products
    ADD CONSTRAINT inventory_products_default_pp_non_negative
    CHECK (default_purchase_price IS NULL OR default_purchase_price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.inventory_products
    ADD CONSTRAINT inventory_products_min_sp_non_negative
    CHECK (minimum_selling_price IS NULL OR minimum_selling_price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.inventory_products
    ADD CONSTRAINT inventory_products_wac_non_negative
    CHECK (weighted_average_cost IS NULL OR weighted_average_cost >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.inventory_products.default_purchase_price IS
  'Last known purchase price — auto-updated from the most recent stock entry.';
COMMENT ON COLUMN public.inventory_products.minimum_selling_price IS
  'Floor selling price — cannot sell below this. Defaults to MRP.';
COMMENT ON COLUMN public.inventory_products.weighted_average_cost IS
  'Weighted average cost computed from all stock entry items for this product.';

-- --------------------------------------------------------------------------
-- 2. Add pricing columns to stock_entry_items
-- --------------------------------------------------------------------------
ALTER TABLE public.stock_entry_items
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS selling_price  NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS mrp            NUMERIC(12,2);

-- We want purchase_price and mrp NOT NULL for new rows but existing rows
-- may have NULL, so we use a CHECK that allows NULL for backwards compat
-- and enforce NOT NULL at the application layer via Zod validation.
DO $$ BEGIN
  ALTER TABLE public.stock_entry_items
    ADD CONSTRAINT stock_entry_items_pp_non_negative
    CHECK (purchase_price IS NULL OR purchase_price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.stock_entry_items
    ADD CONSTRAINT stock_entry_items_sp_non_negative
    CHECK (selling_price IS NULL OR selling_price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.stock_entry_items
    ADD CONSTRAINT stock_entry_items_mrp_non_negative
    CHECK (mrp IS NULL OR mrp >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Generated column: total_purchase_value = quantity * purchase_price
-- NOTE: Postgres does not support ADD COLUMN IF NOT EXISTS for generated columns
-- in all versions, so we wrap in a DO block.
DO $$ BEGIN
  ALTER TABLE public.stock_entry_items
    ADD COLUMN total_purchase_value NUMERIC(14,2)
    GENERATED ALWAYS AS (quantity * purchase_price) STORED;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN public.stock_entry_items.purchase_price IS
  'Actual price paid on this specific invoice — mandatory for new entries.';
COMMENT ON COLUMN public.stock_entry_items.selling_price IS
  'Suggested selling price for this batch — defaults to MRP if not set.';
COMMENT ON COLUMN public.stock_entry_items.mrp IS
  'MRP (Maximum Retail Price) for this batch — mandatory for new entries.';
COMMENT ON COLUMN public.stock_entry_items.total_purchase_value IS
  'Auto-calculated: quantity × purchase_price.';

-- --------------------------------------------------------------------------
-- 3. Function: calculate_weighted_average_cost
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_weighted_average_cost(p_product_id UUID)
RETURNS NUMERIC(12,2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total_value  NUMERIC;
  v_total_qty    BIGINT;
  v_wac          NUMERIC(12,2);
BEGIN
  SELECT
    COALESCE(SUM(sei.quantity * sei.purchase_price), 0),
    COALESCE(SUM(sei.quantity), 0)
  INTO v_total_value, v_total_qty
  FROM public.stock_entry_items sei
  JOIN public.stock_entries se ON se.id = sei.stock_entry_id AND se.is_deleted = false
  WHERE sei.product_id = p_product_id
    AND sei.purchase_price IS NOT NULL;

  IF v_total_qty = 0 THEN
    RETURN NULL;
  END IF;

  v_wac := ROUND(v_total_value / v_total_qty, 2);
  RETURN v_wac;
END;
$$;

COMMENT ON FUNCTION public.calculate_weighted_average_cost(UUID) IS
  'Returns weighted average cost = total purchase value / total quantity received for a product.';

-- --------------------------------------------------------------------------
-- 4. Trigger function: auto-update product pricing after stock entry
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_update_product_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_wac             NUMERIC(12,2);
  v_latest_pp       NUMERIC(12,2);
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

  -- Get latest purchase price (from most recent stock entry by entry_date)
  SELECT sei.purchase_price
  INTO v_latest_pp
  FROM public.stock_entry_items sei
  JOIN public.stock_entries se ON se.id = sei.stock_entry_id AND se.is_deleted = false
  WHERE sei.product_id = v_target_product
    AND sei.purchase_price IS NOT NULL
  ORDER BY se.entry_date DESC, sei.created_at DESC
  LIMIT 1;

  -- Update the product
  UPDATE public.inventory_products
  SET
    weighted_average_cost  = v_wac,
    default_purchase_price = COALESCE(v_latest_pp, default_purchase_price)
  WHERE id = v_target_product;

  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- 5. Attach trigger to stock_entry_items
-- --------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_stock_entry_items_pricing ON public.stock_entry_items;

CREATE TRIGGER trg_stock_entry_items_pricing
  AFTER INSERT OR UPDATE
  ON public.stock_entry_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_product_pricing();

-- --------------------------------------------------------------------------
-- 6. Update current_stock_levels view — add pricing columns
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
  'Aggregated current stock per active product with pricing data. Includes latest purchase price, weighted average cost, MRP, and total stock value.';
