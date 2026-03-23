-- ============================================================================
-- Migration 017: Enterprise Scale Architecture
-- Hi Tech Software
-- Pure database work only. No application code changes are included here.
--
-- Note on Task 12:
-- PostgreSQL does not safely support REFRESH MATERIALIZED VIEW CONCURRENTLY
-- from Supabase RPC-style SQL functions. The refresh functions below therefore
-- use standard REFRESH MATERIALIZED VIEW so they remain callable from RPC.
-- If strict concurrent refresh is required, execute REFRESH MATERIALIZED VIEW
-- CONCURRENTLY as top-level SQL outside a function/procedure wrapper.
--
-- Note on Task 16:
-- Cron API routes and vercel.json changes are intentionally not included
-- because this migration is limited to pure database work.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Task 1: Role helper function
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.is_active = true
    AND p.is_deleted = false
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_my_role() IS
  'Returns the current authenticated user role from profiles using auth.uid(); used by RLS policies so role lookup is cached per query.';

REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO service_role;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_my_role();
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO service_role;

-- --------------------------------------------------------------------------
-- Task 2: subjects indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_subjects_assigned_technician_status
  ON public.subjects(assigned_technician_id, status);
COMMENT ON INDEX public.idx_subjects_assigned_technician_status IS
  'Serves technician queue and subject list filters by assigned_technician_id plus status.';

CREATE INDEX IF NOT EXISTS idx_subjects_allocated_date_desc
  ON public.subjects(allocated_date DESC);
COMMENT ON INDEX public.idx_subjects_allocated_date_desc IS
  'Serves reschedule board and allocation timeline queries ordered by allocated_date descending.';

CREATE INDEX IF NOT EXISTS idx_subjects_assigned_technician_allocated_date_desc
  ON public.subjects(assigned_technician_id, technician_allocated_date DESC);
COMMENT ON INDEX public.idx_subjects_assigned_technician_allocated_date_desc IS
  'Serves technician schedule pages ordered by latest technician_allocated_date per technician.';

CREATE INDEX IF NOT EXISTS idx_subjects_created_at_desc
  ON public.subjects(created_at DESC);
COMMENT ON INDEX public.idx_subjects_created_at_desc IS
  'Serves newest-jobs-first dashboards and audit-style subject listing by created_at descending.';

CREATE INDEX IF NOT EXISTS idx_subjects_brand_status
  ON public.subjects(brand_id, status);
COMMENT ON INDEX public.idx_subjects_brand_status IS
  'Serves brand workload summaries and brand-scoped subject status filters.';

CREATE INDEX IF NOT EXISTS idx_subjects_dealer_status
  ON public.subjects(dealer_id, status);
COMMENT ON INDEX public.idx_subjects_dealer_status IS
  'Serves dealer workload summaries and dealer-scoped subject status filters.';

CREATE INDEX IF NOT EXISTS idx_subjects_completed_at_desc_completed_only
  ON public.subjects(completed_at DESC)
  WHERE status = 'COMPLETED'::public.subject_status;
COMMENT ON INDEX public.idx_subjects_completed_at_desc_completed_only IS
  'Serves completed jobs history, revenue reports, and recent completion lookups.';

CREATE INDEX IF NOT EXISTS idx_subjects_priority_status
  ON public.subjects(priority, status);
COMMENT ON INDEX public.idx_subjects_priority_status IS
  'Serves priority-based dispatch boards filtered by current subject status.';

CREATE INDEX IF NOT EXISTS idx_subjects_active_jobs_assigned_technician_allocated_date
  ON public.subjects(assigned_technician_id, technician_allocated_date)
  WHERE status NOT IN (
    'COMPLETED'::public.subject_status,
    'CANCELLED'::public.subject_status,
    'RESCHEDULED'::public.subject_status
  );
COMMENT ON INDEX public.idx_subjects_active_jobs_assigned_technician_allocated_date IS
  'Serves active technician job queues by assigned_technician_id and technician_allocated_date.';

