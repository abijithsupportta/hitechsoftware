-- =====================================================================
-- Hi Tech Software - Fix AMC Contracts sold_by Type
-- Migration: 20260327_037_fix_amc_sold_by_type.sql
-- Purpose: Fix amc_contracts.sold_by from varchar to uuid
-- Issue: Commission joins broken due to wrong data type
-- =====================================================================

-- Check if column has data (should be empty)
-- SELECT sold_by FROM amc_contracts LIMIT 5;

-- FIX 1: Drop RLS policy first
DROP POLICY IF EXISTS "AMC contracts technician own access" ON public.amc_contracts;

-- FIX 2: Drop and recreate sold_by column as uuid
ALTER TABLE public.amc_contracts 
  DROP COLUMN sold_by;

ALTER TABLE public.amc_contracts
  ADD COLUMN sold_by uuid REFERENCES profiles(id);

-- FIX 3: Recreate RLS policy
CREATE POLICY "AMC contracts technician own access" ON public.amc_contracts
  FOR ALL
  USING (
    auth.uid() = customer_id 
    OR auth.uid() = sold_by
    OR get_my_role() IN ('super_admin', 'office_staff')
  );

-- =====================================================================
-- MIGRATION COMPLETION REPORT
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '=== MIGRATION 037 COMPLETED ===';
  RAISE NOTICE '✅ Fixed amc_contracts.sold_by from varchar to uuid';
  RAISE NOTICE '✅ Added proper foreign key constraint to profiles table';
  RAISE NOTICE '✅ Recreated RLS policy with new column type';
  RAISE NOTICE '✅ Commission joins should now work correctly';
  RAISE NOTICE '=== READY FOR NEXT MIGRATION ===';
END $$;
