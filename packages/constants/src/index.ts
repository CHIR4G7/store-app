export const USER_ROLE = {
  CUSTOMER: "customer",
  WORKER: "worker",
  ADMIN: "admin"
} as const;

export const FULFILLMENT_TYPE = {
  DELIVERY: "delivery",
  PICKUP: "pickup"
} as const;

export const ORDER_STATUS = {
  PLACED: "PLACED",
  CONFIRMED: "CONFIRMED",
  PACKING: "PACKING",
  PACKED: "PACKED",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  DELIVERED: "DELIVERED",
  COLLECTED: "COLLECTED"
} as const;
