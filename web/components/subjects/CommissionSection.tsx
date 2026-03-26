'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useSubjectCommission, useSetCommission } from '@/hooks/commission/useCommission';
import type { SubjectDetail } from '@/modules/subjects/subject.types';

interface Props {
  subject: SubjectDetail;
  userRole: string | null;
  userId: string | null;
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CommissionSection({ subject, userRole, userId }: Props) {
  const commissionQuery = useSubjectCommission(subject.id);
  const setCommissionMutation = useSetCommission();

  const canEdit = userRole === 'office_staff' || userRole === 'super_admin';
  const technicianId = subject.assigned_technician_id;
  const technicianName = subject.assigned_technician_name ?? 'Unassigned';

  const commission = commissionQuery.data?.commission;
  const earnings = commissionQuery.data?.earnings;

  const [serviceCommission, setServiceCommission] = useState(0);
  const [partsCommission, setPartsCommission] = useState(0);
  const [extraPriceCommission, setExtraPriceCommission] = useState(0);
  const [notes, setNotes] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (commissionQuery.data && !initialized) {
    setServiceCommission(commission?.service_commission ?? 0);
    setPartsCommission(commission?.parts_commission ?? 0);
    setExtraPriceCommission(commission?.extra_price_commission ?? 0);
    setNotes(commission?.commission_notes ?? '');
    setInitialized(true);
  }

  if (!subject.bill_generated || !technicianId) {
    return null;
  }

  const handleSave = () => {
    if (!userId || !technicianId) return;

    setCommissionMutation.mutate(
      {
        input: {
          technician_id: technicianId,
          subject_id: subject.id,
          service_commission: serviceCommission,
          parts_commission: partsCommission,
          extra_price_commission: extraPriceCommission,
          commission_notes: notes || undefined,
        },
        userId,
      },
      {
        onSuccess: () => {
          toast.success('Commission saved successfully');
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  const extraCollected = earnings?.extra_price_collected ?? 0;
  const varianceDeduction = earnings?.variance_deduction ?? 0;
  const netEarnings = earnings?.net_earnings ?? 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Technician Commission
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Technician: <strong className="text-slate-700">{technicianName}</strong> — Job: <strong className="text-slate-700">{subject.subject_number}</strong>
        </p>
      </div>

      {commissionQuery.isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-48 rounded bg-slate-200" />
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="h-4 w-40 rounded bg-slate-200" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Auto-Calculated Section */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
              Auto-Calculated (read only)
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-900">Extra Price Collected</span>
              <span className="text-sm font-semibold text-blue-900">₹{formatMoney(extraCollected)}</span>
            </div>
            <p className="mt-1 text-xs text-blue-600">
              Charged above MRP across all products on this job
            </p>
          </div>

          {/* Commission Inputs */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Commission (set by staff)
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm text-slate-700">Service Commission</label>
                {canEdit ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-slate-500">₹</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={serviceCommission}
                      onChange={(e) => setServiceCommission(Math.max(0, Number(e.target.value || 0)))}
                      className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-right text-sm"
                    />
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-slate-900">₹{formatMoney(serviceCommission)}</span>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="text-sm text-slate-700">Parts Sales Commission</label>
                {canEdit ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-slate-500">₹</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={partsCommission}
                      onChange={(e) => setPartsCommission(Math.max(0, Number(e.target.value || 0)))}
                      className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-right text-sm"
                    />
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-slate-900">₹{formatMoney(partsCommission)}</span>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="text-sm text-slate-700">Extra Price Commission</label>
                {canEdit ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-slate-500">₹</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={extraPriceCommission}
                      onChange={(e) => setExtraPriceCommission(Math.max(0, Number(e.target.value || 0)))}
                      className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-right text-sm"
                    />
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-slate-900">₹{formatMoney(extraPriceCommission)}</span>
                )}
              </div>

              {canEdit && (
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Why these commission amounts..."
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              )}

              {!canEdit && notes && (
                <p className="text-xs text-slate-500 italic">Notes: {notes}</p>
              )}
            </div>
          </div>

          {/* Deductions */}
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700">
              Deductions (auto)
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-rose-900">Variance Deduction</span>
              <span className="text-sm font-semibold text-rose-900">-₹{formatMoney(varianceDeduction)}</span>
            </div>
          </div>

          {/* Net Earnings */}
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-emerald-900">NET EARNINGS</span>
              <span className="text-lg font-bold text-emerald-900">₹{formatMoney(netEarnings)}</span>
            </div>
            {earnings?.earnings_status === 'confirmed' && (
              <p className="mt-1 text-xs text-emerald-600">Confirmed</p>
            )}
            {earnings?.earnings_status === 'pending' && (
              <p className="mt-1 text-xs text-amber-600">Pending Confirmation</p>
            )}
          </div>

          {/* Save Button */}
          {canEdit && (
            <button
              type="button"
              disabled={setCommissionMutation.isPending}
              onClick={handleSave}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {setCommissionMutation.isPending ? 'Saving...' : 'Save Commission'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
