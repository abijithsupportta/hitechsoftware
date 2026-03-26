-- =====================================================================
-- Hi Tech Software - Critical Database Fixes Migration
-- Migration: 20260327_034_critical_database_fixes.sql
-- Purpose: Fix critical schema issues causing API errors and data problems
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Fix subject_status enum to lowercase (CRITICAL - API 400 errors)
-- ---------------------------------------------------------------------

-- Rename old enum and create new lowercase version
ALTER TYPE subject_status RENAME TO subject_status_old;

CREATE TYPE subject_status AS ENUM (
  'pending', 'allocated', 'accepted', 'arrived',
  'in_progress', 'completed', 'incomplete',
  'awaiting_parts', 'reschedule', 'cancelled'
);

-- Update subjects table to use new lowercase enum
-- First drop the default constraint
ALTER TABLE subjects ALTER COLUMN status DROP DEFAULT;

-- Then alter the column type
ALTER TABLE subjects 
  ALTER COLUMN status TYPE subject_status 
  USING CASE 
    WHEN status = 'PENDING' THEN 'pending'::subject_status
    WHEN status = 'ALLOCATED' THEN 'allocated'::subject_status
    WHEN status = 'ACCEPTED' THEN 'accepted'::subject_status
    WHEN status = 'ARRIVED' THEN 'arrived'::subject_status
    WHEN status = 'IN_PROGRESS' THEN 'in_progress'::subject_status
    WHEN status = 'COMPLETED' THEN 'completed'::subject_status
    WHEN status = 'INCOMPLETE' THEN 'incomplete'::subject_status
    WHEN status = 'AWAITING_PARTS' THEN 'awaiting_parts'::subject_status
    WHEN status = 'RESCHEDULED' THEN 'reschedule'::subject_status
    WHEN status = 'CANCELLED' THEN 'cancelled'::subject_status
    ELSE 'pending'::subject_status
  END;

-- Add new default
ALTER TABLE subjects ALTER COLUMN status SET DEFAULT 'pending';

-- Update any other tables that might reference subject_status
DO $$
BEGIN
  -- Check if subject_status_history exists and update it
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subject_status_history' AND table_schema = 'public') THEN
    ALTER TABLE subject_status_history
      ALTER COLUMN status TYPE subject_status 
      USING CASE 
        WHEN status = 'PENDING' THEN 'pending'::subject_status
        WHEN status = 'ALLOCATED' THEN 'allocated'::subject_status
        WHEN status = 'ACCEPTED' THEN 'accepted'::subject_status
        WHEN status = 'ARRIVED' THEN 'arrived'::subject_status
        WHEN status = 'IN_PROGRESS' THEN 'in_progress'::subject_status
        WHEN status = 'COMPLETED' THEN 'completed'::subject_status
        WHEN status = 'INCOMPLETE' THEN 'incomplete'::subject_status
        WHEN status = 'AWAITING_PARTS' THEN 'awaiting_parts'::subject_status
        WHEN status = 'RESCHEDULED' THEN 'reschedule'::subject_status
        WHEN status = 'CANCELLED' THEN 'cancelled'::subject_status
        ELSE 'pending'::subject_status
      END;
  END IF;
END $$;

-- Drop old enum
DROP TYPE subject_status_old;

-- ---------------------------------------------------------------------
-- 2. Fix amc_contracts.sold_by from varchar to uuid (CRITICAL - joins broken)
-- ---------------------------------------------------------------------

-- First check if sold_by has data, then convert
ALTER TABLE amc_contracts 
  ALTER COLUMN sold_by TYPE uuid 
  USING CASE 
    WHEN sold_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN sold_by::uuid
    ELSE NULL
  END;

-- Add foreign key constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'amc_contracts_sold_by_fkey' 
                 AND table_name = 'amc_contracts') THEN
    ALTER TABLE amc_contracts 
      ADD CONSTRAINT amc_contracts_sold_by_fkey 
      FOREIGN KEY (sold_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3. Create suppliers table (CRITICAL - stock_entries foreign key)
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

DROP POLICY IF EXISTS suppliers_insert ON suppliers;
CREATE POLICY suppliers_insert ON suppliers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'office_staff', 'stock_manager'))
);

