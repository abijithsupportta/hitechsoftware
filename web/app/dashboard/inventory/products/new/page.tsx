'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useProducts } from '@/hooks/products/useProducts';
import { usePermission } from '@/hooks/auth/usePermission';
import { ProductForm } from '@/components/inventory/ProductForm';
import { ROUTES } from '@/lib/constants/routes';
import type { CreateProductFormValues } from '@/modules/products/product.validation';

export default function NewProductPage() {
  const router = useRouter();
  const { can } = usePermission();
  const { createMutation } = useProducts();

  if (!can('inventory:create')) {
    return (
      <div className="p-6 text-sm text-rose-600">
        You do not have permission to create products.
      </div>
    );
  }

  const handleSubmit = async (values: CreateProductFormValues) => {
    const result = await createMutation.mutateAsync(values);
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
          <h1 className="text-xl font-semibold text-slate-900">Add Product</h1>
          <p className="mt-0.5 text-sm text-slate-500">Create a new product in the inventory.</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <ProductForm
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
          submitLabel="Create Product"
        />
      </div>
    </div>
  );
}
