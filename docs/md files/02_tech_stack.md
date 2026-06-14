# GroceryApp — Technology Stack Document

Version: 1.0

## Purpose
This document defines all technologies used across the GroceryApp ecosystem and the reasoning behind each decision.

---

# Architecture Philosophy

- Mobile-first Progressive Web App (PWA)
- Single PostgreSQL database
- Backend-as-a-Service using Supabase
- Real-time updates where needed
- Minimal infrastructure complexity
- Fast development and deployment

---

# Technology Overview

| Layer | Technology |
|---------|---------|
| Language | TypeScript |
| Frontend Framework | React |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Server State | TanStack React Query |
| Client State | Zustand |
| Forms | React Hook Form |
| Validation | Zod |
| Backend Platform | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage |
| Notifications | Firebase Cloud Messaging (FCM) |
| PDF Generation | React-PDF |
| Hosting | Vercel |
| Version Control | Git + GitHub |
| Unit Testing | Vitest |
| Component Testing | React Testing Library |
| E2E Testing | Playwright |

---

# TypeScript

Reason:
- End-to-end type safety
- Better maintainability
- Fewer runtime bugs
- Excellent IDE support

Rejected:
- JavaScript

---

# React

Reason:
- Mature ecosystem
- Excellent TypeScript support
- Large developer community
- Reusable component architecture

Rejected:
- Angular
- Vue

---

# Vite

Reason:
- Extremely fast builds
- Fast development server
- Modern React standard

Rejected:
- Create React App

---

# Tailwind CSS

Reason:
- Rapid UI development
- Consistent design system
- Excellent responsive support
- Smaller CSS bundles

Rejected:
- Bootstrap
- Material UI

---

# TanStack React Query

Used For:
- Products
- Orders
- Inventory
- Analytics

Reason:
- Caching
- Background refetching
- Optimistic updates
- Server state management

Rejected:
- Redux Query
- SWR

---

# Zustand

Used For:
- Shopping cart
- User profile cache
- Small global state

Reason:
- Lightweight
- Minimal boilerplate
- Easy persistence

Rejected:
- Redux Toolkit
- MobX

---

# React Hook Form + Zod

Reason:
- High performance forms
- Type-safe validation
- Excellent TypeScript integration

---

# Supabase

Services Used:
- PostgreSQL
- Authentication
- Storage
- Realtime
- Edge Functions

Reason:
- Fast development
- Managed infrastructure
- Built-in security
- SQL-based backend

Rejected:
- Custom Node.js backend
- Firebase-first architecture

---

# PostgreSQL

Reason:
- ACID compliance
- Strong relational modelling
- Excellent reporting capabilities

Rejected:
- MongoDB
- Firestore

---

# Authentication

Method:
- Phone Number + OTP

Reason:
- Lower friction
- Suitable for grocery store customers
- No password management

---

# Supabase Realtime

Used For:
- Order status updates
- Worker queue updates
- Inventory changes
- Cart monitoring

---

# Supabase Storage

Used For:
- Product images
- Store assets

---

# Firebase Cloud Messaging

Used For:
- Customer notifications
- Worker notifications

Reason:
- Reliable
- Industry standard
- Generous free tier

---

# React-PDF

Used For:
- Digital bills
- Order invoices

---

# Vercel

Used For:
- Frontend hosting
- Deployment

Reason:
- Zero-config deployments
- Excellent React support

---

# Testing Strategy

Unit Testing:
- Vitest

Component Testing:
- React Testing Library

End-to-End Testing:
- Playwright

---

# Future Considerations

Potential future additions:

- Razorpay
- ClickHouse Analytics
- Redis Caching
- Google Maps APIs
- Capacitor Mobile App
- AI Forecasting

These are intentionally out of scope for V1.
