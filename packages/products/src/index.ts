import { useQuery } from "@tanstack/react-query";
import { supabase } from "@grocery/auth";

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
};

export type Product = {
  id: string;
  categoryId: string | null;
  sku: string | null;
  name: string;
  description: string;
  price: number;
  mrp: number;
  stock: number;
  unit: string;
  imageUrl: string;
  isAvailable: boolean;
};

type ProductFilters = {
  search?: string;
  categoryId?: string;
};

type CategoryRow = {
  id: string;
  name: string;
  sort_order: number | null;
};

type ProductRow = {
  id: string;
  category_id: string | null;
  sku: string | null;
  name: string;
  description: string | null;
  price: number | string;
  stock: number | null;
  image_url: string | null;
  is_available: boolean | null;
};

function toNumber(value: number | string | null | undefined) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order ?? 0
  };
}

function mapProduct(row: ProductRow): Product {
  const price = toNumber(row.price);

  return {
    id: row.id,
    categoryId: row.category_id,
    sku: row.sku,
    name: row.name,
    description: row.description ?? "",
    price,
    mrp: price,
    stock: row.stock ?? 0,
    unit: row.sku ?? "item",
    imageUrl:
      row.image_url ??
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
    isAvailable: row.is_available ?? true
  };
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;

      return ((data ?? []) as CategoryRow[]).map(mapCategory);
    },
    staleTime: 30 * 60 * 1000
  });
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: ["products", filters.search ?? "", filters.categoryId ?? ""],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, category_id, sku, name, description, price, stock, image_url, is_available")
        .eq("is_available", true)
        .order("name", { ascending: true });

      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }

      const search = filters.search?.trim();

      if (search) {
        const escapedSearch = search.replaceAll("%", "\\%").replaceAll("_", "\\_");
        query = query.or(`name.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%,sku.ilike.%${escapedSearch}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return ((data ?? []) as ProductRow[]).map(mapProduct);
    },
    staleTime: 5 * 60 * 1000
  });
}

export function useProduct(productId: string) {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, category_id, sku, name, description, price, stock, image_url, is_available")
        .eq("id", productId)
        .maybeSingle();

      if (error) throw error;

      return data ? mapProduct(data as ProductRow) : null;
    },
    staleTime: 5 * 60 * 1000
  });
}
