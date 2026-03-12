-- ============================================================================
-- Customers module upgrade: primary/secondary addresses, updated_at trigger, RLS
-- Migration: 20260312_004_customers_module_addresses.sql
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Keep this helper compatible with existing migrations.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.is_active = true
    AND p.is_deleted = false
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- Ensure timestamp trigger function exists.
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add new address fields if they do not already exist.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS primary_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS primary_address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS primary_area VARCHAR(120),
  ADD COLUMN IF NOT EXISTS primary_city VARCHAR(120),
  ADD COLUMN IF NOT EXISTS primary_postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS secondary_address_label VARCHAR(50),
  ADD COLUMN IF NOT EXISTS secondary_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS secondary_address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS secondary_area VARCHAR(120),
  ADD COLUMN IF NOT EXISTS secondary_city VARCHAR(120),
  ADD COLUMN IF NOT EXISTS secondary_postal_code VARCHAR(20);

-- Backfill from legacy columns where possible.
UPDATE public.customers
SET
  primary_address_line1 = COALESCE(primary_address_line1, address),
  primary_city = COALESCE(primary_city, city),
  primary_postal_code = COALESCE(primary_postal_code, postal_code)
WHERE
  primary_address_line1 IS NULL
  OR primary_city IS NULL
  OR primary_postal_code IS NULL;

-- Make primary address fields required for the module.
ALTER TABLE public.customers
  ALTER COLUMN primary_address_line1 SET NOT NULL,
  ALTER COLUMN primary_area SET NOT NULL,
  ALTER COLUMN primary_city SET NOT NULL;

-- Keep old city/postal_code aligned for backward compatibility.
UPDATE public.customers
SET
  city = primary_city,
  postal_code = primary_postal_code
WHERE
  city IS DISTINCT FROM primary_city
  OR postal_code IS DISTINCT FROM primary_postal_code;

-- Conditional validity for secondary address fields.
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_secondary_address_consistency;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_secondary_address_consistency CHECK (
    (
      secondary_address_label IS NULL
      AND secondary_address_line1 IS NULL
      AND secondary_area IS NULL
      AND secondary_city IS NULL
      AND secondary_postal_code IS NULL
    )
    OR
    (
      secondary_address_label IS NOT NULL
      AND secondary_address_line1 IS NOT NULL
      AND secondary_area IS NOT NULL
      AND secondary_city IS NOT NULL
      AND secondary_postal_code IS NOT NULL
    )
  );

-- Helpful indexes for list/search/filter screens.
CREATE INDEX IF NOT EXISTS idx_customers_primary_area ON public.customers(primary_area);
CREATE INDEX IF NOT EXISTS idx_customers_primary_city ON public.customers(primary_city);
CREATE INDEX IF NOT EXISTS idx_customers_is_deleted ON public.customers(is_deleted);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON public.customers(is_active);

-- Ensure updated_at auto-maintenance trigger is present.
DROP TRIGGER IF EXISTS trg_customers_update_timestamp ON public.customers;
DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;

CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- RLS policies (drop/recreate to keep deterministic state).
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customers_super_admin_all ON public.customers;
DROP POLICY IF EXISTS customers_staff_all ON public.customers;
DROP POLICY IF EXISTS customers_technician_read ON public.customers;

CREATE POLICY customers_super_admin_all ON public.customers
  FOR ALL
  USING (public.current_user_role() = 'super_admin')
  WITH CHECK (public.current_user_role() = 'super_admin');

CREATE POLICY customers_staff_all ON public.customers
  FOR ALL
  USING (public.current_user_role() IN ('office_staff', 'stock_manager'))
  WITH CHECK (public.current_user_role() IN ('office_staff', 'stock_manager'));

CREATE POLICY customers_technician_read ON public.customers
  FOR SELECT
  USING (public.current_user_role() = 'technician');
