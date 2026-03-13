import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface MasterDataRow {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listDealers() {
  return supabase.from('dealers').select('id,name,is_active,created_at,updated_at').order('name').returns<MasterDataRow[]>();
}

export async function createDealer(name: string) {
  return supabase
    .from('dealers')
    .insert({ name: name.trim(), is_active: true })
    .select('id,name,is_active,created_at,updated_at')
    .single<MasterDataRow>();
}

export async function updateDealer(id: string, payload: { name?: string; is_active?: boolean }) {
  return supabase
    .from('dealers')
    .update(payload)
    .eq('id', id)
    .select('id,name,is_active,created_at,updated_at')
    .single<MasterDataRow>();
}

export async function deleteDealer(id: string) {
  return supabase.from('dealers').delete().eq('id', id).select('id').single<{ id: string }>();
}

export async function hasSubjectsByDealer(id: string) {
  const result = await supabase.from('subjects').select('id').eq('dealer_id', id).limit(1);
  return { data: (result.data ?? []).length > 0, error: result.error };
}
