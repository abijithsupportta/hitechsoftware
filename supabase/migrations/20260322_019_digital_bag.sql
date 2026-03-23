-- ============================================================================
-- Migration 019: Digital Bag Module
-- Hi Tech Software
--
-- Creates the complete Digital Bag system:
--   1. digital_bag_sessions     — A session = one issuance event to a technician
--   2. digital_bag_items        — Line items within a session (product + qty)
--   3. digital_bag_consumptions — Records parts consumed against a subject
--   4. technician_service_payouts — Payroll/payout records per technician
--   5. Functions & triggers for capacity checks and session totals
--   6. RLS policies for all tables
--   7. Updated current_stock_levels view (subtracts issued quantities)
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. DIGITAL BAG SESSIONS
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.digital_bag_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  issued_by     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  session_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'closed', 'variance_review')),
  total_issued  INTEGER NOT NULL DEFAULT 0,
  total_returned INTEGER NOT NULL DEFAULT 0,
  total_consumed INTEGER NOT NULL DEFAULT 0,
  variance      INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  closed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.digital_bag_sessions IS
  'Each row represents a single issuance event — items given to a technician.';

CREATE INDEX IF NOT EXISTS idx_dbs_technician ON public.digital_bag_sessions(technician_id);
CREATE INDEX IF NOT EXISTS idx_dbs_status ON public.digital_bag_sessions(status);

-- --------------------------------------------------------------------------
-- 2. DIGITAL BAG ITEMS
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.digital_bag_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES public.digital_bag_sessions(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES public.inventory_products(id) ON DELETE RESTRICT,
  material_code TEXT NOT NULL,
  quantity_issued   INTEGER NOT NULL CHECK (quantity_issued > 0),
  quantity_returned INTEGER NOT NULL DEFAULT 0 CHECK (quantity_returned >= 0),
  quantity_consumed INTEGER NOT NULL DEFAULT 0 CHECK (quantity_consumed >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.digital_bag_items IS
  'Individual line items within a digital bag session. Tracks issued/returned/consumed per product.';

CREATE INDEX IF NOT EXISTS idx_dbi_session ON public.digital_bag_items(session_id);
CREATE INDEX IF NOT EXISTS idx_dbi_product ON public.digital_bag_items(product_id);

-- --------------------------------------------------------------------------
-- 3. DIGITAL BAG CONSUMPTIONS
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.digital_bag_consumptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_item_id     UUID NOT NULL REFERENCES public.digital_bag_items(id) ON DELETE CASCADE,
  subject_id      UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  technician_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  notes           TEXT,
  consumed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.digital_bag_consumptions IS
  'Tracks which parts from a technician bag were used on which service job.';

CREATE INDEX IF NOT EXISTS idx_dbc_bag_item ON public.digital_bag_consumptions(bag_item_id);
CREATE INDEX IF NOT EXISTS idx_dbc_subject ON public.digital_bag_consumptions(subject_id);
CREATE INDEX IF NOT EXISTS idx_dbc_technician ON public.digital_bag_consumptions(technician_id);

-- --------------------------------------------------------------------------
-- 4. TECHNICIAN SERVICE PAYOUTS
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.technician_service_payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  subject_id      UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  base_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions      NUMERIC(12,2) NOT NULL DEFAULT 0,
  variance_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'paid', 'disputed')),
  notes           TEXT,
  approved_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.technician_service_payouts IS
  'Payout records for technician service work. Links to a subject (service job).';

CREATE INDEX IF NOT EXISTS idx_tsp_technician ON public.technician_service_payouts(technician_id);
CREATE INDEX IF NOT EXISTS idx_tsp_subject ON public.technician_service_payouts(subject_id);
CREATE INDEX IF NOT EXISTS idx_tsp_status ON public.technician_service_payouts(status);

-- --------------------------------------------------------------------------
-- 5. FUNCTIONS
-- --------------------------------------------------------------------------

-- 5a. Get remaining bag capacity for a technician
CREATE OR REPLACE FUNCTION public.get_bag_capacity_remaining(p_technician_id UUID, p_max_capacity INTEGER DEFAULT 50)
RETURNS INTEGER
LANGUAGE sql STABLE
AS $$
  SELECT p_max_capacity - COALESCE(SUM(dbi.quantity_issued - dbi.quantity_returned - dbi.quantity_consumed), 0)::integer
  FROM public.digital_bag_items dbi
  JOIN public.digital_bag_sessions dbs ON dbs.id = dbi.session_id
  WHERE dbs.technician_id = p_technician_id
    AND dbs.status = 'open';
$$;

COMMENT ON FUNCTION public.get_bag_capacity_remaining IS
  'Returns remaining item capacity in a technician open bag sessions. Default max = 50.';

-- 5b. Calculate session variance
CREATE OR REPLACE FUNCTION public.calculate_session_variance(p_session_id UUID)
RETURNS TABLE(total_issued INTEGER, total_returned INTEGER, total_consumed INTEGER, variance INTEGER)
LANGUAGE sql STABLE
AS $$
  SELECT
    COALESCE(SUM(quantity_issued), 0)::integer,
    COALESCE(SUM(quantity_returned), 0)::integer,
    COALESCE(SUM(quantity_consumed), 0)::integer,
    (COALESCE(SUM(quantity_issued), 0)
      - COALESCE(SUM(quantity_returned), 0)
      - COALESCE(SUM(quantity_consumed), 0))::integer
  FROM public.digital_bag_items
  WHERE session_id = p_session_id;
$$;

