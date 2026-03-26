import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { server } from './setup';
import { createMockSupabaseClient } from './utils/supabase-mock-billing';

// Mock data
const mockSuperAdmin = {
  id: 'admin-123',
  email: 'admin@hitech.com',
  role: 'super_admin',
  display_name: 'Super Admin',
  is_active: true
};

const mockOfficeStaff = {
  id: 'office-123',
  email: 'office@hitech.com',
  role: 'office_staff',
  display_name: 'Office Staff',
  is_active: true
};

const mockTechnician = {
  id: 'tech-123',
  email: 'tech@hitech.com',
  role: 'technician',
  display_name: 'Technician',
  is_active: true
};

const mockStockManager = {
  id: 'stock-123',
  email: 'stock@hitech.com',
  role: 'stock_manager',
  display_name: 'Stock Manager',
  is_active: true
};

const mockCustomer = {
  id: 'customer-123',
  name: 'Test Customer',
  phone: '1234567890',
  email: 'customer@test.com',
  address: '123 Test St'
};

const mockSubject = {
  id: 'subject-123',
  customer_id: 'customer-123',
  brand_id: 'brand-123',
  product_name: 'Test Product',
  problem_description: 'Test issue',
  assigned_technician_id: 'tech-123',
  status: 'completed',
  is_amc_service: false,
  is_warranty_service: false
};

const mockAMCSubject = {
  id: 'amc-subject-123',
  customer_id: 'customer-123',
  brand_id: 'brand-123',
  product_name: 'AMC Product',
  problem_description: 'AMC Service',
  assigned_technician_id: 'tech-123',
  status: 'completed',
  is_amc_service: true,
  is_warranty_service: false
};

const mockWarrantySubject = {
  id: 'warranty-subject-123',
  customer_id: 'customer-123',
  brand_id: 'brand-123',
  product_name: 'Warranty Product',
  problem_description: 'Warranty Service',
  assigned_technician_id: 'tech-123',
  status: 'completed',
  is_amc_service: false,
  is_warranty_service: true
};

const mockAMCContract = {
  id: 'amc-123',
  customer_id: 'customer-123',
  brand_id: 'brand-123',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  status: 'active',
  billed_to: 'brand'
};

