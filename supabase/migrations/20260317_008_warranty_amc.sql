-- ============================================================================
-- Warranty + AMC Contracts for subjects
-- Migration: 20260317_008_warranty_amc.sql
-- ============================================================================

-- --------------------------------------------------------------------------
-- Subject warranty fields
-- --------------------------------------------------------------------------
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS purchase_date DATE,
  ADD COLUMN IF NOT EXISTS warranty_period_months INTEGER,
  ADD COLUMN IF NOT EXISTS warranty_end_date DATE,
  ADD COLUMN IF NOT EXISTS warranty_status TEXT;

ALTER TABLE public.subjects
  DROP CONSTRAINT IF EXISTS subjects_warranty_status_check;

ALTER TABLE public.subjects
  ADD CONSTRAINT subjects_warranty_status_check
  CHECK (warranty_status IN ('active', 'expired') OR warranty_status IS NULL);

-- PostgreSQL generated stored columns cannot safely depend on CURRENT_DATE,
-- so warranty_status is auto-maintained with trigger logic.
CREATE OR REPLACE FUNCTION public.sync_subject_warranty_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.warranty_end_date IS NULL THEN
    NEW.warranty_status := NULL;
  ELSIF NEW.warranty_end_date >= CURRENT_DATE THEN
    NEW.warranty_status := 'active';
  ELSE
    NEW.warranty_status := 'expired';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subjects_sync_warranty_status ON public.subjects;
CREATE TRIGGER trg_subjects_sync_warranty_status
BEFORE INSERT OR UPDATE OF warranty_end_date
ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION public.sync_subject_warranty_status();

-- --------------------------------------------------------------------------
-- Subject contracts
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subject_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  contract_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  duration_months INTEGER,
  end_date DATE NOT NULL,
  is_custom_duration BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subject_contracts_duration_months_positive CHECK (duration_months IS NULL OR duration_months > 0),
  CONSTRAINT subject_contracts_status_check CHECK (status IN ('active', 'upcoming', 'expired')),
  CONSTRAINT subject_contracts_end_after_start CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_subject_contracts_subject_id ON public.subject_contracts(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_contracts_status ON public.subject_contracts(status);
CREATE INDEX IF NOT EXISTS idx_subject_contracts_dates ON public.subject_contracts(start_date, end_date);

CREATE OR REPLACE FUNCTION public.sync_subject_contract_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.start_date > CURRENT_DATE THEN
    NEW.status := 'upcoming';
  ELSIF NEW.end_date < CURRENT_DATE THEN
    NEW.status := 'expired';
  ELSE
    NEW.status := 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subject_contracts_sync_status ON public.subject_contracts;
CREATE TRIGGER trg_subject_contracts_sync_status
BEFORE INSERT OR UPDATE OF start_date, end_date
ON public.subject_contracts
FOR EACH ROW
EXECUTE FUNCTION public.sync_subject_contract_status();

DROP TRIGGER IF EXISTS trg_subject_contracts_update_timestamp ON public.subject_contracts;
CREATE TRIGGER trg_subject_contracts_update_timestamp
BEFORE UPDATE ON public.subject_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- --------------------------------------------------------------------------
-- Billing type resolver
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_subject_billing_type(p_subject_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_active_warranty BOOLEAN := false;
  has_active_contract BOOLEAN := false;
BEGIN
  SELECT COALESCE(s.warranty_end_date >= CURRENT_DATE, false)
  INTO has_active_warranty
  FROM public.subjects s
  WHERE s.id = p_subject_id
    AND s.is_deleted = false
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM public.subject_contracts sc
    WHERE sc.subject_id = p_subject_id
      AND sc.start_date <= CURRENT_DATE
      AND sc.end_date >= CURRENT_DATE
  )
  INTO has_active_contract;

  IF has_active_warranty OR has_active_contract THEN
    RETURN 'brand_dealer';
  END IF;

  RETURN 'customer';
END;
$$;

REVOKE ALL ON FUNCTION public.get_subject_billing_type(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_subject_billing_type(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_subject_billing_type(p_subject_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subjects s
  SET service_charge_type = public.get_subject_billing_type(p_subject_id)
  WHERE s.id = p_subject_id
    AND s.is_deleted = false;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_subject_billing_type(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_subject_billing_type(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_subject_billing_type_from_warranty()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_subject_billing_type(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subjects_refresh_billing_from_warranty ON public.subjects;
CREATE TRIGGER trg_subjects_refresh_billing_from_warranty
AFTER INSERT OR UPDATE OF warranty_end_date
ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION public.refresh_subject_billing_type_from_warranty();

CREATE OR REPLACE FUNCTION public.refresh_subject_billing_type_from_contracts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_subject_billing_type(OLD.subject_id);
    RETURN OLD;
  END IF;

  PERFORM public.refresh_subject_billing_type(NEW.subject_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subject_contracts_refresh_billing ON public.subject_contracts;
CREATE TRIGGER trg_subject_contracts_refresh_billing
AFTER INSERT OR UPDATE OR DELETE
ON public.subject_contracts
FOR EACH ROW
EXECUTE FUNCTION public.refresh_subject_billing_type_from_contracts();

-- --------------------------------------------------------------------------
-- RLS
-- --------------------------------------------------------------------------
ALTER TABLE public.subject_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subject_contracts_read_all ON public.subject_contracts;
CREATE POLICY subject_contracts_read_all ON public.subject_contracts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS subject_contracts_write_staff_admin ON public.subject_contracts;
CREATE POLICY subject_contracts_write_staff_admin ON public.subject_contracts
  FOR INSERT
  WITH CHECK (public.current_user_role() IN ('super_admin', 'office_staff'));

DROP POLICY IF EXISTS subject_contracts_update_staff_admin ON public.subject_contracts;
CREATE POLICY subject_contracts_update_staff_admin ON public.subject_contracts
  FOR UPDATE
  USING (public.current_user_role() IN ('super_admin', 'office_staff'))
  WITH CHECK (public.current_user_role() IN ('super_admin', 'office_staff'));

DROP POLICY IF EXISTS subject_contracts_delete_staff_admin ON public.subject_contracts;
CREATE POLICY subject_contracts_delete_staff_admin ON public.subject_contracts
  FOR DELETE
  USING (public.current_user_role() IN ('super_admin', 'office_staff'));
