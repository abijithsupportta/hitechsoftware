import React from 'react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubjectDetailPage from '@/app/dashboard/subjects/[id]/page';
import { PhotoGallery } from '@/components/subjects/photo-gallery';
import { SubjectStatusBadge } from '@/components/subjects/SubjectStatusBadge';
import { useCustomers } from '@/hooks/customers/useCustomers';
import { useSubjects } from '@/hooks/subjects/useSubjects';
import { setRouterParams } from '@/tests/setup';
import { createMockUser, createTestQueryClient, resetAuthStore } from '@/tests/utils/test-helpers';
import { useAuthStore } from '@/stores/auth.store';

const mockGetSubjects = vi.fn();
const mockGetCustomerList = vi.fn();
const mockUseSubjectDetail = vi.fn();
const mockUseContractsBySubject = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/modules/subjects/subject.service', async () => {
  const actual = await vi.importActual<typeof import('@/modules/subjects/subject.service')>('@/modules/subjects/subject.service');
  return {
    ...actual,
    getSubjects: (...args: unknown[]) => mockGetSubjects(...args),
  };
});

vi.mock('@/modules/customers/customer.service', () => ({
  getCustomerList: (...args: unknown[]) => mockGetCustomerList(...args),
  getCustomerById: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
}));

vi.mock('@/hooks/subjects/useSubjects', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/subjects/useSubjects')>('@/hooks/subjects/useSubjects');
  return {
    ...actual,
    useSubjectDetail: () => mockUseSubjectDetail(),
  };
});

vi.mock('@/hooks/contracts/useContracts', () => ({
  useContractsBySubject: () => mockUseContractsBySubject(),
}));

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

function wrapper(queryClient = createTestQueryClient()) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('Suite 7 React rendering performance', () => {
  beforeEach(() => {
    mockGetSubjects.mockReset();
    mockGetCustomerList.mockReset();
    mockUseSubjectDetail.mockReset();
    mockUseContractsBySubject.mockReset();
    mockUseAuth.mockReset();
    resetAuthStore({ role: 'office_staff', isHydrated: true, user: createMockUser('office_staff') });
  });

  it('Test 7.1 — Subject list does not re-render on unrelated state change', async () => {
    mockGetSubjects.mockResolvedValue({
      ok: true,
      data: { data: [{ id: 'subject-1' }], total: 1, page: 1, page_size: 10, total_pages: 1 },
    });

    let renderCount = 0;
    function Consumer() {
      renderCount += 1;
      const { subjects } = useSubjects();
      return React.createElement('div', null, `rows:${subjects.length}`);
    }

    render(React.createElement(Consumer), { wrapper: wrapper() });
    await waitFor(() => screen.getByText('rows:1'));
    const baseline = renderCount;

    act(() => {
      useAuthStore.setState({ user: createMockUser('super_admin') });
    });

    expect(renderCount).toBe(baseline);
  });

  it('Test 7.2 — Loading skeleton shows immediately on navigation', () => {
    setRouterParams({ id: 'subject-1' });
    mockUseSubjectDetail.mockReturnValue({ isLoading: true, data: null });
    mockUseContractsBySubject.mockReturnValue({ data: { ok: true, data: [] } });
    mockUseAuth.mockReturnValue({ userRole: 'office_staff', user: createMockUser('office_staff') });

    const { container } = render(React.createElement(SubjectDetailPage), { wrapper: wrapper() });
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('Test 7.3 — Status badge component is memoized', () => {
    let renderCount = 0;
    function TrackedBadge({ status }: { status: string }) {
      renderCount += 1;
      return React.createElement(SubjectStatusBadge, { status });
    }

    function Parent({ version }: { version: number }) {
      return React.createElement(
        'div',
        { 'data-version': version },
        Array.from({ length: 100 }, (_, index) =>
          React.createElement(TrackedBadge, { key: index, status: 'PENDING' }),
        ),
      );
    }

    const { rerender } = render(React.createElement(Parent, { version: 1 }));
    rerender(React.createElement(Parent, { version: 2 }));

    expect(renderCount).toBe(100);
  });

  it('Test 7.4 — Filter changes debounce search queries', async () => {
    vi.useFakeTimers();
    mockGetCustomerList.mockResolvedValue({
      ok: true,
      data: { data: [], total: 0, page: 1, page_size: 10, total_pages: 1 },
    });

    const { result } = renderHook(() => useCustomers(), { wrapper: wrapper() });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockGetCustomerList).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.setSearch('t');
      result.current.setSearch('te');
      result.current.setSearch('tes');
      result.current.setSearch('test');
      result.current.setSearch('tests');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(399);
    });
    expect(mockGetCustomerList).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(mockGetCustomerList).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('Test 7.5 — Photo gallery does not load all images simultaneously', () => {
    const photos = Array.from({ length: 8 }, (_, index) => ({
      id: `photo-${index}`,
      subject_id: 'subject-test',
      photo_type: 'machine' as const,
      public_url: `https://example.com/${index}.jpg`,
      uploaded_at: '2026-03-21T00:00:00.000Z',
      storage_path: `subjects/${index}.jpg`,
      uploaded_by: null,
      file_size_bytes: null,
      mime_type: 'image/jpeg',
    }));

    const { container } = render(React.createElement(PhotoGallery, { photos }));
    const images = Array.from(container.querySelectorAll('img'));

    expect(images.length).toBeGreaterThan(0);
    expect(images.every((image) => image.getAttribute('loading') === 'lazy')).toBe(true);
  });
});