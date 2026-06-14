GroceryApp — Full System Design Document
Version 1.0 | Prepared for Development

1. Project Overview
A full-stack digitization of an offline grocery store. The system consists of three distinct interfaces sharing one real-time backend — a customer-facing mobile-first shopping app, a worker order fulfillment app, and a powerful admin dashboard for inventory and analytics.
Goals for Version 1
Allow customers to browse products, build a cart, and place orders online
Enable store workers to receive, pack, and close orders efficiently
Give the store admin real-time control over inventory, pricing, and store analytics
Generate digital bills for every order with accurate price snapshots
Support home delivery (within 4km radius) and in-store pickup

2. Application Interfaces
2.1 Customer App
Platform: Mobile-first Progressive Web App (PWA)
Primary users: Customers aged 35 and above
Access: Public registration via phone + OTP
2.2 Worker App
Platform: Mobile (clean, minimal, training-assisted)
Primary users: Store workers assigned by admin
Access: Account created by admin only
2.3 Admin Dashboard
Platform: Desktop-first web interface
Primary users: Store owner / admin
Access: Manually seeded, never self-registered

3. Tech Stack
Layer
Choice
Reason
Frontend Framework
React + Vite
Fast builds, component reuse across all 3 interfaces
Styling
Tailwind CSS
Mobile-first utility classes, consistent design tokens
Backend + Database
Supabase (PostgreSQL)
Real-time subscriptions, auth, row-level security, storage
Push Notifications
Firebase FCM
Best-in-class, generous free tier
State Management — Server
TanStack React Query
Caching, background refetch, optimistic updates
State Management — Client
Zustand
Lightweight global store for cart + auth session
Local State
React useState / useReducer
Component-level UI state
PDF Bill Generation
React-PDF or jsPDF
Client-side, no server dependency
Hosting — Frontend
Vercel
Zero DevOps, instant deployments
Hosting — Backend
Supabase Cloud
Managed, scalable, zero infra overhead

Why Not Redux
Redux is not used. React Query handles all server state (products, orders, inventory) with caching and real-time sync built in. Zustand covers the small amount of global client state (cart, session). Redux would add boilerplate without solving any problem this app actually has.
Why PWA Over Native App
No App Store approval delays — ship and update instantly
One codebase covers all three interfaces
Installable on Android and iOS home screens
Push notifications supported (Android natively, iOS via Safari 16.4+)
Can be wrapped in Capacitor later if native device features are needed

4. User Roles & Authentication
4.1 Three User Types
CUSTOMER  →  self-registers, shops, places orders
WORKER    →  created by admin, fulfills orders, no shopping access
ADMIN     →  full access, manages everything, never self-registered

4.2 Role Assignment Rules
Customer role is auto-assigned on self-registration — never exposed as a form field
Worker accounts are created exclusively by admin
Admin account is manually seeded in the database
There is no role selection on any public-facing form (security requirement)
4.3 Session Architecture
Supabase Auth handles the full session lifecycle:
JWT access token + refresh token issued on login
Auto token refresh before expiry — no manual handling needed
onAuthStateChange listener drives all auth state in the app
Tokens stored and managed by Supabase client, not duplicated in Zustand
Zustand Auth Store persists only:
user profile (id, name, phone, role)

Not the JWT — Supabase manages that securely in its own localStorage key.
4.4 Login Flow
Single /login entry point for all three user types. After authentication, the app fetches the user's profile, reads the role, and redirects automatically:
/admin/dashboard   →  ADMIN
/worker/orders     →  WORKER
/shop              →  CUSTOMER

4.5 Login Method — Phone + OTP
Recommended over email/password for the Indian grocery store context:
Lower friction for the 35+ demographic
No "forgot password" support needed
Familiar UX (Blinkit, Zepto, Swiggy pattern)
Powered by Supabase + Twilio SMS
4.6 Row Level Security (RLS)
All role enforcement is done at the database level via Supabase RLS policies — not just in frontend route guards. Frontend can be bypassed; RLS cannot.
Key policies:
Customers can only read/write their own orders and cart items
Workers can read all pending orders, update order status only
Admin has full read/write access to all tables
Product prices can only be updated by admin role

