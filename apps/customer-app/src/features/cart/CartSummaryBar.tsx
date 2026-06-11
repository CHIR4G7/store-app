import { formatCurrency, pluralize } from "@grocery/shared-utils";
import { ShoppingCart } from "lucide-react";
import { useCartTotals } from "../../stores/cartStore";

export function CartSummaryBar({ onOpenCart }: { onOpenCart: () => void }) {
  const totals = useCartTotals();

  if (totals.itemCount === 0) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-16 z-20 px-3 sm:bottom-4">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 rounded-lg bg-slate-950 p-3 text-white shadow-xl">
        <div>
          <p className="text-base font-semibold">{pluralize(totals.itemCount, "item")}</p>
          <p className="text-sm text-slate-200">{formatCurrency(totals.subtotal)} ready in cart</p>
        </div>
        <button
          type="button"
          onClick={onOpenCart}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-base font-semibold text-slate-950 transition hover:bg-slate-100"
        >
          <ShoppingCart aria-hidden size={18} />
          View cart
        </button>
      </div>
    </div>
  );
}
