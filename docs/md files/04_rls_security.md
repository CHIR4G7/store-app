# GroceryApp — Row Level Security (RLS) & Security Specification

Version: 1.0

---

# 1. Purpose

This document defines the security architecture for GroceryApp.

Security is enforced at the PostgreSQL database layer using Supabase Row Level Security (RLS).

Frontend route guards are considered a user experience feature only and are never relied upon for security.

Every request is validated by database policies before data is returned or modified.

---

# 2. Security Philosophy

Principles:

1. Never trust the frontend.
2. Never trust client-side roles.
3. Enforce permissions in PostgreSQL.
4. Grant minimum required access.
5. Deny by default.
6. Service Role keys never reach the browser.
7. Every table must have explicit RLS policies.

---

# 3. User Roles

The application supports three roles.

## CUSTOMER

Permissions:

- Browse products
- Manage own cart
- Manage own addresses
- Place orders
- View own order history

Cannot:

- View other customers
- Modify products
- Access admin data

---

## WORKER

Permissions:

- View assigned orders
- Update order status
- View fulfillment details

Cannot:

- Modify inventory
- Access analytics
- Access customer data unrelated to assigned orders

---

## ADMIN

Permissions:

- Full system access
- Manage inventory
- Manage workers
- Manage delivery zones
- Access analytics
- Override order status

---

# 4. Authentication Model

Authentication Provider:

Supabase Auth

Method:

Phone Number + OTP

User Session:

- Access Token (JWT)
- Refresh Token

Managed entirely by Supabase.

The frontend never stores or manages JWTs manually.

---

# 5. Role Resolution

Roles are stored inside:

profiles.role

Allowed values:

- customer
- worker
- admin

Example:

user_a -> customer
user_b -> worker
user_c -> admin

The database remains the source of truth.

Client-side state is never trusted.

---

# 6. Helper Functions

## current_role()

Purpose:

Returns current authenticated user's role.

Used inside policies.

---

## is_admin()

Purpose:

Returns TRUE when current user is admin.

---

## is_worker()

Purpose:

Returns TRUE when current user is worker.

---

## is_customer()

Purpose:

Returns TRUE when current user is customer.

---

# 7. Table Security Policies

=================================================
TABLE: profiles
=================================================

SELECT

Customer:
Can read own profile only.

Worker:
Can read own profile only.

Admin:
Can read all profiles.

Policy:

id = auth.uid()

---

UPDATE

Customer:
Can update own profile.

Worker:
Can update own profile.

Admin:
Can update any profile.

---

INSERT

Managed automatically during registration.

---

DELETE

Only admin.

-------------------------------------------------

=================================================
TABLE: addresses
=================================================

SELECT

Policy:

user_id = auth.uid()

Users only see their own addresses.

---

INSERT

Allowed only for owner.

---

UPDATE

Allowed only for owner.

---

DELETE

Allowed only for owner.

-------------------------------------------------

=================================================
TABLE: categories
=================================================

SELECT

Public.

Available to:

- Guests
- Customers
- Workers
- Admins

---

INSERT

Admin only.

---

UPDATE

Admin only.

---

DELETE

Admin only.

-------------------------------------------------

=================================================
TABLE: products
=================================================

SELECT

Public.

Available to everyone.

---

INSERT

Admin only.

---

UPDATE

Admin only.

---

DELETE

Admin only.

Recommended:

Use soft deletes instead of hard deletes.

-------------------------------------------------

=================================================
TABLE: cart_items
=================================================

SELECT

Policy:

user_id = auth.uid()

---

INSERT

Policy:

user_id = auth.uid()

---

UPDATE

Policy:

user_id = auth.uid()

---

DELETE

Policy:

user_id = auth.uid()

Users can only manipulate their own cart.

-------------------------------------------------

=================================================
TABLE: orders
=================================================

SELECT

Customer:

customer_id = auth.uid()

Worker:

worker_id = auth.uid()

Admin:

All orders.

---

INSERT

Customers can create orders for themselves only.

---

UPDATE

Customer:

No direct updates.

Worker:

Only assigned orders.

Admin:

Any order.

---

DELETE

Disabled.

Orders are permanent records.

-------------------------------------------------

=================================================
TABLE: order_items
=================================================

SELECT

Customer:

Order belongs to customer.

Worker:

Order assigned to worker.

Admin:

All rows.

---

INSERT

System only.

---

UPDATE

Admin only.

---

DELETE

Disabled.

Historical billing must remain intact.

-------------------------------------------------

=================================================
TABLE: delivery_zones
=================================================

SELECT

Authenticated users.

---

INSERT

Admin only.

---

UPDATE

Admin only.

---

DELETE

Admin only.

-------------------------------------------------

=================================================
TABLE: notification_tokens
=================================================

SELECT

user_id = auth.uid()

---

INSERT

user_id = auth.uid()

---

UPDATE

user_id = auth.uid()

---

DELETE

user_id = auth.uid()

-------------------------------------------------

=================================================
TABLE: audit_logs
=================================================

SELECT

Admin only.

---

INSERT

System trigger only.

---

UPDATE

Disabled.

---

DELETE

Disabled.

Audit history must remain immutable.

-------------------------------------------------

# 8. Service Role Security

Supabase Service Role:

- Bypasses RLS
- Used by backend systems only

Allowed Usage:

- Edge Functions
- Cron Jobs
- Analytics Jobs
- Administrative operations

Rules:

1. Never expose Service Role key in frontend.
2. Never store Service Role key in browser.
3. Never commit Service Role key to Git.

---

# 9. Additional Security Controls

## Price Validation

At checkout:

- Ignore client price.
- Recalculate price from database.

Reason:

Prevents price manipulation.

---

## Stock Validation

Before order creation:

Validate inventory availability.

Reason:

Prevents overselling.

---

## Order State Validation

Valid transitions:

PLACED
→ CONFIRMED
→ PACKING
→ PACKED
→ OUT_FOR_DELIVERY
→ DELIVERED

OR

PLACED
→ CONFIRMED
→ PACKING
→ PACKED
→ READY_FOR_PICKUP
→ COLLECTED

Optional:

→ CANCELLED

Invalid transitions are blocked.

---

## Audit Logging

Track:

- Product updates
- Price changes
- Worker creation
- Worker deactivation
- Delivery zone updates
- Order overrides

Stored in:

audit_logs

---

# 10. Security Testing Checklist

Customer Tests:

✓ Cannot read another customer profile

✓ Cannot access another cart

✓ Cannot access another order

✓ Cannot update products

✓ Cannot view audit logs

---

Worker Tests:

✓ Cannot update inventory

✓ Cannot access analytics

✓ Cannot access unrelated orders

✓ Can update assigned orders

---

Admin Tests:

✓ Full inventory access

✓ Full order access

✓ Worker management access

✓ Audit log access

---

Service Role Tests:

✓ Works in Edge Functions

✓ Never available to frontend

---

# 11. Security Principles Summary

Security is enforced by:

1. Supabase Auth
2. PostgreSQL RLS Policies
3. Database Constraints
4. Triggers
5. Role-based Authorization

Frontend route guards are not security controls.

The database remains the final authority for every access decision.

---

End of Document
