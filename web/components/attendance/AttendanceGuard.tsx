'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/auth/useAuth';
import { useTodayAttendance, useToggleAttendance } from '@/hooks/attendance/useAttendance';
import { ROUTES } from '@/lib/constants/routes';

interface AttendanceGuardProps {
  children: ReactNode;
}

export function AttendanceGuard({ children }: AttendanceGuardProps) {
  const { user, userRole } = useAuth();
  const todayAttendanceQuery = useTodayAttendance(user?.id ?? '');
  const toggleMutation = useToggleAttendance();

  if (userRole !== 'technician') {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  if (todayAttendanceQuery.isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking attendance...
        </div>
      </div>
    );
  }

  const todayAttendance = todayAttendanceQuery.data?.ok ? todayAttendanceQuery.data.data : null;
  const isAllowed = Boolean(todayAttendance?.toggled_on_at);

  if (isAllowed) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[75vh] items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Attendance Required</h2>
        <p className="mt-2 text-sm text-slate-600">Mark your attendance to access services today.</p>

        <button
          type="button"
          disabled={toggleMutation.isPending}
          onClick={() => toggleMutation.mutate(user.id)}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {toggleMutation.isPending ? 'Marking Attendance...' : 'Mark Attendance ON'}
        </button>

        <Link href={ROUTES.DASHBOARD_ATTENDANCE} className="mt-3 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700">
          Open Attendance Page
        </Link>
      </div>
    </div>
  );
}
