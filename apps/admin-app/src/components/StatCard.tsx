import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "emerald"
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "emerald" | "orange";
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base text-slate-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
        </div>
        <div
          className={`grid h-12 w-12 place-items-center rounded-lg ${
            tone === "orange" ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          <Icon aria-hidden size={24} />
        </div>
      </div>
    </article>
  );
}
