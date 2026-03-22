export const PRODUCT_QUERY_KEYS = {
  all: ['products'] as const,
  list: (filters?: object) => ['products', 'list', filters] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
} as const;
