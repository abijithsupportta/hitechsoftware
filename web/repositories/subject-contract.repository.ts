import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export async function findBySubjectId(subjectId: string) {
  return supabase
    .from('subject_contracts')
    .select('id,subject_id,contract_name,start_date,duration_months,end_date,is_custom_duration,status,created_by,created_at,updated_at')
    .eq('subject_id', subjectId)
    .order('start_date', { ascending: true });
}

export async function getLastContract(subjectId: string) {
  return supabase
    .from('subject_contracts')
    .select('id,subject_id,contract_name,start_date,duration_months,end_date,is_custom_duration,status,created_by,created_at,updated_at')
    .eq('subject_id', subjectId)
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function getActiveContract(subjectId: string) {
  const today = new Date().toISOString().split('T')[0];

  return supabase
    .from('subject_contracts')
    .select('id,subject_id,contract_name,start_date,duration_months,end_date,is_custom_duration,status,created_by,created_at,updated_at')
    .eq('subject_id', subjectId)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function create(input: {
  subject_id: string;
  contract_name: string;
  start_date: string;
  duration_months: number | null;
  end_date: string;
  is_custom_duration: boolean;
  created_by: string;
}) {
  return supabase
    .from('subject_contracts')
    .insert(input)
    .select('id,subject_id,contract_name,start_date,duration_months,end_date,is_custom_duration,status,created_by,created_at,updated_at')
    .single();
}

export async function update(id: string, input: {
  contract_name: string;
  start_date: string;
  duration_months: number | null;
  end_date: string;
  is_custom_duration: boolean;
}) {
  return supabase
    .from('subject_contracts')
    .update(input)
    .eq('id', id)
    .select('id,subject_id,contract_name,start_date,duration_months,end_date,is_custom_duration,status,created_by,created_at,updated_at')
    .single();
}

export async function deleteById(id: string) {
  return supabase
    .from('subject_contracts')
    .delete()
    .eq('id', id)
    .select('id')
    .single<{ id: string }>();
}

export { deleteById as delete };
