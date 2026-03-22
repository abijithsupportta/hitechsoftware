export interface ProductType {
  id: string;
  name: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductTypeInput {
  name: string;
}

export interface UpdateProductTypeInput {
  name?: string;
  is_active?: boolean;
}
