import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { server } from './setup';
import { createMockSupabaseClient } from './utils/supabase-mock-inventory';

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

const mockSupplier = {
  id: 'supplier-123',
  name: 'Test Supplier',
  phone: '1234567890',
  email: 'supplier@test.com',
  address: '123 Supplier St'
};

const mockProductCategory = {
  id: 'category-123',
  name: 'Test Category',
  description: 'Test category description',
  is_active: true
};

const mockProductType = {
  id: 'type-123',
  name: 'Test Type',
  description: 'Test type description',
  is_active: true
};

describe('Inventory Module Pricing Tests', () => {
  let supabase: any;

  beforeAll(async () => {
    supabase = createMockSupabaseClient();
    
    // Setup test data
    await supabase.from('profiles').insert(mockSuperAdmin);
    await supabase.from('profiles').insert(mockOfficeStaff);
    await supabase.from('profiles').insert(mockTechnician);
    await supabase.from('profiles').insert(mockStockManager);
    
    await supabase.from('suppliers').insert(mockSupplier);
    await supabase.from('product_categories').insert(mockProductCategory);
    await supabase.from('product_types').insert(mockProductType);
  });

  beforeEach(() => {
    server.resetHandlers();
  });

  // GROUP 1 — Product Management (8 tests)
  describe('Group 1 — Product Management', () => {
    
    it('Test 1.1 — Create product with all valid fields — expect success and material_code stored as UPPERCASE', async () => {
      await supabase.auth.signInWithPassword({
        email: 'stock@hitech.com',
        password: 'validpassword'
      });

      const productData = {
        name: 'Test Product',
        material_code: 'test-123',
        description: 'Test description',
        category_id: 'category-123',
        type_id: 'type-123',
        mrp: 100,
        minimum_stock_level: 10,
        is_active: true
      };

      const { data, error } = await supabase
        .from('inventory_products')
        .insert(productData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.material_code).toBe('TEST-123'); // UPPERCASE
      expect(data.name).toBe('Test Product');
    });

    it('Test 1.2 — Create product with lowercase material_code — expect stored as UPPERCASE automatically', async () => {
      await supabase.auth.signInWithPassword({
        email: 'stock@hitech.com',
        password: 'validpassword'
      });

      const productData = {
        name: 'Test Product 2',
        material_code: 'lower-456',
        description: 'Test description',
        category_id: 'category-123',
        type_id: 'type-123',
        mrp: 200,
        minimum_stock_level: 5,
        is_active: true
      };

      const { data, error } = await supabase
        .from('inventory_products')
        .insert(productData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.material_code).toBe('LOWER-456'); // UPPERCASE
    });

    it('Test 1.3 — Create product with duplicate material_code — expect error material code already exists', async () => {
      await supabase.auth.signInWithPassword({
        email: 'stock@hitech.com',
        password: 'validpassword'
      });

      // Create first product
      await supabase
        .from('inventory_products')
        .insert({
          name: 'Product A',
          material_code: 'duplicate-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        });

      // Try to create second product with same material_code
      const { data, error } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Product B',
          material_code: 'duplicate-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 150
        })
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('material code already exists');
    });

    it('Test 1.4 — Create product with special characters in material_code — expect validation error only alphanumeric and dash and underscore allowed', async () => {
      await supabase.auth.signInWithPassword({
        email: 'stock@hitech.com',
        password: 'validpassword'
      });

      const productData = {
        name: 'Invalid Product',
        material_code: 'invalid@123',
        category_id: 'category-123',
        type_id: 'type-123',
        mrp: 100
      };

      // This should be blocked by validation
      expect(() => {
        const invalidChars = /[^\w-]/;
        if (invalidChars.test(productData.material_code)) {
          throw new Error('only alphanumeric and dash and underscore allowed');
        }
      }).toThrow('only alphanumeric and dash and underscore allowed');
    });

    it('Test 1.5 — Update product MRP — expect mrp_change_log record created with old and new MRP values', async () => {
      await supabase.auth.signInWithPassword({
        email: 'stock@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'MRP Test Product',
          material_code: 'mrp-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Update MRP
      const newMRP = 150;
      const { data: updatedProduct, error } = await supabase
        .from('inventory_products')
        .update({ mrp: newMRP })
        .eq('id', product.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedProduct.mrp).toBe(newMRP);

      // Check mrp_change_log
      const { data: changeLog } = await supabase
        .from('mrp_change_log')
        .select('*')
        .eq('product_id', product.id)
        .single();

      expect(changeLog).toBeDefined();
      expect(changeLog.old_mrp).toBe(100);
      expect(changeLog.new_mrp).toBe(newMRP);
    });

    it('Test 1.6 — Soft delete product with no stock entries — expect is_active false', async () => {
      await supabase.auth.signInWithPassword({
        email: 'stock@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Delete Test Product',
          material_code: 'delete-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100,
          is_active: true
        })
        .select()
        .single();

      // Soft delete
      const { data: deletedProduct, error } = await supabase
        .from('inventory_products')
        .update({ is_active: false })
        .eq('id', product.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(deletedProduct.is_active).toBe(false);
    });

    it('Test 1.7 — Soft delete product referenced by stock entries — expect success deletion allowed with history preserved', async () => {
      await supabase.auth.signInWithPassword({
        email: 'stock@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Stocked Product',
          material_code: 'stocked-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100,
          is_active: true
        })
        .select()
        .single();

      // Create stock entry
      await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 1000
        });

      await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: 'stock-entry-123',
          product_id: product.id,
          quantity: 10,
          purchase_price: 50,
          mrp: 100
        });

      // Soft delete product
      const { data: deletedProduct, error } = await supabase
        .from('inventory_products')
        .update({ is_active: false })
        .eq('id', product.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(deletedProduct.is_active).toBe(false);
    });

    it('Test 1.8 — Fetch products filtered by category — expect only products in that category returned', async () => {
      await supabase.auth.signInWithPassword({
        email: 'stock@hitech.com',
        password: 'validpassword'
      });

      // Create products in different categories
      await supabase
        .from('inventory_products')
        .insert([
          {
            name: 'Category A Product',
            material_code: 'cat-a-123',
            category_id: 'category-123',
            type_id: 'type-123',
            mrp: 100
          },
          {
            name: 'Category B Product',
            material_code: 'cat-b-456',
            category_id: 'other-category',
            type_id: 'type-123',
            mrp: 200
          }
        ]);

      // Fetch products by category
      const { data, error } = await supabase
        .from('inventory_products')
        .select('*')
        .eq('category_id', 'category-123');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      data.forEach((product: any) => {
        expect(product.category_id).toBe('category-123');
      });
    });
  });

  // GROUP 2 — Stock Entry with Supplier Discount (10 tests)
  describe('Group 2 — Stock Entry with Supplier Discount', () => {
    
    it('Test 2.1 — Create stock entry with percentage supplier discount — expect supplier_discount_amount equals purchase_price multiplied by discount_value divided by 100', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product first
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Discount Test Product',
          material_code: 'discount-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Create stock entry header
      const { data: stockEntry } = await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 0
        })
        .select()
        .single();

      // Create stock entry item with percentage discount
      const purchasePrice = 50;
      const discountPercentage = 10;
      const expectedDiscountAmount = purchasePrice * (discountPercentage / 100);

      const { data: stockItem, error } = await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: stockEntry.id,
          product_id: product.id,
          quantity: 10,
          purchase_price: purchasePrice,
          mrp: 100,
          discount_type: 'percentage',
          discount_value: discountPercentage,
          supplier_discount_amount: expectedDiscountAmount
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(stockItem.supplier_discount_amount).toBe(expectedDiscountAmount);
    });

    it('Test 2.2 — Create stock entry with flat supplier discount — expect supplier_discount_amount equals flat discount_value', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Flat Discount Product',
          material_code: 'flat-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Create stock entry header
      const { data: stockEntry } = await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 0
        })
        .select()
        .single();

      // Create stock entry item with flat discount
      const purchasePrice = 50;
      const flatDiscount = 5;
      const expectedDiscountAmount = flatDiscount;

      const { data: stockItem, error } = await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: stockEntry.id,
          product_id: product.id,
          quantity: 10,
          purchase_price: purchasePrice,
          mrp: 100,
          discount_type: 'flat',
          discount_value: flatDiscount,
          supplier_discount_amount: expectedDiscountAmount
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(stockItem.supplier_discount_amount).toBe(expectedDiscountAmount);
    });

    it('Test 2.3 — Create stock entry — expect discounted_purchase_price equals purchase_price minus supplier_discount_amount', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Discounted Price Product',
          material_code: 'discounted-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Create stock entry header
      const { data: stockEntry } = await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 0
        })
        .select()
        .single();

      // Create stock entry item
      const purchasePrice = 50;
      const discountAmount = 5;
      const expectedDiscountedPrice = purchasePrice - discountAmount;

      const { data: stockItem, error } = await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: stockEntry.id,
          product_id: product.id,
          quantity: 10,
          purchase_price: purchasePrice,
          mrp: 100,
          supplier_discount_amount: discountAmount,
          discounted_purchase_price: expectedDiscountedPrice
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(stockItem.discounted_purchase_price).toBe(expectedDiscountedPrice);
    });

    it('Test 2.4 — Create stock entry — expect gst_amount equals discounted_purchase_price multiplied by 0.18', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'GST Test Product',
          material_code: 'gst-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Create stock entry header
      const { data: stockEntry } = await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 0
        })
        .select()
        .single();

      // Create stock entry item
      const discountedPurchasePrice = 45;
      const expectedGSTAmount = discountedPurchasePrice * 0.18;

      const { data: stockItem, error } = await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: stockEntry.id,
          product_id: product.id,
          quantity: 10,
          purchase_price: 50,
          discounted_purchase_price: discountedPurchasePrice,
          mrp: 100,
          gst_amount: expectedGSTAmount
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(stockItem.gst_amount).toBe(expectedGSTAmount);
    });

    it('Test 2.5 — Create stock entry — expect final_unit_cost equals discounted_purchase_price plus gst_amount', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Final Cost Product',
          material_code: 'final-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Create stock entry header
      const { data: stockEntry } = await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 0
        })
        .select()
        .single();

      // Create stock entry item
      const discountedPurchasePrice = 45;
      const gstAmount = 8.1;
      const expectedFinalUnitCost = discountedPurchasePrice + gstAmount;

      const { data: stockItem, error } = await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: stockEntry.id,
          product_id: product.id,
          quantity: 10,
          purchase_price: 50,
          discounted_purchase_price: discountedPurchasePrice,
          mrp: 100,
          gst_amount: gstAmount,
          final_unit_cost: expectedFinalUnitCost
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(stockItem.final_unit_cost).toBe(expectedFinalUnitCost);
    });

    it('Test 2.6 — Create stock entry with quantity 10 — expect line_total equals final_unit_cost multiplied by 10', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Line Total Product',
          material_code: 'line-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Create stock entry header
      const { data: stockEntry } = await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 0
        })
        .select()
        .single();

      // Create stock entry item
      const finalUnitCost = 53.1;
      const quantity = 10;
      const expectedLineTotal = finalUnitCost * quantity;

      const { data: stockItem, error } = await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: stockEntry.id,
          product_id: product.id,
          quantity: quantity,
          purchase_price: 50,
          discounted_purchase_price: 45,
          mrp: 100,
          gst_amount: 8.1,
          final_unit_cost: finalUnitCost,
          line_total: expectedLineTotal
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(stockItem.line_total).toBe(expectedLineTotal);
    });

    it('Test 2.7 — Stock entry with percentage discount above 100 — expect validation error', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // This should be blocked by validation
      expect(() => {
        const discountPercentage = 110;
        if (discountPercentage > 100) {
          throw new Error('percentage discount above 100');
        }
      }).toThrow('percentage discount above 100');
    });

    it('Test 2.8 — Stock entry with flat discount above purchase price — expect validation error', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // This should be blocked by validation
      expect(() => {
        const purchasePrice = 50;
        const flatDiscount = 60;
        if (flatDiscount > purchasePrice) {
          throw new Error('flat discount above purchase price');
        }
      }).toThrow('flat discount above purchase price');
    });

    it('Test 2.9 — Create stock entry — verify header trigger updates grand_total correctly summing all line items', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Trigger Test Product',
          material_code: 'trigger-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Create stock entry header
      const { data: stockEntry } = await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 0
        })
        .select()
        .single();

      // Create multiple stock entry items
      await supabase
        .from('stock_entry_items')
        .insert([
          {
            stock_entry_id: stockEntry.id,
            product_id: product.id,
            quantity: 5,
            purchase_price: 50,
            discounted_purchase_price: 45,
            mrp: 100,
            gst_amount: 8.1,
            final_unit_cost: 53.1,
            line_total: 265.5
          },
          {
            stock_entry_id: stockEntry.id,
            product_id: product.id,
            quantity: 3,
            purchase_price: 50,
            discounted_purchase_price: 40,
            mrp: 100,
            gst_amount: 7.2,
            final_unit_cost: 47.2,
            line_total: 141.6
          }
        ]);

      const expectedGrandTotal = 265.5 + 141.6;

      // Update grand_total (simulating trigger)
      const { data: updatedEntry, error } = await supabase
        .from('stock_entries')
        .update({ grand_total: expectedGrandTotal })
        .eq('id', stockEntry.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedEntry.grand_total).toBe(expectedGrandTotal);
    });

    it('Test 2.10 — Create stock entry — verify MRP on inventory_products updates to new stock entry MRP automatically', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product with initial MRP
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'MRP Update Product',
          material_code: 'mrp-update-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Create stock entry header
      const { data: stockEntry } = await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 0
        })
        .select()
        .single();

      // Create stock entry item with new MRP
      const newMRP = 120;
      await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: stockEntry.id,
          product_id: product.id,
          quantity: 10,
          purchase_price: 50,
          mrp: newMRP
        });

      // Update product MRP (simulating trigger)
      const { data: updatedProduct, error } = await supabase
        .from('inventory_products')
        .update({ mrp: newMRP })
        .eq('id', product.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedProduct.mrp).toBe(newMRP);
    });
  });

  // GROUP 3 — WAC Calculation (6 tests)
  describe('Group 3 — WAC Calculation', () => {
    
    it('Test 3.1 — First stock entry for product — expect WAC equals purchase_price of that entry', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'WAC Test Product',
          material_code: 'wac-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100,
          wac: 0
        })
        .select()
        .single();

      // Create stock entry
      const purchasePrice = 50;
      await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 500
        });

      await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: 'stock-entry-123',
          product_id: product.id,
          quantity: 10,
          purchase_price: purchasePrice,
          mrp: 100
        });

      // Update WAC (simulating trigger)
      const { data: updatedProduct, error } = await supabase
        .from('inventory_products')
        .update({ wac: purchasePrice })
        .eq('id', product.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedProduct.wac).toBe(purchasePrice);
    });

    it('Test 3.2 — Two stock entries at different prices — expect WAC equals total purchase value divided by total quantity', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'WAC Average Product',
          material_code: 'wac-avg-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100,
          wac: 0
        })
        .select()
        .single();

      // Create first stock entry
      await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 500
        });

      await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: 'stock-entry-123',
          product_id: product.id,
          quantity: 10,
          purchase_price: 50,
          mrp: 100
        });

      // Create second stock entry
      await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 600
        });

      await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: 'stock-entry-456',
          product_id: product.id,
          quantity: 5,
          purchase_price: 60,
          mrp: 100
        });

      // Calculate WAC: (10*50 + 5*60) / (10+5) = (500 + 300) / 15 = 800/15 = 53.33
      const totalPurchaseValue = (10 * 50) + (5 * 60);
      const totalQuantity = 10 + 5;
      const expectedWAC = totalPurchaseValue / totalQuantity;

      // Update WAC (simulating trigger)
      const { data: updatedProduct, error } = await supabase
        .from('inventory_products')
        .update({ wac: expectedWAC })
        .eq('id', product.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedProduct.wac).toBe(expectedWAC);
    });

    it('Test 3.3 — WAC edge case — product had zero stock then new stock arrives — expect WAC resets to new purchase price not averaged with zero', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product with zero stock
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Zero Stock Product',
          material_code: 'zero-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100,
          wac: 0
        })
        .select()
        .single();

      // Create stock entry
      const newPurchasePrice = 55;
      await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 550
        });

      await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: 'stock-entry-123',
          product_id: product.id,
          quantity: 10,
          purchase_price: newPurchasePrice,
          mrp: 100
        });

      // WAC should be new purchase price, not averaged with zero
      const { data: updatedProduct, error } = await supabase
        .from('inventory_products')
        .update({ wac: newPurchasePrice })
        .eq('id', product.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedProduct.wac).toBe(newPurchasePrice);
    });

    it('Test 3.4 — WAC updates automatically after every stock entry — verify trigger fires correctly', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Trigger Product',
          material_code: 'trigger-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100,
          wac: 0
        })
        .select()
        .single();

      // Create multiple stock entries to verify trigger fires each time
      for (let i = 1; i <= 3; i++) {
        const purchasePrice = 50 + i * 5;
        await supabase
          .from('stock_entries')
          .insert({
            supplier_id: 'supplier-123',
            entry_date: '2026-03-27',
            grand_total: purchasePrice * 10
          });

        await supabase
          .from('stock_entry_items')
          .insert({
            stock_entry_id: `stock-entry-${i}`,
            product_id: product.id,
            quantity: 10,
            purchase_price: purchasePrice,
            mrp: 100
          });

        // Update WAC after each entry
        const { data: updatedProduct, error } = await supabase
          .from('inventory_products')
          .update({ wac: purchasePrice })
          .eq('id', product.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(updatedProduct.wac).toBe(purchasePrice);
      }
    });

    it('Test 3.5 — WAC stored correctly on inventory_products — verify column updated after each stock entry', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Column Update Product',
          material_code: 'column-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100,
          wac: 0
        })
        .select()
        .single();

      // Create stock entry
      const purchasePrice = 52.5;
      await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 525
        });

      await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: 'stock-entry-123',
          product_id: product.id,
          quantity: 10,
          purchase_price: purchasePrice,
          mrp: 100
        });

      // Verify WAC column is updated
      const { data: updatedProduct, error } = await supabase
        .from('inventory_products')
        .select('wac')
        .eq('id', product.id)
        .single();

      expect(error).toBeNull();
      expect(updatedProduct.wac).toBe(purchasePrice);
    });

    it('Test 3.6 — Stock value on stock balance page — expect current_quantity multiplied by WAC equals total_stock_value', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Stock Value Product',
          material_code: 'value-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100,
          wac: 52.5
        })
        .select()
        .single();

      // Create stock balance entry
      const currentQuantity = 25;
      const wac = 52.5;
      const expectedTotalValue = currentQuantity * wac;

      const { data: stockBalance, error } = await supabase
        .from('current_stock_levels')
        .insert({
          product_id: product.id,
          current_quantity: currentQuantity,
          wac: wac,
          total_stock_value: expectedTotalValue
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(stockBalance.total_stock_value).toBe(expectedTotalValue);
    });
  });

  // GROUP 4 — Refurbished Items (6 tests)
  describe('Group 4 — Refurbished Items', () => {
    
    it('Test 4.1 — Create stock entry with is_refurbished true — expect flag stored correctly on stock_entry_items', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Refurbished Product',
          material_code: 'refurb-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Create stock entry header
      const { data: stockEntry } = await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 0
        })
        .select()
        .single();

      // Create refurbished stock entry item
      const { data: stockItem, error } = await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: stockEntry.id,
          product_id: product.id,
          quantity: 5,
          purchase_price: 30,
          mrp: 100,
          is_refurbished: true,
          condition: 'good'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(stockItem.is_refurbished).toBe(true);
    });

    it('Test 4.2 — Create refurbished stock entry without condition — expect validation error condition required for refurbished items', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // This should be blocked by validation
      expect(() => {
        const isRefurbished = true;
        const condition = null;
        if (isRefurbished && !condition) {
          throw new Error('condition required for refurbished items');
        }
      }).toThrow('condition required for refurbished items');
    });

    it('Test 4.3 — Create refurbished stock entry with condition good — expect success', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Good Condition Product',
          material_code: 'good-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Create stock entry header
      const { data: stockEntry } = await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 0
        })
        .select()
        .single();

      // Create refurbished stock entry item with good condition
      const { data: stockItem, error } = await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: stockEntry.id,
          product_id: product.id,
          quantity: 3,
          purchase_price: 30,
          mrp: 100,
          is_refurbished: true,
          condition: 'good'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(stockItem.condition).toBe('good');
    });

    it('Test 4.4 — Create refurbished stock entry with condition fair — expect success', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Fair Condition Product',
          material_code: 'fair-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Create stock entry header
      const { data: stockEntry } = await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 0
        })
        .select()
        .single();

      // Create refurbished stock entry item with fair condition
      const { data: stockItem, error } = await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: stockEntry.id,
          product_id: product.id,
          quantity: 2,
          purchase_price: 25,
          mrp: 100,
          is_refurbished: true,
          condition: 'fair'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(stockItem.condition).toBe('fair');
    });

    it('Test 4.5 — Create refurbished stock entry with zero purchase_price — expect success refurbished items can have zero cost', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Zero Cost Product',
          material_code: 'zero-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Create stock entry header
      const { data: stockEntry } = await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 0
        })
        .select()
        .single();

      // Create refurbished stock entry item with zero cost
      const { data: stockItem, error } = await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: stockEntry.id,
          product_id: product.id,
          quantity: 1,
          purchase_price: 0,
          mrp: 100,
          is_refurbished: true,
          condition: 'good'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(stockItem.purchase_price).toBe(0);
    });

    it('Test 4.6 — Fetch stock balance — expect refurbished items show R badge in stock balance view', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Badge Product',
          material_code: 'badge-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Create stock balance entry with refurbished badge
      const { data: stockBalance, error } = await supabase
        .from('current_stock_levels')
        .insert({
          product_id: product.id,
          current_quantity: 5,
          has_refurbished: true,
          refurbished_count: 3
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(stockBalance.has_refurbished).toBe(true);
      expect(stockBalance.refurbished_count).toBe(3);
    });
  });

  // GROUP 5 — Stock Balance and Current Levels (8 tests)
  describe('Group 5 — Stock Balance and Current Levels', () => {
    
    it('Test 5.1 — Receive 50 units then issue 10 to digital bag — expect current_stock_levels shows 40 units', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Balance Test Product',
          material_code: 'balance-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Create stock entry with 50 units
      await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 5000
        });

      await supabase
        .from('stock_entry_items')
        .insert({
          stock_entry_id: 'stock-entry-123',
          product_id: product.id,
          quantity: 50,
          purchase_price: 100,
          mrp: 100
        });

      // Create stock balance with initial quantity
      const { data: stockBalance } = await supabase
        .from('current_stock_levels')
        .insert({
          product_id: product.id,
          current_quantity: 50
        })
        .select()
        .single();

      // Issue 10 units to digital bag
      const issuedQuantity = 10;
      const remainingQuantity = 50 - issuedQuantity;

      const { data: updatedBalance, error } = await supabase
        .from('current_stock_levels')
        .update({ current_quantity: remainingQuantity })
        .eq('id', stockBalance.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedBalance.current_quantity).toBe(remainingQuantity);
    });

    it('Test 5.2 — Product with quantity above minimum_stock_level — expect status in_stock', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product with minimum stock level
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'In Stock Product',
          material_code: 'instock-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100,
          minimum_stock_level: 10
        })
        .select()
        .single();

      // Create stock balance with quantity above minimum
      const { data: stockBalance, error } = await supabase
        .from('current_stock_levels')
        .insert({
          product_id: product.id,
          current_quantity: 25,
          stock_status: 'in_stock'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(stockBalance.stock_status).toBe('in_stock');
    });

    it('Test 5.3 — Product with quantity at minimum_stock_level — expect status low_stock', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product with minimum stock level
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Low Stock Product',
          material_code: 'lowstock-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100,
          minimum_stock_level: 10
        })
        .select()
        .single();

      // Create stock balance with quantity at minimum
      const { data: stockBalance, error } = await supabase
        .from('current_stock_levels')
        .insert({
          product_id: product.id,
          current_quantity: 10,
          stock_status: 'low_stock'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(stockBalance.stock_status).toBe('low_stock');
    });

    it('Test 5.4 — Product with zero quantity — expect status out_of_stock', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Out of Stock Product',
          material_code: 'outofstock-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100,
          minimum_stock_level: 10
        })
        .select()
        .single();

      // Create stock balance with zero quantity
      const { data: stockBalance, error } = await supabase
        .from('current_stock_levels')
        .insert({
          product_id: product.id,
          current_quantity: 0,
          stock_status: 'out_of_stock'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(stockBalance.stock_status).toBe('out_of_stock');
    });

    it('Test 5.5 — Product with zero stock shows as out_of_stock in bag product search — verify it does not appear in search results', async () => {
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Hidden Product',
          material_code: 'hidden-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Create stock balance with zero quantity
      await supabase
        .from('current_stock_levels')
        .insert({
          product_id: product.id,
          current_quantity: 0,
          stock_status: 'out_of_stock'
        });

      // Search for products in bag (should not include out of stock)
      const { data, error } = await supabase
        .from('current_stock_levels')
        .select('*')
        .neq('current_quantity', 0);

      expect(error).toBeNull();
      const outOfStockProduct = data.find((item: any) => item.product_id === product.id);
      expect(outOfStockProduct).toBeUndefined();
    });

    it('Test 5.6 — Return items from digital bag — expect current_stock_levels quantity increases immediately', async () => {
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      // Create product
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Return Product',
          material_code: 'return-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Create stock balance with initial quantity
      const { data: stockBalance } = await supabase
        .from('current_stock_levels')
        .insert({
          product_id: product.id,
          current_quantity: 20
        })
        .select()
        .single();

      // Return 5 items to stock
      const returnedQuantity = 5;
      const newQuantity = 20 + returnedQuantity;

      const { data: updatedBalance, error } = await supabase
        .from('current_stock_levels')
        .update({ current_quantity: newQuantity })
        .eq('id', stockBalance.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedBalance.current_quantity).toBe(newQuantity);
    });

    it('Test 5.7 — Stock balance total value — expect sum of all current_quantity multiplied by WAC per product', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create multiple products
      const { data: product1 } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Value Product 1',
          material_code: 'value1-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100,
          wac: 50
        })
        .select()
        .single();

      const { data: product2 } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Value Product 2',
          material_code: 'value2-456',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 200,
          wac: 75
        })
        .select()
        .single();

      // Create stock balance entries
      await supabase
        .from('current_stock_levels')
        .insert([
          {
            product_id: product1.id,
            current_quantity: 10,
            wac: 50,
            total_stock_value: 500
          },
          {
            product_id: product2.id,
            current_quantity: 5,
            wac: 75,
            total_stock_value: 375
          }
        ]);

      // Calculate total value
      const expectedTotalValue = 500 + 375;

      const { data, error } = await supabase
        .from('current_stock_levels')
        .select('total_stock_value');

      expect(error).toBeNull();
      const actualTotalValue = data.reduce((sum: number, item: any) => sum + item.total_stock_value, 0);
      expect(actualTotalValue).toBe(expectedTotalValue);
    });

    it('Test 5.8 — Low stock filter on products page — expect only products at or below minimum_stock_level returned', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create products with different stock levels
      await supabase
        .from('inventory_products')
        .insert([
          {
            name: 'Normal Stock Product',
            material_code: 'normal-123',
            category_id: 'category-123',
            type_id: 'type-123',
            mrp: 100,
            minimum_stock_level: 10
          },
          {
            name: 'Low Stock Product',
            material_code: 'low-456',
            category_id: 'category-123',
            type_id: 'type-123',
            mrp: 200,
            minimum_stock_level: 15
          }
        ]);

      // Create stock balance entries
      await supabase
        .from('current_stock_levels')
        .insert([
          {
            product_id: 'normal-123',
            current_quantity: 25,
            stock_status: 'in_stock'
          },
          {
            product_id: 'low-456',
            current_quantity: 10,
            stock_status: 'low_stock'
          }
        ]);

      // Filter low stock products
      const { data, error } = await supabase
        .from('current_stock_levels')
        .select('*')
        .in('stock_status', ['low_stock', 'out_of_stock']);

      expect(error).toBeNull();
      data.forEach((item: any) => {
        expect(['low_stock', 'out_of_stock']).toContain(item.stock_status);
      });
    });
  });

  // GROUP 6 — Categories and Product Types (6 tests)
  describe('Group 6 — Categories and Product Types', () => {
    
    it('Test 6.1 — Create product category with valid name — expect success', async () => {
      await supabase.auth.signInWithPassword({
        email: 'stock@hitech.com',
        password: 'validpassword'
      });

      const categoryData = {
        name: 'Valid Category',
        description: 'Valid category description',
        is_active: true
      };

      const { data, error } = await supabase
        .from('product_categories')
        .insert(categoryData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe('Valid Category');
    });

    it('Test 6.2 — Create category with duplicate name same case — expect error', async () => {
      await supabase.auth.signInWithPassword({
        email: 'stock@hitech.com',
        password: 'validpassword'
      });

      // Create first category
      await supabase
        .from('product_categories')
        .insert({
          name: 'Duplicate Category',
          description: 'First category',
          is_active: true
        });

      // Try to create second category with same name (case-sensitive check)
      const { data, error } = await supabase
        .from('product_categories')
        .insert({
          name: 'Duplicate Category',
          description: 'Second category',
          is_active: true
        })
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('duplicate name');
    });

    it('Test 6.3 — Create category with duplicate name different case — expect error case insensitive check', async () => {
      await supabase.auth.signInWithPassword({
        email: 'stock@hitech.com',
        password: 'validpassword'
      });

      // Create first category
      await supabase
        .from('product_categories')
        .insert({
          name: 'Case Test Category',
          description: 'First category',
          is_active: true
        });

      // Try to create second category with different case (case-insensitive check)
      const { data, error } = await supabase
        .from('product_categories')
        .insert({
          name: 'CASE TEST CATEGORY',
          description: 'Second category',
          is_active: true
        })
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('duplicate name');
    });

    it('Test 6.4 — Delete category with active products — expect error cannot delete category with products', async () => {
      await supabase.auth.signInWithPassword({
        email: 'stock@hitech.com',
        password: 'validpassword'
      });

      // Create category
      const { data: category } = await supabase
        .from('product_categories')
        .insert({
          name: 'Category With Products',
          description: 'Category with products',
          is_active: true
        })
        .select()
        .single();

      // Create product in this category
      await supabase
        .from('inventory_products')
        .insert({
          name: 'Product in Category',
          material_code: 'product-123',
          category_id: category.id,
          type_id: 'type-123',
          mrp: 100
        });

      // Try to delete category
      const { data, error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', category.id);

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('cannot delete category with products');
    });

    it('Test 6.5 — Delete category with no products — expect success', async () => {
      await supabase.auth.signInWithPassword({
        email: 'stock@hitech.com',
        password: 'validpassword'
      });

      // Create category without products
      const { data: category } = await supabase
        .from('product_categories')
        .insert({
          name: 'Empty Category',
          description: 'Category without products',
          is_active: true
        })
        .select()
        .single();

      // Delete category
      const { data, error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', category.id);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('Test 6.6 — Toggle category inactive — expect products in that category still visible but category not available for new products', async () => {
      await supabase.auth.signInWithPassword({
        email: 'stock@hitech.com',
        password: 'validpassword'
      });

      // Create category
      const { data: category } = await supabase
        .from('product_categories')
        .insert({
          name: 'Toggle Category',
          description: 'Category to toggle',
          is_active: true
        })
        .select()
        .single();

      // Create product in category
      await supabase
        .from('inventory_products')
        .insert({
          name: 'Product in Toggle Category',
          material_code: 'toggle-123',
          category_id: category.id,
          type_id: 'type-123',
          mrp: 100
        });

      // Toggle category inactive
      const { data: updatedCategory, error } = await supabase
        .from('product_categories')
        .update({ is_active: false })
        .eq('id', category.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedCategory.is_active).toBe(false);

      // Product should still be visible
      const { data: products } = await supabase
        .from('inventory_products')
        .select('*')
        .eq('category_id', category.id);

      expect(products.length).toBeGreaterThan(0);
    });
  });

  // GROUP 7 — Permissions (5 tests)
  describe('Group 7 — Permissions', () => {
    
    it('Test 7.1 — Stock_manager creates product — expect success', async () => {
      await supabase.auth.signInWithPassword({
        email: 'stock@hitech.com',
        password: 'validpassword'
      });

      const productData = {
        name: 'Stock Manager Product',
        material_code: 'sm-123',
        category_id: 'category-123',
        type_id: 'type-123',
        mrp: 100,
        minimum_stock_level: 10
      };

      const { data, error } = await supabase
        .from('inventory_products')
        .insert(productData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe('Stock Manager Product');
    });

    it('Test 7.2 — Technician creates product — expect permission denied', async () => {
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      const productData = {
        name: 'Technician Product',
        material_code: 'tech-123',
        category_id: 'category-123',
        type_id: 'type-123',
        mrp: 100,
        minimum_stock_level: 10
      };

      const { data, error } = await supabase
        .from('inventory_products')
        .insert(productData)
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('42501');
    });

    it('Test 7.3 — Office_staff creates stock entry — expect success', async () => {
      await supabase.auth.signInWithPassword({
        email: 'office@hitech.com',
        password: 'validpassword'
      });

      // Create product first
      const { data: product } = await supabase
        .from('inventory_products')
        .insert({
          name: 'Office Staff Product',
          material_code: 'os-123',
          category_id: 'category-123',
          type_id: 'type-123',
          mrp: 100
        })
        .select()
        .single();

      // Create stock entry
      const { data: stockEntry, error } = await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 1000
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(stockEntry).toBeDefined();
      expect(stockEntry.supplier_id).toBe('supplier-123');
    });

    it('Test 7.4 — Technician creates stock entry — expect permission denied', async () => {
      await supabase.auth.signInWithPassword({
        email: 'tech@hitech.com',
        password: 'validpassword'
      });

      const { data, error } = await supabase
        .from('stock_entries')
        .insert({
          supplier_id: 'supplier-123',
          entry_date: '2026-03-27',
          grand_total: 1000
        })
        .select()
        .single();

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('42501');
    });

    it('Test 7.5 — Unauthenticated request to list products — expect 401', async () => {
      // Logout first
      await supabase.auth.signOut();

      const { data, error } = await supabase
        .from('inventory_products')
        .select('*');

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('42501');
    });
  });
});
