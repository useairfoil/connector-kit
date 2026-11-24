import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import * as Manifest from "@useairfoil/connector-kit/manifest";

import { tableSchemas } from "./tables";
import { webhookSubscriptions } from "./webhook-events";

const connectionFields = {
  shopDomain: Manifest.string({
    runtimeKey: "SHOPIFY_SHOP_DOMAIN",
    description: "Shopify shop domain.",
    placeholder: "example.myshopify.com",
  }),
  clientId: Manifest.string({
    runtimeKey: "SHOPIFY_CLIENT_ID",
    description: "Client ID for the merchant-owned Shopify Dev Dashboard app.",
  }),
  clientSecret: Manifest.secret({
    runtimeKey: "SHOPIFY_CLIENT_SECRET",
    description: "Client secret for the merchant-owned Shopify Dev Dashboard app.",
  }),
};

const webhookFields = {
  webhookSecret: Manifest.secret({
    runtimeKey: "SHOPIFY_WEBHOOK_SECRET",
    description: "Shopify webhook HMAC secret.",
  }),
};

export const ShopifyConnectionConfigDef = Manifest.defineConfig(connectionFields);
export const ShopifyWebhookConfigDef = Manifest.defineConfig(webhookFields);
export const ShopifyConfigDef = Manifest.defineConfig({
  ...connectionFields,
  ...webhookFields,
});

export type ShopifyConnectionConfig = Manifest.ConfigValuesOf<typeof ShopifyConnectionConfigDef>;
export type ShopifyWebhookConfig = Manifest.ConfigValuesOf<typeof ShopifyWebhookConfigDef>;
export type ShopifyConfig = Manifest.ConfigValuesOf<typeof ShopifyConfigDef>;

export const manifest = Manifest.define({
  name: "producer-shopify",
  title: "Shopify",
  webhook: {
    path: "/webhook",
    requirement: "required",
    events: webhookSubscriptions,
    configFields: ["webhookSecret"],
    documentationUrl: "https://shopify.dev/docs/apps/build/webhooks",
  },
  config: ShopifyConfigDef.spec,
  resources: [
    {
      name: "products",
      description: Iceberg.resolveDescription(tableSchemas.products),
      capabilities: ["backfill", "webhook"],
    },
    {
      name: "carts",
      description: Iceberg.resolveDescription(tableSchemas.carts),
      capabilities: ["webhook"],
    },
    {
      name: "customers",
      description: Iceberg.resolveDescription(tableSchemas.customers),
      capabilities: ["backfill", "webhook"],
    },
    {
      name: "orders",
      description: Iceberg.resolveDescription(tableSchemas.orders),
      capabilities: ["backfill", "webhook"],
    },
    {
      name: "refunds",
      description: Iceberg.resolveDescription(tableSchemas.refunds),
      capabilities: ["backfill", "webhook"],
    },
    {
      name: "locations",
      description: Iceberg.resolveDescription(tableSchemas.locations),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "inventory_items",
      description: Iceberg.resolveDescription(tableSchemas.inventory_items),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "inventory_levels",
      description: Iceberg.resolveDescription(tableSchemas.inventory_levels),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "order_transactions",
      description: Iceberg.resolveDescription(tableSchemas.order_transactions),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "fulfillments",
      description: Iceberg.resolveDescription(tableSchemas.fulfillments),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "fulfillment_orders",
      description: Iceberg.resolveDescription(tableSchemas.fulfillment_orders),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "discounts",
      description: Iceberg.resolveDescription(tableSchemas.discounts),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "inventory_transfers",
      description: Iceberg.resolveDescription(tableSchemas.inventory_transfers),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "abandoned_checkouts",
      description: Iceberg.resolveDescription(tableSchemas.abandoned_checkouts),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "collections",
      description: Iceberg.resolveDescription(tableSchemas.collections),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "draft_orders",
      description: Iceberg.resolveDescription(tableSchemas.draft_orders),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "shopify_payments_balance_transactions",
      description: Iceberg.resolveDescription(tableSchemas.shopify_payments_balance_transactions),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "shopify_payments_payouts",
      description: Iceberg.resolveDescription(tableSchemas.shopify_payments_payouts),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "shopify_payments_disputes",
      description: Iceberg.resolveDescription(tableSchemas.shopify_payments_disputes),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "inventory_shipments",
      description: Iceberg.resolveDescription(tableSchemas.inventory_shipments),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "returns",
      description: Iceberg.resolveDescription(tableSchemas.returns),
      capabilities: ["backfill", "changes"],
    },
    {
      name: "reverse_deliveries",
      description: Iceberg.resolveDescription(tableSchemas.reverse_deliveries),
      capabilities: ["backfill", "changes"],
    },
  ],
});