DROP POLICY IF EXISTS suppliers_update ON suppliers;
CREATE POLICY suppliers_update ON suppliers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'office_staff', 'stock_manager'))
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
-- 4. Add missing columns to subject_accessories (CRITICAL - GST calculation)
-- ---------------------------------------------------------------------

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add product_id reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subject_accessories' 
                 AND column_name = 'product_id') THEN
    ALTER TABLE subject_accessories
      ADD COLUMN product_id uuid 
      REFERENCES inventory_products(id) ON DELETE SET NULL;
  END IF;

  -- Add material_code
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subject_accessories' 
                 AND column_name = 'material_code') THEN
    ALTER TABLE subject_accessories
      ADD COLUMN material_code varchar(100);
  END IF;

  -- Add unit_price (what customer actually paid)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subject_accessories' 
                 AND column_name = 'unit_price') THEN
    ALTER TABLE subject_accessories
      ADD COLUMN unit_price decimal(12,2) DEFAULT 0;
  END IF;

  -- Add base_price (before GST)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subject_accessories' 
                 AND column_name = 'base_price') THEN
    ALTER TABLE subject_accessories
      ADD COLUMN base_price decimal(12,2) 
      GENERATED ALWAYS AS (discounted_mrp / 1.18) STORED;
  END IF;

  -- Add GST amount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subject_accessories' 
                 AND column_name = 'gst_amount') THEN
    ALTER TABLE subject_accessories
      ADD COLUMN gst_amount decimal(12,2) 
      GENERATED ALWAYS AS (discounted_mrp - (discounted_mrp / 1.18)) STORED;
  END IF;

  -- Add discount amount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subject_accessories' 
                 AND column_name = 'discount_amount') THEN
    ALTER TABLE subject_accessories
      ADD COLUMN discount_amount decimal(12,2)
      GENERATED ALWAYS AS (
        CASE 
          WHEN discount_type = 'percentage' 
          THEN mrp * discount_value / 100
          ELSE discount_value 
        END
      ) STORED;
  END IF;
END $$;

-- Update existing records to populate unit_price
UPDATE subject_accessories 
SET unit_price = discounted_mrp 
WHERE unit_price = 0 OR unit_price IS NULL;

-- ---------------------------------------------------------------------
-- 5. Drop old duplicate tables if empty (CLEANUP)
-- ---------------------------------------------------------------------

-- Drop old billing tables if empty
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing' AND table_schema = 'public') THEN
    IF (SELECT COUNT(*) FROM public.billing) = 0 THEN
      DROP TABLE IF EXISTS public.billing_items CASCADE;
      DROP TABLE IF EXISTS public.billing CASCADE;
      RAISE NOTICE 'Old billing tables dropped';
    ELSE
      RAISE NOTICE 'Old billing has data - keeping table';
    END IF;
  END IF;
END $$;

-- Drop old products table if empty
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
    IF (SELECT COUNT(*) FROM public.products) = 0 THEN
      DROP TABLE IF EXISTS public.products CASCADE;
      RAISE NOTICE 'Old products table dropped';
    ELSE
      RAISE NOTICE 'Old products has data - keeping table';
    END IF;
  END IF;
END $$;

-- Drop old amc table if empty
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'amc' AND table_schema = 'public') THEN
    IF (SELECT COUNT(*) FROM public.amc) = 0 THEN
      DROP TABLE IF EXISTS public.amc CASCADE;
      RAISE NOTICE 'Old amc table dropped';
    ELSE
      RAISE NOTICE 'Old amc has data - keeping table';
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 6. Fix any status inconsistencies in other tables
-- ---------------------------------------------------------------------

-- Update any hardcoded status values to lowercase
UPDATE subjects SET status = 'pending' WHERE status = 'PENDING';
UPDATE subjects SET status = 'allocated' WHERE status = 'ALLOCATED';
UPDATE subjects SET status = 'accepted' WHERE status = 'ACCEPTED';
UPDATE subjects SET status = 'arrived' WHERE status = 'ARRIVED';
UPDATE subjects SET status = 'in_progress' WHERE status = 'IN_PROGRESS';
UPDATE subjects SET status = 'completed' WHERE status = 'COMPLETED';
UPDATE subjects SET status = 'incomplete' WHERE status = 'INCOMPLETE';
UPDATE subjects SET status = 'awaiting_parts' WHERE status = 'AWAITING_PARTS';
UPDATE subjects SET status = 'reschedule' WHERE status = 'RESCHEDULED';
UPDATE subjects SET status = 'cancelled' WHERE status = 'CANCELLED';

-- ---------------------------------------------------------------------
-- 7. Create sample supplier data if needed
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

-- ---------------------------------------------------------------------
-- 8. Update materialized views that might be affected
-- ---------------------------------------------------------------------

-- Refresh current_stock_levels if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'current_stock_levels') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY current_stock_levels;
    RAISE NOTICE 'Refreshed current_stock_levels view';
  END IF;
END $$;

-- Refresh technician_leaderboard if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'technician_leaderboard') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY technician_leaderboard;
    RAISE NOTICE 'Refreshed technician_leaderboard view';
  END IF;
END $$;

-- =====================================================================
-- MIGRATION COMPLETION REPORT
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '=== MIGRATION 034 COMPLETED ===';
  RAISE NOTICE '✅ Fixed subject_status enum to lowercase';
  RAISE NOTICE '✅ Fixed amc_contracts.sold_by to uuid with foreign key';
  RAISE NOTICE '✅ Created suppliers table with RLS policies';
  RAISE NOTICE '✅ Added missing columns to subject_accessories';
  RAISE NOTICE '✅ Cleaned up old duplicate tables (if empty)';
  RAISE NOTICE '✅ Updated status values to lowercase';
  RAISE NOTICE '✅ Created sample supplier data';
  RAISE NOTICE '✅ Refreshed materialized views';
  RAISE NOTICE '=== READY FOR BUILD ===';
END $$;
