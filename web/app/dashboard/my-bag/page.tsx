'use client';

import { Briefcase, Package } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useTodaySession } from '@/hooks/digital-bag/useDigitalBag';
import { BAG_CAPACITY } from '@/modules/digital-bag/digital-bag.constants';
import type { DigitalBagItem } from '@/modules/digital-bag/digital-bag.types';

export default function MyBagPage() {
  const user = useAuthStore((s) => s.user);
  const userRole = useAuthStore((s) => s.role);
  const query = useTodaySession(user?.id ?? null);

  if (userRole !== 'technician') {
    return <div className="p-6 text-sm text-rose-600">This page is only available for technicians.</div>;
  }

  const result = query.data;
  const session = result?.ok ? result.data : null;
  const isLoading = query.isLoading;
  const items: DigitalBagItem[] = session?.items ?? [];

  const totalHeld = items.reduce((sum, i) => sum + (i.quantity_issued - i.quantity_returned - i.quantity_consumed), 0);

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Briefcase className="text-blue-600" size={20} />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">My Bag</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {session ? `Today's bag — ${session.session_date}` : 'Items currently in your digital bag.'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-xl bg-slate-200" />
          <div className="h-64 rounded-xl bg-slate-200" />
        </div>
      ) : !session ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <Package size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">No bag assigned today</p>
          <p className="text-xs text-slate-500 mt-1">Contact the office to get your daily bag session created.</p>
        </div>
      ) : (
        <>
          {/* Capacity Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-bold text-slate-900">{totalHeld}</p>
              <p className="text-xs text-slate-500">Items Held</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-bold text-green-700">{Math.max(0, BAG_CAPACITY - totalHeld)}</p>
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

          {/* Items Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-700">Bag Items ({items.length})</p>
            </div>
            {items.length === 0 ? (
              <div className="p-8 text-center">
                <Package size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500">No items in your bag yet.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">MRP</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Issued</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Consumed</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Held</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item) => {
                    const held = item.quantity_issued - item.quantity_returned - item.quantity_consumed;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/30">
                        <td className="px-4 py-2.5">
                          <p className="text-sm font-medium text-slate-800">{item.product_name ?? '—'}</p>
                          <code className="text-xs text-slate-400">{item.material_code}</code>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-slate-700">₹{(item.mrp ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-700">{item.quantity_issued}</td>
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
