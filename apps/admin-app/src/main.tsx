import React, { FormEvent, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sendPhoneOtp, signOut, supabase, useCurrentUser, verifyPhoneOtp } from "@grocery/auth";
import { formatCurrency } from "@grocery/shared-utils";
import { Badge, Button, EmptyState, Input } from "@grocery/ui";
import {
  Boxes,
  CheckCircle2,
  ImageIcon,
  Loader2,
  PackagePlus,
  Plus,
  Search,
  ShieldCheck,
  Store,
  Tags,
  XCircle
} from "lucide-react";
import "./index.css";

type Category = {
  id: string;
  name: string;
  sort_order: number | null;
};

type Product = {
  id: string;
  category_id: string | null;
  sku: string | null;
  name: string;
  description: string | null;
  price: number | string;
  stock: number | null;
  image_url: string | null;
  is_available: boolean | null;
  created_at: string;
  updated_at: string;
  categories: { name: string } | null;
};

type ProductForm = {
  categoryId: string;
  sku: string;
  name: string;
  description: string;
  price: string;
  stock: string;
  imageUrl: string;
  isAvailable: boolean;
};

const queryClient = new QueryClient();

function normalizeIndianPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;

  return value.trim();
}

function toNumber(value: number | string | null | undefined) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function AdminLogin() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const normalizedPhone = normalizeIndianPhone(phone);

  async function handleSendOtp(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const { error: otpError } = await sendPhoneOtp(normalizedPhone);

    setIsSubmitting(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    setIsOtpSent(true);
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const { error: verifyError } = await verifyPhoneOtp(normalizedPhone, otp.trim());

    setIsSubmitting(false);

    if (verifyError) {
      setError(verifyError.message);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
            <ShieldCheck aria-hidden size={24} />
          </div>
          <div>
            <Badge tone="info">Admin</Badge>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">Store admin login</h1>
          </div>
        </div>

        <form className="space-y-4" onSubmit={isOtpSent ? handleVerifyOtp : handleSendOtp}>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Mobile number</span>
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="tel"
              disabled={isSubmitting || isOtpSent}
              placeholder="98765 43210"
              required
            />
          </label>

          {isOtpSent ? (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">OTP</span>
              <Input
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </label>
          ) : null}

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" aria-hidden size={18} /> : null}
            {isOtpSent ? "Verify OTP" : "Send OTP"}
          </Button>
        </form>
      </section>
    </main>
  );
}

async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []) as Category[];
}

async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      category_id,
      sku,
      name,
      description,
      price,
      stock,
      image_url,
      is_available,
      created_at,
      updated_at,
      categories (
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as unknown as Product[];
}

