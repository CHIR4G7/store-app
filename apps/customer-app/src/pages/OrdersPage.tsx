import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@grocery/auth";
import { getCustomerStatusLabel, type OrderStatus } from "@grocery/orders";
import { formatCurrency, pluralize } from "@grocery/shared-utils";
import { Badge, Button, EmptyState } from "@grocery/ui";
import {
  ArrowLeft,
  CalendarClock,
  ChevronRight,
  Clock3,
  CreditCard,
  MapPin,
  PackageCheck,
  ReceiptText,
  Store,
  Truck
} from "lucide-react";

type CustomerOrder = {
  id: string;
  status: OrderStatus;
  payment_status: string;
  fulfillment_type: "delivery" | "pickup";
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  placed_at: string | null;
  packed_at: string | null;
  completed_at: string | null;
  created_at: string;
  addresses: {
    label: string | null;
    house_number: string | null;
    street: string | null;
    landmark: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
  } | null;
  order_items: Array<{
    id: string;
    product_name_snapshot: string;
    price_snapshot: number;
    quantity: number;
    line_total: number;
  }>;
  order_status_history: Array<{
    id: string;
    old_status: OrderStatus | null;
    new_status: OrderStatus;
    note: string | null;
    created_at: string;
  }>;
};

function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatShortDate(value: string | null) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function getAddressLine(address: CustomerOrder["addresses"]) {
  if (!address) return "Store pickup";

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

function getStatusTone(status: OrderStatus) {
  if (status === "DELIVERED" || status === "COLLECTED") return "success";
  if (status === "CANCELLED") return "warning";
  if (status === "OUT_FOR_DELIVERY" || status === "READY_FOR_PICKUP") return "info";
  return "neutral";
}

async function fetchCustomerOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      status,
      payment_status,
      fulfillment_type,
      subtotal,
      delivery_fee,
      total,
      notes,
      placed_at,
      packed_at,
      completed_at,
      created_at,
      addresses (
        label,
        house_number,
        street,
        landmark,
        city,
        state,
        pincode
      ),
      order_items (
        id,
        product_name_snapshot,
        price_snapshot,
        quantity,
        line_total
      ),
      order_status_history (
        id,
        old_status,
        new_status,
        note,
        created_at
      )
    `)
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "order_status_history", ascending: true });

  if (error) throw error;

  return ((data ?? []) as unknown as Array<CustomerOrder & { addresses: CustomerOrder["addresses"] | CustomerOrder["addresses"][] }>).map(
    (order) => ({
      ...order,
      addresses: Array.isArray(order.addresses) ? order.addresses[0] ?? null : order.addresses
    })
  );
}

function OrderListCard({
  order,
  isSelected,
  onSelect
}: {
  order: CustomerOrder;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  const FulfillmentIcon = order.fulfillment_type === "delivery" ? Truck : Store;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border bg-white p-4 text-left transition hover:border-emerald-300 hover:shadow-sm ${
        isSelected ? "border-emerald-500 ring-4 ring-emerald-100" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">#{order.id.slice(0, 8).toUpperCase()}</p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">{getCustomerStatusLabel(order.status)}</h3>
        </div>
        <ChevronRight className="shrink-0 text-slate-400" aria-hidden size={20} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={getStatusTone(order.status)}>{order.status.replaceAll("_", " ")}</Badge>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-600">
          <FulfillmentIcon aria-hidden size={15} />
          {order.fulfillment_type}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-slate-500">Placed</p>
          <p className="font-semibold text-slate-900">{formatShortDate(order.placed_at ?? order.created_at)}</p>
        </div>
        <div>
          <p className="text-slate-500">{pluralize(itemCount, "item")}</p>
          <p className="font-semibold text-slate-900">{formatCurrency(order.total)}</p>
        </div>
      </div>
    </button>
  );
}

function OrderDetail({ order }: { order: CustomerOrder }) {
  const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  const FulfillmentIcon = order.fulfillment_type === "delivery" ? Truck : Store;

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-500">Order #{order.id.slice(0, 8).toUpperCase()}</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">{getCustomerStatusLabel(order.status)}</h2>
          </div>
          <Badge tone={getStatusTone(order.status)}>{order.status.replaceAll("_", " ")}</Badge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <CalendarClock aria-hidden size={17} />
              Placed
            </div>
            <p className="mt-1 font-semibold text-slate-950">{formatDateTime(order.placed_at ?? order.created_at)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <FulfillmentIcon aria-hidden size={17} />
              Fulfillment
            </div>
            <p className="mt-1 font-semibold capitalize text-slate-950">{order.fulfillment_type}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <CreditCard aria-hidden size={17} />
              Payment
            </div>
            <p className="mt-1 font-semibold capitalize text-slate-950">{order.payment_status}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <PackageCheck aria-hidden size={17} />
              Items
            </div>
            <p className="mt-1 font-semibold text-slate-950">{pluralize(itemCount, "item")}</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="text-emerald-700" aria-hidden size={20} />
          <h3 className="text-lg font-bold text-slate-950">{order.fulfillment_type === "delivery" ? "Delivery address" : "Pickup mode"}</h3>
        </div>
        <p className="text-base leading-7 text-slate-700">{getAddressLine(order.addresses)}</p>
        {order.notes ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{order.notes}</p> : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <ReceiptText className="text-emerald-700" aria-hidden size={20} />
          <h3 className="text-lg font-bold text-slate-950">Bill details</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-slate-950">{item.product_name_snapshot}</p>
                <p className="text-sm text-slate-500">
                  {item.quantity} x {formatCurrency(item.price_snapshot)}
                </p>
              </div>
              <p className="font-semibold text-slate-950">{formatCurrency(item.line_total)}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-base">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-semibold">{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Delivery fee</span>
            <span className="font-semibold">{formatCurrency(order.delivery_fee)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-slate-950">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Clock3 className="text-emerald-700" aria-hidden size={20} />
          <h3 className="text-lg font-bold text-slate-950">Status timeline</h3>
        </div>
        <div className="space-y-3">
          {order.order_status_history.length > 0 ? (
            order.order_status_history.map((entry) => (
              <div key={entry.id} className="flex gap-3">
                <div className="mt-1 h-3 w-3 rounded-full bg-emerald-600" />
                <div>
                  <p className="font-semibold text-slate-950">{entry.new_status.replaceAll("_", " ")}</p>
                  <p className="text-sm text-slate-500">{formatDateTime(entry.created_at)}</p>
                  {entry.note ? <p className="mt-1 text-sm text-slate-600">{entry.note}</p> : null}
                </div>
              </div>
            ))
          ) : (
            <p className="text-base text-slate-600">{getCustomerStatusLabel(order.status)}</p>
          )}
        </div>
      </section>
    </div>
  );
}

export function OrdersPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const ordersQuery = useQuery({
    queryKey: ["customer-orders"],
    queryFn: fetchCustomerOrders
  });

  const orders = ordersQuery.data ?? [];
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null,
    [orders, selectedOrderId]
  );

  if (ordersQuery.isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-3 pb-28 pt-4 sm:px-6">
        <div className="mb-5 h-10 w-44 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-lg bg-slate-200" />
            ))}
          </div>
          <div className="h-96 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </main>
    );
  }

  if (ordersQuery.error) {
    return (
      <main className="mx-auto max-w-4xl px-3 pb-28 pt-4 sm:px-6">
        <EmptyState title="Could not load orders" body={ordersQuery.error.message} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-3 pb-28 pt-4 sm:px-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-emerald-700">Order history</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Your orders</h1>
        </div>
        <p className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm">
          {pluralize(orders.length, "order")}
        </p>
      </header>

      {orders.length === 0 ? (
        <EmptyState title="No orders yet" body="Orders you place will appear here with item details, bill totals, and status updates." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <section className={`${selectedOrderId ? "hidden lg:block" : "block"} space-y-3`}>
            {orders.map((order) => (
              <OrderListCard
                key={order.id}
                order={order}
                isSelected={selectedOrder?.id === order.id}
                onSelect={() => setSelectedOrderId(order.id)}
              />
            ))}
          </section>

          <section className={`${selectedOrderId ? "block" : "hidden lg:block"}`}>
            {selectedOrder ? (
              <>
                <Button className="mb-3 lg:hidden" variant="ghost" onClick={() => setSelectedOrderId(null)}>
                  <ArrowLeft aria-hidden size={18} />
                  Orders
                </Button>
                <OrderDetail order={selectedOrder} />
              </>
            ) : null}
          </section>
        </div>
      )}
    </main>
  );
}
