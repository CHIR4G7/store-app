export type OrderStatus =
  | "PLACED"
  | "CONFIRMED"
  | "ASSIGNED"
  | "PACKING"
  | "PACKED"
  | "OUT_FOR_DELIVERY"
  | "READY_FOR_PICKUP"
  | "DELIVERED"
  | "COLLECTED"
  | "CANCELLED";

export function getCustomerStatusLabel(status: OrderStatus) {
  const labels: Record<OrderStatus, string> = {
    PLACED: "We've received your order",
    CONFIRMED: "Your order is confirmed",
    ASSIGNED: "A worker has accepted your order",
    PACKING: "Your order is being packed",
    PACKED: "Your order is packed and ready",
    OUT_FOR_DELIVERY: "Your order is on the way",
    READY_FOR_PICKUP: "Your order is ready to pick up at the store",
    DELIVERED: "Your order has been delivered",
    COLLECTED: "Thank you for collecting your order",
    CANCELLED: "This order was cancelled"
  };

  return labels[status];
}