COMMENT ON FUNCTION public.calculate_session_variance IS
  'Returns issued/returned/consumed/variance totals for a given session.';

-- --------------------------------------------------------------------------
-- 6. TRIGGERS
-- --------------------------------------------------------------------------

-- 6a. Auto-update session totals when items change
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
    updated_at     = now()
  FROM (
    SELECT
      COALESCE(SUM(quantity_issued), 0)::integer AS ti,
      COALESCE(SUM(quantity_returned), 0)::integer AS tr,
      COALESCE(SUM(quantity_consumed), 0)::integer AS tc
    FROM public.digital_bag_items
    WHERE session_id = v_session_id
  ) sub
  WHERE id = v_session_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dbi_session_totals ON public.digital_bag_items;
CREATE TRIGGER trg_dbi_session_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.digital_bag_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_session_totals();

-- 6b. Auto-update updated_at on payout changes
CREATE OR REPLACE FUNCTION public.trg_payout_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tsp_updated_at ON public.technician_service_payouts;
CREATE TRIGGER trg_tsp_updated_at
  BEFORE UPDATE ON public.technician_service_payouts
  FOR EACH ROW EXECUTE FUNCTION public.trg_payout_updated_at();

-- --------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- --------------------------------------------------------------------------

-- 7a. digital_bag_sessions
ALTER TABLE public.digital_bag_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dbs_select ON public.digital_bag_sessions;
CREATE POLICY dbs_select ON public.digital_bag_sessions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'office_staff', 'stock_manager')
  )
  OR technician_id = auth.uid()
);

DROP POLICY IF EXISTS dbs_insert ON public.digital_bag_sessions;
CREATE POLICY dbs_insert ON public.digital_bag_sessions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'stock_manager')
  )
);

DROP POLICY IF EXISTS dbs_update ON public.digital_bag_sessions;
CREATE POLICY dbs_update ON public.digital_bag_sessions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'stock_manager')
  )
);

DROP POLICY IF EXISTS dbs_delete ON public.digital_bag_sessions;
CREATE POLICY dbs_delete ON public.digital_bag_sessions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
  )
);

-- 7b. digital_bag_items
ALTER TABLE public.digital_bag_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dbi_select ON public.digital_bag_items;
CREATE POLICY dbi_select ON public.digital_bag_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'office_staff', 'stock_manager')
  )
  OR EXISTS (
    SELECT 1 FROM public.digital_bag_sessions dbs
    WHERE dbs.id = digital_bag_items.session_id
      AND dbs.technician_id = auth.uid()
  )
);

DROP POLICY IF EXISTS dbi_insert ON public.digital_bag_items;
CREATE POLICY dbi_insert ON public.digital_bag_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'stock_manager')
  )
);

DROP POLICY IF EXISTS dbi_update ON public.digital_bag_items;
CREATE POLICY dbi_update ON public.digital_bag_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'stock_manager')
  )
  OR EXISTS (
    SELECT 1 FROM public.digital_bag_sessions dbs
    WHERE dbs.id = digital_bag_items.session_id
      AND dbs.technician_id = auth.uid()
  )
);

DROP POLICY IF EXISTS dbi_delete ON public.digital_bag_items;
CREATE POLICY dbi_delete ON public.digital_bag_items FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
  )
);

-- 7c. digital_bag_consumptions
ALTER TABLE public.digital_bag_consumptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dbc_select ON public.digital_bag_consumptions;
CREATE POLICY dbc_select ON public.digital_bag_consumptions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'office_staff', 'stock_manager')
  )
  OR technician_id = auth.uid()
);

DROP POLICY IF EXISTS dbc_insert ON public.digital_bag_consumptions;
CREATE POLICY dbc_insert ON public.digital_bag_consumptions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'stock_manager')
  )
  OR technician_id = auth.uid()
);

DROP POLICY IF EXISTS dbc_delete ON public.digital_bag_consumptions;
CREATE POLICY dbc_delete ON public.digital_bag_consumptions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
  )
);

-- 7d. technician_service_payouts
ALTER TABLE public.technician_service_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tsp_select ON public.technician_service_payouts;
CREATE POLICY tsp_select ON public.technician_service_payouts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'office_staff')
  )
  OR technician_id = auth.uid()
);

DROP POLICY IF EXISTS tsp_insert ON public.technician_service_payouts;
CREATE POLICY tsp_insert ON public.technician_service_payouts FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'office_staff')
  )
);

DROP POLICY IF EXISTS tsp_update ON public.technician_service_payouts;
CREATE POLICY tsp_update ON public.technician_service_payouts FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'office_staff')
  )
);

DROP POLICY IF EXISTS tsp_delete ON public.technician_service_payouts;
CREATE POLICY tsp_delete ON public.technician_service_payouts FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
  )
);

-- --------------------------------------------------------------------------
-- 8. UPDATE CURRENT STOCK LEVELS VIEW
-- Subtract digital bag issued (minus returned) from total_received
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
  CASE
    WHEN COALESCE(received.total, 0) - COALESCE(issued.total, 0) <= 0 THEN 'out_of_stock'
    WHEN COALESCE(received.total, 0) - COALESCE(issued.total, 0) <= p.minimum_stock_level THEN 'low_stock'
    ELSE 'in_stock'
  END AS stock_status
FROM public.inventory_products p
LEFT JOIN LATERAL (
  SELECT
    COALESCE(SUM(sei.quantity), 0)::bigint AS total,
    MAX(se.entry_date) AS last_date
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
  'Aggregated current stock per active product. current_quantity = total_received - items issued via digital bag (net of returns).';