CREATE INDEX IF NOT EXISTS idx_subjects_overdue_jobs_allocated_date_assigned_technician
  ON public.subjects(technician_allocated_date, assigned_technician_id)
  WHERE status NOT IN (
    'COMPLETED'::public.subject_status,
    'CANCELLED'::public.subject_status,
    'RESCHEDULED'::public.subject_status
  );
COMMENT ON INDEX public.idx_subjects_overdue_jobs_allocated_date_assigned_technician IS
  'Serves overdue job monitoring by technician_allocated_date with technician grouping.';

CREATE INDEX IF NOT EXISTS idx_subjects_pending_unassigned_created_at_desc
  ON public.subjects(created_at DESC)
  WHERE assigned_technician_id IS NULL
    AND status = 'PENDING'::public.subject_status;
COMMENT ON INDEX public.idx_subjects_pending_unassigned_created_at_desc IS
  'Serves newest unassigned pending jobs list for dispatch staff.';

CREATE INDEX IF NOT EXISTS idx_subjects_full_text_search
  ON public.subjects
  USING gin (
    to_tsvector(
      'simple',
      coalesce(subject_number, '') || ' ' || coalesce(customer_name, '') || ' ' || coalesce(customer_phone, '')
    )
  );
COMMENT ON INDEX public.idx_subjects_full_text_search IS
  'Serves global subject search across subject_number, customer_name, and customer_phone.';

-- --------------------------------------------------------------------------
-- Task 3: customers indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS customers_phone_number_key
  ON public.customers(phone_number);
COMMENT ON INDEX public.customers_phone_number_key IS
  'Serves direct customer lookup by phone number for duplicate detection and quick search.';

CREATE INDEX IF NOT EXISTS idx_customers_primary_area_primary_city
  ON public.customers(primary_area, primary_city);
COMMENT ON INDEX public.idx_customers_primary_area_primary_city IS
  'Serves locality-based customer browsing and dispatch filtering by primary area and city.';

CREATE INDEX IF NOT EXISTS idx_customers_is_active_created_at_desc
  ON public.customers(is_active, created_at DESC);
COMMENT ON INDEX public.idx_customers_is_active_created_at_desc IS
  'Serves active/inactive customer list pages sorted by newest records first.';

CREATE INDEX IF NOT EXISTS idx_customers_full_text_search
  ON public.customers
  USING gin (
    to_tsvector(
      'simple',
      coalesce(customer_name, '') || ' ' || coalesce(phone_number, '') || ' ' || coalesce(address, '')
    )
  );
COMMENT ON INDEX public.idx_customers_full_text_search IS
  'Serves customer search across name, phone number, and address text.';

-- --------------------------------------------------------------------------
-- Task 4: subject_photos indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_subject_photos_subject_id
  ON public.subject_photos(subject_id);
COMMENT ON INDEX public.idx_subject_photos_subject_id IS
  'Serves photo gallery loading for a single subject.';

CREATE INDEX IF NOT EXISTS idx_subject_photos_subject_type
  ON public.subject_photos(subject_id, photo_type);
COMMENT ON INDEX public.idx_subject_photos_subject_type IS
  'Serves filtered subject photo retrieval by subject and photo_type.';

CREATE INDEX IF NOT EXISTS idx_subject_photos_uploaded_by_uploaded_at_desc
  ON public.subject_photos(uploaded_by, uploaded_at DESC);
COMMENT ON INDEX public.idx_subject_photos_uploaded_by_uploaded_at_desc IS
  'Serves uploader activity history ordered by latest uploads first.';

-- --------------------------------------------------------------------------
-- Task 5: subject_bills indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_subject_bills_subject_id
  ON public.subject_bills(subject_id);
COMMENT ON INDEX public.idx_subject_bills_subject_id IS
  'Serves bill lookup for a single subject.';

CREATE INDEX IF NOT EXISTS idx_subject_bills_brand_payment_status
  ON public.subject_bills(brand_id, payment_status);
COMMENT ON INDEX public.idx_subject_bills_brand_payment_status IS
  'Serves brand invoice aging and payment status lookups.';

