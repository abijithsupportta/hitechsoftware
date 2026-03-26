-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 030: Technician Commission and Performance Tracking System
--
-- Purpose: Create comprehensive commission tracking, earnings calculation,
-- and leaderboard system for technicians at Hi Tech Engineering.
--
-- Tables:
--   - technician_commission_config: Per-job commission settings
--   - technician_earnings_summary: Auto-calculated earnings per job
--   - technician_leaderboard: Materialized view for rankings
--
-- Features:
--   - Auto-calculation of extra price collected above MRP
--   - Commission tracking for service, parts, and extra price
--   - Variance deduction integration
--   - Daily/Weekly/Monthly leaderboard
--   - Role-based access control
-- ─────────────────────────────────────────────────────────────────────────────

-- Add extra_price_collected column to subject_accessories
ALTER TABLE subject_accessories 
ADD COLUMN IF NOT EXISTS extra_price_collected DECIMAL(12,2) DEFAULT 0.00;

-- Create trigger function to auto-calculate extra_price_collected
CREATE OR REPLACE FUNCTION calculate_extra_price_collected()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate extra price as quantity * (charged_price - mrp), minimum 0
  NEW.extra_price_collected = GREATEST(0, 
    NEW.quantity * (COALESCE(NEW.charged_price, NEW.mrp) - NEW.mrp)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subject_accessories
DROP TRIGGER IF EXISTS trigger_calculate_extra_price_collected ON subject_accessories;
CREATE TRIGGER trigger_calculate_extra_price_collected
  BEFORE INSERT OR UPDATE ON subject_accessories
  FOR EACH ROW EXECUTE FUNCTION calculate_extra_price_collected();

-- Function to calculate total extra collected for a subject
CREATE OR REPLACE FUNCTION calculate_subject_extra_collected(subject_uuid UUID)
RETURNS DECIMAL(12,2) AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(extra_price_collected) 
     FROM subject_accessories 
     WHERE subject_id = subject_uuid),
    0.00
  );
END;
$$ LANGUAGE plpgsql;

-- Technician commission configuration table
CREATE TABLE IF NOT EXISTS technician_commission_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  service_commission DECIMAL(12,2) DEFAULT 0.00,
  parts_commission DECIMAL(12,2) DEFAULT 0.00,
  extra_price_commission DECIMAL(12,2) DEFAULT 0.00,
  commission_notes TEXT,
  set_by UUID REFERENCES auth.users(id),
  set_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(technician_id, subject_id)
);

-- Create index for commission config
CREATE INDEX IF NOT EXISTS idx_technician_commission_config_technician 
  ON technician_commission_config(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_commission_config_subject 
  ON technician_commission_config(subject_id);

-- Technician earnings summary table
CREATE TABLE IF NOT EXISTS technician_earnings_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  service_commission DECIMAL(12,2) DEFAULT 0.00,
  parts_commission DECIMAL(12,2) DEFAULT 0.00,
  extra_price_commission DECIMAL(12,2) DEFAULT 0.00,
  extra_price_collected DECIMAL(12,2) DEFAULT 0.00,
  variance_deduction DECIMAL(12,2) DEFAULT 0.00,
  net_earnings DECIMAL(12,2) GENERATED ALWAYS AS (
    service_commission + parts_commission + extra_price_commission - variance_deduction
  ) STORED,
  total_bill_value DECIMAL(12,2) DEFAULT 0.00,
  parts_sold_value DECIMAL(12,2) DEFAULT 0.00,
  earnings_status TEXT DEFAULT 'pending' CHECK (earnings_status IN ('pending', 'confirmed')),
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(technician_id, subject_id)
);

