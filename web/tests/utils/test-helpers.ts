import React, { type ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { vi } from 'vitest';
import type { Session, User } from '@supabase/supabase-js';
import { useAuthStore } from '@/stores/auth.store';
import type { UserRole } from '@/types/database.types';
import { server, setRouterParams, setRouterPathname } from '@/tests/setup';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

type MockAuthStateOverrides = Partial<{
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  isHydrated: boolean;
}>;

export function createMockUser(role: UserRole = 'office_staff'): User {
  return {
    id: 'user-1',
    email: 'tester@hitech.local',
    app_metadata: {},
    user_metadata: {
      first_name: 'Test',
      last_name: 'User',
      role,
    },
    aud: 'authenticated',
    created_at: '2026-03-21T00:00:00.000Z',
  } as User;
}

export function createMockSession(user: User = createMockUser()): Session {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  } as Session;
}

export function createMockSubject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'subject-1',
    subject_number: 'SUB-1001',
    source_type: 'brand',
    priority: 'high',
    status: 'PENDING',
    allocated_date: '2026-03-21',
    customer_name: 'Test Customer',
    customer_phone: '9999999999',
    type_of_service: 'service',
    service_charge_type: 'customer',
    is_amc_service: false,
    is_warranty_service: false,
    billing_status: 'due',
    created_at: '2026-03-21T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockAuthStore(overrides: MockAuthStateOverrides = {}) {
  return {
    user: overrides.user ?? null,
    session: overrides.session ?? null,
    role: overrides.role ?? null,
    isHydrated: overrides.isHydrated ?? false,
    setAuth: vi.fn(),
    clearAuth: vi.fn(),
    setHydrated: vi.fn(),
    resetStore: vi.fn(),
  };
}

export function resetAuthStore(overrides: MockAuthStateOverrides = {}) {
  useAuthStore.setState({
    user: overrides.user ?? null,
    session: overrides.session ?? null,
    role: overrides.role ?? null,
    isHydrated: overrides.isHydrated ?? false,
  });
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  options?: {
    authState?: MockAuthStateOverrides;
    pathname?: string;
    params?: Record<string, string>;
    queryClient?: QueryClient;
  },
) {
  const queryClient = options?.queryClient ?? createTestQueryClient();

  resetAuthStore(options?.authState);
  setRouterPathname(options?.pathname ?? '/');
  setRouterParams(options?.params ?? {});

  const result = render(
    React.createElement(QueryClientProvider, { client: queryClient }, ui),
  );

  return {
    ...result,
    queryClient,
  };
}

export function mockSupabaseQuery(tableName: string, mockData: JsonValue) {
  server.use(
    http.get(`*/rest/v1/${tableName}`, () => HttpResponse.json(mockData)),
  );
}

export function mockSupabaseError(tableName: string, errorMessage: string, status = 400) {
  server.use(
    http.get(`*/rest/v1/${tableName}`, () => HttpResponse.json({ message: errorMessage }, { status })),
  );
}

export async function advanceTimersBySeconds(seconds: number) {
  await vi.advanceTimersByTimeAsync(seconds * 1000);
  await Promise.resolve();
  await Promise.resolve();
}