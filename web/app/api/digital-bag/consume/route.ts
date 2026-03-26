import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { ConsumeItemInput } from '@/modules/digital-bag/digital-bag.types';

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

    const body: ConsumeItemInput = await request.json();
    const { bag_item_id, subject_id, quantity, notes } = body;

    // Validate input
    if (!bag_item_id || !subject_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { ok: false, error: { message: 'Invalid input: bag_item_id, subject_id, and quantity are required' } },
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
        { ok: false, error: { message: 'Only technicians can consume bag items' } },
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
        { ok: false, error: { message: 'You can only consume items from your own bag' } },
        { status: 403 }
      );
    }

    if (bagItem.digital_bag_sessions.status !== 'open') {
      return NextResponse.json(
        { ok: false, error: { message: 'Cannot consume items from a closed bag session' } },
        { status: 400 }
      );
    }

    // Check if enough quantity is available
    const availableQuantity = bagItem.quantity_issued - bagItem.quantity_returned - bagItem.quantity_consumed;
    if (quantity > availableQuantity) {
      return NextResponse.json(
        { ok: false, error: { message: `Insufficient quantity. Only ${availableQuantity} available` } },
        { status: 400 }
      );
    }

    // Verify the subject exists and is assigned to this technician
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id, assigned_technician_id, status')
      .eq('id', subject_id)
      .single();

    if (subjectError || !subject) {
      return NextResponse.json(
        { ok: false, error: { message: 'Subject not found' } },
        { status: 404 }
      );
    }

    if (subject.assigned_technician_id !== authState.data.user.id) {
      return NextResponse.json(
        { ok: false, error: { message: 'You can only consume items for subjects assigned to you' } },
        { status: 403 }
      );
    }

    // Create consumption record
    const { data: consumption, error: consumptionError } = await supabase
      .from('digital_bag_consumptions')
      .insert({
        bag_item_id,
        subject_id,
        technician_id: authState.data.user.id,
        quantity,
        notes: notes || null,
        consumed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (consumptionError) {
      console.error('Consumption creation error:', consumptionError);
      return NextResponse.json(
        { ok: false, error: { message: 'Failed to create consumption record' } },
        { status: 500 }
      );
    }

    // Update bag item quantity
    const { error: updateError } = await supabase
      .from('digital_bag_items')
      .update({
        quantity_consumed: bagItem.quantity_consumed + quantity,
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

    // Also add the item as an accessory to the subject
    const { error: accessoryError } = await supabase
      .from('subject_accessories')
      .insert({
        subject_id,
        added_by: authState.data.user.id,
        item_name: bagItem.product_name,
        quantity: quantity,
        mrp: bagItem.mrp,
        discount_type: 'percentage',
        discount_value: 0,
        created_at: new Date().toISOString(),
      });

    if (accessoryError) {
      console.error('Accessory creation error:', accessoryError);
      // Don't fail the whole operation if accessory creation fails, but log it
      console.warn('Bag item consumed but accessory creation failed');
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...consumption,
        accessoryAdded: !accessoryError,
      },
    });

  } catch (error) {
    console.error('Consume bag item API error:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
