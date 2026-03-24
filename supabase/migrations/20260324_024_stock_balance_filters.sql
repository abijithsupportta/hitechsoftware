-- Migration 024: Add category_id and product_type_id to current_stock_levels view
-- Purpose: Enable category and product type filtering on the stock balance dashboard
-- Date: 2026-03-24

-- --------------------------------------------------------------------------
-- Recreate current_stock_levels view with category_id and product_type_id
-- --------------------------------------------------------------------------
DROP VIEW IF EXISTS public.current_stock_levels CASCADE;

CREATE OR REPLACE VIEW public.current_stock_levels AS
SELECT
  p.id AS product_id,
  p.material_code,
  p.product_name,
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
  'Aggregated current stock per active product with pricing and category/type for filtering.';
