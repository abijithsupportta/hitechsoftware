-- ============================================================================
-- AMC (Annual Maintenance Contract) Selling and Management Module
-- Migration: 20260327_031_amc_selling.sql
-- ============================================================================

-- --------------------------------------------------------------------------
-- AMC Contracts Table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.amc_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  appliance_category_id UUID NOT NULL REFERENCES public.service_categories(id),
  appliance_brand TEXT NOT NULL,
  appliance_model TEXT,
  appliance_serial_number TEXT,
  duration_type TEXT NOT NULL CHECK (duration_type IN ('1_year', '2_year', '3_year', 'custom')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  price_paid DECIMAL(10,2) NOT NULL CHECK (price_paid >= 0),
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash', 'invoice', 'upi', 'card')),
  billed_to_type TEXT NOT NULL CHECK (billed_to_type IN ('brand', 'dealer')),
  billed_to_id UUID,
  sold_by UUID NOT NULL REFERENCES public.profiles(id),
  sold_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
  commission_set_by UUID REFERENCES auth.users(id),
  commission_set_at TIMESTAMPTZ,
  coverage_description TEXT NOT NULL CHECK (LENGTH(TRIM(coverage_description)) >= 20),
  free_visits_per_year INTEGER CHECK (free_visits_per_year IS NULL OR free_visits_per_year > 0),
  parts_covered BOOLEAN NOT NULL DEFAULT false,
  parts_coverage_limit DECIMAL(10,2) CHECK (parts_coverage_limit IS NULL OR parts_coverage_limit > 0),
  brands_covered TEXT,
  exclusions TEXT,
  special_terms TEXT,
  notification_30_sent BOOLEAN NOT NULL DEFAULT false,
  notification_15_sent BOOLEAN NOT NULL DEFAULT false,
  notification_7_sent BOOLEAN NOT NULL DEFAULT false,
  notification_1_sent BOOLEAN NOT NULL DEFAULT false,
  last_notification_sent_at TIMESTAMPTZ,
  renewal_of UUID REFERENCES public.amc_contracts(id),
  renewed_by_id UUID REFERENCES public.amc_contracts(id),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  cancellation_reason TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT amc_contracts_end_after_start CHECK (end_date >= start_date)
);

-- --------------------------------------------------------------------------
-- Function to validate billed_to_id constraint
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_amc_billed_to_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.billed_to_type = 'brand' THEN
    IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = NEW.billed_to_id) THEN
      RAISE EXCEPTION 'Invalid brand ID for billed_to_type = brand';
    END IF;
  ELSIF NEW.billed_to_type = 'dealer' THEN
    IF NOT EXISTS (SELECT 1 FROM public.dealers WHERE id = NEW.billed_to_id) THEN
      RAISE EXCEPTION 'Invalid dealer ID for billed_to_type = dealer';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- Trigger for billed_to_id validation
-- --------------------------------------------------------------------------
CREATE TRIGGER trg_amc_contracts_validate_billed_to_id
BEFORE INSERT OR UPDATE OF billed_to_type, billed_to_id
ON public.amc_contracts
FOR EACH ROW
EXECUTE FUNCTION public.validate_amc_billed_to_id();

-- --------------------------------------------------------------------------
-- Indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_amc_contracts_customer_id ON public.amc_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_amc_contracts_subject_id ON public.amc_contracts(subject_id);
CREATE INDEX IF NOT EXISTS idx_amc_contracts_status ON public.amc_contracts(status);
CREATE INDEX IF NOT EXISTS idx_amc_contracts_end_date ON public.amc_contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_amc_contracts_sold_by ON public.amc_contracts(sold_by);
CREATE INDEX IF NOT EXISTS idx_amc_contracts_contract_number ON public.amc_contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_amc_contracts_appliance ON public.amc_contracts(customer_id, appliance_category_id, appliance_brand);

-- --------------------------------------------------------------------------
-- Unique Partial Index - Prevent overlapping active AMCs
-- --------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_amc_contracts_no_overlap_active 
  ON public.amc_contracts(customer_id, appliance_category_id, appliance_brand) 
  WHERE status = 'active';

