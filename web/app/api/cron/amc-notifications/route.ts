// ═════════════════════════════════════════════════════════════════════════════
// AMC Notifications Cron API Route
// ──────────────────────────────────────────────────────────────────────────────
// Processes AMC expiry notifications via cron job

import { NextRequest, NextResponse } from 'next/server';
import { processAMCNotifications } from '@/lib/whatsapp/amc-notifications';

// ═════════════════════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// ═════════════════════════════════════════════════════════════════════════════

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get('x-cron-secret');
  
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable not set');
    return false;
  }
  
  return providedSecret === cronSecret;
}

// ═════════════════════════════════════════════════════════════════════════════
// API HANDLER
// ═════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    if (!verifyCronSecret(request)) {
      console.warn('Unauthorized cron request - invalid secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting AMC notification processing...');
    const startTime = Date.now();

    // Process AMC notifications
    const results = await processAMCNotifications();
    
    const processingTime = Date.now() - startTime;
    
    // Log results
    console.log(`AMC notification processing completed in ${processingTime}ms:`, {
      total: results.total,
      sent: results.sent,
      failed: results.failed,
      successRate: results.total > 0 ? ((results.sent / results.total) * 100).toFixed(2) + '%' : '0%'
    });

    // Log failed notifications for debugging
    if (results.failed > 0) {
      console.error('Failed notifications:', results.details.filter(d => d.status === 'failed'));
    }

    return NextResponse.json({
      success: true,
      message: 'AMC notifications processed successfully',
      results: {
        total: results.total,
        sent: results.sent,
        failed: results.failed,
        successRate: results.total > 0 ? ((results.sent / results.total) * 100).toFixed(2) + '%' : '0%',
        processingTime: `${processingTime}ms`
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in AMC notifications cron:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK ENDPOINT
// ═════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  // Simple health check - verify the endpoint is accessible
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    status: 'healthy',
    service: 'AMC Notifications Cron',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}
