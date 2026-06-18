create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger set_notification_tokens_updated_at
before update on public.notification_tokens
for each row execute function public.set_updated_at();