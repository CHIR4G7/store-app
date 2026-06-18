create or replace function public.update_order_status(
  p_actor_id uuid,
  p_order_id uuid,
  p_new_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_old_status text;
  v_worker_id uuid;
  v_allowed_statuses text[] := array[
    'PLACED',
    'CONFIRMED',
    'ASSIGNED',
    'PACKING',
    'PACKED',
    'OUT_FOR_DELIVERY',
    'READY_FOR_PICKUP',
    'DELIVERED',
    'COLLECTED',
    'CANCELLED'
  ];
begin
  select role
  into v_actor_role
  from public.profiles
  where id = p_actor_id
    and is_active = true;

  if v_actor_role is null then
    raise exception 'Active actor profile not found';
  end if;

  if v_actor_role not in ('worker', 'admin') then
    raise exception 'Only workers or admins can update order status';
  end if;

  if p_new_status <> all(v_allowed_statuses) then
    raise exception 'Invalid order status';
  end if;

  select status, worker_id
  into v_old_status, v_worker_id
  from public.orders
  where id = p_order_id
  for update;

  if v_old_status is null then
    raise exception 'Order not found';
  end if;

  if v_actor_role = 'worker' and v_worker_id is distinct from p_actor_id then
    raise exception 'Worker can update only assigned orders';
  end if;

  if v_actor_role = 'worker' and not (
    (v_old_status = 'ASSIGNED' and p_new_status = 'PACKING')
    or (v_old_status = 'PACKING' and p_new_status = 'PACKED')
    or (v_old_status = 'PACKED' and p_new_status in ('OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'))
    or (v_old_status = 'OUT_FOR_DELIVERY' and p_new_status = 'DELIVERED')
    or (v_old_status = 'READY_FOR_PICKUP' and p_new_status = 'COLLECTED')
    or (v_old_status in ('PLACED', 'ASSIGNED') and p_new_status = 'CANCELLED')
  ) then
    raise exception 'Invalid status transition';
  end if;

  update public.orders
  set
    status = p_new_status,
    packed_at = case when p_new_status = 'PACKED' then now() else packed_at end,
    completed_at = case when p_new_status in ('DELIVERED', 'COLLECTED') then now() else completed_at end
  where id = p_order_id;

  insert into public.order_status_history (
    order_id,
    actor_id,
    old_status,
    new_status,
    note
  )
  values (
    p_order_id,
    p_actor_id,
    v_old_status,
    p_new_status,
    case when v_actor_role = 'admin' then 'Order status overridden by admin' else 'Order status updated by worker' end
  );

  if v_actor_role = 'admin' then
    insert into public.audit_logs (
      actor_id,
      entity_type,
      entity_id,
      action,
      old_value,
      new_value
    )
    values (
      p_actor_id,
      'orders',
      p_order_id,
      'update_order_status',
      jsonb_build_object('status', v_old_status),
      jsonb_build_object('status', p_new_status)
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'order', jsonb_build_object(
      'id', p_order_id,
      'oldStatus', v_old_status,
      'status', p_new_status
    )
  );
end;
$$;

create or replace function public.update_product_price(
  p_actor_id uuid,
  p_product_id uuid,
  p_new_price numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_price numeric(10, 2);
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_actor_id
      and role = 'admin'
      and is_active = true
  ) then
    raise exception 'Only active admins can update product prices';
  end if;

  if p_new_price is null or p_new_price < 0 then
    raise exception 'Price must be zero or greater';
  end if;

  select price
  into v_old_price
  from public.products
  where id = p_product_id
  for update;

  if v_old_price is null then
    raise exception 'Product not found';
  end if;

  update public.products
  set price = p_new_price::numeric(10, 2)
  where id = p_product_id;

  insert into public.audit_logs (
    actor_id,
    entity_type,
    entity_id,
    action,
    old_value,
    new_value
  )
  values (
    p_actor_id,
    'products',
    p_product_id,
    'update_price',
    jsonb_build_object('price', v_old_price),
    jsonb_build_object('price', p_new_price::numeric(10, 2))
  );

  return jsonb_build_object(
    'success', true,
    'product', jsonb_build_object(
      'id', p_product_id,
      'oldPrice', v_old_price,
      'price', p_new_price::numeric(10, 2)
    )
  );
end;
$$;

create or replace function public.update_product_stock(
  p_actor_id uuid,
  p_product_id uuid,
  p_new_stock integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_stock integer;
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_actor_id
      and role = 'admin'
      and is_active = true
  ) then
    raise exception 'Only active admins can update product stock';
  end if;

  if p_new_stock is null or p_new_stock < 0 then
    raise exception 'Stock must be zero or greater';
  end if;

  select stock
  into v_old_stock
  from public.products
  where id = p_product_id
  for update;

  if v_old_stock is null then
    raise exception 'Product not found';
  end if;

  update public.products
  set stock = p_new_stock
  where id = p_product_id;

  insert into public.audit_logs (
    actor_id,
    entity_type,
    entity_id,
    action,
    old_value,
    new_value
  )
  values (
    p_actor_id,
    'products',
    p_product_id,
    'update_stock',
    jsonb_build_object('stock', v_old_stock),
    jsonb_build_object('stock', p_new_stock)
  );

  return jsonb_build_object(
    'success', true,
    'product', jsonb_build_object(
      'id', p_product_id,
      'oldStock', v_old_stock,
      'stock', p_new_stock
    )
  );
end;
$$;

revoke all on function public.update_order_status(uuid, uuid, text) from public;
revoke all on function public.update_product_price(uuid, uuid, numeric) from public;
revoke all on function public.update_product_stock(uuid, uuid, integer) from public;

grant execute on function public.update_order_status(uuid, uuid, text) to service_role;
grant execute on function public.update_product_price(uuid, uuid, numeric) to service_role;
grant execute on function public.update_product_stock(uuid, uuid, integer) to service_role;
