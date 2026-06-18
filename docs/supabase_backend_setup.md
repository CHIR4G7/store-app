# GroceryApp Supabase Backend Setup

This runbook builds the Supabase backend from an empty project using the database specification in `docs/md files/03_database_spec.md` and the RLS/security rules in `docs/md files/04_rls_security.md`.

It assumes:

- Supabase is the backend platform.
- Supabase Auth uses phone number + OTP.
- Frontend apps use the public anon key only.
- Service role access is reserved for Edge Functions, admin scripts, and trusted backend jobs.

## 1. Create The Supabase Project

1. Sign in to Supabase.
2. Create a new project.
3. Pick a region close to the grocery store's primary users.
4. Save the database password in a password manager.
5. Wait for the project to finish provisioning.

Record these values from Project Settings:

- Project URL
- anon public key
- service role key
- database connection string
- project ref

Never commit the service role key.

## 2. Install And Link The Supabase CLI

From the repo root:

```bash
npm install
npx supabase login
npx supabase init
npx supabase link --project-ref YOUR_PROJECT_REF
```

Create local environment files for each app that talks to Supabase:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Supabase Edge Functions already receive Supabase-managed runtime variables such as the project URL and keys. Do not try to set secrets whose names start with `SUPABASE_`; the CLI reserves that prefix.

For custom Edge Function secrets, use app-specific names:

```bash
npx supabase secrets set FCM_SERVER_KEY=YOUR_FCM_SERVER_KEY
npx supabase secrets set STORE_SUPPORT_PHONE=YOUR_SUPPORT_PHONE
```

Inside Edge Functions, read the built-in Supabase values from `Deno.env.get("SUPABASE_URL")`, `Deno.env.get("SUPABASE_ANON_KEY")`, or `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` as needed.

## 3. Configure Auth

In Supabase Dashboard:

1. Open Authentication.
2. For the initial backend setup, enable an easy development provider such as email OTP if phone SMS is not ready.
3. Keep phone auth as the target production login method, but do not block schema/RLS setup on SMS provider configuration.
4. If using phone auth immediately, configure an SMS provider that supports your target country and compliance requirements.
5. Set OTP expiry and rate limits to match the expected customer flow.
6. Disable unused providers unless they are intentionally needed.
7. Add production domains to allowed redirect URLs when the apps are deployed.

The database uses `auth.uid()` in RLS policies, so every customer, worker, and admin must have a matching row in `public.profiles`.

India phone OTP note:

- Twilio may not have Indian numbers available for your account or use case.
- Indian production SMS often requires provider-specific setup for TRAI DLT registration, approved templates, and sender IDs.
- Do not spend the first backend setup pass solving SMS delivery. The database, RLS, profiles, catalog, cart, and order foundations can be built first.
- Revisit production phone OTP once core backend flows are working.

## 4. Create The Database Schema

Why this step matters:

- The schema is the contract between all three frontend apps and Supabase.
- Foreign keys protect relationships such as customer to orders, order to order items, and products to categories.
- Check constraints prevent invalid values from entering the system even if a frontend bug or malicious request bypasses UI validation.
- Snapshot columns on `order_items` preserve the price and product name that existed at checkout, even if the product changes later.
- This is the foundation RLS policies depend on. If ownership fields like `user_id`, `customer_id`, and `worker_id` are wrong, security policies cannot be reliable.

Create a migration:

```bash
npx supabase migration new initial_schema
```

Paste this SQL into the generated migration file.

```sql
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
```

## 5. Add Indexes

Why this step matters:

- Indexes keep common app screens fast as data grows.
- Product category, availability, and search indexes support the customer storefront.
- Order customer, worker, status, and created date indexes support order history, admin dashboards, and worker queues.
- Cart and notification indexes keep per-user lookups cheap.
- Without these, the app may work during development but slow down badly once real products, customers, and orders accumulate.

Add these indexes to the same migration or to a second migration.

```sql
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
```

## 6. Add Helper Functions

Why this step matters:

- RLS policies need a trusted way to resolve the current user's role from the database.
- The frontend must never decide whether a user is an admin, worker, or customer.
- Central helper functions prevent every policy from repeating the same profile lookup.
- The `is_active = true` check lets the system disable a worker/admin account without deleting historical records.
- These functions make role checks easier to audit because all role resolution flows through one place.

