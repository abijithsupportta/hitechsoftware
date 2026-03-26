import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; accessoryId: string }> }
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

    const { id: billId, accessoryId } = await params;

    // Get user role to verify permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authState.data.user.id)
      .single();

    if (!profile || !['office_staff', 'super_admin'].includes(profile.role)) {
      return NextResponse.json(
        { ok: false, error: { message: 'Only office staff or super admin can edit bills' } },
        { status: 403 }
      );
    }

    // Get the bill and verify it can be edited
    const { data: bill, error: billError } = await supabase
      .from('subject_bills')
      .select('*')
      .eq('id', billId)
      .single();

    if (billError || !bill) {
      return NextResponse.json(
        { ok: false, error: { message: 'Bill not found' } },
        { status: 404 }
      );
    }

    // Bills can only be edited if not paid
    if (bill.payment_status === 'paid') {
      return NextResponse.json(
        { ok: false, error: { message: 'Cannot edit a paid bill' } },
        { status: 400 }
      );
    }

    // Get the accessory to verify it belongs to this bill's subject
    const { data: accessory, error: accessoryError } = await supabase
      .from('subject_accessories')
      .select('*')
      .eq('id', accessoryId)
      .single();

    if (accessoryError || !accessory) {
      return NextResponse.json(
        { ok: false, error: { message: 'Accessory not found' } },
        { status: 404 }
      );
    }

    if (accessory.subject_id !== bill.subject_id) {
      return NextResponse.json(
        { ok: false, error: { message: 'Accessory does not belong to this bill' } },
        { status: 400 }
      );
    }

    // Delete the accessory
    const { error: deleteError } = await supabase
      .from('subject_accessories')
      .delete()
      .eq('id', accessoryId);

    if (deleteError) {
      console.error('Accessory delete error:', deleteError);
      return NextResponse.json(
        { ok: false, error: { message: 'Failed to delete accessory' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: { deleted: true },
    });

  } catch (error) {
    console.error('Delete accessory API error:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
