'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CustomerStatusBadge } from '@/components/customers/CustomerStatusBadge';
import { useCustomer } from '../../../../hooks/useCustomers';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = params?.id;
  const { customer, isLoading, error } = useCustomer(customerId);

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-600">Loading customer...</div>;
  }

  if (!customer) {
    return <div className="p-6 text-sm text-rose-600">{error ?? 'Customer not found.'}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{customer.customer_name}</h1>
          <p className="mt-1 text-sm text-slate-600">Customer detail record</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/customers"
            className="ht-btn ht-btn-secondary"
          >
            Back
          </Link>
          <Link
            href={`/dashboard/customers/${customer.id}/edit`}
            className="ht-btn ht-btn-primary"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Primary details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Phone</dt><dd>{customer.phone_number}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Email</dt><dd>{customer.email ?? '-'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Area</dt><dd>{customer.primary_area}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">City</dt><dd>{customer.primary_city}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Postal code</dt><dd>{customer.primary_postal_code}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Status</dt><dd><CustomerStatusBadge isActive={customer.is_active} /></dd></div>
          </dl>
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            {customer.primary_address_line1}
            {customer.primary_address_line2 ? `, ${customer.primary_address_line2}` : ''}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Secondary details</h2>
          {customer.secondary_address_label ? (
            <>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Label</dt><dd>{customer.secondary_address_label}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Area</dt><dd>{customer.secondary_area}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">City</dt><dd>{customer.secondary_city}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Postal code</dt><dd>{customer.secondary_postal_code}</dd></div>
              </dl>
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {customer.secondary_address_line1}
                {customer.secondary_address_line2 ? `, ${customer.secondary_address_line2}` : ''}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-600">No secondary address saved.</p>
          )}
        </div>
      </div>
    </div>
  );
}
