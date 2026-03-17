'use client';

import type { SubjectDetail } from '@/modules/subjects/subject.types';

interface ProductInfoCardProps {
  subject: SubjectDetail;
}

export function ProductInfoCard({ subject }: ProductInfoCardProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-900">Product Information</h2>
      <div className="divide-y divide-gray-100">
        <div className="pb-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Product Name</p>
          {subject.product_name ? (
            <p className="mt-0.5 text-sm font-medium text-slate-800">{subject.product_name}</p>
          ) : (
            <p className="mt-0.5 text-sm italic text-gray-400">Not provided</p>
          )}
        </div>
        <div className="py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Serial Number</p>
          {subject.serial_number ? (
            <p className="mt-0.5 text-sm font-medium text-slate-800">{subject.serial_number}</p>
          ) : (
            <p className="mt-0.5 text-sm italic text-gray-400">Not provided</p>
          )}
        </div>
        <div className="pt-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Description</p>
          {subject.product_description ? (
            <p className="mt-0.5 text-sm font-medium text-slate-800">{subject.product_description}</p>
          ) : (
            <p className="mt-0.5 text-sm italic text-gray-400">Not provided</p>
          )}
        </div>
      </div>
    </section>
  );
}