CREATE INDEX IF NOT EXISTS idx_subject_bills_dealer_payment_status
  ON public.subject_bills(dealer_id, payment_status);
COMMENT ON INDEX public.idx_subject_bills_dealer_payment_status IS
  'Serves dealer invoice aging and payment status lookups.';

CREATE INDEX IF NOT EXISTS idx_subject_bills_payment_status_generated_at_desc
  ON public.subject_bills(payment_status, generated_at DESC);
COMMENT ON INDEX public.idx_subject_bills_payment_status_generated_at_desc IS
  'Serves bill lists filtered by payment_status and sorted by most recent generation time.';

CREATE INDEX IF NOT EXISTS subject_bills_bill_number_key
  ON public.subject_bills(bill_number);
COMMENT ON INDEX public.subject_bills_bill_number_key IS
  'Serves direct invoice lookup by bill_number.';

-- --------------------------------------------------------------------------
-- Task 6: subject_contracts indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_subject_contracts_subject_status
  ON public.subject_contracts(subject_id, status);
COMMENT ON INDEX public.idx_subject_contracts_subject_status IS
  'Serves contract lookup per subject filtered by lifecycle status.';

CREATE INDEX IF NOT EXISTS idx_subject_contracts_active_end_date_asc
  ON public.subject_contracts(end_date ASC)
  WHERE status = 'active';
COMMENT ON INDEX public.idx_subject_contracts_active_end_date_asc IS
  'Serves active contract expiry tracking ordered by nearest end_date first.';

CREATE INDEX IF NOT EXISTS idx_subject_contracts_subject_start_end
  ON public.subject_contracts(subject_id, start_date, end_date);
COMMENT ON INDEX public.idx_subject_contracts_subject_start_end IS
  'Serves subject contract timeline and overlap checks by subject and date range.';

-- --------------------------------------------------------------------------
-- Task 7: subject_accessories indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_subject_accessories_subject_id
  ON public.subject_accessories(subject_id);
COMMENT ON INDEX public.idx_subject_accessories_subject_id IS
  'Serves accessory line-item retrieval for a single subject.';

-- --------------------------------------------------------------------------
-- Task 8: attendance_logs indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_attendance_logs_technician_date_desc
  ON public.attendance_logs(technician_id, date DESC);
COMMENT ON INDEX public.idx_attendance_logs_technician_date_desc IS
  'Serves technician attendance history sorted by most recent attendance date.';

CREATE INDEX IF NOT EXISTS idx_attendance_logs_date_is_present
  ON public.attendance_logs(date, is_present);
COMMENT ON INDEX public.idx_attendance_logs_date_is_present IS
  'Serves daily attendance summaries split by presence state.';

CREATE INDEX IF NOT EXISTS idx_attendance_logs_toggled_on_at_desc_present_only
  ON public.attendance_logs(toggled_on_at DESC)
  WHERE is_present = true;
COMMENT ON INDEX public.idx_attendance_logs_toggled_on_at_desc_present_only IS
  'Serves latest active-presence check-ins ordered by toggled_on_at descending.';

-- --------------------------------------------------------------------------
-- Task 9: profiles indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles(role);
COMMENT ON INDEX public.idx_profiles_role IS
  'Serves role-based user lookup and RLS support paths.';

CREATE INDEX IF NOT EXISTS idx_profiles_is_online
  ON public.profiles(is_online);
COMMENT ON INDEX public.idx_profiles_is_online IS
  'Serves online/offline roster queries for technician presence and status boards.';

CREATE INDEX IF NOT EXISTS idx_profiles_role_is_online
  ON public.profiles(role, is_online);
COMMENT ON INDEX public.idx_profiles_role_is_online IS
  'Serves online roster queries segmented by profile role.';

-- --------------------------------------------------------------------------
-- Task 10: service_categories, brands, dealers indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS service_categories_name_key
  ON public.service_categories(name);
COMMENT ON INDEX public.service_categories_name_key IS
  'Serves exact lookup of service categories by name.';

CREATE INDEX IF NOT EXISTS idx_service_categories_active
  ON public.service_categories(is_active);
