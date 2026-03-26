import { vi } from 'vitest';

// Mock Supabase client for authentication testing
export function createMockSupabaseClient() {
  const mockData: Record<string, any[]> = {
    profiles: [],
    subjects: [],
    inventory_products: [],
    digital_bag_sessions: [],
    technician_earnings_summary: [],
    attendance_logs: [],
    subject_bills: []
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
          then: (resolve: any) => resolve({
            data: mockData[table]?.filter(item => item[column] === value) || [],
            error: null
          })
        }),
        ilike: (column: string, value: any) => ({
          then: (resolve: any) => resolve({
            data: mockData[table]?.filter((item: any) => 
              item[column]?.toLowerCase().includes(value.toLowerCase().replace('%', ''))
            ) || [],
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
              id: `${table}-${Date.now()}`,
              created_at: new Date().toISOString(),
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
          select: (columns?: string) => ({
            single: () => {
              const index = mockData[table]?.findIndex(item => item[column] === value);
              if (index === -1) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Record not found', code: 'PGRST116' }
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
        // Simulate role based on current session
        return Promise.resolve({
          data: 'office_staff', // Default role for testing
          error: null
        });
      }
      
      if (functionName === 'get_expiring_amcs') {
        const days = params?.days || 30;
        return Promise.resolve({
          data: [],
          error: null
        });
      }
      
      if (functionName === 'refresh_all_materialized_views') {
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
        // Check for empty fields
        if (!email) {
          return {
            data: null,
            error: { message: 'email is required' }
          };
        }
        
        if (!password) {
          return {
            data: null,
            error: { message: 'password is required' }
          };
        }

        // Check for deactivated user
        if (email === 'deactivated@hitech.com') {
          return {
            data: null,
            error: { message: 'account deactivated' }
          };
        }

        // Valid credentials
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