Create a migration:

```bash
npx supabase migration new security_helpers
```

Paste this SQL:

```sql
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false)
$$;

create or replace function public.is_worker()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'worker', false)
$$;

create or replace function public.is_customer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'customer', false)
$$;

grant execute on function public.current_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_worker() to authenticated;
grant execute on function public.is_customer() to authenticated;
```

## 7. Add Timestamp Triggers

Why this step matters:

- `updated_at` fields should be controlled by the database, not by client code.
- Product update timestamps are useful for admin audit screens, cache invalidation, and inventory sync.
- Notification token timestamps help identify stale device tokens later.
- A trigger keeps timestamps consistent across frontend apps, Edge Functions, seed scripts, and admin tools.

```sql
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
```

## 8. Enable RLS

Why this step matters:

- Supabase direct queries are safe only when Row Level Security is enabled.
- The anon key is public by design, so database policies must be the real security boundary.
- Enabling RLS makes tables deny access by default until explicit policies allow an operation.
- This supports the project rule that frontend route guards are only UX, not security.

Create a migration:

```bash
npx supabase migration new enable_rls
```

Paste this SQL:

```sql
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.notification_tokens enable row level security;
alter table public.audit_logs enable row level security;
alter table public.order_status_history enable row level security;
```

## 9. Add RLS Policies

Why this step matters:

- These policies define exactly what customers, workers, admins, and anonymous visitors can do.
- Customers can only access their own profile, addresses, cart, and orders.
- Workers can see work assigned to them and the available order queue without seeing unrelated customer data.
- Admins can manage operational data without requiring special frontend-only trust.
- System-only records such as `audit_logs`, `order_items`, and `order_status_history` stay protected from direct browser writes.

Create a migration:

```bash
npx supabase migration new rls_policies
```

Paste this SQL:

```sql
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
```

Intentionally absent:

- In production, prefer removing `orders_insert_customer_own` and creating orders only through the `place-order` Edge Function. Direct order inserts match the RLS document's customer-create rule, but they cannot safely create `order_items`, reduce stock, and recalculate totals in one trusted transaction.
- `orders delete`: disabled.
- `order_items insert`: system only through service role Edge Functions.
- `order_items delete`: disabled.
- `audit_logs insert/update/delete`: system only through service role triggers/functions.
- `order_status_history insert/update/delete`: system only through service role Edge Functions.

## 10. Add Profile Creation Flow

Why this step matters:

- Supabase Auth creates the login identity, but the app needs `profiles` for role, name, phone, status, and pincode.
- RLS policies depend on `profiles.role`, so every authenticated app user needs a matching profile row.
- New users must default to `customer`; they must not be allowed to choose `worker` or `admin`.
- Worker and admin creation should be trusted operations so role escalation cannot happen from the browser.

The safest production flow is:

1. User verifies phone through Supabase Auth.
2. App calls an onboarding Edge Function.
3. Edge Function uses service role to insert `profiles`.
4. New users default to `customer`.
5. Worker/admin profiles are created only by trusted admin operations.

Do not allow public users to choose their own role during signup.

Minimum profile insert for a new customer:

```sql
insert into public.profiles (id, role, full_name, phone)
values ('AUTH_USER_UUID', 'customer', 'Customer Name', '9999999999');
```

## 11. Seed Admin, Categories, Products, And Zones

Why this step matters:

- The first admin account is needed because admin-only policies prevent normal users from creating catalog and worker data.
- Categories and delivery zones give the storefront and checkout enough data to function immediately.
- Product writes are intentionally admin-only, so seed data must be inserted by a trusted admin/session or service-role script.
- Seeding a small baseline makes it possible to test RLS, product listing, cart, checkout, and admin flows without waiting for the full UI.

Create the first admin user in Supabase Auth, then insert the matching profile using SQL Editor or a trusted service-role script:

```sql
insert into public.profiles (id, role, full_name, phone)
values ('ADMIN_AUTH_USER_UUID', 'admin', 'Store Admin', '9999999999');
```

Seed starter catalog data:

