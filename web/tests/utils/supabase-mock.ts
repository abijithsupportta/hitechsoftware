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
    subject_photos: [],
    subject_status_history: [],
    dealers: [],
    technicians: [],
    profiles: [],
    attendance_logs: [],
    technician_monthly_performance: [],
    technician_leaderboard: [],
    technician_earnings_summary: [],
    amc_commission: []
  };

  return {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: () => Promise.resolve({
            data: mockData[table]?.find(item => item[column] === value) || null,
            error: null
          }),
          then: (resolve: any) => resolve({
            data: mockData[table]?.filter(item => item[column] === value) || [],
            error: null
          }),
          order: (column: string, options: any) => ({
            then: (resolve: any) => ({
              data: mockData[table]?.filter(item => item[column] === value).sort((a: any, b: any) => {
                if (options.ascending) {
                  return new Date(a[column]) >= new Date(b[column]) ? 1 : -1;
                } else {
                  return new Date(a[column]) >= new Date(b[column]) ? -1 : 1;
                }
              }) || [],
              error: null
            })
          })
        }),
        gte: (column: string, value: any) => ({
          lte: (column2: string, value2: any) => ({
            then: (resolve: any) => ({
              data: mockData[table]?.filter((item: any) => {
                const itemDate = item[column]?.split('T')[0];
                return itemDate >= value && itemDate <= value2;
              }) || [],
              error: null
            })
          })
        }),
        in: (column: string, values: any[]) => ({
          then: (resolve: any) => ({
            data: mockData[table]?.filter((item: any) => values.includes(item[column])) || [],
            error: null
          })
        }),
        ilike: (column: string, value: any) => ({
          then: (resolve: any) => ({
            data: mockData[table]?.filter((item: any) => 
              item[column]?.toLowerCase().includes(value.toLowerCase().replace('%', ''))
            ) || [],
            error: null
          })
        }),
        order: (column: string, options: any) => ({
          then: (resolve: any) => ({
            data: mockData[table]?.sort((a: any, b: any) => {
              if (options.ascending) {
                return new Date(a[column]) >= new Date(b[column]) ? 1 : -1;
              } else {
                return new Date(a[column]) >= new Date(b[column]) ? -1 : 1;
              }
            }) || [],
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
            
            if (table === 'subjects') {
              newItem.subject_number = `${data.brand_id?.toUpperCase().replace('-', '')}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
              newItem.status = 'pending';
            }
            
            if (table === 'subject_bills') {
              newItem.bill_number = `BILL-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
            }
            
            if (table === 'subject_accessories') {
              newItem.line_total = data.discounted_mrp * data.quantity;
              newItem.base_price = data.discounted_mrp / 1.18;
              newItem.gst_amount = data.discounted_mrp - newItem.base_price;
              newItem.discount_amount = data.mrp - data.discounted_mrp;
            }
            
            if (table === 'amc_contracts') {
              newItem.contract_number = `AMC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
              if (data.duration_years && !data.end_date) {
                const startDate = new Date(data.start_date);
                startDate.setFullYear(startDate.getFullYear() + data.duration_years);
                newItem.end_date = startDate.toISOString().split('T')[0];
              }
            }
            
            if (table === 'attendance_logs') {
              newItem.check_in = data.check_in || new Date().toISOString();
            }
            
            if (table === 'technicians' && data.role === 'technician') {
              newItem.daily_subject_limit = 10;
              newItem.is_active = true;
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
                
                const updatedItem = {
                  ...mockData[table][index],
                  ...data,
                  updated_at: new Date().toISOString()
                };
                
                // Add status history for subjects
                if (table === 'subjects' && data.status && data.status !== mockData[table][index].status) {
                  const historyItem = {
                    id: `history-${Date.now()}`,
                    subject_id: value,
                    old_status: mockData[table][index].status,
                    new_status: data.status,
                    created_at: new Date().toISOString(),
                    changed_by: 'test-user'
                  };
                  mockData.subject_status_history = [...(mockData.subject_status_history || []), historyItem];
                }
                
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
                  error: null
                });
              }
              
              const updatedItem = {
                ...mockData[table][index],
                ...data,
                updated_at: new Date().toISOString()
              };
              
              // Add status history for subjects
              if (table === 'subjects' && data.status && data.status !== mockData[table][index].status) {
                const historyItem = {
                  id: `history-${Date.now()}`,
                  subject_id: value,
                  old_status: mockData[table][index].status,
                  new_status: data.status,
                  created_at: new Date().toISOString(),
                  changed_by: 'test-user'
                };
                mockData.subject_status_history = [...(mockData.subject_status_history || []), historyItem];
              }
              
              mockData[table][index] = updatedItem;
              
              return Promise.resolve({
                data: updatedItem,
                error: null
              });
            }
          })
        }),
        is: (column: string, value: any) => ({
          select: (columns?: string) => ({
            then: (resolve: any) => {
              const updatedItems = mockData[table]?.filter((item: any) => item[column] === value).map((item: any) => ({
                ...item,
                ...data,
                updated_at: new Date().toISOString()
              })) || [];
              
              updatedItems.forEach((updatedItem: any) => {
                const index = mockData[table]?.findIndex(item => item.id === updatedItem.id);
                if (index !== -1) {
                  mockData[table][index] = updatedItem;
                }
              });
              
              return Promise.resolve({
                data: updatedItems,
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
      error: { message: 'Function not found' }
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
        },
      
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
