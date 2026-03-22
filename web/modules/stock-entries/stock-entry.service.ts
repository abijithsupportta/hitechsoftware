import type { ServiceResult } from '@/types/common.types';
import {
  createStockEntry,
  findStockEntryById,
  listStockEntries,
  softDeleteStockEntry,
} from '@/repositories/stock-entries.repository';
import type {
  CreateStockEntryInput,
  StockEntry,
  StockEntryFilters,
  StockEntryListResponse,
} from './stock-entry.types';
import { createStockEntrySchema } from './stock-entry.validation';

const PAGE_SIZE = 20;

function mapError(message?: string): string {
  const safe = message?.trim() ?? 'Failed to process stock entry';
  return safe;
}

export async function getStockEntries(
  filters: StockEntryFilters = {},
): Promise<ServiceResult<StockEntryListResponse>> {
  const page = filters.page ?? 1;
  const page_size = filters.page_size ?? PAGE_SIZE;

  const result = await listStockEntries({ ...filters, page, page_size });
  if (result.error) return { ok: false, error: { message: result.error.message, code: result.error.code } };

  const total = result.count ?? 0;
  return {
    ok: true,
    data: {
      data: result.data ?? [],
      total,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    },
  };
}

export async function getStockEntry(id: string): Promise<ServiceResult<StockEntry>> {
  const result = await findStockEntryById(id);
  if (result.error || !result.data) {
    return { ok: false, error: { message: result.error?.message ?? 'Stock entry not found', code: result.error?.code } };
  }
  return { ok: true, data: result.data };
}

export async function addStockEntry(input: CreateStockEntryInput): Promise<ServiceResult<StockEntry>> {
  const parsed = createStockEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { message: parsed.error.issues[0]?.message ?? 'Invalid input' } };
  }

  const result = await createStockEntry(parsed.data);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message), code: result.error?.code } };
  }
  return { ok: true, data: result.data };
}

export async function removeStockEntry(id: string): Promise<ServiceResult<{ id: string }>> {
  const result = await softDeleteStockEntry(id);
  if (result.error || !result.data) {
    return {
      ok: false,
      error: { message: result.error?.message ?? 'Failed to delete stock entry', code: result.error?.code },
    };
  }
  return { ok: true, data: result.data };
}
