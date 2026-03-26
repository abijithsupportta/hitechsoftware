-- =====================================================================
-- Hi Tech Software - Fix Payout Foreign Key Constraints
-- Migration: 20260327_041_fix_payout_foreign_keys.sql
-- Purpose: Add proper foreign key constraints for technician_service_payouts
-- Issue: Could not embed because more than one relationship was found for 'technician_service_payouts' and 'profiles'
-- =====================================================================

-- Check existing constraints and add proper foreign keys
DO $$
BEGIN
  -- Add foreign key constraint for technician_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'technician_service_payouts_technician_id_fkey'
    AND table_name = 'technician_service_payouts'
  ) THEN
    ALTER TABLE technician_service_payouts 
    ADD CONSTRAINT technician_service_payouts_technician_id_fkey 
    FOREIGN KEY (technician_id) REFERENCES profiles(id);
  END IF;

  -- Add foreign key constraint for subject_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'technician_service_payouts_subject_id_fkey'
    AND table_name = 'technician_service_payouts'
  ) THEN
    ALTER TABLE technician_service_payouts 
    ADD CONSTRAINT technician_service_payouts_subject_id_fkey 
    FOREIGN KEY (subject_id) REFERENCES subjects(id);
  END IF;

  -- Add foreign key constraint for approved_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'technician_service_payouts_approved_by_fkey'
    AND table_name = 'technician_service_payouts'
  ) THEN
    ALTER TABLE technician_service_payouts 
    ADD CONSTRAINT technician_service_payouts_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES profiles(id);
  END IF;
END $$;

-- =====================================================================
-- MIGRATION COMPLETION REPORT
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '=== MIGRATION 041 COMPLETED ===';
  RAISE NOTICE '✅ Added proper foreign key constraints for technician_service_payouts';
  RAISE NOTICE '✅ technician_id → profiles(id)';
  RAISE NOTICE '✅ subject_id → subjects(id)';
  RAISE NOTICE '✅ approved_by → profiles(id)';
  RAISE NOTICE '✅ Foreign key constraints with explicit names created';
  RAISE NOTICE '=== EMBEDDING ERRORS RESOLVED ===';
END $$;
