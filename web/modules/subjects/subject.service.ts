import { createCustomer } from '@/modules/customers/customer.service';
import {
  createSubject,
  findCustomerByPhone,
  listAssignableTechnicians,
  listCustomerSubjectHistory,
  listProductsCatalog,
  listSubjects,
} from '@/repositories/subject.repository';
import type { ServiceResult } from '@/types/common.types';
import type {
  AssignableTechnician,
  PhoneLookupResult,
  PreviousProductOption,
  ProductOption,
  SmartCreateSubjectInput,
  Subject,
  SubjectHistoryItem,
  SubjectListFilters,
  SubjectListResponse,
} from '@/modules/subjects/subject.types';
import { createSubjectSchema, smartCreateSubjectSchema, subjectLookupPhoneSchema } from '@/modules/subjects/subject.validation';
import { SUBJECT_DEFAULT_PAGE_SIZE } from '@/modules/subjects/subject.constants';

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

function normalizeOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function normalizeTicketNumber(value: string) {
  return value.trim().toUpperCase();
}

function formatProductDisplay(product?: { brand_name?: string | null; product_name?: string | null; model_number?: string | null }) {
  if (!product) {
    return null;
  }

  return [product.brand_name, product.product_name, product.model_number].filter(Boolean).join(' ');
}

function mapRepositoryError(message?: string, code?: string) {
  const safeMessage = message?.trim() ?? 'Failed to process subject request';

  if (code === '23505' || /duplicate key.*subject_number/i.test(safeMessage)) {
    return 'Ticket ID already exists. Use a different ticket ID.';
  }

  if (/violates foreign key constraint/i.test(safeMessage) && /assigned_technician_id/i.test(safeMessage)) {
    return 'Selected technician is invalid or inactive.';
  }

  return safeMessage;
}

function buildComplaintDetails(priority: string, complaintDetails?: string) {
  const details = complaintDetails?.trim();
  return details ? `Priority: ${priority}\n${details}` : `Priority: ${priority}`;
}

function mapRawSubjectList(data: unknown[]): Subject[] {
  return data.map((row) => {
    const typed = row as {
      id: string;
      subject_number: string;
      customer_id: string;
      product_id: string | null;
      assigned_technician_id: string | null;
      status: Subject['status'];
      job_type: Subject['job_type'];
      description: string;
      complaint_details: string | null;
      serial_number: string | null;
      schedule_date: string | null;
      created_at: string;
      customers?: { customer_name?: string; phone_number?: string } | null;
      products?: { brand_name?: string | null; product_name?: string | null; model_number?: string | null } | null;
    };

    return {
      id: typed.id,
      subject_number: typed.subject_number,
      customer_id: typed.customer_id,
      product_id: typed.product_id,
      assigned_technician_id: typed.assigned_technician_id,
      status: typed.status,
      job_type: typed.job_type,
      description: typed.description,
      complaint_details: typed.complaint_details,
      serial_number: typed.serial_number,
      schedule_date: typed.schedule_date,
      created_at: typed.created_at,
      customer_name: typed.customers?.customer_name,
      customer_phone: typed.customers?.phone_number,
      product_display: formatProductDisplay(typed.products ?? undefined) ?? undefined,
    };
  });
}

export async function getSubjects(filters: SubjectListFilters = {}): Promise<ServiceResult<SubjectListResponse>> {
  const safeFilters: SubjectListFilters = {
    ...filters,
    page: filters.page && filters.page > 0 ? filters.page : 1,
    page_size: filters.page_size && filters.page_size > 0 ? filters.page_size : SUBJECT_DEFAULT_PAGE_SIZE,
  };

  const { data, error, count, page, pageSize } = await listSubjects(safeFilters);

  if (error) {
    return { ok: false, error: { message: error.message, code: error.code } };
  }

  const subjects = mapRawSubjectList((data ?? []) as unknown[]);

  return {
    ok: true,
    data: {
      data: subjects,
      total: count,
      page,
      page_size: pageSize,
      total_pages: Math.max(1, Math.ceil(count / pageSize)),
    },
  };
}

