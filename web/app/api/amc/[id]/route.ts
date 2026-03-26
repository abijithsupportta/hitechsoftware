// ═════════════════════════════════════════════════════════════════════════════
// AMC Detail API Routes
// ──────────────────────────────────────────────────────────────────────────────
// API endpoints for individual AMC contract operations

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { amcService } from '@/modules/amc/amc.service';
import { UpdateAMCInput, SetAMCCommissionInput, RenewAMCInput, CancelAMCInput } from '@/modules/amc/amc.types';

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/amc/[id] - Get specific AMC contract
// ═════════════════════════════════════════════════════════════════════════════

export async function GET(
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

    const result = await amcService.getAMCById(id);

    return NextResponse.json(result, { 
      status: result.success ? 200 : 404 
    });
  } catch (error) {
    console.error('Error in GET /api/amc/[id]:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// PUT /api/amc/[id] - Update AMC contract
// ═════════════════════════════════════════════════════════════════════════════

export async function PUT(
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
    
    const input: UpdateAMCInput = {
      appliance_model: body.appliance_model,
      appliance_serial_number: body.appliance_serial_number,
      coverage_description: body.coverage_description,
      free_visits_per_year: body.free_visits_per_year,
      parts_covered: body.parts_covered,
      parts_coverage_limit: body.parts_coverage_limit,
      brands_covered: body.brands_covered,
      exclusions: body.exclusions,
      special_terms: body.special_terms,
      renewed_by_id: body.renewed_by_id
    };

    const result = await amcService.updateAMC(id, input, user.id);

    return NextResponse.json(result, { 
      status: result.success ? 200 : 400 
    });
  } catch (error) {
    console.error('Error in PUT /api/amc/[id]:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// DELETE /api/amc/[id] - Cancel AMC contract
// ═════════════════════════════════════════════════════════════════════════════

export async function DELETE(
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
    
    const input: CancelAMCInput = {
      cancellation_reason: body.cancellation_reason
    };

    const result = await amcService.cancelAMC(id, input, user.id);

    return NextResponse.json(result, { 
      status: result.success ? 200 : 400 
    });
  } catch (error) {
    console.error('Error in DELETE /api/amc/[id]:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
