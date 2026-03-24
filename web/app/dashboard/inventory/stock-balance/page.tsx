'use client';

import { useState, useMemo } from 'react';
import { Search, Package, AlertTriangle, XCircle, Info } from 'lucide-react';
import { useStockLevels, type StockLevel } from '@/hooks/products/useStockLevels';
import { useProductCategories } from '@/hooks/product-categories/useProductCategories';
import { useProductTypes } from '@/hooks/product-types/useProductTypes';
import { usePermission } from '@/hooks/auth/usePermission';

type StockStatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function StockBalancePage() {
  const { can } = usePermission();
  const { data: stockLevels, isLoading: stockLoading } = useStockLevels();
  const { data: categories } = useProductCategories();
  const { data: productTypes } = useProductTypes();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>('all');

  if (!can('inventory:view')) {
    return (
      <div className="p-6 text-sm text-rose-600">
        You do not have access to the inventory module.
      </div>
    );
  }

  const allLevels = stockLevels ?? [];

  const filteredLevels = useMemo(() => {
    let result = allLevels;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (sl: StockLevel) =>
          sl.product_name.toLowerCase().includes(q) ||
          sl.material_code.toLowerCase().includes(q),
      );
    }

    if (categoryFilter) {
      result = result.filter((sl: StockLevel) => sl.category_id === categoryFilter);
    }

    if (typeFilter) {
      result = result.filter((sl: StockLevel) => sl.product_type_id === typeFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((sl: StockLevel) => sl.stock_status === statusFilter);
    }

    return result;
  }, [allLevels, search, categoryFilter, typeFilter, statusFilter]);

  // Summary stats
  const totalProducts = allLevels.length;
  const lowStockCount = allLevels.filter((sl: StockLevel) => sl.stock_status === 'low_stock').length;
  const outOfStockCount = allLevels.filter((sl: StockLevel) => sl.stock_status === 'out_of_stock').length;

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Stock Balance</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Real-time inventory levels across all products.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Package size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalProducts}</p>
              <p className="text-xs text-slate-500">Total Products</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{lowStockCount}</p>
              <p className="text-xs text-amber-600">Low Stock</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100">
              <XCircle size={20} className="text-rose-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-rose-700">{outOfStockCount}</p>
              <p className="text-xs text-rose-600">Out of Stock</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or material code…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {(categories ?? []).map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Types</option>
          {(productTypes ?? []).map((pt) => (
            <option key={pt.id} value={pt.id}>{pt.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StockStatusFilter)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Current Quantity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Min. Stock Level</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Latest Purchase Price</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className="inline-flex items-center gap-1">
                  Avg Cost
                  <span className="group relative">
                    <Info size={12} className="text-slate-400 cursor-help" />
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 rounded-lg bg-slate-800 px-3 py-2 text-xs font-normal normal-case tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      Weighted average cost calculated from all purchase history.
                    </span>
                  </span>
                </span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">MRP</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Total Stock Value</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Last Received</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stockLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="animate-pulse">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-24 rounded bg-slate-200" />
                      </td>
                    ))}
                  </tr>
                ))
              : filteredLevels.length === 0
                ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Package size={32} className="opacity-40" />
                          <p className="text-sm">No products found.</p>
                        </div>
                      </td>
                    </tr>
                  )
                : filteredLevels.map((sl: StockLevel) => (
                    <tr key={sl.product_id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{sl.product_name}</p>
                        <code className="text-xs text-slate-400">{sl.material_code}</code>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          if (sl.stock_status === 'out_of_stock') {
                            return (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                                0 — Out of Stock
                              </span>
                            );
                          }
                          if (sl.stock_status === 'low_stock') {
                            return (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                                {sl.current_quantity} — Low Stock
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                              {sl.current_quantity}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {sl.minimum_stock_level}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatCurrency(sl.latest_purchase_price) ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatCurrency(sl.weighted_average_cost) ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatCurrency(sl.mrp) ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatCurrency(sl.total_stock_value) ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {sl.last_received_date
                          ? new Date(sl.last_received_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            sl.stock_status === 'in_stock'
                              ? 'bg-green-100 text-green-700'
                              : sl.stock_status === 'low_stock'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {sl.stock_status === 'in_stock'
                            ? 'In Stock'
                            : sl.stock_status === 'low_stock'
                              ? 'Low Stock'
                              : 'Out of Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
