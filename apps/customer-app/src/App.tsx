import { useState } from "react";
import { CartDrawer } from "./features/cart/CartDrawer";
import { CartSummaryBar } from "./features/cart/CartSummaryBar";
import { BottomNav, type CustomerTab } from "./components/BottomNav";
import { ShopPage } from "./pages/ShopPage";
import { AuthPage } from "./pages/AuthPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { useCurrentUser } from "@grocery/auth";
import { OrdersPage } from "./pages/OrdersPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { ProfilePage } from "./pages/ProfilePage";

export function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CustomerTab>("home");
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
      {isCheckoutOpen ? (
        <CheckoutPage
          onBack={() => setIsCheckoutOpen(false)}
          onOrderPlaced={() => {
            setIsCheckoutOpen(false);
            setActiveTab("orders");
          }}
        />
      ) : activeTab === "orders" ? (
        <OrdersPage />
      ) : activeTab === "profile" ? (
        <ProfilePage />
      ) : (
        <ShopPage />
      )}
      {!isCheckoutOpen ? <CartSummaryBar onOpenCart={() => setIsCartOpen(true)} /> : null}
      {!isCheckoutOpen ? <BottomNav activeTab={activeTab} onCartClick={() => setIsCartOpen(true)} onNavigate={setActiveTab} /> : null}
      <CartDrawer
        isOpen={isCartOpen}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        onClose={() => setIsCartOpen(false)}
      />
    </div>
  );
}
