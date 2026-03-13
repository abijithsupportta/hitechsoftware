import type { ServiceResult } from '@/types/common.types';
import type {
  CreateCustomerInput,
  Customer,
  CustomerFilters,
  CustomerListResponse,
  UpdateCustomerInput,
} from '@/modules/customers/customer.types';
import {
  createCustomerSchema,
  updateCustomerSchema,
} from '@/modules/customers/customer.validation';
import {
  CUSTOMER_DEFAULT_PAGE_SIZE,
} from '@/modules/customers/customer.constants';
import {
  create,
  findAll,
  findById,
  findByPhone,
  hasActiveSubjects,
  destroy,
  update,
} from '@/repositories/customer.repository';

function normalizePhoneNumber(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }

  if (digits.length === 10) {
    return digits;
  }

  return digits;
}

function toTitleCase(input: string) {
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function mapCustomerRepositoryError(message?: string, code?: string) {
  const safeMessage = message?.trim() ?? 'Failed to save customer';

  // Postgres unique_violation — phone_number has a UNIQUE constraint.
  if (code === '23505' || /duplicate key.*phone_number/i.test(safeMessage)) {
    return 'A customer with this phone number already exists.';
  }

  if (/null value.*address/i.test(safeMessage)) {
    return 'Customer could not be saved because the legacy address field was missing. The app will now keep the old and new address fields in sync.';
  }

  if (/null value.*city/i.test(safeMessage)) {
    return 'Customer could not be saved because the city field was rejected by the database. Please retry with a valid city.';
  }

  if (/column .*primary_/i.test(safeMessage) || /does not exist/i.test(safeMessage)) {
    return 'Customer schema is outdated in Supabase. Run the latest customer migration before creating or editing customers.';
  }

  return safeMessage;
}

function normalizeInput<T extends CreateCustomerInput | UpdateCustomerInput>(input: T): T {
  const normalized: T = { ...input };

  if (typeof normalized.customer_name === 'string') {
    normalized.customer_name = toTitleCase(normalized.customer_name);
  }

  if (typeof normalized.primary_city === 'string') {
    normalized.primary_city = toTitleCase(normalized.primary_city);
  }

  if (typeof normalized.secondary_city === 'string') {
    normalized.secondary_city = toTitleCase(normalized.secondary_city);
  }

  if (typeof normalized.phone_number === 'string') {
    normalized.phone_number = normalizePhoneNumber(normalized.phone_number);
  }

  return normalized;
}

export async function getCustomerList(filters: CustomerFilters): Promise<ServiceResult<CustomerListResponse>> {
  const safeFilters: CustomerFilters = {
    ...filters,
    page: filters.page && filters.page > 0 ? filters.page : 1,
    page_size: filters.page_size && filters.page_size > 0 ? filters.page_size : CUSTOMER_DEFAULT_PAGE_SIZE,
  };

  const { data, error, count, page, pageSize } = await findAll(safeFilters);

  if (error) {
    return { ok: false, error: { message: error.message, code: error.code } };
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return {
    ok: true,
    data: {
      data: data ?? [],
      total: count,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    },
  };
}

export async function getCustomerById(customerId: string): Promise<ServiceResult<Customer>> {
  const { data, error } = await findById(customerId);

  if (error || !data) {
    return {
      ok: false,
      error: { message: error?.message ?? 'Customer not found', code: error?.code },
    };
  }

  return { ok: true, data };
}

export async function createCustomer(input: CreateCustomerInput): Promise<ServiceResult<Customer>> {
  const normalizedInput = normalizeInput(input);
  const parsed = createCustomerSchema.safeParse(normalizedInput);

  if (!parsed.success) {
    return {
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? 'Invalid customer input' },
    };
  }

  // No pre-flight duplicate SELECT — the DB enforces phone_number UNIQUE.
  // Duplicate violations are caught and mapped in mapCustomerRepositoryError.
  const result = await create(parsed.data);
  if (result.error || !result.data) {
    return {
      ok: false,
      error: {
        message: mapCustomerRepositoryError(result.error?.message ?? 'Failed to create customer', result.error?.code),
        code: result.error?.code,
      },
    };
  }

  return { ok: true, data: result.data };
}

export async function updateCustomer(
  customerId: string,
  input: UpdateCustomerInput,
): Promise<ServiceResult<Customer>> {
  const normalizedInput = normalizeInput(input);
  const parsed = updateCustomerSchema.safeParse(normalizedInput);

  if (!parsed.success) {
    return {
      ok: false,
      error: { message: parsed.error.issues[0]?.message ?? 'Invalid customer update input' },
    };
  }

  const existing = await findById(customerId);
  if (existing.error || !existing.data) {
    return {
      ok: false,
      error: { message: existing.error?.message ?? 'Customer not found', code: existing.error?.code },
    };
  }

  // Duplicate phone check delegated to the DB UNIQUE constraint;
  // the error is mapped in mapCustomerRepositoryError below.

  const result = await update(customerId, parsed.data);

  if (result.error || !result.data) {
    return {
      ok: false,
      error: {
        message: mapCustomerRepositoryError(result.error?.message ?? 'Failed to update customer', result.error?.code),
        code: result.error?.code,
      },
    };
  }

  return { ok: true, data: result.data };
}

export async function deleteCustomer(customerId: string): Promise<ServiceResult<{ id: string }>> {
  const subjectCheck = await hasActiveSubjects(customerId);

  if (subjectCheck.error) {
    return {
      ok: false,
      error: { message: subjectCheck.error.message, code: subjectCheck.error.code },
    };
  }

  if (subjectCheck.data) {
    return {
      ok: false,
      error: { message: 'Delete blocked: this customer has active subjects.' },
    };
  }

  const result = await destroy(customerId);
  if (result.error || !result.data) {
    return {
      ok: false,
      error: {
        message: result.error?.message ?? 'Customer could not be deleted. It may have already been deleted or you may not have permission.',
        code: result.error?.code,
      },
    };
  }

  return { ok: true, data: { id: customerId } };
}

export async function lookupCustomerByPhone(
  phone: string,
): Promise<ServiceResult<{ id: string; customer_name: string; phone_number: string; customer_address: string } | null>> {
  const normalizedPhone = normalizePhoneNumber(phone.trim());
  if (!normalizedPhone) {
    return { ok: true, data: null };
  }

  const result = await findByPhone(normalizedPhone);
  if (result.error) {
    return { ok: false, error: { message: result.error.message, code: result.error.code } };
  }

  if (!result.data) {
    return { ok: true, data: null };
  }

  const addr = [result.data.primary_address_line1, result.data.primary_address_line2, result.data.primary_area, result.data.primary_city]
    .filter(Boolean)
    .join(', ');

  return {
    ok: true,
    data: {
      id: result.data.id,
      customer_name: result.data.customer_name,
      phone_number: result.data.phone_number,
      customer_address: addr,
    },
  };
}
