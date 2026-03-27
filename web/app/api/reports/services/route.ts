import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServicePerformance } from '@/modules/reports/reports.service';
import type { ReportFilters, ReportCategory } from '@/modules/reports/reports.types';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    // Build filters object with proper types
    const filters: ReportFilters = {
      dateRange: {
        start: searchParams.get('start_date') || '',
        end: searchParams.get('end_date') || '',
      },
      category: (searchParams.get('category') as ReportCategory) || undefined,
      status: searchParams.get('status') ? searchParams.get('status')!.split(',') : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
      sortBy: searchParams.get('sort_by') || 'created_at',
      sortOrder: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
    };

    // Get service performance data
    const result = await getServicePerformance(filters);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Service reports API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
