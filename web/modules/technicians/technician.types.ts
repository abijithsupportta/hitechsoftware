import type { UserRole } from '@/types/database.types';

export interface TechnicianDetail {
  id: string;
  technician_code: string;
  qualification: string | null;
  experience_years: number | null;
  daily_subject_limit: number;
  digital_bag_capacity: number;
  total_rejections: number;
  is_active: boolean;
  is_deleted: boolean;
}

export interface AssignableTechnicianOption {
  id: string;
  display_name: string;
  technician_code: string;
}

export interface TeamMember {
  id: string;
  email: string;
  display_name: string;
  phone_number: string | null;
  role: UserRole;
  is_active: boolean;
  is_online?: boolean;
  is_deleted: boolean;
  created_at?: string;
  updated_at?: string;
  technician: TechnicianDetail | null;
}

export interface TeamFilters {
  role?: UserRole | 'all';
  search?: string;
}

export interface CreateTeamMemberInput {
  email: string;
  password: string;
  display_name: string;
  phone_number?: string;
  role: UserRole;
  is_active?: boolean;
  technician?: {
    technician_code: string;
    qualification?: string;
    experience_years?: number;
    daily_subject_limit?: number;
    digital_bag_capacity?: number;
  };
}

export interface UpdateTeamMemberInput {
  display_name?: string;
  phone_number?: string;
  role?: UserRole;
  is_active?: boolean;
  technician?: {
    technician_code?: string;
    qualification?: string;
    experience_years?: number;
    daily_subject_limit?: number;
    digital_bag_capacity?: number;
    is_active?: boolean;
    is_deleted?: boolean;
  };
}
