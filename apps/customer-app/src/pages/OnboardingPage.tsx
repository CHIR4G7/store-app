import { FormEvent, useState } from "react";
import { signOut, supabase } from "@grocery/auth";
import { Button, Input } from "@grocery/ui";
import { Home, Loader2, MapPin, UserRound } from "lucide-react";

type OnboardingPageProps = {
  onComplete: () => Promise<void> | void;
};

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("Home");
  const [houseNumber, setHouseNumber] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [pincode, setPincode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const { error: functionError } = await supabase.functions.invoke("complete-customer-profile", {
      body: {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        address: {
          label: label.trim() || "Home",
          houseNumber: houseNumber.trim(),
          street: street.trim(),
          landmark: landmark.trim() || null,
          city: city.trim(),
          state: stateValue.trim(),
          pincode: pincode.trim()
        }
      }
    });

    setIsSubmitting(false);

    if (functionError) {
      setError(functionError.message);
      return;
    }

    await onComplete();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-base font-semibold text-emerald-700">One last step</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Complete your customer profile</h1>
          <p className="mt-2 text-base leading-7 text-slate-600">
            We need your name and delivery address before you place your first order.
          </p>
        </div>

        <form className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
          <section>
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="text-emerald-700" aria-hidden size={20} />
              <h2 className="text-lg font-bold text-slate-950">Personal details</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Full name</span>
                <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Mobile number</span>
                <Input inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional if login has phone" />
              </label>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="text-emerald-700" aria-hidden size={20} />
              <h2 className="text-lg font-bold text-slate-950">Delivery address</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Label</span>
                <Input value={label} onChange={(event) => setLabel(event.target.value)} required />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">House / flat number</span>
                <Input value={houseNumber} onChange={(event) => setHouseNumber(event.target.value)} required />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Street / area</span>
                <Input value={street} onChange={(event) => setStreet(event.target.value)} required />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Landmark</span>
                <Input value={landmark} onChange={(event) => setLandmark(event.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">City</span>
                <Input value={city} onChange={(event) => setCity(event.target.value)} required />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">State</span>
                <Input value={stateValue} onChange={(event) => setStateValue(event.target.value)} required />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Pincode</span>
                <Input inputMode="numeric" value={pincode} onChange={(event) => setPincode(event.target.value)} required />
              </label>
            </div>
          </section>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" aria-hidden size={18} /> : <Home aria-hidden size={18} />}
              Save and start shopping
            </Button>
            <Button type="button" variant="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
