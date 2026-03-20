-- ============================================================================
-- Job Workflow & Completion System — Full Schema
-- Migration: 20260317_010_job_workflow.sql
--
-- Safe to apply after migration 011 is already deployed; all statements are
-- idempotent. Adds ARRIVED and CANCELLED to the subject_status enum, brings
-- in all required job-workflow columns, creates subject_photos table with RLS.
-- Storage bucket 'subject-photos' must be created manually via Supabase
-- dashboard (SQL cannot provision Storage buckets).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Extend subject_status enum — add ARRIVED and CANCELLED
--    EN_ROUTE was deliberately omitted from this system.
-- --------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'ARRIVED' AND enumtypid = 'subject_status'::regtype
  ) THEN
    ALTER TYPE subject_status ADD VALUE 'ARRIVED';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'CANCELLED' AND enumtypid = 'subject_status'::regtype
  ) THEN
    ALTER TYPE subject_status ADD VALUE 'CANCELLED';
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 2. Job workflow timestamps
-- --------------------------------------------------------------------------
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS arrived_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS incomplete_at   TIMESTAMPTZ;

-- --------------------------------------------------------------------------
-- 3. Incomplete job columns
-- --------------------------------------------------------------------------
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS incomplete_reason    VARCHAR(40),
  ADD COLUMN IF NOT EXISTS incomplete_note      TEXT,
  ADD COLUMN IF NOT EXISTS spare_parts_requested TEXT,
  ADD COLUMN IF NOT EXISTS spare_parts_quantity  INT,
  ADD COLUMN IF NOT EXISTS rescheduled_date      DATE;

ALTER TABLE public.subjects
  DROP CONSTRAINT IF EXISTS subjects_incomplete_reason_chk;

ALTER TABLE public.subjects
  ADD CONSTRAINT subjects_incomplete_reason_chk CHECK (
    incomplete_reason IS NULL OR incomplete_reason IN (
      'customer_cannot_afford',
      'power_issue',
      'door_locked',
      'spare_parts_not_available',
      'site_not_ready',
      'other'
    )
  );

-- --------------------------------------------------------------------------
-- 4. Job completion columns
-- --------------------------------------------------------------------------
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS completion_proof_uploaded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completion_notes          TEXT;

-- --------------------------------------------------------------------------
-- 5. subject_photos table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subject_photos (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id       UUID         NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  photo_type       VARCHAR(40)  NOT NULL,
  storage_path     TEXT         NOT NULL UNIQUE,
  public_url       TEXT         NOT NULL,
  uploaded_by      UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at      TIMESTAMPTZ  DEFAULT NOW(),
  file_size_bytes  INT,
  mime_type        VARCHAR(100),
  is_deleted       BOOLEAN      DEFAULT false,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE public.subject_photos
  DROP CONSTRAINT IF EXISTS subject_photos_photo_type_chk;

ALTER TABLE public.subject_photos
  ADD CONSTRAINT subject_photos_photo_type_chk CHECK (
    photo_type IN (
      'serial_number',
      'machine',
      'bill',
      'job_sheet',
      'defective_part',
      'site_photo_1',
      'site_photo_2',
      'site_photo_3',
      'service_video'
    )
  );

-- --------------------------------------------------------------------------
-- 6. Indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_subjects_incomplete_reason
  ON public.subjects(incomplete_reason)
  WHERE incomplete_reason IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subject_photos_subject_id
  ON public.subject_photos(subject_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_subject_photos_subject_type
  ON public.subject_photos(subject_id, photo_type)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_subject_photos_uploaded_by
  ON public.subject_photos(uploaded_by)
  WHERE is_deleted = false;

-- --------------------------------------------------------------------------
-- 7. RLS for subject_photos
-- --------------------------------------------------------------------------
ALTER TABLE public.subject_photos ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read non-deleted photos
DROP POLICY IF EXISTS subject_photos_read_authenticated ON public.subject_photos;
CREATE POLICY subject_photos_read_authenticated ON public.subject_photos
  FOR SELECT
  USING (auth.role() = 'authenticated' AND is_deleted = false);

-- Only the assigned technician of the parent subject can insert photos
DROP POLICY IF EXISTS subject_photos_technician_insert ON public.subject_photos;
CREATE POLICY subject_photos_technician_insert ON public.subject_photos
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.subjects
      WHERE subjects.id = subject_photos.subject_id
        AND subjects.assigned_technician_id = auth.uid()
        AND subjects.is_deleted = false
    )
  );

-- No update allowed (photos are immutable once uploaded)
-- Only super_admin can delete / soft-delete
DROP POLICY IF EXISTS subject_photos_super_admin_delete ON public.subject_photos;
CREATE POLICY subject_photos_super_admin_delete ON public.subject_photos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );

-- --------------------------------------------------------------------------
-- 8. Grants
-- --------------------------------------------------------------------------
GRANT SELECT, INSERT ON public.subject_photos TO authenticated;
GRANT ALL ON public.subject_photos TO service_role;

-- NOTE: Storage bucket 'subject-photos' configuration:
--   Bucket name : subject-photos
--   Public      : true
--   Max file sz : 52428800 (50 MB)
--   Allowed types: image/jpeg, image/png, image/webp, video/mp4, video/quicktime
-- Create via: Supabase Dashboard > Storage > New bucket
