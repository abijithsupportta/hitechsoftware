'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserCheck, UserRoundPlus, ClipboardList } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSmartSubjectLookup, useSubjects } from '@/hooks/useSubjects';
import { SUBJECT_JOB_TYPE_OPTIONS, SUBJECT_PRIORITY_OPTIONS } from '@/modules/subjects/subject.constants';
import { ROUTES } from '@/lib/constants/routes';
import type { SubjectJobType, SubjectPriority } from '@/modules/subjects/subject.types';

const DEFAULT_NEW_CUSTOMER = {
  customer_name: '',
  email: '',
  primary_address_line1: '',
  primary_address_line2: '',
  primary_area: '',
  primary_city: 'Kottayam',
  primary_postal_code: '',
};

export default function NewSubjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { createSubjectMutation } = useSubjects();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [subjectNumber, setSubjectNumber] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<SubjectPriority>('MEDIUM');
  const [jobType, setJobType] = useState<SubjectJobType>('OUT_OF_WARRANTY');
  const [scheduleDate, setScheduleDate] = useState('');
  const [assignedTechnicianId, setAssignedTechnicianId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [complaintDetails, setComplaintDetails] = useState('');
  const [newCustomer, setNewCustomer] = useState(DEFAULT_NEW_CUSTOMER);

  const { phoneLookup, phoneLookupError, isPhoneLookupLoading, technicians, products } = useSmartSubjectLookup(phoneNumber);

  const previousProducts = phoneLookup?.previous_products ?? [];
  const serviceHistory = phoneLookup?.service_history ?? [];
  const existingCustomer = phoneLookup?.customer ?? null;
  const isExistingCustomer = Boolean(existingCustomer);

  const mergedProductOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();

    for (const item of previousProducts) {
      if (!item.product_id) {
        continue;
      }
      map.set(
        item.product_id,
        {
          id: item.product_id,
          label: [item.brand_name, item.product_name, item.model_number].filter(Boolean).join(' '),
        },
      );
    }

    for (const item of products) {
      if (!map.has(item.id)) {
        map.set(item.id, {
          id: item.id,
          label: [item.brand_name, item.product_name, item.model_number].filter(Boolean).join(' '),
        });
      }
    }

    return Array.from(map.values());
  }, [previousProducts, products]);

  const submitDisabled =
    createSubjectMutation.isPending ||
    !user?.id ||
    !phoneNumber.trim() ||
    !subjectNumber.trim() ||
    !description.trim() ||
    !assignedTechnicianId ||
    (!isExistingCustomer && (!newCustomer.customer_name.trim() || !newCustomer.primary_address_line1.trim() || !newCustomer.primary_area.trim() || !newCustomer.primary_city.trim() || !newCustomer.primary_postal_code.trim()));

  const handleCreateTicket = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.id) {
      return;
    }

    const result = await createSubjectMutation.mutateAsync({
      subject_number: subjectNumber,
      phone_number: phoneNumber,
      customer_id: existingCustomer?.id,
      new_customer: existingCustomer
        ? undefined
        : {
            customer_name: newCustomer.customer_name,
            email: newCustomer.email,
            primary_address_line1: newCustomer.primary_address_line1,
            primary_address_line2: newCustomer.primary_address_line2,
            primary_area: newCustomer.primary_area,
            primary_city: newCustomer.primary_city,
            primary_postal_code: newCustomer.primary_postal_code,
          },
      product_id: selectedProductId || undefined,
      assigned_technician_id: assignedTechnicianId,
      job_type: jobType,
      description,
      priority,
      complaint_details: complaintDetails,
      serial_number: serialNumber,
      schedule_date: scheduleDate,
      created_by: user.id,
    });

    if (result.ok) {
      router.push(ROUTES.DASHBOARD_SUBJECTS);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Smart Subject Creation</h1>
        <p className="mt-1 text-sm text-slate-600">Enter phone number first. Customer and history are auto-loaded.</p>
      </div>

      <form onSubmit={handleCreateTicket} className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Search size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Step 1: Phone Lookup</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Phone number</label>
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="9876543210"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">CRM Ticket ID</label>
              <input
                value={subjectNumber}
                onChange={(event) => setSubjectNumber(event.target.value)}
                placeholder="CRM-2026-000123"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {isPhoneLookupLoading ? <p className="mt-3 text-sm text-slate-500">Checking customer...</p> : null}
          {!isPhoneLookupLoading && phoneLookupError ? <p className="mt-3 text-sm text-rose-600">{phoneLookupError}</p> : null}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            {isExistingCustomer ? <UserCheck size={18} className="text-emerald-600" /> : <UserRoundPlus size={18} className="text-amber-600" />}
            <h2 className="text-base font-semibold text-slate-900">Step 2: Customer</h2>
          </div>

          {isExistingCustomer ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
              <p className="font-semibold text-emerald-800">Customer Found</p>
              <p className="mt-2 text-emerald-900">{existingCustomer?.customer_name}</p>
              <p className="text-emerald-900">{existingCustomer?.phone_number}</p>
              <p className="text-emerald-900">
                {[existingCustomer?.primary_address_line1, existingCustomer?.primary_address_line2, existingCustomer?.primary_area, existingCustomer?.primary_city, existingCustomer?.primary_postal_code]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Customer name</label>
                <input
                  value={newCustomer.customer_name}
                  onChange={(event) => setNewCustomer((prev) => ({ ...prev, customer_name: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Email (optional)</label>
                <input
                  value={newCustomer.email}
                  onChange={(event) => setNewCustomer((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Address line 1</label>
                <input
                  value={newCustomer.primary_address_line1}
                  onChange={(event) => setNewCustomer((prev) => ({ ...prev, primary_address_line1: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Address line 2 (optional)</label>
                <input
                  value={newCustomer.primary_address_line2}
                  onChange={(event) => setNewCustomer((prev) => ({ ...prev, primary_address_line2: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Area</label>
                <input
                  value={newCustomer.primary_area}
                  onChange={(event) => setNewCustomer((prev) => ({ ...prev, primary_area: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">City</label>
                <input
                  value={newCustomer.primary_city}
                  onChange={(event) => setNewCustomer((prev) => ({ ...prev, primary_city: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Postal code</label>
                <input
                  value={newCustomer.primary_postal_code}
                  onChange={(event) => setNewCustomer((prev) => ({ ...prev, primary_postal_code: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Step 3: Ticket Details</h2>
          </div>

          {previousProducts.length > 0 ? (
            <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Previous products</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {previousProducts.map((item) => {
                  const id = `${item.product_id ?? 'unknown'}:${item.serial_number ?? ''}`;
                  const label = [item.brand_name, item.product_name, item.model_number, item.serial_number ? `SN:${item.serial_number}` : null]
                    .filter(Boolean)
                    .join(' | ');

                  return (
                    <button
                      type="button"
                      key={id}
                      onClick={() => {
                        if (item.product_id) {
                          setSelectedProductId(item.product_id);
                        }
                        setSerialNumber(item.serial_number ?? '');
                      }}
                      className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Product</label>
              <select
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select product (optional)</option>
                {mergedProductOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Serial number (optional)</label>
              <input
                value={serialNumber}
                onChange={(event) => setSerialNumber(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Priority</label>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as SubjectPriority)}
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
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Job type</label>
              <select
                value={jobType}
                onChange={(event) => setJobType(event.target.value as SubjectJobType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {SUBJECT_JOB_TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Visit date</label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(event) => setScheduleDate(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Assign technician</label>
              <select
                value={assignedTechnicianId}
                onChange={(event) => setAssignedTechnicianId(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select technician</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.display_name} ({technician.technician_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Problem description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Additional notes (optional)</label>
              <textarea
                value={complaintDetails}
                onChange={(event) => setComplaintDetails(event.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {serviceHistory.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Previous Services</h2>
            <div className="space-y-2">
              {serviceHistory.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                  <p className="font-medium text-slate-900">{item.subject_number} • {item.status}</p>
                  <p className="text-slate-700">{item.description}</p>
                  <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString()} {item.product_display ? `• ${item.product_display}` : ''}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitDisabled}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createSubjectMutation.isPending ? 'Creating ticket...' : 'Create ticket'}
          </button>
          <button
            type="button"
            onClick={() => router.push(ROUTES.DASHBOARD_SUBJECTS)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
