'use client';

/**
 * @file page.tsx
 * @module app/dashboard/inventory/stock/new
 *
 * @description
 * Page for recording a new stock entry (goods receipt against an invoice).
 *
 * TWO-LEVEL FORM STRUCTURE
 * ------------------------
 * A stock entry has two parts:
 *  1. HEADER (invoice_number, entry_date, notes) — one set of fields at the top.
 *  2. ITEMS (one or more line items) — dynamic list managed by `useFieldArray`.
 *
 * `useFieldArray` from React Hook Form manages the items array:
 *  - `append(newItem)`  → adds a blank item row to the list
 *  - `remove(index)`    → removes a specific item row
 *  - At least one item is always required (min:1 validation)
 *
 * PRODUCT SELECTION vs MANUAL ENTRY
 * ----------------------------------
 * For each line item, the user can either:
 *  a) Select from the product dropdown → auto-fills material_code and hsn_sac_code
 *     via `handleProductSelect(index, productId)`.
 *  b) Skip the dropdown and type material_code manually (product_id stays null).
 * This supports ad-hoc entries for items not yet registered in the product catalogue.
 *
 * INLINE PRODUCT CREATION
 * -----------------------
 * If the product doesn't exist in the system yet, the user can click "New Product"
 * on any item row. This renders the `<InlineProductForm>` sub-component directly
 * inside that row. On successful creation:
 *  1. The React Query products cache is invalidated (so the dropdown refreshes).
 *  2. The newly created product's fields are auto-populated into the parent form.
 *  3. The inline form closes automatically.
 *
 * Only one `InlineProductForm` is shown at a time. `inlineFormIndex` tracks
 * which item row triggered it.
 *
 * INLINE PRODUCT FORM (sub-component)
 * -------------------------------------
 * `InlineProductForm` is defined in this same file (not exported separately)
 * because it is only ever used here. It uses a separate `useForm` instance
 * and calls `addProduct` (the service function) directly — bypassing the hook
 * to keep the interaction local. It manually calls `queryClient.invalidateQueries`
 * after a successful creation.
 *
 * today() HELPER
 * --------------
 * Returns today's date as `YYYY-MM-DD` (ISO format) for the date input default value.
 *
 * SUBMISSION FLOW
 * ---------------
 * `handleSubmit(onSubmit)` validates the entire form with Zod, then calls
 * `createMutation.mutateAsync(values)`. On success → navigate to stock list.
 * On error → toast (fired inside the hook's onSuccess callback) + stay on page.
 *
 * PERMISSION GUARD
 * ----------------
 * `can('stock:create')` is checked early. If false, shows access denied and returns.
 * `can('inventory:create')` gates the "New Product" button within each item row.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, Trash2, PackagePlus, X, AlertTriangle, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useStockEntries } from '@/hooks/stock-entries/useStockEntries';
import { usePermission } from '@/hooks/auth/usePermission';
import { useProductCategories } from '@/hooks/product-categories/useProductCategories';
import { ProductSearchCombobox } from '@/components/inventory/ProductSearchCombobox';
import type { Product } from '@/modules/products/product.types';
import { useProductTypes } from '@/hooks/product-types/useProductTypes';
import { ROUTES } from '@/lib/constants/routes';
import { createStockEntrySchema, type CreateStockEntryFormValues } from '@/modules/stock-entries/stock-entry.validation';
import { createProductSchema, type CreateProductFormValues } from '@/modules/products/product.validation';
import { addProduct } from '@/modules/products/product.service';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Returns today's date as a `YYYY-MM-DD` string for use as the
 * default value of the date input field.
 */
function today() {
  return new Date().toISOString().split('T')[0];
}

interface InlineProductFormProps {
  onCreated: (product: { id: string; product_name: string; material_code: string; hsn_sac_code: string | null }) => void;
  onCancel: () => void;
}

