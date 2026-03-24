-- Migration 025: Stock Entry Pricing — supplier discount + GST per line item
-- Adds discount/GST calculation columns to stock_entry_items (generated columns)
-- Adds summary totals to stock_entries (maintained by trigger)

-- =============================================================================
-- 1. ADD COLUMNS TO stock_entry_items
-- =============================================================================

-- Discount type: percentage or flat
ALTER TABLE stock_entry_items
  ADD COLUMN supplier_discount_type text NOT NULL DEFAULT 'percentage'
  CONSTRAINT chk_discount_type CHECK (supplier_discount_type IN ('percentage', 'flat'));

-- Discount value entered by staff (percentage value or flat amount)
ALTER TABLE stock_entry_items
  ADD COLUMN supplier_discount_value decimal NOT NULL DEFAULT 0;

-- GST rate per line item (18% default, stored for future flexibility)
ALTER TABLE stock_entry_items
  ADD COLUMN gst_rate decimal NOT NULL DEFAULT 18;

-- Computed: discount amount
ALTER TABLE stock_entry_items
  ADD COLUMN supplier_discount_amount decimal
  GENERATED ALWAYS AS (
    CASE
      WHEN supplier_discount_type = 'percentage'
      THEN ROUND(purchase_price * supplier_discount_value / 100, 2)
      ELSE ROUND(supplier_discount_value, 2)
    END
  ) STORED;

-- Computed: price after discount
ALTER TABLE stock_entry_items
  ADD COLUMN discounted_purchase_price decimal
  GENERATED ALWAYS AS (
    ROUND(purchase_price - (
      CASE
        WHEN supplier_discount_type = 'percentage'
        THEN ROUND(purchase_price * supplier_discount_value / 100, 2)
        ELSE ROUND(supplier_discount_value, 2)
      END
    ), 2)
  ) STORED;

-- Computed: GST amount on discounted price
ALTER TABLE stock_entry_items
  ADD COLUMN gst_amount decimal
  GENERATED ALWAYS AS (
    ROUND(
      (purchase_price - (
        CASE
          WHEN supplier_discount_type = 'percentage'
          THEN ROUND(purchase_price * supplier_discount_value / 100, 2)
          ELSE ROUND(supplier_discount_value, 2)
        END
      )) * gst_rate / 100
    , 2)
  ) STORED;

-- Computed: final unit cost (discounted price + GST)
ALTER TABLE stock_entry_items
  ADD COLUMN final_unit_cost decimal
  GENERATED ALWAYS AS (
    ROUND(
      (purchase_price - (
        CASE
          WHEN supplier_discount_type = 'percentage'
          THEN ROUND(purchase_price * supplier_discount_value / 100, 2)
          ELSE ROUND(supplier_discount_value, 2)
        END
      )) * (1 + gst_rate / 100)
    , 2)
  ) STORED;

-- Computed: line total (final unit cost × quantity)
ALTER TABLE stock_entry_items
  ADD COLUMN line_total decimal
  GENERATED ALWAYS AS (
    ROUND(
      (purchase_price - (
        CASE
          WHEN supplier_discount_type = 'percentage'
          THEN ROUND(purchase_price * supplier_discount_value / 100, 2)
          ELSE ROUND(supplier_discount_value, 2)
        END
      )) * (1 + gst_rate / 100) * quantity
    , 2)
  ) STORED;

-- Comment on MRP column
COMMENT ON COLUMN stock_entry_items.mrp IS 'MRP is always inclusive of 18% GST — selling reference price';

-- =============================================================================
-- 2. ADD SUMMARY COLUMNS TO stock_entries
-- =============================================================================

ALTER TABLE stock_entries
  ADD COLUMN grand_total decimal NOT NULL DEFAULT 0;

ALTER TABLE stock_entries
  ADD COLUMN total_discount_given decimal NOT NULL DEFAULT 0;

ALTER TABLE stock_entries
  ADD COLUMN total_gst_paid decimal NOT NULL DEFAULT 0;

-- =============================================================================
-- 3. TRIGGER: Recalculate stock_entries totals after item changes
-- =============================================================================

CREATE OR REPLACE FUNCTION update_stock_entry_totals()
RETURNS TRIGGER AS $$
DECLARE
  target_entry_id uuid;
BEGIN
  -- Determine which entry to update
  IF TG_OP = 'DELETE' THEN
    target_entry_id := OLD.stock_entry_id;
  ELSE
    target_entry_id := NEW.stock_entry_id;
  END IF;

  UPDATE stock_entries
  SET
    grand_total = COALESCE((
      SELECT ROUND(SUM(line_total), 2)
      FROM stock_entry_items
      WHERE stock_entry_id = target_entry_id
    ), 0),
    total_discount_given = COALESCE((
      SELECT ROUND(SUM(supplier_discount_amount * quantity), 2)
      FROM stock_entry_items
      WHERE stock_entry_id = target_entry_id
    ), 0),
    total_gst_paid = COALESCE((
      SELECT ROUND(SUM(gst_amount * quantity), 2)
      FROM stock_entry_items
      WHERE stock_entry_id = target_entry_id
    ), 0)
  WHERE id = target_entry_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_stock_entry_totals
  AFTER INSERT OR UPDATE OR DELETE ON stock_entry_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_entry_totals();

-- =============================================================================
-- 4. BACKFILL existing entries
-- =============================================================================
-- Run trigger logic for all existing entries so totals are populated
UPDATE stock_entries
SET
  grand_total = COALESCE((
    SELECT ROUND(SUM(sei.line_total), 2)
    FROM stock_entry_items sei
    WHERE sei.stock_entry_id = stock_entries.id
  ), 0),
  total_discount_given = COALESCE((
    SELECT ROUND(SUM(sei.supplier_discount_amount * sei.quantity), 2)
    FROM stock_entry_items sei
    WHERE sei.stock_entry_id = stock_entries.id
  ), 0),
  total_gst_paid = COALESCE((
    SELECT ROUND(SUM(sei.gst_amount * sei.quantity), 2)
    FROM stock_entry_items sei
    WHERE sei.stock_entry_id = stock_entries.id
  ), 0);
