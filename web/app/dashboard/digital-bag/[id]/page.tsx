'use client';

import { use, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Package, Trash2, Lock, CheckCircle2, X } from 'lucide-react';
import { usePermission } from '@/hooks/auth/usePermission';
import { useSessionById, useRemoveItem, useCloseSession } from '@/hooks/digital-bag/useDigitalBag';
import { ROUTES } from '@/lib/constants/routes';
import { SESSION_STATUS_LABELS, SESSION_STATUS_COLORS } from '@/modules/digital-bag/digital-bag.constants';
import BagProductSearch from '@/components/digital-bag/BagProductSearch';
import type { DigitalBagItem, CloseItemDetail } from '@/modules/digital-bag/digital-bag.types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DigitalBagSessionDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { can } = usePermission();
  const query = useSessionById(id);
  const removeMutation = useRemoveItem();
  const closeMutation = useCloseSession();

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeItems, setCloseItems] = useState<Map<string, CloseItemDetail>>(new Map());
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  if (!can('digital-bag:view')) {
    return <div className="p-6 text-sm text-rose-600">You do not have access to the Digital Bag module.</div>;
  }

  const session = query.data?.ok ? query.data.data : null;
  const isLoading = query.isLoading;
  const isOpen = session?.status === 'open';

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

  const items: DigitalBagItem[] = session.items ?? [];
  const existingProductIds = items.map((i) => i.product_id);

  const handleRemove = (itemId: string) => {
    removeMutation.mutate(itemId);
  };

  const openCloseModal = () => {
    const map = new Map<string, CloseItemDetail>();
    for (const item of items) {
      map.set(item.id, {
        item_id: item.id,
        quantity_returned: item.quantity_issued - item.quantity_consumed,
        damage_fee_per_unit: 0,
      });
    }
    setCloseItems(map);
    setCheckedItems(new Set());
    setShowCloseModal(true);
  };

  const updateCloseItem = (itemId: string, field: 'quantity_returned' | 'damage_fee_per_unit', value: number) => {
    setCloseItems((prev) => {
      const next = new Map(prev);
      const current = next.get(itemId);
      if (current) next.set(itemId, { ...current, [field]: value });
      return next;
    });
  };

  const toggleCheck = (itemId: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const allChecked = items.length > 0 && checkedItems.size === items.length;

  const totalDamageFees = Array.from(closeItems.values()).reduce((sum, ci) => {
    const item = items.find((i) => i.id === ci.item_id);
    if (!item) return sum;
    const missing = item.quantity_issued - item.quantity_consumed - ci.quantity_returned;
    return sum + (missing > 0 ? missing * (ci.damage_fee_per_unit ?? 0) : 0);
  }, 0);

  const handleConfirmClose = () => {
    closeMutation.mutate(
      { session_id: id, items: Array.from(closeItems.values()) },
      { onSuccess: (result) => { if (result.ok) setShowCloseModal(false); } },
    );
  };

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div>
        <Link href={ROUTES.DASHBOARD_DIGITAL_BAG} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-3">
          <ArrowLeft size={14} /> Back to Digital Bag
        </Link>
        <div className="flex items-center justify-between">
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
          {isOpen && can('digital-bag:edit') && (
            <button
              type="button"
              onClick={openCloseModal}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              <Lock size={16} /> Close Session
            </button>
          )}
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

      {/* Add Product (open session only) */}
      {isOpen && can('digital-bag:edit') && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Add Product to Bag</h2>
          <BagProductSearch
            sessionId={id}
            existingProductIds={existingProductIds}
          />
        </div>
      )}

      {/* Items Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Session Items ({items.length})
          </h2>
        </div>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">MRP</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Issued</th>
              {!isOpen && (
                <>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Returned</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Missing</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Damage Fee</th>
                </>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Consumed</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Held</th>
              {isOpen && can('digital-bag:edit') && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={isOpen ? 6 : 8} className="px-4 py-8 text-center text-sm text-slate-400">
                  <Package size={24} className="mx-auto mb-2 opacity-40" />
                  No items in this session.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const held = item.quantity_issued - item.quantity_returned - item.quantity_consumed;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">{item.product_name ?? '—'}</p>
                      <code className="text-xs text-slate-400">{item.material_code}</code>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">₹{(item.mrp ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{item.quantity_issued}</td>
                    {!isOpen && (
                      <>
                        <td className="px-4 py-3 text-sm text-slate-700">{item.quantity_returned}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${(item.quantity_missing ?? 0) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                            {item.quantity_missing ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {(item.total_damage_fee ?? 0) > 0 ? `₹${(item.total_damage_fee ?? 0).toFixed(2)}` : '—'}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-sm text-slate-700">{item.quantity_consumed}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${held > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                        {held}
                      </span>
                    </td>
                    {isOpen && can('digital-bag:edit') && (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          disabled={removeMutation.isPending || item.quantity_consumed > 0}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={item.quantity_consumed > 0 ? 'Cannot remove: items already consumed' : 'Remove item'}
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Damage Fees Summary (closed sessions) */}
      {!isOpen && (session.total_damage_fees ?? 0) > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-medium text-rose-700">
            Total Damage Fees: ₹{(session.total_damage_fees ?? 0).toFixed(2)}
          </p>
          <p className="text-xs text-rose-500 mt-1">
            This amount has been deducted from the technician&apos;s payout.
          </p>
        </div>
      )}

      {/* Close Session Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Close Bag Session</h2>
              <button type="button" onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Review each item. Check the item, enter quantity returned, and set any damage fee per missing unit.
            </p>

            <div className="space-y-3 mb-6">
              {items.map((item) => {
                const ci = closeItems.get(item.id);
                if (!ci) return null;
                const maxReturn = item.quantity_issued - item.quantity_consumed;
                const missing = maxReturn - ci.quantity_returned;
                const itemDamage = missing > 0 ? missing * (ci.damage_fee_per_unit ?? 0) : 0;
                const isChecked = checkedItems.has(item.id);

                return (
                  <div key={item.id} className={`rounded-lg border p-4 ${isChecked ? 'border-green-300 bg-green-50/50' : 'border-slate-200'}`}>
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleCheck(item.id)}
                        className={`mt-0.5 shrink-0 rounded-md p-1 ${isChecked ? 'text-green-600' : 'text-slate-300'}`}
                      >
                        <CheckCircle2 size={20} />
                      </button>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-800">{item.product_name ?? '—'}</p>
                          <p className="text-xs text-slate-500">Issued: {item.quantity_issued} · Consumed: {item.quantity_consumed}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div>
                            <label className="text-xs text-slate-500">Returned</label>
                            <input
                              type="number"
                              min={0}
                              max={maxReturn}
                              value={ci.quantity_returned}
                              onChange={(e) => updateCloseItem(item.id, 'quantity_returned', Math.max(0, Math.min(maxReturn, parseInt(e.target.value) || 0)))}
                              className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </div>
                          {missing > 0 && (
                            <>
                              <div>
                                <label className="text-xs text-rose-500">Missing: {missing}</label>
                              </div>
                              <div>
                                <label className="text-xs text-slate-500">Damage Fee/Unit (₹)</label>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={ci.damage_fee_per_unit}
                                  onChange={(e) => updateCloseItem(item.id, 'damage_fee_per_unit', Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-500">Item Damage Total</label>
                                <p className="text-sm font-medium text-rose-600">₹{itemDamage.toFixed(2)}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">Items checked: {checkedItems.size}/{items.length}</p>
                <p className="text-sm font-semibold text-rose-700">Total Damage Fees: ₹{totalDamageFees.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                disabled={!allChecked || closeMutation.isPending}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {closeMutation.isPending ? 'Closing…' : 'Confirm Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
