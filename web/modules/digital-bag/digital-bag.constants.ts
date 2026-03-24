// ─────────────────────────────────────────────────────────────────────────────
// digital-bag.constants.ts
// ─────────────────────────────────────────────────────────────────────────────

/** Maximum number of items a technician can hold across all open sessions. */
export const BAG_CAPACITY = 50;

/** Human-readable labels for session statuses. */
export const SESSION_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  closed: 'Closed',
};

/** Human-readable labels for payout statuses. */
export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  paid: 'Paid',
  disputed: 'Disputed',
};

/** Badge colour classes per session status (Tailwind). */
export const SESSION_STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  closed: 'bg-slate-100 text-slate-700',
};

/** Badge colour classes per payout status (Tailwind). */
export const PAYOUT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  disputed: 'bg-red-100 text-red-800',
};

export const DIGITAL_BAG_QUERY_KEYS = {
  all: ['digital-bag'] as const,
  activeSessions: () => ['digital-bag', 'active-sessions'] as const,
  session: (id: string) => ['digital-bag', 'session', id] as const,
  todaySession: (techId: string) => ['digital-bag', 'today', techId] as const,
  history: (filters?: unknown) => ['digital-bag', 'history', filters] as const,
  availableProducts: (search?: string) => ['digital-bag', 'products', search] as const,
};
