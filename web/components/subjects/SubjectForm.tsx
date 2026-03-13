'use client';

import { useEffect, useMemo, useState } from 'react';
import { useBrands } from '@/hooks/useBrands';
import { useDealers } from '@/hooks/useDealers';
import { useServiceCategories } from '@/hooks/useServiceCategories';
import { useAssignableTechnicians } from '@/hooks/useSubjects';
import {
  SUBJECT_PRIORITY_OPTIONS,
  SUBJECT_SOURCE_OPTIONS,
  SUBJECT_TYPE_OF_SERVICE_OPTIONS,
} from '@/modules/subjects/subject.constants';
import type { SubjectFormValues, SubjectPriority, SubjectSourceType, SubjectTypeOfService } from '@/modules/subjects/subject.types';

interface SubjectFormProps {
  heading: string;
  description: string;
  initialValues: SubjectFormValues;
  submitLabel: string;
  submittingLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: SubjectFormValues) => Promise<void> | void;
  onCancel: () => void;
}

export default function SubjectForm({
  heading,
  description,
  initialValues,
  submitLabel,
  submittingLabel,
  isSubmitting,
  onSubmit,
  onCancel,
}: SubjectFormProps) {
  const brands = useBrands();
  const dealers = useDealers();
  const categories = useServiceCategories();
  const techniciansQuery = useAssignableTechnicians();
  const [values, setValues] = useState<SubjectFormValues>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const activeBrands = useMemo(() => brands.data.filter((item) => item.is_active), [brands.data]);
  const activeDealers = useMemo(() => dealers.data.filter((item) => item.is_active), [dealers.data]);
  const activeCategories = useMemo(() => categories.data.filter((item) => item.is_active), [categories.data]);
  const assignableTechnicians = techniciansQuery.data?.ok ? techniciansQuery.data.data : [];

  const submitDisabled =
    isSubmitting ||
    !values.subject_number.trim() ||
    !values.priority_reason.trim() ||
    !values.allocated_date ||
    !values.category_id ||
    (values.source_type === 'brand' ? !values.brand_id : !values.dealer_id);

  const setField = <K extends keyof SubjectFormValues>(field: K, value: SubjectFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(values);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{heading}</h1>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Subject Core</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Subject number</label>
              <input
                value={values.subject_number}
                onChange={(event) => setField('subject_number', event.target.value)}
                placeholder="SUB-2026-001"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Source type</label>
              <select
                value={values.source_type}
                onChange={(event) => {
                  const next = event.target.value as SubjectSourceType;
                  setValues((prev) => ({
                    ...prev,
                    source_type: next,
                    brand_id: next === 'brand' ? prev.brand_id : undefined,
                    dealer_id: next === 'dealer' ? prev.dealer_id : undefined,
                  }));
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {SUBJECT_SOURCE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {values.source_type === 'brand' ? (
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Brand</label>
                <select
                  value={values.brand_id ?? ''}
                  onChange={(event) => setField('brand_id', event.target.value || undefined)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select brand</option>
                  {activeBrands.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Dealer</label>
                <select
                  value={values.dealer_id ?? ''}
                  onChange={(event) => setField('dealer_id', event.target.value || undefined)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select dealer</option>
                  {activeDealers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Assign technician</label>
              <select
                value={values.assigned_technician_id ?? ''}
                onChange={(event) => setField('assigned_technician_id', event.target.value || undefined)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {assignableTechnicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.display_name} ({technician.technician_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Priority</label>
              <select
                value={values.priority}
                onChange={(event) => setField('priority', event.target.value as SubjectPriority)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {SUBJECT_PRIORITY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Allocated date</label>
              <input
                type="date"
                value={values.allocated_date}
                onChange={(event) => setField('allocated_date', event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Type of service</label>
              <select
                value={values.type_of_service}
                onChange={(event) => setField('type_of_service', event.target.value as SubjectTypeOfService)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {SUBJECT_TYPE_OF_SERVICE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Category</label>
              <select
                value={values.category_id}
                onChange={(event) => setField('category_id', event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select category</option>
                {activeCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Priority reason</label>
              <textarea
                value={values.priority_reason}
                onChange={(event) => setField('priority_reason', event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Customer Details</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Customer phone (optional)</label>
              <input
                value={values.customer_phone ?? ''}
                onChange={(event) => setField('customer_phone', event.target.value || undefined)}
                placeholder="9876543210"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Customer name (optional)</label>
              <input
                value={values.customer_name ?? ''}
                onChange={(event) => setField('customer_name', event.target.value || undefined)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Customer address (optional)</label>
              <textarea
                value={values.customer_address ?? ''}
                onChange={(event) => setField('customer_address', event.target.value || undefined)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Product Details</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Product Name</label>
              <input
                value={values.product_name ?? ''}
                onChange={(event) => setField('product_name', event.target.value || undefined)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Serial Number</label>
              <input
                value={values.serial_number ?? ''}
                onChange={(event) => setField('serial_number', event.target.value || undefined)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Product Description</label>
              <textarea
                value={values.product_description ?? ''}
                onChange={(event) => setField('product_description', event.target.value || undefined)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Purchase Date</label>
              <input
                type="date"
                value={values.purchase_date ?? ''}
                onChange={(event) => setField('purchase_date', event.target.value || undefined)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Warranty End Date</label>
              <input
                type="date"
                value={values.warranty_end_date ?? ''}
                onChange={(event) => setField('warranty_end_date', event.target.value || undefined)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">AMC End Date</label>
              <input
                type="date"
                value={values.amc_end_date ?? ''}
                onChange={(event) => setField('amc_end_date', event.target.value || undefined)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

          </div>
        </section>

        {brands.error || dealers.error || categories.error || (techniciansQuery.data && !techniciansQuery.data.ok ? techniciansQuery.data.error.message : null) ? (
          <p className="text-sm text-rose-600">{brands.error ?? dealers.error ?? categories.error ?? (techniciansQuery.data && !techniciansQuery.data.ok ? techniciansQuery.data.error.message : null)}</p>
        ) : null}

        <div className="flex items-center gap-2">
          <button type="submit" disabled={submitDisabled} className="ht-btn ht-btn-primary">
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
          <button type="button" onClick={onCancel} className="ht-btn ht-btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
