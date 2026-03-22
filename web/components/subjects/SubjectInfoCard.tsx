// ─────────────────────────────────────────────────────────────────────────────
// SubjectInfoCard.tsx
//
// Read-only card showing service meta: source, category, priority, type,
// customer contact. Used in the Subject Detail page main column.
// All data is derived from the already-loaded SubjectDetail object —
// no additional fetching happens inside this component.
// ─────────────────────────────────────────────────────────────────────────────
'use client';

import type { SubjectDetail } from '@/modules/subjects/subject.types';
import { SubjectPriorityBadge } from './SubjectPriorityBadge';

interface SubjectInfoCardProps {
  subject: SubjectDetail;
}

export function SubjectInfoCard({ subject }: SubjectInfoCardProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
      <h2 className="mb-4 text-base font-semibold text-slate-900">Service Information</h2>
      <div className="flex gap-0 divide-x divide-gray-100">
        <div className="flex flex-1 flex-col divide-y divide-gray-100 pr-5">
          <div className="pb-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Source</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800">{subject.source_name}</p>
          </div>
          <div className="py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Category</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800">{subject.category_name ?? '-'}</p>
          </div>
          <div className="py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Priority</p>
            <div className="mt-1">
              <SubjectPriorityBadge priority={subject.priority} />
            </div>
          </div>
          <div className="pt-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Customer Phone</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800">{subject.customer_phone ?? '-'}</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col divide-y divide-gray-100 pl-5">
          <div className="pb-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Source Type</p>
            <div className="mt-1">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                subject.source_type === 'brand' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
              }`}>
                {subject.source_type.charAt(0).toUpperCase() + subject.source_type.slice(1)}
              </span>
            </div>
          </div>
          <div className="py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Type of Service</p>
            <div className="mt-1">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                subject.type_of_service === 'installation' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
              }`}>
                {subject.type_of_service === 'installation' ? 'Installation' : 'Service'}
              </span>
            </div>
          </div>
          <div className="py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Customer Name</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800">{subject.customer_name ?? '-'}</p>
          </div>
          <div className="pt-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Customer Address</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800">{subject.customer_address ?? '-'}</p>
          </div>
        </div>
      </div>
      {subject.priority_reason ? (
        <div className="border-t border-gray-100 pt-3 mt-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Priority Reason</p>
          <p className="mt-0.5 text-sm font-medium text-slate-800">{subject.priority_reason}</p>
        </div>
      ) : null}
    </section>
  );
}
