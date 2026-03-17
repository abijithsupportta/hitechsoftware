'use client';

import type { SubjectPriority } from '@/modules/subjects/subject.types';

interface SubjectPriorityBadgeProps {
  priority: SubjectPriority;
}

export function SubjectPriorityBadge({ priority }: SubjectPriorityBadgeProps) {
  const className =
    priority === 'critical' ? 'bg-red-100 text-red-700' :
    priority === 'high' ? 'bg-orange-100 text-orange-700' :
    priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
    'bg-green-100 text-green-700';

  const label = priority.charAt(0).toUpperCase() + priority.slice(1);

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}
