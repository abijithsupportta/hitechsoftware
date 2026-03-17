-- ============================================================================
-- Technician Subject Accept / Reject
-- Migration: 20260318_011_technician_subject_response.sql
--
-- Allows technicians to accept or reject an allocated service.
-- On rejection the subject is flagged for urgent rescheduling by admins,
-- logged to the activity timeline and the technician's rejection counter
-- is incremented.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1.  subject columns
-- --------------------------------------------------------------------------

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS technician_acceptance_status VARCHAR(10) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS technician_rejection_reason  TEXT,
  ADD COLUMN IF NOT EXISTS is_rejected_pending_reschedule BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.subjects
  DROP CONSTRAINT IF EXISTS subjects_tech_acceptance_status_chk;

ALTER TABLE public.subjects
  ADD CONSTRAINT subjects_tech_acceptance_status_chk
  CHECK (technician_acceptance_status IN ('pending', 'accepted', 'rejected'));

-- Allow quick lookup of subjects that need rescheduling
CREATE INDEX IF NOT EXISTS idx_subjects_rejected_pending_reschedule
  ON public.subjects(is_rejected_pending_reschedule)
  WHERE is_rejected_pending_reschedule = true;

-- --------------------------------------------------------------------------
-- 2.  technicians rejection counter
-- --------------------------------------------------------------------------

ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS total_rejections INTEGER NOT NULL DEFAULT 0;

-- --------------------------------------------------------------------------
-- 4.  Helper RPC: atomically increment a technician's rejection counter.
--     Called by the API route using the service-role client.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_technician_rejections(p_technician_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.technicians
  SET total_rejections = total_rejections + 1
  WHERE id = p_technician_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_technician_rejections(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_technician_rejections(UUID) TO service_role;

-- --------------------------------------------------------------------------
-- 5.  timeline trigger for acceptance / rejection
--     We add a DB-level trigger so that the timeline is always recorded
--     even if the write goes through the admin client.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_subject_acceptance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  evt_type       VARCHAR(40);
  evt_new_value  TEXT;
BEGIN
  -- Only fire when technician_acceptance_status actually changes
  IF NEW.technician_acceptance_status IS NOT DISTINCT FROM OLD.technician_acceptance_status THEN
    RETURN NEW;
  END IF;

  -- Skip the initial default value being set on INSERT (handled by status_change trigger)
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  CASE NEW.technician_acceptance_status
    WHEN 'accepted' THEN
      evt_type      := 'acceptance';
      evt_new_value := 'accepted';
    WHEN 'rejected' THEN
      evt_type      := 'rejection';
      evt_new_value := COALESCE(NEW.technician_rejection_reason, 'No reason provided');
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.subject_status_history(
    subject_id,
    event_type,
    status,
    old_value,
    new_value,
    changed_by
  )
  VALUES (
    NEW.id,
    evt_type,
    NEW.status::text,
    OLD.technician_acceptance_status,
    evt_new_value,
    COALESCE(auth.uid(), NEW.assigned_technician_id, NEW.created_by)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subject_acceptance_history ON public.subjects;
CREATE TRIGGER trg_subject_acceptance_history
AFTER UPDATE OF technician_acceptance_status ON public.subjects
FOR EACH ROW EXECUTE FUNCTION public.log_subject_acceptance_change();

-- --------------------------------------------------------------------------
-- 6.  RLS: technicians may UPDATE only the acceptance columns on subjects
--     assigned to them.  All other subject writes remain staff / admin only.
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS subjects_technician_respond ON public.subjects;

CREATE POLICY subjects_technician_respond ON public.subjects
  FOR UPDATE
  USING (
    assigned_technician_id = auth.uid()
    AND is_deleted = false
  )
  WITH CHECK (
    assigned_technician_id = auth.uid()
    AND is_deleted = false
  );
