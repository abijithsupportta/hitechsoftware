export interface ServiceCategory {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceCategoryInput {
  name: string;
}

export interface UpdateServiceCategoryInput {
  name?: string;
  is_active?: boolean;
}
