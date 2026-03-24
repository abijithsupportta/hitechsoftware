// ─────────────────────────────────────────────────────────────────────────────
// app/dashboard/subjects/page.tsx — Subject List Page
//
// Queue modes (synced with ?queue= URL param for shareable links):
//   pending   → all non-terminal statuses, sorted overdue-first
//   overdue   → subset of pending where technician_allocated_date < today
//   due       → COMPLETED jobs with unpaid customer bills
//   (none)    → all subjects with full filter set
//
// Sorting: overdue items float to the top of the list, then pending items
// sorted ascending by date, then all others by created_at descending.
//
// Prefetch on row hover: when the mouse enters a row, React Query prefetches
// the full subject detail so the detail page loads instantly on click.
//
// Technician view: role=technician skips the queue mode tabs and the advanced
// filters (the useSubjects hook auto-applies technician_id + pending filter).
// ─────────────────────────────────────────────────────────────────────────────
'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Filter, Plus, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { usePermission } from '@/hooks/auth/usePermission';
import { useSubjects } from '@/hooks/subjects/useSubjects';
import { useBrands } from '@/hooks/brands/useBrands';
import { useDealers } from '@/hooks/dealers/useDealers';
import { useServiceCategories } from '@/hooks/service-categories/useServiceCategories';
import { AttendanceGuard } from '@/components/attendance/AttendanceGuard';
import { ROUTES } from '@/lib/constants/routes';
import { SUBJECT_PRIORITY_OPTIONS, SUBJECT_QUERY_KEYS, SUBJECT_SOURCE_OPTIONS, SUBJECT_STATUS_OPTIONS } from '@/modules/subjects/subject.constants';
import { getSubjectDetails } from '@/modules/subjects/subject.service';
import type { SubjectListItem } from '@/modules/subjects/subject.types';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

