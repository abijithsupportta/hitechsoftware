import type { ServiceResult } from '@/types/common.types';
import {
  createProduct,
  findProductById,
  listProducts,
  softDeleteProduct,
  updateProduct,
} from '@/repositories/products.repository';
import type { CreateProductInput, Product, ProductFilters, ProductListResponse, UpdateProductInput } from './product.types';
import { createProductSchema, updateProductSchema } from './product.validation';

const PAGE_SIZE = 20;

function mapError(message?: string): string {
  const safe = message?.trim() ?? 'Failed to process product';
  if (/duplicate key|unique/i.test(safe)) return 'A product with this material code already exists.';
  return safe;
}

export async function getProducts(filters: ProductFilters = {}): Promise<ServiceResult<ProductListResponse>> {
  const page = filters.page ?? 1;
  const page_size = filters.page_size ?? PAGE_SIZE;

  const result = await listProducts({ ...filters, page, page_size });
  if (result.error) return { ok: false, error: { message: result.error.message, code: result.error.code } };

  const total = result.count ?? 0;
  return {
    ok: true,
    data: {
      data: result.data ?? [],
      total,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    },
  };
}

export async function getProduct(id: string): Promise<ServiceResult<Product>> {
  const result = await findProductById(id);
  if (result.error || !result.data) {
    return { ok: false, error: { message: result.error?.message ?? 'Product not found', code: result.error?.code } };
  }
  return { ok: true, data: result.data };
}

export async function addProduct(input: CreateProductInput): Promise<ServiceResult<Product>> {
  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { message: parsed.error.issues[0]?.message ?? 'Invalid input' } };
  }

  const result = await createProduct(parsed.data);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message), code: result.error?.code } };
  }
  return { ok: true, data: result.data };
}

export async function editProduct(id: string, input: UpdateProductInput): Promise<ServiceResult<Product>> {
  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: { message: parsed.error.issues[0]?.message ?? 'Invalid input' } };
  }

  const result = await updateProduct(id, parsed.data);
  if (result.error || !result.data) {
    return { ok: false, error: { message: mapError(result.error?.message), code: result.error?.code } };
  }
  return { ok: true, data: result.data };
}

export async function removeProduct(id: string): Promise<ServiceResult<{ id: string }>> {
  const result = await softDeleteProduct(id);
  if (result.error || !result.data) {
    return {
      ok: false,
      error: { message: result.error?.message ?? 'Failed to delete product', code: result.error?.code },
    };
  }
  return { ok: true, data: result.data };
}