5. Route Structure
Customer App
/                →  landing / login
/register        →  new customer registration
/shop            →  product browsing (protected: CUSTOMER)
/cart            →  cart review + checkout (protected: CUSTOMER)
/orders          →  order history (protected: CUSTOMER)
/orders/:id      →  single order detail + digital bill (protected: CUSTOMER)

Worker App
/worker/orders      →  pending order queue (protected: WORKER)
/worker/orders/:id  →  order detail + packing flow (protected: WORKER)
/worker/history     →  orders completed by this worker (protected: WORKER)

Admin Dashboard
/admin/dashboard    →  overview + key metrics (protected: ADMIN)
/admin/inventory    →  products, prices, stock levels (protected: ADMIN)
/admin/orders       →  all orders, all statuses (protected: ADMIN)
/admin/workers      →  manage worker accounts (protected: ADMIN)
/admin/analytics    →  sales, revenue, insights (protected: ADMIN)
/admin/settings     →  delivery zones, store config (protected: ADMIN)


6. Database Schema
6.1 Core Tables
-- User profiles (extends Supabase auth.users)
profiles (
  id            UUID PRIMARY KEY  -- FK to auth.users.id
  role          TEXT              -- 'customer' | 'worker' | 'admin'
  full_name     TEXT
  phone         TEXT
  pincode       TEXT              -- for delivery area check
  is_active     BOOLEAN DEFAULT true
  created_at    TIMESTAMPTZ
)

-- Product catalogue
products (
  id            UUID PRIMARY KEY
  name          TEXT NOT NULL
  description   TEXT
  category_id   UUID FK categories
  price         NUMERIC(10,2) NOT NULL  -- live price, admin controlled
  stock         INTEGER DEFAULT 0
  image_url     TEXT
  is_available  BOOLEAN DEFAULT true
  created_at    TIMESTAMPTZ
  updated_at    TIMESTAMPTZ
)

-- Product categories
categories (
  id    UUID PRIMARY KEY
  name  TEXT NOT NULL
  sort_order INTEGER
)

-- Cart items (ephemeral, cleared on order placement)
cart_items (
  id            UUID PRIMARY KEY
  user_id       UUID FK profiles
  product_id    UUID FK products
  quantity      INTEGER NOT NULL
  price_at_add  NUMERIC(10,2)   -- snapshot at time of add, for comparison display only
  added_at      TIMESTAMPTZ
)

-- Orders
orders (
  id                UUID PRIMARY KEY
  customer_id       UUID FK profiles
  worker_id         UUID FK profiles  -- assigned when worker accepts
  status            TEXT              -- see order state machine below
  fulfillment_type  TEXT              -- 'delivery' | 'pickup'
  delivery_address  TEXT
  pincode           TEXT
  subtotal          NUMERIC(10,2)
  delivery_fee      NUMERIC(10,2) DEFAULT 0
  total             NUMERIC(10,2)
  notes             TEXT
  placed_at         TIMESTAMPTZ
  packed_at         TIMESTAMPTZ
  completed_at      TIMESTAMPTZ
  created_at        TIMESTAMPTZ
)

-- Order line items (permanent price snapshot, never references live price)
order_items (
  id                    UUID PRIMARY KEY
  order_id              UUID FK orders
  product_id            UUID FK products
  product_name_snapshot TEXT NOT NULL    -- captured at order time
  price_snapshot        NUMERIC(10,2)    -- captured at order time
  quantity              INTEGER NOT NULL
  line_total            NUMERIC(10,2)    -- price_snapshot × quantity
)

