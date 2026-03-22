/**
 * Shared API route authentication middleware.
 *
 * Eliminates the copy-pasted auth boilerplate that existed in every
 * subjects/[id]/ API route handler.
 *
 * Usage:
 *   const auth = await requireAuth(request, { roles: ['technician'] });
 *   if (!auth.ok) return auth.response;
 *   // auth.userId, auth.role, auth.admin are now available
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

interface AuthSuccess {
  ok: true;
  userId: string;
  role: string;
  admin: SupabaseClient;
}

interface AuthFailure {
  ok: false;
  response: NextResponse;
}

type AuthResult = AuthSuccess | AuthFailure;

interface RequireAuthOptions {
  /** If provided, request is rejected (403) when the user's role is not in the list. */
  roles?: string[];
}

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

export async function requireAuth(
  _request: NextRequest,
  options: RequireAuthOptions = {},
): Promise<AuthResult> {
  const supabase = await createServerClient();
  const authState = await supabase.auth.getUser();

  if (authState.error || !authState.data.user) {
    return { ok: false, response: errorResponse('Unauthorized', 401) };
  }

  const userId = authState.data.user.id;

  const profileResult = await supabase
    .from('profiles')
    .select('id,role')
    .eq('id', userId)
    .maybeSingle<{ id: string; role: string }>();

  if (profileResult.error || !profileResult.data) {
    return { ok: false, response: errorResponse('Your profile could not be found. Please log out and log back in.', 400) };
  }

  const { role } = profileResult.data;

  if (options.roles && options.roles.length > 0 && !options.roles.includes(role)) {
    return {
      ok: false,
      response: errorResponse(`Access denied. Allowed roles: ${options.roles.join(', ')}`, 403),
    };
  }

  const admin = await createAdminClient();
  return { ok: true, userId, role, admin };
}
