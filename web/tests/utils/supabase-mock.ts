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
    profiles: []
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
    })
  };
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
