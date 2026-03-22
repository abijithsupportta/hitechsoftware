import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useJobWorkflow } from '@/hooks/subjects/use-job-workflow';
import { useSubjectDetail, useSubjects } from '@/hooks/subjects/useSubjects';
import { SUBJECT_QUERY_KEYS } from '@/modules/subjects/subject.constants';
import { createTestQueryClient, resetAuthStore } from '@/tests/utils/test-helpers';

const mockGetSubjects = vi.fn();
const mockGetSubjectDetails = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'tech-1' } }),
}));

vi.mock('@/modules/subjects/subject.service', async () => {
  const actual = await vi.importActual<typeof import('@/modules/subjects/subject.service')>('@/modules/subjects/subject.service');
  return {
    ...actual,
    getSubjects: (...args: unknown[]) => mockGetSubjects(...args),
    getSubjectDetails: (...args: unknown[]) => mockGetSubjectDetails(...args),
    createSubjectTicket: vi.fn(),
    updateSubjectRecord: vi.fn(),
    removeSubject: vi.fn(),
    assignSubjectToTechnician: vi.fn(),
    assignTechnicianWithDate: vi.fn(),
    saveSubjectWarranty: vi.fn(),
  };
});

function createWrapper(queryClient = createTestQueryClient()) {
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

describe('Suite 5 TanStack Query performance', () => {
  beforeEach(() => {
    resetAuthStore({ role: 'office_staff', isHydrated: true });
    mockGetSubjects.mockReset();
    mockGetSubjectDetails.mockReset();
    vi.restoreAllMocks();
  });

  it('Test 5.1 — Subject list query uses cached data on second call', async () => {
    mockGetSubjects.mockResolvedValue({
      ok: true,
      data: { data: [{ id: 'subject-1' }], total: 1, page: 1, page_size: 10, total_pages: 1 },
    });

    const { queryClient, wrapper } = createWrapper();
    const first = renderHook(() => useSubjects(), { wrapper });

    await waitFor(() => expect(first.result.current.subjects).toHaveLength(1));
    first.unmount();

    const second = renderHook(() => useSubjects(), { wrapper });
    await waitFor(() => expect(second.result.current.subjects).toHaveLength(1));

    expect(mockGetSubjects).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryCache().findAll().length).toBeGreaterThan(0);
  });

  it('Test 5.2 — Subject list invalidates correctly after status update', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => ({ ok: true, data: { id: 'subject-1', status: 'ARRIVED' } }),
    } as Response);

    const { queryClient, wrapper } = createWrapper();
    const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');
    const { result } = renderHook(() => useJobWorkflow('subject-1'), { wrapper });

    await act(async () => {
      result.current.updateStatus('ARRIVED');
    });

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    await waitFor(() => expect(refetchSpy).toHaveBeenCalledWith({ queryKey: SUBJECT_QUERY_KEYS.detail('subject-1') }));
    expect(refetchSpy).toHaveBeenCalledWith({ queryKey: SUBJECT_QUERY_KEYS.list });
  });

  it('Test 5.3 — Prefetch on hover reduces detail page load time', async () => {
    mockGetSubjectDetails.mockResolvedValue({ ok: true, data: { id: 'subject-1', subject_number: 'SUB-1' } });

    const { queryClient, wrapper } = createWrapper();

    await queryClient.prefetchQuery({
      queryKey: SUBJECT_QUERY_KEYS.detail('subject-1'),
      queryFn: () => mockGetSubjectDetails('subject-1'),
      staleTime: 1000 * 60 * 5,
    });

    const { result } = renderHook(() => useSubjectDetail('subject-1'), { wrapper });

    await waitFor(() => expect(result.current.data?.ok).toBe(true));
    expect(mockGetSubjectDetails).toHaveBeenCalledTimes(1);
  });

  it('Test 5.4 — Parallel queries in detail page fire simultaneously', async () => {
    vi.resetModules();
    vi.doUnmock('@/modules/subjects/subject.service');
    const mockGetSubjectById = vi.fn();
    const mockGetSubjectTimeline = vi.fn();

    vi.doMock('@/repositories/subject.repository', async () => {
      const actual = await vi.importActual<typeof import('@/repositories/subject.repository')>('@/repositories/subject.repository');
      return {
        ...actual,
        getSubjectById: (...args: unknown[]) => mockGetSubjectById(...args),
        getSubjectTimeline: (...args: unknown[]) => mockGetSubjectTimeline(...args),
      };
    });
    vi.doMock('@/modules/technicians/technician.service', () => ({
      getAssignableTechnicians: vi.fn(async () => ({ ok: true, data: [] })),
      getAssignableTechnicianById: vi.fn(async () => ({ ok: true, data: null })),
    }));

    const subjectPromise = Promise.resolve({ data: { id: 'subject-1' }, error: null });
    const timelinePromise = Promise.resolve({ data: [], error: null });
    mockGetSubjectById.mockReturnValue(subjectPromise);
    mockGetSubjectTimeline.mockReturnValue(timelinePromise);

    const actualService = await import('@/modules/subjects/subject.service');
    const request = actualService.getSubjectDetails('subject-1');

    expect(mockGetSubjectById).toHaveBeenCalledTimes(1);
    expect(mockGetSubjectTimeline).toHaveBeenCalledTimes(1);

    await expect(request).resolves.toMatchObject({ ok: true });
  });
});
