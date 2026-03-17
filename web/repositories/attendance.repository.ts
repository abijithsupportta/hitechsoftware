import { createClient } from '@/lib/supabase/client';
import type { AttendanceLog } from '@/modules/attendance/attendance.types';

const supabase = createClient();

export interface TechnicianProfileRow {
  id: string;
  display_name: string;
  email: string;
  phone_number: string | null;
  role: 'technician';
  is_online: boolean;
}

export interface SubjectAssignmentRow {
  id: string;
  subject_number: string;
  technician_allocated_date: string | null;
}

export async function getAttendanceLogByTechnicianAndDate(technicianId: string, date: string) {
  return supabase
    .from('attendance_logs')
    .select('id,technician_id,date,toggled_on_at,toggled_off_at,is_present,auto_offed_at,created_at,updated_at')
    .eq('technician_id', technicianId)
    .eq('date', date)
    .maybeSingle<AttendanceLog>();
}

export async function listAttendanceLogsByTechnicianAndRange(technicianId: string, fromDate: string, toDate: string) {
  return supabase
    .from('attendance_logs')
    .select('id,technician_id,date,toggled_on_at,toggled_off_at,is_present,auto_offed_at,created_at,updated_at')
    .eq('technician_id', technicianId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: true });
}

export async function listAttendanceLogsByDate(date: string) {
  return supabase
    .from('attendance_logs')
    .select('id,technician_id,date,toggled_on_at,toggled_off_at,is_present,auto_offed_at,created_at,updated_at')
    .eq('date', date);
}

export async function createAttendanceLog(input: {
  technician_id: string;
  date: string;
  toggled_on_at?: string | null;
  toggled_off_at?: string | null;
  is_present: boolean;
  auto_offed_at?: string | null;
}) {
  return supabase
    .from('attendance_logs')
    .insert(input)
    .select('id,technician_id,date,toggled_on_at,toggled_off_at,is_present,auto_offed_at,created_at,updated_at')
    .single<AttendanceLog>();
}

export async function updateAttendanceLog(logId: string, updates: Partial<Pick<AttendanceLog, 'toggled_on_at' | 'toggled_off_at' | 'is_present' | 'auto_offed_at'>>) {
  return supabase
    .from('attendance_logs')
    .update(updates)
    .eq('id', logId)
    .select('id,technician_id,date,toggled_on_at,toggled_off_at,is_present,auto_offed_at,created_at,updated_at')
    .single<AttendanceLog>();
}

export async function setTechnicianOnlineStatus(technicianId: string, isOnline: boolean) {
  return supabase
    .from('profiles')
    .update({ is_online: isOnline })
    .eq('id', technicianId)
    .eq('role', 'technician')
    .eq('is_deleted', false)
    .select('id,is_online')
    .single<{ id: string; is_online: boolean }>();
}

export async function listTechnicianProfiles() {
  return supabase
    .from('profiles')
    .select('id,display_name,email,phone_number,role,is_online')
    .eq('role', 'technician')
    .eq('is_deleted', false)
    .eq('is_active', true)
    .order('display_name', { ascending: true });
}

export async function listSubjectAssignmentsForTechnicianInRange(technicianId: string, fromDate: string, toDate: string) {
  return supabase
    .from('subjects')
    .select('id,subject_number,technician_allocated_date')
    .eq('assigned_technician_id', technicianId)
    .eq('is_deleted', false)
    .gte('technician_allocated_date', fromDate)
    .lte('technician_allocated_date', toDate)
    .order('technician_allocated_date', { ascending: true });
}

export async function listSubjectAssignmentsByDate(technicianId: string, date: string) {
  return supabase
    .from('subjects')
    .select('id,subject_number,technician_allocated_date')
    .eq('assigned_technician_id', technicianId)
    .eq('is_deleted', false)
    .eq('technician_allocated_date', date)
    .order('created_at', { ascending: true });
}

export async function listOfficeStaffRecipients() {
  return supabase
    .from('profiles')
    .select('id,display_name,phone_number')
    .in('role', ['office_staff', 'super_admin'])
    .eq('is_deleted', false)
    .eq('is_active', true);
}

export async function createOfficeNotification(input: {
  recipient_phone: string;
  recipient_name: string;
  message: string;
  reference_id?: string;
}) {
  return supabase
    .from('notifications')
    .insert({
      recipient_phone: input.recipient_phone,
      recipient_name: input.recipient_name,
      notification_type: 'ATTENDANCE_ABSENT_FLAG',
      message: input.message,
      status: 'PENDING',
      reference_type: 'attendance',
      reference_id: input.reference_id ?? null,
    });
}