COMMENT ON INDEX public.idx_service_categories_active IS
  'Serves active/inactive filtering for service category master data.';

CREATE INDEX IF NOT EXISTS brands_name_key
  ON public.brands(name);
COMMENT ON INDEX public.brands_name_key IS
  'Serves exact lookup of brands by name.';

CREATE INDEX IF NOT EXISTS idx_brands_active
  ON public.brands(is_active);
COMMENT ON INDEX public.idx_brands_active IS
  'Serves active/inactive filtering for brand master data.';

CREATE INDEX IF NOT EXISTS dealers_name_key
  ON public.dealers(name);
COMMENT ON INDEX public.dealers_name_key IS
  'Serves exact lookup of dealers by name.';

CREATE INDEX IF NOT EXISTS idx_dealers_active
  ON public.dealers(is_active);
COMMENT ON INDEX public.idx_dealers_active IS
  'Serves active/inactive filtering for dealer master data.';

-- --------------------------------------------------------------------------
-- Task 11: materialized views
-- --------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS public.daily_service_summary CASCADE;
CREATE MATERIALIZED VIEW public.daily_service_summary AS
SELECT
  (s.created_at AT TIME ZONE 'UTC')::date AS service_date,
  COUNT(*)::bigint AS total_subjects,
  COUNT(*) FILTER (WHERE s.status = 'COMPLETED'::public.subject_status)::bigint AS total_completed,
  COUNT(*) FILTER (WHERE s.status = 'INCOMPLETE'::public.subject_status)::bigint AS total_incomplete,
  COUNT(*) FILTER (WHERE s.status = 'PENDING'::public.subject_status)::bigint AS total_pending,
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

DROP MATERIALIZED VIEW IF EXISTS public.technician_monthly_performance CASCADE;
CREATE MATERIALIZED VIEW public.technician_monthly_performance AS
WITH assignment_stats AS (
  SELECT
    s.assigned_technician_id AS technician_id,
    date_trunc('month', s.created_at)::date AS month,
    COUNT(*)::bigint AS total_assigned,
    COUNT(*) FILTER (WHERE s.status = 'COMPLETED'::public.subject_status)::bigint AS total_completed,
    COUNT(*) FILTER (WHERE s.status = 'INCOMPLETE'::public.subject_status)::bigint AS total_incomplete,
    COALESCE(SUM(s.grand_total) FILTER (WHERE s.status = 'COMPLETED'::public.subject_status), 0)::numeric(14,2) AS revenue_generated
  FROM public.subjects s
  WHERE s.assigned_technician_id IS NOT NULL
    AND s.is_deleted = false
  GROUP BY s.assigned_technician_id, date_trunc('month', s.created_at)::date
),
rejection_stats AS (
  SELECT
    s.rejected_by_technician_id AS technician_id,
    date_trunc('month', s.created_at)::date AS month,
    COUNT(*)::bigint AS total_rejected
  FROM public.subjects s
  WHERE s.rejected_by_technician_id IS NOT NULL
    AND s.is_deleted = false
  GROUP BY s.rejected_by_technician_id, date_trunc('month', s.created_at)::date
)
SELECT
  COALESCE(a.technician_id, r.technician_id) AS technician_id,
  COALESCE(a.month, r.month) AS month,
  COALESCE(a.total_assigned, 0)::bigint AS total_assigned,
  COALESCE(a.total_completed, 0)::bigint AS total_completed,
  COALESCE(a.total_incomplete, 0)::bigint AS total_incomplete,
  COALESCE(r.total_rejected, 0)::bigint AS total_rejected,
  ROUND(
    CASE
      WHEN COALESCE(a.total_assigned, 0) = 0 THEN 0
      ELSE (COALESCE(a.total_completed, 0)::numeric / COALESCE(a.total_assigned, 0)::numeric) * 100
    END,
    2
  ) AS completion_rate,
  COALESCE(a.revenue_generated, 0)::numeric(14,2) AS revenue_generated
FROM assignment_stats a
FULL OUTER JOIN rejection_stats r
  ON a.technician_id = r.technician_id
 AND a.month = r.month;

