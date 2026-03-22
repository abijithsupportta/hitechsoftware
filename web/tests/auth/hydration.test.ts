import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ROUTES } from '@/lib/constants/routes';
import { useAuthStore } from '@/stores/auth.store';
import { routerMock } from '@/tests/setup';
import {
  createMockSession,
  createMockUser,
  resetAuthStore,
} from '@/tests/utils/test-helpers';

const mockGetCurrentAuthState = vi.fn();
const mockOnAuthStateChange = vi.fn();

let authCallback: ((event: string, session: unknown) => void | Promise<void>) | null = null;

vi.mock('@/modules/auth/auth.service', () => ({
  getCurrentAuthState: (...args: unknown[]) => mockGetCurrentAuthState(...args),
}));

vi.mock('@/repositories/auth.repository', () => ({
  onAuthStateChange: (callback: (event: string, session: unknown) => void | Promise<void>) => {
    authCallback = callback;
    return mockOnAuthStateChange(callback) ?? {
      data: { subscription: { unsubscribe: vi.fn() } },
    };
  },
}));

function Probe() {
  const hydrated = useAuthStore((store) => store.isHydrated);
  const userId = useAuthStore((store) => store.user?.id ?? 'none');
  const role = useAuthStore((store) => store.role ?? 'none');

  return React.createElement(
    'div',
    null,
    React.createElement('div', { 'data-testid': 'hydrated' }, String(hydrated)),
    React.createElement('div', { 'data-testid': 'user-id' }, userId),
    React.createElement('div', { 'data-testid': 'role' }, role),
  );
}

function renderProvider() {
  return render(
    React.createElement(
      AuthProvider,
      null,
      React.createElement(Probe),
    ),
  );
}

describe('Suite 1 Hydration always completes', () => {
  beforeEach(() => {
    authCallback = null;
    resetAuthStore();
    routerMock.replace.mockReset();
    mockOnAuthStateChange.mockReset();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockGetCurrentAuthState.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Test 1.1 — Hydration completes when INITIAL_SESSION fires with valid session', async () => {
    const user = createMockUser('office_staff');
    const session = createMockSession(user);

    mockGetCurrentAuthState.mockResolvedValue({
      ok: true,
      data: { user, session, role: 'office_staff' },
    });

    renderProvider();

    await act(async () => {
      await authCallback?.('INITIAL_SESSION', session);
    });

    await waitFor(() => expect(screen.getByTestId('hydrated')).toHaveTextContent('true'), { timeout: 3000 });
    expect(screen.getByTestId('user-id')).toHaveTextContent(user.id);
    expect(screen.getByTestId('role')).toHaveTextContent('office_staff');
  });

  it('Test 1.2 — Hydration completes when INITIAL_SESSION fires with null session', async () => {
    renderProvider();

    await act(async () => {
      await authCallback?.('INITIAL_SESSION', null);
    });

    await waitFor(() => expect(screen.getByTestId('hydrated')).toHaveTextContent('true'), { timeout: 1000 });
    expect(screen.getByTestId('user-id')).toHaveTextContent('none');
  });

  it('Test 1.3 — Hydration completes when profile fetch fails', async () => {
    const session = createMockSession();

    mockGetCurrentAuthState.mockResolvedValue({
      ok: false,
      error: { message: 'Profile lookup failed' },
    });

    renderProvider();

    await act(async () => {
      await authCallback?.('INITIAL_SESSION', session);
    });

    await waitFor(() => expect(screen.getByTestId('hydrated')).toHaveTextContent('true'));
    expect(screen.getByTestId('user-id')).toHaveTextContent('none');
  });

  it('Test 1.4 — Hydration completes when network is completely offline', async () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(useAuthStore.getState().isHydrated).toBe(true);
    expect(useAuthStore.getState().user).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Auth hydration timeout'));

    consoleSpy.mockRestore();
  });

  it('Test 1.5 — Hydration timeout fires after exactly 10 seconds', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9_999);
    });
    expect(useAuthStore.getState().isHydrated).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(useAuthStore.getState().isHydrated).toBe(true);
  });

  it('Test 1.6 — Hydration completes on SIGNED_OUT event', async () => {
    resetAuthStore({
      user: createMockUser('super_admin'),
      session: createMockSession(),
      role: 'super_admin',
      isHydrated: true,
    });

    renderProvider();

    await act(async () => {
      await authCallback?.('SIGNED_OUT', null);
    });

    expect(useAuthStore.getState().isHydrated).toBe(true);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().role).toBeNull();
    expect(routerMock.replace).toHaveBeenCalledWith(ROUTES.LOGIN);
  });
});