// ─────────────────────────────────────────────────────────────────────────────
// AccessoriesSection.tsx
//
// Spare-parts / accessories table on the Subject Detail page.
// canEdit guard  — technician + assigned + IN_PROGRESS + bill not yet generated.
// After the bill is generated the table becomes read-only for everyone.
// form submit resets to blank row after mutate so the technician can add more.
//
// MRP is always GST-inclusive (18%). The form shows live GST split.
// Discounts can be percentage or flat, applied before GST split.
// ─────────────────────────────────────────────────────────────────────────────
'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import type { SubjectDetail } from '@/modules/subjects/subject.types';
import { useAddAccessory, useRemoveAccessory, useSubjectAccessories } from '@/hooks/subjects/useBilling';
import { useTodaySession } from '@/hooks/digital-bag/useDigitalBag';
import { useConsumeBagItem } from '@/hooks/digital-bag/useBagConsumption';
import { useReturnBagItem } from '@/hooks/digital-bag/useBagReturn';
import { useProductSearch } from '@/hooks/products/useProductSearch';
import { Package, Search, X, ChevronDown } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import type { DigitalBagItem } from '@/modules/digital-bag/digital-bag.types';
import type { Product } from '@/modules/products/product.types';
import { useQueryClient } from '@tanstack/react-query';
import { DIGITAL_BAG_QUERY_KEYS } from '@/modules/digital-bag/digital-bag.constants';

const GST_RATE = 1.18;

interface Props {
  subject: SubjectDetail;
  userRole: string | null;
  userId: string | null;
}

