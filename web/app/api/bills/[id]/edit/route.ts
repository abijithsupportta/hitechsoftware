import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const EditBillSchema = z.object({
  visit_charge: z.number().min(0).optional(),
  service_charge: z.number().min(0).optional(),
  payment_mode: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'due']).optional(),
  accessories: z.array(z.object({
    id: z.string().optional(), // If provided, update existing; if not, create new
    item_name: z.string().min(1),
    quantity: z.number().min(1),
    mrp: z.number().min(0),
    discount_type: z.enum(['percentage', 'flat']),
    discount_value: z.number().min(0),
  })).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: billId } = await params;
    const body = await request.json();
    const validatedData = EditBillSchema.parse(body);

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

    // Get the subject to verify it exists
    const { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', bill.subject_id)
      .single();

    if (!subject) {
      return NextResponse.json(
        { ok: false, error: { message: 'Subject not found' } },
        { status: 404 }
      );
    }

    // Start transaction-like operations
    const updates: any = {};

    // Update bill charges if provided
    if (validatedData.visit_charge !== undefined) {
      updates.visit_charge = validatedData.visit_charge;
    }
    if (validatedData.service_charge !== undefined) {
      updates.service_charge = validatedData.service_charge;
    }
    if (validatedData.payment_mode !== undefined) {
      updates.payment_mode = validatedData.payment_mode;
    }

    // Update bill if there are charge changes
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('subject_bills')
        .update(updates)
        .eq('id', billId);

      if (updateError) {
        console.error('Bill update error:', updateError);
        return NextResponse.json(
          { ok: false, error: { message: 'Failed to update bill' } },
          { status: 500 }
        );
      }
    }

    // Handle accessories updates
    if (validatedData.accessories) {
      const accessories = validatedData.accessories;
      
      // Get existing accessories for this subject
      const { data: existingAccessories } = await supabase
        .from('subject_accessories')
        .select('*')
        .eq('subject_id', bill.subject_id);

      const existingAccessoryMap = new Map(
        existingAccessories?.map(a => [a.id, a]) || []
      );

      // Process each accessory
      for (const accessory of accessories) {
        if (accessory.id && existingAccessoryMap.has(accessory.id)) {
          // Update existing accessory
          const { error: updateError } = await supabase
            .from('subject_accessories')
            .update({
              item_name: accessory.item_name,
              quantity: accessory.quantity,
              mrp: accessory.mrp,
              discount_type: accessory.discount_type,
              discount_value: accessory.discount_value,
              updated_at: new Date().toISOString(),
            })
            .eq('id', accessory.id);

          if (updateError) {
            console.error('Accessory update error:', updateError);
            return NextResponse.json(
              { ok: false, error: { message: 'Failed to update accessory' } },
              { status: 500 }
            );
          }
        } else {
          // Create new accessory
          const { error: createError } = await supabase
            .from('subject_accessories')
            .insert({
              subject_id: bill.subject_id,
              added_by: authState.data.user.id,
              item_name: accessory.item_name,
              quantity: accessory.quantity,
              mrp: accessory.mrp,
              discount_type: accessory.discount_type,
              discount_value: accessory.discount_value,
              created_at: new Date().toISOString(),
            });

          if (createError) {
            console.error('Accessory creation error:', createError);
            return NextResponse.json(
              { ok: false, error: { message: 'Failed to create accessory' } },
              { status: 500 }
            );
          }
        }
      }
    }

    // Fetch updated bill with recalculated totals
    const { data: updatedBill, error: fetchError } = await supabase
      .from('subject_bills')
      .select('*')
      .eq('id', billId)
      .single();

    if (fetchError) {
      console.error('Fetch updated bill error:', fetchError);
      return NextResponse.json(
        { ok: false, error: { message: 'Failed to fetch updated bill' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: updatedBill,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: { message: 'Invalid input data', details: error.issues } },
        { status: 400 }
      );
    }

    console.error('Edit bill API error:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
