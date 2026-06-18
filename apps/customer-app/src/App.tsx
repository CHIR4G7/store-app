import { useState } from "react";
import { CartDrawer } from "./features/cart/CartDrawer";
import { CartSummaryBar } from "./features/cart/CartSummaryBar";
import { BottomNav } from "./components/BottomNav";
import { ShopPage } from "./pages/ShopPage";
import { AuthPage } from "./pages/AuthPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { useCurrentUser } from "@grocery/auth";

export function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { isAuthenticated, isLoading, needsOnboarding, refreshProfile, user } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-base font-semibold text-slate-700 shadow-sm">
          Loading your grocery store
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (needsOnboarding) {
    return <OnboardingPage onComplete={refreshProfile} />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ShopPage />
      <CartSummaryBar onOpenCart={() => setIsCartOpen(true)} />
      <BottomNav onCartClick={() => setIsCartOpen(true)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
