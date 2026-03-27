'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Briefcase, Plus, Eye, AlertTriangle, History, DollarSign } from 'lucide-react';
import { usePermission } from '@/hooks/auth/usePermission';
import { useAllActiveSessions, useCreateSession } from '@/hooks/digital-bag/useDigitalBag';
import { useTeam } from '@/hooks/team/useTeam';
import { useAuthStore } from '@/stores/auth.store';
import { ROUTES } from '@/lib/constants/routes';
import { SESSION_STATUS_LABELS, SESSION_STATUS_COLORS } from '@/modules/digital-bag/digital-bag.constants';
import type { DigitalBagSession } from '@/modules/digital-bag/digital-bag.types';

export default function DigitalBagDashboardPage() {
  const { can } = usePermission();
  const user = useAuthStore((s) => s.user);
  const { sessions, isLoading, error } = useAllActiveSessions();
  const createMutation = useCreateSession();
  const { members } = useTeam();
  const technicians = members.filter((m) => m.role === 'technician' && m.is_active);

  const [selectedTechnician, setSelectedTechnician] = useState('');

  const now = new Date();
  const isPastSixPM = now.getHours() >= 18;
  const openSessions = sessions.filter((s: DigitalBagSession) => s.status === 'open');
  const totalItemsIssued = sessions.reduce((sum: number, s: DigitalBagSession) => sum + s.total_issued, 0);
  const totalDamageFees = sessions.reduce((sum: number, s: DigitalBagSession) => sum + (s.total_damage_fees ?? 0), 0);
  const pendingClosures = isPastSixPM ? openSessions.length : 0;

  // Build a map: technician_id → session for quick lookup
  const techSessionMap = useMemo(() => {
    const map = new Map<string, DigitalBagSession>();
    for (const s of sessions) {
      if (s.technician?.id) map.set(s.technician.id, s);
    }
    return map;
  }, [sessions]);

  const handleCreate = () => {
    if (!selectedTechnician || !user?.id) return;
    createMutation.mutate({ technicianId: selectedTechnician, createdBy: user.id }, {
      onSuccess: (result) => {
        if (result.ok) setSelectedTechnician('');
      },
    });
  };

  if (!can('digital-bag:view')) {
    return <div className="p-6 text-sm text-rose-600">You do not have access to the Digital Bag module.</div>;
  }

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Briefcase className="text-blue-600" size={20} />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Digital Bag</h1>
            <p className="mt-0.5 text-sm text-slate-500">Today&apos;s technician bag sessions.</p>
          </div>
        </div>
        <Link
          href={ROUTES.DASHBOARD_DIGITAL_BAG_HISTORY}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <History size={16} /> History
        </Link>
      </div>

      {/* Pending Closures Alert */}
      {pendingClosures > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="text-amber-600 shrink-0" size={20} />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {pendingClosures} bag session{pendingClosures > 1 ? 's' : ''} still open after 6 PM
            </p>
            <p className="text-xs text-amber-600">
              Please close all sessions before end of day.
            </p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-slate-900">{sessions.length}</p>
          <p className="text-xs text-slate-500">Active Sessions</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-2xl font-bold text-blue-700">{totalItemsIssued}</p>
          <p className="text-xs text-blue-600">Items Issued</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-2xl font-bold text-amber-700">{pendingClosures}</p>
          <p className="text-xs text-amber-600">Pending Closures</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-1">
            <DollarSign size={18} className="text-rose-600" />
            <p className="text-2xl font-bold text-rose-700">{totalDamageFees.toFixed(2)}</p>
          </div>
          <p className="text-xs text-rose-600">Damage Fees</p>
        </div>
      </div>

      {/* Create Session */}
      {can('digital-bag:create') && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <select
            value={selectedTechnician}
            onChange={(e) => setSelectedTechnician(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select technician to create session…</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id} disabled={techSessionMap.has(t.id)}>
                {t.display_name}{techSessionMap.has(t.id) ? ' (already has session)' : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!selectedTechnician || createMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={16} /> {createMutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      )}

      {/* Technician Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
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
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-16 rounded bg-slate-200" /></td>
                    ))}
                  </tr>
                ))
              : sessions.length === 0
                ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Briefcase size={32} className="opacity-40" />
                          <p className="text-sm">No bag sessions for today.</p>
                        </div>
                      </td>
                    </tr>
                  )
                : sessions.map((session: DigitalBagSession) => (
                    <tr key={session.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{session.technician?.display_name ?? '—'}</p>
                        <p className="text-xs text-slate-400">{session.technician?.phone_number ?? session.technician?.email ?? ''}</p>
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
                        <Link
                          href={ROUTES.DASHBOARD_DIGITAL_BAG_DETAIL(session.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <Eye size={14} /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
