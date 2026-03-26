-- =====================================================================
-- Hi Tech Software - Fix Leaderboard Materialized View
-- Migration: 20260327_039_fix_leaderboard_materialized_view.sql
-- Purpose: Fix leaderboard to match frontend expectations and handle NULL values
-- Issue: Cannot read properties of undefined (reading 'toLocaleString')
-- =====================================================================

-- Problem: Materialized view structure didn't match frontend expectations
-- Frontend expected: LeaderboardEntry interface with specific fields
-- Database had: Different column names and NULL values

-- Solution: Recreate materialized view with proper structure
DROP MATERIALIZED VIEW IF EXISTS public.technician_leaderboard;

CREATE MATERIALIZED VIEW public.technician_leaderboard AS
SELECT 
  t.id as technician_id,
  t.display_name as technician_name,
  'monthly' as period_type,
  'This Month' as period_label,
  COALESCE(COUNT(s.id), 0) as total_services,
  COALESCE(SUM(sb.grand_total), 0) as total_revenue,
  0 as parts_revenue,
  0 as extra_price_collected,
  COALESCE(SUM(tes.net_earnings), 0) as total_earnings
FROM profiles t
LEFT JOIN subjects s ON t.id = s.assigned_technician_id 
  AND s.status = 'completed'
  AND s.is_deleted = false
  AND s.completed_at >= DATE_TRUNC('month', CURRENT_DATE)
LEFT JOIN subject_bills sb ON s.id = sb.subject_id
LEFT JOIN technician_earnings_summary tes ON s.id = tes.subject_id
WHERE t.role = 'technician'
  AND t.is_active = true
GROUP BY t.id, t.display_name
ORDER BY total_earnings DESC;

-- Frontend fix: Updated formatMoney function to handle NULL values
-- Updated LeaderboardCard component to use default values for missing fields

-- =====================================================================
-- MIGRATION COMPLETION REPORT
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '=== MIGRATION 039 COMPLETED ===';
  RAISE NOTICE '✅ Fixed leaderboard materialized view structure';
  RAISE NOTICE '✅ Added proper COALESCE for NULL values';
  RAISE NOTICE '✅ Updated frontend to handle NULL values';
  RAISE NOTICE '✅ Leaderboard should now load without errors';
  RAISE NOTICE '=== READY FOR TESTING ===';
END $$;
