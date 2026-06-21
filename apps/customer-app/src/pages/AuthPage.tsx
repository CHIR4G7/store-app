import { FormEvent, useState } from "react";
import { sendPhoneOtp, verifyPhoneOtp } from "@grocery/auth";
import { Button, Input } from "@grocery/ui";
import { CheckCircle2, Loader2, Phone, ShieldCheck } from "lucide-react";

function normalizeIndianPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("91") && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return value.trim();
}

export function AuthPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const normalizedPhone = normalizeIndianPhone(phone);

  async function handleSendOtp(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const { error: otpError } = await sendPhoneOtp(normalizedPhone);

    setIsSubmitting(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    setIsOtpSent(true);
    setMessage("OTP sent. Enter the code to continue.");
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const { error: verifyError } = await verifyPhoneOtp(normalizedPhone, otp.trim());

    setIsSubmitting(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ShieldCheck aria-hidden size={28} />
            </div>
            <div>
              <p className="text-base font-semibold text-emerald-700">Welcome to Manmohan Di Hatti Online App</p>
              <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
                Sign in with your mobile number
              </h1>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Phone aria-hidden size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-950">{isOtpSent ? "Enter OTP" : "Login or sign up"}</h2>
                <p className="text-base text-slate-600">Customers use one secure mobile login.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={isOtpSent ? handleVerifyOtp : handleSendOtp}>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Mobile number</span>
                <Input
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  disabled={isSubmitting || isOtpSent}
                  required
                />
              </label>

              {isOtpSent ? (
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">OTP</span>
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6 digit code"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </label>
              ) : null}

              {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
              {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" aria-hidden size={18} /> : null}
                {isOtpSent ? "Verify and continue" : "Send OTP"}
              </Button>

              {isOtpSent ? (
                <Button
                  className="w-full"
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsOtpSent(false);
                    setOtp("");
                    setMessage("");
                    setError("");
                  }}
                >
                  Change mobile number
                </Button>
              ) : null}
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
