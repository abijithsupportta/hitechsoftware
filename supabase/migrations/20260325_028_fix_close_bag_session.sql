-- ============================================================================
-- Migration 028: Fix close_bag_session — consumed items and bounds validation
-- Hi Tech Software
--
-- Fixes:
-- 1. Subtracts quantity_consumed when calculating missing items
-- 2. Validates quantity_returned does not exceed issuable amount
-- ============================================================================

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
  v_max_returnable INTEGER;
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

    -- Fetch item including quantity_consumed
    SELECT id, quantity_issued, quantity_consumed, mrp INTO v_bag_item
    FROM public.digital_bag_items
    WHERE id = v_item_id AND session_id = p_session_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Item % not found in this session', v_item_id;
    END IF;

    -- Validate return bounds
    v_max_returnable := v_bag_item.quantity_issued - v_bag_item.quantity_consumed;

    IF v_qty_returned < 0 THEN
      RAISE EXCEPTION 'Return quantity cannot be negative';
    END IF;

    IF v_qty_returned > v_max_returnable THEN
      RAISE EXCEPTION 'Return quantity (%) exceeds returnable amount (%) for item %',
        v_qty_returned, v_max_returnable, v_item_id;
    END IF;

    -- Missing = issued - consumed - returned
    v_qty_missing := GREATEST(v_bag_item.quantity_issued - v_bag_item.quantity_consumed - v_qty_returned, 0);

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
