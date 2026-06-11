import { useQuery } from "@tanstack/react-query";

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
};

export type Product = {
  id: string;
  categoryId: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  mrp: number;
  stock: number;
  unit: string;
  imageUrl: string;
  isAvailable: boolean;
};

export const categories: Category[] = [
  { id: "fresh", name: "Fresh", sortOrder: 1 },
  { id: "dairy", name: "Dairy", sortOrder: 2 },
  { id: "staples", name: "Staples", sortOrder: 3 },
  { id: "snacks", name: "Snacks", sortOrder: 4 },
  { id: "household", name: "Household", sortOrder: 5 }
];

export const products: Product[] = [
  {
    id: "tomatoes",
    categoryId: "fresh",
    sku: "FRESH-TOM-001",
    name: "Fresh Tomatoes",
    description: "Firm red tomatoes for curries, salads, and chutneys.",
    price: 42,
    mrp: 52,
    stock: 120,
    unit: "1 kg",
    imageUrl: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80",
    isAvailable: true
  },
  {
    id: "bananas",
    categoryId: "fresh",
    sku: "FRESH-BAN-001",
    name: "Robusta Bananas",
    description: "Naturally ripened bananas, great for daily breakfast.",
    price: 58,
    mrp: 68,
    stock: 80,
    unit: "1 dozen",
    imageUrl: "https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=600&q=80",
    isAvailable: true
  },
  {
    id: "milk",
    categoryId: "dairy",
    sku: "DAIRY-MILK-500",
    name: "Toned Milk",
    description: "Fresh daily milk pouch.",
    price: 32,
    mrp: 34,
    stock: 64,
    unit: "500 ml",
    imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80",
    isAvailable: true
  },
  {
    id: "paneer",
    categoryId: "dairy",
    sku: "DAIRY-PAN-200",
    name: "Fresh Paneer",
    description: "Soft paneer block for snacks and main dishes.",
    price: 92,
    mrp: 110,
    stock: 28,
    unit: "200 g",
    imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80",
    isAvailable: true
  },
  {
    id: "atta",
    categoryId: "staples",
    sku: "STAP-ATTA-5K",
    name: "Whole Wheat Atta",
    description: "Stone-ground wheat flour for soft rotis.",
    price: 248,
    mrp: 285,
    stock: 45,
    unit: "5 kg",
    imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80",
    isAvailable: true
  },
  {
    id: "basmati",
    categoryId: "staples",
    sku: "STAP-RICE-5K",
    name: "Basmati Rice",
    description: "Long grain rice for everyday meals and biryani.",
    price: 620,
    mrp: 699,
    stock: 22,
    unit: "5 kg",
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
    isAvailable: true
  },
  {
    id: "chips",
    categoryId: "snacks",
    sku: "SNACK-CHIP-001",
    name: "Classic Salted Chips",
    description: "Crisp potato chips for tea-time snacking.",
    price: 20,
    mrp: 20,
    stock: 150,
    unit: "52 g",
    imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80",
    isAvailable: true
  },
  {
    id: "detergent",
    categoryId: "household",
    sku: "HOME-DET-1K",
    name: "Laundry Detergent",
    description: "Daily-use detergent powder for machine and bucket wash.",
    price: 178,
    mrp: 210,
    stock: 36,
    unit: "1 kg",
    imageUrl: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80",
    isAvailable: true
  }
];

type ProductFilters = {
  search?: string;
  categoryId?: string;
};

function filterProducts(filters: ProductFilters) {
  const search = filters.search?.trim().toLowerCase();

  return products.filter((product) => {
    const categoryMatches = !filters.categoryId || product.categoryId === filters.categoryId;
    const searchMatches =
      !search ||
      product.name.toLowerCase().includes(search) ||
      product.description.toLowerCase().includes(search) ||
      product.sku.toLowerCase().includes(search);

    return product.isAvailable && categoryMatches && searchMatches;
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => categories,
    staleTime: 30 * 60 * 1000
  });
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: ["products", filters.search ?? "", filters.categoryId ?? ""],
    queryFn: async () => filterProducts(filters),
    staleTime: 5 * 60 * 1000
  });
}

export function useProduct(productId: string) {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: async () => products.find((product) => product.id === productId) ?? null,
    staleTime: 5 * 60 * 1000
  });
}
