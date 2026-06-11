import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-emerald-600 text-white hover:bg-emerald-700",
        variant === "secondary" && "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
        variant === "ghost" && "text-slate-700 hover:bg-slate-100",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100",
        className
      )}
      {...props}
    />
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "info" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium",
        tone === "neutral" && "bg-slate-100 text-slate-700",
        tone === "success" && "bg-emerald-100 text-emerald-800",
        tone === "warning" && "bg-orange-100 text-orange-800",
        tone === "info" && "bg-blue-100 text-blue-800"
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-base text-slate-600">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
