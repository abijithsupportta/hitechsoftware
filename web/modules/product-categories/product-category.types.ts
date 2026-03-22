export interface ProductCategory {
  id: string;
  name: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductCategoryInput {
  name: string;
}

export interface UpdateProductCategoryInput {
  name?: string;
  is_active?: boolean;
}
