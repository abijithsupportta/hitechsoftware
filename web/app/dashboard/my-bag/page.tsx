'use client';

import { Briefcase, Package } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useTechnicianBag } from '@/hooks/digital-bag/useDigitalBag';
import { SESSION_STATUS_LABELS, SESSION_STATUS_COLORS } from '@/modules/digital-bag/digital-bag.constants';
import { BAG_CAPACITY } from '@/modules/digital-bag/digital-bag.constants';

export default function MyBagPage() {
  const user = useAuthStore((s) => s.user);
  const userRole = useAuthStore((s) => s.role);
  const query = useTechnicianBag(user?.id ?? null);

  if (userRole !== 'technician') {
    return <div className="p-6 text-sm text-rose-600">This page is only available for technicians.</div>;
  }

  const result = query.data;
  const summaries = result?.ok ? result.data : [];
  const isLoading = query.isLoading;

  const totalHeld = summaries.reduce((sum, s) => sum + s.total_held, 0);
  const capacityRemaining = summaries[0]?.capacity_remaining ?? BAG_CAPACITY;

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Briefcase className="text-blue-600" size={20} />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">My Bag</h1>
          <p className="mt-0.5 text-sm text-slate-500">Items currently in your digital bag.</p>
        </div>
      </div>

      {/* Capacity Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-slate-900">{totalHeld}</p>
          <p className="text-xs text-slate-500">Items Held</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-green-700">{capacityRemaining}</p>
          <p className="text-xs text-green-600">Capacity Remaining</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-slate-500">Bag Usage</p>
            <p className="text-xs font-medium text-slate-700">{totalHeld}/{BAG_CAPACITY}</p>
          </div>
          <div className="h-2.5 rounded-full bg-slate-200">
            <div
              className={`h-2.5 rounded-full transition-all ${totalHeld / BAG_CAPACITY > 0.8 ? 'bg-amber-500' : 'bg-blue-600'}`}
              style={{ width: `${Math.min(100, (totalHeld / BAG_CAPACITY) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sessions */}
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : summaries.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <Package size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500">Your bag is empty. No items have been issued to you.</p>
        </div>
      ) : (
        summaries.map((session) => (
          <div key={session.session_id} className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Session: {session.session_date}</p>
                <p className="text-xs text-slate-500">Items held: {session.total_held}</p>
              </div>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${SESSION_STATUS_COLORS[session.status] ?? ''}`}>
                {SESSION_STATUS_LABELS[session.status] ?? session.status}
              </span>
            </div>

            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Issued</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Returned</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Consumed</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Held</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {session.items.map((item) => {
                  const held = item.quantity_issued - item.quantity_returned - item.quantity_consumed;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/30">
                      <td className="px-4 py-2.5">
                        <p className="text-sm font-medium text-slate-800">{item.product?.product_name ?? '—'}</p>
                        <code className="text-xs text-slate-400">{item.material_code}</code>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-700">{item.quantity_issued}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-700">{item.quantity_returned}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-700">{item.quantity_consumed}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-sm font-medium ${held > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                          {held}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
