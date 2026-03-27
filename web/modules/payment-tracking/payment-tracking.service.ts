import { 
  DuePayment, 
  PaymentCollectionForm, 
  PaymentCollectionPayload,
  DuePaymentsSummary,
  DuePaymentsFilter,
  DuePaymentsSort,
  PaginatedResponse 
} from './payment-tracking.types';

// ============================================================================
// PAYMENT TRACKING SERVICE LAYER
// ============================================================================

export class PaymentTrackingService {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  // ============================================================================
  // DUE PAYMENTS OPERATIONS
  // ============================================================================

  /**
   * Get due payments summary statistics
   */
  async getDuePaymentsSummary(): Promise<DuePaymentsSummary> {
    try {
      const { data, error } = await this.supabase
        .from('due_payments')
        .select('total_amount, payment_collected, days_since_service', { count: 'exact' });

      if (error) throw error;

      const summary: DuePaymentsSummary = {
        total_due_amount: 0,
        total_due_count: data?.length || 0,
        overdue_count: 0,
        overdue_amount: 0,
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
      };

      data?.forEach((payment: any) => {
        summary.total_due_amount += payment.total_amount;

        if (payment.days_since_service > 7) {
          summary.overdue_count += 1;
          summary.overdue_amount += payment.total_amount;

          if (payment.days_since_service > 30) {
            summary.critical_count += 1;
          } else if (payment.days_since_service > 14) {
            summary.high_count += 1;
          } else if (payment.days_since_service > 7) {
            summary.medium_count += 1;
          }
        } else if (payment.days_since_service >= 0) {
          summary.low_count += 1;
        }
      });

      return summary;
    } catch (error) {
      console.error('Error fetching due payments summary:', error);
      throw error;
    }
  }

  /**
   * Get paginated due payments with filters and sorting
   */
  async getDuePayments(
    filter: DuePaymentsFilter = {},
    sort: DuePaymentsSort = { field: 'service_completed_at', direction: 'desc' },
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse> {
    try {
      let query = this.supabase
        .from('due_payments')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filter.technician_id) {
        query = query.eq('technician_id', filter.technician_id);
      }

      if (filter.overdue_only) {
        query = query.gt('days_since_service', 7);
      }

      if (filter.priority_level) {
        query = query.eq('priority_level', filter.priority_level);
      }

      if (filter.customer_search) {
        query = query.or(`customer_name.ilike.%${filter.customer_search}%,customer_phone.ilike.%${filter.customer_search}%`);
      }

      if (filter.date_from) {
        query = query.gte('service_completed_at', filter.date_from);
      }

      if (filter.date_to) {
        query = query.lte('service_completed_at', filter.date_to);
      }

      if (filter.amount_from) {
        query = query.gte('total_amount', filter.amount_from);
      }

      if (filter.amount_to) {
        query = query.lte('total_amount', filter.amount_to);
      }

      // Apply sorting
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching due payments:', error);
      throw error;
    }
  }

