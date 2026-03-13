import type { ServiceResult } from '@/types/common.types';
import { createBrand, deleteBrand, hasSubjectsByBrand, listBrands, updateBrand } from '@/repositories/brands.repository';
import type { Brand, CreateBrandInput } from '@/modules/brands/brand.types';
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
