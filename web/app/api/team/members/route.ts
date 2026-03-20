import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createTeamMemberSchema } from '@/modules/technicians/technician.validation';
import type { TeamMember } from '@/modules/technicians/technician.types';

async function ensureSuperAdmin() {
  const supabase = await createServerClient();
  const authState = await supabase.auth.getUser();

  if (authState.error || !authState.data.user) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: { message: 'Unauthorized' } }, { status: 401 }) };
  }

  const profileResult = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authState.data.user.id)
    .maybeSingle<{ role: string }>();

  if (profileResult.error || profileResult.data?.role !== 'super_admin') {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: { message: 'Forbidden' } }, { status: 403 }) };
  }

  return { ok: true as const };
}

export async function POST(request: Request) {
  const access = await ensureSuperAdmin();
  if (!access.ok) {
    return access.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: { message: 'Invalid JSON payload' } }, { status: 400 });
  }

  const parsed = createTeamMemberSchema.safeParse(body);
  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? ` (${issue.path.join('.')})` : '';
      return `${issue.message}${path}`;
    });
    return NextResponse.json(
      { ok: false, error: { message: errorMessages.join('; ') } },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const authCreate = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (authCreate.error || !authCreate.data.user) {
    const authErrorMsg = authCreate.error?.message ?? 'Failed to create auth user';
    console.error('[TEAM API] Auth creation error:', {
      message: authErrorMsg,
      code: authCreate.error?.code,
      status: authCreate.error?.status,
    });
    
    let userMessage = authErrorMsg;
    if (/User already exists/.test(authErrorMsg)) {
      userMessage = 'Email already registered. Please use a different email.';
    }
    
    return NextResponse.json(
      { ok: false, error: { message: userMessage } },
      { status: 400 },
    );
  }

  const userId = authCreate.data.user.id;

  const profileInsert = await admin
    .from('profiles')
    .insert({
      id: userId,
      email: parsed.data.email,
      display_name: parsed.data.display_name,
      phone_number: parsed.data.phone_number?.trim() || null,
      role: parsed.data.role,
      is_active: parsed.data.is_active ?? true,
      is_deleted: false,
    })
    .select('id,email,display_name,phone_number,role,is_active,is_deleted,created_at,updated_at')
    .single();

  if (profileInsert.error || !profileInsert.data) {
    await admin.auth.admin.deleteUser(userId);
    const profileErrorMsg = profileInsert.error?.message ?? 'Failed to create profile';
    // Log full error for debugging
    console.error('[TEAM API] Profile insert error:', {
      message: profileErrorMsg,
      code: profileInsert.error?.code,
      details: (profileInsert.error as any)?.details,
    });
    
    // Return helpful error messages based on error type
    let userMessage = profileErrorMsg;
    if (/duplicate key value violates unique constraint/.test(profileErrorMsg)) {
      if (/profiles_email_key/.test(profileErrorMsg)) {
        userMessage = 'Email already in use. Please use a different email address.';
      } else if (/profiles_phone_number_key/.test(profileErrorMsg)) {
        userMessage = 'Phone number already in use. Please use a different phone number.';
      }
    }
    
    return NextResponse.json(
      { ok: false, error: { message: userMessage } },
      { status: 400 },
    );
  }

  let technician: TeamMember['technician'] = null;

  if (parsed.data.role === 'technician' && parsed.data.technician) {
    const technicianInsert = await admin
      .from('technicians')
      .insert({
        id: userId,
        technician_code: parsed.data.technician.technician_code,
        qualification: parsed.data.technician.qualification?.trim() || null,
        experience_years: parsed.data.technician.experience_years,
        daily_subject_limit: parsed.data.technician.daily_subject_limit ?? 10,
        digital_bag_capacity: parsed.data.technician.digital_bag_capacity ?? 50,
        is_active: true,
        is_deleted: false,
      })
      .select('id,technician_code,qualification,experience_years,daily_subject_limit,digital_bag_capacity,is_active,is_deleted,total_rejections')
      .single();

    if (technicianInsert.error) {
      await admin.auth.admin.deleteUser(userId);
      const techErrorMsg = technicianInsert.error.message ?? 'Failed to create technician record';
      // Log full error for debugging
      console.error('[TEAM API] Technician insert error:', {
        message: techErrorMsg,
        code: technicianInsert.error.code,
        details: (technicianInsert.error as any)?.details,
      });
      
      let userMessage = techErrorMsg;
      if (/duplicate key value violates unique constraint/.test(techErrorMsg)) {
        if (/technicians_technician_code_key/.test(techErrorMsg)) {
          userMessage = 'Technician code already exists. Please use a unique code.';
        }
      }
      
      return NextResponse.json(
        { ok: false, error: { message: userMessage } },
        { status: 400 },
      );
    }

    technician = technicianInsert.data;
  }

  return NextResponse.json({
    ok: true,
    data: {
      ...profileInsert.data,
      technician,
    },
  });
}
