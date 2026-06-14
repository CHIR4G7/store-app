# GroceryApp — State Management Architecture

Version: 1.0

---

# 1. Purpose

This document defines how state is managed throughout the GroceryApp ecosystem.

The goal is to ensure:

* Clear ownership of state
* Predictable updates
* Minimal duplication
* Easy debugging
* Scalable architecture

State must always have a single source of truth.

---

# 2. State Management Principles

Rule 1:

Server data belongs in React Query.

Rule 2:

Global client state belongs in Zustand.

Rule 3:

Component-only state belongs in useState or useReducer.

Rule 4:

Database remains the source of truth.

Rule 5:

Never duplicate server state into Zustand.

Rule 6:

Realtime events update React Query caches.

---

# 3. State Ownership Matrix

| State Type            | Owner          |
| --------------------- | -------------- |
| Products              | React Query    |
| Categories            | React Query    |
| Orders                | React Query    |
| Order Details         | React Query    |
| Inventory             | React Query    |
| Analytics             | React Query    |
| User Profile          | React Query    |
| Addresses             | React Query    |
| Delivery Zones        | React Query    |
| Cart                  | Zustand        |
| UI Preferences        | Zustand        |
| Active Worker Session | Zustand        |
| Forms                 | useState / RHF |
| Modals                | useState       |
| Tabs                  | useState       |
| Wizards               | useReducer     |

---

# 4. React Query Strategy

Purpose:

Manage all server state.

Responsibilities:

* Fetching
* Caching
* Refetching
* Background synchronization
* Optimistic updates
* Error handling

---

# 5. React Query Query Keys

Products

["products"]

Paginated Products

["products", page]

Search Products

["products", page, search]

Filtered Products

["products", page, search, category]

Categories

["categories"]

Profile

["profile", userId]

Addresses

["addresses", userId]

Orders

["orders", userId]

Order

["order", orderId]

Worker Queue

["worker-queue"]

Inventory

["inventory"]

Analytics

["analytics"]

---

# 6. Cache Configuration

Products

staleTime:
5 minutes

Categories

staleTime:
30 minutes

Profile

staleTime:
10 minutes

Addresses

staleTime:
10 minutes

Orders

staleTime:
30 seconds

Worker Queue

staleTime:
5 seconds

Inventory

staleTime:
30 seconds

Analytics

staleTime:
5 minutes

---

# 7. Zustand Architecture

Purpose:

Manage lightweight global client state.

Must NOT store:

* Products
* Orders
* Categories
* Inventory
* Analytics

These belong to React Query.

---

# 8. Customer App Stores

cartStore

State:

* Items
* Quantities
* Local totals

Actions:

* addItem()
* removeItem()
* updateQuantity()
* clearCart()

Persistence:

localStorage

---

uiStore

State:

* Theme
* Sidebar state
* Mobile menu state

Persistence:

localStorage

---

# 9. Worker App Stores

workerSessionStore

State:

* Active order being packed
* Packing progress draft
* Temporary worker preferences

Persistence:

sessionStorage

---

uiStore

State:

* Sidebar state
* Dashboard layout

Persistence:

localStorage

---

# 10. Admin App Stores

adminPreferenceStore

State:

* Dashboard layout
* Table preferences
* Filters

Persistence:

localStorage

---

# 11. Local Component State

Use useState for:

* Modal visibility
* Active tab
* Dropdown state
* Search input
* Temporary selections

Examples:

const [isOpen, setIsOpen]

const [selectedTab, setSelectedTab]

---

# 12. Complex Local State

Use useReducer when:

* Multi-step forms
* Checkout flow
* Wizard workflows

Examples:

Checkout Wizard

Product Creation Wizard

Worker Creation Wizard

---

# 13. Form State

Library:

React Hook Form

Validation:

Zod

Ownership:

Form controls own temporary form state.

Server remains source of truth.

---

# 14. Realtime Architecture

Provider:

Supabase Realtime

Purpose:

* Order updates
* Worker queue updates
* Inventory updates

Realtime never directly updates UI state.

Realtime updates React Query cache.

---

# 15. Realtime Flow

Order Status Changed

↓

Supabase Realtime Event

↓

React Query Cache Update

↓

Affected Components Re-render

---

# 16. Order Realtime Strategy

Customer App

Listen:

orders

Update:

["orders", userId]

["order", orderId]

---

Worker App

Listen:

orders

Update:

["worker-queue"]

["order", orderId]

---

Admin App

Listen:

orders

products

Update:

["inventory"]

["analytics"]

---

# 17. Mutation Strategy

All mutations must invalidate affected queries.

Example:

Update Product Price

↓

invalidateQueries(["inventory"])

invalidateQueries(["products"])

---

Place Order

↓

invalidateQueries(["orders"])

invalidateQueries(["cart"])

---

Accept Order

↓

invalidateQueries(["worker-queue"])

invalidateQueries(["order", orderId])

---

# 18. Optimistic Updates

Allowed:

* Cart operations
* UI preference updates

Not Allowed:

* Inventory updates
* Order status transitions
* Checkout completion

These require server confirmation.

---

# 19. Offline Strategy

Cart

Offline capable.

Persist in localStorage.

Profile

Read-only cache available.

Orders

Require network.

Checkout

Require network.

Inventory

Require network.

---

# 20. Anti-Patterns

Forbidden:

Store Products in Zustand

Store Orders in Zustand

Store Analytics in Zustand

Duplicate React Query state

Direct Supabase queries inside pages

Bypassing domain hooks

---

# 21. State Ownership Summary

React Query

Owns all server state.

Zustand

Owns lightweight global UI state.

React Hook Form

Owns form state.

useState

Owns simple local state.

useReducer

Owns complex local workflows.

Supabase

Remains the ultimate source of truth.

---

End of Document

