'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useCoupons, useCreateCoupon } from '@/hooks/coupons/useCoupons';

export function CouponsDashboard() {
  const [discountAmount, setDiscountAmount] = useState(0);
  const [expiresAfter, setExpiresAfter] = useState<'bill_creation' | 'service_completion'>('bill_creation');
  const couponsQuery = useCoupons();
  const createCouponMutation = useCreateCoupon();

  const createCoupon = () => {
    createCouponMutation.mutate(
      { discount_amount: discountAmount, expires_after: expiresAfter },
      {
        onSuccess: (data) => {
          toast.success(`Coupon generated: ${String(data.coupon_code)}`);
          setDiscountAmount(0);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  return (
    <div className="space-y-4 p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Create Coupon</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            type="number"
            min={1}
            value={discountAmount}
            onChange={(event) => setDiscountAmount(Math.max(0, Number(event.target.value || 0)))}
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Discount amount"
          />
          <select
            value={expiresAfter}
            onChange={(event) => setExpiresAfter(event.target.value as 'bill_creation' | 'service_completion')}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="bill_creation">Expires on bill creation</option>
            <option value="service_completion">Expires on service completion</option>
          </select>
          <button
            type="button"
            onClick={createCoupon}
            disabled={createCouponMutation.isPending || discountAmount <= 0}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            {createCouponMutation.isPending ? 'Creating...' : 'Create Coupon'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Coupons</h2>
        {couponsQuery.isLoading ? <p className="mt-2 text-sm text-slate-500">Loading coupons...</p> : null}
        {couponsQuery.isError ? <p className="mt-2 text-sm text-rose-600">{couponsQuery.error.message}</p> : null}
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Discount</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Subject</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(couponsQuery.data ?? []).map((coupon) => (
                <tr key={String(coupon.id)}>
                  <td className="px-3 py-2 font-semibold">{String(coupon.coupon_code)}</td>
                  <td className="px-3 py-2">INR {Number(coupon.discount_amount ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-2">{String(coupon.status)}</td>
                  <td className="px-3 py-2">{String(coupon.used_on_subject_id ?? '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
