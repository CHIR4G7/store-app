import { Home, ListOrdered, ShoppingBasket, ShoppingCart, UserRound } from "lucide-react";

const items = [
  { label: "Home", icon: Home, active: true },
  { label: "Categories", icon: ShoppingBasket, active: false },
  { label: "Cart", icon: ShoppingCart, active: false },
  { label: "Orders", icon: ListOrdered, active: false },
  { label: "Profile", icon: UserRound, active: false }
];

export function BottomNav({ onCartClick }: { onCartClick: () => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white sm:hidden" aria-label="Primary">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const isCart = item.label === "Cart";

          return (
            <button
              key={item.label}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-sm ${item.active ? "text-emerald-700" : "text-slate-500"}`}
              onClick={isCart ? onCartClick : undefined}
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