-- --------------------------------------------------------------------------
-- AMC Notification Logs Table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.amc_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amc_id UUID NOT NULL REFERENCES public.amc_contracts(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('30_days', '15_days', '7_days', '1_day')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  customer_phone TEXT NOT NULL,
  message_sent TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  fast2sms_response_id TEXT,
  failed_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_amc_notification_logs_amc_id ON public.amc_notification_logs(amc_id);
CREATE INDEX IF NOT EXISTS idx_amc_notification_logs_sent_at ON public.amc_notification_logs(sent_at);

-- --------------------------------------------------------------------------
-- Add amc_id to subjects table for reference
-- --------------------------------------------------------------------------
ALTER TABLE public.subjects 
  ADD COLUMN IF NOT EXISTS amc_id UUID REFERENCES public.amc_contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subjects_amc_id ON public.subjects(amc_id);

-- --------------------------------------------------------------------------
-- Functions
-- --------------------------------------------------------------------------

-- Generate AMC contract number in format AMC-YYYY-NNNN
CREATE OR REPLACE FUNCTION public.generate_amc_contract_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  contract_number TEXT;
BEGIN
  year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM 10) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.amc_contracts
  WHERE contract_number LIKE 'AMC-' || year_part || '-%';
  
  contract_number := 'AMC-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN contract_number;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_amc_contract_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_amc_contract_number() TO authenticated;