CREATE UNIQUE INDEX IF NOT EXISTS idx_technician_monthly_performance_technician_month
  ON public.technician_monthly_performance(technician_id, month);

DROP MATERIALIZED VIEW IF EXISTS public.brand_financial_summary CASCADE;
CREATE MATERIALIZED VIEW public.brand_financial_summary AS
SELECT
  b.id AS brand_id,
  b.name AS brand_name,
  COUNT(sb.id)::bigint AS total_services,
  COALESCE(SUM(sb.grand_total), 0)::numeric(14,2) AS total_invoiced,
  COALESCE(SUM(sb.grand_total) FILTER (WHERE sb.payment_status = 'due'), 0)::numeric(14,2) AS total_due,
  COALESCE(SUM(sb.grand_total) FILTER (WHERE sb.payment_status = 'paid'), 0)::numeric(14,2) AS total_paid
FROM public.brands b
LEFT JOIN public.subject_bills sb
  ON sb.brand_id = b.id
GROUP BY b.id, b.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_financial_summary_brand_id
  ON public.brand_financial_summary(brand_id);

DROP MATERIALIZED VIEW IF EXISTS public.dealer_financial_summary CASCADE;
CREATE MATERIALIZED VIEW public.dealer_financial_summary AS
SELECT
  d.id AS dealer_id,
  d.name AS dealer_name,
  COUNT(sb.id)::bigint AS total_services,
  COALESCE(SUM(sb.grand_total), 0)::numeric(14,2) AS total_invoiced,
  COALESCE(SUM(sb.grand_total) FILTER (WHERE sb.payment_status = 'due'), 0)::numeric(14,2) AS total_due,
  COALESCE(SUM(sb.grand_total) FILTER (WHERE sb.payment_status = 'paid'), 0)::numeric(14,2) AS total_paid
FROM public.dealers d
LEFT JOIN public.subject_bills sb
  ON sb.dealer_id = d.id
GROUP BY d.id, d.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dealer_financial_summary_dealer_id
  ON public.dealer_financial_summary(dealer_id);

-- --------------------------------------------------------------------------
-- Task 12: refresh functions
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_all_materialized_views()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.daily_service_summary;
  REFRESH MATERIALIZED VIEW public.technician_monthly_performance;
  REFRESH MATERIALIZED VIEW public.brand_financial_summary;
  REFRESH MATERIALIZED VIEW public.dealer_financial_summary;

  RETURN now();
END;
$$;

COMMENT ON FUNCTION public.refresh_all_materialized_views() IS
  'Refreshes all materialized views. Uses standard REFRESH because CONCURRENTLY is not safely callable from Supabase RPC functions.';

REVOKE ALL ON FUNCTION public.refresh_all_materialized_views() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_all_materialized_views() TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_financial_summaries()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.brand_financial_summary;
  REFRESH MATERIALIZED VIEW public.dealer_financial_summary;

  RETURN now();
END;
$$;

COMMENT ON FUNCTION public.refresh_financial_summaries() IS
  'Refreshes brand and dealer financial summary materialized views. Uses standard REFRESH for RPC compatibility.';

REVOKE ALL ON FUNCTION public.refresh_financial_summaries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_financial_summaries() TO service_role;

-- --------------------------------------------------------------------------
-- Task 13: archive infrastructure
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects_archive (
  LIKE public.subjects INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING GENERATED INCLUDING IDENTITY INCLUDING STORAGE INCLUDING COMMENTS
);

ALTER TABLE public.subjects_archive
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS archived_reason text;

CREATE INDEX IF NOT EXISTS idx_subjects_archive_created_at_desc_status
  ON public.subjects_archive(created_at DESC, status);
COMMENT ON INDEX public.idx_subjects_archive_created_at_desc_status IS
  'Serves archived subject history queries by most recent created_at and status.';

