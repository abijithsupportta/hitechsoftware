// ─────────────────────────────────────────────────────────────────────────────
// common.types.ts
//
// Shared result/error types used across every service function in this project.
// Centralising them here means every caller uses the same discriminated union
// and TypeScript narrows the type automatically based on the `ok` flag.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structured error payload returned when a service or repository call fails.
 * `code` is optional and carries the raw Postgres/Supabase error code (e.g.
 * '23505' for duplicate key) so callers can branch on specific DB errors
 * without parsing the message string.
 */
export interface ServiceError {
  message: string;
  code?: string;
}

/**
 * Discriminated union that wraps every async service-layer response.
 *
 * Usage pattern:
 * ```ts
 * const result = await getSubjectDetails(id);
 * if (!result.ok) {
 *   toast.error(result.error.message);
 *   return;
 * }
 * const subject = result.data; // TypeScript knows data is defined here
 * ```
 *
 * Why a union instead of throwing? Throwing crosses async boundaries awkwardly
 * in Next.js route handlers and React Query. Returning ok/error lets callers
 * handle errors explicitly without try/catch at every call site.
 */
export type ServiceResult<T> =
  | { ok: true; data: T }       // success — data is typed as T
  | { ok: false; error: ServiceError }; // failure — error has message + optional code
