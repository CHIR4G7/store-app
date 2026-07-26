import { FormEvent, useState } from "react";
import { sendPhoneOtp, signOut, useCurrentUser, verifyPhoneOtp } from "@grocery/auth";
import { Badge, Button, Input } from "@grocery/ui";
import { Loader2, ShieldCheck } from "lucide-react";
import { AdminTabs } from "./components/AdminTabs";
import { InventoryPage } from "./pages/InventoryPage";
import { CustomersPage } from "./pages/CustomersPage";
import { OrderHistoryPage } from "./pages/OrderHistoryPage";

export type AdminTab = "inventory" | "customers" | "orders";

function normalizeIndianPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;

  return value.trim();
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

export function App() {
  const { isAuthenticated, isLoading, user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<AdminTab>("inventory");

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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <div>
          <Badge tone="info">Admin</Badge>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Store admin</h1>
          <p className="mt-2 text-base text-slate-600">Signed in as {user.fullName ?? "admin"}</p>
        </div>
        <Button variant="secondary" onClick={() => void signOut()}>
          Sign out
        </Button>
      </header>

      <nav className="mx-auto max-w-7xl px-4 sm:px-6">
        <AdminTabs activeTab={activeTab} onNavigate={setActiveTab} />
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeTab === "inventory" ? <InventoryPage /> : activeTab === "customers" ? <CustomersPage /> : <OrderHistoryPage />}
      </main>
    </div>
  );
}
