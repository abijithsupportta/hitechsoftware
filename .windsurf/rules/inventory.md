---
trigger: glob
globs: "**/inventory/**,**/products/**,**/stock-entries/**,**/stock-balance/**,**/ProductForm*,**/StockEntry*"
---

# Inventory Module

## Key Files
- app/dashboard/inventory/ — all inventory pages
- components/inventory/ — inventory components
- modules/products/product.service.ts
- modules/stock-entries/stock-entry.service.ts
- repositories/products.repository.ts
- repositories/stock-entries.repository.ts
- hooks/products/useProducts.ts
- hooks/stock-entries/useStockEntries.ts

## Pricing Rules
- Purchase price is GST EXCLUDED — what Hi Tech paid
- MRP is GST INCLUDED — always inclusive 18%
- MRP updates automatically from latest stock entry
- WAC updates automatically on every stock entry via trigger
- WAC resets to new purchase price if stock was zero
- Supplier discount applied on purchase price first
- Then GST 18% added on discounted price
- Stock entry items have generated columns for all calculations

## Stock Entry Line Item Calculation
Purchase Price (excl GST)
→ Supplier Discount (% or flat)
→ Discounted Purchase Price
→ GST 18% on discounted price
→ Final Unit Cost (incl GST)
→ × Quantity = Line Total
MRP recorded separately for selling reference

## Refurbished Items
- is_refurbished boolean flag on stock_entry_items
- Condition mandatory when refurbished: good, fair, poor
- Refurbished badge shown in UI — R label
- No separate product created — same product with flag

## Stock Balance
- current_stock_levels view = received minus issued to bags
- Status: in_stock, low_stock, out_of_stock
- Low stock when quantity ≤ minimum_stock_level
- Stock value = current_quantity × WAC

## Material Code Rules
- Stored UPPERCASE always
- Format: alphanumeric plus dash and underscore
- Globally unique case-insensitive

## Key Tables
inventory_products, product_categories, product_types,
stock_entries, stock_entry_items, mrp_change_log,
current_stock_levels (view)

## Migrations
Inventory: 016, pricing updates: 025
