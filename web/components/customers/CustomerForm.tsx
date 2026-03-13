'use client';

import Link from 'next/link';
import { useEffect, useMemo, useReducer } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, MapPinned, Phone, Plus, UserRound } from 'lucide-react';
import { KOTTAYAM_AREAS, SECONDARY_ADDRESS_LABEL_OPTIONS } from '@/modules/customers/customer.constants';
import { createCustomerSchema } from '@/modules/customers/customer.validation';
import type { CreateCustomerInput, Customer } from '@/modules/customers/customer.types';

interface CustomerFormProps {
  initialValues?: Partial<Customer>;
  submitLabel: string;
  isSubmitting?: boolean;
  onSubmit: (values: CreateCustomerInput) => void | Promise<void>;
}

const defaultValues: CreateCustomerInput = {
  customer_name: '',
  phone_number: '',
  email: '',
  is_active: true,
  primary_address_line1: '',
  primary_address_line2: '',
  primary_area: '',
  primary_city: 'Kottayam',
  primary_postal_code: '',
  secondary_address_label: '',
  secondary_address_line1: '',
  secondary_address_line2: '',
  secondary_area: '',
  secondary_city: '',
  secondary_postal_code: '',
};

export function CustomerForm({ initialValues, submitLabel, isSubmitting = false, onSubmit }: CustomerFormProps) {
  // react-hook-form relies on ref-based state mutation which is incompatible
  // with the React Compiler's memoisation. Opt this component out explicitly.
  'use no memo';

  const resolvedDefaults = useMemo<CreateCustomerInput>(() => {
    if (!initialValues) {
      return defaultValues;
    }

    return {
      customer_name: initialValues.customer_name ?? '',
      phone_number: initialValues.phone_number ?? '',
      email: initialValues.email ?? '',
      is_active: initialValues.is_active ?? true,
      primary_address_line1: initialValues.primary_address_line1 ?? '',
      primary_address_line2: initialValues.primary_address_line2 ?? '',
      primary_area: initialValues.primary_area ?? '',
      primary_city: initialValues.primary_city ?? 'Kottayam',
      primary_postal_code: initialValues.primary_postal_code ?? '',
      secondary_address_label: initialValues.secondary_address_label ?? '',
      secondary_address_line1: initialValues.secondary_address_line1 ?? '',
      secondary_address_line2: initialValues.secondary_address_line2 ?? '',
      secondary_area: initialValues.secondary_area ?? '',
      secondary_city: initialValues.secondary_city ?? '',
      secondary_postal_code: initialValues.secondary_postal_code ?? '',
    };
  }, [initialValues]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: resolvedDefaults,
  });

  const hasSecondaryAddressByDefault = Boolean(
    resolvedDefaults.secondary_address_label ||
      resolvedDefaults.secondary_address_line1 ||
      resolvedDefaults.secondary_area ||
      resolvedDefaults.secondary_city ||
      resolvedDefaults.secondary_postal_code,
  );

  const [hasSecondaryAddress, dispatchSecondaryAddress] = useReducer(
    (state: boolean, action: { type: 'toggle' } | { type: 'reset'; value: boolean }) => {
      if (action.type === 'toggle') {
        return !state;
      }

      return action.value;
    },
    hasSecondaryAddressByDefault,
  );

  useEffect(() => {
    reset(resolvedDefaults);
    dispatchSecondaryAddress({ type: 'reset', value: hasSecondaryAddressByDefault });
  }, [reset, resolvedDefaults, hasSecondaryAddressByDefault]);

  useEffect(() => {
    if (!hasSecondaryAddress) {
      setValue('secondary_address_label', '');
      setValue('secondary_address_line1', '');
      setValue('secondary_address_line2', '');
      setValue('secondary_area', '');
      setValue('secondary_city', '');
      setValue('secondary_postal_code', '');
    }
  }, [hasSecondaryAddress, setValue]);

  const showErrorSummary = isSubmitted && Object.keys(errors).length > 0;

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-blue-50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Customer intake</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Save customer details in one pass</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Capture the main contact and address first. Add a secondary location only when it is genuinely used for service visits.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white/90 px-4 py-3 text-sm text-slate-600 shadow-sm">
            <p className="font-medium text-slate-900">What this form saves</p>
            <p className="mt-1">Name, phone, status, and synced address fields for both the new and legacy customer schema.</p>
          </div>
        </div>
      </div>

      {showErrorSummary ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Review the highlighted fields before saving this customer.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                <UserRound size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-950">Contact details</h3>
                <p className="mt-1 text-sm text-slate-600">Use the customer’s primary mobile number. It is checked for duplicates.</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Customer name</label>
                <input
                  {...register('customer_name')}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  placeholder="Enter customer name"
                />
                {errors.customer_name ? <p className="mt-1.5 text-xs text-rose-600">{errors.customer_name.message}</p> : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone number</label>
                <input
                  {...register('phone_number')}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  placeholder="+91 9876543210"
                />
                <p className="mt-1.5 text-xs text-slate-500">Indian mobile format only.</p>
                {errors.phone_number ? <p className="mt-1.5 text-xs text-rose-600">{errors.phone_number.message}</p> : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <input
                  {...register('email')}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  placeholder="customer@email.com"
                />
                <p className="mt-1.5 text-xs text-slate-500">Optional, but useful for service communication.</p>
                {errors.email ? <p className="mt-1.5 text-xs text-rose-600">{errors.email.message}</p> : null}
              </div>

              <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 md:col-span-2">
                <input id="is_active" type="checkbox" {...register('is_active')} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                <span>
                  <span className="block font-medium text-slate-900">Active customer</span>
                  <span className="block text-xs text-slate-500">Inactive customers stay in records but are excluded from active operations.</span>
                </span>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                <MapPinned size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-950">Primary service address</h3>
                <p className="mt-1 text-sm text-slate-600">This is the default location for tickets, visits, and customer history.</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Address line 1</label>
                <input
                  {...register('primary_address_line1')}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  placeholder="House / Building / Street"
                />
                {errors.primary_address_line1 ? <p className="mt-1.5 text-xs text-rose-600">{errors.primary_address_line1.message}</p> : null}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Address line 2</label>
                <input
                  {...register('primary_address_line2')}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  placeholder="Landmark / Nearby"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Area</label>
                <select
                  {...register('primary_area')}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">Select area</option>
                  {KOTTAYAM_AREAS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
                {errors.primary_area ? <p className="mt-1.5 text-xs text-rose-600">{errors.primary_area.message}</p> : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">City</label>
                <input
                  {...register('primary_city')}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
                {errors.primary_city ? <p className="mt-1.5 text-xs text-rose-600">{errors.primary_city.message}</p> : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Postal code</label>
                <input
                  {...register('primary_postal_code')}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  placeholder="686001"
                />
                {errors.primary_postal_code ? <p className="mt-1.5 text-xs text-rose-600">{errors.primary_postal_code.message}</p> : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-950">Secondary address</h3>
                  <p className="mt-1 text-sm text-slate-600">Use this only if service visits may happen at a second location.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => dispatchSecondaryAddress({ type: 'toggle' })}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Plus size={16} />
                {hasSecondaryAddress ? 'Remove secondary address' : 'Add secondary address'}
              </button>
            </div>

            {hasSecondaryAddress ? (
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Label</label>
                  <select
                    {...register('secondary_address_label')}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">Select label</option>
                    {SECONDARY_ADDRESS_LABEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.secondary_address_label ? <p className="mt-1.5 text-xs text-rose-600">{errors.secondary_address_label.message}</p> : null}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">
                  Once enabled, label, address, area, city, and postal code all become required.
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Address line 1</label>
                  <input
                    {...register('secondary_address_line1')}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="House / Building / Street"
                  />
                  {errors.secondary_address_line1 ? <p className="mt-1.5 text-xs text-rose-600">{errors.secondary_address_line1.message}</p> : null}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Address line 2</label>
                  <input
                    {...register('secondary_address_line2')}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="Landmark / Nearby"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Area</label>
                  <select
                    {...register('secondary_area')}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">Select area</option>
                    {KOTTAYAM_AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                  {errors.secondary_area ? <p className="mt-1.5 text-xs text-rose-600">{errors.secondary_area.message}</p> : null}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">City</label>
                  <input
                    {...register('secondary_city')}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                  {errors.secondary_city ? <p className="mt-1.5 text-xs text-rose-600">{errors.secondary_city.message}</p> : null}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Postal code</label>
                  <input
                    {...register('secondary_postal_code')}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="686001"
                  />
                  {errors.secondary_postal_code ? <p className="mt-1.5 text-xs text-rose-600">{errors.secondary_postal_code.message}</p> : null}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                No secondary address will be stored unless you explicitly add one.
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <Phone size={16} />
              <h3 className="text-sm font-semibold">Operator checklist</h3>
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              <li>Confirm the primary phone number with the customer.</li>
              <li>Select the actual service area to keep routing accurate.</li>
              <li>Add a secondary address only if technicians may visit it.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Navigation</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Need to return without saving? You can go back to the customer list at any time.</p>
            <Link
              href="/dashboard/customers"
              className="mt-4 inline-flex items-center text-sm font-medium text-blue-700 transition hover:text-blue-800"
            >
              Back to customers
            </Link>
          </div>
        </aside>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/dashboard/customers"
          className="ht-btn ht-btn-secondary"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="ht-btn ht-btn-primary"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
