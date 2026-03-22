'use client';

import { useEffect } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RefreshCw } from 'lucide-react';
import { useProductCategories } from '@/hooks/product-categories/useProductCategories';
import { useProductTypes } from '@/hooks/product-types/useProductTypes';
import { createProductSchema, type CreateProductFormValues } from '@/modules/products/product.validation';
import type { Product } from '@/modules/products/product.types';

interface ProductFormProps {
  defaultValues?: Partial<Product>;
  onSubmit: (values: CreateProductFormValues) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function ProductForm({ defaultValues, onSubmit, isSubmitting, submitLabel = 'Save' }: ProductFormProps) {
  const { data: categories } = useProductCategories();
  const { data: productTypes } = useProductTypes();

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductSchema) as Resolver<CreateProductFormValues>,
    defaultValues: {
      product_name: defaultValues?.product_name ?? '',
      description: defaultValues?.description ?? '',
      material_code: defaultValues?.material_code ?? '',
      category_id: defaultValues?.category_id ?? null,
      product_type_id: defaultValues?.product_type_id ?? null,
      is_refurbished: defaultValues?.is_refurbished ?? false,
      refurbished_label: defaultValues?.refurbished_label ?? '',
      hsn_sac_code: defaultValues?.hsn_sac_code ?? '',
      is_active: defaultValues?.is_active ?? true,
    },
  });

  const isRefurbished = watch('is_refurbished');

  useEffect(() => {
    if (defaultValues) {
      reset({
        product_name: defaultValues.product_name ?? '',
        description: defaultValues.description ?? '',
        material_code: defaultValues.material_code ?? '',
        category_id: defaultValues.category_id ?? null,
        product_type_id: defaultValues.product_type_id ?? null,
        is_refurbished: defaultValues.is_refurbished ?? false,
        refurbished_label: defaultValues.refurbished_label ?? '',
        hsn_sac_code: defaultValues.hsn_sac_code ?? '',
        is_active: defaultValues.is_active ?? true,
      });
    }
  }, [defaultValues, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Basic Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Product Name */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              {...register('product_name')}
              placeholder="e.g. Compressor Unit 1.5 Ton"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                errors.product_name ? 'border-rose-400' : 'border-slate-200 focus:border-blue-500'
              }`}
            />
            {errors.product_name && (
              <p className="mt-1 text-xs text-rose-600">{errors.product_name.message}</p>
            )}
          </div>

          {/* Material Code */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Material Code <span className="text-rose-500">*</span>
            </label>
            <input
              {...register('material_code')}
              placeholder="e.g. MC-12345A"
              className={`w-full rounded-lg border px-3 py-2 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                errors.material_code ? 'border-rose-400' : 'border-slate-200 focus:border-blue-500'
              }`}
            />
            {errors.material_code && (
              <p className="mt-1 text-xs text-rose-600">{errors.material_code.message}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">Letters, numbers, hyphens, underscores, slashes only.</p>
          </div>

          {/* HSN/SAC Code */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">HSN / SAC Code</label>
            <input
              {...register('hsn_sac_code')}
              placeholder="e.g. 84158100"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Brief description of the product…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {/* Classification */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Classification</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Category */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Stock Category</label>
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <select
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select category…</option>
                  {categories.filter((c) => c.is_active).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            />
          </div>

          {/* Product Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Product Type</label>
            <Controller
              name="product_type_id"
              control={control}
              render={({ field }) => (
                <select
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select type…</option>
                  {productTypes.filter((t) => t.is_active).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            />
          </div>
        </div>
      </div>

      {/* Refurbished */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Refurbished Options</h2>
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-3">
            <Controller
              name="is_refurbished"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  role="switch"
                  aria-checked={field.value}
                  onClick={() => field.onChange(!field.value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    field.value ? 'bg-amber-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      field.value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              )}
            />
            <div>
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className={isRefurbished ? 'text-amber-600' : 'text-slate-400'} />
                <span className="text-sm font-medium text-slate-700">Refurbished Item</span>
              </div>
              <p className="text-xs text-slate-400">Mark this product as refurbished / second-hand.</p>
            </div>
          </label>

          {isRefurbished && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Refurbished Label <span className="text-rose-500">*</span>
              </label>
              <input
                {...register('refurbished_label')}
                placeholder="e.g. Grade A Refurbished"
                className={`w-full max-w-sm rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.refurbished_label ? 'border-rose-400' : 'border-slate-200 focus:border-blue-500'
                }`}
              />
              {errors.refurbished_label && (
                <p className="mt-1 text-xs text-rose-600">{errors.refurbished_label.message}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Availability</h2>
        <label className="flex cursor-pointer items-center gap-3">
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <button
                type="button"
                role="switch"
                aria-checked={field.value}
                onClick={() => field.onChange(!field.value)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  field.value ? 'bg-green-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    field.value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            )}
          />
          <div>
            <span className="text-sm font-medium text-slate-700">Active</span>
            <p className="text-xs text-slate-400">Inactive products are hidden from stock entry forms.</p>
          </div>
        </label>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
