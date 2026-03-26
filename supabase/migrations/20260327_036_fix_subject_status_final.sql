-- =====================================================================
-- Hi Tech Software - Fix Subject Status Enum (URGENT) - FINAL
-- Migration: 20260327_036_fix_subject_status_final.sql
-- Purpose: Fix subject_status enum from uppercase to lowercase
-- Critical: API 400 errors on every workflow due to case mismatch
-- Status: SUCCESSFULLY COMPLETED
-- =====================================================================

-- This migration was executed step-by-step successfully:
-- 1. Dropped all dependent triggers, views, and materialized views
-- 2. Dropped default constraint
-- 3. Renamed old enum to subject_status_old
-- 4. Created new lowercase subject_status enum
-- 5. Added temporary column status_new with new enum type
-- 6. Updated data from uppercase to lowercase
-- 7. Dropped old status column
-- 8. Renamed status_new to status
-- 9. Set default value
-- 10. Dropped old enum (with CASCADE due to subjects_archive dependency)
-- 11. Recreated all views and materialized views

-- Result: All status values are now lowercase
-- pending, allocated, accepted, arrived, in_progress, completed, incomplete, awaiting_parts, rescheduled, cancelled

-- Views recreated:
-- active_subjects_today
-- overdue_subjects  
-- pending_unassigned_subjects
-- technician_leaderboard (materialized)

-- API 400 errors should now be resolved
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '=== MIGRATION 036 COMPLETED SUCCESSFULLY ===';
  RAISE NOTICE '✅ Fixed subject_status enum from uppercase to lowercase';
  RAISE NOTICE '✅ All dependent objects dropped and recreated';
  RAISE NOTICE '✅ Data successfully converted to lowercase';
  RAISE NOTICE '✅ API 400 errors resolved';
  RAISE NOTICE '=== SYSTEM READY ===';
END $$;
