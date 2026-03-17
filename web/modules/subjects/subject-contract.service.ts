import { create, deleteById, findBySubjectId, getActiveContract, getLastContract, update } from '@/repositories/subject-contract.repository';
import { getSubjectById, recalculateSubjectBillingType } from '@/repositories/subject.repository';
import { WARRANTY_PERIODS } from '@/modules/subjects/subject.constants';
import type { ServiceResult } from '@/types/common.types';
import type { CreateContractInput, SubjectContract, UpdateContractInput, WarrantyPeriod } from '@/modules/subjects/subject.types';

function toIsoDate(value: string) {
  return new Date(value).toISOString().split('T')[0];
}

function addMonths(dateText: string, months: number) {
  const date = new Date(dateText);
  date.setMonth(date.getMonth() + months);
  return toIsoDate(date.toISOString());
}

function getMonthsForPeriod(period: WarrantyPeriod): number | null {
  const item = WARRANTY_PERIODS.find((option) => option.value === period);
  return item?.months ?? null;
}

function mapContract(row: unknown): SubjectContract {
  const typed = row as SubjectContract;
  return {
    id: typed.id,
    subject_id: typed.subject_id,
    contract_name: typed.contract_name,
    start_date: typed.start_date,
    duration_months: typed.duration_months,
    end_date: typed.end_date,
    is_custom_duration: typed.is_custom_duration,
    status: typed.status,
    created_by: typed.created_by,
    created_at: typed.created_at,
    updated_at: typed.updated_at,
  };
}

function hasOverlap(startDate: string, endDate: string, contracts: SubjectContract[]) {
  return contracts.some((contract) => startDate <= contract.end_date && endDate >= contract.start_date);
}

async function refreshBilling(subjectId: string) {
  await recalculateSubjectBillingType(subjectId);
}

export async function getContractsBySubject(subjectId: string): Promise<ServiceResult<SubjectContract[]>> {
  const result = await findBySubjectId(subjectId);

  if (result.error) {
    return { ok: false, error: { message: result.error.message, code: result.error.code } };
  }

  return {
    ok: true,
    data: (result.data ?? []).map(mapContract),
  };
}

export async function createContract(input: CreateContractInput): Promise<ServiceResult<SubjectContract>> {
  const trimmedName = input.contract_name.trim();
  if (!trimmedName) {
    return { ok: false, error: { message: 'Contract name is required.' } };
  }

  const periodMonths = getMonthsForPeriod(input.duration_period);
  const isCustomDuration = input.duration_period === 'custom';

  if (!input.start_date) {
    return { ok: false, error: { message: 'Contract start date is required.' } };
  }

  if (!isCustomDuration && !periodMonths) {
    return { ok: false, error: { message: 'Invalid contract duration period.' } };
  }

  if (isCustomDuration && !input.end_date) {
    return { ok: false, error: { message: 'End date is required for custom duration contracts.' } };
  }

  const endDate = isCustomDuration
    ? (input.end_date as string)
    : addMonths(input.start_date, periodMonths as number);

  if (endDate < input.start_date) {
    return { ok: false, error: { message: 'Contract end date must be on or after start date.' } };
  }

  const [existingResult, lastContractResult, subjectResult] = await Promise.all([
    findBySubjectId(input.subject_id),
    getLastContract(input.subject_id),
    getSubjectById(input.subject_id),
  ]);

  if (existingResult.error) {
    return { ok: false, error: { message: existingResult.error.message, code: existingResult.error.code } };
  }

  if (lastContractResult.error) {
    return { ok: false, error: { message: lastContractResult.error.message, code: lastContractResult.error.code } };
  }

  if (subjectResult.error || !subjectResult.data) {
    return { ok: false, error: { message: subjectResult.error?.message ?? 'Subject not found', code: subjectResult.error?.code } };
  }

  const contracts = (existingResult.data ?? []).map(mapContract);

  if (hasOverlap(input.start_date, endDate, contracts)) {
    return { ok: false, error: { message: 'Contract dates overlap with an existing contract.' } };
  }

  const lastContractEnd = lastContractResult.data ? mapContract(lastContractResult.data).end_date : null;
  const warrantyEndDate = (subjectResult.data as { warranty_end_date?: string | null }).warranty_end_date ?? null;

  if (lastContractEnd && input.start_date < lastContractEnd) {
    return { ok: false, error: { message: `Contract start date must be on or after ${lastContractEnd}.` } };
  }

  if (!lastContractEnd && warrantyEndDate && input.start_date < warrantyEndDate) {
    return { ok: false, error: { message: `Contract start date must be on or after warranty end date ${warrantyEndDate}.` } };
  }

  const createResult = await create({
    subject_id: input.subject_id,
    contract_name: trimmedName,
    start_date: input.start_date,
    duration_months: isCustomDuration ? null : periodMonths,
    end_date: endDate,
    is_custom_duration: isCustomDuration,
    created_by: input.created_by,
  });

  if (createResult.error || !createResult.data) {
    return {
      ok: false,
      error: { message: createResult.error?.message ?? 'Failed to create contract', code: createResult.error?.code },
    };
  }

  await refreshBilling(input.subject_id);

  return {
    ok: true,
    data: mapContract(createResult.data),
  };
}

