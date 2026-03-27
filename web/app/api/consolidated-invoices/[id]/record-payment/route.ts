import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/api/with-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request, { roles: ['super_admin', 'office_staff'] });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { payment_mode?: string; notes?: string };
  if (!body.payment_mode) {
    return NextResponse.json({ success: false, error: 'payment_mode is required', code: 'INVALID_INPUT' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const nowIso = new Date().toISOString();

  const updateInvoiceResult = await admin
    .from('consolidated_invoices')
    .update({
      payment_status: 'paid',
      payment_mode: body.payment_mode,
      payment_recorded_at: nowIso,
      payment_recorded_by: auth.userId,
      notes: body.notes ?? null,
    })
    .eq('id', id)
    .select('id')
    .single();

  if (updateInvoiceResult.error) {
    return NextResponse.json({ success: false, error: updateInvoiceResult.error.message, code: 'INVOICE_UPDATE_FAILED' }, { status: 400 });
  }

  const linkedBillsResult = await admin
    .from('consolidated_invoice_subjects')
    .select('subject_bill_id,subject_id')
    .eq('consolidated_invoice_id', id);

  if (linkedBillsResult.error) {
    return NextResponse.json({ success: false, error: linkedBillsResult.error.message, code: 'LINKED_BILLS_FETCH_FAILED' }, { status: 400 });
  }

  const linkedBillIds = (linkedBillsResult.data ?? []).map((row) => row.subject_bill_id);
  const linkedSubjectIds = (linkedBillsResult.data ?? []).map((row) => row.subject_id);

  if (linkedBillIds.length > 0) {
    const updateBillsResult = await admin
      .from('subject_bills')
      .update({
        payment_status: 'paid',
        payment_collected: true,
        payment_collected_at: nowIso,
        payment_collected_by: auth.userId,
        collection_notes: 'Paid via consolidated invoice',
      })
      .in('id', linkedBillIds);

    if (updateBillsResult.error) {
      return NextResponse.json({ success: false, error: updateBillsResult.error.message, code: 'BILLS_UPDATE_FAILED' }, { status: 400 });
    }
  }

  if (linkedSubjectIds.length > 0) {
    await admin
      .from('subjects')
      .update({
        billing_status: 'paid',
      })
      .in('id', linkedSubjectIds);
  }

  return NextResponse.json({ success: true, data: { id } });
}