-- Create indexes for earnings summary
CREATE INDEX IF NOT EXISTS idx_technician_earnings_summary_technician 
  ON technician_earnings_summary(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_earnings_summary_subject 
  ON technician_earnings_summary(subject_id);
CREATE INDEX IF NOT EXISTS idx_technician_earnings_summary_status 
  ON technician_earnings_summary(earnings_status);
CREATE INDEX IF NOT EXISTS idx_technician_earnings_summary_created_at 
  ON technician_earnings_summary(created_at);

-- Function to sync technician earnings for a subject
CREATE OR REPLACE FUNCTION sync_technician_earnings(subject_uuid UUID)
RETURNS VOID AS $$
DECLARE
  tech_record RECORD;
  commission_record RECORD;
  earnings_record RECORD;
  variance_amount DECIMAL(12,2) DEFAULT 0.00;
BEGIN
  -- Get technician and subject info
  SELECT s.assigned_technician_id, s.id as subject_id
  INTO tech_record
  FROM subjects s
  WHERE s.id = subject_uuid AND s.is_deleted = false;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subject not found or deleted: %', subject_uuid;
  END IF;
  
  IF tech_record.assigned_technician_id IS NULL THEN
    RAISE EXCEPTION 'No technician assigned to subject: %', subject_uuid;
  END IF;
  
  -- Get or create commission config (default zeros if not exists)
  INSERT INTO technician_commission_config (technician_id, subject_id, service_commission, parts_commission, extra_price_commission)
  VALUES (tech_record.assigned_technician_id, subject_uuid, 0.00, 0.00, 0.00)
  ON CONFLICT (technician_id, subject_id) DO NOTHING;
  
  -- Get commission config
  SELECT * INTO commission_record
  FROM technician_commission_config
  WHERE technician_id = tech_record.assigned_technician_id AND subject_id = subject_uuid;
  
  -- Calculate variance deduction from existing payout system
  SELECT COALESCE(SUM(amount), 0.00)
  INTO variance_amount
  FROM technician_service_payouts
  WHERE technician_id = tech_record.assigned_technician_id 
    AND subject_id = subject_uuid;
  
  -- Sync or create earnings summary
  INSERT INTO technician_earnings_summary (
    technician_id, 
    subject_id,
    service_commission,
    parts_commission,
    extra_price_commission,
    extra_price_collected,
    variance_deduction,
    total_bill_value,
    parts_sold_value,
    updated_at
  ) VALUES (
    tech_record.assigned_technician_id,
    subject_uuid,
    commission_record.service_commission,
    commission_record.parts_commission,
    commission_record.extra_price_commission,
    calculate_subject_extra_collected(subject_uuid),
    variance_amount,
    COALESCE((SELECT grand_total FROM subject_bills WHERE subject_id = subject_uuid), 0.00),
    COALESCE((SELECT SUM(line_total) FROM subject_accessories WHERE subject_id = subject_uuid), 0.00),
    NOW()
  )
  ON CONFLICT (technician_id, subject_id) 
  DO UPDATE SET
    service_commission = EXCLUDED.service_commission,
    parts_commission = EXCLUDED.parts_commission,
    extra_price_commission = EXCLUDED.extra_price_commission,
    extra_price_collected = EXCLUDED.extra_price_collected,
    variance_deduction = EXCLUDED.variance_deduction,
    total_bill_value = EXCLUDED.total_bill_value,
    parts_sold_value = EXCLUDED.parts_sold_value,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create technician leaderboard materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS technician_leaderboard AS
WITH daily_leaderboard AS (
  SELECT 
    t.id as technician_id,
    t.display_name as technician_name,
    'daily' as period_type,
    TO_CHAR(NOW(), 'DD Mon') as period_label,
    COUNT(DISTINCT s.id) as services_completed,
    COALESCE(SUM(es.total_bill_value), 0) as total_bill_generated,
    COALESCE(SUM(es.parts_sold_value), 0) as parts_sold_value,
    COALESCE(SUM(es.extra_price_collected), 0) as extra_collected,
    COALESCE(SUM(es.service_commission), 0) as service_commission,
    COALESCE(SUM(es.parts_commission), 0) as parts_commission,
    COALESCE(SUM(es.extra_price_commission), 0) as extra_commission,
    COALESCE(SUM(es.variance_deduction), 0) as variance_deduction,
    COALESCE(SUM(es.net_earnings), 0) as net_earnings
  FROM profiles t
  LEFT JOIN technician_earnings_summary es ON t.id = es.technician_id
    AND DATE(es.created_at) = CURRENT_DATE
  LEFT JOIN subjects s ON es.subject_id = s.id AND s.status = 'COMPLETED'
  WHERE t.role = 'technician' AND t.is_deleted = false
  GROUP BY t.id, t.display_name
),
weekly_leaderboard AS (
  SELECT 
    t.id as technician_id,
    t.display_name as technician_name,
    'weekly' as period_type,
    'Week ' || TO_CHAR(NOW(), 'WW') as period_label,
    COUNT(DISTINCT s.id) as services_completed,
    COALESCE(SUM(es.total_bill_value), 0) as total_bill_generated,
    COALESCE(SUM(es.parts_sold_value), 0) as parts_sold_value,
    COALESCE(SUM(es.extra_price_collected), 0) as extra_collected,
    COALESCE(SUM(es.service_commission), 0) as service_commission,
    COALESCE(SUM(es.parts_commission), 0) as parts_commission,
    COALESCE(SUM(es.extra_price_commission), 0) as extra_commission,
    COALESCE(SUM(es.variance_deduction), 0) as variance_deduction,
    COALESCE(SUM(es.net_earnings), 0) as net_earnings
  FROM profiles t
  LEFT JOIN technician_earnings_summary es ON t.id = es.technician_id
    AND DATE_TRUNC('week', es.created_at) = DATE_TRUNC('week', NOW())
  LEFT JOIN subjects s ON es.subject_id = s.id AND s.status = 'COMPLETED'
  WHERE t.role = 'technician' AND t.is_deleted = false
  GROUP BY t.id, t.display_name
),
monthly_leaderboard AS (
  SELECT 
    t.id as technician_id,
    t.display_name as technician_name,
    'monthly' as period_type,
    TO_CHAR(NOW(), 'Month YYYY') as period_label,
    COUNT(DISTINCT s.id) as services_completed,
    COALESCE(SUM(es.total_bill_value), 0) as total_bill_generated,
    COALESCE(SUM(es.parts_sold_value), 0) as parts_sold_value,
    COALESCE(SUM(es.extra_price_collected), 0) as extra_collected,
    COALESCE(SUM(es.service_commission), 0) as service_commission,
    COALESCE(SUM(es.parts_commission), 0) as parts_commission,
    COALESCE(SUM(es.extra_price_commission), 0) as extra_commission,
    COALESCE(SUM(es.variance_deduction), 0) as variance_deduction,
    COALESCE(SUM(es.net_earnings), 0) as net_earnings
  FROM profiles t
  LEFT JOIN technician_earnings_summary es ON t.id = es.technician_id
    AND DATE_TRUNC('month', es.created_at) = DATE_TRUNC('month', NOW())
  LEFT JOIN subjects s ON es.subject_id = s.id AND s.status = 'COMPLETED'
  WHERE t.role = 'technician' AND t.is_deleted = false
  GROUP BY t.id, t.display_name
)
SELECT * FROM daily_leaderboard
UNION ALL
SELECT * FROM weekly_leaderboard
UNION ALL
SELECT * FROM monthly_leaderboard;

-- Create unique index on leaderboard for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_technician_leaderboard_unique 
  ON technician_leaderboard(technician_id, period_type, period_label);

-- Create additional index for queries
CREATE INDEX IF NOT EXISTS idx_technician_leaderboard_period 
  ON technician_leaderboard(period_type, period_label);

-- Function to refresh leaderboard
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY technician_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for commission_config
ALTER TABLE technician_commission_config ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read commission configs
CREATE POLICY "Commission config read access" ON technician_commission_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only office_staff and super_admin can insert/update commission configs
CREATE POLICY "Commission config write access" ON technician_commission_config
  FOR INSERT WITH CHECK (get_my_role() IN ('office_staff', 'super_admin'));

CREATE POLICY "Commission config update access" ON technician_commission_config
  FOR UPDATE USING (get_my_role() IN ('office_staff', 'super_admin'));

-- RLS Policies for earnings_summary
ALTER TABLE technician_earnings_summary ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read earnings summaries
CREATE POLICY "Earnings summary read access" ON technician_earnings_summary
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only system functions can insert/update earnings summaries (no direct user access)
CREATE POLICY "Earnings summary system access" ON technician_earnings_summary
  FOR ALL USING (false);

-- Note: Materialized views do not support RLS policies
-- Access to leaderboard is controlled via GRANT permissions only

-- Create updated_at trigger function for commission tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_technician_commission_config_updated_at
  BEFORE UPDATE ON technician_commission_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_technician_earnings_summary_updated_at
  BEFORE UPDATE ON technician_earnings_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON technician_commission_config TO authenticated;
GRANT SELECT ON technician_earnings_summary TO authenticated;
GRANT SELECT ON technician_leaderboard TO authenticated;

-- Grant execution permissions for functions
GRANT EXECUTE ON FUNCTION calculate_subject_extra_collected TO authenticated;
GRANT EXECUTE ON FUNCTION sync_technician_earnings TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_leaderboard TO authenticated;

-- Create initial leaderboard data
SELECT refresh_leaderboard();
