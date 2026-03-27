import { vi } from 'vitest';

// Mock Supabase client for testing
export function createMockSupabaseClient() {
  const mockData: Record<string, any[]> = {
    customers: [],
    brands: [],
    subjects: [],
    amc_contracts: [],
    subject_bills: [],
    subject_accessories: [],
    inventory_products: [],
    stock_entries: [],
    stock_entry_items: [],
    current_stock_levels: [],
    product_categories: [],
    product_types: [],
    suppliers: [],
    mrp_change_log: [],
    digital_bag_sessions: [],
    digital_bag_items: [],
    digital_bag_consumptions: [],
    profiles: [],
    attendance_logs: [],
    technician_service_payouts: []
  };

  const mockClient: any = {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          eq: (column2: string, value2: any) => ({
            single: () => Promise.resolve({
              data: mockData[table]?.find((item: any) => item[column] === value && item[column2] === value2),
              error: null
            })
          }),
          single: () => Promise.resolve({
            data: mockData[table]?.find((item: any) => item[column] === value),
            error: null
          }),
          then: (resolve: any) => resolve({
            data: mockData[table]?.filter((item: any) => item[column] === value),
            error: null
          })
        }),
        then: (resolve: any) => resolve({
          data: mockData[table],
          error: null
        })
      }),
      insert: (data: any) => ({
        select: () => ({
          single: () => Promise.resolve({
            data: { id: `${table}-${Date.now()}`, ...data },
            error: null
          })
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: () => ({
            single: () => Promise.resolve({
              data: { ...data, id: value },
              error: null
            })
          })
        })
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          select: () => ({
            single: () => Promise.resolve({
              data: { id: value },
              error: null
            })
          })
        })
      })
    }),
    rpc: (functionName: string, params?: any) => {
      // Mock RPC functions
      if (functionName === 'get_my_role') {
        return Promise.resolve({
          data: 'office_staff',
          error: null
        });
      }
      
      if (functionName === 'get_expiring_amcs') {
        const days = params?.days || 30;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        const expiringDate = futureDate.toISOString().split('T')[0];
        
        const expiringAMCs = mockData['amc_contracts']?.filter((amc: any) => {
          const endDate = new Date(amc.end_date);
          const today = new Date();
          const daysDiff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
          return daysDiff <= days && daysDiff >= 0;
        }) || [];
        
        return Promise.resolve({
          data: expiringAMCs,
          error: null
        });
      }
      
      return Promise.resolve({
        data: null,
      });
    }
  };

  mockClient.auth = {
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
          }
        };
      } else {
        return {
          data: null,
          error: { message: 'Invalid login credentials' }
        };
      }
    },
    signOut: async () => {
      return {
        data: {},
        error: null
      };
    }
  };

  // Mock view queries
  mockClient.views = {
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

  return mockClient;
}
