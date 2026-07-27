alter table public.products
  add column mrp numeric(10, 2) check (mrp >= 0);

alter table public.products
  add constraint products_mrp_gte_price check (mrp is null or mrp >= price);
