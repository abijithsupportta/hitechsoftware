// ─────────────────────────────────────────────────────────────────────────────
// useSubjects.ts
//
// PURPOSE:
//   The master hook for the Subject List page. Manages all filter/pagination
//   state, builds the SubjectListFilters query object, fetches the paginated
//   subject list via React Query, and exposes create/update/delete mutations.
//   Re-exports focused hooks (detail, assignment) as a single import entry point.
//
// DESIGN: UNIFIED HOOK (vs split hooks per concern)
//   All 14 filter fields + 3 queue modes + 2 pagination fields = 19 state items.
//   Centralising in one hook keeps the list page component stateless.
//
// FILTER STATE DESIGN:
//   Each setter also resets page to 1 to avoid landing on an empty page
//   after a filter change narrows the result set below the current page.
//
// QUEUE MODES (mutually exclusive, set from ?queue= URL param by the page):
//   pendingOnly  -> incomplete jobs (status NOT IN COMPLETED, INCOMPLETE)
//   overdueOnly  -> past due, assigned jobs (DB computed is_overdue = true)
//   dueOnly      -> completed jobs with unpaid customer bills (billing_status='due')
//
// TECHNICIAN AUTO-FILTER:
//   When role === 'technician', assigned_technician_id is fixed to userId and
//   technician_pending_only is set to true, so technicians only see their own
//   active jobs (not completed historical ones). Defence-in-depth: the API also
//   enforces RLS policies for this.
//
// STALE TIME: 30 seconds for the list query.
//   Prevents aggressive re-fetching on window focus while keeping the UI
//   reasonably fresh. All mutations invalidate SUBJECT_QUERY_KEYS.all.
//
// RE-EXPORTS:
//   useSubjectDetail, useSaveSubjectWarranty   <- from useSubjectDetail.ts
//   useAssignableTechnicians, useAssignTechnician, useQuickAssignTechnician
//                                             <- from useSubjectAssignment.ts
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/auth/usePermission';
import { useAuthStore } from '@/stores/auth.store';
import { createSubjectTicket, getSubjects, removeSubject, updateSubjectRecord } from '@/modules/subjects/subject.service';
import { SUBJECT_DEFAULT_PAGE_SIZE, SUBJECT_QUERY_KEYS } from '@/modules/subjects/subject.constants';
import type { CreateSubjectInput, SubjectListFilters, UpdateSubjectInput } from '@/modules/subjects/subject.types';

// Re-export focused hooks so existing imports keep working without changes.
// New code should import directly from the focused hook files.
export { useSubjectDetail, useSaveSubjectWarranty } from '@/hooks/subjects/useSubjectDetail';
export { useAssignableTechnicians, useAssignTechnician, useQuickAssignTechnician } from '@/hooks/subjects/useSubjectAssignment';

/**
 * @summary Master list hook for the Subject List page with full filter/pagination/CRUD.
 *
 * @description
 * useSubjects() is the central data hook for the `/dashboard/subjects` page.
 * It manages all filter state locally, constructs the SubjectListFilters object,
 * fires the paginated list query, and returns create/update/delete mutations
 * alongside the filter setters.
 *
 * FILTER STATE (19 controlled pieces of state):
 *
 *   searchInput: string
 *     - Free-text search against subject_number, customer_name, address fields.
 *     - Trimmed before being added to filters (trailing spaces are a common UX annoyance).
 *     - Empty string excluded from the query (= no search filter applied).
 *
 *   page: number (default: 1)
 *     - 1-indexed current page number.
 *     - Reset to 1 by every setter other than setPage/setPageSize.
 *     - setPage validates with Math.max(1, value) to prevent page=0.
 *
 *   pageSize: number (default: SUBJECT_DEFAULT_PAGE_SIZE)
 *     - Rows per page. UI provides a select (10, 25, 50).
 *     - Resetting to page 1 on change prevents blank pages.
 *
 *   sourceType: 'all' | 'brand' | 'dealer'
 *     - Filters by subjects.source_type column.
 *     - 'all' = no filter applied (all sourceTypes).
 *
 *   priority: 'all' | 'critical' | 'high' | 'medium' | 'low'
 *     - Filters by subjects.priority column.
 *     - 'all' = no priority filter.
 *
 *   status: string (e.g., 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED')
 *     - Exact match filter on subjects.status.
 *     - Empty string = no status filter.
 *
 *   categoryId, brandId, dealerId: string (UUID or '')
 *     - Dropdown filters. Empty string = no filter.
 *
 *   fromDate, toDate: string (ISO date 'YYYY-MM-DD' or '')
 *     - Date range for subjects.created_at.
 *
 *   technicianDate: string (ISO date 'YYYY-MM-DD' or '')
 *     - Filter by technician_date (appointment date, not creation date).
 *
 *   pendingOnly, overdueOnly, dueOnly: boolean (queue mode flags)
 *     - Mutually exclusive; only one should be true at a time.
 *     - See QUEUE MODE FLAGS details in the file header.
 *
 * RETURNED OBJECT:
 *   subjects: SubjectListItem[] - the array of rows for the current page.
 *   pagination: { page, pageSize, total, totalPages } - for Pagination component.
 *   isLoading: boolean          - true during first fetch only.
 *   isCreating: boolean         - true while createSubjectMutation is pending.
 *   error: string | null        - error message from query or mutation.
 *   createSubjectMutation, updateSubjectMutation, deleteSubjectMutation - full mutation objects.
 *   setSearch, setSourceType, setPriority, setStatus, setCategoryId,
 *   setBrandId, setDealerId, setFromDate, setToDate, setTechnicianDate,
 *   setPendingOnly, setOverdueOnly, setDueOnly, setPage, setPageSize - filter setters.
 */
