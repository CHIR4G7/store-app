create or replace function public.place_order(
  p_customer_id uuid,
  p_address_id uuid,
  p_fulfillment_type text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_subtotal numeric(10, 2);
  v_delivery_fee numeric(10, 2) := 0;
  v_total numeric(10, 2);
begin
  if p_fulfillment_type not in ('delivery', 'pickup') then
    raise exception 'Invalid fulfillment type';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_customer_id
      and role = 'customer'
      and is_active = true
  ) then
    raise exception 'Only active customers can place orders';
  end if;

  if p_fulfillment_type = 'delivery' then
    if p_address_id is null then
      raise exception 'Delivery address is required';
    end if;

    if not exists (
      select 1
      from public.addresses
      where id = p_address_id
        and user_id = p_customer_id
    ) then
      raise exception 'Delivery address not found';
    end if;
  end if;

  if not exists (
    select 1
    from public.cart_items
    where user_id = p_customer_id
  ) then
    raise exception 'Cart is empty';
  end if;

  -- Lock products in the cart so concurrent checkouts cannot oversell stock.
  perform p.id
  from public.products p
  join public.cart_items ci on ci.product_id = p.id
  where ci.user_id = p_customer_id
  order by p.id
  for update;

  if exists (
    select 1
    from public.cart_items ci
    left join public.products p on p.id = ci.product_id
    where ci.user_id = p_customer_id
      and (p.id is null or p.is_available = false)
  ) then
    raise exception 'Cart contains unavailable products';
  end if;

  if exists (
    select 1
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.user_id = p_customer_id
      and p.stock < ci.quantity
  ) then
    raise exception 'Out of stock';
  end if;

  select coalesce(sum(ci.quantity * p.price), 0)::numeric(10, 2)
  into v_subtotal
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.user_id = p_customer_id;

  v_total := (v_subtotal + v_delivery_fee)::numeric(10, 2);

  insert into public.orders (
    customer_id,
    address_id,
    status,
    payment_status,
    fulfillment_type,
    subtotal,
    delivery_fee,
    total,
    notes,
    placed_at
  )
  values (
    p_customer_id,
    case when p_fulfillment_type = 'delivery' then p_address_id else null end,
    'PLACED',
    'pending',
    p_fulfillment_type,
    v_subtotal,
    v_delivery_fee,
    v_total,
    nullif(trim(coalesce(p_notes, '')), ''),
    now()
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id,
    product_id,
    product_name_snapshot,
    price_snapshot,
    quantity,
    line_total
  )
  select
    v_order_id,
    p.id,
    p.name,
    p.price,
    ci.quantity,
    (ci.quantity * p.price)::numeric(10, 2)
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.user_id = p_customer_id;

  update public.products p
  set stock = p.stock - ci.quantity
  from public.cart_items ci
  where ci.user_id = p_customer_id
    and ci.product_id = p.id;

  insert into public.order_status_history (
    order_id,
    actor_id,
    old_status,
    new_status,
    note
  )
  values (
    v_order_id,
    p_customer_id,
    null,
    'PLACED',
    'Order placed by customer'
  );

  delete from public.cart_items
  where user_id = p_customer_id;

  return jsonb_build_object(
    'success', true,
    'order', jsonb_build_object(
      'id', v_order_id,
      'status', 'PLACED',
      'subtotal', v_subtotal,
      'deliveryFee', v_delivery_fee,
      'total', v_total
    )
  );
end;
$$;

revoke all on function public.place_order(uuid, uuid, text, text) from public;
grant execute on function public.place_order(uuid, uuid, text, text) to service_role;
