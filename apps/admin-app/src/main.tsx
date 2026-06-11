import React from "react";
import ReactDOM from "react-dom/client";
import { Badge, Button, Input } from "@grocery/ui";
import { Boxes, ChartNoAxesCombined, UsersRound } from "lucide-react";
import "./index.css";

const stats = [
  { label: "Products", value: "8", icon: Boxes },
  { label: "Workers", value: "0", icon: UsersRound },
  { label: "Revenue today", value: "₹0", icon: ChartNoAxesCombined }
];

function AdminApp() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Badge tone="info">Admin</Badge>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Store dashboard</h1>
          <p className="mt-2 text-base text-slate-600">Inventory tables, worker management, and analytics will build from this shell.</p>
        </div>
        <Button>Update inventory</Button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base text-slate-600">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">{stat.value}</p>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Icon aria-hidden size={24} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Inventory preview</h2>
          <div className="w-full max-w-sm">
            <Input placeholder="Search products" aria-label="Search inventory" />
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-left text-base">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Price</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200">
                <td className="p-3 font-medium">Whole Wheat Atta</td>
                <td className="p-3">45</td>
                <td className="p-3">₹248</td>
                <td className="p-3"><Badge tone="success">Available</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);
