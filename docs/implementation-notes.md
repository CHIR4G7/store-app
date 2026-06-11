# Implementation Notes

This frontend scaffold follows the planning documents in `/Users/chirag/Downloads/store-app-mds `.

- React + Vite + TypeScript workspaces
- Shared packages for UI, products, auth, constants, and utilities
- Customer app implements the first vertical slice with mock-backed product queries and a persisted cart
- Worker and admin apps are bootable shells for Phase 0

The product data layer is isolated in `packages/products`, so it can be swapped from mock data to Supabase without moving query code into pages.
