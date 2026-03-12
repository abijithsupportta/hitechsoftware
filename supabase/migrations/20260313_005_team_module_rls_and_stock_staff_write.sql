-- ============================================================================
-- Team module + role scope alignment
-- Migration: 20260313_005_team_module_rls_and_stock_staff_write.sql
-- ============================================================================

-- 1) TECHNICIANS table RLS policies (table already has RLS enabled)
DROP POLICY IF EXISTS technicians_super_admin_all ON technicians;
DROP POLICY IF EXISTS technicians_staff_read ON technicians;
DROP POLICY IF EXISTS technicians_self_read ON technicians;
DROP POLICY IF EXISTS technicians_self_update ON technicians;

CREATE POLICY technicians_super_admin_all ON technicians
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY technicians_staff_read ON technicians
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'office_staff')
  );

CREATE POLICY technicians_self_read ON technicians
  FOR SELECT USING (id = auth.uid());

CREATE POLICY technicians_self_update ON technicians
  FOR UPDATE USING (id = auth.uid());

-- 2) Inventory permissions: office staff can manage stock operations too
DROP POLICY IF EXISTS inventory_staff_read ON inventory;
CREATE POLICY inventory_staff_all ON inventory
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'office_staff')
  );

-- 3) Stock permissions: office staff can create/edit stock
DROP POLICY IF EXISTS stock_staff_read ON stock;
CREATE POLICY stock_staff_all ON stock
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'office_staff')
  );
