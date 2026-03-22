/**
 * Shared formatting utilities.
 * Single source of truth — do not redefine these inline in components or pages.
 */

/** "IN_PROGRESS" → "In Progress" */
export function formatStatus(value: string): string {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

/** ISO date string → "22/03/2026 14:30" (en-GB locale) */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-GB');
}

/** ISO date string | null → "22/03/2026" | "-" */
export function formatDateOnly(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB');
}

/** Number → "2,600.00" (INR locale, 2dp) */
export function formatMoney(value: number): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
