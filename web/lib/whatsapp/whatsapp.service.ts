import { createAdminClient } from '@/lib/supabase/admin';
import { sendWhatsAppMessage } from './fast2sms';

export type NotificationType = 
  | 'JOB_ALLOCATED'
  | 'TECHNICIAN_ARRIVED'
  | 'JOB_COMPLETED'
  | 'BILLING_GENERATED';

interface SendNotificationOptions {
  phone: string;
  name: string;
  type: NotificationType;
  subjectNumber: string;
  technicianName?: string;
  technicianPhone?: string;
  amount?: number;
  referenceId: string; // subjectId
}

/**
 * WhatsApp Notification Service
 * 
 * Handles template formatting, API calling, and logging to the 'notifications' table.
 */
export async function sendJobNotification(options: SendNotificationOptions) {
  const { phone, name, type, subjectNumber, technicianName, technicianPhone, amount, referenceId } = options;
  
  // 1. Format Message Template
  let message = '';
  switch (type) {
    case 'JOB_ALLOCATED':
      message = `Hello ${name}, your service ticket ${subjectNumber} is assigned to technician ${technicianName}. For queries, contact: ${technicianPhone}. - Hi Tech Engineering`;
      break;
    case 'TECHNICIAN_ARRIVED':
      message = `Hi ${name}, technician ${technicianName} has arrived at your location for service ${subjectNumber}. - Hi Tech Engineering`;
      break;
    case 'JOB_COMPLETED':
      message = `Success! Your service ticket ${subjectNumber} is completed. Thank you for choosing Hi Tech Engineering.`;
      break;
    case 'BILLING_GENERATED':
      message = `Invoice for ${subjectNumber} is ready. Amount: ₹${amount}. You can download the bill from the link provided by our technician. - Hi Tech Engineering`;
      break;
  }

  if (!message) return { success: false, error: 'INVALID_TEMPLATE' };

  // 2. Send via Fast2SMS
  const apiResult = await sendWhatsAppMessage(phone, message);
  
  // 3. Log to Database (Admin client to bypass RLS)
  const admin = createAdminClient();
  const { error } = await admin
    .from('notifications')
    .insert({
      recipient_phone: phone,
      recipient_name: name,
      notification_type: type,
      message: message,
      status: apiResult.success ? 'SENT' : 'FAILED',
      reference_type: 'SUBJECT',
      reference_id: referenceId,
      sent_at: apiResult.success ? new Date().toISOString() : null,
      failed_reason: apiResult.success ? null : apiResult.error,
      fast2sms_response_id: apiResult.requestId,
    });

  if (error) {
    console.error(`Failed to log notification for ${subjectNumber}:`, error);
  }

  return apiResult;
}
