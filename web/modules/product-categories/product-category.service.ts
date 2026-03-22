import type { ServiceResult } from '@/types/common.types';
import {
  createProductCategory,
  hasProductsByCategory,
  listProductCategories,
  softDeleteProductCategory,
  updateProductCategory,
} from '@/repositories/product-categories.repository';
import type {
  CreateProductCategoryInput,
  ProductCategory,
  UpdateProductCategoryInput,
} from './product-category.types';
import { createProductCategorySchema } from './product-category.validation';

function mapError(message?: string): string {
  const safe = message?.trim() ?? 'Failed to process product category';
  if (/duplicate key|unique/i.test(safe)) return 'A category with this name already exists.';
  return safe;
}

export async function getProductCategories(): Promise<ServiceResult<ProductCategory[]>> {
  const result = await listProductCategories();
  if (result.error) return { ok: false, error: { message: result.error.message, code: result.error.code } };
  return { ok: true, data: result.data ?? [] };
}

export async function addProductCategory(
  input: CreateProductCategoryInput,
): Promise<ServiceResult<ProductCategory>> {
  const parsed = createProductCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { message: parsed.error.issues[0]?.message ?? 'Invalid input' } };
  }

  const result = await createProductCategory(parsed.data.name);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message), code: result.error?.code } };
  }
  return { ok: true, data: result.data };
}

export async function editProductCategory(
  id: string,
  input: UpdateProductCategoryInput,
): Promise<ServiceResult<ProductCategory>> {
  const payload: UpdateProductCategoryInput = {
    name: input.name?.trim() || undefined,
    is_active: input.is_active,
  };

  const result = await updateProductCategory(id, payload);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message), code: result.error?.code } };
  }
  return { ok: true, data: result.data };
}

export async function removeProductCategory(id: string): Promise<ServiceResult<{ id: string }>> {
  const usage = await hasProductsByCategory(id);
  if (usage.error) return { ok: false, error: { message: usage.error.message, code: usage.error.code } };
  if (usage.data) return { ok: false, error: { message: 'Cannot delete: products are using this category.' } };

  const result = await softDeleteProductCategory(id);
  if (result.error || !result.data) {
    return {
      ok: false,
      error: { message: result.error?.message ?? 'Failed to delete category', code: result.error?.code },
    };
  }
  return { ok: true, data: result.data };
}