export async function lookupCustomerContextByPhone(phoneNumber: string): Promise<ServiceResult<PhoneLookupResult>> {
  const parsedPhone = subjectLookupPhoneSchema.safeParse(phoneNumber);
  if (!parsedPhone.success) {
    return {
      ok: false,
      error: { message: parsedPhone.error.issues[0]?.message ?? 'Invalid phone number' },
    };
  }

  const normalizedPhone = normalizePhoneNumber(parsedPhone.data);
  const customerResult = await findCustomerByPhone(normalizedPhone);

  if (customerResult.error) {
    return { ok: false, error: { message: customerResult.error.message, code: customerResult.error.code } };
  }

  if (!customerResult.data) {
    return {
      ok: true,
      data: {
        phone_number: normalizedPhone,
        customer: null,
        previous_products: [],
        service_history: [],
      },
    };
  }

  const historyResult = await listCustomerSubjectHistory(customerResult.data.id, 8);
  if (historyResult.error) {
    return { ok: false, error: { message: historyResult.error.message, code: historyResult.error.code } };
  }

  const historyRows = (historyResult.data ?? []) as Array<{
    id: string;
    subject_number: string;
    status: SubjectHistoryItem['status'];
    description: string;
    created_at: string;
    schedule_date: string | null;
    serial_number: string | null;
    product_id: string | null;
    products?: { brand_name?: string | null; product_name?: string | null; model_number?: string | null } | null;
  }>;

  const serviceHistory: SubjectHistoryItem[] = historyRows.map((row) => ({
    id: row.id,
    subject_number: row.subject_number,
    status: row.status,
    description: row.description,
    created_at: row.created_at,
    schedule_date: row.schedule_date,
    product_display: formatProductDisplay(row.products ?? undefined),
  }));

  const seen = new Set<string>();
  const previousProducts: PreviousProductOption[] = [];

  for (const row of historyRows) {
    const productDisplay = row.products ?? {};
    const key = `${row.product_id ?? 'none'}:${row.serial_number ?? 'none'}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const productName = productDisplay.product_name ?? 'Unknown Product';
    const brandName = productDisplay.brand_name ?? 'Unknown Brand';

    previousProducts.push({
      product_id: row.product_id,
      product_name: productName,
      brand_name: brandName,
      model_number: productDisplay.model_number ?? null,
      serial_number: row.serial_number ?? null,
      last_service_at: row.created_at,
    });
  }

  return {
    ok: true,
    data: {
      phone_number: normalizedPhone,
      customer: {
        id: customerResult.data.id,
        customer_name: customerResult.data.customer_name,
        phone_number: customerResult.data.phone_number,
        primary_address_line1: customerResult.data.primary_address_line1,
        primary_address_line2: customerResult.data.primary_address_line2,
        primary_area: customerResult.data.primary_area,
        primary_city: customerResult.data.primary_city,
        primary_postal_code: customerResult.data.primary_postal_code,
      },
      previous_products: previousProducts,
      service_history: serviceHistory,
    },
  };
}

export async function getAssignableTechnicians(): Promise<ServiceResult<AssignableTechnician[]>> {
  const { data, error } = await listAssignableTechnicians();

  if (error) {
    return { ok: false, error: { message: error.message, code: error.code } };
  }

  return { ok: true, data: data as AssignableTechnician[] };
}

export async function getProductsCatalog(): Promise<ServiceResult<ProductOption[]>> {
  const { data, error } = await listProductsCatalog(120);

  if (error) {
    return { ok: false, error: { message: error.message, code: error.code } };
  }

  return { ok: true, data: (data ?? []) as ProductOption[] };
}

export async function createSubjectTicket(input: SmartCreateSubjectInput): Promise<ServiceResult<Subject>> {
  const parsed = smartCreateSubjectSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: { message: parsed.error.issues[0]?.message ?? 'Invalid ticket data' } };
  }

  const normalizedPhone = normalizePhoneNumber(parsed.data.phone_number);
  let customerId = parsed.data.customer_id;

  if (!customerId) {
    if (!parsed.data.new_customer) {
      return { ok: false, error: { message: 'Customer details are required for new phone number.' } };
    }

    const createCustomerResult = await createCustomer({
      customer_name: parsed.data.new_customer.customer_name,
      phone_number: normalizedPhone,
      email: normalizeOptional(parsed.data.new_customer.email),
      primary_address_line1: parsed.data.new_customer.primary_address_line1,
      primary_address_line2: normalizeOptional(parsed.data.new_customer.primary_address_line2),
      primary_area: parsed.data.new_customer.primary_area,
      primary_city: parsed.data.new_customer.primary_city,
      primary_postal_code: parsed.data.new_customer.primary_postal_code,
      is_active: true,
    });

    if (!createCustomerResult.ok) {
      return { ok: false, error: { message: createCustomerResult.error.message, code: createCustomerResult.error.code } };
    }

    customerId = createCustomerResult.data.id;
  }

  const createPayload = {
    subject_number: normalizeTicketNumber(parsed.data.subject_number),
    customer_id: customerId,
    product_id: normalizeOptional(parsed.data.product_id),
    assigned_technician_id: normalizeOptional(parsed.data.assigned_technician_id),
    job_type: parsed.data.job_type,
    description: parsed.data.description.trim(),
    priority: parsed.data.priority,
    complaint_details: buildComplaintDetails(parsed.data.priority, parsed.data.complaint_details),
    serial_number: normalizeOptional(parsed.data.serial_number),
    schedule_date: normalizeOptional(parsed.data.schedule_date),
    created_by: parsed.data.created_by,
  };

  const payloadValidation = createSubjectSchema.safeParse(createPayload);
  if (!payloadValidation.success) {
    return { ok: false, error: { message: payloadValidation.error.issues[0]?.message ?? 'Invalid ticket data' } };
  }

  const result = await createSubject(payloadValidation.data);

  if (result.error || !result.data) {
    return {
      ok: false,
      error: { message: mapRepositoryError(result.error?.message, result.error?.code), code: result.error?.code },
    };
  }

  return {
    ok: true,
    data: {
      ...result.data,
      customer_name: undefined,
      customer_phone: undefined,
      product_display: undefined,
    } as Subject,
  };
}
