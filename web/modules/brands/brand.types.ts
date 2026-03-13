export interface Brand {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBrandInput {
  name: string;
}

export interface UpdateBrandInput {
  name?: string;
  is_active?: boolean;
}
