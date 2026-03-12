export const TEAM_QUERY_KEYS = {
  all: ['team'] as const,
  list: ['team', 'list'] as const,
  detail: (id: string) => ['team', 'detail', id] as const,
};
