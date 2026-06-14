# GroceryApp — Component Architecture

Version: 1.0

---

# 1. Purpose

This document defines the frontend architecture, repository structure, application boundaries, shared packages, routing strategy, state management boundaries, and component organization.

The objective is to maintain:

* Separation of concerns
* Independent deployments
* Shared business logic
* Shared type safety
* Long-term maintainability

---

# 2. Repository Strategy

Architecture Style:

Monorepo

Reason:

The Customer App, Worker App, and Admin Dashboard share:

* Authentication
* Database schema
* Supabase integration
* Validation
* Business models
* Utility functions

Maintaining three independent repositories would duplicate logic and increase maintenance costs.

---

# 3. High-Level Repository Structure

```text
grocery-app/

apps/
│
├── customer-app/
├── worker-app/
└── admin-app/

packages/
│
├── auth/
├── products/
├── orders/
├── inventory/
├── notifications/
├── ui/
├── validation/
├── database-types/
├── constants/
└── shared-utils/

supabase/

docs/
```

---

# 4. Application Boundaries

## Customer App

Deployment:

customer.domain.com

Responsibilities:

* Product browsing
* Search
* Cart
* Checkout
* Addresses
* Order tracking
* Bills

Must not contain:

* Worker functionality
* Inventory management
* Analytics

---

## Worker App

Deployment:

worker.domain.com

Responsibilities:

* Order queue
* Accept order
* Packing workflow
* Dispatch workflow
* Worker history

Must not contain:

* Inventory management
* Analytics
* Customer shopping

---

## Admin App

Deployment:

admin.domain.com

Responsibilities:

* Inventory management
* Worker management
* Analytics
* Settings
* Delivery zones

Must not contain:

* Shopping workflow
* Worker fulfillment workflow

---

# 5. Shared Package Architecture

## packages/auth

Contains:

* Supabase client
* Auth hooks
* Session utilities
* Role guards

Exports:

```typescript
useCurrentUser()
useRequireRole()
signOut()
```

---

## packages/products

Contains:

* Product types
* Product queries
* Product search logic
* Product hooks

Exports:

```typescript
useProducts()
useProduct()
useCategories()
```

---

## packages/orders

Contains:

* Order models
* Order queries
* Order status utilities

Exports:

```typescript
useOrders()
useOrder()
useOrderTimeline()
```

---

## packages/inventory

Contains:

* Inventory queries
* Inventory analytics
* Inventory utilities

Used primarily by Admin App.

---

## packages/notifications

Contains:

* Notification models
* Notification utilities
* FCM integrations

---

## packages/database-types

Generated directly from Supabase.

Source of truth for:

* Tables
* Views
* Enums

Never manually edited.

---

## packages/validation

Contains all Zod schemas.

Examples:

```typescript
CreateAddressSchema

PlaceOrderSchema

UpdateProductSchema

CreateWorkerSchema
```

Used by:

* Customer App
* Worker App
* Admin App
* Edge Functions

---

## packages/constants

Shared constants.

Examples:

```typescript
ORDER_STATUS

USER_ROLE

FULFILLMENT_TYPE
```

---

## packages/shared-utils

Contains:

* Date utilities
* Currency formatting
* Pagination helpers
* Search helpers

---

## packages/ui

Shared design system.

Contains:

* Button
* Input
* Modal
* Badge
* Card
* Table
* Pagination

No business logic allowed.

---

# 6. Customer App Structure

```text
customer-app/

src/

features/
│
├── auth/
├── products/
├── cart/
├── checkout/
├── addresses/
├── orders/
└── profile/

pages/

components/

routes/

stores/
```

---

# 7. Worker App Structure

```text
worker-app/

src/

features/
│
├── queue/
├── packing/
├── dispatch/
└── history/

pages/

components/

routes/

stores/
```

---

# 8. Admin App Structure

```text
admin-app/

src/

features/
│
├── inventory/
├── workers/
├── analytics/
├── settings/
└── delivery-zones/

pages/

components/

routes/

stores/
```

---

# 9. State Management Architecture

## React Query

Used For:

* Products
* Orders
* Inventory
* Analytics
* Categories

Server state only.

---

## Zustand

Used For:

Customer App:

```text
Cart
Session UI State
```

Worker App:

```text
Active packing session
```

Admin App:

```text
Dashboard UI preferences
```

---

## useState / useReducer

Used For:

* Forms
* Modals
* Tabs
* Wizards

Component-local state only.

---

# 10. Routing Architecture

Customer:

```text
/
 /shop
 /cart
 /checkout
 /orders
 /orders/:id
```

Worker:

```text
/orders
/orders/:id
/history
```

Admin:

```text
/dashboard
/inventory
/workers
/analytics
/settings
```

---

# 11. React Query Layer

Each domain owns its own hooks.

Example:

```text
packages/products/

queries/
hooks/
types/
```

No app should write raw Supabase queries directly inside pages.

All database access flows through domain packages.

---

# 12. Component Hierarchy Rules

Rule 1:

Pages may compose features.

Rule 2:

Features may compose shared UI.

Rule 3:

Shared UI must never import business features.

Allowed:

Page → Feature → UI

Forbidden:

UI → Feature

---

# 13. Design System Strategy

Single design system shared across all apps.

Source:

packages/ui

Benefits:

* Consistent branding
* Faster development
* Easier maintenance

---

# 14. Deployment Strategy

Independent deployments.

```text
customer.domain.com

worker.domain.com

admin.domain.com
```

Shared backend:

* Supabase
* PostgreSQL
* Storage
* Edge Functions

---

# 15. Future Expansion

Future applications can be added without architectural changes.

Examples:

```text
delivery-app

vendor-app

super-admin-app
```

by creating a new app inside:

apps/

```

---

# 16. Architecture Principles

1. Domain-first package organization.
2. Shared business logic belongs in packages.
3. UI components remain business-agnostic.
4. All database types generated from Supabase.
5. React Query owns server state.
6. Zustand owns lightweight client state.
7. Applications deploy independently.
8. Monorepo remains the single source of truth.

---

End of Document
```

