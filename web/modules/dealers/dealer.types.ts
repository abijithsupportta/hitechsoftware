export interface Dealer {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDealerInput {
  name: string;
}

export interface UpdateDealerInput {
  name?: string;
  is_active?: boolean;
}
