'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { useProducts } from '@/hooks/products/useProducts';
import type { Product } from '@/modules/products/product.types';

interface ProductSearchComboboxProps {
  value: string | null;
  onChange: (product: Product | null) => void;
}

export function ProductSearchCombobox({ value, onChange }: ProductSearchComboboxProps) {
  const { items: products, isLoading, setSearch } = useProducts();

  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = useMemo(() => {
    if (!value) return null;
    return products.find((p) => p.id === value) ?? null;
  }, [value, products]);

  const displayValue = selectedProduct
    ? `${selectedProduct.material_code} — ${selectedProduct.product_name}`
    : inputValue;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = useCallback(
    (text: string) => {
      setInputValue(text);
      onChange(null);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (text.length < 2) {
        setSearch('');
        setIsOpen(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        setSearch(text);
        setIsOpen(true);
      }, 300);
    },
    [onChange, setSearch],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSelect = useCallback(
    (product: Product) => {
      setInputValue('');
      setIsOpen(false);
      onChange(product);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    setInputValue('');
    setSearch('');
    setIsOpen(false);
    onChange(null);
    inputRef.current?.focus();
  }, [onChange, setSearch]);

  // Filter active products and sort: exact material code matches first,
  // then partial material code matches, then name-only matches
  const sortedProducts = useMemo(() => {
    const active = products.filter((p) => p.is_active);
    if (!inputValue || inputValue.length < 2) return active;
    const term = inputValue.toUpperCase();
    return active.sort((a, b) => {
      const aCodeExact = a.material_code.toUpperCase() === term;
      const bCodeExact = b.material_code.toUpperCase() === term;
      if (aCodeExact !== bCodeExact) return aCodeExact ? -1 : 1;
      const aCodePartial = a.material_code.toUpperCase().includes(term);
      const bCodePartial = b.material_code.toUpperCase().includes(term);
      if (aCodePartial !== bCodePartial) return aCodePartial ? -1 : 1;
      return 0;
    });
  }, [products, inputValue]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (inputValue.length >= 2 && !selectedProduct) {
              setIsOpen(true);
            }
          }}
          placeholder="Search by material code or product name..."
          readOnly={!!selectedProduct}
          className={`w-full rounded-lg border bg-white py-2 pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
            selectedProduct
              ? 'border-blue-300 bg-blue-50 text-blue-900'
              : 'border-slate-200 focus:border-blue-500'
          }`}
        />
        {selectedProduct && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            title="Clear selection"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <ul className="max-h-60 overflow-y-auto py-1">
            {isLoading ? (
              <li className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" />
                Searching...
              </li>
            ) : sortedProducts.length === 0 ? (
              <li className="px-3 py-3 text-sm text-slate-500">
                No products found. You can enter details manually below.
              </li>
            ) : (
              sortedProducts.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(product)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50"
                  >
                    <span className="font-semibold text-slate-900 font-mono">
                      {product.material_code}
                    </span>
                    <span className="text-slate-400"> — </span>
                    <span className="text-sm text-slate-500">
                      {product.product_name}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