function InlineProductForm({ onCreated, onCancel }: InlineProductFormProps) {
  const { data: categories } = useProductCategories();
  const { data: productTypes } = useProductTypes();
  const [isPending, setIsPending] = useState(false);
  const queryClient = useQueryClient();

  const { register, handleSubmit, watch, control, formState: { errors } } =
    useForm<CreateProductFormValues>({
      resolver: zodResolver(createProductSchema) as Resolver<CreateProductFormValues>,
      defaultValues: {
        product_name: '',
        material_code: '',
        description: null,
        category_id: null,
        product_type_id: null,
        is_refurbished: false,
        refurbished_label: null,
        hsn_sac_code: '',
        is_active: true,
      },
    });

  const isRefurbished = watch('is_refurbished');

  const onSubmit = async (values: CreateProductFormValues) => {
    setIsPending(true);
    const result = await addProduct(values);
    setIsPending(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success('Product created and added');
    await queryClient.invalidateQueries({ queryKey: ['products'] });
    onCreated({
      id: result.data.id,
      product_name: result.data.product_name,
      material_code: result.data.material_code,
      hsn_sac_code: result.data.hsn_sac_code,
    });
  };

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PackagePlus size={16} className="text-blue-600" />
          <p className="text-sm font-semibold text-blue-800">Quick Add New Product</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-600"
        >
          <X size={14} />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              {...register('product_name')}
              placeholder="Product name"
              className={`w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                errors.product_name ? 'border-rose-400' : 'border-slate-200 focus:border-blue-400'
              }`}
            />
            {errors.product_name && <p className="mt-0.5 text-xs text-rose-600">{errors.product_name.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Material Code <span className="text-rose-500">*</span>
            </label>
            <input
              {...register('material_code')}
              placeholder="e.g. MC-001A"
              className={`w-full rounded-lg border px-2.5 py-1.5 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                errors.material_code ? 'border-rose-400' : 'border-slate-200 focus:border-blue-400'
              }`}
            />
            {errors.material_code && <p className="mt-0.5 text-xs text-rose-600">{errors.material_code.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">HSN/SAC Code</label>
            <input
              {...register('hsn_sac_code')}
              placeholder="e.g. 84158100"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <select
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                >
                  <option value="">No category</option>
                  {categories.filter((c) => c.is_active).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Product Type</label>
            <Controller
              name="product_type_id"
              control={control}
              render={({ field }) => (
                <select
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                >
                  <option value="">No type</option>
                  {productTypes.filter((t) => t.is_active).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Controller
                name="is_refurbished"
                control={control}
                render={({ field }) => (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={field.value}
                    onClick={() => field.onChange(!field.value)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      field.value ? 'bg-amber-500' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${field.value ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                )}
              />
              <span className="text-xs font-medium text-slate-600">Refurbished</span>
            </label>
          </div>

          {isRefurbished && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Refurbished Label <span className="text-rose-500">*</span>
              </label>
              <input
                {...register('refurbished_label')}
                placeholder="e.g. Grade A"
                className={`w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none ${
                  errors.refurbished_label ? 'border-rose-400' : 'border-slate-200 focus:border-blue-400'
                }`}
              />
              {errors.refurbished_label && <p className="mt-0.5 text-xs text-rose-600">{errors.refurbished_label.message}</p>}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Creating…' : 'Create & Add'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewStockEntryPage() {
  const router = useRouter();
  const { can } = usePermission();
  const { createMutation } = useStockEntries();
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [inlineFormIndex, setInlineFormIndex] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<CreateStockEntryFormValues>({
    resolver: zodResolver(createStockEntrySchema) as Resolver<CreateStockEntryFormValues>,
    defaultValues: {
      invoice_number: '',
      entry_date: today(),
      notes: null,
      items: [{ product_id: null, material_code: '', quantity: 1, purchase_price: 0, mrp: 0, hsn_sac_code: null, supplier_discount_type: 'percentage' as const, supplier_discount_value: 0, gst_rate: 18 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchItems = watch('items');

  const handleProductSelect = useCallback(
    (index: number, product: Product | null) => {
      if (product) {
        setValue(`items.${index}.product_id`, product.id);
        setValue(`items.${index}.material_code`, product.material_code);
        setValue(`items.${index}.hsn_sac_code`, product.hsn_sac_code ?? '');
        if (product.mrp != null) {
          setValue(`items.${index}.mrp`, product.mrp);
        }
      } else {
        setValue(`items.${index}.product_id`, null);
        setValue(`items.${index}.material_code`, '');
        setValue(`items.${index}.hsn_sac_code`, '');
      }
    },
    [setValue],
  );

  const handleInlineProductCreated = useCallback(
    (product: { id: string; product_name: string; material_code: string; hsn_sac_code: string | null }) => {
      if (inlineFormIndex !== null) {
        setValue(`items.${inlineFormIndex}.product_id`, product.id);
        setValue(`items.${inlineFormIndex}.material_code`, product.material_code);
        setValue(`items.${inlineFormIndex}.hsn_sac_code`, product.hsn_sac_code ?? '');
      }
      setShowInlineForm(false);
      setInlineFormIndex(null);
    },
    [inlineFormIndex, setValue],
  );

  if (!can('stock:create')) {
    return (
      <div className="p-6 text-sm text-rose-600">
        You do not have permission to add stock entries.
      </div>
    );
  }

  const onSubmit = async (values: CreateStockEntryFormValues) => {
    const result = await createMutation.mutateAsync(values);
    if (result.ok) {
      router.push(ROUTES.DASHBOARD_INVENTORY_STOCK);
    }
  };

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={ROUTES.DASHBOARD_INVENTORY_STOCK}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Add Stock Entry</h1>
          <p className="mt-0.5 text-sm text-slate-500">Record incoming stock against an invoice.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-5">
        {/* Invoice Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Invoice Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Invoice Number <span className="text-rose-500">*</span>
              </label>
              <input
                {...register('invoice_number')}
                placeholder="e.g. INV-2026-0042"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.invoice_number ? 'border-rose-400' : 'border-slate-200 focus:border-blue-500'
                }`}
              />
              {errors.invoice_number && (
                <p className="mt-1 text-xs text-rose-600">{errors.invoice_number.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                {...register('entry_date')}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.entry_date ? 'border-rose-400' : 'border-slate-200 focus:border-blue-500'
                }`}
              />
              {errors.entry_date && (
                <p className="mt-1 text-xs text-rose-600">{errors.entry_date.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
              <textarea
                {...register('notes')}
                rows={2}
                placeholder="Optional notes about this delivery…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Items</h2>
            <button
              type="button"
              onClick={() => append({ product_id: null, material_code: '', quantity: 1, purchase_price: 0, mrp: 0, hsn_sac_code: null, supplier_discount_type: 'percentage' as const, supplier_discount_value: 0, gst_rate: 18 })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Plus size={12} />
              Add Item
            </button>
          </div>

          {errors.items?.root && (
            <p className="mb-3 text-xs text-rose-600">{errors.items.root.message}</p>
          )}
          {typeof errors.items?.message === 'string' && (
            <p className="mb-3 text-xs text-rose-600">{errors.items.message}</p>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => {
              const currentProductId = watchItems[index]?.product_id ?? '';
              return (
                <div
                  key={field.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500">Item {index + 1}</p>
                    <div className="flex items-center gap-2">
                      {can('inventory:create') && (
                        <button
                          type="button"
                          onClick={() => {
                            setInlineFormIndex(index);
                            setShowInlineForm(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          <PackagePlus size={12} />
                          New Product
                        </button>
                      )}
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-rose-200 text-rose-500 hover:bg-rose-50"
                          title="Remove item"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {showInlineForm && inlineFormIndex === index && (
                    <div className="mb-3">
                      <InlineProductForm
                        onCreated={handleInlineProductCreated}
                        onCancel={() => {
                          setShowInlineForm(false);
                          setInlineFormIndex(null);
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Row 1: Product selector, Quantity, Purchase Price */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-slate-600">Product</label>
                        <ProductSearchCombobox
                          value={currentProductId || null}
                          onChange={(product) => handleProductSelect(index, product)}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Material Code <span className="text-rose-500">*</span>
                        </label>
                        <input
                          {...register(`items.${index}.material_code`)}
                          placeholder="e.g. MC-001A"
                          className={`w-full rounded-lg border px-3 py-2 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                            errors.items?.[index]?.material_code
                              ? 'border-rose-400'
                              : 'border-slate-200 focus:border-blue-500'
                          }`}
                        />
                        {errors.items?.[index]?.material_code && (
                          <p className="mt-0.5 text-xs text-rose-600">{errors.items[index].material_code?.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Quantity Received <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                            errors.items?.[index]?.quantity
                              ? 'border-rose-400'
                              : 'border-slate-200 focus:border-blue-500'
                          }`}
                        />
                        {errors.items?.[index]?.quantity && (
                          <p className="mt-0.5 text-xs text-rose-600">{errors.items[index].quantity?.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Purchase Price excl. GST <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          {...register(`items.${index}.purchase_price`, { valueAsNumber: true })}
                          placeholder="e.g. 85.00"
                          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                            errors.items?.[index]?.purchase_price
                              ? 'border-rose-400'
                              : 'border-slate-200 focus:border-blue-500'
                          }`}
                        />
                        {errors.items?.[index]?.purchase_price && (
                          <p className="mt-0.5 text-xs text-rose-600">{errors.items[index].purchase_price?.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">HSN / SAC Code</label>
                        <input
                          {...register(`items.${index}.hsn_sac_code`)}
                          placeholder="e.g. 84158100"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    {/* Row 2: Discount Type, Discount Value, GST Rate */}
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">Discount Type</label>
                        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setValue(`items.${index}.supplier_discount_type`, 'percentage')}
                            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                              (watchItems[index]?.supplier_discount_type ?? 'percentage') === 'percentage'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => setValue(`items.${index}.supplier_discount_type`, 'flat')}
                            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                              watchItems[index]?.supplier_discount_type === 'flat'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            ₹ Flat
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Discount Value
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          {...register(`items.${index}.supplier_discount_value`, { valueAsNumber: true })}
                          placeholder="0"
                          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                            errors.items?.[index]?.supplier_discount_value
                              ? 'border-rose-400'
                              : 'border-slate-200 focus:border-blue-500'
                          }`}
                        />
                        {errors.items?.[index]?.supplier_discount_value && (
                          <p className="mt-0.5 text-xs text-rose-600">{errors.items[index].supplier_discount_value?.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">GST Rate</label>
                        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600">
                          18%
                        </div>
                        <input type="hidden" {...register(`items.${index}.gst_rate`, { valueAsNumber: true })} />
                      </div>
                    </div>

                    {/* Row 3: Calculated pricing summary box */}
                    {(() => {
                      const pp = watchItems[index]?.purchase_price ?? 0;
                      const discType = watchItems[index]?.supplier_discount_type ?? 'percentage';
                      const discVal = watchItems[index]?.supplier_discount_value ?? 0;
                      const gstRate = 18;
                      const qty = watchItems[index]?.quantity ?? 0;

                      if (pp <= 0) return null;

                      const discountAmount = discType === 'percentage'
                        ? Math.round(pp * discVal / 100 * 100) / 100
                        : Math.round(discVal * 100) / 100;
                      const afterDiscount = Math.round((pp - discountAmount) * 100) / 100;
                      const gstAmount = Math.round(afterDiscount * gstRate / 100 * 100) / 100;
                      const finalUnitCost = Math.round((afterDiscount + gstAmount) * 100) / 100;
                      const lineTotal = Math.round(finalUnitCost * qty * 100) / 100;

                      const discLabel = discType === 'percentage' ? `${discVal}%` : `₹${discVal.toFixed(2)}`;

                      return (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 space-y-1">
                          <div className="flex justify-between">
                            <span>Purchase Price:</span>
                            <span className="font-medium">₹{pp.toFixed(2)}</span>
                          </div>
                          {discountAmount > 0 && (
                            <div className="flex justify-between text-amber-700">
                              <span>Discount ({discLabel}):</span>
                              <span className="font-medium">-₹{discountAmount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>After Discount:</span>
                            <span className="font-medium">₹{afterDiscount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-blue-700">
                            <span>GST {gstRate}%:</span>
                            <span className="font-medium">+₹{gstAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
                            <span>Final Unit Cost:</span>
                            <span>₹{finalUnitCost.toFixed(2)} <span className="font-normal text-slate-500">(incl GST)</span></span>
                          </div>
                          {qty > 0 && (
                            <>
                              <div className="flex justify-between text-slate-500">
                                <span>× Quantity {qty}:</span>
                                <span></span>
                              </div>
                              <div className="flex justify-between border-t border-slate-200 pt-1 text-sm font-bold text-blue-800">
                                <span>Line Total:</span>
                                <span>₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}

                    {/* Row 4: MRP and Margin */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          MRP incl. GST — selling reference <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          {...register(`items.${index}.mrp`, { valueAsNumber: true })}
                          placeholder="e.g. 150.00"
                          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                            errors.items?.[index]?.mrp
                              ? 'border-rose-400'
                              : 'border-slate-200 focus:border-blue-500'
                          }`}
                        />
                        {errors.items?.[index]?.mrp && (
                          <p className="mt-0.5 text-xs text-rose-600">{errors.items[index].mrp?.message}</p>
                        )}
                      </div>

                      <div className="flex items-end pb-0.5">
                        {(() => {
                          const pp = watchItems[index]?.purchase_price ?? 0;
                          const discType = watchItems[index]?.supplier_discount_type ?? 'percentage';
                          const discVal = watchItems[index]?.supplier_discount_value ?? 0;
                          const mrpVal = watchItems[index]?.mrp ?? 0;

                          if (pp <= 0 || mrpVal <= 0) return null;

                          const discountAmount = discType === 'percentage'
                            ? Math.round(pp * discVal / 100 * 100) / 100
                            : Math.round(discVal * 100) / 100;
                          const afterDiscount = Math.round((pp - discountAmount) * 100) / 100;
                          const gstAmount = Math.round(afterDiscount * 18 / 100 * 100) / 100;
                          const finalUnitCost = Math.round((afterDiscount + gstAmount) * 100) / 100;

                          const isBelowCost = mrpVal <= finalUnitCost;
                          const marginOnMrp = ((mrpVal - finalUnitCost) / finalUnitCost) * 100;

                          if (isBelowCost) {
                            return (
                              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 w-full">
                                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-rose-600" />
                                <p className="text-xs text-rose-700">
                                  MRP is below your cost price — you will sell at a loss
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 w-full">
                              <TrendingUp size={14} className="flex-shrink-0 text-emerald-600" />
                              <span className="text-xs font-medium text-emerald-700">
                                Margin on MRP: {marginOnMrp.toFixed(1)}%
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>


                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grand Total Summary */}
        {(() => {
          const items = watchItems ?? [];
          if (items.length === 0) return null;

          let totalItems = items.length;
          let totalQuantity = 0;
          let totalDiscountGiven = 0;
          let totalGstPaid = 0;
          let grandTotal = 0;

          for (const item of items) {
            const pp = item?.purchase_price ?? 0;
            const qty = item?.quantity ?? 0;
            const discType = item?.supplier_discount_type ?? 'percentage';
            const discVal = item?.supplier_discount_value ?? 0;

            if (pp <= 0) continue;

            const discountAmount = discType === 'percentage'
              ? Math.round(pp * discVal / 100 * 100) / 100
              : Math.round(discVal * 100) / 100;
            const afterDiscount = Math.round((pp - discountAmount) * 100) / 100;
            const gstAmount = Math.round(afterDiscount * 18 / 100 * 100) / 100;
            const finalUnitCost = Math.round((afterDiscount + gstAmount) * 100) / 100;
            const lineTotal = Math.round(finalUnitCost * qty * 100) / 100;

            totalQuantity += qty;
            totalDiscountGiven += Math.round(discountAmount * qty * 100) / 100;
            totalGstPaid += Math.round(gstAmount * qty * 100) / 100;
            grandTotal += lineTotal;
          }

          if (grandTotal <= 0) return null;

          return (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-700">
                <span>Total Items:</span>
                <span className="text-right font-medium">{totalItems}</span>
                <span>Total Quantity:</span>
                <span className="text-right font-medium">{totalQuantity}</span>
                <span className="text-amber-700">Total Discount Given:</span>
                <span className="text-right font-medium text-amber-700">
                  ₹{totalDiscountGiven.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-blue-700">Total GST Paid:</span>
                <span className="text-right font-medium text-blue-700">
                  ₹{totalGstPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-blue-200 pt-2">
                <span className="text-sm font-bold text-blue-900">GRAND TOTAL (incl GST)</span>
                <span className="text-lg font-bold text-blue-900">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href={ROUTES.DASHBOARD_INVENTORY_STOCK}
            className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Saving…' : 'Save Stock Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}