ALTER TABLE public.subjects_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subjects_archive_read_eligible_roles ON public.subjects_archive;
CREATE POLICY subjects_archive_read_eligible_roles ON public.subjects_archive
  FOR SELECT
  USING (
    public.get_my_role() IN ('super_admin', 'office_staff', 'stock_manager')
    OR assigned_technician_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.archive_completed_subjects(p_older_than interval)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived_count integer := 0;
BEGIN
  WITH candidates AS (
    SELECT s.*
    FROM public.subjects s
    WHERE s.status IN ('COMPLETED'::public.subject_status, 'CANCELLED'::public.subject_status)
      AND s.created_at < (now() - p_older_than)
  ),
  archived AS (
    INSERT INTO public.subjects_archive
    SELECT c.*, now(), format('Archived automatically after %s retention window', p_older_than::text)
    FROM candidates c
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  ),
  deleted AS (
    DELETE FROM public.subjects s
    USING archived a
    WHERE s.id = a.id
    RETURNING s.id
  )
  SELECT COUNT(*)::integer
  INTO v_archived_count
  FROM deleted;

  RETURN v_archived_count;
END;
$$;

COMMENT ON FUNCTION public.archive_completed_subjects(interval) IS
  'Moves completed/cancelled subjects older than the supplied interval into subjects_archive and returns the number of archived rows.';

REVOKE ALL ON FUNCTION public.archive_completed_subjects(interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_completed_subjects(interval) TO service_role;

CREATE OR REPLACE FUNCTION public.get_subject_including_archive(p_subject_id uuid)
RETURNS SETOF public.subjects_archive
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT s.*, NULL::timestamptz AS archived_at, NULL::text AS archived_reason
  FROM public.subjects s
  WHERE s.id = p_subject_id

  UNION ALL

  SELECT sa.*
  FROM public.subjects_archive sa
  WHERE sa.id = p_subject_id
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_subject_including_archive(uuid) IS
  'Returns a subject row from public.subjects first, or from public.subjects_archive when the live row has already been archived.';

REVOKE ALL ON FUNCTION public.get_subject_including_archive(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_subject_including_archive(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_subject_including_archive(uuid) TO service_role;

-- --------------------------------------------------------------------------
-- Task 14: RLS policy updates using get_my_role()
-- --------------------------------------------------------------------------
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- subjects
DROP POLICY IF EXISTS subjects_super_admin_all ON public.subjects;
DROP POLICY IF EXISTS subjects_staff_all ON public.subjects;
DROP POLICY IF EXISTS subjects_technician_own ON public.subjects;
DROP POLICY IF EXISTS subjects_technician_update_own ON public.subjects;
DROP POLICY IF EXISTS subjects_read_all_authenticated ON public.subjects;
DROP POLICY IF EXISTS subjects_read_non_technicians ON public.subjects;
DROP POLICY IF EXISTS subjects_read_technician_assigned_only ON public.subjects;
DROP POLICY IF EXISTS subjects_create_staff_admin ON public.subjects;
DROP POLICY IF EXISTS subjects_update_staff_admin ON public.subjects;
DROP POLICY IF EXISTS subjects_delete_super_admin ON public.subjects;
DROP POLICY IF EXISTS subjects_technician_respond ON public.subjects;
DROP POLICY IF EXISTS technician_update_own_subject_workflow ON public.subjects;

CREATE POLICY subjects_select_policy ON public.subjects
  FOR SELECT
  USING (
    public.get_my_role() IN ('super_admin', 'office_staff', 'stock_manager')
    OR assigned_technician_id = auth.uid()
  );

CREATE POLICY subjects_insert_policy ON public.subjects
  FOR INSERT
  WITH CHECK (public.get_my_role() IN ('super_admin', 'office_staff'));

CREATE POLICY subjects_update_policy ON public.subjects
  FOR UPDATE
  USING (
    public.get_my_role() IN ('super_admin', 'office_staff')
    OR assigned_technician_id = auth.uid()
  )
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'office_staff')
    OR assigned_technician_id = auth.uid()
  );

CREATE POLICY subjects_delete_policy ON public.subjects
  FOR DELETE
  USING (public.get_my_role() = 'super_admin');

-- customers
DROP POLICY IF EXISTS customers_super_admin_all ON public.customers;
DROP POLICY IF EXISTS customers_staff_all ON public.customers;
DROP POLICY IF EXISTS customers_technician_read ON public.customers;

CREATE POLICY customers_super_admin_all ON public.customers
  FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

CREATE POLICY customers_staff_all ON public.customers
  FOR ALL
  USING (public.get_my_role() IN ('office_staff', 'stock_manager'))
  WITH CHECK (public.get_my_role() IN ('office_staff', 'stock_manager'));

CREATE POLICY customers_technician_read ON public.customers
  FOR SELECT
  USING (public.get_my_role() = 'technician');

-- subject_photos
DROP POLICY IF EXISTS subject_photos_read_authenticated ON public.subject_photos;
DROP POLICY IF EXISTS subject_photos_technician_insert ON public.subject_photos;
DROP POLICY IF EXISTS subject_photos_super_admin_delete ON public.subject_photos;

CREATE POLICY subject_photos_read_authenticated ON public.subject_photos
  FOR SELECT
  USING (auth.role() = 'authenticated' AND is_deleted = false);

CREATE POLICY subject_photos_technician_insert ON public.subject_photos
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.subjects s
      WHERE s.id = subject_photos.subject_id
        AND s.assigned_technician_id = auth.uid()
        AND s.is_deleted = false
    )
  );

