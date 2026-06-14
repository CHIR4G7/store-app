# GroceryApp — Database Specification Document

Version: 1.0

## 1. Database Overview

Database Engine: PostgreSQL (Supabase)

Purpose:
- Customer management
- Product catalog management
- Cart management
- Order processing
- Inventory tracking
- Notifications
- Audit logging

---

## 2. Naming Conventions

Tables:
- plural snake_case

Columns:
- snake_case

Primary Keys:
- id UUID PRIMARY KEY

Foreign Keys:
- <table>_id

Timestamps:
- created_at
- updated_at

---

## 3. Entity Relationship Overview

profiles
│
├── addresses
├── cart_items
├── notification_tokens
│
├── orders (customer_id)
│
└── orders (worker_id)

categories
│
└── products

products
│
├── cart_items
│
└── order_items

orders
│
└── order_items

delivery_zones

audit_logs

---

## 4. Tables

### 4.1 profiles

| Column | Type | Constraints |
|----------|----------|----------|
| id | UUID | PK, FK auth.users |
| role | TEXT | NOT NULL |
| full_name | TEXT | NOT NULL |
| phone | TEXT | UNIQUE |
| pincode | TEXT | |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMPTZ | NOT NULL |

---

### 4.2 addresses

| Column | Type | Constraints |
|----------|----------|----------|
| id | UUID | PK |
| user_id | UUID | FK profiles |
| label | TEXT | |
| house_number | TEXT | |
| street | TEXT | |
| landmark | TEXT | |
| city | TEXT | |
| state | TEXT | |
| pincode | TEXT | |
| is_default | BOOLEAN | DEFAULT FALSE |
| created_at | TIMESTAMPTZ | NOT NULL |

---

### 4.3 categories

| Column | Type | Constraints |
|----------|----------|----------|
| id | UUID | PK |
| name | TEXT | UNIQUE |
| sort_order | INTEGER | |

---

### 4.4 products

| Column | Type | Constraints |
|----------|----------|----------|
| id | UUID | PK |
| category_id | UUID | FK categories |
| sku | TEXT | UNIQUE |
| name | TEXT | NOT NULL |
| description | TEXT | |
| price | NUMERIC(10,2) | NOT NULL |
| stock | INTEGER | DEFAULT 0 |
| image_url | TEXT | |
| is_available | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

---

### 4.5 cart_items

| Column | Type | Constraints |
|----------|----------|----------|
| id | UUID | PK |
| user_id | UUID | FK profiles |
| product_id | UUID | FK products |
| quantity | INTEGER | NOT NULL |
| price_at_add | NUMERIC(10,2) | |
| added_at | TIMESTAMPTZ | NOT NULL |

Unique Constraint:
(user_id, product_id)

---

### 4.6 orders

| Column | Type | Constraints |
|----------|----------|----------|
| id | UUID | PK |
| customer_id | UUID | FK profiles |
| worker_id | UUID | FK profiles |
| address_id | UUID | FK addresses |
| status | TEXT | NOT NULL |
| payment_status | TEXT | NOT NULL |
| fulfillment_type | TEXT | NOT NULL |
| subtotal | NUMERIC(10,2) | NOT NULL |
| delivery_fee | NUMERIC(10,2) | DEFAULT 0 |
| total | NUMERIC(10,2) | NOT NULL |
| notes | TEXT | |
| placed_at | TIMESTAMPTZ | |
| packed_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | NOT NULL |

---

### 4.7 order_items

| Column | Type | Constraints |
|----------|----------|----------|
| id | UUID | PK |
| order_id | UUID | FK orders |
| product_id | UUID | FK products |
| product_name_snapshot | TEXT | NOT NULL |
| price_snapshot | NUMERIC(10,2) | NOT NULL |
| quantity | INTEGER | NOT NULL |
| line_total | NUMERIC(10,2) | NOT NULL |

---

### 4.8 delivery_zones

| Column | Type | Constraints |
|----------|----------|----------|
| id | UUID | PK |
| pincode | TEXT | UNIQUE |
| label | TEXT | |
| is_active | BOOLEAN | DEFAULT TRUE |

---

### 4.9 notification_tokens

| Column | Type | Constraints |
|----------|----------|----------|
| id | UUID | PK |
| user_id | UUID | FK profiles |
| fcm_token | TEXT | NOT NULL |
| platform | TEXT | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

---

### 4.10 audit_logs

| Column | Type | Constraints |
|----------|----------|----------|
| id | UUID | PK |
| actor_id | UUID | |
| entity_type | TEXT | |
| entity_id | UUID | |
| action | TEXT | |
| old_value | JSONB | |
| new_value | JSONB | |
| created_at | TIMESTAMPTZ | NOT NULL |

---

## 5. Index Strategy

Products:
- idx_products_category
- idx_products_available
- idx_products_name_search

Orders:
- idx_orders_customer
- idx_orders_worker
- idx_orders_status
- idx_orders_created_at

Cart:
- idx_cart_user

Notification Tokens:
- idx_notification_user

---

## 6. Constraints

Roles:
- customer
- worker
- admin

Payment Status:
- pending
- paid
- refunded

Fulfillment Types:
- delivery
- pickup

Order Status:
- placed
- confirmed
- packing
- packed
- out_for_delivery
- ready_for_pickup
- delivered
- collected
- cancelled

---

## 7. Trigger Strategy

### updated_at Trigger
Automatically updates products.updated_at.

### Audit Trigger
Records:
- Product updates
- Price changes
- Worker activation/deactivation
- Order overrides

### Stock Validation Trigger
Prevents stock from becoming negative.

### Order State Validation Trigger
Enforces valid order status transitions.

---

## 8. Row Level Security Strategy

Customer:
- Own profile
- Own addresses
- Own cart
- Own orders

Worker:
- Assigned orders only

Admin:
- Full access

---

## 9. Seed Data

Default Categories:
- Vegetables
- Fruits
- Dairy
- Bakery
- Snacks
- Beverages
- Household

Seed Admin Account

Seed Delivery Zones

---

## 10. Migration Strategy

Migration 001:
- Core tables

Migration 002:
- Indexes

Migration 003:
- Triggers

Migration 004:
- RLS Policies

Migration 005:
- Seed Data

---

End of Version 1.0
