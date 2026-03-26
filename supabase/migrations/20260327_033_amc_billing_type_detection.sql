-- ============================================================================
-- AMC Billing Type Detection Update
-- Migration: 20260327_033_amc_billing_type_detection.sql
-- ============================================================================

-- --------------------------------------------------------------------------
-- Update get_subject_billing_type function to include AMC checks
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_subject_billing_type(p_subject_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_active_warranty BOOLEAN := false;
  has_active_contract BOOLEAN := false;
  has_active_amc BOOLEAN := false;
BEGIN
  -- Check active warranty
  SELECT COALESCE(s.warranty_end_date >= CURRENT_DATE, false)
  INTO has_active_warranty
  FROM public.subjects s
  WHERE s.id = p_subject_id
    AND s.is_deleted = false
  LIMIT 1;

  -- Check active subject contracts
  SELECT EXISTS (
    SELECT 1
    FROM public.subject_contracts sc
    WHERE sc.subject_id = p_subject_id
      AND sc.start_date <= CURRENT_DATE
      AND sc.end_date >= CURRENT_DATE
  )
  INTO has_active_contract;

  -- Check active AMC contracts
  SELECT EXISTS (
    SELECT 1
    FROM public.amc_contracts ac
    WHERE ac.subject_id = p_subject_id
      AND ac.status = 'active'
      AND ac.start_date <= CURRENT_DATE
      AND ac.end_date >= CURRENT_DATE
  )
  INTO has_active_amc;

  IF has_active_warranty OR has_active_contract OR has_active_amc THEN
    RETURN 'brand_dealer';
  END IF;

  RETURN 'customer';
END;
$$;

-- --------------------------------------------------------------------------
-- Create function to check AMC billing type for customer and appliance
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_amc_billing_type_for_appliance(
  p_customer_id UUID,
  p_appliance_category_id UUID,
  p_appliance_brand TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_active_amc BOOLEAN := false;
BEGIN
  -- Check active AMC for this customer and appliance
  SELECT EXISTS (
    SELECT 1
    FROM public.amc_contracts ac
    WHERE ac.customer_id = p_customer_id
      AND ac.appliance_category_id = p_appliance_category_id
      AND ac.appliance_brand = p_appliance_brand
      AND ac.status = 'active'
      AND ac.start_date <= CURRENT_DATE
      AND ac.end_date >= CURRENT_DATE
  )
  INTO has_active_amc;

  IF has_active_amc THEN
    RETURN 'brand_dealer';
  END IF;

  RETURN 'customer';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_subject_billing_type(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_amc_billing_type_for_appliance(UUID, UUID, TEXT) TO authenticated;
