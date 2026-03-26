// ═════════════════════════════════════════════════════════════════════════════
// AMC API Routes
// ──────────────────────────────────────────────────────────────────────────────
// API endpoints for AMC (Annual Maintenance Contract) operations

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { amcService } from '@/modules/amc/amc.service';
import { CreateAMCInput, UpdateAMCInput, SetAMCCommissionInput } from '@/modules/amc/amc.types';

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/amc - List AMCs with filtering and pagination
// ═════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      customer_id: searchParams.get('customer_id') || undefined,
      status: searchParams.get('status') as any || undefined,
      sold_by: searchParams.get('sold_by') || undefined,
      billed_to_type: searchParams.get('billed_to_type') as any || undefined,
      duration_type: searchParams.get('duration_type') as any || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      expiring_within_days: searchParams.get('expiring_within_days') ? 
        parseInt(searchParams.get('expiring_within_days')!) : undefined,
      search: searchParams.get('search') || undefined
    };

    const pagination = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    const result = await amcService.listAMCs(filters, pagination);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/amc:', error);
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
// POST /api/amc - Create new AMC contract
// ═════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const input: CreateAMCInput = {
      customer_id: body.customer_id,
      subject_id: body.subject_id || null,
      appliance_category_id: body.appliance_category_id,
      appliance_brand: body.appliance_brand,
      appliance_model: body.appliance_model || null,
      appliance_serial_number: body.appliance_serial_number || null,
      duration_type: body.duration_type,
      start_date: body.start_date,
      end_date: body.end_date || null,
      price_paid: parseFloat(body.price_paid),
      payment_mode: body.payment_mode,
      billed_to_type: body.billed_to_type,
      billed_to_id: body.billed_to_id,
      sold_by: body.sold_by,
      coverage_description: body.coverage_description,
      free_visits_per_year: body.free_visits_per_year || null,
      parts_covered: body.parts_covered || false,
      parts_coverage_limit: body.parts_coverage_limit ? parseFloat(body.parts_coverage_limit) : undefined,
      brands_covered: body.brands_covered || null,
      exclusions: body.exclusions || null,
      special_terms: body.special_terms || null
    };

    const result = await amcService.createAMC(input, user.id);

    return NextResponse.json(result, { 
      status: result.success ? 201 : 400 
    });
  } catch (error) {
    console.error('Error in POST /api/amc:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
