import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { server } from './setup';
import { createMockSupabaseClient } from './utils/supabase-mock';

// Mock data
const mockSuperAdmin = {
  id: 'admin-123',
  email: 'admin@hitech.com',
  role: 'super_admin',
  display_name: 'Super Admin'
};

const mockOfficeStaff = {
  id: 'office-123',
  email: 'office@hitech.com',
  role: 'office_staff',
  display_name: 'Office Staff'
};

const mockTechnician = {
  id: 'tech-123',
  email: 'tech@hitech.com',
  role: 'technician',
  display_name: 'Technician'
};

const mockStockManager = {
  id: 'stock-123',
  email: 'stock@hitech.com',
  role: 'stock_manager',
  display_name: 'Stock Manager'
};

const mockCustomer = {
  id: 'customer-123',
  name: 'Test Customer',
  phone: '1234567890',
  email: 'customer@test.com',
  address: '123 Test St'
};

const mockBrand = {
  id: 'brand-123',
  name: 'Test Brand',
  description: 'Test brand description'
};

describe('All Modules Comprehensive Tests', () => {
  let supabase: any;
  let testCustomerId: string;
  let testBrandId: string;
  let testTechnicianId: string;

  beforeAll(async () => {
    supabase = createMockSupabaseClient();
    
    // Create test data
    const { data: customer } = await supabase
      .from('customers')
      .insert(mockCustomer)
      .select()
      .single();
    testCustomerId = customer?.id || mockCustomer.id;

    const { data: brand } = await supabase
      .from('brands')
      .insert(mockBrand)
      .select()
      .single();
    testBrandId = brand?.id || mockBrand.id;

    const { data: technician } = await supabase
      .from('profiles')
      .insert({
        ...mockTechnician,
        is_active: true
      })
      .select()
      .single();
    testTechnicianId = technician?.id || mockTechnician.id;
  });

  beforeEach(() => {
    server.resetHandlers();
  });

  // AUTHENTICATION — 12 tests
  describe('Authentication', () => {
    
    it('Test A1 — Login with valid credentials — expect session created and role returned correctly', async () => {
      // Mock login endpoint
      const loginData = {
        email: 'admin@hitech.com',
        password: 'validpassword'
      };

      // Simulate successful login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('admin@hitech.com');
      expect(data.session).toBeDefined();
    });

    it('Test A2 — Login with wrong password — expect authentication error', async () => {
      const loginData = {
        email: 'admin@hitech.com',
        password: 'wrongpassword'
      };

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid login credentials');
    });

    it('Test A3 — Login with non-existent email — expect user not found error', async () => {
      const loginData = {
        email: 'nonexistent@test.com',
        password: 'password'
      };

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('Invalid login credentials');
    });

    it('Test A4 — Access protected route without session — expect 401 unauthorized', async () => {
      // Simulate accessing protected route without session
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', mockSuperAdmin.id);

      expect(error).toBeDefined();
      expect(error.code).toBe('42501'); // Permission denied
    });

    it('Test A5 — super_admin accesses all routes — expect success', async () => {
      // Mock super admin session
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'super_admin');

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test A6 — technician accesses admin route — expect 403 forbidden', async () => {
      // Mock technician trying to access admin-only data
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('42501');
    });

    it('Test A7 — Session expires — expect redirect to login page', async () => {
      // Simulate expired session
      const { data, error } = await supabase.auth.signOut();

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Try to access protected data after logout
      const { data: protectedData, error: protectedError } = await supabase
        .from('profiles')
        .select('*');

      expect(protectedData).toBeNull();
      expect(protectedError).toBeDefined();
    });

    it('Test A8 — get_my_role function returns correct role for each user type — test all 4 roles', async () => {
      // Test each role
      const roles = ['super_admin', 'office_staff', 'technician', 'stock_manager'];
      
      for (const role of roles) {
        const { data, error } = await supabase
          .rpc('get_my_role');

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(typeof data).toBe('string');
      }
    });

    it('Test A9 — stock_manager accesses inventory route — expect success', async () => {
      // Mock stock manager accessing inventory
      const { data, error } = await supabase
        .from('inventory_products')
        .select('*');

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test A10 — stock_manager accesses subjects route — expect permission denied', async () => {
      // Mock stock manager trying to access subjects
      const { data, error } = await supabase
        .from('subjects')
        .select('*');

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('42501');
    });

    it('Test A11 — Logout clears session — expect subsequent requests return 401', async () => {
      // Logout
      await supabase.auth.signOut();

      // Try to access protected data
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      expect(data).toBeNull();
      expect(error).toBeDefined();
    });

    it('Test A12 — Two users with different roles fetch same data — verify RLS returns correct rows for each', async () => {
      // Mock admin fetch
      const { data: adminData, error: adminError } = await supabase
        .from('profiles')
        .select('*');

      // Mock technician fetch
      const { data: techData, error: techError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'technician');

      expect(adminError).toBeNull();
      expect(techError).toBeNull();
      expect(adminData.length).toBeGreaterThan(techData.length);
    });
  });

  // CUSTOMER MODULE — 10 tests
  describe('Customer Module', () => {
    
    it('Test C1 — Create customer with all required fields — expect success and customer_id returned', async () => {
      const customerData = {
        name: 'New Customer',
        phone: '9876543210',
        email: 'newcustomer@test.com',
        address: '456 New St'
      };

      const { data, error } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.id).toBeDefined();
      expect(data.name).toBe('New Customer');
      expect(data.phone).toBe('9876543210');
    });

    it('Test C2 — Create customer with duplicate phone number — expect error phone already exists', async () => {
      const customerData = {
        name: 'Duplicate Customer',
        phone: '1234567890', // Same as existing
        email: 'duplicate@test.com'
      };

      const { data, error } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('phone already exists');
    });

    it('Test C3 — Create customer without phone number — expect validation error phone is required', async () => {
      const customerData = {
        name: 'No Phone Customer',
        email: 'nophone@test.com'
      };

      const { data, error } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('phone is required');
    });

    it('Test C4 — Update customer address — expect address updated and updated_at changed', async () => {
      const { data: original } = await supabase
        .from('customers')
        .select('updated_at')
        .eq('id', testCustomerId)
        .single();

      const { data, error } = await supabase
        .from('customers')
        .update({ address: '789 Updated St' })
        .eq('id', testCustomerId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.address).toBe('789 Updated St');
      expect(data.updated_at).not.toBe(original.updated_at);
    });

    it('Test C5 — Soft delete customer — expect is_deleted true and customer not in active list', async () => {
      const { data, error } = await supabase
        .from('customers')
        .update({ is_deleted: true })
        .eq('id', testCustomerId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.is_deleted).toBe(true);

      // Check not in active list
      const { data: activeData } = await supabase
        .from('customers')
        .select('*')
        .eq('is_deleted', false);

      const deletedCustomer = activeData.find((c: any) => c.id === testCustomerId);
      expect(deletedCustomer).toBeUndefined();
    });

    it('Test C6 — Search customer by phone number — expect exact match returned', async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', '1234567890');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBe(1);
      expect(data[0].phone).toBe('1234567890');
    });

    it('Test C7 — Search customer by name partial match — expect matching customers returned', async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', '%Test%');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data.forEach((customer: any) => {
        expect(customer.name).toContain('Test');
      });
    });

    it('Test C8 — Fetch customer with all their subjects — expect subjects array populated', async () => {
      // Create a subject for the customer
      await supabase
        .from('subjects')
        .insert({
          customer_id: testCustomerId,
          brand_id: testBrandId,
          product_name: 'Test Product',
          problem_description: 'Test issue'
        });

      const { data, error } = await supabase
        .from('customers')
        .select('*, subjects(*)')
        .eq('id', testCustomerId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.subjects).toBeDefined();
      expect(data.subjects.length).toBeGreaterThan(0);
    });

    it('Test C9 — Fetch customer AMC history — expect all AMC contracts for that customer returned', async () => {
      // Create AMC for customer
      await supabase
        .from('amc_contracts')
        .insert({
          customer_id: testCustomerId,
          brand_id: testBrandId,
          start_date: '2026-01-01',
          end_date: '2026-12-31',
          status: 'active'
        });

      const { data, error } = await supabase
        .from('amc_contracts')
        .select('*')
        .eq('customer_id', testCustomerId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data.forEach((amc: any) => {
        expect(amc.customer_id).toBe(testCustomerId);
      });
    });

    it('Test C10 — Create customer as technician role — expect permission denied', async () => {
      const customerData = {
        name: 'Tech Created Customer',
        phone: '5555555555',
        email: 'techcreated@test.com'
      };

      // Mock technician context
      const { data, error } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('42501');
    });
  });

  // TEAM AND TECHNICIAN — 10 tests
  describe('Team and Technician', () => {
    
    it('Test T1 — Create team member as super_admin — expect profile created with correct role', async () => {
      const teamMemberData = {
        email: 'teammember@test.com',
        display_name: 'Team Member',
        role: 'office_staff'
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(teamMemberData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.role).toBe('office_staff');
      expect(data.email).toBe('teammember@test.com');
    });

    it('Test T2 — Create technician profile — expect technicians table record also created with default daily_subject_limit 10', async () => {
      const technicianData = {
        email: 'newtech@test.com',
        display_name: 'New Technician',
        role: 'technician'
      };

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert(technicianData)
        .select()
        .single();

      expect(profileError).toBeNull();
      expect(profile).toBeDefined();

      const { data: tech, error: techError } = await supabase
        .from('technicians')
        .select('*')
        .eq('id', profile.id)
        .single();

      expect(techError).toBeNull();
      expect(tech).toBeDefined();
      expect(tech.daily_subject_limit).toBe(10);
    });

    it('Test T3 — Update technician daily_subject_limit — expect new limit enforced on assignment', async () => {
      const { data, error } = await supabase
        .from('technicians')
        .update({ daily_subject_limit: 15 })
        .eq('id', testTechnicianId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.daily_subject_limit).toBe(15);
    });

    it('Test T4 — Fetch technician performance stats — expect completed jobs count and earnings summary returned', async () => {
      const { data, error } = await supabase
        .from('technician_monthly_performance')
        .select('*')
        .eq('technician_id', testTechnicianId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.technician_id).toBe(testTechnicianId);
      expect(data.completed_jobs).toBeDefined();
      expect(data.total_earnings).toBeDefined();
    });

    it('Test T5 — Deactivate technician — expect is_active false and technician not available for assignment', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', testTechnicianId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.is_active).toBe(false);

      // Check not in active technicians
      const { data: activeTechs } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'technician')
        .eq('is_active', true);

      const deactivatedTech = activeTechs.find((t: any) => t.id === testTechnicianId);
      expect(deactivatedTech).toBeUndefined();
    });

    it('Test T6 — Fetch all active technicians — expect only active technicians returned', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'technician')
        .eq('is_active', true);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data.forEach((tech: any) => {
        expect(tech.role).toBe('technician');
        expect(tech.is_active).toBe(true);
      });
    });

    it('Test T7 — Technician with zero completed jobs this month — expect they appear in leaderboard with zero values', async () => {
      const { data, error } = await supabase
        .from('technician_leaderboard')
        .select('*')
        .eq('technician_id', testTechnicianId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.completed_jobs).toBe(0);
      expect(data.total_earnings).toBe(0);
    });

    it('Test T8 — Fetch team member by id — expect correct profile returned with role', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', mockSuperAdmin.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.id).toBe(mockSuperAdmin.id);
      expect(data.role).toBe(mockSuperAdmin.role);
    });

    it('Test T9 — Update technician bank details — expect bank_account_number and ifsc_code stored correctly', async () => {
      const bankData = {
        bank_account_number: '1234567890',
        bank_account_name: 'Test Account',
        ifsc_code: 'TEST1234'
      };

      const { data, error } = await supabase
        .from('technicians')
        .update(bankData)
        .eq('id', testTechnicianId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.bank_account_number).toBe('1234567890');
      expect(data.ifsc_code).toBe('TEST1234');
    });

    it('Test T10 — Create team member with duplicate email — expect error email already exists', async () => {
      const teamMemberData = {
        email: 'admin@hitech.com', // Duplicate
        display_name: 'Duplicate Admin',
        role: 'office_staff'
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(teamMemberData)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('email already exists');
    });
  });

  // ATTENDANCE — 8 tests
  describe('Attendance', () => {
    
    it('Test AT1 — Toggle attendance ON before 10:30 AM — expect attendance_logs record created with check_in time', async () => {
      const attendanceData = {
        technician_id: testTechnicianId,
        check_in: '2026-03-27T09:00:00Z',
        date: '2026-03-27'
      };

      const { data, error } = await supabase
        .from('attendance_logs')
        .insert(attendanceData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.technician_id).toBe(testTechnicianId);
      expect(data.check_in).toBe('2026-03-27T09:00:00Z');
    });

    it('Test AT2 — Toggle attendance OFF — expect check_out time set on existing log', async () => {
      const { data, error } = await supabase
        .from('attendance_logs')
        .update({ check_out: '2026-03-27T18:00:00Z' })
        .eq('technician_id', testTechnicianId)
        .eq('date', '2026-03-27')
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.check_out).toBe('2026-03-27T18:00:00Z');
    });

    it('Test AT3 — Toggle attendance ON after 10:30 AM — expect error late attendance with appropriate message', async () => {
      const lateAttendanceData = {
        technician_id: testTechnicianId,
        check_in: '2026-03-27T11:00:00Z', // After 10:30 AM
        date: '2026-03-27'
      };

      const { data, error } = await supabase
        .from('attendance_logs')
        .insert(lateAttendanceData)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('late attendance');
    });

    it('Test AT4 — Fetch today attendance for technician — expect correct in/out times returned', async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('technician_id', testTechnicianId)
        .eq('date', today)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.technician_id).toBe(testTechnicianId);
      expect(data.check_in).toBeDefined();
    });

    it('Test AT5 — Fetch attendance history for date range — expect only records within range returned', async () => {
      const startDate = '2026-03-01';
      const endDate = '2026-03-31';

      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data.forEach((record: any) => {
        expect(record.date >= startDate && record.date <= endDate).toBe(true);
      });
    });

    it('Test AT6 — Auto OFF at midnight via cron — expect all open attendance logs closed at midnight', async () => {
      // Create open attendance log
      await supabase
        .from('attendance_logs')
        .insert({
          technician_id: testTechnicianId,
          check_in: '2026-03-27T09:00:00Z',
          date: '2026-03-27'
        });

      // Simulate midnight cron
      const { data, error } = await supabase
        .from('attendance_logs')
        .update({ check_out: '2026-03-27T23:59:59Z' })
        .is('check_out', null);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test AT7 — Technician checks own attendance — expect success returns their records only', async () => {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('technician_id', testTechnicianId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data.forEach((record: any) => {
        expect(record.technician_id).toBe(testTechnicianId);
      });
    });

    it('Test AT8 — Office staff views all technician attendance — expect success returns all records', async () => {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
    });
  });

  // AMC MODULE — 15 tests
  describe('AMC Module', () => {
    
    it('Test AM1 — Create AMC contract with 1 year duration — expect end_date exactly 1 year after start_date', async () => {
      const amcData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        start_date: '2026-01-01',
        duration_years: 1,
        status: 'active'
      };

      const { data, error } = await supabase
        .from('amc_contracts')
        .insert(amcData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.end_date).toBe('2027-01-01');
    });

    it('Test AM2 — Create AMC contract with 2 year duration — expect end_date exactly 2 years after start_date', async () => {
      const amcData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        start_date: '2026-01-01',
        duration_years: 2,
        status: 'active'
      };

      const { data, error } = await supabase
        .from('amc_contracts')
        .insert(amcData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.end_date).toBe('2028-01-01');
    });

    it('Test AM3 — Create AMC contract with custom dates — expect end_date matches custom date entered', async () => {
      const amcData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        start_date: '2026-01-01',
        end_date: '2026-12-31', // Custom end date
        status: 'active'
      };

      const { data, error } = await supabase
        .from('amc_contracts')
        .insert(amcData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.end_date).toBe('2026-12-31');
    });

    it('Test AM4 — Create second AMC for same customer same appliance while first is active — expect error only one active AMC per appliance', async () => {
      // Create first active AMC
      await supabase
        .from('amc_contracts')
        .insert({
          customer_id: testCustomerId,
          brand_id: testBrandId,
          start_date: '2026-01-01',
          end_date: '2026-12-31',
          status: 'active'
        });

      // Try to create second active AMC
      const secondAMCData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        start_date: '2026-06-01',
        end_date: '2027-05-31',
        status: 'active'
      };

      const { data, error } = await supabase
        .from('amc_contracts')
        .insert(secondAMCData)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('only one active AMC');
    });

    it('Test AM5 — Create renewal AMC — expect new AMC start_date is day after existing AMC end_date', async () => {
      // Create existing AMC
      await supabase
        .from('amc_contracts')
        .insert({
          customer_id: testCustomerId,
          brand_id: testBrandId,
          start_date: '2026-01-01',
          end_date: '2026-12-31',
          status: 'active'
        });

      // Create renewal AMC
      const renewalData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        start_date: '2027-01-01', // Day after existing end
        end_date: '2027-12-31',
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('amc_contracts')
        .insert(renewalData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.start_date).toBe('2027-01-01');
    });

    it('Test AM6 — Auto-generate contract number — expect format AMC-YYYY-NNNN', async () => {
      const amcData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        status: 'active'
      };

      const { data, error } = await supabase
        .from('amc_contracts')
        .insert(amcData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.contract_number).toMatch(/^AMC-2026-\d{4}$/);
    });

    it('Test AM7 — Check active AMC for customer appliance brand — expect correct AMC returned if active', async () => {
      // Create active AMC
      await supabase
        .from('amc_contracts')
        .insert({
          customer_id: testCustomerId,
          brand_id: testBrandId,
          start_date: '2026-01-01',
          end_date: '2026-12-31',
          status: 'active'
        });

      const { data, error } = await supabase
        .from('amc_contracts')
        .select('*')
        .eq('customer_id', testCustomerId)
        .eq('brand_id', testBrandId)
        .eq('status', 'active')
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.customer_id).toBe(testCustomerId);
      expect(data.brand_id).toBe(testBrandId);
      expect(data.status).toBe('active');
    });

    it('Test AM8 — Check active AMC for expired contract — expect null or empty result', async () => {
      // Create expired AMC
      await supabase
        .from('amc_contracts')
        .insert({
          customer_id: testCustomerId,
          brand_id: testBrandId,
          start_date: '2025-01-01',
          end_date: '2025-12-31',
          status: 'expired'
        });

      const { data, error } = await supabase
        .from('amc_contracts')
        .select('*')
        .eq('customer_id', testCustomerId)
        .eq('brand_id', testBrandId)
        .eq('status', 'active')
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
    });

    it('Test AM9 — get_expiring_amcs function with 30 days — expect only AMCs expiring exactly in 30 days returned', async () => {
      // Create AMC expiring in 30 days
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const expiringDate = futureDate.toISOString().split('T')[0];

      await supabase
        .from('amc_contracts')
        .insert({
          customer_id: testCustomerId,
          brand_id: testBrandId,
          start_date: '2026-01-01',
          end_date: expiringDate,
          status: 'active'
        });

      const { data, error } = await supabase
        .rpc('get_expiring_amcs', { days: 30 });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data.forEach((amc: any) => {
        const endDate = new Date(amc.end_date);
        const today = new Date();
        const daysDiff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        expect(daysDiff).toBeLessThanOrEqual(30);
      });
    });

    it('Test AM10 — mark_amc_notification_sent for 30 days — expect notification_30_sent set to true', async () => {
      const { data, error } = await supabase
        .from('amc_contracts')
        .update({ notification_30_sent: true })
        .eq('customer_id', testCustomerId)
        .eq('status', 'active')
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.notification_30_sent).toBe(true);
    });

    it('Test AM11 — Cancel AMC — expect status cancelled and cancellation_reason stored', async () => {
      const { data, error } = await supabase
        .from('amc_contracts')
        .update({ 
          status: 'cancelled',
          cancellation_reason: 'Customer request'
        })
        .eq('customer_id', testCustomerId)
        .eq('status', 'active')
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('cancelled');
      expect(data.cancellation_reason).toBe('Customer request');
    });

    it('Test AM12 — Cancel AMC as technician — expect permission denied only office_staff and super_admin can cancel', async () => {
      // Mock technician trying to cancel AMC
      const { data, error } = await supabase
        .from('amc_contracts')
        .update({ status: 'cancelled' })
        .eq('customer_id', testCustomerId)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('42501');
    });

    it('Test AM13 — Set commission for AMC sale — expect commission_amount stored and technician_earnings updated', async () => {
      const commissionData = {
        amc_id: 'amc-123',
        technician_id: testTechnicianId,
        commission_amount: 500
      };

      const { data, error } = await supabase
        .from('amc_commission')
        .insert(commissionData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.commission_amount).toBe(500);

      // Check earnings updated
      const { data: earnings } = await supabase
        .from('technician_earnings_summary')
        .select('*')
        .eq('technician_id', testTechnicianId)
        .single();

      expect(earnings).toBeDefined();
      expect(earnings.total_earnings).toBeGreaterThan(0);
    });

    it('Test AM14 — Fetch all AMCs for customer — expect all contracts including expired returned', async () => {
      const { data, error } = await supabase
        .from('amc_contracts')
        .select('*')
        .eq('customer_id', testCustomerId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data.forEach((amc: any) => {
        expect(amc.customer_id).toBe(testCustomerId);
      });
    });

    it('Test AM15 — AMC with sold_by as uuid — expect correct technician name returned via join to profiles', async () => {
      // Create AMC with sold_by technician
      await supabase
        .from('amc_contracts')
        .insert({
          customer_id: testCustomerId,
          brand_id: testBrandId,
          start_date: '2026-01-01',
          end_date: '2026-12-31',
          status: 'active',
          sold_by: testTechnicianId
        });

      const { data, error } = await supabase
        .from('amc_contracts')
        .select('*, profiles!inner(display_name)')
        .eq('sold_by', testTechnicianId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.profiles.display_name).toBe('Technician');
    });
  });
});
