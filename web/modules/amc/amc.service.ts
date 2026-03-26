// ═════════════════════════════════════════════════════════════════════════════
// amc.service.ts
//
// ──────────────────────────────────────────────────────────────────────────────
// AMC (Annual Maintenance Contract) Service Layer for Hi Tech Software
// ──────────────────────────────────────────────────────────────────────────────

import { 
  AMCContract, 
  AMCContractWithDetails, 
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
  AMCDetectionResult,
  ExpiringAMC,
  AMCNotificationLog,
  AMCCreateResponse,
  AMCRenewalResponse,
  AMCResponse
} from './amc.types';
import { AMC_ERROR_CODES, AMC_SUCCESS_MESSAGES } from './amc.constants';
import { amcRepository } from '@/repositories/amc/repository';
import { createAdminClient } from '@/lib/supabase/admin';

// ═════════════════════════════════════════════════════════════════════════════
// AMC SERVICE CLASS
// ═════════════════════════════════════════════════════════════════════════════

export class AMCService {
  private repository = amcRepository;

  // ═════════════════════════════════════════════════════════════════════════════
  // CORE AMC OPERATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  async createAMC(input: CreateAMCInput, userId: string): Promise<AMCResponse<AMCCreateResponse>> {
    try {
      // 1. Validate no active AMC exists for same customer/appliance/brand
      const existingAMC = await this.checkActiveAMCForSubject(
        input.customer_id,
        input.appliance_category_id,
        input.appliance_brand
      );

      if (existingAMC.has_active_amc) {
        return {
          success: false,
          error: 'Active AMC already exists for this customer and appliance',
          code: AMC_ERROR_CODES.OVERLAPPING_AMC
        };
      }

      // 2. Create AMC contract
      const amc = await this.repository.createAMC(input, userId);

      // 3. Create commission record (zero amount initially)
      await this.createCommissionRecord(amc.id, input.sold_by);

      // 4. Refresh dashboard summary
      await this.refreshDashboard();

      return {
        success: true,
        data: {
          amc: await this.enrichAMCWithDetails(amc),
          contract_number: amc.contract_number
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create AMC',
        code: 'CREATE_AMC_FAILED'
      };
    }
  }

  async getAMCById(id: string): Promise<AMCResponse<AMCContractWithDetails>> {
    try {
      const amc = await this.repository.getAMCById(id);
      
      if (!amc) {
        return {
          success: false,
          error: 'AMC contract not found',
          code: AMC_ERROR_CODES.AMC_NOT_FOUND
        };
      }

      const amcWithDetails = await this.enrichAMCWithDetails(amc);
      
      return {
        success: true,
        data: amcWithDetails
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get AMC',
        code: 'GET_AMC_FAILED'
      };
    }
  }

