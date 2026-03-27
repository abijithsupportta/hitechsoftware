import { vi } from 'vitest';

// Mock Supabase client for inventory testing
export function createMockSupabaseClient() {
  const mockData: Record<string, any[]> = {
    profiles: [
      { id: 'stock-123', email: 'stock@hitech.com', role: 'stock_manager', display_name: 'Stock Manager' },
      { id: 'office-123', email: 'office@hitech.com', role: 'office_staff', display_name: 'Office Staff' },
      { id: 'tech-123', email: 'tech@hitech.com', role: 'technician', display_name: 'Technician' },
      { id: 'admin-123', email: 'admin@hitech.com', role: 'super_admin', display_name: 'Super Admin' }
    ],
    suppliers: [],
    product_categories: [],
    product_types: [],
    inventory_products: [],
    stock_entries: [],
    stock_entry_items: [],
    stock_consumptions: [],
    current_stock_levels: [],
    mrp_change_log: [],
    inventory_audits: [],
    inventory_discrepancies: [],
    stock_adjustments: [],
    stock_movement_audit: [],
    stock_expiry_tracking: [],
    inventory_valuation: [],
    stock_rotation_analysis: [],
    supplier_performance_audit: [],
    inventory_accuracy_metrics: []
  };

  let currentUserRole: string | null = null;
  let currentUser: any = null;

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
          lt: (column: string, value: any) => ({
            then: (resolve: any) => resolve({
              data: mockData[table]?.filter(item => item[column] < value) || [],
              error: null
            })
          }),
          gt: (column: string, value: any) => ({
            then: (resolve: any) => resolve({
              data: mockData[table]?.filter(item => item[column] > value) || [],
              error: null
            })
          }),
          lte: (column: string, value: any) => ({
            then: (resolve: any) => resolve({
              data: mockData[table]?.filter(item => item[column] <= value) || [],
              error: null
            })
          }),
          gte: (column: string, value: any) => ({
            then: (resolve: any) => resolve({
              data: mockData[table]?.filter(item => item[column] >= value) || [],
              error: null
            })
          }),
          ilike: (column: string, value: any) => ({
            then: (resolve: any) => resolve({
              data: mockData[table]?.filter(item => 
                item[column] && item[column].toString().toLowerCase().includes(value.toString().toLowerCase())
              ) || [],
              error: null
            })
          }),
          order: (column: string, options?: { ascending?: boolean }) => ({
            then: (resolve: any) => {
              const sorted = [...(mockData[table] || [])].sort((a, b) => {
                const aVal = a[column];
                const bVal = b[column];
                if (options?.ascending === false) {
                  return bVal > aVal ? 1 : -1;
                }
                return aVal > bVal ? 1 : -1;
              });
              return resolve({
                data: sorted,
                error: null
              });
            }
          }),
          range: (from: number, to: number) => ({
            then: (resolve: any) => resolve({
              data: mockData[table]?.slice(from, to + 1) || [],
              error: null
            })
          }),
          limit: (count: number) => ({
            then: (resolve: any) => resolve({
              data: mockData[table]?.slice(0, count) || [],
              error: null
            })
          }),
          group: (columns: string) => ({
            then: (resolve: any) => resolve({
              data: mockData[table] || [],
              error: null
            })
          }),
          neq: (column: string, value: any) => ({
            then: (resolve: any) => resolve({
              data: mockData[table]?.filter(item => item[column] !== value) || [],
              error: null
            })
          }),
          in: (column: string, values: any[]) => ({
            then: (resolve: any) => resolve({
              data: mockData[table]?.filter((item: any) => values.includes(item[column])) || [],
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
            // Check permissions for inserts
            if (table === 'inventory_products' && currentUserRole === 'technician') {
              return Promise.resolve({
                data: null,
                error: { message: 'Permission denied', code: '42501' }
              });
            }

            if (table === 'stock_entries' && currentUserRole === 'technician') {
              return Promise.resolve({
                data: null,
                error: { message: 'Permission denied', code: '42501' }
              });
            }

            if (table === 'product_categories' && currentUserRole !== 'stock_manager' && currentUserRole !== 'super_admin') {
              return Promise.resolve({
                data: null,
                error: { message: 'Permission denied', code: '42501' }
              });
            }

            if (table === 'inventory_audits' && currentUserRole !== 'super_admin') {
              return Promise.resolve({
                data: null,
                error: { message: 'Permission denied', code: '42501' }
              });
            }

            // Validate required fields
            if (table === 'inventory_products') {
              if (!data.name || !data.material_code || !data.category_id || !data.type_id) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Required fields missing', code: '400' }
                });
              }
              
              // Auto-convert material_code to uppercase
              data.material_code = data.material_code.toUpperCase();
              
              // Check for duplicate material code (case insensitive)
              const existing = mockData[table]?.find(item => item.material_code?.toUpperCase() === data.material_code?.toUpperCase());
              if (existing) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'material code already exists', code: '23505' }
                });
              }
            }

            if (table === 'stock_entries') {
              if (!data.product_id || !data.quantity || data.quantity <= 0 || !data.purchase_price || !data.mrp) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Invalid stock entry data', code: '400' }
                });
              }
              
              if (data.mrp < data.purchase_price) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'MRP cannot be less than purchase price', code: '400' }
                });
              }
            }

            if (table === 'product_categories') {
              if (!data.name) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Category name is required', code: '400' }
                });
              }
              
              const existing = mockData[table]?.find(cat => cat.name.toLowerCase() === data.name.toLowerCase());
              if (existing) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Category already exists', code: '400' }
                });
              }
            }

            if (table === 'product_types') {
              if (!data.name) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Type name is required', code: '400' }
                });
              }
              
              const existing = mockData[table]?.find(type => type.name.toLowerCase() === data.name.toLowerCase());
              if (existing) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Type already exists', code: '400' }
                });
              }
            }

            const newItem = {
              id: `${table}-${Date.now()}-${Math.random()}`,
              created_at: new Date().toISOString(),
              created_by: currentUser?.id || 'unknown',
              ...data
            };
            
            if (!mockData[table]) {
              mockData[table] = [];
            }
            mockData[table].push(newItem);
            
            // Update related data
            if (table === 'stock_entries') {
              // Update current stock levels
              const existingStock = mockData.current_stock_levels?.find(item => item.product_id === data.product_id);
              if (existingStock) {
                existingStock.current_stock += data.quantity;
                existingStock.total_value += data.quantity * data.purchase_price;
              } else {
                mockData.current_stock_levels.push({
                  product_id: data.product_id,
                  current_stock: data.quantity,
                  total_value: data.quantity * data.purchase_price,
                  wac_price: data.purchase_price
                });
              }
              
              // Update WAC in inventory_products
              const product = mockData.inventory_products?.find(item => item.id === data.product_id);
              if (product) {
                const totalStock = mockData.stock_entries
                  .filter(entry => entry.product_id === data.product_id && !entry.is_refurbished)
                  .reduce((sum, entry) => sum + entry.quantity, 0);
                const totalCost = mockData.stock_entries
                  .filter(entry => entry.product_id === data.product_id && !entry.is_refurbished)
                  .reduce((sum, entry) => sum + (entry.quantity * entry.purchase_price), 0);
                product.wac_price = totalStock > 0 ? totalCost / totalStock : 0;
              }
            }
            
            if (table === 'stock_consumptions') {
              // Update current stock levels
              const existingStock = mockData.current_stock_levels?.find(item => item.product_id === data.product_id);
              if (existingStock) {
                existingStock.current_stock -= data.quantity;
              }
            }
            
            return Promise.resolve({
              data: newItem,
              error: null
            });
          },
          then: (resolve: any) => {
            // For simple insert without .single()
            const newItem = {
              id: `${table}-${Date.now()}-${Math.random()}`,
              created_at: new Date().toISOString(),
              created_by: currentUser?.id || 'unknown',
              ...data
            };
            
            if (!mockData[table]) {
              mockData[table] = [];
            }
            mockData[table].push(newItem);
            
            return resolve({
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
              // Check permissions for updates
              if (table === 'inventory_products' && currentUserRole === 'technician') {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Permission denied', code: '42501' }
                });
              }

              if (table === 'stock_entries' && currentUserRole === 'technician') {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Permission denied', code: '42501' }
                });
              }

              const index = mockData[table]?.findIndex(item => item[column] === value);
              if (index === -1) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Record not found', code: 'PGRST116' }
                });
              }
              
              mockData[table][index] = { ...mockData[table][index], ...data, updated_at: new Date().toISOString() };
              
              return Promise.resolve({
                data: mockData[table][index],
                error: null
              });
            }
          })
        })
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          select: (columns?: string) => ({
            single: () => {
              // Check permissions for deletes
              if (table === 'inventory_products' && currentUserRole === 'technician') {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Permission denied', code: '42501' }
                });
              }

              const index = mockData[table]?.findIndex(item => item[column] === value);
              if (index === -1) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Record not found', code: 'PGRST116' }
                });
              }
              
              const deletedItem = mockData[table][index];
              mockData[table].splice(index, 1);
              
              return Promise.resolve({
                data: deletedItem,
                error: null
              });
            }
          })
        })
      })
    }),
    auth: {
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        const user = mockData.profiles.find(profile => profile.email === email);
        if (user && password === 'validpassword') {
          currentUser = user;
          currentUserRole = user.role;
          return Promise.resolve({
            data: {
              user,
              session: {
                user,
                access_token: 'mock-token',
                refresh_token: 'mock-refresh'
              }
            },
            error: null
          });
        }
        return Promise.resolve({
          data: null,
          error: { message: 'Invalid login credentials' }
        });
      },
      signOut: async () => {
        currentUser = null;
        currentUserRole = null;
        return Promise.resolve({
          data: {},
          error: null
        });
      },
      getSession: async () => {
        return Promise.resolve({
          data: {
            session: currentUser ? {
              user: currentUser,
              access_token: 'mock-token'
            } : null
          },
          error: null
        });
      },
      getUser: async () => {
        return Promise.resolve({
          data: {
            user: currentUser || null
          },
          error: null
        });
      },
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      })
    }
  };

  return mockClient as any;
}
