-- ============================================================================
-- Subject Audit Log Extension
-- Migration: 20260317_007_subject_audit_log.sql
--
-- Extends subject_status_history to track ALL subject lifecycle events:
--   - status_change    : every status transition
--   - assignment       : first technician assigned
--   - reassignment     : technician changed to another
--   - unassignment     : technician removed
--   - reschedule       : allocated_date updated
--   - priority_change  : priority level changed
-- ============================================================================

-- --------------------------------------------------------------------------
-- Extend the table with audit columns
-- --------------------------------------------------------------------------

ALTER TABLE public.subject_status_history
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(40) NOT NULL DEFAULT 'status_change',
  ADD COLUMN IF NOT EXISTS old_value   TEXT,
  ADD COLUMN IF NOT EXISTS new_value   TEXT;

-- Back-fill existing rows
UPDATE public.subject_status_history
SET new_value = status
WHERE new_value IS NULL;

-- --------------------------------------------------------------------------
-- Update status-change trigger function to populate new columns
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_subject_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.subject_status_history(subject_id, event_type, status, old_value, new_value, changed_by)
    VALUES (NEW.id, 'status_change', NEW.status::text, NULL, NEW.status::text, NEW.created_by);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.subject_status_history(subject_id, event_type, status, old_value, new_value, changed_by)
    VALUES (
      NEW.id,
      'status_change',
      NEW.status::text,
      OLD.status::text,
      NEW.status::text,
      COALESCE(auth.uid(), NEW.assigned_by, NEW.created_by)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- Technician assignment / reassignment / unassignment tracker
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_subject_assignment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  old_tech_name TEXT;
  new_tech_name TEXT;
  evt_type      VARCHAR(40);
BEGIN
  -- Nothing changed, skip
  IF NEW.assigned_technician_id IS NOT DISTINCT FROM OLD.assigned_technician_id THEN
    RETURN NEW;
  END IF;

  -- Resolve old technician display name
  IF OLD.assigned_technician_id IS NOT NULL THEN
    SELECT display_name INTO old_tech_name
    FROM public.profiles
    WHERE id = OLD.assigned_technician_id;
  END IF;

  -- Resolve new technician display name
  IF NEW.assigned_technician_id IS NOT NULL THEN
    SELECT display_name INTO new_tech_name
    FROM public.profiles
    WHERE id = NEW.assigned_technician_id;
  END IF;

  -- Determine event type
  evt_type := CASE
    WHEN OLD.assigned_technician_id IS NULL THEN 'assignment'
    WHEN NEW.assigned_technician_id IS NULL THEN 'unassignment'
    ELSE 'reassignment'
  END;

  INSERT INTO public.subject_status_history(subject_id, event_type, status, old_value, new_value, changed_by)
  VALUES (
    NEW.id,
    evt_type,
    COALESCE(new_tech_name, 'Unassigned'),
    old_tech_name,
    new_tech_name,
    COALESCE(auth.uid(), NEW.assigned_by, NEW.created_by)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subject_assignment_history ON public.subjects;
CREATE TRIGGER trg_subject_assignment_history
AFTER UPDATE OF assigned_technician_id ON public.subjects
FOR EACH ROW EXECUTE FUNCTION public.log_subject_assignment_change();

-- --------------------------------------------------------------------------
-- Rescheduling tracker (allocated_date change)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_subject_reschedule()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.allocated_date IS NOT DISTINCT FROM OLD.allocated_date THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.subject_status_history(subject_id, event_type, status, old_value, new_value, changed_by)
  VALUES (
    NEW.id,
    'reschedule',
    'RESCHEDULED',
    OLD.allocated_date::text,
    NEW.allocated_date::text,
    COALESCE(auth.uid(), NEW.created_by)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subject_reschedule_history ON public.subjects;
CREATE TRIGGER trg_subject_reschedule_history
AFTER UPDATE OF allocated_date ON public.subjects
FOR EACH ROW EXECUTE FUNCTION public.log_subject_reschedule();

-- --------------------------------------------------------------------------
-- Priority change tracker
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_subject_priority_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.priority IS NOT DISTINCT FROM OLD.priority THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.subject_status_history(subject_id, event_type, status, old_value, new_value, changed_by)
  VALUES (
    NEW.id,
    'priority_change',
    NEW.priority,
    OLD.priority,
    NEW.priority,
    COALESCE(auth.uid(), NEW.created_by)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subject_priority_history ON public.subjects;
CREATE TRIGGER trg_subject_priority_history
AFTER UPDATE OF priority ON public.subjects
FOR EACH ROW EXECUTE FUNCTION public.log_subject_priority_change();