```sql
insert into public.categories (name, sort_order)
values
  ('Dairy', 10),
  ('Fruits', 20),
  ('Vegetables', 30),
  ('Staples', 40);

insert into public.delivery_zones (pincode, label, is_active)
values
  ('560001', 'Central Zone', true),
  ('560002', 'South Zone', true);
```

Use the admin app or a service-role seed script for products, because product writes are admin-only.

## 12. Configure Storage

Why this step matters:

- Product images should live in Supabase Storage instead of being embedded in the database.
- Public read access is useful because guests and customers need to see product images before login.
- Upload/update/delete access must remain admin-only so users cannot replace catalog images.
- Keeping the image URL in `products.image_url` makes the catalog simple to query from the frontend.

In Supabase Storage:

1. Create a bucket named `product-images`.
2. Make it public if product images can be viewed by guests.
3. Restrict uploads, updates, and deletes to admins.
4. Store each product image URL in `products.image_url`.

Recommended storage policy intent:

- Public read for product images.
- Admin-only writes.
- No service role key in frontend upload code.

## 13. Configure Realtime

Why this step matters:

- Realtime gives customers and workers live order/status updates without constant polling.
- Worker queue updates help staff react quickly when new orders arrive.
- Product availability updates can prevent users from seeing stale stock state.
- Keeping realtime limited reduces noise, cost, and accidental data exposure.

Enable realtime only where the app needs live updates:

- `orders` for customer order status.
- `orders` for worker queue updates.
- `products` for inventory or availability changes.

Keep realtime narrow. Do not enable every table by default.

## 14. Create Edge Functions

Why this step matters:

- Some workflows need trusted server-side logic instead of direct browser writes.
- Checkout must recalculate prices, validate stock, create order items, reduce inventory, and clear the cart as one trusted workflow.
- Admin inventory changes should create audit logs and verify the caller's role.
- Worker status updates need transition validation so orders cannot jump into impossible states.
- Edge Functions are where the service role key can be used safely after the caller has been authorized.

Create these functions:

```bash
npx supabase functions new place-order
npx supabase functions new accept-order
npx supabase functions new update-order-status
npx supabase functions new create-worker
npx supabase functions new deactivate-worker
npx supabase functions new update-price
npx supabase functions new update-stock
npx supabase functions new toggle-availability
npx supabase functions new send-notification
```

Each function must:

1. Read the caller JWT.
2. Resolve the caller from `profiles`.
3. Validate the caller role in the database.
4. Use service role only after authorization succeeds.
5. Recalculate prices from `products`.
6. Validate stock before order creation.
7. Validate order status transitions.
8. Write audit logs for admin actions.
9. Avoid trusting client-supplied prices, roles, totals, or statuses.

## 15. Apply Migrations

Why this step matters:

- Migration files are only local until they are applied to Supabase.
- `db push` sends the schema, indexes, functions, triggers, and policies to the linked remote project.
- `db reset` rebuilds local development from migrations so local and remote stay aligned.
- Verifying RLS after migrations catches the most dangerous setup mistake early: tables that are accidentally exposed.

For a linked remote Supabase project:

```bash
npx supabase db push
```

For local development:

```bash
npx supabase start
npx supabase db reset
```

After applying migrations, confirm:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Every public app table should have `rowsecurity = true`.

## 16. Generate TypeScript Database Types

Why this step matters:

- Generated types keep frontend queries aligned with the real database schema.
- Renamed columns, nullable fields, and enum-like text values become visible during development instead of failing at runtime.
- Shared database types help the customer, worker, and admin apps speak the same data language.
- Regenerating after migrations prevents stale TypeScript definitions from drifting away from Supabase.

Generate types into the database-types package:

```bash
npx supabase gen types typescript --linked > packages/database-types/src/supabase.ts
```

Then export them from `packages/database-types/src/index.ts`.

Repeat type generation after every schema migration.

## 17. Wire The Frontend Apps

Why this step matters:

- The frontend apps are designed to communicate directly with Supabase for ordinary reads and CRUD.
- The anon key is safe to expose only because RLS controls what each user can actually access.
- Using `VITE_` variables is required because Vite only exposes environment variables with that prefix to browser code.
- Keeping privileged workflows behind Edge Functions prevents service-role behavior from leaking into the browser.

