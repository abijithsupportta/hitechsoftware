-- =====================================================================
-- Hi Tech Software - Critical Database Fixes (Minimal)
-- Migration: 20260327_034_fix_critical_issues.sql
-- Purpose: Fix only the most critical issues
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Create suppliers table (CRITICAL - stock_entries foreign key)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name varchar(255) NOT NULL,
  contact_person varchar(255),
  phone varchar(20),
  email varchar(255),
  address text,
  gstin varchar(20),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(supplier_name);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS suppliers_select ON suppliers;
CREATE POLICY suppliers_select ON suppliers FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'office_staff', 'stock_manager'))
  OR is_active = true
);

-- Update trigger
CREATE OR REPLACE FUNCTION public.suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS suppliers_updated_at ON suppliers;
CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION public.suppliers_updated_at();

-- ---------------------------------------------------------------------
-- 2. Create sample supplier data
-- ---------------------------------------------------------------------

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.suppliers) = 0 THEN
    INSERT INTO public.suppliers (supplier_name, contact_person, phone, email, address, gstin)
    VALUES 
      ('Default Supplier', 'Supplier Contact', '9876543210', 'supplier@example.com', 'Supplier Address', '27AAAPL1234C1ZV'),
      ('Local Parts Store', 'Store Manager', '9876543211', 'store@example.com', 'Local Address', '27AAAPL5678D2ZV');
    RAISE NOTICE 'Sample suppliers created';
  END IF;
END $$;

-- =====================================================================
-- MIGRATION COMPLETION REPORT
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '=== MIGRATION 034 COMPLETED ===';
  RAISE NOTICE '✅ Created suppliers table with RLS policies';
  RAISE NOTICE '✅ Created sample supplier data';
  RAISE NOTICE '✅ Fixed stock_entries foreign key dependency';
  RAISE NOTICE '=== READY FOR BUILD ===';
END $$;
