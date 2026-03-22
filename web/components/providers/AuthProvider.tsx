'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentAuthState } from '@/modules/auth/auth.service';
import { onAuthStateChange } from '@/repositories/auth.repository';
import { useAuthStore } from '@/stores/auth.store';
import { ROUTES } from '@/lib/constants/routes';

interface AuthProviderProps {
  children: ReactNode;
}

async function getAuthStateWithTimeout(timeoutMs = 7000) {
  const timeoutResult = new Promise<ReturnType<typeof getCurrentAuthState>>((resolve) => {
    setTimeout(() => {
      resolve(Promise.resolve({ ok: false as const, error: { message: 'Auth state fetch timed out' } }));
    }, timeoutMs);
  });

  return Promise.race([getCurrentAuthState(), timeoutResult]);
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const { isHydrated } = useAuthStore();

  // ─── Initial bootstrap: do not depend solely on auth events ─────────────────
  useEffect(() => {
    let isCancelled = false;

    const bootstrap = async () => {
      try {
        const authState = await getAuthStateWithTimeout();
        if (isCancelled) return;

        if (authState.ok && authState.data.user && authState.data.role) {
          useAuthStore.setState({
            user: authState.data.user,
            session: authState.data.session,
            role: authState.data.role,
            isHydrated: true,
          });
          return;
        }

        useAuthStore.setState({
          user: null,
          session: null,
          role: null,
          isHydrated: true,
        });
      } catch (err) {
        if (isCancelled) return;
        console.error('[AuthProvider] Initial auth bootstrap failed:', err);
        useAuthStore.setState({
          user: null,
          session: null,
          role: null,
          isHydrated: true,
        });
      }
    };

    void bootstrap();

    return () => {
      isCancelled = true;
    };
  }, []);

  // ─── Safety net: force-unblock after 10 s if auth never resolves ────────────
  useEffect(() => {
    if (isHydrated) return;
    const timeout = setTimeout(() => {
      console.error('[AuthProvider] Auth hydration timeout — forcing unblock after 10s');
      useAuthStore.setState({ 
        user: null, 
        session: null, 
        role: null, 
        isHydrated: true 
      });
    }, 10_000);
    return () => clearTimeout(timeout);
  }, [isHydrated]);

  // ─── Auth state listener ────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription },
    } = onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      try {
        // Handle explicit sign out
        if (event === 'SIGNED_OUT') {
          useAuthStore.setState({ 
            user: null, 
            session: null, 
            role: null, 
            isHydrated: true 
          });
          router.replace(ROUTES.LOGIN);
          return;
        }

        // Handle initial load with no session
        if (event === 'INITIAL_SESSION' && !session) {
          useAuthStore.setState({ 
            user: null, 
            session: null, 
            role: null, 
            isHydrated: true 
          });
          return;
        }

        // Token refresh doesn't require hydration change
        if (event === 'TOKEN_REFRESHED') {
          return;
        }

        // Handle signed in or session present
        if (
          (event === 'INITIAL_SESSION' ||
            event === 'SIGNED_IN' ||
            event === 'USER_UPDATED') &&
          session
        ) {
          // If store is already hydrated with a user, skip refetch
          // (means login form just set it or another tab already has the user)
          const currentState = useAuthStore.getState();
          if (currentState.isHydrated && currentState.user && currentState.role) {
            // Already have user and role, just ensure hydrated
            return;
          }

          // Need to fetch profile from DB
          try {
            const authState = await getAuthStateWithTimeout();

            // Re-check store after the await — the signIn mutation's onSuccess
            // may have already set user/role while we were fetching.
            const latestState = useAuthStore.getState();
            if (latestState.isHydrated && latestState.user && latestState.role) {
              return;
            }

            if (authState.ok && authState.data.user && authState.data.role) {
              useAuthStore.setState({
                user: authState.data.user,
                session: authState.data.session,
                role: authState.data.role,
                isHydrated: true,
              });
            } else {
              useAuthStore.setState({ 
                user: null, 
                session: null, 
                role: null, 
                isHydrated: true 
              });
            }
          } catch (err) {
            console.error('[AuthProvider] Profile fetch failed:', err);
            // Re-check: don't wipe state if onSuccess already set it
            const latestState = useAuthStore.getState();
            if (latestState.isHydrated && latestState.user && latestState.role) {
              return;
            }
            useAuthStore.setState({ 
              user: null, 
              session: null, 
              role: null, 
              isHydrated: true 
            });
          }
          return;
        }

        // Fallback: unblock on any other event
        useAuthStore.setState({ isHydrated: true });
      } catch (err) {
        console.error('[AuthProvider] Auth listener error:', err);
        useAuthStore.setState({ 
          user: null, 
          session: null, 
          role: null, 
          isHydrated: true 
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // No dependencies — single setup

  return <>{children}</>;
}
