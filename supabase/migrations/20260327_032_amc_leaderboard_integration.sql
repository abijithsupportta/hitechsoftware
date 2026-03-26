-- ============================================================================
-- AMC Leaderboard Integration
-- Migration: 20260327_032_amc_leaderboard_integration.sql
-- ============================================================================

-- --------------------------------------------------------------------------
-- Update technician_leaderboard materialized view to include AMC metrics
-- --------------------------------------------------------------------------

-- Drop existing materialized view to recreate with AMC columns
DROP MATERIALIZED VIEW IF EXISTS public.technician_leaderboard;

-- Recreate technician_leaderboard with AMC sales metrics
CREATE MATERIALIZED VIEW public.technician_leaderboard AS
WITH base_stats AS (
  -- Service statistics
  SELECT 
    t.id as technician_id,
    t.display_name,
    t.role,
    COUNT(s.id) as total_services,
    COUNT(CASE WHEN s.status = 'COMPLETED' THEN 1 END) as completed_services,
    COALESCE(SUM(CASE WHEN s.status = 'COMPLETED' THEN s.service_charge END), 0) as service_revenue,
    COALESCE(SUM(sa.unit_price * sa.quantity), 0) as parts_revenue,
    COALESCE(SUM(sa.extra_price_collected), 0) as extra_price_collected,
    COUNT(CASE WHEN s.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as services_last_30_days,
    COUNT(CASE WHEN s.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as services_last_7_days,
    COUNT(CASE WHEN s.created_at >= CURRENT_DATE THEN 1 END) as services_today
  FROM public.profiles t
  LEFT JOIN public.subjects s ON t.id = s.assigned_technician_id
  LEFT JOIN public.subject_accessories sa ON s.id = sa.subject_id
  WHERE t.role IN ('technician', 'office_staff', 'super_admin')
    AND t.is_active = true
    AND s.is_deleted = false
  GROUP BY t.id, t.display_name, t.role
),
-- AMC statistics
amc_stats AS (
  SELECT 
    ac.sold_by as technician_id,
    COUNT(ac.id) as amc_sold_count,
    COALESCE(SUM(ac.price_paid), 0) as amc_revenue,
    COALESCE(SUM(ac.commission_amount), 0) as amc_commission,
    COUNT(CASE WHEN ac.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as amc_sold_last_30_days,
    COUNT(CASE WHEN ac.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as amc_sold_last_7_days,
    COUNT(CASE WHEN ac.created_at >= CURRENT_DATE THEN 1 END) as amc_sold_today
  FROM public.amc_contracts ac
  WHERE ac.status IN ('active', 'expired', 'cancelled')
  GROUP BY ac.sold_by
),
-- Earnings statistics
earnings_stats AS (
  SELECT 
    tes.technician_id,
    COALESCE(SUM(tes.service_commission), 0) as total_service_earnings,
    COALESCE(SUM(tes.parts_commission), 0) as total_parts_earnings,
    COALESCE(SUM(tes.extra_price_commission), 0) as total_extra_price_earnings,
    COALESCE(SUM(tes.net_earnings), 0) as total_earnings,
    COALESCE(SUM(CASE WHEN tes.earnings_status = 'pending' THEN tes.net_earnings END), 0) as pending_earnings,
    COALESCE(SUM(CASE WHEN tes.earnings_status = 'confirmed' THEN tes.net_earnings END), 0) as approved_earnings,
    0 as paid_earnings -- No paid status in current schema
  FROM public.technician_earnings_summary tes
  GROUP BY tes.technician_id
)
-- Final combined stats
SELECT 
  bs.technician_id,
  bs.display_name,
  bs.role,
  -- Service metrics
  bs.total_services,
  bs.completed_services,
  bs.service_revenue,
  bs.parts_revenue,
  bs.extra_price_collected,
  bs.services_last_30_days,
  bs.services_last_7_days,
  bs.services_today,
  -- AMC metrics
  COALESCE(amc.amc_sold_count, 0) as amc_sold_count,
  COALESCE(amc.amc_revenue, 0) as amc_revenue,
  COALESCE(amc.amc_commission, 0) as amc_commission,
  COALESCE(amc.amc_sold_last_30_days, 0) as amc_sold_last_30_days,
  COALESCE(amc.amc_sold_last_7_days, 0) as amc_sold_last_7_days,
  COALESCE(amc.amc_sold_today, 0) as amc_sold_today,
  -- Earnings metrics
  COALESCE(es.total_service_earnings, 0) as total_service_earnings,
  COALESCE(es.total_parts_earnings, 0) as total_parts_earnings,
  COALESCE(es.total_extra_price_earnings, 0) as total_extra_price_earnings,
  COALESCE(es.total_earnings, 0) as total_earnings,
  COALESCE(es.pending_earnings, 0) as pending_earnings,
  COALESCE(es.approved_earnings, 0) as approved_earnings,
  COALESCE(es.paid_earnings, 0) as paid_earnings,
  -- Calculated fields
  (bs.service_revenue + bs.parts_revenue + bs.extra_price_collected + COALESCE(amc.amc_revenue, 0)) as total_revenue,
  (bs.services_last_30_days + COALESCE(amc.amc_sold_last_30_days, 0)) as total_activities_last_30_days,
  (bs.services_last_7_days + COALESCE(amc.amc_sold_last_7_days, 0)) as total_activities_last_7_days,
  (bs.services_today + COALESCE(amc.amc_sold_today, 0)) as total_activities_today,
  CASE 
    WHEN bs.completed_services > 0 
    THEN ROUND((bs.completed_services::decimal / NULLIF(bs.total_services, 0)) * 100, 2)
    ELSE 0 
  END as completion_rate,
  -- Timestamps
  CURRENT_TIMESTAMP as last_updated
FROM base_stats bs
LEFT JOIN amc_stats amc ON bs.technician_id = amc.technician_id
LEFT JOIN earnings_stats es ON bs.technician_id = es.technician_id
WHERE bs.role IN ('technician', 'office_staff', 'super_admin');

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_technician_leaderboard_unique 
  ON public.technician_leaderboard (technician_id);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_technician_leaderboard_role 
  ON public.technician_leaderboard (role);

CREATE INDEX IF NOT EXISTS idx_technician_leaderboard_total_earnings 
  ON public.technician_leaderboard (total_earnings DESC);

CREATE INDEX IF NOT EXISTS idx_technician_leaderboard_amc_revenue 
  ON public.technician_leaderboard (amc_revenue DESC);

-- Update refresh_leaderboard function to include AMC data
CREATE OR REPLACE FUNCTION public.refresh_leaderboard()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY technician_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON public.technician_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_leaderboard() TO authenticated;

-- Initial refresh
SELECT refresh_leaderboard();
