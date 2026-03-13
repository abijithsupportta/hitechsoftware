import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface MasterDataRow {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listBrands() {
  return supabase.from('brands').select('id,name,is_active,created_at,updated_at').order('name').returns<MasterDataRow[]>();
}

export async function createBrand(name: string) {
  return supabase
    .from('brands')
    .insert({ name: name.trim(), is_active: true })
    .select('id,name,is_active,created_at,updated_at')
    .single<MasterDataRow>();
}

export async function updateBrand(id: string, payload: { name?: string; is_active?: boolean }) {
  return supabase
    .from('brands')
    .update(payload)
    .eq('id', id)
    .select('id,name,is_active,created_at,updated_at')
    .single<MasterDataRow>();
}

export async function deleteBrand(id: string) {
  return supabase.from('brands').delete().eq('id', id).select('id').single<{ id: string }>();
}

export async function hasSubjectsByBrand(id: string) {
  const result = await supabase.from('subjects').select('id').eq('brand_id', id).limit(1);
  return { data: (result.data ?? []).length > 0, error: result.error };
}
