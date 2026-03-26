import { vi } from 'vitest';

// Mock Supabase client for authentication testing
export function createMockSupabaseClient() {
  const mockData: Record<string, any[]> = {
    profiles: [
      {
        id: 'admin-123',
        email: 'admin@hitech.com',
        role: 'super_admin',
        display_name: 'Super Admin',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'office-123',
        email: 'office@hitech.com',
        role: 'office_staff',
        display_name: 'Office Staff',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'tech-123',
        email: 'tech@hitech.com',
        role: 'technician',
        display_name: 'Technician',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'stock-123',
        email: 'stock@hitech.com',
        role: 'stock_manager',
        display_name: 'Stock Manager',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'deactivated-123',
        email: 'deactivated@hitech.com',
        role: 'technician',
        display_name: 'Deactivated User',
        is_active: false,
        created_at: new Date().toISOString()
      }
    ],
    subjects: [
      {
        id: 'subject-123',
        assigned_technician_id: 'tech-123',
        status: 'allocated',
        customer_id: 'customer-123',
        category_id: 'category-123',
        created_at: new Date().toISOString()
      },
      {
        id: 'subject-456',
        assigned_technician_id: 'other-tech-123',
        status: 'allocated',
        customer_id: 'customer-456',
        category_id: 'category-456',
        created_at: new Date().toISOString()
      }
    ],
    inventory_products: [],
    digital_bag_sessions: [],
    technician_earnings_summary: [],
    attendance_logs: [],
    subject_bills: []
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
            // Check permissions for reading
            if (table === 'profiles' && currentUserRole === 'technician') {
              const item = mockData[table]?.find(item => item[column] === value);
              // Technicians can only read their own profile
              if (item && item.id !== currentUser?.id) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Permission denied', code: '42501' }
                });
              }
            }
            
            const item = mockData[table]?.find(item => item[column] === value);
            return Promise.resolve({
              data: item || null,
              error: null
            });
          },
          then: (resolve: any) => {
            // Check permissions for reading lists
            if (table === 'profiles' && currentUserRole === 'technician') {
              // Technicians can only see their own profile
              const filtered = mockData[table]?.filter(item => item.id === currentUser?.id) || [];
              return resolve({
                data: filtered,
                error: null
              });
            }
            
            return resolve({
              data: mockData[table]?.filter(item => item[column] === value) || [],
              error: null
            });
          }
        }),
        ilike: (column: string, value: any) => ({
          then: (resolve: any) => resolve({
            data: mockData[table]?.filter((item: any) => 
              item[column]?.toLowerCase().includes(value.toLowerCase().replace('%', ''))
            ) || [],
            error: null
          })
        }),
        in: (column: string, values: any[]) => ({
          then: (resolve: any) => resolve({
            data: mockData[table]?.filter((item: any) => values.includes(item[column])) || [],
            error: null
          })
        }),
        order: (column: string, ascending: boolean = true) => ({
          limit: (limit: number) => ({
            then: (resolve: any) => {
              let filtered = mockData[table] || [];
              if (column) {
                filtered = filtered.sort((a: any, b: any) => {
                  if (ascending) {
                    return a[column] > b[column] ? 1 : -1;
                  } else {
                    return a[column] < b[column] ? 1 : -1;
                  }
                });
              }
              return resolve({
                data: filtered.slice(0, limit),
                error: null
              });
            }
          })
        }),
        then: (resolve: any) => resolve({
          data: mockData[table] || [],
          error: null
        })
      }),
      insert: (data: any) => ({
        select: (columns?: string) => ({
          single: () => {
            // Check permissions for inserts
            if (!currentUserRole) {
              // No session - API route protection
              return Promise.resolve({
                data: null,
                error: { message: 'Unauthenticated access', code: '42501' }
              });
            }

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

            const newItem = {
              id: `${table}-${Date.now()}`,
              created_at: new Date().toISOString(),
              created_by: currentUser?.id || null,
              ...data
            };
            
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
          eq: (column2: string, value2: any) => ({
            select: (columns?: string) => ({
              single: () => {
                const index = mockData[table]?.findIndex(item => item[column] === value && item[column2] === value2);
                if (index === -1) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Record not found', code: 'PGRST116' }
                  });
                }

                // Check permissions for updates
                if (table === 'profiles') {
                  // Users can only update their own profile
                  if (currentUserRole === 'technician' && currentUser?.id !== value) {
                    return Promise.resolve({
                      data: null,
                      error: { message: 'Permission denied', code: '42501' }
                    });
                  }
                }

                if (table === 'inventory_products' && currentUserRole === 'technician') {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Permission denied', code: '42501' }
                  });
                }

                if (table === 'subject_bills' && currentUserRole === 'technician') {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Permission denied', code: '42501' }
                  });
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
          }),
          select: (columns?: string) => ({
            single: () => {
              const index = mockData[table]?.findIndex(item => item[column] === value);
              if (index === -1) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Record not found', code: 'PGRST116' }
                });
              }

              // Check permissions for updates
              if (table === 'profiles') {
                // Users can only update their own profile
                if (currentUserRole === 'technician' && currentUser?.id !== value) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Permission denied', code: '42501' }
                  });
                }
              }

              if (table === 'inventory_products' && currentUserRole === 'technician') {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Permission denied', code: '42501' }
                });
              }

              if (table === 'subject_bills' && currentUserRole === 'technician') {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Permission denied', code: '42501' }
                });
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
            // Check permissions for deletes
            if (table === 'product_categories' && currentUserRole !== 'super_admin') {
              return Promise.resolve({
                data: null,
                error: { message: 'Permission denied', code: '42501' }
              });
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
      // Mock RPC functions
      if (functionName === 'get_my_role') {
        return Promise.resolve({
          data: currentUserRole || 'anonymous',
          error: null
        });
      }

      if (functionName === 'refresh_all_materialized_views') {
        // Check for CRON_SECRET header in real implementation
        // For tests, we'll simulate unauthorized access
        return Promise.resolve({
          data: null,
          error: { message: 'unauthorized' }
        });
      }

      return Promise.resolve({
        data: null,
        error: { message: 'Function not found' }
      });
    },
    auth: {
      signInWithPassword: async ({ email, password }: any) => {
        const validCredentials: Record<string, { role: string; password: string; active?: boolean }> = {
          'admin@hitech.com': { role: 'super_admin', password: 'validpassword', active: true },
          'office@hitech.com': { role: 'office_staff', password: 'validpassword', active: true },
          'tech@hitech.com': { role: 'technician', password: 'validpassword', active: true },
          'stock@hitech.com': { role: 'stock_manager', password: 'validpassword', active: true },
          'deactivated@hitech.com': { role: 'technician', password: 'validpassword', active: false }
        };

        const credential = validCredentials[email];
        
        if (credential && password === credential.password) {
          // Check if user is deactivated
          if (credential.active === false) {
            return {
              data: null,
              error: { message: 'account deactivated' }
            };
          }

          const userData = mockData.profiles?.find((p: any) => p.email === email);
          currentUser = userData || {
            id: email.replace('@', '-').replace('.', '-'),
            email: email,
            role: credential.role
          };
          currentUserRole = credential.role;
          
          return {
            data: {
              user: {
                id: currentUser.id,
                email: email,
                user_metadata: { role: credential.role }
              },
              session: {
                access_token: `token-${Date.now()}-${Math.random()}`,
                user: {
                  id: currentUser.id,
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
        currentUser = null;
        currentUserRole = null;
        return {
          data: {},
          error: null
        };
      },
      getSession: async () => ({
        data: {
          session: currentUser ? {
            user: currentUser,
            access_token: `token-${Date.now()}`
          } : null
        },
        error: null
      }),
      getUser: async () => ({
        data: {
          user: currentUser
        },
        error: null
      }),
      onAuthStateChange: vi.fn((callback: any) => {
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn()
            }
          }
        };
      })
    }
  };
  
  return mockClient;
}

// Mock view queries
export const mockViews = {
  pending_unassigned_subjects: () => ({
    select: () => ({
      eq: () => ({
        then: () => Promise.resolve({
          data: [],
          error: null
        })
      })
    })
  }),
  active_subjects_today: () => ({
    select: () => ({
      then: () => Promise.resolve({
        data: [],
        error: null
      })
    })
  }),
  brand_financial_summary: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({
          data: {
            brand_id: 'brand-123',
            total_outstanding: 0,
            total_paid: 0,
            total_billed: 0
          },
          error: null
        })
      })
    })
  })
};
