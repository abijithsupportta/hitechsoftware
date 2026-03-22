import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface ProductRow {
  id: string;
  product_name: string;
  description: string | null;
  material_code: string;
  category_id: string | null;
  product_type_id: string | null;
  is_refurbished: boolean;
  refurbished_label: string | null;
  hsn_sac_code: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithRelations extends ProductRow {
  category: { id: string; name: string } | null;
  product_type: { id: string; name: string } | null;
}

export interface CreateProductInput {
  product_name: string;
  description?: string | null;
  material_code: string;
  category_id?: string | null;
  product_type_id?: string | null;
  is_refurbished?: boolean;
  refurbished_label?: string | null;
  hsn_sac_code?: string | null;
  is_active?: boolean;
}

export interface ProductFilters {
  search?: string;
  category_id?: string;
  product_type_id?: string;
  is_active?: boolean;
  is_refurbished?: boolean;
  page?: number;
  page_size?: number;
}

const SELECT_COLS = `
  id,product_name,description,material_code,
  category_id,product_type_id,
  is_refurbished,refurbished_label,hsn_sac_code,
  is_active,is_deleted,created_at,updated_at,
  category:product_categories(id,name),
  product_type:product_types(id,name)
`.trim();

export async function listProducts(filters: ProductFilters = {}) {
  const { search, category_id, product_type_id, is_active, is_refurbished, page = 1, page_size = 20 } = filters;
  const from = (page - 1) * page_size;
  const to = from + page_size - 1;

  let query = supabase
    .from('products')
    .select(SELECT_COLS, { count: 'exact' })
    .eq('is_deleted', false)
    .order('product_name', { ascending: true })
    .range(from, to);

  if (search) {
    query = query.or(
      `product_name.ilike.%${search}%,material_code.ilike.%${search}%,hsn_sac_code.ilike.%${search}%`,
    );
  }
  if (category_id) query = query.eq('category_id', category_id);
  if (product_type_id) query = query.eq('product_type_id', product_type_id);
  if (is_active !== undefined) query = query.eq('is_active', is_active);
  if (is_refurbished !== undefined) query = query.eq('is_refurbished', is_refurbished);

  return query.returns<ProductWithRelations[]>();
}

export async function findProductById(id: string) {
  return supabase
    .from('products')
    .select(SELECT_COLS)
    .eq('id', id)
    .eq('is_deleted', false)
    .single<ProductWithRelations>();
}

export async function findProductByMaterialCode(materialCode: string) {
  return supabase
    .from('products')
    .select(SELECT_COLS)
    .eq('is_deleted', false)
    .ilike('material_code', materialCode)
    .maybeSingle<ProductWithRelations>();
}

export async function createProduct(input: CreateProductInput) {
  return supabase
    .from('products')
    .insert({
      product_name: input.product_name.trim(),
      description: input.description?.trim() ?? null,
      material_code: input.material_code.trim().toUpperCase(),
      category_id: input.category_id ?? null,
      product_type_id: input.product_type_id ?? null,
      is_refurbished: input.is_refurbished ?? false,
      refurbished_label: input.is_refurbished ? (input.refurbished_label?.trim() ?? null) : null,
      hsn_sac_code: input.hsn_sac_code?.trim() ?? null,
      is_active: input.is_active ?? true,
    })
    .select(SELECT_COLS)
    .single<ProductWithRelations>();
}

export async function updateProduct(id: string, input: Partial<CreateProductInput>) {
  const payload: Record<string, unknown> = {};
  if (input.product_name !== undefined) payload.product_name = input.product_name.trim();
  if (input.description !== undefined) payload.description = input.description?.trim() ?? null;
  if (input.material_code !== undefined) payload.material_code = input.material_code.trim().toUpperCase();
  if (input.category_id !== undefined) payload.category_id = input.category_id ?? null;
  if (input.product_type_id !== undefined) payload.product_type_id = input.product_type_id ?? null;
  if (input.is_refurbished !== undefined) {
    payload.is_refurbished = input.is_refurbished;
    if (!input.is_refurbished) payload.refurbished_label = null;
  }
  if (input.refurbished_label !== undefined) payload.refurbished_label = input.refurbished_label?.trim() ?? null;
  if (input.hsn_sac_code !== undefined) payload.hsn_sac_code = input.hsn_sac_code?.trim() ?? null;
  if (input.is_active !== undefined) payload.is_active = input.is_active;

  return supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .eq('is_deleted', false)
    .select(SELECT_COLS)
    .single<ProductWithRelations>();
}

export async function softDeleteProduct(id: string) {
  return supabase
    .from('products')
    .update({ is_deleted: true, is_active: false })
    .eq('id', id)
    .select('id')
    .single<{ id: string }>();
}