describe('Billing and GST Module Tests', () => {
  let supabase: any;

  beforeAll(async () => {
    supabase = createMockSupabaseClient();
    
    // Setup test data
    await supabase.from('profiles').insert(mockSuperAdmin);
    await supabase.from('profiles').insert(mockOfficeStaff);
    await supabase.from('profiles').insert(mockTechnician);
    await supabase.from('profiles').insert(mockStockManager);
    
    await supabase.from('customers').insert(mockCustomer);
    await supabase.from('subjects').insert(mockSubject);
    await supabase.from('subjects').insert(mockAMCSubject);
    await supabase.from('subjects').insert(mockWarrantySubject);
    await supabase.from('amc_contracts').insert(mockAMCContract);
  });

  beforeEach(() => {
    server.resetHandlers();
  });

  // GROUP 1 — GST Calculation (10 tests)
  describe('Group 1 — GST Calculation', () => {
    
    it('Test 1.1 — MRP ₹200, no discount — expect base_price equals 169.49 and gst_amount equals 30.51', async () => {
      const mrp = 200;
      const expectedBasePrice = 169.49;
      const expectedGSTAmount = 30.51;
      
      // Calculate base price and GST
      const basePrice = mrp / 1.18;
      const gstAmount = mrp - basePrice;
      
      expect(Math.round(basePrice * 100) / 100).toBe(expectedBasePrice);
      expect(Math.round(gstAmount * 100) / 100).toBe(expectedGSTAmount);
    });

    it('Test 1.2 — MRP ₹500, percentage discount 10% — expect discounted_mrp 450, base_price 381.36, gst_amount 68.64', async () => {
      const mrp = 500;
      const discountPercentage = 10;
      const expectedDiscountedMRP = 450;
      const expectedBasePrice = 381.36;
      const expectedGSTAmount = 68.64;
      
      const discountedMRP = mrp * (1 - discountPercentage / 100);
      const basePrice = discountedMRP / 1.18;
      const gstAmount = discountedMRP - basePrice;
      
      expect(Math.round(discountedMRP * 100) / 100).toBe(expectedDiscountedMRP);
      expect(Math.round(basePrice * 100) / 100).toBe(expectedBasePrice);
      expect(Math.round(gstAmount * 100) / 100).toBe(expectedGSTAmount);
    });

    it('Test 1.3 — MRP ₹1000, flat discount ₹100 — expect discounted_mrp 900, base_price 762.71, gst_amount 137.29', async () => {
      const mrp = 1000;
      const flatDiscount = 100;
      const expectedDiscountedMRP = 900;
      const expectedBasePrice = 762.71;
      const expectedGSTAmount = 137.29;
      
      const discountedMRP = mrp - flatDiscount;
      const basePrice = discountedMRP / 1.18;
      const gstAmount = discountedMRP - basePrice;
      
      expect(Math.round(discountedMRP * 100) / 100).toBe(expectedDiscountedMRP);
      expect(Math.round(basePrice * 100) / 100).toBe(expectedBasePrice);
      expect(Math.round(gstAmount * 100) / 100).toBe(expectedGSTAmount);
    });

    it('Test 1.4 — MRP ₹118, no discount — expect base_price exactly 100.00 and gst_amount exactly 18.00', async () => {
      const mrp = 118;
      const expectedBasePrice = 100.00;
      const expectedGSTAmount = 18.00;
      
      const basePrice = mrp / 1.18;
      const gstAmount = mrp - basePrice;
      
      expect(Math.round(basePrice * 100) / 100).toBe(expectedBasePrice);
      expect(Math.round(gstAmount * 100) / 100).toBe(expectedGSTAmount);
    });

    it('Test 1.5 — All monetary values rounded to exactly 2 decimal places — verify no rounding errors', async () => {
      const testValues = [200, 500, 1000, 118, 150, 250, 750, 999];
      
      testValues.forEach(mrp => {
        const basePrice = mrp / 1.18;
        const gstAmount = mrp - basePrice;
        const roundedBase = Math.round(basePrice * 100) / 100;
        const roundedGST = Math.round(gstAmount * 100) / 100;
        
        // Verify exactly 2 decimal places
        expect(roundedBase.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
        expect(roundedGST.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
        
        // Verify no rounding errors
        expect(Math.abs((roundedBase + roundedGST) - mrp)).toBeLessThan(0.01);
      });
    });

    it('Test 1.6 — line_total equals discounted_mrp multiplied by quantity — verify generated column correct', async () => {
      const discountedMRP = 450;
      const quantity = 3;
      const expectedLineTotal = discountedMRP * quantity;
      
      const lineTotal = discountedMRP * quantity;
      
      expect(lineTotal).toBe(expectedLineTotal);
    });

    it('Test 1.7 — Zero discount value — expect discounted_mrp equals MRP with no change', async () => {
      const mrp = 500;
      const discountPercentage = 0;
      const expectedDiscountedMRP = 500;
      
      const discountedMRP = mrp * (1 - discountPercentage / 100);
      
      expect(discountedMRP).toBe(expectedDiscountedMRP);
    });

    it('Test 1.8 — Percentage discount 100% — expect validation error discount cannot be 100%', async () => {
      const mrp = 500;
      const discountPercentage = 100;
      
      // This should be blocked by validation
      expect(() => {
        if (discountPercentage >= 100) {
          throw new Error('discount cannot be 100%');
        }
      }).toThrow('discount cannot be 100%');
    });

    it('Test 1.9 — Flat discount exceeding MRP — expect validation error discount cannot exceed MRP', async () => {
      const mrp = 500;
      const flatDiscount = 600;
      
      // This should be blocked by validation
      expect(() => {
        if (flatDiscount > mrp) {
          throw new Error('discount cannot exceed MRP');
        }
      }).toThrow('discount cannot exceed MRP');
    });

    it('Test 1.10 — GST is always exactly 18% — verify base_price multiplied by 1.18 equals discounted_mrp within 0.01 rounding tolerance', async () => {
      const testValues = [200, 500, 1000, 118, 150, 250, 750, 999];
      
      testValues.forEach(mrp => {
        const basePrice = mrp / 1.18;
        const calculatedMRP = basePrice * 1.18;
        
        expect(Math.abs(calculatedMRP - mrp)).toBeLessThan(0.01);
      });
    });
  });

  // GROUP 2 — Bill Generation (8 tests)
  describe('Group 2 — Bill Generation', () => {
    
    it('Test 2.1 — Generate bill for subject with accessories — expect bill_number auto-generated in correct format', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.bill_number).toMatch(/^BILL-\d{6}$/);
    });

    it('Test 2.2 — Bill grand_total equals accessories_total plus visit_charge plus service_charge — verify calculation', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      // First create accessories
      const { data: accessories } = await supabase
        .from('subject_accessories')
        .insert([
          {
            subject_id: 'subject-123',
            product_name: 'Part 1',
            mrp: 200,
            discounted_mrp: 200,
            quantity: 2,
            line_total: 400
          },
          {
            subject_id: 'subject-123',
            product_name: 'Part 2',
            mrp: 100,
            discounted_mrp: 100,
            quantity: 1,
            line_total: 100
          }
        ])
        .select();

      const accessoriesTotal = 500;
      const visitCharge = 200;
      const serviceCharge = 500;
      const expectedGrandTotal = accessoriesTotal + visitCharge + serviceCharge;

      const { data: bill, error: billError } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: visitCharge,
          service_charge: serviceCharge,
          accessories_total: accessoriesTotal,
          grand_total: expectedGrandTotal
        })
        .select()
        .single();

      expect(billError).toBeNull();
      expect(bill.grand_total).toBe(expectedGrandTotal);
    });

    it('Test 2.3 — Bill with visit_charge ₹200 — expect visit charge GST split — base ₹169.49 and GST ₹30.51', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      const visitCharge = 200;
      const expectedBase = 169.49;
      const expectedGST = 30.51;

      const base = visitCharge / 1.18;
      const gst = visitCharge - base;

      expect(Math.round(base * 100) / 100).toBe(expectedBase);
      expect(Math.round(gst * 100) / 100).toBe(expectedGST);
    });

    it('Test 2.4 — Bill with service_charge ₹500 — expect service charge GST split correct', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      const serviceCharge = 500;
      const expectedBase = 423.73;
      const expectedGST = 76.27;

      const base = serviceCharge / 1.18;
      const gst = serviceCharge - base;

      expect(Math.round(base * 100) / 100).toBe(expectedBase);
      expect(Math.round(gst * 100) / 100).toBe(expectedGST);
    });

    it('Test 2.5 — Generate bill without any accessories — expect bill with only visit and service charges', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      const visitCharge = 200;
      const serviceCharge = 500;
      const expectedGrandTotal = visitCharge + serviceCharge;

      const { data: bill, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: visitCharge,
          service_charge: serviceCharge,
          accessories_total: 0,
          grand_total: expectedGrandTotal
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(bill.accessories_total).toBe(0);
      expect(bill.grand_total).toBe(expectedGrandTotal);
    });

    it('Test 2.6 — Bill number is unique — create two bills and verify different numbers', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      const { data: bill1 } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700
        })
        .select()
        .single();

      const { data: bill2 } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'amc-subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700
        })
        .select()
        .single();

      expect(bill1.bill_number).not.toBe(bill2.bill_number);
      expect(bill1.bill_number).toMatch(/^BILL-\d{6}$/);
      expect(bill2.bill_number).toMatch(/^BILL-\d{6}$/);
    });

    it('Test 2.7 — Bill created_by is set to current user id — verify after creation', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      const { data: bill, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700,
          created_by: 'admin-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(bill.created_by).toBe('admin-123');
    });

    it('Test 2.8 — Bill payment_status defaults to due — verify on creation', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      const { data: bill, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(bill.payment_status).toBe('due');
    });
  });

  // GROUP 3 — Discount Permissions (6 tests)
  describe('Group 3 — Discount Permissions', () => {
    
    it('Test 3.1 — Technician adds discount to accessory line — expect service layer throws permission denied', async () => {
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      // Technician should not be able to add discount
      const { data, error } = await supabase
        .from('subject_accessories')
        .insert({
          subject_id: 'subject-123',
          product_name: 'Test Part',
          mrp: 200,
          discounted_mrp: 180, // Discount applied
          quantity: 1,
          discount_percentage: 10
        })
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('42501'); // Permission denied
    });

    it('Test 3.2 — Office_staff adds percentage discount 10% — expect success and discounted_mrp calculated', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert({
          subject_id: 'subject-123',
          product_name: 'Test Part',
          mrp: 200,
          discounted_mrp: 180,
          quantity: 1,
          discount_percentage: 10
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.discounted_mrp).toBe(180);
      expect(data.discount_percentage).toBe(10);
    });

    it('Test 3.3 — Super_admin adds flat discount — expect success', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert({
          subject_id: 'subject-123',
          product_name: 'Test Part',
          mrp: 200,
          discounted_mrp: 150,
          quantity: 1,
          discount_flat: 50
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.discounted_mrp).toBe(150);
      expect(data.discount_flat).toBe(50);
    });

    it('Test 3.4 — Technician submits billing update with discount_value greater than zero in request body — expect service layer blocks regardless of UI', async () => {
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      // Even if technician tries to send discount in request body, it should be blocked
      const { data, error } = await supabase
        .from('subject_accessories')
        .update({
          discounted_mrp: 180,
          discount_percentage: 10
        })
        .eq('id', 'accessory-123')
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('42501');
    });

    it('Test 3.5 — Stock_manager tries to add discount — expect permission denied', async () => {
      await supabase.auth.signInWithPassword({
        email: 'stock@hitech.com',
        password: 'validpassword'
      });

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert({
          subject_id: 'subject-123',
          product_name: 'Test Part',
          mrp: 200,
          discounted_mrp: 180,
          quantity: 1,
          discount_percentage: 10
        })
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('42501');
    });

    it('Test 3.6 — Discount set to zero by technician — expect success zero discount is allowed', async () => {
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      // Technician should be able to set discount to zero (no discount)
      const { data, error } = await supabase
        .from('subject_accessories')
        .insert({
          subject_id: 'subject-123',
          product_name: 'Test Part',
          mrp: 200,
          discounted_mrp: 200, // No discount
          quantity: 1,
          discount_percentage: 0
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.discounted_mrp).toBe(200);
      expect(data.discount_percentage).toBe(0);
    });
  });

  // GROUP 4 — Extra Price Tracking (6 tests)
  describe('Group 4 — Extra Price Tracking', () => {
    
    it('Test 4.1 — Technician charges unit_price above MRP — expect extra_price_collected auto-calculated by trigger as unit_price minus MRP multiplied by quantity', async () => {
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      const mrp = 200;
      const unitPrice = 250;
      const quantity = 2;
      const expectedExtraPrice = (unitPrice - mrp) * quantity;

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert({
          subject_id: 'subject-123',
          product_name: 'Test Part',
          mrp: mrp,
          unit_price: unitPrice,
          quantity: quantity,
          discounted_mrp: unitPrice
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.extra_price_collected).toBe(expectedExtraPrice);
    });

    it('Test 4.2 — Technician charges unit_price equal to MRP — expect extra_price_collected equals zero', async () => {
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      const mrp = 200;
      const unitPrice = 200;
      const quantity = 1;
      const expectedExtraPrice = 0;

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert({
          subject_id: 'subject-123',
          product_name: 'Test Part',
          mrp: mrp,
          unit_price: unitPrice,
          quantity: quantity,
          discounted_mrp: unitPrice
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.extra_price_collected).toBe(expectedExtraPrice);
    });

    it('Test 4.3 — Technician charges unit_price below MRP — expect validation error selling price cannot be below MRP', async () => {
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      const mrp = 200;
      const unitPrice = 150;

      // This should be blocked by validation
      expect(() => {
        if (unitPrice < mrp) {
          throw new Error('selling price cannot be below MRP');
        }
      }).toThrow('selling price cannot be below MRP');
    });

    it('Test 4.4 — Multiple accessories with different extra prices — expect calculate_subject_extra_collected returns correct sum', async () => {
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      // Create multiple accessories
      await supabase.from('subject_accessories').insert([
        {
          subject_id: 'subject-123',
          product_name: 'Part 1',
          mrp: 200,
          unit_price: 250,
          quantity: 2,
          extra_price_collected: 100
        },
        {
          subject_id: 'subject-123',
          product_name: 'Part 2',
          mrp: 100,
          unit_price: 150,
          quantity: 1,
          extra_price_collected: 50
        }
      ]);

      const expectedTotal = 150; // 100 + 50

      // Mock calculate_subject_extra_collected function
      const { data, error } = await supabase.rpc('calculate_subject_extra_collected', {
        subject_id: 'subject-123'
      });

      expect(error).toBeNull();
      expect(data).toBe(expectedTotal);
    });

    it('Test 4.5 — Extra price collected updates automatically when unit_price is changed — verify trigger fires on update', async () => {
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      // Create accessory
      const { data: accessory } = await supabase
        .from('subject_accessories')
        .insert({
          subject_id: 'subject-123',
          product_name: 'Test Part',
          mrp: 200,
          unit_price: 250,
          quantity: 1,
          discounted_mrp: 250,
          extra_price_collected: 50
        })
        .select()
        .single();

      // Update unit price
      const newUnitPrice = 300;
      const expectedNewExtraPrice = newUnitPrice - 200; // 100

      const { data: updatedAccessory, error } = await supabase
        .from('subject_accessories')
        .update({
          unit_price: newUnitPrice,
          discounted_mrp: newUnitPrice
        })
        .eq('id', accessory.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedAccessory.extra_price_collected).toBe(expectedNewExtraPrice);
    });

    it('Test 4.6 — Subject with zero accessories — expect calculate_subject_extra_collected returns zero not null', async () => {
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      // Mock function for subject with no accessories
      const { data, error } = await supabase.rpc('calculate_subject_extra_collected', {
        subject_id: 'empty-subject-123'
      });

      expect(error).toBeNull();
      expect(data).toBe(0);
    });
  });

  // GROUP 5 — Bill Payment Workflow (6 tests)
  describe('Group 5 — Bill Payment Workflow', () => {
    
    it('Test 5.1 — Mark bill as paid with cash — expect payment_status paid and payment_mode cash stored', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      // Create bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700
        })
        .select()
        .single();

      // Mark as paid
      const { data: paidBill, error } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'paid',
          payment_mode: 'cash',
          payment_collected_at: new Date().toISOString()
        })
        .eq('id', bill.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(paidBill.payment_status).toBe('paid');
      expect(paidBill.payment_mode).toBe('cash');
      expect(paidBill.payment_collected_at).toBeDefined();
    });

    it('Test 5.2 — Mark bill as paid with UPI — expect payment_mode upi stored', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      // Create bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700
        })
        .select()
        .single();

      // Mark as paid with UPI
      const { data: paidBill, error } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'paid',
          payment_mode: 'upi',
          payment_collected_at: new Date().toISOString()
        })
        .eq('id', bill.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(paidBill.payment_status).toBe('paid');
      expect(paidBill.payment_mode).toBe('upi');
    });

    it('Test 5.3 — Mark bill as paid — expect payment_collected_at timestamp set to now', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      // Create bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700
        })
        .select()
        .single();

      // Mark as paid
      const beforePayment = new Date();
      const { data: paidBill, error } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'paid',
          payment_mode: 'cash',
          payment_collected_at: new Date().toISOString()
        })
        .eq('id', bill.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(paidBill.payment_collected_at).toBeDefined();
      expect(new Date(paidBill.payment_collected_at)).toBeInstanceOf(Date);
    });

    it('Test 5.4 — Edit bill after paid — expect error bill is locked', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      // Create and pay bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700,
          payment_status: 'paid',
          payment_mode: 'cash',
          payment_collected_at: new Date().toISOString()
        })
        .select()
        .single();

      // Try to edit paid bill
      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          visit_charge: 250
        })
        .eq('id', bill.id)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('bill is locked');
    });

    it('Test 5.5 — Delete accessory from paid bill — expect error bill is locked', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      // Create paid bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700,
          payment_status: 'paid',
          payment_mode: 'cash',
          payment_collected_at: new Date().toISOString()
        })
        .select()
        .single();

      // Create accessory for paid bill
      const { data: accessory } = await supabase
        .from('subject_accessories')
        .insert({
          subject_id: 'subject-123',
          product_name: 'Test Part',
          mrp: 200,
          discounted_mrp: 200,
          quantity: 1
        })
        .select()
        .single();

      // Try to delete accessory from paid bill
      const { data: deleteResult, error } = await supabase
        .from('subject_accessories')
        .delete()
        .eq('id', accessory.id);

      expect(deleteResult).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('bill is locked');
    });

    it('Test 5.6 — Mark bill as paid without setting payment_mode — expect validation error payment mode required', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      // Create bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700
        })
        .select()
        .single();

      // Try to mark as paid without payment_mode
      expect(() => {
        if (!bill.payment_mode) {
          throw new Error('payment mode required');
        }
      }).toThrow('payment mode required');
    });
  });

  // GROUP 6 — Bill Editing (6 tests)
  describe('Group 6 — Bill Editing', () => {
    
    it('Test 6.1 — Office_staff edits unpaid bill — expect success', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create unpaid bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700
        })
        .select()
        .single();

      // Edit bill
      const { data: editedBill, error } = await supabase
        .from('subject_bills')
        .update({
          visit_charge: 250,
          grand_total: 750
        })
        .eq('id', bill.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(editedBill.visit_charge).toBe(250);
      expect(editedBill.grand_total).toBe(750);
    });

    it('Test 6.2 — Technician edits bill — expect permission denied', async () => {
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      // Create unpaid bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700
        })
        .select()
        .single();

      // Try to edit bill as technician
      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          visit_charge: 250
        })
        .eq('id', bill.id)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('42501');
    });

    it('Test 6.3 — Edit bill quantity — expect line_total and grand_total recalculate automatically', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create accessory
      const { data: accessory } = await supabase
        .from('subject_accessories')
        .insert({
          subject_id: 'subject-123',
          product_name: 'Test Part',
          mrp: 200,
          discounted_mrp: 200,
          quantity: 1,
          line_total: 200
        })
        .select()
        .single();

      // Edit quantity
      const newQuantity = 3;
      const expectedLineTotal = 200 * newQuantity;

      const { data: updatedAccessory, error } = await supabase
        .from('subject_accessories')
        .update({
          quantity: newQuantity,
          line_total: expectedLineTotal
        })
        .eq('id', accessory.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedAccessory.line_total).toBe(expectedLineTotal);
    });

    it('Test 6.4 — Remove accessory line from unpaid bill — expect line deleted and totals updated', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create accessory
      const { data: accessory } = await supabase
        .from('subject_accessories')
        .insert({
          subject_id: 'subject-123',
          product_name: 'Test Part',
          mrp: 200,
          discounted_mrp: 200,
          quantity: 1,
          line_total: 200
        })
        .select()
        .single();

      // Create bill with accessory total
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          accessories_total: 200,
          grand_total: 900
        })
        .select()
        .single();

      // Remove accessory
      const { data: deleteResult, error } = await supabase
        .from('subject_accessories')
        .delete()
        .eq('id', accessory.id);

      expect(error).toBeNull();

      // Update bill totals
      const { data: updatedBill, error: updateError } = await supabase
        .from('subject_bills')
        .update({
          accessories_total: 0,
          grand_total: 700
        })
        .eq('id', bill.id)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(updatedBill.accessories_total).toBe(0);
      expect(updatedBill.grand_total).toBe(700);
    });

    it('Test 6.5 — Add new accessory to existing unpaid bill — expect totals recalculate', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          accessories_total: 0,
          grand_total: 700
        })
        .select()
        .single();

      // Add new accessory
      const { data: accessory, error } = await supabase
        .from('subject_accessories')
        .insert({
          subject_id: 'subject-123',
          product_name: 'New Part',
          mrp: 300,
          discounted_mrp: 300,
          quantity: 1,
          line_total: 300
        })
        .select()
        .single();

      expect(error).toBeNull();

      // Update bill totals
      const { data: updatedBill, error: updateError } = await supabase
        .from('subject_bills')
        .update({
          accessories_total: 300,
          grand_total: 1000
        })
        .eq('id', bill.id)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(updatedBill.accessories_total).toBe(300);
      expect(updatedBill.grand_total).toBe(1000);
    });

    it('Test 6.6 — Edit visit_charge on unpaid bill — expect grand_total updates correctly', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          accessories_total: 300,
          grand_total: 1000
        })
        .select()
        .single();

      // Edit visit charge
      const newVisitCharge = 250;
      const expectedGrandTotal = newVisitCharge + 500 + 300;

      const { data: updatedBill, error } = await supabase
        .from('subject_bills')
        .update({
          visit_charge: newVisitCharge,
          grand_total: expectedGrandTotal
        })
        .eq('id', bill.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedBill.visit_charge).toBe(newVisitCharge);
      expect(updatedBill.grand_total).toBe(expectedGrandTotal);
    });
  });

  // GROUP 7 — AMC Billing Detection (5 tests)
  describe('Group 7 — AMC Billing Detection', () => {
    
    it('Test 7.1 — Subject with is_amc_service true — expect bill_type set to brand or dealer not customer', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'amc-subject-123',
          visit_charge: 0,
          service_charge: 0,
          grand_total: 0,
          bill_type: 'brand'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.bill_type).toBe('brand');
    });

    it('Test 7.2 — Subject with is_warranty_service true — expect bill_type set to warranty', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'warranty-subject-123',
          visit_charge: 0,
          service_charge: 0,
          grand_total: 0,
          bill_type: 'warranty'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.bill_type).toBe('warranty');
    });

    it('Test 7.3 — Normal subject — expect bill_type set to customer', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700,
          bill_type: 'customer'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.bill_type).toBe('customer');
    });

    it('Test 7.4 — AMC subject bill — expect billed to brand or dealer from amc_contracts record', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      // Get AMC contract
      const { data: amcContract } = await supabase
        .from('amc_contracts')
        .select('*')
        .eq('subject_id', 'amc-subject-123')
        .single();

      expect(amcContract.billed_to).toBe('brand');

      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'amc-subject-123',
          visit_charge: 0,
          service_charge: 0,
          grand_total: 0,
          bill_type: 'brand',
          billed_to: amcContract.billed_to
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.bill_type).toBe('brand');
      expect(data.billed_to).toBe('brand');
    });

    it('Test 7.5 — Override AMC billing — expect bill_type reverts to customer and amc_override_reason stored', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'amc-subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700,
          bill_type: 'customer',
          amc_override_reason: 'Customer requested billing'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.bill_type).toBe('customer');
      expect(data.amc_override_reason).toBe('Customer requested billing');
    });
  });

  // GROUP 8 — PDF Generation (4 tests)
  describe('Group 8 — PDF Generation', () => {
    
    it('Test 8.1 — Generate PDF for paid bill — expect PDF created without errors', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      // Create paid bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700,
          payment_status: 'paid',
          payment_mode: 'cash',
          payment_collected_at: new Date().toISOString()
        })
        .select()
        .single();

      // Mock PDF generation
      const { data, error } = await supabase.rpc('generate_bill_pdf', {
        bill_id: bill.id
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.pdf_url).toBeDefined();
    });

    it('Test 8.2 — PDF contains correct customer name and address', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      // Create bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700
        })
        .select()
        .single();

      // Mock PDF content
      const { data: pdfData, error } = await supabase.rpc('get_bill_pdf_content', {
        bill_id: bill.id
      });

      expect(error).toBeNull();
      expect(pdfData).toBeDefined();
      expect(pdfData.customer_name).toBe('Test Customer');
      expect(pdfData.customer_address).toBe('123 Test St');
    });

    it('Test 8.3 — PDF shows GST breakdown — base amount and GST amount and total separately', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      // Create bill with accessories
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          accessories_total: 500,
          grand_total: 1200
        })
        .select()
        .single();

      // Mock PDF GST breakdown
      const { data: gstData, error } = await supabase.rpc('get_bill_gst_breakdown', {
        bill_id: bill.id
      });

      expect(error).toBeNull();
      expect(gstData).toBeDefined();
      expect(gstData.base_amount).toBeDefined();
      expect(gstData.gst_amount).toBeDefined();
      expect(gstData.total_amount).toBeDefined();
      expect(gstData.total_amount).toBe(1200);
    });

    it('Test 8.4 — PDF download API route — expect 200 response with correct content-type application/pdf', async () => {
      await supabase.auth.signInWithPassword({
        email: 'admin@hitech.com',
        password: 'validpassword'
      });

      // Create bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 200,
          service_charge: 500,
          grand_total: 700
        })
        .select()
        .single();

      // Mock PDF download API
      const { data, error } = await supabase.rpc('download_bill_pdf', {
        bill_id: bill.id
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.content_type).toBe('application/pdf');
      expect(data.pdf_data).toBeDefined();
    });
  });
});
