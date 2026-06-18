create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('customer', 'worker', 'admin')),
  full_name text not null,
  phone text unique,
  pincode text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  house_number text,
  street text,
  landmark text,
  city text,
  state text,
  pincode text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  sku text unique,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  price_at_add numeric(10, 2),
  added_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  worker_id uuid references public.profiles(id) on delete set null,
  address_id uuid references public.addresses(id) on delete restrict,
  status text not null check (
    status in (
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
    )
  ),
  payment_status text not null check (payment_status in ('pending', 'paid', 'refunded')),
  fulfillment_type text not null check (fulfillment_type in ('delivery', 'pickup')),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  total numeric(10, 2) not null check (total >= 0),
  notes text,
  placed_at timestamptz,
  packed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  price_snapshot numeric(10, 2) not null check (price_snapshot >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(10, 2) not null check (line_total >= 0)
);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  pincode text not null unique,
  label text,
  is_active boolean not null default true
);

create table public.notification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  fcm_token text not null,
  platform text not null,
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  entity_type text,
  entity_id uuid,
  action text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

-- Records every order status transition created by trusted Edge Functions.
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  old_status text,
  new_status text not null,
  note text,
  created_at timestamptz not null default now()
);


create index idx_products_category on public.products(category_id);
create index idx_products_available on public.products(is_available);
create index idx_products_name_search on public.products using gin (
  to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(sku, ''))
);

create index idx_orders_customer on public.orders(customer_id);
create index idx_orders_worker on public.orders(worker_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_created_at on public.orders(created_at desc);

create index idx_cart_user on public.cart_items(user_id);
create index idx_notification_user on public.notification_tokens(user_id);
create index idx_order_items_order on public.order_items(order_id);
create index idx_order_status_history_order on public.order_status_history(order_id, created_at desc);
