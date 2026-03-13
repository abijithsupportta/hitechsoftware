import type { ServiceResult } from '@/types/common.types';
import {
  createServiceCategory,
  deleteServiceCategory,
  hasSubjectsByCategory,
  listServiceCategories,
  updateServiceCategory,
} from '@/repositories/service-categories.repository';
import type {
  CreateServiceCategoryInput,
  ServiceCategory,
  UpdateServiceCategoryInput,
} from '@/modules/service-categories/service-category.types';
import { createServiceCategorySchema } from '@/modules/service-categories/service-category.validation';

function mapError(message?: string) {
  const safe = message?.trim() ?? 'Failed to process service category';
  if (/duplicate key/i.test(safe)) {
    return 'Service category already exists.';
  }
  return safe;
}

export async function getServiceCategories(): Promise<ServiceResult<ServiceCategory[]>> {
  const result = await listServiceCategories();
  if (result.error) {
    return { ok: false, error: { message: result.error.message, code: result.error.code } };
  }
  return { ok: true, data: result.data ?? [] };
}

export async function addServiceCategory(input: CreateServiceCategoryInput): Promise<ServiceResult<ServiceCategory>> {
  const parsed = createServiceCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { message: parsed.error.issues[0]?.message ?? 'Invalid category' } };
  }

  const result = await createServiceCategory(parsed.data.name);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message), code: result.error?.code } };
  }

  return { ok: true, data: result.data };
}

export async function editServiceCategory(id: string, input: UpdateServiceCategoryInput): Promise<ServiceResult<ServiceCategory>> {
  const payload: UpdateServiceCategoryInput = {
    name: input.name?.trim() || undefined,
    is_active: input.is_active,
  };

  const result = await updateServiceCategory(id, payload);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message), code: result.error?.code } };
  }

  return { ok: true, data: result.data };
}

export async function removeServiceCategory(id: string): Promise<ServiceResult<{ id: string }>> {
  const usage = await hasSubjectsByCategory(id);
  if (usage.error) {
    return { ok: false, error: { message: usage.error.message, code: usage.error.code } };
  }

  if (usage.data) {
    return { ok: false, error: { message: 'Cannot delete category: it is used in subjects.' } };
  }

  const result = await deleteServiceCategory(id);
  if (result.error || !result.data) {
    return {
      ok: false,
      error: { message: result.error?.message ?? 'Failed to delete category', code: result.error?.code },
    };
  }

  return { ok: true, data: result.data };
}