function ProductCreateForm({ categories }: { categories: Category[] }) {
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<ProductForm>({
    categoryId: categories[0]?.id ?? "",
    sku: "",
    name: "",
    description: "",
    price: "",
    stock: "",
    imageUrl: "",
    isAvailable: true
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const [uploadedImageName, setUploadedImageName] = useState("");

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setIsUploadingImage(true);
    setImageUploadError("");

    try {
      const extension = file.name.split(".").pop() || "jpg";
      const filePath = `products/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("images").getPublicUrl(filePath);

      setForm((current) => ({ ...current, imageUrl: data.publicUrl }));
      setUploadedImageName(file.name);
    } catch (error) {
      setImageUploadError(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setIsUploadingImage(false);
      event.target.value = "";
    }
  }

  const createProduct = useMutation({
    mutationFn: async () => {
      const price = Number(form.price);
      const stock = Number(form.stock);

      if (!form.name.trim()) throw new Error("Product name is required");
      if (!Number.isFinite(price) || price < 0) throw new Error("Price must be zero or greater");
      if (!Number.isInteger(stock) || stock < 0) throw new Error("Stock must be a whole number zero or greater");

      const { error } = await supabase.from("products").insert({
        category_id: form.categoryId || null,
        sku: form.sku.trim() || null,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price,
        stock,
        image_url: form.imageUrl.trim() || null,
        is_available: form.isAvailable
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      setForm({
        categoryId: categories[0]?.id ?? "",
        sku: "",
        name: "",
        description: "",
        price: "",
        stock: "",
        imageUrl: "",
        isAvailable: true
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    }
  });

  function updateField<Key extends keyof ProductForm>(key: Key, value: ProductForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <PackagePlus className="text-emerald-700" aria-hidden size={22} />
        <h2 className="text-xl font-bold text-slate-950">Add product</h2>
      </div>

      <form
        className="grid gap-4 lg:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          createProduct.mutate();
        }}
      >
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Product name</span>
          <Input value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Category</span>
          <select
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            value={form.categoryId}
            onChange={(event) => updateField("categoryId", event.target.value)}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">SKU</span>
          <Input value={form.sku} onChange={(event) => updateField("sku", event.target.value)} placeholder="DAIRY-MILK-500" />
        </label>

        <div className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Product image</span>
          <input
            ref={imageInputRef}
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
          />
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-slate-300 p-3">
            <Button type="button" variant="secondary" onClick={() => imageInputRef.current?.click()} disabled={isUploadingImage}>
              {isUploadingImage ? <Loader2 className="animate-spin" aria-hidden size={18} /> : <ImageIcon aria-hidden size={18} />}
              {isUploadingImage ? "Uploading..." : form.imageUrl ? "Change image" : "Upload image"}
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-600">
                {uploadedImageName || (form.imageUrl ? "Image uploaded" : "No image uploaded yet")}
              </p>
              {form.imageUrl ? (
                <p className="truncate text-xs text-slate-500">{form.imageUrl}</p>
              ) : null}
            </div>
            {form.imageUrl ? <img src={form.imageUrl} alt="Uploaded product preview" className="h-14 w-14 rounded-lg object-cover" /> : null}
          </div>
          {imageUploadError ? <p className="mt-2 text-sm text-red-700">{imageUploadError}</p> : null}
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Price</span>
          <Input type="number" min="0" step="0.01" value={form.price} onChange={(event) => updateField("price", event.target.value)} required />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Stock</span>
          <Input type="number" min="0" step="1" value={form.stock} onChange={(event) => updateField("stock", event.target.value)} required />
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Description</span>
          <textarea
            className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
          <input
            type="checkbox"
            checked={form.isAvailable}
            onChange={(event) => updateField("isAvailable", event.target.checked)}
          />
          <span className="font-semibold text-slate-700">Available for customers</span>
        </label>

        <div className="flex items-center justify-end gap-3">
          {createProduct.error ? <p className="text-sm text-red-700">{createProduct.error.message}</p> : null}
          {createProduct.isSuccess ? <p className="text-sm text-emerald-700">Product added</p> : null}
          <Button type="submit" disabled={createProduct.isPending}>
            {createProduct.isPending ? <Loader2 className="animate-spin" aria-hidden size={18} /> : <Plus aria-hidden size={18} />}
            Add product
          </Button>
        </div>
      </form>
    </section>
  );
}

function CategoryCreateForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const createCategory = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Category name is required");

      const { error } = await supabase.from("categories").insert({
        name: name.trim()
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    }
  });

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Tags className="text-emerald-700" aria-hidden size={22} />
        <h2 className="text-xl font-bold text-slate-950">Categories</h2>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          createCategory.mutate();
        }}
      >
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Dairy" />
        <Button type="submit" disabled={createCategory.isPending}>
          {createCategory.isPending ? <Loader2 className="animate-spin" aria-hidden size={18} /> : <Plus aria-hidden size={18} />}
          Add
        </Button>
      </form>

      {createCategory.error ? <p className="mt-3 text-sm text-red-700">{createCategory.error.message}</p> : null}
    </section>
  );
}

function ProductTable({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return products;

    return products.filter((product) =>
      [product.name, product.sku, product.description, product.categories?.name]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch))
    );
  }, [products, search]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Inventory</h2>
          <p className="text-base text-slate-600">{products.length} products in catalog</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden size={18} />
          <Input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" />
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <EmptyState title="No products found" body="Add a product or adjust the search." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[780px] border-collapse text-left text-base">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Category</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Price</th>
                <th className="p-3">Image</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-t border-slate-200">
                  <td className="p-3">
                    <p className="font-semibold text-slate-950">{product.name}</p>
                    <p className="text-sm text-slate-500">{product.sku ?? product.id}</p>
                  </td>
                  <td className="p-3">{product.categories?.name ?? "No category"}</td>
                  <td className="p-3">{product.stock ?? 0}</td>
                  <td className="p-3">{formatCurrency(toNumber(product.price))}</td>
                  <td className="p-3">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-slate-400">
                        <ImageIcon aria-hidden size={20} />
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    {product.is_available ? <Badge tone="success">Available</Badge> : <Badge tone="warning">Hidden</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AdminDashboard() {
  const { user } = useCurrentUser();
  const productsQuery = useQuery({ queryKey: ["admin-products"], queryFn: fetchProducts });
  const categoriesQuery = useQuery({ queryKey: ["admin-categories"], queryFn: fetchCategories });
  const products = productsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const availableCount = products.filter((product) => product.is_available).length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Badge tone="info">Admin</Badge>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Store inventory</h1>
          <p className="mt-2 text-base text-slate-600">Signed in as {user?.fullName ?? "admin"}</p>
        </div>
        <Button variant="secondary" onClick={() => void signOut()}>
          Sign out
        </Button>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base text-slate-600">Products</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{products.length}</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
              <Boxes aria-hidden size={24} />
            </div>
          </div>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base text-slate-600">Available</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{availableCount}</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 aria-hidden size={24} />
            </div>
          </div>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base text-slate-600">Hidden</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{products.length - availableCount}</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-orange-100 text-orange-700">
              <XCircle aria-hidden size={24} />
            </div>
          </div>
        </article>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <ProductCreateForm categories={categories} />
          {productsQuery.isLoading ? (
            <div className="h-80 animate-pulse rounded-lg bg-slate-200" />
          ) : productsQuery.error ? (
            <EmptyState title="Could not load inventory" body={productsQuery.error.message} />
          ) : (
            <ProductTable products={products} />
          )}
        </div>
        <div className="space-y-4">
          <CategoryCreateForm />
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Store className="text-emerald-700" aria-hidden size={22} />
              <h2 className="text-xl font-bold text-slate-950">Category list</h2>
            </div>
            {categoriesQuery.isLoading ? (
              <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
            ) : categories.length === 0 ? (
              <p className="text-base text-slate-600">No categories yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Badge key={category.id}>{category.name}</Badge>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function AdminApp() {
  const { isAuthenticated, isLoading, user } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 font-semibold text-slate-700 shadow-sm">
          Loading admin
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  if (!user || user.role !== "admin" || !user.isActive) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <section className="max-w-md rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm">
          <ShieldCheck className="mx-auto text-red-600" aria-hidden size={32} />
          <h1 className="mt-3 text-2xl font-bold text-slate-950">Admin access required</h1>
          <p className="mt-2 text-base text-slate-600">Your account is signed in, but it does not have an active admin profile.</p>
          <Button className="mt-4" variant="secondary" onClick={() => void signOut()}>
            Sign out
          </Button>
        </section>
      </main>
    );
  }

  return <AdminDashboard />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AdminApp />
    </QueryClientProvider>
  </React.StrictMode>
);
