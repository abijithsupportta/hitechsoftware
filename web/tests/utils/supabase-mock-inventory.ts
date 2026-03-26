import { vi } from 'vitest';

// Mock Supabase client for inventory pricing testing
export function createMockSupabaseClient() {
  const mockData: Record<string, any[]> = {
    profiles: [],
    suppliers: [],
    product_categories: [],
    product_types: [],
    inventory_products: [],
    stock_entries: [],
    stock_entry_items: [],
    current_stock_levels: [],
    mrp_change_log: []
  };

  const mockClient = {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          eq: (column2: string, value2: any) => ({
            single: () => {
              const index = mockData[table]?.findIndex(item => item[column] === value && item[column2] === value2);
              if (index === -1) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Record not found', code: 'PGRST116' }
                });
              }
              
              return Promise.resolve({
                data: mockData[table][index],
                error: null
              });
            }
          }),
          single: () => {
            const item = mockData[table]?.find(item => item[column] === value);
            return Promise.resolve({
              data: item || null,
              error: null
            });
          },
          neq: (column: string, value: any) => ({
            then: (resolve: any) => resolve({
              data: mockData[table]?.filter(item => item[column] !== value) || [],
              error: null
            })
          }),
          in: (column: string, values: any[]) => ({
            then: (resolve: any) => resolve({
              data: mockData[table]?.filter(item => values.includes(item[column])) || [],
              error: null
            })
          }),
          then: (resolve: any) => resolve({
            data: mockData[table]?.filter(item => item[column] === value) || [],
            error: null
          })
        }),
        then: (resolve: any) => ({
          data: mockData[table] || [],
          error: null
        })
      }),
      insert: (data: any) => ({
        select: (columns?: string) => ({
          single: () => {
            const newItem = {
              id: `${table}-${Date.now()}-${Math.random()}`,
              created_at: new Date().toISOString(),
              ...data
            };
            
            // Special handling for different tables
            if (table === 'inventory_products') {
              // Convert material_code to uppercase
              newItem.material_code = newItem.material_code?.toUpperCase();
              
              // Check for duplicate material_code
              const existingProduct = mockData[table]?.find((p: any) => 
                p.material_code === newItem.material_code
              );
              if (existingProduct) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'material code already exists' }
                });
              }
              
              // Validate material_code format
              if (newItem.material_code && /[^\w-]/.test(newItem.material_code)) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'only alphanumeric and dash and underscore allowed' }
                });
              }
            }
            
            if (table === 'product_categories') {
              // Check for duplicate category name (case-insensitive)
              const existingCategory = mockData[table]?.find((c: any) => 
                c.name?.toLowerCase() === newItem.name?.toLowerCase()
              );
              if (existingCategory) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'duplicate name' }
                });
              }
            }
            
            if (table === 'stock_entry_items') {
              // Calculate pricing fields
              const purchasePrice = newItem.purchase_price || 0;
              const discountType = newItem.discount_type;
              const discountValue = newItem.discount_value || 0;
              
              let supplierDiscountAmount = 0;
              let discountedPurchasePrice = purchasePrice;
              
              if (discountType === 'percentage') {
                if (discountValue > 100) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'percentage discount above 100' }
                  });
                }
                supplierDiscountAmount = purchasePrice * (discountValue / 100);
              } else if (discountType === 'flat') {
                if (discountValue > purchasePrice) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'flat discount above purchase price' }
                  });
                }
                supplierDiscountAmount = discountValue;
              }
              
              discountedPurchasePrice = purchasePrice - supplierDiscountAmount;
              const gstAmount = discountedPurchasePrice * 0.18;
              const finalUnitCost = discountedPurchasePrice + gstAmount;
              const lineTotal = finalUnitCost * (newItem.quantity || 1);
              
              newItem.supplier_discount_amount = supplierDiscountAmount;
              newItem.discounted_purchase_price = discountedPurchasePrice;
              newItem.gst_amount = gstAmount;
              newItem.final_unit_cost = finalUnitCost;
              newItem.line_total = lineTotal;
              
              // Validate refurbished items
              if (newItem.is_refurbished && !newItem.condition) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'condition required for refurbished items' }
                });
              }
            }
            
            if (table === 'current_stock_levels') {
              // Set stock status based on quantity and minimum stock level
              const product = mockData.inventory_products?.find((p: any) => 
                p.id === newItem.product_id
              );
              const minimumStock = product?.minimum_stock_level || 0;
              const currentQuantity = newItem.current_quantity || 0;
              
              let stockStatus = 'out_of_stock';
              if (currentQuantity > minimumStock) {
                stockStatus = 'in_stock';
              } else if (currentQuantity > 0) {
                stockStatus = 'low_stock';
              }
              
              newItem.stock_status = stockStatus;
              newItem.total_stock_value = currentQuantity * (newItem.wac || 0);
            }
            
            mockData[table] = [...(mockData[table] || []), newItem];
            
            return Promise.resolve({
              data: newItem,
              error: null
            });
          }
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: (columns?: string) => ({
            single: () => {
              const index = mockData[table]?.findIndex(item => item[column] === value);
              if (index === -1) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Record not found', code: 'PGRST116' }
                });
              }
              
              // Special handling for updates
              if (table === 'inventory_products') {
                // Create MRP change log if MRP is being updated
                const oldMRP = mockData[table][index].mrp;
                const newMRP = data.mrp;
                if (newMRP && newMRP !== oldMRP) {
                  const changeLogEntry = {
                    id: `mrp-change-${Date.now()}`,
                    product_id: mockData[table][index].id,
                    old_mrp: oldMRP,
                    new_mrp: newMRP,
                    changed_at: new Date().toISOString(),
                    changed_by: 'current-user'
                  };
                  mockData.mrp_change_log = [...(mockData.mrp_change_log || []), changeLogEntry];
                }
              }
              
              const updatedItem = {
                ...mockData[table][index],
                ...data,
                updated_at: new Date().toISOString()
              };
              
              mockData[table][index] = updatedItem;
              
              return Promise.resolve({
                data: updatedItem,
                error: null
              });
            }
          })
        })
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          then: (resolve: any) => {
            // Special handling for category deletion
            if (table === 'product_categories') {
              const categoryId = value;
              const hasProducts = mockData.inventory_products?.some((p: any) => 
                p.category_id === categoryId
              );
              if (hasProducts) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'cannot delete category with products' }
                });
              }
            }
            
            mockData[table] = mockData[table]?.filter(item => item[column] !== value) || [];
            return Promise.resolve({
              data: null,
              error: null
            });
          }
        })
      })
    }),
    rpc: (functionName: string, params?: any) => {
      // Mock RPC functions for inventory
      if (functionName === 'update_stock_entry_grand_total') {
        const stockEntryId = params?.stock_entry_id;
        const items = mockData.stock_entry_items?.filter((item: any) => 
          item.stock_entry_id === stockEntryId
        ) || [];
        const grandTotal = items.reduce((sum: number, item: any) => sum + (item.line_total || 0), 0);
        
        // Update the stock entry
        const index = mockData.stock_entries?.findIndex((entry: any) => 
          entry.id === stockEntryId
        );
        if (index !== -1) {
          mockData.stock_entries[index].grand_total = grandTotal;
        }
        
        return Promise.resolve({
          data: grandTotal,
          error: null
        });
      }
      
      if (functionName === 'update_product_mrp_from_stock_entry') {
        const productId = params?.product_id;
        const newMRP = params?.mrp;
        
        // Update the product MRP
        const index = mockData.inventory_products?.findIndex((product: any) => 
          product.id === productId
        );
        if (index !== -1) {
          mockData.inventory_products[index].mrp = newMRP;
        }
        
        return Promise.resolve({
          data: true,
          error: null
        });
      }
      
      if (functionName === 'update_product_wac') {
        const productId = params?.product_id;
        
        // Calculate WAC from stock entries
        const stockItems = mockData.stock_entry_items?.filter((item: any) => 
          item.product_id === productId
        ) || [];
        
        if (stockItems.length === 0) {
          return Promise.resolve({
            data: 0,
            error: null
          });
        }
        
        const totalPurchaseValue = stockItems.reduce((sum: number, item: any) => 
          sum + (item.purchase_price * item.quantity), 0
        );
        const totalQuantity = stockItems.reduce((sum: number, item: any) => 
          sum + item.quantity, 0
        );
        const wac = totalPurchaseValue / totalQuantity;
        
        // Update the product WAC
        const index = mockData.inventory_products?.findIndex((product: any) => 
          product.id === productId
        );
        if (index !== -1) {
          mockData.inventory_products[index].wac = wac;
        }
        
        return Promise.resolve({
          data: wac,
          error: null
        });
      }
      
      return Promise.resolve({
        data: null,
        error: { message: 'Function not found' }
      });
    },
    auth: {
      signInWithPassword: async ({ email, password }: any) => {
        const validCredentials = {
          'admin@hitech.com': { role: 'super_admin', password: 'validpassword' },
          'office@hitech.com': { role: 'office_staff', password: 'validpassword' },
          'tech@hitech.com': { role: 'technician', password: 'validpassword' },
          'stock@hitech.com': { role: 'stock_manager', password: 'validpassword' }
        };

        const credential = validCredentials[email as keyof typeof validCredentials];
        
        if (credential && password === credential.password) {
          const userData = mockData.profiles?.find((p: any) => p.email === email);
          return {
            data: {
              user: {
                id: userData?.id || email.replace('@', '-').replace('.', '-'),
                email: email,
                user_metadata: { role: credential.role }
              },
              session: {
                access_token: `token-${Date.now()}-${Math.random()}`,
                user: {
                  id: userData?.id || email.replace('@', '-').replace('.', '-'),
                  email: email,
                  user_metadata: { role: credential.role }
                }
              }
            },
            error: null
          };
        }
        
        return {
          data: null,
          error: { message: 'Invalid login credentials' }
        };
      },
      signOut: async () => {
        return {
          data: {},
          error: null
        };
      }
    }
  };
  
  return mockClient;
}

// Mock view queries
export const mockViews = {
  stock_balance_summary: () => ({
    select: () => ({
      then: () => Promise.resolve({
        data: {
          total_products: 100,
          total_value: 50000,
          low_stock_count: 5,
          out_of_stock_count: 2
        },
        error: null
      })
    })
  })
};