-- Delivery zones (pincode whitelist for v1)
delivery_zones (
  id       UUID PRIMARY KEY
  pincode  TEXT UNIQUE NOT NULL
  label    TEXT  -- human readable area name
  is_active BOOLEAN DEFAULT true
)

-- Push notification tokens
notification_tokens (
  id         UUID PRIMARY KEY
  user_id    UUID FK profiles
  fcm_token  TEXT NOT NULL
  platform   TEXT  -- 'android' | 'ios' | 'web'
  updated_at TIMESTAMPTZ
)

6.2 Critical Data Modelling Rules
Price Snapshotting: When an order is placed, prices are captured into order_items.price_snapshot. Historical bills remain accurate even after the admin changes live prices. Never reference products.price for past orders.
Cart Ephemerality: cart_items is a working table, not a record. It is cleared entirely after a successful order is placed. The permanent record is in order_items.
Server-Side Price Validation: At checkout, the server re-validates all prices from the live products table. The price sent from the client is never trusted. The final price written to order_items comes from the server.

7. Order State Machine
Every order progresses through exactly these states:
PLACED
  ↓
CONFIRMED       (admin or auto-confirm)
  ↓
PACKING         (worker accepts and begins packing)
  ↓
PACKED
  ↓
OUT_FOR_DELIVERY   (if fulfillment_type = 'delivery')
  OR
READY_FOR_PICKUP   (if fulfillment_type = 'pickup')
  ↓
DELIVERED / COLLECTED

Each state transition:
Updates orders.status in Supabase
Triggers a Supabase real-time event
Sends an FCM push notification to the customer with plain-language status text
Customer-facing status labels (plain English — for 35+ demographic):
PLACED            →  "We've received your order"
CONFIRMED         →  "Your order is confirmed"
PACKING           →  "Your order is being packed"
PACKED            →  "Your order is packed and ready"
OUT_FOR_DELIVERY  →  "Your order is on the way"
READY_FOR_PICKUP  →  "Your order is ready to pick up at the store"
DELIVERED         →  "Your order has been delivered"
COLLECTED         →  "Thank you for collecting your order"


8. Real-Time Architecture
8.1 What Is Real-Time vs What Is Not
Data
Real-Time?
Mechanism
Order status for customer
Yes
Supabase real-time on orders table
Pending orders for worker
Yes
Supabase real-time on orders table
Price/stock change in cart
Yes
Supabase real-time on products table (cart items only)
Cart contents itself
No
Local Zustand + async DB sync
Product catalogue
No
React Query with periodic refetch
Admin inventory updates
Yes
Supabase real-time (admin sees live changes)

8.2 Cart State Architecture — Hybrid Model
Not logged in  →  Zustand persisted to localStorage
Logged in      →  Zustand (primary) + synced to Supabase cart_items table
On login       →  merge local cart with server cart

Zustand persist middleware handles localStorage automatically. Server sync is a background async operation — cart UI is never blocked waiting for the network.
8.3 Price & Stock Watching in Cart
Supabase real-time subscribes to changes on only the products currently in the cart (not the full products table). When a change is detected:
If price changed → update display price in cart + toast notification to customer
If stock hits 0 → flag item in cart as unavailable + toast notification
The price_at_add field in cart_items is used only to detect and display the change. Checkout always uses the current live price validated server-side.
8.4 Cart Price Change Policy (UX Decision)
Policy: Flag and notify, don't silently update.
If a product price changes after it was added to cart:
Show the old price with strikethrough and the new price
Show a banner at checkout: "Some prices in your cart have changed"
Customer sees the new total before confirming
This is the most transparent approach for the 35+ demographic who value clarity over speed.

9. Delivery Zone Management
V1 — Pincode Whitelist
Admin maintains a list of serviceable pincodes in the delivery_zones table. Customer enters their pincode at registration. At checkout, the system checks if their pincode is in the whitelist and shows/hides the delivery option accordingly.
Why not geo-radius for v1:
No Google Maps API billing or complexity
Your delivery person knows the actual service area better than a 4km circle
Admin can manage it from the settings panel without any code changes
V2 — Geo Radius
When ready to upgrade, replace pincode check with: customer address → Google Geocoding API → distance from store coordinates → allow if within 4km. This is a non-breaking upgrade.

