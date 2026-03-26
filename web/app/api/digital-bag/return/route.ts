import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface ReturnItemInput {
  bag_item_id: string;
  quantity: number;
  notes?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const authState = await supabase.auth.getUser();

    if (authState.error || !authState.data.user) {
      return NextResponse.json(
        { ok: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const body: ReturnItemInput = await request.json();
    const { bag_item_id, quantity, notes } = body;

    // Validate input
    if (!bag_item_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { ok: false, error: { message: 'Invalid input: bag_item_id and quantity are required' } },
        { status: 400 }
      );
    }

    // Get user role to verify permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authState.data.user.id)
      .single();

    if (!profile || profile.role !== 'technician') {
      return NextResponse.json(
        { ok: false, error: { message: 'Only technicians can return bag items' } },
        { status: 403 }
      );
    }

    // Get the bag item and verify ownership
    const { data: bagItem, error: bagError } = await supabase
      .from('digital_bag_items')
      .select(`
        *,
        digital_bag_sessions!inner(
          technician_id,
          status
        )
      `)
      .eq('id', bag_item_id)
      .single();

    if (bagError || !bagItem) {
      return NextResponse.json(
        { ok: false, error: { message: 'Bag item not found' } },
        { status: 404 }
      );
    }

    // Verify the bag item belongs to the technician and session is open
    if (bagItem.digital_bag_sessions.technician_id !== authState.data.user.id) {
      return NextResponse.json(
        { ok: false, error: { message: 'You can only return items from your own bag' } },
        { status: 403 }
      );
    }

    if (bagItem.digital_bag_sessions.status !== 'open') {
      return NextResponse.json(
        { ok: false, error: { message: 'Cannot return items from a closed bag session' } },
        { status: 400 }
      );
    }

    // Check if quantity to return is valid (can't return more than was issued)
    const availableToReturn = bagItem.quantity_issued - bagItem.quantity_returned;
    if (quantity > availableToReturn) {
      return NextResponse.json(
        { ok: false, error: { message: `Cannot return more than ${availableToReturn} items` } },
        { status: 400 }
      );
    }

    // Update bag item quantity
    const { error: updateError } = await supabase
      .from('digital_bag_items')
      .update({
        quantity_returned: bagItem.quantity_returned + quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bag_item_id);

    if (updateError) {
      console.error('Bag item update error:', updateError);
      return NextResponse.json(
        { ok: false, error: { message: 'Failed to update bag item quantity' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        bag_item_id,
        quantity_returned: bagItem.quantity_returned + quantity,
        notes: notes || null,
        returned_at: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Return bag item API error:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
