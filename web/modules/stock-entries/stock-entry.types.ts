export interface StockEntryItem {
  id: string;
  stock_entry_id: string;
  product_id: string | null;
  material_code: string;
  quantity: number;
  hsn_sac_code: string | null;
  created_at: string;
  product: { id: string; product_name: string; material_code: string } | null;
}

export interface StockEntry {
  id: string;
  invoice_number: string;
  entry_date: string;
  notes: string | null;
  is_deleted: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items: StockEntryItem[];
}

export interface StockEntryItemInput {
  product_id: string | null;
  material_code: string;
  quantity: number;
  hsn_sac_code?: string | null;
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

export interface StockEntryListResponse {
  data: StockEntry[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
