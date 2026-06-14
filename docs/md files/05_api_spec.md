# GroceryApp — API Specification
Version: 1.0

## Purpose

This document defines all data access patterns used by GroceryApp.

Unlike traditional applications, GroceryApp uses a Hybrid Supabase Architecture:

- Direct Supabase Queries for CRUD and read operations
- Supabase Edge Functions for business-critical workflows

This document is the source of truth for frontend-backend interactions.

---

# 1. Architecture Overview

## Direct Access Layer

Used for:

- Products
- Categories
- Cart
- Addresses
- Profiles
- Order History
- Analytics Reads
- Delivery Zones

Implementation:

supabase.from(...)

Protected by:

- Supabase Auth
- Row Level Security (RLS)

---

## Edge Function Layer

Used for:

- place-order
- accept-order
- update-order-status
- create-worker
- deactivate-worker
- update-price
- update-stock
- toggle-availability
- send-notification

Protected by:

- Auth verification
- Role validation
- Business logic validation

---

# 2. Pagination Standard

All paginated resources use:

page: integer
pageSize: integer

Default:

pageSize = 20

Maximum:

pageSize = 100

Response:

{
  "data": [],
  "page": 1,
  "pageSize": 20,
  "total": 500
}

---

# 3. Products API

## Read Products

Type:
Direct Query

Table:
products

Features:

- Pagination
- Search
- Category Filter
- Availability Filter
- Sorting

Search Fields:

- product name
- description
- SKU
- category name

Example Filters:

search=milk
category=dairy
available=true

Sort Options:

name
price
created_at

---

## Product Search Contract

Input:

{
  "search": "milk",
  "page": 1,
  "pageSize": 20
}

Output:

{
  "data": [],
  "page": 1,
  "pageSize": 20,
  "total": 42
}

---

# 4. Categories API

## Read Categories

Type:
Direct Query

Table:
categories

Permissions:

Public Read

---

# 5. Profile API

## Read Own Profile

Type:
Direct Query

Table:
profiles

Permissions:

Authenticated User

---

## Update Own Profile

Type:
Direct Query

Table:
profiles

Permissions:

Owner Only

---

# 6. Address API

## Read Addresses

Type:
Direct Query

Table:
addresses

---

## Create Address

Type:
Direct Query

Table:
addresses

---

## Update Address

Type:
Direct Query

Table:
addresses

---

## Delete Address

Type:
Direct Query

Table:
addresses

---

# 7. Cart API

## Read Cart

Type:
Direct Query

Table:
cart_items

---

## Add Item

Type:
Direct Query

Table:
cart_items

---

## Update Quantity

Type:
Direct Query

Table:
cart_items

---

## Remove Item

Type:
Direct Query

Table:
cart_items

---

# 8. Orders API

## Read Order History

Type:
Direct Query

Tables:

- orders
- order_items

Permissions:

Customer Own Orders

---

## Read Single Order

Type:
Direct Query

Tables:

- orders
- order_items
- order_status_history

---

# 9. Edge Function: place-order

Purpose:

Creates a complete order transaction.

Role:

Customer

Tables Touched:

- cart_items
- products
- orders
- order_items
- order_status_history

Workflow:

1. Validate cart
2. Validate stock
3. Validate prices
4. Create order
5. Create order items
6. Reduce stock
7. Create history record
8. Clear cart
9. Notify workers

Request:

{
  "addressId": "uuid",
  "fulfillmentType": "delivery",
  "notes": ""
}

Response:

{
  "success": true,
  "order": {
    "id": "uuid",
    "status": "PLACED",
    "total": 500
  }
}

Failure:

{
  "success": false,
  "message": "Out of stock"
}

---

# 10. Worker Queue API

## Read Available Orders

Type:
Direct Query

Table:
orders

Criteria:

status = PLACED
worker_id IS NULL

---

# 11. Edge Function: accept-order

Purpose:

Assign order to worker.

Role:

Worker

Workflow:

1. Verify worker
2. Verify order exists
3. Verify worker_id is NULL
4. Assign worker
5. Set status ASSIGNED
6. Set accepted_at
7. Create history record
8. Notify customer

Request:

{
  "orderId": "uuid"
}

Response:

{
  "success": true
}

---

# 12. Edge Function: update-order-status

Purpose:

Manage worker order lifecycle.

Role:

Worker

Allowed Transitions:

PLACED → ASSIGNED

ASSIGNED → PACKING

PACKING → PACKED

PACKED → OUT_FOR_DELIVERY

PACKED → READY_FOR_PICKUP

OUT_FOR_DELIVERY → DELIVERED

READY_FOR_PICKUP → COLLECTED

PLACED → CANCELLED

ASSIGNED → CANCELLED

Request:

{
  "orderId": "uuid",
  "newStatus": "PACKING"
}

Workflow:

1. Validate ownership
2. Validate transition
3. Update status
4. Write history
5. Send notification

Response:

{
  "success": true
}

---

# 13. Admin Inventory APIs

## Edge Function: update-price

Role:

Admin

Purpose:

Update product pricing.

Request:

{
  "productId": "uuid",
  "newPrice": 120
}

Actions:

- Validate admin
- Update price
- Write audit log

---

## Edge Function: update-stock

Role:

Admin

Purpose:

Adjust inventory.

Request:

{
  "productId": "uuid",
  "newStock": 500
}

Actions:

- Validate admin
- Update stock
- Write audit log

---

## Edge Function: toggle-availability

Role:

Admin

Request:

{
  "productId": "uuid",
  "isAvailable": false
}

Actions:

- Update availability
- Write audit log

---

# 14. Worker Management APIs

## Edge Function: create-worker

Role:

Admin

Request:

{
  "name": "John",
  "phone": "9999999999"
}

Actions:

- Create auth user
- Create profile
- Assign worker role
- Audit log

---

## Edge Function: deactivate-worker

Role:

Admin

Request:

{
  "workerId": "uuid"
}

Actions:

- Set is_active = false
- Audit log

---

# 15. Notification APIs

## Edge Function: send-notification

Internal Function

Not callable by frontend.

Used By:

- place-order
- accept-order
- update-order-status

Channels:

- Customer Notifications
- Worker Notifications

---

# 16. Order Status Definitions

PLACED

ASSIGNED

PACKING

PACKED

OUT_FOR_DELIVERY

READY_FOR_PICKUP

DELIVERED

COLLECTED

CANCELLED

---

# 17. Error Contract

Standard Error:

{
  "success": false,
  "message": "Human readable message",
  "code": "ERROR_CODE"
}

Examples:

OUT_OF_STOCK

INVALID_STATUS_TRANSITION

ORDER_ALREADY_ASSIGNED

UNAUTHORIZED

PRODUCT_NOT_FOUND

---

# 18. Security Requirements

Every Edge Function must:

1. Verify JWT
2. Verify Role
3. Validate Input
4. Use Transactions
5. Create Audit Logs where applicable

Frontend permissions are never trusted.

Database RLS remains the primary security layer.

---

End of Document
