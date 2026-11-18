import * as Schema from "effect/Schema";

import { gid, splitTags, upper } from "../shared";
import {
  type Product,
  type ProductFeaturedMedia,
  type ProductOption,
  ProductStatusSchema,
  type ProductVariant,
  ProductVariantInventoryPolicySchema,
} from "./row";

export const ProductWebhookImageSchema = Schema.Struct({
  src: Schema.String,
  alt: Schema.NullOr(Schema.String),
});

export const ProductWebhookOptionSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  position: Schema.Int,
  values: Schema.Array(Schema.String),
});

export const ProductWebhookVariantSchema = Schema.Struct({
  admin_graphql_api_id: Schema.String,
  id: Schema.Number,
  title: Schema.String,
  price: Schema.String,
  inventory_item_id: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  inventory_policy: upper(ProductVariantInventoryPolicySchema),
  compare_at_price: Schema.NullOr(Schema.String),
  created_at: Schema.DateFromString,
  updated_at: Schema.DateFromString,
  taxable: Schema.Boolean,
  barcode: Schema.NullOr(Schema.String),
  sku: Schema.NullOr(Schema.String),
});

export const ProductWebhookVariantGidSchema = Schema.Struct({
  admin_graphql_api_id: Schema.String,
  updated_at: Schema.DateFromString,
});

export const ProductWebhookPayloadSchema = Schema.Struct({
  id: Schema.Number,
  admin_graphql_api_id: Schema.String,
  body_html: Schema.NullOr(Schema.String),
  created_at: Schema.DateFromString,
  handle: Schema.String,
  image: Schema.optional(Schema.NullOr(ProductWebhookImageSchema)),
  options: Schema.Array(ProductWebhookOptionSchema),
  product_type: Schema.String,
  published_at: Schema.NullOr(Schema.DateFromString),
  status: upper(ProductStatusSchema),
  tags: Schema.String,
  template_suffix: Schema.NullOr(Schema.String),
  title: Schema.String,
  updated_at: Schema.DateFromString,
  variants: Schema.Array(ProductWebhookVariantSchema),
  variant_gids: Schema.Array(ProductWebhookVariantGidSchema),
  vendor: Schema.String,
});

export const ProductDeleteWebhookPayloadSchema = Schema.Struct({ id: Schema.Number });

export const ProductEventSchema = Schema.Union([
  Schema.Struct({
    _tag: Schema.Literal("upsert"),
    payload: Schema.toType(ProductWebhookPayloadSchema),
    triggeredAt: Schema.Date,
  }),
  Schema.Struct({
    _tag: Schema.Literal("delete"),
    id: Schema.String,
    version: Schema.Date,
  }),
]);

export type ProductWebhookImage = Schema.Schema.Type<typeof ProductWebhookImageSchema>;

export type ProductWebhookOption = Schema.Schema.Type<typeof ProductWebhookOptionSchema>;

export type ProductWebhookVariant = Schema.Schema.Type<typeof ProductWebhookVariantSchema>;

export type ProductWebhookPayload = Schema.Schema.Type<typeof ProductWebhookPayloadSchema>;

const normalizeProductOption = (option: ProductWebhookOption): ProductOption => ({
  id: gid("ProductOption", option.id),
  name: option.name,
  position: option.position,
  values: option.values,
});

const normalizeProductVariant = (variant: ProductWebhookVariant): ProductVariant => ({
  id: variant.admin_graphql_api_id,
  legacyResourceId: String(variant.id),
  title: variant.title,
  sku: variant.sku,
  barcode: variant.barcode,
  price: variant.price,
  compareAtPrice: variant.compare_at_price,
  inventoryPolicy: variant.inventory_policy,
  ...(variant.inventory_item_id == null
    ? {}
    : { inventoryItemId: gid("InventoryItem", variant.inventory_item_id) }),
  taxable: variant.taxable,
  createdAt: variant.created_at,
  updatedAt: variant.updated_at,
});

const normalizeProductFeaturedMedia = (
  image: ProductWebhookImage | null | undefined,
): ProductFeaturedMedia | null =>
  image === null || image === undefined ? null : { image: { url: image.src, altText: image.alt } };

export const fromProductWebhook = (payload: ProductWebhookPayload): Product => ({
  id: payload.admin_graphql_api_id,
  legacyResourceId: String(payload.id),
  title: payload.title,
  handle: payload.handle,
  descriptionHtml: payload.body_html ?? "",
  productType: payload.product_type,
  vendor: payload.vendor,
  status: payload.status,
  tags: splitTags(payload.tags),
  createdAt: payload.created_at,
  updatedAt: payload.updated_at,
  publishedAt: payload.published_at,
  templateSuffix: payload.template_suffix ?? "",
  featuredMedia: normalizeProductFeaturedMedia(payload.image),
  options: payload.options.map(normalizeProductOption),
  variants: payload.variants.map(normalizeProductVariant),
});
