'use client';

import Link from 'next/link';
import { usePermission } from '@/hooks/usePermission';
import { useSubjects } from '@/hooks/useSubjects';
import { ROUTES } from '@/lib/constants/routes';
import { SUBJECT_PRIORITY_OPTIONS, SUBJECT_SOURCE_OPTIONS, SUBJECT_STATUS_OPTIONS } from '@/modules/subjects/subject.constants';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatStatus(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function SubjectsDashboardPage() {
  const { can, role } = usePermission();
  const {
    subjects,
    pagination,
    searchInput,
    sourceType,
    priority,
    status,
    fromDate,
    toDate,
    isLoading,
    error,
    setSearch,
    setSourceType,
    setPriority,
    setStatus,
    setFromDate,
    setToDate,
    setPage,
    deleteSubjectMutation,
  } = useSubjects();

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Subjects</h1>
          <p className="mt-1 text-sm text-slate-600">Filter, track, and audit all service subjects.</p>
        </div>

        {can('subject:create') ? (
          <Link href={ROUTES.DASHBOARD_SUBJECTS_NEW} className="ht-btn ht-btn-primary">
            Create subject
          </Link>
        ) : null}
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Search</label>
            <input
              value={searchInput}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Subject number or phone"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Source</label>
            <select
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value as 'all' | 'brand' | 'dealer')}
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

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Assigned To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Allocated</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">
                    Loading subjects...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-rose-600">
                    {error}
                  </td>
                </tr>
              ) : subjects.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">
                    No subjects found.
                  </td>
                </tr>
              ) : (
                subjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{subject.subject_number}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{subject.source_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{subject.category_name ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{subject.customer_phone ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {subject.assigned_technician_name ? `${subject.assigned_technician_name} (${subject.assigned_technician_code})` : 'Unassigned'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{subject.type_of_service}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{subject.priority}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatStatus(subject.status)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(subject.allocated_date)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <Link href={ROUTES.DASHBOARD_SUBJECTS_DETAIL(subject.id)} className="ht-btn ht-btn-secondary ht-btn-sm">
                          View
                        </Link>

                        {can('subject:edit') ? (
                          <Link href={ROUTES.DASHBOARD_SUBJECTS_EDIT(subject.id)} className="ht-btn ht-btn-secondary ht-btn-sm">
                            Edit
                          </Link>
                        ) : null}

                        {role === 'super_admin' && can('subject:delete') ? (
                          <button
                            type="button"
                            className="ht-btn ht-btn-danger ht-btn-sm"
                            onClick={() => deleteSubjectMutation.mutate(subject.id)}
                            disabled={deleteSubjectMutation.isPending}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <p>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="ht-btn ht-btn-secondary ht-btn-sm"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="ht-btn ht-btn-secondary ht-btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
