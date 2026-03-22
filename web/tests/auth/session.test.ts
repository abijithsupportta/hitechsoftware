import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardLayout from '@/app/dashboard/layout';
import { AuthErrorBoundary } from '@/components/providers/AuthErrorBoundary';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ROUTES } from '@/lib/constants/routes';
import { useAuthStore } from '@/stores/auth.store';
import { routerMock } from '@/tests/setup';
import {
  createMockSession,
  createMockUser,
  resetAuthStore,
} from '@/tests/utils/test-helpers';

const mockUseAuth = vi.fn();
const mockGetCurrentAuthState = vi.fn();
let authCallback: ((event: string, session: unknown) => void | Promise<void>) | null = null;

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/modules/auth/auth.service', async () => {
  const actual = await vi.importActual<typeof import('@/modules/auth/auth.service')>('@/modules/auth/auth.service');
  return {
    ...actual,
    getCurrentAuthState: (...args: unknown[]) => mockGetCurrentAuthState(...args),
  };
});

vi.mock('@/repositories/auth.repository', () => ({
  onAuthStateChange: (callback: (event: string, session: unknown) => void | Promise<void>) => {
    authCallback = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  },
}));

function Bomb(): never {
  throw new Error('Boom from auth subtree');
}

describe('Suite 3 Session handling', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAuthStore();
    authCallback = null;
    mockUseAuth.mockReset();
    mockGetCurrentAuthState.mockReset();
    routerMock.replace.mockReset();
  });

  it('Test 3.1 — Session persists across simulated page refresh', () => {
    const user = createMockUser('office_staff');
    const session = createMockSession(user);

    useAuthStore.setState({ user, session, role: 'office_staff', isHydrated: true });
    localStorage.setItem('auth-store', JSON.stringify(useAuthStore.getState()));

    resetAuthStore();
    const persisted = JSON.parse(localStorage.getItem('auth-store') ?? '{}') as {
      user: ReturnType<typeof createMockUser>;
      session: ReturnType<typeof createMockSession>;
      role: 'office_staff';
      isHydrated: true;
    };
    useAuthStore.setState(persisted);

    expect(useAuthStore.getState().user?.id).toBe(user.id);
    expect(useAuthStore.getState().isHydrated).toBe(true);
  });

  it('Test 3.2 — Expired session triggers re-authentication', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      userRole: null,
      isLoading: false,
      isHydrated: true,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      React.createElement(
        DashboardLayout,
        null,
        React.createElement('div', null, 'Secret dashboard'),
      ),
    );

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith(ROUTES.LOGIN));
  });

  it('Test 3.3 — Token refresh success keeps user logged in', async () => {
    const user = createMockUser('technician');
    resetAuthStore({
      user,
      session: createMockSession(user),
      role: 'technician',
      isHydrated: true,
    });

    render(
      React.createElement(
        AuthProvider,
        null,
        React.createElement('div', null, 'Child'),
      ),
    );

    await act(async () => {
      await authCallback?.('TOKEN_REFRESHED', createMockSession(user));
    });

    expect(useAuthStore.getState().user?.id).toBe(user.id);
    expect(useAuthStore.getState().isHydrated).toBe(true);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it('Test 3.4 — Concurrent session events handled correctly', async () => {
    const user = createMockUser('office_staff');
    const session = createMockSession(user);

    mockGetCurrentAuthState.mockResolvedValue({
      ok: true,
      data: { user, session, role: 'office_staff' },
    });

    render(
      React.createElement(
        AuthProvider,
        null,
        React.createElement('div', null, 'Child'),
      ),
    );

    await act(async () => {
      await Promise.all([
        authCallback?.('INITIAL_SESSION', session),
        authCallback?.('SIGNED_IN', session),
      ]);
    });

    expect(useAuthStore.getState().isHydrated).toBe(true);
    expect(useAuthStore.getState().user?.id).toBe(user.id);
  });

  it('Test 3.5 — Auth error boundary catches render errors', () => {
    render(
      React.createElement(
        AuthErrorBoundary,
        null,
        React.createElement(Bomb),
      ),
    );

    expect(screen.getByText('Something went wrong loading the application.')).toBeInTheDocument();
    expect(screen.getByText(/An error occurred during initialization/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh Page' })).toBeInTheDocument();
  });
});