import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface ProductCategoryRow {
  id: string;
  name: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export async function listProductCategories() {
  return supabase
    .from('product_categories')
    .select('id,name,is_active,is_deleted,created_at,updated_at')
    .eq('is_deleted', false)
    .order('name', { ascending: true })
    .returns<ProductCategoryRow[]>();
}

export async function createProductCategory(name: string) {
  return supabase
    .from('product_categories')
    .insert({ name: name.trim(), is_active: true })
    .select('id,name,is_active,is_deleted,created_at,updated_at')
    .single<ProductCategoryRow>();
}

export async function updateProductCategory(
  id: string,
  payload: { name?: string; is_active?: boolean },
) {
  return supabase
    .from('product_categories')
    .update(payload)
    .eq('id', id)
    .eq('is_deleted', false)
    .select('id,name,is_active,is_deleted,created_at,updated_at')
    .single<ProductCategoryRow>();
}

export async function softDeleteProductCategory(id: string) {
  return supabase
    .from('product_categories')
    .update({ is_deleted: true, is_active: false })
    .eq('id', id)
    .select('id')
    .single<{ id: string }>();
}

export async function hasProductsByCategory(categoryId: string) {
  const result = await supabase
    .from('products')
    .select('id')
    .eq('category_id', categoryId)
    .eq('is_deleted', false)
    .limit(1);
  return { data: (result.data ?? []).length > 0, error: result.error };
}
