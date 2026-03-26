-- =====================================================================
-- Hi Tech Software - Fix Subject Accessories Missing Columns
-- Migration: 20260327_038_fix_subject_accessories_columns.sql
-- Purpose: Add missing columns to subject_accessories for billing
-- Issue: Billing broken due to missing GST calculation columns
-- =====================================================================

-- FIX 2: Add missing columns to subject_accessories
ALTER TABLE public.subject_accessories
  ADD COLUMN IF NOT EXISTS unit_price 
    decimal(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS material_code 
    varchar(100),
  ADD COLUMN IF NOT EXISTS product_id 
    uuid REFERENCES inventory_products(id);

-- =====================================================================
-- MIGRATION COMPLETION REPORT
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '=== MIGRATION 038 COMPLETED ===';
  RAISE NOTICE '✅ Added unit_price column for GST calculations';
  RAISE NOTICE '✅ Added material_code column for product tracking';
  RAISE NOTICE '✅ Added product_id column for inventory joins';
  RAISE NOTICE '✅ Subject accessories billing should now work correctly';
  RAISE NOTICE '=== ALL CRITICAL FIXES COMPLETED ===';
END $$;
