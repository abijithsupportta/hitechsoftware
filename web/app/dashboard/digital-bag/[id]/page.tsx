'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Package, RotateCcw } from 'lucide-react';
import { usePermission } from '@/hooks/auth/usePermission';
import { useDigitalBagSessionDetail } from '@/hooks/digital-bag/useDigitalBag';
import { useReturnItems } from '@/hooks/digital-bag/useDigitalBag';
import { ROUTES } from '@/lib/constants/routes';
import { SESSION_STATUS_LABELS, SESSION_STATUS_COLORS } from '@/modules/digital-bag/digital-bag.constants';
import { useState } from 'react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DigitalBagTechnicianDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { can } = usePermission();
  const query = useDigitalBagSessionDetail(id);
  const returnMutation = useReturnItems();

  const [returnQty, setReturnQty] = useState<Record<string, number>>({});

  if (!can('digital-bag:view')) {
    return <div className="p-6 text-sm text-rose-600">You do not have access to the Digital Bag module.</div>;
  }

  const session = query.data?.ok ? query.data.data : null;
  const isLoading = query.isLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="h-32 rounded-xl bg-slate-200" />
          <div className="h-64 rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6">
        <Link href={ROUTES.DASHBOARD_DIGITAL_BAG} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <ArrowLeft size={14} /> Back to Digital Bag
        </Link>
        <p className="mt-4 text-sm text-slate-500">Session not found.</p>
      </div>
    );
  }

  const handleReturn = (bagItemId: string) => {
    const qty = returnQty[bagItemId];
    if (!qty || qty <= 0) return;
    returnMutation.mutate({ bag_item_id: bagItemId, quantity_returned: qty });
    setReturnQty((prev) => ({ ...prev, [bagItemId]: 0 }));
  };

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div>
        <Link href={ROUTES.DASHBOARD_DIGITAL_BAG} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3">
          <ArrowLeft size={14} /> Back to Digital Bag
        </Link>
        <div className="flex items-center gap-3">
          <Briefcase className="text-blue-600" size={20} />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Session — {session.technician?.display_name ?? 'Unknown'}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Date: {session.session_date} · Issued by: {session.issuer?.display_name ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Session Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{session.total_issued}</p>
          <p className="text-xs text-slate-500">Issued</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{session.total_returned}</p>
          <p className="text-xs text-slate-500">Returned</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{session.total_consumed}</p>
          <p className="text-xs text-slate-500">Consumed</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className={`text-2xl font-bold ${session.variance > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {session.variance}
          </p>
          <p className="text-xs text-slate-500">Variance</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${SESSION_STATUS_COLORS[session.status] ?? ''}`}>
            {SESSION_STATUS_LABELS[session.status] ?? session.status}
          </span>
          <p className="mt-1 text-xs text-slate-500">Status</p>
        </div>
      </div>

      {session.notes && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          <strong>Notes:</strong> {session.notes}
        </div>
      )}

      {/* Items Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Session Items</h2>
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Issued</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Returned</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Consumed</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Held</th>
              {session.status === 'open' && can('digital-bag:edit') && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Return</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(session.items ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                  <Package size={24} className="mx-auto mb-2 opacity-40" />
                  No items in this session.
                </td>
              </tr>
            ) : (
              (session.items ?? []).map((item) => {
                const held = item.quantity_issued - item.quantity_returned - item.quantity_consumed;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">{item.product?.product_name ?? '—'}</p>
                      <code className="text-xs text-slate-400">{item.material_code}</code>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.quantity_issued}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.quantity_returned}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.quantity_consumed}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${held > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                        {held}
                      </span>
                    </td>
                    {session.status === 'open' && can('digital-bag:edit') && (
                      <td className="px-4 py-3">
                        {held > 0 && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={held}
                              value={returnQty[item.id] ?? ''}
                              onChange={(e) => setReturnQty((prev) => ({ ...prev, [item.id]: Math.min(held, Math.max(0, Number(e.target.value))) }))}
                              className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                              placeholder="Qty"
                            />
                            <button
                              type="button"
                              onClick={() => handleReturn(item.id)}
                              disabled={returnMutation.isPending || !returnQty[item.id]}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                              <RotateCcw size={12} /> Return
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
