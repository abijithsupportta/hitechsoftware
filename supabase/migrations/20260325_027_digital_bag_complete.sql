-- ============================================================================
-- Migration 027: Digital Bag Complete Rebuild
-- Hi Tech Software
--
-- Adds missing columns, DB functions, updated RLS, updated view
-- to support the new Digital Bag workflow.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. SESSIONS — add missing columns
-- --------------------------------------------------------------------------
ALTER TABLE public.digital_bag_sessions
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES auth.users;

ALTER TABLE public.digital_bag_sessions
  ADD COLUMN IF NOT EXISTS total_damage_fees NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Rename issued_by to created_by alias via column rename is risky — keep as-is
-- Add unique constraint: one session per technician per day
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_dbs_technician_date'
  ) THEN
    ALTER TABLE public.digital_bag_sessions
      ADD CONSTRAINT uq_dbs_technician_date UNIQUE (technician_id, session_date);
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 2. ITEMS — add missing columns
-- --------------------------------------------------------------------------
ALTER TABLE public.digital_bag_items
  ADD COLUMN IF NOT EXISTS product_name TEXT NOT NULL DEFAULT '';

ALTER TABLE public.digital_bag_items
  ADD COLUMN IF NOT EXISTS mrp NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.digital_bag_items
  ADD COLUMN IF NOT EXISTS quantity_missing INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.digital_bag_items
  ADD COLUMN IF NOT EXISTS damage_fee_per_unit NUMERIC(12,2);

-- Generated column for total damage fee
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'digital_bag_items'
      AND column_name = 'total_damage_fee'
  ) THEN
    ALTER TABLE public.digital_bag_items
      ADD COLUMN total_damage_fee NUMERIC(12,2)
        GENERATED ALWAYS AS (quantity_missing * COALESCE(damage_fee_per_unit, 0)) STORED;
  END IF;
END $$;

ALTER TABLE public.digital_bag_items
  ADD COLUMN IF NOT EXISTS is_checked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.digital_bag_items
  ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES auth.users;

ALTER TABLE public.digital_bag_items
  ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- --------------------------------------------------------------------------
-- 3. PAYOUTS — make subject_id nullable for bag damage deductions
-- --------------------------------------------------------------------------
ALTER TABLE public.technician_service_payouts
  ALTER COLUMN subject_id DROP NOT NULL;

-- --------------------------------------------------------------------------
-- 4. DATABASE FUNCTIONS
-- --------------------------------------------------------------------------

