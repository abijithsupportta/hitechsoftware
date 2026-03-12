import { createClient } from '@/lib/supabase/client';
import type { CreateSubjectInput, SubjectListFilters } from '@/modules/subjects/subject.types';
import type { Customer } from '@/modules/customers/customer.types';

const supabase = createClient();

export async function listSubjects(filters: SubjectListFilters) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.page_size && filters.page_size > 0 ? filters.page_size : 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('subjects')
    .select(
      `
      id,
      subject_number,
      customer_id,
      product_id,
      assigned_technician_id,
      status,
      job_type,
      description,
      complaint_details,
      serial_number,
      schedule_date,
      created_at,
      customers:customer_id(customer_name,phone_number),
      products:product_id(product_name,brand_name,model_number)
      `,
      { count: 'exact' },
    )
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (filters.search?.trim()) {
    const escaped = filters.search.trim().replaceAll(',', ' ');
    query = query.or(`subject_number.ilike.%${escaped}%,description.ilike.%${escaped}%`);
  }

  const result = await query.range(from, to);

  return {
    data: result.data,
    error: result.error,
    count: result.count ?? 0,
    page,
    pageSize,
  };
}

export async function createSubject(input: CreateSubjectInput) {
  return supabase
    .from('subjects')
    .insert({
      subject_number: input.subject_number,
      customer_id: input.customer_id,
      product_id: input.product_id ?? null,
      assigned_technician_id: input.assigned_technician_id ?? null,
      status: 'PENDING',
      job_type: input.job_type,
      description: input.description,
      complaint_details: input.complaint_details ?? null,
      serial_number: input.serial_number ?? null,
      schedule_date: input.schedule_date ?? null,
      created_by: input.created_by,
      is_active: true,
      is_deleted: false,
    })
    .select(
      'id,subject_number,customer_id,product_id,assigned_technician_id,status,job_type,description,complaint_details,serial_number,schedule_date,created_at',
    )
    .single();
}

export async function findCustomerByPhone(phoneNumber: string) {
  return supabase
    .from('customers')
    .select(
      'id,customer_name,phone_number,email,is_active,is_deleted,created_at,updated_at,deleted_at,primary_address_line1,primary_address_line2,primary_area,primary_city,primary_postal_code,secondary_address_label,secondary_address_line1,secondary_address_line2,secondary_area,secondary_city,secondary_postal_code',
    )
    .eq('phone_number', phoneNumber)
    .eq('is_deleted', false)
    .maybeSingle<Customer>();
}

export async function listCustomerSubjectHistory(customerId: string, limit = 10) {
  return supabase
    .from('subjects')
    .select(
      'id,subject_number,status,description,created_at,schedule_date,serial_number,product_id,products:product_id(product_name,brand_name,model_number)',
    )
    .eq('customer_id', customerId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);
}

export async function listProductsCatalog(limit = 100) {
  return supabase
    .from('products')
    .select('id,product_name,brand_name,model_number')
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order('brand_name', { ascending: true })
    .limit(limit);
}

export async function listAssignableTechnicians() {
  const technicians = await supabase
    .from('technicians')
    .select('id,technician_code')
    .eq('is_active', true)
    .eq('is_deleted', false);

  if (technicians.error || !technicians.data || technicians.data.length === 0) {
    return {
      data: [],
      error: technicians.error,
    };
  }

  const profileIds = technicians.data.map((row) => row.id);

  const profiles = await supabase
    .from('profiles')
    .select('id,display_name,role,is_active,is_deleted')
    .in('id', profileIds)
    .eq('role', 'technician')
    .eq('is_active', true)
    .eq('is_deleted', false);

  if (profiles.error || !profiles.data) {
    return {
      data: [],
      error: profiles.error,
    };
  }

  const displayNameById = new Map(profiles.data.map((row) => [row.id, row.display_name]));

  return {
    data: technicians.data
      .filter((row) => displayNameById.has(row.id))
      .map((row) => ({
        id: row.id,
        technician_code: row.technician_code,
        display_name: displayNameById.get(row.id) ?? row.technician_code,
      })),
    error: null,
  };
}
