'use client';

import type { SubjectContract } from '@/modules/contracts/contract.types';

function formatDateOnly(value: string) {
  return new Date(value).toLocaleDateString('en-GB');
}

interface ContractCardProps {
  contract: SubjectContract;
  visualStatus: 'active' | 'upcoming' | 'expired';
  canDelete: boolean;
  isDeleting: boolean;
  onDelete: (id: string) => void;
}

export function ContractCard({ contract, visualStatus, canDelete, isDeleting, onDelete }: ContractCardProps) {
  const statusClass =
    visualStatus === 'active' ? 'bg-blue-100 text-blue-700' :
    visualStatus === 'upcoming' ? 'bg-amber-100 text-amber-700' :
    'bg-slate-100 text-slate-700';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{contract.contract_name}</p>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${statusClass}`}>
          {visualStatus}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-600">Start: {formatDateOnly(contract.start_date)}</p>
      <p className="text-xs text-slate-600">End: {formatDateOnly(contract.end_date)}</p>
      <p className="text-xs text-slate-600">Duration: {contract.duration_months ? `${contract.duration_months} months` : 'Custom'}</p>
      {canDelete && visualStatus !== 'active' && (
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => onDelete(contract.id)}
          className="mt-2 inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
        >
          Delete
        </button>
      )}
    </div>
  );
}