-- 4a. issue_bag_item — add item to open session with stock & capacity validation
CREATE OR REPLACE FUNCTION public.issue_bag_item(
  p_session_id UUID,
  p_product_id UUID,
  p_quantity INTEGER
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_product RECORD;
  v_stock_qty BIGINT;
  v_current_items INTEGER;
  v_new_item_id UUID;
BEGIN
  -- Validate session
  SELECT id, technician_id, session_date, status INTO v_session
  FROM public.digital_bag_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF v_session.status != 'open' THEN
    RAISE EXCEPTION 'Session is closed — no modifications allowed';
  END IF;
  IF v_session.session_date != CURRENT_DATE THEN
    RAISE EXCEPTION 'Session does not belong to today';
  END IF;

  -- Validate product
  SELECT id, product_name, material_code, COALESCE(mrp, 0) AS mrp INTO v_product
  FROM public.inventory_products
  WHERE id = p_product_id AND is_active = true AND is_deleted = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found or inactive'; END IF;

  -- Validate stock
  SELECT current_quantity INTO v_stock_qty
  FROM public.current_stock_levels WHERE product_id = p_product_id;
  IF v_stock_qty IS NULL OR v_stock_qty < p_quantity THEN
    RAISE EXCEPTION 'Only % units available in stock', COALESCE(v_stock_qty, 0);
  END IF;

  -- Validate capacity (50 items max)
  SELECT COALESCE(SUM(quantity_issued), 0)::integer INTO v_current_items
  FROM public.digital_bag_items WHERE session_id = p_session_id;
  IF v_current_items + p_quantity > 50 THEN
    RAISE EXCEPTION 'Bag is full — maximum 50 items reached';
  END IF;

  -- Insert item (stock deducts automatically via view recalculation)
  INSERT INTO public.digital_bag_items (
    session_id, product_id, material_code, product_name, mrp,
    quantity_issued, added_by, added_at
  ) VALUES (
    p_session_id, p_product_id, v_product.material_code,
    v_product.product_name, v_product.mrp, p_quantity,
    auth.uid(), now()
  ) RETURNING id INTO v_new_item_id;

  RETURN v_new_item_id;
END;
$$;

-- 4b. remove_bag_item — remove item from open session, stock returns via view
CREATE OR REPLACE FUNCTION public.remove_bag_item(p_item_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_session_status TEXT;
BEGIN
  SELECT dbs.status INTO v_session_status
  FROM public.digital_bag_items dbi
  JOIN public.digital_bag_sessions dbs ON dbs.id = dbi.session_id
  WHERE dbi.id = p_item_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;
  IF v_session_status != 'open' THEN
    RAISE EXCEPTION 'Session is closed — no modifications allowed';
  END IF;

  DELETE FROM public.digital_bag_items WHERE id = p_item_id;
END;
$$;

-- 4c. close_bag_session — close session with return details and damage fees
CREATE OR REPLACE FUNCTION public.close_bag_session(
  p_session_id UUID,
  p_items JSONB
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_item JSONB;
  v_item_id UUID;
  v_qty_returned INTEGER;
  v_fee_per_unit NUMERIC(12,2);
  v_bag_item RECORD;
  v_total_damage NUMERIC(12,2) := 0;
  v_qty_missing INTEGER;
BEGIN
  -- Validate session
  SELECT id, technician_id, status INTO v_session
  FROM public.digital_bag_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF v_session.status != 'open' THEN
    RAISE EXCEPTION 'Session is closed — no modifications allowed';
  END IF;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_item_id := (v_item->>'item_id')::UUID;
    v_qty_returned := COALESCE((v_item->>'quantity_returned')::INTEGER, 0);
    v_fee_per_unit := (v_item->>'damage_fee_per_unit')::NUMERIC;

    SELECT id, quantity_issued, mrp INTO v_bag_item
    FROM public.digital_bag_items
    WHERE id = v_item_id AND session_id = p_session_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Item % not found in this session', v_item_id;
    END IF;

    v_qty_missing := GREATEST(v_bag_item.quantity_issued - v_qty_returned, 0);

    -- Default damage fee to MRP if not provided
    IF v_fee_per_unit IS NULL THEN
      v_fee_per_unit := v_bag_item.mrp;
    END IF;

    -- Update item with return details
    UPDATE public.digital_bag_items SET
      quantity_returned = v_qty_returned,
      quantity_missing = v_qty_missing,
      damage_fee_per_unit = CASE WHEN v_qty_missing > 0 THEN v_fee_per_unit ELSE NULL END,
      is_checked = true,
      updated_at = now()
    WHERE id = v_item_id;

    -- Create payout deduction for missing items
    IF v_qty_missing > 0 THEN
      v_total_damage := v_total_damage + (v_qty_missing * v_fee_per_unit);

      INSERT INTO public.technician_service_payouts (
        technician_id, base_amount, deductions, variance_deduction,
        final_amount, status, notes
      ) VALUES (
        v_session.technician_id,
        0,
        v_qty_missing * v_fee_per_unit,
        0,
        -(v_qty_missing * v_fee_per_unit),
        'pending',
        format('Bag damage: %s x %s @ ₹%s',
          (SELECT product_name FROM public.digital_bag_items WHERE id = v_item_id),
          v_qty_missing,
          v_fee_per_unit
        )
      );
    END IF;
  END LOOP;

  -- Close session
  UPDATE public.digital_bag_sessions SET
    status = 'closed',
    closed_at = now(),
    closed_by = auth.uid(),
    total_damage_fees = v_total_damage,
    updated_at = now()
  WHERE id = p_session_id;
END;
$$;

-- --------------------------------------------------------------------------
-- 5. UPDATED TRIGGER — include total_damage_fees
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_update_session_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  v_session_id := COALESCE(NEW.session_id, OLD.session_id);

  UPDATE public.digital_bag_sessions
  SET
    total_issued   = sub.ti,
    total_returned = sub.tr,
    total_consumed = sub.tc,
    variance       = sub.ti - sub.tr - sub.tc,
    total_damage_fees = sub.td,
    updated_at     = now()
  FROM (
    SELECT
      COALESCE(SUM(quantity_issued), 0)::integer AS ti,
      COALESCE(SUM(quantity_returned), 0)::integer AS tr,
      COALESCE(SUM(quantity_consumed), 0)::integer AS tc,
      COALESCE(SUM(COALESCE(total_damage_fee, 0)), 0)::numeric(12,2) AS td
    FROM public.digital_bag_items
    WHERE session_id = v_session_id
  ) sub
  WHERE id = v_session_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- --------------------------------------------------------------------------
-- 6. UPDATED RLS — allow office_staff to insert/update sessions and items
-- --------------------------------------------------------------------------

-- Sessions
DROP POLICY IF EXISTS dbs_insert ON public.digital_bag_sessions;
CREATE POLICY dbs_insert ON public.digital_bag_sessions FOR INSERT WITH CHECK (
  get_my_role() IN ('super_admin', 'office_staff')
);

DROP POLICY IF EXISTS dbs_update ON public.digital_bag_sessions;
CREATE POLICY dbs_update ON public.digital_bag_sessions FOR UPDATE USING (
  get_my_role() IN ('super_admin', 'office_staff')
);

DROP POLICY IF EXISTS dbs_select ON public.digital_bag_sessions;
CREATE POLICY dbs_select ON public.digital_bag_sessions FOR SELECT USING (
  get_my_role() IN ('super_admin', 'office_staff', 'stock_manager')
  OR technician_id = auth.uid()
);

-- Items
DROP POLICY IF EXISTS dbi_insert ON public.digital_bag_items;
CREATE POLICY dbi_insert ON public.digital_bag_items FOR INSERT WITH CHECK (
  get_my_role() IN ('super_admin', 'office_staff')
);

DROP POLICY IF EXISTS dbi_update ON public.digital_bag_items;
CREATE POLICY dbi_update ON public.digital_bag_items FOR UPDATE USING (
  get_my_role() IN ('super_admin', 'office_staff')
);

DROP POLICY IF EXISTS dbi_delete ON public.digital_bag_items;
CREATE POLICY dbi_delete ON public.digital_bag_items FOR DELETE USING (
  get_my_role() IN ('super_admin', 'office_staff')
);

-- --------------------------------------------------------------------------
-- 7. UPDATED VIEW — add description and mrp columns
-- --------------------------------------------------------------------------
DROP VIEW IF EXISTS public.current_stock_levels CASCADE;

CREATE OR REPLACE VIEW public.current_stock_levels AS
SELECT
  p.id AS product_id,
  p.material_code,
  p.product_name,
  p.description,
  p.category_id,
  p.product_type_id,
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
  'Aggregated current stock per active product with pricing, category/type filters, and description.';
