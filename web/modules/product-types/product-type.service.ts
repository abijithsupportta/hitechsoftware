import type { ServiceResult } from '@/types/common.types';
import {
  createProductType,
  hasProductsByType,
  listProductTypes,
  softDeleteProductType,
  updateProductType,
} from '@/repositories/product-types.repository';
import type { CreateProductTypeInput, ProductType, UpdateProductTypeInput } from './product-type.types';
import { createProductTypeSchema } from './product-type.validation';

function mapError(message?: string): string {
  const safe = message?.trim() ?? 'Failed to process product type';
  if (/duplicate key|unique/i.test(safe)) return 'A product type with this name already exists.';
  return safe;
}

export async function getProductTypes(): Promise<ServiceResult<ProductType[]>> {
  const result = await listProductTypes();
  if (result.error) return { ok: false, error: { message: result.error.message, code: result.error.code } };
  return { ok: true, data: result.data ?? [] };
}

export async function addProductType(input: CreateProductTypeInput): Promise<ServiceResult<ProductType>> {
  const parsed = createProductTypeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { message: parsed.error.issues[0]?.message ?? 'Invalid input' } };
  }

  const result = await createProductType(parsed.data.name);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message), code: result.error?.code } };
  }
  return { ok: true, data: result.data };
}

export async function editProductType(
  id: string,
  input: UpdateProductTypeInput,
): Promise<ServiceResult<ProductType>> {
  const payload: UpdateProductTypeInput = {
    name: input.name?.trim() || undefined,
    is_active: input.is_active,
  };

  const result = await updateProductType(id, payload);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message), code: result.error?.code } };
  }
  return { ok: true, data: result.data };
}

export async function removeProductType(id: string): Promise<ServiceResult<{ id: string }>> {
  const usage = await hasProductsByType(id);
  if (usage.error) return { ok: false, error: { message: usage.error.message, code: usage.error.code } };
  if (usage.data) return { ok: false, error: { message: 'Cannot delete: products are using this type.' } };

  const result = await softDeleteProductType(id);
  if (result.error || !result.data) {
    return {
      ok: false,
      error: { message: result.error?.message ?? 'Failed to delete product type', code: result.error?.code },
    };
  }
  return { ok: true, data: result.data };
}
