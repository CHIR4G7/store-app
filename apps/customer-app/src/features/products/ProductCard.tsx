import { Badge, Button } from "@grocery/ui";
import type { Product } from "@grocery/products";
import { formatCurrency } from "@grocery/shared-utils";
import { Plus } from "lucide-react";
import { useCartStore } from "../../stores/cartStore";

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="space-y-3 p-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-snug text-slate-950">{product.name}</h3>
            {product.stock < 30 ? <Badge tone="warning">Low</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-slate-500">{product.unit}</p>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-lg font-bold text-slate-950">{formatCurrency(product.price)}</p>
            {product.mrp > product.price ? <p className="text-sm text-slate-500 line-through">{formatCurrency(product.mrp)}</p> : null}
          </div>
          <Button className="min-w-24" onClick={() => addItem(product)}>
            <Plus aria-hidden size={18} />
            Add
          </Button>
        </div>
      </div>
    </article>
  );
}
