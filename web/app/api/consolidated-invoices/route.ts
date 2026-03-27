import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/api/with-auth';

type EntityType = 'brand' | 'dealer';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, { roles: ['super_admin', 'office_staff'] });
  if (!auth.ok) return auth.response;

  const admin = await createAdminClient();
  const entityType = request.nextUrl.searchParams.get('entity_type') as EntityType | null;
  const entityId = request.nextUrl.searchParams.get('entity_id');

  let query = admin
    .from('consolidated_invoices')
    .select('id,invoice_number,entity_type,entity_id,month,year,total_amount,payment_status,payment_mode,payment_recorded_at,notes,created_at')
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (entityType) query = query.eq('entity_type', entityType);
  if (entityId) query = query.eq('entity_id', entityId);

  const result = await query;
  if (result.error) {
    return NextResponse.json({ success: false, error: result.error.message, code: 'LIST_FAILED' }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: result.data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, { roles: ['super_admin', 'office_staff'] });
  if (!auth.ok) return auth.response;

  const admin = await createAdminClient();
  const body = await request.json().catch(() => ({})) as {
    entity_type?: EntityType;
    entity_id?: string;
    month?: number;
    year?: number;
    notes?: string;
  };

  if (!body.entity_type || !body.entity_id || !body.month || !body.year) {
    return NextResponse.json({ success: false, error: 'entity_type, entity_id, month, year are required', code: 'INVALID_INPUT' }, { status: 400 });
  }

  const duplicateCheck = await admin
    .from('consolidated_invoices')
    .select('id')
    .eq('entity_type', body.entity_type)
    .eq('entity_id', body.entity_id)
    .eq('month', body.month)
    .eq('year', body.year)
    .maybeSingle();

  if (duplicateCheck.data) {
    return NextResponse.json({ success: false, error: 'Consolidated invoice already exists for this month', code: 'DUPLICATE' }, { status: 409 });
  }

  let billsQuery = admin
    .from('subject_bills')
    .select('id,subject_id,grand_total,generated_at')
    .eq('payment_status', 'due');

  if (body.entity_type === 'brand') {
    billsQuery = billsQuery.eq('brand_id', body.entity_id);
  } else {
    billsQuery = billsQuery.eq('dealer_id', body.entity_id);
  }

  const startDate = `${body.year}-${String(body.month).padStart(2, '0')}-01`;
  const endDate = `${body.year}-${String(body.month).padStart(2, '0')}-31`;
  billsQuery = billsQuery.gte('generated_at', startDate).lte('generated_at', endDate);

  const billsResult = await billsQuery;
  if (billsResult.error) {
    return NextResponse.json({ success: false, error: billsResult.error.message, code: 'BILLS_FETCH_FAILED' }, { status: 400 });
  }

  const dueBills = billsResult.data ?? [];
  if (dueBills.length === 0) {
    return NextResponse.json({ success: false, error: 'No due bills found for selected month', code: 'NO_BILLS' }, { status: 400 });
  }

  const invoiceNumberResult = await admin.rpc('generate_consolidated_invoice_number', {
    p_year: body.year,
    p_month: body.month,
  });

  if (invoiceNumberResult.error || !invoiceNumberResult.data) {
    return NextResponse.json({ success: false, error: invoiceNumberResult.error?.message ?? 'Failed to generate invoice number', code: 'NUMBER_FAILED' }, { status: 400 });
  }

  const totalAmount = dueBills.reduce((sum, row) => sum + Number(row.grand_total ?? 0), 0);
  const createInvoiceResult = await admin
    .from('consolidated_invoices')
    .insert({
      invoice_number: String(invoiceNumberResult.data),
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      month: body.month,
      year: body.year,
      total_amount: totalAmount,
      notes: body.notes ?? null,
      created_by: auth.userId,
      payment_status: 'pending',
    })
    .select('id,invoice_number,total_amount,payment_status')
    .single();

  if (createInvoiceResult.error || !createInvoiceResult.data) {
    return NextResponse.json({ success: false, error: createInvoiceResult.error?.message ?? 'Failed to create invoice', code: 'CREATE_FAILED' }, { status: 400 });
  }

  const mappingRows = dueBills.map((row) => ({
    consolidated_invoice_id: createInvoiceResult.data.id,
    subject_id: row.subject_id,
    subject_bill_id: row.id,
    amount: row.grand_total,
  }));

  const mappingResult = await admin.from('consolidated_invoice_subjects').insert(mappingRows);
  if (mappingResult.error) {
    return NextResponse.json({ success: false, error: mappingResult.error.message, code: 'MAPPING_FAILED' }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: createInvoiceResult.data });
}
