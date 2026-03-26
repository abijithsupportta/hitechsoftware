// ═════════════════════════════════════════════════════════════════════════════
// amc.repository.ts
//
// ──────────────────────────────────────────────────────────────────────────────
// AMC (Annual Maintenance Contract) Repository for Hi Tech Software
// ──────────────────────────────────────────────────────────────────────────────

import { 
  AMCContract, 
  CreateAMCInput, 
  UpdateAMCInput, 
  RenewAMCInput, 
  CancelAMCInput, 
  SetAMCCommissionInput,
  AMCFilters,
  AMCPaginationParams,
  AMCListResponse,
  AMCDashboardSummary,
  AMCSalesSummary,
  ActiveAMCCheck,
  ExpiringAMC,
  AMCNotificationLog
} from '@/modules/amc/amc.types';
import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';

// ═════════════════════════════════════════════════════════════════════════════
// AMC REPOSITORY CLASS
// ═════════════════════════════════════════════════════════════════════════════

export class AMCRepository {
  private client = createClient();
  private admin = createAdminClient();

  // ═════════════════════════════════════════════════════════════════════════════
  // CORE AMC OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  async createAMC(input: CreateAMCInput, userId: string): Promise<AMCContract> {
    // Generate contract number
    const { data: contractData, error: contractError } = await this.client
      .rpc('generate_amc_contract_number');

    if (contractError || !contractData) {
      throw new Error('Failed to generate contract number');
    }

    // Calculate end date if not custom
    let endDate = input.end_date;
    if (input.duration_type !== 'custom') {
      const { data: endDateData, error: endDateError } = await this.client
        .rpc('calculate_amc_end_date', { 
          p_start_date: input.start_date, 
          p_duration_type: input.duration_type 
        });

      if (endDateError || !endDateData) {
        throw new Error('Failed to calculate end date');
      }
      endDate = endDateData;
    }

    // Create AMC contract
    const { data, error } = await this.client
      .from('amc_contracts')
      .insert({
        contract_number: contractData,
        customer_id: input.customer_id,
        subject_id: input.subject_id || null,
        appliance_category_id: input.appliance_category_id,
        appliance_brand: input.appliance_brand,
        appliance_model: input.appliance_model || null,
        appliance_serial_number: input.appliance_serial_number || null,
        duration_type: input.duration_type,
        start_date: input.start_date,
        end_date: endDate,
        price_paid: input.price_paid,
        payment_mode: input.payment_mode,
        billed_to_type: input.billed_to_type,
        billed_to_id: input.billed_to_id,
        sold_by: input.sold_by,
        coverage_description: input.coverage_description,
        free_visits_per_year: input.free_visits_per_year || null,
        parts_covered: input.parts_covered || false,
        parts_coverage_limit: input.parts_coverage_limit || null,
        brands_covered: input.brands_covered || null,
        exclusions: input.exclusions || null,
        special_terms: input.special_terms || null,
        created_by: userId
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create AMC: ${error.message}`);
    }

    return data;
  }

  async getAMCById(id: string): Promise<AMCContract | null> {
    const { data, error } = await this.client
      .from('amc_contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get AMC: ${error.message}`);
    }