CREATE POLICY subject_photos_super_admin_delete ON public.subject_photos
  FOR DELETE
  USING (public.get_my_role() = 'super_admin');

-- subject_bills
DROP POLICY IF EXISTS subject_bills_read_all_authenticated ON public.subject_bills;
DROP POLICY IF EXISTS subject_bills_insert_staff_or_system ON public.subject_bills;
DROP POLICY IF EXISTS subject_bills_update_payment_staff_admin ON public.subject_bills;

CREATE POLICY subject_bills_read_all_authenticated ON public.subject_bills
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY subject_bills_insert_staff_or_system ON public.subject_bills
  FOR INSERT
  WITH CHECK (
    public.get_my_role() IN ('office_staff', 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.subjects s
      WHERE s.id = subject_id
        AND s.assigned_technician_id = auth.uid()
        AND s.is_deleted = false
    )
  );

CREATE POLICY subject_bills_update_payment_staff_admin ON public.subject_bills
  FOR UPDATE
  USING (public.get_my_role() IN ('office_staff', 'super_admin'))
  WITH CHECK (public.get_my_role() IN ('office_staff', 'super_admin'));

-- subject_contracts
DROP POLICY IF EXISTS subject_contracts_read_all ON public.subject_contracts;
DROP POLICY IF EXISTS subject_contracts_write_staff_admin ON public.subject_contracts;
DROP POLICY IF EXISTS subject_contracts_update_staff_admin ON public.subject_contracts;
DROP POLICY IF EXISTS subject_contracts_delete_staff_admin ON public.subject_contracts;

CREATE POLICY subject_contracts_read_all ON public.subject_contracts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY subject_contracts_write_staff_admin ON public.subject_contracts
  FOR INSERT
  WITH CHECK (public.get_my_role() IN ('super_admin', 'office_staff'));

CREATE POLICY subject_contracts_update_staff_admin ON public.subject_contracts
  FOR UPDATE
  USING (public.get_my_role() IN ('super_admin', 'office_staff'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'office_staff'));

CREATE POLICY subject_contracts_delete_staff_admin ON public.subject_contracts
  FOR DELETE
  USING (public.get_my_role() IN ('super_admin', 'office_staff'));

-- subject_accessories
DROP POLICY IF EXISTS subject_accessories_read_all_authenticated ON public.subject_accessories;
DROP POLICY IF EXISTS subject_accessories_insert_assigned_technician ON public.subject_accessories;
DROP POLICY IF EXISTS subject_accessories_delete_assigned_technician ON public.subject_accessories;

CREATE POLICY subject_accessories_read_all_authenticated ON public.subject_accessories
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY subject_accessories_insert_assigned_technician ON public.subject_accessories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.subjects s
      WHERE s.id = subject_id
        AND s.assigned_technician_id = auth.uid()
        AND s.is_deleted = false
    )
  );

