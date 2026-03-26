// ═════════════════════════════════════════════════════════════════════════════
// AMC Renewal API Route
// ──────────────────────────────────────────────────────────────────────────────
// API endpoint for renewing AMC contracts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { amcService } from '@/modules/amc/amc.service';
import { RenewAMCInput } from '@/modules/amc/amc.types';

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/amc/[id]/renew - Renew AMC contract
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
    
    const input: RenewAMCInput = {
      duration_type: body.duration_type,
      start_date: body.start_date,
      end_date: body.end_date,
      price_paid: parseFloat(body.price_paid),
      payment_mode: body.payment_mode,
      billed_to_type: body.billed_to_type,
      billed_to_id: body.billed_to_id,
      sold_by: body.sold_by,
      coverage_description: body.coverage_description,
      free_visits_per_year: body.free_visits_per_year,
      parts_covered: body.parts_covered,
      parts_coverage_limit: body.parts_coverage_limit ? parseFloat(body.parts_coverage_limit) : undefined,
      brands_covered: body.brands_covered,
      exclusions: body.exclusions,
      special_terms: body.special_terms
    };

    const result = await amcService.renewAMC(id, input, user.id);

    return NextResponse.json(result, { 
      status: result.success ? 201 : 400 
    });
  } catch (error) {
    console.error('Error in POST /api/amc/[id]/renew:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
