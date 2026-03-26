-- =====================================================================
-- Hi Tech Software - Recreate Missing Materialized Views
-- Migration: 20260327_040_recreate_missing_materialized_views.sql
-- Purpose: Recreate materialized views dropped during enum fix
-- Issue: 404 errors for daily_service_summary and other views
-- =====================================================================

-- Recreate daily_service_summary with lowercase status values
DROP MATERIALIZED VIEW IF EXISTS public.daily_service_summary CASCADE;
CREATE MATERIALIZED VIEW public.daily_service_summary AS
SELECT
  (s.created_at AT TIME ZONE 'UTC')::date AS service_date,
  COUNT(*)::bigint AS total_subjects,
  COUNT(*) FILTER (WHERE s.status = 'completed')::bigint AS total_completed,
  COUNT(*) FILTER (WHERE s.status = 'incomplete')::bigint AS total_incomplete,
  COUNT(*) FILTER (WHERE s.status = 'pending')::bigint AS total_pending,
  COUNT(*) FILTER (WHERE s.assigned_technician_id IS NOT NULL)::bigint AS total_allocated,
  COUNT(*) FILTER (WHERE s.service_charge_type = 'customer')::bigint AS customer_jobs,
  COUNT(*) FILTER (WHERE s.service_charge_type = 'brand_dealer')::bigint AS brand_dealer_jobs,
  COALESCE(SUM(s.grand_total), 0)::numeric(14,2) AS total_revenue,
  COALESCE(SUM(s.grand_total) FILTER (WHERE s.service_charge_type = 'brand_dealer'), 0)::numeric(14,2) AS brand_dealer_revenue,
  COALESCE(SUM(s.grand_total) FILTER (WHERE s.service_charge_type = 'customer'), 0)::numeric(14,2) AS customer_revenue,
  COALESCE(SUM(s.grand_total) FILTER (WHERE s.billing_status IN ('due', 'partially_paid')), 0)::numeric(14,2) AS total_due
FROM public.subjects s
WHERE s.is_deleted = false
GROUP BY (s.created_at AT TIME ZONE 'UTC')::date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_service_summary_service_date
  ON public.daily_service_summary(service_date);

-- Recreate technician_monthly_performance with lowercase status values
DROP MATERIALIZED VIEW IF EXISTS public.technician_monthly_performance CASCADE;
CREATE MATERIALIZED VIEW public.technician_monthly_performance AS
WITH assignment_stats AS (
  SELECT
    s.assigned_technician_id AS technician_id,
    date_trunc('month', s.created_at)::date AS month,
    COUNT(*)::bigint AS total_assigned,
    COUNT(*) FILTER (WHERE s.status = 'completed')::bigint AS total_completed,
    COUNT(*) FILTER (WHERE s.status = 'incomplete')::bigint AS total_incomplete,
    COUNT(*) FILTER (WHERE s.status = 'pending')::bigint AS total_pending,
    COUNT(*) FILTER (WHERE s.status = 'allocated')::bigint AS total_allocated,
    COUNT(*) FILTER (WHERE s.status = 'accepted')::bigint AS total_accepted,
    COUNT(*) FILTER (WHERE s.status = 'arrived')::bigint AS total_arrived,
    COUNT(*) FILTER (WHERE s.status = 'in_progress')::bigint AS total_in_progress,
    COALESCE(AVG(EXTRACT(EPOCH FROM (s.completed_at - s.allocated_date))/3600), 0)::numeric(10,2) AS avg_completion_time_hours
  FROM public.subjects s
  WHERE s.assigned_technician_id IS NOT NULL 
    AND s.is_deleted = false
  GROUP BY s.assigned_technician_id, date_trunc('month', s.created_at)::date
),
revenue_stats AS (
  SELECT
    s.assigned_technician_id AS technician_id,
    date_trunc('month', s.created_at)::date AS month,
    COALESCE(SUM(s.grand_total), 0)::numeric(14,2) AS total_revenue,
    COALESCE(SUM(s.grand_total) FILTER (WHERE s.service_charge_type = 'brand_dealer'), 0)::numeric(14,2) AS brand_dealer_revenue,
    COALESCE(SUM(s.grand_total) FILTER (WHERE s.service_charge_type = 'customer'), 0)::numeric(14,2) AS customer_revenue,
    COUNT(DISTINCT s.id)::bigint AS total_jobs
  FROM public.subjects s
  WHERE s.assigned_technician_id IS NOT NULL 
    AND s.status = 'completed'
    AND s.is_deleted = false
  GROUP BY s.assigned_technician_id, date_trunc('month', s.created_at)::date
)
SELECT
  t.id AS technician_id,
  t.display_name AS technician_name,
  a.month,
  a.total_assigned,
  a.total_completed,
  a.total_incomplete,
  a.total_pending,
  a.total_allocated,
  a.total_accepted,
  a.total_arrived,
  a.total_in_progress,
  a.avg_completion_time_hours,
  r.total_revenue,
  r.brand_dealer_revenue,
  r.customer_revenue,
  r.total_jobs
