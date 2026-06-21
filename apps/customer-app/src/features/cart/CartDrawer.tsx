import { Button, EmptyState } from "@grocery/ui";
import { formatCurrency, pluralize } from "@grocery/shared-utils";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useCartStore, useCartTotals } from "../../stores/cartStore";

export function CartDrawer({
  isOpen,
  onCheckout,
  onClose
}: {
  isOpen: boolean;
  onCheckout: () => void;
  onClose: () => void;
}) {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const totals = useCartTotals();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-30 bg-slate-950/40" role="dialog" aria-modal="true" aria-label="Cart">
      <div className="ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Cart</h2>
            <p className="text-base text-slate-600">{pluralize(totals.itemCount, "item")}</p>
          </div>
          <Button variant="ghost" onClick={onClose} aria-label="Close cart" className="h-11 w-11 p-0">
            <X aria-hidden size={22} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <EmptyState title="Your cart is empty" body="Add products from the shop to begin checkout." />
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3 rounded-lg border border-slate-200 p-3">
                  <img src={item.product.imageUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-950">{item.product.name}</h3>
                    <p className="text-sm text-slate-500">{item.product.unit}</p>
                    <p className="mt-1 font-bold text-slate-950">{formatCurrency(item.product.price * item.quantity)}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-lg border border-slate-300">
                        <button className="grid h-10 w-10 place-items-center" onClick={() => updateQuantity(item.product.id, item.quantity - 1)} aria-label="Decrease quantity">
                          <Minus aria-hidden size={16} />
                        </button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <button className="grid h-10 w-10 place-items-center" onClick={() => updateQuantity(item.product.id, item.quantity + 1)} aria-label="Increase quantity">
                          <Plus aria-hidden size={16} />
                        </button>
                      </div>
                      <button className="grid h-10 w-10 place-items-center text-red-600" onClick={() => removeItem(item.product.id)} aria-label={`Remove ${item.product.name}`}>
                        <Trash2 aria-hidden size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 p-4">
          <div className="space-y-2 text-base">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Savings</span>
              <span className="font-semibold">{formatCurrency(totals.savings)}</span>
            </div>
          </div>
          <Button className="mt-4 w-full" disabled={items.length === 0} onClick={onCheckout}>
            Continue to checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
