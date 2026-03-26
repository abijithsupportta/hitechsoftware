'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth/useAuth';
import {
  useTechnicianEarnings,
  useConfirmAllEarnings,
  useMonthlyChart,
} from '@/hooks/commission/useCommission';
import { TechnicianEarningsTab } from '@/components/commission/TechnicianEarningsTab';

function formatMoney(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PayoutDetailsPage() {
  const params = useParams();
  const technicianId = params.technicianId as string;
  const { user, userRole } = useAuth();
  const canConfirm = userRole === 'office_staff' || userRole === 'super_admin';

  const now = new Date();
  const [selectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear] = useState(String(now.getFullYear()));

  const earningsQuery = useTechnicianEarnings({
    technician_id: technicianId,
    month: selectedMonth,
    year: selectedYear,
    page: 1,
    page_size: 100,
  });

  const chartQuery = useMonthlyChart(technicianId);
  const confirmAllMutation = useConfirmAllEarnings();

  const summary = earningsQuery.data?.summary;
  const chartData = chartQuery.data ?? [];
  const maxEarning = useMemo(() => {
    if (chartData.length === 0) return 1;
    return Math.max(...chartData.map((d) => d.net_earnings), 1);
  }, [chartData]);

  const handleConfirmAll = () => {
    if (!user?.id) return;
    confirmAllMutation.mutate(
      { technicianId, userId: user.id, month: selectedMonth, year: selectedYear },
      {
        onSuccess: (data) => {
          toast.success(`Confirmed ${data?.confirmed_count ?? 0} earnings`);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-lg font-bold text-white">
            {technicianId.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Payout Details</h1>
            <p className="text-sm text-slate-500">Technician ID: {technicianId.slice(0, 8)}...</p>
          </div>
        </div>
        {canConfirm && (summary?.pending_count ?? 0) > 0 && (
          <button
            type="button"
            disabled={confirmAllMutation.isPending}
            onClick={handleConfirmAll}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {confirmAllMutation.isPending ? 'Confirming...' : `Confirm All (${summary?.pending_count ?? 0})`}
          </button>
        )}
      </div>

      {/* Summary Strip */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Total Earned</p>
            <p className="mt-1 text-lg font-bold text-emerald-900">₹{formatMoney(summary.total_net_earnings)}</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Total Confirmed</p>
            <p className="mt-1 text-lg font-bold text-blue-900">₹{formatMoney(summary.total_net_earnings - (summary.pending_count > 0 ? summary.total_net_earnings * (summary.pending_count / Math.max(summary.total_services, 1)) : 0))}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Pending</p>
            <p className="mt-1 text-lg font-bold text-amber-900">{summary.pending_count}</p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-rose-600">Deductions</p>
            <p className="mt-1 text-lg font-bold text-rose-900">₹{formatMoney(summary.total_variance_deduction)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-600">Services</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{summary.total_services}</p>
          </div>
        </div>
      )}

      {/* Monthly Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Monthly Earnings (Last 6 Months)
          </h3>
          <div className="flex items-end gap-3 h-40">
            {chartData.map((d) => {
              const height = Math.max((d.net_earnings / maxEarning) * 100, 4);
              return (
                <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-slate-700">
                    ₹{d.net_earnings > 999 ? `${(d.net_earnings / 1000).toFixed(1)}k` : d.net_earnings.toFixed(0)}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 transition-all"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-slate-500">{d.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Earnings Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Earnings Breakdown
        </h3>
        <TechnicianEarningsTab technicianId={technicianId} userRole={userRole} />
      </div>
    </div>
  );
}