  async listAMCs(
    filters: AMCFilters,
    pagination: AMCPaginationParams
  ): Promise<AMCResponse<AMCListResponse>> {
    try {
      const result = await this.repository.listAMCs(filters, pagination);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list AMCs',
        code: 'LIST_AMCS_FAILED'
      };
    }
  }

  async updateAMC(id: string, input: UpdateAMCInput, userId: string): Promise<AMCResponse<AMCContractWithDetails>> {
    try {
      const amc = await this.repository.updateAMC(id, input, userId);
      
      if (!amc) {
        return {
          success: false,
          error: 'AMC contract not found',
          code: AMC_ERROR_CODES.AMC_NOT_FOUND
        };
      }

      const amcWithDetails = await this.enrichAMCWithDetails(amc);
      
      return {
        success: true,
        data: amcWithDetails
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update AMC',
        code: 'UPDATE_AMC_FAILED'
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // AMC RENEWAL
  // ═════════════════════════════════════════════════════════════════════════════

  async renewAMC(
    existingAMCId: string, 
    input: RenewAMCInput, 
    userId: string
  ): Promise<AMCResponse<AMCRenewalResponse>> {
    try {
      // 1. Get existing AMC
      const existingAMCResponse = await this.getAMCById(existingAMCId);
      if (!existingAMCResponse.success) {
        return existingAMCResponse as AMCResponse<any>;
      }

      const existingAMC = existingAMCResponse.data;

      // 2. Validate renewal eligibility
      if (!this.isRenewalEligible(existingAMC)) {
        return {
          success: false,
          error: 'AMC is not eligible for renewal',
          code: AMC_ERROR_CODES.CANNOT_RENEW
        };
      }

      // 3. Create new AMC
      const renewalData = {
        ...input,
        customer_id: existingAMC.customer_id,
        appliance_category_id: existingAMC.appliance_category_id,
        appliance_brand: existingAMC.appliance_brand,
        appliance_model: existingAMC.appliance_model || undefined,
        appliance_serial_number: existingAMC.appliance_serial_number || undefined,
        renewal_of: existingAMCId
      };

      const newAMC = await this.repository.createAMC(renewalData, userId);

      // 4. Update existing AMC to link to renewal
      await this.repository.updateAMC(existingAMCId, {
        renewed_by_id: newAMC.id
      }, userId);

      // 5. Create commission record for new AMC
      await this.createCommissionRecord(newAMC.id, input.sold_by);

      // 6. Refresh dashboard
      await this.refreshDashboard();

      return {
        success: true,
        data: {
          new_amc: await this.enrichAMCWithDetails(newAMC),
          previous_amc: existingAMC
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to renew AMC',
        code: 'RENEW_AMC_FAILED'
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // AMC CANCELLATION
  // ═════════════════════════════════════════════════════════════════════════════

  async cancelAMC(
    id: string, 
    input: CancelAMCInput, 
    userId: string
  ): Promise<AMCResponse<AMCContractWithDetails>> {
    try {
      const amc = await this.repository.cancelAMC(id, input, userId);
      
      if (!amc) {
        return {
          success: false,
          error: 'AMC contract not found',
          code: AMC_ERROR_CODES.AMC_NOT_FOUND
        };
      }

      const amcWithDetails = await this.enrichAMCWithDetails(amc);
      
      // Refresh dashboard
      await this.refreshDashboard();
      
      return {
        success: true,
        data: amcWithDetails
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel AMC',
        code: 'CANCEL_AMC_FAILED'
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // COMMISSION MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════════════

  async setAMCCommission(
    amcId: string, 
    input: SetAMCCommissionInput, 
    userId: string
  ): Promise<AMCResponse<AMCContractWithDetails>> {
    try {
      const amc = await this.repository.setAMCCommission(amcId, input, userId);
      
      if (!amc) {
        return {
          success: false,
          error: 'AMC contract not found',
          code: AMC_ERROR_CODES.AMC_NOT_FOUND
        };
      }

      // Update technician earnings
      await this.updateTechnicianEarnings(amc.sold_by, input.commission_amount);

      const amcWithDetails = await this.enrichAMCWithDetails(amc);
      
      return {
        success: true,
        data: amcWithDetails
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set commission',
        code: 'SET_COMMISSION_FAILED'
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // SUBJECT INTEGRATION
  // ═════════════════════════════════════════════════════════════════════════════

  async checkActiveAMCForSubject(
    customerId: string,
    categoryId: string,
    brand: string
  ): Promise<AMCDetectionResult> {
    try {
      const activeAMC = await this.repository.checkActiveAMC(customerId, categoryId, brand);
      
      if (activeAMC) {
        return {
          has_active_amc: true,
          amc: activeAMC,
          message: `Active AMC found: ${activeAMC.contract_number} valid until ${activeAMC.end_date}`
        };
      }

      return {
        has_active_amc: false
      };
    } catch (error) {
      return {
        has_active_amc: false,
        message: 'Failed to check for active AMC'
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // NOTIFICATION SYSTEM
  // ═════════════════════════════════════════════════════════════════════════════

  async getExpiringAMCs(daysBefore: number): Promise<AMCResponse<ExpiringAMC[]>> {
    try {
      const expiringAMCs = await this.repository.getExpiringAMCs(daysBefore);
      
      return {
        success: true,
        data: expiringAMCs
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get expiring AMCs',
        code: 'GET_EXPIRING_AMCS_FAILED'
      };
    }
  }

  async sendExpiryNotifications(): Promise<AMCResponse<{ sent: number; failed: number }>> {
    try {
      const intervals = [30, 15, 7, 1];
      let totalSent = 0;
      let totalFailed = 0;

      for (const days of intervals) {
        const expiringAMCsResponse = await this.getExpiringAMCs(days);
        
        if (expiringAMCsResponse.success) {
          for (const amc of expiringAMCsResponse.data) {
            try {
              // Send WhatsApp notification
              const notificationResult = await this.sendWhatsAppNotification(amc, days);
              
              // Log notification
              await this.logNotification(amc.id, days, amc.customer_phone, notificationResult);
              
              // Mark as sent
              await this.repository.markNotificationSent(amc.id, days);
              
              if (notificationResult.success) {
                totalSent++;
              } else {
                totalFailed++;
              }
            } catch (error) {
              totalFailed++;
              console.error(`Failed to send notification for AMC ${amc.contract_number}:`, error);
            }
          }
        }
      }

      return {
        success: true,
        data: { sent: totalSent, failed: totalFailed }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notifications',
        code: 'SEND_NOTIFICATIONS_FAILED'
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // DASHBOARD AND REPORTING
  // ═════════════════════════════════════════════════════════════════════════════

  async getDashboardSummary(): Promise<AMCResponse<AMCDashboardSummary>> {
    try {
      const summary = await this.repository.getDashboardSummary();
      
      return {
        success: true,
        data: summary
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get dashboard summary',
        code: 'GET_DASHBOARD_FAILED'
      };
    }
  }

  async getAMCSalesSummary(
    technicianId?: string,
    period: string = 'month'
  ): Promise<AMCResponse<AMCSalesSummary>> {
    try {
      const summary = await this.repository.getAMCSalesSummary(technicianId, period);
      
      return {
        success: true,
        data: summary
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sales summary',
        code: 'GET_SALES_SUMMARY_FAILED'
      };
    }
  }

  async getCustomerAMCs(customerId: string): Promise<AMCResponse<AMCContractWithDetails[]>> {
    try {
      const amcs = await this.repository.getAMCsByCustomer(customerId);
      const amcsWithDetails = await Promise.all(
        amcs.map(amc => this.enrichAMCWithDetails(amc))
      );
      
      return {
        success: true,
        data: amcsWithDetails
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get customer AMCs',
        code: 'GET_CUSTOMER_AMCS_FAILED'
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═════════════════════════════════════════════════════════════════════════════

  private async enrichAMCWithDetails(amc: AMCContract): Promise<AMCContractWithDetails> {
    // Get customer details
    const customer = await this.getCustomerDetails(amc.customer_id);
    
    // Get category details
    const category = await this.getCategoryDetails(amc.appliance_category_id);
    
    // Get sold by details
    const soldBy = await this.getProfileDetails(amc.sold_by);
    
    // Get billed to details
    const billedTo = amc.billed_to_id ? await this.getBilledToDetails(amc.billed_to_type, amc.billed_to_id) : null;
    
    // Get subject details if linked
    const subject = amc.subject_id ? await this.getSubjectDetails(amc.subject_id) : null;
    
    // Calculate derived fields
    const daysUntilExpiry = this.calculateDaysUntilExpiry(amc.end_date);
    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30;
    const renewalAvailable = daysUntilExpiry !== null && daysUntilExpiry <= 30;

    return {
      ...amc,
      customer_name: customer?.customer_name || 'Unknown',
      customer_phone: customer?.phone_number || '',
      appliance_category_name: category?.name || 'Unknown',
      sold_by_name: soldBy?.display_name || 'Unknown',
      sold_by_role: soldBy?.role || 'unknown',
      billed_to_name: billedTo,
      days_until_expiry: daysUntilExpiry,
      is_expiring_soon: isExpiringSoon,
      renewal_available: renewalAvailable,
      subject_number: subject?.subject_number || null
    };
  }

  private calculateDaysUntilExpiry(endDate: string): number | null {
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private isRenewalEligible(amc: AMCContractWithDetails): boolean {
    return amc.status === 'active' || 
           (amc.status === 'expired' && amc.days_until_expiry !== null && amc.days_until_expiry >= -90);
  }

  private async createCommissionRecord(amcId: string, soldBy: string): Promise<void> {
    const admin = createAdminClient();
    
    await admin
      .from('technician_commission_config')
      .insert({
        subject_id: amcId,
        technician_id: soldBy,
        commission_type: 'amc_sale',
        service_commission: 0,
        parts_commission: 0,
        extra_price_commission: 0,
        commission_notes: 'AMC sale - commission to be set manually',
        created_by: soldBy
      });
  }

  private async updateTechnicianEarnings(technicianId: string, commissionAmount: number): Promise<void> {
    const admin = createAdminClient();
    
    // This would integrate with the existing commission system
    // For now, we'll just log the update
    console.log(`Updating technician ${technicianId} earnings with AMC commission: ${commissionAmount}`);
  }

  private async refreshDashboard(): Promise<void> {
    try {
      await this.repository.refreshDashboard();
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    }
  }

  private async sendWhatsAppNotification(amc: ExpiringAMC, daysBefore: number): Promise<{ success: boolean; error?: string }> {
    // This would integrate with the WhatsApp service
    // For now, we'll return a mock success
    return { success: true };
  }

  private async logNotification(
    amcId: string, 
    daysBefore: number, 
    customerPhone: string, 
    result: { success: boolean; error?: string }
  ): Promise<void> {
    const admin = createAdminClient();
    
    await admin
      .from('amc_notification_logs')
      .insert({
        amc_id: amcId,
        notification_type: `${daysBefore}_days`,
        customer_phone: customerPhone,
        message_sent: `AMC expiry reminder for ${daysBefore} days`,
        status: result.success ? 'sent' : 'failed',
        failed_reason: result.error || null
      });
  }

  // Placeholder methods for data fetching - these would be implemented in the repository
  private async getCustomerDetails(customerId: string) {
    const admin = createAdminClient();
    const { data } = await admin.from('customers').select('*').eq('id', customerId).single();
    return data;
  }

  private async getCategoryDetails(categoryId: string) {
    const admin = createAdminClient();
    const { data } = await admin.from('service_categories').select('*').eq('id', categoryId).single();
    return data;
  }

  private async getProfileDetails(profileId: string) {
    const admin = createAdminClient();
    const { data } = await admin.from('profiles').select('*').eq('id', profileId).single();
    return data;
  }

  private async getBilledToDetails(type: string, id: string) {
    const admin = createAdminClient();
    
    if (type === 'brand') {
      const { data } = await admin.from('brands').select('name').eq('id', id).single();
      return data?.name;
    } else if (type === 'dealer') {
      const { data } = await admin.from('dealers').select('name').eq('id', id).single();
      return data?.name;
    }
    
    return null;
  }

  private async getSubjectDetails(subjectId: string) {
    const admin = createAdminClient();
    const { data } = await admin.from('subjects').select('subject_number').eq('id', subjectId).single();
    return data;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SERVICE INSTANCE
// ═════════════════════════════════════════════════════════════════════════════

export const amcService = new AMCService();