export async function updateContract(input: UpdateContractInput): Promise<ServiceResult<SubjectContract>> {
  const trimmedName = input.contract_name.trim();
  if (!trimmedName) {
    return { ok: false, error: { message: 'Contract name is required.' } };
  }

  const periodMonths = getMonthsForPeriod(input.duration_period);
  const isCustomDuration = input.duration_period === 'custom';

  if (!input.start_date) {
    return { ok: false, error: { message: 'Contract start date is required.' } };
  }

  if (!isCustomDuration && !periodMonths) {
    return { ok: false, error: { message: 'Invalid contract duration period.' } };
  }

  if (isCustomDuration && !input.end_date) {
    return { ok: false, error: { message: 'End date is required for custom duration contracts.' } };
  }

  const endDate = isCustomDuration
    ? (input.end_date as string)
    : addMonths(input.start_date, periodMonths as number);

  if (endDate < input.start_date) {
    return { ok: false, error: { message: 'Contract end date must be on or after start date.' } };
  }

  const existingResult = await findBySubjectId(input.subject_id);
  if (existingResult.error) {
    return { ok: false, error: { message: existingResult.error.message, code: existingResult.error.code } };
  }

  const allContracts = (existingResult.data ?? []).map(mapContract);
  const overlappingContracts = allContracts.filter((contract) => contract.id !== input.id);

  if (hasOverlap(input.start_date, endDate, overlappingContracts)) {
    return { ok: false, error: { message: 'Contract dates overlap with an existing contract.' } };
  }

  const updateResult = await update(input.id, {
    contract_name: trimmedName,
    start_date: input.start_date,
    duration_months: isCustomDuration ? null : periodMonths,
    end_date: endDate,
    is_custom_duration: isCustomDuration,
  });

  if (updateResult.error || !updateResult.data) {
    return {
      ok: false,
      error: { message: updateResult.error?.message ?? 'Failed to update contract', code: updateResult.error?.code },
    };
  }

  await refreshBilling(input.subject_id);

  return {
    ok: true,
    data: mapContract(updateResult.data),
  };
}

export async function deleteContract(subjectId: string, contractId: string): Promise<ServiceResult<{ id: string }>> {
  const activeContractResult = await getActiveContract(subjectId);

  if (activeContractResult.error) {
    return { ok: false, error: { message: activeContractResult.error.message, code: activeContractResult.error.code } };
  }

  if (activeContractResult.data && mapContract(activeContractResult.data).id === contractId) {
    return { ok: false, error: { message: 'Active contracts cannot be deleted.' } };
  }

  const removeResult = await deleteById(contractId);

  if (removeResult.error || !removeResult.data) {
    return {
      ok: false,
      error: { message: removeResult.error?.message ?? 'Failed to delete contract', code: removeResult.error?.code },
    };
  }

  await refreshBilling(subjectId);

  return { ok: true, data: { id: removeResult.data.id } };
}