function formatDate(value: string) {
  const d = new Date(value);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function shortenSubjectNumber(value: string) {
  if (value.length <= 10) return value;
  return `...${value.slice(-8)}`;
}

function formatStatus(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function truncateText(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit)}...`;
}

function formatSubjectPreview(value: string) {
  if (value.length <= 24) {
    return value;
  }

  const parts = value.split('-').filter(Boolean);
  const prefix = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : value.slice(0, 8);

  return `${prefix}-...${value.slice(-7)}`;
}

function getPriorityMeta(priority: SubjectListItem['priority']) {
  switch (priority) {
    case 'critical':
      return { label: 'Critical', className: 'bg-rose-100 text-rose-700' };
    case 'high':
      return { label: 'High', className: 'bg-orange-100 text-orange-700' };
    case 'medium':
      return { label: 'Medium', className: 'bg-yellow-100 text-yellow-700' };
    case 'low':
      return { label: 'Low', className: 'bg-green-100 text-green-700' };
  }
}

function getStatusMeta(status: string) {
  switch (status) {
    case 'PENDING':
      return { label: 'Pending', className: 'bg-slate-100 text-slate-600' };
    case 'ALLOCATED':
      return { label: 'Allocated', className: 'bg-blue-100 text-blue-700' };
    case 'ACCEPTED':
      return { label: 'Accepted', className: 'bg-indigo-100 text-indigo-700' };
    case 'REJECTED':
      return { label: 'Rejected', className: 'bg-rose-100 text-rose-700' };
    case 'IN_PROGRESS':
      return { label: 'In Progress', className: 'bg-orange-100 text-orange-700' };
    case 'COMPLETED':
      return { label: 'Completed', className: 'bg-green-100 text-green-700' };
    case 'INCOMPLETE':
      return { label: 'Incomplete', className: 'bg-rose-100 text-rose-700' };
    case 'AWAITING_PARTS':
      return { label: 'Awaiting Parts', className: 'bg-yellow-100 text-yellow-700' };
    case 'RESCHEDULED':
      return { label: 'Rescheduled', className: 'bg-purple-100 text-purple-700' };
    case 'CANCELLED':
      return { label: 'Cancelled', className: 'bg-slate-200 text-slate-600' };
    default:
      return { label: formatStatus(status), className: 'bg-slate-100 text-slate-600' };
  }
}

function getServiceTypeMeta(subject: SubjectListItem) {
  if (subject.is_amc_service) {
    return { label: 'Free Service', className: 'bg-emerald-100 text-emerald-700' };
  }

  if (subject.is_warranty_service) {
    return { label: 'Under Warranty', className: 'bg-blue-100 text-blue-700' };
  }

  return { label: 'Chargeable', className: 'bg-slate-100 text-slate-600' };
}

function getBillingMeta(status: SubjectListItem['billing_status']) {
  switch (status) {
    case 'paid':
      return { label: 'Paid', className: 'bg-green-100 text-green-700' };
    case 'due':
      return { label: 'Due', className: 'bg-amber-100 text-amber-700' };
    case 'partially_paid':
      return { label: 'Partial', className: 'bg-orange-100 text-orange-700' };
    case 'waived':
      return { label: 'Waived', className: 'bg-slate-100 text-slate-500' };
    case 'not_applicable':
      return { label: 'N/A', className: 'bg-slate-50 text-slate-400' };
  }
}

const ACTIVE_PENDING_STATUSES = ['PENDING', 'ALLOCATED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'INCOMPLETE', 'AWAITING_PARTS', 'RESCHEDULED', 'REJECTED'];

function isPendingStatus(status: string) {
  return ACTIVE_PENDING_STATUSES.includes(status);
}

export default function SubjectsDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can, role } = usePermission();
  const queryClient = useQueryClient();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const brands = useBrands();
  const dealers = useDealers();
  const categories = useServiceCategories();
  const {
    subjects,
    pagination,
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
    isLoading,
    error,
    setSearch,
    setSourceType,
    setPriority,
    setStatus,
    setCategoryId,
    setBrandId,
    setDealerId,
    setFromDate,
    setToDate,
    setTechnicianDate,
    setPendingOnly,
    setOverdueOnly,
    setDueOnly,
    setPage,
    setPageSize,
  } = useSubjects();

  const queueParam = searchParams.get('queue');
  const queueMode: 'all' | 'pending' | 'overdue' | 'due' = queueParam === 'overdue'
    ? 'overdue'
    : queueParam === 'pending'
      ? 'pending'
      : queueParam === 'due'
        ? 'due'
      : 'all';

  function setQueueMode(mode: 'all' | 'pending' | 'overdue' | 'due') {
    const params = new URLSearchParams(searchParams.toString());

    if (mode === 'all') {
      params.delete('queue');
    } else {
      params.set('queue', mode);
    }

    const query = params.toString();
    router.push(query ? `/dashboard/subjects?${query}` : '/dashboard/subjects');
  }

  useEffect(() => {
    if (role === 'technician') {
      return;
    }

    if (queueParam === 'overdue') {
      if (dueOnly) {
        setDueOnly(false);
      }
      if (!overdueOnly) {
        setOverdueOnly(true);
      }
      if (!pendingOnly) {
        setPendingOnly(true);
      }
      if (status !== '') {
        setStatus('');
      }
      return;
    }

    if (queueParam === 'pending') {
      if (dueOnly) {
        setDueOnly(false);
      }
      if (overdueOnly) {
        setOverdueOnly(false);
      }
      if (!pendingOnly) {
        setPendingOnly(true);
      }
      if (status !== '') {
        setStatus('');
      }
      return;
    }

    if (queueParam === 'due') {
      if (pendingOnly) {
        setPendingOnly(false);
      }
      if (overdueOnly) {
        setOverdueOnly(false);
      }
      if (status !== '') {
        setStatus('');
      }
      if (!dueOnly) {
        setDueOnly(true);
      }
      return;
    }

    if (pendingOnly) {
      setPendingOnly(false);
    }

    if (overdueOnly) {
      setOverdueOnly(false);
    }

    if (dueOnly) {
      setDueOnly(false);
    }
  }, [queueParam, role, pendingOnly, overdueOnly, dueOnly, setPendingOnly, setOverdueOnly, setDueOnly, status, setStatus]);

  const today = new Date().toISOString().split('T')[0];

  // Overdue items float to the top; within pending, earlier dates come first;
  // completed/terminal items fall to the bottom sorted by created_at desc.
  const sortedSubjects = [...subjects].sort((a, b) => {
    const aDate = a.technician_allocated_date ?? a.allocated_date;
    const bDate = b.technician_allocated_date ?? b.allocated_date;
    const aOverdue = isPendingStatus(a.status) && Boolean(a.technician_allocated_date) && aDate < today;
    const bOverdue = isPendingStatus(b.status) && Boolean(b.technician_allocated_date) && bDate < today;

    if (aOverdue !== bOverdue) {
      return aOverdue ? -1 : 1;
    }

    if (isPendingStatus(a.status) && isPendingStatus(b.status) && aDate !== bDate) {
      return aDate < bDate ? -1 : 1;
    }

    return b.created_at.localeCompare(a.created_at);
  });

  const advancedFilterCount = [
    sourceType !== 'all',
    Boolean(categoryId),
    Boolean(brandId),
    Boolean(dealerId),
    priority !== 'all',
    Boolean(fromDate),
    Boolean(toDate),
  ].filter(Boolean).length;

  function clearAdvancedFilters() {
    setSourceType('all');
    setCategoryId('');
    setBrandId('');
    setDealerId('');
    setPriority('all');
    setFromDate('');
    setToDate('');
  }

  // Prefetch the subject detail data when hovering a row so the detail page
  // renders instantly (staleTime=5min to avoid redundant fetches on fast revisits).
  function handlePrefetch(subjectId: string) {
    queryClient.prefetchQuery({
      queryKey: SUBJECT_QUERY_KEYS.detail(subjectId),
      queryFn: () => getSubjectDetails(subjectId),
      staleTime: 1000 * 60 * 5,
    });
  }

  return (
    <AttendanceGuard>
      <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Service Subjects</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {role === 'technician'
              ? 'Showing your pending assigned services, including carry-forward unfinished tasks.'
              : queueParam === 'overdue'
                ? 'Showing overdue pending works (allocated date older than today) for fast admin follow-up.'
                : queueParam === 'due'
                  ? 'Showing customer-chargeable completed jobs pending payment collection.'
                : queueParam === 'pending'
                  ? 'Showing full pending queue, sorted with overdue items first.'
                  : 'Filter, track, and audit all service subjects.'}
          </p>
        </div>
        {can('subject:create') ? (
          <Link
            href={ROUTES.DASHBOARD_SUBJECTS_NEW}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus size={16} />
            Create Subject
          </Link>
        ) : null}
      </div>

      {role !== 'technician' ? (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setQueueMode('all')}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              queueMode === 'all'
                ? 'border-slate-700 bg-slate-700 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setQueueMode('pending')}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              queueMode === 'pending'
                ? 'border-amber-700 bg-amber-700 text-white'
                : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setQueueMode('overdue')}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              queueMode === 'overdue'
                ? 'border-rose-700 bg-rose-700 text-white'
                : 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Overdue
          </button>
          <button
            type="button"
            onClick={() => setQueueMode('due')}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              queueMode === 'due'
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Due Payments
          </button>
        </div>
      ) : null}

      {role !== 'technician' && queueParam === 'overdue' ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Overdue queue active: technician assigned date is less than today and task is still pending.
        </div>
      ) : null}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Search</label>
            <input
              value={searchInput}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Subject number, customer name or phone"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="w-full lg:w-56">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Status</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">All</option>
              {SUBJECT_STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {formatStatus(item)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((current) => !current)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                showAdvancedFilters || advancedFilterCount > 0
                  ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter size={16} />
              Filters
              {advancedFilterCount > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {advancedFilterCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {showAdvancedFilters ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-700">Advanced filters</p>
              <button
                type="button"
                onClick={clearAdvancedFilters}
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Clear advanced filters
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Source</label>
                <select
                  value={sourceType}
                  onChange={(event) => {
                    const nextSource = event.target.value as 'all' | 'brand' | 'dealer';
                    setSourceType(nextSource);
                    if (nextSource === 'brand') {
                      setDealerId('');
                    }
                    if (nextSource === 'dealer') {
                      setBrandId('');
                    }
                    if (nextSource === 'all') {
                      setBrandId('');
                      setDealerId('');
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All</option>
                  {SUBJECT_SOURCE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Brand</label>
                <select
                  value={brandId}
                  onChange={(event) => {
                    const nextBrandId = event.target.value;
                    setBrandId(nextBrandId);
                    if (nextBrandId) {
                      setSourceType('brand');
                      setDealerId('');
                    } else if (!dealerId) {
                      setSourceType('all');
                    }
                  }}
                  disabled={sourceType === 'dealer'}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">All Brands</option>
                  {brands.data.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Dealer</label>
                <select
                  value={dealerId}
                  onChange={(event) => {
                    const nextDealerId = event.target.value;
                    setDealerId(nextDealerId);
                    if (nextDealerId) {
                      setSourceType('dealer');
                      setBrandId('');
                    } else if (!brandId) {
                      setSourceType('all');
                    }
                  }}
                  disabled={sourceType === 'brand'}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">All Dealers</option>
                  {dealers.data.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Category</label>
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">All Categories</option>
                  {categories.data.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Priority</label>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as 'all' | 'critical' | 'high' | 'medium' | 'low')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All</option>
                  {SUBJECT_PRIORITY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  disabled={role === 'technician'}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  disabled={role === 'technician'}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">Subject No.</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">Customer</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">Category</th>
                <th className="hidden xl:table-cell px-3 py-2 text-center text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">Priority</th>
                <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">Status</th>
                <th className="hidden lg:table-cell px-3 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">Technician</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">Date</th>
                <th className="sticky right-0 bg-slate-50 px-3 py-2 text-right text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`subject-skeleton-${index}`} className="animate-pulse">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-3 py-2">
                        <div className="h-3 w-16 rounded bg-slate-200" />
                      </td>
                    ))}
                    <td className="hidden xl:table-cell px-3 py-2"><div className="h-3 w-16 rounded bg-slate-200" /></td>
                    <td className="sticky right-0 bg-white px-3 py-2"><div className="h-3 w-12 rounded bg-slate-200" /></td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-xs text-rose-600">
                    {error}
                  </td>
                </tr>
              ) : subjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-xs text-slate-500">
                    No subjects found.
                  </td>
                </tr>
              ) : (
                sortedSubjects.map((subject) => {
                  const isUnassigned = !subject.assigned_technician_id;
                  const priorityMeta = getPriorityMeta(subject.priority);
                  const statusMeta = getStatusMeta(subject.status);
                  const needsAttentionBorder = isUnassigned || subject.priority === 'critical';
                  const effectiveDate = subject.technician_allocated_date ?? subject.allocated_date;
                  const isBackdatedAssignment = Boolean(subject.technician_allocated_date) && effectiveDate < today;
                  const isOverduePending = isPendingStatus(subject.status)
                    && Boolean(subject.technician_allocated_date)
                    && effectiveDate < today;

                  return (
                    <tr
                      key={subject.id}
                      className={`hover:bg-slate-50/70${needsAttentionBorder ? ' border-l-4 border-l-rose-400' : ''}`}
                    >
                      {/* Subject Number — shortened with copy + source info + badges */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Link href={ROUTES.DASHBOARD_SUBJECTS_DETAIL(subject.id)} onMouseEnter={() => handlePrefetch(subject.id)} onFocus={() => handlePrefetch(subject.id)} onTouchStart={() => handlePrefetch(subject.id)} title={subject.subject_number}>
                            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono font-medium text-blue-600 hover:underline cursor-pointer whitespace-nowrap">
                              {shortenSubjectNumber(subject.subject_number)}
                            </code>
                          </Link>
                          <button
                            type="button"
                            title="Copy subject number"
                            onClick={() => navigator.clipboard.writeText(subject.subject_number)}
                            className="text-slate-300 hover:text-slate-500 shrink-0"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-400 truncate">
                          {subject.source_name} · {subject.source_type === 'brand' ? 'Brand' : 'Dealer'}
                        </p>
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {subject.is_rejected_pending_reschedule && (
                            <span className="inline-flex rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                              Reschedule
                            </span>
                          )}
                          {role !== 'technician' && isBackdatedAssignment && (
                            <span className="inline-flex rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
                              Backdated
                            </span>
                          )}
                          {isOverduePending && (
                            <span className="inline-flex rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer — name + phone */}
                      <td className="px-3 py-2">
                        {subject.customer_name ? (
                          <>
                            <p className="text-xs font-medium text-slate-800 truncate">{subject.customer_name}</p>
                            <p className="text-[11px] text-slate-400">{subject.customer_phone ?? ''}</p>
                          </>
                        ) : (
                          <span className="text-xs italic text-slate-300">Walk-in</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-3 py-2 text-xs text-slate-600 truncate">
                        {subject.category_name ?? <span className="text-slate-300">—</span>}
                      </td>

                      {/* Priority — hidden below xl */}
                      <td className="hidden xl:table-cell px-3 py-2 text-center">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${priorityMeta.className}`}>
                          {priorityMeta.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </td>

                      {/* Technician — hidden below lg */}
                      <td className="hidden lg:table-cell px-3 py-2">
                        {subject.assigned_technician_name ? (
                          <p className="text-xs font-medium text-slate-800 truncate">{subject.assigned_technician_name}</p>
                        ) : (
                          <span className="inline-flex whitespace-nowrap rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-600">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Date — compact DD/MM/YY + Tech/Brand badge */}
                      <td className="px-3 py-2 text-xs text-slate-600">
                        <p className="font-medium whitespace-nowrap">
                          {formatDate(subject.technician_allocated_date ?? subject.allocated_date)}
                        </p>
                        <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          subject.technician_allocated_date ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {subject.technician_allocated_date ? 'Tech' : 'Brand'}
                        </span>
                      </td>

                      {/* Actions — sticky right */}
                      <td className="sticky right-0 bg-white px-3 py-2 text-right shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)]">
                        <Link
                          href={ROUTES.DASHBOARD_SUBJECTS_DETAIL(subject.id)}
                          onMouseEnter={() => handlePrefetch(subject.id)}
                          onFocus={() => handlePrefetch(subject.id)}
                          onTouchStart={() => handlePrefetch(subject.id)}
                          className="inline-flex items-center whitespace-nowrap rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-center gap-3">
            <p>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="subjects-page-size" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Rows
              </label>
              <select
                id="subjects-page-size"
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      </div>
    </AttendanceGuard>
  );
}