    return data;
  }

  async listAMCs(
    filters: AMCFilters,
    pagination: AMCPaginationParams
  ): Promise<AMCListResponse> {
    let query = this.client
      .from('amc_contracts')
      .select(`
        *,
        customer:customers(customer_name, phone_number),
        category:service_categories(name),
        sold_by_profile:profiles(display_name, role),
        billed_to_brand:brands!inner(name),
        billed_to_dealer:dealers!inner(name)
      `, { count: 'exact' });

    // Apply filters
    if (filters.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.sold_by) {
      query = query.eq('sold_by', filters.sold_by);
    }

    if (filters.billed_to_type) {
      query = query.eq('billed_to_type', filters.billed_to_type);
    }

    if (filters.duration_type) {
      query = query.eq('duration_type', filters.duration_type);
    }

    if (filters.start_date) {
      query = query.gte('start_date', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('end_date', filters.end_date);
    }

    if (filters.expiring_within_days) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + filters.expiring_within_days);
      query = query.lte('end_date', targetDate.toISOString().split('T')[0]);
      query = query.gte('end_date', new Date().toISOString().split('T')[0]);
    }

    if (filters.search) {
      query = query.or(`contract_number.ilike.%${filters.search}%,customer.customer_name.ilike.%${filters.search}%`);
    }

    // Apply pagination
    query = query
      .range(pagination.offset, pagination.offset + pagination.limit - 1)
      .order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list AMCs: ${error.message}`);
    }

    // Transform data to list format
    const listData = data?.map(amc => ({
      id: amc.id,
      contract_number: amc.contract_number,
      customer_name: amc.customer?.customer_name || 'Unknown',
      customer_phone: amc.customer?.phone_number || '',
      appliance_category_name: amc.category?.name || 'Unknown',
      appliance_brand: amc.appliance_brand,
      start_date: amc.start_date,
      end_date: amc.end_date,
      status: amc.status,
      price_paid: amc.price_paid,
      payment_mode: amc.payment_mode,
      sold_by_name: amc.sold_by_profile?.display_name || 'Unknown',
      days_until_expiry: this.calculateDaysUntilExpiry(amc.end_date),
      is_expiring_soon: this.isExpiringSoon(amc.end_date),
      commission_set: amc.commission_amount > 0,
      renewal_available: this.isRenewalAvailable(amc.end_date, amc.status)
    })) || [];

    return {
      data: listData,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pagination.limit)
      }
    };
  }

  async updateAMC(id: string, input: UpdateAMCInput, userId: string): Promise<AMCContract | null> {
    const { data, error } = await this.client
      .from('amc_contracts')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to update AMC: ${error.message}`);
    }

    return data;
  }

  async cancelAMC(id: string, input: CancelAMCInput, userId: string): Promise<AMCContract | null> {
    const { data, error } = await this.client
      .from('amc_contracts')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancellation_reason: input.cancellation_reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to cancel AMC: ${error.message}`);
    }

    return data;
  }

  async setAMCCommission(id: string, input: SetAMCCommissionInput, userId: string): Promise<AMCContract | null> {
    const { data, error } = await this.client
      .from('amc_contracts')
      .update({
        commission_amount: input.commission_amount,
        commission_set_by: userId,
        commission_set_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to set commission: ${error.message}`);
    }

    return data;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SUBJECT INTEGRATION
  // ═════════════════════════════════════════════════════════════════════════════

  async checkActiveAMC(
    customerId: string,
    categoryId: string,
    brand: string
  ): Promise<ActiveAMCCheck | null> {
    const { data, error } = await this.client
      .rpc('check_active_amc_for_appliance', {
        p_customer_id: customerId,
        p_appliance_category_id: categoryId,
        p_appliance_brand: brand
      });

    if (error) {
      throw new Error(`Failed to check active AMC: ${error.message}`);
    }

    if (data && data.length > 0) {
      return data[0];
    }

    return null;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // NOTIFICATION SYSTEM
  // ═════════════════════════════════════════════════════════════════════════════

  async getExpiringAMCs(daysBefore: number): Promise<ExpiringAMC[]> {
    const { data, error } = await this.client
      .rpc('get_expiring_amcs', { p_days_before: daysBefore });

    if (error) {
      throw new Error(`Failed to get expiring AMCs: ${error.message}`);
    }

    return data || [];
  }

  async markNotificationSent(amcId: string, daysBefore: number): Promise<void> {
    const { error } = await this.client
      .rpc('mark_amc_notification_sent', {
        p_amc_id: amcId,
        p_days_before: daysBefore
      });

    if (error) {
      throw new Error(`Failed to mark notification sent: ${error.message}`);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // DASHBOARD AND REPORTING
  // ═════════════════════════════════════════════════════════════════════════════

  async getDashboardSummary(): Promise<AMCDashboardSummary> {
    const { data, error } = await this.client
      .from('amc_dashboard_summary')
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to get dashboard summary: ${error.message}`);
    }

    return data;
  }

  async getAMCSalesSummary(technicianId?: string, period: string = 'month'): Promise<AMCSalesSummary> {
    // This would be implemented with a more complex query
    // For now, returning a mock implementation
    return {
      total_amcs_sold: 0,
      total_revenue_generated: 0,
      total_commission_earned: 0,
      average_amc_price: 0,
      renewal_rate: 0
    };
  }

  async getAMCsByCustomer(customerId: string): Promise<AMCContract[]> {
    const { data, error } = await this.client
      .from('amc_contracts')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get customer AMCs: ${error.message}`);
    }

    return data || [];
  }

  async getAMCsBySoldBy(soldBy: string): Promise<AMCContract[]> {
    const { data, error } = await this.client
      .from('amc_contracts')
      .select('*')
      .eq('sold_by', soldBy)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get AMCs by sold by: ${error.message}`);
    }

    return data || [];
  }

  async refreshDashboard(): Promise<void> {
    const { error } = await this.client
      .rpc('refresh_amc_dashboard_summary');

    if (error) {
      throw new Error(`Failed to refresh dashboard: ${error.message}`);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═════════════════════════════════════════════════════════════════════════════

  private calculateDaysUntilExpiry(endDate: string): number | null {
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private isExpiringSoon(endDate: string): boolean {
    const daysUntil = this.calculateDaysUntilExpiry(endDate);
    return daysUntil !== null && daysUntil <= 30 && daysUntil >= 0;
  }

  private isRenewalAvailable(endDate: string, status: string): boolean {
    const daysUntil = this.calculateDaysUntilExpiry(endDate);
    return (status === 'active' && daysUntil !== null && daysUntil <= 30) ||
           (status === 'expired' && daysUntil !== null && daysUntil >= -90);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// REPOSITORY INSTANCE
// ═════════════════════════════════════════════════════════════════════════════

export const amcRepository = new AMCRepository();