  /**
   * Get single due payment by ID
   */
  async getDuePayment(billId: string): Promise<DuePayment | null> {
    try {
      const { data, error } = await this.supabase
        .from('due_payments')
        .select('*')
        .eq('bill_id', billId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching due payment:', error);
      throw error;
    }
  }

  // ============================================================================
  // PAYMENT COLLECTION OPERATIONS
  // ============================================================================

  /**
   * Record payment collection for a bill
   */
  async recordPaymentCollection(payload: PaymentCollectionPayload): Promise<void> {
    try {
      const { user } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const updateData = {
        payment_collected: true,
        payment_collected_at: payload.payment_collected_at || new Date().toISOString(),
        payment_collected_by: user.id,
        collection_notes: payload.collection_notes,
        payment_status: 'paid',
      };

      const { error } = await this.supabase
        .from('subject_bills')
        .update(updateData)
        .eq('id', payload.bill_id);

      if (error) throw error;
    } catch (error) {
      console.error('Error recording payment collection:', error);
      throw error;
    }
  }

  /**
   * Bulk record payment collections for multiple bills
   */
  async recordBulkPaymentCollection(
    billIds: string[],
    collectionData: Omit<PaymentCollectionPayload, 'bill_id'>
  ): Promise<void> {
    try {
      const { user } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const updateData = {
        payment_collected: true,
        payment_collected_at: collectionData.payment_collected_at || new Date().toISOString(),
        payment_collected_by: user.id,
        collection_notes: collectionData.collection_notes,
        payment_status: 'paid',
      };

      const { error } = await this.supabase
        .from('subject_bills')
        .update(updateData)
        .in('id', billIds);

      if (error) throw error;
    } catch (error) {
      console.error('Error recording bulk payment collection:', error);
      throw error;
    }
  }

  /**
   * Update payment collection notes
   */
  async updatePaymentCollectionNotes(
    billId: string, 
    notes: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('subject_bills')
        .update({ collection_notes: notes })
        .eq('id', billId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating payment collection notes:', error);
      throw error;
    }
  }

  // ============================================================================
  // PAYMENT HISTORY AND REPORTS
  // ============================================================================

  /**
   * Get payment collection history for a technician
   */
  async getTechnicianPaymentHistory(
    technicianId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<any[]> {
    try {
      let query = this.supabase
        .from('subject_bills')
        .select(`
          id,
          total_amount,
          payment_collected_at,
          collection_notes,
          subjects!inner(
            subject_number,
            customer_id,
            customers!inner(
              name,
              phone
            )
          )
        `)
        .eq('payment_collected', true)
        .eq('payment_collected_by', technicianId);

      if (dateFrom) {
        query = query.gte('payment_collected_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('payment_collected_at', dateTo);
      }

      query = query.order('payment_collected_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching technician payment history:', error);
      throw error;
    }
  }

  /**
   * Get daily payment collection report
   */
  async getDailyPaymentCollectionReport(
    dateFrom: string,
    dateTo: string
  ): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('subject_bills')
        .select(`
          payment_collected_at,
          total_amount,
          payment_collected_by,
          profiles!inner(
            full_name,
            role
          )
        `)
        .eq('payment_collected', true)
        .gte('payment_collected_at', dateFrom)
        .lte('payment_collected_at', dateTo)
        .order('payment_collected_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching daily payment collection report:', error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if a bill can have payment collected
   */
  async canCollectPayment(billId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('subject_bills')
        .select('payment_status, payment_collected')
        .eq('id', billId)
        .single();

      if (error) throw error;

      return data.payment_status === 'due' && !data.payment_collected;
    } catch (error) {
      console.error('Error checking payment collection eligibility:', error);
      return false;
    }
  }

  /**
   * Get payment collection statistics for dashboard
   */
  async getPaymentCollectionStats(
    technicianId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<any> {
    try {
      let query = this.supabase
        .from('subject_bills')
        .select('total_amount, payment_collected_at, payment_collected_by', { count: 'exact' })
        .eq('payment_collected', true);

      if (technicianId) {
        query = query.eq('payment_collected_by', technicianId);
      }

      if (dateFrom) {
        query = query.gte('payment_collected_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('payment_collected_at', dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        total_collected: data?.reduce((sum: number, item: any) => sum + item.total_amount, 0) || 0,
        total_transactions: data?.length || 0,
        average_amount: data?.length ? (data.reduce((sum: number, item: any) => sum + item.total_amount, 0) / data.length) : 0,
      };

      return stats;
    } catch (error) {
      console.error('Error fetching payment collection stats:', error);
      throw error;
    }
  }
}

// ============================================================================
// SERVICE INSTANCE
// ============================================================================

let paymentTrackingService: PaymentTrackingService | null = null;

export function getPaymentTrackingService(supabaseClient: any): PaymentTrackingService {
  if (!paymentTrackingService) {
    paymentTrackingService = new PaymentTrackingService(supabaseClient);
  }
  return paymentTrackingService;
}
