interface CustomerStatusBadgeProps {
  isActive: boolean;
}

export function CustomerStatusBadge({ isActive }: CustomerStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
