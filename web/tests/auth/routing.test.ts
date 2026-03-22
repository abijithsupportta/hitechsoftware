import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardLayout from '@/app/dashboard/layout';
import LoginPage from '@/app/login/page';
import { ROUTES } from '@/lib/constants/routes';
import { routerMock } from '@/tests/setup';
import { createMockUser } from '@/tests/utils/test-helpers';

const mockUseAuth = vi.fn();

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderDashboard(authState: ReturnType<typeof mockUseAuth>) {
  mockUseAuth.mockReturnValue(authState);
  return render(
    React.createElement(
      DashboardLayout,
      null,
      React.createElement('div', null, 'Dashboard children'),
    ),
  );
}

function renderLogin(authState: ReturnType<typeof mockUseAuth>) {
  mockUseAuth.mockReturnValue(authState);
  return render(React.createElement(LoginPage));
}

describe('Suite 2 Route protection works correctly', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    routerMock.replace.mockReset();
    routerMock.push.mockReset();
  });

  it('Test 2.1 — Unauthenticated user visiting dashboard redirects to login', async () => {
    renderDashboard({
      user: null,
      session: null,
      userRole: null,
      isLoading: false,
      isHydrated: true,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith(ROUTES.LOGIN));
    expect(screen.queryByText('Dashboard children')).not.toBeInTheDocument();
  });

  it('Test 2.2 — Authenticated user visiting login page redirects to dashboard', async () => {
    renderLogin({
      user: createMockUser('office_staff'),
      session: null,
      userRole: 'office_staff',
      isLoading: false,
      isHydrated: true,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith(ROUTES.DASHBOARD_SUBJECTS));
  });

  it('Test 2.3 — Super admin redirects to main dashboard', async () => {
    renderLogin({
      user: createMockUser('super_admin'),
      session: null,
      userRole: 'super_admin',
      isLoading: false,
      isHydrated: true,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith(ROUTES.DASHBOARD));
  });

  it('Test 2.4 — Office staff redirects to subjects page', async () => {
    renderLogin({
      user: createMockUser('office_staff'),
      session: null,
      userRole: 'office_staff',
      isLoading: false,
      isHydrated: true,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith(ROUTES.DASHBOARD_SUBJECTS));
  });

  it('Test 2.5 — Stock manager redirects to inventory page', async () => {
    renderLogin({
      user: createMockUser('stock_manager'),
      session: null,
      userRole: 'stock_manager',
      isLoading: false,
      isHydrated: true,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith(ROUTES.DASHBOARD_INVENTORY));
  });

  it('Test 2.6 — Technician redirects to dashboard', async () => {
    renderLogin({
      user: createMockUser('technician'),
      session: null,
      userRole: 'technician',
      isLoading: false,
      isHydrated: true,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith(ROUTES.DASHBOARD));
  });

  it('Test 2.9 — Unknown role redirects to login with error (prevents loop)', async () => {
    renderLogin({
      user: createMockUser('unknown_role' as any),
      session: null,
      userRole: 'unknown_role' as any,
      isLoading: false,
      isHydrated: true,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith(`${ROUTES.LOGIN}?error=invalid_role`));
  });

  it('Test 2.7 — Loading state shows spinner not content', () => {
    renderDashboard({
      user: null,
      session: null,
      userRole: null,
      isLoading: true,
      isHydrated: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard children')).not.toBeInTheDocument();
  });

  it('Test 2.8 — After hydration completes authenticated user sees dashboard', () => {
    renderDashboard({
      user: createMockUser('super_admin'),
      session: null,
      userRole: 'super_admin',
      isLoading: false,
      isHydrated: true,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ ok: true }),
    });

    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard children')).toBeInTheDocument();
  });
});