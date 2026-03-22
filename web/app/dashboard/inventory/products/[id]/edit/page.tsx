'use client';

import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useProduct } from '@/hooks/products/useProduct';
import { useProducts } from '@/hooks/products/useProducts';
import { usePermission } from '@/hooks/auth/usePermission';
import { ProductForm } from '@/components/inventory/ProductForm';
import { ROUTES } from '@/lib/constants/routes';
import type { CreateProductFormValues } from '@/modules/products/product.validation';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = usePermission();
  const { product, isLoading, error } = useProduct(params.id);
  const { updateMutation } = useProducts();

  if (!can('inventory:edit')) {
    return (
      <div className="p-6 text-sm text-rose-600">
        You do not have permission to edit products.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-2xl space-y-4 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-6 text-sm text-rose-600">{error ?? 'Product not found.'}</div>
    );
  }

  const handleSubmit = async (values: CreateProductFormValues) => {
    const result = await updateMutation.mutateAsync({ id: params.id, ...values });
    if (result.ok) {
      router.push(ROUTES.DASHBOARD_INVENTORY_PRODUCTS);
    }
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center gap-3">
        <Link
          href={ROUTES.DASHBOARD_INVENTORY_PRODUCTS}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Edit Product</h1>
          <p className="mt-0.5 text-sm text-slate-500">{product.product_name}</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <ProductForm
          defaultValues={product}
          onSubmit={handleSubmit}
          isSubmitting={updateMutation.isPending}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
