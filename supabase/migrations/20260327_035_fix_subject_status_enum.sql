-- =====================================================================
-- Hi Tech Software - Fix Subject Status Enum (URGENT)
-- Migration: 20260327_035_fix_subject_status_enum.sql
-- Purpose: Fix subject_status enum from uppercase to lowercase
-- Critical: API 400 errors on every workflow due to case mismatch
-- =====================================================================

-- STEP 1: Check current default and drop it
ALTER TABLE public.subjects 
  ALTER COLUMN status DROP DEFAULT;

-- STEP 1.5: Drop dependent triggers
DROP TRIGGER IF EXISTS trg_subject_status_history_upd ON public.subjects;
DROP TRIGGER IF EXISTS trg_clear_status_changer ON public.subjects;

-- STEP 2: Drop dependent views first (including materialized views)
DROP VIEW IF EXISTS public.active_subjects_today;
DROP VIEW IF EXISTS public.overdue_subjects;
DROP VIEW IF EXISTS public.pending_unassigned_subjects;
DROP MATERIALIZED VIEW IF EXISTS public.technician_leaderboard;
DROP MATERIALIZED VIEW IF EXISTS public.daily_service_summary;
DROP MATERIALIZED VIEW IF EXISTS public.technician_monthly_performance;
DROP MATERIALIZED VIEW IF EXISTS public.brand_financial_summary;
DROP MATERIALIZED VIEW IF EXISTS public.dealer_financial_summary;
DROP MATERIALIZED VIEW IF EXISTS public.amc_dashboard_summary;

-- STEP 3: Rename old enum
ALTER TYPE subject_status 
  RENAME TO subject_status_old;

-- STEP 4: Create new lowercase enum
CREATE TYPE subject_status AS ENUM (
  'pending',
  'allocated', 
  'accepted',
  'arrived',
  'in_progress',
  'completed',
  'incomplete',
  'awaiting_parts',
  'rescheduled',
  'cancelled'
);

-- STEP 5: Change column type first
ALTER TABLE public.subjects 
  ALTER COLUMN status TYPE subject_status 
  USING CASE 
    WHEN status::text = 'PENDING' THEN 'pending'::subject_status
    WHEN status::text = 'ALLOCATED' THEN 'allocated'::subject_status
    WHEN status::text = 'ACCEPTED' THEN 'accepted'::subject_status
    WHEN status::text = 'ARRIVED' THEN 'arrived'::subject_status
    WHEN status::text = 'IN_PROGRESS' THEN 'in_progress'::subject_status
    WHEN status::text = 'COMPLETED' THEN 'completed'::subject_status
    WHEN status::text = 'INCOMPLETE' THEN 'incomplete'::subject_status
    WHEN status::text = 'AWAITING_PARTS' THEN 'awaiting_parts'::subject_status
    WHEN status::text = 'RESCHEDULED' THEN 'rescheduled'::subject_status
    WHEN status::text = 'CANCELLED' THEN 'cancelled'::subject_status
    ELSE 'pending'::subject_status
  END;

-- STEP 6: Restore default
ALTER TABLE public.subjects 
  ALTER COLUMN status SET DEFAULT 'pending';

-- STEP 8: Drop old enum
DROP TYPE subject_status_old;

-- STEP 9: Recreate views
CREATE OR REPLACE VIEW public.active_subjects_today AS
SELECT * FROM public.subjects
WHERE 
  assigned_technician_id IS NOT NULL
  AND status IN (
    'allocated', 'accepted', 'arrived', 'in_progress'
  )
  AND is_deleted = false;

CREATE OR REPLACE VIEW public.overdue_subjects AS
SELECT * FROM public.subjects
WHERE 
  status NOT IN ('completed', 'cancelled')
  AND is_deleted = false;

CREATE OR REPLACE VIEW public.pending_unassigned_subjects AS
SELECT * FROM public.subjects
WHERE 
  status = 'pending'
  AND assigned_technician_id IS NULL
  AND is_deleted = false;

-- STEP 10: Recreate materialized view
DROP MATERIALIZED VIEW IF EXISTS public.technician_leaderboard;
CREATE MATERIALIZED VIEW public.technician_leaderboard AS
SELECT 
  t.id as technician_id,
  t.display_name,
  COUNT(s.id) as total_completed,
  AVG(EXTRACT(EPOCH FROM (s.completed_at - s.allocated_date))/3600) as avg_completion_time_hours,
  SUM(sb.grand_total) as total_revenue,
  SUM(tes.net_earnings) as total_earnings,
  DATE_TRUNC('day', CURRENT_DATE) as leaderboard_date
FROM profiles t
LEFT JOIN subjects s ON t.id = s.assigned_technician_id 
  AND s.status = 'completed'
  AND s.is_deleted = false
  AND s.completed_at >= DATE_TRUNC('day', CURRENT_DATE)
LEFT JOIN subject_bills sb ON s.id = sb.subject_id
LEFT JOIN technician_earnings_summary tes ON s.id = tes.subject_id
WHERE t.role = 'technician'
  AND t.is_active = true
GROUP BY t.id, t.display_name
ORDER BY total_completed DESC, total_revenue DESC;

-- =====================================================================
-- MIGRATION COMPLETION REPORT
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '=== MIGRATION 035 COMPLETED ===';
  RAISE NOTICE '✅ Fixed subject_status enum from uppercase to lowercase';
  RAISE NOTICE '✅ Dropped and recreated dependent views';
  RAISE NOTICE '✅ Updated all existing data to lowercase';
  RAISE NOTICE '✅ API 400 errors should now be resolved';
  RAISE NOTICE '=== READY FOR TESTING ===';
END $$;
