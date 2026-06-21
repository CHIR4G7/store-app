import { FormEvent, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, useCurrentUser } from "@grocery/auth";
import { formatCurrency, pluralize } from "@grocery/shared-utils";
import { Badge, Button, EmptyState } from "@grocery/ui";
import { ArrowLeft, CheckCircle2, Home, Loader2, MapPin, PackageCheck, ReceiptText, Store, Truck } from "lucide-react";
import { useCartStore, useCartTotals } from "../stores/cartStore";

type FulfillmentType = "delivery" | "pickup";

type Address = {
  id: string;
  label: string | null;
  house_number: string | null;
  street: string | null;
  landmark: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_default: boolean;
};

type CheckoutPageProps = {
  onBack: () => void;
  onOrderPlaced: () => void;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function addressLine(address: Address) {
  return [
    address.house_number,
    address.street,
    address.landmark,
    address.city,
    address.state,
    address.pincode
  ]
    .filter(Boolean)
    .join(", ");
}

async function fetchAddresses() {
  const { data, error } = await supabase
    .from("addresses")
    .select("id, label, house_number, street, landmark, city, state, pincode, is_default")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as Address[];
}

export function CheckoutPage({ onBack, onOrderPlaced }: CheckoutPageProps) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const totals = useCartTotals();
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>("delivery");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addressesQuery = useQuery({
    queryKey: ["customer-addresses"],
    queryFn: fetchAddresses
  });

  const addresses = addressesQuery.data ?? [];
  const selectedAddress = useMemo(() => {
    if (selectedAddressId) return addresses.find((address) => address.id === selectedAddressId) ?? null;
    return addresses.find((address) => address.is_default) ?? addresses[0] ?? null;
  }, [addresses, selectedAddressId]);

  const deliveryFee = fulfillmentType === "delivery" ? 0 : 0;
  const total = totals.subtotal + deliveryFee;

  async function syncCartToSupabase(customerId: string) {
    const invalidItem = items.find((item) => !uuidPattern.test(item.product.id));

    if (invalidItem) {
      throw new Error("Your cart contains old local products. Clear the cart and add products from the live catalog again.");
    }

    const { error: deleteError } = await supabase.from("cart_items").delete().eq("user_id", customerId);

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase.from("cart_items").insert(
      items.map((item) => ({
        user_id: customerId,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_add: item.product.price
      }))
    );

    if (insertError) throw insertError;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!user) {
      setError("Please sign in again before checkout.");
      return;
    }

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (fulfillmentType === "delivery" && !selectedAddress) {
      setError("Choose a delivery address.");
      return;
    }

    setIsSubmitting(true);

    try {
      await syncCartToSupabase(user.id);

      const { error: functionError } = await supabase.functions.invoke("place-order", {
        body: {
          addressId: fulfillmentType === "delivery" ? selectedAddress?.id : null,
          fulfillmentType,
          notes: notes.trim()
        }
      });

      if (functionError) throw functionError;

      clearCart();
      await queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
      onOrderPlaced();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not place order.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-3 pb-28 pt-4 sm:px-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft aria-hidden size={18} />
          Back to shop
        </Button>
        <div className="mt-6">
          <EmptyState title="Your cart is empty" body="Add products before starting checkout." />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-3 pb-28 pt-4 sm:px-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft aria-hidden size={18} />
            Shop
          </Button>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Checkout</h1>
          <p className="mt-1 text-base text-slate-600">Review your cart and choose how you want to receive the order.</p>
        </div>
        <Badge tone="success">
          <CheckCircle2 aria-hidden size={16} />
          Secure order
        </Badge>
      </header>

      <form className="grid gap-4 lg:grid-cols-[1fr_380px]" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <PackageCheck className="text-emerald-700" aria-hidden size={20} />
              <h2 className="text-xl font-bold text-slate-950">Cart review</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3 py-3">
                  <img src={item.product.imageUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-950">{item.product.name}</h3>
                        <p className="text-sm text-slate-500">{item.product.unit}</p>
                      </div>
                      <p className="font-bold text-slate-950">{formatCurrency(item.product.price * item.quantity)}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {item.quantity} x {formatCurrency(item.product.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Truck className="text-emerald-700" aria-hidden size={20} />
              <h2 className="text-xl font-bold text-slate-950">Delivery mode</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFulfillmentType("delivery")}
                className={`rounded-lg border p-4 text-left transition ${
                  fulfillmentType === "delivery" ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-100" : "border-slate-200 bg-white"
                }`}
              >
                <Truck className="text-emerald-700" aria-hidden size={22} />
                <p className="mt-3 font-bold text-slate-950">Home delivery</p>
                <p className="mt-1 text-sm text-slate-600">Send this order to your saved address.</p>
              </button>
              <button
                type="button"
                onClick={() => setFulfillmentType("pickup")}
                className={`rounded-lg border p-4 text-left transition ${
                  fulfillmentType === "pickup" ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-100" : "border-slate-200 bg-white"
                }`}
              >
                <Store className="text-emerald-700" aria-hidden size={22} />
                <p className="mt-3 font-bold text-slate-950">Store pickup</p>
                <p className="mt-1 text-sm text-slate-600">Collect from the store after packing.</p>
              </button>
            </div>
          </section>

          {fulfillmentType === "delivery" ? (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="text-emerald-700" aria-hidden size={20} />
                <h2 className="text-xl font-bold text-slate-950">Delivery address</h2>
              </div>

              {addressesQuery.isLoading ? (
                <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
              ) : addresses.length === 0 ? (
                <EmptyState title="No address found" body="Add an address in your profile before choosing delivery." />
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => {
                    const checked = selectedAddress?.id === address.id;

                    return (
                      <label
                        key={address.id}
                        className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                          checked ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-100" : "border-slate-200 bg-white"
                        }`}
                      >
                        <input
                          className="mt-1"
                          type="radio"
                          checked={checked}
                          onChange={() => setSelectedAddressId(address.id)}
                        />
                        <span>
                          <span className="flex items-center gap-2 font-bold text-slate-950">
                            <Home aria-hidden size={17} />
                            {address.label ?? "Address"}
                          </span>
                          <span className="mt-1 block text-sm leading-6 text-slate-600">{addressLine(address)}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <label className="block">
              <span className="mb-2 block text-base font-bold text-slate-950">Order notes</span>
              <textarea
                className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Delivery instructions, preferred substitutions, or pickup notes"
              />
            </label>
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
          <div className="mb-4 flex items-center gap-2">
            <ReceiptText className="text-emerald-700" aria-hidden size={20} />
            <h2 className="text-xl font-bold text-slate-950">Bill summary</h2>
          </div>

          <div className="space-y-3 text-base">
            <div className="flex justify-between">
              <span className="text-slate-600">{pluralize(totals.itemCount, "item")}</span>
              <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Delivery fee</span>
              <span className="font-semibold">{formatCurrency(deliveryFee)}</span>
            </div>
            {totals.savings > 0 ? (
              <div className="flex justify-between text-emerald-700">
                <span>Savings</span>
                <span className="font-semibold">{formatCurrency(totals.savings)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold text-slate-950">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <Button
            className="mt-5 w-full"
            type="submit"
            disabled={isSubmitting || addressesQuery.isLoading || (fulfillmentType === "delivery" && !selectedAddress)}
          >
            {isSubmitting ? <Loader2 className="animate-spin" aria-hidden size={18} /> : null}
            Place order
          </Button>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Final prices and stock are verified by the server before the order is created.
          </p>
        </aside>
      </form>
    </main>
  );
}
