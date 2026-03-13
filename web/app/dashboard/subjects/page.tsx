'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, PencilLine, Trash2 } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import { useSubjects } from '@/hooks/useSubjects';
import { useBrands } from '@/hooks/useBrands';
import { useDealers } from '@/hooks/useDealers';
import { useServiceCategories } from '@/hooks/useServiceCategories';
import { ROUTES } from '@/lib/constants/routes';
import { SUBJECT_PRIORITY_OPTIONS, SUBJECT_SOURCE_OPTIONS, SUBJECT_STATUS_OPTIONS } from '@/modules/subjects/subject.constants';
import type { SubjectListItem } from '@/modules/subjects/subject.types';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatStatus(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
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

function getCoverageMeta(subject: SubjectListItem) {
  if (subject.is_amc_service) {
    return {
      label: 'Free Service - Under AMC',
      className: 'bg-emerald-100 text-emerald-700',
    };
  }

  if (subject.is_warranty_service) {
    return {
      label: 'Under Warranty',
      className: 'bg-blue-100 text-blue-700',
    };
  }

  return {
    label: 'Out of Warranty',
    className: 'bg-slate-100 text-slate-700',
  };
}

export default function SubjectsDashboardPage() {
  const router = useRouter();
  const { can, role } = usePermission();
  const brands = useBrands();
  const dealers = useDealers();
  const categories = useServiceCategories();
  const {
    subjects,
    pagination,
    searchInput,
    sourceType,
    priority,
    status,
    categoryId,
    brandId,
    dealerId,
    fromDate,
    toDate,
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
              placeholder="Subject number, customer name or phone"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Source</label>
            <select
              value={sourceType}
              onChange={(event) => {
                setSourceType(event.target.value as 'all' | 'brand' | 'dealer');
                setBrandId('');
                setDealerId('');
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
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              {sourceType === 'dealer' ? 'Dealer' : 'Brand'}
            </label>
            {sourceType === 'dealer' ? (
              <select
                value={dealerId}
                onChange={(event) => setDealerId(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Dealers</option>
                {dealers.data.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={brandId}
                onChange={(event) => setBrandId(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Brands</option>
                {brands.data.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Service Coverage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Customer / Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Assigned To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Priority / Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Billing</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Allocated</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    Loading subjects...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-rose-600">
                    {error}
                  </td>
                </tr>
              ) : subjects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    No subjects found.
                  </td>
                </tr>
              ) : (
                subjects.map((subject) => (
                  <tr
                    key={subject.id}
                    className="cursor-pointer hover:bg-slate-50/70"
                    onClick={() => router.push(ROUTES.DASHBOARD_SUBJECTS_DETAIL(subject.id))}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      <Link
                        href={ROUTES.DASHBOARD_SUBJECTS_DETAIL(subject.id)}
                        className="text-ht-blue-600 underline-offset-2 hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {subject.subject_number}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">{subject.category_name ?? '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {(() => {
                        const coverage = getCoverageMeta(subject);
                        return (
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${coverage.className}`}>
                            {coverage.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{subject.source_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <p>{subject.customer_phone ?? '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {subject.assigned_technician_name ? `${subject.assigned_technician_name} (${subject.assigned_technician_code})` : 'Unassigned'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {(() => {
                        const pm = getPriorityMeta(subject.priority);
                        return (
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${pm.className}`}>
                            {pm.label}
                          </span>
                        );
                      })()}
                      <p className="mt-1 text-xs text-slate-500">{formatStatus(subject.status)}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <p>{subject.service_charge_type === 'brand_dealer' ? 'Brand / Dealer' : 'Customer'}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatStatus(subject.billing_status)}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(subject.allocated_date)}</td>
                    <td className="px-4 py-3 text-sm">
                      {can('subject:edit') || (role === 'super_admin' && can('subject:delete')) ? (
                        <details className="relative" onClick={(event) => event.stopPropagation()}>
                          <summary className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100">
                            <MoreHorizontal size={16} />
                          </summary>
                          <div className="absolute right-0 z-10 mt-2 min-w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                            {can('subject:edit') ? (
                              <Link
                                href={ROUTES.DASHBOARD_SUBJECTS_EDIT(subject.id)}
                                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <PencilLine size={14} />
                                Edit
                              </Link>
                            ) : null}

                            {role === 'super_admin' && can('subject:delete') ? (
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                                onClick={() => deleteSubjectMutation.mutate(subject.id)}
                                disabled={deleteSubjectMutation.isPending}
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </details>
                      ) : null}
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