10. Worker App — Order Fulfillment Flow
The worker app is designed around a single active task at a time. One primary action button at every step to minimise required training.
Screen 1: Pending Orders Queue
  → List of all PLACED/CONFIRMED orders, sorted by time placed
  → Each card shows: order number, number of items, customer area, time waiting
  → Tap any order to view details
  → "Accept Order" button assigns it to this worker, removes from others' queue

Screen 2: Order Detail + Packing
  → Full list of items with quantities
  → Each item has a checkbox (mark as collected from shelf)
  → Prominent DELIVERY or PICKUP badge
  → "Mark as Packed" button (enabled only when all items checked)

Screen 3: Dispatch
  → If DELIVERY: show delivery address, "Mark Out for Delivery" button
  → If PICKUP: show "Mark Ready for Pickup" button — customer notified immediately
  → Final confirmation closes the order

Worker Assignment Rule: Once a worker accepts an order, it is locked to them. Other workers cannot see or interact with it. This prevents duplicate packing.

11. Admin Dashboard
Desktop-first layout with sidebar navigation. Higher information density than the mobile apps.
11.1 Inventory Management
Add, edit, deactivate products
Update prices — changes reflect immediately across the app (real-time)
Update stock levels
Bulk price update (e.g., category-wide price change)
Product image upload (Supabase Storage)
11.2 Order Management
View all orders across all statuses
Filter by date, status, worker, fulfillment type
Override order status if needed (for edge cases)
View individual order with full digital bill
11.3 Worker Management
Create worker accounts (phone + name)
Activate / deactivate workers
View orders completed per worker
11.4 Analytics (All Derived from Existing Data)
Daily / Weekly / Monthly:
Total orders and total revenue
Average order value
Orders by fulfillment type (delivery vs pickup ratio)
Peak ordering hours (heatmap by hour of day)
Inventory Insights:
Top 10 most ordered products
Products currently out of stock
Products frequently added to cart but removed (price sensitivity signal)
Customer Insights:
New vs returning customer ratio
Customer growth over time
Geographic distribution by pincode
Worker Performance:
Average order packing time
Orders fulfilled per worker per day
11.5 Settings
Manage delivery zone pincodes
Set delivery fee
Store details (name, address, phone)
Business hours (show "store closed" banner to customers outside hours)

12. Digital Bill
Generated client-side as a PDF using React-PDF or jsPDF.
Bill Contains:
Store name, address, phone
Bill number (order ID)
Date and time of order
Customer name and phone

Line items:
  Product name | Qty | Unit Price | Line Total

Subtotal
Delivery fee (if applicable)
Total payable
Payment method: Cash on Delivery / Pay at Store

"Thank you for shopping with us"

Critical Rule:
Bill always uses price_snapshot from order_items, never the live product price. This ensures historical accuracy regardless of future price changes.

13. UX Guidelines — 35+ Customer Demographic
This is the most critical UX constraint in the project. Every design decision for the customer app must be evaluated against this demographic.
Touch & Layout
Minimum touch target size: 48×48px (Google Material guideline)
2-column product grid on mobile (not 3)
Generous whitespace — no cluttered layouts
Bottom navigation bar with icon + text label (never icon-only)
Persistent cart button showing item count + total at all times
Typography & Colour
Minimum body font size: 16px
WCAG AA contrast ratio minimum throughout
No grey-on-grey, no subtle placeholder text
High contrast primary actions (checkout button, confirm button)
Language & Feedback
Plain English everywhere — no jargon, no abbreviations
Order status in full sentences ("Your order is being packed")
Confirmation screens before every significant action
Success and error states always clearly communicated with text, not just colour or icons
Navigation
Explicit back buttons — never rely solely on swipe gestures
No hidden navigation patterns (no swipe-to-reveal menus)
Breadcrumbs or clear page titles on every screen
Checkout flow: maximum 3 steps with visible progress indicator
Forms
Large input fields with visible labels (not placeholder-only)
Numeric keyboard auto-triggered for phone and pincode fields
Inline validation — show errors as the user types, not only on submit

