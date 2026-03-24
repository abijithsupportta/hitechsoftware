import { getQueryClient } from '@/components/providers/query-provider';
import { CUSTOMER_QUERY_KEYS } from '@/modules/customers/customer.constants';
import { TEAM_QUERY_KEYS } from '@/modules/technicians/technician.constants';
import { SUBJECT_QUERY_KEYS } from '@/modules/subjects/subject.constants';
import { getCustomerList } from '@/modules/customers/customer.service';
import { getTeamMembers } from '@/modules/technicians/technician.service';
import { getSubjects } from '@/modules/subjects/subject.service';
import { ROLES } from '@/lib/constants/roles';

/**
 * Non-blocking prefetch of dashboard data after successful login.
 * Fires and forgets — errors are silently caught.
 */
export function prefetchDashboardData(role: string | null) {
  const qc = getQueryClient();

  if (role === ROLES.TECHNICIAN) {
    void qc.prefetchQuery({
      queryKey: [...SUBJECT_QUERY_KEYS.list, 'technician-dashboard-pending'],
      queryFn: async () => {
        const result = await getSubjects({
          technician_pending_only: true,
          page: 1,
          page_size: 50,
        });
        if (!result.ok) throw new Error(result.error.message);
        return result.data.data;
      },
      staleTime: 30_000,
    });

    void qc.prefetchQuery({
      queryKey: ['technician-dashboard-completed-summary'],
      queryFn: async () => {
        const res = await fetch('/api/dashboard/technician/completed-summary');
        const payload = await res.json();
        if (!payload.ok || !payload.data) throw new Error('Failed');
        return payload.data;
      },
      staleTime: 30_000,
    });
  } else {
    void qc.prefetchQuery({
      queryKey: [...CUSTOMER_QUERY_KEYS.all, 'count'],
      queryFn: async () => {
        const result = await getCustomerList({ page: 1, page_size: 1 });
        if (!result.ok) throw new Error(result.error.message);
        return result.data.total;
      },
      staleTime: 60_000,
    });

    void qc.prefetchQuery({
      queryKey: [...TEAM_QUERY_KEYS.all, 'count'],
      queryFn: async () => {
        const result = await getTeamMembers();
        if (!result.ok) throw new Error(result.error.message);
        return result.data.length;
      },
      staleTime: 60_000,
    });
  }
}
