-- ============================================================================
-- Add RLS policy for technician workflow status updates
-- Migration: 20260320_014_technician_rls_workflow.sql
-- ============================================================================

-- Policy: Allow technicians to update workflow-related fields on their assigned subjects
CREATE POLICY "technician_update_own_subject_workflow"
ON subjects
FOR UPDATE
USING (
  -- Technician can only update subjects assigned to them
  assigned_technician_id = auth.uid()
)
WITH CHECK (
  -- Can only update subjects assigned to them
  assigned_technician_id = auth.uid()
);

-- ============================================================================
-- Notes
-- ============================================================================
-- This policy allows technicians to update subjects they are assigned to.
-- When used with the API server-side logic that uses the admin client,
-- this RLS policy is optional (admin client bypasses RLS).
-- However, this provides a secondary layer of security if technicians
-- ever make direct Supabase queries.
--
-- This policy specifically allows status workflow updates (arrived, in_progress, etc.)
-- by checking that the technician is the assigned_technician_id for that subject.
