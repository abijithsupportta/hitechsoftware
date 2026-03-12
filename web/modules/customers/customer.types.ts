export interface Customer {
  id: string;
  customer_name: string;
  phone_number: string;
  email: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  primary_address_line1: string;
  primary_address_line2: string | null;
  primary_area: string;
  primary_city: string;
  primary_postal_code: string;
  secondary_address_label: string | null;
  secondary_address_line1: string | null;
  secondary_address_line2: string | null;
  secondary_area: string | null;
  secondary_city: string | null;
  secondary_postal_code: string | null;
}

export interface CreateCustomerInput {
  customer_name: string;
  phone_number: string;
  email?: string;
  is_active?: boolean;
  primary_address_line1: string;
  primary_address_line2?: string;
  primary_area: string;
  primary_city: string;
  primary_postal_code: string;
  secondary_address_label?: string;
  secondary_address_line1?: string;
  secondary_address_line2?: string;
  secondary_area?: string;
  secondary_city?: string;
  secondary_postal_code?: string;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  is_active?: boolean;
}

export interface CustomerFilters {
  search?: string;
  area?: string;
  city?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface CustomerListResponse {
  data: Customer[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
