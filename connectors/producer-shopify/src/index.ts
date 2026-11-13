import { fromCartWebhook } from "./resources/carts/webhook";
import { fromProductWebhook } from "./resources/products/webhook";

declare const __COMMIT_SHA__: string | undefined;

export const commitSha = typeof __COMMIT_SHA__ === "undefined" ? undefined : __COMMIT_SHA__;

export * as ShopifyApiClient from "./api/client";
export * as ShopifyConnector from "./connector";
export { manifest } from "./manifest";
export type { Customer } from "./resources/customers/row";
export { CustomerSchema } from "./resources/customers/row";
export type { Order } from "./resources/orders/row";
export { OrderSchema } from "./resources/orders/row";
export type { OrderWebhookPayload } from "./resources/orders/webhook";
export {
  fromOrderWebhook,
  OrderDeleteWebhookPayloadSchema,
  OrderWebhookPayloadSchema,
} from "./resources/orders/webhook";
export type { Refund } from "./resources/refunds/row";
export { RefundSchema } from "./resources/refunds/row";
export type { RefundWebhookPayload } from "./resources/refunds/webhook";
export { fromRefundWebhook, RefundWebhookPayloadSchema } from "./resources/refunds/webhook";
export type { Cart, CartLineItem } from "./resources/carts/row";
export { CartLineItemSchema, CartSchema } from "./resources/carts/row";
export type { CartWebhookPayload } from "./resources/carts/webhook";
export { CartWebhookPayloadSchema } from "./resources/carts/webhook";
export type {
  Product,
  ProductOption,
  ProductStatus,
  ProductVariant,
  ProductVariantInventoryPolicy,
} from "./resources/products/row";
export {
  ProductOptionSchema,
  ProductSchema,
  ProductStatusSchema,
  ProductVariantInventoryPolicySchema,
  ProductVariantSchema,
} from "./resources/products/row";
export type { ProductWebhookPayload } from "./resources/products/webhook";
export {
  ProductDeleteWebhookPayloadSchema,
  ProductWebhookPayloadSchema,
} from "./resources/products/webhook";
export type { PageInfo } from "./resources/shared";
export { PageInfoSchema } from "./resources/shared";

export const ShopifyNormalize = {
  productWebhook: fromProductWebhook,
  cartWebhook: fromCartWebhook,
} as const;
