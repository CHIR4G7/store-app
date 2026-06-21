import { Home, ListOrdered, ShoppingBasket, ShoppingCart, UserRound } from "lucide-react";

export type CustomerTab = "home" | "categories" | "orders" | "profile";

const items = [
  { label: "Home", icon: Home, tab: "home" },
  { label: "Categories", icon: ShoppingBasket, tab: "categories" },
  { label: "Cart", icon: ShoppingCart, tab: "cart" },
  { label: "Orders", icon: ListOrdered, tab: "orders" },
  { label: "Profile", icon: UserRound, tab: "profile" }
] as const;

export function BottomNav({
  activeTab,
  onCartClick,
  onNavigate
}: {
  activeTab: CustomerTab;
  onCartClick: () => void;
  onNavigate: (tab: CustomerTab) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white sm:hidden" aria-label="Primary">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const isCart = item.tab === "cart";
          const isActive = !isCart && activeTab === item.tab;

          return (
            <button
              key={item.label}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-sm ${isActive ? "text-emerald-700" : "text-slate-500"}`}
              onClick={isCart ? onCartClick : () => onNavigate(item.tab)}
              type="button"
            >
              <Icon aria-hidden size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
