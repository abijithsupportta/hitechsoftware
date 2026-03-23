'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Briefcase, Plus, Search, X, Eye } from 'lucide-react';
import { usePermission } from '@/hooks/auth/usePermission';
import { useDigitalBagSessions } from '@/hooks/digital-bag/useDigitalBag';
import { useTeam } from '@/hooks/team/useTeam';
import { useAuthStore } from '@/stores/auth.store';
import { ROUTES } from '@/lib/constants/routes';
import { SESSION_STATUS_LABELS, SESSION_STATUS_COLORS } from '@/modules/digital-bag/digital-bag.constants';
import type { BagSessionStatus, CreateSessionInput, CreateBagItemInput } from '@/modules/digital-bag/digital-bag.types';
import type { UserRole } from '@/types/database.types';

export default function DigitalBagDashboardPage() {
  const { can } = usePermission();
  const user = useAuthStore((s) => s.user);
  const {
    sessions, pagination, isLoading, error,
    setTechnicianFilter, setStatusFilter, setPage,
    createMutation, closeMutation,
  } = useDigitalBagSessions();
  const { members } = useTeam();
  const technicians = members.filter((m) => m.role === 'technician' && m.is_active);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [newItems, setNewItems] = useState<CreateBagItemInput[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [statusFilterVal, setStatusFilterVal] = useState<BagSessionStatus | ''>('');

  if (!can('digital-bag:view')) {
    return <div className="p-6 text-sm text-rose-600">You do not have access to the Digital Bag module.</div>;
  }

  const handleCreateSession = () => {
    if (!selectedTechnician || newItems.length === 0 || !user?.id) return;
    const input: CreateSessionInput = {
      technician_id: selectedTechnician,
      notes: sessionNotes || undefined,
      items: newItems,
    };
    createMutation.mutate({ input, issuedBy: user.id }, {
      onSuccess: (result) => {
        if (result.ok) {
          setShowCreateForm(false);
          setSelectedTechnician('');
          setNewItems([]);
          setSessionNotes('');
        }
      },
    });
  };

  const addItem = () => {
    setNewItems((prev) => [...prev, { product_id: '', material_code: '', quantity_issued: 1 }]);
  };

  const updateItem = (index: number, field: keyof CreateBagItemInput, value: string | number) => {
    setNewItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeItem = (index: number) => {
    setNewItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Briefcase className="text-blue-600" size={20} />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Digital Bag</h1>
            <p className="mt-0.5 text-sm text-slate-500">Manage technician inventory bag sessions.</p>
          </div>
        </div>
        {can('digital-bag:create') && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} /> New Session
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-slate-900">{pagination?.total ?? 0}</p>
          <p className="text-xs text-slate-500">Total Sessions</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-2xl font-bold text-green-700">
            {sessions.filter((s) => s.status === 'open').length}
          </p>
          <p className="text-xs text-green-600">Open Sessions</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-2xl font-bold text-amber-700">
            {sessions.filter((s) => s.status === 'variance_review').length}
          </p>
          <p className="text-xs text-amber-600">Variance Review</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={techFilter}
          onChange={(e) => {
            setTechFilter(e.target.value);
            setTechnicianFilter(e.target.value || undefined);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All Technicians</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>{t.display_name}</option>
          ))}
        </select>
        <select
          value={statusFilterVal}
          onChange={(e) => {
            const val = e.target.value as BagSessionStatus | '';
            setStatusFilterVal(val);
            setStatusFilter(val || undefined);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="variance_review">Variance Review</option>
        </select>
      </div>

      {/* Create Session Form */}
      {showCreateForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Create New Bag Session</h2>
            <button type="button" onClick={() => setShowCreateForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Technician</label>
              <select
                value={selectedTechnician}
                onChange={(e) => setSelectedTechnician(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select technician…</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.display_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
              <input
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600">Items</label>
              <button type="button" onClick={addItem} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                + Add Item
              </button>
            </div>
            {newItems.map((item, i) => (
              <div key={i} className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-4">
                <input
                  value={item.product_id}
                  onChange={(e) => updateItem(i, 'product_id', e.target.value)}
                  placeholder="Product ID"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-1"
                />
                <input
                  value={item.material_code}
                  onChange={(e) => updateItem(i, 'material_code', e.target.value)}
                  placeholder="Material Code"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={1}
                  value={item.quantity_issued}
                  onChange={(e) => updateItem(i, 'quantity_issued', Math.max(1, Number(e.target.value || 1)))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button type="button" onClick={() => removeItem(i)} className="text-rose-500 hover:text-rose-700 text-sm">
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCreateSession}
            disabled={!selectedTechnician || newItems.length === 0 || createMutation.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating…' : 'Create Session'}
          </button>
        </div>
      )}

      {/* Sessions Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Technician</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Issued</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Returned</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Consumed</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Variance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="animate-pulse">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-16 rounded bg-slate-200" /></td>
                    ))}
                  </tr>
                ))
              : sessions.length === 0
                ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Briefcase size={32} className="opacity-40" />
                          <p className="text-sm">No bag sessions found.</p>
                        </div>
                      </td>
                    </tr>
                  )
                : sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-sm text-slate-700">{session.session_date}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{session.technician?.display_name ?? '—'}</p>
                        <p className="text-xs text-slate-400">{session.technician?.email ?? ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${SESSION_STATUS_COLORS[session.status] ?? 'bg-slate-100 text-slate-700'}`}>
                          {SESSION_STATUS_LABELS[session.status] ?? session.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{session.total_issued}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{session.total_returned}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{session.total_consumed}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${session.variance > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                          {session.variance}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={ROUTES.DASHBOARD_DIGITAL_BAG_DETAIL(session.technician_id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <Eye size={14} /> View
                          </Link>
                          {session.status === 'open' && can('digital-bag:edit') && (
                            <button
                              type="button"
                              onClick={() => closeMutation.mutate({ sessionId: session.id })}
                              disabled={closeMutation.isPending}
                              className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                            >
                              Close
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm text-slate-600">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
