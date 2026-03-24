import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { signIn, signOut } from '@/modules/auth/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import type { SignInInput } from '@/modules/auth/auth.types';

export function useAuth() {
  const { user, session, role, isHydrated, setAuth, clearAuth, setHydrated } = useAuthStore();

  const signInMutation = useMutation({
    mutationFn: async (input: SignInInput) => {
      const signInTimeoutMs = 8000;

      const timeoutResult = new Promise<Awaited<ReturnType<typeof signIn>>>((resolve) => {
        setTimeout(() => {
          resolve({
            ok: false,
            error: { message: 'Login request timed out. Please try again.' },
          });
        }, signInTimeoutMs);
      });

      return Promise.race([signIn(input), timeoutResult]);
    },
    onSuccess: (result) => {
      if (result.ok) {
        setAuth({
          user: result.data.user,
          session: result.data.session,
          role: result.data.role,
        });
        setHydrated(true);
      }
      // If error, result.ok = false and error is accessible via result.error
      // The error will be returned to caller and shown in UI
    },
  });

  const signOutMutation = useMutation({
    mutationFn: () => signOut(),
    onSuccess: (result) => {
      if (result.ok) {
        clearAuth();
        setHydrated(true);
      }
    },
  });

  const isLoading = !isHydrated || signInMutation.isPending || signOutMutation.isPending;

  const error = useMemo(() => {
    if (signInMutation.data && !signInMutation.data.ok) {
      return signInMutation.data.error.message;
    }
    return null;
  }, [signInMutation.data]);

  return {
    user,
    session,
    userRole: role,
    isHydrated,
    isLoading,
    error,
    signIn: (input: SignInInput) => signInMutation.mutateAsync(input),
    signOut: async () => signOutMutation.mutateAsync(),
  };
}
