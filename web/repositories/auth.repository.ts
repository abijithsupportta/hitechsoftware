import { createClient } from '@/lib/supabase/client';
import type { ProfileRow } from '@/types/database.types';

const supabase = createClient();
let authLogEndpointUnavailable = false;

export interface AuthLogInsert {
  user_id: string;
  event: string;
  role: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

function isMissingAuthLogsError(error: { code?: string | null; message?: string | null } | null) {
  const code = String(error?.code ?? '').toUpperCase();
  const message = String(error?.message ?? '').toLowerCase();

  return (
    code === '404' ||
    code === 'PGRST205' ||
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('relation') && message.includes('auth_logs')
  );
}

export async function getAuthSession() {
  return supabase.auth.getSession();
}

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOutSession() {
  return supabase.auth.signOut();
}

export async function getProfileByUserId(userId: string) {
  return supabase
    .from('profiles')
    .select('id,email,display_name,phone_number,role,is_active,is_deleted')
    .eq('id', userId)
    .maybeSingle<ProfileRow>();
}

export function onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function createAuthLog(log: AuthLogInsert) {
  if (process.env.NEXT_PUBLIC_DISABLE_AUTH_LOGS === 'true') {
    return { data: null, error: null };
  }

  // Prevent repeated failing requests once we know auth_logs is unavailable.
  if (authLogEndpointUnavailable) {
    return { data: null, error: null };
  }

  const result = await supabase.from('auth_logs').insert(log);

  if (isMissingAuthLogsError(result.error)) {
    authLogEndpointUnavailable = true;
  }

  return result;
}
