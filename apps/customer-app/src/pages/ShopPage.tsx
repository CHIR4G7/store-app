import { useMemo, useState } from "react";
import { useCategories, useProducts } from "@grocery/products";
import { Badge, Input } from "@grocery/ui";
import { pluralize } from "@grocery/shared-utils";
import { Search, Truck } from "lucide-react";
import { useCurrentUser } from "@grocery/auth";
import { CategoryTabs } from "../features/products/CategoryTabs";
import { ProductGrid } from "../features/products/ProductGrid";

export function ShopPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const { user } = useCurrentUser();
  const categoriesQuery = useCategories();
  const productsQuery = useProducts({ search, categoryId: selectedCategory });
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-3 pb-36 pt-4 sm:px-6 sm:pb-28">
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base text-slate-600">{greeting}, {user.fullName}</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight text-slate-950">Shop groceries</h1>
          </div>
          <Badge tone="success">
            <Truck aria-hidden size={16} />
            4 km delivery
          </Badge>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden size={20} />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search milk, rice, snacks"
            aria-label="Search products"
            className="pl-10"
          />
        </div>

        {categoriesQuery.data ? (
          <CategoryTabs categories={categoriesQuery.data} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
        ) : (
          <div className="h-11 rounded-lg bg-slate-200" />
        )}
      </header>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-950">Available today</h2>
          <p className="text-base text-slate-600">{pluralize(productsQuery.data?.length ?? 0, "item")}</p>
        </div>

        {productsQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-lg bg-slate-200" />
            ))}
          </div>
        ) : (
          <ProductGrid products={productsQuery.data ?? []} />
        )}
      </section>
    </main>
  );
}
