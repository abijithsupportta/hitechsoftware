import { vi } from 'vitest';

// Mock Supabase client for billing and GST testing
export function createMockSupabaseClient() {
  const mockData: Record<string, any[]> = {
    profiles: [],
    customers: [],
    subjects: [],
    amc_contracts: [],
    subject_bills: [],
    subject_accessories: []
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
            if (table === 'subject_accessories' && currentUserRole === 'technician') {
              // Check if technician is trying to add discount
              if (data.discount_percentage > 0 || data.discount_flat > 0) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Permission denied', code: '42501' }
                });
              }
            }

            const newItem = {
              id: `${table}-${Date.now()}`,
              created_at: new Date().toISOString(),
              created_by: currentUser?.id || null,
              ...data
            };
            
            // Special handling for different tables
            if (table === 'subject_bills') {
              newItem.bill_number = `BILL-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
              newItem.payment_status = newItem.payment_status || 'due';
            } else {
              newItem.extra_price_collected = 0;
            }
            
            // Permission validation for discounts
            const userRole = currentUserRole;
            if (userRole === 'technician' && (newItem.discount_percentage > 0 || newItem.discount_flat > 0)) {
              return Promise.resolve({
                data: null,
                error: { message: 'Permission denied', code: '42501' }
              });
            }
            
            if (table === 'subject_accessories') {
              // Calculate GST and totals
              const discountedMRP = newItem.discounted_mrp || newItem.mrp;
              const basePrice = discountedMRP / 1.18;
              const gstAmount = discountedMRP - basePrice;
              const lineTotal = discountedMRP * (newItem.quantity || 1);
              
              newItem.base_price = Math.round(basePrice * 100) / 100;
              newItem.gst_amount = Math.round(gstAmount * 100) / 100;
              newItem.line_total = lineTotal;
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
              
              // Check if bill is locked (paid)
              if (table === 'subject_bills' && mockData[table][index].payment_status === 'paid') {
                return Promise.resolve({
                  data: null,
                  error: { message: 'bill is locked' }
                });
              }
              
              // Check if accessory belongs to paid bill
              if (table === 'subject_accessories') {
                const subjectId = mockData[table][index].subject_id;
                const bill = mockData.subject_bills?.find(b => b.subject_id === subjectId);
                if (bill && bill.payment_status === 'paid') {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'bill is locked' }
                  });
                }
              }
              
              // Check permissions for updates
              if (table === 'subject_bills' && currentUserRole === 'technician') {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Permission denied', code: '42501' }
                });
              }

              if (table === 'subject_accessories' && currentUserRole === 'technician') {
                // Check if technician is trying to update discount
                if (data.discount_percentage > 0 || data.discount_flat > 0) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Permission denied', code: '42501' }
                  });
                }
              }
              
              const updatedItem = {
                ...mockData[table][index],
                ...data,
                updated_at: new Date().toISOString()
              };
              
              // Recalculate totals for accessories
              if (table === 'subject_accessories' && updatedItem.quantity) {
                const discountedMRP = updatedItem.discounted_mrp || updatedItem.mrp;
                updatedItem.line_total = discountedMRP * updatedItem.quantity;
              }
              
              // Recalculate extra price if unit_price changed
              if (table === 'subject_accessories' && updatedItem.unit_price) {
                if (updatedItem.unit_price > updatedItem.mrp) {
                  updatedItem.extra_price_collected = (updatedItem.unit_price - updatedItem.mrp) * (updatedItem.quantity || 1);
                } else {
                  updatedItem.extra_price_collected = 0;
                }
              }
              
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
            // Check if accessory belongs to paid bill
            if (table === 'subject_accessories') {
              const item = mockData[table]?.find(item => item[column] === value);
              if (item) {
                const subjectId = item.subject_id;
                const bill = mockData.subject_bills?.find(b => b.subject_id === subjectId);
                if (bill && bill.payment_status === 'paid') {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'bill is locked' }
                  });
                }
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
      // Mock RPC functions for billing
      if (functionName === 'calculate_subject_extra_collected') {
        const subjectId = params?.subject_id;
        const accessories = mockData.subject_accessories?.filter((a: any) => a.subject_id === subjectId) || [];
        const total = accessories.reduce((sum: number, acc: any) => sum + (acc.extra_price_collected || 0), 0);
        return Promise.resolve({
          data: total,
          error: null
        });
      }
      
      if (functionName === 'generate_bill_pdf') {
        return Promise.resolve({
          data: { pdf_url: `https://example.com/bill-${Date.now()}.pdf` },
          error: null
        });
      }
      
      if (functionName === 'get_bill_pdf_content') {
        return Promise.resolve({
          data: {
            customer_name: 'Test Customer',
            customer_address: '123 Test St',
            bill_number: 'BILL-123456',
            bill_date: new Date().toISOString().split('T')[0]
          },
          error: null
        });
      }
      
      if (functionName === 'get_bill_gst_breakdown') {
        return Promise.resolve({
          data: {
            base_amount: 1016.95,
            gst_amount: 183.05,
            total_amount: 1200
          },
          error: null
        });
      }
      
      if (functionName === 'download_bill_pdf') {
        return Promise.resolve({
          data: {
            content_type: 'application/pdf',
            pdf_data: 'base64-pdf-data'
          },
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
  bill_summary: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({
          data: {
            total_bills: 10,
            total_amount: 15000,
            paid_amount: 12000,
            due_amount: 3000
          },
          error: null
        })
      })
    })
  })
};
