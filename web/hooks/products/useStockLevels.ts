/**
 * @file useStockLevels.ts
 * @module hooks/products
 *
 * @description
 * React Query hook for fetching current stock levels from the
 * `current_stock_levels` database view.
 */
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface StockLevel {
  product_id: string;
  material_code: string;
  product_name: string;
  category_id: string | null;
  product_type_id: string | null;
  minimum_stock_level: number;
  total_received: number;
  current_quantity: number;
  last_received_date: string | null;
  latest_purchase_price: number | null;
  weighted_average_cost: number | null;
  mrp: number | null;
  total_stock_value: number | null;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

const supabase = createClient();

async function fetchStockLevels() {
  const { data, error } = await supabase
    .from('current_stock_levels')
    .select('*')
    .returns<StockLevel[]>();

  if (error) throw error;
  return data ?? [];
}

export function useStockLevels() {
  return useQuery({
    queryKey: ['stock-levels'],
    queryFn: fetchStockLevels,
  });
}
