alter table public.inventory_products
add column if not exists purchase_price numeric(12,2),
add column if not exists mrp numeric(12,2);

alter table public.inventory_products
add constraint inventory_products_purchase_price_non_negative
check (purchase_price is null or purchase_price >= 0);

alter table public.inventory_products
add constraint inventory_products_mrp_non_negative
check (mrp is null or mrp >= 0);