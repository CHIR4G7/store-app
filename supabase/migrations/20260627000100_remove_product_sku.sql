drop index if exists public.idx_products_name_search;

alter table public.products
  drop column sku;

create index idx_products_name_search on public.products using gin (
  to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, ''))
);
