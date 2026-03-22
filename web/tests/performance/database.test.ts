import { beforeEach, describe, expect, it } from 'vitest';
import { findByPhone } from '@/repositories/customer.repository';
import { listSubjects } from '@/repositories/subject.repository';
import { mockSupabaseClient } from '@/tests/setup';

type Operation = { method: string; args: unknown[] };

function buildChain(result: { data?: unknown; count?: number | null } = {}) {
  const operations: Operation[] = [];
  const chain = {
    select: (...args: unknown[]) => {
      operations.push({ method: 'select', args });
      return chain;
    },
    eq: (...args: unknown[]) => {
      operations.push({ method: 'eq', args });
      return chain;
    },
    neq: (...args: unknown[]) => {
      operations.push({ method: 'neq', args });
      return chain;
    },
    is: (...args: unknown[]) => {
      operations.push({ method: 'is', args });
      return chain;
    },
    not: (...args: unknown[]) => {
      operations.push({ method: 'not', args });
      return chain;
    },
    lt: (...args: unknown[]) => {
      operations.push({ method: 'lt', args });
      return chain;
    },
    lte: (...args: unknown[]) => {
      operations.push({ method: 'lte', args });
      return chain;
    },
    gte: (...args: unknown[]) => {
      operations.push({ method: 'gte', args });
      return chain;
    },
    or: (...args: unknown[]) => {
      operations.push({ method: 'or', args });
      return chain;
    },
    order: (...args: unknown[]) => {
      operations.push({ method: 'order', args });
      return chain;
    },
    insert: (...args: unknown[]) => {
      operations.push({ method: 'insert', args });
      return chain;
    },
    update: (...args: unknown[]) => {
      operations.push({ method: 'update', args });
      return chain;
    },
    delete: (...args: unknown[]) => {
      operations.push({ method: 'delete', args });
      return chain;
    },
    gt: (...args: unknown[]) => {
      operations.push({ method: 'gt', args });
      return chain;
    },
    limit: (...args: unknown[]) => {
      operations.push({ method: 'limit', args });
      return chain;
    },
    single: async () => ({ data: result.data ?? null, error: null }),
    returns: async () => ({ data: result.data ?? null, error: null, count: result.count ?? null }),
    range: async (...args: unknown[]) => {
      operations.push({ method: 'range', args });
      return {
        data: result.data ?? [],
        error: null,
        count: result.count ?? 0,
      };
    },
    maybeSingle: async () => ({ data: result.data ?? null, error: null }),
  };

  return { chain, operations };
}

describe('Suite 6 Database query performance', () => {
  beforeEach(() => {
    mockSupabaseClient.from.mockReset();
  });

  it('Test 6.1 — Subject list query completes within acceptable time', async () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({ id: `subject-${index}` }));
    const { chain } = buildChain({ data: rows, count: 1000 });
    mockSupabaseClient.from.mockReturnValue(chain as never);

    const started = performance.now();
    const result = await listSubjects({ page: 1, page_size: 10 });
    const elapsed = performance.now() - started;

    expect(elapsed).toBeLessThan(200);
    expect(result.data).toHaveLength(10);
    expect(result.count).toBe(1000);
  });

  it('Test 6.2 — Customer phone lookup uses index-friendly filter', async () => {
    const { chain, operations } = buildChain({ data: { id: 'customer-1' } });
    mockSupabaseClient.from.mockReturnValue(chain as never);

    await findByPhone('9999999999');

    const selectOperation = operations.find((operation) => operation.method === 'select');
    expect(String(selectOperation?.args[0] ?? '')).not.toContain('*');
    expect(operations).toContainEqual({ method: 'eq', args: ['phone_number', '9999999999'] });
  });

  it('Test 6.3 — Technician subject list does not fetch all subjects', async () => {
    const { chain, operations } = buildChain({ data: [], count: 0 });
    mockSupabaseClient.from.mockReturnValue(chain as never);

    await listSubjects({ technician_pending_only: true, page: 1, page_size: 10 });

    expect(operations).toContainEqual({ method: 'eq', args: ['assigned_technician_id', 'CURRENT_TECHNICIAN'] });
  });

  it('Test 6.4 — Pagination returns correct page size', async () => {
    const first = buildChain({ data: Array.from({ length: 10 }, (_, index) => ({ id: index })), count: 20 });
    mockSupabaseClient.from.mockReturnValueOnce(first.chain as never);
    await listSubjects({ page: 1, page_size: 10 });
    expect(first.operations).toContainEqual({ method: 'range', args: [0, 9] });

    const second = buildChain({ data: Array.from({ length: 10 }, (_, index) => ({ id: index + 10 })), count: 20 });
    mockSupabaseClient.from.mockReturnValueOnce(second.chain as never);
    await listSubjects({ page: 2, page_size: 10 });
    expect(second.operations).toContainEqual({ method: 'range', args: [10, 19] });
  });

  it('Test 6.5 — Search query uses correct filter operators', async () => {
    const { chain, operations } = buildChain({ data: [], count: 0 });
    mockSupabaseClient.from.mockReturnValue(chain as never);

    await listSubjects({ search: 'test customer', page: 1, page_size: 10 });

    const orOperation = operations.find((operation) => operation.method === 'or');
    expect(String(orOperation?.args[0] ?? '')).toContain('subject_number.ilike.%test customer%');
    expect(String(orOperation?.args[0] ?? '')).toContain('customer_phone.ilike.%test customer%');
    expect(String(orOperation?.args[0] ?? '')).toContain('customer_name.ilike.%test customer%');
  });
});