-- Calculate AMC end date based on duration type
CREATE OR REPLACE FUNCTION public.calculate_amc_end_date(p_start_date DATE, p_duration_type TEXT)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE p_duration_type
    WHEN '1_year' THEN RETURN p_start_date + INTERVAL '1 year';
    WHEN '2_year' THEN RETURN p_start_date + INTERVAL '2 years';
    WHEN '3_year' THEN RETURN p_start_date + INTERVAL '3 years';
    WHEN 'custom' THEN RAISE EXCEPTION 'Custom duration requires explicit end_date';
    ELSE RAISE EXCEPTION 'Invalid duration_type: %', p_duration_type;
  END CASE;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_amc_end_date(DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_amc_end_date(DATE, TEXT) TO authenticated;

-- Check for active AMC for appliance (used in subject creation)
CREATE OR REPLACE FUNCTION public.check_active_amc_for_appliance(
  p_customer_id UUID,
  p_appliance_category_id UUID,
  p_appliance_brand TEXT
)
RETURNS TABLE (
  id UUID,
  contract_number TEXT,
  end_date DATE,
  billed_to_type TEXT,
  billed_to_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.id,
    ac.contract_number,
    ac.end_date,
    ac.billed_to_type,
    ac.billed_to_id
  FROM public.amc_contracts ac
  WHERE ac.customer_id = p_customer_id
    AND ac.appliance_category_id = p_appliance_category_id
    AND ac.appliance_brand = p_appliance_brand
    AND ac.status = 'active'
    AND ac.end_date >= CURRENT_DATE
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.check_active_amc_for_appliance(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_active_amc_for_appliance(UUID, UUID, TEXT) TO authenticated;

-- Get expiring AMCs for notifications
CREATE OR REPLACE FUNCTION public.get_expiring_amcs(p_days_before INTEGER)
RETURNS TABLE (
  id UUID,
  contract_number TEXT,
  customer_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  end_date DATE,
  appliance_brand TEXT,
  appliance_category_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.id,
    ac.contract_number,
    ac.customer_id,
    c.customer_name,
    c.phone_number,
    ac.end_date,
    ac.appliance_brand,
    sc.name as appliance_category_name
  FROM public.amc_contracts ac
  JOIN public.customers c ON ac.customer_id = c.id
  JOIN public.service_categories sc ON ac.appliance_category_id = sc.id
  WHERE ac.end_date = CURRENT_DATE + INTERVAL '1 day' * p_days_before
    AND ac.status = 'active'
    AND (
      (p_days_before = 30 AND ac.notification_30_sent = false) OR
      (p_days_before = 15 AND ac.notification_15_sent = false) OR
      (p_days_before = 7 AND ac.notification_7_sent = false) OR
      (p_days_before = 1 AND ac.notification_1_sent = false)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_expiring_amcs(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_expiring_amcs(INTEGER) TO authenticated;

-- Mark AMC notification as sent
CREATE OR REPLACE FUNCTION public.mark_amc_notification_sent(
  p_amc_id UUID,
  p_days_before INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.amc_contracts
  SET 
    last_notification_sent_at = NOW(),
    notification_30_sent = CASE WHEN p_days_before = 30 THEN true ELSE notification_30_sent END,
    notification_15_sent = CASE WHEN p_days_before = 15 THEN true ELSE notification_15_sent END,
    notification_7_sent = CASE WHEN p_days_before = 7 THEN true ELSE notification_7_sent END,
    notification_1_sent = CASE WHEN p_days_before = 1 THEN true ELSE notification_1_sent END
  WHERE id = p_amc_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_amc_notification_sent(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_amc_notification_sent(UUID, INTEGER) TO authenticated;

-- --------------------------------------------------------------------------
-- AMC Dashboard Summary Materialized View
-- --------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.amc_dashboard_summary AS
SELECT 
  CURRENT_DATE as report_date,
  (SELECT COUNT(*) FROM public.amc_contracts WHERE status = 'active') as total_active_amcs,
  (SELECT COUNT(*) FROM public.amc_contracts 
   WHERE status = 'active' 
   AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_in_30_days,
  (SELECT COUNT(*) FROM public.amc_contracts 
   WHERE status = 'active' 
   AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days') as expiring_in_7_days,
  (SELECT COUNT(*) FROM public.amc_contracts 
   WHERE status = 'expired' 
   AND end_date >= DATE_TRUNC('month', CURRENT_DATE) 
   AND end_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month') as expired_this_month,
  (SELECT COALESCE(SUM(price_paid), 0) FROM public.amc_contracts 
   WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)) as revenue_this_month,
  (SELECT p.display_name 
   FROM public.profiles p
   JOIN public.amc_contracts ac ON p.id = ac.sold_by
   WHERE DATE_TRUNC('month', ac.created_at) = DATE_TRUNC('month', CURRENT_DATE)
   GROUP BY p.id, p.display_name
   ORDER BY COUNT(*) DESC, SUM(ac.price_paid) DESC
   LIMIT 1) as top_seller_this_month;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_amc_dashboard_summary_unique 
  ON public.amc_dashboard_summary (report_date);

-- Create additional index for queries
CREATE INDEX IF NOT EXISTS idx_amc_dashboard_summary_period 
  ON public.amc_dashboard_summary (report_date);

-- Function to refresh AMC dashboard summary
CREATE OR REPLACE FUNCTION public.refresh_amc_dashboard_summary()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY amc_dashboard_summary;
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION public.refresh_amc_dashboard_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_amc_dashboard_summary() TO authenticated;

-- --------------------------------------------------------------------------
-- Triggers
-- --------------------------------------------------------------------------

-- Updated_at trigger function (reuse existing if available)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_amc_contracts_updated_at ON public.amc_contracts;
CREATE TRIGGER update_amc_contracts_updated_at
  BEFORE UPDATE ON public.amc_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------------------------------
-- RLS Policies
-- --------------------------------------------------------------------------

ALTER TABLE public.amc_contracts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active AMCs
CREATE POLICY "AMC contracts read access" ON public.amc_contracts
  FOR SELECT USING (auth.role() = 'authenticated');

-- Office staff, super admin, and technicians can insert AMCs
CREATE POLICY "AMC contracts insert access" ON public.amc_contracts
  FOR INSERT WITH CHECK (
    get_my_role() IN ('office_staff', 'super_admin', 'technician')
  );

-- Only office staff and super_admin can update and cancel AMCs
CREATE POLICY "AMC contracts update access" ON public.amc_contracts
  FOR UPDATE USING (
    get_my_role() IN ('office_staff', 'super_admin')
  );

-- Technicians can view their own sold AMCs
CREATE POLICY "AMC contracts technician own access" ON public.amc_contracts
  FOR SELECT USING (
    get_my_role() = 'technician' AND sold_by = auth.uid()
  );

-- Notification logs RLS
ALTER TABLE public.amc_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AMC notification logs read access" ON public.amc_notification_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "AMC notification logs insert access" ON public.amc_notification_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- --------------------------------------------------------------------------
-- Permissions
-- --------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE ON public.amc_contracts TO authenticated;
GRANT SELECT ON public.amc_dashboard_summary TO authenticated;
GRANT SELECT, INSERT ON public.amc_notification_logs TO authenticated;

-- Grant execution permissions for functions
GRANT EXECUTE ON FUNCTION public.generate_amc_contract_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_amc_end_date(DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_active_amc_for_appliance(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_expiring_amcs(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_amc_notification_sent(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_amc_dashboard_summary() TO authenticated;

-- --------------------------------------------------------------------------
-- Initial dashboard refresh
-- --------------------------------------------------------------------------
SELECT refresh_amc_dashboard_summary();
