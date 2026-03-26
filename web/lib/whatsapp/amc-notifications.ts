// ═════════════════════════════════════════════════════════════════════════════
// amc-notifications.ts
//
// ──────────────────────────────────────────────────────────────────────────────
// AMC WhatsApp Notification System for Hi Tech Software
// ──────────────────────────────────────────────────────────────────────────────

import { sendWhatsAppMessage } from './fast2sms';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatAMCWhatsAppMessage } from '@/modules/amc/amc.constants';
import { ExpiringAMC } from '@/modules/amc/amc.types';

// ═════════════════════════════════════════════════════════════════════════════
// AMC NOTIFICATION FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

export async function sendAMCExpiryNotification(
  amc: ExpiringAMC, 
  daysBefore: number
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  try {
    // Convert days to notification type
    const notificationType = `${daysBefore}_days` as '30_days' | '15_days' | '7_days' | '1_day';
    
    // Format the WhatsApp message
    const message = formatAMCWhatsAppMessage(
      notificationType,
      {
        customerName: amc.customer_name,
        applianceBrand: amc.appliance_brand,
        category: amc.appliance_category_name,
        amcNumber: amc.contract_number,
        endDate: new Date(amc.end_date).toLocaleDateString('en-IN'),
        phoneNumber: '+91 85903 77418' // Hi Tech Engineering contact
      }
    );

    // Send WhatsApp message
    const result = await sendWhatsAppMessage(amc.customer_phone, message);

    if (result.success) {
      // Log the notification
      await logAMCNotification({
        amc_id: amc.id,
        notification_type: notificationType,
        customer_phone: amc.customer_phone,
        message_sent: message,
        status: 'sent',
        fast2sms_response_id: result.requestId
      });
    } else {
      // Log the failed notification
      await logAMCNotification({
        amc_id: amc.id,
        notification_type: notificationType,
        customer_phone: amc.customer_phone,
        message_sent: message,
        status: 'failed',
        failed_reason: result.error
      });
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log the error
    await logAMCNotification({
      amc_id: amc.id,
      notification_type: `${daysBefore}_days` as '30_days' | '15_days' | '7_days' | '1_day',
      customer_phone: amc.customer_phone,
      message_sent: '',
      status: 'failed',
      failed_reason: errorMessage
    });

    return {
      success: false,
      error: errorMessage
    };
  }
}

export async function processAMCNotifications(): Promise<{
  sent: number;
  failed: number;
  total: number;
  details: Array<{
    amcId: string;
    contractNumber: string;
    customerName: string;
    daysBefore: number;
    status: 'sent' | 'failed';
    error?: string;
  }>;
}> {
  const intervals = [30, 15, 7, 1];
  const results = {
    sent: 0,
    failed: 0,
    total: 0,
    details: [] as Array<{
      amcId: string;
      contractNumber: string;
      customerName: string;
      daysBefore: number;
      status: 'sent' | 'failed';
      error?: string;
    }>
  };

  const admin = createAdminClient();

  for (const days of intervals) {
    try {
      // Get expiring AMCs for this interval
      const { data: expiringAMCs, error } = await admin
        .rpc('get_expiring_amcs', { p_days_before: days });

      if (error) {
        console.error(`Failed to get expiring AMCs for ${days} days:`, error);
        continue;
      }

      if (!expiringAMCs || expiringAMCs.length === 0) {
        continue;
      }

      // Process each expiring AMC
      for (const amc of expiringAMCs) {
        results.total++;
        
        try {
          const notificationResult = await sendAMCExpiryNotification(amc, days);
          
          if (notificationResult.success) {
            results.sent++;
            
            // Mark notification as sent in database
            await admin.rpc('mark_amc_notification_sent', {
              p_amc_id: amc.id,
              p_days_before: days
            });
          } else {
            results.failed++;
          }

          results.details.push({
            amcId: amc.id,
            contractNumber: amc.contract_number,
            customerName: amc.customer_name,
            daysBefore: days,
            status: notificationResult.success ? 'sent' : 'failed',
            error: notificationResult.error
          });
        } catch (error) {
          results.failed++;
          results.details.push({
            amcId: amc.id,
            contractNumber: amc.contract_number,
            customerName: amc.customer_name,
            daysBefore: days,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    } catch (error) {
      console.error(`Error processing ${days} day notifications:`, error);
    }
  }

  return results;
}

// ═════════════════════════════════════════════════════════════════════════════
// NOTIFICATION LOGGING
// ═════════════════════════════════════════════════════════════════════════════

interface NotificationLogInput {
  amc_id: string;
  notification_type: '30_days' | '15_days' | '7_days' | '1_day';
  customer_phone: string;
  message_sent: string;
  status: 'sent' | 'failed';
  fast2sms_response_id?: string;
  failed_reason?: string;
}

async function logAMCNotification(input: NotificationLogInput): Promise<void> {
  const admin = createAdminClient();
  
  try {
    await admin
      .from('amc_notification_logs')
      .insert({
        amc_id: input.amc_id,
        notification_type: input.notification_type,
        customer_phone: input.customer_phone,
        message_sent: input.message_sent,
        status: input.status,
        fast2sms_response_id: input.fast2sms_response_id || null,
        failed_reason: input.failed_reason || null
      });
  } catch (error) {
    console.error('Failed to log AMC notification:', error);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

export async function getAMCNotificationHistory(
  amcId: string
): Promise<Array<{
  id: string;
  notification_type: string;
  sent_at: string;
  customer_phone: string;
  message_sent: string;
  status: string;
  fast2sms_response_id: string | null;
  failed_reason: string | null;
}>> {
  const admin = createAdminClient();
  
  try {
    const { data, error } = await admin
      .from('amc_notification_logs')
      .select('*')
      .eq('amc_id', amcId)
      .order('sent_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get AMC notification history:', error);
    return [];
  }
}

export async function resendAMCNotification(
  amcId: string,
  notificationType: '30_days' | '15_days' | '7_days' | '1_day'
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  
  try {
    // Get AMC details
    const { data: amc, error: amcError } = await admin
      .from('amc_contracts')
      .select(`
        *,
        customer:customers(customer_name, phone_number),
        category:service_categories(name)
      `)
      .eq('id', amcId)
      .single();

    if (amcError || !amc) {
      return {
        success: false,
        error: 'AMC not found'
      };
    }

    // Convert to ExpiringAMC format
    const expiringAMC: ExpiringAMC = {
      id: amc.id,
      contract_number: amc.contract_number,
      customer_id: amc.customer_id,
      customer_name: amc.customer.customer_name,
      customer_phone: amc.customer.phone_number,
      end_date: amc.end_date,
      appliance_brand: amc.appliance_brand,
      appliance_category_name: amc.category.name
    };

    // Extract days from notification type
    const days = parseInt(notificationType.split('_')[0]);

    // Send notification
    const result = await sendAMCExpiryNotification(expiringAMC, days);

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// NOTIFICATION STATISTICS
// ═════════════════════════════════════════════════════════════════════════════

export async function getAMCNotificationStats(
  period: 'today' | 'week' | 'month' = 'month'
): Promise<{
  total: number;
  sent: number;
  failed: number;
  successRate: number;
}> {
  const admin = createAdminClient();
  
  try {
    let startDate = new Date();
    
    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const { data, error } = await admin
      .from('amc_notification_logs')
      .select('status')
      .gte('sent_at', startDate.toISOString());

    if (error) {
      throw error;
    }

    const total = data?.length || 0;
    const sent = data?.filter(log => log.status === 'sent').length || 0;
    const failed = data?.filter(log => log.status === 'failed').length || 0;
    const successRate = total > 0 ? (sent / total) * 100 : 0;

    return {
      total,
      sent,
      failed,
      successRate
    };
  } catch (error) {
    console.error('Failed to get AMC notification stats:', error);
    return {
      total: 0,
      sent: 0,
      failed: 0,
      successRate: 0
    };
  }
}
