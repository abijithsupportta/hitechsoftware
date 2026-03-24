'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, Loader2, Package } from 'lucide-react';
import { useAvailableProducts, useAddItem } from '@/hooks/digital-bag/useDigitalBag';
import type { AvailableProduct } from '@/modules/digital-bag/digital-bag.types';

interface BagProductSearchProps {
  sessionId: string;
  existingProductIds: string[];
  onItemAdded?: () => void;
}

export default function BagProductSearch({ sessionId, existingProductIds, onItemAdded }: BagProductSearchProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AvailableProduct | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: productsResult } = useAvailableProducts(debouncedSearch);
  const addItemMutation = useAddItem();

  const products = productsResult?.ok ? productsResult.data : [];

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Show dropdown when we have results
  useEffect(() => {
    if (products.length > 0 && search.length >= 1 && !selectedProduct) {
      setShowDropdown(true);
    }
  }, [products, search, selectedProduct]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((product: AvailableProduct) => {
    setSelectedProduct(product);
    setSearch(product.product_name);
    setShowDropdown(false);
    setQuantity(1);
  }, []);

  const handleAdd = useCallback(async () => {
    if (!selectedProduct) return;
    if (quantity < 1) return;

    addItemMutation.mutate(
      { session_id: sessionId, product_id: selectedProduct.product_id, quantity },
      {
        onSuccess: (result) => {
          if (result.ok) {
            setSearch('');
            setSelectedProduct(null);
            setQuantity(1);
            inputRef.current?.focus();
            onItemAdded?.();
          }
        },
      },
    );
  }, [selectedProduct, quantity, sessionId, addItemMutation, onItemAdded]);

  const clearSelection = useCallback(() => {
    setSelectedProduct(null);
    setSearch('');
    setQuantity(1);
    inputRef.current?.focus();
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search products by name or code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (selectedProduct) setSelectedProduct(null);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {showDropdown && products.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {products.map((product) => {
              const inBag = existingProductIds.includes(product.product_id);
              return (
                <button
                  key={product.product_id}
                  type="button"
                  disabled={inBag}
                  onClick={() => handleSelect(product)}
                  className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.product_name}</p>
                      <p className="text-xs text-gray-500">{product.material_code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {inBag ? (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">In bag</span>
                    ) : (
                      <span className="text-xs text-gray-500">Stock: {product.current_quantity}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedProduct && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{selectedProduct.product_name}</p>
            <p className="text-xs text-gray-500">
              Code: {selectedProduct.material_code} &middot; Stock: {selectedProduct.current_quantity} &middot; MRP: ₹{selectedProduct.mrp?.toFixed(2) ?? '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Qty:</label>
            <input
              type="number"
              min={1}
              max={selectedProduct.current_quantity}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(selectedProduct.current_quantity, parseInt(e.target.value) || 1)))}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={addItemMutation.isPending || quantity > selectedProduct.current_quantity}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addItemMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
