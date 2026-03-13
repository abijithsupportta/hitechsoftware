import type { ServiceResult } from '@/types/common.types';
import { createDealer, deleteDealer, hasSubjectsByDealer, listDealers, updateDealer } from '@/repositories/dealers.repository';
import type { CreateDealerInput, Dealer, UpdateDealerInput } from '@/modules/dealers/dealer.types';
import { createDealerSchema } from '@/modules/dealers/dealer.validation';

function mapError(message?: string) {
  const safe = message?.trim() ?? 'Failed to process dealer';
  if (/duplicate key/i.test(safe)) {
    return 'Dealer already exists.';
  }
  return safe;
}

export async function getDealers(): Promise<ServiceResult<Dealer[]>> {
  const result = await listDealers();
  if (result.error) {
    return { ok: false, error: { message: result.error.message, code: result.error.code } };
  }
  return { ok: true, data: result.data ?? [] };
}

export async function addDealer(input: CreateDealerInput): Promise<ServiceResult<Dealer>> {
  const parsed = createDealerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { message: parsed.error.issues[0]?.message ?? 'Invalid dealer' } };
  }

  const result = await createDealer(parsed.data.name);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message), code: result.error?.code } };
  }

  return { ok: true, data: result.data };
}

export async function setDealerActive(id: string, isActive: boolean): Promise<ServiceResult<Dealer>> {
  const result = await updateDealer(id, { is_active: isActive });
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message), code: result.error?.code } };
  }
  return { ok: true, data: result.data };
}

export async function renameDealer(id: string, input: UpdateDealerInput): Promise<ServiceResult<Dealer>> {
  const name = input.name?.trim();
  if (!name || name.length < 2) {
    return { ok: false, error: { message: 'Dealer name must be at least 2 characters.' } };
  }
  const result = await updateDealer(id, { name });
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message), code: result.error?.code } };
  }
  return { ok: true, data: result.data };
}

export async function removeDealer(id: string): Promise<ServiceResult<{ id: string }>> {
  const usage = await hasSubjectsByDealer(id);
  if (usage.error) {
    return { ok: false, error: { message: usage.error.message, code: usage.error.code } };
  }

  if (usage.data) {
    return { ok: false, error: { message: 'Cannot delete dealer: it is used in subjects.' } };
  }

  const result = await deleteDealer(id);
  if (result.error || !result.data) {
    return { ok: false, error: { message: result.error?.message ?? 'Failed to delete dealer', code: result.error?.code } };
  }

  return { ok: true, data: result.data };
}
