import { vi } from 'vitest';

// Global persistent data store for tests
const persistentMockData: Record<string, any[]> = {
  inventory_products: [],
  product_categories: [],
  product_types: [],
  stock_entries: [],
  stock_entry_items: [],
  mrp_change_log: [],
  suppliers: [],
  current_stock_levels: [],
  inventory_audits: []
};

// Reset function for test isolation
export const resetMockData = () => {
  Object.keys(persistentMockData).forEach(key => {
    persistentMockData[key] = [];
  });
};

// Mock user data
const mockUsers = {
  'stock@hitech.com': { id: 'stock-123', email: 'stock@hitech.com', role: 'stock_manager' },
  'office@hitech.com': { id: 'office-123', email: 'office@hitech.com', role: 'office_staff' },
  'tech@hitech.com': { id: 'tech-123', email: 'tech@hitech.com', role: 'technician' },
  'admin@hitech.com': { id: 'admin-123', email: 'admin@hitech.com', role: 'super_admin' }
};

export const createMockSupabaseClient = () => {
  let currentUser: any = null;
  let currentUserRole: string = '';

  const mockData = persistentMockData;

  const validateAndInsertItem = (table: string, item: any) => {
    // Validate each item
    if (table === 'inventory_products') {
      if (!item.name || item.name.trim() === '') {
        return { error: { message: 'Product name is required', code: '400' } };
      }
      
      if (!item.material_code || item.material_code.trim() === '') {
        return { error: { message: 'Material code is required', code: '400' } };
      }
      
      if (!item.category_id || item.category_id.trim() === '') {
        return { error: { message: 'Category is required', code: '400' } };
      }
      
      if (!item.type_id || item.type_id.trim() === '') {
        return { error: { message: 'Product type is required', code: '400' } };
      }
      
      // Validate MRP and purchase price
      if (item.mrp !== undefined && item.mrp <= 0) {
        return { error: { message: 'MRP must be greater than zero', code: '400' } };
      }
      
      if (item.purchase_price !== undefined && item.purchase_price <= 0) {
        return { error: { message: 'Purchase price must be greater than zero', code: '400' } };
      }
      
      // Auto-convert material_code to uppercase FIRST
      item.material_code = item.material_code.toUpperCase();
      
      // Validate material code format and length
      const materialCodePattern = /^[A-Z0-9_-]+$/;
      if (!materialCodePattern.test(item.material_code)) {
        return { error: { message: 'Material code can only contain letters, numbers, dash, and underscore', code: '400' } };
      }
      
      // Validate material code length (max 100 characters)
      if (item.material_code.length > 100) {
        return { error: { message: 'Material code cannot exceed 100 characters', code: '400' } };
      }
      
      // Check for duplicate material code (case insensitive)
      const existing = mockData[table]?.find(existingItem => 
        existingItem.material_code?.toUpperCase() === item.material_code?.toUpperCase()
      );
      
      if (existing) {
        return { error: { message: 'material code already exists', code: '23505' } };
      }
    }

    if (table === 'stock_entries') {
      if (!item.product_id || !item.quantity || item.quantity <= 0 || !item.purchase_price || !item.mrp) {
        return { error: { message: 'Invalid stock entry data', code: '400' } };
      }
      
      if (item.mrp < item.purchase_price) {
        return { error: { message: 'MRP cannot be less than purchase price', code: '400' } };
      }
    }

    if (table === 'product_categories') {
      if (!item.name) {
        return { error: { message: 'Category name is required', code: '400' } };
      }
      
      const existing = mockData[table]?.find(cat => cat.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        return { error: { message: 'Category already exists', code: '23505' } };
      }
    }

    if (table === 'product_types') {
      if (!item.name) {
        return { error: { message: 'Type name is required', code: '400' } };
      }
      
      const existing = mockData[table]?.find(type => type.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        return { error: { message: 'Type already exists', code: '23505' } };
      }
    }

    if (table === 'mrp_change_log') {
      if (!item.product_id || !item.old_mrp || !item.new_mrp || !item.change_type || !item.changed_by) {
        return { error: { message: 'Required fields missing for MRP change log', code: '400' } };
      }
    }

    if (table === 'suppliers') {
      if (!item.name || !item.contact_person || !item.phone) {
        return { error: { message: 'Supplier name, contact person, and phone are required', code: '400' } };
      }
    }

    if (table === 'stock_entry_items') {
      if (!item.stock_entry_id || !item.product_id || !item.quantity || !item.purchase_price || !item.mrp) {
        return { error: { message: 'Required fields missing for stock entry item', code: '400' } };
      }
    }

    return { error: null };
  };

  const insertItems = (table: string, dataArray: any[]) => {
    const insertedItems = [];
    
    for (const item of dataArray) {
      const validation = validateAndInsertItem(table, item);
      if (validation.error) {
        return { data: null, error: validation.error };
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

    return { data: dataArray.length === 1 ? insertedItems[0] : insertedItems, error: null };
  };

  // Create chainable result object
  const createChainableResult = (result: any) => {
    const promise = Promise.resolve(result);
    const chainable = {
      then: (callback: any) => promise.then(callback),
      select: (columns?: string) => ({
        single: () => promise,
        then: (callback: any) => promise.then(callback)
      })
    };
    
    // Copy all promise methods to chainable object
    Object.setPrototypeOf(chainable, Object.getPrototypeOf(promise));
    Object.getOwnPropertyNames(promise).forEach(prop => {
      if (prop !== 'then' && prop !== 'catch' && prop !== 'finally') {
        (chainable as any)[prop] = (promise as any)[prop];
      }
    });
    
    return chainable;
  };

  const mockClient = {
    auth: {
      signInWithPassword: vi.fn().mockImplementation(async ({ email, password }) => {
        const user = mockUsers[email as keyof typeof mockUsers];
        if (user) {
          currentUser = user;
          currentUserRole = user.role;
          return { data: { user }, error: null };
        }
        return { data: null, error: { message: 'Invalid credentials' } };
      }),
      signOut: vi.fn().mockImplementation(async () => {
        currentUser = null;
        currentUserRole = '';
        return { error: null };
      }),
      getUser: vi.fn().mockImplementation(async () => {
        return { data: { user: currentUser }, error: null };
      }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      })
    },
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
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
          eq: (column2: string, value2: any) => ({
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
          lte: (column: string, value: any) => ({
            then: (callback: any) => {
              const items = mockData[table]?.filter((item: any) => 
                item[column] <= value
              ) || [];
              return Promise.resolve({
                data: items,
                error: null
              }).then(callback);
            }
          }),
          gte: (column: string, value: any) => ({
            then: (callback: any) => {
              const items = mockData[table]?.filter((item: any) => 
                item[column] >= value
              ) || [];
              return Promise.resolve({
                data: items,
                error: null
              }).then(callback);
            }
          }),
          range: (from: number, to: number) => ({
            then: (callback: any) => {
              const items = (mockData[table] || []).slice(from, to + 1);
              return Promise.resolve({
                data: items,
                error: null
              }).then(callback);
            }
          })
        }),
        in: (column: string, values: any[]) => ({
          then: (callback: any) => {
            const items = mockData[table]?.filter((item: any) => values.includes(item[column])) || [];
            return Promise.resolve({
              data: items,
              error: null
            }).then(callback);
          }
        }),
        like: (column: string, value: string) => ({
          then: (callback: any) => {
            const items = mockData[table]?.filter((item: any) => 
              item[column]?.toString().toLowerCase().includes(value.toLowerCase())
            ) || [];
            return Promise.resolve({
              data: items,
              error: null
            }).then(callback);
          }
        }),
        ilike: (column: string, value: string) => ({
          then: (callback: any) => {
            const items = mockData[table]?.filter((item: any) => {
              const fieldValue = item[column]?.toString().toLowerCase();
              const searchPattern = value.toLowerCase();
              
              // Handle SQL LIKE patterns
              if (searchPattern.includes('%')) {
                if (searchPattern.startsWith('%') && searchPattern.endsWith('%')) {
                  // %pattern% - contains
                  const searchTerm = searchPattern.slice(1, -1);
                  return fieldValue.includes(searchTerm);
                } else if (searchPattern.startsWith('%')) {
                  // %pattern - ends with
                  const searchTerm = searchPattern.slice(1);
                  return fieldValue.endsWith(searchTerm);
                } else if (searchPattern.endsWith('%')) {
                  // pattern% - starts with
                  const searchTerm = searchPattern.slice(0, -1);
                  return fieldValue.startsWith(searchTerm);
                }
              } else {
                // exact match (case insensitive)
                return fieldValue === searchPattern;
              }
            }) || [];
            return Promise.resolve({
              data: items,
              error: null
            }).then(callback);
          }
        }),
        order: (column: string, { ascending = true } = {}) => ({
          limit: (limit: number) => ({
            range: (from: number, to: number) => ({
              then: (callback: any) => {
                let items = [...(mockData[table] || [])];
                if (column) {
                  items.sort((a, b) => {
                    const aVal = a[column];
                    const bVal = b[column];
                    if (aVal < bVal) return ascending ? -1 : 1;
                    if (aVal > bVal) return ascending ? 1 : -1;
                    return 0;
                  });
                }
                const paginatedItems = items.slice(from, to + 1);
                return Promise.resolve({
                  data: paginatedItems,
                  error: null
                }).then(callback);
              }
            }),
            then: (callback: any) => {
              let items = [...(mockData[table] || [])];
              if (column) {
                items.sort((a, b) => {
                  const aVal = a[column];
                  const bVal = b[column];
                  if (aVal < bVal) return ascending ? -1 : 1;
                  if (aVal > bVal) return ascending ? 1 : -1;
                  return 0;
                });
              }
              const limitedItems = items.slice(0, limit);
              return Promise.resolve({
                data: limitedItems,
                error: null
              }).then(callback);
            }
          }),
          then: (callback: any) => {
            let items = [...(mockData[table] || [])];
            if (column) {
              items.sort((a, b) => {
                const aVal = a[column];
                const bVal = b[column];
                if (aVal < bVal) return ascending ? -1 : 1;
                if (aVal > bVal) return ascending ? 1 : -1;
                return 0;
              });
            }
            return Promise.resolve({
              data: items,
              error: null
            }).then(callback);
          }
        }),
        then: (callback: any) => {
          const items = mockData[table] || [];
          return Promise.resolve({
            data: items,
            error: null
          }).then(callback);
        },
        limit: (limit: number) => ({
          then: (callback: any) => {
            const items = (mockData[table] || []).slice(0, limit);
            return Promise.resolve({
              data: items,
              error: null
            }).then(callback);
          },
          range: (from: number, to: number) => ({
            then: (callback: any) => {
              const items = (mockData[table] || []).slice(from, to + 1);
              return Promise.resolve({
                data: items,
                error: null
              }).then(callback);
            }
          })
        }),
        lte: (column: string, value: any) => ({
          then: (callback: any) => {
            const items = mockData[table]?.filter((item: any) => 
              item[column] <= value
            ) || [];
            return Promise.resolve({
              data: items,
              error: null
            }).then(callback);
          }
        }),
        gte: (column: string, value: any) => ({
          then: (callback: any) => {
            const items = mockData[table]?.filter((item: any) => 
              item[column] >= value
            ) || [];
            return Promise.resolve({
              data: items,
              error: null
            }).then(callback);
          }
        }),
        range: (from: number, to: number) => ({
          then: (callback: any) => {
            const items = (mockData[table] || []).slice(from, to + 1);
            return Promise.resolve({
              data: items,
              error: null
            }).then(callback);
          }
        })
      }),
      insert: (data: any) => {
        // Check permissions for inserts
        if (table === 'inventory_products' && currentUserRole === 'technician') {
          return createChainableResult({
            data: null,
            error: { message: 'Permission denied', code: '42501' }
          });
        }

        if (table === 'stock_entries' && currentUserRole === 'technician') {
          return createChainableResult({
            data: null,
            error: { message: 'Permission denied', code: '42501' }
          });
        }

        if (table === 'product_categories' && currentUserRole !== 'stock_manager' && currentUserRole !== 'super_admin') {
          return createChainableResult({
            data: null,
            error: { message: 'Permission denied', code: '42501' }
          });
        }

        if (table === 'product_types' && currentUserRole !== 'stock_manager' && currentUserRole !== 'super_admin') {
          return createChainableResult({
            data: null,
            error: { message: 'Permission denied', code: '42501' }
          });
        }

        if (table === 'inventory_audits' && currentUserRole !== 'super_admin') {
          return createChainableResult({
            data: null,
            error: { message: 'Permission denied', code: '42501' }
          });
        }

        if (table === 'mrp_change_log' && currentUserRole !== 'stock_manager' && currentUserRole !== 'super_admin') {
          return createChainableResult({
            data: null,
            error: { message: 'Permission denied', code: '42501' }
          });
        }

        if (table === 'suppliers' && currentUserRole !== 'stock_manager' && currentUserRole !== 'super_admin') {
          return createChainableResult({
            data: null,
            error: { message: 'Permission denied', code: '42501' }
          });
        }

        if (table === 'stock_entry_items' && currentUserRole === 'technician') {
          return createChainableResult({
            data: null,
            error: { message: 'Permission denied', code: '42501' }
          });
        }

        // Handle both single object and array inserts
        const dataArray = Array.isArray(data) ? data : [data];
        const result = insertItems(table, dataArray);
        
        // For array inserts, return the array result directly without .select().single()
        if (Array.isArray(data)) {
          return createChainableResult(result);
        }
        
        // For single inserts, return chainable result
        return createChainableResult(result);
      },
      update: (data: any) => ({
        eq: (column: string, value: any) => {
          const index = mockData[table]?.findIndex((item: any) => item[column] === value);
          if (index === -1 || index === undefined) {
            return {
              select: (columns?: string) => ({
                single: () => Promise.resolve({
                  data: null,
                  error: { message: 'No rows returned' }
                })
              }),
              single: () => Promise.resolve({
                data: null,
                error: { message: 'No rows returned' }
              })
            };
          }

          // Check permissions for updates
          if (table === 'inventory_products' && currentUserRole === 'technician') {
            return {
              select: (columns?: string) => ({
                single: () => Promise.resolve({
                  data: null,
                  error: { message: 'Permission denied', code: '42501' }
                })
              }),
              single: () => Promise.resolve({
                data: null,
                error: { message: 'Permission denied', code: '42501' }
              })
            };
          }

          // Check for duplicate names on update for categories and types
          if (table === 'product_categories' && data.name) {
            const existing = mockData[table]?.find(cat => 
              cat.name.toLowerCase() === data.name.toLowerCase() && cat.id !== mockData[table][index].id
            );
            if (existing) {
              return {
                select: (columns?: string) => ({
                  single: () => Promise.resolve({
                    data: null,
                    error: { message: 'Category already exists', code: '23505' }
                  })
                }),
                single: () => Promise.resolve({
                  data: null,
                  error: { message: 'Category already exists', code: '23505' }
                })
              };
            }
          }

          if (table === 'product_types' && data.name) {
            const existing = mockData[table]?.find(type => 
              type.name.toLowerCase() === data.name.toLowerCase() && type.id !== mockData[table][index].id
            );
            if (existing) {
              return {
                select: (columns?: string) => ({
                  single: () => Promise.resolve({
                    data: null,
                    error: { message: 'Type already exists', code: '23505' }
                  })
                }),
                single: () => Promise.resolve({
                  data: null,
                  error: { message: 'Type already exists', code: '23505' }
                })
              };
            }
          }

          // Check for duplicate material codes on update for products
          if (table === 'inventory_products' && data.material_code) {
            const updatedMaterialCode = data.material_code.toUpperCase();
            const existing = mockData[table]?.find(product => 
              product.material_code?.toUpperCase() === updatedMaterialCode && product.id !== mockData[table][index].id
            );
            if (existing) {
              return {
                select: (columns?: string) => ({
                  single: () => Promise.resolve({
                    data: null,
                    error: { message: 'material code already exists', code: '23505' }
                  })
                }),
                single: () => Promise.resolve({
                  data: null,
                  error: { message: 'material code already exists', code: '23505' }
                })
              };
            }
          }
          
          const updatedItem = {
            ...mockData[table][index],
            ...data,
            updated_at: new Date().toISOString(),
            updated_by: currentUser?.id || 'unknown'
          };
          
          mockData[table][index] = updatedItem;
          
          return {
            select: (columns?: string) => ({
              single: () => Promise.resolve({
                data: updatedItem,
                error: null
              })
            }),
            single: () => Promise.resolve({
              data: updatedItem,
              error: null
            })
          };
        }
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          select: (columns?: string) => ({
            single: () => {
              const index = mockData[table]?.findIndex((item: any) => item[column] === value);
              if (index === -1 || index === undefined) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'No rows returned' }
                });
              }

              // Check for active products before deleting category or type
              if (table === 'product_categories') {
                const categoryToDelete = mockData[table][index];
                const activeProducts = mockData.inventory_products?.filter(product => 
                  product.category_id === categoryToDelete.id && !product.is_deleted
                );
                // Allow deletion if only deleted products exist OR if no products exist at all
                if (activeProducts && activeProducts.length > 0) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Cannot delete category with active products', code: '23503' }
                  });
                }
              }

              if (table === 'product_types') {
                const typeToDelete = mockData[table][index];
                const activeProducts = mockData.inventory_products?.filter(product => 
                  product.type_id === typeToDelete.id && !product.is_deleted
                );
                // Allow deletion if only deleted products exist OR if no products exist at all
                if (activeProducts && activeProducts.length > 0) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Cannot delete type with active products', code: '23503' }
                  });
                }
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
    }),
    resetData: resetMockData,
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

  return mockClient;
};
