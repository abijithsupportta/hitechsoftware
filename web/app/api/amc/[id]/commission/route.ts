// ═════════════════════════════════════════════════════════════════════════════
// AMC Commission API Route
// ──────────────────────────────────────────────────────────────────────────────
// API endpoint for setting AMC commission

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { amcService } from '@/modules/amc/amc.service';
import { SetAMCCommissionInput } from '@/modules/amc/amc.types';

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/amc/[id]/commission - Set commission for AMC contract
// ═════════════════════════════════════════════════════════════════════════════

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const input: SetAMCCommissionInput = {
      commission_amount: parseFloat(body.commission_amount)
    };

    const result = await amcService.setAMCCommission(id, input, user.id);

    return NextResponse.json(result, { 
      status: result.success ? 200 : 400 
    });
  } catch (error) {
    console.error('Error in POST /api/amc/[id]/commission:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
