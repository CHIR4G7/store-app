import React from "react";
import ReactDOM from "react-dom/client";
import { Button, Badge } from "@grocery/ui";
import { PackageCheck } from "lucide-react";
import "./index.css";

function WorkerApp() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6">
        <Badge tone="info">Worker</Badge>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">Order queue</h1>
        <p className="mt-2 text-base text-slate-600">Pending orders will appear here once Supabase is connected.</p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
            <PackageCheck aria-hidden size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Ready for fulfillment</h2>
            <p className="text-base text-slate-600">Large touch targets and checklist packing come next.</p>
          </div>
        </div>
        <Button className="mt-4 w-full">Accept next order</Button>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WorkerApp />
  </React.StrictMode>
);
