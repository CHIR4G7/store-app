create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_or_admin"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "profiles_insert_admin"
on public.profiles for insert
to authenticated
with check (public.is_admin());

create policy "profiles_delete_admin"
on public.profiles for delete
to authenticated
using (public.is_admin());

create policy "addresses_select_owner"
on public.addresses for select
to authenticated
using (user_id = auth.uid());

create policy "addresses_insert_owner"
on public.addresses for insert
to authenticated
with check (user_id = auth.uid());

create policy "addresses_update_owner"
on public.addresses for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "addresses_delete_owner"
on public.addresses for delete
to authenticated
using (user_id = auth.uid());

create policy "categories_select_public"
on public.categories for select
to anon, authenticated
using (true);

create policy "categories_insert_admin"
on public.categories for insert
to authenticated
with check (public.is_admin());

create policy "categories_update_admin"
on public.categories for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "categories_delete_admin"
on public.categories for delete
to authenticated
using (public.is_admin());

create policy "products_select_public"
on public.products for select
to anon, authenticated
using (true);

create policy "products_insert_admin"
on public.products for insert
to authenticated
with check (public.is_admin());

create policy "products_update_admin"
on public.products for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "products_delete_admin"
on public.products for delete
to authenticated
using (public.is_admin());

create policy "cart_items_select_owner"
on public.cart_items for select
to authenticated
using (user_id = auth.uid());

create policy "cart_items_insert_owner"
on public.cart_items for insert
to authenticated
with check (user_id = auth.uid());

create policy "cart_items_update_owner"
on public.cart_items for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "cart_items_delete_owner"
on public.cart_items for delete
to authenticated
using (user_id = auth.uid());

create policy "orders_select_allowed"
on public.orders for select
to authenticated
using (
  customer_id = auth.uid()
  or worker_id = auth.uid()
  or (public.is_worker() and status = 'PLACED' and worker_id is null)
  or public.is_admin()
);

create policy "orders_insert_customer_own"
on public.orders for insert
to authenticated
with check (
  public.is_customer()
  and customer_id = auth.uid()
);

create policy "orders_update_worker_or_admin"
on public.orders for update
to authenticated
using (
  (public.is_worker() and worker_id = auth.uid())
  or public.is_admin()
)
with check (
  (public.is_worker() and worker_id = auth.uid())
  or public.is_admin()
);

create policy "order_items_select_allowed"
on public.order_items for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (
        o.customer_id = auth.uid()
        or o.worker_id = auth.uid()
        or public.is_admin()
      )
  )
);

create policy "order_items_update_admin"
on public.order_items for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "delivery_zones_select_authenticated"
on public.delivery_zones for select
to authenticated
using (true);

create policy "delivery_zones_insert_admin"
on public.delivery_zones for insert
to authenticated
with check (public.is_admin());

create policy "delivery_zones_update_admin"
on public.delivery_zones for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "delivery_zones_delete_admin"
on public.delivery_zones for delete
to authenticated
using (public.is_admin());

create policy "notification_tokens_select_owner"
on public.notification_tokens for select
to authenticated
using (user_id = auth.uid());

create policy "notification_tokens_insert_owner"
on public.notification_tokens for insert
to authenticated
with check (user_id = auth.uid());

create policy "notification_tokens_update_owner"
on public.notification_tokens for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "notification_tokens_delete_owner"
on public.notification_tokens for delete
to authenticated
using (user_id = auth.uid());

create policy "audit_logs_select_admin"
on public.audit_logs for select
to authenticated
using (public.is_admin());

create policy "order_status_history_select_allowed"
on public.order_status_history for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_status_history.order_id
      and (
        o.customer_id = auth.uid()
        or o.worker_id = auth.uid()
        or public.is_admin()
      )
  )
);