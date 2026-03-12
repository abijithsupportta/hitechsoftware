import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await ensureSuperAdmin();
  if (!access.ok) {
    return access.response;
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ ok: false, error: { message: 'Team member id is required' } }, { status: 400 });
  }

  const admin = createAdminClient();

  const profileLookup = await admin
    .from('profiles')
    .select('id,role')
    .eq('id', id)
    .in('role', ['technician', 'office_staff', 'stock_manager'])
    .maybeSingle<{ id: string; role: string }>();

  if (profileLookup.error) {
    return NextResponse.json({ ok: false, error: { message: profileLookup.error.message } }, { status: 400 });
  }

  if (!profileLookup.data) {
    return NextResponse.json({ ok: false, error: { message: 'Team member not found' } }, { status: 404 });
  }

  const authDelete = await admin.auth.admin.deleteUser(id);

  if (authDelete.error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: authDelete.error.message.includes('violates')
            ? 'Cannot delete this user due to linked records. Reassign or archive those records first.'
            : authDelete.error.message,
        },
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, data: null });
}
