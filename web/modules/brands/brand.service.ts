import type { ServiceResult } from '@/types/common.types';
import { createBrand, deleteBrand, hasSubjectsByBrand, listBrands, listBrandDueBills, updateBrand } from '@/repositories/brands.repository';
import type { Brand, CreateBrandInput, UpdateBrandInput } from '@/modules/brands/brand.types';
import { createBrandSchema } from '@/modules/brands/brand.validation';

function mapError(message?: string) {
  const safe = message?.trim() ?? 'Failed to process brand';
  if (/duplicate key/i.test(safe)) {
    return 'Brand already exists.';
  }
  return safe;
}

export async function getBrands(): Promise<ServiceResult<Brand[]>> {
  const result = await listBrands();
  if (result.error) {
    return { ok: false, error: { message: result.error.message, code: result.error.code } };
  }
  return { ok: true, data: result.data ?? [] };
}

export async function addBrand(input: CreateBrandInput): Promise<ServiceResult<Brand>> {
  const parsed = createBrandSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { message: parsed.error.issues[0]?.message ?? 'Invalid brand' } };
  }

  const result = await createBrand(parsed.data.name);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message), code: result.error?.code } };
  }

  return { ok: true, data: result.data };
}

export async function setBrandActive(id: string, isActive: boolean): Promise<ServiceResult<Brand>> {
  const result = await updateBrand(id, { is_active: isActive });
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message), code: result.error?.code } };
  }
  return { ok: true, data: result.data };
}

export async function renameBrand(id: string, input: UpdateBrandInput): Promise<ServiceResult<Brand>> {
  const name = input.name?.trim();
  if (!name || name.length < 2) {
    return { ok: false, error: { message: 'Brand name must be at least 2 characters.' } };
  }
  const result = await updateBrand(id, { name });
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message), code: result.error?.code } };
  }
  return { ok: true, data: result.data };
}

export async function removeBrand(id: string): Promise<ServiceResult<{ id: string }>> {
  const usage = await hasSubjectsByBrand(id);
  if (usage.error) {
    return { ok: false, error: { message: usage.error.message, code: usage.error.code } };
  }

  if (usage.data) {
    return { ok: false, error: { message: 'Cannot delete brand: it is used in subjects.' } };
  }

  const result = await deleteBrand(id);
  if (result.error || !result.data) {
    return { ok: false, error: { message: result.error?.message ?? 'Failed to delete brand', code: result.error?.code } };
  }

  return { ok: true, data: result.data };
}

export interface BrandDueSummary {
  dueCount: number;
  dueAmount: number;
}

export async function getBrandDueSummary(): Promise<ServiceResult<Map<string, BrandDueSummary>>> {
  const result = await listBrandDueBills();
  if (result.error) {
    return { ok: false, error: { message: result.error.message, code: result.error.code } };
  }

  const map = new Map<string, BrandDueSummary>();
  for (const row of result.data ?? []) {
    const existing = map.get(row.brand_id) ?? { dueCount: 0, dueAmount: 0 };
    existing.dueCount += 1;
    existing.dueAmount += Number(row.grand_total || 0);
    map.set(row.brand_id, existing);
  }

  return { ok: true, data: map };
}
