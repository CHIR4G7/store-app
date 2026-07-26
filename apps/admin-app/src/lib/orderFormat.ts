import type { OrderStatus } from "@grocery/orders";

export function toNumber(value: number | string | null | undefined) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatShortDate(value: string | null) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function getStatusTone(status: OrderStatus) {
  if (status === "DELIVERED" || status === "COLLECTED") return "success";
  if (status === "CANCELLED") return "warning";
  if (status === "OUT_FOR_DELIVERY" || status === "READY_FOR_PICKUP") return "info";
  return "neutral";
}

type AddressLike = {
  house_number: string | null;
  street: string | null;
  landmark: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
} | null;

export function getAddressLine(address: AddressLike) {
  if (!address) return "Store pickup";

  return [address.house_number, address.street, address.landmark, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(", ");
}