14. Notifications
FCM (Firebase Cloud Messaging) integrated via Supabase Edge Functions.
Customer Notifications
Trigger
Message
Order placed
"We've received your order #1234"
Order confirmed
"Your order #1234 is confirmed"
Packing started
"We're packing your order now"
Out for delivery
"Your order is on the way!"
Ready for pickup
"Your order is ready to collect at the store"
Delivered/Collected
"Enjoy your groceries! View your bill in the app"
Price change in cart
"Heads up — a price in your cart has changed"

Worker Notifications
Trigger
Message
New order placed
"New order #1234 is waiting to be packed"


15. Payments — V1 Scope
V1 supports cash-only:
Home delivery: Cash on Delivery (COD) — collected by delivery person
In-store pickup: Pay at counter
No payment gateway in V1. Integrating a payment gateway (Razorpay, etc.) adds 2–3 weeks of development and requires RBI compliance documentation for Indian apps. This is explicitly deferred to V2 after validating the core order flow.

16. State Management Summary
React Query     →  all server state (products, orders, inventory, order history)
                   caching, background refetch, optimistic updates
                   ~70% of app state

Zustand         →  cart contents + auth session + user profile
                   persisted to localStorage via persist middleware
                   ~20% of app state

useState        →  local component UI state (modal open, form fields, step index)
                   ~10% of app state

Supabase RT     →  real-time subscriptions layered on top of React Query
                   order status, cart product changes, pending orders queue


17. Security Checklist
Concern
Solution
Role enforcement
Supabase RLS at DB level — not just frontend guards
Price manipulation
Server re-validates price at checkout, never trusts client
Worker account abuse
is_active flag — admin can revoke access instantly
Admin account creation
Manual DB seed only, no UI path to create admin
JWT security
Supabase manages tokens, not duplicated in app state
Unauthorised route access
Role-based redirect, not just 403 error page
Cart data on logout
Zustand store cleared, localStorage cleared on sign out


18. V2 Roadmap (Out of Scope for V1)
These are explicitly deferred. Noting them here so the V1 data model doesn't block them:
Online payments via Razorpay
Geo-radius delivery check (replace pincode whitelist)
Delivery tracking on map
Loyalty points / offers system
Multi-category promotions / discount codes
Customer reviews on products
Repeat order (reorder from history)
Low stock alerts for admin
Automated reorder suggestions based on sales velocity

19. Development Sequence (Recommended)
Build in this order to always have a working vertical slice:
Phase 1 — Foundation
  Supabase project setup
  Schema creation + RLS policies
  Auth + session management
  Role-based routing skeleton

Phase 2 — Admin Inventory
  Product CRUD in admin dashboard
  Category management
  Real-time price update

Phase 3 — Customer Shopping
  Product catalogue browsing
  Cart (Zustand + DB sync)
  Real-time price/stock watch on cart

Phase 4 — Order Flow
  Checkout + order placement
  Server-side price validation
  Order confirmation

Phase 5 — Worker App
  Pending orders queue (real-time)
  Accept + pack flow
  Delivery / pickup dispatch

Phase 6 — Notifications + Bills
  FCM integration
  Status change notifications
  Digital bill PDF generation

Phase 7 — Admin Analytics
  Sales dashboard
  Inventory insights
  Worker performance

Phase 8 — Polish
  35+ UX audit
  Performance optimisation
  PWA manifest + service worker
  End-to-end testing


Document version 1.0 — covers all V1 requirements as discussed. Update this document before beginning each development phase.

