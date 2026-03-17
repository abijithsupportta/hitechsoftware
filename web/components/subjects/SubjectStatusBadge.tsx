'use client';

interface SubjectStatusBadgeProps {
  status: string;
}

export function SubjectStatusBadge({ status }: SubjectStatusBadgeProps) {
  const label = status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
      {label}
    </span>
  );
}
