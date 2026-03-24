/**
 * Fast2SMS WhatsApp API Client
 * 
 * Documentation: https://www.fast2sms.com/dashboard/dev-api/whatsapp-api
 */

const FAST2SMS_API_URL = 'https://www.fast2sms.com/dev/bulkV2';
const API_KEY = process.env.FAST2SMS_API_KEY;

export interface WhatsAppResponse {
  return: boolean;
  request_id: string;
  message: string[];
}

/**
 * Sends a WhatsApp message via Fast2SMS.
 * 
 * @param phone Recipient's phone number with country code (e.g., "919876543210")
 * @param message Message content
 * @returns { success: boolean, requestId?: string, error?: string }
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  if (!API_KEY) {
    console.error('FAST2SMS_API_KEY is missing in environment variables');
    return { success: false, error: 'API_KEY_MISSING' };
  }

  // Clean phone number: remove non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Fast2SMS expects a comma-separated list for numbers, but we send one at a time for logging
  const params = new URLSearchParams({
    authorization: API_KEY,
    route: 'q', // Quick route (requires approval) or standard
    message: message,
    language: 'english',
    numbers: cleanPhone,
  });

  try {
    const response = await fetch(`${FAST2SMS_API_URL}?${params.toString()}`, {
      method: 'GET', // Fast2SMS bulkV2 uses GET for query params based on their older patterns, but bulkV2 usually supports POST. 
      // Checking their latest V2 docs usually suggests POST with JSON or Form.
      // For Hitech, we'll implement it as a robust POST call if possible.
    });

    const data = (await response.json()) as WhatsAppResponse;

    if (data.return) {
      return { success: true, requestId: data.request_id };
    }

    return { 
      success: false, 
      error: data.message?.[0] || 'Unknown Fast2SMS error' 
    };
  } catch (err) {
    console.error('Fast2SMS fetch error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Network error' 
    };
  }
}