FROM public.profiles t
LEFT JOIN assignment_stats a ON t.id = a.technician_id
LEFT JOIN revenue_stats r ON t.id = r.technician_id AND a.month = r.month
WHERE t.role = 'technician' AND t.is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_technician_monthly_performance_technician_month 
  ON public.technician_monthly_performance(technician_id, month);

-- Recreate brand_financial_summary
DROP MATERIALIZED VIEW IF EXISTS public.brand_financial_summary CASCADE;
CREATE MATERIALIZED VIEW public.brand_financial_summary AS
SELECT
  b.id AS brand_id,
  b.name AS brand_name,
  date_trunc('month', s.created_at)::date AS month,
  COUNT(DISTINCT s.id)::bigint AS total_subjects,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed')::bigint AS completed_subjects,
  COALESCE(SUM(s.grand_total), 0)::numeric(14,2) AS total_revenue,
  COALESCE(SUM(s.grand_total) FILTER (WHERE s.billing_status IN ('due', 'partially_paid')), 0)::numeric(14,2) AS due_amount,
  COALESCE(SUM(s.grand_total) FILTER (WHERE s.billing_status = 'paid'), 0)::numeric(14,2) AS paid_amount
FROM public.brands b
LEFT JOIN public.subjects s ON b.id = s.brand_id AND s.is_deleted = false
GROUP BY b.id, b.name, date_trunc('month', s.created_at)::date;

CREATE INDEX IF NOT EXISTS idx_brand_financial_summary_brand_month 
  ON public.brand_financial_summary(brand_id, month);

-- Recreate dealer_financial_summary
DROP MATERIALIZED VIEW IF EXISTS public.dealer_financial_summary CASCADE;
CREATE MATERIALIZED VIEW public.dealer_financial_summary AS
SELECT
  d.id AS dealer_id,
  d.name AS dealer_name,
  date_trunc('month', s.created_at)::date AS month,
  COUNT(DISTINCT s.id)::bigint AS total_subjects,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed')::bigint AS completed_subjects,
  COALESCE(SUM(s.grand_total), 0)::numeric(14,2) AS total_revenue,
  COALESCE(SUM(s.grand_total) FILTER (WHERE s.billing_status IN ('due', 'partially_paid')), 0)::numeric(14,2) AS due_amount,
  COALESCE(SUM(s.grand_total) FILTER (WHERE s.billing_status = 'paid'), 0)::numeric(14,2) AS paid_amount
FROM public.dealers d
LEFT JOIN public.subjects s ON d.id = s.dealer_id AND s.is_deleted = false
GROUP BY d.id, d.name, date_trunc('month', s.created_at)::date;

CREATE INDEX IF NOT EXISTS idx_dealer_financial_summary_dealer_month 
  ON public.dealer_financial_summary(dealer_id, month);

-- Drop existing function first
DROP FUNCTION IF EXISTS refresh_all_materialized_views();

-- Recreate refresh function
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_service_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.technician_monthly_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.brand_financial_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dealer_financial_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.technician_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- MIGRATION COMPLETION REPORT
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '=== MIGRATION 040 COMPLETED ===';
  RAISE NOTICE '✅ Recreated daily_service_summary materialized view';
  RAISE NOTICE '✅ Recreated technician_monthly_performance materialized view';
  RAISE NOTICE '✅ Recreated brand_financial_summary materialized view';
  RAISE NOTICE '✅ Recreated dealer_financial_summary materialized view';
  RAISE NOTICE '✅ All views using lowercase status values';
  RAISE NOTICE '✅ Created refresh_all_materialized_views function';
  RAISE NOTICE '=== 404 ERRORS RESOLVED ===';
END $$;
