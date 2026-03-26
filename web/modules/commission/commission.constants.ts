// ─────────────────────────────────────────────────────────────────────────────
// commission.constants.ts
//
// Query keys, enums, and constants for the Commission module.
// ─────────────────────────────────────────────────────────────────────────────

export const COMMISSION_QUERY_KEYS = {
  all: ['commission'] as const,
  subjectCommission: (subjectId: string) => ['commission', 'subject', subjectId] as const,
  technicianEarnings: (technicianId: string) => ['commission', 'earnings', technicianId] as const,
  leaderboard: (period: string) => ['commission', 'leaderboard', period] as const,
  monthlyChart: (technicianId: string) => ['commission', 'monthly-chart', technicianId] as const,
  summary: (technicianId: string) => ['commission', 'summary', technicianId] as const,
};

export const EARNINGS_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
} as const;

export const LEADERBOARD_PERIODS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const;

export const COMMISSION_DEFAULT_PAGE_SIZE = 20;
