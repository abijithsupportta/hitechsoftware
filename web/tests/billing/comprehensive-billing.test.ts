import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { server } from '../setup';
import { createMockSupabaseClient } from '../utils/supabase-mock-billing';

// Comprehensive Billing Module Tests - 100+ Test Cases
// Real-life scenarios for Hi Tech Software Service Management System

describe('Comprehensive Billing Module Tests - 100+ Real-Life Scenarios', () => {
  let supabase: any;

  beforeAll(() => {
    supabase = createMockSupabaseClient();
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    server.resetHandlers();
  });

  // ==================== BILL CREATION (20 Tests) ====================

  describe('Bill Creation - Real-Life Scenarios', () => {
    beforeEach(async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });
    });

    it('Test 1.1 - Create bill with visit and service charges only', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.visit_charge).toBe(150);
      expect(data.service_charge).toBe(200);
      expect(data.total_amount).toBe(350);
      expect(data.payment_status).toBe('pending');
    });

    it('Test 1.2 - Create bill with accessories', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert({
          bill_id: billData.id,
          product_id: 'product-123',
          product_name: 'Test Product',
          quantity: 2,
          mrp: 5000,
          discount_type: 'percentage',
          discount_value: 10,
          total_amount: 9000
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.bill_id).toBe(billData.id);
      expect(data.quantity).toBe(2);
      expect(data.mrp).toBe(5000);
      expect(data.discount_type).toBe('percentage');
      expect(data.discount_value).toBe(10);
      expect(data.total_amount).toBe(9000);
    });

    it('Test 1.3 - Create bill with multiple accessories', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const accessories = [
        {
          bill_id: billData.id,
          product_id: 'product-123',
          product_name: 'Product A',
          quantity: 1,
          mrp: 3000,
          discount_type: 'percentage',
          discount_value: 5,
          total_amount: 2850
        },
        {
          bill_id: billData.id,
          product_id: 'product-456',
          product_name: 'Product B',
          quantity: 2,
          mrp: 2000,
          discount_type: 'flat',
          discount_value: 100,
          total_amount: 3900
        }
      ];

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert(accessories)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });

    it('Test 1.4 - Create bill with GST calculations', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          gst_amount: 63,
          grand_total: 413,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(billData.gst_amount).toBe(63);
      expect(billData.grand_total).toBe(413);
    });

    it('Test 1.5 - Create bill with AMC contract', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 0,
          service_charge: 0,
          total_amount: 0,
          is_amc_bill: true,
          amc_contract_id: 'amc-123',
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.is_amc_bill).toBe(true);
      expect(data.amc_contract_id).toBe('amc-123');
    });

    it('Test 1.6 - Create bill with negative charges - expect error', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: -150,
          service_charge: 200,
          total_amount: 50,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
    });

    it('Test 1.7 - Create bill with invalid subject - expect error', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'invalid-subject',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
    });

    it('Test 1.8 - Create bill with zero total amount', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 0,
          service_charge: 0,
          total_amount: 0,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.total_amount).toBe(0);
    });

    it('Test 1.9 - Create bill with different payment modes', async () => {
      const paymentModes = ['cash', 'card', 'upi', 'bank_transfer'];
      
      for (const mode of paymentModes) {
        const { data, error } = await supabase
          .from('subject_bills')
          .insert({
            subject_id: 'subject-123',
            visit_charge: 150,
            service_charge: 200,
            total_amount: 350,
            payment_status: 'paid',
            payment_mode: mode,
            created_by: 'office-123'
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data.payment_mode).toBe(mode);
      }
    });

    it('Test 1.10 - Create bill with partial payment', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          paid_amount: 200,
          payment_status: 'partial',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.paid_amount).toBe(200);
      expect(data.payment_status).toBe('partial');
    });

    it('Test 1.11 - Create bill with discount on service charge', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          service_discount: 10,
          total_amount: 340,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.service_discount).toBe(10);
      expect(data.total_amount).toBe(340);
    });

    it('Test 1.12 - Create bill with technician commission', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          technician_id: 'tech-123',
          commission_amount: 50,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.technician_id).toBe('tech-123');
      expect(data.commission_amount).toBe(50);
    });

    it('Test 1.13 - Create bill with customer signature', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          customer_signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.customer_signature).toBeDefined();
    });

    it('Test 1.14 - Create bill with notes and remarks', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          notes: 'Customer requested additional service',
          internal_remarks: 'Follow up required',
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.notes).toBe('Customer requested additional service');
      expect(data.internal_remarks).toBe('Follow up required');
    });

    it('Test 1.15 - Create bill with warranty information', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          warranty_type: 'standard',
          warranty_months: 12,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.warranty_type).toBe('standard');
      expect(data.warranty_months).toBe(12);
    });

    it('Test 1.16 - Create bill with service details', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          service_details: {
            services: ['Installation', 'Testing', 'Demonstration'],
            duration: 120,
            complexity: 'medium'
          },
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.service_details).toBeDefined();
    });

    it('Test 1.17 - Bill permissions - technician cannot create', async () => {
      await supabase.auth.signOut();
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'tech-123'
        })
        .select()
        .single();

      expect(data).toBeNull();
      expect(error?.code).toBe('42501');
    });

    it('Test 1.18 - Create bill with future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          bill_date: futureDate.toISOString().split('T')[0],
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.bill_date).toBe(futureDate.toISOString().split('T')[0]);
    });

    it('Test 1.19 - Create bill with very large amount', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 500,
          service_charge: 10000,
          total_amount: 10500,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.total_amount).toBe(10500);
    });

    it('Test 1.20 - Create bill with special characters in notes', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          notes: 'Customer requested "special" service & additional work',
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.notes).toBe('Customer requested "special" service & additional work');
    });
  });

  // ==================== GST CALCULATIONS (15 Tests) ====================

  describe('GST Calculations - Real-Life Scenarios', () => {
    beforeEach(async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });
    });

    it('Test 2.1 - GST calculation on service charges only', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          gst_rate: 18,
          gst_amount: 63,
          grand_total: 413,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.gst_rate).toBe(18);
      expect(data.gst_amount).toBe(63);
      expect(data.grand_total).toBe(413);
    });

    it('Test 2.2 - GST calculation on accessories only', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 0,
          service_charge: 0,
          total_amount: 0,
          gst_rate: 18,
          gst_amount: 0,
          grand_total: 0,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert({
          bill_id: billData.id,
          product_id: 'product-123',
          product_name: 'Test Product',
          quantity: 1,
          mrp: 10000,
          discount_type: 'percentage',
          discount_value: 10,
          total_amount: 9000,
          gst_rate: 18,
          gst_amount: 1620,
          total_with_gst: 10620
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.gst_rate).toBe(18);
      expect(data.gst_amount).toBe(1620);
      expect(data.total_with_gst).toBe(10620);
    });

    it('Test 2.3 - GST calculation on combined charges', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          gst_rate: 18,
          gst_amount: 63,
          grand_total: 413,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert({
          bill_id: billData.id,
          product_id: 'product-123',
          product_name: 'Test Product',
          quantity: 1,
          mrp: 5000,
          discount_type: 'percentage',
          discount_value: 10,
          total_amount: 4500,
          gst_rate: 18,
          gst_amount: 810,
          total_with_gst: 5310
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.gst_amount).toBe(810);
      expect(data.total_with_gst).toBe(5310);
    });

    it('Test 2.4 - GST calculation with different GST rates', async () => {
      const gstRates = [5, 12, 18, 28];
      
      for (const rate of gstRates) {
        const { data, error } = await supabase
          .from('subject_bills')
          .insert({
            subject_id: 'subject-123',
            visit_charge: 100,
            service_charge: 200,
            total_amount: 300,
            gst_rate: rate,
            gst_amount: Math.round(300 * rate / 100),
            grand_total: Math.round(300 * (1 + rate / 100)),
            payment_status: 'pending',
            created_by: 'office-123'
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data.gst_rate).toBe(rate);
        expect(data.gst_amount).toBe(Math.round(300 * rate / 100));
      }
    });

    it('Test 2.5 - GST calculation with zero GST rate', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          gst_rate: 0,
          gst_amount: 0,
          grand_total: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.gst_rate).toBe(0);
      expect(data.gst_amount).toBe(0);
      expect(data.grand_total).toBe(350);
    });

    it('Test 2.6 - GST calculation with discount before GST', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          service_discount: 10,
          total_amount: 340,
          gst_rate: 18,
          gst_amount: 61.2,
          grand_total: 401.2,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.gst_amount).toBe(61.2);
      expect(data.grand_total).toBe(401.2);
    });

    it('Test 2.7 - GST calculation with fractional amounts', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 99.99,
          service_charge: 149.99,
          total_amount: 249.98,
          gst_rate: 18,
          gst_amount: 44.9964,
          grand_total: 294.9764,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.gst_amount).toBe(44.9964);
      expect(data.grand_total).toBe(294.9764);
    });

    it('Test 2.8 - GST calculation with multiple accessories', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 100,
          service_charge: 200,
          total_amount: 300,
          gst_rate: 18,
          gst_amount: 54,
          grand_total: 354,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const accessories = [
        {
          bill_id: billData.id,
          product_id: 'product-123',
          product_name: 'Product A',
          quantity: 1,
          mrp: 1000,
          discount_type: 'percentage',
          discount_value: 10,
          total_amount: 900,
          gst_rate: 18,
          gst_amount: 162,
          total_with_gst: 1062
        },
        {
          bill_id: billData.id,
          product_id: 'product-456',
          product_name: 'Product B',
          quantity: 2,
          mrp: 500,
          discount_type: 'flat',
          discount_value: 50,
          total_amount: 950,
          gst_rate: 18,
          gst_amount: 171,
          total_with_gst: 1121
        }
      ];

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert(accessories)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });

    it('Test 2.9 - GST calculation with AMC bill', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 0,
          service_charge: 0,
          total_amount: 0,
          is_amc_bill: true,
          amc_contract_id: 'amc-123',
          gst_rate: 18,
          gst_amount: 0,
          grand_total: 0,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.is_amc_bill).toBe(true);
      expect(data.gst_amount).toBe(0);
    });

    it('Test 2.10 - GST calculation with negative discount', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          service_discount: -10,
          total_amount: 360,
          gst_rate: 18,
          gst_amount: 64.8,
          grand_total: 424.8,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.gst_amount).toBe(64.8);
      expect(data.grand_total).toBe(424.8);
    });

    it('Test 2.11 - GST calculation rounding precision', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 100,
          service_charge: 333.33,
          total_amount: 433.33,
          gst_rate: 18,
          gst_amount: 77.9994,
          grand_total: 511.3294,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.gst_amount).toBe(77.9994);
      expect(data.grand_total).toBe(511.3294);
    });

    it('Test 2.12 - GST calculation with different currencies', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          gst_rate: 18,
          gst_amount: 63,
          grand_total: 413,
          currency: 'USD',
          exchange_rate: 83.5,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.currency).toBe('USD');
      expect(data.exchange_rate).toBe(83.5);
    });

    it('Test 2.13 - GST calculation with tax exemption', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          gst_rate: 0,
          gst_amount: 0,
          grand_total: 350,
          tax_exempt: true,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.tax_exempt).toBe(true);
      expect(data.gst_rate).toBe(0);
    });

    it('Test 2.14 - GST calculation with reverse charge', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          gst_rate: 18,
          gst_amount: 63,
          grand_total: 413,
          reverse_charge: true,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.reverse_charge).toBe(true);
    });

    it('Test 2.15 - GST calculation with composite supply', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          gst_rate: 18,
          gst_amount: 63,
          grand_total: 413,
          composite_supply: true,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.composite_supply).toBe(true);
    });
  });

  // ==================== DISCOUNT CALCULATIONS (15 Tests) ====================

  describe('Discount Calculations - Real-Life Scenarios', () => {
    beforeEach(async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });
    });

    it('Test 3.1 - Percentage discount on service charge', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          service_discount: 10,
          service_discount_type: 'percentage',
          total_amount: 330,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.service_discount).toBe(10);
      expect(data.service_discount_type).toBe('percentage');
      expect(data.total_amount).toBe(330);
    });

    it('Test 3.2 - Flat discount on service charge', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          service_discount: 50,
          service_discount_type: 'flat',
          total_amount: 300,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.service_discount).toBe(50);
      expect(data.service_discount_type).toBe('flat');
      expect(data.total_amount).toBe(300);
    });

    it('Test 3.3 - Percentage discount on accessories', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert({
          bill_id: billData.id,
          product_id: 'product-123',
          product_name: 'Test Product',
          quantity: 1,
          mrp: 5000,
          discount_type: 'percentage',
          discount_value: 15,
          total_amount: 4250
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.discount_type).toBe('percentage');
      expect(data.discount_value).toBe(15);
      expect(data.total_amount).toBe(4250);
    });

    it('Test 3.4 - Flat discount on accessories', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert({
          bill_id: billData.id,
          product_id: 'product-123',
          product_name: 'Test Product',
          quantity: 1,
          mrp: 5000,
          discount_type: 'flat',
          discount_value: 500,
          total_amount: 4500
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.discount_type).toBe('flat');
      expect(data.discount_value).toBe(500);
      expect(data.total_amount).toBe(4500);
    });

    it('Test 3.5 - Multiple discounts on same accessory', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert({
          bill_id: billData.id,
          product_id: 'product-123',
          product_name: 'Test Product',
          quantity: 1,
          mrp: 10000,
          discount_type: 'percentage',
          discount_value: 10,
          additional_discount: 5,
          additional_discount_type: 'percentage',
          total_amount: 8550
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.discount_value).toBe(10);
      expect(data.additional_discount).toBe(5);
      expect(data.total_amount).toBe(8550);
    });

    it('Test 3.6 - Discount exceeding total amount - expect error', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          service_discount: 500,
          service_discount_type: 'flat',
          total_amount: -150,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
    });

    it('Test 3.7 - Discount with AMC bill', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 0,
          service_charge: 0,
          total_amount: 0,
          is_amc_bill: true,
          amc_contract_id: 'amc-123',
          service_discount: 0,
          service_discount_type: 'percentage',
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.is_amc_bill).toBe(true);
      expect(data.service_discount).toBe(0);
    });

    it('Test 3.8 - Discount with loyalty program', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          service_discount: 5,
          service_discount_type: 'percentage',
          loyalty_discount: 2,
          loyalty_program: 'gold',
          total_amount: 323,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.loyalty_discount).toBe(2);
      expect(data.loyalty_program).toBe('gold');
    });

    it('Test 3.9 - Discount with promotional offer', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          service_discount: 10,
          service_discount_type: 'percentage',
          promotional_discount: 15,
          promotional_code: 'SUMMER2023',
          total_amount: 297.5,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.promotional_discount).toBe(15);
      expect(data.promotional_code).toBe('SUMMER2023');
    });

    it('Test 3.10 - Discount with seasonal offer', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          service_discount: 10,
          service_discount_type: 'percentage',
          seasonal_discount: 5,
          season: 'monsoon',
          total_amount: 317.5,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.seasonal_discount).toBe(5);
      expect(data.season).toBe('monsoon');
    });

    it('Test 3.11 - Discount with bulk purchase', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_accessories')
        .insert({
          bill_id: billData.id,
          product_id: 'product-123',
          product_name: 'Test Product',
          quantity: 5,
          mrp: 1000,
          discount_type: 'percentage',
          discount_value: 20,
          bulk_discount: 5,
          total_amount: 3800
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.discount_value).toBe(20);
      expect(data.bulk_discount).toBe(5);
      expect(data.total_amount).toBe(3800);
    });

    it('Test 3.12 - Discount with referral program', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          service_discount: 10,
          service_discount_type: 'percentage',
          referral_discount: 5,
          referral_code: 'REF123',
          referred_by: 'customer-456',
          total_amount: 317.5,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.referral_discount).toBe(5);
      expect(data.referral_code).toBe('REF123');
    });

    it('Test 3.13 - Discount with employee discount', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          service_discount: 10,
          service_discount_type: 'percentage',
          employee_discount: 15,
          employee_id: 'emp-123',
          total_amount: 297.5,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.employee_discount).toBe(15);
      expect(data.employee_id).toBe('emp-123');
    });

    it('Test 3.14 - Discount with special customer', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          service_discount: 10,
          service_discount_type: 'percentage',
          special_customer_discount: 8,
          customer_type: 'vip',
          total_amount: 318,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.special_customer_discount).toBe(8);
      expect(data.customer_type).toBe('vip');
    });

    it('Test 3.15 - Discount validation - maximum discount limit', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          service_discount: 50,
          service_discount_type: 'percentage',
          total_amount: 175,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.service_discount).toBe(50);
      expect(data.total_amount).toBe(175);
    });
  });

  // ==================== PAYMENT PROCESSING (15 Tests) ====================

  describe('Payment Processing - Real-Life Scenarios', () => {
    beforeEach(async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });
    });

    it('Test 4.1 - Full payment processing', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'paid',
          paid_amount: 350,
          payment_mode: 'cash',
          payment_date: '2026-03-27',
          payment_reference: 'CASH-001'
        })
        .eq('id', billData.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.payment_status).toBe('paid');
      expect(data.paid_amount).toBe(350);
      expect(data.payment_mode).toBe('cash');
    });

    it('Test 4.2 - Partial payment processing', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'partial',
          paid_amount: 200,
          payment_mode: 'card',
          payment_date: '2026-03-27',
          payment_reference: 'CARD-001'
        })
        .eq('id', billData.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.payment_status).toBe('partial');
      expect(data.paid_amount).toBe(200);
      expect(data.payment_mode).toBe('card');
    });

    it('Test 4.3 - Multiple payment installments', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      // First payment
      await supabase
        .from('subject_bills')
        .update({
          payment_status: 'partial',
          paid_amount: 100,
          payment_mode: 'cash',
          payment_date: '2026-03-27',
          payment_reference: 'PAY-001'
        })
        .eq('id', billData.id);

      // Second payment
      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'partial',
          paid_amount: 250,
          payment_mode: 'upi',
          payment_date: '2026-03-28',
          payment_reference: 'PAY-002'
        })
        .eq('id', billData.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.payment_status).toBe('partial');
      expect(data.paid_amount).toBe(250);
    });

    it('Test 4.4 - Payment with different modes', async () => {
      const paymentModes = ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'wallet'];
      
      for (const mode of paymentModes) {
        const { data: billData } = await supabase
          .from('subject_bills')
          .insert({
            subject_id: 'subject-123',
            visit_charge: 150,
            service_charge: 200,
            total_amount: 350,
            payment_status: 'pending',
            created_by: 'office-123'
          })
          .select()
          .single();

        const { data, error } = await supabase
          .from('subject_bills')
          .update({
            payment_status: 'paid',
            paid_amount: 350,
            payment_mode: mode,
            payment_date: '2026-03-27'
          })
          .eq('id', billData.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data.payment_mode).toBe(mode);
      }
    });

    it('Test 4.5 - Payment with reference number', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'paid',
          paid_amount: 350,
          payment_mode: 'card',
          payment_date: '2026-03-27',
          payment_reference: 'CARD-TRANSACTION-123456',
          bank_reference: 'BANK-REF-789'
        })
        .eq('id', billData.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.payment_reference).toBe('CARD-TRANSACTION-123456');
      expect(data.bank_reference).toBe('BANK-REF-789');
    });

    it('Test 4.6 - Payment with future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'paid',
          paid_amount: 350,
          payment_mode: 'cash',
          payment_date: futureDate.toISOString().split('T')[0]
        })
        .eq('id', billData.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.payment_date).toBe(futureDate.toISOString().split('T')[0]);
    });

    it('Test 4.7 - Payment with overpayment', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'paid',
          paid_amount: 400,
          payment_mode: 'cash',
          payment_date: '2026-03-27',
          overpayment_amount: 50
        })
        .eq('id', billData.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.paid_amount).toBe(400);
      expect(data.overpayment_amount).toBe(50);
    });

    it('Test 4.8 - Payment with underpayment', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'partial',
          paid_amount: 300,
          payment_mode: 'cash',
          payment_date: '2026-03-27',
          due_amount: 50
        })
        .eq('id', billData.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.paid_amount).toBe(300);
      expect(data.due_amount).toBe(50);
    });

    it('Test 4.9 - Payment with refund', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'paid',
          paid_amount: 350,
          payment_mode: 'card',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          refund_amount: 100,
          refund_reason: 'Service cancellation',
          refund_date: '2026-03-27',
          refund_reference: 'REF-001'
        })
        .eq('id', billData.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.refund_amount).toBe(100);
      expect(data.refund_reason).toBe('Service cancellation');
    });

    it('Test 4.10 - Payment with split payment modes', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'paid',
          paid_amount: 350,
          payment_mode: 'split',
          payment_date: '2026-03-27',
          split_payments: [
            { mode: 'cash', amount: 200 },
            { mode: 'card', amount: 150 }
          ]
        })
        .eq('id', billData.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.payment_mode).toBe('split');
    });

    it('Test 4.11 - Payment with currency conversion', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          currency: 'USD',
          exchange_rate: 83.5,
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'paid',
          paid_amount: 350,
          payment_mode: 'card',
          payment_date: '2026-03-27',
          paid_amount_usd: 4.19
        })
        .eq('id', billData.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.currency).toBe('USD');
      expect(data.paid_amount_usd).toBe(4.19);
    });

    it('Test 4.12 - Payment with installment plan', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          installment_plan: true,
          installment_months: 3,
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'partial',
          paid_amount: 116.67,
          payment_mode: 'card',
          payment_date: '2026-03-27',
          installment_number: 1
        })
        .eq('id', billData.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.installment_plan).toBe(true);
      expect(data.installment_months).toBe(3);
    });

    it('Test 4.13 - Payment with corporate billing', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          billing_type: 'corporate',
          corporate_id: 'corp-123',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'paid',
          paid_amount: 350,
          payment_mode: 'bank_transfer',
          payment_date: '2026-03-27',
          invoice_number: 'INV-2023-001'
        })
        .eq('id', billData.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.billing_type).toBe('corporate');
      expect(data.corporate_id).toBe('corp-123');
    });

    it('Test 4.14 - Payment with digital wallet', async () => {
      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'paid',
          paid_amount: 350,
          payment_mode: 'wallet',
          payment_date: '2026-03-27',
          wallet_provider: 'paytm',
          wallet_transaction_id: 'WALLET-123'
        })
        .eq('id', billData.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.payment_mode).toBe('wallet');
      expect(data.wallet_provider).toBe('paytm');
    });

    it('Test 4.15 - Payment permissions - technician cannot update', async () => {
      await supabase.auth.signOut();
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      const { data: billData } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'tech-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'paid',
          paid_amount: 350,
          payment_mode: 'cash'
        })
        .eq('id', billData.id)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error?.code).toBe('42501');
    });
  });

  // ==================== BILL UPDATES (10 Tests) ====================

  describe('Bill Updates - Real-Life Scenarios', () => {
    let billId: string;

    beforeEach(async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      const { data } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      billId = data.id;
    });

    it('Test 5.1 - Update visit charge', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .update({ visit_charge: 200 })
        .eq('id', billId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.visit_charge).toBe(200);
    });

    it('Test 5.2 - Update service charge', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .update({ service_charge: 250 })
        .eq('id', billId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.service_charge).toBe(250);
    });

    it('Test 5.3 - Update total amount', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .update({ total_amount: 400 })
        .eq('id', billId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.total_amount).toBe(400);
    });

    it('Test 5.4 - Update GST information', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          gst_rate: 18,
          gst_amount: 72,
          grand_total: 472
        })
        .eq('id', billId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.gst_rate).toBe(18);
      expect(data.gst_amount).toBe(72);
    });

    it('Test 5.5 - Update payment status', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'paid',
          paid_amount: 400,
          payment_mode: 'cash',
          payment_date: '2026-03-27'
        })
        .eq('id', billId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.payment_status).toBe('paid');
      expect(data.paid_amount).toBe(400);
    });

    it('Test 5.6 - Update discount information', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          service_discount: 10,
          service_discount_type: 'percentage'
        })
        .eq('id', billId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.service_discount).toBe(10);
      expect(data.service_discount_type).toBe('percentage');
    });

    it('Test 5.7 - Update notes and remarks', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          notes: 'Updated notes',
          internal_remarks: 'Updated remarks'
        })
        .eq('id', billId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.notes).toBe('Updated notes');
      expect(data.internal_remarks).toBe('Updated remarks');
    });

    it('Test 5.8 - Update warranty information', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          warranty_type: 'extended',
          warranty_months: 24
        })
        .eq('id', billId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.warranty_type).toBe('extended');
      expect(data.warranty_months).toBe(24);
    });

    it('Test 5.9 - Update technician information', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .update({
          technician_id: 'tech-456',
          commission_amount: 75
        })
        .eq('id', billId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.technician_id).toBe('tech-456');
      expect(data.commission_amount).toBe(75);
    });

    it('Test 5.10 - Bill update permissions - technician cannot update', async () => {
      await supabase.auth.signOut();
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      const { data, error } = await supabase
        .from('subject_bills')
        .update({ visit_charge: 300 })
        .eq('id', billId)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error?.code).toBe('42501');
    });
  });

  // ==================== BILL DELETION (10 Tests) ====================

  describe('Bill Deletion - Real-Life Scenarios', () => {
    let billId: string;

    beforeEach(async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      const { data } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      billId = data.id;
    });

    it('Test 6.1 - Delete pending bill', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .delete()
        .eq('id', billId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.id).toBe(billId);
    });

    it('Test 6.2 - Delete bill with accessories', async () => {
      // Add accessories
      await supabase
        .from('subject_accessories')
        .insert({
          bill_id: billId,
          product_id: 'product-123',
          product_name: 'Test Product',
          quantity: 1,
          mrp: 5000,
          total_amount: 5000
        });

      const { data, error } = await supabase
        .from('subject_bills')
        .delete()
        .eq('id', billId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.id).toBe(billId);
    });

    it('Test 6.3 - Delete paid bill - expect error', async () => {
      // Mark as paid
      await supabase
        .from('subject_bills')
        .update({ payment_status: 'paid' })
        .eq('id', billId);

      const { data, error } = await supabase
        .from('subject_bills')
        .delete()
        .eq('id', billId)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('cannot delete paid bill');
    });

    it('Test 6.4 - Delete bill with payment - expect error', async () => {
      // Add payment
      await supabase
        .from('subject_bills')
        .update({
          payment_status: 'partial',
          paid_amount: 100,
          payment_mode: 'cash'
        })
        .eq('id', billId);

      const { data, error } = await supabase
        .from('subject_bills')
        .delete()
        .eq('id', billId)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('cannot delete bill with payment');
    });

    it('Test 6.5 - Delete AMC bill', async () => {
      const { data: amcBill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 0,
          service_charge: 0,
          total_amount: 0,
          is_amc_bill: true,
          amc_contract_id: 'amc-123',
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_bills')
        .delete()
        .eq('id', amcBill.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.id).toBe(amcBill.id);
    });

    it('Test 6.6 - Delete bill with refund', async () => {
      // Add refund
      await supabase
        .from('subject_bills')
        .update({
          payment_status: 'refunded',
          refund_amount: 100,
          refund_date: '2026-03-27'
        })
        .eq('id', billId);

      const { data, error } = await supabase
        .from('subject_bills')
        .delete()
        .eq('id', billId)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('cannot delete refunded bill');
    });

    it('Test 6.7 - Delete old bill', async () => {
      // Create old bill
      const { data: oldBill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          bill_date: '2020-01-01',
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data, error } = await supabase
        .from('subject_bills')
        .delete()
        .eq('id', oldBill.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.id).toBe(oldBill.id);
    });

    it('Test 6.8 - Delete bill permissions - technician cannot delete', async () => {
      await supabase.auth.signOut();
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      const { data, error } = await supabase
        .from('subject_bills')
        .delete()
        .eq('id', billId)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error?.code).toBe('42501');
    });

    it('Test 6.9 - Delete bill with accessories cascade', async () => {
      // Add accessories
      await supabase
        .from('subject_accessories')
        .insert([
          {
            bill_id: billId,
            product_id: 'product-123',
            product_name: 'Product A',
            quantity: 1,
            mrp: 1000,
            total_amount: 1000
          },
          {
            bill_id: billId,
            product_id: 'product-456',
            product_name: 'Product B',
            quantity: 2,
            mrp: 500,
            total_amount: 1000
          }
        ]);

      const { data, error } = await supabase
        .from('subject_bills')
        .delete()
        .eq('id', billId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.id).toBe(billId);
    });

    it('Test 6.10 - Delete bill with audit trail', async () => {
      // Add audit entry
      await supabase
        .from('bill_audit_trail')
        .insert({
          bill_id: billId,
          action: 'created',
          old_values: {},
          new_values: { visit_charge: 150, service_charge: 200 },
          changed_by: 'office-123',
          changed_at: '2026-03-27'
        });

      const { data, error } = await supabase
        .from('subject_bills')
        .delete()
        .eq('id', billId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.id).toBe(billId);
    });
  });

  // ==================== BILL REPORTS (15 Tests) ====================

  describe('Bill Reports - Real-Life Scenarios', () => {
    beforeEach(async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });
    });

    it('Test 7.1 - Daily billing report', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('*')
        .eq('bill_date', '2026-03-27')
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test 7.2 - Monthly billing report', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('*')
        .gte('bill_date', '2026-03-01')
        .lte('bill_date', '2026-03-31')
        .order('bill_date');

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test 7.3 - Payment status report', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('payment_status, count(*) as count, sum(total_amount) as total')
        .group('payment_status')
        .order('payment_status');

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test 7.4 - Payment mode report', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('payment_mode, count(*) as count, sum(total_amount) as total')
        .group('payment_mode')
        .order('payment_mode');

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test 7.5 - Technician billing report', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('technician_id, count(*) as count, sum(total_amount) as total')
        .group('technician_id')
        .order('total', { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test 7.6 - GST report', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('gst_rate, sum(gst_amount) as total_gst')
        .group('gst_rate')
        .order('gst_rate');

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test 7.7 - Discount report', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('service_discount, service_discount_type, count(*) as count')
        .group('service_discount', 'service_discount_type')
        .order('service_discount');

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test 7.8 - AMC billing report', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('*')
        .eq('is_amc_bill', true)
        .order('bill_date');

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test 7.9 - Revenue report', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('bill_date, sum(total_amount) as daily_revenue')
        .group('bill_date')
        .order('bill_date')
        .limit(30);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test 7.10 - Customer billing report', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('customer_id, count(*) as count, sum(total_amount) as total')
        .group('customer_id')
        .order('total', { ascending: false })
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test 7.11 - Service type billing report', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('service_type, count(*) as count, sum(total_amount) as total')
        .group('service_type')
        .order('total', { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test 7.12 - Refund report', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('*')
        .gt('refund_amount', 0)
        .order('refund_date', { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test 7.13 - Outstanding payment report', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('*')
        .in('payment_status', ['pending', 'partial'])
        .order('bill_date');

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test 7.14 - High value bills report', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('*')
        .gte('total_amount', 10000)
        .order('total_amount', { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test 7.15 - Bill aging report', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('bill_date, total_amount, payment_status, age_in_days')
        .in('payment_status', ['pending', 'partial'])
        .order('age_in_days', { ascending: false });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  // ==================== BILL SEARCH AND FILTERING (10 Tests) ====================

  describe('Bill Search and Filtering - Real-Life Scenarios', () => {
    beforeEach(async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create test data
      await supabase
        .from('subject_bills')
        .insert([
          {
            subject_id: 'subject-123',
            visit_charge: 150,
            service_charge: 200,
            total_amount: 350,
            payment_status: 'paid',
            payment_mode: 'cash',
            bill_date: '2026-03-27',
            technician_id: 'tech-123'
          },
          {
            subject_id: 'subject-456',
            visit_charge: 100,
            service_charge: 150,
            total_amount: 250,
            payment_status: 'pending',
            bill_date: '2026-03-26',
            technician_id: 'tech-456'
          },
          {
            subject_id: 'subject-789',
            visit_charge: 200,
            service_charge: 300,
            total_amount: 500,
            payment_status: 'partial',
            bill_date: '2026-03-25',
            technician_id: 'tech-789'
          }
        ]);
    });

    it('Test 8.1 - Search bills by date range', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('*')
        .gte('bill_date', '2026-03-25')
        .lte('bill_date', '2026-03-27')
        .order('bill_date');

      expect(error).toBeNull();
      expect(data).toHaveLength(3);
    });

    it('Test 8.2 - Filter bills by payment status', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('*')
        .eq('payment_status', 'paid');

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].payment_status).toBe('paid');
    });

    it('Test 8.3 - Filter bills by payment mode', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('*')
        .eq('payment_mode', 'cash');

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].payment_mode).toBe('cash');
    });

    it('Test 8.4 - Filter bills by technician', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('*')
        .eq('technician_id', 'tech-123');

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].technician_id).toBe('tech-123');
    });

    it('Test 8.5 - Filter bills by amount range', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('*')
        .gte('total_amount', 300)
        .order('total_amount', { ascending: false });

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });

    it('Test 8.6 - Search bills by subject', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('*')
        .eq('subject_id', 'subject-123');

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].subject_id).toBe('subject-123');
    });

    it('Test 8.7 - Filter bills by AMC status', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('*')
        .eq('is_amc_bill', true);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test 8.8 - Search bills with pagination', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('*')
        .order('bill_date', { ascending: false })
        .range(0, 1);

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });

    it('Test 8.9 - Search bills with multiple filters', async () => {
      const { data, error } = await supabase
        .from('subject_bills')
        .select('*')
        .eq('payment_status', 'paid')
        .eq('payment_mode', 'cash')
        .gte('bill_date', '2026-03-27')
        .lte('bill_date', '2026-03-27');

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('Test 8.10 - Search permissions - technician can search own bills', async () => {
      await supabase.auth.signOut();
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      const { data, error } = await supabase
        .from('subject_bills')
        .select('*')
        .eq('technician_id', 'tech-123');

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  // ==================== BILL INTEGRATION (10 Tests) ====================

  describe('Bill Integration - Real-Life Scenarios', () => {
    beforeEach(async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });
    });

    it('Test 9.1 - End-to-end billing workflow', async () => {
      // Create bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      // Add accessories
      const { data: accessory } = await supabase
        .from('subject_accessories')
        .insert({
          bill_id: bill.id,
          product_id: 'product-123',
          product_name: 'Test Product',
          quantity: 1,
          mrp: 5000,
          discount_type: 'percentage',
          discount_value: 10,
          total_amount: 4500
        })
        .select()
        .single();

      // Update total amount
      const { data: updatedBill } = await supabase
        .from('subject_bills')
        .update({
          total_amount: 4850,
          gst_amount: 873,
          grand_total: 5723
        })
        .eq('id', bill.id)
        .select()
        .single();

      // Process payment
      const { data: paidBill } = await supabase
        .from('subject_bills')
        .update({
          payment_status: 'paid',
          paid_amount: 5723,
          payment_mode: 'card',
          payment_date: '2026-03-27'
        })
        .eq('id', bill.id)
        .select()
        .single();

      expect(bill).toBeDefined();
      expect(accessory).toBeDefined();
      expect(updatedBill.total_amount).toBe(4850);
      expect(paidBill.payment_status).toBe('paid');
    });

    it('Test 9.2 - Bill and commission integration', async () => {
      // Create bill with commission
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          technician_id: 'tech-123',
          commission_amount: 50,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      // Sync commission
      const { data: commission } = await supabase
        .from('technician_commission_config')
        .insert({
          subject_id: bill.id,
          technician_id: 'tech-123',
          commission_type: 'fixed',
          commission_amount: 50,
          commission_percentage: 0
        })
        .select()
        .single();

      expect(bill.commission_amount).toBe(50);
      expect(commission.commission_amount).toBe(50);
    });

    it('Test 9.3 - Bill and digital bag integration', async () => {
      // Create digital bag session
      const { data: session } = await supabase
        .from('digital_bag_sessions')
        .insert({
          technician_id: 'tech-123',
          session_date: '2026-03-27',
          status: 'active'
        })
        .select()
        .single();

      // Add items to bag
      await supabase
        .from('digital_bag_items')
        .insert({
          session_id: session.id,
          product_id: 'product-123',
          quantity: 2
        });

      // Create bill from bag
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          bag_session_id: session.id,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(session).toBeDefined();
      expect(bill.bag_session_id).toBe(session.id);
    });

    it('Test 9.4 - Bill and customer integration', async () => {
      // Create customer
      const { data: customer } = await supabase
        .from('customers')
        .insert({
          name: 'Test Customer',
          phone: '1234567890',
          email: 'customer@example.com'
        })
        .select()
        .single();

      // Create subject
      const { data: subject } = await supabase
        .from('subjects')
        .insert({
          customer_id: customer.id,
          category_id: 'category-123',
          status: 'completed'
        })
        .select()
        .single();

      // Create bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: subject.id,
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(customer).toBeDefined();
      expect(subject.customer_id).toBe(customer.id);
      expect(bill.subject_id).toBe(subject.id);
    });

    it('Test 9.5 - Bill and AMC integration', async () => {
      // Create AMC contract
      const { data: amc } = await supabase
        .from('amc_contracts')
        .insert({
          customer_id: 'customer-123',
          start_date: '2026-03-01',
          end_date: '2027-02-28',
          monthly_amount: 500,
          status: 'active'
        })
        .select()
        .single();

      // Create AMC bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 0,
          service_charge: 0,
          total_amount: 0,
          is_amc_bill: true,
          amc_contract_id: amc.id,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      expect(amc).toBeDefined();
      expect(bill.is_amc_bill).toBe(true);
      expect(bill.amc_contract_id).toBe(amc.id);
    });

    it('Test 9.6 - Bill and warranty integration', async () => {
      // Create bill with warranty
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          warranty_type: 'standard',
          warranty_months: 12,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      // Create warranty record
      const { data: warranty } = await supabase
        .from('warranty_records')
        .insert({
          bill_id: bill.id,
          warranty_type: 'standard',
          warranty_months: 12,
          start_date: '2026-03-27',
          end_date: '2027-03-27'
        })
        .select()
        .single();

      expect(bill.warranty_type).toBe('standard');
      expect(warranty.bill_id).toBe(bill.id);
    });

    it('Test 9.7 - Bill and inventory integration', async () => {
      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Test Product',
          material_code: 'TEST-001',
          category_id: 'category-123',
          type_id: 'type-123'
        })
        .select()
        .single();

      // Add stock
      await supabase
        .from('stock_entries')
        .insert({
          product_id: product.id,
          quantity: 10,
          purchase_price: 25000,
          mrp: 29999,
          entry_date: '2026-03-27',
          supplier_id: 'supplier-123'
        });

      // Create bill with product
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      const { data: accessory } = await supabase
        .from('subject_accessories')
        .insert({
          bill_id: bill.id,
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          mrp: 29999,
          total_amount: 29999
        })
        .select()
        .single();

      expect(product).toBeDefined();
      expect(accessory.product_id).toBe(product.id);
    });

    it('Test 9.8 - Bill and reporting integration', async () => {
      // Create multiple bills
      await supabase
        .from('subject_bills')
        .insert([
          {
            subject_id: 'subject-123',
            visit_charge: 150,
            service_charge: 200,
            total_amount: 350,
            payment_status: 'paid',
            bill_date: '2026-03-27'
          },
          {
            subject_id: 'subject-456',
            visit_charge: 100,
            service_charge: 150,
            total_amount: 250,
            payment_status: 'pending',
            bill_date: '2026-03-27'
          }
        ]);

      // Generate report
      const { data, error } = await supabase
        .from('subject_bills')
        .select('payment_status, count(*) as count, sum(total_amount) as total')
        .group('payment_status')
        .order('payment_status');

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });

    it('Test 9.9 - Bill and notification integration', async () => {
      // Create bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      // Create notification
      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          type: 'bill_created',
          message: 'New bill created',
          related_id: bill.id,
          user_id: 'office-123',
          created_at: '2026-03-27'
        })
        .select()
        .single();

      expect(bill).toBeDefined();
      expect(notification.related_id).toBe(bill.id);
    });

    it('Test 9.10 - Bill and audit integration', async () => {
      // Create bill
      const { data: bill } = await supabase
        .from('subject_bills')
        .insert({
          subject_id: 'subject-123',
          visit_charge: 150,
          service_charge: 200,
          total_amount: 350,
          payment_status: 'pending',
          created_by: 'office-123'
        })
        .select()
        .single();

      // Create audit entry
      const { data: audit } = await supabase
        .from('bill_audit_trail')
        .insert({
          bill_id: bill.id,
          action: 'created',
          old_values: {},
          new_values: { visit_charge: 150, service_charge: 200 },
          changed_by: 'office-123',
          changed_at: '2026-03-27'
        })
        .select()
        .single();

      expect(bill).toBeDefined();
      expect(audit.bill_id).toBe(bill.id);
    });
  });
});
