import type { AuthState, SignInInput } from '@/modules/auth/auth.types';
import { signInSchema } from '@/modules/auth/auth.validation';
import {
  createAuthLog,
  getAuthSession,
  getProfileByUserId,
  signInWithPassword,
  signOutSession,
} from '@/repositories/auth.repository';
import type { ServiceResult } from '@/types/common.types';
import { ROLES } from '@/lib/constants/roles';
import { ROUTES } from '@/lib/constants/routes';

export function getDashboardRouteByRole(role: string | null): string {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return ROUTES.DASHBOARD;
    case ROLES.OFFICE_STAFF:
      return ROUTES.DASHBOARD_SUBJECTS;
    case ROLES.STOCK_MANAGER:
      return ROUTES.DASHBOARD_INVENTORY;
    case ROLES.TECHNICIAN:
      return ROUTES.DASHBOARD_TECHNICIAN;
    default:
      // Return login with an error instead of defaulting to dashboard.
      // This prevents infinite redirect loops if the dashboard layout rejects the unknown role.
      return `${ROUTES.LOGIN}?error=invalid_role`;
  }
}

export async function getCurrentAuthState(): Promise<ServiceResult<AuthState>> {
  const { data, error } = await getAuthSession();

  if (error) {
    return { ok: false, error: { message: error.message, code: error.code } };
  }

  if (!data.session?.user) {
    return { ok: true, data: { user: null, session: null, role: null } };
  }

  const user = data.session.user;
  const profileResult = await getProfileByUserId(user.id);

  if (profileResult.error) {
    return { ok: false, error: { message: profileResult.error.message } };
  }

  if (!profileResult.data) {
    return {
      ok: false,
      error: {
        message: 'Login succeeded but profile is missing. Please contact admin to create your profile record.',
        code: 'PROFILE_NOT_FOUND',
      },
    };
  }

  if (!profileResult.data.role) {
    return {
      ok: false,
      error: {
        message: 'Login succeeded but no role is assigned to your account. Please contact admin.',
        code: 'PROFILE_ROLE_MISSING',
      },
    };
  }

  return {
    ok: true,
    data: {
      user,
      session: data.session,
      role: profileResult.data.role,
    },
  };
}

export async function signIn(input: SignInInput): Promise<ServiceResult<AuthState>> {
  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: { message: parsed.error.issues[0]?.message ?? 'Invalid credentials' } };
  }

  const { email, password } = parsed.data;
  const { data, error } = await signInWithPassword(email, password);

  if (error) {
    return { ok: false, error: { message: error.message, code: error.code } };
  }

  if (!data.user || !data.session) {
    return { ok: false, error: { message: 'Authentication failed. Please try again.' } };
  }

  const profileResult = await getProfileByUserId(data.user.id);

  if (profileResult.error) {
    return { ok: false, error: { message: profileResult.error.message } };
  }

  if (!profileResult.data) {
    // Sign out immediately to avoid stuck authenticated-without-profile state.
    await signOutSession();
    return {
      ok: false,
      error: {
        message: 'Sign-in succeeded, but your profile is missing in this application. Please contact admin.',
        code: 'PROFILE_NOT_FOUND',
      },
    };
  }

  if (!profileResult.data.role) {
    await signOutSession();
    return {
      ok: false,
      error: {
        message: 'Sign-in succeeded, but your account has no role assigned. Please contact admin.',
        code: 'PROFILE_ROLE_MISSING',
      },
    };
  }

  const role = profileResult.data.role;
  const redirectTo = getDashboardRouteByRole(role);

  // Login should never block on analytics/audit log writes.
  void (async () => {
    try {
      const { error: logError } = await createAuthLog({
        user_id: data.user.id,
        event: 'LOGIN_SUCCESS',
        role,
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
      });

      if (!logError) {
        return;
      }

      const errorMessage = String(logError.message ?? 'Unknown audit error');
      const lower = errorMessage.toLowerCase();
      if (
        String(logError.code ?? '').toUpperCase() === 'PGRST205' ||
        lower.includes('404') ||
        lower.includes('not found') ||
        lower.includes('auth_logs')
      ) {
        console.error(
          '[AuthService] Login succeeded, but audit log insert failed because auth_logs is missing/unavailable (404). Root cause: Supabase migration for public.auth_logs is not applied to this project, or REST metadata is stale.'
        );
        return;
      }

      console.error('[AuthService] Login succeeded, but audit log insert failed:', logError);
    } catch (logError) {
      console.error('[AuthService] Login succeeded, but audit log insert threw unexpectedly:', logError);
    }
  })();

  return {
    ok: true,
    data: {
      user: data.user,
      session: data.session,
      role,
      redirectTo,
    },
  };
}

export async function signOut(): Promise<ServiceResult<null>> {
  const { error } = await signOutSession();
  if (error) {
    return { ok: false, error: { message: error.message, code: error.code } };
  }
  return { ok: true, data: null };
}
