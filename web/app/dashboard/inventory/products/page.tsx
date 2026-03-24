'use client';

/**
 * @file page.tsx
 * @module app/dashboard/inventory/products
 *
 * @description
 * Main product catalogue list page with filtering and pagination.
 *
 * WHAT THIS PAGE DOES
 * -------------------
 * 1. Displays all inventory products in a data table with 8 columns.
 * 2. Provides four filters: text search, category, product type, active status.
 * 3. Paginated (20 items per page) with Prev/Next navigation.
 * 4. Each row has an Edit link (→ /products/[id]/edit) and a soft-delete action.
 *
 * FILTER ARCHITECTURE
 * -------------------
 * All filter state lives in `useProducts()` (the hook), NOT in this component.
 * This page just calls the setters:
 *  - `setSearch(value)`      → triggers re-query with search filter
 *  - `setCategoryFilter(id)` → triggers re-query with category_id filter
 *  - `setTypeFilter(id)`     → triggers re-query with product_type_id filter
 *  - `setStatusFilter(bool)` → triggers re-query with is_active filter
 *
 * All setters reset pagination to page 1 to prevent empty pages.
 *
 * LOADING SKELETON
 * ----------------
 * While loading: renders a 6-row × 8-cell skeleton with `animate-pulse` shimmer.
 * This mirrors the table structure so the layout doesn't "jump" when data arrives.
 *
 * DELETE CONFIRMATION
 * -------------------
 * Clicking Delete shows "Delete? Yes / No" inline in the actions cell.
 * `deleteConfirmId` tracks which row is in confirmation state (max 1 at a time).
 * On "Yes" → `handleDelete()` → `deleteMutation.mutateAsync(id)` → toast → cache invalidated.
 *
 * PERMISSION GUARDS
 * -----------------
 * - `can('inventory:view')`:   False → access denied message (gate at page level)
 * - `can('inventory:edit')`:   False → Edit link hidden
 * - `can('inventory:delete')`: False → Delete button hidden
 * - `can('inventory:create')`: False → "Add Product" button hidden
 *
 * RELATED FILES
 * -------------
 * - Hook: `hooks/products/useProducts.ts`
 * - Edit page: `app/dashboard/inventory/products/[id]/edit/page.tsx`
 * - New page: `app/dashboard/inventory/products/new/page.tsx`
 */

import Link from 'next/link';
import { Plus, Search, Pencil, Trash2, RefreshCw, Package, AlertTriangle, Info } from 'lucide-react';
import { useProducts } from '@/hooks/products/useProducts';
import { useProductCategories } from '@/hooks/product-categories/useProductCategories';
import { useProductTypes } from '@/hooks/product-types/useProductTypes';
import { useStockLevels } from '@/hooks/products/useStockLevels';
import { usePermission } from '@/hooks/auth/usePermission';
import { ROUTES } from '@/lib/constants/routes';
import { useState, useMemo } from 'react';