CREATE POLICY subject_accessories_delete_assigned_technician ON public.subject_accessories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.subjects s
      WHERE s.id = subject_id
        AND s.assigned_technician_id = auth.uid()
        AND s.is_deleted = false
    )
  );

-- attendance_logs
DROP POLICY IF EXISTS attendance_logs_super_admin_read_all ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_staff_read_all ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_technician_read_own ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_technician_update_own ON public.attendance_logs;

CREATE POLICY attendance_logs_super_admin_read_all ON public.attendance_logs
  FOR SELECT
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY attendance_logs_staff_read_all ON public.attendance_logs
  FOR SELECT
  USING (public.get_my_role() = 'office_staff');

CREATE POLICY attendance_logs_technician_read_own ON public.attendance_logs
  FOR SELECT
  USING (technician_id = auth.uid());

CREATE POLICY attendance_logs_technician_update_own ON public.attendance_logs
  FOR UPDATE
  USING (technician_id = auth.uid())
  WITH CHECK (technician_id = auth.uid());

-- --------------------------------------------------------------------------
-- Task 15: optimization views
-- --------------------------------------------------------------------------
DROP VIEW IF EXISTS public.active_subjects_today CASCADE;
CREATE VIEW public.active_subjects_today
WITH (security_invoker = true) AS
SELECT *
FROM public.subjects
WHERE technician_allocated_date = CURRENT_DATE
  AND status NOT IN (
    'COMPLETED'::public.subject_status,
    'CANCELLED'::public.subject_status
  );

DROP VIEW IF EXISTS public.pending_unassigned_subjects CASCADE;
CREATE VIEW public.pending_unassigned_subjects
WITH (security_invoker = true) AS
SELECT *
FROM public.subjects
WHERE assigned_technician_id IS NULL
  AND status = 'PENDING'::public.subject_status;

DROP VIEW IF EXISTS public.overdue_subjects CASCADE;
CREATE VIEW public.overdue_subjects
WITH (security_invoker = true) AS
SELECT *
FROM public.subjects
WHERE technician_allocated_date < CURRENT_DATE
  AND status NOT IN (
    'COMPLETED'::public.subject_status,
    'CANCELLED'::public.subject_status,
    'RESCHEDULED'::public.subject_status
  );

DROP VIEW IF EXISTS public.brand_dealer_due_invoices CASCADE;
CREATE VIEW public.brand_dealer_due_invoices
WITH (security_invoker = true) AS
SELECT
  sb.*,
  b.name AS brand_name,
  d.name AS dealer_name
FROM public.subject_bills sb
LEFT JOIN public.brands b
  ON b.id = sb.brand_id
LEFT JOIN public.dealers d
  ON d.id = sb.dealer_id
WHERE sb.payment_status = 'due';

-- --------------------------------------------------------------------------
-- Task 17: verification queries for Supabase SQL editor
-- --------------------------------------------------------------------------
-- Total public indexes
-- SELECT COUNT(*) AS total_public_indexes
-- FROM pg_indexes
-- WHERE schemaname = 'public';

-- Materialized view row counts
-- SELECT 'daily_service_summary' AS view_name, COUNT(*) AS row_count FROM public.daily_service_summary
-- UNION ALL
-- SELECT 'technician_monthly_performance', COUNT(*) FROM public.technician_monthly_performance
-- UNION ALL
-- SELECT 'brand_financial_summary', COUNT(*) FROM public.brand_financial_summary
-- UNION ALL
-- SELECT 'dealer_financial_summary', COUNT(*) FROM public.dealer_financial_summary;

-- Confirm subjects policies reference get_my_role
-- SELECT schemaname, tablename, policyname, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename = 'subjects';

-- Confirm index usage on technician + status filters
-- EXPLAIN ANALYZE
-- SELECT *
-- FROM public.subjects
-- WHERE assigned_technician_id = '00000000-0000-0000-0000-000000000000'::uuid
--   AND status = 'ALLOCATED'::public.subject_status;