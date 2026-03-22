import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface ProductTypeRow {
  id: string;
  name: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export async function listProductTypes() {
  return supabase
    .from('product_types')
    .select('id,name,is_active,is_deleted,created_at,updated_at')
    .eq('is_deleted', false)
    .order('name', { ascending: true })
    .returns<ProductTypeRow[]>();
}

export async function createProductType(name: string) {
  return supabase
    .from('product_types')
    .insert({ name: name.trim(), is_active: true })
    .select('id,name,is_active,is_deleted,created_at,updated_at')
    .single<ProductTypeRow>();
}

export async function updateProductType(
  id: string,
  payload: { name?: string; is_active?: boolean },
) {
  return supabase
    .from('product_types')
    .update(payload)
    .eq('id', id)
    .eq('is_deleted', false)
    .select('id,name,is_active,is_deleted,created_at,updated_at')
    .single<ProductTypeRow>();
}

export async function softDeleteProductType(id: string) {
  return supabase
    .from('product_types')
    .update({ is_deleted: true, is_active: false })
    .eq('id', id)
    .select('id')
    .single<{ id: string }>();
}

export async function hasProductsByType(typeId: string) {
  const result = await supabase
    .from('products')
    .select('id')
    .eq('product_type_id', typeId)
    .eq('is_deleted', false)
    .limit(1);
  return { data: (result.data ?? []).length > 0, error: result.error };
}
