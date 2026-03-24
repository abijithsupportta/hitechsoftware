-- ============================================================================
-- Migration 029: Fix session unique constraint for closed sessions
-- Hi Tech Software
--
-- The existing UNIQUE (technician_id, session_date) constraint blocks
-- creating a new session after the previous one was closed on the same day.
-- Replace with a partial unique index that only applies to open sessions.
-- ============================================================================

-- Drop the old constraint that blocks all same-day sessions
ALTER TABLE public.digital_bag_sessions
  DROP CONSTRAINT IF EXISTS uq_dbs_technician_date;

-- Create partial unique index: only one OPEN session per technician per day
CREATE UNIQUE INDEX IF NOT EXISTS uq_dbs_technician_date_open
  ON public.digital_bag_sessions (technician_id, session_date)
  WHERE status = 'open';
