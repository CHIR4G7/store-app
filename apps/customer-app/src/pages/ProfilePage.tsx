import { FormEvent, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { signOut, supabase, useCurrentUser } from "@grocery/auth";
import { Badge, Button, EmptyState, Input } from "@grocery/ui";
import { CheckCircle2, Home, Loader2, MapPin, Pencil, Phone, Plus, Save, UserRound } from "lucide-react";

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

type AddressForm = {
  id?: string;
  label: string;
  houseNumber: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

const emptyAddressForm: AddressForm = {
  label: "Home",
  houseNumber: "",
  street: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false
};

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

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function toAddressForm(address: Address): AddressForm {
  return {
    id: address.id,
    label: address.label ?? "Home",
    houseNumber: address.house_number ?? "",
    street: address.street ?? "",
    landmark: address.landmark ?? "",
    city: address.city ?? "",
    state: address.state ?? "",
    pincode: address.pincode ?? "",
    isDefault: address.is_default
  };
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

function AddressEditor({
  initialValue,
  onCancel,
  onSaved
}: {
  initialValue: AddressForm;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { user } = useCurrentUser();
  const [form, setForm] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateField<Key extends keyof AddressForm>(key: Key, value: AddressForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!user) {
      setError("Please sign in again.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      user_id: user.id,
      label: form.label.trim() || "Home",
      house_number: form.houseNumber.trim(),
      street: form.street.trim(),
      landmark: form.landmark.trim() || null,
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      is_default: form.isDefault
    };

    const result = form.id
      ? await supabase.from("addresses").update(payload).eq("id", form.id).eq("user_id", user.id)
      : await supabase.from("addresses").insert(payload);

    if (result.error) {
      setIsSubmitting(false);
      setError(result.error.message);
      return;
    }

    if (form.isDefault) {
      const { error: defaultError } = await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .neq("id", form.id ?? "00000000-0000-0000-0000-000000000000");

      if (defaultError) {
        setIsSubmitting(false);
        setError(defaultError.message);
        return;
      }
    }

    setIsSubmitting(false);
    onSaved();
  }

  return (
    <form className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-950">{form.id ? "Edit address" : "Add address"}</h3>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Label</span>
          <Input value={form.label} onChange={(event) => updateField("label", event.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">House / flat number</span>
          <Input value={form.houseNumber} onChange={(event) => updateField("houseNumber", event.target.value)} required />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Street / area</span>
          <Input value={form.street} onChange={(event) => updateField("street", event.target.value)} required />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Landmark</span>
          <Input value={form.landmark} onChange={(event) => updateField("landmark", event.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">City</span>
          <Input value={form.city} onChange={(event) => updateField("city", event.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">State</span>
          <Input value={form.state} onChange={(event) => updateField("state", event.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Pincode</span>
          <Input inputMode="numeric" value={form.pincode} onChange={(event) => updateField("pincode", event.target.value)} required />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(event) => updateField("isDefault", event.target.checked)}
          />
          <span className="font-semibold text-slate-700">Primary address</span>
        </label>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" aria-hidden size={18} /> : <Save aria-hidden size={18} />}
        Save address
      </Button>
    </form>
  );
}

export function ProfilePage() {
  const queryClient = useQueryClient();
  const { refreshProfile, user } = useCurrentUser();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [profileError, setProfileError] = useState("");
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressForm | null>(null);
  const addressesQuery = useQuery({
    queryKey: ["customer-addresses"],
    queryFn: fetchAddresses
  });
  const addresses = addressesQuery.data ?? [];
  const primaryAddress = useMemo(() => addresses.find((address) => address.is_default) ?? addresses[0] ?? null, [addresses]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileError("");

    if (!user) return;

    setIsProfileSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        pincode: primaryAddress?.pincode ?? null
      })
      .eq("id", user.id);

    setIsProfileSaving(false);

    if (error) {
      setProfileError(error.message);
      return;
    }

    setIsEditingProfile(false);
    await refreshProfile();
  }

  async function markPrimary(address: Address) {
    if (!user) return;

    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", address.id).eq("user_id", user.id);
    await queryClient.invalidateQueries({ queryKey: ["customer-addresses"] });
  }

  if (!user) {
    return null;
  }

  return (
    <main className="mx-auto max-w-5xl px-3 pb-28 pt-4 sm:px-6">
      <header className="mb-5">
        <p className="text-base font-semibold text-emerald-700">Account</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Profile</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <section className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-800">
              {initials(user.fullName) || <UserRound aria-hidden size={34} />}
            </div>
            <h2 className="mt-4 text-2xl font-bold text-slate-950">{user.fullName}</h2>
            <p className="mt-1 flex items-center gap-2 text-base text-slate-600">
              <Phone aria-hidden size={17} />
              {user.phone ?? "No phone saved"}
            </p>
            <Badge tone="success">Customer</Badge>
          </div>

          <div className="mt-5 rounded-lg bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <MapPin aria-hidden size={17} />
              Primary address
            </div>
            {primaryAddress ? (
              <>
                <p className="font-bold text-slate-950">{primaryAddress.label ?? "Address"}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{addressLine(primaryAddress)}</p>
              </>
            ) : (
              <p className="text-sm text-slate-600">No address saved yet.</p>
            )}
          </div>

          <Button className="mt-4 w-full" variant="secondary" onClick={() => setIsEditingProfile((current) => !current)}>
            <Pencil aria-hidden size={18} />
            Edit profile
          </Button>
          <Button className="mt-2 w-full" variant="ghost" onClick={() => void signOut()}>
            Sign out
          </Button>
        </section>

        <div className="space-y-4">
          {isEditingProfile ? (
            <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" onSubmit={saveProfile}>
              <h3 className="mb-4 text-lg font-bold text-slate-950">Personal details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">Full name</span>
                  <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">Mobile number</span>
                  <Input inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
                </label>
              </div>
              {profileError ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{profileError}</p> : null}
              <Button className="mt-4" type="submit" disabled={isProfileSaving}>
                {isProfileSaving ? <Loader2 className="animate-spin" aria-hidden size={18} /> : <Save aria-hidden size={18} />}
                Save profile
              </Button>
            </form>
          ) : null}

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Addresses</h2>
                <p className="text-base text-slate-600">Add, edit, and choose your primary delivery address.</p>
              </div>
              <Button onClick={() => setAddressForm({ ...emptyAddressForm, isDefault: addresses.length === 0 })}>
                <Plus aria-hidden size={18} />
                Add address
              </Button>
            </div>

            {addressesQuery.isLoading ? (
              <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
            ) : addresses.length === 0 ? (
              <EmptyState title="No addresses yet" body="Add an address to make checkout faster." />
            ) : (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <article key={address.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-950">{address.label ?? "Address"}</h3>
                          {address.is_default ? (
                            <Badge tone="success">
                              <CheckCircle2 aria-hidden size={14} />
                              Primary
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{addressLine(address)}</p>
                      </div>
                      <div className="flex gap-2">
                        {!address.is_default ? (
                          <Button variant="ghost" onClick={() => void markPrimary(address)}>
                            <Home aria-hidden size={17} />
                            Primary
                          </Button>
                        ) : null}
                        <Button variant="secondary" onClick={() => setAddressForm(toAddressForm(address))}>
                          <Pencil aria-hidden size={17} />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {addressForm ? (
            <AddressEditor
              initialValue={addressForm}
              onCancel={() => setAddressForm(null)}
              onSaved={() => {
                setAddressForm(null);
                void queryClient.invalidateQueries({ queryKey: ["customer-addresses"] });
              }}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
