import { vi } from 'vitest';

// Global persistent data store for testing
const persistentMockData: Record<string, any[]> = {
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
  inventory_accuracy_metrics: [],
  digital_bag_sessions: [],
  digital_bag_items: [],
  digital_bag_consumptions: [],
  subject_accessories: [],
  subject_bills: []
};

// Reset function for test isolation
function resetMockData() {
  // Keep profiles but reset other data
  Object.keys(persistentMockData).forEach(key => {
    if (key !== 'profiles') {
      persistentMockData[key] = [];
    }
  });
}

// Mock Supabase client for inventory testing
export function createMockSupabaseClient() {
  const mockData = persistentMockData;

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
              // Enhanced validation for required fields
              if (!data.name || data.name.trim() === '') {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Product name is required', code: '400' }
                });
              }
              
              if (!data.material_code || data.material_code.trim() === '') {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Material code is required', code: '400' }
                });
              }
              
              if (!data.category_id || data.category_id.trim() === '') {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Category is required', code: '400' }
                });
              }
              
              if (!data.type_id || data.type_id.trim() === '') {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Product type is required', code: '400' }
                });
              }
              
              // Validate MRP and purchase price
              if (data.mrp !== undefined && data.mrp <= 0) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'MRP must be greater than zero', code: '400' }
                });
              }
              
              if (data.purchase_price !== undefined && data.purchase_price <= 0) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Purchase price must be greater than zero', code: '400' }
                });
              }
              
              // Auto-convert material_code to uppercase FIRST
              data.material_code = data.material_code.toUpperCase();
              
              // Validate material code format and length
              const materialCodePattern = /^[A-Z0-9_-]+$/;
              if (!materialCodePattern.test(data.material_code)) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Material code can only contain letters, numbers, dash, and underscore', code: '400' }
                });
              }
              
              // Validate material code length (max 100 characters)
              if (data.material_code.length > 100) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Material code cannot exceed 100 characters', code: '400' }
                });
              }
              
              // Check for duplicate material code (case insensitive)
              const existing = mockData[table]?.find(item => 
                item.material_code?.toUpperCase() === data.material_code?.toUpperCase()
              );
              
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
              // In mock, allow empty names (as per test comment)
              // In real DB, this would fail validation
              
              // But still check for duplicates (unless name is empty)
              if (data.name && data.name.trim() !== '') {
                const existing = mockData[table]?.find(type => type.name.toLowerCase() === data.name.toLowerCase());
                if (existing) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Type already exists', code: '23505' }
                  });
                }
              }
            }

            // Handle both single object and array inserts
            const dataArray = Array.isArray(data) ? data : [data];

            // For array inserts, check duplicates within the array
            if (Array.isArray(data)) {
              const names = data.map(item => item.name?.toLowerCase()).filter(Boolean);
              const uniqueNames = new Set(names);
              if (names.length !== uniqueNames.size) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Duplicate names in batch insert', code: '23505' }
                });
              }
            }

            for (const item of dataArray) {
              // Validate each item
              if (table === 'inventory_products') {
                if (!item.name || item.name.trim() === '') {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Product name is required', code: '400' }
                  });
                }
                
                if (!item.material_code || item.material_code.trim() === '') {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Material code is required', code: '400' }
                  });
                }
                
                if (!item.category_id || item.category_id.trim() === '') {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Category is required', code: '400' }
                  });
                }
                
                if (!item.type_id || item.type_id.trim() === '') {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Product type is required', code: '400' }
                  });
                }
                
                // Validate MRP and purchase price
                if (item.mrp !== undefined && item.mrp <= 0) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'MRP must be greater than zero', code: '400' }
                  });
                }
                
                if (item.purchase_price !== undefined && item.purchase_price <= 0) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Purchase price must be greater than zero', code: '400' }
                  });
                }
              }
              
              if (table === 'product_types') {
                // In mock, allow empty names (as per test comment)
                // In real DB, this would fail validation
              }
            }
            
            if (table === 'stock_consumptions') {
              // Update current stock levels
              const existingStock = mockData.current_stock_levels?.find(item => item.product_id === data.product_id);
              if (existingStock) {
                existingStock.current_stock -= data.quantity;
              }
            }
            
            // Create the new item for single() method
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
            
            return Promise.resolve({
              data: newItem,
              error: null
            });
          },
          then: (resolve: any) => {
            
            // Validate product categories
            if (table === 'product_categories') {
              if (!data.name) {
                return resolve({
                  data: null,
                  error: { message: 'Category name is required', code: '400' }
                });
              }
              
              const existing = mockData[table]?.find(cat => cat.name.toLowerCase() === data.name.toLowerCase());
              if (existing) {
                return resolve({
                  data: null,
                  error: { message: 'Category already exists', code: '400' }
                });
              }
            }
            
            // Validate product types
            if (table === 'product_types') {
              // In mock, allow empty names (as per test comment)
              // In real DB, this would fail validation
              
              // But still check for duplicates (unless name is empty)
              if (data.name && data.name.trim() !== '') {
                const existing = mockData[table]?.find(type => type.name.toLowerCase() === data.name.toLowerCase());
                if (existing) {
                  return resolve({
                    data: null,
                    error: { message: 'Type already exists', code: '23505' }
                  });
                }
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
            },
            then: (resolve: any) => {
              // Check permissions for updates
              if (table === 'inventory_products' && currentUserRole === 'technician') {
                return resolve({
                  data: null,
                  error: { message: 'Permission denied', code: '42501' }
                });
              }

              if (table === 'stock_entries' && currentUserRole === 'technician') {
                return resolve({
                  data: null,
                  error: { message: 'Permission denied', code: '42501' }
                });
              }

              // For simple update without .single(), we need to find all matching records
              const index = mockData[table]?.findIndex(item => item[column] === value);
              if (index === -1) {
                return resolve({
                  data: null,
                  error: { message: 'Record not found', code: 'PGRST116' }
                });
              }
              
              mockData[table][index] = { ...mockData[table][index], ...data, updated_at: new Date().toISOString() };
              
              return resolve({
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
              
              // Check foreign key constraints
              if (table === 'product_categories') {
                // Check if any ACTIVE products use this category
                const productsUsingCategory = mockData.inventory_products?.filter((product: any) => 
                  product.category_id === deletedItem.id && !product.is_deleted
                );
                if (productsUsingCategory && productsUsingCategory.length > 0) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Cannot delete category with active products', code: '23503' }
                  });
                }
                // Allow deletion if only deleted products exist
              }
              
              if (table === 'product_types') {
                // Check if any ACTIVE products use this type
                const productsUsingType = mockData.inventory_products?.filter((product: any) => 
                  product.type_id === deletedItem.id && !product.is_deleted
                );
                if (productsUsingType && productsUsingType.length > 0) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Cannot delete product type with active products', code: '23503' }
                  });
                }
                // Allow deletion if only deleted products exist
              }
              
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
      }),
      rpc: (functionName: string, params?: any) => {
        // Mock RPC functions
        if (functionName === 'refresh_all_materialized_views') {
          return Promise.resolve({
            data: { success: true },
            error: null
          });
        }
        if (functionName === 'refresh_financial_summaries') {
          return Promise.resolve({
            data: { success: true },
            error: null
          });
        }
        if (functionName === 'refresh_leaderboard') {
          return Promise.resolve({
            data: { success: true },
            error: null
          });
        }
        return Promise.resolve({
          data: null,
          error: { message: 'Function not found', code: '404' }
        });
      }
    },
    resetData: resetMockData
  };

  // Add reset method to mock client
  mockClient.resetData = resetMockData;

  return mockClient as any;
}

// Export reset function for test setup
export { resetMockData };
