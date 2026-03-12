export type SubjectStatus =
  | 'PENDING'
  | 'ALLOCATED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'INCOMPLETE'
  | 'AWAITING_PARTS'
  | 'RESCHEDULED';

export type SubjectJobType = 'IN_WARRANTY' | 'OUT_OF_WARRANTY' | 'AMC';

export type SubjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Subject {
  id: string;
  subject_number: string;
  customer_id: string;
  product_id: string | null;
  assigned_technician_id: string | null;
  status: SubjectStatus;
  job_type: SubjectJobType;
  description: string;
  complaint_details: string | null;
  serial_number: string | null;
  schedule_date: string | null;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
  product_display?: string;
}

export interface SubjectListFilters {
  search?: string;
  page?: number;
  page_size?: number;
}

export interface SubjectListResponse {
  data: Subject[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateSubjectInput {
  subject_number: string;
  customer_id: string;
  product_id?: string;
  assigned_technician_id?: string;
  job_type: SubjectJobType;
  description: string;
  priority: SubjectPriority;
  complaint_details?: string;
  serial_number?: string;
  schedule_date?: string;
  created_by: string;
}

export interface SmartCreateSubjectInput {
  subject_number: string;
  phone_number: string;
  customer_id?: string;
  new_customer?: {
    customer_name: string;
    email?: string;
    primary_address_line1: string;
    primary_address_line2?: string;
    primary_area: string;
    primary_city: string;
    primary_postal_code: string;
  };
  product_id?: string;
  assigned_technician_id: string;
  job_type: SubjectJobType;
  description: string;
  priority: SubjectPriority;
  complaint_details?: string;
  serial_number?: string;
  schedule_date?: string;
  created_by: string;
}

export interface SubjectHistoryItem {
  id: string;
  subject_number: string;
  status: SubjectStatus;
  description: string;
  created_at: string;
  schedule_date: string | null;
  product_display: string | null;
}

export interface PreviousProductOption {
  product_id: string | null;
  product_name: string;
  brand_name: string;
  model_number: string | null;
  serial_number: string | null;
  last_service_at: string;
}

export interface CustomerLookupProfile {
  id: string;
  customer_name: string;
  phone_number: string;
  primary_address_line1: string;
  primary_address_line2: string | null;
  primary_area: string;
  primary_city: string;
  primary_postal_code: string;
}

export interface PhoneLookupResult {
  phone_number: string;
  customer: CustomerLookupProfile | null;
  previous_products: PreviousProductOption[];
  service_history: SubjectHistoryItem[];
}

export interface AssignableTechnician {
  id: string;
  technician_code: string;
  display_name: string;
}

export interface ProductOption {
  id: string;
  product_name: string;
  brand_name: string;
  model_number: string | null;
}
