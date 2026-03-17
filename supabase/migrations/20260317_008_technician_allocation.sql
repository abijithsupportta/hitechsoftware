-- ============================================================================
-- Technician Allocation Date
-- Migration: 20260317_008_technician_allocation.sql
--
-- Adds two columns to subjects for scheduling a technician visit:
--   technician_allocated_date  — the date the technician is scheduled to visit
--   technician_allocated_notes — optional visit notes for the technician
--
-- These are separate from the brand/dealer allocated_date which tracks the
-- job creation date from the source side.
-- ============================================================================

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS technician_allocated_date   DATE,
  ADD COLUMN IF NOT EXISTS technician_allocated_notes  TEXT;

-- Index for filtering/sorting by technician visit date
CREATE INDEX IF NOT EXISTS idx_subjects_tech_alloc_date
  ON public.subjects(technician_allocated_date)
  WHERE technician_allocated_date IS NOT NULL;
