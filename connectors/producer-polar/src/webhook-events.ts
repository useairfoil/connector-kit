export const checkoutEventTypes = [
  "checkout.created",
  "checkout.updated",
  "checkout.expired",
] as const;

export const customerEventTypes = [
  "customer.created",
  "customer.updated",
  "customer.deleted",
] as const;

export const orderEventTypes = [
  "order.created",
  "order.updated",
  "order.paid",
  "order.refunded",
] as const;

export const subscriptionEventTypes = [
  "subscription.created",
  "subscription.updated",
  "subscription.active",
  "subscription.canceled",
  "subscription.uncanceled",
  "subscription.revoked",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
  "subscription.cycled",
  "subscription.migrated",
] as const;

export const refundEventTypes = ["refund.created", "refund.updated"] as const;

export const productEventTypes = ["product.created", "product.updated"] as const;

export const discountEventTypes = [
  "discount.created",
  "discount.updated",
  "discount.deleted",
] as const;
