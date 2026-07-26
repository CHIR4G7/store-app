import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@grocery/auth";
import type { OrderStatus } from "@grocery/orders";
import { formatCurrency, pluralize } from "@grocery/shared-utils";
import { Badge, EmptyState, Input } from "@grocery/ui";
import { IndianRupee, Search, TrendingUp, Users } from "lucide-react";
import { formatShortDate, getStatusTone, toNumber } from "../lib/orderFormat";
import { StatCard } from "../components/StatCard";

type CustomerOrderSummary = {
  id: string;
  status: OrderStatus;
  total: number | string;
  created_at: string;
};

type CustomerWithOrders = {
  id: string;
  full_name: string;
  phone: string | null;
  pincode: string | null;
  created_at: string;
  orders: CustomerOrderSummary[];
};

async function fetchCustomersWithOrders() {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      phone,
      pincode,
      created_at,
      orders!orders_customer_id_fkey (
        id,
        status,
        total,
        created_at
      )
    `)
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as unknown as CustomerWithOrders[];
}

function summarizeCustomer(customer: CustomerWithOrders) {
  const nonCancelled = customer.orders.filter((order) => order.status !== "CANCELLED");
  const totalSpent = nonCancelled.reduce((sum, order) => sum + toNumber(order.total), 0);

  return {
    orderCount: customer.orders.length,
    totalSpent,
    avgOrderValue: nonCancelled.length > 0 ? totalSpent / nonCancelled.length : 0
  };
}

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const customersQuery = useQuery({ queryKey: ["admin-customers"], queryFn: fetchCustomersWithOrders });
  const customers = customersQuery.data ?? [];

  const summaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof summarizeCustomer>>();
    for (const customer of customers) {
      map.set(customer.id, summarizeCustomer(customer));
    }
    return map;
  }, [customers]);

  const overallStats = useMemo(() => {
    let totalRevenue = 0;
    let paidOrderCount = 0;

    for (const customer of customers) {
      const summary = summaries.get(customer.id);
      if (!summary) continue;
      totalRevenue += summary.totalSpent;
      paidOrderCount += customer.orders.filter((order) => order.status !== "CANCELLED").length;
    }

    return {
      totalCustomers: customers.length,
      totalRevenue,
      avgOrderValue: paidOrderCount > 0 ? totalRevenue / paidOrderCount : 0
    };
  }, [customers, summaries]);

  const sortedCustomers = useMemo(
    () => [...customers].sort((a, b) => (summaries.get(b.id)?.totalSpent ?? 0) - (summaries.get(a.id)?.totalSpent ?? 0)),
    [customers, summaries]
  );

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return sortedCustomers;

    return sortedCustomers.filter((customer) =>
      [customer.full_name, customer.phone].filter(Boolean).some((value) => value!.toLowerCase().includes(normalizedSearch))
    );
  }, [sortedCustomers, search]);

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? null;

  if (customersQuery.isLoading) {
    return <div className="h-96 animate-pulse rounded-lg bg-slate-200" />;
  }

  if (customersQuery.error) {
    return <EmptyState title="Could not load customers" body={customersQuery.error.message} />;
  }

  return (
    <div>
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Total customers" value={overallStats.totalCustomers} icon={Users} />
        <StatCard label="Total revenue" value={formatCurrency(overallStats.totalRevenue)} icon={IndianRupee} />
        <StatCard label="Avg order value" value={formatCurrency(overallStats.avgOrderValue)} icon={TrendingUp} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Customers</h2>
            <p className="text-base text-slate-600">{pluralize(customers.length, "customer")}</p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden size={18} />
            <Input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or phone" />
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <EmptyState title="No customers found" body="Adjust the search or wait for customers to sign up." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[720px] border-collapse text-left text-base">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Orders</th>
                  <th className="p-3">Total spent</th>
                  <th className="p-3">Avg order value</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const summary = summaries.get(customer.id)!;
                  const isSelected = customer.id === selectedCustomerId;

                  return (
                    <tr
                      key={customer.id}
                      onClick={() => setSelectedCustomerId(isSelected ? null : customer.id)}
                      className={`cursor-pointer border-t border-slate-200 transition hover:bg-slate-50 ${
                        isSelected ? "bg-emerald-50" : ""
                      }`}
                    >
                      <td className="p-3 font-semibold text-slate-950">{customer.full_name}</td>
                      <td className="p-3 text-slate-600">{customer.phone ?? "—"}</td>
                      <td className="p-3">{summary.orderCount}</td>
                      <td className="p-3">{formatCurrency(summary.totalSpent)}</td>
                      <td className="p-3">{formatCurrency(summary.avgOrderValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedCustomer ? (
        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-950">{selectedCustomer.full_name}'s orders</h3>
            <p className="text-sm text-slate-600">{pluralize(selectedCustomer.orders.length, "order")}</p>
          </div>

          {selectedCustomer.orders.length === 0 ? (
            <p className="text-base text-slate-600">No orders placed yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {[...selectedCustomer.orders]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((order) => (
                  <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-semibold text-slate-950">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-sm text-slate-500">{formatShortDate(order.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={getStatusTone(order.status)}>{order.status.replaceAll("_", " ")}</Badge>
                      <p className="font-semibold text-slate-950">{formatCurrency(toNumber(order.total))}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
