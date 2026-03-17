'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Activity, Calendar, Flag, UserCheck, UserMinus, UserPlus } from 'lucide-react';
import { DeleteConfirmModal } from '@/components/customers/DeleteConfirmModal';
import { ProtectedComponent } from '@/components/ui/ProtectedComponent';
import { useAssignableTechnicians, useSubjectDetail } from '@/hooks/useSubjects';
import { ROUTES } from '@/lib/constants/routes';
import { SUBJECT_QUERY_KEYS } from '@/modules/subjects/subject.constants';
import { assignSubjectToTechnician, removeSubject } from '@/modules/subjects/subject.service';
import type { SubjectTimelineItem } from '@/modules/subjects/subject.types';

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-GB');
}

function formatStatus(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateOnly(value: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('en-GB');
}

const EVENT_META: Record<string, { label: string; icon: React.ReactNode; iconBg: string; iconColor: string; borderColor: string }> = {
  status_change: {
    label: 'Status Change',
    icon: <Activity className="h-3.5 w-3.5" />,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    borderColor: 'border-violet-100',
  },
  assignment: {
    label: 'Technician Assigned',
    icon: <UserPlus className="h-3.5 w-3.5" />,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-100',
  },
  reassignment: {
    label: 'Technician Reassigned',
    icon: <UserCheck className="h-3.5 w-3.5" />,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-100',
  },
  unassignment: {
    label: 'Technician Removed',
    icon: <UserMinus className="h-3.5 w-3.5" />,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    borderColor: 'border-rose-100',
  },
  reschedule: {
    label: 'Rescheduled',
    icon: <Calendar className="h-3.5 w-3.5" />,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    borderColor: 'border-sky-100',
  },
  priority_change: {
    label: 'Priority Changed',
    icon: <Flag className="h-3.5 w-3.5" />,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    borderColor: 'border-orange-100',
  },
};

function TimelineEventDetail({ item }: { item: SubjectTimelineItem }) {
  const meta = EVENT_META[item.event_type] ?? EVENT_META.status_change;

  const renderContent = () => {
    switch (item.event_type) {
      case 'status_change':
        return (
          <p className="mt-0.5 text-[13px] text-slate-700">
            {item.old_value ? (
              <><span className="rounded bg-slate-200 px-1.5 py-0.5 font-medium text-slate-600">{formatStatus(item.old_value)}</span>
              <span className="mx-1.5 text-slate-400">&rarr;</span></>
            ) : null}
            <span className="rounded bg-violet-100 px-1.5 py-0.5 font-medium text-violet-700">{formatStatus(item.new_value ?? item.status)}</span>
          </p>
        );
      case 'assignment':
        return (
          <p className="mt-0.5 text-[13px] text-slate-700">
            Assigned to <span className="font-medium text-slate-900">{item.new_value ?? '-'}</span>
          </p>
        );
      case 'reassignment':
        return (
          <p className="mt-0.5 text-[13px] text-slate-700">
            <span className="font-medium text-slate-500">{item.old_value ?? '-'}</span>
            <span className="mx-1.5 text-slate-400">&rarr;</span>
            <span className="font-medium text-slate-900">{item.new_value ?? '-'}</span>
          </p>
        );
      case 'unassignment':
        return (
          <p className="mt-0.5 text-[13px] text-rose-700">
            Removed <span className="font-medium">{item.old_value ?? '-'}</span>
          </p>
        );
      case 'reschedule':
        return (
          <p className="mt-0.5 text-[13px] text-slate-700">
            {item.old_value ? (
              <><span className="rounded bg-slate-200 px-1.5 py-0.5 font-medium text-slate-600">{formatDateOnly(item.old_value)}</span>
              <span className="mx-1.5 text-slate-400">&rarr;</span></>
            ) : null}
            <span className="rounded bg-sky-100 px-1.5 py-0.5 font-medium text-sky-700">{formatDateOnly(item.new_value)}</span>
          </p>
        );
      case 'priority_change':
        return (
          <p className="mt-0.5 text-[13px] text-slate-700">
            {item.old_value ? (
              <><span className="rounded bg-slate-200 px-1.5 py-0.5 font-medium capitalize text-slate-600">{item.old_value}</span>
              <span className="mx-1.5 text-slate-400">&rarr;</span></>
            ) : null}
            <span className="rounded bg-orange-100 px-1.5 py-0.5 font-medium capitalize text-orange-700">{item.new_value ?? item.status}</span>
          </p>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex gap-3 rounded-lg border ${meta.borderColor} bg-white p-3`}>
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.iconBg} ${meta.iconColor}`}>
        {meta.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <span className="text-[13px] font-semibold text-slate-800">{meta.label}</span>
          <span className="text-[11px] text-slate-400">{formatDate(item.changed_at)}</span>
        </div>
        {renderContent()}
        {item.note ? <p className="mt-1 text-[12px] italic text-slate-500">{item.note}</p> : null}
      </div>
    </div>
  );
}

export default function SubjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');

  const query = useSubjectDetail(id);
  const techniciansQuery = useAssignableTechnicians();

  const deleteSubjectMutation = useMutation({
    mutationFn: (subjectId: string) => removeSubject(subjectId),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('Subject deleted successfully');
        queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.all });
        router.push(ROUTES.DASHBOARD_SUBJECTS);
      } else {
        toast.error(result.error.message);
      }
    },
    onError: () => {
      toast.error('Failed to delete subject');
    },
  });

  const assignTechnicianMutation = useMutation({
    mutationFn: ({ subjectId, technicianId }: { subjectId: string; technicianId?: string }) =>
      assignSubjectToTechnician(subjectId, technicianId),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success('Technician assignment updated');
        queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.all });
        queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.detail(id) });
      } else {
        toast.error(result.error.message);
      }
    },
    onError: () => {
      toast.error('Failed to update technician assignment');
    },
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
          <div className="h-7 w-56 rounded bg-slate-200" />
          <div className="mt-2 h-4 w-80 rounded bg-slate-100" />
          <div className="mt-3 flex gap-2">
            <div className="h-6 w-28 rounded-full bg-slate-200" />
            <div className="h-6 w-24 rounded-full bg-slate-200" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`subject-summary-skeleton-${index}`} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
              <div className="h-3 w-20 rounded bg-slate-100" />
              <div className="mt-2 h-4 w-28 rounded bg-slate-200" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
            <div className="mb-4 h-5 w-40 rounded bg-slate-200" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={`service-info-skeleton-${index}`} className="h-4 rounded bg-slate-100" />
              ))}
            </div>
          </section>

          <section className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 h-5 w-32 rounded bg-slate-200" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`status-info-skeleton-${index}`} className="h-4 rounded bg-slate-100" />
              ))}
            </div>
          </section>

          <section className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
            <div className="mb-4 h-5 w-36 rounded bg-slate-200" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`product-info-skeleton-${index}`} className="h-4 rounded bg-slate-100" />
              ))}
            </div>
          </section>

          <section className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 h-5 w-28 rounded bg-slate-200" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`timeline-skeleton-${index}`} className="h-16 rounded-lg bg-slate-100" />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!query.data?.ok) {
    const message = query.data && !query.data.ok ? query.data.error.message : 'Failed to load subject';

    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{message}</div>
      </div>
    );
  }

  const subject = query.data.data;
  const technicianOptions = techniciansQuery.data?.ok ? techniciansQuery.data.data : [];

  useEffect(() => {
    setSelectedTechnicianId(subject.assigned_technician_id ?? '');
  }, [subject.assigned_technician_id]);

  const coverageMeta = subject.is_amc_service
    ? { label: 'Free Service - Under AMC', className: 'bg-emerald-100 text-emerald-700' }
    : subject.is_warranty_service
      ? { label: 'Under Warranty', className: 'bg-blue-100 text-blue-700' }
      : { label: 'Out of Warranty', className: 'bg-slate-100 text-slate-700' };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subject {subject.subject_number}</h1>
          <p className="mt-1 text-sm text-slate-600">Easy service summary with billing and warranty clarity.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${coverageMeta.className}`}>
              {coverageMeta.label}
            </span>
            <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
              {formatStatus(subject.status)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ProtectedComponent permission="subject:update">
            <Link href={ROUTES.DASHBOARD_SUBJECTS_EDIT(subject.id)} className="ht-btn ht-btn-primary">
              Edit
            </Link>
          </ProtectedComponent>
          <ProtectedComponent permission="subject:delete">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="ht-btn ht-btn-danger"
            >
              Delete
            </button>
          </ProtectedComponent>
          <Link href={ROUTES.DASHBOARD_SUBJECTS} className="ht-btn ht-btn-secondary">
            Back to list
          </Link>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Charge To</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{subject.service_charge_type === 'brand_dealer' ? 'Brand / Dealer' : 'Customer'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Billing Status</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{formatStatus(subject.billing_status)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Assigned Technician</p>
          <ProtectedComponent permission="subject:update">
            <div className="mt-2 space-y-2">
              <select
                value={selectedTechnicianId}
                onChange={(event) => setSelectedTechnicianId(event.target.value)}
                disabled={assignTechnicianMutation.isPending || techniciansQuery.isLoading}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Unassigned</option>
                {technicianOptions.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.display_name} ({technician.technician_code})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  assignTechnicianMutation.mutate({
                    subjectId: subject.id,
                    technicianId: selectedTechnicianId || undefined,
                  })
                }
                disabled={
                  assignTechnicianMutation.isPending ||
                  techniciansQuery.isLoading ||
                  selectedTechnicianId === (subject.assigned_technician_id ?? '')
                }
                className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assignTechnicianMutation.isPending ? 'Updating...' : 'Update Assignment'}
              </button>
            </div>
          </ProtectedComponent>

          <ProtectedComponent permission="subject:update" fallback={
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {subject.assigned_technician_name ? subject.assigned_technician_name : 'Unassigned'}
            </p>
          }>
            <p className="mt-1 text-xs text-slate-500">
              {subject.assigned_technician_name
                ? `Current: ${subject.assigned_technician_name}`
                : 'No technician assigned'}
            </p>
          </ProtectedComponent>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Allocated Date</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateOnly(subject.allocated_date)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Service Information</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <p className="text-sm text-slate-700"><span className="font-medium text-slate-900">Source:</span> {subject.source_name}</p>
            <p className="text-sm text-slate-700"><span className="font-medium text-slate-900">Source Type:</span> {subject.source_type}</p>
            <p className="text-sm text-slate-700"><span className="font-medium text-slate-900">Category:</span> {subject.category_name ?? '-'}</p>
            <p className="text-sm text-slate-700"><span className="font-medium text-slate-900">Type:</span> {subject.type_of_service}</p>
            <p className="text-sm text-slate-700"><span className="font-medium text-slate-900">Priority:</span> {subject.priority}</p>
            <p className="text-sm text-slate-700"><span className="font-medium text-slate-900">Phone:</span> {subject.customer_phone ?? '-'}</p>
            <p className="text-sm text-slate-700 md:col-span-2"><span className="font-medium text-slate-900">Customer Name:</span> {subject.customer_name ?? '-'}</p>
            <p className="text-sm text-slate-700 md:col-span-2"><span className="font-medium text-slate-900">Customer Address:</span> {subject.customer_address ?? '-'}</p>
            <p className="text-sm text-slate-700 md:col-span-2"><span className="font-medium text-slate-900">Priority Reason:</span> {subject.priority_reason}</p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Coverage Dates</h2>
          <div className="space-y-2">
            <p className="text-sm text-slate-700"><span className="font-medium text-slate-900">Purchase Date:</span> {formatDateOnly(subject.purchase_date)}</p>
            <p className="text-sm text-slate-700"><span className="font-medium text-slate-900">Warranty End Date:</span> {formatDateOnly(subject.warranty_end_date)}</p>
            <p className="text-sm text-slate-700"><span className="font-medium text-slate-900">AMC End Date:</span> {formatDateOnly(subject.amc_end_date)}</p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Product Information</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <p className="text-sm text-slate-700"><span className="font-medium text-slate-900">Product Name:</span> {subject.product_name ?? '-'}</p>
            <p className="text-sm text-slate-700"><span className="font-medium text-slate-900">Serial Number:</span> {subject.serial_number ?? '-'}</p>
            <p className="text-sm text-slate-700 md:col-span-2"><span className="font-medium text-slate-900">Product Description:</span> {subject.product_description ?? '-'}</p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Activity Timeline</h2>
          {subject.timeline.length === 0 ? (
            <p className="text-sm text-slate-500">No activity recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {subject.timeline.map((item) => (
                <TimelineEventDetail key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        title="Delete subject"
        description={`Delete ${subject.subject_number}? This action permanently removes the subject.`}
        confirmLabel="Delete permanently"
        isSubmitting={deleteSubjectMutation.isPending}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          deleteSubjectMutation.mutate(subject.id);
        }}
      />
    </div>
  );
}