function formatMoney(value: number) {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function AccessoriesSection({ subject, userRole, userId }: Props) {
  const query = useSubjectAccessories(subject.id);
  const addMutation = useAddAccessory(subject.id);
  const removeMutation = useRemoveAccessory(subject.id);
  const queryClient = useQueryClient();
  
  // Bag state for technicians
  const bagQuery = useTodaySession(userRole === 'technician' ? userId : null);
  const [bagSearchQuery, setBagSearchQuery] = useState('');
  const debouncedBagSearch = useDebounce(bagSearchQuery, 300);
  const consumeMutation = useConsumeBagItem({
    onSuccess: () => {
      toast.success('Item consumed from bag and added to accessories');
      // Also invalidate the bag query to update quantities
      if (userId) {
        queryClient.invalidateQueries({ queryKey: DIGITAL_BAG_QUERY_KEYS.todaySession(userId) });
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const returnMutation = useReturnBagItem({
    onSuccess: () => {
      toast.success('Item removed and returned to bag');
      // Invalidate both bag and accessories
      if (userId) {
        queryClient.invalidateQueries({ queryKey: DIGITAL_BAG_QUERY_KEYS.todaySession(userId) });
      }
      queryClient.invalidateQueries({ queryKey: ['subjects', 'accessories', subject.id] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  // Product search state
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const debouncedProductSearch = useDebounce(productSearchQuery, 300);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const productSearchQueryResult = useProductSearch(debouncedProductSearch, {
    enabled: showProductDropdown && userRole !== 'technician', // Only staff can search products
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [mrp, setMrp] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);

  const canEdit = userRole === 'technician'
    && userId === subject.assigned_technician_id
    && subject.status === 'IN_PROGRESS'
    && !subject.bill_generated;

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  // Bag items filtering for technicians
  const bagItems = useMemo(() => {
    if (!bagQuery.data?.ok || !bagQuery.data?.data?.items) return [];
    
    const items = bagQuery.data.data.items;
    if (!debouncedBagSearch.trim()) return items;
    
    const query = debouncedBagSearch.toLowerCase().trim();
    return items.filter((item: DigitalBagItem) => 
      item.product_name.toLowerCase().includes(query) ||
      item.material_code.toLowerCase().includes(query)
    );
  }, [bagQuery.data, debouncedBagSearch]);

  // Handle consuming from bag and adding to accessories
  const handleConsumeFromBag = (bagItem: DigitalBagItem) => {
    if (!userId) return;
    
    consumeMutation.mutate({
      bag_item_id: bagItem.id,
      subject_id: subject.id,
      quantity: 1,
      notes: `Consumed from bag for subject ${subject.subject_number}`,
    });
  };

  // Handle removing accessory and returning to bag
  const handleRemoveAccessory = (accessoryId: string) => {
    setConfirmRemove(accessoryId);
  };

  const confirmRemoveAccessory = async (accessoryId: string) => {
    try {
      // First remove the accessory
      await removeMutation.mutateAsync(accessoryId);
      setConfirmRemove(null);
    } catch (error) {
      console.error('Failed to remove accessory:', error);
    }
  };

  // Product selection handlers
  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setItemName(product.product_name);
    setMrp(product.mrp || 0);
    setShowProductDropdown(false);
    setProductSearchQuery('');
  };

  const handleCustomItem = () => {
    setSelectedProduct(null);
    setShowProductDropdown(false);
    setProductSearchQuery('');
    setItemName('');
    setMrp(0);
  };

  // Live GST split preview for the form input
  const liveCalc = useMemo(() => {
    const discountAmt = discountType === 'percentage'
      ? Math.round(mrp * discountValue / 100 * 100) / 100
      : Math.min(discountValue, mrp);
    const discountedMrp = Math.max(mrp - discountAmt, 0);
    const basePrice = Math.round(discountedMrp / GST_RATE * 100) / 100;
    const gstAmount = Math.round((discountedMrp - basePrice) * 100) / 100;
    const lineTotal = quantity * discountedMrp;
    return { discountAmt, discountedMrp, basePrice, gstAmount, lineTotal };
  }, [mrp, discountType, discountValue, quantity]);

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Accessories</h3>
          <p className="mt-1 text-xs text-slate-500">Add billed spare items before final bill generation. MRP is GST-inclusive (18%).</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          Total: INR {formatMoney(total)}
        </span>
      </div>

      {canEdit && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            addMutation.mutate({
              item_name: itemName.trim(),
              quantity,
              mrp,
              discount_type: discountType,
              discount_value: discountValue,
            });
            setItemName('');
            setQuantity(1);
            setMrp(0);
            setDiscountType('percentage');
            setDiscountValue(0);
            setSelectedProduct(null);
            setProductSearchQuery('');
          }}
          className="mb-4 space-y-3"
        >
          <div className={`grid gap-2 ${userRole === 'technician' ? 'md:grid-cols-5' : 'md:grid-cols-6'}`}>
            <div className="md:col-span-2 relative" ref={dropdownRef}>
              {userRole !== 'technician' ? (
                <>
                  <input
                    value={productSearchQuery}
                    onChange={(event) => {
                      setProductSearchQuery(event.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Search products or enter custom item"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm pr-8"
                  />
                  <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  
                  {/* Product Search Dropdown */}
                  {showProductDropdown && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {productSearchQueryResult.isLoading ? (
                        <div className="p-3 text-sm text-slate-500">Searching...</div>
                      ) : productSearchQueryResult.data?.data?.length > 0 ? (
                        <>
                          {productSearchQueryResult.data.data.map((product: Product) => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => handleProductSelect(product)}
                              className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                            >
                              <div className="font-medium text-sm text-slate-900">{product.product_name}</div>
                              <div className="text-xs text-slate-500">
                                <code className="bg-slate-100 px-1 rounded">{product.material_code}</code>
                                {' • '}
                                MRP: ₹{(product.mrp || 0).toFixed(2)}
                              </div>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={handleCustomItem}
                            className="w-full text-left p-3 hover:bg-slate-50 text-sm text-blue-600 font-medium"
                          >
                            + Add custom item
                          </button>
                        </>
                      ) : productSearchQuery.length >= 2 ? (
                        <div className="p-3 text-sm text-slate-500">
                          No products found. 
                          <button
                            type="button"
                            onClick={handleCustomItem}
                            className="ml-2 text-blue-600 hover:underline"
                          >
                            Add custom item
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 text-sm text-slate-500">
                          Type at least 2 characters to search
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <input
                  value={itemName}
                  onChange={(event) => setItemName(event.target.value)}
                  placeholder="Item name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              )}
              
              {/* Hidden input for form submission */}
              <input
                type="hidden"
                name="item_name"
                value={itemName}
                required
              />
            </div>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))}
              placeholder="Qty"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <div>
              <input
                type="number"
                min={0}
                step="0.01"
                value={mrp}
                onChange={(event) => setMrp(Math.max(0, Number(event.target.value || 0)))}
                placeholder="MRP (incl. GST)"
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  userRole === 'technician' 
                    ? 'border-slate-200 bg-slate-50 text-slate-600' 
                    : 'border-slate-300 bg-white'
                }`}
                required
                readOnly={userRole === 'technician'}
              />
            </div>
            {userRole !== 'technician' ? (
              <div className="flex gap-1">
                <select
                  value={discountType}
                  onChange={(event) => setDiscountType(event.target.value as 'percentage' | 'flat')}
                  className="w-16 rounded-lg border border-slate-300 px-1 py-2 text-sm"
                >
                  <option value="percentage">%</option>
                  <option value="flat">₹</option>
                </select>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  max={discountType === 'percentage' ? 100 : mrp}
                  value={discountValue}
                  onChange={(event) => setDiscountValue(Math.max(0, Number(event.target.value || 0)))}
                  placeholder="Disc."
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                />
              </div>
            ) : null}
            <button
              type="submit"
              disabled={addMutation.isPending}
              className={`rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 ${
                userRole === 'technician' ? 'md:col-span-1' : ''
              }`}
            >
              Add Item
            </button>
          </div>

          {/* Live GST split preview */}
          {mrp > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {liveCalc.discountAmt > 0 && userRole !== 'technician' && (
                <span>Discount: <strong className="text-slate-800">−₹{formatMoney(liveCalc.discountAmt)}</strong></span>
              )}
              <span>Base: <strong className="text-slate-800">₹{formatMoney(liveCalc.basePrice)}</strong></span>
              <span>GST 18%: <strong className="text-slate-800">₹{formatMoney(liveCalc.gstAmount)}</strong></span>
              <span>Line Total: <strong className="text-slate-800">₹{formatMoney(liveCalc.lineTotal)}</strong></span>
            </div>
          )}
        </form>
      )}

      {/* Bag Items Section for Technicians */}
      {canEdit && userRole === 'technician' && bagQuery.data?.ok && bagItems.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-blue-900">Items from Your Bag</h4>
            <p className="text-xs text-blue-700">Click to consume and add to this job</p>
          </div>
          
          {/* Search Bar */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-blue-400" />
              <input
                type="text"
                placeholder="Search bag by material code or product name"
                value={bagSearchQuery}
                onChange={(e) => setBagSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-blue-200 bg-white pl-9 pr-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Bag Items Grid */}
          <div className="grid gap-2 max-h-48 overflow-y-auto">
            {bagItems.map((bagItem) => {
              const held = bagItem.quantity_issued - bagItem.quantity_returned - bagItem.quantity_consumed;
              if (held <= 0) return null;
              
              return (
                <div
                  key={bagItem.id}
                  onClick={() => handleConsumeFromBag(bagItem)}
                  className="flex items-center justify-between rounded-lg border border-blue-200 bg-white p-2 cursor-pointer hover:bg-blue-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{bagItem.product_name}</p>
                    <p className="text-xs text-slate-500">
                      <code className="bg-slate-100 px-1 rounded">{bagItem.material_code}</code>
                      {' • '}
                      Held: <span className="font-medium">{held}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">₹{(bagItem.mrp ?? 0).toFixed(2)}</p>
                    <p className="text-xs text-blue-600">Use 1 →</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {bagItems.length === 0 && (
            <div className="text-center py-4">
              <Package className="mx-auto h-8 w-8 text-blue-300 mb-2" />
              <p className="text-sm text-blue-600">
                {debouncedBagSearch.trim() ? 'No items found in your bag' : 'No items in your bag'}
              </p>
            </div>
          )}
        </div>
      )}

      {query.isLoading ? <p className="text-sm text-slate-500">Loading accessories...</p> : null}

      {!query.isLoading && items.length === 0 ? (
        <p className="text-sm text-slate-500">No accessories added.</p>
      ) : null}

      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Item</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">MRP</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Disc.</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Qty</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Base</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">GST 18%</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Total</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{item.item_name}</td>
                  <td className="px-3 py-2 text-right text-slate-700">₹{formatMoney(item.mrp)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {item.discount_value > 0
                      ? item.discount_type === 'percentage'
                        ? `${item.discount_value}%`
                        : `₹${formatMoney(item.discount_value)}`
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">{item.quantity}</td>
                  <td className="px-3 py-2 text-right text-slate-700">₹{formatMoney(item.line_base_total)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">₹{formatMoney(item.line_gst_total)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">₹{formatMoney(item.line_total)}</td>
                  <td className="px-3 py-2 text-right">
                    {canEdit ? (
                      <button
                        type="button"
                        disabled={removeMutation.isPending}
                        onClick={() => handleRemoveAccessory(item.id)}
                        className="rounded-md border border-rose-300 bg-rose-50 p-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                      >
                        <X size={14} />
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Locked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

      {confirmRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Remove this item?</h3>
            <p className="text-sm text-slate-600 mb-4">
              This will remove the accessory from the bill and return the quantity to your bag.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => confirmRemoveAccessory(confirmRemove)}
                disabled={removeMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 disabled:opacity-60"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
