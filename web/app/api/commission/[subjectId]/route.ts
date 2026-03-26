import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const authState = await supabase.auth.getUser();

    if (authState.error || !authState.data.user) {
      return NextResponse.json(
        { ok: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { subjectId } = await params;

    const [commissionResult, earningsResult] = await Promise.all([
      supabase
        .from('technician_commission_config')
        .select('id, technician_id, subject_id, service_commission, parts_commission, extra_price_commission, commission_notes, set_by, set_at, updated_at')
        .eq('subject_id', subjectId)
        .maybeSingle(),
      supabase
        .from('technician_earnings_summary')
        .select('id, technician_id, subject_id, service_commission, parts_commission, extra_price_commission, extra_price_collected, variance_deduction, net_earnings, total_bill_value, parts_sold_value, earnings_status, confirmed_by, confirmed_at, created_at, updated_at')
        .eq('subject_id', subjectId)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        commission: commissionResult.data,
        earnings: earningsResult.data,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const authState = await supabase.auth.getUser();

    if (authState.error || !authState.data.user) {
      return NextResponse.json(
        { ok: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const userId = authState.data.user.id;
    const { subjectId } = await params;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile || !['office_staff', 'super_admin'].includes(profile.role)) {
      return NextResponse.json(
        { ok: false, error: { message: 'Only office staff or super admin can set commission' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      technician_id,
      service_commission = 0,
      parts_commission = 0,
      extra_price_commission = 0,
      commission_notes,
    } = body;

    if (!technician_id) {
      return NextResponse.json(
        { ok: false, error: { message: 'technician_id is required' } },
        { status: 400 }
      );
    }

    const { data: config, error: configError } = await supabase
      .from('technician_commission_config')
      .upsert(
        {
          technician_id,
          subject_id: subjectId,
          service_commission: Math.max(0, Number(service_commission)),
          parts_commission: Math.max(0, Number(parts_commission)),
          extra_price_commission: Math.max(0, Number(extra_price_commission)),
          commission_notes: commission_notes || null,
          set_by: userId,
          set_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'technician_id,subject_id' }
      )
      .select()
      .single();

    if (configError) {
      return NextResponse.json(
        { ok: false, error: { message: `Failed to save commission: ${configError.message}` } },
        { status: 500 }
      );
    }

    const { error: syncError } = await supabase.rpc('sync_technician_earnings', {
      subject_uuid: subjectId,
    });

    if (syncError) {
      console.error('Sync earnings error:', syncError);
    }

    const { data: earnings } = await supabase
      .from('technician_earnings_summary')
      .select('*')
      .eq('subject_id', subjectId)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      data: { commission: config, earnings },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}
