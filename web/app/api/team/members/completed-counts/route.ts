import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function ensureSuperAdmin() {
  const supabase = await createServerClient();
  const authState = await supabase.auth.getUser();

  if (authState.error || !authState.data.user) {
    return { userId: null, error: 'Unauthorized' };
  }

  const profileResult = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authState.data.user.id)
    .single<{ role: string }>();

  if (profileResult.error || profileResult.data?.role !== 'super_admin') {
    return { userId: null, error: 'Forbidden' };
  }

  return { userId: authState.data.user.id, error: null };
}

// GET /api/team/members/completed-counts
// Returns a map of technician_id -> all-time completed subject count
export async function GET() {
  const { error: authError } = await ensureSuperAdmin();
  if (authError) {
    return NextResponse.json({ error: authError }, { status: authError === 'Unauthorized' ? 401 : 403 });
  }

  const admin = createAdminClient();

  const result = await admin
    .from('subjects')
    .select('assigned_technician_id')
    .eq('status', 'COMPLETED')
    .not('assigned_technician_id', 'is', null);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const counts: Record<string, number> = {};
  for (const row of result.data) {
    const id = row.assigned_technician_id as string;
    counts[id] = (counts[id] ?? 0) + 1;
  }

  return NextResponse.json({ counts });
}
