-- ============================================================================
-- Attendance module foundation
-- Migration: 20260317_009_attendance.sql
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  toggled_on_at TIMESTAMPTZ,
  toggled_off_at TIMESTAMPTZ,
  is_present BOOLEAN NOT NULL DEFAULT false,
  auto_offed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_logs_unique_technician_date UNIQUE (technician_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_date ON public.attendance_logs(date);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_technician_id ON public.attendance_logs(technician_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_is_present ON public.attendance_logs(is_present);

CREATE TABLE IF NOT EXISTS public.attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cutoff_time TIME NOT NULL DEFAULT '10:30',
  auto_off_time TIME NOT NULL DEFAULT '23:59',
  max_subjects_per_day INTEGER NOT NULL DEFAULT 12,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_settings_singleton_row CHECK (id IS NOT NULL),
  CONSTRAINT attendance_settings_max_subjects_positive CHECK (max_subjects_per_day > 0)
);

-- Enforce a single global settings row.
CREATE UNIQUE INDEX IF NOT EXISTS attendance_settings_singleton_guard ON public.attendance_settings ((true));

INSERT INTO public.attendance_settings (cutoff_time, auto_off_time, max_subjects_per_day)
SELECT '10:30'::time, '23:59'::time, 12
WHERE NOT EXISTS (SELECT 1 FROM public.attendance_settings);

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attendance_logs_super_admin_read_all ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_staff_read_all ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_technician_read_own ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_technician_update_own ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_settings_super_admin_all ON public.attendance_settings;
DROP POLICY IF EXISTS attendance_settings_staff_read ON public.attendance_settings;

CREATE POLICY attendance_logs_super_admin_read_all ON public.attendance_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

CREATE POLICY attendance_logs_staff_read_all ON public.attendance_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'office_staff')
  );

CREATE POLICY attendance_logs_technician_read_own ON public.attendance_logs
  FOR SELECT USING (
    technician_id = auth.uid()
  );

CREATE POLICY attendance_logs_technician_update_own ON public.attendance_logs
  FOR UPDATE USING (
    technician_id = auth.uid()
  )
  WITH CHECK (
    technician_id = auth.uid()
  );

CREATE POLICY attendance_settings_super_admin_all ON public.attendance_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin')
  );

CREATE POLICY attendance_settings_staff_read ON public.attendance_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'office_staff')
  );

DROP TRIGGER IF EXISTS trg_attendance_logs_update_timestamp ON public.attendance_logs;
CREATE TRIGGER trg_attendance_logs_update_timestamp
  BEFORE UPDATE ON public.attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_attendance_settings_update_timestamp ON public.attendance_settings;
CREATE TRIGGER trg_attendance_settings_update_timestamp
  BEFORE UPDATE ON public.attendance_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
