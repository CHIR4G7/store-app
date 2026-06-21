import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@grocery/products";
import { useMemo } from "react";

export type CartItem = {
  product: Product;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((item) => item.product.id === product.id);

          if (existing) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
              )
            };
          }

          return { items: [...state.items, { product, quantity: 1 }] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId)
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((item) => item.product.id !== productId)
              : state.items.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
        })),
      clearCart: () => set({ items: [] })
    }),
    {
      name: "grocery-cart"
    }
  )
);

export function useCartTotals() {
  const items = useCartStore((state) => state.items);

  return useMemo(() => {
    const itemCount = items.length;
    const subtotal = items.reduce((total, item) => total + item.product.price * item.quantity, 0);
    const mrpTotal = items.reduce((total, item) => total + item.product.mrp * item.quantity, 0);

    return {
      itemCount,
      subtotal,
      savings: Math.max(0, mrpTotal - subtotal)
    };
  }, [items]);
}
