import { useState } from "react";
import { CartDrawer } from "./features/cart/CartDrawer";
import { CartSummaryBar } from "./features/cart/CartSummaryBar";
import { BottomNav } from "./components/BottomNav";
import { ShopPage } from "./pages/ShopPage";

export function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <ShopPage />
      <CartSummaryBar onOpenCart={() => setIsCartOpen(true)} />
      <BottomNav onCartClick={() => setIsCartOpen(true)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
