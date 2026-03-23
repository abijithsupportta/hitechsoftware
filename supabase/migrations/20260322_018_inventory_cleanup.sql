-- ============================================================================
-- Migration 018: Inventory Cleanup
-- Hi Tech Software
--
-- Removes the old inventory system tables (Migration 001) after verifying
-- they are empty. Adds missing columns and views to the new inventory
-- system (Migration 016).
-- ============================================================================

-- --------------------------------------------------------------------------
-- Task 1: Drop old system tables (only if empty)
-- Order: digital_bag_approvals → digital_bag_items → digital_bag
--        → stock_transactions → stock → inventory
-- --------------------------------------------------------------------------

-- digital_bag_approvals
DO $$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public.digital_bag_approvals;
  IF v_count = 0 THEN
    DROP TABLE IF EXISTS public.digital_bag_approvals CASCADE;
    RAISE NOTICE 'Dropped empty table: digital_bag_approvals';
  ELSE
    RAISE WARNING 'Table digital_bag_approvals has % rows — NOT dropped', v_count;
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table digital_bag_approvals does not exist — skipping';
END $$;

-- digital_bag_items
DO $$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public.digital_bag_items;
  IF v_count = 0 THEN
    DROP TABLE IF EXISTS public.digital_bag_items CASCADE;
    RAISE NOTICE 'Dropped empty table: digital_bag_items';
  ELSE
    RAISE WARNING 'Table digital_bag_items has % rows — NOT dropped', v_count;
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table digital_bag_items does not exist — skipping';
END $$;

-- digital_bag
DO $$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public.digital_bag;
  IF v_count = 0 THEN
    DROP TABLE IF EXISTS public.digital_bag CASCADE;
    RAISE NOTICE 'Dropped empty table: digital_bag';
  ELSE
    RAISE WARNING 'Table digital_bag has % rows — NOT dropped', v_count;
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table digital_bag does not exist — skipping';
END $$;

-- stock_transactions
DO $$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public.stock_transactions;
  IF v_count = 0 THEN
    DROP TABLE IF EXISTS public.stock_transactions CASCADE;
    RAISE NOTICE 'Dropped empty table: stock_transactions';
  ELSE
    RAISE WARNING 'Table stock_transactions has % rows — NOT dropped', v_count;
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table stock_transactions does not exist — skipping';
END $$;

-- stock
DO $$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public.stock;
  IF v_count = 0 THEN
    DROP TABLE IF EXISTS public.stock CASCADE;
    RAISE NOTICE 'Dropped empty table: stock';
  ELSE
    RAISE WARNING 'Table stock has % rows — NOT dropped', v_count;
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table stock does not exist — skipping';
END $$;

-- inventory
DO $$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public.inventory;
  IF v_count = 0 THEN
    DROP TABLE IF EXISTS public.inventory CASCADE;
    RAISE NOTICE 'Dropped empty table: inventory';
  ELSE
    RAISE WARNING 'Table inventory has % rows — NOT dropped', v_count;
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table inventory does not exist — skipping';
END $$;

-- --------------------------------------------------------------------------
-- Task 2: Add new columns to inventory_products
-- --------------------------------------------------------------------------

-- minimum_stock_level: threshold below which a product shows as "Low Stock"
ALTER TABLE public.inventory_products
  ADD COLUMN IF NOT EXISTS minimum_stock_level INTEGER NOT NULL DEFAULT 5;

COMMENT ON COLUMN public.inventory_products.minimum_stock_level IS
  'Threshold quantity below which the product is flagged as Low Stock.';

-- stock_classification: categorises product movement speed
ALTER TABLE public.inventory_products
  ADD COLUMN IF NOT EXISTS stock_classification TEXT NOT NULL DEFAULT 'unclassified';

COMMENT ON COLUMN public.inventory_products.stock_classification IS
  'Movement classification: fast_moving, slow_moving, dead_stock, or unclassified.';

-- --------------------------------------------------------------------------
-- Task 3: Create current_stock_levels view
-- --------------------------------------------------------------------------
DROP VIEW IF EXISTS public.current_stock_levels CASCADE;

CREATE OR REPLACE VIEW public.current_stock_levels AS
SELECT
  p.id AS product_id,
  p.material_code,
  p.product_name,
  p.minimum_stock_level,
  COALESCE(SUM(sei.quantity), 0)::bigint AS total_received,
  -- current_quantity equals total_received for now; will be updated when
  -- digital bag and consumption tracking are connected
  COALESCE(SUM(sei.quantity), 0)::bigint AS current_quantity,
  MAX(se.entry_date) AS last_received_date,
  CASE
    WHEN COALESCE(SUM(sei.quantity), 0) = 0 THEN 'out_of_stock'
    WHEN COALESCE(SUM(sei.quantity), 0) <= p.minimum_stock_level THEN 'low_stock'
    ELSE 'in_stock'
  END AS stock_status
FROM public.inventory_products p
LEFT JOIN public.stock_entry_items sei ON sei.product_id = p.id
LEFT JOIN public.stock_entries se ON se.id = sei.stock_entry_id AND se.is_deleted = false
WHERE p.is_active = true
  AND p.is_deleted = false
GROUP BY p.id, p.material_code, p.product_name, p.minimum_stock_level;

COMMENT ON VIEW public.current_stock_levels IS
  'Aggregated current stock quantities per active product. current_quantity = total_received (consumption tracking to be added later).';
