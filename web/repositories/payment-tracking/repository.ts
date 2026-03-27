import { 
  DuePayment, 
  PaymentCollectionForm, 
  PaymentCollectionPayload,
  DuePaymentsSummary,
  DuePaymentsFilter,
  DuePaymentsSort,
  PaginatedResponse 
} from '../../modules/payment-tracking/payment-tracking.types';

// ============================================================================
// PAYMENT TRACKING REPOSITORY LAYER
// ============================================================================

export class PaymentTrackingRepository {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  // ============================================================================
  // DUE PAYMENTS DATA ACCESS
  // ============================================================================

  /**
   * Fetch due payments summary from database
   */
  async fetchDuePaymentsSummary(): Promise<DuePaymentsSummary> {
    const { data, error } = await this.supabase.rpc('calculate_due_payments_summary');
    
    if (error) {
      console.error('Repository error fetching due payments summary:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * Fetch paginated due payments with filters
   */
  async fetchDuePayments(
    filter: DuePaymentsFilter = {},
    sort: DuePaymentsSort = { field: 'service_completed_at', direction: 'desc' },
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse> {
    try {
      // Build the query
      let query = this.supabase
        .from('due_payments')
        .select('*', { count: 'exact' });

      // Apply filters
      this.applyFilters(query, filter);

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
      console.error('Repository error fetching due payments:', error);
      throw error;
    }
  }

  /**
   * Fetch single due payment by bill ID
   */
  async fetchDuePayment(billId: string): Promise<DuePayment | null> {
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
      console.error('Repository error fetching due payment:', error);
      throw error;
    }
  }

  // ============================================================================
  // PAYMENT COLLECTION DATA ACCESS
  // ============================================================================

  /**
   * Record payment collection in database
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
        .eq('id', payload.bill_id)
        .select()
        .single();

      if (error) throw error;
    } catch (error) {
      console.error('Repository error recording payment collection:', error);
      throw error;
    }
  }

  /**
   * Bulk record payment collections
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
        .in('id', billIds)
        .select();

      if (error) throw error;
    } catch (error) {
      console.error('Repository error recording bulk payment collection:', error);
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
        .eq('id', billId)
        .select()
        .single();

      if (error) throw error;
    } catch (error) {
      console.error('Repository error updating payment collection notes:', error);
      throw error;
    }
  }

  // ============================================================================
  // REPORTS AND ANALYTICS DATA ACCESS
  // ============================================================================

  /**
   * Fetch technician payment history
   */
  async fetchTechnicianPaymentHistory(
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
      console.error('Repository error fetching technician payment history:', error);
      throw error;
    }
  }

  /**
   * Fetch daily payment collection report
   */
  async fetchDailyPaymentCollectionReport(
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
      console.error('Repository error fetching daily payment collection report:', error);
      throw error;
    }
  }

  /**
   * Fetch payment collection statistics
   */
  async fetchPaymentCollectionStats(
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
      console.error('Repository error fetching payment collection stats:', error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY DATA ACCESS METHODS
  // ============================================================================

  /**
   * Check if payment can be collected for a bill
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
      console.error('Repository error checking payment collection eligibility:', error);
      return false;
    }
  }

  /**
   * Get bill details for payment collection
   */
  async fetchBillForPayment(billId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('subject_bills')
        .select(`
          id,
          total_amount,
          payment_status,
          payment_collected,
          subjects!inner(
            subject_number,
            customer_id,
            customers!inner(
              name,
              phone,
              email
            )
          )
        `)
        .eq('id', billId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Repository error fetching bill for payment:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Apply filters to due payments query
   */
  private applyFilters(query: any, filter: DuePaymentsFilter): void {
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
  }
}

// ============================================================================
// REPOSITORY INSTANCE
// ============================================================================

let paymentTrackingRepository: PaymentTrackingRepository | null = null;

export function getPaymentTrackingRepository(supabaseClient: any): PaymentTrackingRepository {
  if (!paymentTrackingRepository) {
    paymentTrackingRepository = new PaymentTrackingRepository(supabaseClient);
  }
  return paymentTrackingRepository;
}
