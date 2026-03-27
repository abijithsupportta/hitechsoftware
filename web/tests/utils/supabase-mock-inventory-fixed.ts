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

  const mockClient: any = {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          eq: (column2: string, value2: any) => ({
            single: () => {
              const item = mockData[table]?.find((item: any) => 
                item[column] === value && item[column2] === value2
              );
              return Promise.resolve({
                data: item || null,
                error: item ? null : { message: 'No rows returned' }
              });
            },
            then: (callback: any) => {
              const items = mockData[table]?.filter((item: any) => 
                item[column] === value && item[column2] === value2
              ) || [];
              return Promise.resolve({
                data: items,
                error: null
              }).then(callback);
            }
          }),
          single: () => {
            const item = mockData[table]?.find((item: any) => item[column] === value);
            return Promise.resolve({
              data: item || null,
              error: item ? null : { message: 'No rows returned' }
            });
          },
          then: (callback: any) => {
            const items = mockData[table]?.filter((item: any) => item[column] === value) || [];
            return Promise.resolve({
              data: items,
              error: null
            }).then(callback);
          },
          ilike: (column: string, pattern: string) => ({
            single: () => {
              const item = mockData[table]?.find((item: any) => 
                item[column] && item[column].toLowerCase().includes(pattern.toLowerCase().replace(/%/g, ''))
              );
              return Promise.resolve({
                data: item || null,
                error: item ? null : { message: 'No rows returned' }
              });
            },
            then: (callback: any) => {
              const items = mockData[table]?.filter((item: any) => 
                item[column] && item[column].toLowerCase().includes(pattern.toLowerCase().replace(/%/g, ''))
              ) || [];
              return Promise.resolve({
                data: items,
                error: null
              }).then(callback);
            }
          }),
          lte: (column: string, value: any) => ({
            single: () => {
              const item = mockData[table]?.find((item: any) => item[column] <= value);
              return Promise.resolve({
                data: item || null,
                error: item ? null : { message: 'No rows returned' }
              });
            },
            then: (callback: any) => {
              const items = mockData[table]?.filter((item: any) => item[column] <= value) || [];
              return Promise.resolve({
                data: items,
                error: null
              }).then(callback);
            }
          }),
          lt: (column: string, value: any) => ({
            single: () => {
              const item = mockData[table]?.find((item: any) => item[column] < value);
              return Promise.resolve({
                data: item || null,
                error: item ? null : { message: 'No rows returned' }
              });
            },
            then: (callback: any) => {
              const items = mockData[table]?.filter((item: any) => item[column] < value) || [];
              return Promise.resolve({
                data: items,
                error: null
              }).then(callback);
            }
          }),
          gt: (column: string, value: any) => ({
            single: () => {
              const item = mockData[table]?.find((item: any) => item[column] > value);
              return Promise.resolve({
                data: item || null,
                error: item ? null : { message: 'No rows returned' }
              });
            },
            then: (callback: any) => {
              const items = mockData[table]?.filter((item: any) => item[column] > value) || [];
              return Promise.resolve({
                data: items,
                error: null
              }).then(callback);
            }
          }),
          gte: (column: string, value: any) => ({
            single: () => {
              const item = mockData[table]?.find((item: any) => item[column] >= value);
              return Promise.resolve({
                data: item || null,
                error: item ? null : { message: 'No rows returned' }
              });
            },
            then: (callback: any) => {
              const items = mockData[table]?.filter((item: any) => item[column] >= value) || [];
              return Promise.resolve({
                data: items,
                error: null
              }).then(callback);
            }
          }),
          order: (column: string, direction?: 'asc' | 'desc') => ({
            single: () => {
              const sorted = [...(mockData[table] || [])].sort((a: any, b: any) => {
                if (direction === 'desc') {
                  return b[column] > a[column] ? 1 : -1;
                }
                return a[column] > b[column] ? 1 : -1;
              });
              return Promise.resolve({
                data: sorted[0] || null,
                error: sorted[0] ? null : { message: 'No rows returned' }
              });
            },
            then: (callback: any) => {
              const sorted = [...(mockData[table] || [])].sort((a: any, b: any) => {
                if (direction === 'desc') {
                  return b[column] > a[column] ? 1 : -1;
                }
                return a[column] > b[column] ? 1 : -1;
              });
              return Promise.resolve({
                data: sorted,
                error: null
              }).then(callback);
            }
          }),
          range: (from: number, to: number) => ({
            single: () => {
              const items = mockData[table]?.slice(from, to + 1);
              return Promise.resolve({
                data: items?.[0] || null,
                error: items?.[0] ? null : { message: 'No rows returned' }
              });
            },
            then: (callback: any) => {
              const items = mockData[table]?.slice(from, to + 1) || [];
              return Promise.resolve({
                data: items,
                error: null
              }).then(callback);
            }
          }),
          limit: (count: number) => ({
            single: () => {
              const item = mockData[table]?.[0];
              return Promise.resolve({
                data: item || null,
                error: item ? null : { message: 'No rows returned' }
              });
            },
            then: (callback: any) => {
              const items = mockData[table]?.slice(0, count) || [];
              return Promise.resolve({
                data: items,
                error: null
              }).then(callback);
            }
          }),
          group: (column: string) => ({
            single: () => {
              const grouped = mockData[table]?.reduce((acc: any, item: any) => {
                const key = item[column];
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
              }, {});
              return Promise.resolve({
                data: Object.keys(grouped).map(key => ({ [column]: key, count: grouped[key].length })),
                error: null
              });
            },
            then: (callback: any) => {
              const grouped = mockData[table]?.reduce((acc: any, item: any) => {
                const key = item[column];
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
              }, {});
              return Promise.resolve({
                data: Object.keys(grouped).map(key => ({ [column]: key, count: grouped[key].length })),
                error: null
              }).then(callback);
            }
          })
        }),
        single: () => {
          const item = mockData[table]?.[0];
          return Promise.resolve({
            data: item || null,
            error: item ? null : { message: 'No rows returned' }
          });
        },
        then: (callback: any) => {
          return Promise.resolve({
            data: mockData[table] || [],
            error: null
          }).then(callback);
        },
        ilike: (column: string, pattern: string) => ({
          single: () => {
            const item = mockData[table]?.find((item: any) => 
              item[column] && item[column].toLowerCase().includes(pattern.toLowerCase().replace(/%/g, ''))
            );
            return Promise.resolve({
              data: item || null,
              error: item ? null : { message: 'No rows returned' }
            });
          },
          then: (callback: any) => {
            const items = mockData[table]?.filter((item: any) => 
              item[column] && item[column].toLowerCase().includes(pattern.toLowerCase().replace(/%/g, ''))
            ) || [];
            return Promise.resolve({
              data: items,
              error: null
            }).then(callback);
          }
        }),
        lte: (column: string, value: any) => ({
          single: () => {
            const item = mockData[table]?.find((item: any) => item[column] <= value);
            return Promise.resolve({
              data: item || null,
              error: item ? null : { message: 'No rows returned' }
            });
          },
          then: (callback: any) => {
            const items = mockData[table]?.filter((item: any) => item[column] <= value) || [];
            return Promise.resolve({
              data: items,
              error: null
            }).then(callback);
          }
        }),
        lt: (column: string, value: any) => ({
          single: () => {
            const item = mockData[table]?.find((item: any) => item[column] < value);
            return Promise.resolve({
              data: item || null,
              error: item ? null : { message: 'No rows returned' }
            });
          },
          then: (callback: any) => {
            const items = mockData[table]?.filter((item: any) => item[column] < value) || [];
            return Promise.resolve({
              data: items,
              error: null
            }).then(callback);
          }
        }),
        gt: (column: string, value: any) => ({
          single: () => {
            const item = mockData[table]?.find((item: any) => item[column] > value);
            return Promise.resolve({
              data: item || null,
              error: item ? null : { message: 'No rows returned' }
            });
          },
          then: (callback: any) => {
            const items = mockData[table]?.filter((item: any) => item[column] > value) || [];
            return Promise.resolve({
              data: items,
              error: null
            }).then(callback);
          }
        }),
        gte: (column: string, value: any) => ({
          single: () => {
            const item = mockData[table]?.find((item: any) => item[column] >= value);
            return Promise.resolve({
              data: item || null,
              error: item ? null : { message: 'No rows returned' }
            });
          },
          then: (callback: any) => {
            const items = mockData[table]?.filter((item: any) => item[column] >= value) || [];
            return Promise.resolve({
              data: items,
              error: null
            }).then(callback);
          }
        }),
        order: (column: string, direction?: 'asc' | 'desc') => ({
          single: () => {
            const sorted = [...(mockData[table] || [])].sort((a: any, b: any) => {
              if (direction === 'desc') {
                return b[column] > a[column] ? 1 : -1;
              }
              return a[column] > b[column] ? 1 : -1;
            });
            return Promise.resolve({
              data: sorted[0] || null,
              error: sorted[0] ? null : { message: 'No rows returned' }
            });
          },
          then: (callback: any) => {
            const sorted = [...(mockData[table] || [])].sort((a: any, b: any) => {
              if (direction === 'desc') {
                return b[column] > a[column] ? 1 : -1;
              }
              return a[column] > b[column] ? 1 : -1;
            });
            return Promise.resolve({
              data: sorted,
              error: null
            }).then(callback);
          }
        }),
        range: (from: number, to: number) => ({
          single: () => {
            const items = mockData[table]?.slice(from, to + 1);
            return Promise.resolve({
              data: items?.[0] || null,
              error: items?.[0] ? null : { message: 'No rows returned' }
            });
          },
          then: (callback: any) => {
            const items = mockData[table]?.slice(from, to + 1) || [];
            return Promise.resolve({
              data: items,
              error: null
            }).then(callback);
          }
        }),
        limit: (count: number) => ({
          single: () => {
            const item = mockData[table]?.[0];
            return Promise.resolve({
              data: item || null,
              error: item ? null : { message: 'No rows returned' }
            });
          },
          then: (callback: any) => {
            const items = mockData[table]?.slice(0, count) || [];
            return Promise.resolve({
              data: items,
              error: null
            }).then(callback);
          }
        }),
        group: (column: string) => ({
          single: () => {
            const grouped = mockData[table]?.reduce((acc: any, item: any) => {
              const key = item[column];
              if (!acc[key]) acc[key] = [];
              acc[key].push(item);
              return acc;
            }, {});
            return Promise.resolve({
              data: Object.keys(grouped).map(key => ({ [column]: key, count: grouped[key].length })),
              error: null
            });
          },
          then: (callback: any) => {
            const grouped = mockData[table]?.reduce((acc: any, item: any) => {
              const key = item[column];
              if (!acc[key]) acc[key] = [];
              acc[key].push(item);
              return acc;
            }, {});
            return Promise.resolve({
              data: Object.keys(grouped).map(key => ({ [column]: key, count: grouped[key].length })),
              error: null
            }).then(callback);
          }
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

            if (table === 'product_types' && currentUserRole !== 'stock_manager' && currentUserRole !== 'super_admin') {
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

            if (table === 'mrp_change_log' && currentUserRole !== 'stock_manager' && currentUserRole !== 'super_admin') {
              return Promise.resolve({
                data: null,
                error: { message: 'Permission denied', code: '42501' }
              });
            }

            if (table === 'suppliers' && currentUserRole !== 'stock_manager' && currentUserRole !== 'super_admin') {
              return Promise.resolve({
                data: null,
                error: { message: 'Permission denied', code: '42501' }
              });
            }

            if (table === 'stock_entry_items' && currentUserRole === 'technician') {
              return Promise.resolve({
                data: null,
                error: { message: 'Permission denied', code: '42501' }
              });
            }

            // Handle both single object and array inserts
            const dataArray = Array.isArray(data) ? data : [data];
            const insertedItems = [];
            
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
                
                // Auto-convert material_code to uppercase FIRST
                item.material_code = item.material_code.toUpperCase();
                
                // Validate material code format and length
                const materialCodePattern = /^[A-Z0-9_-]+$/;
                if (!materialCodePattern.test(item.material_code)) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Material code can only contain letters, numbers, dash, and underscore', code: '400' }
                  });
                }
                
                // Validate material code length (max 100 characters)
                if (item.material_code.length > 100) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Material code cannot exceed 100 characters', code: '400' }
                  });
                }
                
                // Check for duplicate material code (case insensitive)
                const existing = mockData[table]?.find(existingItem => 
                  existingItem.material_code?.toUpperCase() === item.material_code?.toUpperCase()
                );
                
                if (existing) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'material code already exists', code: '23505' }
                  });
                }
              }

              if (table === 'stock_entries') {
                if (!item.product_id || !item.quantity || item.quantity <= 0 || !item.purchase_price || !item.mrp) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Invalid stock entry data', code: '400' }
                  });
                }
                
                if (item.mrp < item.purchase_price) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'MRP cannot be less than purchase price', code: '400' }
                  });
                }
              }

              if (table === 'product_categories') {
                if (!item.name) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Category name is required', code: '400' }
                  });
                }
                
                const existing = mockData[table]?.find(cat => cat.name.toLowerCase() === item.name.toLowerCase());
                if (existing) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Category already exists', code: '400' }
                  });
                }
              }

              if (table === 'product_types') {
                if (!item.name) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Type name is required', code: '400' }
                  });
                }
                
                const existing = mockData[table]?.find(type => type.name.toLowerCase() === item.name.toLowerCase());
                if (existing) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Type already exists', code: '400' }
                  });
                }
              }

              if (table === 'mrp_change_log') {
                if (!item.product_id || !item.old_mrp || !item.new_mrp || !item.change_type || !item.changed_by) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Required fields missing for MRP change log', code: '400' }
                  });
                }
              }

              if (table === 'suppliers') {
                if (!item.name || !item.contact_person || !item.phone) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Supplier name, contact person, and phone are required', code: '400' }
                  });
                }
              }

              if (table === 'stock_entry_items') {
                if (!item.stock_entry_id || !item.product_id || !item.quantity || !item.purchase_price || !item.mrp) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Required fields missing for stock entry item', code: '400' }
                  });
                }
              }

              const newItem = {
                id: `${table}-${Date.now()}-${Math.random()}`,
                created_at: new Date().toISOString(),
                created_by: currentUser?.id || 'unknown',
                ...item
              };
              
              if (!mockData[table]) {
                mockData[table] = [];
              }
              mockData[table].push(newItem);
              
              // Update related data
              if (table === 'stock_entries') {
                // Update current stock levels
                const existingStock = mockData.current_stock_levels?.find(stockItem => stockItem.product_id === item.product_id);
                if (existingStock) {
                  existingStock.current_stock += item.quantity;
                  existingStock.total_value += item.quantity * item.purchase_price;
                } else {
                  mockData.current_stock_levels.push({
                    product_id: item.product_id,
                    current_stock: item.quantity,
                    total_value: item.quantity * item.purchase_price,
                    wac_price: item.purchase_price
                  });
                }
              }
              
              insertedItems.push(newItem);
            }

            return Promise.resolve({
              data: Array.isArray(data) ? insertedItems : insertedItems[0],
              error: null
            });
          },
          then: (callback: any) => {
            // Similar logic for array inserts
            const dataArray = Array.isArray(data) ? data : [data];
            const insertedItems = [];
            
            for (const item of dataArray) {
              // Validate each item (same validation as above)
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
                
                // Auto-convert material_code to uppercase FIRST
                item.material_code = item.material_code.toUpperCase();
                
                // Validate material code format and length
                const materialCodePattern = /^[A-Z0-9_-]+$/;
                if (!materialCodePattern.test(item.material_code)) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Material code can only contain letters, numbers, dash, and underscore', code: '400' }
                  });
                }
                
                // Validate material code length (max 100 characters)
                if (item.material_code.length > 100) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Material code cannot exceed 100 characters', code: '400' }
                  });
                }
                
                // Check for duplicate material code (case insensitive)
                const existing = mockData[table]?.find(existingItem => 
                  existingItem.material_code?.toUpperCase() === item.material_code?.toUpperCase()
                );
                
                if (existing) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'material code already exists', code: '23505' }
                  });
                }
              }

              if (table === 'stock_entries') {
                if (!item.product_id || !item.quantity || item.quantity <= 0 || !item.purchase_price || !item.mrp) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Invalid stock entry data', code: '400' }
                  });
                }
                
                if (item.mrp < item.purchase_price) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'MRP cannot be less than purchase price', code: '400' }
                  });
                }
              }

              if (table === 'product_categories') {
                if (!item.name) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Category name is required', code: '400' }
                  });
                }
                
                const existing = mockData[table]?.find(cat => cat.name.toLowerCase() === item.name.toLowerCase());
                if (existing) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Category already exists', code: '400' }
                  });
                }
              }

              if (table === 'product_types') {
                if (!item.name) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Type name is required', code: '400' }
                  });
                }
                
                const existing = mockData[table]?.find(type => type.name.toLowerCase() === item.name.toLowerCase());
                if (existing) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Type already exists', code: '400' }
                  });
                }
              }

              if (table === 'mrp_change_log') {
                if (!item.product_id || !item.old_mrp || !item.new_mrp || !item.change_type || !item.changed_by) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Required fields missing for MRP change log', code: '400' }
                  });
                }
              }

              if (table === 'suppliers') {
                if (!item.name || !item.contact_person || !item.phone) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Supplier name, contact person, and phone are required', code: '400' }
                  });
                }
              }

              if (table === 'stock_entry_items') {
                if (!item.stock_entry_id || !item.product_id || !item.quantity || !item.purchase_price || !item.mrp) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Required fields missing for stock entry item', code: '400' }
                  });
                }
              }

              const newItem = {
                id: `${table}-${Date.now()}-${Math.random()}`,
                created_at: new Date().toISOString(),
                created_by: currentUser?.id || 'unknown',
                ...item
              };
              
              if (!mockData[table]) {
                mockData[table] = [];
              }
              mockData[table].push(newItem);
              insertedItems.push(newItem);
            }

            return Promise.resolve({
              data: Array.isArray(data) ? insertedItems : insertedItems[0],
              error: null
            }).then(callback);
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

              const index = mockData[table]?.findIndex((item: any) => item[column] === value);
              if (index === -1 || index === undefined) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'No rows returned' }
                });
              }
              
              const updatedItem = {
                ...mockData[table][index],
                ...data,
                updated_at: new Date().toISOString(),
                updated_by: currentUser?.id || 'unknown'
              };
              
              mockData[table][index] = updatedItem;
              
              return Promise.resolve({
                data: updatedItem,
                error: null
              });
            },
            then: (callback: any) => {
              const updatedItems = mockData[table]?.map((item: any) => 
                item[column] === value ? { ...item, ...data, updated_at: new Date().toISOString() } : item
              ) || [];
              
              return Promise.resolve({
                data: updatedItems,
                error: null
              }).then(callback);
            }
          }),
          single: () => {
            // Check permissions for updates
            if (table === 'inventory_products' && currentUserRole === 'technician') {
              return Promise.resolve({
                data: null,
                error: { message: 'Permission denied', code: '42501' }
              });
            }

            const updatedItem = {
              ...mockData[table]?.[0],
              ...data,
              updated_at: new Date().toISOString(),
              updated_by: currentUser?.id || 'unknown'
            };
            
            if (mockData[table] && mockData[table].length > 0) {
              mockData[table][0] = updatedItem;
            }
            
            return Promise.resolve({
              data: updatedItem,
              error: null
            });
          },
          then: (callback: any) => {
            const updatedItems = mockData[table]?.map((item: any) => ({ ...item, ...data, updated_at: new Date().toISOString() })) || [];
            return Promise.resolve({
              data: updatedItems,
              error: null
            }).then(callback);
          }
        }),
        select: (columns?: string) => ({
          eq: (column: string, value: any) => ({
            single: () => {
              // Check permissions for updates
              if (table === 'inventory_products' && currentUserRole === 'technician') {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Permission denied', code: '42501' }
                });
              }

              const index = mockData[table]?.findIndex((item: any) => item[column] === value);
              if (index === -1 || index === undefined) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'No rows returned' }
                });
              }
              
              const updatedItem = {
                ...mockData[table][index],
                ...data,
                updated_at: new Date().toISOString(),
                updated_by: currentUser?.id || 'unknown'
              };
              
              mockData[table][index] = updatedItem;
              
              return Promise.resolve({
                data: updatedItem,
                error: null
              });
            },
            then: (callback: any) => {
              const updatedItems = mockData[table]?.map((item: any) => 
                item[column] === value ? { ...item, ...data, updated_at: new Date().toISOString() } : item
              ) || [];
              
              return Promise.resolve({
                data: updatedItems,
                error: null
              }).then(callback);
            }
          }),
          single: () => {
            // Check permissions for updates
            if (table === 'inventory_products' && currentUserRole === 'technician') {
              return Promise.resolve({
                data: null,
                error: { message: 'Permission denied', code: '42501' }
              });
            }

            const updatedItem = {
              ...mockData[table]?.[0],
              ...data,
              updated_at: new Date().toISOString(),
              updated_by: currentUser?.id || 'unknown'
            };
            
            if (mockData[table] && mockData[table].length > 0) {
              mockData[table][0] = updatedItem;
            }
            
            return Promise.resolve({
              data: updatedItem,
              error: null
            });
          },
          then: (callback: any) => {
            const updatedItems = mockData[table]?.map((item: any) => ({ ...item, ...data, updated_at: new Date().toISOString() })) || [];
            return Promise.resolve({
              data: updatedItems,
              error: null
            }).then(callback);
          }
        })
      }),
      delete: () => ({
        select: (columns?: string) => ({
          eq: (column: string, value: any) => ({
            single: () => {
              const index = mockData[table]?.findIndex((item: any) => item[column] === value);
              if (index === -1 || index === undefined) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'No rows returned' }
                });
              }
              
              const deletedItem = mockData[table][index];
              mockData[table].splice(index, 1);
              
              return Promise.resolve({
                data: deletedItem,
                error: null
              });
            },
            then: (callback: any) => {
              const deletedItems = mockData[table]?.filter((item: any) => item[column] !== value) || [];
              const originalLength = mockData[table]?.length || 0;
              mockData[table] = deletedItems;
              
              return Promise.resolve({
                data: Array(originalLength - deletedItems.length).fill(null),
                error: null
              }).then(callback);
            }
          }),
          single: () => {
            if (mockData[table] && mockData[table].length > 0) {
              const deletedItem = mockData[table].shift();
              return Promise.resolve({
                data: deletedItem,
                error: null
              });
            }
            
            return Promise.resolve({
              data: null,
              error: { message: 'No rows returned' }
            });
          },
          then: (callback: any) => {
            const deletedItems = [];
            if (mockData[table]) {
              deletedItems.push(...mockData[table]);
              mockData[table] = [];
            }
            
            return Promise.resolve({
              data: deletedItems,
              error: null
            }).then(callback);
          }
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
    },
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
  };

  // Add reset method to mock client
  mockClient.resetData = resetMockData;

  return mockClient;
}

// Export reset function for test setup
export { resetMockData };
