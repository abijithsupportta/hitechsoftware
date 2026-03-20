import { useQuery } from '@tanstack/react-query';

async function fetchCompletedCounts(): Promise<Record<string, number>> {
  const res = await fetch('/api/team/members/completed-counts');
  if (!res.ok) {
    throw new Error('Failed to fetch completed counts');
  }
  const json = (await res.json()) as { counts: Record<string, number> };
  return json.counts;
}

export function useTeamCompletedCounts() {
  return useQuery({
    queryKey: ['team', 'completed-counts'],
    queryFn: fetchCompletedCounts,
    staleTime: 60_000,
  });
}
