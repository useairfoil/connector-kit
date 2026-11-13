declare const __COMMIT_SHA__: string | undefined;

export const commitSha = typeof __COMMIT_SHA__ === "undefined" ? undefined : __COMMIT_SHA__;

export * as PolarApiClient from "./api";
export * as PolarConnector from "./connector";
export { manifest } from "./manifest";
export type { Checkout } from "./resources/checkouts";
export { CheckoutSchema } from "./resources/checkouts";
export type { Customer } from "./resources/customers";
export { CustomerSchema } from "./resources/customers";
export type { Discount } from "./resources/discounts";
export { DiscountSchema } from "./resources/discounts";
export type { Order } from "./resources/orders";
export { OrderSchema } from "./resources/orders";
export type { Product, ProductPrice } from "./resources/products";
export { ProductPriceSchema, ProductSchema } from "./resources/products";
export type { Refund } from "./resources/refunds";
export { RefundSchema } from "./resources/refunds";
export type { Address, ListResponse, OrderItem } from "./resources/shared";
export { AddressSchema, makeListResponseSchema, OrderItemSchema } from "./resources/shared";
export type { Subscription } from "./resources/subscriptions";
export { SubscriptionSchema } from "./resources/subscriptions";
export type { WebhookPayload } from "./webhooks";
export { WebhookPayloadSchema } from "./webhooks";