Install the client if it is not already present:

```bash
npm install @supabase/supabase-js
```

Each Vite app should read:

```ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

Frontend code may use:

- `supabase.from('products')` for public product reads.
- `supabase.from('categories')` for public category reads.
- `supabase.from('cart_items')` for the current user's cart.
- `supabase.from('addresses')` for the current user's addresses.
- `supabase.from('orders')` for allowed order views.

Frontend code must not:

- Use the service role key.
- Trust a profile role stored in client state.
- Send order totals as authoritative values.
- Directly perform privileged inventory/order lifecycle changes that belong in Edge Functions.

## 18. Security Verification Checklist

Why this step matters:

- RLS mistakes often look invisible until you test as different real users.
- Customer, worker, admin, anonymous, and service-role checks prove that each access path behaves as intended.
- These tests confirm both positive permissions and denied actions, which are equally important.
- Running this checklist before frontend polish prevents building UI on top of broken security assumptions.

Create one test customer, one test worker, and one test admin.

Customer checks:

- Can read public products and categories.
- Can read and update own profile.
- Cannot read another customer profile.
- Can create, update, and delete own addresses.
- Cannot read another user's addresses.
- Can manage own cart only.
- Can create own order only.
- Cannot update products.
- Cannot read audit logs.

Worker checks:

- Can read own profile.
- Can view assigned orders.
- Can view unassigned `PLACED` orders if the worker queue is enabled.
- Cannot update inventory.
- Cannot read unrelated customer orders.
- Cannot read audit logs.

Admin checks:

- Can read all profiles.
- Can manage categories, products, delivery zones, and workers.
- Can read all orders.
- Can read audit logs.

Anonymous checks:

- Can read public categories and products.
- Cannot read profiles, addresses, cart, orders, order items, delivery zones, notification tokens, or audit logs.

Service role checks:

- Edge Functions can perform system inserts such as `order_items`, `audit_logs`, and `order_status_history`.
- The service role key is not present in browser bundles, Vercel frontend env vars, or committed files.

## 19. Production Hardening

Why this step matters:

- A backend that works in development still needs operational controls before real users and real orders arrive.
- Backups, monitoring, and alerts reduce the chance that an outage or failed checkout goes unnoticed.
- Reviewing RLS and public access prevents accidental data exposure.
- SMS, service-role, and admin creation checks protect the highest-risk parts of the system.

Before launch:

1. Review all RLS policies in Supabase Dashboard.
2. Confirm no table is exposed without RLS unless intentionally public.
3. Confirm public tables only expose safe public data.
4. Add database backups.
5. Add monitoring for Edge Function errors.
6. Add alerting for failed checkout/order creation.
7. Rotate service role keys if they were ever copied into an unsafe place.
8. Validate SMS OTP limits and abuse protection.
9. Confirm all deployed frontend apps use anon keys only.
10. Confirm admin and worker creation cannot be performed from untrusted clients.

## 20. TODO List

Why this step matters:

- India phone OTP has extra provider and compliance work, so it should be tracked separately from the initial database setup.
- Keeping this TODO explicit lets the backend move forward without pretending SMS is solved.
- The production auth decision affects customer onboarding, Edge Functions, and final security testing.

- Choose the production India OTP provider.
- Confirm whether Supabase's built-in phone auth supports the chosen provider directly.
- If the provider is not supported directly, design a custom OTP flow with Edge Functions.
- Complete TRAI DLT registration, templates, and sender ID setup before production SMS launch.
- Replace temporary development auth with production phone OTP before public customer rollout.

## 21. Spec Alignment Note

Why this step matters:

- The API spec and database spec both expect order status history.
- Calling out the relationship prevents future confusion when implementing `place-order`, `accept-order`, and `update-order-status`.
- Keeping a minimal table now supports auditability and customer/worker order timelines.

`docs/md files/03_database_spec.md` and `docs/md files/05_api_spec.md` both include `order_status_history`. This setup guide creates the table because order lifecycle Edge Functions need a durable status audit trail.

If the product decision is to remove order history, delete the table, index, RLS policy, and Edge Function writes that reference it.
