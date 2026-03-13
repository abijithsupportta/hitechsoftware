import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface MasterDataRow {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listServiceCategories() {
  return supabase
    .from('service_categories')
    .select('id,name,is_active,created_at,updated_at')
    .order('name', { ascending: true })
    .returns<MasterDataRow[]>();
}

export async function createServiceCategory(name: string) {
  return supabase
    .from('service_categories')
    .insert({ name: name.trim(), is_active: true })
    .select('id,name,is_active,created_at,updated_at')
    .single<MasterDataRow>();
}

export async function updateServiceCategory(id: string, payload: { name?: string; is_active?: boolean }) {
  return supabase
    .from('service_categories')
    .update(payload)
    .eq('id', id)
    .select('id,name,is_active,created_at,updated_at')
    .single<MasterDataRow>();
}

export async function deleteServiceCategory(id: string) {
  return supabase.from('service_categories').delete().eq('id', id).select('id').single<{ id: string }>();
}

export async function hasSubjectsByCategory(id: string) {
  const result = await supabase.from('subjects').select('id').eq('category_id', id).limit(1);
  return { data: (result.data ?? []).length > 0, error: result.error };
}
