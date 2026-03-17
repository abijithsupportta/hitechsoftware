import type { WarrantyPeriod } from '@/modules/subjects/subject.types';

export type { WarrantyPeriod };

export interface SubjectContract {
  id: string;
  subject_id: string;
  contract_name: string;
  start_date: string;
  duration_months: number | null;
  end_date: string;
  is_custom_duration: boolean;
  status: 'active' | 'upcoming' | 'expired';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContractInput {
  subject_id: string;
  contract_name: string;
  start_date: string;
  duration_period: WarrantyPeriod;
  end_date?: string;
  created_by: string;
}

export interface UpdateContractInput {
  id: string;
  subject_id: string;
  contract_name: string;
  start_date: string;
  duration_period: WarrantyPeriod;
  end_date?: string;
}
