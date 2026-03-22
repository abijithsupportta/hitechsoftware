export interface Product {
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

export type UpdateProductInput = Partial<CreateProductInput>;

export interface ProductFilters {
  search?: string;
  category_id?: string;
  product_type_id?: string;
  is_active?: boolean;
  is_refurbished?: boolean;
  page?: number;
  page_size?: number;
}

export interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
