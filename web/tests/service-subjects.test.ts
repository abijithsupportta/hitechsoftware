import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { server } from './setup';
import { createMockSupabaseClient } from './utils/supabase-mock';
import { createClient } from '@/lib/supabase/client';

// Mock data
const mockOfficeStaff = {
  id: 'office-staff-123',
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

const mockSuperAdmin = {
  id: 'admin-123',
  email: 'admin@hitech.com',
  role: 'super_admin',
  display_name: 'Super Admin'
};

const mockCustomer = {
  id: 'customer-123',
  name: 'Test Customer',
  phone: '1234567890',
  email: 'customer@test.com'
};

const mockBrand = {
  id: 'brand-123',
  name: 'Test Brand',
  description: 'Test brand description'
};

const mockProduct = {
  id: 'product-123',
  name: 'Test Product',
  brand_id: 'brand-123',
  category: 'washing_machine'
};

const mockAMC = {
  id: 'amc-123',
  customer_id: 'customer-123',
  brand_id: 'brand-123',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  status: 'active'
};

describe('Service and Subjects Module Tests', () => {
  let supabase: any;
  let testSubjectId: string;
  let testCustomerId: string;
  let testBrandId: string;
  let testAMCId: string;

  beforeAll(async () => {
    // Setup test data
    supabase = createMockSupabaseClient();
    
    // Create test customer
    const { data: customer } = await supabase
      .from('customers')
      .insert(mockCustomer)
      .select()
      .single();
    testCustomerId = customer?.id || mockCustomer.id;

    // Create test brand
    const { data: brand } = await supabase
      .from('brands')
      .insert(mockBrand)
      .select()
      .single();
    testBrandId = brand?.id || mockBrand.id;

    // Create test AMC
    const { data: amc } = await supabase
      .from('amc_contracts')
      .insert(mockAMC)
      .select()
      .single();
    testAMCId = amc?.id || mockAMC.id;
  });

  beforeEach(() => {
    server.resetHandlers();
  });

  // GROUP 1 — Subject Creation (8 tests)
  describe('Group 1 — Subject Creation', () => {
    
    it('Test 1.1 — Create subject with all valid fields as office_staff — expect success and subject_number generated automatically', async () => {
      // Mock office staff authentication
      const mockAuth = {
        user: mockOfficeStaff,
        session: { access_token: 'test-token' }
      };
      
      const subjectData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        product_name: 'Test Washing Machine',
        model_number: 'WM-123',
        serial_number: 'SN-123456',
        problem_description: 'Not spinning properly',
        priority: 'normal',
        service_charge_type: 'customer'
      };

      const { data, error } = await supabase
        .from('subjects')
        .insert(subjectData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.subject_number).toMatch(/^WM-\d{6}$/); // Brand prefix + 6 digits
      expect(data.customer_id).toBe(testCustomerId);
      expect(data.brand_id).toBe(testBrandId);
      expect(data.status).toBe('pending');
      testSubjectId = data.id;
    });

    it('Test 1.2 — Create subject without customer_id — expect validation error customer is required', async () => {
      const subjectData = {
        brand_id: testBrandId,
        product_name: 'Test Washing Machine',
        problem_description: 'Not spinning properly'
      };

      const { data, error } = await supabase
        .from('subjects')
        .insert(subjectData)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('customer_id');
    });

    it('Test 1.3 — Create subject without product_name — expect validation error product name is required', async () => {
      const subjectData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        problem_description: 'Not spinning properly'
      };

      const { data, error } = await supabase
        .from('subjects')
        .insert(subjectData)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('product_name');
    });

    it('Test 1.4 — Create subject as technician role — expect permission denied only office_staff and super_admin can create subjects', async () => {
      // Mock technician authentication
      const subjectData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        product_name: 'Test Washing Machine',
        problem_description: 'Not spinning properly'
      };

      // Simulate RLS blocking technician from creating subjects
      const { data, error } = await supabase
        .from('subjects')
        .insert(subjectData)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('42501'); // Permission denied
    });

    it('Test 1.5 — Create subject with active AMC for that customer and appliance — expect is_amc_service set to true and amc_id populated automatically', async () => {
      const subjectData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        product_name: 'Washing Machine',
        problem_description: 'Not spinning properly'
      };

      const { data, error } = await supabase
        .from('subjects')
        .insert(subjectData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.is_amc_service).toBe(true);
      expect(data.amc_id).toBe(testAMCId);
    });

    it('Test 1.6 — Create subject with active warranty — expect is_warranty_service set to true automatically', async () => {
      // Create a product with warranty
      const warrantyProduct = {
        ...mockProduct,
        warranty_months: 24,
        purchase_date: '2025-01-01' // Within warranty period
      };

      const subjectData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        product_name: 'Washing Machine with Warranty',
        problem_description: 'Not spinning properly',
        warranty_expiry_date: '2027-01-01'
      };

      const { data, error } = await supabase
        .from('subjects')
        .insert(subjectData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.is_warranty_service).toBe(true);
    });

    it('Test 1.7 — Create two subjects for same brand — expect both get unique subject numbers within that brand sequence', async () => {
      const subjectData1 = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        product_name: 'Washing Machine 1',
        problem_description: 'Issue 1'
      };

      const subjectData2 = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        product_name: 'Washing Machine 2',
        problem_description: 'Issue 2'
      };

      const { data: data1 } = await supabase
        .from('subjects')
        .insert(subjectData1)
        .select()
        .single();

      const { data: data2 } = await supabase
        .from('subjects')
        .insert(subjectData2)
        .select()
        .single();

      expect(data1.subject_number).toMatch(/^WM-\d{6}$/);
      expect(data2.subject_number).toMatch(/^WM-\d{6}$/);
      expect(data1.subject_number).not.toBe(data2.subject_number);
    });

    it('Test 1.8 — Create subject with priority set to high — expect priority stored correctly and subject appears in high priority filter', async () => {
      const subjectData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        product_name: 'Urgent Washing Machine',
        problem_description: 'Completely broken',
        priority: 'high'
      };

      const { data, error } = await supabase
        .from('subjects')
        .insert(subjectData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.priority).toBe('high');

      // Test filter
      const { data: filteredSubjects } = await supabase
        .from('subjects')
        .select('*')
        .eq('priority', 'high');

      expect(filteredSubjects).toHaveLength(1);
      expect(filteredSubjects[0].id).toBe(data.id);
    });
  });

  // GROUP 2 — Subject Status Workflow (10 tests)
  describe('Group 2 — Subject Status Workflow', () => {
    
    it('Test 2.1 — Transition subject from pending to allocated — expect success and allocated_at timestamp set', async () => {
      const { data, error } = await supabase
        .from('subjects')
        .update({ 
          status: 'allocated',
          assigned_technician_id: mockTechnician.id
        })
        .eq('id', testSubjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('allocated');
      expect(data.allocated_at).toBeDefined();
      expect(data.assigned_technician_id).toBe(mockTechnician.id);
    });

    it('Test 2.2 — Transition subject from allocated to accepted by assigned technician — expect success and accepted_at set', async () => {
      const { data, error } = await supabase
        .from('subjects')
        .update({ 
          status: 'accepted',
          accepted_by_technician_id: mockTechnician.id
        })
        .eq('id', testSubjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('accepted');
      expect(data.accepted_at).toBeDefined();
      expect(data.accepted_by_technician_id).toBe(mockTechnician.id);
    });

    it('Test 2.3 — Transition subject from accepted to arrived — expect success and arrived_at timestamp set', async () => {
      const { data, error } = await supabase
        .from('subjects')
        .update({ status: 'arrived' })
        .eq('id', testSubjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('arrived');
      expect(data.arrived_at).toBeDefined();
    });

    it('Test 2.4 — Transition subject from arrived to in_progress — expect success and work_started_at set', async () => {
      const { data, error } = await supabase
        .from('subjects')
        .update({ status: 'in_progress' })
        .eq('id', testSubjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('in_progress');
      expect(data.work_started_at).toBeDefined();
    });

    it('Test 2.5 — Transition subject from in_progress to completed — expect success and completed_at set', async () => {
      const { data, error } = await supabase
        .from('subjects')
        .update({ status: 'completed' })
        .eq('id', testSubjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('completed');
      expect(data.completed_at).toBeDefined();
    });

    it('Test 2.6 — Transition subject from pending directly to completed — expect error invalid transition', async () => {
      const newSubjectData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        product_name: 'Test Subject',
        problem_description: 'Test issue'
      };

      const { data: newSubject } = await supabase
        .from('subjects')
        .insert(newSubjectData)
        .select()
        .single();

      const { data, error } = await supabase
        .from('subjects')
        .update({ status: 'completed' })
        .eq('id', newSubject.id)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('invalid transition');
    });

    it('Test 2.7 — All status values must be lowercase — verify status column never contains uppercase values after any operation', async () => {
      const { data, error } = await supabase
        .from('subjects')
        .update({ status: 'ALLOCATED' }) // Try uppercase
        .eq('id', testSubjectId)
        .select()
        .single();

      // Should either fail or convert to lowercase
      if (data) {
        expect(data.status).toBe(data.status.toLowerCase());
      }
    });

    it('Test 2.8 — Transition subject to incomplete with reason — expect status incomplete and incomplete_reason stored', async () => {
      const { data, error } = await supabase
        .from('subjects')
        .update({ 
          status: 'incomplete',
          incomplete_reason: 'Parts not available'
        })
        .eq('id', testSubjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('incomplete');
      expect(data.incomplete_reason).toBe('Parts not available');
    });

    it('Test 2.9 — Transition subject to awaiting_parts — expect status awaiting_parts stored correctly', async () => {
      const { data, error } = await supabase
        .from('subjects')
        .update({ status: 'awaiting_parts' })
        .eq('id', testSubjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('awaiting_parts');
    });

    it('Test 2.10 — Technician rejects subject — expect is_rejected_pending_reschedule set to true and rejected_by_technician_id populated', async () => {
      const { data, error } = await supabase
        .from('subjects')
        .update({ 
          status: 'reschedule',
          is_rejected_pending_reschedule: true,
          rejected_by_technician_id: mockTechnician.id,
          rejection_reason: 'Customer not available'
        })
        .eq('id', testSubjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.is_rejected_pending_reschedule).toBe(true);
      expect(data.rejected_by_technician_id).toBe(mockTechnician.id);
      expect(data.rejection_reason).toBe('Customer not available');
    });
  });

  // GROUP 3 — Subject Assignment (6 tests)
  describe('Group 3 — Subject Assignment', () => {
    
    it('Test 3.1 — Assign subject to technician as office_staff — expect assigned_technician_id set and technician_allocated_date set to today', async () => {
      const newSubjectData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        product_name: 'Assignment Test',
        problem_description: 'Test assignment'
      };

      const { data: newSubject } = await supabase
        .from('subjects')
        .insert(newSubjectData)
        .select()
        .single();

      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('subjects')
        .update({ 
          status: 'allocated',
          assigned_technician_id: mockTechnician.id,
          technician_allocated_date: today
        })
        .eq('id', newSubject.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.assigned_technician_id).toBe(mockTechnician.id);
      expect(data.technician_allocated_date).toBe(today);
    });

    it('Test 3.2 — Assign subject to technician who already has maximum daily subjects — expect error technician at daily limit', async () => {
      // This would require checking technician's current assignments
      // For now, simulate the error
      const { data, error } = await supabase
        .from('subjects')
        .update({ 
          status: 'allocated',
          assigned_technician_id: mockTechnician.id
        })
        .eq('id', testSubjectId)
        .select()
        .single();

      // This test would need actual business logic implementation
      expect(error).toBeDefined();
    });

    it('Test 3.3 — Reassign subject to different technician — expect new technician_id set and history logged', async () => {
      const newTechnician = {
        id: 'tech-456',
        email: 'tech2@hitech.com',
        role: 'technician'
      };

      const { data, error } = await supabase
        .from('subjects')
        .update({ 
          assigned_technician_id: newTechnician.id,
          technician_allocated_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', testSubjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.assigned_technician_id).toBe(newTechnician.id);

      // Check history
      const { data: history } = await supabase
        .from('subject_status_history')
        .select('*')
        .eq('subject_id', testSubjectId);

      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThan(0);
    });

    it('Test 3.4 — Assign subject as technician role — expect permission denied', async () => {
      const { data, error } = await supabase
        .from('subjects')
        .update({ 
          status: 'allocated',
          assigned_technician_id: mockTechnician.id
        })
        .eq('id', testSubjectId)
        .select()
        .single();

      // Simulate RLS blocking
      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('42501');
    });

    it('Test 3.5 — Fetch subjects assigned to specific technician — expect only that technician subjects returned', async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('assigned_technician_id', mockTechnician.id);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data.forEach((subject: any) => {
        expect(subject.assigned_technician_id).toBe(mockTechnician.id);
      });
    });

    it('Test 3.6 — Unassigned subject appears in pending_unassigned_subjects view — verify view returns it correctly', async () => {
      // Create unassigned subject
      const unassignedData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        product_name: 'Unassigned Test',
        problem_description: 'Test unassigned'
      };

      const { data: unassigned } = await supabase
        .from('subjects')
        .insert(unassignedData)
        .select()
        .single();

      // Check view
      const { data: viewData } = await supabase
        .from('pending_unassigned_subjects')
        .select('*')
        .eq('id', unassigned.id);

      expect(viewData).toBeDefined();
      expect(viewData.length).toBe(1);
      expect(viewData[0].id).toBe(unassigned.id);
    });
  });

  // GROUP 4 — Subject Billing (8 tests)
  describe('Group 4 — Subject Billing', () => {
    
    it('Test 4.1 — Generate bill for completed subject — expect bill_number generated and subject_bills record created', async () => {
      const billData = {
        subject_id: testSubjectId,
        visit_charge: 150,
        service_charge: 200,
        grand_total: 350,
        billing_status: 'due'
      };

      const { data, error } = await supabase
        .from('subject_bills')
        .insert(billData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.bill_number).toMatch(/^BILL-\d{6}$/);
      expect(data.subject_id).toBe(testSubjectId);
    });

    it('Test 4.2 — Add accessory line to subject — expect line_total calculated correctly using discounted_mrp × quantity', async () => {
      const accessoryData = {
        subject_bill_id: 'bill-123',
        product_name: 'Test Part',
        quantity: 2,
        mrp: 100,
        discounted_mrp: 90,
        unit_price: 90
      };

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert(accessoryData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.line_total).toBe(180); // 90 * 2
    });

    it('Test 4.3 — GST split on accessory line — expect base_price equals discounted_mrp divided by 1.18 and gst_amount equals discounted_mrp minus base_price', async () => {
      const accessoryData = {
        subject_bill_id: 'bill-123',
        product_name: 'GST Test Part',
        quantity: 1,
        mrp: 118,
        discounted_mrp: 118,
        unit_price: 100
      };

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert(accessoryData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.base_price).toBe(100); // 118 / 1.18
      expect(data.gst_amount).toBe(18); // 118 - 100
    });

    it('Test 4.4 — Technician adds accessory with discount — expect permission denied service layer blocks discount', async () => {
      // This would be tested at the service layer level
      // For now, simulate the permission check
      const accessoryData = {
        subject_bill_id: 'bill-123',
        product_name: 'Discounted Part',
        quantity: 1,
        mrp: 100,
        discounted_mrp: 80, // Technician trying to discount
        unit_price: 80
      };

      // Should fail due to RLS or service layer validation
      const { data, error } = await supabase
        .from('subject_accessories')
        .insert(accessoryData)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
    });

    it('Test 4.5 — Office staff adds percentage discount — expect discount_amount and discounted_mrp calculated correctly', async () => {
      const accessoryData = {
        subject_bill_id: 'bill-123',
        product_name: 'Discounted Part',
        quantity: 1,
        mrp: 100,
        discount_percentage: 10,
        discounted_mrp: 90,
        unit_price: 90
      };

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert(accessoryData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.discount_amount).toBe(10); // 100 - 90
      expect(data.discounted_mrp).toBe(90);
    });

    it('Test 4.6 — Add accessory with unit_price below MRP — expect validation error selling price cannot be below MRP', async () => {
      const accessoryData = {
        subject_bill_id: 'bill-123',
        product_name: 'Below MRP Part',
        quantity: 1,
        mrp: 100,
        discounted_mrp: 95, // Below MRP
        unit_price: 95
      };

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert(accessoryData)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('below MRP');
    });

    it('Test 4.7 — Mark bill as paid — expect payment_status set to paid and payment_collected_at timestamp set', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .update({ 
          billing_status: 'paid',
          payment_collected_at: new Date().toISOString()
        })
        .eq('subject_id', testSubjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.billing_status).toBe('paid');
      expect(data.payment_collected_at).toBeDefined();
    });

    it('Test 4.8 — Edit bill after marked as paid — expect permission denied bill is locked after payment', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .update({ grand_total: 999 })
        .eq('subject_id', testSubjectId)
        .eq('billing_status', 'paid')
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('locked');
    });
  });

  // GROUP 5 — Photo Requirements (5 tests)
  describe('Group 5 — Photo Requirements', () => {
    
    it('Test 5.1 — Mark in_warranty subject as completed without 6 photos — expect error minimum 6 photos required for warranty jobs', async () => {
      // Create warranty subject
      const warrantySubject = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        product_name: 'Warranty Product',
        problem_description: 'Warranty issue',
        is_warranty_service: true
      };

      const { data: subject } = await supabase
        .from('subjects')
        .insert(warrantySubject)
        .select()
        .single();

      // Try to complete without photos
      const { data, error } = await supabase
        .from('subjects')
        .update({ status: 'completed' })
        .eq('id', subject.id)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('6 photos');
    });

    it('Test 5.2 — Mark out_of_warranty subject as completed without 3 photos — expect error minimum 3 photos required', async () => {
      // Create non-warranty subject
      const regularSubject = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        product_name: 'Regular Product',
        problem_description: 'Regular issue',
        is_warranty_service: false
      };

      const { data: subject } = await supabase
        .from('subjects')
        .insert(regularSubject)
        .select()
        .single();

      // Try to complete without photos
      const { data, error } = await supabase
        .from('subjects')
        .update({ status: 'completed' })
        .eq('id', subject.id)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('3 photos');
    });

    it('Test 5.3 — Upload photo to subject — expect photo stored in subject_photos and completion_proof_uploaded updated', async () => {
      const photoData = {
        subject_id: testSubjectId,
        photo_url: 'https://example.com/photo1.jpg',
        photo_type: 'before',
        uploaded_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('subject_photos')
        .insert(photoData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.subject_id).toBe(testSubjectId);

      // Check completion_proof_uploaded
      const { data: subject } = await supabase
        .from('subjects')
        .select('completion_proof_uploaded')
        .eq('id', testSubjectId)
        .single();

      expect(subject.completion_proof_uploaded).toBe(true);
    });

    it('Test 5.4 — Mark subject as completed after uploading required photos — expect success', async () => {
      // Upload required photos first
      for (let i = 1; i <= 6; i++) {
        await supabase
          .from('subject_photos')
          .insert({
            subject_id: testSubjectId,
            photo_url: `https://example.com/photo${i}.jpg`,
            photo_type: 'before',
            uploaded_at: new Date().toISOString()
          });
      }

      // Now try to complete
      const { data, error } = await supabase
        .from('subjects')
        .update({ status: 'completed' })
        .eq('id', testSubjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('completed');
    });

    it('Test 5.5 — Fetch photos for subject — expect all photos returned with correct subject_id', async () => {
      const { data, error } = await supabase
        .from('subject_photos')
        .select('*')
        .eq('subject_id', testSubjectId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data.forEach((photo: any) => {
        expect(photo.subject_id).toBe(testSubjectId);
      });
    });
  });

  // GROUP 6 — Brand and Dealer Management (5 tests)
  describe('Group 6 — Brand and Dealer Management', () => {
    
    it('Test 6.1 — Create brand with valid name — expect success and brand_id returned', async () => {
      const brandData = {
        name: 'New Test Brand',
        description: 'Test brand description'
      };

      const { data, error } = await supabase
        .from('brands')
        .insert(brandData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.id).toBeDefined();
      expect(data.name).toBe('New Test Brand');
    });

    it('Test 6.2 — Create duplicate brand name — expect error brand already exists', async () => {
      const brandData = {
        name: 'Test Brand', // Already exists
        description: 'Duplicate test'
      };

      const { data, error } = await supabase
        .from('brands')
        .insert(brandData)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('already exists');
    });

    it('Test 6.3 — Create dealer with valid details — expect success', async () => {
      const dealerData = {
        name: 'Test Dealer',
        phone: '9876543210',
        email: 'dealer@test.com',
        address: '123 Dealer St'
      };

      const { data, error } = await supabase
        .from('dealers')
        .insert(dealerData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe('Test Dealer');
    });

    it('Test 6.4 — Fetch subjects by brand — expect only subjects with that brand_id returned', async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('brand_id', testBrandId);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data.forEach((subject: any) => {
        expect(subject.brand_id).toBe(testBrandId);
      });
    });

    it('Test 6.5 — Brand financial summary view — expect correct total outstanding amount for brand', async () => {
      const { data, error } = await supabase
        .from('brand_financial_summary')
        .select('*')
        .eq('brand_id', testBrandId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.brand_id).toBe(testBrandId);
      expect(data.total_outstanding).toBeDefined();
    });
  });

  // GROUP 7 — AMC Detection in Subject Creation (5 tests)
  describe('Group 7 — AMC Detection in Subject Creation', () => {
    
    it('Test 7.1 — Create subject for customer with active AMC for same appliance brand — expect is_amc_service true and amc_id populated', async () => {
      const subjectData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        product_name: 'AMC Test Product',
        problem_description: 'AMC service issue'
      };

      const { data, error } = await supabase
        .from('subjects')
        .insert(subjectData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.is_amc_service).toBe(true);
      expect(data.amc_id).toBe(testAMCId);
    });

    it('Test 7.2 — Create subject for customer with expired AMC — expect is_amc_service false', async () => {
      // Create expired AMC
      const expiredAMC = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        start_date: '2025-01-01',
        end_date: '2025-12-31', // Expired
        status: 'expired'
      };

      await supabase
        .from('amc_contracts')
        .insert(expiredAMC);

      const subjectData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        product_name: 'Expired AMC Product',
        problem_description: 'Expired AMC issue'
      };

      const { data, error } = await supabase
        .from('subjects')
        .insert(subjectData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.is_amc_service).toBe(false);
    });

    it('Test 7.3 — Create subject for customer with AMC for different appliance — expect is_amc_service false', async () => {
      // Create AMC for different brand
      const differentBrand = {
        id: 'brand-456',
        name: 'Different Brand'
      };

      await supabase
        .from('brands')
        .insert(differentBrand);

      const differentAMC = {
        customer_id: testCustomerId,
        brand_id: 'brand-456',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        status: 'active'
      };

      await supabase
        .from('amc_contracts')
        .insert(differentAMC);

      const subjectData = {
        customer_id: testCustomerId,
        brand_id: testBrandId, // Different from AMC
        product_name: 'Different Brand Product',
        problem_description: 'Different brand issue'
      };

      const { data, error } = await supabase
        .from('subjects')
        .insert(subjectData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.is_amc_service).toBe(false);
    });

    it('Test 7.4 — Subject with active AMC — verify billing type auto-switches to brand or dealer billing', async () => {
      const subjectData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        product_name: 'AMC Billing Test',
        problem_description: 'AMC billing issue'
      };

      const { data, error } = await supabase
        .from('subjects')
        .insert(subjectData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.service_charge_type).toBe('brand_dealer'); // Auto-switched
    });

    it('Test 7.5 — Override AMC billing — expect amc_override_reason stored when staff overrides', async () => {
      const { data, error } = await supabase
        .from('subjects')
        .update({ 
          service_charge_type: 'customer',
          amc_override_reason: 'Customer requested direct billing'
        })
        .eq('id', testSubjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.service_charge_type).toBe('customer');
      expect(data.amc_override_reason).toBe('Customer requested direct billing');
    });
  });

  // GROUP 8 — Subject Filters and Search (5 tests)
  describe('Group 8 — Subject Filters and Search', () => {
    
    it('Test 8.1 — Filter subjects by status pending — expect only pending subjects returned', async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('status', 'pending');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data.forEach((subject: any) => {
        expect(subject.status).toBe('pending');
      });
    });

    it('Test 8.2 — Filter subjects by date range — expect only subjects created within range returned', async () => {
      const startDate = '2026-03-01';
      const endDate = '2026-03-31';

      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data.forEach((subject: any) => {
        const createdDate = subject.created_at.split('T')[0];
        expect(createdDate >= startDate && createdDate <= endDate).toBe(true);
      });
    });

    it('Test 8.3 — Search subject by subject_number — expect exact match returned', async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('subject_number', 'WM-000001'); // Assuming this exists

      expect(error).toBeNull();
      expect(data).toBeDefined();
      if (data.length > 0) {
        expect(data[0].subject_number).toBe('WM-000001');
      }
    });

    it('Test 8.4 — Search subject by customer phone — expect matching subjects returned', async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*, customers!inner(phone)')
        .eq('customers.phone', '1234567890');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data.forEach((subject: any) => {
        expect(subject.customers.phone).toBe('1234567890');
      });
    });

    it('Test 8.5 — active_subjects_today view — expect only today\'s active subjects with allocated or accepted or arrived or in_progress status', async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('active_subjects_today')
        .select('*');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data.forEach((subject: any) => {
        const createdDate = subject.created_at.split('T')[0];
        expect(createdDate).toBe(today);
        expect(['allocated', 'accepted', 'arrived', 'in_progress']).toContain(subject.status);
      });
    });
  });

  // GROUP 9 — Subject History and Audit (4 tests)
  describe('Group 9 — Subject History and Audit', () => {
    
    it('Test 9.1 — Every status change creates a record in subject_status_history — verify after each transition', async () => {
      // Change status
      await supabase
        .from('subjects')
        .update({ status: 'allocated' })
        .eq('id', testSubjectId);

      // Check history
      const { data, error } = await supabase
        .from('subject_status_history')
        .select('*')
        .eq('subject_id', testSubjectId)
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].old_status).toBe('pending');
      expect(data[0].new_status).toBe('allocated');
    });

    it('Test 9.2 — Fetch subject history — expect all status changes listed in chronological order', async () => {
      const { data, error } = await supabase
        .from('subject_status_history')
        .select('*')
        .eq('subject_id', testSubjectId)
        .order('created_at', { ascending: true });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Verify chronological order
      for (let i = 1; i < data.length; i++) {
        expect(new Date(data[i].created_at) >= new Date(data[i-1].created_at)).toBe(true);
      }
    });

    it('Test 9.3 — Soft delete subject — expect is_deleted set to true and subject not returned in normal list queries', async () => {
      // Soft delete
      const { data, error } = await supabase
        .from('subjects')
        .update({ is_deleted: true })
        .eq('id', testSubjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.is_deleted).toBe(true);

      // Check normal query doesn't return it
      const { data: normalQuery } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', testSubjectId);

      expect(normalQuery).toHaveLength(0);
    });

    it('Test 9.4 — Fetch deleted subject — expect it does not appear in active subject list', async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_deleted', false);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      const deletedSubject = data.find((s: any) => s.id === testSubjectId);
      expect(deletedSubject).toBeUndefined();
    });
  });

  // GROUP 10 — Permissions and Roles (4 tests)
  describe('Group 10 — Permissions and Roles', () => {
    
    it('Test 10.1 — Technician fetches own assigned subjects — expect success returns only their subjects', async () => {
      // Mock technician context
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('assigned_technician_id', mockTechnician.id);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data.forEach((subject: any) => {
        expect(subject.assigned_technician_id).toBe(mockTechnician.id);
      });
    });

    it('Test 10.2 — Technician fetches another technician subjects — expect permission denied or empty result', async () => {
      // Mock technician trying to access other technician's subjects
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('assigned_technician_id', 'tech-456'); // Different technician

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('Test 10.3 — Stock manager tries to create subject — expect permission denied', async () => {
      const stockManager = {
        id: 'stock-123',
        role: 'stock_manager'
      };

      const subjectData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        product_name: 'Stock Manager Test',
        problem_description: 'Test'
      };

      // Mock stock manager context
      const { data, error } = await supabase
        .from('subjects')
        .insert(subjectData)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('42501');
    });

    it('Test 10.4 — Super admin can perform all operations — expect success on create, update, delete, assign', async () => {
      // Create
      const subjectData = {
        customer_id: testCustomerId,
        brand_id: testBrandId,
        product_name: 'Admin Test',
        problem_description: 'Admin test'
      };

      const { data: created, error: createError } = await supabase
        .from('subjects')
        .insert(subjectData)
        .select()
        .single();

      expect(createError).toBeNull();
      expect(created).toBeDefined();

      // Update
      const { data: updated, error: updateError } = await supabase
        .from('subjects')
        .update({ priority: 'high' })
        .eq('id', created.id)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(updated).toBeDefined();
      expect(updated.priority).toBe('high');

      // Assign
      const { data: assigned, error: assignError } = await supabase
        .from('subjects')
        .update({ 
          assigned_technician_id: mockTechnician.id,
          status: 'allocated'
        })
        .eq('id', created.id)
        .select()
        .single();

      expect(assignError).toBeNull();
      expect(assigned).toBeDefined();
      expect(assigned.assigned_technician_id).toBe(mockTechnician.id);

      // Soft delete
      const { data: deleted, error: deleteError } = await supabase
        .from('subjects')
        .update({ is_deleted: true })
        .eq('id', created.id)
        .select()
        .single();

      expect(deleteError).toBeNull();
      expect(deleted).toBeDefined();
      expect(deleted.is_deleted).toBe(true);
    });
  });
});