function formatCurrency(value: number | null) {
  if (value === null) return null;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function ProductsPage() {
  const { can } = usePermission();
  const {
    items,
    pagination,
    filters,
    searchInput,
    isLoading,
    error,
    setSearch,
    setCategoryFilter,
    setTypeFilter,
    setStatusFilter,
    setPage,
    deleteMutation,
  } = useProducts();

  const { data: categories } = useProductCategories();
  const { data: productTypes } = useProductTypes();
  const { data: stockLevels } = useStockLevels();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Build a lookup map from product_id → stock level
  const stockMap = useMemo(() => {
    const map = new Map<string, { current_quantity: number; stock_status: string }>();
    if (stockLevels) {
      for (const sl of stockLevels) {
        map.set(sl.product_id, { current_quantity: sl.current_quantity, stock_status: sl.stock_status });
      }
    }
    return map;
  }, [stockLevels]);

  // Filter items client-side for low-stock filter
  const displayItems = useMemo(() => {
    if (!showLowStockOnly) return items;
    return items.filter((item) => {
      const sl = stockMap.get(item.id);
      return sl && (sl.stock_status === 'low_stock' || sl.stock_status === 'out_of_stock');
    });
  }, [items, showLowStockOnly, stockMap]);

  if (!can('inventory:view')) {
    return (
      <div className="p-6 text-sm text-rose-600">
        You do not have access to the inventory module.
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Products</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Manage your product catalogue with material codes, categories, and types.
          </p>
        </div>
        {can('inventory:create') && (
          <Link
            href={ROUTES.DASHBOARD_INVENTORY_PRODUCTS_NEW}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Add Product
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or material code…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          value={filters.category_id ?? ''}
          onChange={(e) => setCategoryFilter(e.target.value || undefined)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={filters.product_type_id ?? ''}
          onChange={(e) => setTypeFilter(e.target.value || undefined)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Types</option>
          {productTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <select
          value={filters.is_active === undefined ? '' : filters.is_active ? 'active' : 'inactive'}
          onChange={(e) => setStatusFilter(e.target.value === '' ? undefined : e.target.value === 'active')}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button
          type="button"
          onClick={() => setShowLowStockOnly((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            showLowStockOnly
              ? 'border-amber-300 bg-amber-50 text-amber-700'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle size={14} />
          Low Stock
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full table-fixed divide-y divide-slate-200">
          <colgroup>
            <col className="w-[20%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className="w-[7%]" />
            <col className="w-[9%]" />
            <col className="w-[8%]" />
            <col className="w-[6%]" />
            <col className="w-[6%]" />
          </colgroup>
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">Product Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">Mat. Code</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">Category</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">Type</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">Cost</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">MRP</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">
                <span className="inline-flex items-center gap-1">
                  WAC
                  <span className="group relative">
                    <Info size={10} className="text-slate-400 cursor-help" />
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-44 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-normal normal-case tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      Weighted average cost from purchase history.
                    </span>
                  </span>
                </span>
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">Margin</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">Stock</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">HSN/SAC</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">Status</th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide whitespace-nowrap text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="animate-pulse">
                    {Array.from({ length: 12 }).map((__, j) => (
                      <td key={j} className="px-3 py-2">
                        <div className="h-3 w-16 rounded bg-slate-200" />
                      </td>
                    ))}
                  </tr>
                ))
              : error
                ? (
                    <tr>
                      <td colSpan={12} className="px-3 py-8 text-center text-xs text-rose-600">
                        {error}
                      </td>
                    </tr>
                  )
                : items.length === 0
                  ? (
                      <tr>
                        <td colSpan={12} className="px-3 py-8 text-center">
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                            <Package size={24} className="opacity-40" />
                            <p className="text-xs">No products found.</p>
                          </div>
                        </td>
                      </tr>
                    )
                  : displayItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2">
                          <p className="text-xs font-medium text-slate-800 truncate">{item.product_name}</p>
                          {item.description && (
                            <p className="text-xs text-gray-400 truncate max-w-[160px]">{item.description}</p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-slate-700">
                            {item.material_code}
                          </code>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600 truncate">
                          {item.category?.name ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600 truncate">
                          {item.product_type?.name ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                          {formatCurrency(item.purchase_price) ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                          {formatCurrency(item.mrp) ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                          {formatCurrency(item.weighted_average_cost) ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          {(() => {
                            const pp = item.purchase_price;
                            const mrp = item.mrp;
                            if (pp == null || mrp == null || pp <= 0 || mrp <= 0) {
                              return <span className="text-xs text-slate-300">—</span>;
                            }
                            const margin = ((mrp - pp) / pp) * 100;
                            const color = margin <= 0 ? 'bg-rose-100 text-rose-700' : margin < 10 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
                            return (
                              <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
                                {margin.toFixed(1)}%
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2">
                          {(() => {
                            const sl = stockMap.get(item.id);
                            if (!sl) return <span className="text-xs text-slate-300">—</span>;
                            const qty = sl.current_quantity;
                            if (sl.stock_status === 'out_of_stock') {
                              return (
                                <span className="inline-flex whitespace-nowrap rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                                  0
                                </span>
                              );
                            }
                            if (sl.stock_status === 'low_stock') {
                              return (
                                <span className="inline-flex whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                  {qty} low
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex whitespace-nowrap rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                {qty}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {item.hsn_sac_code ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                              item.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {item.is_active ? 'Active' : 'Off'}
                          </span>
                          {item.is_refurbished && (
                            <span className="ml-1 inline-flex whitespace-nowrap rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700" title={item.refurbished_label ?? 'Refurbished'}>
                              <RefreshCw size={10} />
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            {deleteConfirmId === item.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item.id)}
                                  disabled={deleteMutation.isPending}
                                  className="inline-flex h-6 items-center rounded bg-rose-600 px-2 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="inline-flex h-6 items-center rounded border border-slate-200 px-2 text-xs text-slate-600 hover:bg-slate-50"
                                >
                                  No
                                </button>
                              </>
                            ) : (
                              <>
                                {can('inventory:edit') && (
                                  <Link
                                    href={ROUTES.DASHBOARD_INVENTORY_PRODUCT_EDIT(item.id)}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100"
                                    title="Edit"
                                  >
                                    <Pencil size={12} />
                                  </Link>
                                )}
                                {can('inventory:delete') && (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(item.id)}
                                    title="Delete"
                                    className="inline-flex h-6 w-6 items-center justify-center rounded border border-rose-200 text-rose-500 hover:bg-rose-50"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