export function useSubjects() {
  const { role } = usePermission();
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  // ── Filter state ─────────────────────────────────────────────────────
  //
  // All filter state is held in local React state (useState) rather than
  // URL search params or a global Zustand store. Reasons:
  //   - Filter state is per-mount (navigating away resets filters intentionally).
  //   - No browser history entry is needed for filter changes.
  //   - useSubjects is only mounted once per session on the list page.
  // Future plan: migrate to URL state so filters survive back-navigation.
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(SUBJECT_DEFAULT_PAGE_SIZE);
  const [sourceType, setSourceType] = useState<'all' | 'brand' | 'dealer'>('all');
  const [priority, setPriority] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [dealerId, setDealerId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [technicianDate, setTechnicianDate] = useState('');
  // Queue mode flags — mutually exclusive, set from ?queue= URL param by the page
  const [pendingOnly, setPendingOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dueOnly, setDueOnly] = useState(false);

  // ── Build filter object ──────────────────────────────────────────────
  //
  // WHY useMemo (not inline object):
  //   React Query uses referential equality on query keys. A plain inline object
  //   creates a new reference on every render even when no filter changed, which
  //   would trigger a refetch on every re-render. useMemo with explicit dep array
  //   ensures the filters object is stable between renders when nothing changes.
  //   (React Query also does deep-equal on keys, but memoising is still best practice.)
  //
  // CONDITIONAL UNDEFINED (vs null, vs empty string):
  //   Empty strings and 'all' values are coerced to undefined so the service
  //   layer skips applying those Supabase filters. undefined reads as 'not specified'.
  //
  // TECHNICIAN AUTO-FILTER:
  //   assigned_technician_id is hardcoded to userId when role='technician'.
  //   technician_pending_only=true ensures technicians only see active jobs.
  //   Both are undefined (= no extra restriction) for admin/office_staff roles.
  const filters: SubjectListFilters = useMemo(() => {
    return {
      search: searchInput.trim() || undefined,
      source_type: sourceType,
      priority,
      status: status.trim() || undefined,
      category_id: categoryId || undefined,
      brand_id: brandId || undefined,
      dealer_id: dealerId || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      technician_date: technicianDate || undefined,
      assigned_technician_id: role === 'technician' ? (userId ?? undefined) : undefined,
      technician_pending_only: role === 'technician' ? true : undefined,
      pending_only: pendingOnly || undefined,
      overdue_only: overdueOnly || undefined,
      due_only: dueOnly || undefined,
      page,
      page_size: pageSize,
    };
  }, [searchInput, sourceType, priority, status, categoryId, brandId, dealerId, fromDate, toDate, technicianDate, userId, pendingOnly, overdueOnly, dueOnly, role, page, pageSize]);

  // ── Paginated list query ────────────────────────────────────────────
  //
  // QUERY KEY: [...SUBJECT_QUERY_KEYS.list, filters]
  //   Expanding the list key and appending the full filters object.
  //   Each unique filter combination gets its own cache entry, so the user
  //   can navigate back to a previous filter state and see instant results.
  //
  // STALE TIME: 30 seconds
  //   Prevents aggressive re-fetching on window focus. Mutations invalidate
  //   SUBJECT_QUERY_KEYS.all which matches this key, triggering a fresh fetch.
  //
  // getSubjects(filters): Service function that builds the Supabase SELECT
  //   query from the filters object. Returns ServiceResult<SubjectListResponse>.
  const query = useQuery({
    queryKey: [...SUBJECT_QUERY_KEYS.list, filters],
    queryFn: () => getSubjects(filters),
    staleTime: 30 * 1000,
  });

  // ── Create mutation ─────────────────────────────────────────────────
  //
  // createSubjectTicket(input): Calls the service which validates, inserts a new
  //   subjects row, and sets initial status based on whether a technician is assigned.
  //   On success: toasts and invalidates SUBJECT_QUERY_KEYS.all (refreshes the list).
  //   NOTE: The service returns ServiceResult (never throws). onSuccess checks result.ok
  //   and shows toast.error for service-level validation failures. This is a minor
  //   deviation from React Query convention (mutationFn ideally throws on error).
  const createSubjectMutation = useMutation({
    mutationFn: (input: CreateSubjectInput) => createSubjectTicket(input),
    onSuccess: async (result) => {
      if (result.ok) {
        toast.success('Subject created successfully');
        await queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.all });
      } else {
        toast.error(result.error.message);
      }
    },
  });

  // ── Update mutation ─────────────────────────────────────────────────
  //
  // updateSubjectRecord({ id, input }): Updates the subject's editable fields
  //   (subject_number, customer_name, address, etc. — not status, not billing).
  //   On success: invalidates BOTH the list (SUBJECT_QUERY_KEYS.all) AND the
  //   specific detail query (SUBJECT_QUERY_KEYS.detail(id)) so the detail page
  //   header re-fetches the updated field values without a manual refresh.
  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSubjectInput }) => updateSubjectRecord(id, input),
    onSuccess: async (result, variables) => {
      if (result.ok) {
        toast.success('Subject updated successfully');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.all }),
          queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.detail(variables.id) }),
        ]);
      } else {
        toast.error(result.error.message);
      }
    },
  });

  // ── Delete mutation ─────────────────────────────────────────────────
  //
  // removeSubject(id): Deletes the subjects row by primary key.
  //   NOTE: Whether this is a hard or soft delete depends on the service implementation.
  //   If subjects have child records (accessories, photos, bill, timeline), the DB
  //   cascade or service should handle cleanup before deletion.
  //   On success: invalidates all subject queries (SUBJECT_QUERY_KEYS.all).
  //   The deleted subject disappears from the list on the next refetch.
  const deleteSubjectMutation = useMutation({
    mutationFn: (id: string) => removeSubject(id),
    onSuccess: async (result) => {
      if (result.ok) {
        toast.success('Subject deleted successfully');
        await queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.all });
      } else {
        toast.error(result.error.message);
      }
    },
  });

  // ── Return object ──────────────────────────────────────────────────
  //
  // SUBJECTS ARRAY:
  //   query.data?.ok ? query.data.data.data : []
  //   Double .data because ServiceResult wraps a SubjectListResponse which has
  //   a nested .data field for the items array. The outer .data is the ServiceResult
  //   payload; the inner .data is the SubjectListResponse items property.
  //   Fallback to [] prevents .map() errors during loading/error states.
  //
  // PAGINATION FALLBACK:
  //   When the query is loading or errored, pagination defaults to page=1,
  //   total=0, totalPages=1. This keeps the Pagination component renderable
  //   without needing additional null checks.
  //
  // ERROR NORMALIZATION:
  //   Prioritises the ServiceResult error message (from the Supabase/service layer)
  //   over the React Query network error. In most cases only one will be set.
  //
  // SETTER WRAPPERS:
  //   All setters wrap the internal setState and call setPage(1) to reset pagination.
  //   setPage uses Math.max(1, value) to prevent navigating to page 0 or below.
  //   setPageSize also resets to page 1 (switching from 10→25 rows should start fresh).
  return {
    subjects: query.data?.ok ? query.data.data.data : [],
    pagination: query.data?.ok
      ? {
          page: query.data.data.page,
          pageSize: query.data.data.page_size,
          total: query.data.data.total,
          totalPages: query.data.data.total_pages,
        }
      : {
          page: 1,
          pageSize: SUBJECT_DEFAULT_PAGE_SIZE,
          total: 0,
          totalPages: 1,
        },
    searchInput,
    pageSize,
    sourceType,
    priority,
    status,
    categoryId,
    brandId,
    dealerId,
    fromDate,
    toDate,
    technicianDate,
    pendingOnly,
    overdueOnly,
    dueOnly,
    isLoading: query.isLoading,
    isCreating: createSubjectMutation.isPending,
    error:
      (query.data && !query.data.ok && query.data.error.message) ||
      (query.error instanceof Error ? query.error.message : null),
    createSubjectMutation,
    updateSubjectMutation,
    deleteSubjectMutation,
    setSearch: (value: string) => {
      setSearchInput(value);
      setPage(1);
    },
    setSourceType: (value: 'all' | 'brand' | 'dealer') => {
      setSourceType(value);
      setPage(1);
    },
    setPriority: (value: 'all' | 'critical' | 'high' | 'medium' | 'low') => {
      setPriority(value);
      setPage(1);
    },
    setStatus: (value: string) => {
      setStatus(value);
      setPage(1);
    },
    setCategoryId: (value: string) => {
      setCategoryId(value);
      setPage(1);
    },
    setBrandId: (value: string) => {
      setBrandId(value);
      setPage(1);
    },
    setDealerId: (value: string) => {
      setDealerId(value);
      setPage(1);
    },
    setFromDate: (value: string) => {
      setFromDate(value);
      setPage(1);
    },
    setToDate: (value: string) => {
      setToDate(value);
      setPage(1);
    },
    setTechnicianDate: (value: string) => {
      setTechnicianDate(value);
      setPage(1);
    },
    setPendingOnly: (value: boolean) => {
      setPendingOnly(value);
      setPage(1);
    },
    setOverdueOnly: (value: boolean) => {
      setOverdueOnly(value);
      setPage(1);
    },
    setDueOnly: (value: boolean) => {
      setDueOnly(value);
      setPage(1);
    },
    setPage: (value: number) => setPage(Math.max(1, value)),
    setPageSize: (value: number) => {
      setPageSize(value);
      setPage(1);
    },
  };
}
