import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface StockEntryItemInput {
  product_id: string | null;
  material_code: string;
  quantity: number;
  hsn_sac_code?: string | null;
}

export interface StockEntryItemRow {
  id: string;
  stock_entry_id: string;
  product_id: string | null;
  material_code: string;
  quantity: number;
  hsn_sac_code: string | null;
  created_at: string;
  product: { id: string; product_name: string; material_code: string } | null;
}

export interface StockEntryRow {
  id: string;
  invoice_number: string;
  entry_date: string;
  notes: string | null;
  is_deleted: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockEntryWithItems extends StockEntryRow {
  items: StockEntryItemRow[];
}

export interface CreateStockEntryInput {
  invoice_number: string;
  entry_date: string;
  notes?: string | null;
  items: StockEntryItemInput[];
}

export interface StockEntryFilters {
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export async function listStockEntries(filters: StockEntryFilters = {}) {
  const { search, date_from, date_to, page = 1, page_size = 20 } = filters;
  const from = (page - 1) * page_size;
  const to = from + page_size - 1;

  let query = supabase
    .from('stock_entries')
    .select(
      `id,invoice_number,entry_date,notes,is_deleted,created_by,created_at,updated_at,
       items:stock_entry_items(id,stock_entry_id,product_id,material_code,quantity,hsn_sac_code,created_at,product:products(id,product_name,material_code))`,
      { count: 'exact' },
    )
    .eq('is_deleted', false)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike('invoice_number', `%${search}%`);
  }
  if (date_from) query = query.gte('entry_date', date_from);
  if (date_to) query = query.lte('entry_date', date_to);

  return query.returns<StockEntryWithItems[]>();
}

export async function findStockEntryById(id: string) {
  return supabase
    .from('stock_entries')
    .select(
      `id,invoice_number,entry_date,notes,is_deleted,created_by,created_at,updated_at,
       items:stock_entry_items(id,stock_entry_id,product_id,material_code,quantity,hsn_sac_code,created_at,product:products(id,product_name,material_code))`,
    )
    .eq('id', id)
    .eq('is_deleted', false)
    .single<StockEntryWithItems>();
}

export async function createStockEntry(input: CreateStockEntryInput) {
  const { data: entry, error: entryError } = await supabase
    .from('stock_entries')
    .insert({
      invoice_number: input.invoice_number.trim(),
      entry_date: input.entry_date,
      notes: input.notes?.trim() ?? null,
    })
    .select('id,invoice_number,entry_date,notes,is_deleted,created_by,created_at,updated_at')
    .single<StockEntryRow>();

  if (entryError || !entry) {
    return { data: null, error: entryError };
  }

  const itemRows = input.items.map((item) => ({
    stock_entry_id: entry.id,
    product_id: item.product_id,
    material_code: item.material_code.trim().toUpperCase(),
    quantity: item.quantity,
    hsn_sac_code: item.hsn_sac_code?.trim() ?? null,
  }));

  const { error: itemsError } = await supabase.from('stock_entry_items').insert(itemRows);

  if (itemsError) {
    return { data: null, error: itemsError };
  }

  return findStockEntryById(entry.id);
}

export async function softDeleteStockEntry(id: string) {
  return supabase
    .from('stock_entries')
    .update({ is_deleted: true })
    .eq('id', id)
    .select('id')
    .single<{ id: string }>();
}
