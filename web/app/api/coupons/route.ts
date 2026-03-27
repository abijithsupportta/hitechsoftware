import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/api/with-auth';

type CouponStatus = 'active' | 'used' | 'expired';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, { roles: ['super_admin', 'office_staff', 'technician'] });
  if (!auth.ok) return auth.response;

  const admin = await createAdminClient();
  const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase();

  if (code) {
    const couponResult = await admin
      .from('coupons')
      .select('id,coupon_code,discount_amount,status,used_on_subject_id,used_by_technician_id,used_at,expires_after,created_at,updated_at')
      .eq('coupon_code', code)
      .maybeSingle();

    if (couponResult.error || !couponResult.data) {
      return NextResponse.json({ success: false, error: 'Invalid coupon code', code: 'COUPON_NOT_FOUND' }, { status: 404 });
    }

    const coupon = couponResult.data as {
      id: string;
      coupon_code: string;
      discount_amount: number;
      status: CouponStatus;
      used_on_subject_id: string | null;
    };

    if (coupon.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Coupon is already used or expired', code: 'COUPON_NOT_ACTIVE' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: coupon.id,
        coupon_code: coupon.coupon_code,
        discount_amount: coupon.discount_amount,
        status: coupon.status,
        used_on_subject_id: coupon.used_on_subject_id,
      },
    });
  }

  if (auth.role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Only super admin can view all coupons', code: 'FORBIDDEN' }, { status: 403 });
  }

  const couponsResult = await admin
    .from('coupons')
    .select(`
      id,coupon_code,discount_amount,status,used_on_subject_id,used_by_technician_id,used_at,expires_after,created_at,updated_at,
      subjects:used_on_subject_id(subject_number),
      technicians:used_by_technician_id(id)
    `)
    .order('created_at', { ascending: false });

  if (couponsResult.error) {
    return NextResponse.json({ success: false, error: couponsResult.error.message, code: 'COUPON_LIST_FAILED' }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: couponsResult.data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, { roles: ['super_admin', 'office_staff', 'technician'] });
  if (!auth.ok) return auth.response;

  const admin = await createAdminClient();
  const body = await request.json().catch(() => ({})) as {
    action?: 'create' | 'apply';
    discount_amount?: number;
    expires_after?: 'bill_creation' | 'service_completion';
    code?: string;
    subject_id?: string;
  };

  if (body.action === 'apply') {
    if (!body.code || !body.subject_id) {
      return NextResponse.json({ success: false, error: 'Coupon code and subject are required', code: 'INVALID_INPUT' }, { status: 400 });
    }

    const normalizedCode = body.code.trim().toUpperCase();
    const couponResult = await admin
      .from('coupons')
      .select('id,coupon_code,discount_amount,status,used_on_subject_id')
      .eq('coupon_code', normalizedCode)
      .maybeSingle<{
        id: string;
        coupon_code: string;
        discount_amount: number;
        status: CouponStatus;
        used_on_subject_id: string | null;
      }>();

    if (couponResult.error || !couponResult.data) {
      return NextResponse.json({ success: false, error: 'Invalid coupon code', code: 'COUPON_NOT_FOUND' }, { status: 404 });
    }

    if (couponResult.data.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Coupon is already used or expired', code: 'COUPON_NOT_ACTIVE' }, { status: 400 });
    }

    if (couponResult.data.used_on_subject_id && couponResult.data.used_on_subject_id !== body.subject_id) {
      return NextResponse.json({ success: false, error: 'Coupon is already locked to another subject', code: 'COUPON_LOCKED' }, { status: 400 });
    }

    if (!couponResult.data.used_on_subject_id) {
      const applyResult = await admin
        .from('coupons')
        .update({
          used_on_subject_id: body.subject_id,
          used_by_technician_id: auth.userId,
          used_at: new Date().toISOString(),
        })
        .eq('id', couponResult.data.id)
        .eq('status', 'active');

      if (applyResult.error) {
        return NextResponse.json({ success: false, error: applyResult.error.message, code: 'COUPON_APPLY_FAILED' }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: couponResult.data.id,
        coupon_code: couponResult.data.coupon_code,
        discount_amount: couponResult.data.discount_amount,
      },
    });
  }

  if (body.action !== 'create') {
    return NextResponse.json({ success: false, error: 'Unsupported action', code: 'INVALID_ACTION' }, { status: 400 });
  }

  if (auth.role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Only super admin can create coupons', code: 'FORBIDDEN' }, { status: 403 });
  }

  const discount = Number(body.discount_amount ?? 0);
  if (!Number.isFinite(discount) || discount <= 0) {
    return NextResponse.json({ success: false, error: 'Valid discount amount is required', code: 'INVALID_DISCOUNT' }, { status: 400 });
  }

  const createResult = await admin
    .from('coupons')
    .insert({
      discount_amount: discount,
      created_by: auth.userId,
      expires_after: body.expires_after ?? 'bill_creation',
      status: 'active',
    })
    .select('id,coupon_code,discount_amount,status,expires_after,created_at')
    .single();

  if (createResult.error) {
    return NextResponse.json({ success: false, error: createResult.error.message, code: 'COUPON_CREATE_FAILED' }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: createResult.data });
}
